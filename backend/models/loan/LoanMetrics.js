// models/loan/LoanMetrics.js
const mongoose = require('mongoose');

const loanMetricsSchema = new mongoose.Schema({
    applicationId: {
        type: String,
        required: true,
        unique: true,
        ref: 'LoanApplication'
    },
    creditScore: {
        type: Number,
        required: true,
        min: 0,
        max: 1000
    },
    debtToIncomeRatio: {
        type: Number,
        required: true,
        min: 0,
        max: 1
    },
    riskLevel: {
        type: String,
        required: true,
        enum: ['low', 'medium', 'high']
    },
    monthlyPaymentCapacity: {
        type: Number,
        required: true,
        min: 0
    },
    automaticAssessmentResult: {
        recommendation: {
            type: String,
            required: true,
            enum: ['approve', 'review', 'reject']
        },
        reasons: [{
            type: String
        }],
        suggestedAmount: {
            type: Number,
            min: 0
        }
    },
    assessmentDetails: {
        creditHistory: {
            score: Number,
            weight: Number,
            factors: [{
                type: String,
                impact: String // positive, negative, neutral
            }]
        },
        incomeStability: {
            score: Number,
            weight: Number,
            monthsEmployed: Number
        },
        collateralValue: {
            score: Number,
            weight: Number,
            estimatedValue: Number
        }
    }
}, {
    timestamps: true
});

// 計算風險等級
loanMetricsSchema.methods.calculateRiskLevel = function() {
    const { creditScore, debtToIncomeRatio } = this;

    if (creditScore >= 800 && debtToIncomeRatio <= 0.3) {
        return 'low';
    } else if (creditScore >= 650 && debtToIncomeRatio <= 0.4) {
        return 'medium';
    } else {
        return 'high';
    }
};

// 計算建議核貸金額
loanMetricsSchema.methods.calculateSuggestedAmount = function(requestedAmount) {
    const { creditScore, monthlyPaymentCapacity, debtToIncomeRatio } = this;
    let adjustmentFactor = 1;

    if (creditScore < 650) {
        adjustmentFactor *= 0.7;
    } else if (creditScore < 800) {
        adjustmentFactor *= 0.9;
    }

    if (debtToIncomeRatio > 0.4) {
        adjustmentFactor *= 0.8;
    }

    const maxAmount = monthlyPaymentCapacity * 12 * 5; // 5年為上限
    const suggestedAmount = Math.min(requestedAmount, maxAmount) * adjustmentFactor;

    return Math.floor(suggestedAmount / 10000) * 10000; // 以萬為單位進位
};

// 生成自動評估建議
loanMetricsSchema.methods.generateRecommendation = function(requestedAmount) {
    const reasons = [];
    let recommendation = 'approve';

    if (this.creditScore < 600) {
        reasons.push('信用評分過低');
        recommendation = 'reject';
    }

    if (this.debtToIncomeRatio > 0.5) {
        reasons.push('負債比過高');
        recommendation = 'reject';
    }

    if (this.creditScore >= 600 && this.creditScore < 700) {
        reasons.push('信用評分需要進一步評估');
        recommendation = 'review';
    }

    const suggestedAmount = this.calculateSuggestedAmount(requestedAmount);
    if (suggestedAmount < requestedAmount) {
        reasons.push('建議降低貸款金額');
        recommendation = 'review';
    }

    return {
        recommendation,
        reasons,
        suggestedAmount
    };
};

module.exports = mongoose.model('LoanMetrics', loanMetricsSchema);