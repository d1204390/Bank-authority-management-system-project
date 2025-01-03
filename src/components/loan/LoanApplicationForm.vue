<!-- components/loan/LoanApplicationForm.vue -->
<template>
  <div class="loan-application-form">
    <!-- 步驟條 -->
    <el-steps :active="currentStep" finish-status="success" class="mb-4">
      <el-step title="基本資料" />
      <el-step title="財務資訊" />
      <el-step title="文件上傳" />
      <el-step title="確認送出" />
    </el-steps>

    <!-- 表單內容 -->
    <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-position="right"
        label-width="120px"
        class="application-form"
    >
      <!-- 步驟一：基本資料 -->
      <div v-show="currentStep === 0">
        <h3 class="form-subtitle">客戶基本資料</h3>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="客戶姓名" prop="customerName">
              <el-input v-model="formData.customerName" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="身分證號" prop="idNumber">
              <el-input v-model="formData.idNumber" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="出生日期" prop="birthDate">
              <el-date-picker
                  v-model="formData.birthDate"
                  type="date"
                  placeholder="選擇日期"
                  style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="聯絡電話" prop="phone">
              <el-input v-model="formData.phone" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="通訊地址" prop="address">
          <el-input v-model="formData.address" />
        </el-form-item>
        <el-form-item label="電子郵件" prop="email">
          <el-input v-model="formData.email" />
        </el-form-item>
      </div>

      <!-- 步驟二：財務資訊 -->
      <div v-show="currentStep === 1">
        <h3 class="form-subtitle">貸款申請資訊</h3>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="貸款用途" prop="loanPurpose">
              <el-select v-model="formData.loanPurpose" style="width: 100%">
                <el-option label="房屋貸款" value="house" />
                <el-option label="車輛貸款" value="car" />
                <el-option label="信用貸款" value="credit" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="申請金額" prop="loanAmount">
              <el-input-number
                  v-model="formData.loanAmount"
                  :min="10000"
                  :step="10000"
                  style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="貸款期限" prop="loanTerm">
              <el-select v-model="formData.loanTerm" style="width: 100%">
                <el-option label="12個月" value="12" />
                <el-option label="24個月" value="24" />
                <el-option label="36個月" value="36" />
                <el-option label="48個月" value="48" />
                <el-option label="60個月" value="60" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="月收入" prop="monthlyIncome">
              <el-input-number
                  v-model="formData.monthlyIncome"
                  :min="0"
                  :step="1000"
                  style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 步驟三：文件上傳 -->
      <div v-show="currentStep === 2">
        <h3 class="form-subtitle">必要文件上傳</h3>
        <el-form-item label="身分證正面" prop="idCardFront">
          <el-upload
              action="#"
              list-type="picture-card"
              :auto-upload="false"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="身分證反面" prop="idCardBack">
          <el-upload
              action="#"
              list-type="picture-card"
              :auto-upload="false"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="薪資證明" prop="salaryProof">
          <el-upload
              action="#"
              :auto-upload="false"
          >
            <el-button type="primary">選擇檔案</el-button>
            <template #tip>
              <div class="el-upload__tip">
                請上傳最近三個月薪資證明，支援 PDF、JPG 格式
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </div>

      <!-- 步驟四：確認資訊 -->
      <div v-show="currentStep === 3">
        <h3 class="form-subtitle">申請資訊確認</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="客戶姓名">
            {{ formData.customerName }}
          </el-descriptions-item>
          <el-descriptions-item label="身分證號">
            {{ formData.idNumber }}
          </el-descriptions-item>
          <el-descriptions-item label="貸款用途">
            {{ getLoanPurposeLabel(formData.loanPurpose) }}
          </el-descriptions-item>
          <el-descriptions-item label="申請金額">
            {{ formatCurrency(formData.loanAmount) }}
          </el-descriptions-item>
          <el-descriptions-item label="貸款期限">
            {{ formData.loanTerm }}個月
          </el-descriptions-item>
          <el-descriptions-item label="月收入">
            {{ formatCurrency(formData.monthlyIncome) }}
          </el-descriptions-item>
        </el-descriptions>

        <el-form-item>
          <el-checkbox v-model="formData.agreement">
            我已閱讀並同意貸款申請相關條款
          </el-checkbox>
        </el-form-item>
      </div>

      <!-- 表單按鈕 -->
      <div class="form-buttons">
        <el-button @click="prevStep" :disabled="currentStep === 0">
          上一步
        </el-button>
        <el-button
            type="primary"
            @click="nextStep"
            v-if="currentStep < 3"
        >
          下一步
        </el-button>
        <el-button
            type="primary"
            @click="submitForm"
            v-else
        >
          送出申請
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { defineEmits, defineExpose } from 'vue';
import { Plus } from '@element-plus/icons-vue'
import { ElMessage} from 'element-plus'

