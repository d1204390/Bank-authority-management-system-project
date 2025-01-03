// models/loan/LoanApplication.js
const mongoose = require('mongoose');

const loanApplicationSchema = new mongoose.Schema({
    applicationId: {
        type: String,
        required: true,
        unique: true
    },
    customerInfo: {
        name: {
            type: String,
            required: true
        },
        idNumber: {
            type: String,
            required: true,
            validate: {
                validator: function(v) {
                    return /^[A-Z][12]\d{8}$/.test(v);
                },
                message: '身分證號格式不正確'
            }
        },
        birthDate: {
            type: Date,
            required: true
        },
        phone: {
            type: String,
            required: true,
            validate: {
                validator: function(v) {
                    return /^09\d{8}$/.test(v) || /^0[2-8]\d{7,8}$/.test(v);
                },
                message: '電話號碼格式不正確'
            }
        },
        address: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            validate: {
                validator: function(v) {
                    return /^\S+@\S+\.\S+$/.test(v);
                },
                message: '電子郵件格式不正確'
            }
        }
    },
    loanInfo: {
        purpose: {
            type: String,
            required: true,
            enum: ['house', 'car', 'credit', 'other']
        },
        requestedAmount: {
            type: Number,
            required: true,
            min: [10000, '申請金額不得低於10,000元']
        },
        approvedAmount: {
            type: Number,
            default: null
        },
        term: {
            type: Number,
            required: true,
            enum: [12, 24, 36, 48, 60]
        },
        monthlyIncome: {
            type: Number,
            required: true,
            min: [0, '月收入不能為負數']
        }
    },
    documents: {
        idCardFront: {
            type: String,
            required: true
        },
        idCardBack: {
            type: String,
            required: true
        },
        salaryProof: [{
            type: String,
            required: true
        }]
    },
    status: {
        type: String,
        required: true,
        enum: ['draft', 'pending', 'processing', 'reviewing', 'approved', 'rejected', 'cancelled'],
        default: 'draft'
    },
    priority: {
        type: String,
        required: true,
        enum: ['normal', 'urgent'],
        default: 'normal'
    },
    applicant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    assignedDate: {
        type: Date,
        default: null
    },
    reviewHistory: [{
        action: {
            type: String,
            required: true,
            enum: ['create', 'assign', 'process', 'review', 'approve', 'reject', 'cancel']
        },
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        comment: String,
        timestamp: {
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

// 添加索引
loanApplicationSchema.index({ status: 1, priority: 1, assignedDate: 1 });
loanApplicationSchema.index({ applicant: 1, status: 1 });
loanApplicationSchema.index({ assignee: 1, status: 1 });

// 實例方法 - 指派案件
loanApplicationSchema.methods.assign = function(assigneeId, actorId, comment = '') {
    this.assignee = assigneeId;
    this.assignedDate = new Date();
    this.status = 'processing';
    this.reviewHistory.push({
        action: 'assign',
        actor: actorId,
        comment,
        timestamp: new Date()
    });
};

// 實例方法 - 更新案件狀態
loanApplicationSchema.methods.updateStatus = function(newStatus, actorId, comment = '') {
    this.status = newStatus;
    this.reviewHistory.push({
        action: newStatus === 'approved' ? 'approve' :
            newStatus === 'rejected' ? 'reject' :
                newStatus === 'reviewing' ? 'review' : 'process',
        actor: actorId,
        comment,
        timestamp: new Date()
    });
};

// 靜態方法 - 取得特定承辦人的案件統計
loanApplicationSchema.statics.getAssigneeStats = async function(assigneeId) {
    return this.aggregate([
        { $match: { assignee: assigneeId } },
        { $group: {
                _id: '$status',
                count: { $sum: 1 }
            }},
        { $project: {
                status: '$_id',
                count: 1,
                _id: 0
            }}
    ]);
};

module.exports = mongoose.model('LoanApplication', loanApplicationSchema);