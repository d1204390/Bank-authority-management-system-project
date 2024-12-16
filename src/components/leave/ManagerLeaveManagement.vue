<template>
  <div class="leave-management-container">
    <!-- 頁籤切換 -->
    <el-tabs v-model="activeTab" class="leave-tabs">
      <el-tab-pane label="日曆視圖" name="calendar">
        <LeaveCalendar
            @switchToApproval="handleSwitchToApproval"
            ref="leaveCalendar"
        />
      </el-tab-pane>

      <el-tab-pane name="pending">
        <template #label>
          <span class="tab-label">
            待審核申請
            <el-badge
                v-if="pendingCount"
                :value="pendingCount"
                class="pending-badge"
                :max="99"
            />
          </span>
        </template>

        <el-card class="approval-list" v-loading="loading">
          <!-- 過濾器 -->
          <div class="filter-section">
            <el-select v-model="filterPosition" placeholder="職位" clearable>
              <el-option label="科員" value="C" />
              <el-option label="主管" value="S" />
            </el-select>
          </div>

          <!-- 待審核列表 -->
          <div class="table-container">
            <el-table
                :data="pendingRequests"
                style="width: 100%"
                :default-sort="{ prop: 'createdAt', order: 'descending' }"
                highlight-current-row
                :row-class-name="getRowClassName"
            >
              <el-table-column
                  prop="employeeName"
                  label="申請人"
                  width="120"
                  fixed="left"
              />
              <el-table-column
                  prop="position"
                  label="職位"
                  width="100"
                  fixed="left"
              >
                <template #default="scope">
                  {{ getPositionText(scope.row.position) }}
                </template>
              </el-table-column>
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
                  prop="reason"
                  label="請假原因"
                  min-width="200"
                  show-overflow-tooltip
              />
              <el-table-column
                  label="操作"
                  width="200"
                  fixed="right"
              >
                <template #default="scope">
                  <el-button
                      type="success"
                      size="small"
                      @click="handleApprove(scope.row)"
                  >
                    核准
                  </el-button>
                  <el-button
                      type="danger"
                      size="small"
                      @click="handleReject(scope.row)"
                  >
                    駁回
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 分頁控制 -->
          <div class="pagination-container" v-if="pendingRequests.length">
            <el-pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :total="total"
                @current-change="handlePageChange"
                layout="total, prev, pager, next"
            />
          </div>

          <!-- 無資料顯示 -->
          <el-empty
              v-if="!loading && !pendingRequests.length"
              description="目前無待審核的請假申請"
          />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="部門請假紀錄" name="department">
        <DepartmentHistory />
      </el-tab-pane>

      <el-tab-pane label="個人請假申請" name="personal">
        <LeaveApplication />
      </el-tab-pane>
    </el-tabs>

    <!-- 駁回原因對話框 -->
    <el-dialog
        v-model="rejectDialog.visible"
        title="請輸入駁回原因"
        width="500px"
        destroy-on-close
    >
      <el-form
          ref="rejectFormRef"
          :model="rejectDialog.form"
          :rules="rejectDialog.rules"
          label-width="0"
      >
        <el-form-item prop="reason">
          <el-input
              v-model="rejectDialog.form.reason"
              type="textarea"
              rows="3"
              placeholder="請輸入駁回原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="rejectDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="submitReject">
            確認駁回
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import LeaveApplication from './LeaveApplication.vue'
import LeaveCalendar from '@/components/leave/FullCalendarLeave.vue'
import DepartmentHistory from './DepartmentLeaveHistory.vue'

// 頁面狀態
const activeTab = ref('calendar')
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const pendingRequests = ref([])
const pendingCount = ref(0)
const leaveCalendar = ref(null)
const filterPosition = ref('')

// 監聽 activeTab 變化
watch(activeTab, async (newTab, oldTab) => {
  if (newTab === 'calendar' && oldTab !== 'calendar' && leaveCalendar.value) {
    await leaveCalendar.value.refreshCalendar()
  }
})

// 監聽職位過濾器變化
watch(filterPosition, () => {
  currentPage.value = 1  // 重置頁碼
  fetchPendingRequests()
})

