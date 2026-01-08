<template>
  <div class="worksheet-result-view">
    <!-- Top Navigation -->
    <nav class="top-navbar">
      <div class="nav-brand">
        <router-link :to="backRoute" class="back-link">
          <span class="material-icons">arrow_back</span>
        </router-link>
        <span class="brand-icon">📊</span>
        <span class="brand-text">ผลการประเมินใบงาน</span>
      </div>
      <div class="nav-actions">
        <button class="btn btn-outline btn-sm" @click="downloadReport">
          <span class="material-icons">download</span>
          ดาวน์โหลด
        </button>
      </div>
    </nav>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <LoadingSpinner />
      <p>กำลังโหลดผลการประเมิน...</p>
    </div>

    <!-- Result Content -->
    <div v-else-if="submission" class="result-container">
      
      <!-- Student Info Card -->
      <section class="student-info-section">
        <div class="student-info-card">
          <div class="student-avatar">
            <img v-if="studentInfo.photoURL" :src="studentInfo.photoURL" :alt="studentInfo.displayName" />
            <span v-else class="avatar-placeholder">{{ studentInfo.initials }}</span>
          </div>
          <div class="student-details">
            <h2>{{ studentInfo.displayName }}</h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">รหัสนักเรียน</span>
                <span class="value">{{ studentInfo.studentId || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">ชั้น</span>
                <span class="value">{{ studentInfo.grade || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">ห้อง</span>
                <span class="value">{{ studentInfo.room || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">เลขที่</span>
                <span class="value">{{ studentInfo.number || '-' }}</span>
              </div>
              <div class="info-item" v-if="studentInfo.section">
                <span class="label">ตอน</span>
                <span class="value">{{ studentInfo.section }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Summary Card -->
      <section class="summary-section">
        <div class="summary-card">
          <!-- Score Circle -->
          <div class="score-area">
            <div class="score-circle" :class="scoreClass">
              <span class="score-value">{{ summary.percentage?.toFixed(0) || 0 }}</span>
              <span class="score-unit">%</span>
            </div>
            <div class="pa-badge" :class="paClass">
              {{ summary.paLevelText || 'ไม่ระบุ' }}
            </div>
          </div>
          
          <!-- Summary Info -->
          <div class="summary-info">
            <h1>{{ worksheet?.metadata?.title || 'ใบงาน' }}</h1>
            <p class="topic">{{ worksheet?.metadata?.topic }}</p>
            <p class="course-info">รายวิชา: {{ worksheet?.metadata?.courseName || '-' }} | ระดับชั้น: {{ worksheet?.metadata?.gradeLevel || '-' }}</p>
            
            <!-- 🏷️ Assessment Mode Badge -->
            <div class="assessment-mode-indicator" v-if="assessment?.assessmentMode">
              <span class="mode-badge" :class="assessment.assessmentMode">
                <span class="mode-icon">{{ getAssessmentModeIcon(assessment.assessmentMode) }}</span>
                <span class="mode-name">{{ getAssessmentModeName(assessment.assessmentMode) }}</span>
              </span>
              <span class="mode-desc">{{ getAssessmentModeDesc(assessment.assessmentMode) }}</span>
            </div>
            
            <div class="score-breakdown">
              <div class="breakdown-item highlight">
                <span class="label">คะแนนที่ได้</span>
                <span class="value big">{{ summary.totalScore || 0 }} / {{ summary.maxScore || 0 }}</span>
              </div>
              <div class="breakdown-item">
                <span class="label">เปอร์เซ็นต์</span>
                <span class="value">{{ summary.percentage?.toFixed(1) || 0 }}%</span>
              </div>
              <div class="breakdown-item">
                <span class="label">ระดับ PA</span>
                <span class="value">{{ summary.paLevel || '-' }}</span>
              </div>
              <div class="breakdown-item">
                <span class="label">เวลาที่ใช้</span>
                <span class="value">{{ formatDuration(submission.timeSpent) }}</span>
              </div>
              <div class="breakdown-item">
                <span class="label">ส่งเมื่อ</span>
                <span class="value">{{ formatDate(submission.submittedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 🎨 Mode-Specific Assessment Report -->
      <section class="mode-specific-report" v-if="assessment">
        <h2 class="section-title">
          {{ getAssessmentModeIcon(assessment.assessmentMode || 'single') }} 
          รายงานตามโหมดการประเมิน: {{ getAssessmentModeName(assessment.assessmentMode || 'single') }}
        </h2>
        
        <!-- Mode A: Single Agent Report (Default) -->
        <ModeAReport 
          v-if="!assessment.assessmentMode || assessment.assessmentMode === 'single'"
          :assessment="assessment"
          :summary="summary"
        />
        
        <!-- Mode B: Batch Assessment Report -->
        <ModeBReport 
          v-if="assessment.assessmentMode === 'batch'"
          :assessment="assessment"
          :summary="summary"
          :batchDetails="assessment.batchDetails || {}"
        />
        
        <!-- Mode C: Per-Question Assessment Report -->
        <ModeCReport 
          v-if="assessment.assessmentMode === 'per-question'"
          :assessment="assessment"
          :summary="summary"
          :perQuestionDetails="assessment.perQuestionDetails || {}"
        />
        
        <!-- Mode D: Multi-Agent Worksheet Report -->
        <ModeDReport 
          v-if="assessment.assessmentMode === 'multi-agent-worksheet' || assessment.assessmentMode === 'multi-agent' || assessment.assessmentMode === 'multi-agent-per-question'"
          :assessment="assessment"
          :summary="summary"
          :multiAgentResult="assessment.multiAgentResult || assessment.agentDetails || {}"
        />
      </section>

      <!-- Learning Outcomes Section -->
      <section class="lo-section" v-if="loAssessment">
        <h2 class="section-title">🎓 Learning Outcomes ที่ผ่าน</h2>
        <div class="lo-content">
          <!-- LO Progress Summary -->
          <div class="lo-summary">
            <div class="lo-stat passed">
              <span class="lo-number">{{ loAssessment.passedLOs?.length || 0 }}</span>
              <span class="lo-label">LO ที่ผ่าน</span>
            </div>
            <div class="lo-stat total">
              <span class="lo-number">{{ totalLOs }}</span>
              <span class="lo-label">LO ทั้งหมด</span>
            </div>
            <div class="lo-stat percentage">
              <span class="lo-number">{{ loPercentage }}%</span>
              <span class="lo-label">ความก้าวหน้า</span>
            </div>
          </div>
          
          <!-- Passed LOs List -->
          <div v-if="loAssessment.passedLOs?.length" class="lo-list passed-list">
            <h4><span class="material-icons">check_circle</span> LO ที่ผ่านในใบงานนี้</h4>
            <div class="lo-tags">
              <span v-for="lo in loAssessment.passedLOs" :key="lo" class="lo-tag passed">
                {{ lo }}
              </span>
            </div>
          </div>
          
          <!-- All Worksheet LOs -->
          <div v-if="worksheetLOs?.length" class="lo-list all-los">
            <h4><span class="material-icons">list</span> Learning Outcomes ของใบงาน</h4>
            <ul class="lo-details">
              <li v-for="lo in worksheetLOs" :key="lo.loCode" class="lo-item"
                  :class="{ passed: isLOPassed(lo.loCode) }">
                <span class="lo-code">{{ lo.loCode }}</span>
                <span class="lo-desc">{{ lo.loDescription }}</span>
                <span class="lo-status">
                  <span v-if="isLOPassed(lo.loCode)" class="material-icons passed">check_circle</span>
                  <span v-else class="material-icons pending">pending</span>
                </span>
              </li>
            </ul>
          </div>
          
          <!-- LO Analysis -->
          <div v-if="loAssessment?.analysis" class="lo-analysis">
            <h4><span class="material-icons">analytics</span> การวิเคราะห์</h4>
            <p>{{ loAssessment?.analysis }}</p>
          </div>
        </div>
      </section>

      <!-- Cognitive Level Analysis -->
      <section class="cognitive-section">
        <h2 class="section-title">🧠 การวิเคราะห์ระดับปัญญา (Bloom's Taxonomy)</h2>
        <div class="cognitive-analysis">
          <div class="bloom-levels">
            <div v-for="level in bloomLevels" :key="level.key" 
                 class="bloom-item" :class="{ active: level.achieved }">
              <div class="bloom-icon">{{ level.icon }}</div>
              <div class="bloom-info">
                <h4>{{ level.label }}</h4>
                <p>{{ level.description }}</p>
              </div>
              <div class="bloom-status">
                <span class="material-icons">{{ level.achieved ? 'check_circle' : 'radio_button_unchecked' }}</span>
              </div>
            </div>
          </div>
          <div class="cognitive-summary">
            <p><strong>ระดับการคิดที่แสดงออก:</strong> {{ cognitiveLevel }}</p>
            <p class="cognitive-feedback">{{ cognitiveFeedback }}</p>
          </div>
        </div>
      </section>

      <!-- ARCE Scores -->
      <section class="arce-section" v-if="assessment?.arceScores">
        <h2 class="section-title">🎯 คะแนน HOTS A.R.C.E.</h2>
        <div class="arce-cards">
          <template v-for="key in arceOrder" :key="key">
            <div v-if="assessment?.arceScores?.[key] !== undefined"
                 class="arce-card" :class="key">
              <div class="arce-icon">{{ getArceIcon(key) }}</div>
              <div class="arce-info">
                <h3>{{ getArceLabel(key) }}</h3>
                <div class="arce-bar">
                  <div class="arce-fill" :style="{ width: (getArceRaw(assessment.arceScores[key]) / 5 * 100) + '%' }"></div>
                </div>
                <span class="arce-score">{{ getArceRaw(assessment.arceScores[key]) }} / 5</span>
                <p v-if="getArceFeedback(assessment.arceScores[key])" class="arce-feedback">{{ getArceFeedback(assessment.arceScores[key]) }}</p>
              </div>
            </div>
          </template>
        </div>
        
        <!-- Radar Chart -->
        <div class="radar-container" v-if="hasRadarData">
          <RadarChart :values="radarValues" />
        </div>
      </section>

      <!-- 🆕 Multi-Agent Details Section -->
      <section class="multi-agent-section" v-if="isMultiAgentMode">
        <h2 class="section-title">
          <span class="material-icons">smart_toy</span>
          🤖×6 รายงาน Multi-Agent Assessment
        </h2>
        
        <!-- Assessment Mode Badge -->
        <div class="multi-agent-badge">
          <span class="badge-icon">🔬</span>
          <span class="badge-text">ประเมินด้วยระบบ Multi-Agent (6 AI Experts)</span>
          <span class="confidence-badge" v-if="multiAgentMetadata?.consensusLevel">
            {{ getConsensusLabel(multiAgentMetadata.consensusLevel) }}
          </span>
        </div>

        <!-- 4 Specialist Agents -->
        <div class="agents-grid">
          <div v-for="agent in specialistAgents" :key="agent.key" 
               class="agent-card" :class="agent.key">
            <div class="agent-header">
              <span class="agent-icon">{{ agent.icon }}</span>
              <h4>Agent #{{ agent.number }}: {{ agent.name }}</h4>
            </div>
            <div class="agent-score">
              <span class="score-value">{{ agent.score }}/5</span>
              <span class="confidence-value">ความเชื่อมั่น: {{ getConfidencePercent(agent.confidence) }}%</span>
            </div>
            <p class="agent-feedback">{{ agent.feedback || 'ไม่มีข้อมูล' }}</p>
            
            <!-- Chain of Thought (Expandable) -->
            <details v-if="agent.chainOfThought" class="chain-of-thought">
              <summary>🧠 กระบวนการคิดของ Agent</summary>
              <p>{{ agent.chainOfThought }}</p>
            </details>
          </div>
        </div>

        <!-- Agent #5: Adversarial Refiner -->
        <div class="adversarial-section" v-if="agentDetails?.adversarial">
          <h4><span class="agent-icon">⚖️</span> Agent #5: Adversarial Refiner</h4>
          <div class="adversarial-content">
            <div v-if="adversarialChallenges.length" class="challenges-list">
              <p><strong>🔍 ข้อท้าทาย:</strong></p>
              <ul>
                <li v-for="(challenge, idx) in adversarialChallenges" :key="idx">{{ challenge }}</li>
              </ul>
            </div>
            <div v-if="adversarialBiasDetected.length" class="bias-list">
              <p><strong>⚠️ อคติที่ตรวจพบ:</strong></p>
              <ul>
                <li v-for="(bias, idx) in adversarialBiasDetected" :key="idx">{{ bias }}</li>
              </ul>
            </div>
            <div v-if="!adversarialChallenges.length && !adversarialBiasDetected.length" class="no-issues">
              ✅ ไม่พบปัญหาในการประเมิน
            </div>
          </div>
        </div>

        <!-- Agent #6: Consensus Aggregator -->
        <div class="consensus-section" v-if="agentDetails?.consensus">
          <h4><span class="agent-icon">🎯</span> Agent #6: Consensus Aggregator</h4>
          <div class="consensus-content">
            <div class="consensus-scores">
              <div class="consensus-item">
                <span class="label">คะแนนรวม:</span>
                <span class="value">{{ agentDetails?.consensus?.totalScore || 0 }}/20</span>
              </div>
              <div class="consensus-item">
                <span class="label">ความเชื่อมั่น:</span>
                <span class="value">{{ getConfidencePercent(agentDetails?.consensus?.confidence) }}%</span>
              </div>
              <div class="consensus-item">
                <span class="label">ระดับ Consensus:</span>
                <span class="value consensus-badge" :class="agentDetails?.consensus?.consensusLevel">
                  {{ getConsensusLabel(agentDetails?.consensus?.consensusLevel) }}
                </span>
              </div>
            </div>
            <p class="consensus-feedback" v-if="agentDetails?.consensus?.feedback">
              {{ agentDetails?.consensus?.feedback }}
            </p>
          </div>
        </div>

        <!-- Processing Metadata -->
        <div class="processing-meta" v-if="multiAgentMetadata">
          <small>
            ⏱️ เวลาประมวลผล: {{ multiAgentMetadata.processingTimeMs || 0 }}ms | 
            🤖 จำนวน Agent: {{ multiAgentMetadata.agentCount || 6 }}
          </small>
        </div>
      </section>

      <!-- Strengths & Weaknesses -->
      <section class="feedback-section">
        <div class="feedback-grid">
          <!-- Strengths -->
          <div class="feedback-card strengths">
            <div class="feedback-header">
              <span class="material-icons">thumb_up</span>
              <h3>จุดเด่น</h3>
            </div>
            <ul v-if="assessment.strengths?.length">
              <li v-for="(strength, idx) in assessment.strengths" :key="idx">
                {{ strength }}
              </li>
            </ul>
            <p v-else class="no-data">ไม่มีข้อมูล</p>
          </div>

          <!-- Weaknesses -->
          <div class="feedback-card weaknesses">
            <div class="feedback-header">
              <span class="material-icons">lightbulb</span>
              <h3>จุดที่ควรพัฒนา</h3>
            </div>
            <ul v-if="assessment.weaknesses?.length">
              <li v-for="(weakness, idx) in assessment.weaknesses" :key="idx">
                {{ weakness }}
              </li>
            </ul>
            <p v-else class="no-data">ไม่มีข้อมูล</p>
          </div>
        </div>
      </section>

      <!-- 📊 Statistics Section (Research-Grade) -->
      <section class="statistics-section" v-if="assessment.statistics">
        <h2 class="section-title">📊 สถิติการประเมิน (Research Grade)</h2>
        <div class="statistics-content">
          <!-- Overview Stats -->
          <div class="stats-overview">
            <div class="stat-item">
              <span class="stat-value">{{ assessment.statistics.totalQuestions }}</span>
              <span class="stat-label">ข้อทั้งหมด</span>
            </div>
            <div class="stat-item passed">
              <span class="stat-value">{{ assessment.statistics.passedQuestions }}</span>
              <span class="stat-label">ผ่านเกณฑ์</span>
            </div>
            <div class="stat-item failed">
              <span class="stat-value">{{ assessment.statistics.failedQuestions }}</span>
              <span class="stat-label">ไม่ผ่านเกณฑ์</span>
            </div>
            <div class="stat-item rate">
              <span class="stat-value">{{ assessment.statistics.passRate?.toFixed(1) || 0 }}%</span>
              <span class="stat-label">อัตราผ่าน</span>
            </div>
            <div class="stat-item avg">
              <span class="stat-value">{{ assessment.statistics.avgScorePerQuestion?.toFixed(2) || 0 }}</span>
              <span class="stat-label">คะแนนเฉลี่ย/ข้อ</span>
            </div>
          </div>

          <!-- Score Range -->
          <div class="score-range">
            <div class="range-item highest">
              <span class="range-icon">⬆️</span>
              <span class="range-label">คะแนนสูงสุด:</span>
              <span class="range-value">{{ assessment.statistics.highestScore?.score || 0 }}/{{ assessment.statistics.highestScore?.maxScore || 5 }}</span>
              <span class="range-question">({{ assessment.statistics.highestScore?.questionId }})</span>
            </div>
            <div class="range-item lowest">
              <span class="range-icon">⬇️</span>
              <span class="range-label">คะแนนต่ำสุด:</span>
              <span class="range-value">{{ assessment.statistics.lowestScore?.score || 0 }}/{{ assessment.statistics.lowestScore?.maxScore || 5 }}</span>
              <span class="range-question">({{ assessment.statistics.lowestScore?.questionId }})</span>
            </div>
          </div>

          <!-- Score Distribution -->
          <div class="score-distribution" v-if="assessment.statistics.scoreDistribution">
            <h4>📈 การกระจายคะแนน</h4>
            <div class="distribution-bars">
              <div class="dist-item excellent">
                <span class="dist-label">ดีมาก (80-100%)</span>
                <div class="dist-bar">
                  <div class="dist-fill" :style="{ width: getDistributionPercent('excellent') + '%' }"></div>
                </div>
                <span class="dist-count">{{ assessment.statistics.scoreDistribution.excellent?.count || 0 }} ข้อ</span>
              </div>
              <div class="dist-item good">
                <span class="dist-label">ดี (60-79%)</span>
                <div class="dist-bar">
                  <div class="dist-fill" :style="{ width: getDistributionPercent('good') + '%' }"></div>
                </div>
                <span class="dist-count">{{ assessment.statistics.scoreDistribution.good?.count || 0 }} ข้อ</span>
              </div>
              <div class="dist-item fair">
                <span class="dist-label">พอใช้ (40-59%)</span>
                <div class="dist-bar">
                  <div class="dist-fill" :style="{ width: getDistributionPercent('fair') + '%' }"></div>
                </div>
                <span class="dist-count">{{ assessment.statistics.scoreDistribution.fair?.count || 0 }} ข้อ</span>
              </div>
              <div class="dist-item needs-improvement">
                <span class="dist-label">ต้องปรับปรุง (0-39%)</span>
                <div class="dist-bar">
                  <div class="dist-fill" :style="{ width: getDistributionPercent('needImprovement') + '%' }"></div>
                </div>
                <span class="dist-count">{{ assessment.statistics.scoreDistribution.needImprovement?.count || 0 }} ข้อ</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 🔬 ARCE Analysis Section -->
      <section class="arce-analysis-section" v-if="assessment.arceAnalysis">
        <h2 class="section-title">🔬 การวิเคราะห์เชิงลึก ARCE</h2>
        <div class="arce-analysis-content">
          <!-- Dimension Comparison -->
          <div class="dimension-comparison">
            <div class="dimension-item strongest">
              <span class="dim-icon">💪</span>
              <span class="dim-label">ทักษะที่แข็งแกร่งที่สุด:</span>
              <span class="dim-value">{{ getArceLabelFull(assessment.arceAnalysis.strongestDimension?.name) }}</span>
              <span class="dim-score">({{ assessment.arceAnalysis.strongestDimension?.score || 0 }}/5)</span>
            </div>
            <div class="dimension-item weakest">
              <span class="dim-icon">📈</span>
              <span class="dim-label">ทักษะที่ควรพัฒนา:</span>
              <span class="dim-value">{{ getArceLabelFull(assessment.arceAnalysis.weakestDimension?.name) }}</span>
              <span class="dim-score">({{ assessment.arceAnalysis.weakestDimension?.score || 0 }}/5)</span>
            </div>
          </div>
          
          <!-- Dimension Comparison Text -->
          <div class="comparison-text" v-if="assessment.arceAnalysis.dimensionComparison">
            <p>{{ assessment.arceAnalysis.dimensionComparison }}</p>
          </div>
          
          <!-- Development Priority -->
          <div class="development-priority" v-if="assessment.arceAnalysis.developmentPriority?.length">
            <h4>🎯 ลำดับการพัฒนาที่แนะนำ:</h4>
            <ol>
              <li v-for="(priority, idx) in assessment.arceAnalysis.developmentPriority" :key="idx">
                {{ priority }}
              </li>
            </ol>
          </div>
        </div>
      </section>

      <!-- 🔬 Research Insights Section (Teacher Only) -->
      <section class="research-insights-section" v-if="assessment.researchInsights && isTeacherView">
        <h2 class="section-title">🔬 ข้อมูลเชิงวิจัย (Research Insights)</h2>
        <div class="research-insights-content">
          <!-- Learning Pattern -->
          <div class="insight-block pattern" v-if="assessment.researchInsights.learningPattern">
            <div class="insight-header">
              <span class="insight-icon">🧠</span>
              <h4>รูปแบบการเรียนรู้</h4>
            </div>
            <p>{{ assessment.researchInsights.learningPattern }}</p>
          </div>
          
          <!-- Cognitive Strengths -->
          <div class="insight-block cognitive" v-if="assessment.researchInsights.cognitiveStrengths?.length">
            <div class="insight-header">
              <span class="insight-icon">💡</span>
              <h4>จุดแข็งด้านการรับรู้</h4>
            </div>
            <ul>
              <li v-for="(strength, idx) in assessment.researchInsights.cognitiveStrengths" :key="idx">
                {{ strength }}
              </li>
            </ul>
          </div>
          
          <!-- Areas for Intervention -->
          <div class="insight-block intervention" v-if="assessment.researchInsights.areasForIntervention?.length">
            <div class="insight-header">
              <span class="insight-icon">🎯</span>
              <h4>ด้านที่ต้องการการช่วยเหลือ</h4>
            </div>
            <ul>
              <li v-for="(area, idx) in assessment.researchInsights.areasForIntervention" :key="idx">
                {{ area }}
              </li>
            </ul>
          </div>
          
          <!-- Recommended Strategies -->
          <div class="insight-block strategies" v-if="assessment.researchInsights.recommendedStrategies?.length">
            <div class="insight-header">
              <span class="insight-icon">📋</span>
              <h4>กลยุทธ์การสอนที่แนะนำ</h4>
            </div>
            <ul>
              <li v-for="(strategy, idx) in assessment.researchInsights.recommendedStrategies" :key="idx">
                {{ strategy }}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Next Steps (สิ่งที่ควรทำต่อไป) -->
      <section class="next-steps-section" v-if="assessment.nextSteps?.length">
        <h2 class="section-title">🚀 ขั้นตอนถัดไปในการพัฒนา</h2>
        <div class="next-steps-list">
          <div v-for="(step, idx) in assessment.nextSteps" :key="idx" class="next-step-item">
            <div class="step-number">{{ idx + 1 }}</div>
            <div class="step-content">
              <p>{{ step }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Recommendation (ข้อเสนอแนะจาก AI) -->
      <section class="recommendation-section" v-if="summary.recommendation">
        <h2 class="section-title">📌 คำแนะนำหลัก</h2>
        <div class="recommendation-card">
          <span class="recommendation-icon">💡</span>
          <p>{{ summary.recommendation }}</p>
        </div>
      </section>

      <!-- Suggestions -->
      <section class="suggestions-section" v-if="assessment.suggestions?.length">
        <h2 class="section-title">💡 ข้อเสนอแนะในการพัฒนา</h2>
        <div class="suggestions-list">
          <div v-for="(suggestion, idx) in assessment.suggestions" :key="idx" class="suggestion-item">
            <span class="suggestion-number">{{ idx + 1 }}</span>
            <p>{{ suggestion }}</p>
          </div>
        </div>
      </section>

      <!-- Teacher Notes (บันทึกสำหรับครู) - แสดงเฉพาะครู -->
      <section class="teacher-notes-section" v-if="assessment.teacherNotes && isTeacherView">
        <h2 class="section-title">📋 บันทึกสำหรับครู</h2>
        <div class="teacher-notes-card">
          <span class="material-icons">school</span>
          <p>{{ assessment.teacherNotes }}</p>
        </div>
      </section>

      <!-- Question Results -->
      <section class="questions-section">
        <h2 class="section-title">📝 รายละเอียดคำตอบแต่ละข้อ</h2>
        
        <div class="questions-summary">
          <div class="qs-stat">
            <span class="qs-number">{{ questionStats.total }}</span>
            <span class="qs-label">ข้อทั้งหมด</span>
          </div>
          <div class="qs-stat correct">
            <span class="qs-number">{{ questionStats.correct }}</span>
            <span class="qs-label">ตอบถูก/ดี</span>
          </div>
          <div class="qs-stat partial">
            <span class="qs-number">{{ questionStats.partial }}</span>
            <span class="qs-label">ตอบได้บางส่วน</span>
          </div>
          <div class="qs-stat incorrect">
            <span class="qs-number">{{ questionStats.incorrect }}</span>
            <span class="qs-label">ต้องปรับปรุง</span>
          </div>
        </div>
        
        <div class="questions-list" v-if="assessment?.questionResults?.length">
          <div v-for="(result, idx) in assessment?.questionResults" :key="idx" 
               class="question-result-card" :class="[getQuestionClass(result), { 'arce-situation-result': result?.type === 'arce_situation' }]">
            <div class="question-header">
              <div class="question-number">ข้อ {{ idx + 1 }}</div>
              <div class="question-type-badge" v-if="result?.type === 'arce_situation'">🎯 ARCE วัดผล</div>
              <div class="question-score" :class="getScoreClass(result)">
                {{ result?.score || result?.totalScore || 0 }} / {{ result?.maxScore || 5 }} คะแนน
                <span class="score-percent">({{ ((((result?.score || result?.totalScore || 0)) / (result?.maxScore || 5)) * 100).toFixed(0) }}%)</span>
              </div>
            </div>
            
            <!-- ARCE Situation Special Display -->
            <template v-if="result?.type === 'arce_situation'">
              <div class="arce-situation-content">
                <div v-if="result?.situation || result?.context" class="situation-display">
                  <label>📋 สถานการณ์:</label>
                  <p>{{ result?.situation || result?.context }}</p>
                </div>
                <div class="question-display">
                  <label>❓ คำถาม:</label>
                  <p>{{ result?.prompt || result?.question || result?.task || '-' }}</p>
                </div>
              </div>
              
              <!-- ARCE Breakdown for Situation Type -->
              <div class="arce-breakdown-detailed" v-if="result?.arceBreakdown">
                <h4>📊 คะแนนแยกตามมิติ ARCE</h4>
                <div class="arce-breakdown-grid">
                  <div class="arce-breakdown-item analysis">
                    <div class="arce-breakdown-header">
                      <span class="icon">🔍</span>
                      <span class="label">Analysis</span>
                      <span class="score">{{ result?.arceBreakdown?.analysis?.score || 0 }}/5</span>
                    </div>
                    <p class="arce-feedback">{{ result?.arceBreakdown?.analysis?.feedback || '-' }}</p>
                  </div>
                  <div class="arce-breakdown-item reasoning">
                    <div class="arce-breakdown-header">
                      <span class="icon">🧠</span>
                      <span class="label">Reasoning</span>
                      <span class="score">{{ result?.arceBreakdown?.reasoning?.score || 0 }}/5</span>
                    </div>
                    <p class="arce-feedback">{{ result?.arceBreakdown?.reasoning?.feedback || '-' }}</p>
                  </div>
                  <div class="arce-breakdown-item creativity">
                    <div class="arce-breakdown-header">
                      <span class="icon">💡</span>
                      <span class="label">Creativity</span>
                      <span class="score">{{ result?.arceBreakdown?.creativity?.score || 0 }}/5</span>
                    </div>
                    <p class="arce-feedback">{{ result?.arceBreakdown?.creativity?.feedback || '-' }}</p>
                  </div>
                  <div class="arce-breakdown-item evidence">
                    <div class="arce-breakdown-header">
                      <span class="icon">📚</span>
                      <span class="label">Evidence</span>
                      <span class="score">{{ result?.arceBreakdown?.evidence?.score || 0 }}/5</span>
                    </div>
                    <p class="arce-feedback">{{ result?.arceBreakdown?.evidence?.feedback || '-' }}</p>
                  </div>
                </div>
              </div>
            </template>
            
            <!-- Regular Question Display -->
            <template v-else>
              <div class="question-content">
                <!-- Situation if exists -->
                <div v-if="result?.situation || result?.context" class="situation-display">
                  <label>📋 สถานการณ์:</label>
                  <p>{{ result?.situation || result?.context }}</p>
                </div>
                <!-- Question/Prompt -->
                <div class="question-display">
                  <label>❓ คำถาม:</label>
                  <p class="question-prompt">{{ result?.prompt || result?.question || '-' }}</p>
                </div>
                <div class="question-meta">
                  <span class="phase-tag">{{ getPhaseLabel(result?.phase) }}</span>
                  <span class="bloom-tag">{{ getBloomLabel(result?.bloomLevel) }}</span>
                  <span v-for="arce in (Array.isArray(result?.arceFocus) ? result?.arceFocus : [result?.arceFocus])" 
                        :key="arce" :class="['arce-tag', arce]">
                    {{ getArceIcon(arce) }} {{ getArceLabel(arce) }}
                  </span>
                </div>
              </div>
            </template>

            <div class="answer-comparison">
              <div class="answer-block student-answer">
                <label>📝 คำตอบของนักเรียน:</label>
                <div class="answer-content">
                  <template v-if="typeof result?.studentAnswer === 'object'">
                    <!-- Special display for ARCE structured answer -->
                    <div v-if="result?.studentAnswer?.type === 'arce_structured'" class="arce-structured-answer">
                      <div v-if="result.studentAnswer?.analysis" class="arce-answer-section">
                        <strong>🔍 การวิเคราะห์:</strong>
                        <p>{{ result.studentAnswer?.analysis }}</p>
                      </div>
                      <div v-if="result.studentAnswer?.reasoning" class="arce-answer-section">
                        <strong>🧠 การให้เหตุผล:</strong>
                        <p>{{ result.studentAnswer?.reasoning }}</p>
                      </div>
                      <div v-if="result.studentAnswer?.creativity" class="arce-answer-section">
                        <strong>💡 ความคิดสร้างสรรค์:</strong>
                        <p>{{ result.studentAnswer?.creativity }}</p>
                      </div>
                      <div v-if="result.studentAnswer?.evidence" class="arce-answer-section">
                        <strong>📚 หลักฐาน:</strong>
                        <p>{{ result.studentAnswer?.evidence }}</p>
                      </div>
                    </div>
                    <pre v-else>{{ JSON.stringify(result?.studentAnswer, null, 2) }}</pre>
                  </template>
                  <template v-else>
                    {{ result?.studentAnswer || '(ไม่ได้ตอบ)' }}
                  </template>
                </div>
                <div class="char-count" v-if="typeof result?.studentAnswer === 'string'">
                  ความยาว: {{ result?.studentAnswer?.length || 0 }} ตัวอักษร
                </div>
              </div>
              
              <div class="feedback-block" v-if="result?.feedback">
                <label>💬 ผลการประเมินและข้อเสนอแนะ:</label>
                <div class="feedback-content">{{ result?.feedback }}</div>
              </div>

              <!-- Per-question Suggestion -->
              <div class="suggestion-block" v-if="result?.suggestion">
                <label>💡 คำแนะนำเฉพาะข้อนี้:</label>
                <div class="suggestion-content">{{ result?.suggestion }}</div>
              </div>

              <div class="rubric-block" v-if="result?.rubricLevel">
                <label>📊 ระดับตาม Rubric:</label>
                <div class="rubric-level" :class="'level-' + result?.rubricLevel">
                  ระดับ {{ result?.rubricLevel }}: {{ result?.rubricDescription || '' }}
                </div>
              </div>
            </div>

            <div class="arce-breakdown" v-if="result?.arceScores && result?.type !== 'arce_situation'">
              <label>คะแนน A.R.C.E. ของข้อนี้:</label>
              <div class="mini-arce-scores">
                <template v-for="key in arceOrder" :key="key">
                  <span v-if="result?.arceScores?.[key] !== undefined" :class="['mini-score', key]">
                    {{ getArceIcon(key) }} {{ typeof result.arceScores[key] === 'object' ? result.arceScores[key]?.raw : result.arceScores[key] }}/5
                  </span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Learning Outcomes -->
      <section class="lo-section" v-if="assessment.learningOutcomes?.length">
        <h2 class="section-title">🎯 ผลลัพธ์การเรียนรู้ (LO)</h2>
        <div class="lo-cards">
          <div v-for="lo in assessment.learningOutcomes" :key="lo.code" 
               class="lo-card" :class="{ achieved: lo.achieved }">
            <div class="lo-status">
              <span class="material-icons">{{ lo.achieved ? 'check_circle' : 'radio_button_unchecked' }}</span>
            </div>
            <div class="lo-info">
              <h4>{{ lo.code }}</h4>
              <p>{{ lo.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Overall Feedback -->
      <section class="overall-section" v-if="assessment.overallFeedback">
        <h2 class="section-title">📋 สรุปผลการประเมินภาพรวม</h2>
        <div class="overall-card">
          <p>{{ assessment.overallFeedback }}</p>
        </div>
      </section>

      <!-- Retry Info Banner -->
      <section v-if="retryInfo.hasRetrySettings" class="retry-info-section">
        <div class="retry-info-card">
          <div class="retry-header">
            <span class="material-icons">history</span>
            <h3>ข้อมูลการทำซ้ำ</h3>
          </div>
          <div class="retry-stats">
            <div class="retry-stat">
              <span class="stat-value">{{ retryInfo.attemptNumber || 1 }}</span>
              <span class="stat-label">ครั้งที่ทำ</span>
            </div>
            <div class="retry-stat" v-if="retryInfo.maxAttempts">
              <span class="stat-value">{{ retryInfo.maxAttempts - (retryInfo.attemptNumber || 1) }}</span>
              <span class="stat-label">เหลืออีก</span>
            </div>
            <div class="retry-stat" v-if="retryInfo.scoreMode">
              <span class="stat-badge">
                {{ retryInfo.scoreMode === 'best' ? '🏆 เก็บคะแนนดีที่สุด' : 
                   retryInfo.scoreMode === 'latest' ? '📝 เก็บคะแนนล่าสุด' :
                   retryInfo.scoreMode === 'average' ? '📊 เก็บค่าเฉลี่ย' : '1️⃣ เก็บครั้งแรก' }}
              </span>
            </div>
          </div>
          <router-link :to="`/worksheet-history/${worksheetId}`" class="btn btn-outline btn-sm">
            <span class="material-icons">timeline</span>
            ดูประวัติทั้งหมด
          </router-link>
        </div>
      </section>

      <!-- Actions -->
      <section class="actions-section">
        <router-link :to="backRoute" class="btn btn-outline">
          <span class="material-icons">arrow_back</span>
          กลับห้องกิจกรรม
        </router-link>
        <router-link :to="`/worksheet-history/${worksheetId}`" class="btn btn-outline">
          <span class="material-icons">timeline</span>
          ดูประวัติการทำ
        </router-link>
        <button class="btn btn-primary" @click="retryWorksheet" v-if="canRetry">
          <span class="material-icons">refresh</span>
          ทำใหม่อีกครั้ง
        </button>
      </section>
    </div>

    <!-- Not Found -->
    <div v-else class="error-container">
      <span class="material-icons">error_outline</span>
      <p>ไม่พบผลการประเมินที่ต้องการ</p>
      <router-link to="/student" class="btn btn-primary">กลับหน้าหลัก</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase/config'
import { doc, getDoc } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import RadarChart from '@/components/RadarChart.vue'

// Mode-specific Report Components
import ModeAReport from '@/components/worksheet/ModeAReport.vue'
import ModeBReport from '@/components/worksheet/ModeBReport.vue'
import ModeCReport from '@/components/worksheet/ModeCReport.vue'
import ModeDReport from '@/components/worksheet/ModeDReport.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// ARCE Order constant (A → R → C → E)
const arceOrder = ['analysis', 'reasoning', 'creativity', 'evidence']

// State
const loading = ref(true)
const submission = ref(null)
const worksheet = ref(null)

// Computed
const assessment = computed(() => submission.value?.assessment || {})
const summary = computed(() => assessment.value?.summary || {})

// Student Info
const studentInfo = computed(() => {
  const data = submission.value?.studentData || {}
  const user = authStore.userProfile || authStore.user || {}
  return {
    displayName: data.displayName || user.displayName || 'นักเรียน',
    studentId: data.studentId || data.studentNumber || user.studentId || '-',
    grade: data.grade || user.grade || '-',
    room: data.room || user.room || '-',
    number: data.number || user.number || '-',
    section: data.section || user.section || '',
    photoURL: user.photoURL || null,
    initials: (data.displayName || user.displayName || 'N')[0].toUpperCase()
  }
})

// Question Statistics
const questionStats = computed(() => {
  const results = assessment.value?.questionResults || []
  const total = results.length
  let correct = 0, partial = 0, incorrect = 0
  
  results.forEach(r => {
    const pct = (r.score / (r.maxScore || 5)) * 100
    if (pct >= 80) correct++
    else if (pct >= 40) partial++
    else incorrect++
  })
  
  return { total, correct, partial, incorrect }
})

// Bloom's Taxonomy Levels
const bloomLevels = computed(() => {
  const results = assessment.value?.questionResults || []
  const arceScores = assessment.value?.arceScores || {}
  
  // Calculate achieved levels based on ARCE scores
  const avgAnalysis = getArceRaw(arceScores?.analysis)
  const avgReasoning = getArceRaw(arceScores?.reasoning)
  const avgCreativity = getArceRaw(arceScores?.creativity)
  const avgEvidence = getArceRaw(arceScores?.evidence)
  
  return [
    { key: 'remember', icon: '📚', label: 'จำ (Remember)', description: 'ระลึก ทบทวน จดจำข้อมูล', achieved: true },
    { key: 'understand', icon: '💡', label: 'เข้าใจ (Understand)', description: 'อธิบาย ตีความ สรุปความ', achieved: avgReasoning >= 2 },
    { key: 'apply', icon: '🔧', label: 'ประยุกต์ (Apply)', description: 'นำไปใช้ ปฏิบัติ แก้ปัญหา', achieved: avgEvidence >= 2 },
    { key: 'analyze', icon: '🔍', label: 'วิเคราะห์ (Analyze)', description: 'แยกแยะ จำแนก เปรียบเทียบ', achieved: avgAnalysis >= 3 },
    { key: 'evaluate', icon: '⚖️', label: 'ประเมิน (Evaluate)', description: 'ตัดสิน วิจารณ์ ให้เหตุผล', achieved: avgReasoning >= 3 && avgAnalysis >= 3 },
    { key: 'create', icon: '🎨', label: 'สร้างสรรค์ (Create)', description: 'ออกแบบ สร้าง คิดค้นใหม่', achieved: avgCreativity >= 3 }
  ]
})

const cognitiveLevel = computed(() => {
  const levels = bloomLevels.value
  const achieved = levels.filter(l => l.achieved)
  if (achieved.length >= 6) return 'สร้างสรรค์ (Create) - ระดับสูงสุด'
  if (achieved.length >= 5) return 'ประเมิน (Evaluate) - ระดับสูง'
  if (achieved.length >= 4) return 'วิเคราะห์ (Analyze) - ระดับกลาง-สูง'
  if (achieved.length >= 3) return 'ประยุกต์ (Apply) - ระดับกลาง'
  if (achieved.length >= 2) return 'เข้าใจ (Understand) - ระดับพื้นฐาน'
  return 'จำ (Remember) - ระดับเริ่มต้น'
})

const cognitiveFeedback = computed(() => {
  const levels = bloomLevels.value
  const achieved = levels.filter(l => l.achieved).length
  if (achieved >= 5) return 'ยอดเยี่ยม! คุณแสดงทักษะการคิดขั้นสูงได้อย่างดี สามารถวิเคราะห์ ประเมิน และสร้างสรรค์ได้'
  if (achieved >= 4) return 'ดีมาก! คุณแสดงความสามารถในการวิเคราะห์ได้ดี ควรฝึกฝนการประเมินและสร้างสรรค์เพิ่มเติม'
  if (achieved >= 3) return 'ดี! คุณสามารถนำความรู้ไปประยุกต์ใช้ได้ ควรพัฒนาทักษะการวิเคราะห์เพิ่มเติม'
  if (achieved >= 2) return 'พอใช้ คุณเข้าใจเนื้อหาได้ดี ควรฝึกฝนการนำไปประยุกต์ใช้มากขึ้น'
  return 'ควรทบทวนเนื้อหาและฝึกฝนทักษะการคิดวิเคราะห์เพิ่มเติม'
})

const backRoute = computed(() => {
  if (submission.value?.roomId) return `/learning-room/${submission.value.roomId}`
  return '/student'
})

// Check if teacher is viewing this result
const isTeacherView = computed(() => {
  return authStore.userProfile?.role === 'teacher' || route.query.teacher === 'true'
})

const scoreClass = computed(() => {
  const pct = summary.value?.percentage || 0
  if (pct >= 80) return 'excellent'
  if (pct >= 60) return 'good'
  if (pct >= 40) return 'fair'
  return 'poor'
})

const paClass = computed(() => {
  const level = summary.value?.paLevel || 0
  if (level >= 4) return 'pa4'
  if (level >= 3) return 'pa3'
  if (level >= 2) return 'pa2'
  return 'pa1'
})

// Learning Outcomes computed properties
const loAssessment = computed(() => {
  // Check both locations where LO assessment could be stored
  return submission.value?.loAssessment || 
         submission.value?.assessment?.loAssessment || 
         null
})

const worksheetLOs = computed(() => {
  return worksheet.value?.metadata?.learningOutcomes || []
})

const totalLOs = computed(() => {
  return worksheetLOs.value?.length || 0
})

const loPercentage = computed(() => {
  if (!totalLOs.value) return 0
  const passed = loAssessment.value?.passedLOs?.length || 0
  return Math.round((passed / totalLOs.value) * 100)
})

// 🆕 Multi-Agent computed properties
const isMultiAgentMode = computed(() => {
  return assessment.value?.assessmentMode === 'multi-agent'
})

const agentDetails = computed(() => {
  return assessment.value?.agentDetails || null
})

const multiAgentMetadata = computed(() => {
  return assessment.value?.multiAgentMetadata || null
})

const specialistAgents = computed(() => {
  if (!agentDetails.value) return []
  
  const agents = [
    { key: 'analysis', number: 1, icon: '🔍', name: 'Analysis Expert' },
    { key: 'reasoning', number: 2, icon: '🧠', name: 'Reasoning Expert' },
    { key: 'creativity', number: 3, icon: '💡', name: 'Creativity Expert' },
    { key: 'evidence', number: 4, icon: '📚', name: 'Evidence Expert' }
  ]
  
  return agents.map(a => ({
    ...a,
    score: agentDetails.value[a.key]?.score || 0,
    confidence: agentDetails.value[a.key]?.confidence || 0,
    feedback: agentDetails.value[a.key]?.microFeedback || '',
    chainOfThought: agentDetails.value[a.key]?.chainOfThought || ''
  }))
})

const adversarialChallenges = computed(() => {
  return agentDetails.value?.adversarial?.challenges || []
})

const adversarialBiasDetected = computed(() => {
  return agentDetails.value?.adversarial?.biasDetected || []
})

function getConfidencePercent(confidence) {
  if (!confidence) return 0
  return confidence > 1 ? Math.round(confidence) : Math.round(confidence * 100)
}

function getConsensusLabel(level) {
  const labels = {
    high: '✅ สูง',
    moderate: '📊 ปานกลาง',
    low: '⚠️ ต่ำ'
  }
  return labels[level] || level || 'ไม่ระบุ'
}

function isLOPassed(loCode) {
  return loAssessment.value?.passedLOs?.includes(loCode) || false
}

const hasRadarData = computed(() => {
  return assessment.value?.arceScores && Object.keys(assessment.value?.arceScores || {}).length > 0
})

const radarValues = computed(() => {
  if (!assessment.value?.arceScores) return { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
  const scores = assessment.value.arceScores
  return {
    analysis: getArceRawValue(scores?.analysis) || 0,
    reasoning: getArceRawValue(scores?.reasoning) || 0,
    creativity: getArceRawValue(scores?.creativity) || 0,
    evidence: getArceRawValue(scores?.evidence) || 0
  }
})

const radarData = computed(() => {
  if (!assessment.value?.arceScores) return null
  const scores = assessment.value.arceScores
  return {
    labels: ['วิเคราะห์', 'เหตุผล', 'สร้างสรรค์', 'หลักฐาน'],
    datasets: [{
      label: 'คะแนน A.R.C.E.',
      data: [
        getArceRawValue(scores?.analysis) || 0,
        getArceRawValue(scores?.reasoning) || 0,
        getArceRawValue(scores?.creativity) || 0,
        getArceRawValue(scores?.evidence) || 0
      ],
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
      borderColor: '#6366f1',
      borderWidth: 2
    }]
  }
})

// Worksheet ID from route
const worksheetId = computed(() => route.params.id)

// Retry Info
const retryInfo = computed(() => {
  const retrySettings = worksheet.value?.retrySettings || submission.value?.retrySettings
  return {
    hasRetrySettings: !!retrySettings?.allowRetry,
    allowRetry: retrySettings?.allowRetry || false,
    maxAttempts: retrySettings?.maxAttempts || null,
    scoreMode: retrySettings?.scoreMode || 'best',
    attemptNumber: submission.value?.attemptNumber || 1,
    cooldownMinutes: retrySettings?.cooldownMinutes || 0
  }
})

const canRetry = computed(() => {
  // Check if retry is allowed in settings
  const retrySettings = worksheet.value?.retrySettings
  if (!retrySettings?.allowRetry) {
    // Fallback to old allowRetry flag
    return worksheet.value?.allowRetry && (summary.value?.percentage || 0) < 80
  }
  
  // Check max attempts
  if (retrySettings.maxAttempts) {
    const currentAttempt = submission.value?.attemptNumber || 1
    if (currentAttempt >= retrySettings.maxAttempts) return false
  }
  
  // Check cooldown (simplified - actual check is in WorksheetForm)
  return true
})

// Methods
function getArceIcon(arce) {
  const icons = { analysis: '🔍', reasoning: '🧠', creativity: '💡', evidence: '📚' }
  return icons[arce] || '📝'
}

function getArceLabel(arce) {
  const labels = { analysis: 'วิเคราะห์', reasoning: 'เหตุผล', creativity: 'สร้างสรรค์', evidence: 'หลักฐาน' }
  return labels[arce] || arce
}

// Helper to extract raw score from arce score (handles both object and number format)
function getArceRaw(score) {
  if (score === null || score === undefined) return 0
  if (typeof score === 'object') return score.raw || 0
  return score
}

function getArceFeedback(score) {
  if (typeof score === 'object' && score.feedback) return score.feedback
  return null
}

function getArceRawValue(score) {
  return getArceRaw(score)
}

function getPhaseLabel(phase) {
  const labels = {
    engagement: '🎯 Engagement',
    exploration: '🔬 Exploration',
    explanation: '📖 Explanation',
    elaboration: '🚀 Elaboration',
    evaluation: '📊 Evaluation'
  }
  return labels[phase] || phase
}

function getBloomLabel(level) {
  const labels = {
    remember: '📚 จำ',
    understand: '💡 เข้าใจ',
    apply: '🔧 ประยุกต์',
    analyze: '🔍 วิเคราะห์',
    evaluate: '⚖️ ประเมิน',
    create: '🎨 สร้างสรรค์'
  }
  return labels[level] || level || ''
}

function getQuestionClass(result) {
  const score = result.score || result.totalScore || 0
  const pct = (score / (result.maxScore || 5)) * 100
  if (pct >= 80) return 'excellent'
  if (pct >= 60) return 'good'
  if (pct >= 40) return 'fair'
  return 'poor'
}

function getScoreClass(result) {
  const score = result.score || result.totalScore || 0
  const pct = (score / (result.maxScore || 5)) * 100
  if (pct >= 80) return 'pass'
  if (pct >= 60) return 'good'
  if (pct >= 40) return 'partial'
  return 'fail'
}

function formatDuration(seconds) {
  if (!seconds) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')} นาที`
}

function formatDate(timestamp) {
  if (!timestamp) return '-'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 📊 Statistics helper functions
function getDistributionPercent(category) {
  const stats = assessment.value?.statistics
  if (!stats?.scoreDistribution) return 0
  const total = stats.totalQuestions || 1
  const count = stats.scoreDistribution[category]?.count || 0
  return Math.round((count / total) * 100)
}

function getArceLabelFull(key) {
  const labels = {
    analysis: 'การวิเคราะห์ (Analysis)',
    reasoning: 'การให้เหตุผล (Reasoning)',
    creativity: 'ความคิดสร้างสรรค์ (Creativity)',
    evidence: 'การใช้หลักฐาน (Evidence)'
  }
  return labels[key] || key || '-'
}

// 🏷️ Assessment Mode Helper Functions
function getAssessmentModeIcon(mode) {
  const icons = {
    'single': '⚡',
    'batch': '📦',
    'per-question': '🔍',
    'multi-agent-worksheet': '🤖×6',
    'multi-agent': '🤖×6',
    'multi-agent-per-question': '🤖×6×N'
  }
  return icons[mode] || '⚡'
}

function getAssessmentModeName(mode) {
  const names = {
    'single': 'โหมด A: Single Call',
    'batch': 'โหมด B: Batch Assessment',
    'per-question': 'โหมด C: Per-Question',
    'multi-agent-worksheet': 'Multi-Agent',
    'multi-agent': 'Multi-Agent',
    'multi-agent-per-question': 'Multi-Agent Per-Question'
  }
  return names[mode] || 'Single Call'
}

function getAssessmentModeShort(mode) {
  const shorts = {
    'single': 'A',
    'batch': 'B',
    'per-question': 'C',
    'multi-agent-worksheet': 'MA',
    'multi-agent': 'MA',
    'multi-agent-per-question': 'MA×N'
  }
  return shorts[mode] || 'A'
}

function getAssessmentModeDesc(mode) {
  const descs = {
    'single': 'AI 1 ตัวประเมินทั้งใบงาน - เร็วและประหยัด',
    'batch': 'แบ่งกลุ่มละ 5 ข้อ + Summary Agent - สมดุลความแม่นยำและต้นทุน',
    'per-question': 'ประเมินแยกทีละข้อ + Summary Agent - แม่นยำสูง',
    'multi-agent-worksheet': '6 AI Experts ประเมินทุกข้อ + Consensus - ระดับงานวิจัย',
    'multi-agent': '6 AI Experts ประเมินทุกข้อ + Consensus - ระดับงานวิจัย',
    'multi-agent-per-question': '6 AI Experts × แต่ละข้อ + Summary - ระดับงานวิจัยสูงสุด'
  }
  return descs[mode] || 'AI 1 ตัวประเมินทั้งใบงาน'
}

function downloadReport() {
  const info = studentInfo.value
  const reportData = {
    title: worksheet.value?.metadata?.title,
    courseName: worksheet.value?.metadata?.courseName,
    gradeLevel: worksheet.value?.metadata?.gradeLevel,
    student: info.displayName,
    studentId: info.studentId,
    grade: info.grade,
    room: info.room,
    number: info.number,
    section: info.section,
    submittedAt: formatDate(submission.value?.submittedAt),
    timeSpent: formatDuration(submission.value?.timeSpent),
    summary: summary.value,
    arceScores: assessment.value?.arceScores,
    strengths: assessment.value?.strengths,
    weaknesses: assessment.value?.weaknesses,
    suggestions: assessment.value?.suggestions,
    questionResults: assessment.value?.questionResults,
    statistics: assessment.value?.statistics,
    arceAnalysis: assessment.value?.arceAnalysis,
    researchInsights: assessment.value?.researchInsights
  }
  
  const BOM = '\uFEFF'
  let csvContent = BOM
  csvContent += '=== รายงานผลการประเมินใบงาน ===\n\n'
  
  // ข้อมูลใบงาน
  csvContent += '📚 ข้อมูลใบงาน\n'
  csvContent += `ชื่อใบงาน,${reportData.title}\n`
  csvContent += `รายวิชา,${reportData.courseName}\n`
  csvContent += `ระดับชั้น,${reportData.gradeLevel}\n\n`
  
  // ข้อมูลนักเรียน
  csvContent += '👤 ข้อมูลนักเรียน\n'
  csvContent += `ชื่อ-นามสกุล,${reportData.student}\n`
  csvContent += `รหัสนักเรียน,${reportData.studentId}\n`
  csvContent += `ชั้น,${reportData.grade}\n`
  csvContent += `ห้อง,${reportData.room}\n`
  csvContent += `เลขที่,${reportData.number}\n`
  if (reportData.section) csvContent += `ตอน,${reportData.section}\n`
  csvContent += `วันที่ส่ง,${reportData.submittedAt}\n`
  csvContent += `เวลาที่ใช้,${reportData.timeSpent}\n\n`
  
  // สรุปคะแนน
  csvContent += '📊 สรุปผลคะแนน\n'
  csvContent += `คะแนนรวม,${reportData.summary?.totalScore}/${reportData.summary?.maxScore}\n`
  csvContent += `เปอร์เซ็นต์,${reportData.summary?.percentage?.toFixed(1)}%\n`
  csvContent += `ระดับ PA,${reportData.summary?.paLevelText}\n\n`
  
  // คะแนน ARCE
  csvContent += '🎯 คะแนน A.R.C.E.\n'
  csvContent += `วิเคราะห์ (Analysis),${getArceRaw(reportData.arceScores?.analysis)}/5\n`
  csvContent += `เหตุผล (Reasoning),${getArceRaw(reportData.arceScores?.reasoning)}/5\n`
  csvContent += `สร้างสรรค์ (Creativity),${getArceRaw(reportData.arceScores?.creativity)}/5\n`
  csvContent += `หลักฐาน (Evidence),${getArceRaw(reportData.arceScores?.evidence)}/5\n\n`
  
  // ระดับปัญญา
  csvContent += '🧠 ระดับปัญญา (Bloom\'s Taxonomy)\n'
  csvContent += `ระดับที่แสดงออก,${cognitiveLevel.value}\n`
  csvContent += `ข้อเสนอแนะ,${cognitiveFeedback.value}\n\n`
  
  // จุดเด่น
  csvContent += '✅ จุดเด่น\n'
  reportData.strengths?.forEach((s, i) => {
    csvContent += `${i + 1}. ${s}\n`
  })
  csvContent += '\n'
  
  // จุดที่ควรพัฒนา
  csvContent += '💡 จุดที่ควรพัฒนา\n'
  reportData.weaknesses?.forEach((w, i) => {
    csvContent += `${i + 1}. ${w}\n`
  })
  csvContent += '\n'
  
  // ข้อเสนอแนะ
  csvContent += '📝 ข้อเสนอแนะในการพัฒนา\n'
  reportData.suggestions?.forEach((s, i) => {
    csvContent += `${i + 1}. ${s}\n`
  })
  csvContent += '\n'
  
  // รายละเอียดแต่ละข้อ
  csvContent += '📋 รายละเอียดคำตอบแต่ละข้อ\n'
  csvContent += 'ข้อ,คำถาม,คำตอบ,คะแนน,ผลประเมิน\n'
  reportData.questionResults?.forEach((r, i) => {
    const answer = typeof r.studentAnswer === 'object' ? JSON.stringify(r.studentAnswer) : r.studentAnswer
    csvContent += `${i + 1},"${r.question}","${answer?.replace(/"/g, '""') || '-'}",${r.score}/${r.maxScore},"${r.feedback?.replace(/"/g, '""') || '-'}"\n`
  })
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `รายงานผล-${info.studentId}-${reportData.title}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function retryWorksheet() {
  if (submission.value?.worksheetId) {
    router.push(`/worksheet/${submission.value.worksheetId}?retry=true`)
  }
}

async function loadResult() {
  try {
    loading.value = true
    const submissionId = route.params.id
    
    // Load submission
    const subDoc = await getDoc(doc(db, 'worksheetSubmissions', submissionId))
    if (subDoc.exists()) {
      submission.value = { id: subDoc.id, ...subDoc.data() }
      
      // Load worksheet
      if (submission.value.worksheetId) {
        const wsDoc = await getDoc(doc(db, 'eWorksheets', submission.value.worksheetId))
        if (wsDoc.exists()) {
          worksheet.value = { id: wsDoc.id, ...wsDoc.data() }
        }
      }
    }
  } catch (error) {
    console.error('Error loading result:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadResult()
})
</script>

<style scoped>
.worksheet-result-view {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* 🎨 Mode-Specific Report Section */
.mode-specific-report {
  margin-bottom: 2rem;
}

.mode-specific-report .section-title {
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Navbar */
.top-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.back-link:hover {
  background: var(--bg-primary);
  color: var(--primary);
}

.brand-icon {
  font-size: 1.5rem;
}

.brand-text {
  font-size: 1rem;
  font-weight: 600;
}

/* Loading & Error */
.loading-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1rem;
}

.error-container .material-icons {
  font-size: 4rem;
  color: var(--text-secondary);
}

/* Result Container */
.result-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

/* Section Title */
.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

/* Student Info Section */
.student-info-section {
  margin-bottom: 2rem;
}

.student-info-card {
  background: linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  gap: 1.5rem;
  align-items: center;
  color: white;
}

.student-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(255,255,255,0.3);
  flex-shrink: 0;
}

.student-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.2);
  font-size: 2rem;
  font-weight: 700;
}

.student-details h2 {
  margin-bottom: 0.75rem;
  font-size: 1.5rem;
}

.student-details .info-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.student-details .info-item {
  display: flex;
  flex-direction: column;
  background: rgba(255,255,255,0.1);
  padding: 0.5rem 1rem;
  border-radius: 8px;
}

.student-details .info-item .label {
  font-size: 0.7rem;
  opacity: 0.8;
}

.student-details .info-item .value {
  font-weight: 600;
  font-size: 1rem;
}

/* Summary Section */
.summary-section {
  margin-bottom: 2rem;
}

.summary-card {
  background: var(--bg-secondary);
  border-radius: 20px;
  padding: 2rem;
  display: flex;
  gap: 2rem;
  border: 1px solid var(--border-color);
}

.course-info {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.breakdown-item.highlight {
  background: var(--primary);
  color: white;
  padding: 0.75rem;
  border-radius: 8px;
}

.breakdown-item .value.big {
  font-size: 1.5rem;
  font-weight: 700;
}

/* Learning Outcomes Section */
.lo-section {
  margin-bottom: 2rem;
}

.lo-content {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
}

.lo-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.lo-stat {
  text-align: center;
  padding: 1rem;
  border-radius: 12px;
  background: var(--bg-primary);
}

.lo-stat.passed {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.lo-stat.total {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(79, 70, 229, 0.1));
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.lo-stat.percentage {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1));
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.lo-number {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
}

.lo-label {
  display: block;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.lo-list {
  margin-bottom: 1.5rem;
}

.lo-list h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.lo-list h4 .material-icons {
  font-size: 1.2rem;
}

.lo-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lo-tag {
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.lo-tag.passed {
  background: linear-gradient(135deg, #10B981, #059669);
  color: white;
}

.lo-tag.pending {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.lo-details {
  list-style: none;
  padding: 0;
  margin: 0;
}

.lo-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.lo-item.passed {
  background: rgba(16, 185, 129, 0.05);
  border-color: rgba(16, 185, 129, 0.3);
}

.lo-code {
  font-weight: 600;
  color: var(--color-primary);
  min-width: 60px;
}

.lo-desc {
  flex: 1;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.lo-status .material-icons {
  font-size: 1.25rem;
}

.lo-status .material-icons.passed {
  color: #10B981;
}

.lo-status .material-icons.pending {
  color: var(--text-muted);
}

.lo-analysis {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid var(--border-color);
}

.lo-analysis h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.lo-analysis p {
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

/* Cognitive Section */
.cognitive-section {
  margin-bottom: 2rem;
}

.cognitive-analysis {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
}

.bloom-levels {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.bloom-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--bg-primary);
  border-radius: 10px;
  opacity: 0.5;
  transition: all 0.3s;
}

.bloom-item.active {
  opacity: 1;
  border-left: 4px solid var(--primary);
}

.bloom-icon {
  font-size: 1.5rem;
}

.bloom-info {
  flex: 1;
}

.bloom-info h4 {
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.bloom-info p {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.bloom-status .material-icons {
  color: var(--text-secondary);
}

.bloom-item.active .bloom-status .material-icons {
  color: #10b981;
}

.cognitive-summary {
  background: var(--bg-primary);
  padding: 1rem;
  border-radius: 10px;
}

.cognitive-summary p {
  margin-bottom: 0.5rem;
}

.cognitive-feedback {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* Questions Section */
.questions-summary {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.qs-stat {
  flex: 1;
  min-width: 100px;
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  border: 1px solid var(--border-color);
}

.qs-stat .qs-number {
  display: block;
  font-size: 2rem;
  font-weight: 700;
}

.qs-stat .qs-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.qs-stat.correct .qs-number { color: #10b981; }
.qs-stat.partial .qs-number { color: #f59e0b; }
.qs-stat.incorrect .qs-number { color: #ef4444; }

.question-result-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  border: 1px solid var(--border-color);
  border-left: 4px solid var(--border-color);
}

.question-result-card.excellent { border-left-color: #10b981; }
.question-result-card.good { border-left-color: #3b82f6; }
.question-result-card.fair { border-left-color: #f59e0b; }
.question-result-card.poor { border-left-color: #ef4444; }

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.question-number {
  background: var(--primary);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.question-score {
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
}

.question-score.pass { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.question-score.good { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.question-score.partial { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.question-score.fail { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

.score-percent {
  font-size: 0.8rem;
  opacity: 0.8;
  margin-left: 0.25rem;
}

.question-prompt {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

.question-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.phase-tag, .bloom-tag, .arce-tag {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: var(--bg-primary);
}

.arce-tag.analysis { border-left: 2px solid #3b82f6; }
.arce-tag.reasoning { border-left: 2px solid #10b981; }
.arce-tag.creativity { border-left: 2px solid #f59e0b; }
.arce-tag.evidence { border-left: 2px solid #ef4444; }

.answer-comparison {
  margin-top: 1rem;
}

.answer-block, .feedback-block, .rubric-block {
  margin-bottom: 1rem;
}

.answer-block label, .feedback-block label, .rubric-block label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.answer-content, .feedback-content {
  background: var(--bg-primary);
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.6;
}

.answer-content pre {
  white-space: pre-wrap;
  font-family: inherit;
  margin: 0;
}

.char-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.feedback-content {
  border-left: 3px solid var(--primary);
}

.rubric-level {
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.rubric-level.level-5 { background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; }
.rubric-level.level-4 { background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; }
.rubric-level.level-3 { background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; }
.rubric-level.level-2 { background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; }
.rubric-level.level-1 { background: rgba(239, 68, 68, 0.2); border-left: 3px solid #ef4444; }

.score-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 6px solid;
}

.score-circle.excellent { border-color: #10b981; background: rgba(16, 185, 129, 0.1); }
.score-circle.good { border-color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
.score-circle.fair { border-color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
.score-circle.poor { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); }

.score-value {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
}

.score-unit {
  font-size: 1rem;
  color: var(--text-secondary);
}

.pa-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.875rem;
}

.pa-badge.pa4 { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.pa-badge.pa3 { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.pa-badge.pa2 { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.pa-badge.pa1 { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

.summary-info {
  flex: 1;
}

.summary-info h1 {
  margin-bottom: 0.25rem;
  font-size: 1.5rem;
}

.summary-info .topic {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.score-breakdown {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.breakdown-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.breakdown-item .label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.breakdown-item .value {
  font-weight: 600;
}

/* ARCE Section */
.arce-section {
  margin-bottom: 2rem;
}

.arce-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.arce-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  border: 2px solid transparent;
}

.arce-card.analysis { border-color: rgba(59, 130, 246, 0.3); }
.arce-card.reasoning { border-color: rgba(16, 185, 129, 0.3); }
.arce-card.creativity { border-color: rgba(245, 158, 11, 0.3); }
.arce-card.evidence { border-color: rgba(239, 68, 68, 0.3); }

.arce-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.arce-info h3 {
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.arce-bar {
  height: 6px;
  background: var(--bg-primary);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.arce-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.arce-card.analysis .arce-fill { background: #3b82f6; }
.arce-card.reasoning .arce-fill { background: #10b981; }
.arce-card.creativity .arce-fill { background: #f59e0b; }
.arce-card.evidence .arce-fill { background: #ef4444; }

.arce-score {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.arce-feedback {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
  line-height: 1.4;
  padding: 0.5rem;
  background: var(--bg-tertiary);
  border-radius: 6px;
}

.radar-container {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 400px;
  margin: 0 auto;
}

/* Feedback Section */
.feedback-section {
  margin-bottom: 2rem;
}

.feedback-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.feedback-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
}

.feedback-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.feedback-card.strengths .feedback-header .material-icons { color: #10b981; }
.feedback-card.weaknesses .feedback-header .material-icons { color: #f59e0b; }

.feedback-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feedback-card li {
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
  border-bottom: 1px solid var(--border-color);
}

.feedback-card li:last-child {
  border-bottom: none;
}

.feedback-card li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--primary);
}

.no-data {
  color: var(--text-secondary);
  font-style: italic;
}

/* Next Steps Section */
.next-steps-section {
  margin-bottom: 2rem;
}

.next-steps-list {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
}

.next-step-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  align-items: flex-start;
}

.next-step-item:last-child {
  margin-bottom: 0;
}

.step-number {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #10b981, #06b6d4);
  color: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.step-content p {
  margin: 0;
  line-height: 1.6;
  color: var(--text-primary);
}

/* Recommendation Section */
.recommendation-section {
  margin-bottom: 2rem;
}

.recommendation-card {
  display: flex;
  gap: 1.25rem;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(245, 158, 11, 0.08) 100%);
  border: 2px solid rgba(251, 191, 36, 0.3);
  border-radius: 16px;
  align-items: flex-start;
}

.recommendation-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.recommendation-card p {
  margin: 0;
  line-height: 1.8;
  font-size: 1.05rem;
  color: var(--text-primary);
}

/* Teacher Notes Section */
.teacher-notes-section {
  margin-bottom: 2rem;
}

.teacher-notes-card {
  display: flex;
  gap: 1.25rem;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(124, 58, 237, 0.08) 100%);
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-radius: 16px;
  align-items: flex-start;
}

.teacher-notes-card .material-icons {
  font-size: 2rem;
  color: #8b5cf6;
  flex-shrink: 0;
}

.teacher-notes-card p {
  margin: 0;
  line-height: 1.8;
  font-size: 1.05rem;
  color: var(--text-primary);
}

/* Suggestions Section */
.suggestions-section {
  margin-bottom: 2rem;
}

.suggestions-list {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
}

.suggestion-item {
  display: flex;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color);
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-number {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
}

.suggestion-item p {
  margin: 0;
  line-height: 1.6;
}

/* Questions Section */
.questions-section {
  margin-bottom: 2rem;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.question-result-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 2px solid var(--border-color);
  overflow: hidden;
}

.question-result-card.passed {
  border-color: rgba(16, 185, 129, 0.3);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: var(--bg-primary);
}

.question-number {
  font-weight: 600;
}

.question-score {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.question-score.pass {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.question-score.fail {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.question-content {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.question-content h4 {
  margin-bottom: 0.75rem;
}

.question-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.phase-tag {
  padding: 0.25rem 0.5rem;
  background: var(--bg-primary);
  border-radius: 4px;
  font-size: 0.75rem;
}

.arce-tag {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.arce-tag.analysis { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.arce-tag.reasoning { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.arce-tag.creativity { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.arce-tag.evidence { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

.answer-section {
  padding: 1.5rem;
}

.answer-block, .feedback-block, .suggestion-block {
  margin-bottom: 1rem;
}

.suggestion-block {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(251, 191, 36, 0.05) 100%);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 10px;
  padding: 1rem 1.25rem;
}

.suggestion-block label {
  color: #f59e0b;
  font-weight: 600;
  margin-bottom: 0.5rem;
  display: block;
}

.suggestion-content {
  color: var(--text-primary);
  line-height: 1.6;
}

.answer-block:last-child, .feedback-block:last-child {
  margin-bottom: 0;
}

.answer-block label, .feedback-block label, .arce-breakdown label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.answer-text {
  background: var(--bg-primary);
  padding: 1rem;
  border-radius: 8px;
  line-height: 1.6;
}

.feedback-text {
  padding: 1rem;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  border-left: 3px solid var(--primary);
  line-height: 1.6;
}

.arce-breakdown {
  padding: 0 1.5rem 1.5rem;
}

.mini-arce-scores {
  display: flex;
  gap: 0.5rem;
}

.mini-score {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.mini-score.analysis { background: rgba(59, 130, 246, 0.15); }
.mini-score.reasoning { background: rgba(16, 185, 129, 0.15); }
.mini-score.creativity { background: rgba(245, 158, 11, 0.15); }
.mini-score.evidence { background: rgba(239, 68, 68, 0.15); }

/* LO Section */
.lo-section {
  margin-bottom: 2rem;
}

.lo-cards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lo-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  border: 2px solid var(--border-color);
}

.lo-card.achieved {
  border-color: rgba(16, 185, 129, 0.3);
}

.lo-status .material-icons {
  font-size: 1.5rem;
  color: var(--text-secondary);
}

.lo-card.achieved .lo-status .material-icons {
  color: #10b981;
}

.lo-info h4 {
  margin: 0 0 0.25rem 0;
  font-size: 0.875rem;
}

.lo-info p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Overall Section */
.overall-section {
  margin-bottom: 2rem;
}

.overall-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  border-left: 4px solid var(--primary);
}

.overall-card p {
  margin: 0;
  line-height: 1.8;
}

/* Retry Info Section */
.retry-info-section {
  margin-bottom: 2rem;
}

.retry-info-card {
  background: linear-gradient(135deg, #667eea15, #764ba215);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}

.retry-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.retry-header .material-icons {
  color: #667eea;
  font-size: 1.5rem;
}

.retry-header h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.retry-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.retry-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.retry-stat .stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
}

.retry-stat .stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.retry-stat .stat-badge {
  background: #f0fdf4;
  color: #166534;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Actions Section */
.actions-section {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  padding-top: 1rem;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  text-decoration: none;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-outline {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-outline:hover {
  border-color: var(--primary);
  color: var(--primary);
}

/* ===== ARCE Situation Result Styles ===== */
.question-result-card.arce-situation-result {
  border-left: 4px solid #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.02), rgba(118, 75, 162, 0.02));
}

.question-type-badge {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.arce-situation-content {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
}

.arce-situation-content label {
  font-weight: 600;
  color: var(--primary);
  font-size: 0.875rem;
}

.arce-situation-content p {
  margin: 0.5rem 0 0 0;
  line-height: 1.6;
}

.situation-display {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px dashed var(--border-color);
}

.situation-display label {
  color: #3b82f6;
  font-weight: 600;
  display: block;
  margin-bottom: 0.25rem;
}

.question-display {
  margin-bottom: 1rem;
}

.question-display label {
  color: #10b981;
  font-weight: 600;
  display: block;
  margin-bottom: 0.25rem;
}

.question-display .question-prompt {
  margin: 0;
  line-height: 1.6;
  font-size: 1rem;
}

.task-display label {
  color: #f59e0b;
}

/* ARCE Breakdown Detailed Grid */
.arce-breakdown-detailed {
  margin: 1.5rem 0;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.arce-breakdown-detailed h4 {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.arce-breakdown-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.arce-breakdown-item {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 0.75rem;
  border-left: 3px solid;
}

.arce-breakdown-item.analysis { border-left-color: #3b82f6; }
.arce-breakdown-item.reasoning { border-left-color: #8b5cf6; }
.arce-breakdown-item.creativity { border-left-color: #f59e0b; }
.arce-breakdown-item.evidence { border-left-color: #10b981; }

.arce-breakdown-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.arce-breakdown-header .icon {
  font-size: 1rem;
}

.arce-breakdown-header .label {
  flex: 1;
  font-weight: 600;
  font-size: 0.8rem;
}

.arce-breakdown-header .score {
  font-weight: 700;
  font-size: 0.875rem;
}

.arce-breakdown-item.analysis .arce-breakdown-header .score { color: #3b82f6; }
.arce-breakdown-item.reasoning .arce-breakdown-header .score { color: #8b5cf6; }
.arce-breakdown-item.creativity .arce-breakdown-header .score { color: #f59e0b; }
.arce-breakdown-item.evidence .arce-breakdown-header .score { color: #10b981; }

.arce-feedback {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* ARCE Structured Answer Display */
.arce-structured-answer {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.arce-answer-section {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  border-left: 3px solid var(--border-color);
}

.arce-answer-section strong {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
}

.arce-answer-section p {
  margin: 0;
  line-height: 1.6;
  font-size: 0.875rem;
}

/* Color coding for ARCE answer sections */
.arce-answer-section:nth-child(1) { border-left-color: #3b82f6; }  /* Analysis */
.arce-answer-section:nth-child(2) { border-left-color: #8b5cf6; }  /* Reasoning */
.arce-answer-section:nth-child(3) { border-left-color: #f59e0b; }  /* Creativity */
.arce-answer-section:nth-child(4) { border-left-color: #10b981; }  /* Evidence */

/* 🆕 Multi-Agent Section Styles */
.multi-agent-section {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05));
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.multi-agent-section .section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6366f1;
}

.multi-agent-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(99, 102, 241, 0.15);
  padding: 0.75rem 1rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.badge-icon {
  font-size: 1.5rem;
}

.badge-text {
  font-weight: 500;
  color: #6366f1;
}

.confidence-badge {
  margin-left: auto;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.agents-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.agent-card {
  background: var(--bg-secondary, #ffffff);
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.agent-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.agent-card.analysis { border-left: 4px solid #3b82f6; }
.agent-card.reasoning { border-left: 4px solid #8b5cf6; }
.agent-card.creativity { border-left: 4px solid #f59e0b; }
.agent-card.evidence { border-left: 4px solid #10b981; }

.agent-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.agent-icon {
  font-size: 1.25rem;
}

.agent-header h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
}

.agent-score {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
}

.score-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #6366f1;
}

.confidence-value {
  font-size: 0.75rem;
  color: var(--text-secondary, #6b7280);
}

.agent-feedback {
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  line-height: 1.5;
  margin: 0;
}

.chain-of-thought {
  margin-top: 0.75rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  font-size: 0.8rem;
}

.chain-of-thought summary {
  cursor: pointer;
  color: #6366f1;
  font-weight: 500;
}

.chain-of-thought p {
  margin: 0.5rem 0 0 0;
  color: var(--text-secondary, #6b7280);
  white-space: pre-wrap;
}

.adversarial-section,
.consensus-section {
  background: var(--bg-secondary, #ffffff);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.adversarial-section h4,
.consensus-section h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: var(--text-primary, #1f2937);
}

.challenges-list ul,
.bias-list ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.challenges-list li,
.bias-list li {
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
}

.no-issues {
  color: #10b981;
  font-size: 0.875rem;
}

.consensus-scores {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.consensus-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.consensus-item .label {
  font-size: 0.75rem;
  color: var(--text-secondary, #6b7280);
}

.consensus-item .value {
  font-weight: 600;
  color: var(--text-primary, #1f2937);
}

.consensus-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.consensus-badge.high { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.consensus-badge.moderate { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.consensus-badge.low { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

.consensus-feedback {
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  line-height: 1.5;
  margin: 0;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.processing-meta {
  text-align: center;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  color: var(--text-muted, #9ca3af);
}

/* Dark mode for Multi-Agent */
.dark-mode .multi-agent-section {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1));
  border-color: rgba(99, 102, 241, 0.3);
}

.dark-mode .multi-agent-section .section-title {
  color: #a5b4fc;
}

.dark-mode .multi-agent-badge {
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.dark-mode .badge-text {
  color: #a5b4fc;
}

.dark-mode .agent-card,
.dark-mode .adversarial-section,
.dark-mode .consensus-section {
  background: var(--bg-card, #1e293b);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark-mode .agent-header h4 {
  color: #f1f5f9;
}

.dark-mode .agent-score {
  background: rgba(255, 255, 255, 0.05);
}

.dark-mode .score-value {
  color: #a5b4fc;
}

.dark-mode .confidence-value,
.dark-mode .agent-feedback {
  color: #94a3b8;
}

.dark-mode .chain-of-thought {
  background: rgba(255, 255, 255, 0.03);
}

.dark-mode .chain-of-thought summary {
  color: #a5b4fc;
}

.dark-mode .chain-of-thought p {
  color: #94a3b8;
}

.dark-mode .adversarial-section h4,
.dark-mode .consensus-section h4 {
  color: #f1f5f9;
}

.dark-mode .challenges-list li,
.dark-mode .bias-list li {
  color: #94a3b8;
}

.dark-mode .consensus-item .label {
  color: #94a3b8;
}

.dark-mode .consensus-item .value {
  color: #f1f5f9;
}

.dark-mode .consensus-feedback {
  color: #94a3b8;
  border-top-color: rgba(255, 255, 255, 0.1);
}

.dark-mode .processing-meta {
  color: #64748b;
  border-top-color: rgba(255, 255, 255, 0.1);
}

/* Responsive */
@media (max-width: 768px) {
  .result-container {
    padding: 1rem;
  }
  
  .summary-card {
    flex-direction: column;
    text-align: center;
  }
  
  .score-breakdown {
    grid-template-columns: 1fr;
  }
  
  .arce-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .feedback-grid {
    grid-template-columns: 1fr;
  }
  
  .actions-section {
    flex-direction: column;
  }
  
  .arce-breakdown-grid {
    grid-template-columns: 1fr;
  }
  
  .agents-grid {
    grid-template-columns: 1fr;
  }
  
  .consensus-scores {
    flex-direction: column;
    gap: 0.75rem;
  }
}

/* ============================================
   📊 Statistics Section (Research Grade)
   ============================================ */
.statistics-section {
  background: var(--bg-secondary, #ffffff);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(59, 130, 246, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.statistics-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 1rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 12px;
  transition: transform 0.2s;
}

.stat-item:hover {
  transform: translateY(-2px);
}

.stat-item.passed {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.stat-item.failed {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.stat-item.rate {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.stat-item.avg {
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #1f2937);
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary, #6b7280);
  margin-top: 0.25rem;
}

.score-range {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.range-item {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
}

.range-item.highest {
  background: rgba(16, 185, 129, 0.1);
}

.range-item.lowest {
  background: rgba(245, 158, 11, 0.1);
}

.range-icon {
  font-size: 1.25rem;
}

.range-label {
  font-weight: 500;
  color: var(--text-secondary, #6b7280);
}

.range-value {
  font-weight: 700;
  color: var(--text-primary, #1f2937);
}

.range-question {
  font-size: 0.75rem;
  color: var(--text-muted, #9ca3af);
}

.score-distribution h4 {
  margin: 0 0 1rem 0;
  font-size: 0.95rem;
  color: var(--text-primary, #1f2937);
}

.distribution-bars {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dist-item {
  display: grid;
  grid-template-columns: 120px 1fr 60px;
  align-items: center;
  gap: 1rem;
}

.dist-label {
  font-size: 0.8rem;
  color: var(--text-secondary, #6b7280);
}

.dist-bar {
  height: 24px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  overflow: hidden;
}

.dist-fill {
  height: 100%;
  border-radius: 12px;
  transition: width 0.5s ease;
}

.dist-item.excellent .dist-fill {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.dist-item.good .dist-fill {
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
}

.dist-item.fair .dist-fill {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.dist-item.needs-improvement .dist-fill {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

.dist-count {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
  text-align: right;
}

/* ============================================
   🔬 ARCE Analysis Section
   ============================================ */
.arce-analysis-section {
  background: var(--bg-secondary, #ffffff);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(139, 92, 246, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.arce-analysis-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.dimension-comparison {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.dimension-item {
  flex: 1;
  min-width: 250px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 12px;
}

.dimension-item.strongest {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.dimension-item.weakest {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.dim-icon {
  font-size: 1.5rem;
}

.dim-label {
  font-size: 0.8rem;
  color: var(--text-secondary, #6b7280);
}

.dim-value {
  font-weight: 600;
  color: var(--text-primary, #1f2937);
}

.dim-score {
  font-size: 0.75rem;
  color: var(--text-muted, #9ca3af);
}

.comparison-text {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  border-left: 3px solid #8b5cf6;
}

.comparison-text p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary, #6b7280);
  line-height: 1.6;
}

.development-priority h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.95rem;
  color: var(--text-primary, #1f2937);
}

.development-priority ol {
  margin: 0;
  padding-left: 1.25rem;
}

.development-priority li {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
}

/* ============================================
   🔬 Research Insights Section
   ============================================ */
.research-insights-section {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(59, 130, 246, 0.05));
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(139, 92, 246, 0.25);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.1);
}

.research-insights-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.insight-block {
  background: var(--bg-secondary, #ffffff);
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.insight-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.insight-icon {
  font-size: 1.25rem;
}

.insight-header h4 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
}

.insight-block p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  line-height: 1.6;
}

.insight-block ul {
  margin: 0;
  padding-left: 1.25rem;
}

.insight-block li {
  margin-bottom: 0.375rem;
  font-size: 0.85rem;
  color: var(--text-secondary, #6b7280);
}

.insight-block.pattern {
  border-left: 3px solid #8b5cf6;
}

.insight-block.cognitive {
  border-left: 3px solid #10b981;
}

.insight-block.intervention {
  border-left: 3px solid #f59e0b;
}

.insight-block.strategies {
  border-left: 3px solid #3b82f6;
}

/* Dark mode for Statistics and Research */
.dark-mode .statistics-section,
.dark-mode .arce-analysis-section {
  background: var(--bg-card, #1e293b);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark-mode .stat-item {
  background: rgba(255, 255, 255, 0.05);
}

.dark-mode .dist-bar {
  background: rgba(255, 255, 255, 0.1);
}

.dark-mode .research-insights-section {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.1));
  border-color: rgba(139, 92, 246, 0.3);
}

.dark-mode .insight-block {
  background: var(--bg-card, #1e293b);
}

/* Responsive for new sections */
@media (max-width: 768px) {
  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .dist-item {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .dimension-comparison {
    flex-direction: column;
  }
  
  .dimension-item {
    min-width: auto;
  }
  
  .research-insights-content {
    grid-template-columns: 1fr;
  }
  
  .score-range {
    flex-direction: column;
  }
  
  .range-item {
    min-width: auto;
  }
}

/* 🏷️ Assessment Mode Indicator Styles */
.assessment-mode-indicator {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.mode-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
}

.mode-badge.single {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
  border: 1px solid #f59e0b;
}

.mode-badge.batch {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  color: #1e40af;
  border: 1px solid #3b82f6;
}

.mode-badge.per-question {
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  color: #065f46;
  border: 1px solid #10b981;
}

.mode-badge.multi-agent-worksheet,
.mode-badge.multi-agent {
  background: linear-gradient(135deg, #ede9fe, #ddd6fe);
  color: #5b21b6;
  border: 1px solid #8b5cf6;
}

.mode-icon {
  font-size: 1.1rem;
}

.mode-name {
  font-weight: 700;
}

.assessment-mode-indicator .mode-desc {
  font-size: 0.8rem;
  color: var(--text-secondary, #64748b);
  font-style: italic;
}

/* Dark mode for Assessment Mode Indicator */
.dark-mode .mode-badge.single {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(251, 191, 36, 0.15));
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.4);
}

.dark-mode .mode-badge.batch {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(96, 165, 250, 0.15));
  color: #60a5fa;
  border-color: rgba(59, 130, 246, 0.4);
}

.dark-mode .mode-badge.per-question {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(52, 211, 153, 0.15));
  color: #34d399;
  border-color: rgba(16, 185, 129, 0.4);
}

.dark-mode .mode-badge.multi-agent-worksheet,
.dark-mode .mode-badge.multi-agent {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(167, 139, 250, 0.15));
  color: #a78bfa;
  border-color: rgba(139, 92, 246, 0.4);
}

.dark-mode .assessment-mode-indicator .mode-desc {
  color: var(--text-muted, #94a3b8);
}
</style>
