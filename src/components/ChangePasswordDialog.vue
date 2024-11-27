<template>
  <el-dialog
      title="首次登入密碼變更"
      :model-value="visible"
      @update:model-value="$emit('update:visible')"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      width="400px"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="原始密碼" prop="oldPassword">
        <el-input
            v-model="form.oldPassword"
            type="password"
            placeholder="請輸入原始密碼"
            show-password
        />
      </el-form-item>

      <el-form-item label="新密碼" prop="newPassword">
        <el-input
            v-model="form.newPassword"
            type="password"
            placeholder="請輸入新密碼"
            show-password
        />
      </el-form-item>

      <el-form-item label="確認新密碼" prop="confirmPassword">
        <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="請再次輸入新密碼"
            show-password
        />
      </el-form-item>
    </el-form>

    <div class="password-rules">
      <p>密碼規則：</p>
      <ul>
        <li>長度至少 6 個字元</li>
        <li>必須包含英文和數字的組合</li>
        <li>新密碼不能與原始密碼相同</li>
      </ul>
    </div>

    <template #footer>
      <el-button type="primary" @click="handleSubmit" :loading="loading">
        確認更改
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import axios from 'axios'
import { ref, reactive ,defineProps, defineEmits } from 'vue'
import { ElMessage } from 'element-plus'

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
.password-rules {
  margin: 20px 0;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.password-rules ul {
  margin: 10px 0 0 20px;
  padding: 0;
}

.password-rules li {
  margin: 5px 0;
  color: #666;
  font-size: 14px;
}
</style>