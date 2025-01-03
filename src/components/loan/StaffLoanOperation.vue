<!-- components/loan/StaffLoanOperation.vue -->
<template>
  <div class="loan-operation">
    <!-- 發起申請按鈕 -->
    <div class="operation-header">
      <el-button type="primary" size="large" @click="showApplicationForm">
        <el-icon><Plus /></el-icon>
        發起貸款申請
      </el-button>
    </div>

    <!-- 案件管理區域 -->
    <div class="cases-container">
      <el-tabs v-model="activeTab">
        <!-- 主管指派案件 -->
        <el-tab-pane label="主管指派案件" name="assigned">
          <el-table :data="assignedCases" stripe style="width: 100%">
            <el-table-column prop="id" label="案件編號" width="120" />
            <el-table-column prop="customerName" label="客戶姓名" width="120" />
            <el-table-column prop="amount" label="申請金額" width="120">
              <template #default="scope">
                {{ formatCurrency(scope.row.amount) }}
              </template>
            </el-table-column>
            <el-table-column prop="assignDate" label="指派日期" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.assignDate) }}
              </template>
            </el-table-column>
            <el-table-column prop="priority" label="優先等級" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.priority === 'urgent' ? 'danger' : ''">
                  {{ scope.row.priority === 'urgent' ? '急件' : '一般' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作">
              <template #default="scope">
                <el-button type="primary" @click="handleCase(scope.row)">
                  處理案件
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 處理中案件 -->
        <el-tab-pane label="處理中案件" name="processing">
          <el-table :data="processingCases" stripe style="width: 100%">
            <el-table-column prop="id" label="案件編號" width="120" />
            <el-table-column prop="customerName" label="客戶姓名" width="120" />
            <el-table-column prop="amount" label="申請金額" width="120">
              <template #default="scope">
                {{ formatCurrency(scope.row.amount) }}
              </template>
            </el-table-column>
            <el-table-column prop="startDate" label="開始處理日期" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.startDate) }}
              </template>
            </el-table-column>
            <el-table-column label="操作">
              <template #default="scope">
                <el-button-group>
                  <el-button type="primary" @click="continueProcess(scope.row)">
                    繼續處理
                  </el-button>
                  <el-button type="success" @click="submitReview(scope.row)">
                    提交審核
                  </el-button>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 我的申請案件 -->
        <el-tab-pane label="我的申請案件" name="my">
          <el-table :data="myCases" stripe style="width: 100%">
            <el-table-column prop="id" label="案件編號" width="120" />
            <el-table-column prop="customerName" label="客戶姓名" width="120" />
            <el-table-column prop="amount" label="申請金額" width="120">
              <template #default="scope">
                {{ formatCurrency(scope.row.amount) }}
              </template>
            </el-table-column>
            <el-table-column prop="applyDate" label="申請日期" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.applyDate) }}
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
                <el-button type="info" @click="viewCase(scope.row)">
                  查看詳情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 發起申請對話框 -->
    <el-dialog
        v-model="dialogVisible"
        title="發起貸款申請"
        width="60%"
    >
      <!-- 這裡之後可以改用獨立的申請表單組件 -->
      <el-form :model="applicationForm" label-width="120px">
        <el-form-item label="客戶姓名" required>
          <el-input v-model="applicationForm.customerName" />
        </el-form-item>
        <el-form-item label="申請金額" required>
          <el-input-number
              v-model="applicationForm.amount"
              :min="0"
              :step="10000"
              style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="貸款用途" required>
          <el-select v-model="applicationForm.purpose" style="width: 200px">
            <el-option label="房貸" value="house" />
            <el-option label="車貸" value="car" />
            <el-option label="信貸" value="credit" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitApplication">
            確認送出
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 頁籤控制
const activeTab = ref('assigned')

// 對話框控制
const dialogVisible = ref(false)

// 申請表單
const applicationForm = ref({
  customerName: '',
  amount: 100000,
  purpose: ''
})

// 模擬數據 - 主管指派案件
const assignedCases = ref([
  {
    id: 'L2024001',
    customerName: '王小明',
    amount: 500000,
    assignDate: '2024-01-02',
    priority: 'urgent'
  },
  {
    id: 'L2024002',
    customerName: '李小華',
    amount: 800000,
    assignDate: '2024-01-02',
    priority: 'normal'
  }
])

// 模擬數據 - 處理中案件
const processingCases = ref([
  {
    id: 'L2024003',
    customerName: '張大明',
    amount: 1200000,
    startDate: '2024-01-01'
  }
])

// 模擬數據 - 我的申請案件
const myCases = ref([
  {
    id: 'L2024004',
    customerName: '陳小芳',
    amount: 600000,
    applyDate: '2024-01-02',
    status: 'processing'
  }
])

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

// 取得狀態標籤樣式
const getStatusType = (status) => {
  const typeMap = {
    pending: 'info',
    processing: 'warning',
    reviewing: 'primary',
    approved: 'success',
    rejected: 'danger'
  }
  return typeMap[status] || 'info'
}

// 取得狀態顯示文字
const getStatusLabel = (status) => {
  const labelMap = {
    pending: '待處理',
    processing: '處理中',
    reviewing: '審核中',
    approved: '已核准',
    rejected: '已拒絕'
  }
  return labelMap[status] || status
}

// 顯示申請表單
const showApplicationForm = () => {
  applicationForm.value = {
    customerName: '',
    amount: 100000,
    purpose: ''
  }
  dialogVisible.value = true
}

// 提交申請
const submitApplication = () => {
  // 這裡之後會加入表單驗證
  ElMessage.success('申請已送出')
  dialogVisible.value = false
}

// 處理案件
const handleCase = (caseData) => {
  ElMessage.info(`開始處理案件：${caseData.id}`)
}

// 繼續處理案件
const continueProcess = (caseData) => {
  ElMessage.info(`繼續處理案件：${caseData.id}`)
}

// 提交審核
const submitReview = (caseData) => {
  ElMessage.success(`案件 ${caseData.id} 已提交審核`)
}

// 查看案件詳情
const viewCase = (caseData) => {
  ElMessage.info(`查看案件詳情：${caseData.id}`)
}
</script>

<style scoped>
.loan-operation {
  background-color: #fff;
  padding: 20px;
  border-radius: 4px;
}

.operation-header {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-start;
}

.cases-container {
  margin-top: 20px;
}

:deep(.el-tabs__nav-wrap) {
  padding: 0 20px;
}

:deep(.el-table) {
  margin-top: 10px;
}

:deep(.el-button-group) {
  display: flex;
  gap: 8px;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .loan-operation {
    padding: 10px;
  }

  :deep(.el-button-group) {
    flex-direction: column;
  }
}
</style>