// 駁回對話框
const rejectDialog = ref({
  visible: false,
  form: {
    reason: '',
    leaveId: null
  },
  rules: {
    reason: [
      { required: true, message: '請輸入駁回原因', trigger: 'blur' },
      { min: 2, message: '原因至少需要2個字', trigger: 'blur' }
    ]
  }
})
const rejectFormRef = ref(null)
const highlightLeaveId = ref(null)

// 處理從日曆跳轉到審核頁面
const handleSwitchToApproval = async (leaveId) => {
  activeTab.value = 'pending'
  await fetchPendingRequests()
  highlightLeaveId.value = leaveId

  setTimeout(() => {
    highlightLeaveId.value = null
  }, 3000)
}

// 獲取行的類名
const getRowClassName = ({ row }) => {
  if (highlightLeaveId.value && row._id === highlightLeaveId.value) {
    return 'highlight-row'
  }
  return ''
}

// 初始化數據
const initializeData = async () => {
  await fetchPendingRequests()
}

// 獲取待審核申請
const fetchPendingRequests = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/leave/manager/leave/pending-approvals', {
      params: {
        page: currentPage.value,
        limit: pageSize.value,
        position: filterPosition.value
      }
    })

    pendingRequests.value = response.data.leaves
    total.value = response.data.pagination.total
    pendingCount.value = response.data.pagination.total
  } catch (error) {
    console.error('獲取待審核申請失敗:', error)
    ElMessage.error('獲取待審核申請失敗，請稍後再試')
  } finally {
    loading.value = false
  }
}

// 處理核准申請
const handleApprove = async (leave) => {
  try {
    await ElMessageBox.confirm(
        '確定要核准此請假申請嗎？',
        '核准確認',
        {
          confirmButtonText: '確定核准',
          cancelButtonText: '取消',
          type: 'success'
        }
    )

    await axios.post(`/api/leave/manager/leave/approve/${leave._id}`, {
      status: 'approved',
      comment: '同意請假申請'
    })

    ElMessage.success('已核准請假申請')
    await fetchPendingRequests()

    if (leaveCalendar.value) {
      await leaveCalendar.value.refreshCalendar()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('核准請假申請失敗:', error)
      ElMessage.error('核准失敗，請稍後再試')
    }
  }
}

// 處理駁回申請
const handleReject = (leave) => {
  rejectDialog.value.form.leaveId = leave._id
  rejectDialog.value.form.reason = ''
  rejectDialog.value.visible = true
}

// 提交駁回
const submitReject = async () => {
  if (!rejectFormRef.value) return

  try {
    await rejectFormRef.value.validate()
    const { leaveId, reason } = rejectDialog.value.form

    await axios.post(`/api/leave/manager/leave/approve/${leaveId}`, {
      status: 'rejected',
      comment: reason
    })

    ElMessage.success('已駁回請假申請')
    rejectDialog.value.visible = false
    await fetchPendingRequests()

    if (leaveCalendar.value) {
      await leaveCalendar.value.refreshCalendar()
    }
  } catch (error) {
    console.error('駁回請假申請失敗:', error)
    ElMessage.error('駁回失敗，請稍後再試')
  }
}

// 處理分頁變更
const handlePageChange = (page) => {
  currentPage.value = page
  fetchPendingRequests()
}

// 工具函數
const getLeaveTypeText = (type) => {
  const types = {
    annual: '特休',
    personal: '事假',
    sick: '病假',
    funeral: '喪假',
    marriage: '婚假',
    maternity: '產假'
  }
  return types[type] || type
}

const getPositionText = (position) => {
  const positions = {
    C: '科員',
    S: '主管',
    M: '經理'
  }
  return positions[position] || position
}

// 組件掛載時初始化
onMounted(() => {
  initializeData()
})
</script>

<style scoped>
.leave-management-container {
  height: 100%;
  padding: 20px;
  background: #f5f7fa;
}

/* Filter 相關樣式 */
.filter-section {
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
}

/* Tab 相關樣式 */
.leave-tabs {
  height: 100%;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 16px 20px;
}

:deep(.el-tabs__header) {
  margin: 0 0 20px 0;
  border-bottom: none;
  position: relative;
}

:deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: #e4e7ed;
  opacity: 0.6;
}

