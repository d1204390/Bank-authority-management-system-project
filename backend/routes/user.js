const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const LoginAttempt = require('../models/LoginAttempt');
const { sendLockAccountEmail, sendAccountCredentials } = require('../utils/emailService');
const mongoose = require('mongoose');

// 常數定義
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15分鐘

// 驗證請求必填欄位
const validateFields = (fields, res) => {
    const missingFields = fields.filter(field => !field.value);
    if (missingFields.length > 0) {
        res.status(400).json({ msg: `缺少必要欄位：${missingFields.map(f => f.name).join(', ')}` });
        return false;
    }
    return true;
};

// 工具函數：獲取和格式化 IP 地址
const getFormattedIP = (req) => {
    const ipAddress =
        req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.ip ||
        '0.0.0.0';

    return ipAddress === '::1'
        ? '127.0.0.1'
        : ipAddress.includes('::ffff:')
            ? ipAddress.split('::ffff:')[1]
            : ipAddress;
};

// 工具函數：檢查並更新登入嘗試
const checkAndUpdateLoginAttempt = async (loginAttempt) => {
    if (loginAttempt.lockUntil) {
        // 使用者帳號被鎖定後需要管理員手動解鎖
        loginAttempt.status = 'locked';
        await loginAttempt.save();
        return {
            isLocked: true,
            msg: '帳號已被鎖定，請聯繫系統管理員解鎖'
        };
    }
    return { isLocked: false };
};

// 工具函數：處理登入失敗
const handleLoginFailure = async (loginAttempt, user, ipAddress) => {
    loginAttempt.attempts += 1;
    loginAttempt.lastAttempt = Date.now();

    if (loginAttempt.attempts >= MAX_LOGIN_ATTEMPTS) {
        loginAttempt.status = 'locked';
        loginAttempt.lockUntil = null;
        await loginAttempt.save();

        // 發送鎖定通知郵件,明確標記為系統自動鎖定
        await sendLockAccountEmail(
            user.email,
            null,  // 不提供解鎖時間
            ipAddress,
            'user',
            false  // 標示為系統自動鎖定
        );

        return {
            status: 403,
            response: {
                msg: '登入失敗次數過多，帳號已被鎖定，請聯繫系統管理員解鎖',
                lockUntil: loginAttempt.lockUntil
            }
        };
    }

    await loginAttempt.save();
    return {
        status: 400,
        response: {
            msg: '密碼錯誤',
            attemptsLeft: MAX_LOGIN_ATTEMPTS - loginAttempt.attempts
        }
    };
};

// 工具函數：生成 JWT Token
const generateToken = (user, department, position) => {
    const tokenPayload = {
        id: user._id.toString(),
        account: user.account,
        name: user.name,
        department,
        position,
        role: 'user',
        exp: Math.floor(Date.now() / 1000) + (60 * 60)
    };

    return jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET,
        { algorithm: 'HS256' }
    );
};

