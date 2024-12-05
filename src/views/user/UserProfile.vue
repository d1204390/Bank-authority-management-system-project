<template>
  <div class="profile-container">
    <!-- 主要內容區域 -->
    <div class="content-wrapper">
      <!-- 頁面標題和操作區 -->
      <div class="page-header">
        <div class="title-section">
          <h1 class="page-title">個人資料</h1>
          <p class="subtitle">查看和管理您的個人資訊</p>
        </div>
        <div class="button-group">
          <template v-if="isEditing">
            <el-button
                type="info"
                class="edit-button"
                @click="cancelEdit"
            >
              <el-icon class="button-icon">
                <Close />
              </el-icon>
              取消編輯
            </el-button>
            <el-button
                type="primary"
                class="edit-button is-editing"
                @click="toggleEdit"
            >
              <el-icon class="button-icon">
                <Check />
              </el-icon>
              儲存變更
            </el-button>
          </template>
          <template v-else>
            <el-button
                type="primary"
                class="edit-button"
                @click="startEdit"
            >
              <el-icon class="button-icon">
                <Edit />
              </el-icon>
              編輯資料
            </el-button>
          </template>
        </div>
      </div>

      <div class="profile-grid">
        <!-- 左側：個人照片和基本資訊 -->
        <el-card class="profile-card photo-card">
          <div class="photo-section">
            <el-upload
                class="avatar-uploader"
                :show-file-list="false"
                :auto-upload="false"
                :on-change="handleAvatarChange"
                :before-upload="beforeAvatarUpload"
                :disabled="!isEditing"
                accept="image/jpeg,image/png"
            >
              <div class="avatar-container">
                <img
                    v-if="avatarUrl"
                    :src="avatarUrl"
                    class="avatar"
                    alt="使用者照片"
                />
                <el-icon v-else class="avatar-placeholder">
                  <UserFilled />
                </el-icon>

                <div class="avatar-overlay" v-show="isEditing">
                  <el-icon class="camera-icon"><Camera /></el-icon>
                  <span>更換照片</span>
                </div>
              </div>
            </el-upload>

            <div class="basic-info">
              <h2 class="user-name">{{ form.name || '載入中...' }}</h2>
              <div class="user-info">
                <p class="id-item">
                  <span class="id-label">員工編號</span>
                  <span class="id-value">{{ form.employeeId || '載入中...' }}</span>
                </p>
                <p class="id-item">
                  <span class="id-label">職務代碼</span>
                  <span class="id-value">{{ form.account || '載入中...' }}</span>
                </p>
              </div>
              <div class="user-title">
                <el-tag
                    class="department-tag"
                    effect="light"
                    type="info"
                >
                  {{ getDepartmentName(form.department) || '載入中...' }}
                </el-tag>
                <el-tag
                    class="position-tag"
                    effect="light"
                    type="success"
                >
                  {{ getPositionName(form.position) || '載入中...' }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 右側：詳細資訊表單 -->
        <el-card class="profile-card details-card">
          <template #header>
            <div class="details-header">
              <h3>詳細資訊</h3>
              <el-tooltip
                  content="密碼修改請聯繫系統管理員"
                  placement="top"
              >
                <el-icon class="info-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </div>
          </template>

          <el-form
              ref="formRef"
              :model="form"
              :rules="rules"
              label-width="100px"
              class="details-form"
              :disabled="!isEditing"
          >
            <!-- 基本資料區塊 -->
            <div class="form-section">
              <h4 class="section-title">基本資料</h4>
              <div class="form-grid">
                <el-form-item label="姓名" prop="name">
                  <el-input
                      v-model="form.name"
                      :readonly="!isEditing"
                      class="custom-input"
                  />
                </el-form-item>

                <el-form-item label="部門">
                  <el-input
                      :modelValue="getDepartmentName(form.department)"
                      readonly
                      class="custom-input readonly-field"
                      :disabled="true"
                  />
                </el-form-item>

                <el-form-item label="職位">
                  <el-input
                      :modelValue="getPositionName(form.position)"
                      readonly
                      class="custom-input readonly-field"
                      :disabled="true"
                  />
                </el-form-item>

                <el-form-item label="Email" prop="gmailPrefix">
                  <div class="gmail-input-container">
                    <el-input
                        v-model="form.gmailPrefix"
                        :readonly="!isEditing"
                        class="custom-input gmail-prefix"
                        placeholder="請輸入 Gmail 帳號"
                    >
                      <template #append>
                        <span class="gmail-suffix">@gmail.com</span>
                      </template>
                    </el-input>
                  </div>
                </el-form-item>

                <el-form-item label="分機" prop="extension">
                  <el-input
                      v-model="form.extension"
                      :readonly="!isEditing"
                      class="custom-input"
                  />
                </el-form-item>

                <el-form-item label="生日" prop="birthday">
                  <el-date-picker
                      v-model="form.birthday"
                      type="date"
                      :disabled="!isEditing"
                      placeholder="請選擇生日"
                      format="YYYY/MM/DD"
                      value-format="YYYY-MM-DD"
                      class="custom-input"
                  />
                </el-form-item>

                <el-form-item label="個人電話" prop="personalPhone">
                  <el-input
                      v-model="form.personalPhone"
                      :readonly="!isEditing"
                      class="custom-input"
                      placeholder="請輸入手機號碼"
                  />
                </el-form-item>

                <el-form-item label="加入時間">
                  <el-input
                      :modelValue="formatDate(form.createdAt)"
                      readonly
                      class="custom-input readonly-field"
                      :disabled="true"
                  />
                </el-form-item>
              </div>
            </div>

            <!-- 緊急聯絡人區塊 -->
            <div class="form-section emergency-contact-section">
              <h4 class="section-title">緊急聯絡人資料</h4>
              <div class="form-grid">
                <el-form-item label="姓名" prop="emergencyContact.name">
                  <el-input
                      v-model="form.emergencyContact.name"
                      :readonly="!isEditing"
                      class="custom-input"
                      placeholder="請輸入緊急聯絡人姓名"
                  />
                </el-form-item>

                <el-form-item label="關係" prop="emergencyContact.relationship">
                  <el-input
                      v-model="form.emergencyContact.relationship"
                      :readonly="!isEditing"
                      class="custom-input"
                      placeholder="請輸入與緊急聯絡人關係"
                  />
                </el-form-item>

                <el-form-item
                    label="聯絡電話"
                    prop="emergencyContact.phone"
                    class="grid-full-width"
                >
                  <el-input
                      v-model="form.emergencyContact.phone"
                      :readonly="!isEditing"
                      class="custom-input"
                      placeholder="請輸入緊急聯絡人電話"
                  />
                </el-form-item>
              </div>
            </div>
          </el-form>

          <!-- 密碼修改提示 -->
          <div class="password-notice">
            <el-alert
                type="info"
                show-icon
                :closable="false"
            >
              <template #title>
                <span class="notice-title">密碼修改說明</span>
              </template>
              <template #default>
                <p class="notice-content">
                  如需修改密碼，請聯繫系統管理員協助處理。<br>
                  系統管理員分機：1234
                </p>
              </template>
            </el-alert>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  InfoFilled,
  Edit,
  Check,
  UserFilled,
  Camera,
  Close
} from '@element-plus/icons-vue'
import axios from 'axios'

