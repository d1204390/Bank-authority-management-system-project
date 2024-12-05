<template>
  <UserBaseNavbar
      :key="forceUpdate"
      :brand-name="systemName"
      :menu-items="menuItems"
      :user-name="userName"
      :notification-count="notificationCount"
      @logout="handleLogout"
      @profile="handleProfile"
      @notification="handleNotification"
  />
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import UserBaseNavbar from './UserBaseNavbar.vue'
import { getMenuItems, getSystemName } from '@/config/navbarConfig'
import axios from 'axios'

const router = useRouter()

// 響應式狀態
const notificationCount = ref(0)
const forceUpdate = ref(0)

// 直接從 token 獲取用戶信息
const getUserInfo = () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      console.warn('No token found')
      return null
    }

    const parts = token.split('.')
    if (parts.length !== 3) {
      console.error('Invalid token format')
      return null
    }

    const payload = parts[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')

    const jsonPayload = decodeURIComponent(atob(padded).split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''))

    const decoded = JSON.parse(jsonPayload)
    console.log('Decoded token info:', decoded)

    return {
      name: decoded.name,
      department: decoded.department,
      position: decoded.position
    }
  } catch (error) {
    console.error('Error parsing token:', error)
    return null
  }
}

// 使用 ref 存儲用戶信息
const userInfo = ref(getUserInfo())

// 更新用戶信息的函數
const updateUserInfo = async () => {
  const newInfo = getUserInfo()
  if (newInfo) {
    userInfo.value = newInfo
    forceUpdate.value++
    await nextTick()
    console.log('User info updated:', userInfo.value)
  } else {
    console.warn('Failed to update user info')
  }
}

// 計算屬性
const userName = computed(() => {
  return userInfo.value?.name || '未知用戶'
})

const menuItems = computed(() => {
  const dept = userInfo.value?.department
  const pos = userInfo.value?.position
  if (!dept || !pos) {
    return []
  }
  return getMenuItems(dept, pos)
})

const systemName = computed(() => {
  const dept = userInfo.value?.department
  const pos = userInfo.value?.position
  if (!dept || !pos) {
    return '系統'
  }
  return getSystemName(dept, pos)
})

// 監聽 storage 變化
window.addEventListener('storage', async (e) => {
  if (e.key === 'token') {
    await updateUserInfo()
  }
})

// 事件處理方法
const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('確定要登出系統嗎？', '登出確認', {
      confirmButtonText: '確定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    localStorage.removeItem('token')
    ElMessage.success('已成功登出')
    router.push('/')
  } catch {
    // 用戶取消登出
  }
}

const handleProfile = () => {
  router.push('/user/profile')
}

const handleNotification = () => {
  router.push('/user/notifications')
}

// 獲取通知數量
const fetchNotificationCount = async () => {
  try {
    const response = await axios.get('/api/user/notifications/unread-count')
    notificationCount.value = response.data.count
  } catch (error) {
    console.error('獲取通知數量失敗:', error)
  }
}

// 組件掛載時初始化
onMounted(async () => {
  await updateUserInfo()

  if (!userInfo.value) {
    router.push('/')
    return
  }

  fetchNotificationCount()
})
</script>
