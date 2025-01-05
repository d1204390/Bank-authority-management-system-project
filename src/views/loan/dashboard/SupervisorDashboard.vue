<template>
  <div class="dashboard-layout">
    <!-- 左側選單 -->
    <div class="sidebar" :class="{ 'collapsed': isSidebarCollapsed }">
      <!-- 頂部收合按鈕 -->
      <div class="collapse-btn collapse-btn-top" @click="toggleSidebar">
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

      <!-- 底部收合按鈕 -->
      <div class="collapse-btn collapse-btn-bottom" @click="toggleSidebar">
        <el-icon>
          <ArrowLeft v-if="!isSidebarCollapsed" />
          <ArrowRight v-else />
        </el-icon>
      </div>
    </div>

    <!-- 右側內容區 -->
    <div class="content-area">
      <template v-if="activeMenuItem === 'overview'">
        <SupervisorStatsOverview
            @update-menu-item="handleMenuItemUpdate"
            @update-tab="handleTabUpdate"
        />
      </template>
      <template v-if="activeMenuItem === 'leave'">
        <SupervisorLeaveManagement />
      </template>
      <template v-else-if="activeMenuItem === 'staff'">
        <SupervisorStaffManagement />
      </template>
      <template v-if="activeMenuItem === 'loans'">
        <SupervisorWork />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, provide } from 'vue'
import { User, Document, Calendar, ArrowLeft, ArrowRight,DataBoard } from '@element-plus/icons-vue'
import SupervisorLeaveManagement from '@/components/leave/SupervisorLeaveManagement.vue'
import SupervisorStaffManagement from '@/components/staff/SupervisorStaffManagement.vue'
import SupervisorWork from '@/views/loan/SupervisorWorkView.vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import SupervisorStatsOverview from "@/components/dashboard/SupervisorStatsOverview.vue";

const allStaffList = ref([])
const staffDataLoaded = ref(false)
const loadingStaffData = ref(false)

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

provide('staffManagement', {
  allStaffList,
  staffDataLoaded,
  loadingStaffData,
  fetchAllDepartmentStaff
})

const isSidebarCollapsed = ref(true)
const activeMenuItem = ref('overview')

const menuItems = [
  { id: 'overview', label: '總覽', icon: DataBoard },
  { id: 'staff', label: '員工管理', icon: User },
  { id: 'loans', label: '貸款審核', icon: Document },
  { id: 'leave', label: '請假管理', icon: Calendar },
]

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

// 添加處理事件的函數
const handleMenuItemUpdate = (page) => {
  activeMenuItem.value = page;
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
  background-color: #faa82d;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1;
  position: absolute;
  right: -16px;
}

.collapse-btn-top {
  top: 16px;
}

.collapse-btn-bottom {
  bottom: 16px;
}

.menu-container {
  padding: 64px 0 64px;  /* 增加底部內邊距，為底部按鈕留出空間 */
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