// refs
const formRef = ref(null)
const isEditing = ref(false)
const originalForm = ref(null)
const originalAvatarUrl = ref('')
const tempAvatarFile = ref(null)  // 暫存選擇的檔案
const tempAvatarUrl = ref('')     // 暫存的預覽 URL

// 表單數據
const form = ref({
  name: '',
  account: '',
  department: '',
  position: '',
  email: '',
  gmailPrefix: '',
  extension: '',
  createdAt: '',
  birthday: '',
  personalPhone: '',
  emergencyContact: {
    name: '',
    phone: '',
    relationship: ''
  }
})

// 頭像相關
const avatarUrl = ref('')

// 表單驗證規則
// 表單驗證規則
const rules = {
  name: [
    { required: true, message: '請輸入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名長度應在 2 到 20 個字元之間', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '請輸入Email', trigger: 'blur' },
    { type: 'email', message: '請輸入正確的Email格式', trigger: 'blur' }
  ],
  extension: [
    { required: true, message: '請輸入分機號碼', trigger: 'blur' },
    { pattern: /^\d{4}$/, message: '請輸入4位數的分機號碼', trigger: 'blur' }
  ],
  birthday: [
    { required: true, message: '請選擇生日', trigger: 'blur' }
  ],
  personalPhone: [
    { required: true, message: '請輸入個人電話', trigger: 'blur' },
    { pattern: /^09\d{8}$/, message: '請輸入正確的手機號碼格式', trigger: 'blur' }
  ],
  'emergencyContact.name': [
    { required: true, message: '請輸入緊急聯絡人姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名長度應在 2 到 20 個字元之間', trigger: 'blur' }
  ],
  'emergencyContact.relationship': [
    { required: true, message: '請輸入與緊急聯絡人關係', trigger: 'blur' },
    { max: 10, message: '關係說明不能超過 10 個字元', trigger: 'blur' }
  ],
  'emergencyContact.phone': [
    { required: true, message: '請輸入緊急聯絡人電話', trigger: 'blur' },
    { pattern: /(^09\d{8}$)|(^0[2-8]\d{7,8}$)/, message: '請輸入正確的電話號碼格式', trigger: 'blur' }
  ],
  gmailPrefix: [
    { required: true, message: '請輸入 Gmail 帳號', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9._%+-]+$/,
      message: 'Gmail 帳號只能包含字母、數字和特殊符號(._%+-)'
    },
    {
      validator: (rule, value, callback) => {
        if (value && value.includes('@')) {
          callback(new Error('請只輸入 @ 之前的部分'));
        } else {
          callback();
        }
      },
      trigger: 'blur'
    }
  ]
};

