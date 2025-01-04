# components/loan/ReviewHistory.vue
<template>
  <div class="review-history">
    <!-- 搜尋和過濾區 -->
    <el-card class="filter-card mb-4">
      <div class="filter-section">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="8">
            <el-input
                v-model="searchQuery"
                placeholder="搜尋案件編號/客戶名稱"
                clearable
                class="filter-item"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>

          <el-col :xs="24" :sm="8">
            <el-date-picker
                v-model="dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="開始日期"
                end-placeholder="結束日期"
                value-format="YYYY-MM-DD"
                class="filter-item"
            />
          </el-col>

          <el-col :xs="24" :sm="8">
            <el-row :gutter="10">
              <el-col :span="12">
                <el-select
                    v-model="filterStatus"
                    placeholder="審核結果"
                    clearable
                    class="filter-item"
                >
                  <el-option label="已核准" value="approved" />
                  <el-option label="已拒絕" value="rejected" />
                </el-select>
              </el-col>
              <el-col :span="12">
                <el-select
                    v-model="filterAmount"
                    placeholder="申請金額"
                    clearable
                    class="filter-item"
                >
                  <el-option label="一般案件" value="normal" />
                  <el-option label="大額案件" value="large" />
                </el-select>
              </el-col>
            </el-row>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- 審核統計 -->
    <el-card class="stats-card mb-4">
      <el-row :gutter="20">
        <el-col :span="8">
          <div class="stat-item">
            <div class="stat-label">本月審核案件</div>
            <div class="stat-value">{{ monthlyStats.total }}件</div>
            <div class="stat-detail">
              <span class="success">核准: {{ monthlyStats.approved }}</span>
              <span class="danger">拒絕: {{ monthlyStats.rejected }}</span>
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-item">
            <div class="stat-label">平均處理時間</div>
            <div class="stat-value">{{ monthlyStats.avgProcessTime }}</div>
            <div class="stat-detail">小時/件</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-item">
            <div class="stat-label">審核通過率</div>
            <div class="stat-value">{{ monthlyStats.approvalRate }}%</div>
            <div class="stat-detail">本月統計</div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 審核列表 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>審核紀錄</span>
        </div>
      </template>

      <el-table
          :data="filteredReviews"
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
        <el-table-column label="審核結果" width="200">
          <template #default="{ row }">
            <div class="review-tags">
              <el-tag
                  v-for="approval in row.approvalChain"
                  :key="approval.approverEmployeeId"
                  :type="getApprovalType(approval.status)"
                  class="mr-2 mb-1"
              >
                {{ getPositionText(approval.approverPosition) }}:
                {{ getApprovalStatus(approval.status) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="審核時間" width="170">
          <template #default="{ row }">
            {{ formatDateTime(row.approvalChain[row.approvalChain.length - 1]?.timestamp || row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="處理時間" width="100">
          <template #default="{ row }">
            {{ calculateTotalProcessTime(row) }}
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="120">
          <template #default="{ row }">
            <el-button
                link
                type="primary"
                @click="viewDetail(row)"
            >
              查看詳情
            </el-button>
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

    <!-- 詳情對話框 -->
    <el-dialog
        v-model="detailDialogVisible"
        title="申請詳情"
        width="650px"
        class="centered-dialog"
        align-center
    >
      <div class="dialog-content-wrapper">
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
                <p>結果：{{ getApprovalStatus(approval.status) }}</p>
                <p>意見：{{ approval.comment }}</p>
              </el-timeline-item>
            </el-timeline>
          </div>
          <el-empty v-else description="尚無審核紀錄" />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted,defineProps } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

defineProps({
  position: {
    type: String,
    required: true,
    validator: (value) => ['S', 'M'].includes(value)
  }
})

// 常數定義
const loanPurposes = {
  house: '房屋貸款',
  car: '車輛貸款',
  credit: '信用貸款',
  other: '其他'
}

// 響應式狀態
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchQuery = ref('')
const dateRange = ref([])
const filterStatus = ref('')
const filterAmount = ref('')
const reviews = ref([])
const detailDialogVisible = ref(false)
const currentApplication = ref(null)

// 每月統計
const monthlyStats = ref({
  total: 0,
  approved: 0,
  rejected: 0,
  avgProcessTime: '0',
  approvalRate: '0'
})

// 計算過濾後的審核列表
const filteredReviews = computed(() => {
  return reviews.value.filter(review => {
    // 搜尋條件
    const matchSearch = !searchQuery.value ||
        review.applicationId.includes(searchQuery.value) ||
        review.customerInfo.name.includes(searchQuery.value)

    // 日期範圍
    let matchDate = true
    if (dateRange.value && dateRange.value.length === 2) {
      const lastApproval = review.approvalChain[review.approvalChain.length - 1]
      if (lastApproval) {
        const reviewDate = new Date(lastApproval.timestamp)
        const startDate = new Date(dateRange.value[0])
        const endDate = new Date(dateRange.value[1])
        endDate.setHours(23, 59, 59, 999)
        matchDate = reviewDate >= startDate && reviewDate <= endDate
      }
    }

    // 審核結果
    const matchStatus = !filterStatus.value ||
        review.status === filterStatus.value

    // 金額範圍
    const matchAmount = !filterAmount.value ||
        (filterAmount.value === 'large' ? review.loanInfo.amount >= 5000000 : review.loanInfo.amount < 5000000)

    return matchSearch && matchDate && matchStatus && matchAmount
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

// 審核相關函數
const getApprovalType = (status) => {
  return status === 'approved' ? 'success' :
      status === 'rejected' ? 'danger' :
          'warning'
}

const getApprovalStatus = (status) => {
  const texts = {
    approved: '核准',
    rejected: '拒絕',
    processing: '處理中'
  }
  return texts[status] || status
}

const calculateTotalProcessTime = (application) => {
  if (!application.approvalChain.length) return '-'

  const lastApproval = application.approvalChain[application.approvalChain.length - 1]
  const startTime = new Date(application.createdAt)
  const endTime = new Date(lastApproval.timestamp)
  const hours = Math.round((endTime - startTime) / (1000 * 60 * 60))

  if (hours < 24) {
    return `${hours}小時`
  } else {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return `${days}天${remainingHours}小時`
  }
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

// API 相關函數
const fetchReviews = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/loan/review-history', {
      params: {
        page: currentPage.value,
        limit: pageSize.value
      }
    })
    reviews.value = response.data.reviews
    total.value = response.data.pagination.total
    calculateMonthlyStats()
  } catch (error) {
    console.error('獲取審核紀錄失敗:', error)
    ElMessage.error('獲取審核紀錄失敗')
  } finally {
    loading.value = false
  }
}

// 計算月度統計
const calculateMonthlyStats = () => {
  const now = new Date()
  const thisMonth = reviews.value.filter(review => {
    const lastApproval = review.approvalChain[review.approvalChain.length - 1]
    if (!lastApproval) return false

    const reviewDate = new Date(lastApproval.timestamp)
    return reviewDate.getMonth() === now.getMonth() &&
        reviewDate.getFullYear() === now.getFullYear()
  })

  const approved = thisMonth.filter(review =>
      review.status === 'approved'
  )

  const rejected = thisMonth.filter(review =>
      review.status === 'rejected'
  )

  // 計算平均處理時間
  const totalHours = thisMonth.reduce((sum, review) => {
    if (!review.approvalChain.length) return sum

    const lastApproval = review.approvalChain[review.approvalChain.length - 1]
    const startTime = new Date(review.createdAt)
    const endTime = new Date(lastApproval.timestamp)
    const hours = Math.round((endTime - startTime) / (1000 * 60 * 60))
    return sum + hours
  }, 0)

  monthlyStats.value = {
    total: thisMonth.length,
    approved: approved.length,
    rejected: rejected.length,
    avgProcessTime: thisMonth.length ?
        calculateTotalProcessTime({
          createdAt: new Date(),
          approvalChain: [{ timestamp: new Date(new Date().getTime() + (totalHours / thisMonth.length) * 60 * 60 * 1000) }]
        }).replace('小時', '') : '0',
    approvalRate: thisMonth.length ?
        ((approved.length / thisMonth.length) * 100).toFixed(1) : '0'
  }
}

// 事件處理函數
const handleSizeChange = (val) => {
  pageSize.value = val
  fetchReviews()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchReviews()
}

const viewDetail = (row) => {
  currentApplication.value = row
  detailDialogVisible.value = true
}

// 生命週期鉤子
onMounted(() => {
  fetchReviews()
})
</script>

<style scoped>
.review-history {
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

.mr-2 {
  margin-right: 8px;
}

.mb-1 {
  margin-bottom: 4px;
}

/* 過濾區域樣式 */
.filter-section {
  width: 100%;
}

.filter-item {
  width: 100%;
  margin-bottom: 10px;
}

/* 統計卡片樣式 */
.stats-card {
  background-color: #fff;
}

.stat-item {
  text-align: center;
  padding: 20px;
}

.stat-label {
  color: #909399;
  font-size: 14px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.stat-detail {
  font-size: 14px;
  display: flex;
  justify-content: center;
  gap: 16px;
}

.stat-detail .success {
  color: #67C23A;
}

.stat-detail .danger {
  color: #F56C6C;
}

/* 卡片標題樣式 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 分頁容器樣式 */
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 審核標籤樣式 */
.review-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* 對話框相關樣式 */
.dialog-content-wrapper {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 10px;
}

.dialog-content-wrapper::-webkit-scrollbar {
  width: 6px;
}

.dialog-content-wrapper::-webkit-scrollbar-thumb {
  background-color: #909399;
  border-radius: 3px;
}

.dialog-content-wrapper::-webkit-scrollbar-track {
  background-color: #f5f7fa;
}

:deep(.centered-dialog) {
  margin: 5vh auto !important;
}

:deep(.el-dialog) {
  margin: 5vh auto !important;
  position: relative !important;
  left: 0 !important;
  transform: none !important;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

:deep(.el-dialog__body) {
  flex: 1;
  overflow: hidden;
  padding: 20px;
}

/* 詳情視窗樣式 */
.application-detail h4 {
  margin: 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
  color: #303133;
}

.application-detail h5 {
  margin: 8px 0;
  font-size: 14px;
  color: #303133;
}

.application-detail p {
  margin: 4px 0;
  color: #606266;
}

/* 響應式設計 */
@media screen and (max-width: 768px) {
  .review-history {
    padding: 10px;
  }

  .stat-item {
    padding: 10px;
  }

  .stat-value {
    font-size: 20px;
  }

  .filter-section .el-row {
    margin-bottom: 0;
  }
}
</style>