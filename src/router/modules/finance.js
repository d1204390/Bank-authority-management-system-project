export default [{
    path: '/finance',
    name: 'Finance',
    component: () => import('@/views/finance/FinanceDashboard.vue'),
    meta: { requiresAuth: true, department: 'FD' },
    children: [
        {
            path: 'dashboard',
            name: 'FinanceDashboard',
            component: () => import('@/views/finance/FinanceDashboard.vue')
        }
    ]
}]