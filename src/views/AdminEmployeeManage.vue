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
            :data="paginatedData"
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

          <!-- 帳號狀態 -->
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
                <el-tooltip content="修改密碼" placement="top" :show-after="500">
                  <el-button
                      type="warning"
                      @click.stop="handleResetPassword(scope.row)"
                      :icon="Key"
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

        <!-- 分頁組件 -->
        <div class="pagination-container">
          <el-pagination
              v-model:currentPage="currentPage"
              v-model:pageSize="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="filteredEmployeeData.length"
              layout="sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
              :page-size-opts="[
      { value: 10, label: '10筆/頁' },
      { value: 20, label: '20筆/頁' },
      { value: 50, label: '50筆/頁' },
      { value: 100, label: '100筆/頁' }
    ]"
              prev-text="上一頁"
              next-text="下一頁"
          />
        </div>
      </el-card>

      <!-- 新增/編輯對話框 -->
      <el-dialog v-model="dialogVisible" :title="isEdit ? '編輯員工' : '新增員工'" width="50%">
        <!-- 表單內容 -->
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
import { ref, reactive, onMounted, computed, watch } from 'vue'
import {
  Plus, Edit, View, Delete, Search, Refresh,
  Lock, Unlock, CircleCheck, CircleClose,
  User,Key,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import ViewEmployeeDialog from '@/components/ViewEmployeeDialog.vue'
import { ElLoading } from 'element-plus'

// === 基礎狀態 ref 宣告 ===
const searchQuery = ref('')
const departmentFilter = ref('')
const positionFilter = ref('')
const sortOrder = ref('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const employeeData = ref([])
const formRef = ref(null)
const isSubmitting = ref(false)
const emailPrefix = ref('')
const accountStatusFilter = ref('')
const employeeIdQuery = ref('')

// === 進度狀態 ref ===
const progressVisible = ref(false)
const activeStep = ref(0)
const progressMessage = ref('')

// === 對話框狀態 ref ===
const viewDialogVisible = ref(false)
const currentViewUser = ref(null)

// === 分頁相關 ref ===
const currentPage = ref(1)
const pageSize = ref(10)

// === 映射表 ===
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

const prefixMap = {
  '業務部': { '經理': 'BDM', '主管': 'BDS', '科員': 'BDC' },
  '消金部': { '經理': 'FDM', '主管': 'FDS', '科員': 'FDC' },
  '借貸部': { '經理': 'LDM', '主管': 'LDS', '科員': 'LDC' }
}

// === 表單驗證規則 ===
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

// === 表單數據 ===
const form = reactive({
  name: '',
  department: '',
  position: '',
  extension: '',
  username: '',
  password: '',
  email: ''
})

// === Computed Properties ===
// 篩選後的員工數據
const filteredEmployeeData = computed(() => {
  let result = [...employeeData.value]

  if (employeeIdQuery.value) {
    result = result.filter(employee =>
        employee.employeeId?.toString().includes(employeeIdQuery.value)
    )
  }

  if (searchQuery.value) {
    result = result.filter(employee =>
        employee.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  if (departmentFilter.value) {
    result = result.filter(employee =>
        employee.department === departmentFilter.value
    )
  }

  if (positionFilter.value) {
    result = result.filter(employee =>
        employee.position === positionFilter.value
    )
  }

  if (accountStatusFilter.value) {
    result = result.filter(employee =>
        accountStatusFilter.value === 'locked' ? employee.isLocked : !employee.isLocked
    )
  }

  if (sortOrder.value) {
    result.sort((a, b) => {
      const aId = a.employeeId || ''
      const bId = b.employeeId || ''
      return sortOrder.value === 'asc' ? aId.localeCompare(bId) : bId.localeCompare(aId)
    })
  }

  return result
})

// 分頁後的數據
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredEmployeeData.value.slice(start, end)
})

// === Methods ===
// Email 相關
const handleEmailInput = (value) => {
  emailPrefix.value = value
  form.email = value ? `${value}@gmail.com` : ''
}

// 格式化時間
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

// 轉換代碼
const convertDepartment = (code) => departmentMap[code] || code
const convertPosition = (code) => positionMap[code] || code

// 帳號相關
const generateRandomPassword = () => {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 6 }, () =>
      characters[Math.floor(Math.random() * characters.length)]
  ).join('')
}

const generateDefaultAccount = () => {
  if (!form.department || !form.position) {
    form.username = ''
    form.password = ''
    return
  }

  const prefix = prefixMap[form.department]?.[form.position]
  if (!prefix) {
    form.username = ''
    form.password = ''
    return
  }

  try {
    const existingAccounts = employeeData.value
        .filter(employee => employee.username?.startsWith(prefix))
        .map(employee => {
          const numStr = employee.username.slice(prefix.length)
          const num = parseInt(numStr, 10)
          return isNaN(num) ? 0 : num
        })
        .sort((a, b) => b - a)

    const maxNumber = existingAccounts.length > 0 ? existingAccounts[0] : 0
    const newNumber = String(maxNumber + 1).padStart(3, '0')
    form.username = `${prefix}${newNumber}`
    form.password = generateRandomPassword()

    const isDuplicate = employeeData.value.some(
        employee => employee.username === form.username
    )

    if (isDuplicate) {
      console.error('Generated duplicate account:', form.username)
      ElMessage.error('帳號生成錯誤，請聯繫系統管理員')
      return
    }
  } catch (error) {
    console.error('Generate account error:', error)
    ElMessage.error('帳號生成失敗，請重試')
    form.username = ''
    form.password = ''
  }
}

