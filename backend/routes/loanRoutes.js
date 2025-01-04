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
router.get('/list', verifyToken, async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const user = await User.findById(req.user.id)
            .select('employeeId department position')
            .lean();

        if (user.department !== 'LD') {
            return res.status(403).json({ msg: '只有借貸部門可以查看申請' });
        }

        const query = {};

        if (user.position === 'C') {
            query.employeeId = user.employeeId;
        }

        if (status) {
            query.status = status;
        }

        const total = await LoanApplication.countDocuments(query);

        const applications = await LoanApplication.find(query)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .lean();

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
            .select('employeeId department')
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
            .select('employeeId department')
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
        const reviews = await LoanApplication.find(query)
            .sort({ 'createdAt': -1 }) // 依建立時間排序
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

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

module.exports = router;