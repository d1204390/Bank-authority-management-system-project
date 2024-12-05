//authMiddleware.js
const jwt = require('jsonwebtoken');

// 基本 token 驗證
const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];

    if (!bearerHeader) {
        return res.status(403).json({ message: '未提供 token' });
    }

    try {
        const token = bearerHeader.split(' ')[1];  // Bearer token
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'token 無效或已過期' });
    }
};

// 主管權限驗證
const supervisorAuth = (req, res, next) => {
    if (req.user && req.user.position === 'S') {
        next();
    } else {
        return res.status(403).json({ message: '需要主管權限' });
    }
};

module.exports = {
    verifyToken,
    supervisorAuth
};