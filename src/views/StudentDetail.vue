<template>
  <div class="student-detail">
    <!-- Header -->
    <div class="page-header">
      <button @click="$router.push('/teacher')" class="back-btn">
        ← กลับ
      </button>
      <div class="header-content">
        <h1>📊 รายงานรายละเอียดนักเรียน</h1>
        <p class="subtitle">ประวัติการประเมินทั้งหมด</p>
      </div>
      <button @click="exportReport" class="btn-export" :disabled="loading">
        📥 Export รายงาน
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Student Info Card -->
    <div v-if="!loading && studentInfo" class="student-card card">
      <div class="student-header">
        <div class="student-avatar">
          <img v-if="studentInfo.photoURL" :src="studentInfo.photoURL" alt="Avatar" />
          <div v-else class="avatar-placeholder">{{ getInitials(studentInfo.displayName) }}</div>
        </div>
        <div class="student-info">
          <h2>{{ studentInfo.displayName }}</h2>
          <div class="student-meta">
            <span>🆔 รหัส: {{ studentInfo.studentId }}</span>
            <span>🏫 ชั้น: {{ studentInfo.grade || '-' }}</span>
            <span>📚 ห้อง: {{ studentInfo.room || '-' }}</span>
            <span>🔢 เลขที่: {{ studentInfo.number || '-' }}</span>
            <span>⏰ ตอน: {{ studentInfo.section || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="summary-stats">
        <div class="stat-box">
          <div class="stat-icon">�</div>
          <div class="stat-content">
            <div class="stat-value">{{ totalAssessments }}</div>
            <div class="stat-label">Chat Assessment</div>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-icon">📋</div>
          <div class="stat-content">
            <div class="stat-value">{{ totalWorksheets }}</div>
            <div class="stat-label">ใบงาน</div>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value">{{ averageScore.toFixed(1) }}/20</div>
            <div class="stat-label">คะแนนเฉลี่ย Chat</div>
          </div>
        </div>
        <div class="stat-box highlight" v-if="totalWorksheets > 0">
          <div class="stat-icon">📈</div>
          <div class="stat-content">
            <div class="stat-value">{{ averageWorksheetScore.toFixed(0) }}%</div>
            <div class="stat-label">คะแนนเฉลี่ย Worksheet</div>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-icon">🎯</div>
          <div class="stat-content">
            <div class="stat-value">{{ totalLOsPassed }}</div>
            <div class="stat-label">LO ที่ผ่าน (รวม)</div>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-icon">📅</div>
          <div class="stat-content">
            <div class="stat-value">{{ lastAssessmentDate }}</div>
            <div class="stat-label">ประเมินล่าสุด</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 🎮 Worksheet History (เพิ่มใหม่) -->
    <div v-if="!loading && worksheetSubmissions.length > 0" class="worksheets-section">
      <h2>📋 ประวัติการทำใบงาน ({{ worksheetSubmissions.length }} ชิ้น)</h2>
      
      <div 
        v-for="(ws, index) in worksheetSubmissions"
        :key="ws.id"
        class="worksheet-card card"
      >
        <div class="worksheet-header">
          <div class="worksheet-number">#{{ worksheetSubmissions.length - index }}</div>
          <div class="worksheet-date">
            📅 {{ formatDate(ws.submittedAt) }}
          </div>
          <div class="worksheet-score" :class="getScoreClass(ws.assessment?.summary?.percentage / 5 || 0)">
            {{ ws.assessment?.summary?.percentage?.toFixed(0) || 0 }}%
          </div>
        </div>
        
        <div class="worksheet-info">
          <div class="worksheet-title">{{ ws.worksheetTitle || 'ใบงาน' }}</div>
          <div class="worksheet-meta">
            <span>🏆 PA Level: {{ ws.assessment?.summary?.paLevel || '-' }}</span>
            <span>📊 คะแนน: {{ ws.assessment?.summary?.totalScore || 0 }}/{{ ws.assessment?.summary?.maxScore || 20 }}</span>
          </div>
        </div>
        
        <!-- ARCE Scores -->
        <div v-if="ws.assessment?.arceScores" class="arce-scores">
          <div class="arce-item">
            <span>🔍 A</span>
            <span>{{ ws.assessment.arceScores.analysis?.raw || 0 }}/5</span>
          </div>
          <div class="arce-item">
            <span>🧠 R</span>
            <span>{{ ws.assessment.arceScores.reasoning?.raw || 0 }}/5</span>
          </div>
          <div class="arce-item">
            <span>💡 C</span>
            <span>{{ ws.assessment.arceScores.creativity?.raw || 0 }}/5</span>
          </div>
          <div class="arce-item">
            <span>📚 E</span>
            <span>{{ ws.assessment.arceScores.evidence?.raw || 0 }}/5</span>
          </div>
        </div>
        
        <!-- LO Passed -->
        <div v-if="ws.loAssessment?.passedLOs?.length > 0" class="lo-passed">
          <span class="lo-label">✅ LO ที่ผ่าน:</span>
          <span class="lo-tags">
            <span v-for="lo in ws.loAssessment.passedLOs" :key="lo" class="lo-tag">{{ lo }}</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Assessment History -->
    <div v-if="!loading && assessments.length > 0" class="assessments-section">
      <h2>💬 ประวัติ Chat Assessment ({{ assessments.length }} ครั้ง)</h2>

      <div 
        v-for="(assessment, index) in assessments" 
        :key="assessment.id"
        class="assessment-card card"
      >
        <!-- Assessment Header -->
        <div class="assessment-header">
          <div class="assessment-number">#{{ assessments.length - index }}</div>
          <div class="assessment-date">
            📅 {{ formatDate(assessment.createdAt) }}
          </div>
          <!-- Assessment Mode Badge -->
          <div class="assessment-mode-badge" :class="getAssessmentMode(assessment)">
            {{ getAssessmentModeLabel(assessment) }}
          </div>
          <div class="assessment-score" :class="getScoreClass(assessment.overallScore)">
            {{ assessment.overallScore }}/20
          </div>
        </div>

        <!-- Question Context -->
        <div class="question-section">
          <h4>❓ คำถาม:</h4>
          <p class="question-text">{{ assessment.questionText || assessment.questionContext || '(ไม่มีข้อมูลคำถาม)' }}</p>
        </div>

        <!-- Student Answer -->
        <div class="answer-section">
          <h4>✍️ คำตอบของนักเรียน:</h4>
          <div class="answer-text">{{ assessment.studentAnswer || assessment.rawAnswer || '(ไม่มีข้อมูลคำตอบ)' }}</div>
        </div>

        <!-- Scores Breakdown -->
        <div class="scores-section">
          <h4>📊 คะแนนรายด้าน:</h4>
          <div class="scores-grid enhanced">
            <div class="score-item analysis">
              <span class="score-label">🔍 วิเคราะห์</span>
              <div class="score-bar">
                <div class="score-fill" :style="{ width: (assessment.rubricScores.analysis / 5 * 100) + '%' }"></div>
              </div>
              <span class="score-value">{{ assessment.rubricScores.analysis }}/5</span>
            </div>
            <div class="score-item reasoning">
              <span class="score-label">🧠 เหตุผล</span>
              <div class="score-bar">
                <div class="score-fill" :style="{ width: (assessment.rubricScores.reasoning / 5 * 100) + '%' }"></div>
              </div>
              <span class="score-value">{{ assessment.rubricScores.reasoning }}/5</span>
            </div>
            <div class="score-item creativity">
              <span class="score-label">💡 สร้างสรรค์</span>
              <div class="score-bar">
                <div class="score-fill" :style="{ width: (assessment.rubricScores.creativity / 5 * 100) + '%' }"></div>
              </div>
              <span class="score-value">{{ assessment.rubricScores.creativity }}/5</span>
            </div>
            <div class="score-item evidence">
              <span class="score-label">📚 หลักฐาน</span>
              <div class="score-bar">
                <div class="score-fill" :style="{ width: (assessment.rubricScores.evidence / 5 * 100) + '%' }"></div>
              </div>
              <span class="score-value">{{ assessment.rubricScores.evidence }}/5</span>
            </div>
          </div>
          
          <!-- Overall Score Card -->
          <div class="overall-score-card" :class="getScoreClass(assessment.overallScore)">
            <span class="overall-label">📊 คะแนนรวม</span>
            <span class="overall-value">{{ assessment.overallScore }}/20</span>
            <span class="overall-percentage">({{ ((assessment.overallScore / 20) * 100).toFixed(0) }}%)</span>
          </div>
        </div>

        <!-- LO Assessment -->
        <div v-if="assessment.loAssessment" class="lo-section">
          <h4>🎯 Learning Outcomes:</h4>
          <div v-if="assessment.loAssessment.passedLOs?.length > 0" class="lo-badges">
            <span 
              v-for="loCode in assessment.loAssessment.passedLOs" 
              :key="loCode"
              class="lo-badge passed"
            >
              ✅ {{ loCode }}
            </span>
          </div>
          <div v-else class="no-lo">
            ⚠️ ไม่ผ่าน LO ในครั้งนี้
          </div>
          <div v-if="assessment.loAssessment.analysis" class="lo-analysis">
            <strong>💡 การวิเคราะห์:</strong> {{ assessment.loAssessment.analysis }}
          </div>
        </div>

        <!-- Feedback -->
        <div class="feedback-section">
          <h4>💬 Feedback:</h4>
          <p class="feedback-text">{{ assessment.feedbackText || assessment.feedback || 'ระบบได้ประเมินคำตอบของคุณเรียบร้อยแล้ว' }}</p>

          <div v-if="assessment.strengths?.length > 0" class="strengths">
            <strong>✨ จุดเด่น:</strong>
            <ul>
              <li v-for="(strength, idx) in assessment.strengths" :key="idx">{{ strength }}</li>
            </ul>
          </div>

          <div v-if="assessment.weaknesses?.length > 0" class="weaknesses">
            <strong>🎯 จุดที่ควรพัฒนา:</strong>
            <ul>
              <li v-for="(weakness, idx) in assessment.weaknesses" :key="idx">{{ weakness }}</li>
            </ul>
          </div>

          <div v-if="assessment.suggestions?.length > 0" class="suggestions">
            <strong>📝 คำแนะนำ:</strong>
            <ul>
              <li v-for="(suggestion, idx) in assessment.suggestions" :key="idx">{{ suggestion }}</li>
            </ul>
          </div>
        </div>

        <!-- Single Agent with Chain-of-Thought (For Teacher Review) -->
        <div v-if="!assessment.multiAgentMode && !assessment.agentDetails && assessment.chainOfThought" class="single-agent-section">
          <h4>🤖 Single Agent Assessment Details</h4>
          <div class="agent-badge">
            <span class="badge single-agent">🤖 Single Agent Mode (1 AI with CoT)</span>
            <span v-if="assessment.confidence" class="confidence-badge" :class="getConfidenceClass(assessment.confidence)">
              🎯 ความมั่นใจ: {{ formatConfidence(assessment.confidence) }}%
            </span>
          </div>
          
          <!-- Chain of Thought Process -->
          <div class="cot-section">
            <h5>🧠 กระบวนการคิด (Chain-of-Thought)</h5>
            <div class="cot-steps">
              <!-- Step 1: Summary -->
              <div v-if="assessment.chainOfThought.step1_summary" class="cot-step">
                <div class="step-header">
                  <span class="step-number">1</span>
                  <span class="step-title">📝 สรุปประเด็นหลัก</span>
                </div>
                <div class="step-content">
                  {{ assessment.chainOfThought.step1_summary }}
                </div>
              </div>
              
              <!-- Step 2: Evidence per dimension -->
              <div v-if="assessment.chainOfThought.step2_evidence" class="cot-step">
                <div class="step-header">
                  <span class="step-number">2</span>
                  <span class="step-title">🔍 หลักฐานที่พบในแต่ละมิติ</span>
                </div>
                <div class="step-content evidence-grid">
                  <div v-if="assessment.chainOfThought.step2_evidence.analysis" class="evidence-item">
                    <strong>🔍 การวิเคราะห์:</strong>
                    <p>{{ assessment.chainOfThought.step2_evidence.analysis }}</p>
                  </div>
                  <div v-if="assessment.chainOfThought.step2_evidence.reasoning" class="evidence-item">
                    <strong>🧠 การให้เหตุผล:</strong>
                    <p>{{ assessment.chainOfThought.step2_evidence.reasoning }}</p>
                  </div>
                  <div v-if="assessment.chainOfThought.step2_evidence.creativity" class="evidence-item">
                    <strong>💡 ความคิดสร้างสรรค์:</strong>
                    <p>{{ assessment.chainOfThought.step2_evidence.creativity }}</p>
                  </div>
                  <div v-if="assessment.chainOfThought.step2_evidence.evidence" class="evidence-item">
                    <strong>📚 หลักฐาน:</strong>
                    <p>{{ assessment.chainOfThought.step2_evidence.evidence }}</p>
                  </div>
                </div>
              </div>
              
              <!-- Step 3: Anchor Match -->
              <div v-if="assessment.chainOfThought.step3_anchor_match" class="cot-step">
                <div class="step-header">
                  <span class="step-number">3</span>
                  <span class="step-title">📊 เปรียบเทียบกับเกณฑ์</span>
                </div>
                <div class="step-content">
                  {{ assessment.chainOfThought.step3_anchor_match }}
                </div>
              </div>
              
              <!-- Step 4: Decision -->
              <div v-if="assessment.chainOfThought.step4_decision" class="cot-step">
                <div class="step-header">
                  <span class="step-number">4</span>
                  <span class="step-title">⚖️ เหตุผลการตัดสินใจ</span>
                </div>
                <div class="step-content">
                  {{ assessment.chainOfThought.step4_decision }}
                </div>
              </div>
            </div>
            
            <!-- Raw CoT (for debugging/research) -->
            <details class="raw-cot">
              <summary>🔬 ดูข้อมูลดิบ (JSON)</summary>
              <pre>{{ JSON.stringify(assessment.chainOfThought, null, 2) }}</pre>
            </details>
          </div>
          
          <!-- Confidence Reason -->
          <div v-if="assessment.confidenceReason" class="confidence-section">
            <h5>📌 เหตุผลความมั่นใจ</h5>
            <p class="confidence-reason">{{ assessment.confidenceReason }}</p>
          </div>
        </div>

        <!-- Multi-Agent Details (For Teacher Review) -->
        <div v-if="assessment.multiAgentMode && assessment.agentDetails" class="multi-agent-section">
          <h4>🤖 Multi-Agent Assessment Details</h4>
          <div class="agent-badge">
            <span class="badge multi-agent">🤖 Multi-Agent Mode (6 AI Agents)</span>
            <span v-if="assessment.confidence" class="confidence-badge">
              🎯 ความมั่นใจ: {{ assessment.confidence > 1 ? assessment.confidence.toFixed(0) : (assessment.confidence * 100).toFixed(0) }}%
            </span>
          </div>
          
          <div class="agent-details-grid">
            <!-- Analysis Agent -->
            <div v-if="assessment.agentDetails.analysis" class="agent-card">
              <div class="agent-header">
                <span class="agent-icon">🔍</span>
                <span class="agent-name">Analysis Agent</span>
                <span class="agent-score">{{ assessment.agentDetails.analysis.score || 0 }}/5</span>
              </div>
              <div class="agent-confidence" v-if="assessment.agentDetails.analysis.confidence">
                🎯 {{ assessment.agentDetails.analysis.confidence }}%
              </div>
              <div class="agent-rationale">
                {{ getAgentFeedback(assessment.agentDetails.analysis) }}
              </div>
              <div v-if="assessment.agentDetails.analysis.chainOfThought" class="agent-cot">
                <details>
                  <summary>📖 ดูกระบวนการคิด</summary>
                  <pre>{{ JSON.stringify(assessment.agentDetails.analysis.chainOfThought, null, 2) }}</pre>
                </details>
              </div>
            </div>

            <!-- Reasoning Agent -->
            <div v-if="assessment.agentDetails.reasoning" class="agent-card">
              <div class="agent-header">
                <span class="agent-icon">🧠</span>
                <span class="agent-name">Reasoning Agent</span>
                <span class="agent-score">{{ assessment.agentDetails.reasoning.score || 0 }}/5</span>
              </div>
              <div class="agent-confidence" v-if="assessment.agentDetails.reasoning.confidence">
                🎯 {{ assessment.agentDetails.reasoning.confidence }}%
              </div>
              <div class="agent-rationale">
                {{ getAgentFeedback(assessment.agentDetails.reasoning) }}
              </div>
              <div v-if="assessment.agentDetails.reasoning.chainOfThought" class="agent-cot">
                <details>
                  <summary>📖 ดูกระบวนการคิด</summary>
                  <pre>{{ JSON.stringify(assessment.agentDetails.reasoning.chainOfThought, null, 2) }}</pre>
                </details>
              </div>
            </div>

            <!-- Creativity Agent -->
            <div v-if="assessment.agentDetails.creativity" class="agent-card">
              <div class="agent-header">
                <span class="agent-icon">💡</span>
                <span class="agent-name">Creativity Agent</span>
                <span class="agent-score">{{ assessment.agentDetails.creativity.score || 0 }}/5</span>
              </div>
              <div class="agent-confidence" v-if="assessment.agentDetails.creativity.confidence">
                🎯 {{ assessment.agentDetails.creativity.confidence }}%
              </div>
              <div class="agent-rationale">
                {{ getAgentFeedback(assessment.agentDetails.creativity) }}
              </div>
              <div v-if="assessment.agentDetails.creativity.chainOfThought" class="agent-cot">
                <details>
                  <summary>📖 ดูกระบวนการคิด</summary>
                  <pre>{{ JSON.stringify(assessment.agentDetails.creativity.chainOfThought, null, 2) }}</pre>
                </details>
              </div>
            </div>

            <!-- Evidence Agent -->
            <div v-if="assessment.agentDetails.evidence" class="agent-card">
              <div class="agent-header">
                <span class="agent-icon">📚</span>
                <span class="agent-name">Evidence Agent</span>
                <span class="agent-score">{{ assessment.agentDetails.evidence.score || 0 }}/5</span>
              </div>
              <div class="agent-confidence" v-if="assessment.agentDetails.evidence.confidence">
                🎯 {{ assessment.agentDetails.evidence.confidence }}%
              </div>
              <div class="agent-rationale">
                {{ getAgentFeedback(assessment.agentDetails.evidence) }}
              </div>
              <div v-if="assessment.agentDetails.evidence.chainOfThought" class="agent-cot">
                <details>
                  <summary>📖 ดูกระบวนการคิด</summary>
                  <pre>{{ JSON.stringify(assessment.agentDetails.evidence.chainOfThought, null, 2) }}</pre>
                </details>
              </div>
            </div>
          </div>

          <!-- Adversarial Refiner Review (Agent #5) -->
          <div v-if="assessment.agentDetails.adversarial" class="adversarial-section">
            <h5>⚔️ Adversarial Refiner (Agent #5)</h5>
            <div class="adversarial-content">
              <!-- Refined Scores -->
              <div v-if="assessment.agentDetails.adversarial.refinedScores" class="refined-scores">
                <strong>🔄 คะแนนที่ปรับปรุง:</strong>
                <div class="score-grid">
                  <template v-for="key in arceOrder" :key="key">
                    <div v-if="assessment.agentDetails.adversarial.refinedScores[key]" class="refined-item">
                      <span class="dim-name">{{ key }}</span>
                      <span v-if="assessment.agentDetails.adversarial.refinedScores[key].changed" class="changed">
                        {{ assessment.agentDetails.adversarial.refinedScores[key].original }} → {{ assessment.agentDetails.adversarial.refinedScores[key].refined }}
                      </span>
                      <span v-else class="unchanged">{{ assessment.agentDetails.adversarial.refinedScores[key].refined || assessment.agentDetails.adversarial.refinedScores[key].original }} ✓</span>
                      <span v-if="assessment.agentDetails.adversarial.refinedScores[key].reason" class="reason">{{ assessment.agentDetails.adversarial.refinedScores[key].reason }}</span>
                    </div>
                  </template>
                </div>
              </div>
              
              <!-- Challenges -->
              <div v-if="assessment.agentDetails.adversarial.challenges?.length > 0" class="challenges">
                <strong>🎯 ข้อท้าทาย:</strong>
                <ul>
                  <li v-for="(challenge, idx) in assessment.agentDetails.adversarial.challenges" :key="idx">
                    <strong>{{ challenge.targetAgent }}:</strong> {{ challenge.challenge }}
                    <span v-if="challenge.recommendation" class="recommendation">
                      → {{ challenge.recommendation }}
                    </span>
                  </li>
                </ul>
              </div>
              
              <!-- Bias Detection -->
              <div v-if="assessment.agentDetails.adversarial.biasDetected?.length > 0" class="bias-list">
                <strong>⚠️ Bias ที่ตรวจพบ:</strong>
                <ul>
                  <li v-for="(bias, idx) in assessment.agentDetails.adversarial.biasDetected" :key="idx">
                    {{ bias.type }} ({{ bias.severity }}): {{ bias.evidence }}
                  </li>
                </ul>
              </div>
              
              <!-- Confidence -->
              <div v-if="assessment.agentDetails.adversarial.overallConfidence" class="adversarial-confidence">
                🎯 ความมั่นใจ Adversarial: {{ assessment.agentDetails.adversarial.overallConfidence }}%
              </div>
              
              <!-- Summary -->
              <div v-if="assessment.agentDetails.adversarial.refinementSummary" class="summary">
                <strong>📝 สรุป:</strong> {{ assessment.agentDetails.adversarial.refinementSummary }}
              </div>
            </div>
          </div>

          <!-- Consensus Aggregator (Agent #6) -->
          <div v-if="assessment.agentDetails.consensus" class="consensus-section">
            <h5>🤝 Consensus Aggregator (Agent #6)</h5>
            <div class="consensus-content">
              <!-- Final Scores -->
              <div v-if="assessment.agentDetails.consensus.rubricScores" class="final-scores">
                <strong>📊 คะแนนสุดท้าย:</strong>
                <div class="score-tags">
                  <template v-for="key in arceOrder" :key="key">
                    <span v-if="assessment.agentDetails.consensus.rubricScores[key] !== undefined" class="score-tag">
                      {{ key }}: {{ assessment.agentDetails.consensus.rubricScores[key] }}/5
                    </span>
                  </template>
                  <span class="score-tag total">
                    รวม: {{ assessment.agentDetails.consensus.totalScore }}/20
                  </span>
                </div>
              </div>
              
              <!-- Confidence -->
              <div v-if="assessment.agentDetails.consensus.confidence" class="consensus-confidence">
                🎯 ความมั่นใจรวม: {{ assessment.agentDetails.consensus.confidence }}%
                <span v-if="assessment.agentDetails.consensus.confidenceReason" class="confidence-reason">
                  ({{ assessment.agentDetails.consensus.confidenceReason }})
                </span>
              </div>
              
              <!-- Consensus Level -->
              <div v-if="assessment.agentDetails.consensus.consensusLevel" class="consensus-level">
                <span :class="['level-badge', assessment.agentDetails.consensus.consensusLevel]">
                  {{ assessment.agentDetails.consensus.consensusLevel === 'high' ? '🟢 High Consensus' : 
                     assessment.agentDetails.consensus.consensusLevel === 'medium' ? '🟡 Medium Consensus' : 
                     '🔴 Low Consensus' }}
                </span>
              </div>
              
              <!-- Feedback -->
              <div v-if="assessment.agentDetails.consensus.feedback" class="consensus-feedback">
                <strong>💬 Feedback:</strong> {{ assessment.agentDetails.consensus.feedback }}
              </div>
            </div>
          </div>

          <!-- Processing Time -->
          <div v-if="assessment.processingTime" class="processing-info">
            ⏱️ เวลาประมวลผล: {{ (assessment.processingTime / 1000).toFixed(1) }}s
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && assessments.length === 0" class="empty-state">
      <div class="empty-icon">📝</div>
      <h2>ยังไม่มีประวัติการประเมิน</h2>
      <p>นักเรียนยังไม่ได้ทำการประเมินในระบบ</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/config'
// Note: StudentDetail.vue calculates LO from loaded assessments array (same logic as loProgress.js utility)
// This is efficient because assessments are already loaded for display

// ARCE order constant for consistent display: Analysis → Reasoning → Creativity → Evidence
const arceOrder = ['analysis', 'reasoning', 'creativity', 'evidence']

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const studentInfo = ref(null)
const assessments = ref([])
const worksheetSubmissions = ref([])  // 🎮 เพิ่มข้อมูล Worksheet

const studentId = route.params.studentId
const courseId = route.query.courseId

onMounted(async () => {
  await loadStudentData()
})

async function loadStudentData() {
  loading.value = true
  try {
    // Load student info
    const userDoc = await getDoc(doc(db, 'users', studentId))
    if (userDoc.exists()) {
      studentInfo.value = {
        uid: studentId,
        ...userDoc.data()
      }
    } else {
      // ถ้าไม่พบข้อมูล ใช้ข้อมูลพื้นฐาน
      studentInfo.value = {
        uid: studentId,
        displayName: 'ไม่ระบุชื่อ',
        studentId: studentId,
        grade: '-',
        room: '-',
        number: '-',
        section: '-'
      }
    }

    // Load assessments - แยก query เพื่อหลีกเลี่ยง composite index
    const assessmentsRef = collection(db, 'assessments')
    let q

    console.log('📊 Loading assessments for studentId:', studentId, 'courseId:', courseId)

    if (courseId) {
      // Query แบบมี courseId
      q = query(
        assessmentsRef,
        where('studentId', '==', studentId),
        where('courseId', '==', courseId)
      )
    } else {
      // Query แบบไม่มี courseId
      q = query(
        assessmentsRef,
        where('studentId', '==', studentId)
      )
    }

    const snapshot = await getDocs(q)
    console.log('📊 Found assessments:', snapshot.docs.length)
    
    // เรียงข้อมูลหลัง query (client-side sorting)
    const now = Date.now()
    assessments.value = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a, b) => {
        // เรียงจากล่าสุดไปเก่าสุด
        // ใช้ timestamp ปัจจุบันเป็น fallback สำหรับ items ที่ไม่มีวันที่ (เพราะน่าจะเป็นของใหม่)
        const dateA = a.createdAt?.toMillis?.() || a.timestamp?.toMillis?.() || now
        const dateB = b.createdAt?.toMillis?.() || b.timestamp?.toMillis?.() || now
        return dateB - dateA
      })
    
    // 🎮 Load worksheet submissions (เพิ่มใหม่)
    const worksheetsRef = collection(db, 'worksheetSubmissions')
    let wsQuery
    if (courseId) {
      wsQuery = query(
        worksheetsRef,
        where('studentId', '==', studentId),
        where('courseId', '==', courseId),
        where('status', '==', 'graded')
      )
    } else {
      wsQuery = query(
        worksheetsRef,
        where('studentId', '==', studentId),
        where('status', '==', 'graded')
      )
    }
    
    const wsSnapshot = await getDocs(wsQuery)
    worksheetSubmissions.value = wsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a, b) => {
        // ใช้ timestamp ปัจจุบันเป็น fallback
        const dateA = a.submittedAt?.toMillis?.() || a.createdAt?.toMillis?.() || now
        const dateB = b.submittedAt?.toMillis?.() || b.createdAt?.toMillis?.() || now
        return dateB - dateA
      })

  } catch (error) {
    console.error('Error loading student data:', error)
    alert(`เกิดข้อผิดพลาด: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// Computed properties
const totalAssessments = computed(() => assessments.value.length)
const totalWorksheets = computed(() => worksheetSubmissions.value.length)  // 🎮 เพิ่ม
const totalActivities = computed(() => totalAssessments.value + totalWorksheets.value)  // 🎮 รวมทั้งหมด

const averageScore = computed(() => {
  if (assessments.value.length === 0) return 0
  const total = assessments.value.reduce((sum, a) => sum + (a.overallScore || 0), 0)
  return total / assessments.value.length
})

// 🎮 คะแนนเฉลี่ย Worksheet
const averageWorksheetScore = computed(() => {
  if (worksheetSubmissions.value.length === 0) return 0
  const total = worksheetSubmissions.value.reduce((sum, ws) => sum + (ws.assessment?.summary?.percentage || 0), 0)
  return total / worksheetSubmissions.value.length
})

const totalLOsPassed = computed(() => {
  const uniqueLOs = new Set()
  // จาก Chat assessments
  assessments.value.forEach(a => {
    if (a.loAssessment?.passedLOs) {
      a.loAssessment.passedLOs.forEach(lo => uniqueLOs.add(lo))
    }
  })
  // 🎮 จาก Worksheet submissions
  worksheetSubmissions.value.forEach(ws => {
    if (ws.loAssessment?.passedLOs) {
      ws.loAssessment.passedLOs.forEach(lo => uniqueLOs.add(lo))
    }
  })
  return uniqueLOs.size
})

const lastAssessmentDate = computed(() => {
  if (assessments.value.length === 0) return '-'
  return formatDate(assessments.value[0].createdAt)
})

// Helper functions
function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

function formatDate(timestamp) {
  if (!timestamp) return '(รอบันทึกวันที่)'
  
  try {
    // รองรับทั้ง Firestore Timestamp, JavaScript Date, และ string
    let date
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate()
    } else if (timestamp.seconds) {
      // Firestore Timestamp object format
      date = new Date(timestamp.seconds * 1000)
    } else if (timestamp instanceof Date) {
      date = timestamp
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp)
    } else {
      return '(รอบันทึกวันที่)'
    }
    
    // ตรวจสอบว่า date valid หรือไม่
    if (isNaN(date.getTime())) {
      return '(รอบันทึกวันที่)'
    }
    
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  } catch (error) {
    console.warn('Error formatting date:', error, timestamp)
    return '(รอบันทึกวันที่)'
  }
}

// 🤖 Get Agent Feedback with smart fallbacks
function getAgentFeedback(agentData) {
  if (!agentData) return 'รอข้อมูล...'
  
  // 1. Primary: microFeedback
  if (agentData.microFeedback) return agentData.microFeedback
  
  // 2. Fallback: rationale
  if (agentData.rationale) return agentData.rationale
  
  // 3. Fallback: chainOfThought.step4_reasoning (เหตุผลการให้คะแนน)
  if (agentData.chainOfThought?.step4_reasoning) {
    return agentData.chainOfThought.step4_reasoning
  }
  
  // 4. Fallback: chainOfThought.step3_anchor_match
  if (agentData.chainOfThought?.step3_anchor_match) {
    return agentData.chainOfThought.step3_anchor_match
  }
  
  // 5. Fallback: anchorUsed (description ของ Anchor ที่ใช้)
  if (agentData.anchorUsed) return agentData.anchorUsed
  
  // 6. Generate from score if nothing else
  const score = agentData.score || 0
  if (score >= 4) return `ได้คะแนน ${score}/5 - แสดงทักษะระดับดีมาก`
  if (score >= 3) return `ได้คะแนน ${score}/5 - แสดงทักษะระดับดี`
  if (score >= 2) return `ได้คะแนน ${score}/5 - แสดงทักษะระดับปานกลาง`
  if (score >= 1) return `ได้คะแนน ${score}/5 - ควรปรับปรุงเพิ่มเติม`
  return `ได้คะแนน ${score}/5 - ยังไม่แสดงทักษะด้านนี้`
}

function getScoreClass(score) {
  if (score >= 16) return 'excellent'
  if (score >= 12) return 'good'
  if (score >= 8) return 'fair'
  return 'poor'
}

// 🆕 Confidence helper functions
function formatConfidence(confidence) {
  if (typeof confidence !== 'number') return 0
  return confidence > 1 ? confidence.toFixed(0) : (confidence * 100).toFixed(0)
}

function getConfidenceClass(confidence) {
  const value = confidence > 1 ? confidence : confidence * 100
  if (value >= 80) return 'high'
  if (value >= 60) return 'medium'
  return 'low'
}

// 🆕 Assessment mode helper functions
function getAssessmentMode(assessment) {
  if (assessment.multiAgentMode || assessment.agentDetails) {
    return 'multi-agent'
  }
  return 'single-agent'
}

function getAssessmentModeLabel(assessment) {
  if (assessment.multiAgentMode || assessment.agentDetails) {
    return '🤖×6 Multi-Agent'
  }
  return '🤖 Single Agent'
}

async function exportReport() {
  try {
    // Create CSV content
    const headers = [
      'ลำดับ',
      'วันที่ประเมิน',
      'คำถาม',
      'คำตอบ',
      'คะแนนรวม',
      'วิเคราะห์',
      'เหตุผล',
      'สร้างสรรค์',
      'หลักฐาน',
      'LO ที่ผ่าน',
      'Feedback'
    ]

    const rows = assessments.value.map((a, index) => [
      assessments.value.length - index,
      formatDate(a.createdAt),
      `"${(a.questionContext || '').replace(/"/g, '""')}"`,
      `"${(a.rawAnswer || '').replace(/"/g, '""')}"`,
      a.overallScore,
      a.rubricScores.analysis,
      a.rubricScores.reasoning,
      a.rubricScores.creativity,
      a.rubricScores.evidence,
      (a.loAssessment?.passedLOs || []).join(', '),
      `"${(a.feedbackText || a.feedback || '').replace(/"/g, '""')}"`
    ])

    const csvContent = [
      `รายงานรายละเอียดนักเรียน: ${studentInfo.value.displayName}`,
      `รหัสนักเรียน: ${studentInfo.value.studentId}`,
      `วันที่ Export: ${new Date().toLocaleDateString('th-TH')}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Add BOM for UTF-8
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    // Download
    const link = document.createElement('a')
    link.href = url
    link.download = `รายงาน_${studentInfo.value.studentId}_${Date.now()}.csv`
    link.click()
    
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting:', error)
    alert('เกิดข้อผิดพลาดในการ Export รายงาน')
  }
}
</script>

<style scoped>
.student-detail {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;

  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.back-btn {
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  border-color: var(--primary-color);
  transform: translateX(-2px);
}

.header-content {
  flex: 1;
}

.header-content h1 {
  font-size: 2rem;
  color: var(--text-primary);
  margin: 0;
}

.subtitle {
  color: var(--text-secondary);
  margin: 0.25rem 0 0 0;
}

.btn-export {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-export:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-state {
  text-align: center;
  padding: 4rem 2rem;
}

.spinner {
  width: 50px;
  height: 50px;
  margin: 0 auto 1rem;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.card {
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.student-card {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
}

.student-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.student-avatar img,
.avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
}

.student-info h2 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.student-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  color: var(--text-secondary);
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-box {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.stat-icon {
  font-size: 2rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary-color);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.assessments-section h2 {
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.assessment-card {
  margin-bottom: 1.5rem;
}

.assessment-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--border-color);
  margin-bottom: 1rem;
}

.assessment-number {
  background: var(--primary-color);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: bold;
}

.assessment-date {
  flex: 1;
  color: var(--text-secondary);
}

/* Assessment Mode Badge */
.assessment-mode-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 600;
}

.assessment-mode-badge.multi-agent {
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: white;
}

.assessment-mode-badge.single-agent {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
}

.assessment-score {
  font-size: 1.5rem;
  font-weight: bold;
  padding: 0.5rem 1rem;
  border-radius: 8px;
}

.assessment-score.excellent {
  background: #10b981;
  color: white;
}

.assessment-score.good {
  background: #3b82f6;
  color: white;
}

.assessment-score.fair {
  background: #f59e0b;
  color: white;
}

.assessment-score.poor {
  background: #ef4444;
  color: white;
}

.question-section,
.answer-section,
.scores-section,
.lo-section,
.feedback-section {
  margin-bottom: 1.5rem;
}

.question-section h4,
.answer-section h4,
.scores-section h4,
.lo-section h4,
.feedback-section h4 {
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.question-text,
.answer-text {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.scores-grid {
  display: grid;
  gap: 1rem;
}

.scores-grid.enhanced {
  gap: 0.875rem;
}

.score-item {
  display: grid;
  grid-template-columns: 130px 1fr 60px;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 8px;
  background: var(--bg-secondary);
  transition: all 0.2s ease;
}

.score-item:hover {
  transform: translateX(4px);
}

/* Color-coded score items */
.score-item.analysis { border-left: 4px solid #60a5fa; }
.score-item.reasoning { border-left: 4px solid #a78bfa; }
.score-item.creativity { border-left: 4px solid #f472b6; }
.score-item.evidence { border-left: 4px solid #34d399; }

.score-label {
  font-weight: 600;
  color: var(--text-primary);
}

.score-bar {
  height: 12px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  transition: width 0.5s ease;
}

/* Color-coded score bars */
.score-item.analysis .score-fill { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
.score-item.reasoning .score-fill { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }
.score-item.creativity .score-fill { background: linear-gradient(90deg, #ec4899, #f472b6); }
.score-item.evidence .score-fill { background: linear-gradient(90deg, #10b981, #34d399); }

.score-value {
  text-align: right;
  font-weight: 700;
  color: var(--primary-color);
  font-size: 1rem;
}

/* Overall Score Card */
.overall-score-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  font-weight: 700;
  margin-top: 1.25rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
}

.overall-score-card.excellent {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.overall-score-card.good {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.overall-score-card.fair {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.overall-score-card.poor {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.overall-label {
  font-size: 1rem;
}

.overall-value {
  font-size: 1.5rem;
  font-weight: 900;
}

.overall-percentage {
  font-size: 0.9rem;
  opacity: 0.9;
}

.lo-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.lo-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 500;
}

.lo-badge.passed {
  background: #10b981;
  color: white;
}

.no-lo {
  color: #f59e0b;
  font-weight: 500;
}

.lo-analysis {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
  margin-top: 0.5rem;
  color: var(--text-primary);
}

.feedback-text {
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.strengths,
.weaknesses,
.suggestions {
  margin-top: 1rem;
}

.strengths strong {
  color: #10b981;
}

.weaknesses strong {
  color: #f59e0b;
}

.suggestions strong {
  color: #3b82f6;
}

.strengths ul,
.weaknesses ul,
.suggestions ul {
  margin: 0.5rem 0 0 1.5rem;
  color: var(--text-primary);
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h2 {
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .student-detail {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .student-header {
    flex-direction: column;
    text-align: center;
  }

  .summary-stats {
    grid-template-columns: 1fr;
  }

  .score-item {
    grid-template-columns: 100px 1fr 50px;
    gap: 0.5rem;
  }
}

/* 🎮 Worksheet Styles (เพิ่มใหม่) */
.worksheets-section {
  margin-bottom: 2rem;
}

.worksheets-section h2 {
  color: var(--text-primary);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.worksheet-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  border-left: 4px solid #10b981;
}

.worksheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.worksheet-number {
  background: #10b981;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: bold;
  font-size: 0.9rem;
}

.worksheet-date {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.worksheet-score {
  font-size: 1.5rem;
  font-weight: bold;
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
}

.worksheet-score.excellent { background: #10b981; color: white; }
.worksheet-score.good { background: #3b82f6; color: white; }
.worksheet-score.fair { background: #f59e0b; color: white; }
.worksheet-score.poor { background: #ef4444; color: white; }

.worksheet-info {
  margin-bottom: 1rem;
}

.worksheet-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.worksheet-meta {
  display: flex;
  gap: 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  flex-wrap: wrap;
}

.arce-scores {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.arce-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.arce-item span:first-child {
  font-size: 1.2rem;
}

.arce-item span:last-child {
  font-weight: bold;
  color: var(--primary-color);
}

.lo-passed {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.lo-label {
  color: #10b981;
  font-weight: 500;
}

.lo-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.lo-tag {
  background: #10b981;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
}

.stat-box.highlight {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.stat-box.highlight .stat-label {
  color: rgba(255, 255, 255, 0.9);
}

/* 🆕 Single Agent with CoT Section */
.single-agent-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px dashed var(--border-color);
}

.single-agent-section h4 {
  color: var(--primary-color);
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.badge.single-agent {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
}

.confidence-badge.high {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.confidence-badge.medium {
  background: rgba(251, 191, 36, 0.2);
  color: #f59e0b;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.confidence-badge.low {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

/* Chain of Thought Section */
.cot-section {
  margin-top: 1.25rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid var(--border-color);
}

.cot-section h5 {
  margin: 0 0 1rem 0;
  color: var(--primary-color);
  font-size: 1rem;
}

.cot-steps {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cot-step {
  background: var(--bg-primary);
  border-radius: 10px;
  padding: 1rem;
  border-left: 4px solid var(--primary-color);
}

.step-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.step-number {
  width: 28px;
  height: 28px;
  background: var(--primary-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
}

.step-title {
  font-weight: 600;
  color: var(--text-primary);
}

.step-content {
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 0.9rem;
}

.evidence-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.evidence-item {
  background: var(--bg-secondary);
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.evidence-item strong {
  display: block;
  margin-bottom: 0.375rem;
  font-size: 0.8rem;
}

.evidence-item p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.raw-cot {
  margin-top: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
  overflow: hidden;
}

.raw-cot summary {
  padding: 0.75rem;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-muted);
  background: var(--bg-secondary);
}

.raw-cot summary:hover {
  background: var(--border-color);
}

.raw-cot pre {
  margin: 0;
  padding: 1rem;
  font-size: 0.75rem;
  overflow-x: auto;
  background: var(--bg-primary);
  color: var(--text-secondary);
  max-height: 300px;
  overflow-y: auto;
}

.confidence-section {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.confidence-section h5 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.confidence-section .confidence-reason {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Multi-Agent Assessment Section */
.multi-agent-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px dashed var(--border-color);
}

.multi-agent-section h4 {
  color: var(--primary-color);
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.agent-badge {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.badge.multi-agent {
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
}

.confidence-badge {
  background: var(--bg-secondary);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.agent-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.agent-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid var(--border-color);
}

.agent-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.agent-icon {
  font-size: 1.25rem;
}

.agent-name {
  flex: 1;
  font-weight: 600;
  color: var(--text-primary);
}

.agent-score {
  background: var(--primary-color);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: bold;
  font-size: 0.9rem;
}

.agent-rationale {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
}

.agent-confidence {
  font-size: 0.8rem;
  color: var(--primary-color);
  margin-bottom: 0.5rem;
}

.agent-cot {
  margin-top: 0.75rem;
  border-top: 1px dashed var(--border-color);
  padding-top: 0.5rem;
}

.agent-cot summary {
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.agent-cot pre {
  background: var(--bg-primary);
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin-top: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.adversarial-section,
.consensus-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.adversarial-section {
  border-left: 4px solid #f59e0b;
}

.consensus-section {
  border-left: 4px solid #10b981;
}

.adversarial-section h5,
.consensus-section h5 {
  color: var(--text-primary);
  margin-bottom: 0.75rem;
  font-size: 1rem;
}

.adversarial-content,
.consensus-content {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.refined-scores .score-grid {
  display: grid;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.refined-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.refined-item .dim-name {
  font-weight: 600;
  min-width: 80px;
}

.refined-item .changed {
  color: #f59e0b;
  font-weight: bold;
}

.refined-item .unchanged {
  color: #10b981;
}

.refined-item .reason {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-style: italic;
}

.challenges ul,
.bias-list ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.challenges li,
.bias-list li {
  margin-bottom: 0.5rem;
}

.recommendation {
  color: #3b82f6;
  font-weight: 500;
}

.adversarial-confidence,
.consensus-confidence {
  margin-top: 0.75rem;
  font-weight: 500;
  color: var(--primary-color);
}

.confidence-reason {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-style: italic;
}

.consensus-level {
  margin-top: 0.5rem;
}

.level-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.level-badge.high {
  background: #10b98122;
  color: #10b981;
}

.level-badge.medium {
  background: #f59e0b22;
  color: #f59e0b;
}

.level-badge.low {
  background: #ef444422;
  color: #ef4444;
}

.consensus-feedback {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border-color);
}

.score-tag.total {
  background: var(--primary-color);
  font-weight: bold;
}

.adjustments ul,
.concerns {
  margin: 0.5rem 0;
}

.adjustments li {
  margin-left: 1.5rem;
}

.score-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.score-tag {
  background: var(--primary-color);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.85rem;
}

.processing-info {
  text-align: right;
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

@media (max-width: 768px) {
  .agent-details-grid {
    grid-template-columns: 1fr;
  }
  
  .agent-badge {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
