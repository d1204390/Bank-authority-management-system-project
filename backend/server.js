const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});