// 當前步驟
const currentStep = ref(0)
const formRef = ref()

// 表單數據
const formData = reactive({
  // 基本資料
  customerName: '',
  idNumber: '',
  birthDate: '',
  phone: '',
  address: '',
  email: '',

  // 財務資訊
  loanPurpose: '',
  loanAmount: 100000,
  loanTerm: '',
  monthlyIncome: 0,

  // 同意條款
  agreement: false
})

// 表單驗證規則
const rules = {
  customerName: [
    { required: true, message: '請輸入客戶姓名', trigger: 'blur' }
  ],
  idNumber: [
    { required: true, message: '請輸入身分證號', trigger: 'blur' },
    { pattern: /^[A-Z][12]\d{8}$/, message: '身分證號格式不正確', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '請輸入聯絡電話', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '請輸入電子郵件', trigger: 'blur' },
    { type: 'email', message: '請輸入正確的電子郵件格式', trigger: 'blur' }
  ],
  loanPurpose: [
    { required: true, message: '請選擇貸款用途', trigger: 'change' }
  ],
  loanAmount: [
    { required: true, message: '請輸入申請金額', trigger: 'blur' }
  ],
  loanTerm: [
    { required: true, message: '請選擇貸款期限', trigger: 'change' }
  ]
}

// 取得貸款用途顯示文字
const getLoanPurposeLabel = (value) => {
  const purposeMap = {
    house: '房屋貸款',
    car: '車輛貸款',
    credit: '信用貸款',
    other: '其他'
  }
  return purposeMap[value] || value
}

// 格式化金額
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0
  }).format(amount)
}

// 上一步
const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// 下一步
const nextStep = async () => {
  if (currentStep.value === 0 || currentStep.value === 1) {
    // 驗證當前步驟的表單
    await formRef.value.validate((valid) => {
      if (valid) {
        currentStep.value++
      }
    })
  } else {
    currentStep.value++
  }
}

// 送出申請
const submitForm = async () => {
  if (!formData.agreement) {
    ElMessage.warning('請同意相關條款')
    return
  }

  await formRef.value.validate((valid) => {
    if (valid) {
      emit('submit', formData) // 使用 emit 傳遞表單數據
      ElMessage.success('申請已送出')
    }
  })
}

// 定義 emit 事件
const emit = defineEmits(['submit'])

// 對外暴露方法
defineExpose({
  resetForm: () => {
    formRef.value?.resetFields()
    currentStep.value = 0
  }
})
</script>

<style scoped>
.loan-application-form {
  padding: 20px;
}

.form-subtitle {
  margin: 0 0 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #EBEEF5;
  color: #303133;
  font-size: 16px;
}

.mb-4 {
  margin-bottom: 24px;
}

.application-form {
  background-color: #fff;
  padding: 20px;
  border-radius: 4px;
}

.form-buttons {
  margin-top: 24px;
  text-align: center;
}

:deep(.el-upload-list--picture-card) {
  --el-upload-list-picture-card-size: 100px;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .loan-application-form {
    padding: 10px;
  }

  .application-form {
    padding: 10px;
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