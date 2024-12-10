<template>
  <div v-if="isLoggedIn">
    <div class="timer-container">
      <div class="timer" :class="{ 'warning': timeLeft <= 300 }">
        系統閒置時間：{{ formattedTime }}
      </div>
    </div>

    <!-- 警告對話框 -->
    <el-dialog
        v-model="showWarning"
        title="系統閒置警告"
        width="30%"
        :close-on-click-modal="false"
        :show-close="false"
    >
      <span>您的系統將在 {{ Math.ceil(timeLeft / 60) }} 分鐘後自動登出，請及時保存資料。</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="handleActivity">
            繼續操作
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 登出確認對話框 -->
    <el-dialog
        v-model="showLogoutDialog"
        title="系統通知"
        width="30%"
        :close-on-click-modal="false"
        :show-close="false"
    >
      <span>您因久未操作，所以自動登出。</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="confirmLogout">
            確認
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const timeLeft = ref(30 * 60) // 30分鐘，以秒為單位
const timer = ref(null)
const showWarning = ref(false)
const showLogoutDialog = ref(false)

// 檢查是否登入
const isLoggedIn = computed(() => {
  return localStorage.getItem('token') !== null
})

// 格式化時間顯示
const formattedTime = computed(() => {
  const minutes = Math.floor(timeLeft.value / 60)
  const seconds = timeLeft.value % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

// 監視剩餘時間，在適當時機顯示警告
watch(timeLeft, (newValue) => {
  if (newValue === 300) { // 剩餘5分鐘時顯示警告
    showWarning.value = true
  }
  if (newValue === 60) { // 剩餘1分鐘時顯示警告
    ElMessage({
      message: '系統將在1分鐘後自動登出',
      type: 'warning',
      duration: 5000
    })
  }
})

// 更新計時器
const updateTimer = () => {
  if (timeLeft.value > 0) {
    timeLeft.value--
  }
  if (timeLeft.value <= 0) {
    // 時間到，顯示登出對話框
    clearInterval(timer.value)
    showLogoutDialog.value = true
  }
}

// 處理活動
const handleActivity = () => {
  timeLeft.value = 30 * 60
  showWarning.value = false
}

// 確認登出並導航
const confirmLogout = () => {
  localStorage.removeItem('token')
  sessionStorage.removeItem('userInfo')
  showLogoutDialog.value = false
  router.push('/')
}

// 創建 axios 攔截器來重置計時器
const setupAxiosInterceptor = () => {
  axios.interceptors.response.use(
      (response) => {
        // 在收到任何成功的 API 響應時重置計時器
        if (isLoggedIn.value) {
          timeLeft.value = 30 * 60
          showWarning.value = false
        }
        return response
      },
      (error) => {
        // 如果是 401 錯誤（未授權），可能是 token 過期
        if (error.response?.status === 401) {
          ElMessage({
            message: error.response?.data?.message || '登入已過期，請重新登入',
            type: 'warning',
            duration: 5000
          })
          showLogoutDialog.value = true
        }
        return Promise.reject(error)
      }
  )
}

onMounted(() => {
  if (isLoggedIn.value) {
    timeLeft.value = 30 * 60
    timer.value = setInterval(updateTimer, 1000)
    setupAxiosInterceptor()
  }
})

onUnmounted(() => {
  if (timer.value) {
    clearInterval(timer.value)
  }
})
</script>

<style scoped>
.timer-container {
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 1001;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
}

.timer {
  padding: 6px 10px;
  font-size: 13px;
  color: #2c3e50;
  white-space: nowrap;
}

.timer.warning {
  color: #dc3545;
  animation: blink 1s infinite;
}

@keyframes blink {
  50% {
    opacity: 0.5;
  }
}
</style>