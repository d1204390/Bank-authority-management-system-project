# components/dashboard/StatsOverview.vue

<template>
  <div class="overview-container">
    <!-- 統計卡片區 -->
    <el-row :gutter="12">

      <!-- 新增：待審核新進員工卡片 -->
      <el-col :span="4" :xs="12">
        <el-card
            class="stat-card"
            shadow="hover"
            @click="navigateToPage('staff')"
        >
          <div class="stat-header">
            <el-icon><User /></el-icon>
            <span class="stat-title">待審核新進員工</span>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ newEmployeeStats.pending }}</div>
            <div class="stat-footer">
              <el-tag v-if="newEmployeeStats.pending > 0" size="small" type="danger">需要處理</el-tag>
              <el-tag v-else size="small" type="success">無待處理項目</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 待審核貸款卡片 -->
      <el-col :span="4" :xs="12">
        <el-card
            class="stat-card"
            shadow="hover"
            @click="navigateToPage('loans', 'review')"
        >
          <div class="stat-header">
            <el-icon><Document /></el-icon>
            <span class="stat-title">待審核貸款</span>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ loanStats.pending }}</div>
            <div class="stat-footer">
              <el-tag v-if="loanStats.pending > 0" size="small" type="danger">需要處理</el-tag>
              <el-tag v-else size="small" type="success">無待處理項目</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 待審核請假卡片 -->
      <el-col :span="4" :xs="12">
        <el-card
            class="stat-card"
            shadow="hover"
            @click="navigateToPage('leave')"
        >
          <div class="stat-header">
            <el-icon><Calendar /></el-icon>
            <span class="stat-title">待審核請假</span>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ leaveStats.pending }}</div>
            <div class="stat-footer">
              <el-tag v-if="leaveStats.pending > 0" size="small" type="danger">需要處理</el-tag>
              <el-tag v-else size="small" type="success">無待處理項目</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 本月核准貸款卡片 -->
      <el-col :span="4" :xs="12">
        <el-card
            class="stat-card"
            shadow="hover"
            @click="navigateToPage('loans', 'history')"
        >
          <div class="stat-header">
            <el-icon><Check /></el-icon>
            <span class="stat-title">本月核准貸款</span>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ loanStats.approved }}</div>
            <div class="stat-footer">
              <el-tag size="small" type="success">已核准</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 本月請假統計卡片 -->
      <el-col :span="4" :xs="12">
        <el-card
            class="stat-card"
            shadow="hover"
            @click="navigateToPage('leave')"
        >
          <div class="stat-header">
            <el-icon><DataAnalysis /></el-icon>
            <span class="stat-title">本月請假統計</span>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ leaveStats.total }}</div>
            <div class="stat-footer">
              <el-tag size="small" type="info">總計</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 圖表區域 -->
    <el-row :gutter="20" class="chart-row">
      <!-- 貸款審核趨勢圖 -->
      <el-col :xs="24" :sm="12">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="chart-header">
              <span>貸款審核趨勢</span>
              <el-dropdown @command="handleLoanTimeRangeChange">
                <el-button size="small" type="primary">
                  {{ loanTimeRange === 'week' ? '近一週' : '近一月' }}
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="week">近一週</el-dropdown-item>
                    <el-dropdown-item command="month">近一月</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
          <div class="chart-content" v-loading="loanChartLoading">
            <v-chart
                v-if="loanChartData.length > 0"
                class="chart"
                :option="loanChartOption"
                autoresize
            />
            <el-empty v-else description="暫無數據" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { onMounted,defineEmits } from 'vue'
import {
  Document,
  Calendar,
  Check,
  DataAnalysis,
  ArrowDown,
  User
} from '@element-plus/icons-vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import VChart from 'vue-echarts'
import { ref, computed } from 'vue'

const loading = ref(false)
const loanTimeRange = ref('week')
const loanChartLoading = ref(false)
const loanChartData = ref([])
const leaveTimeRange = ref('week')
const leaveChartLoading = ref(false)
const leaveChartData = ref([])

const emit = defineEmits(['updateMenuItem', 'updateTab'])

const newEmployeeStats = ref({
  pending: 0
})

const fetchNewEmployeeStats = async () => {
  try {
    const response = await axios.get('/api/new-employees/pending')
    newEmployeeStats.value = {
      pending: response.data.pagination.total || 0
    }
  } catch (error) {
    console.error('獲取新進員工統計失敗:', error)
    ElMessage.error('獲取新進員工統計失敗')
  }
}


