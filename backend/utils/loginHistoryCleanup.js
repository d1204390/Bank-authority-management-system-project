// utils/loginHistoryCleanup.js

const LoginHistory = require('../models/LoginHistory');

class LoginHistoryCleanup {
    constructor() {
        this.cleanupInterval = 24 * 60 * 60 * 1000; // 24小時
        this.retentionPeriod = 3; // 保留3個月
    }

    async cleanup() {
        try {
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - this.retentionPeriod);

            const result = await LoginHistory.deleteMany({
                loginTime: { $lt: threeMonthsAgo }
            });

            console.log(`已清理 ${result.deletedCount} 筆舊的登入記錄`);
        } catch (error) {
            console.error('清理登入記錄失敗:', error);
        }
    }

    start() {
        // 啟動時執行一次
        this.cleanup();

        // 設定定期執行
        this.timer = setInterval(() => this.cleanup(), this.cleanupInterval);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }
}

module.exports = new LoginHistoryCleanup();