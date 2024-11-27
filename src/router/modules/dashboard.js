// modules/dashboard.js
import { getTokenInfo } from '../guards'

// 用於生成基本的儀表板配置
const createDashboardConfig = (department) => {
    const deptMap = {
        BD: {
            name: 'Business',
            path: '/business',
            prefix: 'Business'
        },
        FD: {
            name: 'Finance',
            path: '/finance',
            prefix: 'Finance'
        },
        LD: {
            name: 'Loan',
            path: '/loan',
            prefix: 'Loan'
        }
    }

    const config = deptMap[department]

    // 生成重定向函數
    const redirectFn = () => {
        const token = localStorage.getItem('token')
        const tokenInfo = getTokenInfo(token)

        if (!tokenInfo) return '/'

        const positionMap = {
            'M': `${config.path}/dashboard/manager`,
            'S': `${config.path}/dashboard/supervisor`,
            'C': `${config.path}/dashboard/staff`
        }

        return positionMap[tokenInfo.position] || `${config.path}/dashboard/staff`
    }

    return {
        path: config.path,
        name: config.name,
        component: () => import('@/views/DashboardView.vue'),
        meta: { requiresAuth: true, department },
        children: [
            {
                path: 'dashboard',
                name: `${config.prefix}Dashboard`,
                component: () => import('@/views/DashboardView.vue'),
                redirect: redirectFn,
                children: [
                    {
                        path: 'manager',
                        name: `${config.prefix}ManagerDashboard`,
                        component: () => import(`@/views/${config.path.slice(1)}/dashboard/ManagerDashboard.vue`),
                        meta: { position: ['M'] }
                    },
                    {
                        path: 'supervisor',
                        name: `${config.prefix}SupervisorDashboard`,
                        component: () => import(`@/views/${config.path.slice(1)}/dashboard/SupervisorDashboard.vue`),
                        meta: { position: ['S'] }
                    },
                    {
                        path: 'staff',
                        name: `${config.prefix}StaffDashboard`,
                        component: () => import(`@/views/${config.path.slice(1)}/dashboard/StaffDashboard.vue`),
                        meta: { position: ['C'] }
                    }
                ]
            }
        ]
    }
}

// 導出路由配置
export default [
    createDashboardConfig('BD'),
    createDashboardConfig('FD'),
    createDashboardConfig('LD')
]