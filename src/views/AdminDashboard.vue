<template>
  <div class="admin-dashboard">
    <!-- 功能選單 -->
    <div class="sidebar" :class="{ 'collapsed': isCollapsed, 'mobile': isMobile }">
      <div class="sidebar-header">
        <h2 :class="{ 'text-hidden': isCollapsed && !isMobile }">系統管理員後台</h2>
        <el-button
            type="text"
            class="collapse-btn"
            @click="toggleCollapse"
        >
          <el-icon>
            <el-icon :size="20">
              <ArrowDown v-if="isMobile && isCollapsed" />
              <ArrowUp v-else-if="isMobile && !isCollapsed" />
              <Expand v-else-if="!isMobile && isCollapsed" />
              <Fold v-else />
            </el-icon>
          </el-icon>
        </el-button>
      </div>
      <div class="menu-items">
        <div
            class="menu-item"
            :class="{
              active: currentView === 'UserManagement',
              'collapsed': isCollapsed && !isMobile
            }"
            @click="switchView('UserManagement')"
        >
          <el-icon><UserFilled /></el-icon>
          <div class="menu-item-content" v-show="!isCollapsed || isMobile">
            <h3>使用者管理</h3>
            <p>檢視和管理系統使用者</p>
          </div>
        </div>
        <div
            class="menu-item"
            :class="{
              active: currentView === 'LoginHistory',
              'collapsed': isCollapsed && !isMobile
            }"
            @click="switchView('LoginHistory')"
        >
          <el-icon><List /></el-icon>
          <div class="menu-item-content" v-show="!isCollapsed || isMobile">
            <h3>使用者登入記錄</h3>
            <p>查看系統登入歷史記錄</p>
          </div>
        </div>
        <div
            class="menu-item"
            :class="{
              active: currentView === 'StaffChanges',
              'collapsed': isCollapsed && !isMobile
            }"
            @click="switchView('StaffChanges')"
        >
          <el-icon><Edit /></el-icon>
          <div class="menu-item-content" v-show="!isCollapsed || isMobile">
            <h3>人員異動</h3>
            <p>管理人員異動與新增</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作區 -->
    <div class="content-area" :class="{ 'expanded': isCollapsed && !isMobile }">
      <component :is="currentComponent" />
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, defineAsyncComponent, onMounted, onUnmounted } from 'vue';
import { Fold, Expand, UserFilled, List, ArrowDown, ArrowUp,Edit  } from '@element-plus/icons-vue';

// 導入組件
const UserManagement = defineAsyncComponent(() =>
    import('@/views/AdminEmployeeManage.vue')
);
const LoginHistory = defineAsyncComponent(() =>
    import('@/views/LoginHistory.vue')
);
const StaffChanges = defineAsyncComponent(() =>
    import('@/views/StaffChanges.vue')
);
const currentView = ref('UserManagement');
const currentComponent = shallowRef(UserManagement);
const isCollapsed = ref(false);
const isMobile = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
  if (isMobile.value) {
    isCollapsed.value = true;
  }
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

const switchView = (view) => {
  currentView.value = view;
  switch(view) {
    case 'UserManagement':
      currentComponent.value = UserManagement;
      break;
    case 'LoginHistory':
      currentComponent.value = LoginHistory;
      break;
    case 'StaffChanges':
      currentComponent.value = StaffChanges;
      break;
  }
  // 在手機模式下，切換視圖後自動收合選單
  if (isMobile.value) {
    isCollapsed.value = true;
  }
};

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};
</script>

<style scoped>
.admin-dashboard {
  display: flex;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.sidebar {
  width: 280px;
  background-color: #fff;
  padding: 1.5rem 1rem;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  overflow: hidden;
  flex-shrink: 0;
}

.sidebar.collapsed:not(.mobile) {
  width: 80px;
  padding: 1.5rem 0.5rem;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #002b9f;
}

.sidebar-header h2 {
  color: #333;
  font-size: 1.2rem;
  margin: 0;
  white-space: nowrap;
  transition: opacity 0.3s ease;
}

.collapse-btn {
  padding: 8px;
  color: #002b9f;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.menu-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  background-color: #f8f9fa;
  cursor: pointer;
  transition: all 0.3s ease;
}

.menu-item:hover {
  background-color: #e9ecef;
  transform: translateX(5px);
}

.menu-item.active {
  background-color: #002b9f;
  color: white;
}

.menu-item.collapsed:not(.mobile) {
  padding: 1rem;
  justify-content: center;
}

.menu-item-content {
  flex: 1;
  transition: all 0.3s ease;
}

.menu-item-content h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.menu-item-content p {
  margin: 0;
  font-size: 0.8rem;
  opacity: 0.8;
}

.text-hidden {
  opacity: 0;
  width: 0;
  height: 0;
  overflow: hidden;
}

.content-area {
  flex: 1;
  padding: 2rem;
  min-width: 0;
  transition: margin-left 0.3s ease;
}

@media (max-width: 768px) {
  .admin-dashboard {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    padding: 1rem;
  }

  .sidebar.mobile {
    transition: height 0.3s ease;
  }

  .sidebar.mobile.collapsed {
    height: 70px;
  }

  .sidebar.mobile .menu-items {
    margin-top: 1rem;
  }

  .content-area {
    width: 100%;
    padding: 1rem;
  }

  .menu-item:hover {
    transform: none;
  }
}
</style>