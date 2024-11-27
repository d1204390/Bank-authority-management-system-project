<template>
  <el-dialog
      title="首次登入密碼變更"
      :model-value="visible"
      @update:model-value="$emit('update:visible')"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      width="460px"
      class="password-change-dialog"
      :top="'5vh'"
  >
    <div class="dialog-content">
      <div class="form-header">
        <el-icon class="lock-icon"><Lock /></el-icon>
        <h2>請設定新密碼</h2>
        <p class="subtitle">為了確保您的帳戶安全，請更改您的密碼</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="原始密碼" prop="oldPassword">
          <el-input
              v-model="form.oldPassword"
              type="password"
              placeholder="請輸入原始密碼"
              show-password
              :prefix-icon="Key"
          />
        </el-form-item>

        <el-form-item label="新密碼" prop="newPassword">
          <el-input
              v-model="form.newPassword"
              type="password"
              placeholder="請輸入新密碼"
              show-password
              :prefix-icon="LockClosed"
          />
        </el-form-item>

        <el-form-item label="確認新密碼" prop="confirmPassword">
          <el-input
              v-model="form.confirmPassword"
              type="password"
              placeholder="請再次輸入新密碼"
              show-password
              :prefix-icon="CheckCircle"
          />
        </el-form-item>
      </el-form>

      <div class="password-rules">
        <h3>
          <el-icon><InfoFilled /></el-icon>
          密碼設定規則
        </h3>
        <ul>
          <li :class="{ 'rule-met': passwordLength }">
            <el-icon><Check /></el-icon>
            長度至少 6 個字元
          </li>
          <li :class="{ 'rule-met': passwordComplex }">
            <el-icon><Check /></el-icon>
            必須包含英文和數字的組合
          </li>
          <li :class="{ 'rule-met': passwordDifferent }">
            <el-icon><Check /></el-icon>
            新密碼不能與原始密碼相同
          </li>
        </ul>
      </div>

      <div class="dialog-footer">
        <el-button
            type="primary"
            @click="handleSubmit"
            :loading="loading"
            class="submit-button"
        >
          確認更改
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, defineProps, defineEmits, computed } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { Lock, Key, LockClosed, CheckCircle, Check, InfoFilled } from '@element-plus/icons-vue'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  account: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['passwordChanged', 'updateToken', 'update:visible'])

const formRef = ref(null)
const loading = ref(false)

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 密碼規則驗證計算屬性
const passwordLength = computed(() => form.newPassword.length >= 6)
const passwordComplex = computed(() => /^(?=.*[A-Za-z])(?=.*\d)/.test(form.newPassword))
const passwordDifferent = computed(() => form.newPassword !== form.oldPassword)

const validatePassword = (rule, value, callback) => {
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/
  if (!value) {
    callback(new Error('請輸入密碼'))
  } else if (!passwordRegex.test(value)) {
    callback(new Error('密碼必須至少6個字元且包含英文和數字'))
  } else {
    callback()
  }
}

const validateConfirmPassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error('請再次輸入密碼'))
  } else if (value !== form.newPassword) {
    callback(new Error('兩次輸入的密碼不一致'))
  } else {
    callback()
  }
}

const rules = {
  oldPassword: [
    { required: true, message: '請輸入原始密碼', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, trigger: 'blur', validator: validatePassword }
  ],
  confirmPassword: [
    { required: true, trigger: 'blur', validator: validateConfirmPassword }
  ]
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    loading.value = true

    const response = await axios.post(
        'http://localhost:5000/api/user/change-password',
        {
          account: props.account,
          oldPassword: form.oldPassword,
          newPassword: form.newPassword
        },
        {
          headers: {
            Authorization: `Bearer ${props.token}`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
    )

    if (response.data.token) {
      emit('updateToken', response.data.token)
      emit('passwordChanged', response.data.token)
      ElMessage.success('密碼更改成功！')
    } else {
      ElMessage.error('密碼更改失敗：未收到新的 token')
    }

  } catch (error) {
    console.error('密碼更改失敗:', error)
    if (error.response?.data?.msg) {
      ElMessage.error(error.response.data.msg)
    } else {
      ElMessage.error('密碼更改失敗，請稍後再試')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.password-change-dialog :deep(.el-dialog__header) {
  margin: 0;
  padding: 15px 20px 0;
}

.dialog-content {
  padding: 0 20px;
}

.form-header {
  text-align: center;
  margin-bottom: 20px;
}

.form-header .lock-icon {
  font-size: 40px;
  color: var(--el-color-primary);
  margin-bottom: 12px;
}

.form-header h2 {
  margin: 0 0 8px;
  font-size: 20px;
  color: var(--el-text-color-primary);
}

.form-header .subtitle {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.password-rules {
  margin: 16px 0;
  padding: 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 8px;
}

.password-rules h3 {
  margin: 0 0 8px;
  font-size: 15px;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.password-rules ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.password-rules li {
  margin: 6px 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: color 0.3s ease;
}

.password-rules li.rule-met {
  color: var(--el-color-success);
}

.password-rules li .el-icon {
  font-size: 14px;
}

.dialog-footer {
  text-align: center;
  margin: 16px 0;
}

.submit-button {
  width: 100%;
  height: 38px;
  font-size: 15px;
}

:deep(.el-form-item__label) {
  padding-bottom: 6px;
}

:deep(.el-input__wrapper) {
  padding: 1px 11px;
}

:deep(.el-input__inner) {
  height: 36px;
}

/* 調整表單間距 */
:deep(.el-form-item) {
  margin-bottom: 16px;
}
</style>