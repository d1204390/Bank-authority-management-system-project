# views/consumer-finance/dashboard/StaffDashboard.vue
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
                    <div class="stat-value">{{ stats.pendingApplications }}</div>
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
                    <div class="stat-value">{{ stats.processingApplications }}</div>
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
                    <div class="stat-value">{{ stats.completedApplications }}</div>
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
                    <div class="stat-value">{{ stats.urgentApplications }}</div>
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
                <!-- 之後可以在這裡添加其他功能的 collapse-item -->
              </el-collapse>
            </div>
          </el-col>

          <!-- 右側：部門功能 -->
          <el-col :span="12">
            <div class="section-container">
              <h2 class="section-title">部門功能</h2>
              <el-card class="function-card">
                <div class="function-header">
                  <el-icon><CreditCard /></el-icon>
                  <span>消費金融審核</span>
                </div>
                <div class="function-content">
                  <el-row :gutter="10">
                    <el-col :span="12">
                      <el-button type="primary" @click="handleApplicationProcess">
                        處理申請
                      </el-button>
                    </el-col>
                    <el-col :span="12">
                      <el-button @click="viewApplicationHistory">
                        歷史紀錄
                      </el-button>
                    </el-col>
                  </el-row>
                  <div class="application-tasks" v-if="applicationTasks.length">
                    <h4>待處理項目</h4>
                    <el-scrollbar height="150px">
                      <ul class="task-list">
                        <li v-for="task in applicationTasks" :key="task.id">
                          <span>{{ task.name }}</span>
                          <el-tag :type="task.priority === 'high' ? 'danger' : 'info'" size="small">
                            {{ task.priority === 'high' ? '急件' : '一般' }}
                          </el-tag>
                        </li>
                      </ul>
                    </el-scrollbar>
                  </div>
                </div>
              </el-card>
            </div>
          </el-col>
        </el-row>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Document, Loading, SuccessFilled, Warning, CreditCard, Calendar } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import LeaveManagement from '@/components/leave/LeaveApplication.vue'

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

// 控制當前展開的面板
const activeCollapse = ref(['leave']) // 預設展開請假管理
// 用戶資訊
const userInfo = getUserInfo()
const userDepartment = computed(() => userInfo.department || 'CF')
const userPosition = computed(() => userInfo.position || 'C')

// 統計數據
const stats = ref({
  pendingApplications: 0,
  processingApplications: 0,
  completedApplications: 0,
  urgentApplications: 0
})

// 申請任務
const applicationTasks = ref([])

// 初始化數據
const initDashboard = async () => {
  try {
    // 模擬 API 調用
    stats.value = {
      pendingApplications: 7,
      processingApplications: 10,
      completedApplications: 15,
      urgentApplications: 3
    }

    applicationTasks.value = [
      { id: 1, name: '王小明的信用卡申請', priority: 'high' },
      { id: 2, name: '李小華的消費性貸款', priority: 'normal' },
      { id: 3, name: '張大明的分期付款審核', priority: 'high' }
    ]
  } catch (error) {
    console.error('初始化儀表板失敗:', error)
    ElMessage.error('獲取數據失敗，請稍後再試')
  }
}

// 處理申請
const handleApplicationProcess = () => {
  // 導航到申請處理頁面
}

// 查看申請紀錄
const viewApplicationHistory = () => {
  // 導航到申請紀錄頁面
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

.function-card {
  margin-bottom: 20px;
}

.function-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  font-size: 16px;
  font-weight: bold;
}

.function-header .el-icon {
  margin-right: 8px;
  font-size: 20px;
  color: #409EFF;
}

.function-content {
  padding: 10px 0;
}

.application-tasks {
  margin-top: 15px;
}

.task-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.task-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #EBEEF5;
}

.task-list li:last-child {
  border-bottom: none;
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
</style>