// 照片上傳前驗證
const beforeAvatarUpload = (file) => {
  const isValidType = ['image/jpeg', 'image/png'].includes(file.type)
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isValidType) {
    ElMessage.error('只能上傳 JPG 或 PNG 格式的圖片!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('圖片大小不能超過 2MB!')
    return false
  }
  return true
}

// 處理頭像選擇
const handleAvatarChange = (file) => {
  if (!beforeAvatarUpload(file.raw)) {
    return
  }

    // 只讀取預覽，不立即上傳
    const reader = new FileReader()
    reader.readAsDataURL(file.raw)
    reader.onload = () => {
      tempAvatarFile.value = file.raw
      tempAvatarUrl.value = reader.result
      avatarUrl.value = reader.result  // 更新顯示的頭像
    }
  }


// 獲取用戶資料
const fetchUserInfo = async () => {
  try {
    const response = await axios.get('/api/user/profile')
    const email = response.data.email
    const gmailPrefix = email.split('@')[0]  // 分離出 @ 前的部分

    form.value = {
      ...response.data,
      employeeId: response.data.employeeId,
      gmailPrefix: gmailPrefix  // 設置 Gmail 前綴
    }
    avatarUrl.value = response.data.avatar || ''
    originalAvatarUrl.value = response.data.avatar || ''
  } catch (error) {
    console.error('獲取用戶資料失敗:', error)
    ElMessage.error('獲取用戶資料失敗')
  }
}

