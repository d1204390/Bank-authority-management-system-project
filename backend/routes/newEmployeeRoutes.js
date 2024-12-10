const express = require('express');
const router = express.Router();
const NewEmployee = require('../models/NewEmployee');
const User = require('../models/User');
const { verifyToken, supervisorAuth } = require('../middleware/authMiddleware');

/**
 * 日期時間格式化工具函數
 * @param {Date} date 要格式化的日期
 * @returns {string} 格式化後的日期時間字串
 */
const formatDateTime = (date) => {
    if (!(date instanceof Date) || isNaN(date)) {
        console.error('Invalid date input:', date);
        return '-';
    }

    try {
        const taipeiDate = new Date(date.toLocaleString('en-US', {
            timeZone: 'Asia/Taipei'
        }));

        return taipeiDate.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Taipei'
        }).replace(/\//g, '-');
    } catch (error) {
        console.error('Date formatting error:', error);
        return '-';
    }
};

/**
 * 提交新進員工申請
 * POST /api/new-employees/submit
 */
router.post('/submit', verifyToken, supervisorAuth, async (req, res) => {
    try {
        const { employees } = req.body;

        // 驗證必要欄位
        if (!Array.isArray(employees) || employees.length === 0) {
            return res.status(400).json({ msg: '請提供有效的員工資料' });
        }

        // 獲取提交者資訊
        const submitter = await User.findById(req.user.id)
            .select('employeeId department position')
            .lean();

        if (!submitter) {
            return res.status(404).json({ msg: '找不到提交者資訊' });
        }

        // 驗證每個員工資料
        for (const employee of employees) {
            const { name, email, startDate } = employee;

            if (!name || !email || !startDate) {
                return res.status(400).json({ msg: '每位員工的姓名、電子郵件和到職日期都是必填的' });
            }

            // 驗證 Gmail 格式
            const emailPrefix = email.replace('@gmail.com', '');
            const gmailRegex = /^[a-zA-Z0-9._%+-]+$/;
            if (!gmailRegex.test(emailPrefix)) {
                return res.status(400).json({ msg: 'Gmail 帳號格式不正確' });
            }

            // 驗證到職日期
            const startDateTime = new Date(startDate);
            if (isNaN(startDateTime.getTime())) {
                return res.status(400).json({ msg: '無效的到職日期格式' });
            }

            // 驗證到職日期不能是過去的日期
            if (startDateTime < new Date().setHours(0, 0, 0, 0)) {
                return res.status(400).json({ msg: '到職日期不能是過去的日期' });
            }
        }

        // 創建新進員工記錄
        const newEmployees = employees.map(employee => ({
            ...employee,
            department: submitter.department,
            position: 'C', // 固定為科員
            submittedBy: submitter.employeeId,
            status: 'pending'
        }));

        const result = await NewEmployee.insertMany(newEmployees);

        // 格式化返回數據
        const formattedEmployees = result.map(employee => ({
            ...employee.toObject(),
            startDate: formatDateTime(employee.startDate),
            createdAt: formatDateTime(employee.createdAt)
        }));

        res.status(201).json({
            msg: `成功提交 ${result.length} 位新進員工資料`,
            employees: formattedEmployees
        });

    } catch (error) {
        console.error('提交新進員工失敗:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                msg: '資料驗證失敗',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({
            msg: '伺服器錯誤',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * 獲取新進員工申請列表
 * GET /api/new-employees/list
 */
router.get('/list', verifyToken, supervisorAuth, async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const user = await User.findById(req.user.id)
            .select('employeeId department')
            .lean();

        if (!user) {
            return res.status(404).json({ msg: '找不到用戶資訊' });
        }

        // 構建查詢條件
        const query = {
            department: user.department
        };

        if (status) {
            query.status = status;
        }

        // 計算總數
        const total = await NewEmployee.countDocuments(query);

        // 獲取申請列表
        const employees = await NewEmployee.aggregate([
            { $match: query },
            { $sort: { createdAt: -1 } },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) },
            {
                $lookup: {
                    from: 'users',
                    localField: 'submittedBy',
                    foreignField: 'employeeId',
                    as: 'submitter'
                }
            },
            { $unwind: '$submitter' }
        ]);

        // 格式化數據
        const formattedEmployees = employees.map(employee => ({
            ...employee,
            startDate: formatDateTime(employee.startDate),
            createdAt: formatDateTime(employee.createdAt),
            submitter: {
                employeeId: employee.submitter.employeeId,
                name: employee.submitter.name
            }
        }));

        res.json({
            employees: formattedEmployees,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('獲取新進員工列表失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

/**
 * 經理審核新進員工申請
 * POST /api/new-employees/approve/:id
 */
router.post('/approve/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, comment } = req.body;

        // 驗證必要欄位
        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ msg: '請提供有效的審核狀態 (approved/rejected)' });
        }

        if (!comment) {
            return res.status(400).json({ msg: '備註是必填的' });
        }

        // 獲取經理資訊
        const manager = await User.findById(req.user.id)
            .select('employeeId department position')
            .lean();

        if (!manager) {
            return res.status(404).json({ msg: '找不到經理資訊' });
        }

        // 驗證是否為經理
        if (manager.position !== 'M') {
            return res.status(403).json({ msg: '只有經理可以審核新進員工申請' });
        }

        // 獲取申請資訊
        const newEmployee = await NewEmployee.findById(id);
        if (!newEmployee) {
            return res.status(404).json({ msg: '找不到新進員工申請' });
        }

        // 確保經理只能審核自己部門的申請
        if (newEmployee.department !== manager.department) {
            return res.status(403).json({ msg: '無權審核其他部門的申請' });
        }

        // 確保申請是待審核狀態
        if (newEmployee.status !== 'pending') {
            return res.status(400).json({ msg: '此申請已被處理' });
        }

        // 更新申請狀態
        newEmployee.status = status;
        newEmployee.approvalChain = [{
            approverEmployeeId: manager.employeeId,
            status,
            comment,
            timestamp: new Date()
        }];

        await newEmployee.save();

        // 格式化返回數據
        const formattedEmployee = {
            ...newEmployee.toObject(),
            startDate: formatDateTime(newEmployee.startDate),
            createdAt: formatDateTime(newEmployee.createdAt),
            approvalChain: newEmployee.approvalChain.map(approval => ({
                ...approval.toObject(),
                timestamp: formatDateTime(approval.timestamp)
            }))
        };

        res.json({
            msg: `新進員工申請已${status === 'approved' ? '核准' : '駁回'}`,
            employee: formattedEmployee
        });

    } catch (error) {
        console.error('審核新進員工申請失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

/**
 * 獲取待審核的新進員工申請
 * GET /api/new-employees/pending
 */
router.get('/pending', verifyToken, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        // 獲取經理資訊
        const manager = await User.findById(req.user.id)
            .select('employeeId department position')
            .lean();

        if (!manager) {
            return res.status(404).json({ msg: '找不到經理資訊' });
        }

        // 驗證是否為經理
        if (manager.position !== 'M') {
            return res.status(403).json({ msg: '只有經理可以查看待審核申請' });
        }

        // 構建查詢條件
        const query = {
            department: manager.department,
            status: 'pending'
        };

        // 計算總數
        const total = await NewEmployee.countDocuments(query);

        // 獲取待審核申請
        const employees = await NewEmployee.aggregate([
            { $match: query },
            { $sort: { createdAt: -1 } },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) },
            {
                $lookup: {
                    from: 'users',
                    localField: 'submittedBy',
                    foreignField: 'employeeId',
                    as: 'submitter'
                }
            },
            { $unwind: '$submitter' }
        ]);

        // 格式化數據
        const formattedEmployees = employees.map(employee => ({
            ...employee,
            startDate: formatDateTime(employee.startDate),
            createdAt: formatDateTime(employee.createdAt),
            submitter: {
                employeeId: employee.submitter.employeeId,
                name: employee.submitter.name
            }
        }));

        res.json({
            employees: formattedEmployees,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('獲取待審核申請失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

module.exports = router;