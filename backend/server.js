//server.js
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const loginHistoryCleanup = require('./utils/loginHistoryCleanup');
require('dotenv').config({ path: './backend/.env' });

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors());
// 增加上傳限制大小以支援 base64 圖片
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Basic test route
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Admin routes
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

// User routes
const userRoutes = require('./routes/user');
app.use('/api/user', userRoutes);

// Leave routes
const leaveRoutes = require('./routes/leave');
app.use('/api/leave', leaveRoutes);

// Loan routes
const loanRoutes = require('./routes/loanRoutes');
app.use('/api/loan', loanRoutes);

// 新增新進員工路由
const newEmployeeRoutes = require('./routes/newEmployeeRoutes');
app.use('/api/new-employees', newEmployeeRoutes);

//建立批量帳號
const accountRoutes = require('./routes/accountRoutes');
app.use('/api/accounts', accountRoutes);

// 啟動登入記錄清理服務
loginHistoryCleanup.start();

// 當應用程式關閉時停止清理服務
process.on('SIGTERM', () => {
    console.log('正在關閉應用程式...');
    loginHistoryCleanup.stop();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('接收到中斷信號，正在關閉應用程式...');
    loginHistoryCleanup.stop();
    process.exit(0);
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// 關閉服務器
process.on('unhandledRejection', (err) => {
    console.error('未處理的 Promise rejection:', err);
    server.close(() => {
        console.log('伺服器已關閉');
        process.exit(1);
    });
});