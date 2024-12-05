<template>
  <div class="leave-management-container">
    <!-- 頁籤切換 -->
    <el-tabs v-model="activeTab" class="leave-tabs">
      <el-tab-pane label="待審核申請" name="pending">
        <el-card class="approval-list" v-loading="loading">
          <!-- 待審核列表 -->
          <div class="table-container">
            <el-table
                :data="pendingRequests"
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
        <el-card class="department-history">
          <!-- 部門請假紀錄表格 -->
          <div class="table-container">
            <el-table
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
      </el-tab-pane>

      <el-tab-pane label="個人請假管理" name="personal">
        <!-- 引用個人請假管理組件 -->
        <LeaveApplication />
      </el-tab-pane>
    </el-tabs>

    <!-- 駁回原因對話框 -->
    <el-dialog
        v-model="rejectDialog.visible"
        title="請輸入駁回原因"
        width="500px"
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
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import LeaveApplication from './LeaveApplication.vue'

// 頁面狀態
const activeTab = ref('pending')
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const pendingRequests = ref([])

// 部門歷史記錄狀態
const departmentCurrentPage = ref(1)
const departmentPageSize = ref(10)
const departmentTotal = ref(0)
const departmentHistory = ref([])

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

// 初始化數據
const initializeData = async () => {
  await Promise.all([
    fetchPendingRequests(),
    fetchDepartmentHistory()
  ])
}

// 獲取待審核申請
const fetchPendingRequests = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/leave/pending-approvals', {
      params: {
        page: currentPage.value,
        limit: pageSize.value
      }
    })

    pendingRequests.value = response.data.leaves
    total.value = response.data.pagination.total
  } catch (error) {
    console.error('獲取待審核申請失敗:', error)
    ElMessage.error('獲取待審核申請失敗，請稍後再試')
  } finally {
    loading.value = false
  }
}

// 獲取部門請假歷史
const fetchDepartmentHistory = async () => {
  try {
    const response = await axios.get('/api/leave/department-history', {
      params: {
        page: departmentCurrentPage.value,
        limit: departmentPageSize.value
      }
    })

    departmentHistory.value = response.data.leaves
    departmentTotal.value = response.data.pagination.total
  } catch (error) {
    console.error('獲取部門請假歷史失敗:', error)
    ElMessage.error('獲取部門請假歷史失敗，請稍後再試')
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

    await axios.post(`/api/leave/approve/${leave._id}`, {
      status: 'approved',
      comment: '同意請假申請'  // 可以根據需求修改預設的核准評語
    })

    ElMessage.success('已核准請假申請')
    await fetchPendingRequests()
    await fetchDepartmentHistory()
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

    await axios.post(`/api/leave/approve/${leaveId}`, {
      status: 'rejected',
      comment: reason
    })

    ElMessage.success('已駁回請假申請')
    rejectDialog.value.visible = false
    await fetchPendingRequests()
    await fetchDepartmentHistory()
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

const handleDepartmentPageChange = (page) => {
  departmentCurrentPage.value = page
  fetchDepartmentHistory()
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

const getStatusText = (status) => {
  const statusMap = {
    pending: '待審核',
    approved: '已核准',
    rejected: '已駁回',
    cancelled: '已撤回'
  }
  return statusMap[status] || status
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
  initializeData()
})
</script>

<style scoped>
.leave-management-container {
  height: 100%;
  padding: 20px;
  background: #f5f7fa;
}

/* 頁籤容器樣式 */
.leave-tabs {
  height: 100%;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 16px 20px;
}

/* 頁籤header樣式 */
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

/* 頁籤項目樣式 */
:deep(.el-tabs__item) {
  height: 48px;
  line-height: 48px;
  font-size: 15px;
  color: #606266;
  transition: all 0.3s ease;
  padding: 0 24px;
  border-radius: 4px 4px 0 0;
}

/* 頁籤hover效果 */
:deep(.el-tabs__item:hover) {
  color: var(--el-color-primary);
}

/* 當前選中頁籤樣式 */
:deep(.el-tabs__item.is-active) {
  color: var(--el-color-primary);
  font-weight: 600;
  background: rgba(64, 158, 255, 0.1);
}

/* 頁籤內容區域 */
:deep(.el-tabs__content) {
  height: calc(100% - 55px);
  overflow: auto;
  padding: 0 4px;
}

/* 表格卡片樣式 */
.approval-list,
.department-history {
  margin-top: 0;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #ebeef5;
}

/* 表格容器樣式 */
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

/* 分頁容器樣式 */
.pagination-container {
  margin-top: 20px;
  padding: 15px 20px;
  text-align: right;
  border-top: 1px solid #ebeef5;
  background: #fff;
}

/* 按鈕組樣式 */
:deep(.el-button--small) {
  padding: 8px 16px;
  border-radius: 4px;
  transition: all 0.3s ease;
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

  .approval-list,
  .department-history {
    border-color: #363637;
  }

  :deep(.el-table th) {
    background-color: #1d1d1d;
  }

  .pagination-container {
    background: #141414;
    border-color: #363637;
  }
}
</style>