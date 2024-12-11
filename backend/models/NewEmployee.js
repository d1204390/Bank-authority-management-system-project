const mongoose = require('mongoose');

const newEmployeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 20
    },
    department: {
        type: String,
        required: true,
        enum: ['LD', 'BD', 'FD']  // 限制部門代碼
    },
    position: {
        type: String,
        required: true,
        enum: ['C', 'S', 'M']  // 限制職位代碼
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    startDate: {
        type: Date,
        required: true
    },
    notes: {
        type: String,
        maxlength: 200
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    submittedBy: {
        type: String,  // 改為 String 類型，存儲 employeeId
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    approvalChain: [{
        approverEmployeeId: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['approved', 'rejected'],
            required: true
        },
        comment: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
});

// 更新 updatedAt 時間戳
newEmployeeSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const NewEmployee = mongoose.model('NewEmployee', newEmployeeSchema);

module.exports = NewEmployee;