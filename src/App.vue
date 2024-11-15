<template>
  <div id="app">
    <!-- 根據路由路徑切換導覽列 -->
    <AdminNavbar v-if="isAdminRoute"/>
    <UserNavbar v-else-if="isUserRoute"/>
    <TheNavbar v-else/>
    <div class="main-content">
      <router-view/>
    </div>
    <TheFooter/>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TheNavbar from '@/components/Navbar.vue'
import AdminNavbar from '@/components/AdminNavbar.vue'
import UserNavbar from '@/components/UserNavbar.vue'
import TheFooter from '@/components/Footer.vue'

const route = useRoute()
const router = useRouter()

// 檢查是否為管理員路由
const isAdminRoute = computed(() => route.path.startsWith('/admin'))

// 檢查是否為已登入用戶路由
const isUserRoute = computed(() => {
  return route.path.startsWith('/business') ||
      route.path.startsWith('/finance') ||
      route.path.startsWith('/loan') ||
      route.path.startsWith('/user')
})

// 檢查token並重定向
const checkAndRedirect = () => {
  const token = localStorage.getItem('token')
  if (token && route.path === '/') {
    try {
      // 解析 token
      const payload = token.split('.')[1]
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))

      // 根據用戶角色重定向
      if (decoded.role === 'admin') {
        router.replace('/admin')
      } else {
        const redirectMap = {
          'LD': '/loan/dashboard',
          'FD': '/finance/dashboard',
          'BD': '/business/dashboard'
        }
        const redirectPath = redirectMap[decoded.department]
        if (redirectPath) {
          router.replace(redirectPath)
        }
      }
    } catch (error) {
      console.error('Token parsing error:', error)
      localStorage.removeItem('token')
      sessionStorage.removeItem('userInfo')
    }
  }
}

// 組件掛載時檢查
onMounted(() => {
  checkAndRedirect()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  line-height: 1.6;
  color: #333;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding-top: 60px;
  min-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
}
</style>