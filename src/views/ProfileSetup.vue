<template>
  <div class="profile-setup-container">
    <div class="profile-setup-card card">
      <div class="setup-header">
        <h1>📝 กรอกข้อมูลโปรไฟล์</h1>
        <p class="subtitle">กรุณากรอกข้อมูลของคุณเพื่อเริ่มใช้งานระบบ</p>
      </div>

      <form @submit.prevent="handleSubmit" class="profile-form">
        <!-- Role Selection -->
        <div class="form-group">
          <label for="role">
            บทบาทของคุณ <span class="required">*</span>
          </label>
          <select
            id="role"
            v-model="formData.role"
            required
            class="form-select"
            @change="onRoleChange"
          >
            <option value="">เลือกบทบาท</option>
            <option value="student">👨‍🎓 นักเรียน</option>
            <option value="teacher">👨‍🏫 ครู</option>
            <option value="parent">👨‍👩‍👧‍👦 ผู้ปกครอง</option>
            <option value="school_admin">🏫 ผู้บริหารโรงเรียน</option>
            <option value="esa_admin">📍 ผู้บริหารเขตพื้นที่</option>
            <option value="ministry_admin">🇹🇭 ผู้บริหารกระทรวง</option>
          </select>
        </div>

        <!-- ESA Selection (for ESA Admin, Teachers, School Admins, Students) -->
        <div v-if="['esa_admin', 'teacher', 'school_admin', 'student'].includes(formData.role)" class="form-group">
          <label for="esa">
            เขตพื้นที่การศึกษา <span class="required">*</span>
          </label>
          <select
            id="esa"
            v-model="formData.esaId"
            required
            class="form-select"
            :disabled="loadingESAs"
            @change="onESASelect"
          >
            <option value="">{{ loadingESAs ? 'กำลังโหลด...' : 'เลือกเขตพื้นที่' }}</option>
            <option v-for="esa in esaList" :key="esa.id" :value="esa.id">
              {{ esa.name }} - {{ esa.region }}
            </option>
          </select>
        </div>

        <!-- Warning if ESA not selected -->
        <div v-if="['teacher', 'school_admin', 'student'].includes(formData.role) && !formData.esaId" class="info-message">
          ⚠️ กรุณาเลือกเขตพื้นที่ก่อนเพื่อโหลดรายชื่อโรงเรียน
        </div>

        <!-- School Selection (for Teachers, School Admins, Students - after ESA selected) -->
        <div v-if="['teacher', 'school_admin', 'student'].includes(formData.role) && formData.esaId" class="form-group">
          <label for="school">
            โรงเรียน <span class="required">*</span>
          </label>
          <div class="school-search-container">
            <input
              v-model="schoolSearch"
              type="text"
              placeholder="🔍 ค้นหาโรงเรียน..."
              class="form-input search-input"
            />
            <select
              id="school"
              v-model="formData.schoolId"
              required
              class="form-select"
              :disabled="loadingSchools || filteredSchools.length === 0"
            >
              <option value="">
                {{ loadingSchools ? 'กำลังโหลด...' : 
                   filteredSchools.length === 0 ? 'ไม่พบโรงเรียนในเขตนี้' : 
                   'เลือกโรงเรียน' }}
              </option>
              <option v-for="school in filteredSchools" :key="school.id" :value="school.id">
                {{ school.name }}
              </option>
            </select>
            <p v-if="filteredSchools.length > 0" class="school-count">
              {{ schoolSearch ? `พบ ${filteredSchools.length} โรงเรียน` : `ทั้งหมด ${filteredSchools.length} โรงเรียน` }}
            </p>
          </div>
        </div>

        <!-- Student ID (only for students) -->
        <div v-if="formData.role === 'student'" class="form-group">
          <label for="studentId">
            รหัสนักเรียน <span class="required">*</span>
          </label>
          <input
            id="studentId"
            v-model="formData.studentId"
            type="text"
            maxlength="5"
            pattern="[0-9]{5}"
            placeholder="12345 (5 หลัก)"
            required
            class="form-input"
            @input="validateStudentId"
          />
          <span v-if="errors.studentId" class="error-text">{{ errors.studentId }}</span>
        </div>

        <!-- ชื่อ-นามสกุล -->
        <div class="form-group">
          <label for="fullName">
            ชื่อ-นามสกุล <span class="required">*</span>
          </label>
          <input
            id="fullName"
            v-model="formData.fullName"
            type="text"
            placeholder="เช่น สมชาย ใจดี"
            required
            class="form-input"
          />
        </div>

        <!-- Student-specific fields -->
        <div v-if="formData.role === 'student'">
          <!-- ระดับชั้น -->
          <div class="form-row">
            <div class="form-group">
              <label for="grade">
                ระดับชั้น <span class="required">*</span>
              </label>
              <select
                id="grade"
                v-model="formData.grade"
                required
                class="form-select"
              >
                <option value="">เลือกระดับชั้น</option>
                <option value="ม.1">ม.1</option>
                <option value="ม.2">ม.2</option>
                <option value="ม.3">ม.3</option>
                <option value="ม.4">ม.4</option>
                <option value="ม.5">ม.5</option>
                <option value="ม.6">ม.6</option>
              </select>
            </div>

            <!-- ห้อง -->
            <div class="form-group">
              <label for="room">
                ห้อง <span class="required">*</span>
              </label>
              <select
                id="room"
                v-model="formData.room"
                required
                class="form-select"
              >
                <option value="">เลือกห้อง</option>
                <option v-for="n in 20" :key="n" :value="n">{{ n }}</option>
              </select>
            </div>
          </div>

          <!-- เลขที่และแผนก -->
          <div class="form-row">
            <div class="form-group">
              <label for="number">
                เลขที่ <span class="required">*</span>
              </label>
              <input
                id="number"
                v-model="formData.number"
                type="number"
                min="1"
                max="99"
                placeholder="เช่น 15"
                required
                class="form-input"
              />
            </div>

            <!-- ตอน -->
            <div class="form-group">
              <label for="section">
                ตอน <span class="required">*</span>
              </label>
              <select
                id="section"
                v-model="formData.section"
                required
                class="form-select"
              >
                <option value="">เลือกตอน</option>
                <option value="ก">ก</option>
                <option value="ข">ข</option>
                <option value="ไม่มีตอน">ไม่มีตอน</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="error-message">
          ⚠️ {{ error }}
        </div>

        <!-- Buttons -->
        <div class="button-group">
          <button
            type="submit"
            :disabled="loading || !isFormValid"
            class="btn btn-primary btn-lg"
          >
            {{ loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล' }}
          </button>
        </div>

        <p class="info-text">
          <strong>หมายเหตุ:</strong> ข้อมูลเหล่านี้จะใช้สำหรับการสร้างรายงานและการติดตามผลการเรียนของคุณ
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { db } from '@/firebase/config'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'

const router = useRouter()
const authStore = useAuthStore()

const formData = ref({
  role: '',
  studentId: '',
  fullName: authStore.user?.displayName || '',
  schoolId: '',
  esaId: '',
  grade: '',
  room: '',
  number: '',
  section: ''
})

const errors = ref({
  studentId: ''
})

const loading = ref(false)
const loadingSchools = ref(false)
const loadingESAs = ref(false)
const error = ref('')

const schoolList = ref([])
const esaList = ref([])
const schoolSearch = ref('')

// Validate student ID (5 digits)
function validateStudentId() {
  const id = formData.value.studentId
  if (id && !/^\d{5}$/.test(id)) {
    errors.value.studentId = 'รหัสนักเรียนต้องเป็นตัวเลข 5 หลัก'
  } else {
    errors.value.studentId = ''
  }
}

// Filtered schools based on ESA and search
const filteredSchools = computed(() => {
  // Filter by selected ESA first
  let schools = schoolList.value.filter(school => 
    school.parentId === formData.value.esaId
  )
  
  // Then filter by search term
  if (schoolSearch.value.trim()) {
    const search = schoolSearch.value.toLowerCase()
    schools = schools.filter(school =>
      school.name.toLowerCase().includes(search)
    )
  }
  
  return schools.sort((a, b) => a.name.localeCompare(b.name, 'th'))
})

// Check if form is valid based on role
const isFormValid = computed(() => {
  if (!formData.value.role || !formData.value.fullName.trim()) return false
  
  switch (formData.value.role) {
    case 'student':
      return (
        formData.value.studentId.length === 5 &&
        formData.value.schoolId &&
        formData.value.grade &&
        formData.value.room &&
        formData.value.number &&
        formData.value.section &&
        !errors.value.studentId
      )
    case 'teacher':
    case 'school_admin':
      return formData.value.schoolId !== ''
    case 'esa_admin':
      return formData.value.esaId !== ''
    case 'parent':
    case 'ministry_admin':
      return true
    default:
      return false
  }
})

// Load ESAs when role changes
async function onRoleChange() {
  // Reset ESA and School selections
  formData.value.esaId = ''
  formData.value.schoolId = ''
  schoolSearch.value = ''
  
  // Load ESAs for roles that need them
  if (['esa_admin', 'teacher', 'school_admin', 'student'].includes(formData.value.role)) {
    await loadESAs()
    await loadSchools() // Load all schools for filtering
  }
}

// Load all ESAs
async function loadESAs() {
  try {
    loadingESAs.value = true
    const q = query(
      collection(db, 'organizations'),
      where('type', '==', 'esa')
    )
    const snapshot = await getDocs(q)
    
    esaList.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => a.name.localeCompare(b.name, 'th'))
  } catch (err) {
    console.error('Error loading ESAs:', err)
    error.value = 'ไม่สามารถโหลดรายชื่อเขตพื้นที่ได้'
  } finally {
    loadingESAs.value = false
  }
}

// Load all schools (for filtering by ESA)
async function loadSchools() {
  try {
    loadingSchools.value = true
    const q = query(
      collection(db, 'organizations'),
      where('type', '==', 'school')
    )
    const snapshot = await getDocs(q)
    
    schoolList.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (err) {
    console.error('Error loading schools:', err)
    error.value = 'ไม่สามารถโหลดรายชื่อโรงเรียนได้'
  } finally {
    loadingSchools.value = false
  }
}

// When ESA is selected, reset school selection
function onESASelect() {
  formData.value.schoolId = ''
  schoolSearch.value = ''
}

onMounted(() => {
  // Preload ESAs and schools if user already has a role
  if (['esa_admin', 'teacher', 'school_admin', 'student'].includes(formData.value.role)) {
    loadESAs()
    loadSchools()
  }
})

// Submit form
async function handleSubmit() {
  if (!isFormValid.value) return

  try {
    loading.value = true
    error.value = ''

    // Build profile data based on role
    const profileData = {
      role: formData.value.role,
      displayName: formData.value.fullName,
      profileCompleted: true
    }

    // Add role-specific fields
    if (formData.value.role === 'student') {
      profileData.studentId = formData.value.studentId
      profileData.grade = formData.value.grade
      profileData.room = formData.value.room
      profileData.number = parseInt(formData.value.number)
      profileData.section = formData.value.section
      profileData.schoolId = formData.value.schoolId
      profileData.esaId = formData.value.esaId
    } else if (['teacher', 'school_admin'].includes(formData.value.role)) {
      profileData.schoolId = formData.value.schoolId
      profileData.esaId = formData.value.esaId
    } else if (formData.value.role === 'esa_admin') {
      profileData.esaId = formData.value.esaId
    }

    // Update profile in auth store
    await authStore.updateUserProfile(profileData)

    // Redirect based on role
    switch (formData.value.role) {
      case 'student':
        router.push('/student')
        break
      case 'teacher':
        router.push('/teacher')
        break
      case 'parent':
        router.push('/parent')
        break
      case 'school_admin':
        router.push('/school-management')
        break
      case 'esa_admin':
        router.push('/esa-dashboard')
        break
      case 'ministry_admin':
        router.push('/national-dashboard')
        break
      default:
        router.push('/')
    }
  } catch (err) {
    console.error('Profile update error:', err)
    error.value = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.profile-setup-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 1rem;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
}

.profile-setup-card {
  width: 100%;
  max-width: 600px;
  padding: 2.5rem;
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.setup-header {
  text-align: center;
  margin-bottom: 2rem;
}

.setup-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: var(--text-color);
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

label {
  font-weight: 600;
  color: var(--text-color);
  font-size: 0.9rem;
}

.required {
  color: #ef4444;
}

.form-input,
.form-select {
  padding: 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: var(--bg-secondary);
  color: var(--text-color);
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.form-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.error-text {
  color: #ef4444;
  font-size: 0.85rem;
  margin-top: -0.25rem;
}

.error-message {
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  border-radius: 8px;
  color: #ef4444;
  font-size: 0.9rem;
  text-align: center;
}

.button-group {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-lg {
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  width: 100%;
}

.info-text {
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-top: 0.5rem;
}

.info-message {
  padding: 0.75rem 1rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: var(--primary-color);
  font-size: 0.9rem;
  text-align: center;
}

.school-search-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.search-input {
  border-radius: 8px !important;
}

.school-count {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
  text-align: right;
}

/* Mobile Responsive */
@media (max-width: 640px) {
  .profile-setup-card {
    padding: 1.5rem;
  }

  .setup-header h1 {
    font-size: 1.5rem;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .button-group {
    flex-direction: column;
  }
}
</style>
