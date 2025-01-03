<!-- views/loan/SupervisorWorkView.vue -->
<template>
  <div class="work-view-container">
    <el-tabs v-model="activeTab" class="work-tabs">
      <el-tab-pane label="工作指派" name="assignment">
        <ManagerAssignment />
      </el-tab-pane>
      <el-tab-pane label="審核申請" name="review">
        <ManagerReview />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ManagerReview from "@/components/loan/ManagerReview.vue";
import ManagerAssignment from "@/components/loan/ManagerAssignment.vue";

const activeTab = ref('assignment')
</script>

<style scoped>
.work-view-container {
  padding: 20px;
}

.work-tabs {
  background-color: white;
  border-radius: 4px;
  padding: 20px;
}

:deep(.el-tabs__header) {
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .work-view-container {
    padding: 10px;
  }
}
</style>