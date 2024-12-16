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
        type: String,  // 存儲 employeeId
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
    }],
    // 新增 employeeId 欄位，可為空值
    employeeId: {
        type: String,
        default: null,
        sparse: true  // 允許為 null 且建立稀疏索引
    },
    // 帳號建立相關欄位
    hasAccount: {
        type: Boolean,
        default: false
    },
    accountCreatedAt: {
        type: Date
    },
    accountCreatedBy: {
        type: String  // 存儲建立帳號的管理員 employeeId
    },
    accountInfo: {
        username: String,  // 儲存生成的帳號
        isActivated: {
            type: Boolean,
            default: false
        }
    }
});

// 更新 updatedAt 時間戳
newEmployeeSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// 添加索引以提升查詢效能
newEmployeeSchema.index({ status: 1, hasAccount: 1 });
newEmployeeSchema.index({ department: 1, status: 1 });
newEmployeeSchema.index({ startDate: 1 });
newEmployeeSchema.index({ submittedBy: 1 });
newEmployeeSchema.index({ employeeId: 1 }, { sparse: true });  // 為 employeeId 添加稀疏索引

const NewEmployee = mongoose.model('NewEmployee', newEmployeeSchema);

module.exports = NewEmployee;