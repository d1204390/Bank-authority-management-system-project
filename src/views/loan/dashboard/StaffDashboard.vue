# views/loan/dashboard/StaffDashboard.vue
<template>
  <div class="dashboard-container">
    <el-row :gutter="20">
      <!-- 統計數據區 -->
      <el-col :span="24">
        <div class="stats-container">
          <el-row :gutter="20">
            <el-col :xs="12" :sm="6">
              <el-card class="stat-card">
                <div class="stat-content">
                  <el-icon class="stat-icon"><Document /></el-icon>
                  <div class="stat-info">
                    <div class="stat-value">{{ stats.pendingLoans }}</div>
                    <div class="stat-label">待處理案件</div>
                  </div>
                </div>
              </el-card>
            </el-col>
            <el-col :xs="12" :sm="6">
              <el-card class="stat-card">
                <div class="stat-content">
                  <el-icon class="stat-icon"><Loading /></el-icon>
                  <div class="stat-info">
                    <div class="stat-value">{{ stats.processingLoans }}</div>
                    <div class="stat-label">處理中案件</div>
                  </div>
                </div>
              </el-card>
            </el-col>
            <el-col :xs="12" :sm="6">
              <el-card class="stat-card">
                <div class="stat-content">
                  <el-icon class="stat-icon"><SuccessFilled /></el-icon>
                  <div class="stat-info">
                    <div class="stat-value">{{ stats.completedLoans }}</div>
                    <div class="stat-label">已完成案件</div>
                  </div>
                </div>
              </el-card>
            </el-col>
            <el-col :xs="12" :sm="6">
              <el-card class="stat-card">
                <div class="stat-content">
                  <el-icon class="stat-icon"><Warning /></el-icon>
                  <div class="stat-info">
                    <div class="stat-value">{{ stats.rejectedLoans }}</div>
                    <div class="stat-label">已拒絕案件</div>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </el-col>

      <!-- 功能區 -->
      <el-col :span="24">
        <el-row :gutter="20">
          <!-- 左側：請假管理 -->
          <el-col :span="12">
            <div class="section-container">
              <h2 class="section-title">共通功能</h2>
              <el-collapse v-model="activeCollapse">
                <el-collapse-item title="請假管理" name="leave">
                  <template #title>
                    <div class="collapse-header">
                      <el-icon><Calendar /></el-icon>
                      <span>請假管理</span>
                    </div>
                  </template>
                  <LeaveManagement
                      :department="userDepartment"
                      :position="userPosition"
                  />
                </el-collapse-item>
              </el-collapse>
            </div>
          </el-col>

          <!-- 右側：貸款功能 -->
          <el-col :span="12">
            <div class="section-container">
              <h2 class="section-title">貸款申請</h2>
              <el-button type="primary" @click="showLoanForm = true">
                新增貸款申請
              </el-button>

              <!-- 貸款列表 -->
              <div class="loan-list mt-4">
                <el-table :data="loanList" stripe style="width: 100%">
                  <el-table-column prop="applicationId" label="申請編號" width="120" />
                  <el-table-column prop="customerInfo.name" label="客戶姓名" width="120" />
                  <el-table-column prop="loanInfo.amount" label="申請金額" width="120">
                    <template #default="scope">
                      {{ formatAmount(scope.row.loanInfo.amount) }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="status" label="狀態" width="100">
                    <template #default="scope">
                      <el-tag :type="getStatusType(scope.row.status)">
                        {{ getStatusLabel(scope.row.status) }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="loanInfo.isUrgent" label="急件" width="80">
                    <template #default="scope">
                      <el-tag
                          :type="scope.row.loanInfo.isUrgent ? 'danger' : 'info'"
                          size="small"
                      >
                        {{ scope.row.loanInfo.isUrgent ? '急件' : '一般' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="createdAt" label="申請日期" width="150">
                    <template #default="scope">
                      {{ formatDate(scope.row.createdAt) }}
                    </template>
                  </el-table-column>
                </el-table>

                <!-- 分頁 -->
                <div class="pagination-container">
                  <el-pagination
                      v-model:current-page="currentPage"
                      v-model:page-size="pageSize"
                      :page-sizes="[10, 20, 50]"
                      :total="total"
                      layout="total, sizes, prev, pager, next"
                      @size-change="handleSizeChange"
                      @current-change="handleCurrentChange"
                  />
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-col>
    </el-row>

    <!-- 申請表單對話框 -->
    <el-dialog
        v-model="showLoanForm"
        title="貸款申請"
        width="600px"
        :close-on-click-modal="false"
        :before-close="handleDialogClose"
        class="loan-dialog"
    >
      <LoanApplicationForm
          ref="loanFormRef"
          @submit="handleLoanSubmit"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, } from 'vue'
import { Document, Loading, SuccessFilled, Warning, Calendar } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { ElMessageBox } from 'element-plus'
import LeaveManagement from '@/components/leave/LeaveApplication.vue'
import LoanApplicationForm from '@/components/loan/LoanApplicationForm.vue'

// 從 sessionStorage 獲取用戶資訊
const getUserInfo = () => {
  try {
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo'))
    return userInfo || {}
  } catch (error) {
    console.error('解析用戶資訊失敗:', error)
    return {}
  }
}

// 控制面板和對話框
const activeCollapse = ref(['leave'])
const showLoanForm = ref(false)
const loanFormRef = ref(null)

// 用戶資訊
const userInfo = getUserInfo()
const userDepartment = computed(() => userInfo.department || 'LD')
const userPosition = computed(() => userInfo.position || 'C')

// 列表和分頁
const loanList = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 統計數據
const stats = ref({
  pendingLoans: 0,
  processingLoans: 0,
  completedLoans: 0,
  rejectedLoans: 0
})

// 格式化金額
const formatAmount = (amount) => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0
  }).format(amount)
}

