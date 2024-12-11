const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const User = require('../models/User');
const { verifyToken, supervisorAuth } = require('../middleware/authMiddleware');
const {
    WORK_HOURS,
    calculateWorkingHours,
    isWithinWorkHours,
    formatDuration
} = require('../utils/leaveTimeUtils');

/**
 * 日期時間格式化工具函數
 * @param {Date} date 要格式化的日期
 * @returns {string} 格式化後的日期時間字串
 */
const formatDateTime = (date) => {
    // 確保輸入是有效的日期物件
    if (!(date instanceof Date) || isNaN(date)) {
        console.error('Invalid date input:', date);
        return '-';
    }

    try {
        // 轉換為台北時區
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
 * 檢查是否為過去的日期
 * @param {Date} date 要檢查的日期
 * @returns {boolean} 是否為過去的日期
 */
const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
};

/**
 * 提交請假申請
 */
router.post('/apply', verifyToken, async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;

        // 驗證必要欄位
        if (!leaveType || !startDate || !endDate || !reason) {
            return res.status(400).json({ msg: '所有欄位都是必填的' });
        }

        // 獲取用戶信息
        const user = await User.findById(req.user.id)
            .select('employeeId department position')
            .lean();

        if (!user) {
            return res.status(404).json({ msg: '找不到用戶信息' });
        }

        // 驗證日期格式
        const startDateTime = new Date(startDate);
        const endDateTime = new Date(endDate);

        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
            return res.status(400).json({ msg: '無效的日期格式' });
        }

        // 驗證是否為過去的日期
        if (isPastDate(startDateTime) || isPastDate(endDateTime)) {
            return res.status(400).json({ msg: '不能申請過去的日期' });
        }

        // 驗證時間先後順序
        if (endDateTime < startDateTime) {
            return res.status(400).json({ msg: '結束時間必須晚於開始時間' });
        }

        // 驗證是否在工作時間內
        if (!isWithinWorkHours(startDateTime) || !isWithinWorkHours(endDateTime)) {
            return res.status(400).json({
                msg: `請假時間必須在工作時間內（${WORK_HOURS.START}-${WORK_HOURS.END}，不含午休${WORK_HOURS.LUNCH_START}-${WORK_HOURS.LUNCH_END}）`
            });
        }

        // 計算實際請假時數
        const duration = calculateWorkingHours(startDateTime, endDateTime);

        // 驗證最小請假時數
        if (duration < 0.5) {
            return res.status(400).json({ msg: '請假時間不能少於半小時' });
        }

        // 驗證最大請假天數
        const maxLeaveDays = 14; // 設定最大請假天數
        if (duration / 8 > maxLeaveDays) {
            return res.status(400).json({ msg: `單次請假不能超過 ${maxLeaveDays} 天` });
        }

        // 如果是特休，檢查剩餘天數
        if (leaveType === 'annual') {
            const remainingDays = await Leave.getRemainingAnnualLeave(
                user.employeeId,
                startDateTime.getFullYear()
            );

            const requestedDays = duration / 8;
            if (requestedDays > remainingDays) {
                return res.status(400).json({
                    msg: '特休時數不足',
                    remainingDays,
                    requestedDays,
                    requestedHours: duration
                });
            }
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
            endDate: formatDateTime(leave.endDate),
            duration: duration,
            formattedDuration: formatDuration(duration)
        };

        res.status(201).json({
            msg: '請假申請已送出',
            leave: formattedLeave
        });

    } catch (error) {
        console.error('提交請假申請失敗:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                msg: '資料驗證失敗',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        if (error.name === 'MongoError' && error.code === 11000) {
            return res.status(400).json({ msg: '重複的請假申請' });
        }

        res.status(500).json({
            msg: '伺服器錯誤',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * 獲取請假列表
 */
router.get('/list', verifyToken, async (req, res) => {
    try {
        const { status, self, page = 1, limit = 10 } = req.query;
        const user = await User.findById(req.user.id)
            .select('employeeId department position')
            .lean();

        if (!user) {
            return res.status(404).json({ msg: '找不到用戶信息' });
        }

        // 建立查詢條件
        const query = {};

        // 根據用戶角色設置查詢範圍
        if (user.position === 'S' && self !== 'true') {
            query.department = user.department;
        } else {
            query.employeeId = user.employeeId;
        }

        // 加入狀態篩選
        if (status) {
            query.status = status;
        }

        // 計算總數
        const count = await Leave.countDocuments(query);

        // 使用 aggregate 獲取請假列表
        const leaves = await Leave.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'users',
                    let: { approverIds: '$approvalChain.approverEmployeeId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ['$employeeId', '$$approverIds']
                                }
                            }
                        },
                        {
                            $project: {
                                employeeId: 1,
                                name: 1,
                                _id: 0
                            }
                        }
                    ],
                    as: 'approvers'
                }
            },
            {
                $addFields: {
                    approvalChain: {
                        $map: {
                            input: '$approvalChain',
                            as: 'approval',
                            in: {
                                $mergeObjects: [
                                    '$$approval',
                                    {
                                        approverName: {
                                            $let: {
                                                vars: {
                                                    approver: {
                                                        $arrayElemAt: [
                                                            {
                                                                $filter: {
                                                                    input: '$approvers',
                                                                    cond: { $eq: ['$$this.employeeId', '$$approval.approverEmployeeId'] }
                                                                }
                                                            },
                                                            0
                                                        ]
                                                    }
                                                },
                                                in: '$$approver.name'
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            { $sort: { createdAt: -1 } },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) }
        ]);

        // 格式化數據
        const formattedLeaves = leaves.map(leave => ({
            ...leave,
            startDate: formatDateTime(new Date(leave.startDate)),
            endDate: formatDateTime(new Date(leave.endDate)),
            formattedDuration: formatDuration(leave.duration),
            createdAt: formatDateTime(new Date(leave.createdAt)),
            cancelledAt: leave.cancelledAt ? formatDateTime(new Date(leave.cancelledAt)) : null,
            updatedAt: leave.updatedAt ? formatDateTime(new Date(leave.updatedAt)) : null,
            // 格式化審核鏈中的時間
            approvalChain: leave.approvalChain?.map(approval => ({
                ...approval,
                timestamp: formatDateTime(new Date(approval.timestamp))
            })) || []
        }));

        // 組織響應數據
        const responseData = {
            leaves: formattedLeaves,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        };

        res.json(responseData);

    } catch (error) {
        console.error('獲取請假列表失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

/**
 * 獲取剩餘特休天數
 */
router.get('/annual-leave/remaining', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('employeeId')
            .lean();

        if (!user) {
            return res.status(404).json({ msg: '找不到用戶信息' });
        }

        const year = new Date().getFullYear();
        const now = new Date();
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59);

        // 使用聚合查詢計算已使用和已核准未開始的特休
        const result = await Leave.aggregate([
            {
                $match: {
                    employeeId: user.employeeId,
                    leaveType: 'annual',
                    status: 'approved',
                    startDate: {
                        $gte: startOfYear,
                        $lte: endOfYear
                    }
                }
            },
            {
                $project: {
                    duration: 1,
                    isPending: { $gt: ['$startDate', now] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalUsedHours: {
                        $sum: {
                            $cond: [
                                { $lte: ['$startDate', now] },
                                '$duration',
                                0
                            ]
                        }
                    },
                    totalPendingHours: {
                        $sum: {
                            $cond: [
                                { $gt: ['$startDate', now] },
                                '$duration',
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const totalAnnualLeave = 14; // 年度總特休天數
        const usedHours = result[0]?.totalUsedHours || 0;
        const pendingHours = result[0]?.totalPendingHours || 0;
        const usedDays = usedHours / 8;
        const pendingDays = pendingHours / 8;
        const remainingDays = totalAnnualLeave - usedDays - pendingDays;

        const responseData = {
            remainingDays: Math.round(remainingDays * 100) / 100,
            usedDays: Math.round(usedDays * 100) / 100,
            pendingDays: Math.round(pendingDays * 100) / 100,
            totalDays: totalAnnualLeave,
            year
        };

        res.json(responseData);

    } catch (error) {
        console.error('獲取剩餘特休失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

/**
 * 獲取待審核申請列表
 * GET /api/leave/pending-approvals
 */
router.get('/pending-approvals', verifyToken, supervisorAuth, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const user = await User.findById(req.user.id)
            .select('employeeId department')
            .lean();

        if (!user) {
            return res.status(404).json({ msg: '找不到用戶信息' });
        }

        // 構建查詢條件：
        // 1. 只查看自己部門的請假申請
        // 2. 只查看待審核的申請
        // 3. 只查看科員(C)的請假申請
        // 4. 排除自己的請假申請
        const query = {
            department: user.department,
            status: 'pending',
            employeeId: { $ne: user.employeeId } // 排除自己的請假申請
        };

        // 計算總數
        const total = await Leave.countDocuments(query);

        // 獲取待審核申請
        const leaves = await Leave.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'users',
                    localField: 'employeeId',
                    foreignField: 'employeeId',
                    as: 'employee'
                }
            },
            { $unwind: '$employee' },
            // 只獲取科員(C)的請假申請
            { $match: { 'employee.position': 'C' } },
            {
                $project: {
                    _id: 1,
                    employeeId: 1,
                    employeeName: '$employee.name',
                    startDate: 1,
                    endDate: 1,
                    leaveType: 1,
                    reason: 1,
                    duration: 1,
                    createdAt: 1
                }
            },
            { $sort: { createdAt: -1 } },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) }
        ]);

        // 格式化數據
        const formattedLeaves = leaves.map(leave => ({
            ...leave,
            startDate: formatDateTime(leave.startDate),
            endDate: formatDateTime(leave.endDate),
            formattedDuration: formatDuration(leave.duration),
            createdAt: formatDateTime(leave.createdAt)
        }));

        res.json({
            leaves: formattedLeaves,
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
 * 獲取部門請假歷史記錄
 * GET /api/leave/department-history
 */
router.get('/department-history', verifyToken, supervisorAuth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            employeeName,  // 新增：姓名篩選
            leaveType,     // 新增：假別篩選
            status        // 新增：狀態篩選
        } = req.query;

        const user = await User.findById(req.user.id)
            .select('employeeId department')
            .lean();

        if (!user) {
            return res.status(404).json({ msg: '找不到用戶信息' });
        }

        // 構建 MongoDB 查詢條件
        const baseQuery = {
            department: user.department
        };

        // 新增：根據篩選條件動態添加查詢條件
        const aggregatePipeline = [
            // 第一步：基本條件匹配
            { $match: baseQuery },

            // 第二步：關聯用戶表獲取員工資訊
            {
                $lookup: {
                    from: 'users',
                    localField: 'employeeId',
                    foreignField: 'employeeId',
                    as: 'employee'
                }
            },
            { $unwind: '$employee' },

            // 第三步：只獲取科員(C)的請假記錄
            { $match: { 'employee.position': 'C' } }
        ];

        // 新增：姓名篩選
        if (employeeName) {
            aggregatePipeline.push({
                $match: {
                    'employee.name': {
                        $regex: employeeName,
                        $options: 'i'  // 不區分大小寫
                    }
                }
            });
        }

        // 新增：假別篩選
        if (leaveType) {
            aggregatePipeline.push({
                $match: { leaveType }
            });
        }

        // 新增：狀態篩選
        if (status) {
            aggregatePipeline.push({
                $match: { status }
            });
        }

        // 計算總數
        const countPipeline = [...aggregatePipeline];
        countPipeline.push({ $count: 'total' });
        const totalResult = await Leave.aggregate(countPipeline);
        const total = totalResult[0]?.total || 0;

        // 添加分頁和投影
        aggregatePipeline.push(
            // 排序
            { $sort: { createdAt: -1 } },

            // 分頁
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) },

            // 投影：選擇要返回的欄位
            {
                $project: {
                    _id: 1,
                    employeeId: 1,
                    employeeName: '$employee.name',
                    startDate: 1,
                    endDate: 1,
                    leaveType: 1,
                    reason: 1,
                    duration: 1,
                    status: 1,
                    createdAt: 1,
                    cancelledAt: 1,
                    approvalChain: 1
                }
            }
        );

        // 執行查詢
        const leaves = await Leave.aggregate(aggregatePipeline);

        // 格式化數據
        const formattedLeaves = leaves.map(leave => ({
            ...leave,
            startDate: formatDateTime(leave.startDate),
            endDate: formatDateTime(leave.endDate),
            formattedDuration: formatDuration(leave.duration),
            createdAt: formatDateTime(leave.createdAt),
            cancelledAt: leave.cancelledAt ? formatDateTime(leave.cancelledAt) : null
        }));

        res.json({
            leaves: formattedLeaves,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('獲取部門請假歷史失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

/**
 * 主管審核請假
 */
router.post('/approve/:leaveId', verifyToken, supervisorAuth, async (req, res) => {
    try {
        const { leaveId } = req.params;
        const { status, comment } = req.body;

        // 驗證必要欄位
        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ msg: '請提供有效的審核狀態 (approved/rejected)' });
        }

        if (!comment) {
            return res.status(400).json({ msg: '備註是必填的' });
        }

        // 獲取主管資訊
        const supervisor = await User.findById(req.user.id)
            .select('employeeId department position')
            .lean();

        if (!supervisor) {
            return res.status(404).json({ msg: '找不到主管資訊' });
        }

        // 獲取請假申請
        const leave = await Leave.findById(leaveId);
        if (!leave) {
            return res.status(404).json({ msg: '找不到請假申請' });
        }

        // 確保主管只能審核自己部門的請假
        if (leave.department !== supervisor.department) {
            return res.status(403).json({ msg: '無權審核其他部門的請假申請' });
        }

        // 確保主管不能審核自己的請假
        if (leave.employeeId === supervisor.employeeId) {
            return res.status(403).json({ msg: '不能審核自己的請假申請' });
        }

        // 獲取申請人資訊
        const employee = await User.findOne({ employeeId: leave.employeeId })
            .select('position')
            .lean();

        if (!employee) {
            return res.status(404).json({ msg: '找不到申請人資訊' });
        }

        // 確保只能審核科員(C)的請假
        if (employee.position !== 'C') {
            return res.status(403).json({ msg: '只能審核科員的請假申請' });
        }

        // 確保請假申請是待審核狀態
        if (leave.status !== 'pending') {
            return res.status(400).json({ msg: '此請假申請已被處理' });
        }

        // 更新請假狀態和審核鏈
        leave.status = status;
        leave.approvalChain.push({
            approverEmployeeId: supervisor.employeeId,
            status,
            comment,
            timestamp: new Date()
        });

        await leave.save();

        // 格式化返回數據
        const formattedLeave = {
            ...leave.toObject(),
            startDate: formatDateTime(leave.startDate),
            endDate: formatDateTime(leave.endDate),
            formattedDuration: formatDuration(leave.duration),
            approvalChain: leave.approvalChain.map(approval => ({
                ...approval.toObject(),
                timestamp: formatDateTime(approval.timestamp)
            }))
        };

        res.json({
            msg: `請假申請已${status === 'approved' ? '核准' : '駁回'}`,
            leave: formattedLeave
        });

    } catch (error) {
        console.error('審核請假失敗:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                msg: '資料驗證失敗',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

/**
 * 取消請假申請
 */
router.post('/cancel/:leaveId', verifyToken, async (req, res) => {
    try {
        const { leaveId } = req.params;

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

        // 檢查是否為未來的請假
        if (!isPastDate(leave.startDate)) {
            leave.status = 'cancelled';
            leave.cancelledAt = new Date();
            await leave.save();

            const formattedLeave = {
                ...leave.toObject(),
                startDate: formatDateTime(leave.startDate),
                endDate: formatDateTime(leave.endDate),
                formattedDuration: formatDuration(leave.duration),
                cancelledAt: formatDateTime(leave.cancelledAt)
            };

            res.json({
                msg: '請假申請已取消',
                leave: formattedLeave
            });
        } else {
            return res.status(400).json({ msg: '無法取消過去的請假申請' });
        }

    } catch (error) {
        console.error('取消請假失敗:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                msg: '資料驗證失敗',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

// 新增一個輔助路由：獲取可請假的時間選項
router.get('/time-options', verifyToken, async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ msg: '日期參數是必需的' });
        }

        // 產生該日期的工作時間選項
        const workStart = WORK_HOURS.START;
        const workEnd = WORK_HOURS.END;
        const lunchStart = WORK_HOURS.LUNCH_START;
        const lunchEnd = WORK_HOURS.LUNCH_END;

        const timeOptions = [];
        let currentTime = workStart;

        while (currentTime <= workEnd) {
            // 跳過午休時間
            if (currentTime < lunchStart || currentTime >= lunchEnd) {
                timeOptions.push(currentTime);
            }

            // 每半小時增加一個選項
            const [hours, minutes] = currentTime.split(':').map(Number);
            let newMinutes = minutes + 30;
            let newHours = hours;

            if (newMinutes >= 60) {
                newMinutes = 0;
                newHours += 1;
            }

            currentTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
        }

        res.json({ timeOptions });

    } catch (error) {
        console.error('獲取時間選項失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

// 在 leave.js 中添加新的路由

/**
 * 計算請假時數
 * GET /api/leave/calculate-duration
 */
router.get('/calculate-duration', verifyToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // 驗證必要參數
        if (!startDate || !endDate) {
            return res.status(400).json({ msg: '開始時間和結束時間都是必需的' });
        }

        // 轉換為 Date 物件
        const startDateTime = new Date(startDate);
        const endDateTime = new Date(endDate);

        // 驗證日期格式
        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
            return res.status(400).json({ msg: '無效的日期格式' });
        }

        // 驗證時間先後順序
        if (endDateTime < startDateTime) {
            return res.status(400).json({ msg: '結束時間必須晚於開始時間' });
        }

        // 驗證是否在工作時間內
        if (!isWithinWorkHours(startDateTime) || !isWithinWorkHours(endDateTime)) {
            return res.status(400).json({
                msg: `請假時間必須在工作時間內（${WORK_HOURS.START}-${WORK_HOURS.END}，不含午休${WORK_HOURS.LUNCH_START}-${WORK_HOURS.LUNCH_END}）`
            });
        }

        // 計算請假時數
        const duration = calculateWorkingHours(startDateTime, endDateTime);

        // 驗證最小請假時數
        if (duration < 0.5) {
            return res.status(400).json({ msg: '請假時間不能少於半小時' });
        }

        // 返回計算結果
        res.json({
            duration,
            formattedDuration: formatDuration(duration)
        });

    } catch (error) {
        console.error('計算請假時數失敗:', error);
        res.status(500).json({ msg: '伺服器錯誤' });
    }
});

module.exports = router;