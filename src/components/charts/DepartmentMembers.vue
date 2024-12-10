<template>
  <el-card class="staff-list" v-loading="loadingStaffData">
    <!-- 搜索欄和功能按鈕 -->
    <div class="top-controls">
      <el-input
          v-model="searchQuery"
          placeholder="搜尋員工姓名或分機"
          class="search-input"
          clearable
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <!-- 主管和經理的功能按鈕 -->
      <div class="action-buttons">
        <el-button
            v-if="currentUserPosition === 'S'"
            type="primary"
            @click="handleNewEmployee"
        >
          提交新進員工
        </el-button>
        <el-button
            v-if="currentUserPosition === 'M'"
            type="success"
            @click="handleReview"
        >
          審核申請
        </el-button>
      </div>
    </div>

    <!-- 員工列表表格 -->
    <div class="table-container">
      <el-table
          :data="filteredStaffList"
          style="width: 100%"
      >
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="position" label="職位" width="120">
          <template #default="scope">
            {{ getPositionLabel(scope.row.position) }}
          </template>
        </el-table-column>
        <el-table-column prop="extension" label="分機" width="120" />
        <el-table-column prop="email" label="電子郵件" min-width="200" />
        <el-table-column fixed="right" label="操作" width="120">
          <template #default="scope">
            <el-button size="small" @click="handleViewDetails(scope.row)">
              詳情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新進員工申請列表 -->
    <div class="new-employees-section">
      <el-divider>
        <el-text class="mx-2" type="info">審核中新進員工表單</el-text>
      </el-divider>

      <el-table
          :data="newEmployeesList"
          style="width: 100%"
          v-loading="loadingNewEmployees"
      >
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="email" label="電子郵件" min-width="180" />
        <el-table-column label="到職日期" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.startDate) }}
          </template>
        </el-table-column>
        <el-table-column label="狀態" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交者" width="100">
          <template #default="scope">
            {{ scope.row.submitter?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="提交時間" width="150">
          <template #default="scope">
            {{ formatDateTime(scope.row.submittedAt) }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 員工詳情對話框 -->
    <ViewEmployeeDialog
        v-model:visible="dialogVisible"
        :userData="currentStaff"
        :showEditButton="false"
    />

    <!-- 新進員工表單對話框 -->
    <NewEmployeeDialog
        v-if="showNewEmployeeDialog"
        v-model:visible="newEmployeeDialogVisible"
        :departmentCode="departmentCode"
        @submit-success="handleNewEmployeeSuccess"
    />

    <!-- 審核對話框 -->
    <ReviewApplicationsDialog
        v-if="showReviewDialog"
        v-model:visible="reviewDialogVisible"
        :departmentCode="departmentCode"
        @review-complete="handleReviewComplete"
    />
  </el-card>
</template>

<script setup>
import { ref, computed, inject, defineProps, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import ViewEmployeeDialog from '@/components/dialogs/ViewEmployeeDialog.vue'
import NewEmployeeDialog from '@/components/dialogs/NewEmployeeDialog.vue'
import ReviewApplicationsDialog from '@/components/dialogs/ReviewApplicationsDialog.vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

// 注入從父組件提供的數據和方法
const {
  allStaffList,
  loadingStaffData,
} = inject('staffManagement')

// 本地狀態
const searchQuery = ref('')
const dialogVisible = ref(false)
const currentStaff = ref(null)
const newEmployeeDialogVisible = ref(false)
const reviewDialogVisible = ref(false)
const newEmployeesList = ref([])
const loadingNewEmployees = ref(false)

// Props
const props = defineProps({
  departmentCode: {
    type: String,
    required: true
  }
})

// 計算屬性
const currentUserPosition = computed(() => {
  const currentUser = allStaffList.value.find(staff => staff.isCurrent)
  return currentUser?.position || ''
})

const showNewEmployeeDialog = computed(() => currentUserPosition.value === 'S')
const showReviewDialog = computed(() => currentUserPosition.value === 'M')

const departmentStaff = computed(() => {
  return allStaffList.value.filter(staff => staff.department === props.departmentCode)
})

const filteredStaffList = computed(() => {
  if (!searchQuery.value) return departmentStaff.value
  const query = searchQuery.value.toLowerCase()
  return departmentStaff.value.filter(staff =>
      staff.name.toLowerCase().includes(query) ||
      (staff.extension && staff.extension.includes(query))
  )
})

// 日期時間格式化函數
const formatDateTime = (dateStr) => {
  if (!dateStr || dateStr === '-' || dateStr === 'undefined') return '-'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return '-'
    }

    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Taipei'
    }).format(date).replace(/\//g, '-')
  } catch (error) {
    console.debug('日期格式化錯誤:', error, 'dateStr:', dateStr) // 改用 debug level
    return '-'
  }
}


// 日期格式化函數
const formatDate = (dateStr) => {
  if (!dateStr || dateStr === '-' || dateStr === 'undefined') return '-'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return '-'
    }

    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Taipei'
    }).format(date).replace(/\//g, '-')
  } catch (error) {
    console.debug('日期格式化錯誤:', error, 'dateStr:', dateStr) // 改用 debug level
    return '-'
  }
}

