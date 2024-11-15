import { createRouter, createWebHistory } from 'vue-router'
import { setupGuards } from './guards'
import LoginView from '../views/LoginView.vue'

import adminRoutes from './modules/admin'
import businessRoutes from './modules/business'
import financeRoutes from './modules/finance'
import loanRoutes from './modules/loan'
import userRoutes from './modules/user'

const routes = [
    {
        path: '/',
        name: 'Login',
        component: LoginView,
        meta: { requiresGuest: true }  // 添加這個標記
    },
    ...adminRoutes,
    ...businessRoutes,
    ...financeRoutes,
    ...loanRoutes,
    ...userRoutes,
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

setupGuards(router)

export default router