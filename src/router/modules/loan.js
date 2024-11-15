export default [{
    path: '/loan',
    name: 'Loan',
    component: () => import('@/views/loan/LoanDashboard.vue'),
    meta: { requiresAuth: true, department: 'LD' },
    children: [
        {
            path: 'dashboard',
            name: 'LoanDashboard',
            component: () => import('@/views/loan/LoanDashboard.vue')
        }
    ]
}]