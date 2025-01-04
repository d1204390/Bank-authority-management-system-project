# views/loan/SupervisorReview.vue
<template>
  <div class="review-container">
    <!-- 統計資訊區 -->
    <el-row :gutter="20" class="mb-4">
      <el-col :span="6" v-for="stat in stats" :key="stat.label">
        <el-card shadow="hover" :body-style="{ padding: '20px' }">
          <div class="stat-card">
            <el-icon class="stat-icon" :class="stat.type">
              <component :is="stat.icon" />
            </el-icon>
            <div class="stat-content">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 主要內容區 -->
    <el-card class="main-content">
      <template #header>
        <div class="card-header">
          <span class="header-title">待審核申請</span>
          <div class="header-actions">
            <el-input
                v-model="searchQuery"
                placeholder="搜尋案件編號/客戶名稱"
                class="search-input"
                clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>

            <el-date-picker
                v-model="dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="開始日期"
                end-placeholder="結束日期"
                value-format="YYYY-MM-DD"
                class="date-picker"
            />

            <el-select
                v-model="filterUrgent"
                placeholder="全部案件"
                clearable
                class="filter-select"
            >
              <el-option label="一般案件" value="normal" />
              <el-option label="急件" value="urgent" />
            </el-select>
          </div>
        </div>
      </template>

      <!-- 申請列表 -->
      <el-table
          :data="filteredApplications"
          style="width: 100%"
          v-loading="loading"
      >
        <el-table-column prop="applicationId" label="案件編號" width="120" />
        <el-table-column prop="customerInfo.name" label="客戶姓名" width="100" />
        <el-table-column label="申請金額" width="140">
          <template #default="{ row }">
            <div>
              {{ formatAmount(row.loanInfo.amount) }}
              <el-tag
                  v-if="row.loanInfo.amount >= 5000000"
                  type="warning"
                  size="small"
                  class="ml-2"
              >
                大額
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="loanInfo.purpose" label="貸款用途" width="100">
          <template #default="{ row }">
            {{ loanPurposes[row.loanInfo.purpose] }}
          </template>
        </el-table-column>
        <el-table-column label="處理狀態" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="緊急程度" width="90">
          <template #default="{ row }">
            <el-tag
                :type="row.loanInfo.isUrgent ? 'danger' : ''"
                size="small"
            >
              {{ row.loanInfo.isUrgent ? '急件' : '一般' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="申請時間" width="150">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                  size="small"
                  @click="viewDetail(row)"
              >
                查看
              </el-button>
              <el-button
                  v-if="row.status === 'pending'"
                  type="success"
                  size="small"
                  @click="handleReview(row, 'approve')"
              >
                核准
              </el-button>
              <el-button
                  v-if="row.status === 'pending'"
                  type="danger"
                  size="small"
                  @click="handleReview(row, 'reject')"
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
            :page-sizes="[10, 20, 50]"
            :total="total"
            layout="total, sizes, prev, pager, next"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 審核對話框 -->
    <el-dialog
        v-model="reviewDialogVisible"
        :title="reviewType === 'approve' ? '核准申請' : '拒絕申請'"
        width="500px"
    >
      <el-form ref="reviewFormRef" :model="reviewForm" label-width="100px">
        <div class="review-info mb-4">
          <p><strong>案件編號：</strong>{{ currentApplication?.applicationId }}</p>
          <p><strong>申請金額：</strong>{{ currentApplication ? formatAmount(currentApplication.loanInfo.amount) : '' }}</p>
          <p v-if="reviewType === 'approve' && currentApplication?.loanInfo.amount >= 5000000" class="text-warning">
            <el-icon><Warning /></el-icon>
            此案件金額超過 500 萬，核准後需要經理複審
          </p>
        </div>
        <el-form-item label="審核意見" required>
          <el-input
              v-model="reviewForm.comment"
              type="textarea"
              rows="4"
              placeholder="請輸入審核意見"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="reviewDialogVisible = false">取消</el-button>
          <el-button
              :type="reviewType === 'approve' ? 'success' : 'danger'"
              @click="submitReview"
              :loading="submitting"
          >
            確認{{ reviewType === 'approve' ? '核准' : '拒絕' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 詳情對話框 -->
    <el-dialog
        v-model="detailDialogVisible"
        title="申請詳情"
        width="600px"
        :class="'centered-dialog'"
    >
      <div v-if="currentApplication" class="application-detail">
        <h4>基本資訊</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="案件編號">{{ currentApplication.applicationId }}</el-descriptions-item>
          <el-descriptions-item label="申請時間">{{ formatDateTime(currentApplication.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="處理狀態">
            <el-tag :type="getStatusType(currentApplication.status)">
              {{ getStatusText(currentApplication.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="緊急程度">
            <el-tag :type="currentApplication.loanInfo.isUrgent ? 'danger' : ''">
              {{ currentApplication.loanInfo.isUrgent ? '急件' : '一般' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <h4 class="mt-4">申請人資訊</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="客戶姓名">{{ currentApplication.customerInfo.name }}</el-descriptions-item>
          <el-descriptions-item label="身分證號">{{ currentApplication.customerInfo.idNumber }}</el-descriptions-item>
          <el-descriptions-item label="聯絡電話">{{ currentApplication.customerInfo.phone }}</el-descriptions-item>
        </el-descriptions>

        <h4 class="mt-4">貸款資訊</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申請金額">{{ formatAmount(currentApplication.loanInfo.amount) }}</el-descriptions-item>
          <el-descriptions-item label="貸款用途">{{ loanPurposes[currentApplication.loanInfo.purpose] }}</el-descriptions-item>
          <el-descriptions-item label="貸款期限">{{ currentApplication.loanInfo.term }}個月</el-descriptions-item>
        </el-descriptions>

        <h4 class="mt-4">審核紀錄</h4>
        <div v-if="currentApplication.approvalChain.length > 0">
          <el-timeline>
            <el-timeline-item
                v-for="(approval, index) in currentApplication.approvalChain"
                :key="index"
                :type="getTimelineItemType(approval.status)"
                :timestamp="formatDateTime(approval.timestamp)"
            >
              <h5>{{ getPositionText(approval.approverPosition) }}審核</h5>
              <p>結果：{{ getStatusText(approval.status) }}</p>
              <p>意見：{{ approval.comment }}</p>
            </el-timeline-item>
          </el-timeline>
        </div>
        <el-empty v-else description="尚無審核紀錄" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Document,
  Warning,
  Search,
  Clock,
  Money,
  Bell
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

// 常數定義
const loanPurposes = {
  house: '房屋貸款',
  car: '車輛貸款',
  credit: '信用貸款',
  other: '其他'
}

// 響應式狀態
const loading = ref(false)
const submitting = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchQuery = ref('')
const filterUrgent = ref('')
const applications = ref([])
const reviewDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const reviewType = ref('approve')
const currentApplication = ref(null)
const reviewForm = ref({
  comment: ''
})
const dateRange = ref([])

// 統計數據
const statistics = ref({
  pendingCount: 0,
  reviewedToday: 0,
  largeAmountCount: 0,
  urgentCount: 0
})

// 計算統計卡片數據
const stats = computed(() => [
  {
    label: '待審核案件',
    value: statistics.value.pendingCount,
    icon: Document,
    type: 'primary'
  },
  {
    label: '今日已審核',
    value: statistics.value.reviewedToday,
    icon: Clock,
    type: 'success'
  },
  {
    label: '大額案件',
    value: statistics.value.largeAmountCount,
    icon: Money,
    type: 'warning'
  },
  {
    label: '急件數量',
    value: statistics.value.urgentCount,
    icon: Bell,
    type: 'danger'
  }
])

// 過濾後的申請列表
const filteredApplications = computed(() => {
  return applications.value.filter(app => {
    // 搜尋條件匹配
    const matchSearch = !searchQuery.value ||
        app.applicationId.includes(searchQuery.value) ||
        app.customerInfo.name.includes(searchQuery.value)

    // 急件狀態匹配
    const matchUrgent = !filterUrgent.value ||
        (filterUrgent.value === 'urgent' ? app.loanInfo.isUrgent : !app.loanInfo.isUrgent)

    // 日期範圍匹配
    let matchDate = true
    if (dateRange.value && dateRange.value.length === 2) {
      const appDate = new Date(app.createdAt)
      const startDate = new Date(dateRange.value[0])
      const endDate = new Date(dateRange.value[1])
      endDate.setHours(23, 59, 59, 999)
      matchDate = appDate >= startDate && appDate <= endDate
    }

    return matchSearch && matchUrgent && matchDate
  })
})

// 格式化函數
const formatAmount = (amount) => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatDateTime = (date) => {
  return new Date(date).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 狀態相關函數
const getStatusType = (status) => {
  const types = {
    pending: 'info',
    processing: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    pending: '待審核',
    processing: '處理中',
    approved: '已核准',
    rejected: '已拒絕'
  }
  return texts[status] || status
}

const getPositionText = (position) => {
  const texts = {
    S: '主管',
    M: '經理'
  }
  return texts[position] || position
}

const getTimelineItemType = (status) => {
  return status === 'approved' ? 'success' :
      status === 'rejected' ? 'danger' :
          'primary'
}

// API 調用函數
const fetchStatistics = async () => {
  try {
    // 獲取今日日期
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    statistics.value = {
      // 當前待審核案件就是 applications 的長度
      pendingCount: applications.value.length,

      // 計算今日審核數（從 approvalChain 中查找）
      reviewedToday: applications.value.reduce((count, app) => {
        const hasReviewToday = app.approvalChain.some(approval => {
          const approvalDate = new Date(approval.timestamp)
          return approvalDate >= today
        })
        return count + (hasReviewToday ? 1 : 0)
      }, 0),

      // 大額案件數
      largeAmountCount: applications.value.filter(app =>
          app.loanInfo.amount >= 5000000
      ).length,

      // 急件數
      urgentCount: applications.value.filter(app =>
          app.loanInfo.isUrgent
      ).length
    }
  } catch (error) {
    console.error('計算統計數據失敗:', error)
    ElMessage.error('獲取統計數據失敗')
  }
}

const fetchApplications = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/loan/list', {
      params: {
        page: currentPage.value,
        limit: pageSize.value,
        status: 'pending'  // 加入這行，只獲取待審核案件
      }
    })
    applications.value = response.data.applications
    total.value = response.data.pagination.total

    // 更新統計數據
    fetchStatistics()
  } catch (error) {
    console.error('獲取申請列表失敗:', error)
    ElMessage.error('獲取申請列表失敗')
  } finally {
    loading.value = false
  }
}

// 事件處理函數
const handleSizeChange = (val) => {
  pageSize.value = val
  fetchApplications()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchApplications()
}

const handleReview = (row, type) => {
  reviewType.value = type
  currentApplication.value = row
  reviewForm.value.comment = ''
  reviewDialogVisible.value = true
}

const viewDetail = (row) => {
  currentApplication.value = row
  detailDialogVisible.value = true
}

const submitReview = async () => {
  if (!reviewForm.value.comment.trim()) {
    ElMessage.warning('請輸入審核意見')
    return
  }

  submitting.value = true
  try {
    await axios.post(`/api/loan/supervisor-review/${currentApplication.value._id}`, {
      status: reviewType.value === 'approve' ? 'approved' : 'rejected',
      comment: reviewForm.value.comment
    })

    ElMessage.success('審核完成')
    reviewDialogVisible.value = false
    await fetchApplications()  // 重新載入列表和統計數據

  } catch (error) {
    console.error('審核失敗:', error)
    ElMessage.error(error.response?.data?.msg || '審核失敗')
  } finally {
    submitting.value = false
  }
}

// 生命週期鉤子
onMounted(() => {
  fetchApplications()
})
</script>

<style scoped>
.review-container {
  padding: 20px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}

.ml-2 {
  margin-left: 8px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  font-size: 24px;
}

.stat-icon.primary { color: #409EFF; }
.stat-icon.success { color: #67C23A; }
.stat-icon.warning { color: #E6A23C; }
.stat-icon.danger { color: #F56C6C; }

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

.main-content {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: 16px;
  font-weight: bold;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input {
  width: 240px;
}

.date-picker {
  width: 320px;
}

.filter-select {
  width: 120px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.review-info {
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.review-info p {
  margin: 8px 0;
}

.text-warning {
  color: #E6A23C;
  display: flex;
  align-items: center;
  gap: 8px;
}

.application-detail h4 {
  margin: 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
  color: #303133;
}

/* 時間軸項目的標題樣式 */
.application-detail h5 {
  margin: 8px 0;
  font-size: 14px;
  color: #303133;
}

/* 時間軸項目的內容樣式 */
.el-timeline-item p {
  margin: 4px 0;
  color: #606266;
}

:deep(.centered-dialog) {
  /* 讓對話框出現在上方 */
  margin-top: 5px; /* 可以調整這個值來控制具體高度 */
}

@media screen and (max-width: 768px) {
.review-container {
    padding: 10px;
  }

.el-col {
    margin-bottom: 16px;
  }

.header-actions {
    flex-direction: column;
  gap: 8px;
  }

.search-input,
.date-picker,
.filter-select {
    width: 100%;
  }

.el-descriptions {
    width: 100%;
  }

.el-button-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

.el-dialog {
    width: 90% !important;
  }
}
</style>