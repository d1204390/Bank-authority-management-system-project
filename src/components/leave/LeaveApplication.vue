<template>
  <el-card class="leave-application" :class="{ 'is-dark': isDark }">
    <!-- 功能區 -->
    <div class="function-area">
      <!-- 按鈕區 -->
      <div class="action-buttons">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-button
                type="primary"
                class="action-btn"
                :loading="submitting"
                @click="handleLeaveRequest"
            >
              <el-icon><Plus /></el-icon>
              申請請假
            </el-button>
          </el-col>
          <el-col :span="12">
            <el-button
                class="action-btn"
                @click="viewPersonalLeaveHistory"
            >
              <el-icon><Document /></el-icon>
              請假紀錄
            </el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 特休統計區 -->
      <div class="statistics-area">
        <template v-if="leaveInfo">
          <el-row :gutter="16">
            <el-col :span="12">
              <div class="stat-card">
                <h3 class="stat-title">剩餘特休</h3>
                <p class="stat-value">{{ leaveInfo.remainingDays }} 天</p>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="stat-card">
                <h3 class="stat-title">已用特休</h3>
                <p class="stat-value">{{ leaveInfo.usedDays }} 天</p>
              </div>
            </el-col>
          </el-row>
        </template>
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
          ref="leaveFormRef"
          :model="leaveForm"
          :rules="leaveRules"
          label-width="100px"
          class="leave-form"
      >
        <!-- 請假類型 -->
        <el-form-item label="請假類型" prop="type">
          <el-select
              v-model="leaveForm.type"
              placeholder="請選擇"
              class="form-select"
          >
            <el-option
                v-for="(text, type) in leaveTypes"
                :key="type"
                :label="text"
                :value="type"
            />
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
              :disabled-date="disabledDate"
              class="form-date-picker"
          />
        </el-form-item>
        <el-form-item label="開始時間" prop="startTime">
          <el-select
              v-model="leaveForm.startTime"
              placeholder="選擇開始時間"
              :disabled="!leaveForm.startDate"
              class="form-select"
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
              :disabled-date="disabledEndDate"
              class="form-date-picker"
          />
        </el-form-item>
        <el-form-item label="結束時間" prop="endTime">
          <el-select
              v-model="leaveForm.endTime"
              placeholder="選擇結束時間"
              :disabled="!leaveForm.startDate || !leaveForm.endDate"
              class="form-select"
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
              resize="none"
          />
        </el-form-item>

        <!-- 請假時數提示 -->
        <div v-if="leaveDuration" class="duration-info">
          請假時數：{{ leaveDuration }}
        </div>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="leaveDialog.visible = false">取消</el-button>
          <el-button
              type="primary"
              :loading="submitting"
              @click="submitLeaveRequest"
          >
            提交申請
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 請假紀錄對話框 -->
    <el-dialog
        v-model="historyDialog.visible"
        title="請假紀錄"
        width="90%"
        destroy-on-close
        class="history-dialog"
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
            <template #default="{ row }">
              {{ leaveTypes[row.leaveType] }}
            </template>
          </el-table-column>
          <el-table-column
              prop="duration"
              label="時數"
              width="100"
              align="center"
          >
            <template #default="{ row }">
              {{ row.formattedDuration }}
            </template>
          </el-table-column>
          <el-table-column
              prop="status"
              label="狀態"
              width="100"
              align="center"
          >
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">
                {{ statusTypes[row.status] }}
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
              label="審核意見"
              min-width="200"
              show-overflow-tooltip
          >
            <template #default="{ row }">
              <template v-if="row.approvalChain?.length">
                <div class="approval-info">
                  {{ row.approvalChain[row.approvalChain.length - 1].comment }}
                  <el-tooltip
                      effect="dark"
                      placement="top"
                  >
                    <template #content>
                      <div>審核主管: {{ row.approvalChain[row.approvalChain.length - 1].approverName }}</div>
                      <div>審核時間: {{ row.approvalChain[row.approvalChain.length - 1].timestamp }}</div>
                      <div>審核結果: {{ statusTypes[row.approvalChain[row.approvalChain.length - 1].status] }}</div>
                    </template>
                    <el-icon class="info-icon"><InfoFilled /></el-icon>
                  </el-tooltip>
                </div>
              </template>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column
              label="操作"
              width="120"
              fixed="right"
          >
            <template #default="{ row }">
              <el-button
                  v-if="row.status === 'pending'"
                  type="danger"
                  size="small"
                  @click="handleCancelRequest(row)"
              >
                撤回申請
              </el-button>
              <span
                  v-else-if="row.status === 'cancelled'"
                  class="cancelled-text"
              >
                已於 {{ row.cancelledAt }} 撤回
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
import { InfoFilled, Plus, Document } from '@element-plus/icons-vue'
import axios from 'axios'

// 常量定義
const WORK_HOURS = {
  START: '08:00',
  END: '17:00',
  LUNCH_START: '12:00',
  LUNCH_END: '13:00'
}

const leaveTypes = {
  annual: '特休',
  personal: '事假',
  sick: '病假',
  funeral: '喪假',
  marriage: '婚假',
  maternity: '產假'
}

