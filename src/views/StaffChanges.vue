//views/StaffChanges.vue
<template>
  <div class="staff-changes">
    <div class="content-wrapper">
      <h1 class="page-title">人員異動管理</h1>

      <!-- 功能分頁 -->
      <el-tabs v-model="activeTab" class="function-tabs">
        <el-tab-pane label="新進人員管理" name="newStaff">
          <!-- 新進人員統計 -->
          <div class="statistics-bar">
            <el-card class="stat-card" shadow="hover">
              <div class="stat-content">
                <div class="stat-label">
                  <el-icon><UserFilled /></el-icon>
                  待建立帳號
                </div>
                <div class="stat-value">{{ selectedRows.length || 0 }}/{{ pendingAccountsCount }}</div>
              </div>
            </el-card>
          </div>

          <!-- 新進人員操作區 -->
          <div class="operation-bar">
            <div class="left-operations">
              <el-button type="primary" @click="refreshNewStaffData">
                <el-icon><Refresh /></el-icon>重新整理
              </el-button>
              <el-button
                  type="warning"
                  @click="handleBatchAccountCreation"
                  :disabled="!selectedRows.length"
              >
                <el-icon><Key /></el-icon>批量建立帳號 ({{ selectedRows.length }})
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
                  v-model="startDateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="到職日期起"
                  end-placeholder="到職日期迄"
                  value-format="YYYY-MM-DD"
              />
            </div>
            <el-button @click="resetFilters">
              <el-icon><Refresh /></el-icon>重置篩選
            </el-button>
          </div>

          <!-- 新進人員表格 -->
          <el-table
              :data="filteredNewStaff"
              style="width: 100%"
              border
              @selection-change="handleSelectionChange"
          >
            <el-table-column
                type="selection"
                width="55"
                align="center"
            />
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
            <el-table-column prop="email" label="Email" min-width="160" :show-overflow-tooltip="true">
              <template #default="{ row }">
                <span class="email-text">{{ row.email }}</span>
              </template>
            </el-table-column>
            <el-table-column
                label="審核經理"
                width="100"
                align="center"
            >
              <template #default="{ row }">
                {{ row.approvalChain?.[0]?.approverName || '-' }}
              </template>
            </el-table-column>
            <el-table-column
                prop="startDate"
                label="到職日期"
                width="120"
                align="center"
            />
            <el-table-column
                prop="submitter.name"
                label="提交主管"
                width="100"
                align="center"
            />
            <el-table-column
                label="操作"
                width="90"
                fixed="right"
                align="center"
            >
              <template #default="{ row }">
                <div class="button-group">
                  <el-tooltip content="檢視詳情" placement="top">
                    <el-button
                        type="primary"
                        :icon="View"
                        circle
                        size="small"
                        @click="handleViewDetails(row)"
                    />
                  </el-tooltip>
                  <el-tooltip content="建立帳號" placement="top">
                    <el-button
                        type="success"
                        :icon="Key"
                        circle
                        size="small"
                        @click="handleCreateAccount(row)"
                    />
                  </el-tooltip>
                </div>
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
        </el-tab-pane>

        <el-tab-pane label="歷史紀錄" name="history">
          <AccountHistory />
        </el-tab-pane>

      </el-tabs>
    </div>

    <!-- 詳情對話框 -->
    <el-dialog
        v-model="detailDialogVisible"
        title="新進人員詳情"
        width="50%"
    >
      <template v-if="currentEmployee">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">{{ currentEmployee.name }}</el-descriptions-item>
          <el-descriptions-item label="部門">{{ convertDepartment(currentEmployee.department) }}</el-descriptions-item>
          <el-descriptions-item label="職位">{{ convertPosition(currentEmployee.position) }}</el-descriptions-item>
          <el-descriptions-item label="Email">{{ currentEmployee.email }}</el-descriptions-item>
          <el-descriptions-item label="到職日期">{{ formatDate(currentEmployee.startDate) }}</el-descriptions-item>
          <el-descriptions-item label="提交主管">{{ currentEmployee.submitter?.name }}</el-descriptions-item>
          <el-descriptions-item label="提交時間">{{ formatDate(currentEmployee.submittedAt) }}</el-descriptions-item>
          <el-descriptions-item label="審核狀態">
            <el-tag
                :type="currentEmployee.status === 'approved' ? 'success' :
                           currentEmployee.status === 'rejected' ? 'danger' : 'warning'"
            >
              {{ currentEmployee.status === 'approved' ? '已核准' :
                currentEmployee.status === 'rejected' ? '已駁回' : '待審核' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="currentEmployee.approvalChain?.length" class="approval-info">
          <h4>審核資訊</h4>
          <el-timeline>
            <el-timeline-item
                v-for="(approval, index) in currentEmployee.approvalChain"
                :key="index"
                :type="approval.status === 'approved' ? 'success' : 'danger'"
            >
              <div class="approval-content">
                <h4>{{ approval.approverName }}
                  <el-tag
                      size="small"
                      :type="approval.status === 'approved' ? 'success' : 'danger'"
                      class="ml-2"
                  >
                    {{ approval.status === 'approved' ? '核准' : '駁回' }}
                  </el-tag>
                </h4>
                <p class="approval-comment">
                  <span class="comment-label">審核意見：</span>
                  {{ approval.comment || '無' }}
                </p>
                <p class="approval-time">
                  <span class="time-label">審核時間：</span>
                  {{ formatDate(approval.timestamp) }}
                </p>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </template>
    </el-dialog>
    <!-- 批量建立帳號對話框 -->
    <el-dialog
        v-model="batchDialogVisible"
        title="批量建立帳號"
        width="40%"
    >
      <div class="batch-dialog-content">
        <p>確認要為以下 {{ selectedRows.length }} 位新進人員建立帳號？</p>
        <el-table :data="selectedRows" style="width: 100%" border>
          <el-table-column prop="name" label="姓名" />
          <el-table-column label="部門">
            <template #default="{ row }">
              {{ convertDepartment(row.department) }}
            </template>
          </el-table-column>
          <el-table-column prop="email" label="Email" />
        </el-table>
      </div>
      <template #footer>
        <span class="dialog-footer">
            <el-button @click="batchDialogVisible = false">取消</el-button>
            <el-button
                type="primary"
                @click="confirmBatchAccountCreation"
                :loading="isProcessing"
            >
                {{ isProcessing ? '處理中...' : '確認建立' }}
            </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 處理進度對話框 -->
    <el-dialog
        v-model="progressDialogVisible"
        title="建立進度"
        width="40%"
        :close-on-click-modal="false"
        :show-close="false"
    >
      <div class="progress-dialog-content">
        <el-progress
            :percentage="processingProgress"
            :status="processingStatus"
            :format="progressFormat"
        />
        <div class="current-processing" v-if="currentProcessing">
          <p>正在處理: {{ currentProcessing.name }}</p>
          <p class="processing-step">{{ currentStep }}</p>
        </div>
        <div class="progress-status">
          <p>已完成: {{ processedCount }}/{{ totalCount }}</p>
          <p>成功: {{ processResults.success.length }}</p>
          <p>失敗: {{ processResults.failed.length }}</p>
        </div>
      </div>
    </el-dialog>

    <!-- 結果顯示對話框 -->
    <el-dialog
        v-model="showResultDialog"
        title="建立結果"
        width="50%"
    >
      <div class="result-dialog-content">
        <div class="result-summary">
          <el-alert
              :title="`成功建立 ${processResults.success.length} 個帳號`"
              type="success"
              :closable="false"
              show-icon
          />
          <el-alert
              v-if="processResults.failed.length > 0"
              :title="`失敗 ${processResults.failed.length} 個帳號`"
              type="error"
              :closable="false"
              show-icon
              style="margin-top: 10px"
          />
        </div>

        <!-- 失敗項目列表 -->
        <template v-if="processResults.failed.length > 0">
          <h4 class="failed-title">失敗項目</h4>
          <el-table :data="processResults.failed" border style="width: 100%">
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column prop="error" label="失敗原因" />
            <el-table-column label="操作" width="100" align="center">
              <template #default="{ row }">
                <el-button
                    type="primary"
                    size="small"
                    @click="retryFailedItems([row])"
                    :loading="isProcessing"
                >
                  重試
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="retry-all" v-if="processResults.failed.length > 1">
            <el-button
                type="primary"
                @click="retryFailedItems(processResults.failed)"
                :loading="isProcessing"
            >
              重試所有失敗項目
            </el-button>
          </div>
        </template>
      </div>
      <template #footer>
        <span class="dialog-footer">
            <el-button @click="showResultDialog = false">關閉</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Refresh, Key, View, UserFilled,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import axios from 'axios'
import AccountHistory from '@/components/staff/AccountHistory.vue'

// 日期格式化工具函數
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
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

// 部門代碼轉換
const convertDepartment = (code) => {
  const departmentMap = {
    'BD': '業務部',
    'FD': '消金部',
    'LD': '借貸部'
  }
  return departmentMap[code] || code
}

// 職位代碼轉換
const convertPosition = (code) => {
  const positionMap = {
    'M': '經理',
    'S': '主管',
    'C': '科員'
  }
  return positionMap[code] || code
}

// 基礎狀態
const activeTab = ref('newStaff')
const newStaffData = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const departmentFilter = ref('')
const startDateRange = ref([])
const detailDialogVisible = ref(false)
const currentEmployee = ref(null)
const batchDialogVisible = ref(false)
const selectedRows = ref([])
const isProcessing = ref(false)
const processResults = ref({
  success: [],
  failed: []
})
const showResultDialog = ref(false)

// 進度相關狀態
const progressDialogVisible = ref(false)
const processingProgress = ref(0)
const processingStatus = ref('')
const currentProcessing = ref(null)
const currentStep = ref('')
const processedCount = ref(0)
const totalCount = ref(0)

// 進度格式化函數
const progressFormat = (percentage) => {
  if (processingStatus.value === 'success') {
    return '完成'
  }
  if (processingStatus.value === 'exception') {
    return '發生錯誤'
  }
  return `${percentage}%`
}

// 計算屬性
const filteredNewStaff = computed(() => {
  let result = [...newStaffData.value]

  if (departmentFilter.value) {
    result = result.filter(staff => staff.department === departmentFilter.value)
  }

  if (startDateRange.value?.length === 2) {
    const [start, end] = startDateRange.value
    result = result.filter(staff => {
      const date = new Date(staff.startDate)
      return date >= new Date(start) && date <= new Date(end)
    })
  }

  return result
})

const pendingAccountsCount = computed(() => {
  return newStaffData.value.length
})

const hasApprovedNewStaff = computed(() => {
  return selectedRows.value.length > 0
})

// 方法
const fetchNewStaffData = async () => {
  try {
    const loading = ElLoading.service({
      lock: true,
      text: '載入中...',
      background: 'rgba(0, 0, 0, 0.7)'
    })

    const response = await axios.get('/api/new-employees/approved-list', {
      params: {
        page: currentPage.value,
        limit: pageSize.value,
        department: departmentFilter.value || undefined,
        startDate: startDateRange.value?.[0] || undefined,
        endDate: startDateRange.value?.[1] || undefined,
        hasAccount: false  // 添加此參數，只獲取尚未建立帳號的員工
      },
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    // 格式化日期
    const formattedEmployees = response.data.employees.map(emp => ({
      ...emp,
      startDate: formatDate(emp.startDate),
      createdAt: formatDate(emp.createdAt),
      approvalChain: emp.approvalChain?.map(approval => ({
        ...approval,
        timestamp: formatDate(approval.timestamp)
      }))
    }))

    newStaffData.value = formattedEmployees
    total.value = response.data.pagination.total
    selectedRows.value = [] // 重新載入數據時清空選取

    loading.close()
  } catch (error) {
    console.error('獲取新進人員資料失敗:', error)
    ElMessage.error(error.response?.data?.msg || '獲取資料失敗')
  }
}

const refreshNewStaffData = () => {
  fetchNewStaffData()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  fetchNewStaffData()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchNewStaffData()
}

const handleViewDetails = (row) => {
  currentEmployee.value = row
  detailDialogVisible.value = true
}

const handleCreateAccount = async (row) => {
  try {
    await ElMessageBox.confirm(
        `確定要為 ${row.name} 建立帳號？`,
        '確認操作',
        {
          confirmButtonText: '確定',
          cancelButtonText: '取消',
          type: 'warning'
        }
    )

    const loading = ElLoading.service({
      lock: true,
      text: '處理中...',
      background: 'rgba(0, 0, 0, 0.7)'
    })

    try {
      const response = await axios.post(
          '/api/accounts/create',
          {
            name: row.name,
            department: row.department,
            position: row.position,
            email: row.email,
            startDate: row.startDate
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
      )

      if (response.data.success) {
        ElMessage.success(`帳號建立成功：${response.data.data.account}`)
        await fetchNewStaffData()
      } else {
        throw new Error(response.data.message || '建立帳號失敗')
      }
    } catch (apiError) {
      console.error('建立帳號失敗:', apiError)
      ElMessage.error(apiError.response?.data?.message || '建立帳號時發生錯誤')
    } finally {
      loading.close()
    }
  } catch (userError) {
    if (userError !== 'cancel') {
      console.error('建立帳號操作被取消或失敗:', userError)
      ElMessage.error('操作取消或失敗')
    }
  }
}

const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

const handleBatchAccountCreation = () => {
  if (!hasApprovedNewStaff.value) {
    ElMessage.warning('請先選擇要建立帳號的人員')
    return
  }
  processResults.value = { success: [], failed: [] }
  batchDialogVisible.value = true
}

const confirmBatchAccountCreation = async () => {
  const token = localStorage.getItem('token')
  if (!token) {
    ElMessage.error('請先登入')
    return
  }

  if (selectedRows.value.length === 0) {
    ElMessage.warning('請選擇要建立帳號的員工')
    return
  }

  try {
    isProcessing.value = true
    batchDialogVisible.value = false
    progressDialogVisible.value = true
    processedCount.value = 0
    totalCount.value = selectedRows.value.length
    processingProgress.value = 0
    processingStatus.value = ''
    currentProcessing.value = null
    currentStep.value = '準備建立帳號'

    const response = await axios.post(
        '/api/accounts/batch-create',
        {
          employeeIds: selectedRows.value.map(employee => employee._id)
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
            )
            processingProgress.value = Math.min(progress, 95)
          }
        }
    )

    // 更新處理結果
    processResults.value = {
      success: response.data.results.success || [],
      failed: response.data.results.failed || []
    }

    // 更新最終進度
    processingProgress.value = 100
    processingStatus.value = processResults.value.failed.length === 0 ? 'success' : 'warning'
    processedCount.value = totalCount.value
    currentStep.value = '處理完成'

    // 如果有成功建立的帳號，重新載入數據
    if (processResults.value.success.length > 0) {
      await fetchNewStaffData()
      selectedRows.value = []
    }

    // 延遲顯示結果對話框
    setTimeout(() => {
      progressDialogVisible.value = false
      showResultDialog.value = true
    }, 1000)

  } catch (error) {
    console.error('批量建立帳號失敗:', error)
    processingStatus.value = 'exception'
    currentStep.value = '發生錯誤'
    ElMessage.error(error.response?.data?.msg || '批量建立帳號失敗')
  } finally {
    isProcessing.value = false
  }
}

const retryFailedItems = async (items) => {
  if (!items || items.length === 0) {
    ElMessage.warning('沒有需要重試的項目')
    return
  }

  try {
    isProcessing.value = true
    progressDialogVisible.value = true
    processedCount.value = 0
    totalCount.value = items.length
    processingProgress.value = 0
    processingStatus.value = ''
    currentProcessing.value = null
    currentStep.value = '準備重試失敗項目'

    const response = await axios.post(
        '/api/accounts/batch-create',
        {
          employeeIds: items.map(item => item.id)
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
    )

    // 更新進度
    processingProgress.value = 100
    processingStatus.value = 'success'
    processedCount.value = items.length
    currentStep.value = '重試完成'

    // 更新處理結果
    const newSuccess = response.data.results.success || []
    const newFailed = response.data.results.failed || []

    // 更新結果列表
    const successIds = new Set(newSuccess.map(item => item.id))
    processResults.value.failed = processResults.value.failed.filter(
        item => !successIds.has(item.id)
    )
    processResults.value.success.push(...newSuccess)
    processResults.value.failed = [
      ...processResults.value.failed,
      ...newFailed
    ]

    if (newSuccess.length > 0) {
      await fetchNewStaffData()
      ElMessage.success(`重試成功: ${newSuccess.length} 個帳號已建立`)
    }

    if (newFailed.length > 0) {
      ElMessage.warning(`${newFailed.length} 個帳號仍然失敗`)
    }

    // 延遲關閉進度對話框
    setTimeout(() => {
      progressDialogVisible.value = false
    }, 1000)

  } catch (error) {
    console.error('重試失敗:', error)
    processingStatus.value = 'exception'
    currentStep.value = '重試失敗'
    ElMessage.error(error.response?.data?.msg || '重試失敗，請稍後再試')
  } finally {
    isProcessing.value = false
  }
}

const resetFilters = () => {
  departmentFilter.value = ''
  startDateRange.value = []
  selectedRows.value = []
  ElMessage.success('已重置篩選條件')
}

// 初始化
onMounted(() => {
  fetchNewStaffData()
})
</script>

<style scoped>
/* 通用樣式 */
.button-group {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.email-text {
  padding: 0 8px;
}

.staff-changes {
  min-height: 100vh;
  background-color: #f0f2f5;
  padding: 20px;
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.page-title {
  text-align: center;
  color: #303133;
  margin-bottom: 30px;
  font-size: 24px;
}

.function-tabs {
  margin-top: 20px;
}

/* 統計卡片 */
.statistics-bar {
  margin-bottom: 20px;
}

.stat-card {
  max-width: 300px;
  margin: 0 auto;
}

.stat-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
}

.stat-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  font-size: 16px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
}

/* 操作區 */
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

/* 表格區域 */
:deep(.el-table) {
  --el-table-header-bg-color: #f5f7fa;
  --el-table-header-text-color: #606266;
  --el-table-row-hover-bg-color: #f5f7fa;
}

:deep(.el-table th) {
  font-weight: 600;
  background-color: var(--el-table-header-bg-color);
}

:deep(.el-button.is-circle) {
  padding: 6px;
}

:deep(.el-table .cell) {
  padding-left: 8px;
  padding-right: 8px;
}

:deep(.el-table .operation-group .el-button--small) {
  padding: 6px;
}

/* 分頁 */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 即將推出的功能 */
.coming-soon {
  padding: 40px;
  text-align: center;
}

.coming-soon-text {
  color: #909399;
  font-size: 16px;
  margin-top: 16px;
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

/* 批量處理對話框 */
.batch-dialog-content {
  margin-bottom: 20px;
}

.batch-dialog-content p {
  margin-bottom: 15px;
  color: #606266;
}

.result-dialog-content {
  padding: 20px 0;
}

.result-summary {
  margin-bottom: 20px;
}

.failed-title {
  margin: 20px 0 10px;
  color: #666;
}

.retry-all {
  margin-top: 15px;
  text-align: center;
}

/* 進度對話框樣式 */
.progress-dialog-content {
  padding: 20px;
}

.current-processing {
  margin: 20px 0;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.processing-step {
  color: #606266;
  margin-top: 8px;
  font-size: 14px;
}

.progress-status {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
  text-align: center;
}

.progress-status p {
  margin: 0;
  color: #606266;
}

/* 詳情對話框樣式 */
.approval-info {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.approval-info h4 {
  margin-bottom: 16px;
  color: var(--el-text-color-primary);
  font-size: 16px;
  font-weight: 600;
}

.approval-content {
  h4 {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    font-size: 14px;
  }

  .approval-comment, .approval-time {
    margin: 8px 0;
    color: var(--el-text-color-regular);
    font-size: 14px;

    .comment-label, .time-label {
      color: var(--el-text-color-secondary);
      display: inline-block;
      width: 80px;
    }
  }
}

:deep(.el-timeline-item__node) {
  width: 12px;
  height: 12px;
}

:deep(.el-timeline-item__wrapper) {
  padding-left: 28px;
}

:deep(.el-descriptions) {
  padding: 16px;
  margin-bottom: 0;
}

:deep(.el-descriptions__cell) {
  padding: 12px;
}

:deep(.el-progress-bar__inner) {
  transition: width 0.3s ease;
}

:deep(.el-progress__text) {
  font-weight: bold;
}

/* Element Plus 組件樣式覆蓋 */
:deep(.el-select) {
  width: 180px;
}

:deep(.el-card__body) {
  padding: 15px;
}

:deep(.el-table .el-button--small) {
  padding: 6px;
}

:deep(.el-button-group .el-button) {
  margin-left: 0;
}

:deep(.el-tabs__header) {
  margin-bottom: 25px;
}

:deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

:deep(.el-tabs__item) {
  font-size: 15px;
  height: 45px;
  line-height: 45px;
}

:deep(.el-tabs__item.is-active) {
  font-weight: 600;
}

/* 響應式設計 */
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

@media (max-width: 768px) {
  .content-wrapper {
    padding: 15px;
  }

  .page-title {
    font-size: 20px;
    margin-bottom: 20px;
  }

  .stat-card {
    max-width: 100%;
  }

  .left-operations {
    flex-direction: column;
  }

  .left-operations .el-button {
    width: 100%;
  }

  :deep(.el-dialog) {
    width: 90% !important;
  }

  :deep(.el-descriptions__cell) {
    padding: 8px;
  }
}

@media (max-width: 480px) {
  .content-wrapper {
    padding: 10px;
  }

  .page-title {
    font-size: 18px;
  }

  :deep(.el-tabs__item) {
    font-size: 14px;
  }
}
</style>