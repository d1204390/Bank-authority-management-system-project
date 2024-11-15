export default [{
    path: '/business',
    name: 'Business',
    component: () => import('@/views/business/BusinessDashboard.vue'),
    meta: { requiresAuth: true, department: 'BD' },
    children: [
        {
            path: 'dashboard',
            name: 'BusinessDashboard',
            component: () => import('@/views/business/BusinessDashboard.vue')
        }
    ]
}]