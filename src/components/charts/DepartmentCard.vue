<template>
  <div class="department-dashboard">
    <!-- 頂部橫幅 -->
    <div class="dashboard-header" :style="{ background: headerBackground }">
      <div class="header-content">
        <div class="department-title">
          <el-icon size="24"><OfficeBuilding /></el-icon>
          <h1>{{ getDepartmentLabel(department) }}</h1>
        </div>
        <div class="quick-stats">
          <el-space wrap>
            <el-statistic
                title="部門經理"
                :value="departmentManager.length"
                :value-style="{ color: departmentTheme.statColor, fontSize: '24px' }"
                title-style="color: rgba(255, 255, 255, 0.95); font-size: 14px; font-weight: 500;"
            >
              <template #suffix>
                <span class="suffix-text">人</span>
              </template>
            </el-statistic>
            <el-divider direction="vertical" />
            <el-statistic
                title="主管人數"
                :value="departmentSupervisors.length"
                :value-style="{ color: departmentTheme.statColor, fontSize: '24px' }"
                title-style="color: rgba(255, 255, 255, 0.7); font-size: 14px;"
            >
              <template #suffix>
                <span class="suffix-text">人</span>
              </template>
            </el-statistic>
            <el-divider direction="vertical" />
            <el-statistic
                title="科員人數"
                :value="departmentStaff.length"
                :value-style="{ color: departmentTheme.statColor, fontSize: '24px' }"
                title-style="color: rgba(255, 255, 255, 0.7); font-size: 14px;"
            >
              <template #suffix>
                <span class="suffix-text">人</span>
              </template>
            </el-statistic>
            <el-divider direction="vertical" />
            <el-statistic
                title="部門總人數"
                :value="staffList.length"
                :value-style="{ color: departmentTheme.statColor, fontSize: '24px' }"
                title-style="color: rgba(255, 255, 255, 0.7); font-size: 14px;"
            >
              <template #suffix>
                <span class="suffix-text">人</span>
              </template>
            </el-statistic>
          </el-space>
        </div>
      </div>
    </div>

    <!-- 主要內容區域 -->
    <div class="dashboard-content">
      <!-- 部門經理資訊卡 -->
      <template v-if="departmentManager.length > 0">
        <el-card
            v-for="manager in departmentManager"
            :key="manager.employeeId"
            class="manager-profile"
            shadow="hover"
        >
          <div class="manager-header">
            <el-avatar
                :size="80"
                :src="manager.avatar"
                :icon="UserFilled"
                class="manager-avatar"
            />
            <div class="manager-title">
              <el-tag size="large" :type="departmentTheme.tagType" effect="dark">部門經理</el-tag>
              <h2>{{ manager.name }}</h2>
            </div>
            <div class="manager-contacts">
              <el-button :type="departmentTheme.tagType" plain round size="small">
                <el-icon><Phone /></el-icon>
                {{ manager.extension || '未設置' }}
              </el-button>
              <el-button type="info" plain round size="small">
                <el-icon><Message /></el-icon>
                {{ manager.email }}
              </el-button>
            </div>
          </div>
        </el-card>
      </template>

      <!-- 主管列表 -->
      <div class="supervisors-grid">
        <h3 class="section-title" :style="{ color: departmentTheme.titleColor }">部門主管</h3>
        <el-row :gutter="20">
          <el-col
              v-for="supervisor in departmentSupervisors"
              :key="supervisor.employeeId"
              :xs="24"
              :sm="12"
              :md="8"
              :lg="6"
              :xl="6"
          >
            <el-card shadow="hover" class="supervisor-card">
              <div class="supervisor-header">
                <el-avatar
                    :size="60"
                    :src="supervisor.avatar"
                    :icon="UserFilled"
                />
                <div class="supervisor-info">
                  <el-tag size="small" :type="departmentTheme.tagType" effect="plain">主管</el-tag>
                  <h3>{{ supervisor.name }}</h3>
                </div>
              </div>
              <div class="supervisor-contacts">
                <el-descriptions :column="1" size="small" border>
                  <el-descriptions-item label="分機號碼">
                    <el-icon><Phone /></el-icon>
                    {{ supervisor.extension || '未設置' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="電子郵件">
                    <el-icon><Message /></el-icon>
                    {{ supervisor.email }}
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 科員列表 -->
      <div class="staff-grid">
        <h3 class="section-title" :style="{ color: departmentTheme.titleColor }">部門科員</h3>
        <el-row :gutter="16">
          <el-col
              v-for="staff in departmentStaff"
              :key="staff.employeeId"
              :xs="12"
              :sm="8"
              :md="6"
              :lg="4"
              :xl="3"
          >
            <el-card shadow="hover" class="staff-card">
              <div class="staff-content">
                <!-- 基本信息 -->
                <div class="staff-info">
                  <h4>{{ staff.name }}</h4>
                </div>

                <!-- 聯絡方式 -->
                <div class="contact-info">
                  <div class="contact-item">
                    <el-icon><Phone /></el-icon>
                    <span>{{ staff.extension || '未設置' }}</span>
                  </div>
                  <el-tooltip
                      :content="staff.email"
                      placement="top-start"
                      effect="dark"
                      :show-after="100"
                  >
                    <div class="contact-item">
                      <el-icon><Message /></el-icon>
                      <span class="truncate-text">{{ staff.email }}</span>
                    </div>
                  </el-tooltip>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, defineProps } from 'vue'
import {
  UserFilled,
  Phone,
  Message,
  OfficeBuilding
} from '@element-plus/icons-vue'

const props = defineProps({
  department: {
    type: String,
    required: true
  },
  staffList: {
    type: Array,
    required: true
  }
})

const headerBackground = computed(() => {
  const gradients = {
    'BD': 'linear-gradient(135deg, #4A90E2, #357ABD)', // 業務部 - 藍色系
    'FD': 'linear-gradient(135deg, #67C23A, #529b2e)', // 消金部 - 綠色系
    'LD': 'linear-gradient(135deg, #E6A23C, #b88230)'  // 借貸部 - 橙色系
  }
  return gradients[props.department] || gradients['BD']
})

const departmentTheme = computed(() => {
  const themes = {
    'BD': {
      tagType: 'primary',
      titleColor: '#1e88e5',
      statColor: '#ffffff'
    },
    'FD': {
      tagType: 'success',
      titleColor: '#43a047',
      statColor: '#ffffff'
    },
    'LD': {
      tagType: 'warning',
      titleColor: '#fb8c00',
      statColor: '#ffffff'
    }
  }
  return themes[props.department] || themes['BD']
})

const departmentManager = computed(() =>
    props.staffList.filter(staff => staff.position === 'M')
)

const departmentSupervisors = computed(() =>
    props.staffList.filter(staff => staff.position === 'S')
)

const departmentStaff = computed(() =>
    props.staffList.filter(staff => staff.position === 'C')
)

const getDepartmentLabel = (code) => ({
  'BD': '業務部',
  'FD': '消金部',
  'LD': '借貸部'
}[code] || code)
</script>

<style scoped>
.manager-profile + .manager-profile {
  margin-top: 16px;
}
.department-dashboard {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.dashboard-header {
  background: linear-gradient(135deg, #4A90E2, #357ABD);
  color: white;
  padding: 24px 0;
  margin-bottom: 24px;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.department-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.department-title h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
}

.quick-stats {
  background: rgba(255, 255, 255, 0.15);
  padding: 12px 24px;
  border-radius: 8px;
  backdrop-filter: blur(8px);
}

/* 修改標題樣式 */
:deep(.el-statistic) {
  .el-statistic__head {
    color: #FFFFFF !important;
    font-size: 14px;
    font-weight: 500;
    opacity: 1;
  }

  .el-statistic__content {
    color: #FFD700;
    font-size: 24px;

    .suffix-text {
      color: #FFFFFF;
      margin-left: 4px;
      font-size: 14px;
    }
  }
}

.dashboard-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
}

.manager-profile {
  margin-bottom: 24px;
  border-radius: 12px;
}

.manager-header {
  display: flex;
  align-items: center;
  gap: 24px;
}

.manager-avatar {
  border: 4px solid #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.manager-title {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.manager-title h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.manager-contacts {
  margin-left: auto;
  display: flex;
  gap: 12px;
}

.supervisors-grid {
  margin-bottom: 24px;
}

.supervisor-card {
  height: 100%;
  border-radius: 8px;
  transition: transform 0.2s;
  margin-bottom: 20px;
}

.supervisor-card:hover {
  transform: translateY(-4px);
}

.supervisor-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.supervisor-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.supervisor-info h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.supervisor-contacts {
  margin-top: 16px;
}

/* 科員卡片樣式 - 更新後 */
.staff-card {
  height: 100%;
  border-radius: 4px;
  transition: all 0.2s ease;
  margin-bottom: 12px;
}

.staff-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.staff-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
}

.staff-info {
  text-align: center;
}

.staff-info h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #606266;
}

