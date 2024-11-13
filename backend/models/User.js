// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: false
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
        default: 'user',
        required: false
    },
    position: {
        type: String,
        required: false
    },
    department: {
        type: String,
        required: false
    },
    extension: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: false,
        unique: false,  // 移除 unique 限制
        sparse: true    // 允許多個 null 值
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);