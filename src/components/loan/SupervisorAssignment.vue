<!-- components/loan/SupervisorAssignment.vue -->
<template>
  <div class="assignment-container">
    <!-- 待指派案件 -->
    <el-card class="mb-4">
      <template #header>
        <div class="card-header">
          <span>待指派案件</span>
          <el-button type="primary">
            <el-icon><Plus /></el-icon>
            批次指派
          </el-button>
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

      <!-- 待指派案件列表 -->
      <el-table :data="unassignedLoans" style="width: 100%">
        <el-table-column type="selection" width="55" />
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
        <el-table-column prop="urgency" label="優先等級" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.urgency === 'urgent' ? 'danger' : ''">
              {{ scope.row.urgency === 'urgent' ? '急件' : '一般' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="指派承辦人" width="200">
          <template #default="scope">
            <el-select
                v-model="scope.row.assignee"
                placeholder="選擇承辦人"
                @change="handleAssign(scope.row)"
            >
              <el-option
                  v-for="staff in staffList"
                  :key="staff.id"
                  :label="staff.name"
                  :value="staff.id"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button
                type="primary"
                :icon="View"
                @click="viewLoanDetail(scope.row)"
            >
              查看
            </el-button>
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

    <!-- 承辦人工作量統計 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>承辦人工作量統計</span>
        </div>
      </template>
      <el-table :data="staffWorkload" style="width: 100%">
        <el-table-column prop="name" label="承辦人" />
        <el-table-column prop="totalCases" label="總案件數" />
        <el-table-column prop="pendingCases" label="處理中案件" />
        <el-table-column prop="urgentCases" label="急件數" />
        <el-table-column prop="completedToday" label="今日完成" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Search, View, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 搜尋和篩選
const searchQuery = ref('')
const filterPriority = ref('')
const dateRange = ref([])

// 分頁
const currentPage = ref(1)
const pageSize = ref(10)

// 模擬數據 - 待指派案件
const unassignedLoans = [
  {
    applicationId: 'L2024001',
    customerName: '王小明',
    loanAmount: 500000,
    submissionDate: '2024-01-02',
    urgency: 'urgent',
    assignee: ''
  },
  {
    applicationId: 'L2024002',
    customerName: '張美玲',
    loanAmount: 800000,
    submissionDate: '2024-01-02',
    urgency: 'normal',
    assignee: ''
  }
]

// 模擬數據 - 承辦人列表
const staffList = [
  { id: 1, name: '李專員' },
  { id: 2, name: '陳專員' },
  { id: 3, name: '王專員' }
]

// 模擬數據 - 承辦人工作量
const staffWorkload = [
  {
    name: '李專員',
    totalCases: 15,
    pendingCases: 5,
    urgentCases: 2,
    completedToday: 3
  },
  {
    name: '陳專員',
    totalCases: 12,
    pendingCases: 4,
    urgentCases: 1,
    completedToday: 2
  },
  {
    name: '王專員',
    totalCases: 18,
    pendingCases: 6,
    urgentCases: 3,
    completedToday: 4
  }
]

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

// 處理案件指派
const handleAssign = (application) => {
  ElMessage.success(`已將案件 ${application.applicationId} 指派給 ${
      staffList.find(s => s.id === application.assignee)?.name
  }`)
}

// 查看案件詳情
const viewLoanDetail = (application) => {
  ElMessage.info(`查看案件 ${application.applicationId} 的詳細資訊`)
}
</script>

<style scoped>
.assignment-container {
  min-height: 100%;
}

.mb-4 {
  margin-bottom: 16px;
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
}
</style>