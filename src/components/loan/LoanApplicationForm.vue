<!-- LoanApplicationForm.vue -->
<template>
  <el-card class="loan-application" :class="{ 'is-dark': isDark }">
    <!-- 表單內容 -->
    <el-form
        ref="loanFormRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
        class="loan-form"
    >
      <!-- 客戶資訊區塊 -->
      <div class="form-section">
        <h3 class="section-title">客戶資訊</h3>
        <el-form-item label="客戶姓名" prop="customerInfo.name">
          <el-input
              v-model="formData.customerInfo.name"
              placeholder="請輸入客戶姓名"
          />
        </el-form-item>

        <el-form-item label="身分證號" prop="customerInfo.idNumber">
          <el-input
              v-model="formData.customerInfo.idNumber"
              placeholder="請輸入身分證號"
              :maxlength="10"
          />
        </el-form-item>

        <el-form-item label="聯絡電話" prop="customerInfo.phone">
          <el-input
              v-model="formData.customerInfo.phone"
              placeholder="請輸入手機號碼"
              :maxlength="10"
          />
        </el-form-item>
      </div>

      <!-- 貸款資訊區塊 -->
      <div class="form-section">
        <h3 class="section-title">貸款資訊</h3>
        <el-form-item label="貸款用途" prop="loanInfo.purpose">
          <el-select
              v-model="formData.loanInfo.purpose"
              placeholder="請選擇貸款用途"
              class="form-select"
          >
            <el-option
                v-for="(label, value) in loanPurposes"
                :key="value"
                :label="label"
                :value="value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="申請金額" prop="loanInfo.amount">
          <el-input-number
              v-model="formData.loanInfo.amount"
              :min="10000"
              :max="10000000"
              :step="10000"
              class="form-input-number"
              :formatter="formatAmount"
              :parser="parseAmount"
          />
        </el-form-item>

        <el-form-item label="貸款期限" prop="loanInfo.term">
          <el-select
              v-model="formData.loanInfo.term"
              placeholder="請選擇貸款期限"
              class="form-select"
          >
            <el-option
                v-for="term in loanTerms"
                :key="term"
                :label="`${term}個月`"
                :value="term"
            />
          </el-select>
        </el-form-item>
      </div>

      <el-form-item label="急件申請" prop="loanInfo.isUrgent">
        <el-switch
            v-model="formData.loanInfo.isUrgent"
            active-text="是"
            inactive-text="否"
            :inline-prompt="true"
        />
      </el-form-item>

      <!-- 按鈕區域 -->
      <div class="form-actions">
        <el-button type="primary" @click="submitForm" :loading="submitting">
          提交申請
        </el-button>
        <el-button @click="resetForm">重置</el-button>
      </div>
    </el-form>
  </el-card>
</template>

<script setup>
import { ref, reactive ,defineEmits,defineExpose} from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

// 常量定義
const loanPurposes = {
  house: '房屋貸款',
  car: '車輛貸款',
  credit: '信用貸款',
  other: '其他'
}

const loanTerms = [12, 24, 36, 48, 60]

// 響應式狀態
const isDark = ref(false)
const submitting = ref(false)
const loanFormRef = ref(null)

// 表單數據
const formData = reactive({
  customerInfo: {
    name: '',
    idNumber: '',
    phone: ''
  },
  loanInfo: {
    purpose: '',
    amount: 100000,
    term: '',
    isUrgent: false
  }
})

// 表單驗證規則
const formRules = {
  'customerInfo.name': [
    { required: true, message: '請輸入客戶姓名', trigger: 'blur' },
    { min: 2, message: '姓名至少需要2個字', trigger: 'blur' }
  ],
  'customerInfo.idNumber': [
    { required: true, message: '請輸入身分證號', trigger: 'blur' },
    { pattern: /^[A-Z][12]\d{8}$/, message: '身分證號格式不正確', trigger: 'blur' }
  ],
  'customerInfo.phone': [
    { required: true, message: '請輸入聯絡電話', trigger: 'blur' },
    { pattern: /^09\d{8}$/, message: '請輸入正確的手機號碼格式', trigger: 'blur' }
  ],
  'loanInfo.purpose': [
    { required: true, message: '請選擇貸款用途', trigger: 'change' }
  ],
  'loanInfo.amount': [
    { required: true, message: '請輸入申請金額', trigger: 'blur' },
    { type: 'number', min: 10000, message: '申請金額不得低於10,000元', trigger: 'blur' }
  ],
  'loanInfo.term': [
    { required: true, message: '請選擇貸款期限', trigger: 'change' }
  ]
}

// 金額格式化
const formatAmount = (value) => {
  return `NT$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const parseAmount = (value) => {
  return value.replace(/[^\d]/g, '')
}

// 提交表單
const submitForm = async () => {
  if (!loanFormRef.value) return

  try {
    await loanFormRef.value.validate()
    submitting.value = true

    const response = await axios.post('/api/loan/apply', formData)

    ElMessage.success(response.data.msg || '申請已送出')
    resetForm()
    emit('submit', response.data)

  } catch (error) {
    console.error('提交申請失敗:', error)
    ElMessage.error(
        error.response?.data?.msg ||
        '提交申請失敗，請稍後再試'
    )
  } finally {
    submitting.value = false
  }
}

// 追蹤表單是否被修改
const isFormDirty = () => {
  return (
      formData.customerInfo.name !== '' ||
      formData.customerInfo.idNumber !== '' ||
      formData.customerInfo.phone !== '' ||
      formData.loanInfo.purpose !== '' ||
      formData.loanInfo.amount !== 100000 ||
      formData.loanInfo.term !== ''
  )
}

// 重置表單
const resetForm = () => {
  if (loanFormRef.value) {
    loanFormRef.value.resetFields()
    // 重設表單數據到初始狀態
    Object.assign(formData, {
      customerInfo: {
        name: '',
        idNumber: '',
        phone: ''
      },
      loanInfo: {
        purpose: '',
        amount: 100000,
        term: ''
      }
    })
  }
}

// 定義 emit 事件
const emit = defineEmits(['submit'])

// 將 isFormDirty 和 resetForm 方法暴露給父組件
defineExpose({
  isFormDirty,
  resetForm
})

</script>

<style scoped>
.loan-application {
  background-color: #fff;
  border-radius: 8px;
}

.loan-form {
  padding: 20px;
}

.form-section {
  margin-bottom: 24px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e5e7eb;
}

.form-select {
  width: 100%;
}

.form-input-number {
  width: 100%;
}

.form-actions {
  margin-top: 24px;
  display: flex;
  justify-content: center;
  gap: 16px;
}

/* 暗色主題適配 */
.is-dark {
  .form-section {
    background: #1a1a1a;
  }

  .section-title {
    color: #e5e7eb;
    border-bottom-color: #374151;
  }
}

/* 響應式設計 */
@media screen and (max-width: 768px) {
  .loan-form {
    padding: 16px;
  }

  .form-section {
    padding: 16px;
  }

  :deep(.el-form-item__label) {
    float: none;
    display: block;
    text-align: left;
    padding: 0 0 8px;
  }

  :deep(.el-form-item__content) {
    margin-left: 0 !important;
  }
}
</style>