// 使用者註冊路由
router.post('/register', async (req, res) => {
    const { name, department, position, account, password, email } = req.body;

    if (!validateFields([
        { name: 'name', value: name },
        { name: 'department', value: department },
        { name: 'position', value: position },
        { name: 'account', value: account },
        { name: 'password', value: password },
        { name: 'email', value: email }
    ], res)) return;

    try {
        if (await User.exists({ account })) {
            return res.status(400).json({ msg: '帳號已存在' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ msg: '無效的電子郵件格式' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            name,
            department,
            position,
            account,
            password: hashedPassword,
            email
        });

        const emailSent = await sendAccountCredentials(email, name, account, password);

        res.status(201).json({
            msg: emailSent ? '使用者創建成功，帳號密碼已發送至信箱' : '使用者創建成功，但郵件發送失敗',
            user: newUser
        });
    } catch (error) {
        console.error('伺服器錯誤:', error.message);
        res.status(500).json({ msg: '伺服器錯誤', error: error.message });
    }
});

// 使用者登入路由
router.post('/login', async (req, res) => {
    const { account, password } = req.body;
    const formattedIP = getFormattedIP(req);

    try {
        const user = await User.findOne({ account });
        if (!user) {
            return res.status(400).json({ msg: '帳號不存在' });
        }

        // 獲取或創建登入嘗試記錄
        let loginAttempt = await LoginAttempt.findOne({
            account,
            role: 'user'
        }) || new LoginAttempt({
            account,
            role: 'user',
            ipAddress: formattedIP,
            status: 'normal'
        });

        loginAttempt.ipAddress = formattedIP;

        // 檢查帳號是否被鎖定
        const lockStatus = await checkAndUpdateLoginAttempt(loginAttempt);
        if (lockStatus.isLocked) {
            return res.status(403).json({
                msg: `帳號已被鎖定，請聯絡系統管理員`,
                lockUntil: lockStatus.lockUntil
            });
        }

        // 驗證密碼
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const failureResult = await handleLoginFailure(loginAttempt, user, formattedIP);
            return res.status(failureResult.status).json(failureResult.response);
        }

        // 登入成功，重置登入嘗試記錄
        loginAttempt.attempts = 0;
        loginAttempt.lockUntil = null;
        loginAttempt.status = 'normal';
        await loginAttempt.save();

        // 部門和職位代碼映射
        const departmentMap = {
            '業務部': 'BD', '消金部': 'FD', '借貸部': 'LD',
            'BD': 'BD', 'FD': 'FD', 'LD': 'LD'
        };

        const positionMap = {
            '經理': 'M', '主管': 'S', '科員': 'C',
            'M': 'M', 'S': 'S', 'C': 'C'
        };

        const department = departmentMap[user.department] || user.department;
        const position = positionMap[user.position] || user.position;

        // 檢查部門和職位格式
        if (!['BD', 'FD', 'LD'].includes(department)) {
            console.error('Invalid department code:', department);
            return res.status(500).json({ msg: '部門格式錯誤' });
        }

        if (!['M', 'S', 'C'].includes(position)) {
            console.error('Invalid position code:', position);
            return res.status(500).json({ msg: '職位格式錯誤' });
        }

        // 生成 token 並返回
        const token = generateToken(user, department, position);

        res.json({
            msg: '登入成功',
            token,
            user: {
                id: user._id,
                name: user.name,
                account: user.account,
                department,
                position,
                role: 'user'
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ msg: '伺服器錯誤', error: error.message });
    }
});

// 獲取所有使用者
router.get('/employees', async (req, res) => {
    try {
        const users = await User.find({}, '-password');
        res.json(users);
    } catch (error) {
        console.error('獲取使用者列表失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

// 刪除使用者
router.delete('/employee', async (req, res) => {
    const { account } = req.body;

    if (!account) {
        return res.status(400).json({ msg: '缺少帳號參數' });
    }

    try {
        const user = await User.findOne({ account });
        if (!user) {
            return res.status(404).json({ msg: '使用者不存在' });
        }

        await User.deleteOne({ account });
        res.json({ msg: '刪除成功' });
    } catch (error) {
        console.error('刪除使用者失敗:', error.message);
        res.status(500).json({ msg: '伺服器錯誤', error: error.message });
    }
});


// 獲取所有使用者的鎖定狀態
router.get('/lock-status', async (req, res) => {
    try {
        const lockStatuses = await LoginAttempt.find(
            { role: 'user' },
            'account status lockUntil attempts'
        );

        res.json(lockStatuses.map(status => ({
            account: status.account,
            status: status.status,
            lockUntil: status.lockUntil,
            attempts: status.attempts
        })));
    } catch (error) {
        console.error('獲取鎖定狀態失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

// 切換使用者帳號鎖定狀態
router.post('/toggle-lock', async (req, res) => {
    const { account, action } = req.body;

    if (!account || !['lock', 'unlock'].includes(action)) {
        return res.status(400).json({
            msg: '無效的請求參數',
            success: false
        });
    }

    try {
        const user = await User.findOne({ account });
        if (!user) {
            return res.status(404).json({
                msg: '使用者不存在',
                success: false
            });
        }

        let loginAttempt = await LoginAttempt.findOne({
            account,
            role: 'user'
        });

        if (!loginAttempt) {
            loginAttempt = new LoginAttempt({
                account,
                role: 'user',
                status: 'normal'
            });
        }

        if (action === 'lock') {
            // 手動鎖定帳號
            loginAttempt.status = 'locked';
            loginAttempt.lockUntil = Date.now() + LOCK_TIME;
            loginAttempt.attempts = MAX_LOGIN_ATTEMPTS;

            // 發送鎖定通知郵件
            const remainingTime = Math.ceil(LOCK_TIME / 1000 / 60);
            // 在 lock 動作中的郵件發送
            await sendLockAccountEmail(
                user.email,
                remainingTime,
                req.ip || 'System Admin',  // 使用請求的 IP 或預設值
                'user',
                true  // 標示為管理員手動鎖定
            );
        } else {
            // 解鎖帳號
            loginAttempt.status = 'normal';
            loginAttempt.lockUntil = null;
            loginAttempt.attempts = 0;
        }

        await loginAttempt.save();

        res.json({
            success: true,
            msg: action === 'lock' ? '帳號已鎖定' : '帳號已解鎖',
            lockUntil: loginAttempt.lockUntil,
            status: loginAttempt.status
        });

    } catch (error) {
        console.error('更新鎖定狀態失敗:', error);
        res.status(500).json({
            msg: '伺服器錯誤',
            success: false,
            error: error.message
        });
    }
});

// 獲取用戶個人資料
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ msg: '未提供認證令牌' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ account: decoded.account });

        if (!user) {
            return res.status(404).json({ msg: '找不到用戶資料' });
        }

        res.json({
            name: user.name,
            account: user.account,
            department: user.department,
            position: user.position,
            email: user.email,
            extension: user.extension || '',
            createdAt: user.createdAt,
            avatar: user.avatar
        });

    } catch (error) {
        console.error('獲取用戶資料失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});


// 更新用戶個人資料
router.put('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ msg: '未提供認證令牌' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { name, email, extension } = req.body;

        // 驗證 Email 格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ msg: '無效的電子郵件格式' });
        }

        // 更新用戶資料
        const updatedUser = await User.findOneAndUpdate(
            { account: decoded.account },
            {
                name,
                email,
                extension
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ msg: '找不到用戶資料' });
        }

        res.json({
            msg: '更新成功',
            user: {
                name: updatedUser.name,
                email: updatedUser.email,
                extension: updatedUser.extension
            }
        });

    } catch (error) {
        console.error('更新用戶資料失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

// 上傳頭像
router.post('/upload-avatar', async (req, res) => {
    try {
        const { base64Image } = req.body;

        if (!base64Image) {
            return res.status(400).json({ msg: '未接收到圖片資料' });
        }

        // 驗證 base64 格式
        if (!base64Image.match(/^data:image\/(jpeg|png|gif);base64,/)) {
            return res.status(400).json({ msg: '無效的圖片格式' });
        }

        // 檢查檔案大小（base64 字串長度約為實際檔案大小的 1.37 倍）
        const sizeInBytes = Buffer.from(base64Image.split(',')[1], 'base64').length;
        if (sizeInBytes > 2 * 1024 * 1024) { // 2MB limit
            return res.status(400).json({ msg: '圖片大小不能超過 2MB' });
        }

        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ msg: '未提供認證令牌' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 查找用戶，取得目前的頭像資料
        const user = await User.findOne({ account: decoded.account });
        if (!user) {
            return res.status(404).json({ msg: '找不到用戶' });
        }

        // 如果用戶已經有頭像，先清空舊的頭像資料
        if (user.avatar) {
            await User.findOneAndUpdate(
                { account: decoded.account },
                { $unset: { avatar: "" } }
            );
        }

        // 更新用戶頭像為新的 base64 資料
        await User.findOneAndUpdate(
            { account: decoded.account },
            { avatar: base64Image }
        );

        res.json({
            msg: '上傳成功',
            avatar: base64Image
        });

    } catch (error) {
        console.error('上傳頭像失敗:', error);
        res.status(500).json({
            msg: '上傳失敗',
            error: error.message
        });
    }
});

module.exports = router;