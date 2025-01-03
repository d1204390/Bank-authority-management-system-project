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
                    <div class="stat-label">本月完成案件</div>
                  </div>
                </div>
              </el-card>
            </el-col>
            <el-col :xs="12" :sm="6">
              <el-card class="stat-card">
                <div class="stat-content">
                  <el-icon class="stat-icon"><Warning /></el-icon>
                  <div class="stat-info">
                    <div class="stat-value">{{ stats.urgentLoans }}</div>
                    <div class="stat-label">急件處理</div>
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
          <!-- 左側：共通功能 -->
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
              <h2 class="section-title">部門功能</h2>
              <StaffLoanOperation
                  @refresh-stats="initDashboard"
                  @case-submitted="handleCaseSubmitted"
              />
            </div>
          </el-col>
        </el-row>
      </el-col>
    </el-row>

    <!-- 申請表單對話框 -->
    <el-dialog
        v-model="showLoanForm"
        title="貸款申請"
        width="80%"
        :close-on-click-modal="false"
    >
      <LoanApplicationForm
          ref="loanFormRef"
          @submit="handleLoanSubmit"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Document, Loading, SuccessFilled, Warning, Calendar } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import LeaveManagement from '@/components/leave/LeaveApplication.vue'
import StaffLoanOperation from '@/components/loan/StaffLoanOperation.vue'
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

// 統計數據
const stats = ref({
  pendingLoans: 0,
  processingLoans: 0,
  completedLoans: 0,
  urgentLoans: 0
})

// 初始化儀表板數據
const initDashboard = async () => {
  try {
    // 模擬 API 調用
    stats.value = {
      pendingLoans: 5,
      processingLoans: 8,
      completedLoans: 12,
      urgentLoans: 2
    }
  } catch (error) {
    console.error('初始化儀表板失敗:', error)
    ElMessage.error('獲取數據失敗，請稍後再試')
  }
}

// 處理案件提交
const handleCaseSubmitted = () => {
  initDashboard() // 重新載入統計數據
  ElMessage.success('案件提交成功')
}

// 處理貸款申請提交
const handleLoanSubmit = () => {
  showLoanForm.value = false
  loanFormRef.value?.resetForm()
  initDashboard() // 重新載入統計數據
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
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #303133;
}

.el-collapse {
  border: none;
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

:deep(.el-collapse-item__header) {
  font-size: 16px;
  font-weight: bold;
  border: none;
}

:deep(.el-collapse-item__content) {
  padding: 10px 0;
}

:deep(.el-collapse-item__wrap) {
  border: none;
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