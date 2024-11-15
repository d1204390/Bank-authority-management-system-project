import {
    Histogram,
    User,
    Medal,
    Calendar,
    Document,
    Setting,
    CreditCard,
    Monitor,
    Money,
    Briefcase,
    Grid,
    DocumentAdd,
    Connection,
    ChatDotSquare,
    Clock,
    Warning
} from '@element-plus/icons-vue'

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
    C: '專員'
}

// 共用選單項（所有角色都會看到的）
const commonMenuItems = [
    {
        title: '工作區',
        icon: Grid,
        children: [
            {
                title: '待辦事項',
                path: '/workspace/todos',
                icon: Clock
            },
            {
                title: '我的文件',
                path: '/workspace/documents',
                icon: Document
            },
            {
                title: '訊息中心',
                path: '/workspace/messages',
                icon: ChatDotSquare
            }
        ]
    }
]

// 基礎選單配置
const baseMenuItems = {
    // 業務部選單配置
    BD: {
        M: [ // 經理選單
            {
                title: '部門總覽',
                path: '/business/dashboard',
                icon: Monitor
            },
            {
                title: '人員管理',
                icon: User,
                children: [
                    {
                        title: '團隊管理',
                        path: '/business/team'
                    },
                    {
                        title: '績效考核',
                        path: '/business/performance'
                    }
                ]
            },
            {
                title: '業務管理',
                icon: Briefcase,
                children: [
                    {
                        title: '業績報表',
                        path: '/business/reports'
                    },
                    {
                        title: '客戶分析',
                        path: '/business/analysis'
                    }
                ]
            },
            {
                title: '部門設定',
                path: '/business/settings',
                icon: Setting
            }
        ],
        S: [ // 主管選單
            {
                title: '團隊管理',
                path: '/business/team-dashboard',
                icon: User
            },
            {
                title: '業務追蹤',
                icon: Connection,
                children: [
                    {
                        title: '案件進度',
                        path: '/business/cases/progress'
                    },
                    {
                        title: '業績統計',
                        path: '/business/cases/stats'
                    }
                ]
            },
            {
                title: '工作分配',
                path: '/business/tasks',
                icon: Calendar
            }
        ],
        C: [ // 專員選單
            {
                title: '業務管理',
                icon: Briefcase,
                children: [
                    {
                        title: '案件列表',
                        path: '/business/cases'
                    },
                    {
                        title: '新增案件',
                        path: '/business/cases/new'
                    }
                ]
            },
            {
                title: '客戶管理',
                icon: User,
                children: [
                    {
                        title: '客戶列表',
                        path: '/business/clients'
                    },
                    {
                        title: '新增客戶',
                        path: '/business/clients/new'
                    }
                ]
            },
            {
                title: '個人報表',
                path: '/business/my-stats',
                icon: Histogram
            }
        ]
    },
    // 消金部選單配置
    FD: {
        M: [
            {
                title: '部門總覽',
                path: '/finance/dashboard',
                icon: Monitor
            },
            {
                title: '風險管理',
                icon: Warning,
                children: [
                    {
                        title: '風險報表',
                        path: '/finance/risk/reports'
                    },
                    {
                        title: '審核標準',
                        path: '/finance/risk/standards'
                    }
                ]
            },
            {
                title: '產品管理',
                icon: Money,
                children: [
                    {
                        title: '產品列表',
                        path: '/finance/products'
                    },
                    {
                        title: '利率設定',
                        path: '/finance/rates'
                    }
                ]
            }
        ],
        S: [
            {
                title: '案件審核',
                icon: DocumentAdd,
                children: [
                    {
                        title: '待審列表',
                        path: '/finance/review/pending'
                    },
                    {
                        title: '審核紀錄',
                        path: '/finance/review/history'
                    }
                ]
            },
            {
                title: '信用評估',
                path: '/finance/credit',
                icon: CreditCard
            },
            {
                title: '團隊管理',
                path: '/finance/team',
                icon: User
            }
        ],
        C: [
            {
                title: '案件處理',
                icon: DocumentAdd,
                children: [
                    {
                        title: '進件申請',
                        path: '/finance/cases/new'
                    },
                    {
                        title: '案件查詢',
                        path: '/finance/cases/search'
                    }
                ]
            },
            {
                title: '客戶管理',
                path: '/finance/customers',
                icon: User
            },
            {
                title: '業績查詢',
                path: '/finance/performance',
                icon: Medal
            }
        ]
    },
    // 借貸部選單配置
    LD: {
        M: [
            {
                title: '部門總覽',
                path: '/loan/dashboard',
                icon: Monitor
            },
            {
                title: '放貸管理',
                icon: Money,
                children: [
                    {
                        title: '放貸報表',
                        path: '/loan/reports'
                    },
                    {
                        title: '額度控管',
                        path: '/loan/limits'
                    }
                ]
            },
            {
                title: '風險控管',
                icon: Histogram, // 使用 Histogram 取代 Shield
                children: [
                    {
                        title: '逾期管理',
                        path: '/loan/overdue'
                    },
                    {
                        title: '風險分析',
                        path: '/loan/risk-analysis'
                    }
                ]
            }
        ],
        S: [
            {
                title: '案件審核',
                icon: DocumentAdd,
                children: [
                    {
                        title: '審核作業',
                        path: '/loan/review'
                    },
                    {
                        title: '審核紀錄',
                        path: '/loan/review-history'
                    }
                ]
            },
            {
                title: '催收管理',
                path: '/loan/collection',
                icon: CreditCard // 使用 CreditCard 取代 Collection
            },
            {
                title: '團隊管理',
                path: '/loan/team',
                icon: User
            }
        ],
        C: [
            {
                title: '案件處理',
                icon: Briefcase,
                children: [
                    {
                        title: '案件列表',
                        path: '/loan/cases'
                    },
                    {
                        title: '新增申請',
                        path: '/loan/cases/new'
                    }
                ]
            },
            {
                title: '客戶管理',
                icon: User,
                children: [
                    {
                        title: '客戶資料',
                        path: '/loan/customers'
                    },
                    {
                        title: '還款紀錄',
                        path: '/loan/payments'
                    }
                ]
            },
            {
                title: '工作紀錄',
                path: '/loan/work-log',
                icon: Document
            }
        ]
    }
}


// 更新 getMenuItems 函數
export const getMenuItems = (department, position) => {
    if (!department || !position) {
        console.warn('Missing department or position:', { department, position });
        return [];
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
        '專員': 'C'
    };

    const standardDept = deptMap[department];
    const standardPos = posMap[position];

    if (!standardDept || !standardPos) {
        console.warn('Invalid department or position:', {
            department,
            position,
            standardDept,
            standardPos
        });
        return [];
    }

    console.log('Getting menu items for:', {
        standardDept,
        standardPos,
        hasMenus: !!baseMenuItems[standardDept]?.[standardPos]
    });

    const departmentMenus = baseMenuItems[standardDept]?.[standardPos] || [];
    return [...departmentMenus, ...commonMenuItems];
};

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
        '專員': 'C'
    };

    const standardDept = deptMap[department];
    const standardPos = posMap[position];

    console.log('Getting system name for:', {
        standardDept,
        standardPos,
        deptName: DEPARTMENT_NAMES[standardDept],
        posName: POSITION_NAMES[standardPos]
    });

    return `${DEPARTMENT_NAMES[standardDept] || ''}${POSITION_NAMES[standardPos] || ''}系統`;
};