// 切換編輯狀態
// 在 UserProfile.vue 中修改 toggleEdit 函數
const toggleEdit = async () => {
  if (isEditing.value) {
    try {
      await formRef.value.validate()
      await ElMessageBox.confirm(
          '確定要儲存變更嗎？',
          '確認儲存',
          {
            confirmButtonText: '確定',
            cancelButtonText: '取消',
            type: 'warning'
          }
      )

      // 如果有新的頭像，先上傳
      if (tempAvatarFile.value) {
        const reader = new FileReader()
        reader.readAsDataURL(tempAvatarFile.value)

        const uploadResult = await new Promise((resolve, reject) => {
          reader.onload = async () => {
            try {
              const response = await axios.post('/api/user/upload-avatar', {
                base64Image: reader.result
              })
              resolve(response.data.avatar)
            } catch (error) {
              reject(error)
            }
          }
        })

        // 上傳成功後更新 URL
        avatarUrl.value = uploadResult
      }

      // 構建完整的 email
      const fullEmail = `${form.value.gmailPrefix}@gmail.com`

      // 更新其他資料
      await axios.put('/api/user/profile', {
        name: form.value.name,
        email: fullEmail,  // 發送完整的 email
        extension: form.value.extension,
        birthday: form.value.birthday,
        personalPhone: form.value.personalPhone,
        emergencyContact: {
          name: form.value.emergencyContact?.name,
          phone: form.value.emergencyContact?.phone,
          relationship: form.value.emergencyContact?.relationship
        }
      })

      ElMessage.success('資料更新成功')
      isEditing.value = false

      // 更新原始資料
      originalForm.value = JSON.parse(JSON.stringify(form.value))
      originalAvatarUrl.value = avatarUrl.value

      // 清除暫存的頭像資料
      tempAvatarFile.value = null
      tempAvatarUrl.value = ''

    } catch (error) {
      if (error?.message?.includes('validation')) {
        return
      }
      if (error !== 'cancel') {
        console.error('更新失敗:', error)
        const errorMessage = error.response?.data?.msg || '資料更新失敗，請重試'
        ElMessage.error(errorMessage)
      }
    }
  }
}

// 開始編輯
const startEdit = () => {
  originalForm.value = JSON.parse(JSON.stringify(form.value))
  originalAvatarUrl.value = avatarUrl.value
  isEditing.value = true
}

// 取消編輯
const cancelEdit = async () => {
  try {
    await ElMessageBox.confirm(
        '確定要取消編輯嗎？未儲存的變更將會遺失',
        '確認取消',
        {
          confirmButtonText: '確定',
          cancelButtonText: '返回編輯',
          type: 'warning'
        }
    )

    // 恢復表單資料
    form.value = JSON.parse(JSON.stringify(originalForm.value))
    avatarUrl.value = originalAvatarUrl.value

    // 清除暫存的頭像資料
    tempAvatarFile.value = null
    tempAvatarUrl.value = ''

    isEditing.value = false
    formRef.value?.clearValidate()
  } catch (error) {
    // 用戶點擊取消，繼續編輯
    console.log('繼續編輯')
  }
}

// 組件掛載時獲取數據
onMounted(() => {
  fetchUserInfo()
})

// 如果有使用到部門和職位映射的功能也需要导出
const departmentMap = {
  'BD': '業務部',
  'FD': '消金部',
  'LD': '借貸部'
}

const positionMap = {
  'M': '經理',
  'S': '主管',
  'C': '科員'
}

const getDepartmentName = (code) => {
  return departmentMap[code] || code
}

const getPositionName = (code) => {
  return positionMap[code] || code
}

const formatDate = (date, includeTime = true) => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }

  if (includeTime) {
    options.hour = '2-digit'
    options.minute = '2-digit'
  }

  return d.toLocaleDateString('zh-TW', options)
}
</script>

<style scoped>
/* 頁面容器與佈局 */
.profile-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 2rem;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

