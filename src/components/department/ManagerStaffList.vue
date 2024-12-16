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

      <div class="action-buttons">
        <el-button
            type="primary"
            @click="handleReviewApplications"
            :disabled="loadingNewEmployees"
        >
          <el-icon><Document /></el-icon>
          審核申請
          <el-badge
              v-if="pendingApplicationsCount"
              :value="pendingApplicationsCount"
              class="ml-2"
          />
        </el-button>
      </div>
    </div>

    <!-- 員工列表 -->
    <div class="table-container">
      <el-table :data="filteredStaffList" style="width: 100%">
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="position" label="職位" width="120">
          <template #default="{ row }">
            {{ getPositionLabel(row.position) }}
          </template>
        </el-table-column>
        <el-table-column prop="extension" label="分機" width="120" />
        <el-table-column prop="email" label="電子郵件" min-width="200" />
        <el-table-column fixed="right" label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button
                type="primary"
                size="small"
                plain
                @click="handleViewDetails(row)"
            >
              詳情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 審核列表對話框 -->
    <el-dialog
        v-model="reviewDialogVisible"
        title="待審核新進員工申請"
        width="80%"
        destroy-on-close
        class="review-dialog"
    >
      <div class="review-controls">
        <div class="selection-info">
          <span v-if="selectedApplications.length > 0">
            已選擇 {{ selectedApplications.length }} 筆申請
          </span>
        </div>
        <div class="batch-actions" v-if="selectedApplications.length > 0">
          <el-button
              type="success"
              @click="handleBatchApprove"
              :loading="submittingApproval"
          >
            <el-icon><Check /></el-icon>
            批量核准
          </el-button>
          <el-button
              type="danger"
              @click="openBatchRejectDialog"
              :loading="submittingApproval"
          >
            <el-icon><Close /></el-icon>
            批量駁回
          </el-button>
        </div>
      </div>

      <el-table
          :data="newEmployeesList"
          style="width: 100%"
          v-loading="loadingNewEmployees"
          @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="email" label="電子郵件" min-width="180" />
        <el-table-column label="到職日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.startDate) }}
          </template>
        </el-table-column>
        <el-table-column label="狀態" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交者" width="120">
          <template #default="{ row }">
            {{ row.submitter?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="提交時間" width="150">
          <template #default="{ row }">
            {{ formatDateTime(row.submittedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <el-button-group v-if="row.status === 'pending'">
              <el-tooltip content="核准" placement="top">
                <el-button
                    size="small"
                    type="success"
                    :icon="Check"
                    circle
                    @click="handleSingleApprove(row)"
                />
              </el-tooltip>
              <el-tooltip content="駁回" placement="top">
                <el-button
                    size="small"
                    type="danger"
                    :icon="Close"
                    circle
                    @click="openRejectDialog(row)"
                />
              </el-tooltip>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="totalApplications"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
        />
      </template>
    </el-dialog>

    <!-- 駁回原因對話框 -->
    <el-dialog
        v-model="rejectDialogVisible"
        :title="isMultipleReject ? '批量駁回申請' : '駁回申請'"
        width="500px"
        destroy-on-close
        class="reject-dialog"
    >
      <div v-if="isMultipleReject" class="reject-info">
        已選擇 {{ selectedApplications.length }} 筆申請進行駁回
      </div>

      <el-form
          ref="rejectFormRef"
          :model="rejectForm"
          :rules="rejectRules"
          label-width="80px"
      >
        <el-form-item label="駁回原因" prop="reason">
          <el-input
              v-model="rejectForm.reason"
              type="textarea"
              :rows="4"
              placeholder="請輸入駁回原因"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="rejectDialogVisible = false">取消</el-button>
          <el-button
              type="danger"
              :loading="submittingApproval"
              @click="handleReject"
          >
            確認駁回
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 員工詳情對話框 -->
    <ViewEmployeeDialog
        v-model:visible="dialogVisible"
        :userData="currentStaff"
        :showEditButton="false"
    />
  </el-card>
</template>

<script setup>
import { ref, computed, inject, onMounted, defineProps } from 'vue'
import { Search, Document, Check, Close } from '@element-plus/icons-vue'
import ViewEmployeeDialog from '@/components/staff/ViewEmployeeDialog.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

// 注入和 Props 定義
const {
  allStaffList,
  loadingStaffData,
} = inject('staffManagement')

const props = defineProps({
  departmentCode: {
    type: String,
    required: true
  }
})

// 狀態定義
const searchQuery = ref('')
const dialogVisible = ref(false)
const currentStaff = ref(null)
const reviewDialogVisible = ref(false)
const rejectDialogVisible = ref(false)
const loadingNewEmployees = ref(false)
const submittingApproval = ref(false)
const newEmployeesList = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const totalApplications = ref(0)
const selectedApplications = ref([])
const isMultipleReject = ref(false)
const currentRejectTarget = ref(null)

// 表單相關
const rejectFormRef = ref(null)
const rejectForm = ref({
  reason: ''
})

const rejectRules = {
  reason: [
    { required: true, message: '請輸入駁回原因', trigger: 'blur' },
    { min: 2, message: '原因長度至少為 2 個字元', trigger: 'blur' }
  ]
}

// 計算屬性
const departmentStaff = computed(() => {
  return allStaffList.value?.filter(staff => staff.department === props.departmentCode) || []
})

const filteredStaffList = computed(() => {
  if (!searchQuery.value) return departmentStaff.value
  const query = searchQuery.value.toLowerCase()
  return departmentStaff.value.filter(staff =>
      staff.name.toLowerCase().includes(query) ||
      String(staff.extension || '').includes(query)
  )
})

const pendingApplicationsCount = computed(() => {
  return newEmployeesList.value.filter(app => app.status === 'pending').length || 0
})

// API 相關函數
const fetchNewEmployees = async () => {
  loadingNewEmployees.value = true
  try {
    const { data } = await axios.get('/api/new-employees/list', {
      params: {
        page: currentPage.value,
        limit: pageSize.value,
        status: 'pending'
      }
    })

    if (data.employees) {
      newEmployeesList.value = data.employees
      totalApplications.value = data.pagination?.total || 0
    }
  } catch (error) {
    console.error('獲取新進員工申請失敗:', error)
    ElMessage.error('獲取新進員工申請失敗，請稍後再試')
  } finally {
    loadingNewEmployees.value = false
  }
}

const processApproval = async (id, status, comment = '') => {
  try {
    await axios.post(`/api/new-employees/approve/${id}`, {
      status,
      comment: comment || '核准通過'
    })
    return true
  } catch (error) {
    console.error('處理審核失敗:', error)
    ElMessage.error(error.response?.data?.msg || '處理失敗，請稍後再試')
    return false
  }
}

// 事件處理函數
const handleSelectionChange = (selection) => {
  selectedApplications.value = selection
}

const handleSingleApprove = async (row) => {
  submittingApproval.value = true
  try {
    const success = await processApproval(row._id, 'approved')
    if (success) {
      ElMessage.success('已核准申請')
      await fetchNewEmployees()
    }
  } finally {
    submittingApproval.value = false
  }
}

const handleBatchApprove = async () => {
  if (selectedApplications.value.length === 0) {
    ElMessage.warning('請選擇要核准的申請')
    return
  }

  try {
    await ElMessageBox.confirm(
        `確定要核准所選的 ${selectedApplications.value.length} 筆申請？`,
        '確認核准',
        {
          confirmButtonText: '確定',
          cancelButtonText: '取消',
          type: 'success'
        }
    )

    submittingApproval.value = true
    let successCount = 0

    for (const app of selectedApplications.value) {
      const success = await processApproval(app._id, 'approved')
      if (success) successCount++
    }

    if (successCount > 0) {
      ElMessage.success(`成功核准 ${successCount} 筆申請`)
      await fetchNewEmployees()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量核准失敗:', error)
    }
  } finally {
    submittingApproval.value = false
  }
}

const openRejectDialog = (row) => {
  isMultipleReject.value = false
  currentRejectTarget.value = row
  rejectForm.value.reason = ''
  rejectDialogVisible.value = true
}

const openBatchRejectDialog = () => {
  if (selectedApplications.value.length === 0) {
    ElMessage.warning('請選擇要駁回的申請')
    return
  }
  isMultipleReject.value = true
  rejectForm.value.reason = ''
  rejectDialogVisible.value = true
}

const handleReject = async () => {
  if (!rejectFormRef.value) return

  try {
    await rejectFormRef.value.validate()
    submittingApproval.value = true

    if (isMultipleReject.value) {
      let successCount = 0
      for (const app of selectedApplications.value) {
        const success = await processApproval(app._id, 'rejected', rejectForm.value.reason)
        if (success) successCount++
      }

      if (successCount > 0) {
        ElMessage.success(`成功駁回 ${successCount} 筆申請`)
        rejectDialogVisible.value = false
        await fetchNewEmployees()
      }
    } else {
      const success = await processApproval(
          currentRejectTarget.value._id,
          'rejected',
          rejectForm.value.reason
      )

      if (success) {
        ElMessage.success('已駁回申請')
        rejectDialogVisible.value = false
        await fetchNewEmployees()
      }
    }
  } catch (error) {
    if (error?.name === 'ValidationError') return
    console.error('駁回處理失敗:', error)
    ElMessage.error('駁回處理失敗，請稍後再試')
  } finally {
    submittingApproval.value = false
  }
}

const handleViewDetails = (staff) => {
  currentStaff.value = staff
  dialogVisible.value = true
}

const handleReviewApplications = () => {
  reviewDialogVisible.value = true
  fetchNewEmployees()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  fetchNewEmployees()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchNewEmployees()
}

// 工具函數
const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Taipei'
    }).replace(/\//g, '-')
  } catch {
    return '-'
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Taipei'
    }).replace(/\//g, '-')
  } catch {
    return '-'
  }
}

const getPositionLabel = (code) => ({
  'M': '經理',
  'S': '主管',
  'C': '科員'
})[code] || code

const getStatusLabel = (status) => ({
  'pending': '待審核',
  'approved': '已核准',
  'rejected': '已駁回'
})[status] || status

const getStatusType = (status) => ({
  'pending': 'warning',
  'approved': 'success',
  'rejected': 'danger'
})[status] || 'info'

// 初始化
onMounted(fetchNewEmployees)
</script>

<style scoped>
.staff-list {
  margin: 16px;
  background-color: var(--el-bg-color);
  box-shadow: var(--el-box-shadow-light);
}

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
  gap: 12px;
}