.contact-item .el-icon {
  flex-shrink: 0;
}

.truncate-text {
  max-width: 120px; /* 或其他適合的寬度 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Element Plus 組件樣式覆寫 */
:deep(.el-card) {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

:deep(.el-descriptions__cell) {
  padding: 8px 12px;
}

:deep(.el-tag) {
  border-radius: 4px;
}

/* 暗色主題適配 */
:deep([class*='--dark']) {
  .department-dashboard {
    background: #1a1a1a;
  }

  .el-card {
    background: #1a1a1a;
    border-color: #2c2c2c;
  }

  .section-title {
    color: #8CB4FF;
  }

  .manager-avatar {
    border-color: #2c2c2c;
  }

  .staff-info h4 {
    color: #E5EAF3;
  }

  .contact-item {
    color: #A3A6AD;
  }
}

/* 響應式設計 */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .department-title {
    justify-content: center;
  }

  .quick-stats {
    padding: 12px 16px;
  }

  .manager-header {
    flex-direction: column;
    text-align: center;
  }

  .manager-contacts {
    margin: 16px 0 0 0;
    flex-direction: column;
    align-items: stretch;
  }

  .dashboard-content {
    padding: 0 16px;
  }

  .staff-content {
    padding: 6px;
  }

  .staff-info h4 {
    font-size: 13px;
  }

  .contact-item {
    font-size: 11px;
  }
}

/* 平板響應式調整 */
@media (max-width: 1024px) {
  .header-content {
    padding: 0 16px;
  }

  .dashboard-content {
    padding: 0 16px;
  }

  .staff-card {
    margin-bottom: 12px;
  }
}

/* 大屏幕優化 */
@media (min-width: 1440px) {
  .header-content,
  .dashboard-content {
    max-width: 1600px;
  }

  .staff-content {
    padding: 10px;
  }

  .staff-info h4 {
    font-size: 15px;
  }

  .contact-item {
    font-size: 13px;
  }
}
</style>