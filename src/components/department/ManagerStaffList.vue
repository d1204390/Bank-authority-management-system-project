<template>
  <el-card class="staff-list" v-loading="loadingStaffData">
    <!-- 搜索欄和功能按鈕 -->
    <div class="top-controls">
      <el-input
          v-model="searchQuery"
          placeholder="搜尋員工姓名或分機"
          class="search-input"
          clearable
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <div class="action-buttons">
        <el-button
            type="primary"
            @click="handleReviewApplications"
        >
          審核申請
          <el-badge
              v-if="pendingApplicationsCount"
              :value="pendingApplicationsCount"
              class="ml-2"
          />
        </el-button>
      </div>
    </div>

    <!-- 員工列表 -->
    <div class="table-container">
      <el-table :data="filteredStaffList" style="width: 100%">
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="position" label="職位" width="120">
          <template #default="{ row }">
            {{ getPositionLabel(row.position) }}
          </template>
        </el-table-column>
        <el-table-column prop="extension" label="分機" width="120" />
        <el-table-column prop="email" label="電子郵件" min-width="200" />
        <el-table-column fixed="right" label="操作" width="120">
          <template #default="{ row }">
            <el-button
                size="small"
                @click="handleViewDetails(row)"
            >
              詳情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 審核列表對話框 -->
    <el-dialog
        v-model="reviewDialogVisible"
        title="待審核新進員工申請"
        width="80%"
        destroy-on-close
    >
      <el-table
          :data="newEmployeesList"
          style="width: 100%"
          v-loading="loadingNewEmployees"
      >
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="email" label="電子郵件" min-width="180" />
        <el-table-column label="到職日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.startDate) }}
          </template>
        </el-table-column>
        <el-table-column label="狀態" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交者" width="120">
          <template #default="{ row }">
            {{ row.submitter?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="提交時間" width="150">
          <template #default="{ row }">
            {{ formatDateTime(row.submittedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group v-if="row.status === 'pending'">
              <el-button
                  size="small"
                  type="success"
                  @click="openApprovalDialog(row, 'approved')"
              >
                核准
              </el-button>
              <el-button
                  size="small"
                  type="danger"
                  @click="openApprovalDialog(row, 'rejected')"
              >
                駁回
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="totalApplications"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
        />
      </template>
    </el-dialog>

    <!-- 審核表單對話框 -->
    <el-dialog
        v-model="approvalDialogVisible"
        :title="approvalForm.status === 'approved' ? '核准申請' : '駁回申請'"
        width="500px"
        destroy-on-close
    >
      <el-form
          ref="approvalFormRef"
          :model="approvalForm"
          :rules="approvalRules"
          label-width="80px"
      >
        <el-form-item label="備註" prop="comment">
          <el-input
              v-model="approvalForm.comment"
              type="textarea"
              :rows="4"
              :placeholder="approvalForm.status === 'approved' ? '請輸入核准備註' : '請輸入駁回原因'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="approvalDialogVisible = false">取消</el-button>
          <el-button
              type="primary"
              :loading="submittingApproval"
              @click="handleApproval"
          >
            確認
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 員工詳情對話框 -->
    <ViewEmployeeDialog
        v-model:visible="dialogVisible"
        :userData="currentStaff"
        :showEditButton="false"
    />
  </el-card>
</template>

<script setup>
// script setup 部分
import { ref, computed, inject, onMounted,defineProps } from 'vue'
import { Search } from '@element-plus/icons-vue'
import ViewEmployeeDialog from '@/components/staff/ViewEmployeeDialog.vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

// 注入和 Props 定義
const {
  allStaffList,
  loadingStaffData,
} = inject('staffManagement')

const props = defineProps({
  departmentCode: {
    type: String,
    required: true
  }
})

// 狀態定義
const searchQuery = ref('')
const dialogVisible = ref(false)
const currentStaff = ref(null)
const reviewDialogVisible = ref(false)
const approvalDialogVisible = ref(false)
const loadingNewEmployees = ref(false)
const submittingApproval = ref(false)
const newEmployeesList = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const totalApplications = ref(0)
const currentApprovalData = ref(null)

// 表單相關
const approvalFormRef = ref(null)
const approvalForm = ref({
  status: '',
  comment: ''
})

const approvalRules = {
  comment: [
    { required: true, message: '請輸入備註', trigger: 'blur' },
    { min: 2, message: '備註長度至少為 2 個字元', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '狀態是必要的', trigger: 'blur' }
  ]
}

// 計算屬性
const departmentStaff = computed(() => {
  return allStaffList.value?.filter(staff => staff.department === props.departmentCode) || []
})

const filteredStaffList = computed(() => {
  if (!searchQuery.value) return departmentStaff.value
  const query = searchQuery.value.toLowerCase()
  return departmentStaff.value.filter(staff =>
      staff.name.toLowerCase().includes(query) ||
      String(staff.extension || '').includes(query)
  )
})

const pendingApplicationsCount = computed(() => {
  return newEmployeesList.value.filter(app => app.status === 'pending').length || 0
})

// API 相關函數
const fetchNewEmployees = async () => {
  loadingNewEmployees.value = true
  try {
    const { data } = await axios.get('/api/new-employees/list', {
      params: {
        page: currentPage.value,
        limit: pageSize.value,
        status: 'pending'
      }
    })

    if (data.employees) {
      newEmployeesList.value = data.employees
      totalApplications.value = data.pagination?.total || 0
    }
  } catch (error) {
    console.error('獲取新進員工申請失敗:', error)
    ElMessage.error('獲取新進員工申請失敗，請稍後再試')
  } finally {
    loadingNewEmployees.value = false
  }
}

const submitApproval = async (formRef) => {
  if (!formRef) return false

  try {
    await formRef.validate()
    return true
  } catch (error) {
    return false
  }
}

// 事件處理函數
const handleApproval = async () => {
  try {
    if (!currentApprovalData.value?._id) {
      ElMessage.error('無效的申請資料')
      return
    }

    const isValid = await submitApproval(approvalFormRef.value)
    if (!isValid) return

    submittingApproval.value = true

    await axios.post(`/api/new-employees/approve/${currentApprovalData.value._id}`, {
      status: approvalForm.value.status,
      comment: approvalForm.value.comment
    })

    ElMessage.success(`申請已${approvalForm.value.status === 'approved' ? '核准' : '駁回'}`)
    approvalDialogVisible.value = false
    await fetchNewEmployees()
  } catch (error) {
    console.error('審核處理失敗:', error)
    ElMessage.error(error.response?.data?.msg || '審核處理失敗，請稍後再試')
  } finally {
    submittingApproval.value = false
  }
}

const handleViewDetails = (staff) => {
  currentStaff.value = staff
  dialogVisible.value = true
}

const handleReviewApplications = () => {
  reviewDialogVisible.value = true
  fetchNewEmployees()
}

const openApprovalDialog = (application, status) => {
  if (!application?._id) {
    ElMessage.error('無效的申請資料')
    return
  }

  currentApprovalData.value = application
  approvalForm.value = {
    status,
    comment: ''
  }
  approvalDialogVisible.value = true
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1 // 重置頁碼
  fetchNewEmployees()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchNewEmployees()
}

// 工具函數
const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Taipei'
    }).replace(/\//g, '-')
  } catch {
    return '-'
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Taipei'
    }).replace(/\//g, '-')
  } catch {
    return '-'
  }
}

const getPositionLabel = (code) => ({
  'M': '經理',
  'S': '主管',
  'C': '科員'
})[code] || code

const getStatusLabel = (status) => ({
  'pending': '待審核',
  'approved': '已核准',
  'rejected': '已駁回'
})[status] || status

const getStatusType = (status) => ({
  'pending': 'warning',
  'approved': 'success',
  'rejected': 'danger'
})[status] || 'info'

// 初始化
onMounted(fetchNewEmployees)
</script>

<style scoped>
.staff-list {
  margin: 16px;
}

.top-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
}

.search-input {
  width: 300px;
}

.table-container {
  margin-top: 20px;
}

:deep(.el-card) {
  border-radius: 8px;
}

:deep(.el-table) {
  --el-table-header-bg-color: #f5f7fa;

  th {
    background-color: var(--el-table-header-bg-color);
    font-weight: 600;
  }
}

:deep(.el-tag) {
  min-width: 60px;
  text-align: center;
}

@media (max-width: 768px) {
  .top-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    width: 100%;
  }
}
</style>