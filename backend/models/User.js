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
                return /^\d{9}$/.test(v);  // 格式為 YYYYMM + 3位數字
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
    }
}, {
    timestamps: true
});

// 添加靜態方法來生成新的員工編號
userSchema.statics.generateEmployeeId = async function() {
    const currentDate = new Date();
    const yearMonth = `${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    // 查找當前月份最大的員工編號
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

// 中間件保持不變
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