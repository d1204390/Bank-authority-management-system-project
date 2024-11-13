// user.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const mongoose = require('mongoose');  // 添加 mongoose 導入

// 驗證請求必填欄位
const validateFields = (fields, res) => {
    const missingFields = fields.filter(field => !field.value);
    if (missingFields.length > 0) {
        res.status(400).json({ msg: `缺少必要欄位：${missingFields.map(f => f.name).join(', ')}` });
        return false;
    }
    return true;
};

// 使用者註冊
router.post('/register', async (req, res) => {
    const { name, department, position, account, password } = req.body;

    // 驗證必填欄位
    if (!validateFields([
        { name: 'name', value: name },
        { name: 'department', value: department },
        { name: 'position', value: position },
        { name: 'account', value: account },
        { name: 'password', value: password }
    ], res)) return;

    try {
        // 檢查帳號是否已存在
        if (await User.exists({ account })) {
            return res.status(400).json({ msg: '帳號已存在' });
        }

        // 哈希密碼並創建新使用者
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            name,
            department,
            position,
            account,
            password: hashedPassword,
        });

        res.status(201).json({ msg: '使用者創建成功', user: newUser });
    } catch (error) {
        console.error('伺服器錯誤:', error.message);
        res.status(500).json({ msg: '伺服器錯誤', error: error.message });
    }
});

// 使用者登入
router.post('/login', async (req, res) => {
    const { account, password } = req.body;

    // 驗證必填欄位
    if (!validateFields([
        { name: 'account', value: account },
        { name: 'password', value: password }
    ], res)) return;

    try {
        // 查找使用者並驗證帳號和密碼
        const user = await User.findOne({ account });
        if (!user) {
            return res.status(400).json({ msg: '帳號不存在' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: '密碼錯誤' });
        }

        // 創建 JWT
        const token = jwt.sign(
            { id: user._id, account: user.account, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            msg: '登入成功',
            token,
            user: {
                id: user._id,
                name: user.name,
                account: user.account,
                role: user.role
            }
        });
    } catch (error) {
        console.error('伺服器錯誤:', error.message);
        res.status(500).json({ msg: '伺服器錯誤', error: error.message });
    }
});

// 獲取所有使用者
router.get('/employees', async (req, res) => {
    try {
        const users = await User.find({}, '-password');  // 避免返回密碼欄位
        res.json(users);
    } catch (error) {
        console.error('獲取使用者列表失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

// 刪除使用者
router.delete('/employee', async (req, res) => {
    const { account } = req.body;

    // 驗證帳號欄位是否存在
    if (!account) {
        return res.status(400).json({ msg: '缺少帳號參數' });
    }

    try {
        const user = await User.findOne({ account });
        if (!user) {
            return res.status(404).json({ msg: '使用者不存在' });
        }

        await User.deleteOne({ account });  // 依據帳號刪除使用者
        res.json({ msg: '刪除成功' });
    } catch (error) {
        console.error('刪除使用者失敗:', error.message);
        res.status(500).json({ msg: '伺服器錯誤', error: error.message });
    }
});

module.exports = router;
