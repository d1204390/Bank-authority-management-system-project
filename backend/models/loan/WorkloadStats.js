// models/loan/WorkloadStats.js
const mongoose = require('mongoose');

const workloadStatsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    metrics: {
        totalCases: {
            type: Number,
            default: 0
        },
        pendingCases: {
            type: Number,
            default: 0
        },
        urgentCases: {
            type: Number,
            default: 0
        },
        completedCases: {
            type: Number,
            default: 0
        },
        averageProcessingTime: {
            type: Number,  // 以分鐘為單位
            default: 0
        }
    },
    caseDistribution: {
        byPriority: {
            urgent: { type: Number, default: 0 },
            normal: { type: Number, default: 0 }
        },
        byStatus: {
            processing: { type: Number, default: 0 },
            reviewing: { type: Number, default: 0 },
            completed: { type: Number, default: 0 }
        }
    },
    performance: {
        completionRate: {
            type: Number,
            default: 0
        },
        avgResponseTime: {
            type: Number,
            default: 0
        },
        overdueCases: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

// 創建複合索引
workloadStatsSchema.index({ userId: 1, date: 1 }, { unique: true });

// 更新工作量統計
workloadStatsSchema.statics.updateStats = async function(userId, date = new Date()) {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const LoanApplication = mongoose.model('LoanApplication');

    // 獲取案件統計
    const caseStats = await LoanApplication.aggregate([
        {
            $match: {
                assignee: mongoose.Types.ObjectId(userId),
                updatedAt: { $gte: startOfDay, $lte: endOfDay }
            }
        },
        {
            $group: {
                _id: null,
                totalCases: { $sum: 1 },
                pendingCases: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                urgentCases: {
                    $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] }
                },
                completedCases: {
                    $sum: {
                        $cond: [
                            { $in: ['$status', ['approved', 'rejected']] },
                            1,
                            0
                        ]
                    }
                },
                totalProcessingTime: {
                    $sum: {
                        $cond: [
                            { $in: ['$status', ['approved', 'rejected']] },
                            {
                                $divide: [
                                    { $subtract: ['$updatedAt', '$assignedDate'] },
                                    60000 // 轉換為分鐘
                                ]
                            },
                            0
                        ]
                    }
                },
                byPriority: {
                    $group: {
                        urgent: {
                            $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] }
                        },
                        normal: {
                            $sum: { $cond: [{ $eq: ['$priority', 'normal'] }, 1, 0] }
                        }
                    }
                },
                byStatus: {
                    $group: {
                        processing: {
                            $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
                        },
                        reviewing: {
                            $sum: { $cond: [{ $eq: ['$status', 'reviewing'] }, 1, 0] }
                        },
                        completed: {
                            $sum: {
                                $cond: [
                                    { $in: ['$status', ['approved', 'rejected']] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            }
        }
    ]);

    const stats = caseStats[0] || {
        totalCases: 0,
        pendingCases: 0,
        urgentCases: 0,
        completedCases: 0,
        totalProcessingTime: 0,
        byPriority: { urgent: 0, normal: 0 },
        byStatus: { processing: 0, reviewing: 0, completed: 0 }
    };

    // 計算績效指標
    const averageProcessingTime = stats.completedCases > 0
        ? stats.totalProcessingTime / stats.completedCases
        : 0;

    const completionRate = stats.totalCases > 0
        ? (stats.completedCases / stats.totalCases) * 100
        : 0;

    // 更新或創建統計記錄
    return this.findOneAndUpdate(
        { userId, date: startOfDay },
        {
            $set: {
                metrics: {
                    totalCases: stats.totalCases,
                    pendingCases: stats.pendingCases,
                    urgentCases: stats.urgentCases,
                    completedCases: stats.completedCases,
                    averageProcessingTime
                },
                caseDistribution: {
                    byPriority: stats.byPriority,
                    byStatus: stats.byStatus
                },
                performance: {
                    completionRate,
                    avgResponseTime: averageProcessingTime,
                    overdueCases: stats.pendingCases // 可以根據實際需求調整逾期的定義
                }
            }
        },
        { upsert: true, new: true }
    );
};

// 獲取指定時間範圍的工作量報告
workloadStatsSchema.statics.getWorkloadReport = async function(userId, startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                userId: mongoose.Types.ObjectId(userId),
                date: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: null,
                avgCompletionRate: { $avg: '$performance.completionRate' },
                totalCompletedCases: { $sum: '$metrics.completedCases' },
                totalUrgentCases: { $sum: '$metrics.urgentCases' },
                avgProcessingTime: { $avg: '$metrics.averageProcessingTime' }
            }
        }
    ]);
};

// 獲取團隊工作量分析
workloadStatsSchema.statics.getTeamWorkloadAnalysis = async function(userIds, date = new Date()) {
    return this.aggregate([
        {
            $match: {
                userId: { $in: userIds.map(id => mongoose.Types.ObjectId(id)) },
                date: {
                    $gte: new Date(date.getFullYear(), date.getMonth(), 1),
                    $lt: new Date(date.getFullYear(), date.getMonth() + 1, 0)
                }
            }
        },
        {
            $group: {
                _id: '$userId',
                avgCompletionRate: { $avg: '$performance.completionRate' },
                totalCases: { $sum: '$metrics.totalCases' },
                completedCases: { $sum: '$metrics.completedCases' },
                urgentCases: { $sum: '$metrics.urgentCases' },
                avgProcessingTime: { $avg: '$metrics.averageProcessingTime' }
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'userInfo'
            }
        },
        {
            $unwind: '$userInfo'
        },
        {
            $project: {
                userName: '$userInfo.name',
                avgCompletionRate: 1,
                totalCases: 1,
                completedCases: 1,
                urgentCases: 1,
                avgProcessingTime: 1
            }
        }
    ]);
};

module.exports = mongoose.model('WorkloadStats', workloadStatsSchema);