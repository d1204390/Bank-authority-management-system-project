import { createRouter, createWebHistory } from 'vue-router'
import { setupGuards } from './guards'
import LoginView from '../views/LoginView.vue'

import adminRoutes from './modules/admin'
import dashboardRoutes from './modules/dashboard'
import userRoutes from './modules/user'

const routes = [
    {
        path: '/',
        name: 'Login',
        component: LoginView,
        meta: { requiresGuest: true }
    },
    ...adminRoutes,
    ...dashboardRoutes,
    ...userRoutes,
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

setupGuards(router)

export default router