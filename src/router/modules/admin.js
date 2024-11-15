import AdminDashboard from '@/views/AdminDashboard.vue'
import AdminEmployeeManage from '@/views/AdminEmployeeManage.vue'

export default [
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