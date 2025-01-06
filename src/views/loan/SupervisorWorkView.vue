<script setup>
import { ref, watch ,defineProps} from 'vue'
import SupervisorReview from '@/components/loan/SupervisorReview.vue'
import ReviewHistory from '@/components/loan/ReviewHistory.vue'

// 添加 props
const props = defineProps({
  activeTab: {
    type: String,
    default: 'review'
  }
})

const currentTab = ref(props.activeTab)

// 監聽 props.activeTab 的變化
watch(() => props.activeTab, (newTab) => {
  currentTab.value = newTab
}, { immediate: true })

const historyRef = ref(null)

// 處理審核完成事件
const handleReviewCompleted = () => {
  if (currentTab.value === 'history' && historyRef.value) {
    historyRef.value.fetchReviews()
  }
}

// 處理標籤切換
const handleTabChange = (tab) => {
  if (tab.props.name === 'history' && historyRef.value?.fetchReviews) {
    historyRef.value.fetchReviews()
  }
}
</script>

<template>
  <div class="work-view-container">
    <el-tabs v-model="currentTab" class="work-tabs" @tab-click="handleTabChange">
      <el-tab-pane label="審核申請" name="review">
        <SupervisorReview @review-completed="handleReviewCompleted" />
      </el-tab-pane>
      <el-tab-pane label="審核紀錄" name="history">
        <ReviewHistory ref="historyRef" position="S" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>