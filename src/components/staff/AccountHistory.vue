//components/staff/AccountHistory.vue
<template>
  <div class="account-history">
    <!-- 操作区域 -->
    <div class="operation-bar">
      <div class="left-operations">
        <el-button type="primary" @click="refreshData" :loading="loading">
          <el-icon><Refresh /></el-icon>重新整理
        </el-button>
      </div>
      <div class="filter-section">
        <el-select v-model="departmentFilter" placeholder="部門篩選" clearable>
          <el-option label="全部部門" value="" />
          <el-option label="業務部" value="BD" />
          <el-option label="消金部" value="FD" />
          <el-option label="借貸部" value="LD" />
        </el-select>
        <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="開始日期"
            end-placeholder="結束日期"
            value-format="YYYY-MM-DD"
        />
      </div>
      <el-button @click="resetFilters" :disabled="loading">
        <el-icon><Refresh /></el-icon>重置篩選
      </el-button>
    </div>

    <!-- 歷史記錄表格 -->
    <el-table
        :data="historyData"
        style="width: 100%"
        border
        v-loading="loading"
    >
      <el-table-column prop="name" label="姓名" width="100" align="center" />
      <el-table-column label="部門" width="100" align="center">
        <template #default="{ row }">
          {{ convertDepartment(row.department) }}
        </template>
      </el-table-column>
      <el-table-column label="職位" width="100" align="center">
        <template #default="{ row }">
          {{ convertPosition(row.position) }}
        </template>
      </el-table-column>
      <el-table-column prop="employeeId" label="員工編號" width="120" align="center" />
      <el-table-column prop="accountInfo.username" label="帳號" width="120" align="center" />
      <el-table-column prop="email" label="Email" min-width="180" :show-overflow-tooltip="true" />
      <el-table-column
          prop="accountCreatedAt"
          label="帳號建立時間"
          width="160"
          align="center"
      >
        <template #default="{ row }">
          {{ formatDateTime(null, row.accountCreatedAt) }}
        </template>
      </el-table-column>
      <el-table-column
          label="操作"
          width="90"
          fixed="right"
          align="center"
      >
        <template #default="{ row }">
          <el-tooltip content="檢視詳情" placement="top">
            <el-button
                type="primary"
                :icon="View"
                circle
                size="small"
                @click="handleViewDetails(row)"
            />
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分頁 -->
    <div class="pagination-container">
      <el-pagination
          v-model:currentPage="currentPage"
          v-model:pageSize="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
      />
    </div>

    <!-- 詳情對話框 -->
    <el-dialog
        v-model="detailDialogVisible"
        title="帳號建立詳情"
        width="50%"
    >
      <template v-if="currentRecord">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">{{ currentRecord.name }}</el-descriptions-item>
          <el-descriptions-item label="部門">{{ convertDepartment(currentRecord.department) }}</el-descriptions-item>
          <el-descriptions-item label="職位">{{ convertPosition(currentRecord.position) }}</el-descriptions-item>
          <el-descriptions-item label="員工編號">{{ currentRecord.employeeId }}</el-descriptions-item>
          <el-descriptions-item label="帳號">{{ currentRecord.accountInfo?.username }}</el-descriptions-item>
          <el-descriptions-item label="Email">{{ currentRecord.email }}</el-descriptions-item>
          <el-descriptions-item label="建立時間">
            {{ formatDateTime(null, currentRecord.accountCreatedAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="approval-info" v-if="currentRecord.approvalChain?.length">
          <h4>審核資訊</h4>
          <el-timeline>
            <el-timeline-item
                v-for="(approval, index) in currentRecord.approvalChain"
                :key="index"
                type="success"
            >
              <h4>{{ approval.approverName }}</h4>
              <p>審核意見：{{ approval.comment }}</p>
              <p>審核時間：{{ formatDateTime(null, approval.timestamp) }}</p>
            </el-timeline-item>
          </el-timeline>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { Refresh, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

// 狀態管理
const loading = ref(false)
const historyData = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const departmentFilter = ref('')
const dateRange = ref([])
const detailDialogVisible = ref(false)
const currentRecord = ref(null)

// 監聽篩選條件變化
watch([departmentFilter, dateRange], () => {
  currentPage.value = 1  // 重置頁碼
  fetchHistoryData()
}, { deep: true })

// 工具函數
const convertDepartment = (code) => {
  const departmentMap = {
    'BD': '業務部',
    'FD': '消金部',
    'LD': '借貸部'
  }
  return departmentMap[code] || code
}

const convertPosition = (code) => {
  const positionMap = {
    'M': '經理',
    'S': '主管',
    'C': '科員'
  }
  return positionMap[code] || code
}

const formatDateTime = (row, cellValue) => {
  if (!cellValue) return '-'
  const date = new Date(cellValue)
  if (isNaN(date.getTime())) return '-'

  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(/\//g, '-')
}

// 資料操作方法
const fetchHistoryData = async () => {
  loading.value = true
  try {
    // 準備查詢參數
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      hasAccount: true  // 只獲取已建立帳號的記錄
    }

    // 添加部門篩選
    if (departmentFilter.value) {
      params.department = departmentFilter.value
    }

    // 添加日期範圍篩選
    if (dateRange.value?.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    const response = await axios.get('/api/new-employees/approved-list', {
      params,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    historyData.value = response.data.employees
    total.value = response.data.pagination.total
  } catch (error) {
    console.error('獲取歷史記錄失敗:', error)
    ElMessage.error(error.response?.data?.msg || '獲取資料失敗')
  } finally {
    loading.value = false
  }
}

// 事件處理方法
const handleViewDetails = (row) => {
  currentRecord.value = row
  detailDialogVisible.value = true
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  fetchHistoryData()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchHistoryData()
}

const refreshData = () => {
  currentPage.value = 1  // 重置頁碼
  fetchHistoryData()
}

const resetFilters = () => {
  departmentFilter.value = ''
  dateRange.value = []
  currentPage.value = 1
  fetchHistoryData()
  ElMessage.success('已重置篩選條件')
}

// 初始化
onMounted(() => {
  fetchHistoryData()
})
</script>

<style scoped>
.account-history {
  padding: 20px 0;
}

.operation-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.left-operations {
  display: flex;
  gap: 8px;
}

.filter-section {
  display: flex;
  gap: 12px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 詳情對話框 */
.approval-info {
  margin-top: 20px;
}

.approval-info h4 {
  margin-bottom: 16px;
  color: #303133;
  font-size: 16px;
}

:deep(.el-descriptions) {
  padding: 12px;
}

:deep(.el-descriptions__cell) {
  padding: 12px;
}

/* Element Plus 组件样式覆盖 */
:deep(.el-select) {
  width: 180px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .operation-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .left-operations,
  .filter-section {
    width: 100%;
  }

  .filter-section {
    flex-wrap: wrap;
  }

  :deep(.el-select),
  :deep(.el-date-editor) {
    width: 100% !important;
  }
}
</style>