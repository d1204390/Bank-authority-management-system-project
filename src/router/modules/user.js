export default [{
    path: '/user',
    name: 'User',
    component: () => import('@/views/user/UserProfile.vue'),  // 添加默認布局組件
    meta: { requiresAuth: true },
    children: [
        {
            path: 'profile',
            name: 'UserProfile',
            component: () => import('@/views/user/UserProfile.vue')
        }
    ]
}]