<template>
  <el-dialog
      :model-value="visible"
      @update:model-value="$emit('update:visible', $event)"
      title="員工資料檢視"
      width="800px"
      :close-on-click-modal="false"
      class="view-dialog"
      :top="'1vh'"
  >
    <div class="view-container">
      <!-- 個人資訊卡片 -->
      <div class="profile-card">
        <div class="profile-header">
          <el-avatar
              :size="90"
              :src="userData.avatar"
              :icon="UserFilled"
              class="user-avatar"
          />
          <div class="profile-title">
            <h3>{{ userData.name }}</h3>
            <div class="profile-subtitle">{{ userData.account }}</div>
            <div class="profile-meta">
              <div class="meta-item">
                <el-tag size="small" class="id-tag">{{ userData.employeeId }}</el-tag>
              </div>
              <div class="meta-item">
                <el-tag size="small" type="success" effect="plain">
                  {{ getDepartmentName(userData.department) }}
                </el-tag>
              </div>
              <div class="meta-item">
                <el-tag size="small" type="warning" effect="plain">
                  {{ getPositionName(userData.position) }}
                </el-tag>
              </div>
            </div>
          </div>
          <div class="profile-status">
            <el-tag
                :type="userData.isLocked ? 'danger' : 'success'"
                class="status-tag"
                effect="dark"
            >
              <el-icon class="status-icon">
                <Lock v-if="userData.isLocked"/>
                <Check v-else/>
              </el-icon>
              {{ userData.isLocked ? '帳號已鎖定' : '帳號正常' }}
            </el-tag>
          </div>
        </div>

        <!-- 詳細資訊區塊 -->
        <div class="details-section">
          <div class="info-grid">
            <!-- 基本資訊 -->
            <div class="info-group">
              <div class="info-item">
                <div class="info-label">帳號啟用狀況</div>
                <div class="info-value">
                  <el-tag
                      size="small"
                      :type="userData.isFirstLogin ? 'warning' : 'success'"
                  >
                    {{ userData.isFirstLogin ? '未曾登入' : '已登入過' }}
                  </el-tag>
                </div>
              </div>
              <div class="info-item">
                <div class="info-label">分機</div>
                <div class="info-value">{{ userData.extension || '未設置' }}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Email</div>
                <div class="info-value">{{ userData.email }}</div>
              </div>
              <div class="info-item">
                <div class="info-label">生日</div>
                <div class="info-value">
                  {{ userData.birthday ? formatDate(userData.birthday, false) : '未設置' }}
                </div>
              </div>
            </div>

            <!-- 聯絡資訊 -->
            <div class="info-group">
              <div class="info-item">
                <div class="info-label">個人電話</div>
                <div class="info-value">{{ userData.personalPhone || '未設置' }}</div>
              </div>
              <div class="info-item">
                <div class="info-label">緊急聯絡人</div>
                <div class="info-value">{{ userData.emergencyContact?.name || '未設置' }}</div>
              </div>
              <div class="info-item">
                <div class="info-label">緊急聯絡人關係</div>
                <div class="info-value">{{ userData.emergencyContact?.relationship || '未設置' }}</div>
              </div>
              <div class="info-item">
                <div class="info-label">緊急聯絡電話</div>
                <div class="info-value">{{ userData.emergencyContact?.phone || '未設置' }}</div>
              </div>
            </div>
          </div>

          <!-- 時間資訊 -->
          <div class="time-section">
            <div class="time-item">
              <el-icon><Calendar /></el-icon>
              建立時間：{{ formatDate(userData.createdAt) }}
            </div>
            <div class="time-item">
              <el-icon><Timer /></el-icon>
              最後登入：
              <span :class="{'no-login': !userData.lastLoginTime}">
                {{ userData.lastLoginTime ? formatDate(userData.lastLoginTime) : '尚未登入' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" class="footer-btn">關閉</el-button>
        <el-button
            v-if="showEditButton"
            type="primary"
            @click="handleEdit"
            class="footer-btn"
        >編輯資料</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
import {
  UserFilled,
  Lock,
  Check,
  Calendar,
  Timer
} from '@element-plus/icons-vue'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  userData: {
    type: Object,
    required: true
  },
  showEditButton: {  // 新增這個 prop
    type: Boolean,
    default: true  // 預設顯示編輯按鈕
  }
})

const emit = defineEmits(['update:visible', 'edit'])

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
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };

    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = false;
    }

    return d.toLocaleString('zh-TW', options);
  } catch (error) {
    console.error('日期格式化錯誤:', error);
    return '';
  }
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleEdit = () => {
  emit('edit', props.userData)
  emit('update:visible', false)
}
</script>

<style scoped>
.view-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.view-container {
  padding: 24px;
  background: #f8f9fb;
}

.profile-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.profile-header {
  display: flex;
  align-items: center;
  padding: 24px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  gap: 24px;
}

.user-avatar {
  border: 4px solid #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  background: #f0f2f5;
}

.profile-title {
  flex-grow: 1;
}

.profile-title h3 {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.profile-subtitle {
  color: #606266;
  font-size: 14px;
  font-family: monospace;
  margin-bottom: 12px;
}

.profile-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
}

.status-tag {
  padding: 8px 12px;
  font-weight: 500;
}

.status-icon {
  margin-right: 4px;
}

.details-section {
  padding: 24px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
  margin-bottom: 24px;
}

.info-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 13px;
  color: #909399;
  font-weight: 500;
}

.info-value {
  color: #2c3e50;
  font-size: 14px;
}

.info-value.highlight {
  font-family: monospace;
  font-weight: 600;
  color: #409eff;
}

.time-section {
  display: flex;
  gap: 24px;
  padding-top: 20px;
  border-top: 1px dashed #ebeef5;
  color: #606266;
  font-size: 13px;
}

.time-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.no-login {
  color: #909399;
  font-style: italic;
}

.dialog-footer {
  padding: 16px 24px;
  text-align: right;
  background: #f8f9fb;
  border-top: 1px solid #ebeef5;
}

.footer-btn {
  min-width: 90px;
}

:deep(.el-tag) {
  border-radius: 4px;
}

.id-tag {
  background-color: #f0f2f5;
  border-color: #e4e7ec;
  color: #606266;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .info-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .time-section {
    flex-direction: column;
    gap: 12px;
  }
}
</style>