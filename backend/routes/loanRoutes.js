// routes/loanRoutes.js
const express = require('express');
const router = express.Router();
const LoanApplication = require('../models/LoanApplication');
const User = require('../models/User');
const { verifyToken, supervisorAuth, managerAuth } = require('../middleware/authMiddleware');

/**
 * 提交貸款申請
 */
router.post('/apply', verifyToken, async (req, res) => {
    try {
        // 先驗證部門
        if (req.user.department !== 'LD') {
            return res.status(403).json({ msg: '只有借貸部門可以提交申請' });
        }

        // 查詢用戶獲取 employeeId
        const user = await User.findById(req.user.id)
            .select('employeeId')
            .lean();

        if (!user) {
            return res.status(404).json({ msg: '找不到用戶資訊' });
        }

        const { customerInfo, loanInfo } = req.body;

        const application = new LoanApplication({
            employeeId: user.employeeId,  // 使用查詢到的 employeeId
            department: req.user.department,
            position: req.user.position,
            customerInfo,
            loanInfo
        });

        await application.save();

        res.status(201).json({
            msg: '貸款申請已送出',
            application: {
                ...application.toObject(),
                formattedAmount: application.formatAmount()
            }
        });

    } catch (error) {
        console.error('提交貸款申請失敗:', error);
        res.status(500).json({
            msg: '提交申請失敗',
            error: error.message
        });
    }
});

/**
 * 取得貸款申請列表
 */
