<!-- components/loan/SupervisorReview.vue -->
<template>
  <div class="review-container">
    <!-- 統計卡片區域 -->
    <el-row :gutter="20" class="mb-4">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">15</div>
              <div class="stat-label">待審核案件</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon warning">
              <el-icon><Timer /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">3</div>
              <div class="stat-label">急件數量</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon success">
              <el-icon><CircleCheckFilled /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">8</div>
              <div class="stat-label">今日已審核</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon info">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">2.5h</div>
              <div class="stat-label">平均處理時間</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 審核申請列表 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>待審核申請</span>
        </div>
      </template>

      <!-- 搜尋和篩選區 -->
      <div class="filter-section">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-input
                v-model="searchQuery"
                placeholder="搜尋案件編號/客戶名稱"
                clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>
          <el-col :span="4">
            <el-select v-model="filterStatus" placeholder="申請狀態" clearable>
              <el-option label="待審核" value="pending" />
              <el-option label="已核准" value="approved" />
              <el-option label="已拒絕" value="rejected" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-select v-model="filterPriority" placeholder="優先等級" clearable>
              <el-option label="一般" value="normal" />
              <el-option label="急件" value="urgent" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-date-picker
                v-model="dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="開始日期"
                end-placeholder="結束日期"
            />
          </el-col>
        </el-row>
      </div>

      <!-- 審核申請列表 -->
      <el-table :data="reviewApplications" style="width: 100%">
        <el-table-column prop="applicationId" label="案件編號" width="120" />
        <el-table-column prop="customerName" label="客戶名稱" width="120" />
        <el-table-column prop="loanAmount" label="申請金額" width="120">
          <template #default="scope">
            {{ formatCurrency(scope.row.loanAmount) }}
          </template>
        </el-table-column>
        <el-table-column prop="submissionDate" label="申請日期" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.submissionDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="assignee" label="承辦人" width="100" />
        <el-table-column prop="urgency" label="優先等級" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.urgency === 'urgent' ? 'danger' : ''">
              {{ scope.row.urgency === 'urgent' ? '急件' : '一般' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="狀態" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作">
          <template #default="scope">
            <el-button-group>
              <el-button
                  type="primary"
                  :icon="View"
                  @click="viewLoanDetail(scope.row)"
              >
                查看
              </el-button>
              <el-button
                  type="success"
                  :icon="Check"
                  v-if="scope.row.status === 'pending'"
                  @click="approveApplication(scope.row)"
              >
                核准
              </el-button>
              <el-button
                  type="danger"
                  :icon="Close"
                  v-if="scope.row.status === 'pending'"
                  @click="rejectApplication(scope.row)"
              >
                拒絕
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分頁 -->
      <div class="pagination-container">
        <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="100"
            layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </el-card>

    <!-- 審核對話框 -->
    <el-dialog
        v-model="reviewDialogVisible"
        :title="reviewDialogTitle"
        width="50%"
    >
      <el-form :model="reviewForm" label-width="120px">
        <el-form-item label="審核意見">
          <el-input
              v-model="reviewForm.comment"
              type="textarea"
              :rows="4"
              placeholder="請輸入審核意見"
          />
        </el-form-item>
        <el-form-item v-if="reviewType === 'approve'" label="核准額度">
          <el-input-number
              v-model="reviewForm.approvedAmount"
              :min="0"
              :max="selectedApplication?.loanAmount"
              :step="1000"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="reviewDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitReview">確認</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  Document,
  Timer,
  CircleCheckFilled,
  TrendCharts,
  Search,
  View,
  Check,
  Close
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 搜尋和篩選
const searchQuery = ref('')
const filterStatus = ref('')
const filterPriority = ref('')
const dateRange = ref([])

// 分頁
const currentPage = ref(1)
const pageSize = ref(10)

// 審核對話框
const reviewDialogVisible = ref(false)
const reviewType = ref('approve')
const selectedApplication = ref(null)
const reviewForm = ref({
  comment: '',
  approvedAmount: 0
})

// 模擬數據 - 待審核申請
const reviewApplications = [
  {
    applicationId: 'L2024003',
    customerName: '林大偉',
    loanAmount: 1200000,
    submissionDate: '2024-01-01',
    status: 'pending',
    urgency: 'urgent',
    assignee: '李專員'
  },
  {
    applicationId: 'L2024004',
    customerName: '周小華',
    loanAmount: 650000,
    submissionDate: '2024-01-02',
    status: 'pending',
    urgency: 'normal',
    assignee: '陳專員'
  },
  {
    applicationId: 'L2024005',
    customerName: '張志明',
    loanAmount: 800000,
    submissionDate: '2024-01-03',
    status: 'approved',
    urgency: 'normal',
    assignee: '王專員'
  }
]

// 計算審核對話框標題
const reviewDialogTitle = computed(() => {
  return reviewType.value === 'approve' ? '核准貸款' : '拒絕貸款'
})

// 格式化金額
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0
  }).format(amount)
}

// 格式化日期
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-TW')
}

// 獲取狀態標籤和類型
const getStatusLabel = (status) => {
  const statusMap = {
    pending: '待審核',
    approved: '已核准',
    rejected: '已拒絕'
  }
  return statusMap[status] || status
}

const getStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return typeMap[status] || 'info'
}

// 查看案件詳情
const viewLoanDetail = (application) => {
  ElMessage.info(`查看案件 ${application.applicationId} 的詳細資訊`)
}

// 核准案件
const approveApplication = (application) => {
  reviewType.value = 'approve'
  selectedApplication.value = application
  reviewForm.value = {
    comment: '',
    approvedAmount: application.loanAmount
  }
  reviewDialogVisible.value = true
}

// 拒絕案件
const rejectApplication = (application) => {
  reviewType.value = 'reject'
  selectedApplication.value = application
  reviewForm.value = {
    comment: '',
    approvedAmount: 0
  }
  reviewDialogVisible.value = true
}

// 提交審核
const submitReview = () => {
  if (!reviewForm.value.comment) {
    ElMessage.warning('請輸入審核意見')
    return
  }

  const actionType = reviewType.value === 'approve' ? '核准' : '拒絕'
  ElMessage.success(`已${actionType}案件 ${selectedApplication.value.applicationId}`)
  reviewDialogVisible.value = false
}
</script>

<style scoped>
.review-container {
  min-height: 100%;
}

.mb-4 {
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 10px;
}

.stat-icon {
  font-size: 24px;
  margin-right: 16px;
  color: #409EFF;
}

.stat-icon.warning {
  color: #E6A23C;
}

.stat-icon.success {
  color: #67C23A;
}

.stat-icon.info {
  color: #909399;
}

.stat-content {
  flex-grow: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.filter-section {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-card__header) {
  padding: 15px 20px;
}

:deep(.el-table) {
  margin: 16px 0;
}

:deep(.el-button-group) {
  display: flex;
  gap: 8px;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .el-col {
    margin-bottom: 16px;
  }

  .filter-section .el-row > .el-col {
    width: 100%;
  }

  .el-date-picker {
    width: 100%;
  }

  .stat-card {
    padding: 8px;
  }

  .stat-value {
    font-size: 20px;
  }

  .stat-label {
    font-size: 12px;
  }
}
</style>