// 表單相關
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  Object.assign(form, {
    name: '',
    department: '',
    position: '',
    extension: '',
    username: '',
    password: '',
    email: ''
  })
  emailPrefix.value = ''
}

const resetProgress = () => {
  activeStep.value = 0
  progressMessage.value = ''
  progressVisible.value = false
  isSubmitting.value = false
}

// 分頁處理
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val) => {
  currentPage.value = val
}

// 重置篩選
const resetFilters = () => {
  employeeIdQuery.value = ''
  searchQuery.value = ''
  departmentFilter.value = ''
  positionFilter.value = ''
  sortOrder.value = ''
  accountStatusFilter.value = ''
  currentPage.value = 1
  pageSize.value = 10
}

// Watch
watch([searchQuery, departmentFilter, positionFilter, accountStatusFilter, employeeIdQuery, sortOrder], () => {
  currentPage.value = 1
})

// === CRUD 操作 ===
// 獲取數據
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
      avatar: user.avatar,
      createdAt: user.createdAt,
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

// 新增/編輯
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    isSubmitting.value = true
    progressVisible.value = true

    // 執行步驟
    progressMessage.value = '正在生成員工編號...'
    activeStep.value = 1
    const employeeIdResponse = await axios.get('/api/user/generate-employee-id')

    progressMessage.value = '正在保存用戶資料...'
    activeStep.value = 2
    const response = await axios.post('/api/user/register', {
      employeeId: employeeIdResponse.data.employeeId,
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
    activeStep.value = 4
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
    if (!error?.message?.includes('validation')) {
      console.error('新增失敗:', error)
      ElMessage.error('新增失敗，請重試')
    }
  }
}

// 其他動作處理方法
const openAddEmployeeDialog = () => {
  dialogVisible.value = true
  isEdit.value = false
  resetForm()
  generateDefaultAccount()
}

const handleEdit = (row) => {
  isEdit.value = true
  dialogVisible.value = true
  Object.assign(form, {
    ...row,
    department: row.raw_department || row.department,
    position: row.raw_position || row.position,
    email: row.email || ''
  })
  emailPrefix.value = form.email ? form.email.split('@')[0] : ''
}

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
      data: { account: row.username }
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

const handleView = async (row) => {
  try {
    const loading = ElLoading.service({
      lock: true,
      text: '載入中...',
      background: 'rgba(0, 0, 0, 0.7)'
    })

    const response = await axios.get(`/api/user/employee/${row.username}/details`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    })

    currentViewUser.value = {
      ...row,
      ...response.data,
      department: convertDepartment(response.data.department),
      position: convertPosition(response.data.position),
      raw_department: response.data.department,
      raw_position: response.data.position,
      isLocked: response.data.isLocked || row.isLocked,
      isActive: response.data.isActive || row.isActive,
      createdAt: response.data.createdAt,
      lastLoginTime: response.data.lastLoginTime,
      birthday: response.data.birthday,
      personalPhone: response.data.personalPhone,
      emergencyContact: {
        name: response.data.emergencyContact?.name || '',
        phone: response.data.emergencyContact?.phone || '',
        relationship: response.data.emergencyContact?.relationship || ''
      }
    }

    loading.close()
    viewDialogVisible.value = true
  } catch (error) {
    console.error('獲取用戶詳情失敗:', error)
    ElMessage.error(error.response?.data?.msg || '獲取用戶詳情失敗')
    currentViewUser.value = row
    viewDialogVisible.value = true
  }
}

// 刷新表格
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

// 帳號狀態變更處理
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

// 移除密碼輸入欄位，只顯示確認信息
const handleResetPassword = (row) => {
  ElMessageBox.confirm(
      `確定要重置 ${row.name} 的密碼嗎？\n重置後新密碼將發送至該用戶信箱。`,
      '重置密碼確認',
      {
        confirmButtonText: '確認重置',
        cancelButtonText: '取消',
        type: 'warning'
      }
  )
      .then(async () => {
        try {
          const response = await axios.post('/api/admin/reset-password', {
            account: row.username
          });

          if (response.data.success) {
            ElMessage.success('密碼重置成功，新密碼已發送至用戶信箱');
          }
        } catch (error) {
          console.error('密碼重置失敗:', error);
          ElMessage.error(error.response?.data?.msg || '密碼重置失敗，請重試');
        }
      })
      .catch(() => {
        // 用戶取消操作
      });
};

// 元件載入時獲取數據
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

/* 統計資訊區域 */
.statistics-bar {
  display: flex;
  justify-content: center;
  margin: -15px auto 20px;
  width: fit-content;
}

.stat-card {
  background-color: #f5f7fa;
  border: none;
  width: auto;
}

:deep(.el-card__body) {
  padding: 6px 12px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #409EFF;
  font-size: 16px;
  font-weight: 500;
  white-space: nowrap;
}

.stat-label {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  font-size: 13px;
}

/* 工具欄和篩選區 */
.tool-bar {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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

/* 表格相關樣式 */
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

/* Email 輸入組件 */
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

/* 分頁容器 */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding: 10px 0;
}

:deep(.el-pagination) {
  margin: 0 auto;
  padding: 0;
  font-weight: normal;

  .el-pagination__total {
    margin-right: 16px;
  }

  .el-pagination__sizes {
    margin-right: 16px;
  }
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

  .pagination-container {
    margin-top: 15px;
  }

  :deep(.el-pagination) {
    font-size: 13px;

    .el-pagination__total,
    .el-pagination__sizes,
    .el-pagination__jump {
      display: none;
    }
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

.dialog-footer {
  padding: 20px 0 0;
  text-align: right;
}

:deep(.el-dialog__body) {
  padding-top: 10px;
}

</style>