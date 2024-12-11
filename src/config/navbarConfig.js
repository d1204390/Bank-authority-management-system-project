// 部門代號對應的完整名稱
export const DEPARTMENT_NAMES = {
    BD: '業務部',
    FD: '消金部',
    LD: '借貸部'
}

// 職位代號對應的完整名稱
export const POSITION_NAMES = {
    M: '經理',
    S: '主管',
    C: '科員'
}

// 更新 getSystemName 函數
export const getSystemName = (department, position) => {
    if (!department || !position) {
        console.warn('Missing department or position for system name:', { department, position });
        return '系統';
    }

    // 標準化部門代碼
    const deptMap = {
        'BD': 'BD',
        'FD': 'FD',
        'LD': 'LD',
        '業務部': 'BD',
        '消金部': 'FD',
        '借貸部': 'LD'
    };

    // 標準化職位代碼
    const posMap = {
        'M': 'M',
        'S': 'S',
        'C': 'C',
        '經理': 'M',
        '主管': 'S',
        '科員': 'C'
    };

    const standardDept = deptMap[department];
    const standardPos = posMap[position];

    if (!standardDept || !standardPos) {
        return '系統';
    }

    return `${DEPARTMENT_NAMES[standardDept] || ''}${POSITION_NAMES[standardPos] || ''}系統`;
};