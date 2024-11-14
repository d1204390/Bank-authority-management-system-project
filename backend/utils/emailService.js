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

// 原有的帳號鎖定通知功能
const sendLockAccountEmail = async (to, remainingTime, ipAddress) => {
    try {
        const emailContent = {
            from: `"系統管理員" <${process.env.EMAIL_USER}>`,
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
        console.log('帳號鎖定通知郵件已發送:', info.messageId);
        return true;
    } catch (error) {
        console.error('郵件發送失敗:', error);
        return false;
    }
};

// 新增發送帳號資訊的功能
const sendAccountCredentials = async (to, name, account, password) => {
    try {
        const emailContent = {
            from: `"系統管理員" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: '【系統通知】帳號建立成功通知',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #409EFF;">帳號建立成功通知</h2>
                    <p>親愛的 ${name} 同仁，您好：</p>
                    <p>您的系統帳號已建立成功，以下是您的登入資訊：</p>
                    <div style="background-color: #f5f7fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p style="margin: 5px 0;"><strong>帳號：</strong>${account}</p>
                        <p style="margin: 5px 0;"><strong>密碼：</strong>${password}</p>
                    </div>
                    <p style="color: #E6A23C;">為了確保帳號安全，請在首次登入後立即修改密碼。</p>
                    <p>請妥善保管您的帳號密碼，切勿告知他人。</p>
                    <hr>
                    <p style="color: #909399; font-size: 12px;">此為系統自動發送的郵件，請勿直接回覆。</p>
                    <p style="color: #909399; font-size: 12px;">寄送時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</p>
                </div>
            `
        };

        const info = await transporter.sendMail(emailContent);
        console.log('帳號建立通知郵件已發送:', info.messageId);
        return true;
    } catch (error) {
        console.error('郵件發送失敗:', error);
        return false;
    }
};

// 測試郵件連接
transporter.verify((error, success) => {
    if (error) {
        console.log('郵件服務器連接失敗:', error);
    } else {
        console.log('郵件服務器連接成功');
    }
});

module.exports = {
    sendLockAccountEmail,
    sendAccountCredentials
};