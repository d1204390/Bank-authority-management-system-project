<template>
  <div class="calendar-container">
    <!-- 日曆頭部 -->
    <div class="calendar-header">
      <el-row :gutter="20" align="middle">
        <el-col :span="12">
          <div class="title-container">
            <h2 class="calendar-title">
              {{ department ? `${departmentMap[department]}請假日曆` : '部門請假日曆' }}
            </h2>
            <span class="calendar-subtitle">檢視與管理同仁請假</span>
          </div>
        </el-col>
        <el-col :span="12" class="header-controls">
          <div class="status-legend">
            <el-tag type="warning" size="small" effect="dark">待審核</el-tag>
            <el-tag type="success" size="small" effect="dark">已核准</el-tag>
            <el-tag type="danger" size="small" effect="dark">已駁回</el-tag>
            <el-tag type="info" size="small" effect="dark">已撤回</el-tag>
          </div>
          <el-radio-group v-model="viewType" size="large">
            <el-radio-button label="月">月</el-radio-button>
            <el-radio-button label="週">週</el-radio-button>
          </el-radio-group>
        </el-col>
      </el-row>
    </div>



    <!-- 日曆主體 -->
    <div class="calendar-body">
      <el-card v-loading="loading" :body-style="{ padding: '0' }" shadow="never">
        <FullCalendar
            ref="fullCalendar"
            :options="calendarOptions"
            class="leave-calendar"
        />
      </el-card>
    </div>

    <!-- 請假詳情對話框 -->
    <el-dialog
        v-model="eventDialog.visible"
        :title="eventDialog.title"
        width="500px"
        destroy-on-close
        align-center
        :modal-append-to-body="true"
        :append-to-body="true"
        :close-on-click-modal="true"
        :lock-scroll="true"
        class="leave-detail-dialog"
    >
      <div class="event-details">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="申請人" label-class-name="label-item">
            {{ eventDialog.event?.extendedProps?.employeeName }}
          </el-descriptions-item>
          <el-descriptions-item label="請假類型" label-class-name="label-item">
            <el-tag :type="getLeaveTagType(eventDialog.event?.extendedProps?.leaveType)" size="small">
              {{ getLeaveTypeText(eventDialog.event?.extendedProps?.leaveType) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="開始時間" label-class-name="label-item">
            {{ formatDateTime(eventDialog.event?.start) }}
          </el-descriptions-item>
          <el-descriptions-item label="結束時間" label-class-name="label-item">
            {{ formatDateTime(eventDialog.event?.end) }}
          </el-descriptions-item>
          <el-descriptions-item label="請假時數" label-class-name="label-item">
            {{ eventDialog.event?.extendedProps?.formattedDuration }}
          </el-descriptions-item>
          <el-descriptions-item label="請假原因" label-class-name="label-item">
            {{ eventDialog.event?.extendedProps?.reason }}
          </el-descriptions-item>
          <el-descriptions-item label="狀態" label-class-name="label-item">
            <el-tag :type="getStatusType(eventDialog.event?.extendedProps?.status)" effect="light">
              {{ getStatusText(eventDialog.event?.extendedProps?.status) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button
              v-if="eventDialog.event?.extendedProps?.status === 'pending'"
              type="primary"
              @click="handleSwitchToApproval"
          >
            前往審核
          </el-button>
          <el-button @click="eventDialog.visible = false">關閉</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, defineEmits, nextTick, defineExpose } from 'vue'
import { ElMessage } from 'element-plus'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import zhTwLocale from '@fullcalendar/core/locales/zh-tw'
import axios from 'axios'

const emit = defineEmits(['switchToApproval'])

// 狀態管理
const loading = ref(false)
const leaveEvents = ref([])
const viewType = ref('月')
const fullCalendar = ref(null)
const userPosition = ref('')  // 添加用戶職位狀態

// 日曆事件對話框
const eventDialog = ref({
  visible: false,
  title: '請假詳情',
  event: null
})

// 監聽視圖類型變更
watch(viewType, (newValue) => {
  if (!fullCalendar.value) return

  const calendarApi = fullCalendar.value.getApi()
  const newView = newValue === '月' ? 'dayGridMonth' : 'timeGridWeek'

  calendarApi.changeView(newView)
  calendarApi.refetchEvents()
})


// 日曆配置
const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: {
    left: 'prev today next',
    center: 'title',
    right: ''
  },
  locale: zhTwLocale,
  events: leaveEvents.value.map(event => {
    const durationHours = parseFloat(event.extendedProps.formattedDuration.replace('小時', ''))
    return {
      ...event,
      backgroundColor: eventColors[event.extendedProps.status],
      borderColor: eventColors[event.extendedProps.status],
      display: durationHours <= 8 ? 'auto' : 'block'
    }
  }),
  eventClick: handleEventClick,
  eventContent: handleEventContent,
  slotMinTime: '09:00:00',
  slotMaxTime: '18:00:00',
  slotLabelFormat: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  },
  allDaySlot: false,
  weekends: true,
  editable: false,
  selectable: false,
  height: 'auto',
  dayMaxEvents: true,
  views: {
    timeGrid: {
      dayMaxEvents: 4
    },
    dayGrid: {
      dayMaxEvents: 4
    }
  },
  businessHours: {
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '18:00',
  }
}))