// 修改 /list 路由
router.get('/list', verifyToken, async (req, res) => {
    try {
        const { status, minAmount, page = 1, limit = 10 } = req.query;

        const user = await User.findById(req.user.id)
            .select('employeeId department position')
            .lean();

        if (user.department !== 'LD') {
            return res.status(403).json({ msg: '只有借貸部門可以查看申請' });
        }

        // 建立查詢條件
        const query = {};

        // 設置用戶權限相關的查詢條件
        if (user.position === 'C') {
            query.employeeId = user.employeeId;
        }

        // 狀態過濾
        if (status) {
            query.status = status;
        }

        // 金額過濾
        if (minAmount) {
            query['loanInfo.amount'] = { $gte: parseInt(minAmount) };
        }

        const total = await LoanApplication.countDocuments(query);

        // 使用 aggregate 替代 find
        const applications = await LoanApplication.aggregate([
            { $match: query },
            { $sort: { createdAt: -1 } },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) },
            {
                $lookup: {
                    from: 'users',
                    localField: 'employeeId',
                    foreignField: 'employeeId',
                    as: 'employee'
                }
            },
            {
                $addFields: {
                    employeeName: { $arrayElemAt: ['$employee.name', 0] }
                }
            },
            {
                $project: {
                    employee: 0  // 移除完整的 employee 陣列
                }
            }
        ]);

        res.json({
            applications,
            pagination: {
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('獲取貸款申請列表失敗:', error);
        res.status(500).json({ msg: '獲取申請列表失敗' });
    }
});
/**
 * 主管審核貸款申請
 */
router.post('/supervisor-review/:id', verifyToken, supervisorAuth, async (req, res) => {
    try {
        // 查詢用戶獲取 employeeId
        const user = await User.findById(req.user.id)
            .select('employeeId department name')
            .lean();

        if (!user) {
            return res.status(404).json({ msg: '找不到用戶資訊' });
        }

        // 驗證部門
        if (user.department !== 'LD') {
            return res.status(403).json({ msg: '只有借貸部門可以審核申請' });
        }

        const { status, comment } = req.body;
        const applicationId = req.params.id;

        // 查找貸款申請
        const application = await LoanApplication.findById(applicationId);
        if (!application) {
            return res.status(404).json({ msg: '找不到此申請案件' });
        }

        // 確認案件狀態
        if (application.status !== 'pending') {
            return res.status(400).json({ msg: '此申請案件已被審核' });
        }

        // 檢查是否重複審核
        const hasReviewed = application.approvalChain.some(
            review => review.approverEmployeeId === user.employeeId
        );
        if (hasReviewed) {
            return res.status(400).json({ msg: '您已審核過此申請' });
        }

        // 新增審核記錄
        application.approvalChain.push({
            approverEmployeeId: user.employeeId,
            approverName: user.name,
            approverPosition: 'S',
            status: status,
            comment: comment,
            timestamp: new Date()
        });

        // 更新申請狀態
        if (status === 'rejected') {
            application.status = 'rejected';
        } else if (status === 'approved') {
            // 判斷金額是否需要經理審核
            if (application.loanInfo.amount >= 5000000) {
                application.status = 'processing'; // 等待經理審核
            } else {
                application.status = 'approved';
            }
        }

        await application.save();

        res.json({
            msg: '審核完成',
            application: {
                ...application.toObject(),
                formattedAmount: application.formatAmount()
            }
        });

    } catch (error) {
        console.error('審核申請失敗:', error);
        res.status(500).json({
            msg: '審核失敗',
            error: error.message
        });
    }
});

// loanRoutes.js

/**
 * 經理審核貸款申請
 */
router.post('/manager-review/:id', verifyToken, managerAuth, async (req, res) => {
    try {
        // 查詢用戶獲取 employeeId
        const user = await User.findById(req.user.id)
            .select('employeeId department name')
            .lean();

        if (!user) {
            return res.status(404).json({ msg: '找不到用戶資訊' });
        }

        // 驗證部門
        if (user.department !== 'LD') {
            return res.status(403).json({ msg: '只有借貸部門可以審核申請' });
        }

        const { status, comment } = req.body;
        const applicationId = req.params.id;

        // 查找貸款申請
        const application = await LoanApplication.findById(applicationId);
        if (!application) {
            return res.status(404).json({ msg: '找不到此申請案件' });
        }

        // 確認案件狀態是否為 processing（主管已審核通過）
        if (application.status !== 'processing') {
            return res.status(400).json({ msg: '此申請案件狀態不正確' });
        }

        // 確認金額是否達到經理審核標準
        if (application.loanInfo.amount < 5000000) {
            return res.status(400).json({ msg: '此申請金額未達經理審核標準' });
        }

        // 檢查是否重複審核
        const hasReviewed = application.approvalChain.some(
            review => review.approverEmployeeId === user.employeeId
        );
        if (hasReviewed) {
            return res.status(400).json({ msg: '您已審核過此申請' });
        }

        // 新增審核記錄
        application.approvalChain.push({
            approverEmployeeId: user.employeeId,
            approverPosition: 'M',
            approverName: user.name,
            status: status,
            comment: comment,
            timestamp: new Date()
        });

        // 更新申請狀態（經理為最終審核）
        application.status = status === 'approved' ? 'approved' : 'rejected';

        await application.save();

        res.json({
            msg: '審核完成',
            application: {
                ...application.toObject(),
                formattedAmount: application.formatAmount()
            }
        });

    } catch (error) {
        console.error('審核申請失敗:', error);
        res.status(500).json({
            msg: '審核失敗',
            error: error.message
        });
    }
});

/**
 * 獲取審核紀錄
 */
router.get('/review-history', verifyToken, async (req, res) => {
    try {
        // 查詢用戶獲取資訊
        const user = await User.findById(req.user.id)
            .select('employeeId department position')
            .lean();

        if (!user) {
            return res.status(404).json({ msg: '找不到用戶資訊' });
        }

        // 驗證部門
        if (user.department !== 'LD') {
            return res.status(403).json({ msg: '只有借貸部門可以查看審核紀錄' });
        }

        // 驗證職位（只有主管和經理可以查看）
        if (!['S', 'M'].includes(user.position)) {
            return res.status(403).json({ msg: '沒有權限查看審核紀錄' });
        }

        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // 構建查詢條件 - 只查有審核紀錄的案件
        const query = {
            approvalChain: { $exists: true, $ne: [] }
        };

        // 計算總數
        const total = await LoanApplication.countDocuments(query);

        // 獲取審核記錄
// 查詢貸款申請並關聯用戶資訊
        const reviews = await LoanApplication.aggregate([
            { $match: query },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) },
            {
                $lookup: {
                    from: 'users',
                    localField: 'employeeId',
                    foreignField: 'employeeId',
                    as: 'employee'
                }
            },
            {
                $addFields: {
                    employeeName: { $arrayElemAt: ['$employee.name', 0] }
                }
            },
            {
                $project: {
                    employee: 0
                }
            }
        ]);

        res.json({
            reviews,
            pagination: {
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('獲取審核紀錄失敗:', error);
        res.status(500).json({
            msg: '獲取審核紀錄失敗',
            error: error.message
        });
    }
});

router.get('/stats', verifyToken, async (req, res) => {
    try {
        // 先查詢用戶資訊
        const user = await User.findById(req.user.id)
            .select('employeeId department position')
            .lean();

        if (!user) {
            return res.status(404).json({ msg: '找不到用戶資訊' });
        }

        // 驗證部門
        if (user.department !== 'LD') {
            return res.status(403).json({ msg: '只有借貸部門可以查看統計' });
        }

        // 建立基本查詢條件
        let query = {};

        // 如果是一般職員，只能看到自己的申請
        if (user.position === 'C') {
            query.employeeId = user.employeeId;
        }

        // 計算各狀態的數量
        const stats = {
            pendingLoans: await LoanApplication.countDocuments({ ...query, status: 'pending' }),
            processingLoans: await LoanApplication.countDocuments({ ...query, status: 'processing' }),
            completedLoans: await LoanApplication.countDocuments({ ...query, status: 'approved' }),
            rejectedLoans: await LoanApplication.countDocuments({ ...query, status: 'rejected' })
        }

        // 增加總數統計
        stats.totalLoans = Object.values(stats).reduce((acc, curr) => acc + curr, 0);

        res.json(stats);
    } catch (error) {
        console.error('獲取統計數據失敗:', error);
        res.status(500).json({
            msg: '獲取統計數據失敗',
            error: error.message
        });
    }
});

// 在 loanRoutes.js 添加
router.get('/trend', verifyToken, async (req, res) => {
    try {
        const { range = 'week' } = req.query;
        const endDate = new Date();
        const startDate = new Date();

        if (range === 'week') {
            startDate.setDate(endDate.getDate() - 7);
        } else {
            startDate.setMonth(endDate.getMonth() - 1);
        }

        const pipeline = [
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        status: "$status"
                    },
                    count: { $sum: 1 }
                }
            }
        ];

        const result = await LoanApplication.aggregate(pipeline);

        // 組織數據以供前端使用
        const chartData = [];
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().split('T')[0];
            const dayData = {
                date: dateString,
                pending: 0,
                approved: 0,
                rejected: 0
            };

            result.forEach(item => {
                if (item._id.date === dateString) {
                    dayData[item._id.status] = item.count;
                }
            });

            chartData.push(dayData);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        res.json(chartData);
    } catch (error) {
        console.error('獲取貸款趨勢數據失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

// 在 leave.js 添加
router.get('/distribution', verifyToken, async (req, res) => {
    try {
        const { range = 'week' } = req.query;
        const endDate = new Date();
        const startDate = new Date();

        if (range === 'week') {
            startDate.setDate(endDate.getDate() - 7);
        } else {
            startDate.setMonth(endDate.getMonth() - 1);
        }

        const pipeline = [
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                    status: 'approved'
                }
            },
            {
                $group: {
                    _id: "$leaveType",
                    count: { $sum: 1 }
                }
            }
        ];

        const result = await Leave.aggregate(pipeline);

        // 轉換請假類型名稱為中文
        const typeNameMap = {
            'annual': '特休',
            'sick': '病假',
            'personal': '事假',
            'funeral': '喪假',
            'marriage': '婚假',
            'maternity': '產假'
        };

        const chartData = result.map(item => ({
            type: typeNameMap[item._id] || item._id,
            value: item.count
        }));

        res.json(chartData);
    } catch (error) {
        console.error('獲取請假分布數據失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

module.exports = router;