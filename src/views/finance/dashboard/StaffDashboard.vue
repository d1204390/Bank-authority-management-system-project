
<template>
  <div class="consumer-department">
    <h2>消金部 - 部門功能</h2>
    <!-- 信用卡管理 -->
    <div class="module">
      <h3>信用卡管理</h3>
      <ul>
        <li v-for="(card, index) in creditCards" :key="index">
          {{ card.name }} - {{ card.status }}
          <el-button size="small" type="success" @click="approveCard(index)">
            批准
          </el-button>
        </li>
      </ul>
    </div>
    <!-- 逾期貸款管理 -->
    <div class="module">
      <h3>逾期貸款管理</h3>
      <ul>
        <li v-for="(loan, index) in overdueLoans" :key="index">
          {{ loan.name }} - {{ loan.days }} 天逾期
          <el-button size="small" type="danger" @click="sendReminder(index)">
            催收
          </el-button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

// 初始化資料
const creditCards = ref([])
const overdueLoans = ref([])

// 批准信用卡
const approveCard = (index) => {
  const card = creditCards.value[index]
  ElMessage.success(`已批准信用卡: ${card.name}`)
}

// 催收逾期貸款
const sendReminder = (index) => {
  const loan = overdueLoans.value[index]
  ElMessage.warning(`已發送催收提醒給: ${loan.name}`)
}

// 模擬 API 初始化
const initConsumerDashboard = () => {
  creditCards.value = [
    { name: '孫七', status: '待審批' },
    { name: '周八', status: '已批准' },
  ]
  overdueLoans.value = [
    { name: '王五', days: 15 },
    { name: '趙六', days: 30 },
  ]
}

onMounted(() => {
  initConsumerDashboard()
})
</script>

<style scoped>
.consumer-department {
  padding: 20px;
}
.module {
  margin-bottom: 20px;
}
</style>
