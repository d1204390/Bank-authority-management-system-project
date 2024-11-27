const mongoose = require('mongoose');

const departmentMap = {
    '業務部': 'BD',
    '消金部': 'FD',
    '借貸部': 'LD',
    'BD': 'BD',
    'FD': 'FD',
    'LD': 'LD'
};

const positionMap = {
    '經理': 'M',
    '主管': 'S',
    '科員': 'C',
    'M': 'M',
    'S': 'S',
    'C': 'C'
};

const userSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function(v) {
                return /^\d{9}$/.test(v);
            },
            message: '員工編號格式不正確'
        }
    },
    name: {
        type: String,
        required: true
    },
    account: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'user',
        required: true
    },
    department: {
        type: String,
        required: true,
        enum: ['BD', 'FD', 'LD'],
        set: function(v) {
            return departmentMap[v] || v;
        }
    },
    position: {
        type: String,
        required: true,
        enum: ['M', 'S', 'C'],
        set: function(v) {
            return positionMap[v] || v;
        }
    },
    extension: {
        type: String,
        default: '',
        validate: {
            validator: function(v) {
                return !v || /^\d{4}$/.test(v);
            },
            message: '分機號碼必須是4位數字'
        }
    },
    email: {
        type: String,
        required: true,
        sparse: true
    },
    avatar: {
        type: String,
        default: null
    },
    // 新增欄位
    birthday: {
        type: Date,
        default: null
    },
    personalPhone: {
        type: String,
        validate: {
            validator: function(v) {
                return !v || /^09\d{8}$/.test(v);
            },
            message: '個人電話必須是有效的台灣手機號碼格式'
        }
    },
    isFirstLogin: {
        type: Boolean,
        default: true  // 預設為 true，表示首次登入
    },
    lastLoginTime: {  // 新增最後登入時間欄位
        type: Date,
        default: null
    },
    emergencyContact: {
        name: {
            type: String,
            default: ''
        },
        phone: {
            type: String,
            validate: {
                validator: function(v) {
                    return !v || /^09\d{8}$/.test(v) || /^0[2-8]\d{7,8}$/.test(v);
                },
                message: '緊急聯絡電話必須是有效的台灣電話號碼格式'
            }
        },
        relationship: {
            type: String,
            default: ''
        }
    }
}, {
    timestamps: true
});

// 保持原有的方法和中間件...
userSchema.statics.generateEmployeeId = async function() {
    const currentDate = new Date();
    const yearMonth = `${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const lastEmployee = await this.findOne({
        employeeId: new RegExp(`^${yearMonth}`)
    }).sort({ employeeId: -1 });

    if (!lastEmployee) {
        return `${yearMonth}001`;
    }

    const lastSequence = parseInt(lastEmployee.employeeId.slice(-3));
    const newSequence = String(lastSequence + 1).padStart(3, '0');
    return `${yearMonth}${newSequence}`;
};

userSchema.pre('save', function(next) {
    if (this.isModified('department')) {
        this.department = departmentMap[this.department] || this.department;
    }
    if (this.isModified('position')) {
        this.position = positionMap[this.position] || this.position;
    }
    next();
});

userSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret.password;
        return ret;
    }
});

module.exports = mongoose.model('User', userSchema);