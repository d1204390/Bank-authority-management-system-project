const mongoose = require('mongoose');
const path = require('path');
const User = require('../models/User');  // 修改為相對路徑
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function validateUserData() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB successfully');

        const users = await User.find({});
        console.log(`Found ${users.length} users to validate\n`);

        const validDepartments = ['BD', 'FD', 'LD'];
        const validPositions = ['M', 'S', 'C'];

        const issues = [];

        for (const user of users) {
            const userIssues = [];

            // 驗證部門
            if (!validDepartments.includes(user.department)) {
                userIssues.push(`Invalid department: ${user.department}`);
            }

            // 驗證職位
            if (!validPositions.includes(user.position)) {
                userIssues.push(`Invalid position: ${user.position}`);
            }

            // 如果發現問題，添加到問題列表
            if (userIssues.length > 0) {
                issues.push({
                    account: user.account,
                    name: user.name,
                    issues: userIssues,
                    currentData: {
                        department: user.department,
                        position: user.position
                    }
                });
            }
        }

        // 輸出驗證結果
        console.log('Validation Results:');
        console.log(`Total users: ${users.length}`);
        console.log(`Users with issues: ${issues.length}`);

        if (issues.length > 0) {
            console.log('\nDetailed Issues:');
            issues.forEach((issue, index) => {
                console.log(`\n${index + 1}. User: ${issue.name} (${issue.account})`);
                console.log('   Issues:');
                issue.issues.forEach(i => console.log(`   - ${i}`));
                console.log('   Current Data:', issue.currentData);
            });
        } else {
            console.log('\nNo issues found. All user data is valid.');
        }

    } catch (error) {
        console.error('Error occurred:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

console.log('Starting validation...');
validateUserData();