// backend/utils/leaveTimeUtils.js

const WORK_HOURS = {
    START: '08:00',
    END: '17:00',
    LUNCH_START: '12:00',
    LUNCH_END: '13:00'
};

/**
 * 計算工作時數
 * @param {Date} startDate 開始日期時間
 * @param {Date} endDate 結束日期時間
 * @returns {number} 工作時數
 */
const calculateWorkingHours = (startDate, endDate) => {
    if (endDate < startDate) return 0;

    // 如果是同一天
    if (startDate.toDateString() === endDate.toDateString()) {
        return calculateDayHours(startDate, endDate);
    }

    let totalHours = 0;
    let currentDate = new Date(startDate);

    // 逐日計算
    while (currentDate <= endDate) {
        let dayStart = new Date(currentDate.setHours(8, 0, 0));
        let dayEnd = new Date(currentDate.setHours(17, 0, 0));

        // 調整當天的開始和結束時間
        if (currentDate.getTime() === startDate.getTime()) {
            dayStart = startDate;
        }
        if (currentDate.toDateString() === endDate.toDateString()) {
            dayEnd = endDate;
        }

        let dayHours = calculateDayHours(dayStart, dayEnd);
        totalHours += dayHours;

        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(0, 0, 0, 0);
    }

    return Number(totalHours.toFixed(1));
};

/**
 * 計算單日工作時數
 * @param {Date} start 開始時間
 * @param {Date} end 結束時間
 * @returns {number} 工作時數
 */
const calculateDayHours = (start, end) => {
    let hours = 0;
    let startTime = start.getHours() * 60 + start.getMinutes();
    let endTime = end.getHours() * 60 + end.getMinutes();

    // 確保時間在工作時間範圍內
    startTime = Math.max(startTime, 8 * 60); // 不早於8:00
    endTime = Math.min(endTime, 17 * 60);    // 不晚於17:00

    // 如果時間跨越午休時間(12:00-13:00)，需要減去一小時
    if (startTime < 12 * 60 && endTime > 13 * 60) {
        hours = (endTime - startTime - 60) / 60;
    } else if (startTime >= 12 * 60 && startTime < 13 * 60) {
        hours = (endTime - 13 * 60) / 60;
    } else if (endTime > 12 * 60 && endTime <= 13 * 60) {
        hours = (12 * 60 - startTime) / 60;
    } else {
        hours = (endTime - startTime) / 60;
    }

    // 處理特殊情況：當結束時間是17:00時
    if (endTime === 17 * 60) {
        hours = Math.min(hours, (17 * 60 - startTime) / 60);
    }

    return Number(Math.max(0, hours.toFixed(1)));
};

/**
 * 驗證請假時間是否在工作時間內
 * @param {Date} date 日期時間
 * @returns {boolean} 是否在工作時間內
 */
const isWithinWorkHours = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    return timeInMinutes >= 8 * 60 && timeInMinutes <= 17 * 60;
};

/**
 * 格式化顯示時數
 * @param {number} hours 工作時數
 * @returns {string} 格式化後的時數顯示
 */
const formatDuration = (hours) => {
    return `${hours}小時`;
};

module.exports = {
    WORK_HOURS,
    calculateWorkingHours,
    isWithinWorkHours,
    formatDuration
};