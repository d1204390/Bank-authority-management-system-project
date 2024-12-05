<template>
  <div id="app">
    <!-- 根據登入狀態和用戶角色切換導覽列 -->
    <AdminNavbar v-if="isAdminLoggedIn"/>
    <UserNavbar v-else-if="isUserLoggedIn"/>
    <TheNavbar v-else/>
    <div class="main-content">
      <router-view/>
    </div>
    <TheFooter/>
    <BackToTop />
  </div>
</template>

<script setup>
import { computed, onMounted, watch, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import TheNavbar from '@/components/Navbar.vue'
import AdminNavbar from '@/components/AdminNavbar.vue'
import UserNavbar from '@/components/UserNavbar.vue'
import TheFooter from '@/components/Footer.vue'
import BackToTop from '@/components/BackToTop.vue'

const route = useRoute()
const router = useRouter()

// 添加觸發重新渲染的標記
const authUpdate = ref(0)

// 檢查是否為已登入的管理員
const isAdminLoggedIn = computed(() => {
  authUpdate.value // 添加依賴
  const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}')
  const token = localStorage.getItem('token')
  return token && userInfo.role === 'admin'
})

// 檢查是否為已登入的一般用戶
const isUserLoggedIn = computed(() => {
  authUpdate.value // 添加依賴
  const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}')
  const token = localStorage.getItem('token')
  return token && userInfo.role !== 'admin' && userInfo.department
})

// 監聽路由變化，處理未授權訪問
watch(route, (newRoute) => {
  const token = localStorage.getItem('token')
  const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}')

  // 在每次路由變化時更新觸發器
  authUpdate.value++

  // 處理管理員路由
  if (newRoute.path.startsWith('/admin') && newRoute.path !== '/admin/login') {
    if (!token || !userInfo.role || userInfo.role !== 'admin') {
      router.replace('/admin/login')
      return
    }
  }

  // 處理用戶路由
  if (newRoute.path.match(/^\/(?:business|finance|loan|user)/)) {
    if (!token || !userInfo.department) {
      router.replace('/')
      return
    }
  }
})

// 檢查token並重定向的邏輯保持不變
const checkAndRedirect = () => {
  const token = localStorage.getItem('token')
  const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}')

  if (token && route.path === '/') {
    try {
      if (userInfo.role === 'admin') {
        router.replace('/admin')
      } else {
        const redirectMap = {
          'LD': '/loan/dashboard',
          'FD': '/finance/dashboard',
          'BD': '/business/dashboard'
        }
        const redirectPath = redirectMap[userInfo.department]
        if (redirectPath) {
          const position = userInfo.position
          const positionMap = {
            'M': 'manager',
            'S': 'supervisor',
            'C': 'staff'
          }
          router.replace(`${redirectPath}/${positionMap[position]}`)
        }
      }
    } catch (error) {
      console.error('Redirect error:', error)
      localStorage.removeItem('token')
      sessionStorage.removeItem('userInfo')
      router.replace('/')
    }
  }
}

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