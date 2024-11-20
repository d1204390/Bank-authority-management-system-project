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

// 更新帳號鎖定通知功能，區分管理員鎖定和系統自動鎖定
const sendLockAccountEmail = async (to, remainingTime, ipAddress, userType = 'user', isAdminLock = false) => {
    try {
        let emailTemplate;

        if (userType === 'admin') {
            // 管理員郵件模板（15分鐘自動解鎖）
            emailTemplate = `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #d32f2f;">【系統管理員】帳號安全警告</h2>
                    <div style="background-color: #fff3f3; padding: 15px; border-left: 4px solid #d32f2f; margin: 15px 0;">
                        <p>您的管理員帳號因連續登入失敗已被系統暫時鎖定</p>
                    </div>
                    
                    <div style="background-color: #f5f7fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <h3 style="color: #2c3e50; margin-top: 0;">鎖定詳情</h3>
                        <p><strong>鎖定原因：</strong>多次輸入錯誤密碼</p>
                        <p><strong>自動解鎖時間：</strong>${remainingTime} 分鐘後</p>
                        <p><strong>登入IP：</strong>${ipAddress}</p>
                        <p><strong>鎖定時間：</strong>${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</p>
                    </div>
                </div>
            `;
        } else {
            // 使用者郵件模板（區分管理員鎖定和系統自動鎖定）
            if (isAdminLock) {
                // 管理員手動鎖定模板
                emailTemplate = `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2 style="color: #d32f2f;">帳號已被管理員鎖定</h2>
                        <div style="background-color: #fff3f3; padding: 15px; border-left: 4px solid #d32f2f; margin: 15px 0;">
                            <p>您的帳號已被系統管理員暫時停用</p>
                        </div>
                        
                        <div style="background-color: #f5f7fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                            <h3 style="color: #2c3e50; margin-top: 0;">鎖定詳情</h3>
                            <p><strong>鎖定原因：</strong>管理員操作</p>
                            <p><strong>解鎖方式：</strong>請聯繫系統管理員處理</p>
                            <p><strong>鎖定時間：</strong>${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</p>
                        </div>

                        <div style="border-left: 4px solid #ffa726; padding: 15px; margin: 15px 0; background-color: #fff8e1;">
                            <h3 style="color: #f57c00; margin-top: 0;">重要提醒</h3>
                            <p style="margin: 5px 0;">1. 如有任何疑問，請立即聯繫系統管理員</p>
                            <p style="margin: 5px 0;">2. 帳號解鎖需要管理員手動處理</p>
                            <p style="margin: 5px 0;">3. 請確保您的帳號使用符合公司規範</p>
                        </div>
                    </div>
                `;
            } else {
                // 系統自動鎖定模板（密碼錯誤）
                emailTemplate = `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2 style="color: #d32f2f;">帳號安全警告</h2>
                        <div style="background-color: #fff3f3; padding: 15px; border-left: 4px solid #d32f2f; margin: 15px 0;">
                            <p>您的帳號因連續登入失敗已被系統鎖定</p>
                        </div>
                        
                        <div style="background-color: #f5f7fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                            <h3 style="color: #2c3e50; margin-top: 0;">鎖定詳情</h3>
                            <p><strong>鎖定原因：</strong>多次輸入錯誤密碼</p>
                            <p><strong>解鎖方式：</strong>請聯繫系統管理員處理</p>
                            <p><strong>登入IP：</strong>${ipAddress}</p>
                            <p><strong>鎖定時間：</strong>${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</p>
                        </div>

                        <div style="border-left: 4px solid #ffa726; padding: 15px; margin: 15px 0; background-color: #fff8e1;">
                            <h3 style="color: #f57c00; margin-top: 0;">注意事項</h3>
                            <p style="margin: 5px 0;">1. 請確認是否為本人操作</p>
                            <p style="margin: 5px 0;">2. 如非本人操作，請立即通知系統管理員</p>
                            <p style="margin: 5px 0;">3. 切勿將帳號密碼告知他人</p>
                        </div>
                    </div>
                `;
            }
        }

        const emailContent = {
            from: `"系統管理員" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: isAdminLock ?
                '【系統通知】帳號已被管理員鎖定' :
                (userType === 'admin' ? '【系統管理員】帳號鎖定通知' : '【系統通知】帳號安全警告'),
            html: emailTemplate
        };

        const info = await transporter.sendMail(emailContent);
        console.log('帳號鎖定通知郵件已發送:', info.messageId);
        return true;
    } catch (error) {
        console.error('郵件發送失敗:', error);
        return false;
    }
};

// 保持原有的帳號建立通知功能
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
transporter.verify((error) => {
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