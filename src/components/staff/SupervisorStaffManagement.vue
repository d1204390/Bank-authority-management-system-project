<template>
  <div class="staff-management">
    <el-tabs v-model="activeTab" class="staff-tabs">
      <!-- 組織架構圖 -->
      <el-tab-pane label="組織架構" name="organization">
        <div class="department-controls">
          <el-radio-group v-model="viewMode" size="large">
            <el-radio-button label="all">所有部門</el-radio-button>
            <el-radio-button label="current">當前部門</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 組織架構容器 -->
        <div class="org-charts-container" v-loading="loadingStaffData">
          <template v-if="viewMode === 'all'">
            <DepartmentCard
                v-for="dept in departmentList"
                :key="dept"
                :department="dept"
                :staffList="getDepartmentStaff(dept)"
            />
          </template>
          <template v-else>
            <DepartmentCard
                :department="userDepartment"
                :staffList="currentDepartmentStaff"
            />
          </template>
        </div>
      </el-tab-pane>

      <!-- 部門員工列表 -->
      <el-tab-pane label="部門成員" name="members">
        <DepartmentMembers :departmentCode="userDepartment" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, watch } from 'vue'
import DepartmentCard from '@/components/charts/DepartmentCard.vue'
import DepartmentMembers from '@/components/charts/DepartmentMembers.vue'

// 注入從父組件提供的數據和方法
const {
  allStaffList,
  staffDataLoaded,
  loadingStaffData,
  fetchAllDepartmentStaff
} = inject('staffManagement')

// 狀態管理
const activeTab = ref('organization')
const viewMode = ref('current')
const userDepartment = ref('')

// 監聽 allStaffList 的變化
watch(allStaffList, (newList) => {
  if (newList.length > 0) {
    const userData = newList.find(staff => staff.isCurrent)
    if (userData) {
      userDepartment.value = userData.department
    }
  }
}, { immediate: true })

// 計算屬性
const currentDepartmentStaff = computed(() => {
  return allStaffList.value.filter(staff => staff.department === userDepartment.value)
})

const departmentList = computed(() => {
  return [...new Set(allStaffList.value.map(staff => staff.department))]
})

// 根據部門代碼獲取該部門的員工列表
const getDepartmentStaff = (deptCode) => {
  return allStaffList.value.filter(staff => staff.department === deptCode)
}

// 初始化函數
onMounted(() => {
  if (!staffDataLoaded.value) {
    fetchAllDepartmentStaff()
  }
})
</script>

<style scoped>
.staff-management {
  height: 100%;
  padding: 20px;
  background: #f5f7fa;
}

.staff-tabs {
  height: 100%;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 16px 20px;
}

/* 部門控制區域 */
.department-controls {
  margin-bottom: 24px;
  display: flex;
  justify-content: center;
}

/* 組織架構容器 */
.org-charts-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px 0;
}

/* 確保子組件樣式正確顯示 */
:deep(.department-dashboard) {
  background: transparent;

  .dashboard-header {
    background: linear-gradient(135deg, #4A90E2, #357ABD);
  }

  .quick-stats {
    .el-statistic {
      .el-statistic__title {
        color: #FFFFFF !important;
        font-weight: 500;
        font-size: 14px;
        opacity: 1;
      }

      .el-statistic__content {
        color: #FFD700;
        font-size: 24px;

        .suffix-text {
          color: #FFFFFF;
        }
      }
    }
  }
}

/* 頁籤樣式 */
:deep(.el-tabs__header) {
  margin: 0 0 20px 0;
}

:deep(.el-tabs__item) {
  font-size: 15px;
}

:deep(.el-tabs__item.is-active) {
  font-weight: 600;
}

/* 響應式設計 */
@media screen and (max-width: 768px) {
  .staff-management {
    padding: 12px;
  }

  .staff-tabs {
    padding: 12px;
  }
}

/* 暗色主題適配 */
:deep([class*='--dark']) {
  .staff-management {
    background: #1a1a1a;
  }

  .staff-tabs {
    background: #141414;
  }
}
</style>