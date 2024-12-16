const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const NewEmployee = require('../models/NewEmployee');
const User = require('../models/User');
const { verifyToken} = require('../middleware/authMiddleware');
const { sendAccountCredentials } = require('../utils/emailService');
const mongoose = require('mongoose');

// 部門代碼映射
const departmentMap = {
    '業務部': 'BD',
    '消金部': 'FD',
    '借貸部': 'LD',
    'BD': 'BD',
    'FD': 'FD',
    'LD': 'LD'
};

// 職位代碼映射
const positionMap = {
    '經理': 'M',
    '主管': 'S',
    '科員': 'C',
    'M': 'M',
    'S': 'S',
    'C': 'C'
};

// 帳號前綴映射
const prefixMap = {
    'BD': { 'M': 'BDM', 'S': 'BDS', 'C': 'BDC' },
    'FD': { 'M': 'FDM', 'S': 'FDS', 'C': 'FDC' },
    'LD': { 'M': 'LDM', 'S': 'LDS', 'C': 'LDC' }
};

// 生成隨機密碼
const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 6 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
};

// 單一帳號建立路由
router.post('/create', verifyToken, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { name, department, position, email, startDate } = req.body;

        // 檢查必要欄位是否完整
        if (!name || !department || !position || !email || !startDate) {
            return res.status(400).json({
                success: false,
                message: '請提供完整的員工資訊'
            });
        }

        // 處理部門與職位代碼
        const departmentCode = departmentMap[department];
        const positionCode = positionMap[position];
        if (!departmentCode || !positionCode) {
            throw new Error('無效的部門或職位代碼');
        }

        // 生成帳號
        const prefix = prefixMap[departmentCode][positionCode];
        const account = await generateAccount(departmentCode, positionCode, prefix);

        // 生成隨機密碼並進行加密
        const password = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(password, 10);

        // 生成唯一的 employeeId
        const employeeId = await User.generateEmployeeId();

        // 建立使用者資料
        const newUser = new User({
            employeeId,
            name,
            department: departmentCode,
            position: positionCode,
            account,
            password: hashedPassword,
            email,
            isFirstLogin: true,
            lastLoginTime: null
        });

        // 保存至 User 集合
        await newUser.save({ session });

        // 更新 NewEmployee 集合的 hasAccount 狀態
        const updatedEmployee = await NewEmployee.findOneAndUpdate(
            {
                name,
                department,
                position,
                startDate: new Date(startDate) // 確保日期格式一致
            },
            {
                hasAccount: true,
                accountCreatedAt: new Date(),
                accountCreatedBy: req.user.employeeId,
                'accountInfo.username': account, // 儲存帳號資訊
                'accountInfo.isActivated': false
            },
            { session, new: true } // 使用 session 並返回更新後的紀錄
        );

        // 如果找不到對應的 NewEmployee，回傳錯誤
        if (!updatedEmployee) {
            throw new Error('找不到對應的員工資料，無法更新 NewEmployee 狀態');
        }

        // 發送帳號通知郵件
        await sendAccountCredentials(email, name, account, password);

        // 提交交易
        await session.commitTransaction();

        // 返回成功響應
        res.json({
            success: true,
            message: '帳號建立成功',
            data: {
                employeeId,
                account,
                password
            }
        });
    } catch (error) {
        // 若發生錯誤，回滾交易
        await session.abortTransaction();
        console.error('建立帳號失敗:', error);
        res.status(500).json({
            success: false,
            message: '建立帳號失敗',
            error: error.message
        });
    } finally {
        // 關閉 session
        session.endSession();
    }
});

// 生成帳號
const generateAccount = async (department, position, prefix) => {
    try {
        // 驗證輸入參數
        if (!department || !position || !prefix) {
            throw new Error('缺少必要參數');
        }

        // 確保部門代碼正確
        const validDepartments = ['BD', 'FD', 'LD'];
        if (!validDepartments.includes(department)) {
            throw new Error(`無效的部門代碼: ${department}`);
        }

        // 確保職位代碼正確
        const validPositions = ['M', 'S', 'C'];
        if (!validPositions.includes(position)) {
            throw new Error(`無效的職位代碼: ${position}`);
        }

        // 確保前綴格式正確
        const validPrefix = prefixMap[department]?.[position];
        if (!validPrefix || validPrefix !== prefix) {
            throw new Error(`無效的帳號前綴: ${prefix}`);
        }

        // 找出此前綴的所有帳號，並按照序號降序排序
        const existingAccounts = await User.find({
            account: new RegExp(`^${prefix}`)
        })
            .sort({ account: -1 })
            .lean();

        // 如果沒有現有帳號，從 001 開始
        if (existingAccounts.length === 0) {
            const firstAccount = `${prefix}001`;
            // 再次確認此帳號確實不存在（雙重檢查）
            const exists = await User.findOne({ account: firstAccount });
            if (exists) {
                throw new Error(`意外的重複帳號: ${firstAccount}`);
            }
            return firstAccount;
        }

        // 獲取所有現有序號
        const usedNumbers = existingAccounts.map(acc => {
            const numStr = acc.account.slice(-3);
            return parseInt(numStr, 10);
        }).filter(num => !isNaN(num));

        // 如果無法解析任何序號，記錄錯誤
        if (usedNumbers.length === 0) {
            throw new Error(`無法從現有帳號中解析序號: ${existingAccounts.map(a => a.account).join(', ')}`);
        }

        // 找出最大序號
        const maxNumber = Math.max(...usedNumbers);

        // 檢查是否超過上限
        if (maxNumber >= 999) {
            throw new Error(`${prefix} 的帳號序號已達上限 (999)`);
        }

        // 生成新序號（最大序號+1）
        const newNumber = maxNumber + 1;
        const newAccount = `${prefix}${String(newNumber).padStart(3, '0')}`;

        // 最後確認此帳號未被使用（雙重檢查）
        const accountExists = await User.findOne({ account: newAccount });
        if (accountExists) {
            throw new Error(`帳號 ${newAccount} 已存在（異常情況）`);
        }

        // 記錄生成的帳號（用於除錯）
        console.log(`成功生成帳號: ${newAccount} (部門: ${department}, 職位: ${position})`);

        return newAccount;
    } catch (error) {
        // 加入更多錯誤資訊
        const enrichedError = new Error(`生成帳號失敗 - ${error.message} (部門: ${department}, 職位: ${position}, 前綴: ${prefix})`);
        enrichedError.originalError = error;
        throw enrichedError;
    }
};

