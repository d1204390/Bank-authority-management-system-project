<template>
  <el-card class="leave-management">
    <div class="function-header">
      <el-icon><Calendar /></el-icon>
      <span>請假管理</span>
    </div>

    <!-- 共通功能區 -->
    <div class="function-content">
      <div class="leave-actions">
        <el-row :gutter="10">
          <!-- 科員請假申請 -->
          <el-col :span="12" v-if="isStaff">
            <el-button type="primary" @click="handleLeaveRequest">
              申請請假
            </el-button>
          </el-col>

          <!-- 主管審核按鈕 -->
          <el-col :span="12" v-if="isSupervisor">
            <el-button type="warning" @click="handlePendingApprovals">
              待審核
              <el-badge v-if="pendingCount > 0" :value="pendingCount" />
            </el-button>
          </el-col>

          <!-- 請假紀錄 -->
          <el-col :span="12">
            <el-button @click="viewLeaveHistory">
              請假紀錄
            </el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 請假統計 -->
      <div class="leave-summary" v-if="leaveInfo">
        <el-row>
          <el-col :span="12">
            <p>剩餘特休：{{ leaveInfo.remainingDays }} 天</p>
          </el-col>
          <el-col :span="12">
            <p>已用特休：{{ leaveInfo.usedDays }} 天</p>
          </el-col>
        </el-row>
      </div>
    </div>

    <!-- 請假申請對話框 -->
    <el-dialog v-model="leaveDialog.visible" title="請假申請" width="500px">
      <el-form :model="leaveForm" :rules="leaveRules" ref="leaveFormRef" label-width="100px">
        <el-form-item label="請假類型" prop="type">
          <el-select v-model="leaveForm.type" placeholder="請選擇">
            <el-option label="特休" value="annual" />
            <el-option label="事假" value="personal" />
            <el-option label="病假" value="sick" />
            <el-option label="喪假" value="funeral" />
            <el-option label="婚假" value="marriage" />
            <el-option label="產假" value="maternity" />
          </el-select>
        </el-form-item>

        <!-- 開始時間 -->
        <el-form-item label="開始日期" prop="startDate">
          <el-date-picker
              v-model="leaveForm.startDate"
              type="date"
              placeholder="選擇開始日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              :disabledDate="disabledDate"
          />
        </el-form-item>
        <el-form-item label="開始時間" prop="startTime">
          <el-time-select
              v-model="leaveForm.startTime"
              start="00:00"
              step="00:30"
              end="23:30"
              placeholder="選擇開始時間"
          />
        </el-form-item>

        <!-- 結束時間 -->
        <el-form-item label="結束日期" prop="endDate">
          <el-date-picker
              v-model="leaveForm.endDate"
              type="date"
              placeholder="選擇結束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              :disabled="!leaveForm.startDate"
              :disabledDate="disabledEndDate"
          />
        </el-form-item>
        <el-form-item label="結束時間" prop="endTime">
          <el-time-select
              v-model="leaveForm.endTime"
              start="00:00"
              step="00:30"
              end="23:30"
              placeholder="選擇結束時間"
              :disabled="!leaveForm.startDate || !leaveForm.endDate"
              :min-time="getMinEndTime"
          />
        </el-form-item>

        <el-form-item label="請假原因" prop="reason">
          <el-input
              v-model="leaveForm.reason"
              type="textarea"
              rows="3"
              placeholder="請填寫請假原因"
          />
        </el-form-item>

        <div class="leave-duration" v-if="leaveForm.startDate && leaveForm.startTime && leaveForm.endDate && leaveForm.endTime">
          請假時數：{{ calculateDuration() }}
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="leaveDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="submitLeaveRequest" :loading="submitting">
            提交申請
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 審核歷史表格 -->
    <el-dialog v-model="historyDialog.visible" title="請假紀錄" width="800px">
      <el-table :data="leaveHistory" style="width: 100%">
        <el-table-column prop="startDate" label="開始時間" width="150">
          <template #default="scope">
            {{ formatDateTime(scope.row.startDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="endDate" label="結束時間" width="150">
          <template #default="scope">
            {{ formatDateTime(scope.row.endDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="leaveType" label="類型" width="100">
          <template #default="scope">
            {{ getLeaveTypeText(scope.row.leaveType) }}
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="時數" width="80">
          <template #default="scope">
            {{ scope.row.duration }}小時
          </template>
        </el-table-column>
        <el-table-column prop="status" label="狀態" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="原因" />
      </el-table>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted, defineProps } from 'vue'
import { Calendar } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const props = defineProps({
  department: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  }
})

// 計算屬性
const isStaff = computed(() => props.position === 'C')
const isSupervisor = computed(() => props.position === 'S')

// 響應式數據
const leaveInfo = ref(null)
const leaveHistory = ref([])
const pendingCount = ref(0)
const submitting = ref(false)

// 對話框控制
const leaveDialog = ref({ visible: false })
const historyDialog = ref({ visible: false })
const leaveFormRef = ref(null)

// 表單數據
const leaveForm = ref({
  type: '',
  startDate: null,
  startTime: null,
  endDate: null,
  endTime: null,
  reason: ''
})

// 取得最小結束時間
const getMinEndTime = computed(() => {
  if (leaveForm.value.startDate === leaveForm.value.endDate) {
    return leaveForm.value.startTime
  }
  return undefined
})

// 表單驗證規則
const leaveRules = {
  type: [{ required: true, message: '請選擇請假類型', trigger: 'change' }],
  startDate: [{ required: true, message: '請選擇開始日期', trigger: 'change' }],
  startTime: [{ required: true, message: '請選擇開始時間', trigger: 'change' }],
  endDate: [{
    required: true,
    message: '請選擇結束日期',
    trigger: 'change',
    validator: (rule, value, callback) => {
      if (!value) {
        callback(new Error('請選擇結束日期'));
      } else if (value < leaveForm.value.startDate) {
        callback(new Error('結束日期必須晚於或等於開始日期'));
      } else {
        callback();
      }
    }
  }],
  endTime: [{
    required: true,
    message: '請選擇結束時間',
    trigger: 'change',
    validator: (rule, value, callback) => {
      if (!value) {
        callback(new Error('請選擇結束時間'));
      } else if (
          leaveForm.value.startDate === leaveForm.value.endDate &&
          value <= leaveForm.value.startTime
      ) {
        callback(new Error('結束時間必須晚於開始時間'));
      } else {
        callback();
      }
    }
  }],
  reason: [{ required: true, message: '請填寫請假原因', trigger: 'blur' }]
}

// 計算請假時數
const calculateRawDuration = () => {
  if (!leaveForm.value.startDate || !leaveForm.value.startTime ||
      !leaveForm.value.endDate || !leaveForm.value.endTime) return 0

  const start = new Date(`${leaveForm.value.startDate}T${leaveForm.value.startTime}`)
  const end = new Date(`${leaveForm.value.endDate}T${leaveForm.value.endTime}`)
  const diffHours = (end - start) / (1000 * 60 * 60)
  return Math.round(diffHours * 100) / 100
}

// 計算用於顯示的請假時數（包含格式化）
const calculateDuration = () => {
  const totalHours = calculateRawDuration()

  // 如果超過24小時，計算天數和剩餘小時數
  if (totalHours > 24) {
    const days = Math.floor(totalHours / 24)
    const remainingHours = Math.round((totalHours % 24) * 100) / 100
    return `${totalHours}小時 (${days}天${remainingHours}小時)`
  }

  return `${totalHours}小時`
}

// 初始化數據
const initializeData = async () => {
  try {
    const response = await axios.get('/api/leave/annual-leave/remaining')
    leaveInfo.value = response.data

    if (isSupervisor.value) {
      const pendingResponse = await axios.get('/api/leave/list?status=pending')
      pendingCount.value = pendingResponse.data.length
    }
  } catch (error) {
    console.error('初始化數據失敗:', error)
    ElMessage.error('獲取數據失敗，請稍後再試')
  }
}

// 請假申請處理
const handleLeaveRequest = () => {
  leaveForm.value = {
    type: '',
    startDate: null,
    startTime: null,
    endDate: null,
    endTime: null,
    reason: ''
  }
  leaveDialog.value.visible = true
}

// 處理待審核申請
const handlePendingApprovals = () => {
  // 實作待審核功能
}

const submitLeaveRequest = async () => {
  if (!leaveFormRef.value) return;

  try {
    await leaveFormRef.value.validate();
    submitting.value = true;

    // 組合日期和時間
    const startDateTime = `${leaveForm.value.startDate}T${leaveForm.value.startTime}:00`
    const endDateTime = `${leaveForm.value.endDate}T${leaveForm.value.endTime}:00`

    await axios.post('/api/leave/apply', {
      leaveType: leaveForm.value.type,
      startDate: startDateTime,
      endDate: endDateTime,
      duration: calculateRawDuration(), // 使用純數字的時數
      reason: leaveForm.value.reason
    });

    ElMessage.success('請假申請已提交');
    leaveDialog.value.visible = false;
    await initializeData();
  } catch (error) {
    console.error('提交請假申請失敗:', error);
    ElMessage.error(error.response?.data?.msg || '提交失敗，請稍後再試');
  } finally {
    submitting.value = false;
  }
};

// 查看請假紀錄
const viewLeaveHistory = async () => {
  try {
    const response = await axios.get('/api/leave/list')
    leaveHistory.value = response.data
    historyDialog.value.visible = true
  } catch (error) {
    console.error('獲取請假紀錄失敗:', error)
    ElMessage.error('獲取紀錄失敗，請稍後再試')
  }
}

// 工具函數
const formatDateTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateStr);
      return 'Invalid Date';
    }

    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(/\//g, '-');
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
};

const getLeaveTypeText = (type) => {
  const types = {
    annual: '特休',
    personal: '事假',
    sick: '病假',
    funeral: '喪假',
    marriage: '婚假',
    maternity: '產假'
  }
  return types[type] || type
}

const getStatusText = (status) => {
  const statusMap = {
    pending: '待審核',
    approved: '已核准',
    rejected: '已駁回',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

const getStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    cancelled: 'info'
  }
  return typeMap[status] || ''
}

// 日期限制函數
const disabledDate = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

// 結束時間限制函數
const disabledEndDate = (date) => {
  if (!leaveForm.value.startDate) {
    return false;
  }
  const startDate = new Date(leaveForm.value.startDate);
  startDate.setHours(0, 0, 0, 0);
  return date < startDate;
}

// 組件掛載時初始化
onMounted(() => {
  initializeData()
})
</script>

<style scoped>
.leave-management {
  height: 100%;
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

.leave-actions {
  margin-bottom: 15px;
}

.leave-summary {
  margin-top: 15px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.leave-summary p {
  margin: 5px 0;
  color: #606266;
}

.leave-duration {
  margin-top: 15px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
  color: #606266;
  text-align: center;
}

:deep(.el-badge__content.el-badge__content--danger) {
  background-color: #F56C6C;
}

/* 新增樣式：調整時間選擇器的寬度 */
:deep(.el-time-select) {
  width: 100%;
}

:deep(.el-date-picker) {
  width: 100%;
}
</style>