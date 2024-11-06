const nodemailer = require('nodemailer');

// 確保環境變數存在
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('請設置 EMAIL_USER 和 EMAIL_PASS 環境變數');
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendLockAccountEmail = async (to, remainingTime, ipAddress) => {
    try {
        // 添加郵件發送時間檢查
        const emailContent = {
            from: `"系統管理員" <${process.env.EMAIL_USER}>`,  // 更友善的寄件者名稱
            to: to,
            subject: '【系統通知】帳號安全提醒',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #d32f2f;">帳號安全提醒</h2>
                    <p>您的帳號因多次登入失敗已被暫時鎖定</p>
                    <p><strong>鎖定時間：</strong>${remainingTime} 分鐘</p>
                    <p><strong>登入IP：</strong>${ipAddress}</p>
                    <p><strong>時間：</strong>${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</p>
                    <hr>
                    <p style="color: #d32f2f;">如果這不是您本人的操作，請儘速聯繫系統管理員。</p>
                </div>
            `
        };

        const info = await transporter.sendMail(emailContent);
        console.log('帳號鎖定通知郵件已發送', info.messageId);
        return true;
    } catch (error) {
        console.error('郵件發送失敗:', error);
        return false;  // 返回失敗狀態
    }
};

// 測試郵件連接
transporter.verify(function(error, success) {
    if (error) {
        console.log('郵件服務器連接失敗:', error);
    } else {
        console.log('郵件服務器連接成功');
    }
});

module.exports = {
    sendLockAccountEmail
};