// 工具函數
const getPositionLabel = (code) => {
  const map = {
    'M': '經理',
    'S': '主管',
    'C': '科員'
  }
  return map[code] || code
}

const getStatusType = (status) => {
  const statusMap = {
    'pending': 'warning',
    'approved': 'success',
    'rejected': 'danger'
  }
  return statusMap[status] || 'info'
}

const getStatusLabel = (status) => {
  const statusMap = {
    'pending': '待審核',
    'approved': '已核准',
    'rejected': '已駁回'
  }
  return statusMap[status] || status
}

// 獲取新進員工申請列表
const fetchNewEmployees = async () => {
  loadingNewEmployees.value = true
  try {
    const response = await axios.get('/api/new-employees/list', {
      params: {
        status: '', // 空字串表示獲取所有狀態
        page: 1,
        limit: 10
      }
    })
    // 在設置數據前先檢查一下格式
    console.log('API Response:', response.data.employees)
    newEmployeesList.value = response.data.employees
  } catch (error) {
    console.error('獲取新進員工申請失敗:', error)
    ElMessage.error('獲取新進員工申請失敗')
  } finally {
    loadingNewEmployees.value = false
  }
}

// 事件處理函數
const handleViewDetails = (staff) => {
  currentStaff.value = staff
  dialogVisible.value = true
}

const handleNewEmployee = () => {
  newEmployeeDialogVisible.value = true
}

const handleReview = () => {
  reviewDialogVisible.value = true
}

const handleNewEmployeeSuccess = () => {
  newEmployeeDialogVisible.value = false
  ElMessage.success('新進員工資料已提交')
  fetchNewEmployees() // 重新獲取列表
}

const handleReviewComplete = () => {
  reviewDialogVisible.value = false
  ElMessage.success('審核完成')
  fetchNewEmployees() // 重新獲取列表
}

// 組件掛載時獲取數據
onMounted(() => {
  fetchNewEmployees()
})
</script>

<style scoped>
.top-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
}

.search-input {
  width: 300px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.table-container {
  margin-top: 20px;
}

.new-employees-section {
  margin-top: 32px;
}

/* 表格樣式 */
:deep(.el-table) {
  --el-table-header-bg-color: #f5f7fa;

  th {
    background-color: var(--el-table-header-bg-color);
    font-weight: 600;
  }

  td {
    padding: 8px 0;
  }
}

:deep(.el-divider__text) {
  font-size: 16px;
  font-weight: 500;
}

:deep(.el-tag) {
  min-width: 60px;
  text-align: center;
}

/* Element Plus 組件樣式覆寫 */
:deep(.el-card) {
  border-radius: 8px;
  margin-bottom: 16px;

  .el-card__body {
    padding: 20px;
  }
}

:deep(.el-button--small) {
  padding: 8px 16px;
}

:deep(.el-input__inner) {
  height: 36px;
  line-height: 36px;
}

/* 響應式設計 */
@media screen and (max-width: 768px) {
  .top-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    width: 100%;
  }

  .action-buttons {
    justify-content: flex-end;
  }

  :deep(.el-table) {
    th, td {
      padding: 8px 6px;
    }
  }
}

/* 暗色主題適配 */
:deep([class*='--dark']) {
  .el-table th {
    background-color: #1d1d1d;
  }

  .el-card {
    background: #1a1a1a;
    border-color: #2c2c2c;
  }
}
</style>