// 請假類型對照
const leaveTypeMap = {
  annual: '特休',
  personal: '事假',
  sick: '病假',
  funeral: '喪假',
  marriage: '婚假',
  maternity: '產假'
}

// 請假類型標籤顏色
const leaveTagTypeMap = {
  annual: 'success',
  personal: 'warning',
  sick: 'danger',
  funeral: 'info',
  marriage: 'success',
  maternity: 'warning'
}

// 狀態類型對照
const statusTypeMap = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'info'
}

// 狀態文字對照
const statusTextMap = {
  pending: '待審核',
  approved: '已核准',
  rejected: '已駁回',
  cancelled: '已撤回'
}

// 事件顏色對照
const eventColors = {
  pending: 'rgba(230, 162, 60, 0.85)',
  approved: 'rgba(103, 194, 58, 0.85)',
  rejected: 'rgba(245, 108, 108, 0.85)',
  cancelled: 'rgba(144, 147, 153, 0.85)'
}

// 工具函數
const getLeaveTypeText = (type) => leaveTypeMap[type] || type
const getLeaveTagType = (type) => leaveTagTypeMap[type] || ''
const getStatusType = (status) => statusTypeMap[status] || ''
const getStatusText = (status) => statusTextMap[status] || status

// 格式化日期時間
const formatDateTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

// 部門相關
const department = ref('')
const departmentMap = {
  'BD': '業務部',
  'FD': '消金部',
  'LD': '借貸部'
}

// 獲取當前用戶資訊
const getCurrentUserInfo = async () => {
  try {
    const response = await axios.get('/api/user/profile')
    department.value = response.data.department
    userPosition.value = response.data.position // 設置用戶職位
  } catch (error) {
    console.error('獲取用戶資訊失敗:', error)
    ElMessage.error('獲取用戶資訊失敗')
  }
}

// 處理事件內容渲染
const handleEventContent = (arg) => {
  const { event, view } = arg
  const durationHours = parseFloat(event.extendedProps.formattedDuration.replace('小時', ''))

  if (view.type === 'dayGridMonth' && durationHours <= 8) {
    return {
      html: `
        <div class="fc-daygrid-event-dot" style="border-color: ${event.backgroundColor}"></div>
        <div class="custom-event-content">
          <div class="event-title">
            <strong class="employee-name">${event.extendedProps.employeeName}</strong>
            <span class="leave-badge ${event.extendedProps.leaveType}">${getLeaveTypeText(event.extendedProps.leaveType)}</span>
          </div>
          <div class="event-time">${event.extendedProps.formattedDuration}</div>
        </div>
      `
    }
  }

  return {
    html: `
      <div class="custom-event-content">
        <div class="event-title">
          <strong class="employee-name">${event.extendedProps.employeeName}</strong>
          <span class="leave-badge ${event.extendedProps.leaveType}">${getLeaveTypeText(event.extendedProps.leaveType)}</span>
        </div>
        <div class="event-time">${event.extendedProps.formattedDuration}</div>
      </div>
    `
  }
}

