<template>
  <nav class="navbar">
    <div class="nav-container">
      <div class="nav-brand">
        <router-link to="/admin" class="brand-link">
          <span class="brand-text">SYSTEX INTRANET 歡迎系統管理員</span>
        </router-link>
      </div>

      <!-- 漢堡選單按鈕 (預設隱藏) -->
      <div class="nav-toggle" @click="toggleMenu">
        <el-icon><Fold /></el-icon>
      </div>

      <!-- 管理員導覽選單 -->
      <div class="nav-items" :class="{ 'active': isMenuOpen }">
        <router-link to="/admin/user" class="nav-link">
          <el-icon><User /></el-icon>使用者管理
        </router-link>
        <router-link to="/admin/system" class="nav-link">
          <el-icon><Setting /></el-icon>系統設定
        </router-link>
        <router-link to="/admin/log" class="nav-link">
          <el-icon><DocumentCopy /></el-icon>操作日誌
        </router-link>
        <el-dropdown>
          <span class="nav-link">
            <el-icon><User /></el-icon>
            管理員
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item>
                <el-icon><UserFilled /></el-icon>個人資料
              </el-dropdown-item>
              <el-dropdown-item @click="logout">
                <el-icon><SwitchButton /></el-icon>登出
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Fold,
  User,
  Setting,
  DocumentCopy,
  ArrowDown,
  UserFilled,
  SwitchButton
} from '@element-plus/icons-vue'

const router = useRouter()
const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const logout = () => {
  localStorage.removeItem('token')
  ElMessage.success('已成功登出')
  router.push('/')
}
</script>

<style scoped>
/* 保留原有的樣式，並添加一些調整 */
.navbar {
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  height: 60px;
  position: fixed;
  width: 100%;
  top: 0;
  z-index: 1000;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.nav-brand .brand-link {
  text-decoration: none;
}

.brand-text {
  font-size: 1.2rem;
  font-weight: bold;
  color: #333;
}

.nav-items {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 5px;
  text-decoration: none;
  color: #666;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  cursor: pointer;
  padding: 5px 0;
}

.nav-link:hover {
  color: #409EFF;
}

.nav-link .el-icon {
  margin-right: 4px;
}

/* 漢堡選單按鈕預設隱藏 */
.nav-toggle {
  display: none;  /* 預設隱藏 */
  cursor: pointer;
  font-size: 1.5rem;
  color: #333;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .nav-container {
    padding: 0 1rem;
  }

  .brand-text {
    font-size: 1rem;
  }

  /* 在手機版才顯示漢堡選單按鈕 */
  .nav-toggle {
    display: block;  /* 在手機版顯示 */
  }

  .nav-items {
    display: none;
    position: absolute;
    top: 60px;
    left: 0;
    width: 100%;
    background-color: #ffffff;
    flex-direction: column;
    padding: 1rem 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .nav-items.active {
    display: flex;
  }

  .nav-link {
    padding: 1rem 2rem;
    width: 100%;
  }

  .nav-link:hover {
    background-color: #f5f5f5;
  }
}

/* Element Plus 相關樣式調整 */
:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 5px;
}

:deep(.el-dropdown-menu__item i) {
  margin-right: 5px;
}
</style>