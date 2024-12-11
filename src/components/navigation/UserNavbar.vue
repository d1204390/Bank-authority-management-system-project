<template>
  <UserBaseNavbar
      :key="forceUpdate"
      :brand-name="systemName"
      :user-name="userName"
      @logout="handleLogout"
      @profile="handleProfile"
  />
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import UserBaseNavbar from './UserBaseNavbar.vue'
import { getSystemName } from '@/config/navbarConfig'

const router = useRouter()
const forceUpdate = ref(0)

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

const userInfo = ref(getUserInfo())

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

const userName = computed(() => {
  return userInfo.value?.name || '未知用戶'
})

const systemName = computed(() => {
  const dept = userInfo.value?.department
  const pos = userInfo.value?.position
  if (!dept || !pos) {
    return '系統'
  }
  return getSystemName(dept, pos)
})

window.addEventListener('storage', async (e) => {
  if (e.key === 'token') {
    await updateUserInfo()
  }
})

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

onMounted(async () => {
  await updateUserInfo()

  if (!userInfo.value) {
    router.push('/')
    return
  }
})
</script>