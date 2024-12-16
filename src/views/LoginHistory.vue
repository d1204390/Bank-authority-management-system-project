<template>
  <div class="login-history">
    <!-- 統計資訊卡片 -->
    <div class="statistics-cards">
      <el-card class="stat-card" :body-style="{ padding: '0px' }" @click="handleStatCardClick('todaySuccess')">
        <div class="stat-header success">
          <i class="el-icon-user"></i>
          <span>今日成功登入</span>
        </div>
        <div class="stat-content">
          <div class="stat-number success">{{ statistics.todaySuccess || 0 }}</div>
        </div>
      </el-card>

      <el-card class="stat-card" :body-style="{ padding: '0px' }" @click="handleStatCardClick('todayFailed')">
        <div class="stat-header warning">
          <i class="el-icon-warning"></i>
          <span>今日失敗嘗試</span>
        </div>
        <div class="stat-content">
          <div class="stat-number warning">{{ statistics.todayFailed || 0 }}</div>
        </div>
      </el-card>

      <el-card class="stat-card" :body-style="{ padding: '0px' }" @click="handleStatCardClick('totalSuccess')">
        <div class="stat-header primary">
          <i class="el-icon-data-line"></i>
          <span>總成功登入</span>
        </div>
        <div class="stat-content">
          <div class="stat-number primary">{{ statistics.totalSuccess || 0 }}</div>
        </div>
      </el-card>

      <el-card class="stat-card" :body-style="{ padding: '0px' }" @click="handleStatCardClick('totalFailed')">
        <div class="stat-header info">
          <i class="el-icon-time"></i>
          <span>總失敗次數</span>
        </div>
        <div class="stat-content">
          <div class="stat-number info">{{ statistics.totalFailed || 0 }}</div>
        </div>
      </el-card>
    </div>

    <div class="main-content">
      <!-- 搜尋區域 -->
      <el-form :inline="true" class="search-form" size="default">
        <div class="search-form-container">
          <!-- 日期範圍 -->
          <el-form-item label="日期範圍" class="search-form-item">
            <el-date-picker
                v-model="dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="開始日期"
                end-placeholder="結束日期"
                :shortcuts="dateShortcuts"
                style="width: 240px"
            />
          </el-form-item>

          <!-- 帳號 -->
          <el-form-item label="帳號" class="search-form-item">
            <el-input
                v-model="searchAccount"
                placeholder="請輸入帳號"
                prefix-icon="el-icon-user"
                style="width: 150px"
            />
          </el-form-item>

          <!-- 姓名 -->
          <el-form-item label="姓名" class="search-form-item">
            <el-input
                v-model="searchName"
                placeholder="請輸入姓名"
                prefix-icon="el-icon-user"
                style="width: 150px"
            />
          </el-form-item>

          <!-- 狀態 -->
          <el-form-item label="狀態" class="search-form-item">
            <el-select
                v-model="searchStatus"
                placeholder="請選擇狀態"
                clearable
                class="status-select"
                style="width: 120px"
            >
              <el-option label="全部" value="all" />
              <el-option label="成功" value="success">
          <span style="display: flex; align-items: center; color: #67c23a;">
            <el-icon class="mr-1"><CircleCheck /></el-icon>
            <span>成功</span>
          </span>
              </el-option>
              <el-option label="失敗" value="failed">
          <span style="display: flex; align-items: center; color: #f56c6c;">
            <el-icon class="mr-1"><CircleClose /></el-icon>
            <span>失敗</span>
          </span>
              </el-option>
            </el-select>
          </el-form-item>

          <!-- 按鈕 -->
          <el-form-item class="search-form-item button-group">
            <el-button @click="resetSearch" :icon="Refresh">重置</el-button>
          </el-form-item>
        </div>
      </el-form>

      <!-- 表格區域 -->
      <el-card class="table-card">
        <el-table
            :data="loginRecords"
            style="width: 100%"
            border
            :header-cell-style="tableHeaderStyle"
            :cell-style="tableCellStyle"
        >
          <el-table-column
              fixed
              prop="loginTime"
              label="登入時間"
              width="180"
              :formatter="formatDate"
              sortable
          />
          <el-table-column
              fixed
              prop="account"
              label="帳號"
              width="120"
          />
          <el-table-column
              prop="employeeId"
              label="員工編號"
              width="120"
          />
          <el-table-column
              prop="userId.name"
              label="姓名"
              width="100"
          />
          <el-table-column
              prop="ipAddress"
              label="IP位址"
              width="140"
          />
          <el-table-column
              prop="userAgent"
              label="裝置資訊"
              min-width="300"
              show-overflow-tooltip
          />
          <el-table-column
              fixed="right"
              prop="status"
              label="狀態"
              width="100"
          >
            <template #default="{ row }">
              <el-tag
                  :type="row.status === 'success' ? 'success' : 'danger'"
                  effect="dark"
                  size="small"
                  round
              >
                {{ row.status === 'success' ? '成功' : '失敗' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
              fixed="right"
              prop="failureReason"
              label="備註"
              width="150"
          />
        </el-table>

        <!-- 分頁 -->
        <div class="pagination-container">
          <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :total="total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.login-history {
  padding: 24px;
  min-height: 100vh;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.statistics-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: -24px;
}

.stat-card {
  transition: all 0.3s ease;
  border: none;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-header {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.stat-header.success { background-color: #f0f9eb; color: #67c23a; }
.stat-header.warning { background-color: #fdf6ec; color: #e6a23c; }
.stat-header.primary { background-color: #ecf5ff; color: #409eff; }
.stat-header.info { background-color: #f4f4f5; color: #909399; }

.stat-content {
  padding: 16px;
  text-align: center;
}

.stat-number {
  font-size: 28px;
  font-weight: bold;
  line-height: 1.4;
}

.stat-number.success { color: #67c23a; }
.stat-number.warning { color: #e6a23c; }
.stat-number.primary { color: #409eff; }
.stat-number.info { color: #909399; }

.search-form {
  padding: 16px;
}

.search-form-container {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
}

.search-form-item {
  margin-bottom: 0 !important;
  margin-right: 0 !important;
}

.button-group {
  margin-left: auto;
  white-space: nowrap;
}

.table-card {
  border-radius: 8px;
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.pagination-container {
  padding: 16px;
  display: flex;
  justify-content: flex-end;
  background-color: #fff;
  border-top: 1px solid #f0f0f0;
}

.status-select {
  :deep(.el-input__inner) {
    border-radius: 4px;
  }

  :deep(.el-select-dropdown__item) {
    padding: 8px 12px;
  }
}

.mr-1 {
  margin-right: 4px;
}

@media (max-width: 1400px) {
  .statistics-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1200px) {
  .search-form-container {
    flex-wrap: wrap;
  }

  .search-form-item {
    flex: 1 1 auto;
  }

  .button-group {
    margin-left: 0;
    flex-basis: 100%;
    display: flex;
    justify-content: flex-end;
  }
}

@media (max-width: 768px) {
  .statistics-cards {
    grid-template-columns: 1fr;
  }

  .search-form {
    padding: 10px;
  }

  .search-form-item {
    flex-basis: 100%;
  }
}
</style>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import axios from 'axios'
import _ from 'lodash'

// 數據狀態
const loginRecords = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const dateRange = ref([])
const searchAccount = ref('')
const searchStatus = ref('all')
const statistics = ref({
  todaySuccess: 0,
  todayFailed: 0,
  totalSuccess: 0,
  totalFailed: 0
})
const searchName = ref('')

// 日期快捷選項
const dateShortcuts = [
  {
    text: '最近一週',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    },
  },
  {
    text: '最近一個月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    },
  },
  {
    text: '最近三個月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
      return [start, end]
    },
  }
]

// 表格樣式
const tableHeaderStyle = {
  background: '#f5f7fa',
  color: '#606266',
  fontWeight: '600',
  borderBottom: '1px solid #EBEEF5',
  padding: '12px 0'
}

const tableCellStyle = {
  padding: '12px',
  fontSize: '14px'
}

// API 請求
const fetchLoginHistory = async () => {
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      account: searchAccount.value,
      name: searchName.value,
      status: searchStatus.value === 'all' ? '' : searchStatus.value
    }

    if (dateRange.value?.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    const response = await axios.get('/api/admin/login-history', { params })
    loginRecords.value = response.data.loginHistory
    total.value = response.data.pagination.total
  } catch (error) {
    ElMessage.error('獲取登入記錄失敗')
    console.error(error)
  }
}

const fetchStatistics = async () => {
  try {
    const response = await axios.get('/api/admin/login-statistics')
    statistics.value = response.data
  } catch (error) {
    ElMessage.error('獲取統計數據失敗')
    console.error(error)
  }
}

// 事件處理
const resetSearch = () => {
  dateRange.value = []
  searchAccount.value = ''
  searchName.value = ''
  searchStatus.value = 'all'
}

const handleSizeChange = (val) => {
  pageSize.value = val
  fetchLoginHistory()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchLoginHistory()
}

// 監聽搜尋條件變化
watch(
    [dateRange, searchAccount, searchName, searchStatus],
    _.debounce(() => {
      currentPage.value = 1
      fetchLoginHistory()
    }, 300),
    { deep: true }
)

// 格式化日期
const formatDate = (row, column) => {
  const date = new Date(row[column.property])
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 卡片點擊處理
const handleStatCardClick = (type) => {
  searchAccount.value = ''
  searchName.value = ''

  const today = new Date()
  const startOfDay = new Date(today.setHours(0, 0, 0, 0))
  const endOfDay = new Date(today.setHours(23, 59, 59, 999))

  switch (type) {
    case 'todaySuccess':
      dateRange.value = [startOfDay, endOfDay]
      searchStatus.value = 'success'
      break
    case 'todayFailed':
      dateRange.value = [startOfDay, endOfDay]
      searchStatus.value = 'failed'
      break
    case 'totalSuccess':
      dateRange.value = []
      searchStatus.value = 'success'
      break
    case 'totalFailed':
      dateRange.value = []
      searchStatus.value = 'failed'
      break
  }
}

// 生命週期
onMounted(() => {
  fetchLoginHistory()
  fetchStatistics()
})
</script>