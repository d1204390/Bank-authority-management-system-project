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
          >
        </div>
        <div class="form-group">
          <label>密碼:</label>
          <div class="password-input-wrapper">
            <input
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                class="form-input"
            >
            <span class="password-toggle" @click="showPassword = !showPassword">
              <i :class="['fas', showPassword ? 'fa-eye-slash' : 'fa-eye']"></i>
            </span>
          </div>
        </div>
        <button class="login-btn" @click="handleLogin">Login</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'; // 確保你有引入 axios
import { ElMessage } from 'element-plus'

export default {
  name: 'LoginView',
  data() {
    return {
      username: '',
      password: '',
      showPassword: false,
      clickCount: 0,
      isAdminMode: false,
      clickTimer: null
    }
  },

  created() {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // 解析 token 中的資訊
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        if (tokenData.account === 'admin') {
          this.$router.push('/admin');
        } else if (tokenData.account === 'user') {  // 先假設一般使用者的帳號類型是 'user'，因為還沒做
          this.$router.push('/user');
        }
      } catch (error) {
        localStorage.removeItem('token');
        ElMessage.error('登入已過期，請重新登入');
      }
    }
  },

  methods: {
    handleTitleClick() {
      this.clickCount++;

      // 清除現有的計時器
      if (this.clickTimer) {
        clearTimeout(this.clickTimer);
      }

      // 設置新的計時器（2秒後重置）
      this.clickTimer = setTimeout(() => {
        this.clickCount = 0;
      }, 2000);

      // 當當前是管理員模式，且點擊達到3次時切換回使用者模式
      if (this.isAdminMode && this.clickCount >= 3) {
        this.isAdminMode = false;
        this.clickCount = 0;
        clearTimeout(this.clickTimer);
        return;
      }

      // 當點擊達到5次時切換到管理員模式
      if (!this.isAdminMode && this.clickCount >= 5) {
        this.isAdminMode = true;  // 切換到管理員模式
        this.clickCount = 0;
        clearTimeout(this.clickTimer);
      }
    },

    async handleLogin() {
      try {
        // 發送帳號、密碼和模式到後端 API
        const response = await axios.post('http://localhost:5000/api/admin/login', {
          account: this.username,
          password: this.password,
          isAdminMode: this.isAdminMode  // 添加模式標記
        });

        // 如果當前處於管理員模式
        if (this.isAdminMode) {
          if (response.data.msg === '登入成功') {
            localStorage.setItem('token', response.data.token);
            ElMessage.success('管理員登入成功');
            console.log('管理員登入成功');
            this.$router.push('/admin');
          } else {
            ElMessage.error('登入失敗');
          }
        } else {
          // 非管理員模式，限制管理員帳號登入
          if (this.username !== 'admin') {
            ElMessage.success('使用者登入成功');
            console.log('使用者登入成功');
            this.$router.push('/user');
          } else {
            ElMessage.warning('登入失敗，請稍後再試');
          }
        }
      } catch (error) {
        if (error.response) {
          const { status, data } = error.response;

          // 只在管理員模式下顯示詳細錯誤訊息
          if (this.isAdminMode) {
            switch (status) {
              case 403:
                ElMessage.error(data.msg);
                break;
              case 400:
                if (data.attemptsLeft) {
                  ElMessage.error(`密碼錯誤，還剩 ${data.attemptsLeft} 次嘗試機會`);
                } else {
                  ElMessage.error(data.msg);
                }
                break;
              default:
                ElMessage.error('登入失敗，請稍後再試');
            }
          } else {
            // 非管理員模式下的錯誤處理
            ElMessage.error('登入失敗，請稍後再試');
          }
        } else {
          ElMessage.error('網路錯誤，請檢查連線');
        }
        console.error('登入錯誤:', error);
      }
    }
  }
}
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

/* 管理員模式樣式 */
.admin-mode {
  background-color: #1a1a1a;
}
.admin-mode h2,
.admin-mode label {
  color: #fff !important; /* 確保 h2 和 label 在管理員模式下都是白色 */
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
  color: red; /* 滑鼠移上去時變紅色 */
}



h2 {
  margin-bottom: 2rem;
  font-size: 1.8rem;
  color: #333;
  cursor: default; /* 改為箭頭樣式 */
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

/* 密碼輸入框相關樣式 */
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