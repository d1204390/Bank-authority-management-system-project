<template>
  <nav class="navbar">
    <div class="nav-container">
      <div class="nav-brand">
        <router-link to="/" class="brand-link">
          <span class="brand-text">SYSTEX INTRANET</span>
        </router-link>
      </div>

      <!-- 漢堡選單按鈕 -->
      <div class="nav-toggle" @click="toggleMenu">
        <i class="fas fa-bars"></i>
      </div>

      <!-- 導覽選單 -->
      <div class="nav-items" :class="{ 'active': isMenuOpen }">
        <router-link to="/about" class="nav-link">關於系統</router-link>
        <router-link to="/help" class="nav-link">使用說明</router-link>
      </div>
    </div>
  </nav>
</template>

<script>
export default {
  name: 'TheNavbar',
  data() {
    return {
      isMenuOpen: false
    }
  },
  methods: {
    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen
    }
  }
}
</script>

<style scoped>
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
  cursor: pointer;
}

.nav-items {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-link {
  text-decoration: none;
  color: #666;
  font-size: 0.9rem;
  transition: color 0.3s ease;
  cursor: pointer;
  position: relative;
  padding-bottom: 3px;
}

.nav-link:hover {
  color: #000; /* 字體變黑 */
  font-weight: bold; /* 字體變粗 */
}


.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background-color: #ff4444;
  transition: width 0.3s ease;
}

.nav-link:hover::after {
  width: 100%;
}

.router-link-active.nav-link::after {
  width: 100%;
}

/* 漢堡選單按鈕樣式 */
.nav-toggle {
  display: none;
  cursor: pointer;
  font-size: 1.5rem;
  color: #333;
}

@media (max-width: 768px) {
  .nav-container {
    padding: 0 1rem;
  }

  .brand-text {
    font-size: 1rem;
  }

  /* 顯示漢堡選單按鈕 */
  .nav-toggle {
    display: block;
  }

  /* 手機版選單樣式 */
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
    text-align: left;
  }

  .nav-link::after {
    display: none;
  }

  .nav-link:hover {
    background-color: #f5f5f5;
  }
}
</style>