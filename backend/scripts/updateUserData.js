const mongoose = require('mongoose');
const path = require('path');
const User = require('../models/User');  // 修改為相對路徑
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 部門映射（雙向）
const departmentMap = {
    '消金部': 'FD',
    '業務部': 'BD',
    '借貸部': 'LD',
    'FD': 'FD',
    'BD': 'BD',
    'LD': 'LD'
};

// 職位映射（雙向）
const positionMap = {
    '經理': 'M',
    '主管': 'S',
    '科員': 'C',
    'M': 'M',
    'S': 'S',
    'C': 'C'
};

async function validateAndUpdateUser(user) {
    const updates = {};

    // 驗證並更新部門
    if (user.department) {
        if (!['BD', 'FD', 'LD'].includes(user.department)) {
            updates.department = departmentMap[user.department];
        }
    }

    // 驗證並更新職位
    if (user.position) {
        if (!['M', 'S', 'C'].includes(user.position)) {
            updates.position = positionMap[user.position];
        }
    }

    return updates;
}

async function updateUsers() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB successfully');

        // 獲取所有用戶
        const users = await User.find({});
        console.log(`Found ${users.length} users to update`);

        let successCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        // 更新每個用戶
        for (const user of users) {
            try {
                console.log(`\nProcessing user: ${user.name} (${user.account})`);
                console.log('Current values:', {
                    department: user.department,
                    position: user.position
                });

                const updates = await validateAndUpdateUser(user);

                if (Object.keys(updates).length > 0) {
                    console.log('Applying updates:', updates);
                    await User.updateOne({ _id: user._id }, { $set: updates });
                    console.log(`Updated user ${user.name} successfully`);
                    successCount++;
                } else {
                    console.log('No updates needed for this user');
                    skippedCount++;
                }

                // 驗證更新後的數據
                const updatedUser = await User.findById(user._id);
                console.log('Updated values:', {
                    department: updatedUser.department,
                    position: updatedUser.position
                });

            } catch (error) {
                console.error(`Error processing user ${user.name}:`, error);
                errorCount++;
            }
        }

        console.log('\nUpdate Summary:');
        console.log(`Successfully updated: ${successCount}`);
        console.log(`Skipped (no updates needed): ${skippedCount}`);
        console.log(`Errors encountered: ${errorCount}`);

    } catch (error) {
        console.error('Fatal error occurred:', error);
    } finally {
        try {
            await mongoose.disconnect();
            console.log('Disconnected from MongoDB');
        } catch (error) {
            console.error('Error disconnecting:', error);
        }
    }
}

console.log('Starting update process...');
updateUsers();