// 處理事件點擊
const handleEventClick = (info) => {
  const closeButton = document.querySelector('.fc-popover .fc-popover-close')
  if (closeButton) {
    closeButton.click()
  }

  nextTick(() => {
    eventDialog.value.event = info.event
    eventDialog.value.visible = true
  })
}

// 處理跳轉至審核頁面
const handleSwitchToApproval = () => {
  if (eventDialog.value.event) {
    const leaveId = eventDialog.value.event.id
    eventDialog.value.visible = false
    emit('switchToApproval', leaveId)
  }
}

// 獲取請假記錄
const fetchLeaveEvents = async () => {
  loading.value = true
  try {
    // 根據職位選擇不同的 API
    const apiPath = userPosition.value === 'M'
        ? '/api/leave/manager/department-history'
        : '/api/leave/department-history'

    const response = await axios.get(apiPath, {
      params: {
        limit: 1000
      },
      _t: new Date().getTime()
    })

    leaveEvents.value = response.data.leaves.map(leave => {
      const durationHours = parseFloat(leave.formattedDuration.replace('小時', ''))

      return {
        id: leave._id,
        title: `${leave.employeeName} - ${getLeaveTypeText(leave.leaveType)}`,
        start: leave.startDate,
        end: leave.endDate,
        backgroundColor: eventColors[leave.status],
        borderColor: eventColors[leave.status],
        display: durationHours <= 8 ? 'auto' : 'block',
        extendedProps: {
          employeeName: leave.employeeName,
          leaveType: leave.leaveType,
          reason: leave.reason,
          status: leave.status,
          formattedDuration: leave.formattedDuration,
          durationHours
        }
      }
    })

    nextTick(() => {
      const calendarApi = fullCalendar.value?.getApi()
      if (calendarApi) {
        calendarApi.refetchEvents()
      }
    })
  } catch (error) {
    console.error('獲取請假記錄失敗:', error)
    ElMessage.error('獲取請假記錄失敗，請稍後再試')
  } finally {
    loading.value = false
  }
}

// 刷新日曆
const refreshCalendar = async () => {
  await fetchLeaveEvents()

  nextTick(() => {
    const calendarApi = fullCalendar.value?.getApi()
    if (calendarApi) {
      const view = calendarApi.view
      calendarApi.changeView(view.type)
      calendarApi.refetchEvents()
    }
  })
}

// 組件掛載時初始化
onMounted(async () => {  // 添加 async
  try {
    await getCurrentUserInfo()  // 等待用戶資訊獲取完成
    await fetchLeaveEvents()    // 再獲取請假記錄
  } catch (error) {
    console.error('初始化失敗:', error)
    ElMessage.error('初始化失敗，請稍後再試')
  }
})

// 暴露方法給父組件
defineExpose({
  fetchLeaveEvents,
  refreshCalendar
})
</script>

<style scoped>
.calendar-container {
  height: 100%;
  padding: 1.5rem;
  background-color: var(--el-bg-color);
  display: flex;
  flex-direction: column;
}

.calendar-body {
  flex: 1;
  min-height: 0;
  height: calc(100% - 5rem);
  border-radius: 8px;
  overflow: hidden;
}

.calendar-header {
  margin-bottom: 1.5rem;
}

.title-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.calendar-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.calendar-subtitle {
  color: var(--el-text-color-secondary);
  font-size: 0.875rem;
}

.header-controls {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap:2rem;
}

.leave-calendar {
  height: 100%;
  --fc-border-color: var(--el-border-color-lighter);
  --fc-today-bg-color: var(--el-color-primary-light-9);
}

