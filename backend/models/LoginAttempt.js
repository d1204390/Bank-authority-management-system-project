// models/LoginAttempt.js
const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema({
    account: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true,
        enum: ['admin', 'user'], // 限制角色只能是這兩種
        default: 'user'
    },
    attempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date,
        default: null
    },
    lastAttempt: {
        type: Date,
        default: Date.now
    },
    ipAddress: {  // 可選：記錄登入IP
        type: String
    },
    status: {     // 可選：記錄當前狀態
        type: String,
        enum: ['normal', 'locked'],
        default: 'normal'
    }
}, {
    timestamps: true  // 自動添加 createdAt 和 updatedAt
});

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);