<template>
  <el-card class="leave-application">
    <!-- 功能區 -->
    <div class="function-content">
      <div class="leave-actions">
        <el-row :gutter="10">
          <!-- 請假申請按鈕 -->
          <el-col :span="12">
            <el-button type="primary" @click="handleLeaveRequest">
              申請請假
            </el-button>
          </el-col>

          <!-- 請假紀錄按鈕 -->
          <el-col :span="12">
            <el-button @click="viewPersonalLeaveHistory">
              請假紀錄
            </el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 請假統計 -->
      <div class="leave-summary">
        <el-row v-if="leaveInfo">
          <el-col :span="12">
            <p>剩餘特休：{{ leaveInfo.remainingDays }} 天</p>
          </el-col>
          <el-col :span="12">
            <p>已用特休：{{ leaveInfo.usedDays }} 天</p>
          </el-col>
        </el-row>
        <el-row v-else>
          <el-col :span="24">
            <div class="loading-placeholder">
              <el-skeleton :rows="2" />
            </div>
          </el-col>
        </el-row>
      </div>
    </div>

    <!-- 請假申請對話框 -->
    <el-dialog
        v-model="leaveDialog.visible"
        title="請假申請"
        width="500px"
        destroy-on-close
    >
      <el-form
          :model="leaveForm"
          :rules="leaveRules"
          ref="leaveFormRef"
          label-width="100px"
          class="leave-form"
      >
        <!-- 請假類型 -->
        <el-form-item label="請假類型" prop="type">
          <el-select v-model="leaveForm.type" placeholder="請選擇" class="w-full">
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
              class="w-full"
          />
        </el-form-item>
        <el-form-item label="開始時間" prop="startTime">
          <el-select
              v-model="leaveForm.startTime"
              placeholder="選擇開始時間"
              :disabled="!leaveForm.startDate"
              class="w-full"
          >
            <el-option
                v-for="time in timeOptions"
                :key="time"
                :label="time"
                :value="time"
            />
          </el-select>
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
              class="w-full"
          />
        </el-form-item>
        <el-form-item label="結束時間" prop="endTime">
          <el-select
              v-model="leaveForm.endTime"
              placeholder="選擇結束時間"
              :disabled="!leaveForm.startDate || !leaveForm.endDate"
              class="w-full"
          >
            <el-option
                v-for="time in endTimeOptions"
                :key="time"
                :label="time"
                :value="time"
            />
          </el-select>
        </el-form-item>

        <!-- 請假原因 -->
        <el-form-item label="請假原因" prop="reason">
          <el-input
              v-model="leaveForm.reason"
              type="textarea"
              rows="3"
              placeholder="請填寫請假原因"
          />
        </el-form-item>

        <!-- 請假時數顯示 -->
        <div v-if="leaveDuration" class="leave-duration">
          請假時數：{{ leaveDuration }}
        </div>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="leaveDialog.visible = false">取消</el-button>
          <el-button
              type="primary"
              @click="submitLeaveRequest"
              :loading="submitting"
          >
            提交申請
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 請假紀錄對話框 -->
    <el-dialog
        v-model="historyDialog.visible"
        title="請假紀錄"
        width="90%"
        :max-width="1200"
        destroy-on-close
        class="leave-history-dialog"
    >
      <div class="table-container">
        <el-table
            :data="leaveHistory"
            style="width: 100%"
            :default-sort="{ prop: 'createdAt', order: 'descending' }"
        >
          <el-table-column
              prop="createdAt"
              label="申請時間"
              width="160"
              fixed="left"
          />
          <el-table-column
              prop="startDate"
              label="開始時間"
              width="160"
              fixed="left"
          />
          <el-table-column
              prop="endDate"
              label="結束時間"
              width="160"
          />
          <el-table-column
              prop="leaveType"
              label="類型"
              width="100"
          >
            <template #default="scope">
              {{ getLeaveTypeText(scope.row.leaveType) }}
            </template>
          </el-table-column>
          <el-table-column
              prop="duration"
              label="時數"
              width="100"
              align="center"
          >
            <template #default="scope">
              {{ scope.row.formattedDuration }}
            </template>
          </el-table-column>
          <el-table-column
              prop="status"
              label="狀態"
              width="100"
              align="center"
          >
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
              prop="reason"
              label="原因"
              min-width="200"
              show-overflow-tooltip
          />
          <el-table-column
              label="操作"
              width="120"
              fixed="right"
          >
            <template #default="scope">
              <el-button
                  v-if="scope.row.status === 'pending'"
                  type="danger"
                  size="small"
                  @click="handleCancelRequest(scope.row)"
              >
                撤回申請
              </el-button>
              <span
                  v-else-if="scope.row.status === 'cancelled'"
                  class="text-gray"
              >
                已於 {{ scope.row.cancelledAt }} 撤回
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分頁控制 -->
      <div class="pagination-container">
        <el-pagination
            v-model:current-page="historyDialog.currentPage"
            v-model:page-size="historyDialog.pageSize"
            :total="historyDialog.total"
            @current-change="handlePageChange"
            layout="total, prev, pager, next"
        />
      </div>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

