<template>
  <div class="work-view-container">
    <el-tabs v-model="activeTab" class="work-tabs" @tab-click="handleTabChange">
      <el-tab-pane label="工作指派" name="assignment">
        <SupervisorAssignment />
      </el-tab-pane>
      <el-tab-pane label="審核申請" name="review">
        <SupervisorReview @review-completed="handleReviewCompleted" />
      </el-tab-pane>
      <el-tab-pane label="審核紀錄" name="history">
        <ReviewHistory ref="historyRef" position="S" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SupervisorReview from '@/components/loan/SupervisorReview.vue'
import SupervisorAssignment from '@/components/loan/SupervisorAssignment.vue'
import ReviewHistory from '@/components/loan/ReviewHistory.vue'

const activeTab = ref('assignment')
const historyRef = ref(null)

// 處理審核完成事件
const handleReviewCompleted = () => {
  // 如果當前是在審核紀錄頁面，立即更新數據
  if (activeTab.value === 'history' && historyRef.value) {
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