// 格式化日期
const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 獲取狀態標籤類型
const getStatusType = (status) => {
  const typeMap = {
    pending: 'info',
    processing: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return typeMap[status] || 'info'
}

// 獲取狀態標籤文字
const getStatusLabel = (status) => {
  const labelMap = {
    pending: '待處理',
    processing: '處理中',
    approved: '已核准',
    rejected: '已拒絕'
  }
  return labelMap[status] || status
}

// 初始化儀表板數據
const initDashboard = async () => {
  try {
    const response = await axios.get('/api/loan/list')
    const loans = response.data.applications

    // 更新列表數據
    loanList.value = loans
    total.value = response.data.pagination.total

    // 計算統計數據
    stats.value = {
      pendingLoans: loans.filter(loan => loan.status === 'pending').length,
      processingLoans: loans.filter(loan => loan.status === 'processing').length,
      completedLoans: loans.filter(loan => loan.status === 'approved').length,
      rejectedLoans: loans.filter(loan => loan.status === 'rejected').length
    }
  } catch (error) {
    console.error('初始化儀表板失敗:', error)
    ElMessage.error('獲取數據失敗，請稍後再試')
  }
}

// 處理對話框關閉
const handleDialogClose = (done) => {
  if (loanFormRef.value?.isFormDirty()) {
    ElMessageBox.confirm(
        '關閉表單將清空所有已輸入的資料，是否確認關閉？',
        '確認關閉',
        {
          confirmButtonText: '確認',
          cancelButtonText: '取消',
          type: 'warning',
        }
    )
        .then(() => {
          loanFormRef.value?.resetForm()
          done()
        })
        .catch(() => {
          // 用戶取消關閉，不執行任何操作
        })
  } else {
    done()
  }
}


// 處理貸款申請提交
const handleLoanSubmit = () => {
  showLoanForm.value = false
  initDashboard()
  ElMessage.success('申請已送出')
}

// 分頁處理
const handleSizeChange = (val) => {
  pageSize.value = val
  initDashboard()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  initDashboard()
}

// 組件掛載時初始化
onMounted(() => {
  initDashboard()
})
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}

.stats-container {
  margin-bottom: 20px;
}

.stat-card {
  height: 100px;
  margin-bottom: 20px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  font-size: 24px;
  margin-right: 15px;
  color: #409EFF;
}

.stat-info {
  flex-grow: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.section-container {
  background: white;
  padding: 20px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #303133;
}

.mt-4 {
  margin-top: 16px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.collapse-header {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
}

.collapse-header .el-icon {
  margin-right: 8px;
  font-size: 20px;
  color: #409EFF;
}

:deep(.loan-dialog) {
  /* 讓對話框出現在上方 */
  margin-top: 5px; /* 可以調整這個值來控制具體高度 */
}

/* 如果需要在小螢幕上調整位置 */
@media screen and (max-width: 768px) {
  :deep(.loan-dialog) {
    margin-top: -100px; /* 手機版可以設置不同的上邊距 */
  }
}

/* 響應式調整 */
@media (max-width: 768px) {
  .el-col {
    margin-bottom: 20px;
  }

  .stat-card {
    height: 80px;
  }

  .stat-value {
    font-size: 20px;
  }
}
</style>