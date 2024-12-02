const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const User = require('../models/User');
const { verifyToken, supervisorAuth } = require('../middleware/authMiddleware');

// 日期時間格式化工具函數
const formatDateTime = (date) => {
    return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Taipei'
    }).replace(/\//g, '-');
};

// 提交請假申請
router.post('/apply', verifyToken, async (req, res) => {
    try {
        const { leaveType, startDate, endDate, duration, reason } = req.body;

        // 先獲取用戶信息，只選取必要欄位
        const user = await User.findById(req.user.id)
            .select('employeeId department position')
            .lean();

        if (!user) {
            return res.status(404).json({ msg: '找不到用戶信息' });
        }

        // 驗證請假時數
        if (duration < 0.5) {
            return res.status(400).json({ msg: '請假時間不能少於半小時' });
        }

        // 如果是特休，檢查剩餘天數
        if (leaveType === 'annual') {
            const remainingDays = await Leave.getRemainingAnnualLeave(
                user.employeeId,
                new Date(startDate).getFullYear()
            );

            const requestedDays = duration / 8;
            if (requestedDays > remainingDays) {
                return res.status(400).json({
                    msg: '特休時數不足',
                    remainingDays,
                    requestedHours: duration
                });
            }
        }

        // 驗證日期
        const startDateTime = new Date(startDate);
        const endDateTime = new Date(endDate);

        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
            return res.status(400).json({ msg: '無效的日期格式' });
        }

        if (endDateTime < startDateTime) {
            return res.status(400).json({ msg: '結束時間必須晚於開始時間' });
        }

        // 創建請假申請
        const leave = new Leave({
            employeeId: user.employeeId,
            department: user.department,
            position: user.position,
            leaveType,
            startDate: startDateTime,
            endDate: endDateTime,
            duration,
            reason,
            status: 'pending'
        });

        await leave.save();

        // 格式化返回數據
        const formattedLeave = {
            ...leave.toObject(),
            startDate: formatDateTime(leave.startDate),
            endDate: formatDateTime(leave.endDate)
        };

        res.status(201).json({
            msg: '請假申請已送出',
            leave: formattedLeave
        });

    } catch (error) {
        console.error('提交請假申請失敗:', error);
        res.status(500).json({
            msg: '伺服器錯誤',
            error: error.message
        });
    }
});

// 獲取請假列表 - 優化查詢效能
router.get('/list', verifyToken, async (req, res) => {
    try {
        const { status } = req.query;
        const user = await User.findById(req.user.id)
            .select('employeeId department position')
            .lean();

        if (!user) {
            return res.status(404).json({ msg: '找不到用戶信息' });
        }

        let query = {};

        if (user.position === 'S') {
            query.department = user.department;
        } else {
            query.employeeId = user.employeeId;
        }

        if (status) {
            query.status = status;
        }

        const leaves = await Leave.find(query)
            .select('employeeId department position leaveType startDate endDate duration reason status approvalChain createdAt')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const formattedLeaves = leaves.map(leave => ({
            _id: leave._id,
            employeeId: leave.employeeId,
            department: leave.department,
            position: leave.position,
            leaveType: leave.leaveType,
            startDate: formatDateTime(leave.startDate),
            endDate: formatDateTime(leave.endDate),
            duration: leave.duration,
            reason: leave.reason,
            status: leave.status,
            approvalChain: leave.approvalChain,
            createdAt: formatDateTime(leave.createdAt)
        }));

        const etag = require('crypto')
            .createHash('md5')
            .update(JSON.stringify(formattedLeaves))
            .digest('hex');

        res.set({
            'Cache-Control': 'private, max-age=300',
            'ETag': etag
        });

        res.json(formattedLeaves);

    } catch (error) {
        console.error('獲取請假列表失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

// 獲取剩餘特休天數 - 優化查詢效能
router.get('/annual-leave/remaining', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('employeeId')
            .lean();

        if (!user) {
            return res.status(404).json({ msg: '找不到用戶信息' });
        }

        const year = new Date().getFullYear();

        const result = await Leave.aggregate([
            {
                $match: {
                    employeeId: user.employeeId,
                    leaveType: 'annual',
                    status: 'approved',
                    startDate: {
                        $gte: new Date(year, 0, 1),
                        $lte: new Date(year, 11, 31, 23, 59, 59)
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalUsedHours: { $sum: '$duration' }
                }
            }
        ]);

        const totalAnnualLeave = 14;
        const usedHours = result[0]?.totalUsedHours || 0;
        const usedDays = usedHours / 8;
        const remainingDays = totalAnnualLeave - usedDays;

        const responseData = {
            remainingDays: Math.round(remainingDays * 100) / 100,
            usedDays: Math.round(usedDays * 100) / 100,
            year
        };

        // 設置快取標頭
        const etag = require('crypto')
            .createHash('md5')
            .update(JSON.stringify(responseData))
            .digest('hex');

        res.set({
            'Cache-Control': 'private, max-age=300',
            'ETag': etag
        });

        res.json(responseData);
    } catch (error) {
        console.error('獲取剩餘特休失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

// 主管審核請假
router.post('/approve/:leaveId', verifyToken, supervisorAuth, async (req, res) => {
    try {
        const { leaveId } = req.params;
        const { status, comment } = req.body;

        // 只選取必要欄位
        const user = await User.findById(req.user.id)
            .select('employeeId department')
            .lean();

        if (!user) {
            return res.status(404).json({ msg: '找不到用戶信息' });
        }

        const leave = await Leave.findById(leaveId);
        if (!leave) {
            return res.status(404).json({ msg: '找不到請假申請' });
        }

        if (leave.department !== user.department) {
            return res.status(403).json({ msg: '無權審核其他部門的請假申請' });
        }

        if (leave.status !== 'pending') {
            return res.status(400).json({ msg: '此請假申請已被處理' });
        }

        leave.status = status;
        leave.approvalChain.push({
            approverEmployeeId: user.employeeId,
            status,
            comment,
            timestamp: new Date()
        });

        await leave.save();

        const formattedLeave = {
            ...leave.toObject(),
            startDate: formatDateTime(leave.startDate),
            endDate: formatDateTime(leave.endDate)
        };

        res.json({
            msg: `請假申請已${status === 'approved' ? '核准' : '駁回'}`,
            leave: formattedLeave
        });

    } catch (error) {
        console.error('審核請假失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

// 取消請假申請
router.post('/cancel/:leaveId', verifyToken, async (req, res) => {
    try {
        const { leaveId } = req.params;

        // 只選取必要欄位
        const user = await User.findById(req.user.id)
            .select('employeeId')
            .lean();

        if (!user) {
            return res.status(404).json({ msg: '找不到用戶信息' });
        }

        const leave = await Leave.findById(leaveId);
        if (!leave) {
            return res.status(404).json({ msg: '找不到請假申請' });
        }

        if (leave.employeeId !== user.employeeId) {
            return res.status(403).json({ msg: '只有申請人可以取消請假申請' });
        }

        if (leave.status !== 'pending') {
            return res.status(400).json({ msg: '只能取消待審核的請假申請' });
        }

        leave.status = 'cancelled';
        await leave.save();

        res.json({
            msg: '請假申請已取消',
            leaveId
        });

    } catch (error) {
        console.error('取消請假失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

module.exports = router;