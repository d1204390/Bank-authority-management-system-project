<template>
  <el-card class="department-history">
    <!-- 篩選表單 -->
    <div class="filter-form mb-4">
      <el-form :inline="true" :model="filterForm" class="filter-container">
        <el-form-item label="申請人姓名">
          <el-input
              v-model="filterForm.employeeName"
              placeholder="搜尋申請人"
              clearable
              @input="handleFilter"
              @clear="handleFilter"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="假別">
          <el-select
              v-model="filterForm.leaveType"
              placeholder="選擇假別"
              clearable
              @change="handleFilter"
          >
            <el-option
                v-for="(label, value) in leaveTypes"
                :key="value"
                :label="label"
                :value="value"
            >
              <span class="option-label">{{ label }}</span>
              <el-tag
                  v-if="filterForm.leaveType === value"
                  size="small"
                  class="selected-tag"
              >
                已選擇
              </el-tag>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="狀態">
          <el-select
              v-model="filterForm.status"
              placeholder="選擇狀態"
              clearable
              @change="handleFilter"
          >
            <el-option
                v-for="(label, value) in statusOptions"
                :key="value"
                :label="label"
                :value="value"
            >
              <span class="option-label">{{ label }}</span>
              <el-tag
                  v-if="filterForm.status === value"
                  size="small"
                  :type="getStatusType(value)"
                  class="selected-tag"
              >
                已選擇
              </el-tag>
            </el-option>
          </el-select>
        </el-form-item>

        <!-- 顯示已選擇的篩選條件 -->
        <div v-if="hasActiveFilters" class="active-filters">
          <span class="filter-label">已選擇：</span>
          <el-tag
              v-if="filterForm.employeeName"
              closable
              size="small"
              @close="clearFilter('employeeName')"
          >
            姓名：{{ filterForm.employeeName }}
          </el-tag>
          <el-tag
              v-if="filterForm.leaveType"
              closable
              size="small"
              @close="clearFilter('leaveType')"
          >
            假別：{{ leaveTypes[filterForm.leaveType] }}
          </el-tag>
          <el-tag
              v-if="filterForm.status"
              closable
              size="small"
              :type="getStatusType(filterForm.status)"
              @close="clearFilter('status')"
          >
            狀態：{{ statusOptions[filterForm.status] }}
          </el-tag>
          <el-button
              type="text"
              size="small"
              @click="resetFilter"
              class="clear-all"
          >
            <el-icon><Delete /></el-icon>
            清除全部
          </el-button>
        </div>
      </el-form>
    </div>

    <!-- 部門請假紀錄表格 -->
    <div class="table-container">
      <el-table
          v-loading="loading"
          :data="departmentHistory"
          style="width: 100%"
          :default-sort="{ prop: 'createdAt', order: 'descending' }"
      >
        <el-table-column
            prop="employeeName"
            label="申請人"
            width="120"
            fixed="left"
        />
        <el-table-column
            prop="createdAt"
            label="申請時間"
            width="160"
            fixed="left"
        />
        <el-table-column
            prop="startDate"
            label="開始時間"
            width="160"
        />
        <el-table-column
            prop="endDate"
            label="結束時間"
            width="160"
        />
        <el-table-column
            prop="leaveType"
            label="假別"
            width="100"
        >
          <template #default="scope">
            {{ getLeaveTypeText(scope.row.leaveType) }}
          </template>
        </el-table-column>
        <el-table-column
            prop="duration"
            label="時數"
            width="100"
            align="center"
        >
          <template #default="scope">
            {{ scope.row.formattedDuration }}
          </template>
        </el-table-column>
        <el-table-column
            prop="status"
            label="狀態"
            width="100"
            align="center"
        >
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
            prop="reason"
            label="請假原因"
            min-width="200"
            show-overflow-tooltip
        />
      </el-table>

      <!-- 無資料顯示 -->
      <el-empty
          v-if="!loading && !departmentHistory.length"
          description="目前無請假紀錄"
      />
    </div>

    <!-- 分頁控制 -->
    <div class="pagination-container" v-if="departmentHistory.length">
      <el-pagination
          v-model:current-page="departmentCurrentPage"
          v-model:page-size="departmentPageSize"
          :total="departmentTotal"
          @current-change="handleDepartmentPageChange"
          layout="total, prev, pager, next"
      />
    </div>
  </el-card>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Delete } from '@element-plus/icons-vue'
import axios from 'axios'
import { debounce } from 'lodash'

// 部門歷史記錄狀態
const loading = ref(false)
const departmentCurrentPage = ref(1)
const departmentPageSize = ref(10)
const departmentTotal = ref(0)
const departmentHistory = ref([])
// 添加用戶角色狀態
const userPosition = ref('')
// 獲取用戶資訊
const getUserInfo = async () => {
  try {
    const response = await axios.get('/api/user/profile')
    userPosition.value = response.data.position
  } catch (error) {
    console.error('獲取用戶資訊失敗:', error)
  }
}

