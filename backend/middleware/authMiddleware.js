const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

// 設定無活動超時時間（30分鐘）
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

// 更新最後活動時間的中間件
const updateActivity = async (req, res, next) => {
    try {
        const bearerHeader = req.headers['authorization'];
        if (bearerHeader) {
            const token = bearerHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.id) {
                // 根據角色選擇要更新的模型
                const Model = decoded.role === 'admin' ? Admin : User;
                await Model.updateOne(
                    { _id: decoded.id },
                    { $set: { lastActivityTime: new Date() } }
                );
            }
        }
    } catch (error) {
        // 如果更新失敗，繼續執行但不中斷請求
        console.error('更新活動時間失敗:', error);
    }
    next();
};

// 基本 token 驗證（整合活動檢查）
const verifyToken = async (req, res, next) => {
    const bearerHeader = req.headers['authorization'];

    if (!bearerHeader) {
        return res.status(403).json({ message: '未提供 token' });
    }

    try {
        const token = bearerHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 根據角色選擇要查詢的模型
        const Model = decoded.role === 'admin' ? Admin : User;
        const user = await Model.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: '使用者不存在' });
        }

        // 檢查最後活動時間
        const lastActivity = user.lastActivityTime || user.lastLoginTime;
        if (lastActivity) {
            const inactiveTime = Date.now() - new Date(lastActivity).getTime();
            if (inactiveTime > INACTIVITY_TIMEOUT) {
                return res.status(401).json({
                    message: '由於長時間無操作，登入已過期',
                    reason: 'inactivity'
                });
            }
        }

        // 更新活動時間
        await Model.updateOne(
            { _id: user._id },
            { $set: { lastActivityTime: new Date() } }
        );

        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'token 已過期',
                reason: 'token_expired'
            });
        }
        return res.status(401).json({ message: 'token 無效' });
    }
};

// 經理權限驗證
const managerAuth = (req, res, next) => {
    if (req.user && (req.user.position === 'M' || req.user.role === 'admin')) {
        next();
    } else {
        return res.status(403).json({ message: '需要經理權限' });
    }
};

// 主管權限驗證
const supervisorAuth = (req, res, next) => {
    if (req.user && (req.user.position === 'S' || req.user.role === 'admin')) {
        next();
    } else {
        return res.status(403).json({ message: '需要主管權限' });
    }
};

// 管理員權限驗證
const adminAuth = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: '需要管理員權限' });
    }
};

module.exports = {
    verifyToken,
    updateActivity,
    supervisorAuth,
    adminAuth,
    managerAuth,
    INACTIVITY_TIMEOUT
};