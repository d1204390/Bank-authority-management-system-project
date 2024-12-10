<template>
  <el-dialog
      v-model="dialogVisible"
      title="新進員工資料"
      width="800px"
      :close-on-click-modal="false"
      :before-close="handleBeforeClose"
  >
    <!-- 其他部分保持不變 -->

    <div class="form-container">
      <el-form
          ref="formRef"
          :model="formData"
          :rules="rules"
          label-width="100px"
          label-position="right"
          :disabled="submitting"
          @change="handleFormChange"
      >
        <div
            v-for="(employee, index) in formData.employees"
            :key="index"
            class="employee-form-item"
        >
          <div class="employee-form-header">
            <h3 class="employee-number">員工 #{{ index + 1 }}</h3>
            <el-button
                type="danger"
                link
                @click="removeEmployeeForm(index)"
                :disabled="formData.employees.length === 1"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>

          <el-form-item
              :label="'姓名'"
              :prop="'employees.' + index + '.name'"
              :rules="rules.name"
          >
            <el-input
                v-model="employee.name"
                placeholder="請輸入員工姓名"
                @input="handleFormChange"
            />
          </el-form-item>

          <el-form-item
              :label="'部門'"
              :prop="'employees.' + index + '.department'"
          >
            <el-text>{{ formatDepartment(props.departmentCode) }}</el-text>
          </el-form-item>

          <el-form-item
              :label="'職位'"
              :prop="'employees.' + index + '.position'"
          >
            <el-text>{{ formatPosition(employee.position) }}</el-text>
          </el-form-item>

          <el-form-item
              :label="'電子郵件'"
              :prop="'employees.' + index + '.email'"
              :rules="rules.email"
          >
            <el-input
                v-model="employee.email"
                placeholder="請輸入信箱"
                @input="handleFormChange"
            >
              <template #append>@gmail.com</template>
            </el-input>
          </el-form-item>

          <el-form-item
              :label="'到職日期'"
              :prop="'employees.' + index + '.startDate'"
              :rules="rules.startDate"
          >
            <el-date-picker
                v-model="employee.startDate"
                type="date"
                placeholder="請選擇到職日期"
                format="YYYY/MM/DD"
                value-format="YYYY-MM-DD"
                :disabled-date="disablePastDates"
                class="w-full"
                @change="handleFormChange"
            />
          </el-form-item>

          <el-form-item
              :label="'備註'"
              :prop="'employees.' + index + '.notes'"
          >
            <el-input
                v-model="employee.notes"
                type="textarea"
                :rows="2"
                placeholder="請輸入備註（選填）"
                show-word-limit
                maxlength="200"
                @input="handleFormChange"
            />
          </el-form-item>

          <el-divider v-if="index !== formData.employees.length - 1" />
        </div>
      </el-form>
    </div>

    <!-- 底部按鈕區域 -->
    <template #footer>
      <div class="dialog-footer">
        <div class="footer-content">
          <div class="left-section">
            <el-button
                type="primary"
                plain
                @click="addEmployeeForm"
                :disabled="submitting"
            >
              <el-icon class="mr-1"><Plus /></el-icon>
              新增員工
            </el-button>
            <span class="form-summary" v-if="formData.employees.length > 1">
              共 {{ formData.employees.length }} 位員工
            </span>
          </div>
          <div class="button-group">
            <el-button @click="handleClose" :disabled="submitting">取消</el-button>
            <el-button
                type="primary"
                @click="handleSubmit"
                :loading="submitting"
            >
              提交
            </el-button>
          </div>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import axios from 'axios'
import { ref, computed, watch, defineProps, defineEmits } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  departmentCode: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:visible', 'submit-success'])

// 表單相關
const formRef = ref(null)
const submitting = ref(false)
const isFormChanged = ref(false)

const getInitialEmployeeData = () => ({
  name: '',
  department: props.departmentCode,
  position: 'C',
  email: '',
  startDate: '',
  notes: ''
})

const formData = ref({
  employees: [getInitialEmployeeData()]
})

const rules = {
  name: [
    { required: true, message: '請輸入員工姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '長度需在 2 到 20 個字元之間', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '請輸入 Gmail 帳號', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9._%+-]+$/,  // Gmail 前綴的有效字符
      message: 'Gmail 帳號只能包含字母、數字和特殊符號(._%+-)',
      trigger: 'blur'
    }
  ],
  startDate: [
    { required: true, message: '請選擇到職日期', trigger: 'change' }
  ]
}

// 計算屬性
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 監聽對話框狀態
watch(() => props.visible, (newValue) => {
  if (!newValue) {
    resetForm()
  }
})

// 方法
const formatDepartment = (code) => {
  const deptMap = {
    'LD': '借貸部',
    'BD': '業務部',
    'FD': '消金部'
  }
  return `${deptMap[code] || '未知部門'}(${code})`
}

const formatPosition = (code) => {
  const positionMap = {
    'C': '科員'
  }
  return `${positionMap[code] || '職位'}(${code})`
}

const handleFormChange = () => {
  isFormChanged.value = true
}

const addEmployeeForm = () => {
  formData.value.employees.push(getInitialEmployeeData())
  isFormChanged.value = true
}

const removeEmployeeForm = (index) => {
  if (formData.value.employees.length === 1) return
  formData.value.employees.splice(index, 1)
  isFormChanged.value = true
}

const disablePastDates = (date) => {
  return date < new Date(new Date().setHours(0, 0, 0, 0))
}

const resetForm = () => {
  if (!formRef.value) return
  formRef.value.resetFields()
  formData.value = {
    employees: [getInitialEmployeeData()]
  }
  isFormChanged.value = false
}

const handleBeforeClose = (done) => {
  if (submitting.value) return

  try {
    if (isFormChanged.value) {
      ElMessageBox.confirm('資料尚未送出，確定要關閉嗎？', '提示', {
        confirmButtonText: '確定',
        cancelButtonText: '取消',
        type: 'warning'
      })
          .then(() => {
            resetForm()
            done()
          })
          .catch(() => {
            // 用戶取消關閉，不執行任何操作
          })
    } else {
      done()
    }
  } catch (error) {
    console.error('關閉對話框時發生錯誤:', error)
    ElMessage.error('操作失敗，請重試')
  }
}

const handleClose = () => {
  if (submitting.value) return
  resetForm()
  dialogVisible.value = false
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    submitting.value = true

    const submitData = formData.value.employees.map(employee => ({
      name: employee.name,
      email: `${employee.email}@gmail.com`,
      startDate: employee.startDate,
      notes: employee.notes || '',
      department: props.departmentCode,
      position: 'C'
    }))

    const response = await axios.post('/api/new-employees/submit', {
      employees: submitData
    })

    ElMessage.success(response.data.msg || `成功提交 ${submitData.length} 位員工資料`)
    resetForm()
    emit('submit-success')
    handleClose()

  } catch (error) {
    console.error('提交失敗:', error)
    const errorMsg = error.response?.data?.msg || error.message || '提交失敗，請稍後重試'
    ElMessage.error(errorMsg)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.form-container {
  max-height: 60vh;
  overflow-y: auto;
  padding: 0 16px;
}

.employee-form-item {
  margin-bottom: 20px;
}

.employee-form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.employee-number {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.form-summary {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.button-group {
  display: flex;
  gap: 12px;
}

/* Element Plus 樣式覆寫 */
:deep(.el-form-item) {
  margin-bottom: 18px;
}

:deep(.el-divider) {
  margin: 24px 0;
}

/* 暗色主題適配 */
:deep([class*='--dark']) {
  .batch-controls {
    background-color: var(--el-bg-color);
  }
}
</style>