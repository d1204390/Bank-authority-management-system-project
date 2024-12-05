const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const LoginAttempt = require('../models/LoginAttempt');
const { sendLockAccountEmail, sendPasswordResetEmail} = require('../utils/emailService');
const LoginHistory = require('../models/LoginHistory');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000;

router.post('/login', async (req, res) => {
    const { account, password, isAdminMode } = req.body;

    // 改進的 IP 獲取與處理
    const ipAddress =
        req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.ip ||
        '0.0.0.0';

    // IPv6 to IPv4 轉換，並處理本地回環地址
    const formattedIP = ipAddress === '::1'
        ? '127.0.0.1'  // 如果是本地回環地址，轉換為 IPv4 格式
        : ipAddress.includes('::ffff:')
            ? ipAddress.split('::ffff:')[1]
            : ipAddress;

    if (!account || !password) {
        return res.status(400).json({ msg: '請輸入帳號和密碼' });
    }

    try {
        const admin = await Admin.findOne({ account });

        if (!admin) {
            return res.status(400).json({ msg: '帳號不存在' });
        }

        // 只在管理員模式下進行登入嘗試記錄
        if (isAdminMode) {
            // 檢查登入嘗試記錄
            let loginAttempt = await LoginAttempt.findOne({
                account,
                role: admin.role
            });

            // 如果沒有記錄，創建新的
            if (!loginAttempt) {
                loginAttempt = new LoginAttempt({
                    account,
                    role: admin.role,
                    ipAddress: formattedIP,
                    status: 'normal'
                });
            } else {
                loginAttempt.ipAddress = formattedIP;
            }

            // 檢查是否被鎖定
            if (loginAttempt.lockUntil) {
                // 如果鎖定時間已過
                if (loginAttempt.lockUntil <= Date.now()) {
                    // 重置嘗試次數和狀態
                    loginAttempt.attempts = 0;
                    loginAttempt.lockUntil = null;
                    loginAttempt.status = 'normal';
                    await loginAttempt.save();
                } else {
                    // 仍在鎖定期間
                    loginAttempt.status = 'locked';
                    await loginAttempt.save();

                    const remainingTime = Math.ceil((loginAttempt.lockUntil - Date.now()) / 1000 / 60);
                    return res.status(403).json({
                        msg: `帳號已被鎖定，請 ${remainingTime} 分鐘後再試`,
                        lockUntil: loginAttempt.lockUntil
                    });
                }
            }

            // 驗證密碼
            if (admin.password !== password) {
                loginAttempt.attempts += 1;
                loginAttempt.lastAttempt = Date.now();

                // 當達到最大嘗試次數時
                if (loginAttempt.attempts >= MAX_LOGIN_ATTEMPTS) {
                    loginAttempt.lockUntil = Date.now() + LOCK_TIME;
                    loginAttempt.status = 'locked';
                    await loginAttempt.save();

                    // 發送鎖定通知郵件
                    const remainingTime = Math.ceil(LOCK_TIME / 1000 / 60); // 轉換為分鐘
                    await sendLockAccountEmail(admin.email, remainingTime, formattedIP);

                    return res.status(403).json({
                        msg: '登入失敗次數過多，帳號已被鎖定15分鐘',
                        lockUntil: loginAttempt.lockUntil
                    });
                }

                await loginAttempt.save();
                return res.status(400).json({
                    msg: '密碼錯誤',
                    attemptsLeft: MAX_LOGIN_ATTEMPTS - loginAttempt.attempts
                });
            }

            // 登入成功，重置記錄
            loginAttempt.attempts = 0;
            loginAttempt.lockUntil = null;
            loginAttempt.status = 'normal';
            await loginAttempt.save();
        } else {
            // 非管理員模式，如果是管理員帳號直接返回錯誤
            if (admin.role === 'admin') {
                return res.status(400).json({ msg: '登入失敗，請稍後再試' });
            }

            // 驗證密碼（非管理員模式下不記錄嘗試次數）
            if (admin.password !== password) {
                return res.status(400).json({ msg: '密碼錯誤' });
            }
        }

        // 創建 JWT
        const token = jwt.sign(
            {
                id: admin._id,
                account: admin.account,
                name: admin.name,
                role: admin.role,          // 添加角色
                department: 'ADMIN',       // 管理員部門標識
                position: 'ADMIN'          // 管理員職位標識
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            msg: '登入成功',
            token,
            admin: {
                id: admin._id,
                name: admin.name,
                account: admin.account,
                role: admin.role
            }
        });

    } catch (error) {
        console.error('伺服器錯誤:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

// 獲取登入記錄列表
router.get('/login-history', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            startDate,
            endDate,
            account,
            status
        } = req.query;

        const query = {};

        // 添加日期範圍篩選
        if (startDate || endDate) {
            query.loginTime = {};
            if (startDate) query.loginTime.$gte = new Date(startDate);
            if (endDate) query.loginTime.$lte = new Date(endDate);
        }

        // 添加帳號篩選
        if (account) {
            query.account = new RegExp(account, 'i');
        }

        // 添加狀態篩選
        if (status) {
            query.status = status;
        }

        const total = await LoginHistory.countDocuments(query);
        const loginHistory = await LoginHistory.find(query)
            .sort({ loginTime: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('userId', 'name department position');

        res.json({
            loginHistory,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('獲取登入記錄失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

// 獲取登入統計數據
router.get('/login-statistics', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [todaySuccess, todayFailed, totalSuccess, totalFailed] = await Promise.all([
            // 今日成功登入
            LoginHistory.countDocuments({
                loginTime: { $gte: today },
                status: 'success'
            }),
            // 今日失敗嘗試
            LoginHistory.countDocuments({
                loginTime: { $gte: today },
                status: 'failed'
            }),
            // 總成功登入
            LoginHistory.countDocuments({
                status: 'success'
            }),
            // 總失敗次數
            LoginHistory.countDocuments({
                status: 'failed'
            })
        ]);

        res.json({
            todaySuccess,
            todayFailed,
            totalSuccess,
            totalFailed
        });
    } catch (error) {
        console.error('獲取登入統計失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

// 生成隨機密碼函數
const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 6 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
};

// 管理員重置用戶密碼的路由
// 重置密碼路由
router.post('/reset-password', async (req, res) => {
    const { account } = req.body;

    try {
        if (!account) {
            return res.status(400).json({
                success: false,
                msg: '缺少必要參數'
            });
        }

        const user = await User.findOne({ account });
        if (!user) {
            return res.status(404).json({
                success: false,
                msg: '找不到該用戶'
            });
        }

        // 生成新的隨機密碼
        const newPassword = generateRandomPassword();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        user.isFirstLogin = true;
        await user.save();

        // 記錄操作歷史
        await LoginHistory.create({
            userId: user._id,
            account: user.account,
            employeeId: user.employeeId,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            status: 'success',
            failureReason: '管理員重置密碼'
        });

        // 發送密碼重置通知郵件
        await sendPasswordResetEmail(user.email, user.name, account, newPassword);

        res.json({
            success: true,
            msg: '密碼重置成功'
        });

    } catch (error) {
        console.error('密碼重置失敗:', error);
        res.status(500).json({
            success: false,
            msg: '密碼重置失敗，請重試'
        });
    }
});

module.exports = router;