<template>
  <div class="admin-dashboard">
    <h1>系統管理員後台</h1>
    <div class="admin-options">
      <div class="option-box">
        <h3>用戶管理</h3>
        <p>檢視和管理系統用戶。</p>
        <button @click="handleUserManagement">進入</button>
      </div>
      <div class="option-box">
        <h3>系統設置</h3>
        <p>修改系統設定和偏好。</p>
        <button @click="handleSystemSettings">進入</button>
      </div>
      <div class="option-box">
        <h3>日誌查看</h3>
        <p>檢視系統日誌記錄。</p>
        <button @click="handleLogView">進入</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AdminDashboard',
  methods: {
    handleUserManagement() {
      console.log('Navigating to User Management');
      // 在這裡可以導向用戶管理頁面
    },
    handleSystemSettings() {
      console.log('Navigating to System Settings');
      // 在這裡可以導向系統設置頁面
    },
    handleLogView() {
      console.log('Navigating to Log View');
      // 在這裡可以導向日誌查看頁面
    }
  }
}
</script>

<style scoped>
.admin-dashboard {
  padding: 2rem;
  background-color: #f5f5f5;
  min-height: 100vh;
}

h1 {
  text-align: center;
  color: #333;
}

.admin-options {
  display: flex;
  justify-content: space-around;
  margin-top: 2rem;
}

.option-box {
  background-color: #fff;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
  width: 30%;
}

.option-box h3 {
  margin-bottom: 1rem;
  color: #333;
}

.option-box p {
  color: #666;
}

button {
  padding: 0.5rem 1rem;
  background-color: #002b9f;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: #001f75;
}
</style>
