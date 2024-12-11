<template>
  <nav class="navbar">
    <div class="nav-container">
      <div class="nav-brand">
        <router-link :to="dashboardPath" class="brand-link">
          <span class="brand-text">{{ brandName }}</span>
        </router-link>
      </div>

      <div class="user-section">
        <el-dropdown>
          <span class="user-info">
            <el-icon><User /></el-icon>
            {{ userName }}
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="$emit('profile')">
                <el-icon><UserFilled /></el-icon>個人資料
              </el-dropdown-item>
              <el-dropdown-item divided @click="$emit('logout')">
                <el-icon><SwitchButton /></el-icon>登出
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { computed, defineEmits, defineProps } from 'vue'
import {
  User,
  ArrowDown,
  UserFilled,
  SwitchButton
} from '@element-plus/icons-vue'

defineProps({
  brandName: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  }
})

const getUserDepartment = () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return null

    const parts = token.split('.')
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decodedData = JSON.parse(atob(payload))
    return decodedData.department
  } catch (error) {
    console.error('Error getting user department:', error)
    return null
  }
}

const dashboardPath = computed(() => {
  const department = getUserDepartment()
  const pathMap = {
    'LD': '/loan/dashboard',
    'FD': '/finance/dashboard',
    'BD': '/business/dashboard'
  }
  return pathMap[department] || '/user/profile'
})

defineEmits(['logout', 'profile'])
</script>

<style scoped>
.navbar {
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: 60px;
  position: fixed;
  width: 100%;
  top: 0;
  z-index: 1000;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  position: relative;
}

.nav-brand {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
}

.brand-link {
  text-decoration: none;
}

.brand-text {
  font-size: 1.2rem;
  font-weight: bold;
  color: #333;
}

.user-section {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 2;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  color: #666;
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 5px;
}

:deep(.el-dropdown-menu__item i) {
  margin-right: 5px;
}

@media (max-width: 768px) {
  .nav-container {
    padding: 0 1rem;
  }

  .brand-text {
    font-size: 1rem;
  }
}
</style>