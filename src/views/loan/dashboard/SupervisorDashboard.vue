<template>
  <div class="dashboard-layout">
    <!-- 左側選單 -->
    <div class="sidebar" :class="{ 'collapsed': isSidebarCollapsed }">
      <!-- 收合按鈕 -->
      <div class="collapse-btn" @click="toggleSidebar">
        <el-icon>
          <ArrowLeft v-if="!isSidebarCollapsed" />
          <ArrowRight v-else />
        </el-icon>
      </div>

      <!-- 選單項目 -->
      <div class="menu-container">
        <div
            v-for="item in menuItems"
            :key="item.id"
            class="menu-item"
            :class="{ 'active': activeMenuItem === item.id }"
            @click="activeMenuItem = item.id"
        >
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          <span v-show="!isSidebarCollapsed">{{ item.label }}</span>
        </div>
      </div>
    </div>

    <!-- 右側內容區 -->
    <div class="content-area">
      <component :is="currentComponent" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { User, Document, Calendar, Setting, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

// 側邊欄收合狀態
const isSidebarCollapsed = ref(false)
const activeMenuItem = ref('staff')

// 選單項目
const menuItems = [
  { id: 'staff', label: '員工管理', icon: User },
  { id: 'loans', label: '貸款審核', icon: Document },
  { id: 'leave', label: '請假管理', icon: Calendar },
  { id: 'settings', label: '系統設定', icon: Setting },
]

// 切換側邊欄
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

// 動態組件
const currentComponent = computed(() => {
  const componentMap = {
    staff: 'StaffManagement',
    loans: 'LoanApproval',
    leave: 'LeaveManagement',
    settings: 'SystemSettings'
  }
  return componentMap[activeMenuItem.value]
})
</script>

<style scoped>
.dashboard-layout {
  display: flex;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.sidebar {
  width: 240px;
  background-color: #304156;
  transition: all 0.3s;
  position: relative;
  color: #fff;
}

.sidebar.collapsed {
  width: 64px;
}

.collapse-btn {
  height: 32px;
  width: 32px;
  position: absolute;
  top: 16px;
  right: -16px;
  background-color: #689bde;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1;
}

.menu-container {
  padding: 64px 0 0;
}

.menu-item {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.menu-item:hover {
  background-color: #263445;
}

.menu-item.active {
  background-color: #1890ff;
}

.menu-item .el-icon {
  font-size: 18px;
  margin-right: 12px;
}

.content-area {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    z-index: 1000;
    height: 100vh;
  }

  .sidebar.collapsed {
    transform: translateX(-100%);
  }

  .content-area {
    margin-left: 0;
  }
}
</style>