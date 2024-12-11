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
      <template v-if="activeMenuItem === 'leave'">
        <SupervisorLeaveManagement />
      </template>
      <template v-else-if="activeMenuItem === 'staff'">
        <SupervisorStaffManagement />
      </template>
      <template v-else>
        <div>功能開發中...</div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, provide } from 'vue'
import { User, Document, Calendar, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import SupervisorLeaveManagement from '@/components/leave/SupervisorLeaveManagement.vue'
import SupervisorStaffManagement from '@/components/leave/SupervisorStaffManagement.vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

// 新增：將員工數據狀態提升到父組件
const allStaffList = ref([])
const staffDataLoaded = ref(false)
const loadingStaffData = ref(false)

// 新增：獲取所有部門員工數據的函數
const fetchAllDepartmentStaff = async () => {
  if (staffDataLoaded.value || loadingStaffData.value) return

  loadingStaffData.value = true
  try {
    const response = await axios.get('/api/user/all-department-employees')
    allStaffList.value = response.data
    staffDataLoaded.value = true
  } catch (error) {
    console.error('獲取部門員工失敗:', error)
    if (error.response?.status === 403) {
      ElMessage.error('您沒有權限查看部門員工資料')
    } else {
      ElMessage.error('獲取部門員工失敗')
    }
  } finally {
    loadingStaffData.value = false
  }
}

// 新增：提供數據給子組件
provide('staffManagement', {
  allStaffList,
  staffDataLoaded,
  loadingStaffData,
  fetchAllDepartmentStaff
})

// 側邊欄收合狀態
const isSidebarCollapsed = ref(false)
const activeMenuItem = ref('leave') // 預設顯示請假管理

// 選單項目
const menuItems = [
  { id: 'staff', label: '員工管理', icon: User },
  { id: 'performance', label: '業績報表', icon: Document },
  { id: 'leave', label: '請假管理', icon: Calendar },
]

// 切換側邊欄
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}
</script>

<style scoped>
.dashboard-layout {
  display: flex;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.sidebar {
  width: 240px;
  background-color: #265d93;
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
  background-color: #faa82d;
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