const loanStats = ref({
  pending: 0,
  approved: 0
})

const leaveStats = ref({
  pending: 0,
  total: 0
})
ref([
  { label: '本週', value: 'week', active: true },
  { label: '本月', value: 'month', active: false }
]);
// 添加圖表配置
const loanChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis'
  },
  legend: {
    data: ['待審核', '已核准', '已拒絕']
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: loanChartData.value.map(item => item.date)
  },
  yAxis: {
    type: 'value'
  },
  series: [
    {
      name: '待審核',
      type: 'line',
      data: loanChartData.value.map(item => item.pending),
      itemStyle: { color: '#ff9800' }
    },
    {
      name: '已核准',
      type: 'line',
      data: loanChartData.value.map(item => item.approved),
      itemStyle: { color: '#4caf50' }
    },
    {
      name: '已拒絕',
      type: 'line',
      data: loanChartData.value.map(item => item.rejected),
      itemStyle: { color: '#f44336' }
    }
  ]
}))
computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} ({d}%)'
  },
  legend: {
    orient: 'vertical',
    left: 'left'
  },
  series: [
    {
      type: 'pie',
      radius: '50%',
      data: leaveChartData.value.map(item => ({
        name: item.type,
        value: item.value
      })),
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }
  ]
}));
// 頁面導航函數
const navigateToPage = (page, tab = null) => {
  emit('updateMenuItem', page)
  if (tab) {
    emit('updateTab', tab)
  }
}

const handleLoanTimeRangeChange = async (range) => {
  loanTimeRange.value = range
  await fetchLoanTrendData()
}
const fetchLoanStats = async () => {
  try {
    const response = await axios.get('/api/loan/stats')
    loanStats.value = {
      pending: response.data.pendingLoans || 0,
      approved: response.data.completedLoans || 0
    }
  } catch (error) {
    console.error('獲取貸款統計失敗:', error)
    ElMessage.error('獲取貸款統計失敗')
  }
}

const fetchLeaveStats = async () => {
  try {
    const response = await axios.get('/api/leave/stats')
    leaveStats.value = {
      pending: response.data.pendingLeaves || 0,
      total: response.data.totalLeaves || 0
    }
  } catch (error) {
    console.error('獲取請假統計失敗:', error)
    ElMessage.error('獲取請假統計失敗')
  }
}

const fetchLoanTrendData = async () => {
  loanChartLoading.value = true
  try {
    const response = await axios.get('/api/loan/trend', {
      params: { range: loanTimeRange.value }
    })
    loanChartData.value = response.data
  } catch (error) {
    console.error('獲取貸款趨勢數據失敗:', error)
    ElMessage.error('獲取貸款趨勢數據失敗')
  } finally {
    loanChartLoading.value = false
  }
}

const fetchLeaveDistributionData = async () => {
  leaveChartLoading.value = true
  try {
    const response = await axios.get('/api/leave/distribution', {
      params: { range: leaveTimeRange.value }
    })
    leaveChartData.value = response.data
  } catch (error) {
    console.error('獲取請假分布數據失敗:', error)
    ElMessage.error('獲取請假分布數據失敗')
  } finally {
    leaveChartLoading.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      fetchLoanStats(),
      fetchLeaveStats(),
      fetchLoanTrendData(),
      fetchLeaveDistributionData(),
      fetchNewEmployeeStats()
    ])
  } catch (error) {
    console.error('獲取數據失敗:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.overview-container {
  padding: 20px 0;
}

.stat-card {
  height: 120px;
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.stat-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.stat-header .el-icon {
  font-size: 20px;
  margin-right: 8px;
  color: #409EFF;
}

.stat-title {
  font-size: 16px;
  color: #606266;
}

.stat-content {
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.stat-footer {
  display: flex;
  justify-content: center;
}

.chart-row {
  margin-top: 20px;
}

.chart-card {
  margin-bottom: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-content {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chart {
  height: 100%;
  width: 100%;
}
@media (max-width: 768px) {
  .stat-card {
    height: 100px;
  }

  .stat-value {
    font-size: 24px;
  }

  .stat-title {
    font-size: 14px;
  }

  .chart-content {
    height: 250px;
  }
}

</style>