const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    account: {
        type: String,
        required: true
    },
    employeeId: {
        type: String,
        required: true
    },
    loginTime: {
        type: Date,
        default: Date.now
    },
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['success', 'failed'],
        required: true
    },
    failureReason: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// 添加索引
loginHistorySchema.index({ loginTime: -1 });
loginHistorySchema.index({ account: 1 });
loginHistorySchema.index({ userId: 1 });
loginHistorySchema.index({ status: 1 });

module.exports = mongoose.model('LoginHistory', loginHistorySchema);