/* 頁面標題區域 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.title-section {
  flex-grow: 1;
}

.page-title {
  font-size: 2rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.2;
}

.subtitle {
  color: #666;
  margin-top: 0.5rem;
  font-size: 1rem;
}

.edit-button {
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
}

.edit-button.is-editing {
  background-color: #67c23a;
}

.button-icon {
  font-size: 1.2em;
}

/* 只讀字段樣式 */
.readonly-field {
  :deep(.el-input__wrapper) {
    background-color: #f5f7fa !important;
    border-color: #e4e7ed !important;
    cursor: not-allowed;
  }
  :deep(.el-input__inner) {
    color: #909399 !important;
    -webkit-text-fill-color: #909399 !important;
  }
  &:hover {
    transform: none !important;
  }
  &.is-disabled {
    .el-input__wrapper {
      box-shadow: none !important;
    }
  }
}

.details-form {
  .readonly-field + .el-form-item__label {
    color: #909399;
  }
}

.custom-input.readonly-field:hover {
  transform: none;
}

/* 網格佈局 */
.profile-grid {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 2rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.grid-full-width {
  grid-column: 1 / -1;
}

/* 照片卡片 */
.photo-card {
  height: fit-content;
}

.photo-section {
  text-align: center;
}

.avatar-container {
  width: 200px;
  height: 200px;
  margin: 0 auto 1.5rem;
  border-radius: 50%;
  position: relative;
  overflow: hidden;
  background-color: #f5f7fa;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 64px;
  color: #909399;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.avatar-container:hover .avatar-overlay {
  opacity: 1;
}

.camera-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

/* 基本資訊樣式 */
.basic-info {
  padding: 0 1rem;
}

.user-name {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 1rem;
}

.user-title {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin: 0.5rem 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.id-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  font-size: 0.9rem;
}

.id-label {
  color: #666;
  font-weight: 500;
}

.id-value {
  color: #1a1a1a;
  font-family: monospace;
  padding: 2px 6px;
  background: #f5f7fa;
  border-radius: 4px;
  font-weight: 500;
}

.department-tag {
  background-color: #e0f7fa;
  color: #006064;
  border: 1px solid #b2ebf2;
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: inline-block;
}

.position-tag {
  background-color: #ffebee;
  color: #d32f2f;
  border: 1px solid #ffcdd2;
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: inline-block;
}

.button-group {
  display: flex;
  gap: 12px;
}

.user-id {
  color: #666;
  font-size: 0.9rem;
}

/* 詳細資訊卡片 */
.details-card {
  height: fit-content;
}

.details-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.details-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 500;
}

.info-icon {
  color: #909399;
  cursor: help;
}

.password-notice {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.notice-title {
  font-weight: 500;
}

.notice-content {
  color: #666;
  line-height: 1.6;
}

/* 響應式設計 */
@media (max-width: 1200px) {
  .profile-grid {
    grid-template-columns: 300px 1fr;
  }
}

@media (max-width: 992px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .content-wrapper {
    padding: 0 1rem;
  }
}

@media (max-width: 768px) {
  .profile-container {
    padding: 1rem;
  }
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }
  .page-title {
    font-size: 1.5rem;
  }
  .edit-button {
    width: 100%;
    justify-content: center;
  }
  .section-title {
    font-size: 1rem;
    padding-bottom: 0.5rem;
  }
  .emergency-contact-section {
    margin-top: 1.5rem;
    padding-top: 0.5rem;
  }
}

/* Element Plus 自定義樣式 */
:deep(.el-card) {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

:deep(.el-card:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

:deep(.el-input__wrapper) {
  box-shadow: none !important;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #409eff;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
}

:deep(.el-alert) {
  border-radius: 8px;
}

.form-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.1rem;
  color: #606266;
  margin: 0 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #eee;
}

.emergency-contact-section {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.gmail-input-container {
  position: relative;
  width: 100%;
}

:deep(.gmail-prefix .el-input-group__append) {
  background-color: #f5f7fa;
  color: #606266;
  padding: 0 12px;
  font-size: 14px;
  border-radius: 0 8px 8px 0;
}

:deep(.gmail-prefix.is-disabled .el-input-group__append) {
  background-color: #f5f7fa;
  color: #909399;
}
</style>
