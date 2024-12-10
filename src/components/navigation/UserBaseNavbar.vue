<template>
  <nav class="navbar">
    <div class="nav-container">
      <!-- 品牌區域 -->
      <div class="nav-brand">
        <router-link :to="dashboardPath" class="brand-link">
          <span class="brand-text">{{ brandName }}</span>
        </router-link>
      </div>

      <!-- 漢堡選單按鈕 (移動端) -->
      <div class="nav-toggle" @click="toggleMenu">
        <el-icon><Fold /></el-icon>
      </div>

      <!-- 導航選單區域 -->
      <div class="nav-items" :class="{ 'active': isMenuOpen }">
        <template v-for="item in menuItems" :key="item.path || item.title">
          <!-- 一般選單項 -->
          <router-link
              v-if="!item.children"
              :to="item.path"
              class="nav-link"
          >
            <el-icon v-if="item.icon" class="nav-icon">
              <component :is="item.icon" />
            </el-icon>
            {{ item.title }}
          </router-link>

          <!-- 下拉選單 -->
          <el-dropdown
              v-else
              class="nav-dropdown"
              trigger="hover"
          >
            <span class="nav-link">
              <el-icon v-if="item.icon" class="nav-icon">
                <component :is="item.icon" />
              </el-icon>
              {{ item.title }}
              <el-icon class="nav-arrow"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                    v-for="child in item.children"
                    :key="child.path"
                    @click="navigateTo(child.path)"
                >
                  <el-icon v-if="child.icon" class="nav-icon">
                    <component :is="child.icon" />
                  </el-icon>
                  {{ child.title }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </div>

      <!-- 用戶資訊區域 -->
      <div class="user-section">
        <!-- 通知圖標 -->
        <el-badge :value="notificationCount" class="notification-badge" v-if="hasNotifications">
          <el-icon class="notification-icon" @click="$emit('notification')">
            <Bell />
          </el-icon>
        </el-badge>

        <!-- 用戶選單 -->
        <el-dropdown trigger="hover">
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
import { ref, computed, defineEmits, defineProps } from 'vue'
import { useRouter } from 'vue-router'
import {
  Fold,
  User,
  Bell,
  ArrowDown,
  UserFilled,
  SwitchButton
} from '@element-plus/icons-vue'

// Props 定義
const props = defineProps({
  brandName: {
    type: String,
    required: true
  },
  menuItems: {
    type: Array,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  notificationCount: {
    type: Number,
    default: 0
  }
})

// 路由
const router = useRouter()

// 獲取用戶部門
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

// 計算儀表板路徑
const dashboardPath = computed(() => {
  const department = getUserDepartment()
  const pathMap = {
    'LD': '/loan/dashboard',
    'FD': '/finance/dashboard',
    'BD': '/business/dashboard'
  }
  return pathMap[department] || '/user/profile'
})

// 其他計算屬性
const hasNotifications = computed(() => props.notificationCount > 0)

// 事件發射
defineEmits(['logout', 'profile', 'notification'])

// 響應式狀態
const isMenuOpen = ref(false)

// 方法定義
const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const navigateTo = (path) => {
  router.push(path)
  isMenuOpen.value = false
}
</script>

<style scoped>
.navbar {
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
}

.nav-brand .brand-link {
  text-decoration: none;
}

.brand-text {
  font-size: 1.2rem;
  font-weight: bold;
  color: #333;
}

.nav-items {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 5px;
  text-decoration: none;
  color: #666;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  cursor: pointer;
  padding: 5px 0;
}

.nav-link:hover {
  color: #409EFF;
}

.nav-icon {
  margin-right: 4px;
}

.nav-arrow {
  margin-left: 4px;
}

.nav-dropdown {
  position: relative;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  color: #666;
}

.notification-badge {
  cursor: pointer;
}

.notification-icon {
  font-size: 1.2rem;
  color: #666;
}

/* 漢堡選單按鈕預設隱藏 */
.nav-toggle {
  display: none;
  cursor: pointer;
  font-size: 1.5rem;
  color: #333;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .nav-container {
    padding: 0 1rem;
  }

  .brand-text {
    font-size: 1rem;
  }

  /* 在手機版才顯示漢堡選單按鈕 */
  .nav-toggle {
    display: block;
  }

  .nav-items {
    display: none;
    position: absolute;
    top: 60px;
    left: 0;
    width: 100%;
    background-color: #ffffff;
    flex-direction: column;
    padding: 1rem 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .nav-items.active {
    display: flex;
  }

  .nav-link {
    padding: 1rem 2rem;
    width: 100%;
  }

  .nav-link:hover {
    background-color: #f5f5f5;
  }
}

/* Element Plus 相關樣式調整 */
:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 5px;
}

:deep(.el-dropdown-menu__item i) {
  margin-right: 5px;
}
</style>