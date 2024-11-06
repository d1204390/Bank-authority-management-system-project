<template>
  <div id="app">
    <!-- 根據路由路徑切換導覽列 -->
    <AdminNavbar v-if="isAdminRoute"/>
    <TheNavbar v-else/>
    <div class="main-content">
      <router-view/>
    </div>
    <TheFooter/>
  </div>
</template>

<script>
import TheNavbar from '@/components/Navbar.vue'
import AdminNavbar from '@/components/AdminNavbar.vue'  // 引入管理員導覽列
import TheFooter from '@/components/Footer.vue'

export default {
  name: 'App',
  components: {
    TheNavbar,
    AdminNavbar,  // 註冊組件
    TheFooter
  },
  computed: {
    isAdminRoute() {
      // 檢查當前路由是否是管理員頁面
      return this.$route.path.startsWith('/admin')
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  line-height: 1.6;
  color: #333;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding-top: 60px; /* Navbar 的高度 */
  min-height: calc(100vh - 120px); /* 視窗高度減去 Navbar 和 Footer 的高度 */
  display: flex;
  flex-direction: column;
}
</style>