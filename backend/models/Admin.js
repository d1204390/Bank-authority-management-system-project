// models/Admin.js
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    account: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'admin',
        required: true
    },
    email: {           // 添加 email 欄位
        type: String,
        required: true, // 如果希望是必填的話
        unique: true   // 如果希望 email 是唯一的話
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Admin', adminSchema);