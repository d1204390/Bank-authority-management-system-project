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
        <el-button
            type="primary"
            class="edit-button"
            :class="{ 'is-editing': isEditing }"
            @click="toggleEdit"
        >
          <el-icon class="button-icon">
            <component :is="isEditing ? Check : Edit" />
          </el-icon>
          {{ isEditing ? '儲存變更' : '編輯資料' }}
        </el-button>
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
              <p class="user-id">員工編號：{{ form.account }}</p>
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

              <el-form-item label="Email" prop="email">
                <el-input
                    v-model="form.email"
                    :readonly="!isEditing"
                    class="custom-input"
                />
              </el-form-item>

              <el-form-item label="分機" prop="extension">
                <el-input
                    v-model="form.extension"
                    :readonly="!isEditing"
                    class="custom-input"
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
  Camera
} from '@element-plus/icons-vue'
import axios from 'axios'

// refs
const formRef = ref(null)
const isEditing = ref(false)

// 表單數據
const form = ref({
  name: '',
  account: '',
  department: '',
  position: '',
  email: '',
  extension: '',
  createdAt: ''
})

// 頭像相關
const avatarUrl = ref('')

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
    { pattern: /^\d{4}$/, message: '請輸入4位數的分機號碼', trigger: 'blur' }
  ]
}

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

  const reader = new FileReader()
  reader.readAsDataURL(file.raw)
  reader.onload = async () => {
    try {
      const response = await axios.post('/api/user/upload-avatar', {
        base64Image: reader.result
      })

      if (response.data.avatar) {
        avatarUrl.value = response.data.avatar
        ElMessage.success('照片上傳成功')
      }
    } catch (error) {
      console.error('上傳錯誤:', error)
      const errorMessage = error.response?.data?.msg || error.message || '未知錯誤'
      ElMessage.error(`照片上傳失敗: ${errorMessage}`)
    }
  }
}

// 獲取用戶資料
const fetchUserInfo = async () => {
  try {
    const response = await axios.get('/api/user/profile')
    form.value = response.data
    avatarUrl.value = response.data.avatar || ''
  } catch (error) {
    console.error('獲取用戶資料失敗:', error)
    ElMessage.error('獲取用戶資料失敗')
  }
}

// 切換編輯狀態
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

      await axios.put('/api/user/profile', {
        name: form.value.name,
        email: form.value.email,
        extension: form.value.extension
      })

      ElMessage.success('資料更新成功')
      isEditing.value = false
    } catch (error) {
      if (error !== 'cancel') {
        console.error('更新失敗:', error)
        ElMessage.error('資料更新失敗，請重試')
      }
    }
  } else {
    isEditing.value = true
  }
}

// 組件掛載時獲取數據
onMounted(() => {
  fetchUserInfo()
})

// 部門映射
const departmentMap = {
  'BD': '業務部',
  'FD': '消金部',
  'LD': '借貸部'
}

// 職位映射
const positionMap = {
  'M': '經理',
  'S': '主管',
  'C': '科員'
}

// 獲取部門名稱
const getDepartmentName = (code) => {
  return departmentMap[code] || code
}

// 獲取職位名稱
const getPositionName = (code) => {
  return positionMap[code] || code
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
/* ================================
   頁面容器與佈局
================================ */
.profile-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 2rem;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

/* ================================
   頁面標題區域
================================ */
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

/* ================================
   只讀字段樣式
================================ */
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

/* ================================
   網格佈局
================================ */
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

/* ================================
   照片卡片
================================ */
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

/* ================================
   基本資訊樣式
================================ */
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

.department-tag {
  background-color: #E0F7FA; /* 柔和淡藍色 */
  color: #006064;           /* 深藍色文字，提升高級感 */
  border: 1px solid #B2EBF2; /* 細邊框，略深於背景 */
  border-radius: 8px;       /* 圓角設計，讓標籤更柔和 */
  padding: 5px 10px;        /* 增加內距，讓文字更舒適 */
  font-size: 14px;          /* 適中的文字大小 */
  font-weight: 500;         /* 半粗體，增加文字的穩重感 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* 輕微陰影，增加立體感 */
  display: inline-block;    /* 保持標籤樣式不會拉伸 */
}

.position-tag {
  background-color: #FFEBEE; /* 柔和的淡紅色背景 */
  color: #D32F2F;           /* 深紅色文字，顯示穩重與高級感 */
  border: 1px solid #FFCDD2; /* 細紅色邊框，略深於背景 */
  border-radius: 8px;       /* 圓角設計，保持柔和風格 */
  padding: 5px 10px;        /* 舒適的內距，讓內容更清晰 */
  font-size: 14px;          /* 與淡藍風格一致的文字大小 */
  font-weight: 500;         /* 半粗體，增強專業感 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* 輕微陰影，提升層次感 */
  display: inline-block;    /* 保持標籤樣式不會拉伸 */
}



.user-id {
  color: #666;
  font-size: 0.9rem;
}

/* ================================
   詳細資訊卡片
================================ */
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

/* ================================
   密碼提示
================================ */
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

/* ================================
   響應式設計
================================ */
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
}

/* ================================
   Element Plus 自定義樣式
================================ */
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
</style>