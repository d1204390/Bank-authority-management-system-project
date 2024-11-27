<template>
  <div class="employee-manage">
    <div class="content-wrapper">
      <h1 class="page-title">員工管理</h1>

      <!-- 員工統計資訊 -->
      <div class="statistics-bar">
        <el-card class="stat-card" shadow="never">
          <div class="stat-content">
            <div class="stat-label">
              <el-icon><User /></el-icon>
              <span>人數</span>
            </div>
            {{ filteredEmployeeData.length }}
          </div>
        </el-card>
      </div>


      <!-- 功能按鈕 -->
      <div class="tool-bar">
        <el-button type="success" @click="refreshTable">
          <el-icon><Refresh /></el-icon>重新整理
        </el-button>
        <el-button type="info" @click="resetFilters">
          <el-icon><Refresh /></el-icon>重置篩選
        </el-button>
        <el-button type="primary" @click="openAddEmployeeDialog">
          <el-icon><Plus /></el-icon>建立使用者
        </el-button>
      </div>

      <!-- 搜尋和篩選 -->
      <div class="filter-section">
        <el-input
            v-model="employeeIdQuery"
            placeholder="員工編號搜尋"
            class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-input v-model="searchQuery" placeholder="姓名關鍵字搜尋" class="search-input">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select v-model="departmentFilter" placeholder="部門篩選">
          <el-option label="全部" value="" />
          <el-option label="業務部" value="業務部" />
          <el-option label="消金部" value="消金部" />
          <el-option label="借貸部" value="借貸部" />
        </el-select>

        <el-select v-model="positionFilter" placeholder="職位篩選">
          <el-option label="全部" value="" />
          <el-option label="經理" value="經理" />
          <el-option label="主管" value="主管" />
          <el-option label="科員" value="科員" />
        </el-select>

        <el-select v-model="accountStatusFilter" placeholder="帳號狀態">
          <el-option label="全部" value="" />
          <el-option label="正常" value="active" />
          <el-option label="已鎖定" value="locked" />
        </el-select>

        <el-select v-model="sortOrder" placeholder="排序方式">
          <el-option label="員編 (升冪)" value="asc" />
          <el-option label="員編 (降冪)" value="desc" />
        </el-select>
      </div>

      <!-- 表格卡片 -->
      <el-card class="table-card">
        <el-table
            :data="filteredEmployeeData"
            style="width: 100%"
            :border="true"
            :stripe="true"
            highlight-current-row
            @row-click="handleRowClick"
        >
          <!-- 員工編號 -->
          <el-table-column
              prop="employeeId"
              label="員工編號"
              min-width="120"
              show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.employeeId || '無編號' }}
            </template>
          </el-table-column>

          <!-- 職務代碼 -->
          <el-table-column
              prop="id"
              label="職務代碼"
              min-width="120"
              show-overflow-tooltip
          />

          <!-- 姓名 -->
          <el-table-column
              prop="name"
              label="姓名"
              min-width="100"
              show-overflow-tooltip
          />

          <!-- 部門 -->
          <el-table-column
              prop="department"
              label="部門"
              min-width="100"
          />

          <!-- 職位 -->
          <el-table-column
              prop="position"
              label="職位"
              min-width="100"
          />

          <!-- 分機 -->
          <el-table-column
              prop="extension"
              label="分機"
              min-width="100"
              show-overflow-tooltip
              align="center"
          />

          <el-table-column
              label="帳號狀態"
              min-width="200"
              align="center"
          >
            <template #default="{ row }">
              <div class="account-status">
                <!-- 狀態標籤 -->
                <el-tag
                    :type="row.isLocked ? 'danger' : 'success'"
                    :effect="row.isLocked ? 'dark' : 'light'"
                    class="status-tag"
                    size="small"
                >
                  <template #icon>
                    <el-icon><CircleCheck v-if="!row.isLocked" /><CircleClose v-else /></el-icon>
                  </template>
                  {{ row.isLocked ? '已鎖定' : '正常' }}
                </el-tag>

                <!-- 狀態開關 -->
                <el-switch
                    v-model="row.isActive"
                    :loading="row.isProcessing"
                    :disabled="row.isProcessing"
                    @change="(val) => handleAccountStatusChange(row, val)"
                    active-text="啟用"
                    inactive-text="鎖定"
                    class="status-switch"
                    :activeValue="true"
                    :inactiveValue="false"
                />
                <!-- 狀態提示 -->
                <el-tooltip
                    :content="row.isLocked ?
            `帳號已鎖定至 ${formatLockTime(row.lockUntil)}` :
            '帳號使用正常'"
                    placement="top"
                    effect="dark"
                    :show-after="500"
                >
                  <el-icon
                      :class="['status-icon', { 'is-locked': row.isLocked }]"
                  >
                    <Lock v-if="row.isLocked" />
                    <Unlock v-else />
                  </el-icon>
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
          <!-- 操作 -->
          <el-table-column
              label="操作"
              fixed="right"
              min-width="150"
              align="center"
          >
            <template #default="scope">
              <el-button-group class="operation-buttons">
                <el-tooltip content="查看詳情" placement="top" :show-after="500">
                  <el-button
                      type="primary"
                      @click.stop="handleView(scope.row)"
                      :icon="View"
                      size="small"
                  />
                </el-tooltip>
                <el-tooltip content="編輯資料" placement="top" :show-after="500">
                  <el-button
                      type="primary"
                      @click.stop="handleEdit(scope.row)"
                      :icon="Edit"
                      size="small"
                  />
                </el-tooltip>
                <el-tooltip content="刪除使用者" placement="top" :show-after="500">
                  <el-button
                      type="danger"
                      @click.stop="handleDelete(scope.row)"
                      :icon="Delete"
                      size="small"
                  />
                </el-tooltip>
              </el-button-group>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 新增/編輯對話框 -->
      <el-dialog v-model="dialogVisible" :title="isEdit ? '編輯員工' : '新增員工'" width="50%">
        <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="80px"
        >
          <el-form-item label="姓名" prop="name">
            <el-input v-model="form.name" />
          </el-form-item>
          <el-form-item label="部門" prop="department">
            <el-select v-model="form.department" placeholder="請選擇部門" @change="generateDefaultAccount">
              <el-option label="業務部" value="業務部" />
              <el-option label="消金部" value="消金部" />
              <el-option label="借貸部" value="借貸部" />
            </el-select>
          </el-form-item>
          <el-form-item label="職位" prop="position">
            <el-select v-model="form.position" placeholder="請選擇職位" @change="generateDefaultAccount">
              <el-option label="經理" value="經理" />
              <el-option label="主管" value="主管" />
              <el-option label="科員" value="科員" />
            </el-select>
          </el-form-item>
          <el-form-item label="Email" prop="email">
            <div class="email-input-group">
              <el-input
                  v-model="emailPrefix"
                  placeholder="請輸入電子郵件"
                  @input="handleEmailInput"
                  class="email-prefix-input"
              />
              <span class="email-domain">@gmail.com</span>
            </div>
          </el-form-item>
          <el-form-item label="帳號">
            <el-input v-model="form.username" disabled placeholder="系統自動生成" />
          </el-form-item>
          <el-form-item label="密碼">
            <el-input v-model="form.password" disabled placeholder="系統自動生成" />
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="handleSubmit" :loading="isSubmitting">
              {{ isSubmitting ? '處理中...' : '確定' }}
            </el-button>
          </span>
        </template>
      </el-dialog>

      <!-- 進度對話框 -->
      <el-dialog
          v-model="progressVisible"
          title="處理進度"
          :close-on-click-modal="false"
          :show-close="false"
          width="30%"
      >
        <div class="progress-container">
          <el-steps :active="activeStep" finish-status="success">
            <el-step title="生成員工編號" />
            <el-step title="保存資料" />
            <el-step title="生成帳號" />
            <el-step title="發送郵件" />
          </el-steps>

          <div class="progress-message">
            {{ progressMessage }}
          </div>
        </div>
      </el-dialog>
    </div>
  </div>
  <!-- 查看詳情對話框 -->
  <ViewEmployeeDialog
      v-model:visible="viewDialogVisible"
      :user-data="currentViewUser"
      @edit="handleEdit"
  />
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import {
  Plus, Edit, View, Delete, Search, Refresh,
  Lock, Unlock, CircleCheck, CircleClose,
  User,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import ViewEmployeeDialog from '@/components/ViewEmployeeDialog.vue'
import { ElLoading } from 'element-plus'

// ref 宣告
const searchQuery = ref('')
const departmentFilter = ref('')
const positionFilter = ref('')
const sortOrder = ref('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const employeeData = ref([])
const formRef = ref(null)
const isSubmitting = ref(false)
const emailPrefix = ref('') // email 前綴的 ref
const accountStatusFilter = ref('')
const employeeIdQuery = ref('') // 新增員工編號搜尋

// 進度相關的 ref
const progressVisible = ref(false)
const activeStep = ref(0)
const progressMessage = ref('')

// 查看對話框相關的 ref
const viewDialogVisible = ref(false)
const currentViewUser = ref(null)

// 部門代碼映射
const departmentMap = {
  'BD': '業務部',
  'FD': '消金部',
  'LD': '借貸部'
}

// 職位代碼映射
const positionMap = {
  'M': '經理',
  'S': '主管',
  'C': '科員'
}

// 部門職位對應表
const prefixMap = {
  '業務部': { '經理': 'BDM', '主管': 'BDS', '科員': 'BDC' },
  '消金部': { '經理': 'FDM', '主管': 'FDS', '科員': 'FDC' },
  '借貸部': { '經理': 'LDM', '主管': 'LDS', '科員': 'LDC' }
}

// 表單驗證規則
const rules = {
  name: [
    { required: true, message: '請輸入姓名', trigger: 'blur' }
  ],
  department: [
    { required: true, message: '請選擇部門', trigger: 'change' }
  ],
  position: [
    { required: true, message: '請選擇職位', trigger: 'change' }
  ],
  email: [
    { required: true, message: '請輸入電子郵件', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        const prefix = value.split('@')[0]
        if (!prefix || !/^[a-zA-Z0-9._%+-]+$/.test(prefix)) {
          callback(new Error('電子郵件格式不正確'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const form = reactive({
  name: '',
  department: '',
  position: '',
  extension: '',
  username: '',
  password: '',
  email: ''
})

// 處理 email 輸入
const handleEmailInput = (value) => {
  emailPrefix.value = value
  form.email = value ? `${value}@gmail.com` : ''
}

// 格式化鎖定時間
const formatLockTime = (lockUntil) => {
  if (!lockUntil) return ''
  return new Date(lockUntil).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 轉換部門代碼為中文
const convertDepartment = (code) => {
  return departmentMap[code] || code
}

// 轉換職位代碼為中文
const convertPosition = (code) => {
  return positionMap[code] || code
}

// 篩選後的員工數據
const filteredEmployeeData = computed(() => {
  let result = [...employeeData.value]

  // 員工編號搜尋
  if (employeeIdQuery.value) {
    result = result.filter(employee =>
        employee.employeeId?.toString().includes(employeeIdQuery.value)
    )
  }

  // 姓名搜尋
  if (searchQuery.value) {
    result = result.filter(employee =>
        employee.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  // 部門篩選
  if (departmentFilter.value) {
    result = result.filter(employee =>
        employee.department === departmentFilter.value
    )
  }

  // 職位篩選
  if (positionFilter.value) {
    result = result.filter(employee =>
        employee.position === positionFilter.value
    )
  }

  // 帳號狀態篩選
  if (accountStatusFilter.value) {
    result = result.filter(employee =>
        accountStatusFilter.value === 'locked' ? employee.isLocked : !employee.isLocked
    )
  }

  // 排序
  if (sortOrder.value) {
    result.sort((a, b) => {
      // 確保存在員工編號，如果不存在則使用空字符串作為預設值
      const aId = a.employeeId || '';
      const bId = b.employeeId || '';

      if (sortOrder.value === 'asc') {
        return aId.localeCompare(bId)
      }
      return bId.localeCompare(aId)
    })
  }

  return result
})

// 獲取員工列表方法
const fetchEmployees = async () => {
  try {
    const [usersResponse, lockStatusResponse] = await Promise.all([
      axios.get('/api/user/employees'),
      axios.get('/api/user/lock-status')
    ])

    const lockStatusMap = new Map(
        lockStatusResponse.data.map(status => [status.account, status])
    )

    employeeData.value = usersResponse.data.map(user => ({
      employeeId: user.employeeId,
      id: user.account,
      name: user.name,
      department: convertDepartment(user.department),
      position: convertPosition(user.position),
      extension: user.extension,
      username: user.account,
      email: user.email,
      avatar: user.avatar,  // 添加這行來獲取頭像
      createdAt: user.createdAt,  // 建立時間
      raw_department: user.department,
      raw_position: user.position,
      isLocked: lockStatusMap.get(user.account)?.status === 'locked',
      isActive: !(lockStatusMap.get(user.account)?.status === 'locked'),
      lockUntil: lockStatusMap.get(user.account)?.lockUntil,
      isProcessing: false
    }))
  } catch (error) {
    console.error('獲取用戶列表失敗:', error)
    ElMessage.error('獲取用戶列表失敗')
  }
}

// 處理帳號狀態變更
const handleAccountStatusChange = async (row, newValue) => {
  try {
    row.isProcessing = true

    await ElMessageBox.confirm(
        `確定要${newValue ? '啟用' : '鎖定'}使用者 ${row.name} 的帳號嗎？`,
        '確認操作',
        {
          confirmButtonText: '確定',
          cancelButtonText: '取消',
          type: newValue ? 'warning' : 'danger'
        }
    )

    const response = await axios.post('/api/user/toggle-lock', {
      account: row.username,
      action: newValue ? 'unlock' : 'lock'
    })

    if (response.data.success) {
      row.isLocked = !newValue
      row.isActive = newValue
      row.lockUntil = response.data.lockUntil
      ElMessage.success(`已${newValue ? '啟用' : '鎖定'}使用者帳號`)
    } else {
      throw new Error(response.data.message)
    }
  } catch (error) {
    if (error === 'cancel') {
      row.isActive = !newValue
      console.log('操作已取消')
    } else {
      console.error('狀態更新失敗:', error)
      ElMessage.error('操作失敗，請重試')
      row.isActive = !newValue
    }
  } finally {
    row.isProcessing = false
  }
}

// 生成隨機密碼
const generateRandomPassword = () => {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    password += characters[randomIndex]
  }
  return password
}

// 生成預設帳號
const generateDefaultAccount = () => {
  if (!form.department || !form.position) {
    form.username = '';
    form.password = '';
    return;
  }

  const prefix = prefixMap[form.department]?.[form.position];
  if (!prefix) {
    form.username = '';
    form.password = '';
    return;
  }

  try {
    // 篩選出所有相同前綴的帳號
    const existingAccounts = employeeData.value
        .filter(employee => employee.username?.startsWith(prefix))
        .map(employee => {
          const numStr = employee.username.slice(prefix.length);
          const num = parseInt(numStr, 10);
          return isNaN(num) ? 0 : num;
        })
        .sort((a, b) => b - a);

    // 找出最大的編號並加1
    const maxNumber = existingAccounts.length > 0 ? existingAccounts[0] : 0;
    const newNumber = String(maxNumber + 1).padStart(3, '0');

    form.username = `${prefix}${newNumber}`;
    form.password = generateRandomPassword();

    // 驗證生成的帳號是否已存在
    const isDuplicate = employeeData.value.some(
        employee => employee.username === form.username
    );

    if (isDuplicate) {
      console.error('Generated duplicate account:', form.username);
      ElMessage.error('帳號生成錯誤，請聯繫系統管理員');
      return;
    }

    console.log('Generated new account:', form.username);

  } catch (error) {
    console.error('Generate account error:', error);
    ElMessage.error('帳號生成失敗，請重試');
    form.username = '';
    form.password = '';
  }
};

// 開啟新增對話框
const openAddEmployeeDialog = () => {
  dialogVisible.value = true
  isEdit.value = false
  resetForm()
  generateDefaultAccount()
}

// 重置表單
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  form.name = ''
  form.department = ''
  form.position = ''
  form.extension = ''
  form.username = ''
  form.password = ''
  form.email = ''
  emailPrefix.value = '' // 重置 email 前綴
}

// 重置進度
const resetProgress = () => {
  activeStep.value = 0
  progressMessage.value = ''
  progressVisible.value = false
  isSubmitting.value = false
}

// 編輯處理
const handleEdit = (row) => {
  isEdit.value = true
  dialogVisible.value = true
  Object.assign(form, {
    ...row,
    department: row.raw_department || row.department,
    position: row.raw_position || row.position,
    email: row.email || ''
  })
  // 設置 email 前綴
  emailPrefix.value = form.email ? form.email.split('@')[0] : ''
}

// 查看處理
const handleView = async (row) => {
  try {
    // 顯示載入中
    const loading = ElLoading.service({
      lock: true,
      text: '載入中...',
      background: 'rgba(0, 0, 0, 0.7)'
    })

    // 獲取完整的用戶詳情
    const response = await axios.get(`/api/user/employee/${row.username}/details`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    })

    // 合併表格數據和詳細數據
    currentViewUser.value = {
      ...row,
      ...response.data,
      // 保持原有的格式化後的部門和職位顯示
      department: convertDepartment(response.data.department),
      position: convertPosition(response.data.position),
      // 保存原始的部門和職位代碼
      raw_department: response.data.department,
      raw_position: response.data.position,
      // 確保帳號狀態正確顯示
      isLocked: response.data.isLocked || row.isLocked,
      isActive: response.data.isActive || row.isActive,
      // 格式化時間相關資訊
      createdAt: response.data.createdAt,
      lastLoginTime: response.data.lastLoginTime,
      // 個人資訊
      birthday: response.data.birthday,
      personalPhone: response.data.personalPhone,
      // 緊急聯絡人資訊
      emergencyContact: {
        name: response.data.emergencyContact?.name || '',
        phone: response.data.emergencyContact?.phone || '',
        relationship: response.data.emergencyContact?.relationship || ''
      }
    }

    // 關閉載入中
    loading.close()

    // 打開詳情對話框
    viewDialogVisible.value = true

  } catch (error) {
    // 錯誤處理
    console.error('獲取用戶詳情失敗:', error)
    ElMessage.error(error.response?.data?.msg || '獲取用戶詳情失敗')

    // 如果發生錯誤，仍然顯示基本資訊
    currentViewUser.value = row
    viewDialogVisible.value = true
  }
}


// 刪除處理
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
        `確定要刪除 ${row.name} 的資料嗎？`,
        '警告',
        {
          confirmButtonText: '確定',
          cancelButtonText: '取消',
          type: 'warning',
        }
    )

    await axios.delete('/api/user/employee', {
      data: {
        account: row.username
      }
    })

    ElMessage.success('刪除成功')
    await fetchEmployees()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('刪除失敗:', error)
      ElMessage.error('刪除失敗，請重試')
    }
  }
}

// 提交處理
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    isSubmitting.value = true

    progressVisible.value = true
    progressMessage.value = '正在生成員工編號...'
    activeStep.value = 1

    // 先獲取新的員工編號
    const employeeIdResponse = await axios.get('/api/user/generate-employee-id')
    const employeeId = employeeIdResponse.data.employeeId

    progressMessage.value = '正在保存用戶資料...'
    activeStep.value = 2

    // 在提交數據時包含員工編號
    const response = await axios.post('/api/user/register', {
      employeeId,  // 添加員工編號
      name: form.name,
      department: form.department,
      position: form.position,
      account: form.username,
      password: form.password,
      email: form.email
    })

    progressMessage.value = '正在生成帳號...'
    activeStep.value = 3
    await new Promise(resolve => setTimeout(resolve, 500))

    progressMessage.value = '正在發送郵件通知...'
    activeStep.value = 4  // 步驟數增加了
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (response.status === 201) {
      progressMessage.value = '處理完成！'
      await fetchEmployees()

      setTimeout(() => {
        resetProgress()
        dialogVisible.value = false
        resetForm()
        ElMessage.success('新增成功，帳號密碼已發送至使用者信箱')
      }, 1000)
    }
  } catch (error) {
    resetProgress()
    if (error?.message?.includes('validation')) {
      return
    }
    console.error('新增失敗:', error)
    ElMessage.error('新增失敗，請重試')
  }
}

// 刷新表格數據方法
const refreshTable = async () => {
  try {
    const loading = ElLoading.service({
      lock: true,
      text: '更新資料中...',
      background: 'rgba(0, 0, 0, 0.7)'
    })

    await fetchEmployees()
    ElMessage.success('資料已更新')

    loading.close()
  } catch (error) {
    console.error('更新資料失敗:', error)
    ElMessage.error('更新資料失敗，請重試')
  }
}

// 重置篩選
const resetFilters = () => {
  employeeIdQuery.value = ''
  searchQuery.value = ''
  departmentFilter.value = ''
  positionFilter.value = ''
  sortOrder.value = ''
  accountStatusFilter.value = ''
}

// 組件載入時獲取數據
onMounted(() => {
  fetchEmployees()
})
</script>

<style scoped>
/* 主要布局 */
.employee-manage {
  min-height: 100vh;
  background-color: #f0f2f5;
  padding: 20px;
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.page-title {
  text-align: center;
  color: #303133;
  margin-bottom: 30px;
  font-size: 24px;
}

/* 工具欄和篩選區 */
.tool-bar {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 8px; /* 添加按鈕間距 */
}

.filter-section {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: nowrap;
  justify-content: flex-start;
}

.search-input {
  width: 250px;
}

/* 表格相關 */
.table-card {
  margin-top: 20px;
  border-radius: 8px;
  width: 100%;
  overflow-x: hidden;
}

:deep(.el-table) {
  border-radius: 8px;
}

:deep(.el-table th) {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: bold;
}

:deep(.el-table .el-table__cell) {
  padding: 8px 0;
}

:deep(.el-table .cell) {
  padding: 0 8px;
}

/* 帳號狀態相關 */
.account-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 65px;
}

.status-icon {
  font-size: 16px;
  color: #67c23a;
  cursor: help;

  &.is-locked {
    color: #f56c6c;
  }
}

.email-input-group {
  display: flex;
  align-items: center;
  width: 100%;
}

.email-prefix-input {
  flex: 1;
}

.email-domain {
  margin-left: 8px;
  padding: 0 12px;
  height: 32px;
  line-height: 32px;
  background-color: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
  white-space: nowrap;
}

/* Switch 開關樣式 */
:deep(.el-switch) {
  margin: 0 4px;

  .el-switch__label {
    font-size: 12px;
    color: #666;

    &.is-active {
      color: #409EFF;
    }
  }

  &.is-checked .el-switch__core {
    background-color: #67c23a;
    border-color: #67c23a;
  }

  &:not(.is-checked) .el-switch__core {
    background-color: #f56c6c;
    border-color: #f56c6c;
  }
}

/* 標籤樣式 */
.el-tag {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  font-size: 12px;

  .el-icon {
    margin-right: 4px;
    font-size: 14px;
  }
}

/* 按鈕組 */
:deep(.el-button-group) {
  display: flex;
  gap: 4px;
}

/* Select 下拉選單 */
:deep(.el-select) {
  width: 180px;
}

/* 進度條相關 */
.progress-container {
  padding: 20px;
}

.progress-message {
  text-align: center;
  margin-top: 20px;
  color: #409EFF;
  font-size: 14px;
  min-height: 30px;
}

:deep(.el-steps) {
  margin-bottom: 20px;
}

:deep(.el-step__title) {
  font-size: 14px;
}

/* 對話框相關 */
:deep(.el-dialog) {
  .el-dialog__body {
    padding: 20px;
  }

  .el-form-item__label {
    font-weight: 500;
  }

  .el-input.is-disabled .el-input__inner {
    background-color: #f5f7fa;
    color: #909399;
  }
}

/* 響應式設計 */
@media (max-width: 1024px) {
  .content-wrapper {
    padding: 10px;
  }

  .page-title {
    font-size: 20px;
  }

  .filter-section {
    flex-direction: column;
    align-items: flex-start;
  }

  .search-input, :deep(.el-select) {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .page-title {
    font-size: 18px;
    text-align: left;
  }

  .tool-bar {
    justify-content: center;
  }

  .table-card {
    margin-top: 10px;
  }
}

@media (max-width: 480px) {
  .content-wrapper {
    padding: 5px;
  }

  .page-title {
    font-size: 16px;
  }

  .filter-section {
    gap: 8px;
  }

  :deep(.el-table-column) {
    font-size: 14px;
  }

  .progress-container {
    padding: 10px;
  }
}

.statistics-bar {
  display: flex;
  justify-content: center;
  margin: -15px auto 20px;
  width: fit-content; /* 改為自適應寬度 */
}

.stat-card {
  background-color: #f5f7fa;
  border: none;
  width: auto; /* 改為自適應寬度 */
}

:deep(.el-card__body) {
  padding: 6px 12px; /* 減少內邊距 */
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 8px; /* 更小的間距 */
  color: #409EFF;
  font-size: 16px;
  font-weight: 500;
  white-space: nowrap; /* 防止換行 */
}

.stat-label {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  font-size: 13px;
}
</style>