// 工作時間常數
const WORK_HOURS = {
  START: '08:00',
  END: '17:00',
  LUNCH_START: '12:00',
  LUNCH_END: '13:00'
}

// 響應式數據
const leaveInfo = ref(null)
const leaveHistory = ref([])
const submitting = ref(false)
const leaveFormRef = ref(null)
const timeOptions = ref([])
const leaveDuration = ref('')

// 對話框控制
const leaveDialog = ref({ visible: false })
const historyDialog = ref({
  visible: false,
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 表單數據
const leaveForm = ref({
  type: '',
  startDate: null,
  startTime: WORK_HOURS.START,
  endDate: null,
  endTime: WORK_HOURS.END,
  reason: ''
})

// 生成時間選項
const generateTimeOptions = (startTime = WORK_HOURS.START) => {
  const times = [];
  let currentTime = startTime;

  while (currentTime <= WORK_HOURS.END) {
    if (!(currentTime >= WORK_HOURS.LUNCH_START && currentTime < WORK_HOURS.LUNCH_END)) {
      times.push(currentTime);
    }

    const [hours, minutes] = currentTime.split(':').map(Number);
    let newMinutes = minutes + 30;
    let newHours = hours;

    if (newMinutes >= 60) {
      newMinutes = 0;
      newHours += 1;
    }

    currentTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  }

  return times;
};

// 計算可選的結束時間選項
const endTimeOptions = computed(() => {
  if (!leaveForm.value.startDate || !leaveForm.value.endDate) {
    return generateTimeOptions()
  }

  if (leaveForm.value.startDate === leaveForm.value.endDate) {
    return generateTimeOptions(leaveForm.value.startTime)
  }

  return generateTimeOptions()
})

// 表單驗證規則
const leaveRules = {
  type: [{ required: true, message: '請選擇請假類型', trigger: 'change' }],
  startDate: [{ required: true, message: '請選擇開始日期', trigger: 'change' }],
  startTime: [{ required: true, message: '請選擇開始時間', trigger: 'change' }],
  endDate: [{
    required: true,
    trigger: 'change',
    validator: (rule, value, callback) => {
      if (!value) {
        callback(new Error('請選擇結束日期'))
      } else if (value < leaveForm.value.startDate) {
        callback(new Error('結束日期必須晚於或等於開始日期'))
      } else {
        callback()
      }
    }
  }],
  endTime: [{
    required: true,
    trigger: 'change',
    validator: (rule, value, callback) => {
      if (!value) {
        callback(new Error('請選擇結束時間'))
      } else if (
          leaveForm.value.startDate === leaveForm.value.endDate &&
          value <= leaveForm.value.startTime
      ) {
        callback(new Error('結束時間必須晚於開始時間'))
      } else {
        callback()
      }
    }
  }],
  reason: [{ required: true, message: '請填寫請假原因', trigger: 'blur' }]
}

// 初始化數據
const initializeData = async () => {
  try {
    const leaveInfoResponse = await axios.get('/api/leave/annual-leave/remaining');

    if (leaveInfoResponse.data) {
      leaveInfo.value = {
        remainingDays: Number(leaveInfoResponse.data.remainingDays).toFixed(1),
        usedDays: Number(leaveInfoResponse.data.usedDays).toFixed(1),
        totalDays: leaveInfoResponse.data.totalDays,
        year: leaveInfoResponse.data.year
      };
    }

    const timeOptionsResponse = await axios.get('/api/leave/time-options', {
      params: { date: new Date().toISOString().split('T')[0] }
    });

    if (timeOptionsResponse.data && timeOptionsResponse.data.timeOptions) {
      timeOptions.value = timeOptionsResponse.data.timeOptions;
    }

  } catch (error) {
    console.error('初始化數據失敗:', error);
    ElMessage.error(error.response?.data?.msg || '獲取數據失敗，請稍後再試');
  }
};

// 請假申請處理
const handleLeaveRequest = () => {
  leaveForm.value = {
    type: '',
    startDate: null,
    startTime: WORK_HOURS.START,
    endDate: null,
    endTime: WORK_HOURS.END,
    reason: ''
  }
  leaveDuration.value = ''
  leaveDialog.value.visible = true
}

// 查看請假紀錄
const viewPersonalLeaveHistory = async () => {
  historyDialog.value.currentPage = 1
  await fetchLeaveHistory()
  historyDialog.value.visible = true
}

// 獲取請假紀錄
const fetchLeaveHistory = async () => {
  try {
    const params = {
      page: historyDialog.value.currentPage,
      limit: historyDialog.value.pageSize,
      self: 'true'
    }

    const response = await axios.get('/api/leave/list', { params })

    if (response.data && Array.isArray(response.data.leaves)) {
      leaveHistory.value = response.data.leaves
      historyDialog.value.total = response.data.pagination.total
    }
  } catch (error) {
    console.error('獲取請假紀錄失敗:', error)
    ElMessage.error('獲取紀錄失敗，請稍後再試')
  }
}

// 處理分頁變更
const handlePageChange = (page) => {
  historyDialog.value.currentPage = page
  fetchLeaveHistory()
}

// 提交請假申請
const submitLeaveRequest = async () => {
  if (!leaveFormRef.value) return

  try {
    await leaveFormRef.value.validate()
    submitting.value = true

    const startDateTime = `${leaveForm.value.startDate}T${leaveForm.value.startTime}:00`
    const endDateTime = `${leaveForm.value.endDate}T${leaveForm.value.endTime}:00`

    const response = await axios.post('/api/leave/apply', {
      leaveType: leaveForm.value.type,
      startDate: startDateTime,
      endDate: endDateTime,
      reason: leaveForm.value.reason
    })

    ElMessage.success(response.data.msg)
    leaveDialog.value.visible = false
    await fetchLeaveHistory()
  } catch (error) {
    console.error('提交請假申請失敗:', error)
    ElMessage.error(error.response?.data?.msg || '提交失敗，請稍後再試')
  } finally {
    submitting.value = false
  }
}

// 工具函數
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
    cancelled: '已撤回'
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
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

const disabledEndDate = (date) => {
  if (!leaveForm.value.startDate) {
    return false
  }
  const startDate = new Date(leaveForm.value.startDate)
  startDate.setHours(0, 0, 0, 0)
  return date < startDate
}

// 處理撤回申請
const handleCancelRequest = async (leave) => {
  try {
    await ElMessageBox.confirm(
        '確定要撤回這筆請假申請嗎？',
        '撤回確認',
        {
          confirmButtonText: '確定撤回',
          cancelButtonText: '取消',
          type: 'warning'
        }
    )

    await axios.post(`/api/leave/cancel/${leave._id}`)
    ElMessage.success('請假申請已撤回')
    await fetchLeaveHistory()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('撤回請假申請失敗:', error)
      ElMessage.error(error.response?.data?.msg || '撤回失敗，請稍後再試')
    }
  }
}

// 更新請假時數
const updateLeaveDuration = async () => {
  if (!leaveForm.value.startDate || !leaveForm.value.startTime ||
      !leaveForm.value.endDate || !leaveForm.value.endTime) {
    leaveDuration.value = ''
    return
  }

  try {
    const startDateTime = `${leaveForm.value.startDate}T${leaveForm.value.startTime}:00`
    const endDateTime = `${leaveForm.value.endDate}T${leaveForm.value.endTime}:00`

    const response = await axios.get('/api/leave/calculate-duration', {
      params: {
        startDate: startDateTime,
        endDate: endDateTime
      }
    })

    leaveDuration.value = response.data.formattedDuration
  } catch (error) {
    console.error('計算請假時數失敗:', error)
    leaveDuration.value = '計算錯誤'
  }
}

// 監聽表單變更以更新時數
watch(
    () => [
      leaveForm.value.startDate,
      leaveForm.value.startTime,
      leaveForm.value.endDate,
      leaveForm.value.endTime
    ],
    () => {
      updateLeaveDuration()
    }
)

// 組件掛載時初始化
onMounted(async () => {
  await initializeData()
  timeOptions.value = generateTimeOptions()
})
</script>

<style scoped>
.leave-application {
  height: 100%;
}

.leave-history-dialog {
  min-width: 320px;
}

.function-content {
  margin-bottom: 20px;
}

.leave-actions {
  margin-bottom: 15px;
}

.leave-summary {
  margin-top: 15px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.leave-summary p {
  margin: 5px 0;
  color: #606266;
  font-size: 14px;
}

.leave-duration {
  margin-top: 15px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  color: #606266;
  text-align: center;
  font-weight: bold;
  font-size: 14px;
}

.loading-placeholder {
  padding: 10px;
}

.table-container {
  width: 100%;
  overflow-x: auto;
  margin-bottom: 16px;
}

:deep(.el-table) {
  margin-top: 10px;
  border-radius: 8px;
  overflow: hidden;
}

.pagination-container {
  margin-top: 20px;
  padding-top: 15px;
  text-align: right;
  border-top: 1px solid #ebeef5;
}

.text-gray {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 響應式設計 */
@media screen and (max-width: 768px) {
  :deep(.el-table) {
    font-size: 13px;
  }

  :deep(.el-button--small) {
    padding: 6px 12px;
    font-size: 12px;
  }

  :deep(.el-tag--small) {
    padding: 0 6px;
    font-size: 11px;
  }
}

/* 暗色主題適配 */
:deep([class*='--dark']) {
  .leave-summary,
  .leave-duration {
    background-color: #363637;
    color: #e5eaf3;
  }

  .text-gray {
    color: #a3a6ad;
  }
}
</style>