// 批量建立帳號
router.post('/batch-create', verifyToken, async (req, res) => {
    let sessions = [];  // 儲存所有的 sessions 以便清理
    const results = {
        success: [],
        failed: []
    };

    try {
        const { employeeIds } = req.body;

        // 驗證請求資料
        if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: '請提供有效的員工 ID 列表'
            });
        }

        // 按照 ID 順序查詢員工資料
        const employees = await Promise.all(
            employeeIds.map(async (id) => {
                const employee = await NewEmployee.findOne({
                    _id: id,
                    hasAccount: false
                }).lean();
                return employee;
            })
        );

        // 過濾掉不存在或已有帳號的員工
        const validEmployees = employees.filter(emp => emp !== null);

        if (validEmployees.length === 0) {
            return res.status(400).json({
                success: false,
                message: '沒有找到需要建立帳號的員工'
            });
        }

        // 處理每個員工
        for (const [index, employee] of validEmployees.entries()) {
            const session = await mongoose.startSession();
            sessions.push(session);
            session.startTransaction();

            try {
                // 檢查必要欄位
                const { _id, name, department, position, email, startDate } = employee;

                if (!name || !department || !position || !email || !startDate) {
                    throw new Error('員工資料不完整');
                }

                // 處理部門與職位代碼
                const departmentCode = departmentMap[department];
                const positionCode = positionMap[position];

                if (!departmentCode || !positionCode) {
                    throw new Error('無效的部門或職位代碼');
                }

                // 生成帳號
                const prefix = prefixMap[departmentCode][positionCode];
                const account = await generateAccount(departmentCode, positionCode, prefix);

                // 生成隨機密碼並加密
                const password = generateRandomPassword();
                const hashedPassword = await bcrypt.hash(password, 10);

                // 生成員工編號
                const employeeId = await User.generateEmployeeId();

                // 建立使用者資料
                const newUser = new User({
                    employeeId,
                    name,
                    department: departmentCode,
                    position: positionCode,
                    account,
                    password: hashedPassword,
                    email,
                    isFirstLogin: true,
                    lastLoginTime: null
                });

                // 保存使用者資料
                await newUser.save({ session });

                // 更新 NewEmployee 狀態
                await NewEmployee.findByIdAndUpdate(
                    _id,
                    {
                        hasAccount: true,
                        accountCreatedAt: new Date(),
                        accountCreatedBy: req.user.employeeId,
                        employeeId,
                        'accountInfo.username': account,
                        'accountInfo.isActivated': false
                    },
                    { session }
                );

                // 發送帳號通知郵件
                await sendAccountCredentials(email, name, account, password);

                // 提交交易
                await session.commitTransaction();

                // 記錄成功結果
                results.success.push({
                    id: _id,
                    name,
                    account,
                    employeeId,
                    sequence: index + 1  // 記錄處理順序
                });

                console.log(`成功建立帳號 [${index + 1}/${validEmployees.length}]: ${name} (${account})`);

            } catch (error) {
                // 回滾交易
                await session.abortTransaction();

                console.error(`建立帳號失敗 [${index + 1}/${validEmployees.length}] (${employee.name}):`, error);
                results.failed.push({
                    id: employee._id,
                    name: employee.name,
                    error: error.message,
                    sequence: index + 1
                });
            }
        }

        // 返回處理結果
        return res.json({
            success: results.success.length > 0,
            message: `成功建立 ${results.success.length} 個帳號，失敗 ${results.failed.length} 個`,
            results: {
                ...results,
                processingOrder: validEmployees.map(emp => emp.name)
            }
        });

    } catch (error) {
        console.error('批量建立帳號失敗:', error);
        return res.status(500).json({
            success: false,
            message: '批量建立帳號失敗',
            error: error.message,
            results
        });
    } finally {
        // 確保所有 session 都正確關閉
        await Promise.all(sessions.map(session => session.endSession()));
    }
});
module.exports = router;
