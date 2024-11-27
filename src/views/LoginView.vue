<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-left">
        <h3>請使用系統帳號/密碼登入平台</h3>
        <img src="@/img/systexlogo.png" alt="Systex Logo" class="login-image"/>
        <p>欲變更密碼，請聯絡系統管理員</p>
      </div>
      <div class="login-right" :class="{ 'admin-mode': isAdminMode }">
        <h2 @click="handleTitleClick">{{ isAdminMode ? '系統管理員登入' : '使用者登入' }}</h2>
        <div class="form-group">
          <label>帳號:</label>
          <input
              type="text"
              v-model="username"
              class="form-input"
          />
        </div>
        <div class="form-group">
          <label>密碼:</label>
          <div class="password-input-wrapper">
            <input
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                class="form-input"
                @keydown.enter="handleLogin"
            />
            <span class="password-toggle" @click="showPassword = !showPassword">
              <i :class="['fas', showPassword ? 'fa-eye-slash' : 'fa-eye']"></i>
            </span>
          </div>
        </div>
        <button
            class="login-btn"
            @click="handleLogin"
            :disabled="isLoading"
        >
          {{ isLoading ? '登入中...' : 'Login' }}
        </button>
      </div>
    </div>
  </div>
  <ChangePasswordDialog
      v-model:visible="showPasswordDialog"
      :account="currentAccount"
      :token="currentToken"
      @password-changed="handlePasswordChanged"
      @update-token="handleTokenUpdate"
  />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { getTokenInfo } from '@/router/guards'
import ChangePasswordDialog from '@/components/ChangePasswordDialog.vue'

const router = useRouter()

// 響應式狀態
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const clickCount = ref(0)
const isAdminMode = ref(false)
const clickTimer = ref(null)
const isLoading = ref(false)
const showPasswordDialog = ref(false)
const currentToken = ref('')
const currentAccount = ref('')

// 路由處理函數
const handleRouting = async (tokenData) => {
  try {
    // 確定要跳轉的路徑
    let targetPath = '/user/profile' // 預設路徑

    if (tokenData.role === 'admin') {
      targetPath = '/admin'
    } else {
      switch(tokenData.department) {
        case 'BD':
          targetPath = '/business/dashboard'
          break
        case 'FD':
          targetPath = '/finance/dashboard'
          break
        case 'LD':
          targetPath = '/loan/dashboard'
          break
      }
    }

    // 使用 replace 而不是 push，避免瀏覽器歷史堆棧問題
    await router.replace(targetPath)

  } catch (error) {
    console.error('Navigation error:', error)
    ElMessage.error('導航錯誤，請重試')
  }
}

// 標題點擊處理
const handleTitleClick = () => {
  clickCount.value++

  if (clickTimer.value) {
    clearTimeout(clickTimer.value)
  }

  clickTimer.value = setTimeout(() => {
    clickCount.value = 0
  }, 2000)

  if (isAdminMode.value && clickCount.value >= 3) {
    isAdminMode.value = false
    clickCount.value = 0
    clearTimeout(clickTimer.value)
    return
  }

  if (!isAdminMode.value && clickCount.value >= 5) {
    isAdminMode.value = true
    clickCount.value = 0
    clearTimeout(clickTimer.value)
  }
}

// 檢查登入狀態並重定向
const checkLoginStatus = async () => {
  const token = localStorage.getItem('token')
  if (!token) return false

  try {
    const tokenInfo = getTokenInfo(token)
    if (!tokenInfo) {
      localStorage.removeItem('token')
      sessionStorage.removeItem('userInfo')
      return false
    }

    await handleRouting(tokenInfo)
    return true
  } catch (error) {
    console.error('Token check error:', error)
    localStorage.removeItem('token')
    sessionStorage.removeItem('userInfo')
    return false
  }
}


// 處理錯誤響應
const handleErrorResponse = (status, data, isAdmin) => {
  switch (status) {
    case 403:
      // 處理帳號鎖定情況
      if (data.lockUntil) {
        const message = isAdmin
            ? `帳號已被鎖定，請 ${Math.ceil((data.lockUntil - Date.now()) / 1000 / 60)} 分鐘後再試`
            : '帳號已被鎖定，請聯繫系統管理員解鎖';

        ElMessage({
          message: message,
          type: 'error',
          duration: 5000,
          showClose: true
        });
      } else {
        ElMessage.error(data.msg);
      }
      break;
    case 400:
      // 處理密碼錯誤和剩餘嘗試次數
      if (data.attemptsLeft !== undefined) {
        const warning = isAdmin
            ? `密碼錯誤，還剩 ${data.attemptsLeft} 次嘗試機會，超過將鎖定15分鐘`
            : `密碼錯誤，還剩 ${data.attemptsLeft} 次嘗試機會，超過將鎖定且需聯繫管理員解鎖`;

        ElMessage({
          message: warning,
          type: 'warning',
          duration: 3000,
          showClose: true
        });
      } else {
        ElMessage.error(data.msg);
      }
      break;
    default:
      ElMessage.error(data.msg || '登入失敗，請稍後再試');
  }
};

