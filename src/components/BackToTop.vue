<!-- components/BackToTop.vue -->
<template>
  <Transition name="fade">
    <button
        v-show="show"
        @click="scrollToTop"
        class="back-to-top"
        aria-label="Back to top"
    >
      <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="icon"
      >
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    </button>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const show = ref(false)

const checkScroll = () => {
  // 檢查滾動位置是否超過頁面高度的一半
  const scrollHeight = document.documentElement.scrollHeight
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const clientHeight = document.documentElement.clientHeight

  show.value = scrollTop > (scrollHeight - clientHeight) / 2
}

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

onMounted(() => {
  window.addEventListener('scroll', checkScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', checkScroll)
})
</script>

<style scoped>
.back-to-top {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #4a90e2;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  transition: background-color 0.3s;
}

.back-to-top:hover {
  background-color: #357abd;
}

.icon {
  width: 20px;
  height: 20px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>