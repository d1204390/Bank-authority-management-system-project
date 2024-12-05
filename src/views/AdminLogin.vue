<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-left">
        <h3>系統管理員登入界面</h3>
        <img src="@/img/systexlogo.png" alt="Systex Logo" class="login-image"/>
      </div>
      <div class="login-right admin-mode">
        <h2>系統管理員登入</h2>
        <div class="form-group">
          <label>管理員帳號:</label>
          <input
              type="text"
              v-model="username"
              class="form-input"
          />
        </div>
        <div class="form-group">
          <label>管理員密碼:</label>
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
        <div class="back-link">
          <a @click="goToUserLogin">返回一般使用者登入</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { getTokenInfo } from '@/router/guards'

const router = useRouter()

// 響應式狀態
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)

// 返回一般使用者登入頁面
const goToUserLogin = () => {
  router.push('/')
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

    if (tokenInfo.role === 'admin') {
      await router.replace('/admin')
      return true
    }

    return false
  } catch (error) {
    console.error('Token check error:', error)
    localStorage.removeItem('token')
    sessionStorage.removeItem('userInfo')
    return false
  }
}

// 登入處理函數
const handleLogin = async () => {
  if (!username.value || !password.value) {
    ElMessage.warning('請輸入管理員帳號和密碼')
    return
  }

  if (isLoading.value) return
  isLoading.value = true

  try {
    // 清除舊數據
    localStorage.removeItem('token')
    sessionStorage.removeItem('userInfo')

    const response = await axios.post(
        'http://localhost:5000/api/admin/login',
        {
          account: username.value,
          password: password.value,
          isAdminMode: true
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
        localStorage.setItem('token', response.data.token)
        const tokenInfo = getTokenInfo(response.data.token)

        if (!tokenInfo || tokenInfo.role !== 'admin') {
          throw new Error('Invalid admin token')
        }

        ElMessage({
          message: '管理員登入成功',
          type: 'success',
          duration: 2000
        })

        await new Promise(resolve => setTimeout(resolve, 300))
        await router.replace('/admin')

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
      const { status, data } = error.response
      switch (status) {
        case 403:
          ElMessage.error(data.msg)
          break
        case 400:
          if (data.attemptsLeft) {
            ElMessage.error(`密碼錯誤，還剩 ${data.attemptsLeft} 次嘗試機會`)
          } else {
            ElMessage.error(data.msg)
          }
          break
        default:
          ElMessage.error('登入失敗，請稍後再試')
      }
    } else {
      ElMessage.error('網路錯誤，請檢查連線')
    }
  } finally {
    setTimeout(() => {
      isLoading.value = false
    }, 300)
  }
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
  background-color: #1a1a1a;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-right h2,
.login-right label {
  color: #fff !important;
}

.login-right .login-btn {
  background-color: #ff4444;
}

.login-right .login-btn:hover {
  background-color: #cc0000;
}

.login-right .form-input {
  background-color: #333;
  color: #fff;
  border-color: #444;
}

.login-right .password-toggle {
  color: #fff;
}

.login-right .form-input:focus {
  border-color: #ff4444;
}

.login-right .password-toggle:hover {
  color: #ff4444;
}

h2 {
  margin-bottom: 2rem;
  font-size: 1.8rem;
  text-align: center;
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
}

.form-input {
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: all 0.3s ease;
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
  padding: 5px;
}

.password-input-wrapper .form-input {
  padding-right: 40px;
}

.login-btn {
  width: 100%;
  padding: 0.8rem;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.login-btn:disabled {
  background-color: #666;
  cursor: not-allowed;
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

.back-link {
  text-align: center;
  margin-top: 1rem;
}

.back-link a {
  color: #ff4444;
  text-decoration: none;
  cursor: pointer;
}

.back-link a:hover {
  text-decoration: underline;
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
</style>