:deep(.fc) {
  height: 100% !important;
  width: 100% !important;
  font-family: var(--el-font-family);
}

:deep(.fc-view-harness) {
  height: 100% !important;
  width: 100% !important;
  background: var(--el-bg-color);
}

:deep(.fc-scrollgrid-sync-table) {
  width: 100% !important;
}

:deep(.fc-daygrid-body) {
  width: 100% !important;
}

:deep(.fc-daygrid-body-balanced) {
  width: 100% !important;
}

:deep(.fc table) {
  width: 100% !important;
  table-layout: fixed;
}

:deep(.fc-col-header-cell),
:deep(.fc-daygrid-day) {
  width: calc(100% / 7) !important;
}

:deep(.fc-header-toolbar) {
  padding: 1rem 1.5rem;
  margin-bottom: 0 !important;
}

:deep(.fc-toolbar-title) {
  font-size: 1.25rem !important;
  font-weight: 600;
}

:deep(.fc-event) {
  cursor: pointer;
  border: none;
  border-radius: 4px;
  overflow: hidden;
  transition: transform 0.2s;
}

:deep(.fc-event:hover) {
  transform: translateY(-1px);
}

:deep(.label-item) {
  background-color: var(--el-fill-color-light) !important;
  min-width: 100px;
}

:deep(.el-tag) {
  border-radius: 4px;
}

.custom-event-content {
  padding: 0.5rem;
}

.event-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.employee-name {
  font-size: 0.875rem;
  color: #fff;
}

.leave-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.event-time {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.9);
}

/* 暗色主題適配 */
:deep([class*='--dark']) {
  .calendar-container {
    background-color: var(--el-bg-color-overlay);
  }

  .fc-view-harness {
    background-color: var(--el-bg-color-overlay);
  }

  .fc-toolbar-title,
  .fc-col-header-cell-cushion,
  .fc-daygrid-day-number {
    color: var(--el-text-color-primary);
  }

  .fc-button {
    background-color: var(--el-button-bg-color);
    border-color: var(--el-button-border-color);
    color: var(--el-button-text-color);
  }

  .fc-button:hover {
    background-color: var(--el-button-hover-bg-color);
    border-color: var(--el-button-hover-border-color);
    color: var(--el-button-hover-text-color);
  }

  .fc-button-active {
    background-color: var(--el-button-active-bg-color);
    border-color: var(--el-button-active-border-color);
    color: var(--el-button-active-text-color);
  }

  .fc-day-today {
    background-color: var(--el-color-primary-light-9) !important;
  }

  .fc-event {
    border-color: transparent;
  }

  .employee-name,
  .leave-badge,
  .event-time {
    color: var(--el-text-color-primary);
  }
}
:deep(.fc-daygrid-event-dot) {
  margin-right: 4px;
  border-width: 4px;
  border-style: solid;
  border-radius: 50%;
}
/* 行動裝置適配 */
@media screen and (max-width: 768px) {
  .calendar-container {
    padding: 1rem;
  }

  .calendar-title {
    font-size: 1.25rem;
  }

  .calendar-subtitle {
    font-size: 0.75rem;
  }

  :deep(.fc-header-toolbar) {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  :deep(.fc-toolbar-title) {
    font-size: 1rem !important;
  }

  :deep(.fc-button) {
    padding: 0.5rem !important;
    font-size: 0.875rem !important;
  }
}

/* 彈出層疊加順序管理 */
:deep(.el-dialog__wrapper) {
  z-index: 20001 !important;
}

:deep(.el-dialog) {
  z-index: 20001 !important;
}

:deep(.el-overlay) {
  z-index: 20000 !important;
}

:deep(.el-overlay-dialog) {
  z-index: 20000 !important;
}

:deep(.el-popper),
:deep(.el-select__popper),
:deep(.el-dropdown-menu) {
  z-index: 2000 !important;
}

:deep(.v-modal) {
  z-index: 19999 !important;
}
</style>