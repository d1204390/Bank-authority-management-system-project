const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const LoginAttempt = require('../models/LoginAttempt');
const { sendLockAccountEmail } = require('../utils/emailService');

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
            { id: admin._id, account: admin.account },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            msg: '登入成功',
            token,
            admin: {
                id: admin._id,
                name: admin.name,
                account: admin.account
            }
        });

    } catch (error) {
        console.error('伺服器錯誤:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

module.exports = router;