:deep(.el-tabs__item) {
  height: 48px;
  line-height: 48px;
  font-size: 15px;
  color: #606266;
  transition: all 0.3s ease;
  padding: 0 24px;
  border-radius: 4px 4px 0 0;
}

:deep(.el-tabs__item:hover) {
  color: var(--el-color-primary);
}

:deep(.el-tabs__item.is-active) {
  color: var(--el-color-primary);
  font-weight: 600;
  background: rgba(64, 158, 255, 0.1);
}

:deep(.el-tabs__content) {
  height: calc(100% - 55px);
  overflow: auto;
  padding: 0 4px;
}

/* 待審核標籤樣式 */
.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.pending-badge {
  transform: translateY(-2px);
}

:deep(.el-badge__content) {
  box-shadow: 0 0 0 1px #fff;
}

/* 表格相關樣式 */
.approval-list {
  margin-top: 0;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #ebeef5;
}

.table-container {
  width: 100%;
  overflow-x: auto;
  padding: 4px;
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

/* 分頁樣式 */
.pagination-container {
  margin-top: 20px;
  padding: 15px 20px;
  text-align: right;
  border-top: 1px solid #ebeef5;
  background: #fff;
}

:deep(.el-button--small) {
  padding: 8px 16px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

/* 高亮效果 */
:deep(.highlight-row) {
  animation: highlight-animation 3s ease-out;
}

@keyframes highlight-animation {
  0%, 20% {
    background-color: var(--el-color-primary-light-8);
  }
  100% {
    background-color: transparent;
  }
}

/* 暗色主題適配 */
:deep([class*='--dark']) {
  .leave-management-container {
    background: #1a1a1a;
  }

  .leave-tabs {
    background: #141414;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.3);
  }

  .text-gray {
    color: #a3a6ad;
  }

  .approval-list {
    border-color: #363637;
  }

  :deep(.el-table th) {
    background-color: #1d1d1d;
  }

  .pagination-container {
    background: #141414;
    border-color: #363637;
  }

  .el-badge__content {
    box-shadow: 0 0 0 1px #141414;
  }
}

/* 對話框樣式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
}

:deep(.el-dialog) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-dialog__header) {
  margin: 0;
  padding: 20px 24px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.el-dialog__title) {
  font-size: 16px;
  font-weight: 600;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

:deep(.el-dialog__footer) {
  padding: 12px 24px 24px;
  border-top: none;
}

/* 表單樣式 */
:deep(.el-form-item__content) {
  flex-wrap: nowrap;
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  box-shadow: 0 0 0 1px #dcdfe6;
}

:deep(.el-input__wrapper:hover),
:deep(.el-textarea__inner:hover) {
  box-shadow: 0 0 0 1px var(--el-border-color-hover);
}

:deep(.el-input__wrapper.is-focus),
:deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px var(--el-color-primary);
}

/* Loading 樣式 */
:deep(.el-loading-mask) {
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(2px);
}

/* Empty 狀態樣式 */
:deep(.el-empty) {
  padding: 40px 0;
}

:deep(.el-empty__description) {
  margin-top: 16px;
  color: var(--el-text-color-secondary);
}

/* 響應式設計 */
@media screen and (max-width: 768px) {
  .leave-management-container {
    padding: 12px;
  }

  .leave-tabs {
    padding: 12px;
  }

  :deep(.el-tabs__item) {
    padding: 0 16px;
    font-size: 14px;
  }

  .table-container {
    padding: 0;
  }

  :deep(.el-table) {
    font-size: 13px;
  }

  :deep(.el-button--small) {
    padding: 6px 12px;
    font-size: 12px;
  }

  .pagination-container {
    padding: 12px;
  }

  :deep(.el-dialog) {
    width: 90% !important;
    margin: 0 auto;
  }
}

/* 動畫效果 */
.el-tab-pane {
  animation: fade-in 0.3s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 暗色主題額外適配 */
:deep([class*='--dark']) {
  .el-loading-mask {
    background-color: rgba(0, 0, 0, 0.8);
  }

  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner) {
    box-shadow: 0 0 0 1px #4c4d4f;
  }

  :deep(.el-dialog) {
    background: #1a1a1a;
  }

  :deep(.el-dialog__header) {
    border-bottom-color: #363637;
  }

  :deep(.el-empty__description) {
    color: #909399;
  }
}
</style>