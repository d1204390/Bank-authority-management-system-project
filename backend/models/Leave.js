// models/Leave.js
const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    // 申請人資訊
    employeeId: {
        type: String,
        required: true,
        ref: 'User'
    },
    department: {
        type: String,
        required: true,
        enum: ['BD', 'FD', 'LD']
    },
    position: {
        type: String,
        required: true,
        enum: ['M', 'S', 'C']
    },
    // 請假資訊
    leaveType: {
        type: String,
        required: true,
        enum: ['annual', 'sick', 'personal', 'funeral', 'marriage', 'maternity']
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    duration: {
        type: Number,
        required: true,
        min: 0.5
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    approvalChain: [{
        approverEmployeeId: String,
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected']
        },
        comment: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    cancelledAt: {
        type: Date
    }
}, {
    timestamps: true,
    toObject: { getters: true },
    toJSON: { getters: true }
});

// 優化特休計算方法
leaveSchema.statics.getRemainingAnnualLeave = async function(employeeId, year) {
    const totalAnnualLeave = 14; // 總特休天數
    const hoursPerDay = 8;

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    try {
        const result = await this.aggregate([
            {
                $match: {
                    employeeId: employeeId,
                    leaveType: 'annual',
                    status: 'approved',
                    startDate: {
                        $gte: startOfYear,
                        $lte: endOfYear
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

        const totalUsedHours = result[0]?.totalUsedHours || 0;
        return totalAnnualLeave - (totalUsedHours / hoursPerDay);
    } catch (error) {
        console.error('計算特休失敗:', error);
        throw error;
    }
};

// 驗證時間間隔
leaveSchema.pre('validate', function(next) {
    if (this.startDate && this.endDate) {
        if (this.endDate < this.startDate) {
            next(new Error('結束時間必須晚於開始時間'));
            return;
        }
    }
    next();
});

// 格式化日期時間
leaveSchema.methods.formatDateTime = function() {
    const formatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Taipei'
    };

    return {
        ...this.toObject(),
        startDate: this.startDate.toLocaleString('zh-TW', formatOptions),
        endDate: this.endDate.toLocaleString('zh-TW', formatOptions)
    };
};

// 定義索引
leaveSchema.index({ createdAt: -1 });
leaveSchema.index({ employeeId: 1, startDate: 1 });
leaveSchema.index({ employeeId: 1, leaveType: 1, status: 1, startDate: 1 });
leaveSchema.index({ department: 1, status: 1 });

const Leave = mongoose.model('Leave', leaveSchema);

module.exports = Leave;