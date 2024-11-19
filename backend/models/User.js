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
    // 改用 base64 儲存圖片
    avatar: {
        type: String,  // base64 字串
        default: null
    }
}, {
    timestamps: true
});

// 添加中間件以確保保存前轉換格式
userSchema.pre('save', function(next) {
    if (this.isModified('department')) {
        this.department = departmentMap[this.department] || this.department;
    }
    if (this.isModified('position')) {
        this.position = positionMap[this.position] || this.position;
    }
    next();
});

// 確保虛擬屬性被包含在 JSON 中
userSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret.password;  // 確保密碼不被包含在 JSON 中
        return ret;
    }
});

module.exports = mongoose.model('User', userSchema);