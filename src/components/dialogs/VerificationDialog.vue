<template>
  <el-dialog
      v-model="dialogVisible"
      title="帳號解鎖"
      width="400px"
      :close-on-click-modal="false"
      :show-close="false"
  >
    <div class="verification-content">
      <p class="message">您的帳號已被鎖定，請輸入驗證碼解鎖</p>
      <div class="code-input">
        <el-input
            v-model="verificationCode"
            placeholder="請輸入6位數驗證碼"
            maxlength="6"
            :disabled="isVerifying"
        />
      </div>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleVerify" :loading="isVerifying">
          驗證解鎖
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  account: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:visible', 'unlock-success'])

const dialogVisible = ref(false)
const verificationCode = ref('')
const isVerifying = ref(false)

watch(() => props.visible, (val) => {
  dialogVisible.value = val
  if (val) {
    verificationCode.value = '' // 重新打開對話框時清空驗證碼
  }
})

watch(dialogVisible, (val) => {
  if (!val) {
    emit('update:visible', false)
  }
})

const handleVerify = async () => {
  if (!verificationCode.value) {
    ElMessage.warning('請輸入驗證碼')
    return
  }

  if (verificationCode.value.length !== 6) {
    ElMessage.warning('請輸入6位數驗證碼')
    return
  }

  isVerifying.value = true

  try {
    const response = await axios.post('http://localhost:5000/api/user/verify-unlock', {
      account: props.account,
      verificationCode: verificationCode.value
    })

    if (response.data.success) {
      ElMessage.success('驗證成功，帳號已解鎖')
      emit('unlock-success')
      dialogVisible.value = false
    } else {
      ElMessage.error(response.data.msg || '驗證失敗')
    }
  } catch (error) {
    console.error('Verification error:', error)
    if (error.response?.data?.msg) {
      ElMessage.error(error.response.data.msg)
    } else {
      ElMessage.error('驗證失敗，請稍後再試')
    }
  } finally {
    isVerifying.value = false
  }
}

const handleCancel = () => {
  dialogVisible.value = false
}
</script>

<style scoped>
.verification-content {
  padding: 20px 0;
}

.message {
  margin-bottom: 20px;
  color: #666;
}

.code-input {
  width: 100%;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>