.table-container {
  margin-top: 20px;
}

/* 審核對話框樣式 */
.review-dialog {
  :deep(.el-dialog__body) {
    padding-top: 0;
  }
}

.review-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.selection-info {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.batch-actions {
  display: flex;
  gap: 12px;
}

/* 駁回對話框樣式 */
.reject-dialog {
  .reject-info {
    margin-bottom: 20px;
    padding: 12px;
    background-color: var(--el-color-danger-light-9);
    border-radius: 4px;
    color: var(--el-text-color-primary);
    font-size: 14px;
  }
}

/* 表格樣式優化 */
:deep(.el-table) {
  --el-table-header-bg-color: var(--el-fill-color-light);
  --el-table-row-hover-bg-color: var(--el-fill-color);
  border-radius: 8px;
  overflow: hidden;

  th {
    background-color: var(--el-table-header-bg-color);
    font-weight: 600;
  }

  td {
    padding: 8px 0;
  }
}

:deep(.el-tag) {
  min-width: 60px;
  text-align: center;
  border-radius: 4px;
}

/* 按鈕樣式優化 */
:deep(.el-button) {
  &.is-circle {
    margin: 0 4px;
  }
}

/* 分頁樣式 */
:deep(.el-pagination) {
  margin-top: 20px;
  justify-content: center;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .top-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    width: 100%;
  }

  .batch-actions {
    flex-direction: column;
    width: 100%;

    .el-button {
      width: 100%;
    }
  }
}

/* 暗黑模式適配 */
:deep(.dark) {
  .staff-list {
    background-color: var(--el-bg-color-overlay);
  }

  .reject-info {
    background-color: var(--el-color-danger-dark-2);
    color: var(--el-text-color-primary);
  }
}
</style>