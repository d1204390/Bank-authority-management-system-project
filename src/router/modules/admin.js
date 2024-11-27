import AdminDashboard from '@/views/AdminDashboard.vue'
import AdminEmployeeManage from '@/views/AdminEmployeeManage.vue'
import AdminLogin from '@/views/AdminLogin.vue'

export default [
    {
        path: '/admin/login',
        name: 'AdminLogin',
        component: AdminLogin,
        meta: { requiresGuest: true }  // 使用與主登入頁相同的 meta
    },
    {
        path: '/admin',
        name: 'Admin',
        component: AdminDashboard,
        meta: { requiresAuth: true, role: 'admin' }
    },
    {
        path: '/admin/EmployeesManagementPage',
        name: 'EmployeesManagement',
        component: AdminEmployeeManage,
        meta: { requiresAuth: true, role: 'admin' }
    }
]