// 篩選表單
const filterForm = reactive({
  employeeName: '',
  leaveType: '',
  status: ''
})

// 假別選項
const leaveTypes = {
  annual: '特休',
  personal: '事假',
  sick: '病假',
  funeral: '喪假',
  marriage: '婚假',
  maternity: '產假'
}

// 狀態選項
const statusOptions = {
  pending: '待審核',
  approved: '已核准',
  rejected: '已駁回',
  cancelled: '已撤回'
}

// 計算是否有活動的篩選條件
const hasActiveFilters = computed(() => {
  return filterForm.employeeName ||
      filterForm.leaveType ||
      filterForm.status
})

// 修改獲取部門請假歷史的函數
const fetchDepartmentHistory = async () => {
  loading.value = true
  try {
    const params = {
      page: departmentCurrentPage.value,
      limit: departmentPageSize.value
    }

    // 加入篩選條件
    if (filterForm.employeeName) {
      params.employeeName = filterForm.employeeName
    }
    if (filterForm.leaveType) {
      params.leaveType = filterForm.leaveType
    }
    if (filterForm.status) {
      params.status = filterForm.status
    }

    // 根據角色使用不同的 API
    const apiPath = userPosition.value === 'M'
        ? '/api/leave/manager/department-history'
        : '/api/leave/department-history'

    const response = await axios.get(apiPath, { params })

    departmentHistory.value = response.data.leaves
    departmentTotal.value = response.data.pagination.total
  } catch (error) {
    console.error('獲取部門請假歷史失敗:', error)
    ElMessage.error('獲取部門請假歷史失敗，請稍後再試')
  } finally {
    loading.value = false
  }
}

// 處理篩選 - 使用 debounce 避免過於頻繁的請求
const handleFilter = debounce(() => {
  departmentCurrentPage.value = 1  // 重置頁碼
  fetchDepartmentHistory()
}, 300)

// 清除單個篩選條件
const clearFilter = (filterName) => {
  filterForm[filterName] = ''
  handleFilter()
}

// 重置所有篩選
const resetFilter = () => {
  filterForm.employeeName = ''
  filterForm.leaveType = ''
  filterForm.status = ''
  handleFilter()
}

// 處理分頁變更
const handleDepartmentPageChange = (page) => {
  departmentCurrentPage.value = page
  fetchDepartmentHistory()
}

// 工具函數
const getLeaveTypeText = (type) => {
  return leaveTypes[type] || type
}

const getStatusText = (status) => {
  return statusOptions[status] || status
}

const getStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    cancelled: 'info'
  }
  return typeMap[status] || ''
}

// 組件掛載時初始化
onMounted(() => {
  getUserInfo().then(() => {
    fetchDepartmentHistory()
  })
})
</script>

<style scoped>
/* 表格卡片樣式 */
.department-history {
  margin-top: 0;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #ebeef5;
}

/* 篩選表單樣式 */
.filter-form {
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
}

.filter-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
}

.active-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  width: 100%;
}

.filter-label {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.selected-tag {
  float: right;
  margin-left: 8px;
}

.option-label {
  display: inline-block;
  min-width: 60px;
}

:deep(.el-tag) {
  margin-right: 4px;
}

.clear-all {
  color: var(--el-color-danger);
  padding: 0 4px;
}

:deep(.el-select) {
  width: 160px;
}

:deep(.el-select-dropdown__item) {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:deep(.el-form-item) {
  margin-bottom: 0;
}

:deep(.el-input__wrapper) {
  width: 200px;
}

/* 表格容器樣式 */
.table-container {
  width: 100%;
  overflow-x: auto;
  padding: 16px;
}

:deep(.el-table) {
  border-radius: 4px;
  overflow: hidden;
  --el-table-border-color: #ebeef5;
}

:deep(.el-table th) {
  background-color: #f5f7fa;
  font-weight: 600;
}

/* 分頁容器樣式 */
.pagination-container {
  margin-top: 20px;
  padding: 15px 20px;
  text-align: right;
  border-top: 1px solid #ebeef5;
  background: #fff;
}

/* 暗色主題適配 */
:deep([class*='--dark']) {
  .department-history {
    border-color: #363637;
  }

  .filter-form {
    border-color: #363637;
  }

  :deep(.el-table th) {
    background-color: #1d1d1d;
  }

  .pagination-container {
    background: #141414;
    border-color: #363637;
  }

  .filter-label {
    color: var(--el-text-color-secondary);
  }
}

/* 工具類 */
.mb-4 {
  margin-bottom: 16px;
}
</style>