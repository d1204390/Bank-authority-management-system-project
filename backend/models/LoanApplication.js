// models/LoanApplication.js
const mongoose = require('mongoose');

const loanApplicationSchema = new mongoose.Schema({
    applicationId: {
        type: String,
        unique: true
    },
    // 申請人(員工)資訊
    employeeId: {
        type: String,
        required: true,
        ref: 'User'
    },
    department: {
        type: String,
        required: true,
        enum: ['LD']  // 只允許借貸部門
    },
    position: {
        type: String,
        required: true,
        enum: ['M', 'S', 'C']  // 經理、主管、一般職員
    },
    // 客戶資訊
    customerInfo: {
        name: {
            type: String,
            required: true
        },
        idNumber: {
            type: String,
            required: true,
            match: [/^[A-Z][12]\d{8}$/, '身分證號格式不正確']
        },
        phone: {
            type: String,
            required: true,
            match: [/^09\d{8}$/, '手機號碼格式不正確']
        }
    },
    // 貸款資訊
    loanInfo: {
        purpose: {
            type: String,
            required: true,
            enum: ['house', 'car', 'credit', 'other']
        },
        amount: {
            type: Number,
            required: true,
            min: [10000, '申請金額不得低於10,000元']
        },
        term: {
            type: Number,
            required: true,
            enum: [12, 24, 36, 48, 60]
        },
        isUrgent: {
            type: Boolean,
            default: false
        }
    },
    // 申請狀態
    status: {
        type: String,
        required: true,
        enum: ['pending', 'processing', 'approved', 'rejected'],
        default: 'pending'
    },
    // 審核鏈
    approvalChain: [{
        approverEmployeeId: {
            type: String,
            required: true
        },
        approverName: {    // 新增這個欄位
            type: String,
            required: true
        },
        approverPosition: {
            type: String,
            required: true,
            enum: ['S', 'M']  // 主管、經理
        },
        status: {
            type: String,
            required: true,
            enum: ['pending', 'approved', 'rejected']
        },
        comment: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    // 承辦人
    assignee: {
        type: String,
        ref: 'User',
        default: null
    },
    assignedDate: {
        type: Date,
        default: null
    },
    // 備註
    notes: [{
        content: String,
        createdBy: {
            type: String,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// 自動生成案件編號
loanApplicationSchema.pre('save', async function(next) {
    if (!this.applicationId) {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const prefix = `L${year}${month}`;

        const lastApplication = await this.constructor.findOne({
            applicationId: new RegExp(`^${prefix}`)
        }).sort({ applicationId: -1 });

        let sequence = '001';
        if (lastApplication) {
            const lastSequence = parseInt(lastApplication.applicationId.slice(-3));
            sequence = String(lastSequence + 1).padStart(3, '0');
        }

        this.applicationId = `${prefix}${sequence}`;
    }
    next();
});

// 格式化貸款金額
loanApplicationSchema.methods.formatAmount = function() {
    return new Intl.NumberFormat('zh-TW', {
        style: 'currency',
        currency: 'TWD',
        minimumFractionDigits: 0
    }).format(this.loanInfo.amount);
};

// 格式化日期時間
loanApplicationSchema.methods.formatDateTime = function() {
    return this.createdAt.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
};

module.exports = mongoose.model('LoanApplication', loanApplicationSchema);