<template>
  <div class="work-view-container">
    <el-tabs v-model="activeTab" class="work-tabs" @tab-click="handleTabChange">
      <el-tab-pane label="工作指派" name="assignment">
        <ManagerAssignment />
      </el-tab-pane>
      <el-tab-pane label="審核申請" name="review">
        <ManagerReview @review-completed="handleReviewCompleted" />
      </el-tab-pane>
      <el-tab-pane label="審核紀錄" name="history">
        <ReviewHistory ref="historyRef" position="M" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ManagerReview from '@/components/loan/ManagerReview.vue'
import ManagerAssignment from '@/components/loan/ManagerAssignment.vue'
import ReviewHistory from '@/components/loan/ReviewHistory.vue'

const activeTab = ref('assignment')
const historyRef = ref(null)

// 處理審核完成事件
const handleReviewCompleted = () => {
  if (activeTab.value === 'history' && historyRef.value) {
    historyRef.value.fetchReviews()
  }
}

// 處理標籤切換
const handleTabChange = (tab) => {
  // 添加一個檢查以確保方法存在
  if (tab.props.name === 'history' && historyRef.value?.fetchReviews) {
    historyRef.value.fetchReviews()
  }
}
</script>