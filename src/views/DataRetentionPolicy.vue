<template>
  <div class="data-retention-policy">
    <div class="page-header">
      <h1>📋 Data Retention Policy</h1>
      <p class="subtitle">Privacy & Data Management Settings</p>
    </div>

    <!-- Current Status -->
    <div class="status-card">
      <div class="status-header">
        <span class="status-icon">🔒</span>
        <div>
          <h3>Your Data Status</h3>
          <p>Last updated: {{ lastUpdated }}</p>
        </div>
      </div>
      <div class="status-grid">
        <div class="status-item">
          <span class="label">Consent Given:</span>
          <span class="value" :class="{ 'yes': userData.consentGiven }">
            {{ userData.consentGiven ? 'Yes' : 'No' }}
          </span>
        </div>
        <div class="status-item">
          <span class="label">Data Retention:</span>
          <span class="value">{{ userData.retentionPeriod || 'Standard (2 years)' }}</span>
        </div>
        <div class="status-item">
          <span class="label">Research Participation:</span>
          <span class="value">{{ userData.researchConsent ? 'Opted In' : 'Opted Out' }}</span>
        </div>
      </div>
    </div>

    <!-- Policy Sections -->
    <div class="policy-sections">
      <!-- Data Collection -->
      <div class="policy-card">
        <h2>📊 Data We Collect</h2>
        <div class="data-list">
          <div class="data-item">
            <span class="data-icon">👤</span>
            <div class="data-content">
              <h4>Profile Information</h4>
              <p>Name, email, school, grade level</p>
              <span class="purpose">Purpose: User identification and authentication</span>
            </div>
          </div>
          <div class="data-item">
            <span class="data-icon">📝</span>
            <div class="data-content">
              <h4>Assessment Responses</h4>
              <p>Answers to HOTS questions and AI evaluations</p>
              <span class="purpose">Purpose: Learning assessment and progress tracking</span>
            </div>
          </div>
          <div class="data-item">
            <span class="data-icon">📈</span>
            <div class="data-content">
              <h4>Learning Progress</h4>
              <p>Scores, passed learning outcomes, skill development</p>
              <span class="purpose">Purpose: Personalized learning recommendations</span>
            </div>
          </div>
          <div class="data-item">
            <span class="data-icon">⏱️</span>
            <div class="data-content">
              <h4>Activity Logs</h4>
              <p>Login times, session durations, feature usage</p>
              <span class="purpose">Purpose: System improvement and security</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Retention Periods -->
      <div class="policy-card">
        <h2>⏳ Retention Periods</h2>
        <div class="retention-table">
          <table>
            <thead>
              <tr>
                <th>Data Type</th>
                <th>Retention Period</th>
                <th>After Expiry</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Assessment Data</td>
                <td>2 years from collection</td>
                <td>Anonymized or deleted</td>
              </tr>
              <tr>
                <td>Profile Information</td>
                <td>Active account + 1 year</td>
                <td>Permanently deleted</td>
              </tr>
              <tr>
                <td>Activity Logs</td>
                <td>90 days</td>
                <td>Automatically deleted</td>
              </tr>
              <tr>
                <td>Research Data (if consented)</td>
                <td>5 years</td>
                <td>Anonymized for archive</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Your Rights -->
      <div class="policy-card">
        <h2>⚖️ Your Rights (PDPA)</h2>
        <div class="rights-grid">
          <div class="right-item">
            <span class="right-icon">👁️</span>
            <h4>Right to Access</h4>
            <p>View all your personal data we store</p>
            <button class="btn btn-outline" @click="requestDataAccess">
              Request Data
            </button>
          </div>
          <div class="right-item">
            <span class="right-icon">✏️</span>
            <h4>Right to Rectification</h4>
            <p>Correct inaccurate personal data</p>
            <button class="btn btn-outline" @click="$router.push('/profile')">
              Edit Profile
            </button>
          </div>
          <div class="right-item">
            <span class="right-icon">🗑️</span>
            <h4>Right to Erasure</h4>
            <p>Request deletion of your data</p>
            <button class="btn btn-danger" @click="showDeleteConfirm = true">
              Request Deletion
            </button>
          </div>
          <div class="right-item">
            <span class="right-icon">📦</span>
            <h4>Right to Portability</h4>
            <p>Export your data in portable format</p>
            <button class="btn btn-primary" @click="exportMyData">
              Export Data
            </button>
          </div>
        </div>
      </div>

      <!-- Research Consent -->
      <div class="policy-card">
        <h2>🔬 Research Participation</h2>
        <div class="research-section">
          <p>
            Your anonymized assessment data may be used for educational research 
            to improve AI-based learning assessment. Your identity will never be 
            disclosed in any research publication.
          </p>
          <div class="consent-toggle">
            <label class="toggle-container">
              <input 
                type="checkbox" 
                v-model="researchConsent"
                @change="updateResearchConsent"
              />
              <span class="toggle-slider"></span>
              <span class="toggle-label">
                {{ researchConsent ? 'Participating in research' : 'Not participating' }}
              </span>
            </label>
          </div>
          <p class="note">
            You can change this preference at any time. 
            Previously collected data will be excluded from future research if you opt out.
          </p>
        </div>
      </div>

      <!-- Data Security -->
      <div class="policy-card">
        <h2>🔐 Data Security</h2>
        <div class="security-list">
          <div class="security-item">
            <span class="check">✓</span>
            <span>All data encrypted in transit (TLS 1.3)</span>
          </div>
          <div class="security-item">
            <span class="check">✓</span>
            <span>Data encrypted at rest (AES-256)</span>
          </div>
          <div class="security-item">
            <span class="check">✓</span>
            <span>Regular security audits</span>
          </div>
          <div class="security-item">
            <span class="check">✓</span>
            <span>Access restricted to authorized personnel only</span>
          </div>
          <div class="security-item">
            <span class="check">✓</span>
            <span>Firebase Security Rules for database access control</span>
          </div>
        </div>
      </div>

      <!-- Contact -->
      <div class="policy-card">
        <h2>📞 Contact Data Protection Officer</h2>
        <div class="contact-info">
          <p>For questions about data privacy or to exercise your rights:</p>
          <div class="contact-details">
            <p><strong>Email:</strong> dpo@school.ac.th</p>
            <p><strong>Phone:</strong> 02-xxx-xxxx ext. 1234</p>
            <p><strong>Address:</strong> Data Protection Office, [School Name]</p>
          </div>
          <p class="response-time">
            We respond to all data requests within 30 days.
          </p>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal-content danger">
        <div class="modal-header">
          <h3>⚠️ Delete All Data</h3>
          <button class="close-btn" @click="showDeleteConfirm = false">&times;</button>
        </div>
        <div class="modal-body">
          <p class="warning-text">
            This will permanently delete all your data including:
          </p>
          <ul>
            <li>Profile information</li>
            <li>Assessment history</li>
            <li>Learning progress</li>
            <li>Badges and achievements</li>
          </ul>
          <p class="warning-text">
            <strong>This action cannot be undone.</strong>
          </p>
          <div class="confirm-input">
            <label>Type "DELETE" to confirm:</label>
            <input 
              type="text" 
              v-model="deleteConfirmText"
              placeholder="DELETE"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showDeleteConfirm = false">
            Cancel
          </button>
          <button 
            class="btn btn-danger"
            :disabled="deleteConfirmText !== 'DELETE'"
            @click="submitDeleteRequest"
          >
            Delete My Data
          </button>
        </div>
      </div>
    </div>

    <!-- Export Progress Modal -->
    <div v-if="exportProgress" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-body text-center">
          <div class="spinner"></div>
          <p>Preparing your data export...</p>
          <p class="progress-text">{{ exportProgress }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, doc, getDoc, updateDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const userData = ref({
  consentGiven: false,
  retentionPeriod: 'Standard (2 years)',
  researchConsent: false
})

const lastUpdated = ref('')
const researchConsent = ref(false)
const showDeleteConfirm = ref(false)
const deleteConfirmText = ref('')
const exportProgress = ref('')

onMounted(async () => {
  await fetchUserData()
})

async function fetchUserData() {
  try {
    const userDoc = await getDoc(doc(db, 'users', authStore.user.uid))
    if (userDoc.exists()) {
      const data = userDoc.data()
      userData.value = {
        consentGiven: data.consentGiven || false,
        retentionPeriod: data.retentionPeriod || 'Standard (2 years)',
        researchConsent: data.researchConsent || false
      }
      researchConsent.value = data.researchConsent || false
      lastUpdated.value = data.updatedAt?.toDate?.().toLocaleDateString('th-TH') || 'N/A'
    }
  } catch (error) {
    console.error('Error fetching user data:', error)
  }
}

async function updateResearchConsent() {
  try {
    await updateDoc(doc(db, 'users', authStore.user.uid), {
      researchConsent: researchConsent.value,
      researchConsentUpdatedAt: serverTimestamp()
    })
    userData.value.researchConsent = researchConsent.value
    alert(researchConsent.value 
      ? 'Thank you for participating in research!' 
      : 'Your research preference has been updated.')
  } catch (error) {
    console.error('Error updating consent:', error)
    alert('Error updating preference')
  }
}

async function requestDataAccess() {
  try {
    // Log the request
    await updateDoc(doc(db, 'users', authStore.user.uid), {
      dataAccessRequested: serverTimestamp()
    })
    alert('Your data access request has been logged. You will receive your data via email within 30 days.')
  } catch (error) {
    console.error('Error requesting data:', error)
  }
}

async function exportMyData() {
  exportProgress.value = 'Collecting profile data...'
  
  try {
    const exportData = {
      exportDate: new Date().toISOString(),
      profile: {},
      assessments: [],
      progress: [],
      sessions: []
    }

    // Profile
    const userDoc = await getDoc(doc(db, 'users', authStore.user.uid))
    if (userDoc.exists()) {
      const data = userDoc.data()
      exportData.profile = {
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        grade: data.grade,
        section: data.section,
        createdAt: data.createdAt?.toDate?.().toISOString()
      }
    }

    exportProgress.value = 'Collecting assessments...'

    // Assessments
    const assessmentsQuery = query(
      collection(db, 'assessments'),
      where('studentId', '==', authStore.user.uid)
    )
    const assessmentsSnapshot = await getDocs(assessmentsQuery)
    assessmentsSnapshot.forEach(doc => {
      const data = doc.data()
      exportData.assessments.push({
        id: doc.id,
        question: data.question,
        answer: data.studentAnswer,
        scores: data.rubricScores,
        feedback: data.feedback,
        createdAt: data.createdAt?.toDate?.().toISOString()
      })
    })

    exportProgress.value = 'Collecting progress data...'

    // Progress
    const progressQuery = query(
      collection(db, 'studentProgress'),
      where('studentId', '==', authStore.user.uid)
    )
    const progressSnapshot = await getDocs(progressQuery)
    progressSnapshot.forEach(doc => {
      exportData.progress.push({
        courseId: doc.data().courseId,
        passedLOs: doc.data().passedLOs,
        averageScores: doc.data().averageScores
      })
    })

    exportProgress.value = 'Generating file...'

    // Download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `my_data_export_${new Date().toISOString().split('T')[0]}.json`
    link.click()

    exportProgress.value = ''
    alert('Your data has been exported successfully!')

  } catch (error) {
    console.error('Error exporting data:', error)
    exportProgress.value = ''
    alert('Error exporting data')
  }
}

async function submitDeleteRequest() {
  if (deleteConfirmText.value !== 'DELETE') return

  try {
    // Log deletion request (actual deletion handled by admin)
    await updateDoc(doc(db, 'users', authStore.user.uid), {
      deletionRequested: true,
      deletionRequestedAt: serverTimestamp()
    })

    showDeleteConfirm.value = false
    deleteConfirmText.value = ''
    
    alert('Your data deletion request has been submitted. Your account will be deleted within 30 days. You will receive a confirmation email.')
    
    // Sign out
    await authStore.signOut()
    
  } catch (error) {
    console.error('Error submitting deletion request:', error)
    alert('Error submitting request')
  }
}
</script>

<style scoped>
.data-retention-policy {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  color: var(--primary-color);
}

.subtitle {
  color: var(--text-secondary);
}

.status-card {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  border-left: 4px solid var(--primary-color);
}

.status-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.status-icon {
  font-size: 2rem;
}

.status-header h3 {
  margin: 0;
}

.status-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.status-item {
  display: flex;
  flex-direction: column;
}

.status-item .label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.status-item .value {
  font-weight: 600;
}

.status-item .value.yes {
  color: var(--success-color);
}

.policy-card {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.policy-card h2 {
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.data-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.data-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.data-icon {
  font-size: 1.5rem;
}

.data-content h4 {
  margin: 0 0 0.25rem 0;
}

.data-content p {
  margin: 0 0 0.5rem 0;
  color: var(--text-secondary);
}

.data-content .purpose {
  font-size: 0.75rem;
  color: var(--primary-color);
  font-style: italic;
}

.retention-table table {
  width: 100%;
  border-collapse: collapse;
}

.retention-table th,
.retention-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.retention-table th {
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-secondary);
}

.rights-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.right-item {
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  text-align: center;
}

.right-icon {
  font-size: 2rem;
}

.right-item h4 {
  margin: 0.5rem 0;
}

.right-item p {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.research-section {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.research-section p {
  margin: 0 0 1rem 0;
  line-height: 1.6;
}

.consent-toggle {
  margin: 1.5rem 0;
}

.toggle-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
}

.toggle-container input {
  display: none;
}

.toggle-slider {
  width: 48px;
  height: 24px;
  background: var(--border-color);
  border-radius: 12px;
  position: relative;
  transition: background 0.3s;
}

.toggle-slider::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.3s;
}

.toggle-container input:checked + .toggle-slider {
  background: var(--success-color);
}

.toggle-container input:checked + .toggle-slider::after {
  transform: translateX(24px);
}

.toggle-label {
  font-weight: 500;
}

.note {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-style: italic;
}

.security-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.security-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.security-item .check {
  color: var(--success-color);
  font-weight: bold;
}

.contact-info {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.contact-details {
  margin: 1rem 0;
}

.contact-details p {
  margin: 0.5rem 0;
}

.response-time {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-style: italic;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--card-bg);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
}

.modal-content.danger {
  border-top: 4px solid #ef4444;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.modal-body {
  padding: 1.5rem;
}

.warning-text {
  color: #ef4444;
}

.modal-body ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.confirm-input {
  margin-top: 1.5rem;
}

.confirm-input label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.confirm-input input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.text-center {
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.progress-text {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .status-grid {
    grid-template-columns: 1fr;
  }
  
  .rights-grid {
    grid-template-columns: 1fr;
  }
}
</style>
