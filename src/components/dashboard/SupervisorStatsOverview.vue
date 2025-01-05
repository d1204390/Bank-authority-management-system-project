<template>
  <div class="stats-overview">
    <el-row :gutter="24">
      <!-- 待審核貸款卡片 -->
      <el-col :span="12" :xs="24">
        <el-card class="stats-card" shadow="hover" @click="navigateToPage('loans', 'review')">
          <div class="stats-content">
            <div class="stats-icon">
              <el-icon class="icon"><Document /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-title">待審核貸款</div>
              <div class="stats-value">{{ loanStats.pending }}</div>
              <div class="stats-tag">
                <el-tag
                    :type="loanStats.pending > 0 ? 'danger' : 'success'"
                    size="small"
                >
                  {{ loanStats.pending > 0 ? '需要處理' : '無待處理項目' }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 待審核請假卡片 -->
      <el-col :span="12" :xs="24">
        <el-card class="stats-card" shadow="hover" @click="navigateToPage('leave')">
          <div class="stats-content">
            <div class="stats-icon">
              <el-icon class="icon"><Calendar /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-title">待審核請假</div>
              <div class="stats-value">{{ leaveStats.pending }}</div>
              <div class="stats-tag">
                <el-tag
                    :type="leaveStats.pending > 0 ? 'danger' : 'success'"
                    size="small"
                >
                  {{ leaveStats.pending > 0 ? '需要處理' : '無待處理項目' }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 本月核准貸款卡片 -->
      <el-col :span="12" :xs="24">
        <el-card class="stats-card" shadow="hover" @click="navigateToPage('loans', 'history')">
          <div class="stats-content">
            <div class="stats-icon">
              <el-icon class="icon"><Check /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-title">本月核准貸款</div>
              <div class="stats-value">{{ loanStats.approved }}</div>
              <div class="stats-tag">
                <el-tag type="success" size="small">已核准</el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 本月請假統計卡片 -->
      <el-col :span="12" :xs="24">
        <el-card class="stats-card" shadow="hover" @click="navigateToPage('leave')">
          <div class="stats-content">
            <div class="stats-icon">
              <el-icon class="icon"><DataAnalysis /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-title">本月請假統計</div>
              <div class="stats-value">{{ leaveStats.total }}</div>
              <div class="stats-tag">
                <el-tag type="info" size="small">總計</el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted,defineEmits } from 'vue'
import { Document, Calendar, Check, DataAnalysis} from '@element-plus/icons-vue'
import axios from 'axios'
import {ElMessage} from 'element-plus'

const emit = defineEmits(['updateMenuItem'])

const loanStats = ref({
  pending: 0,
  approved: 0
})

const leaveStats = ref({
  pending: 0,
  total: 0
})

const navigateToPage = (page, tab = null) => {
  emit('updateMenuItem', page)
  if (tab) {
    emit('updateTab', tab)
  }
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

onMounted(async () => {
  try {
    await Promise.all([
      fetchLoanStats(),
      fetchLeaveStats()
    ])
  } catch (error) {
    console.error('獲取數據失敗:', error)
  }
})
</script>

<style scoped>
.stats-overview {
  padding: 20px;
}

.stats-card {
  height: 180px;
  margin-bottom: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.stats-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stats-content {
  display: flex;
  height: 100%;
  padding: 20px;
  align-items: center;
}

.stats-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background-color: var(--el-color-primary-light-9);
  margin-right: 24px;
}

.stats-icon .icon {
  font-size: 32px;
  color: var(--el-color-primary);
}

.stats-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.stats-title {
  font-size: 18px;
  color: var(--el-text-color-secondary);
  margin-bottom: 16px;
}

.stats-value {
  font-size: 36px;
  font-weight: bold;
  color: var(--el-text-color-primary);
  margin-bottom: 16px;
}

.stats-tag {
  margin-top: auto;
}

@media (max-width: 768px) {
  .stats-card {
    height: 160px;
  }

  .stats-icon {
    width: 56px;
    height: 56px;
  }

  .stats-icon .icon {
    font-size: 28px;
  }

  .stats-title {
    font-size: 16px;
  }

  .stats-value {
    font-size: 32px;
  }
}
</style>