const statusTypes = {
  pending: '待審核',
  approved: '已核准',
  rejected: '已駁回',
  cancelled: '已撤回'
}

const statusStyles = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'info'
}

// 響應式狀態
const isDark = ref(false)
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

// 計算屬性
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

// 方法定義
const generateTimeOptions = (startTime = WORK_HOURS.START) => {
  const times = []
  let currentTime = startTime

  while (currentTime <= WORK_HOURS.END) {
    if (!(currentTime >= WORK_HOURS.LUNCH_START && currentTime < WORK_HOURS.LUNCH_END)) {
      times.push(currentTime)
    }

    const [hours, minutes] = currentTime.split(':').map(Number)
    let newMinutes = minutes + 30
    let newHours = hours

    if (newMinutes >= 60) {
      newMinutes = 0
      newHours += 1
    }

    currentTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`
  }

  return times
}

const initializeData = async () => {
  try {
    const [leaveInfoRes, timeOptionsRes] = await Promise.all([
      axios.get('/api/leave/annual-leave/remaining'),
      axios.get('/api/leave/time-options', {
        params: { date: new Date().toISOString().split('T')[0] }
      })
    ])

    if (leaveInfoRes.data) {
      leaveInfo.value = {
        remainingDays: Number(leaveInfoRes.data.remainingDays).toFixed(1),
        usedDays: Number(leaveInfoRes.data.usedDays).toFixed(1),
        totalDays: leaveInfoRes.data.totalDays,
        year: leaveInfoRes.data.year
      }
    }

    if (timeOptionsRes.data?.timeOptions) {
      timeOptions.value = timeOptionsRes.data.timeOptions
    }
  } catch (error) {
    console.error('初始化數據失敗:', error)
    ElMessage.error(error.response?.data?.msg || '獲取數據失敗，請稍後再試')
  }
}

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

const viewPersonalLeaveHistory = async () => {
  historyDialog.value.currentPage = 1
  await fetchLeaveHistory()
  historyDialog.value.visible = true
}

const fetchLeaveHistory = async () => {
  try {
    const params = {
      page: historyDialog.value.currentPage,
      limit: historyDialog.value.pageSize,
      self: 'true'
    }

    const response = await axios.get('/api/leave/list', { params })

    if (response.data?.leaves) {
      leaveHistory.value = response.data.leaves
      historyDialog.value.total = response.data.pagination.total
    }
  } catch (error) {
    console.error('獲取請假紀錄失敗:', error)
    ElMessage.error('獲取紀錄失敗，請稍後再試')
  }
}

const handlePageChange = (page) => {
  historyDialog.value.currentPage = page
  fetchLeaveHistory()
}

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
    await Promise.all([
      fetchLeaveHistory(),
      initializeData()
    ])
  } catch (error) {
    console.error('提交請假申請失敗:', error)
    ElMessage.error(error.response?.data?.msg || '提交失敗，請稍後再試')
  } finally {
    submitting.value = false
  }
}

const getStatusType = (status) => {
  return statusStyles[status] || ''
}

const disabledDate = (date) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

const disabledEndDate = (date) => {
  if (!leaveForm.value.startDate) return false
  const startDate = new Date(leaveForm.value.startDate)
  startDate.setHours(0, 0, 0, 0)
  return date < startDate
}

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
    await Promise.all([
      fetchLeaveHistory(),
      initializeData()
    ])
  } catch (error) {
    if (error !== 'cancel') {
      console.error('撤回請假申請失敗:', error)
      ElMessage.error(error.response?.data?.msg || '撤回失敗，請稍後再試')
    }
  }
}

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

// 監聽表單變更
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

.function-area {
  padding: 1.25rem;
}

.action-buttons {
  margin-bottom: 1.5rem;
}

.action-btn {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.statistics-area {
  margin-top: 1.5rem;
}

.stat-card {
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 1.25rem;
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-title {
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.stat-value {
  color: #0f172a;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.form-select,
.form-date-picker {
  width: 100%;
}

.duration-info {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #f8fafc;
  border-radius: 6px;
  text-align: center;
  font-weight: 500;
  color: #0f172a;
}

.history-dialog {
  min-width: 320px;
}

.table-container {
  margin-bottom: 1rem;
}

.info-icon {
  margin-left: 4px;
  color: #909399;
  cursor: help;
}

.approval-info {
  display: flex;
  align-items: center;
}

.cancelled-text {
  color: #909399;
  font-size: 0.875rem;
}

.pagination-container {
  margin-top: 1rem;
  padding-top: 1rem;
  text-align: right;
  border-top: 1px solid #e5e7eb;
}

/* 響應式設計 */
@media screen and (max-width: 768px) {
  .function-area {
    padding: 1rem;
  }

  .action-btn {
    height: 36px;
    font-size: 0.875rem;
  }

  .stat-value {
    font-size: 1.25rem;
  }

  :deep(.el-table) {
    font-size: 0.875rem;
  }
}

/* 暗色主題 */
.is-dark {
  .stat-card {
    background-color: #334155;
  }

  .stat-title {
    color: #94a3b8;
  }

  .stat-value,
  .duration-info {
    color: #f1f5f9;
  }

  .duration-info {
    background-color: #334155;
  }
}
</style>