// 登入處理函數
const handleLogin = async () => {
  if (!username.value || !password.value) {
    ElMessage.warning('請輸入帳號和密碼')
    return
  }

  if (isLoading.value) return
  isLoading.value = true

  try {
    const isAdmin = isAdminMode.value

    // 清除舊數據
    localStorage.removeItem('token')
    sessionStorage.removeItem('userInfo')

    const response = await axios.post(
        `http://localhost:5000/api/${isAdmin ? 'admin' : 'user'}/login`,
        {
          account: username.value,
          password: password.value,
          isAdminMode: isAdmin
        },
        {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
    )

    if (response.data.msg === '登入成功' && response.data.token) {
      try {
        // 保存 token
        localStorage.setItem('token', response.data.token)

        // 解析 token 並設置用戶信息
        const tokenInfo = getTokenInfo(response.data.token)

        if (!tokenInfo) {
          throw new Error('Token parsing failed')
        }

        // 驗證用戶類型
        if (isAdmin && tokenInfo.role !== 'admin') {
          throw new Error('Invalid admin token')
        }


        // 檢查是否為首次登入
        if (!isAdmin && response.data.user.isFirstLogin) {
          showPasswordDialog.value = true
          currentToken.value = response.data.token
          currentAccount.value = username.value
          return // 停止後續執行
        }

        // 顯示成功消息
        ElMessage({
          message: `${isAdmin ? '管理員' : '使用者'}登入成功`,
          type: 'success',
          duration: 2000
        })

        // 等待消息顯示後再跳轉
        await new Promise(resolve => setTimeout(resolve, 300))

        // 執行路由跳轉
        await handleRouting(tokenInfo)

      } catch (tokenError) {
        console.error('Token processing error:', tokenError)
        localStorage.removeItem('token')
        sessionStorage.removeItem('userInfo')
        ElMessage.error('登入過程發生錯誤，請重試')
      }
    } else {
      ElMessage.error(response.data.msg || '登入失敗')
    }
  } catch (error) {
    console.error('Login error:', error)
    if (error.response) {
      const { status, data } = error.response;
      handleErrorResponse(status, data, isAdminMode.value);
    } else {
      ElMessage.error('網路錯誤，請檢查連線');
    }
  } finally {
    setTimeout(() => {
      isLoading.value = false
    }, 300)
  }
}

// 在 script setup 中添加
const handlePasswordChanged = async (newToken) => {
  try {
    // 先保存新的 token
    localStorage.setItem('token', newToken)
    currentToken.value = newToken

    // 再解析 token 資訊
    const tokenInfo = getTokenInfo(newToken)
    if (!tokenInfo) {
      throw new Error('Invalid token after password change')
    }

    // 關閉對話框
    showPasswordDialog.value = false

    // 顯示成功訊息
    ElMessage({
      message: '密碼更改成功，即將進入系統',
      type: 'success',
      duration: 2000
    })

    // 等待訊息顯示後再跳轉
    await new Promise(resolve => setTimeout(resolve, 300))

    // 最後執行路由跳轉
    await handleRouting(tokenInfo)
  } catch (error) {
    console.error('Password change handling error:', error)
    ElMessage.error('處理密碼更改時發生錯誤')

    // 發生錯誤時清除狀態
    localStorage.removeItem('token')
    sessionStorage.removeItem('userInfo')
    currentToken.value = ''
  }
}

const handleTokenUpdate = (newToken) => {
  localStorage.setItem('token', newToken)
  currentToken.value = newToken
}

// 組件掛載時進行檢查
onMounted(async () => {
  await checkLoginStatus()
})
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 120px);
  background-color: #f5f5f5;
}

.login-box {
  display: flex;
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  width: 800px;
}

.login-left {
  flex: 1;
  padding: 2rem;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.login-right {
  flex: 1;
  padding: 2rem;
  background-color: #faf9f9;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: all 0.3s ease;
}

.admin-mode {
  background-color: #1a1a1a;
}

.admin-mode h2,
.admin-mode label {
  color: #fff !important;
}

.admin-mode .login-btn {
  background-color: #ff4444;
}

.admin-mode .login-btn:hover {
  background-color: #cc0000;
}

.admin-mode .form-input {
  background-color: #333;
  color: #fff;
  border-color: #444;
}

.admin-mode .password-toggle {
  color: #fff;
}

.admin-mode .form-input:focus {
  border-color: #ff4444;
}

.admin-mode .password-toggle:hover {
  color: red;
}

h2 {
  margin-bottom: 2rem;
  font-size: 1.8rem;
  color: #333;
  cursor: default;
  user-select: none;
}

h3 {
  margin-bottom: 1rem;
  font-size: 1.2rem;
  color: #666;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #666;
}

.form-input {
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #4a90e2;
}

.password-input-wrapper {
  position: relative;
  width: 100%;
}

.password-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: #666;
  padding: 5px;
}

.password-toggle:hover {
  color: #333;
}

.password-input-wrapper .form-input {
  padding-right: 40px;
}

.login-btn {
  width: 100%;
  padding: 0.8rem;
  background-color: #002b9f;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.login-btn:hover {
  background-color: #001f75;
}

p {
  color: #666;
  line-height: 1.6;
}

.login-image {
  width: 80%;
  max-width: 300px;
  margin: 2rem 0;
}

@media (max-width: 768px) {
  .login-box {
    flex-direction: column;
    width: 90%;
    margin: 1rem;
  }

  .login-left,
  .login-right {
    padding: 1.5rem;
  }
}

.login-right h2 {
  margin-bottom: 2rem;
  font-size: 1.8rem;
  color: #333;
  text-align: center;
  margin-left: auto;
  margin-right: 2rem;
  width: 80%;
}
</style>