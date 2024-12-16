const express = require('express');
const router = express.Router();
const NewEmployee = require('../models/NewEmployee');
const User = require('../models/User');
const {
    verifyToken,
    supervisorAuth,
    managerAuth,
    adminAuth,
} = require('../middleware/authMiddleware');
const {Types} = require("mongoose");

/**
 * 日期時間格式化工具函數
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

        if (!Array.isArray(employees) || employees.length === 0) {
            return res.status(400).json({ msg: '請提供有效的員工資料' });
        }

        const submitter = await User.findById(req.user.id)
            .select('employeeId department position')
            .lean();

        if (!submitter) {
            return res.status(404).json({ msg: '找不到提交者資訊' });
        }

        for (const employee of employees) {
            const { name, email, startDate } = employee;

            if (!name || !email || !startDate) {
                return res.status(400).json({ msg: '每位員工的姓名、電子郵件和到職日期都是必填的' });
            }

            const emailPrefix = email.replace('@gmail.com', '');
            const gmailRegex = /^[a-zA-Z0-9._%+-]+$/;
            if (!gmailRegex.test(emailPrefix)) {
                return res.status(400).json({ msg: 'Gmail 帳號格式不正確' });
            }

            const startDateTime = new Date(startDate);
            if (isNaN(startDateTime.getTime())) {
                return res.status(400).json({ msg: '無效的到職日期格式' });
            }

            if (startDateTime < new Date().setHours(0, 0, 0, 0)) {
                return res.status(400).json({ msg: '到職日期不能是過去的日期' });
            }
        }

        const newEmployees = employees.map(employee => ({
            ...employee,
            department: submitter.department,
            position: 'C',
            submittedBy: submitter.employeeId,
            status: 'pending'
        }));

        const result = await NewEmployee.insertMany(newEmployees);

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
router.get('/list', verifyToken, async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const user = await User.findById(req.user.id)
            .select('employeeId department position')
            .lean();

        if (!user) {
            return res.status(404).json({ msg: '找不到用戶資訊' });
        }

        // 驗證權限：只有主管和經理可以存取
        if (user.position !== 'S' && user.position !== 'M') {
            return res.status(403).json({ msg: '需要主管或經理權限' });
        }

        // 構建查詢條件，排除已建立帳號的員工
        const query = {
            department: user.department,
            hasAccount: false // 新增條件：只顯示未建立帳號的員工
        };

        if (status) {
            query.status = status;
        }

        // 主管只能看到自己提交的申請
        if (user.position === 'S') {
            query.submittedBy = user.employeeId;
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
router.post('/approve/:id', verifyToken, managerAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, comment } = req.body;

        // 加入請求資訊的日誌
        console.log('收到審核請求:', {
            id,
            status,
            comment,
            userId: req.user.id
        });

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({ msg: '無效的申請ID格式' });
        }

        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ msg: '請提供有效的審核狀態 (approved/rejected)' });
        }

        if (!comment) {
            return res.status(400).json({ msg: '備註是必填的' });
        }

        const manager = await User.findById(req.user.id)
            .select('employeeId department position')
            .lean();

        if (!manager) {
            return res.status(404).json({ msg: '找不到經理資訊' });
        }

        // 加入經理資訊的日誌
        console.log('經理資訊:', manager);

        if (!manager.employeeId) {
            return res.status(400).json({ msg: '經理資料缺少員工編號' });
        }

        const newEmployee = await NewEmployee.findById(id);
        if (!newEmployee) {
            return res.status(404).json({ msg: '找不到新進員工申請' });
        }

        // 加入申請資訊的日誌
        console.log('申請資訊:', {
            id: newEmployee._id,
            department: newEmployee.department,
            status: newEmployee.status
        });

        if (newEmployee.department !== manager.department) {
            return res.status(403).json({ msg: '無權審核其他部門的申請' });
        }

        if (newEmployee.status !== 'pending') {
            return res.status(400).json({ msg: '此申請已被處理' });
        }

        newEmployee.status = status;
        newEmployee.approvalChain = [{
            approverEmployeeId: manager.employeeId,
            status,
            comment,
            timestamp: new Date()
        }];

        try {
            await newEmployee.save();
        } catch (saveError) {
            console.error('保存審核資訊失敗:', saveError);
            if (saveError.name === 'ValidationError') {
                return res.status(400).json({
                    msg: '資料驗證失敗',
                    errors: Object.values(saveError.errors).map(err => err.message)
                });
            }
            throw saveError;
        }

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
        console.error('錯誤詳情:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });

        res.status(500).json({
            msg: '伺服器錯誤',
            error: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                type: error.name
            } : undefined
        });
    }
});

/**
 * 獲取待審核的新進員工申請
 * GET /api/new-employees/pending
 */
router.get('/pending', verifyToken, managerAuth, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const manager = await User.findById(req.user.id)
            .select('employeeId department position')
            .lean();

        if (!manager) {
            return res.status(404).json({ msg: '找不到經理資訊' });
        }

        const query = {
            department: manager.department,
            status: 'pending'
        };

        const total = await NewEmployee.countDocuments(query);

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

/**
 * 獲取已核准的新進員工列表
 * GET /api/new-employees/approved-list
 */

router.get('/approved-list', verifyToken, adminAuth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            department,
            startDate,
            endDate,
            hasAccount = null  // 新增參數，用於過濾是否已建立帳號
        } = req.query;

        // 構建查詢條件
        const query = {
            status: 'approved'
        };

        // 只有當 hasAccount 參數明確設置時才加入條件
        if (hasAccount !== null) {
            query.hasAccount = hasAccount === 'true';
        }

        // 部門篩選
        if (department) {
            query.department = department;
        }

        // 日期範圍篩選
        if (startDate || endDate) {
            query.startDate = {};
            if (startDate) {
                query.startDate.$gte = new Date(startDate);
            }
            if (endDate) {
                query.startDate.$lte = new Date(endDate);
            }
        }

        // 計算總數
        const total = await NewEmployee.countDocuments(query);

        // 獲取申請列表
        const employees = await NewEmployee.aggregate([
            { $match: query },
            { $sort: { startDate: 1 } },
            ...(page && limit ? [
                { $skip: (parseInt(page) - 1) * parseInt(limit) },
                { $limit: parseInt(limit) }
            ] : []),
            {
                $lookup: {
                    from: 'users',
                    localField: 'submittedBy',
                    foreignField: 'employeeId',
                    as: 'submitter'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'approvalChain.approverEmployeeId',
                    foreignField: 'employeeId',
                    as: 'approvers'
                }
            },
            { $unwind: { path: '$submitter', preserveNullAndEmptyArrays: true } }
        ]);

        // 處理審核鏈資訊
        const formattedEmployees = employees.map(employee => {
            const formattedEmployee = {
                ...employee,
                submitter: employee.submitter ? {
                    employeeId: employee.submitter.employeeId,
                    name: employee.submitter.name
                } : null
            };

            if (employee.approvalChain) {
                formattedEmployee.approvalChain = employee.approvalChain.map(approval => ({
                    ...approval,
                    approverName: employee.approvers?.find(
                        approver => approver.employeeId === approval.approverEmployeeId
                    )?.name || '未知'
                }));
            }

            delete formattedEmployee.approvers;
            return formattedEmployee;
        });

        res.json({
            employees: formattedEmployees,
            pagination: {
                total,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || total,
                totalPages: limit ? Math.ceil(total / parseInt(limit)) : 1
            }
        });

    } catch (error) {
        console.error('獲取已核准員工列表失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

module.exports = router;