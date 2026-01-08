<template>
  <div class="chat-container">
    <ErrorBoundary context="ChatView">
    <!-- Badge Notification -->
    <BadgeNotification
      :badge="gamificationStore.newBadge"
      :show="gamificationStore.showBadgeNotification"
      @close="gamificationStore.closeBadgeNotification"
    />
    
    <!-- Points Notification -->
    <PointsNotification
      :points="gamificationStore.pointsEarned"
      :show="gamificationStore.showPointsNotification"
      @close="gamificationStore.closePointsNotification"
    />
    
    <!-- Reflection Journal -->
    <ReflectionJournal
      :show="showReflectionModal"
      :sessionId="chatStore.currentSession?.id || ''"
      :courseId="chatStore.currentSession?.courseId || null"
      :sessionSummary="sessionSummary"
      @close="showReflectionModal = false"
      @saved="onReflectionSaved"
    />
    
    <!-- 🆕 Assessment Readiness Modal -->
    <div v-if="showReadinessModal" class="modal-overlay" @click.self="showReadinessModal = false">
      <div class="readiness-modal card">
        <div class="modal-header">
          <h2>📊 ความพร้อมในการประเมิน</h2>
          <button @click="showReadinessModal = false" class="close-btn">✕</button>
        </div>
        
        <div class="readiness-content">
          <!-- Readiness Score Circle -->
          <div class="readiness-circle" :class="readinessClass">
            <div class="circle-content">
              <span class="score">{{ readiness.percent }}%</span>
              <span class="label">พร้อม</span>
            </div>
          </div>
          
          <!-- Unit Progress List -->
          <div class="unit-progress-section" v-if="unitProgressList.length > 0">
            <h4>📚 ความคืบหน้าแต่ละหน่วย</h4>
            <div class="unit-list">
              <div v-for="unit in unitProgressList" :key="unit.unitKey" class="unit-row">
                <span class="unit-name">{{ unit.unitName }}</span>
                <div class="unit-badges">
                  <span class="badge" :class="unit.ksRead ? 'done' : 'pending'">
                    {{ unit.ksRead ? '✅' : '⬜' }} ใบความรู้
                  </span>
                  <span class="badge" :class="unit.wsPassed ? 'done' : 'pending'">
                    {{ unit.wsPassed ? '✅' : '⬜' }} ใบงาน 
                    <span v-if="unit.wsScore">({{ unit.wsScore }}%)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Weak LOs Warning (Level 3) -->
          <div v-if="readiness.weakLOs?.length > 0 && journeyLevel >= 3" class="weak-los-section">
            <h4>⚠️ จุดที่ต้องปรับปรุง</h4>
            <div class="weak-tags">
              <span v-for="lo in readiness.weakLOs" :key="lo" class="weak-tag">
                {{ getWeakLOLabel(lo) }}
              </span>
            </div>
            <p class="weak-hint">AI จะเน้นถามคำถามเกี่ยวกับจุดที่ต้องปรับปรุงเหล่านี้</p>
          </div>
          
          <!-- Readiness Message -->
          <div class="readiness-message" :class="readinessClass">
            <span class="message-icon">{{ readiness.ready ? '✅' : 'ℹ️' }}</span>
            <p>{{ readiness.message }}</p>
          </div>
        </div>
        
        <div class="modal-actions">
          <button v-if="readiness.ready || journeyLevel === 1" @click="proceedToAssessment" class="btn btn-primary btn-lg">
            🚀 {{ readiness.ready ? 'เริ่มประเมิน' : 'ทำเลย (ยังไม่พร้อมเต็มที่)' }}
          </button>
          <button v-else @click="goToLearningRooms" class="btn btn-primary">
            📚 ไปเรียนต่อ
          </button>
          <button v-if="!readiness.ready && journeyLevel > 1" @click="proceedAnyway" class="btn btn-outline">
            ยังไงก็ทำ ({{ readiness.percent }}% พร้อม)
          </button>
          <button @click="showReadinessModal = false" class="btn btn-text">
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
    
    <!-- 🆕 Course Selection Modal (Required for assessment tracking) -->
    <div v-if="showCourseSelectModal" class="modal-overlay">
      <div class="course-select-modal card">
        <div class="modal-header">
          <h2>📚 เลือกวิชาก่อนเริ่มประเมิน</h2>
        </div>
        
        <div class="modal-content">
          <p class="info-text">
            ⚠️ กรุณาเลือกวิชาเพื่อให้ระบบบันทึกคะแนนได้ถูกต้อง และครูสามารถดูรายงานได้
          </p>
          
          <div v-if="courseLoading" class="loading-courses">
            <span class="spinner"></span> กำลังโหลดรายวิชา...
          </div>
          
          <div v-else-if="availableCourses.length > 0" class="course-list">
            <label 
              v-for="course in availableCourses" 
              :key="course.id" 
              class="course-option"
              :class="{ selected: selectedCourseForChat === course.id }"
            >
              <input 
                type="radio" 
                v-model="selectedCourseForChat" 
                :value="course.id"
                name="course-select"
              >
              <div class="course-info">
                <span class="course-code">{{ course.courseCode }}</span>
                <span class="course-name">{{ course.courseName }}</span>
                <span v-if="course.learningOutcomes?.length" class="lo-count">
                  🎯 {{ course.learningOutcomes.length }} LOs
                </span>
              </div>
            </label>
          </div>
          
          <div v-else class="no-courses">
            <p>❌ ไม่พบรายวิชาที่เปิดให้ลงทะเบียน</p>
            <p>กรุณาติดต่อครูผู้สอนเพื่อเพิ่มรายวิชา</p>
          </div>
        </div>
        
        <div class="modal-actions">
          <button 
            @click="startChatWithCourse" 
            class="btn btn-primary"
            :disabled="!selectedCourseForChat || courseLoading"
          >
            🚀 เริ่มประเมิน
          </button>
          <button @click="goBackToDashboard" class="btn btn-text">
            ← กลับไปหน้า Dashboard
          </button>
        </div>
      </div>
    </div>
    
    <!-- Adaptive Learning Path Banner -->
      <!-- 🆕 Adaptive Learning Path Banner -->
      <div v-if="activePath" class="adaptive-path-banner">
        <div class="path-info">
          <span class="path-icon">🎯</span>
          <span class="path-label">Adaptive Learning Mode</span>
          <span class="path-progress">{{ completedSteps }}/{{ totalSteps }} steps</span>
        </div>
        <div class="path-actions">
          <button @click="viewFullPath" class="btn btn-sm btn-outline">View Path</button>
          <button @click="exitPath" class="btn btn-sm btn-secondary">Exit Path</button>
        </div>
      </div>    <!-- Header -->
    <div class="chat-header card">
      <div class="header-content">
        <h2>💬 HOTS Assessment Chat</h2>
        <div class="header-actions">
          <!-- 🤖 Assessment Mode Indicator (ครูตั้งค่าที่รายวิชา) -->
          <div class="assessment-mode-indicator" :title="assessmentModeTitle">
            <span class="mode-badge" :class="useMultiAgent ? 'multi' : 'single'">
              {{ useMultiAgent ? '🤖×6 Multi-Agent' : '🤖 Single Agent' }}
            </span>
            <!-- ⚠️ แจ้งเตือนถ้า course ยังไม่ได้ตั้งค่า -->
            <span v-if="!hasAssessmentModeConfig && chatStore.currentSession?.courseData" class="mode-warning" title="รายวิชานี้ยังไม่ได้ตั้งค่า Assessment Mode - ใช้ค่าเริ่มต้น Single Agent">
              ⚠️
            </span>
          </div>
          <button @click="toggleTheme" class="icon-btn" title="Toggle Theme">
            {{ isDarkMode ? '☀️' : '🌙' }}
          </button>
          <button @click="handleEndSession" class="btn btn-secondary btn-sm">
            จบการสนทนา
          </button>
        </div>
      </div>
    </div>

    <!-- Messages Area -->
    <div class="messages-container" ref="messagesContainer">
      <div 
        v-for="message in messages" 
        :key="message.id"
        :class="['message', `message-${message.from}`]"
      >
        <div class="message-bubble">
          <div class="message-header">
            <span class="message-sender">
              {{ getSenderName(message.from) }}
            </span>
            <span class="message-time">
              {{ formatTime(message.timestamp) }}
            </span>
          </div>
          <div class="message-text" v-html="formatMessageText(message.text)"></div>
          
          <!-- Assessment scores if available (use message.scores OR message.assessmentId) -->
          <div v-if="message.scores || (message.assessmentId && getAssessment(message.assessmentId))" class="assessment-scores assessment-report">
            
            <!-- 📋 Assessment Report Header -->
            <div class="assessment-report-header">
              <div class="report-title-row">
                <span class="report-icon">📊</span>
                <span class="report-title">ผลการประเมินคำตอบ</span>
                <span class="report-score-badge" :class="getOverallScoreClass(message)">
                  {{ getOverallScoreValue(message) }}/20
                </span>
              </div>
              <div class="report-mode-badge">
                <span v-if="isAssessmentMultiAgent(message.assessmentId)" class="mode-multi">
                  <span class="mode-icon">🤖×6</span> Multi-Agent Assessment
                </span>
                <span v-else class="mode-single">
                  <span class="mode-icon">🤖</span> Single Agent (CoT)
                </span>
                <span v-if="getAgentConfidence(message.assessmentId) || getAssessmentConfidence(message.assessmentId)" 
                      class="confidence-pill" 
                      :class="getConfidenceClass(message.assessmentId) || getConfidenceClassFromValue(getAssessmentConfidence(message.assessmentId))">
                  ความมั่นใจ: {{ getAgentConfidence(message.assessmentId) || getAssessmentConfidence(message.assessmentId) }}%
                </span>
              </div>
            </div>

            <!-- ❓ คำถามที่ตอบ -->
            <div class="assessment-question-section" v-if="getQuestionText(message.assessmentId)">
              <div class="section-header question-header">
                <span class="section-icon">❓</span>
                <span class="section-title">คำถาม:</span>
              </div>
              <div class="question-content">
                {{ getQuestionText(message.assessmentId) }}
              </div>
            </div>

            <!-- ✍️ คำตอบของนักเรียน -->
            <div class="assessment-answer-section" v-if="getStudentAnswer(message.assessmentId)">
              <div class="section-header answer-header">
                <span class="section-icon">✍️</span>
                <span class="section-title">คำตอบของคุณ:</span>
              </div>
              <div class="answer-content">
                {{ getStudentAnswer(message.assessmentId) }}
              </div>
            </div>

            <!-- 📊 คะแนนรายด้าน -->
            <div class="assessment-scores-section">
              <div class="section-header scores-header">
                <span class="section-icon">📊</span>
                <span class="section-title">คะแนนรายด้าน:</span>
              </div>
              <div class="score-grid">
                <div class="score-item analysis">
                  <div class="score-header">
                    <span class="score-label">🔍 วิเคราะห์</span>
                    <span class="score-value">{{ getScoreValue(message, 'analysis') }}/5</span>
                  </div>
                  <div class="score-bar">
                    <div class="score-fill" :style="{ width: (getScoreValue(message, 'analysis') / 5) * 100 + '%' }"></div>
                  </div>
                </div>
                <div class="score-item reasoning">
                  <div class="score-header">
                    <span class="score-label">🧠 เหตุผล</span>
                    <span class="score-value">{{ getScoreValue(message, 'reasoning') }}/5</span>
                  </div>
                  <div class="score-bar">
                    <div class="score-fill" :style="{ width: (getScoreValue(message, 'reasoning') / 5) * 100 + '%' }"></div>
                  </div>
                </div>
                <div class="score-item creativity">
                  <div class="score-header">
                    <span class="score-label">💡 สร้างสรรค์</span>
                    <span class="score-value">{{ getScoreValue(message, 'creativity') }}/5</span>
                  </div>
                  <div class="score-bar">
                    <div class="score-fill" :style="{ width: (getScoreValue(message, 'creativity') / 5) * 100 + '%' }"></div>
                  </div>
                </div>
                <div class="score-item evidence">
                  <div class="score-header">
                    <span class="score-label">📚 หลักฐาน</span>
                    <span class="score-value">{{ getScoreValue(message, 'evidence') }}/5</span>
                  </div>
                  <div class="score-bar">
                    <div class="score-fill" :style="{ width: (getScoreValue(message, 'evidence') / 5) * 100 + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 🤖×6 Multi-Agent Details (แสดงเฉพาะ Multi-Agent mode) -->
            <details v-if="isAssessmentMultiAgent(message.assessmentId) && getAgentDetails(message.assessmentId)" class="multi-agent-details-section">
              <summary class="agent-details-summary">
                <span class="summary-icon">🔬</span>
                <span class="summary-text">ดูรายละเอียดการประเมินจาก 6 Agents</span>
                <span class="consensus-badge" :class="getConsensusLevel(message.assessmentId)">
                  {{ getConsensusLabel(getConsensusLevel(message.assessmentId)) }}
                </span>
              </summary>
              
              <div class="agents-detail-grid">
                <!-- Analysis Agent -->
                <div class="agent-detail-card" v-if="getAgentDetails(message.assessmentId)?.analysis">
                  <div class="agent-card-header analysis">
                    <span class="agent-icon">🔍</span>
                    <span class="agent-name">Analysis Agent</span>
                    <span class="agent-score">{{ getAgentDetails(message.assessmentId).analysis.score || 0 }}/5</span>
                  </div>
                  <div class="agent-confidence-bar">
                    <span class="confidence-label">ความเชื่อมั่น:</span>
                    <div class="confidence-bar-bg">
                      <div class="confidence-bar-fill" :style="{ width: (getAgentDetails(message.assessmentId).analysis.confidence || 0) + '%' }"></div>
                    </div>
                    <span class="confidence-value">{{ getAgentDetails(message.assessmentId).analysis.confidence || 0 }}%</span>
                  </div>
                  <p class="agent-feedback">{{ getAgentFeedbackFromDetails(getAgentDetails(message.assessmentId).analysis) }}</p>
                </div>
                
                <!-- Reasoning Agent -->
                <div class="agent-detail-card" v-if="getAgentDetails(message.assessmentId)?.reasoning">
                  <div class="agent-card-header reasoning">
                    <span class="agent-icon">🧠</span>
                    <span class="agent-name">Reasoning Agent</span>
                    <span class="agent-score">{{ getAgentDetails(message.assessmentId).reasoning.score || 0 }}/5</span>
                  </div>
                  <div class="agent-confidence-bar">
                    <span class="confidence-label">ความเชื่อมั่น:</span>
                    <div class="confidence-bar-bg">
                      <div class="confidence-bar-fill" :style="{ width: (getAgentDetails(message.assessmentId).reasoning.confidence || 0) + '%' }"></div>
                    </div>
                    <span class="confidence-value">{{ getAgentDetails(message.assessmentId).reasoning.confidence || 0 }}%</span>
                  </div>
                  <p class="agent-feedback">{{ getAgentFeedbackFromDetails(getAgentDetails(message.assessmentId).reasoning) }}</p>
                </div>
                
                <!-- Creativity Agent -->
                <div class="agent-detail-card" v-if="getAgentDetails(message.assessmentId)?.creativity">
                  <div class="agent-card-header creativity">
                    <span class="agent-icon">💡</span>
                    <span class="agent-name">Creativity Agent</span>
                    <span class="agent-score">{{ getAgentDetails(message.assessmentId).creativity.score || 0 }}/5</span>
                  </div>
                  <div class="agent-confidence-bar">
                    <span class="confidence-label">ความเชื่อมั่น:</span>
                    <div class="confidence-bar-bg">
                      <div class="confidence-bar-fill" :style="{ width: (getAgentDetails(message.assessmentId).creativity.confidence || 0) + '%' }"></div>
                    </div>
                    <span class="confidence-value">{{ getAgentDetails(message.assessmentId).creativity.confidence || 0 }}%</span>
                  </div>
                  <p class="agent-feedback">{{ getAgentFeedbackFromDetails(getAgentDetails(message.assessmentId).creativity) }}</p>
                </div>
                
                <!-- Evidence Agent -->
                <div class="agent-detail-card" v-if="getAgentDetails(message.assessmentId)?.evidence">
                  <div class="agent-card-header evidence">
                    <span class="agent-icon">📚</span>
                    <span class="agent-name">Evidence Agent</span>
                    <span class="agent-score">{{ getAgentDetails(message.assessmentId).evidence.score || 0 }}/5</span>
                  </div>
                  <div class="agent-confidence-bar">
                    <span class="confidence-label">ความเชื่อมั่น:</span>
                    <div class="confidence-bar-bg">
                      <div class="confidence-bar-fill" :style="{ width: (getAgentDetails(message.assessmentId).evidence.confidence || 0) + '%' }"></div>
                    </div>
                    <span class="confidence-value">{{ getAgentDetails(message.assessmentId).evidence.confidence || 0 }}%</span>
                  </div>
                  <p class="agent-feedback">{{ getAgentFeedbackFromDetails(getAgentDetails(message.assessmentId).evidence) }}</p>
                </div>
              </div>
              
              <!-- Adversarial Refiner Info -->
              <div v-if="getAgentDetails(message.assessmentId)?.adversarial" class="adversarial-summary">
                <div class="adversarial-header">
                  <span class="adversarial-icon">⚖️</span>
                  <span class="adversarial-title">Adversarial Refiner ตรวจสอบแล้ว</span>
                </div>
                <p v-if="getAgentDetails(message.assessmentId)?.adversarial?.refinementSummary" class="adversarial-text">
                  {{ getAgentDetails(message.assessmentId)?.adversarial?.refinementSummary }}
                </p>
              </div>
            </details>

            <!-- 💬 Feedback Section -->
            <div class="assessment-feedback-section">
              <div class="section-header feedback-header">
                <span class="section-icon">💬</span>
                <span class="section-title">Feedback:</span>
              </div>
              <div class="feedback-main-content">
                {{ getAssessment(message.assessmentId)?.feedbackText || getAssessment(message.assessmentId)?.feedback || getAssessment(message.assessmentId)?.agentDetails?.consensus?.feedback || 'ระบบได้ประเมินคำตอบของคุณเรียบร้อยแล้ว' }}
              </div>
            </div>

            <!-- ✨ จุดเด่น / 🎯 จุดที่ควรพัฒนา / 💡 คำแนะนำ -->
            <div class="assessment-improvement-section">
              <!-- จุดเด่น -->
              <div class="improvement-box strengths" v-if="getAssessment(message.assessmentId)?.strengths?.length > 0">
                <div class="improvement-header">
                  <span class="improvement-icon">✨</span>
                  <span class="improvement-title">จุดเด่นของคุณ:</span>
                </div>
                <ul class="improvement-list">
                  <li v-for="(item, idx) in getAssessment(message.assessmentId)?.strengths" :key="'str-'+idx">
                    {{ item }}
                  </li>
                </ul>
              </div>
              <div class="improvement-box strengths empty" v-else>
                <div class="improvement-header">
                  <span class="improvement-icon">✨</span>
                  <span class="improvement-title">จุดเด่นของคุณ:</span>
                </div>
                <p class="empty-text">ยังไม่มีข้อมูล</p>
              </div>

              <!-- จุดที่ควรพัฒนา -->
              <div class="improvement-box weaknesses" v-if="getAssessment(message.assessmentId)?.weaknesses?.length > 0">
                <div class="improvement-header">
                  <span class="improvement-icon">🎯</span>
                  <span class="improvement-title">จุดที่ควรพัฒนา:</span>
                </div>
                <ul class="improvement-list">
                  <li v-for="(item, idx) in getAssessment(message.assessmentId)?.weaknesses" :key="'wk-'+idx">
                    {{ item }}
                  </li>
                </ul>
              </div>
              <div class="improvement-box weaknesses empty" v-else>
                <div class="improvement-header">
                  <span class="improvement-icon">🎯</span>
                  <span class="improvement-title">จุดที่ควรพัฒนา:</span>
                </div>
                <p class="empty-text">ยังไม่มีข้อมูล</p>
              </div>

              <!-- คำแนะนำ -->
              <div class="improvement-box suggestions" v-if="getAssessment(message.assessmentId)?.suggestions?.length > 0">
                <div class="improvement-header">
                  <span class="improvement-icon">💡</span>
                  <span class="improvement-title">คำแนะนำ:</span>
                </div>
                <ul class="improvement-list">
                  <li v-for="(item, idx) in getAssessment(message.assessmentId)?.suggestions" :key="'sug-'+idx">
                    {{ item }}
                  </li>
                </ul>
              </div>
            </div>

            <!-- 🎯 LO Assessment -->
            <div v-if="getAssessment(message.assessmentId)?.loAssessment" class="assessment-lo-section">
              <div class="section-header lo-header">
                <span class="section-icon">🎯</span>
                <span class="section-title">Learning Outcomes:</span>
              </div>
              <div v-if="getAssessment(message.assessmentId)?.loAssessment?.passedLOs?.length > 0" class="lo-passed-list">
                <span class="lo-status passed">✅ ผ่าน:</span>
                <span v-for="loCode in getAssessment(message.assessmentId)?.loAssessment?.passedLOs" :key="loCode" class="lo-badge passed">
                  {{ loCode }}
                </span>
              </div>
              <div v-else class="lo-not-passed">
                <span class="lo-status not-passed">⚠️ ยังไม่ผ่าน LO ในคำตอบนี้</span>
                <p class="lo-tip">💡 ลองตอบให้สอดคล้องกับ Learning Outcomes มากขึ้น</p>
              </div>
              <p v-if="getAssessment(message.assessmentId)?.loAssessment?.analysis" class="lo-analysis-text">
                {{ getAssessment(message.assessmentId)?.loAssessment?.analysis }}
              </p>
            </div>

            <!-- ⭐ Gamification -->
            <div v-if="getAssessment(message.assessmentId)?.gamification" class="assessment-gamification-section">
              <div class="gamification-row">
                <span class="points-earned">⭐ +{{ getAssessment(message.assessmentId)?.gamification?.pointsEarned }} แต้ม</span>
                <span v-if="getAssessment(message.assessmentId)?.gamification?.newBadges?.length > 0" class="new-badges">
                  🏆 {{ getAssessment(message.assessmentId)?.gamification?.newBadges.map(b => getBadgeName(b)).join(', ') }}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div v-if="loading" class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>

    <!-- Input Area (with copy-paste prevention) -->
    <div class="input-container card">
      <!-- 🆕 Error Banner -->
      <div v-if="sendError" class="error-banner">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ sendError }}</span>
        <button @click="sendError = null" class="error-close">✕</button>
      </div>
      
      <!-- 🆕 Input Mode Toggle -->
      <div class="input-mode-toggle">
        <button 
          :class="['mode-btn', { active: !structuredMode }]"
          @click="structuredMode = false"
        >
          📝 พิมพ์อิสระ
        </button>
        <button 
          :class="['mode-btn', { active: structuredMode }]"
          @click="structuredMode = true"
        >
          🧩 ตอบแบบมีโครงสร้าง
        </button>
      </div>
      
      <!-- Traditional Free-form Input -->
      <div v-if="!structuredMode" class="freeform-input">
        <textarea
          ref="chatTextarea"
          v-model="inputText"
          @keydown.enter.exact.prevent="handleSend"
          @keydown="handleKeyDown"
          @input="handleInputChange"
          @paste.prevent="handlePaste"
          @copy.prevent="handleCopy"
          @cut.prevent="handleCut"
          @contextmenu.prevent="!isMobile"
          @dragover.prevent
          @drop.prevent
          @blur="handleFocusLost"
          @focus="handleMobileFocus"
          @touchstart="handleTouchStart"
          class="chat-input"
          :class="{ 'mobile-input': isMobile }"
          :placeholder="isMobile ? 'พิมพ์คำตอบของคุณที่นี่...' : 'พิมพ์คำตอบของคุณที่นี่... (กด Enter เพื่อส่ง)'"
          :rows="isMobile ? 5 : 3"
          :disabled="loading"
          autocomplete="off"
          :autocorrect="isMobile ? 'on' : 'off'"
          :autocapitalize="isMobile ? 'sentences' : 'off'"
          :spellcheck="isMobile"
          inputmode="text"
          enterkeyhint="send"
        ></textarea>
      </div>
      
      <!-- 🆕 Structured Input Mode -->
      <div v-else class="structured-input">
        <div class="structured-intro">
          💡 <strong>เคล็ดลับ:</strong> เพิ่มประเด็นในแต่ละด้านได้หลายข้อ คลิก "➕ เพิ่ม" เพื่อใส่ความคิดเพิ่มเติม
        </div>
        
        <!-- Analysis Section -->
        <div class="dimension-section analysis-section">
          <div class="dimension-header">
            <span class="dimension-icon">🔍</span>
            <span class="dimension-title">การวิเคราะห์ (Analysis)</span>
            <span class="dimension-count">{{ structuredAnswer.analysis.length }} ข้อ</span>
          </div>
          <div class="dimension-hint">แยกแยะข้อมูล หาความสัมพันธ์ ระบุสาเหตุและผล</div>
          <div class="dimension-items">
            <div 
              v-for="(item, index) in structuredAnswer.analysis" 
              :key="'analysis-' + index"
              class="dimension-item"
            >
              <span class="item-number">{{ index + 1 }}.</span>
              <input 
                v-model="structuredAnswer.analysis[index]"
                type="text"
                :class="['item-input', { 'mobile-input': isMobile }]"
                placeholder="เขียนการวิเคราะห์ของคุณ..."
                @paste.prevent="handlePaste"
                @contextmenu.prevent="!isMobile"
                :autocorrect="isMobile ? 'on' : 'off'"
                :autocapitalize="isMobile ? 'sentences' : 'off'"
                :spellcheck="isMobile"
                inputmode="text"
              >
              <button 
                @click="removeItem('analysis', index)" 
                class="item-remove"
                title="ลบข้อนี้"
              >✕</button>
            </div>
          </div>
          <button @click="addItem('analysis')" class="add-item-btn">
            ➕ เพิ่มการวิเคราะห์
          </button>
        </div>
        
        <!-- Reasoning Section -->
        <div class="dimension-section reasoning-section">
          <div class="dimension-header">
            <span class="dimension-icon">🧠</span>
            <span class="dimension-title">การให้เหตุผล (Reasoning)</span>
            <span class="dimension-count">{{ structuredAnswer.reasoning.length }} ข้อ</span>
          </div>
          <div class="dimension-hint">อธิบายเหตุผล ให้ข้อสนับสนุน สร้างข้อโต้แย้ง</div>
          <div class="dimension-items">
            <div 
              v-for="(item, index) in structuredAnswer.reasoning" 
              :key="'reasoning-' + index"
              class="dimension-item"
            >
              <span class="item-number">{{ index + 1 }}.</span>
              <input 
                v-model="structuredAnswer.reasoning[index]"
                type="text"
                :class="['item-input', { 'mobile-input': isMobile }]"
                placeholder="เขียนเหตุผลของคุณ..."
                @paste.prevent="handlePaste"
                @contextmenu.prevent="!isMobile"
                :autocorrect="isMobile ? 'on' : 'off'"
                :autocapitalize="isMobile ? 'sentences' : 'off'"
                :spellcheck="isMobile"
                inputmode="text"
              >
              <button 
                @click="removeItem('reasoning', index)" 
                class="item-remove"
                title="ลบข้อนี้"
              >✕</button>
            </div>
          </div>
          <button @click="addItem('reasoning')" class="add-item-btn">
            ➕ เพิ่มเหตุผล
          </button>
        </div>
        
        <!-- Creativity Section -->
        <div class="dimension-section creativity-section">
          <div class="dimension-header">
            <span class="dimension-icon">💡</span>
            <span class="dimension-title">ความคิดสร้างสรรค์ (Creativity)</span>
            <span class="dimension-count">{{ structuredAnswer.creativity.length }} ข้อ</span>
          </div>
          <div class="dimension-hint">เสนอไอเดียใหม่ มุมมองต่าง แนวทางแก้ปัญหาที่แปลกใหม่</div>
          <div class="dimension-items">
            <div 
              v-for="(item, index) in structuredAnswer.creativity" 
              :key="'creativity-' + index"
              class="dimension-item"
            >
              <span class="item-number">{{ index + 1 }}.</span>
              <input 
                v-model="structuredAnswer.creativity[index]"
                type="text"
                :class="['item-input', { 'mobile-input': isMobile }]"
                placeholder="เขียนไอเดียสร้างสรรค์ของคุณ..."
                @paste.prevent="handlePaste"
                @contextmenu.prevent="!isMobile"
                :autocorrect="isMobile ? 'on' : 'off'"
                :autocapitalize="isMobile ? 'sentences' : 'off'"
                :spellcheck="isMobile"
                inputmode="text"
              >
              <button 
                @click="removeItem('creativity', index)" 
                class="item-remove"
                title="ลบข้อนี้"
              >✕</button>
            </div>
          </div>
          <button @click="addItem('creativity')" class="add-item-btn">
            ➕ เพิ่มความคิดสร้างสรรค์
          </button>
        </div>
        
        <!-- Evidence Section -->
        <div class="dimension-section evidence-section">
          <div class="dimension-header">
            <span class="dimension-icon">📚</span>
            <span class="dimension-title">หลักฐาน/ตัวอย่าง (Evidence)</span>
            <span class="dimension-count">{{ structuredAnswer.evidence.length }} ข้อ</span>
          </div>
          <div class="dimension-hint">ยกตัวอย่าง อ้างอิงข้อมูล หลักฐานสนับสนุน</div>
          <div class="dimension-items">
            <div 
              v-for="(item, index) in structuredAnswer.evidence" 
              :key="'evidence-' + index"
              class="dimension-item"
            >
              <span class="item-number">{{ index + 1 }}.</span>
              <input 
                v-model="structuredAnswer.evidence[index]"
                type="text"
                :class="['item-input', { 'mobile-input': isMobile }]"
                placeholder="เขียนหลักฐานหรือตัวอย่างของคุณ..."
                @paste.prevent="handlePaste"
                @contextmenu.prevent="!isMobile"
                :autocorrect="isMobile ? 'on' : 'off'"
                :autocapitalize="isMobile ? 'sentences' : 'off'"
                :spellcheck="isMobile"
                inputmode="text"
              >
              <button 
                @click="removeItem('evidence', index)" 
                class="item-remove"
                title="ลบข้อนี้"
              >✕</button>
            </div>
          </div>
          <button @click="addItem('evidence')" class="add-item-btn">
            ➕ เพิ่มหลักฐาน/ตัวอย่าง
          </button>
        </div>
        
        <!-- Structured Answer Summary -->
        <div class="structured-summary">
          <div class="summary-header">📊 สรุปคำตอบของคุณ</div>
          <div class="summary-stats">
            <span class="stat-item" :class="{ 'has-content': structuredAnswer.analysis.filter(x => x.trim()).length > 0 }">
              🔍 วิเคราะห์: {{ structuredAnswer.analysis.filter(x => x.trim()).length }} ข้อ
            </span>
            <span class="stat-item" :class="{ 'has-content': structuredAnswer.reasoning.filter(x => x.trim()).length > 0 }">
              🧠 เหตุผล: {{ structuredAnswer.reasoning.filter(x => x.trim()).length }} ข้อ
            </span>
            <span class="stat-item" :class="{ 'has-content': structuredAnswer.creativity.filter(x => x.trim()).length > 0 }">
              💡 สร้างสรรค์: {{ structuredAnswer.creativity.filter(x => x.trim()).length }} ข้อ
            </span>
            <span class="stat-item" :class="{ 'has-content': structuredAnswer.evidence.filter(x => x.trim()).length > 0 }">
              📚 หลักฐาน: {{ structuredAnswer.evidence.filter(x => x.trim()).length }} ข้อ
            </span>
          </div>
          <div class="summary-total">
            รวม {{ totalStructuredItems }} ประเด็น ({{ structuredCharCount }} ตัวอักษร)
          </div>
        </div>
      </div>
      
      <div class="input-actions">
        <div v-if="!structuredMode" class="char-count" :class="{ 'warning': inputText.length < 20 && inputText.length > 0 }">
          {{ inputText.length }} ตัวอักษร
          <span v-if="inputText.length < 20 && inputText.length > 0">
            (ต้องการอย่างน้อย 20 ตัวอักษร)
          </span>
        </div>
        <div v-else class="char-count" :class="{ 'warning': structuredCharCount < 20 && structuredCharCount > 0 }">
          {{ structuredCharCount }} ตัวอักษร
          <span v-if="structuredCharCount < 20 && structuredCharCount > 0">
            (ต้องการอย่างน้อย 20 ตัวอักษร)
          </span>
        </div>
        <div class="action-buttons">
          <button 
            v-if="structuredMode"
            @click="clearStructuredAnswer"
            class="btn btn-outline btn-sm"
            :disabled="totalStructuredItems === 0"
          >
            🗑️ ล้างทั้งหมด
          </button>
          <button 
            @click="handleSend" 
            :disabled="(!structuredMode && !inputText.trim()) || (structuredMode && totalStructuredItems === 0) || loading || sendingInProgress"
            class="btn btn-primary send-btn"
          >
            <span v-if="sendingInProgress && retryCount > 0">
              🔄 กำลังลองใหม่ ({{ retryCount }}/{{ MAX_RETRIES }})...
            </span>
            <span v-else-if="sendingInProgress">⏳ กำลังส่ง...</span>
            <span v-else>ส่งคำตอบ 📤</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmation Dialog -->
    <div v-if="showConfirmDialog" class="modal-overlay" @click.self="cancelSend">
      <div class="confirm-dialog card">
        <div class="dialog-header">
          <h3>⚠️ ยืนยันการส่งคำตอบ</h3>
        </div>
        
        <div class="dialog-body">
          <p class="dialog-message">
            คุณต้องการส่งคำตอบนี้หรือไม่? กรุณาตรวจสอบคำตอบของคุณก่อนส่ง
          </p>
          
          <div class="answer-preview">
            <div class="preview-header">📝 คำตอบของคุณ:</div>
            <div class="preview-content">{{ pendingMessage }}</div>
            <div class="preview-stats">
              <span>ความยาว: {{ pendingMessage.length }} ตัวอักษร</span>
              <span>จำนวนคำ: {{ pendingMessage.split(/\s+/).length }} คำ</span>
            </div>
          </div>

          <div class="dialog-tips">
            💡 <strong>เคล็ดลับ:</strong> คำตอบที่ดีควรมี:
            <ul>
              <li>✓ การวิเคราะห์ที่ชัดเจน</li>
              <li>✓ เหตุผลที่สมเหตุสมผล</li>
              <li>✓ ตัวอย่างหรือหลักฐานประกอบ</li>
              <li>✓ ความคิดสร้างสรรค์</li>
            </ul>
          </div>
        </div>

        <div class="dialog-actions">
          <button @click="editMessage" class="btn btn-secondary">
            ✏️ แก้ไขคำตอบ
          </button>
          <button @click="cancelSend" class="btn btn-outline">
            ❌ ยกเลิก
          </button>
          <button @click="sendMessageConfirmed()" class="btn btn-primary">
            ✅ ยืนยันส่ง
          </button>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { useThemeStore } from '@/stores/theme'
import { useGamificationStore } from '@/stores/gamification'
import { useLearningProgressStore } from '@/stores/learningProgress'
import BadgeNotification from '@/components/BadgeNotification.vue'
import PointsNotification from '@/components/PointsNotification.vue'
import ReflectionJournal from '@/components/ReflectionJournal.vue'
import { collection, query, where, getDocs, doc, updateDoc, orderBy, limit } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import { useRateLimiter } from '@/composables/useRateLimiter'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
// 🆕 Anti-Cheat System
import { TypingTracker, createTypingFingerprint, detectTextPatterns, getDeviceInfo, isMobileDevice } from '@/utils/antiCheat'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL
// 🆕 Rate Limiter
const { executeWithLimit, isLimited, errorMessage: rateLimitMessage } = useRateLimiter('assessment')

const chatStore = useChatStore()
const themeStore = useThemeStore()
const gamificationStore = useGamificationStore()
const learningProgress = useLearningProgressStore()

// 🆕 Readiness Check State
const showReadinessModal = ref(false)
const readiness = ref({ ready: true, percent: 100, unitsCompleted: 0, totalUnits: 0, weakLOs: [], message: '' })
const unitProgressList = ref([])
const hasCheckedReadiness = ref(false)

// 🆕 Course Selection State
const showCourseSelectModal = ref(false)
const availableCourses = ref([])
const selectedCourseForChat = ref('')
const courseLoading = ref(false)

// 🆕 Journey Level
const journeyLevel = computed(() => learningProgress.journeySettings?.level || 2)

// 🆕 Sequence Tracking
const sequenceId = ref(null)

const inputText = ref('')
const messagesContainer = ref(null)
const chatTextarea = ref(null)
const sendingInProgress = ref(false)
const lastSendTime = ref(0)
const showConfirmDialog = ref(false)
const pendingMessage = ref('')

// 🆕 Auto-save draft state
// ใช้ทั้ง session-specific key และ user-level key เพื่อกู้คืนได้แม้ session เปลี่ยน
const draftKey = computed(() => `chat_draft_${chatStore.currentSession?.id || 'temp'}`)
const userDraftKey = computed(() => `chat_draft_user_${authStore.user?.uid || 'temp'}`)
const sendError = ref(null)
const retryCount = ref(0)
const MAX_RETRIES = 3

// 🆕 Anti-Cheat: Typing Tracker
const typingTracker = ref(new TypingTracker())
const previousTextValue = ref('')
const antiCheatWarning = ref(null)
const showAntiCheatDialog = ref(false)
const antiCheatAnalysis = ref(null)

// 🆕 Device Detection
const deviceInfo = ref(getDeviceInfo())
const isMobile = computed(() => deviceInfo.value.isMobile || deviceInfo.value.isTablet)

// 🆕 Reflection Journal State
const showReflectionModal = ref(false)
const sessionSummary = ref({
  averageScore: 0,
  questionsAnswered: 0,
  totalPoints: 0
})

// 🤖 Multi-Agent Mode - ดึงจาก Course Setting (ครูตั้งค่า)
const useMultiAgent = computed(() => {
  const courseData = chatStore.currentSession?.courseData
  const mode = courseData?.assessmentMode === 'multi-agent'
  // Debug log
  console.log('🤖 Assessment Mode Check:', {
    hasSession: !!chatStore.currentSession,
    hasCourseData: !!courseData,
    assessmentMode: courseData?.assessmentMode,
    assessmentModeRaw: courseData?.assessmentMode, // เช็คค่าดิบ
    useMultiAgent: mode
  })
  return mode
})

// 🤖 Check if course has assessment mode configured
const hasAssessmentModeConfig = computed(() => {
  const courseData = chatStore.currentSession?.courseData
  return courseData?.assessmentMode !== undefined
})

// 🤖 Assessment Mode Title for tooltip
const assessmentModeTitle = computed(() => {
  if (useMultiAgent.value) {
    return 'Multi-Agent Mode: AI 6 ตัวตรวจสอบข้ามกัน (ครูตั้งค่าที่รายวิชา)'
  }
  return 'Single Agent Mode: AI 1 ตัว (ครูตั้งค่าที่รายวิชา)'
})

// 🆕 Structured Answer Mode
const structuredMode = ref(false)
const structuredAnswer = ref({
  analysis: [''],
  reasoning: [''],
  creativity: [''],
  evidence: ['']
})

// Computed: Total items in structured answer
const totalStructuredItems = computed(() => {
  return structuredAnswer.value.analysis.filter(x => x.trim()).length +
         structuredAnswer.value.reasoning.filter(x => x.trim()).length +
         structuredAnswer.value.creativity.filter(x => x.trim()).length +
         structuredAnswer.value.evidence.filter(x => x.trim()).length
})

// Computed: Total char count in structured answer
const structuredCharCount = computed(() => {
  const allText = [
    ...structuredAnswer.value.analysis,
    ...structuredAnswer.value.reasoning,
    ...structuredAnswer.value.creativity,
    ...structuredAnswer.value.evidence
  ].filter(x => x.trim()).join('')
  return allText.length
})

// 🆕 Adaptive Learning Path State
const activePath = ref(null)
const loadingPath = ref(false)

const messages = computed(() => chatStore.messages)
const assessments = computed(() => chatStore.assessments)
const loading = computed(() => chatStore.loading)
const isDarkMode = computed(() => themeStore.isDarkMode)

// 🆕 Adaptive Path Computed Properties
const currentStepIndex = computed(() => activePath.value?.currentStepIndex || 0)
const pathSteps = computed(() => activePath.value?.pathSteps || [])
const totalSteps = computed(() => pathSteps.value.length)
const completedSteps = computed(() => pathSteps.value.filter(s => s.completed).length)
const currentStep = computed(() => {
  if (currentStepIndex.value < pathSteps.value.length) {
    return pathSteps.value[currentStepIndex.value]
  }
  return null
})

// Initialize session on mount
onMounted(async () => {
  // Check if coming from adaptive learning with query params
  const adaptiveMode = route.query.adaptive === 'true'
  const pathId = route.query.pathId
  
  if (adaptiveMode && pathId) {
    await loadAdaptivePath(pathId)
  }
  
  // 🆕 Check for courseId - Required for proper assessment tracking
  const selectedCourseId = localStorage.getItem('selectedCourseId')
  
  if (!selectedCourseId && !chatStore.currentSession) {
    // No course selected - show course selection modal
    await loadAvailableCourses()
    showCourseSelectModal.value = true
    return // Wait for user to select course
  }
  
  if (!chatStore.currentSession) {
    await chatStore.startSession(selectedCourseId)
  }
  
  // 🆕 Start sequence tracking
  await startSequenceTracking()
  
  // 🆕 Load learning progress and check readiness
  await learningProgress.loadAllProgress()
  await checkAssessmentReadiness()
  
  // If adaptive path is active, handle current step
  if (activePath.value && currentStep.value) {
    await handleCurrentPathStep()
  }
  
  // 🆕 Restore draft from localStorage (ลองทั้ง session key และ user key)
  const savedDraft = localStorage.getItem(draftKey.value) || localStorage.getItem(userDraftKey.value)
  if (savedDraft && savedDraft.trim().length > 0) {
    const preview = savedDraft.length > 100 ? savedDraft.substring(0, 100) + '...' : savedDraft
    const shouldRestore = confirm(
      '📝 พบคำตอบที่ยังไม่ได้ส่ง\n\n' +
      '"' + preview + '"\n\n' +
      'คุณต้องการกู้คืนคำตอบนี้หรือไม่?'
    )
    if (shouldRestore) {
      inputText.value = savedDraft
    } else {
      localStorage.removeItem(draftKey.value)
      localStorage.removeItem(userDraftKey.value)
    }
  }
  
  // 🆕 Mobile Anti-Cheat: Add visibility change listener
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  // 🆕 Log device info for debugging
  console.log('📱 Device Info:', deviceInfo.value)
  
  scrollToBottom()
})

// Clean up on unmount
onUnmounted(() => {
  // 🆕 Remove visibility change listener
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  
  // 🆕 Finalize sequence tracking
  finalizeSequenceTracking()
  
  // 🔧 FIX: Cleanup stores to prevent memory leaks
  chatStore.cleanup()
  gamificationStore.cleanup()
})

// 🆕 Auto-save draft to localStorage whenever inputText changes
// บันทึกทั้ง session-specific และ user-level เพื่อกู้คืนได้แม้ session เปลี่ยน
watch(inputText, (newValue) => {
  if (newValue && newValue.trim().length > 0) {
    localStorage.setItem(draftKey.value, newValue)
    localStorage.setItem(userDraftKey.value, newValue)  // Backup ระดับ user
  } else {
    localStorage.removeItem(draftKey.value)
    localStorage.removeItem(userDraftKey.value)
  }
})

// Auto-scroll when new messages arrive
watch(messages, (newMessages) => {
  // 🔍 Debug: Log message structure to check for scores
  if (newMessages?.length > 0) {
    const feedbackMsgs = newMessages.filter(m => m.type === 'feedback' || m.assessmentId || m.scores)
    console.log('🔍 Messages with feedback/scores:', feedbackMsgs.map(m => ({
      id: m.id,
      type: m.type,
      hasAssessmentId: !!m.assessmentId,
      assessmentId: m.assessmentId,
      hasScores: !!m.scores,
      scores: m.scores
    })))
  }
  nextTick(() => scrollToBottom())
}, { deep: true })

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 🆕 Sequence Tracking Functions
async function startSequenceTracking() {
  try {
    sequenceId.value = `seq_${Date.now()}_${authStore.user?.uid?.slice(-6) || 'anon'}`
    await logSequenceEvent('session_start', {
      sessionId: chatStore.currentSession?.id,
      courseId: chatStore.currentSession?.courseId
    })
  } catch (error) {
    console.warn('Sequence tracking start error:', error)
  }
}

async function logSequenceEvent(eventType, metadata = {}) {
  if (!sequenceId.value || !authStore.user?.uid) return
  
  try {
    await fetch(`${functionsUrl}/logSequenceEventAPI`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sequenceId: sequenceId.value,
        studentId: authStore.user.uid,
        eventType,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      })
    })
  } catch (error) {
    console.warn('Sequence log error:', error)
  }
}

async function finalizeSequenceTracking() {
  if (!sequenceId.value) return
  
  try {
    await fetch(`${functionsUrl}/finalizeSequenceAPI`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sequenceId: sequenceId.value,
        studentId: authStore.user?.uid,
        outcome: {
          totalMessages: messages.value.length,
          assessmentCount: assessments.value.length
        }
      })
    })
  } catch (error) {
    console.warn('Sequence finalize error:', error)
  }
}

function getSenderName(from) {
  const names = {
    'student': 'คุณ',
    'bot': 'AI Assistant',
    'system': 'ระบบ'
  }
  return names[from] || from
}

// 🆕 Assessment Readiness Functions
async function checkAssessmentReadiness() {
  if (hasCheckedReadiness.value) return
  
  const courseId = chatStore.currentSession?.courseId || localStorage.getItem('selectedCourseId')
  if (!courseId) return
  
  // Get readiness from store
  const result = learningProgress.assessmentReadiness(courseId)
  readiness.value = result
  
  // Get unit progress list
  unitProgressList.value = learningProgress.getUnitProgressList(courseId)
  
  hasCheckedReadiness.value = true
  
  // Show readiness modal if not ready and level >= 2
  if (!result.ready && journeyLevel.value >= 2) {
    showReadinessModal.value = true
  } else if (result.softWarning && journeyLevel.value === 1) {
    // Level 1: Just log a soft warning
    console.log('⚠️ Assessment readiness warning:', result.message)
  }
}

const readinessClass = computed(() => {
  if (readiness.value.percent >= 80) return 'high'
  if (readiness.value.percent >= 50) return 'medium'
  return 'low'
})

function getWeakLOLabel(lo) {
  const labels = {
    'analysis': '🔍 การวิเคราะห์',
    'reasoning': '🧠 การให้เหตุผล',
    'creativity': '💡 ความคิดสร้างสรรค์',
    'evidence': '📚 การใช้หลักฐาน'
  }
  return labels[lo] || lo
}

function proceedToAssessment() {
  showReadinessModal.value = false
  
  // Level 3: Pass weak LOs to chat store for adaptive questions
  if (journeyLevel.value >= 3 && readiness.value.weakLOs?.length > 0) {
    const courseId = chatStore.currentSession?.courseId
    if (courseId) {
      const context = learningProgress.getAssessmentContext(courseId)
      chatStore.setAdaptiveContext(context)
    }
  }
}

function proceedAnyway() {
  showReadinessModal.value = false
}

function goToLearningRooms() {
  showReadinessModal.value = false
  router.push('/learning-rooms')
}

// 📚 Course Selection Modal Helpers
async function loadAvailableCourses() {
  courseLoading.value = true
  try {
    const user = authStore.user
    if (!user) return
    
    // Get courses where student is enrolled
    const coursesRef = collection(db, 'courses')
    const snapshot = await getDocs(coursesRef)
    
    availableCourses.value = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(course => {
        // Check if student grade/room matches course target
        const studentGrade = user.grade
        const studentRoom = user.room
        return course.targetGrade === studentGrade || !course.targetGrade
      })
    
    console.log('📚 Available courses:', availableCourses.value.length)
  } catch (error) {
    console.error('Error loading courses:', error)
  } finally {
    courseLoading.value = false
  }
}

async function startChatWithCourse() {
  if (!selectedCourseForChat.value) {
    alert('กรุณาเลือกรายวิชา')
    return
  }
  
  // Save to localStorage
  localStorage.setItem('selectedCourseId', selectedCourseForChat.value)
  console.log('✅ Selected course saved:', selectedCourseForChat.value)
  
  // Close modal
  showCourseSelectModal.value = false
  
  // Start session with selected course
  await chatStore.startSession(selectedCourseForChat.value)
}

function goBackToDashboard() {
  showCourseSelectModal.value = false
  router.push('/student')
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

function getAssessment(assessmentId) {
  if (!assessmentId) return null
  const assessment = assessments.value.find(a => a.id === assessmentId) || null
  // 🔍 Debug: Log assessment to check Multi-Agent fields
  if (assessment) {
    console.log('🔍 Assessment Debug:', {
      id: assessmentId,
      hasAgentDetails: !!assessment.agentDetails,
      assessmentType: assessment.assessmentType,
      multiAgentMode: assessment.multiAgentMode,
      hasMultiAgentMetadata: !!assessment.multiAgentMetadata,
      allKeys: Object.keys(assessment)
    })
  }
  return assessment
}

// 🎯 Score Helpers - Use message.scores as fallback when assessment not loaded yet
function getScoreValue(message, dimension) {
  const assessment = getAssessment(message.assessmentId)
  if (assessment?.rubricScores?.[dimension] !== undefined) {
    return assessment.rubricScores[dimension]
  }
  // Fallback to message.scores if assessment not loaded
  if (message.scores?.[dimension] !== undefined) {
    return message.scores[dimension]
  }
  return 0
}

function getOverallScoreValue(message) {
  const assessment = getAssessment(message.assessmentId)
  if (assessment?.overallScore !== undefined) {
    return assessment.overallScore
  }
  // Calculate from scores if available
  const scores = assessment?.rubricScores || message.scores || {}
  return (scores.analysis || 0) + (scores.reasoning || 0) + (scores.creativity || 0) + (scores.evidence || 0)
}

function getOverallScoreClass(message) {
  const score = getOverallScoreValue(message)
  const percent = (score / 20) * 100
  if (percent >= 80) return 'excellent'
  if (percent >= 60) return 'good'
  if (percent >= 40) return 'fair'
  return 'needs-improvement'
}

function getAssessmentConfidence(assessmentId) {
  const assessment = getAssessment(assessmentId)
  return assessment?.confidence || 0
}

function getConfidenceClassFromValue(confidence) {
  if (confidence >= 80) return 'high'
  if (confidence >= 60) return 'medium'
  return 'low'
}

// 🤖 Single Agent CoT Helper Functions
function hasSingleAgentCoT(assessmentId) {
  const assessment = getAssessment(assessmentId)
  // Must NOT be multi-agent and must have chain of thought
  if (!assessment) return false
  if (assessment.agentDetails || assessment.assessmentType === 'multi-agent') return false
  return assessment.chainOfThought || assessment.cotSteps
}

function getSingleAgentCoT(assessmentId) {
  const assessment = getAssessment(assessmentId)
  if (!assessment) return null
  
  // Handle different formats of CoT data
  if (assessment.chainOfThought) {
    // If it's an object with steps
    if (typeof assessment.chainOfThought === 'object') {
      return assessment.chainOfThought
    }
    // If it's a string, parse into steps
    if (typeof assessment.chainOfThought === 'string') {
      return { analysis: assessment.chainOfThought }
    }
  }
  
  if (assessment.cotSteps) {
    return assessment.cotSteps
  }
  
  return null
}

// 🤖 Multi-Agent Helper Functions
function isAssessmentMultiAgent(assessmentId) {
  const assessment = getAssessment(assessmentId)
  // Check multiple indicators for Multi-Agent mode
  return assessment?.agentDetails || 
         assessment?.assessmentType === 'multi-agent' ||
         assessment?.multiAgentMode === true ||
         assessment?.multiAgentMetadata // ถ้ามี metadata แสดงว่าเป็น multi-agent
}

function getAgentDetails(assessmentId) {
  const assessment = getAssessment(assessmentId)
  return assessment?.agentDetails || null
}

function getMultiAgentMetadata(assessmentId) {
  const assessment = getAssessment(assessmentId)
  return assessment?.multiAgentMetadata || null
}

function getAgentConfidence(assessmentId) {
  const assessment = getAssessment(assessmentId)
  return assessment?.confidence || assessment?.agentDetails?.consensus?.confidence || 0
}

function getConfidenceClass(assessmentId) {
  const confidence = getAgentConfidence(assessmentId)
  if (confidence >= 80) return 'high'
  if (confidence >= 60) return 'medium'
  return 'low'
}

function getConsensusLevel(assessmentId) {
  const assessment = getAssessment(assessmentId)
  return assessment?.agentDetails?.consensus?.consensusLevel || 
         assessment?.multiAgentMetadata?.consensusLevel || 
         'medium'
}

function getConsensusLabel(level) {
  const labels = {
    high: '🟢 High Consensus',
    medium: '🟡 Medium Consensus',
    low: '🔴 Low Consensus'
  }
  return labels[level] || labels.medium
}

function formatChainOfThought(cot) {
  if (!cot) return ''
  if (typeof cot === 'string') return cot
  
  // If COT is an object, format it nicely
  try {
    return Object.entries(cot)
      .map(([key, value]) => {
        const label = key.replace(/_/g, ' ').replace(/step(\d+)/, 'ขั้นตอน $1')
        if (Array.isArray(value)) {
          return `${label}:\n  ${value.join('\n  ')}`
        }
        return `${label}: ${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}`
      })
      .join('\n\n')
  } catch (e) {
    return JSON.stringify(cot, null, 2)
  }
}

function getDimensionLabel(dimension) {
  const labels = {
    analysis: '🔍 วิเคราะห์',
    reasoning: '🧠 เหตุผล',
    creativity: '💡 สร้างสรรค์',
    evidence: '📚 หลักฐาน'
  }
  return labels[dimension] || dimension
}

// 🤖 Get Agent Feedback with smart fallbacks
function getAgentFeedbackFromDetails(agentData) {
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

// 🔧 Helper: Get question text from assessment (support both questionText and questionContext)
function getQuestionText(assessmentId) {
  const assessment = getAssessment(assessmentId)
  if (!assessment) return null
  return assessment.questionText || assessment.questionContext || null
}

// 🔧 Helper: Get student answer from assessment (support multiple field names)
function getStudentAnswer(assessmentId) {
  const assessment = getAssessment(assessmentId)
  if (!assessment) return null
  return assessment.studentAnswer || assessment.rawAnswer || null
}

function hasRefinedScores(assessmentId) {
  const details = getAgentDetails(assessmentId)
  return details?.adversarial?.refinedScores && 
         Object.keys(details.adversarial.refinedScores).length > 0
}

function getOriginalScore(assessmentId, dimension) {
  const details = getAgentDetails(assessmentId)
  // Get score from the original agent for that dimension
  return details?.[dimension]?.score || 0
}

function getScoreChangeClass(assessmentId, dimension) {
  const originalScore = getOriginalScore(assessmentId, dimension)
  const refinedScore = getAgentDetails(assessmentId)?.adversarial?.refinedScores?.[dimension] || 0
  
  if (refinedScore < originalScore) return 'decreased'
  if (refinedScore > originalScore) return 'increased'
  return 'unchanged'
}

function getScoreChangeReason(assessmentId, dimension) {
  // Try to get specific reason from adversarial feedback
  const details = getAgentDetails(assessmentId)
  const adversarial = details?.adversarial
  
  // Check if there are specific dimension feedback in challenges
  if (adversarial?.challenges) {
    const relatedChallenge = adversarial.challenges.find(c => 
      c.toLowerCase().includes(dimension) ||
      c.toLowerCase().includes(getDimensionLabel(dimension).replace(/[🔍🧠💡📚]/g, '').trim())
    )
    if (relatedChallenge) return relatedChallenge
  }
  
  return ''
}

function getBadgeName(badgeId) {
  const badge = gamificationStore.getBadgeById(badgeId)
  return badge ? `${badge.icon} ${badge.name}` : badgeId
}

function formatMessageText(text) {
  if (!text) return ''
  
  // แปลง markdown-like syntax เป็น HTML
  let formatted = text
    // Bold (**text**)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Line breaks
    .replace(/\n/g, '<br>')
    // Numbered lists
    .replace(/^(\d+)\.\s(.+)$/gm, '<div style="margin-left: 1rem;">$1. $2</div>')
    // Separators
    .replace(/^---$/gm, '<hr style="margin: 1rem 0; border-color: var(--border-color);">')
  
  return formatted
}

async function handleSend() {
  // 🆕 Handle Structured Mode
  if (structuredMode.value) {
    await handleStructuredSend()
    return
  }
  
  if (!inputText.value.trim() || loading.value || sendingInProgress.value) return

  const text = inputText.value.trim()
  
  // ตรวจสอบว่าเป็นการขอคำถามใหม่หรือไม่ (ตรวจสอบก่อนเช็คความยาว)
  const isRequestNewQuestion = ['ถัดไป', 'next', 'ต่อไป', 'ข้อถัดไป', 'คำถามใหม่'].some(keyword => 
    text.toLowerCase().includes(keyword)
  )
  
  // ถ้าไม่ใช่การขอคำถามใหม่ ให้ตรวจสอบความยาวขั้นต่ำ
  if (!isRequestNewQuestion) {
    const minLength = 20
    if (text.length < minLength) {
      alert(`⚠️ คำตอบสั้นเกินไป!\n\nกรุณาตอบให้ละเอียดมากกว่านี้ (อย่างน้อย ${minLength} ตัวอักษร)\nปัจจุบัน: ${text.length} ตัวอักษร\n\n💡 หรือพิมพ์ "ถัดไป" เพื่อข้ามไปคำถามถัดไป`)
      return
    }
    
    // 🆕 Anti-Cheat: Validate typing behavior
    const validation = validateTypingBehavior(text)
    
    if (!validation.valid) {
      // Block submission
      showAntiCheatDialog.value = true
      alert(validation.message)
      return
    }
    
    if (validation.warning) {
      // Show warning but allow submission with extra verification
      const proceed = confirm(
        `${validation.message}\n\nคุณยืนยันว่าพิมพ์คำตอบนี้ด้วยตัวเองใช่หรือไม่?`
      )
      if (!proceed) {
        return
      }
    }
  }
  
  // ป้องกันการกดส่งซ้ำๆ ภายใน 2 วินาที (debounce)
  const now = Date.now()
  if (now - lastSendTime.value < 2000) {
    alert('⏳ กรุณารอสักครู่ก่อนส่งข้อความถัดไป')
    return
  }
  
  // ถ้าไม่ใช่การขอคำถามใหม่ ให้แสดง confirmation dialog
  if (!isRequestNewQuestion) {
    pendingMessage.value = text
    showConfirmDialog.value = true
    return
  }
  
  // ถ้าเป็นการขอคำถามใหม่ ส่งเลยและ reset anti-cheat
  resetAntiCheat()
  await sendMessageConfirmed(text, true)
}

// 🆕 Handle Structured Answer Send
async function handleStructuredSend() {
  if (loading.value || sendingInProgress.value) return
  
  // Validate structured answer
  if (totalStructuredItems.value === 0) {
    alert('⚠️ กรุณาเพิ่มคำตอบอย่างน้อย 1 ประเด็น')
    return
  }
  
  if (structuredCharCount.value < 20) {
    alert(`⚠️ คำตอบสั้นเกินไป!\n\nกรุณาตอบให้ละเอียดมากกว่านี้ (อย่างน้อย 20 ตัวอักษร)\nปัจจุบัน: ${structuredCharCount.value} ตัวอักษร`)
    return
  }
  
  // Debounce
  const now = Date.now()
  if (now - lastSendTime.value < 2000) {
    alert('⏳ กรุณารอสักครู่ก่อนส่งข้อความถัดไป')
    return
  }
  
  // Build structured text for preview
  const structuredText = buildStructuredText()
  pendingMessage.value = structuredText
  showConfirmDialog.value = true
}

// 🆕 Build formatted text from structured answer
function buildStructuredText() {
  let text = ''
  
  const analysisItems = structuredAnswer.value.analysis.filter(x => x.trim())
  const reasoningItems = structuredAnswer.value.reasoning.filter(x => x.trim())
  const creativityItems = structuredAnswer.value.creativity.filter(x => x.trim())
  const evidenceItems = structuredAnswer.value.evidence.filter(x => x.trim())
  
  if (analysisItems.length > 0) {
    text += '【การวิเคราะห์】\n'
    analysisItems.forEach((item, i) => {
      text += `${i + 1}. ${item}\n`
    })
    text += '\n'
  }
  
  if (reasoningItems.length > 0) {
    text += '【การให้เหตุผล】\n'
    reasoningItems.forEach((item, i) => {
      text += `${i + 1}. ${item}\n`
    })
    text += '\n'
  }
  
  if (creativityItems.length > 0) {
    text += '【ความคิดสร้างสรรค์】\n'
    creativityItems.forEach((item, i) => {
      text += `${i + 1}. ${item}\n`
    })
    text += '\n'
  }
  
  if (evidenceItems.length > 0) {
    text += '【หลักฐาน/ตัวอย่าง】\n'
    evidenceItems.forEach((item, i) => {
      text += `${i + 1}. ${item}\n`
    })
  }
  
  return text.trim()
}

// 🆕 Add item to a dimension
function addItem(dimension) {
  structuredAnswer.value[dimension].push('')
}

// 🆕 Remove item from a dimension
function removeItem(dimension, index) {
  if (structuredAnswer.value[dimension].length > 1) {
    structuredAnswer.value[dimension].splice(index, 1)
  } else {
    // Keep at least one empty field
    structuredAnswer.value[dimension][0] = ''
  }
}

// 🆕 Clear all structured answer
function clearStructuredAnswer() {
  if (totalStructuredItems.value === 0) return
  
  if (confirm('🗑️ ต้องการล้างคำตอบทั้งหมดหรือไม่?')) {
    structuredAnswer.value = {
      analysis: [''],
      reasoning: [''],
      creativity: [''],
      evidence: ['']
    }
  }
}

async function sendMessageConfirmed(text = null, isRequestNewQuestion = false) {
  const messageText = text || pendingMessage.value
  
  if (!messageText) return
  
  sendingInProgress.value = true
  sendError.value = null
  retryCount.value = 0
  
  // 🆕 Anti-Cheat: Create typing fingerprint to send to server
  const typingFingerprint = !isRequestNewQuestion 
    ? createTypingFingerprint(typingTracker.value) 
    : null
  
  // Save to localStorage as backup before sending
  const backupKey = `chat_backup_${Date.now()}`
  localStorage.setItem(backupKey, messageText)
  
  // Clear input and dialogs
  inputText.value = ''
  showConfirmDialog.value = false
  pendingMessage.value = ''
  lastSendTime.value = Date.now()
  
  // 🆕 Clear structured answer after successful send
  if (structuredMode.value) {
    structuredAnswer.value = {
      analysis: [''],
      reasoning: [''],
      creativity: [''],
      evidence: ['']
    }
  }

  // 🆕 Retry logic with exponential backoff
  const attemptSend = async (attemptNumber = 1) => {
    try {
      // Wrap with rate limiter
      await executeWithLimit(async () => {
        if (isRequestNewQuestion) {
          // 🆕 If in adaptive path mode, move to next step
          if (activePath.value && currentStep.value) {
            await moveToNextPathStep()
          } else {
            // Normal mode: request new question
            await chatStore.requestNewQuestion()
          }
        } else {
          // ส่งคำตอบ พร้อม typing fingerprint และ Multi-Agent mode
          const assessment = await chatStore.sendMessage(messageText, { 
            typingFingerprint,
            useMultiAgent: useMultiAgent.value 
          })
          
          // 🆕 Log assessment event for sequence tracking
          logSequenceEvent('assessment_submitted', {
            assessmentId: assessment?.id,
            overallScore: assessment?.overallScore,
            passedLOs: assessment?.loAssessment?.passedLOs
          })
          
          // 🆕 If in adaptive path and answered a question, update path progress
          if (activePath.value && currentStep.value?.type?.startsWith('question-')) {
            await updatePathProgress(assessment)
          }
        }
      })
      
      // Success - clear backup and draft (ทั้ง session key และ user key), reset anti-cheat
      localStorage.removeItem(backupKey)
      localStorage.removeItem(draftKey.value)
      localStorage.removeItem(userDraftKey.value)
      sendError.value = null
      resetAntiCheat() // Reset tracker for next answer
      
    } catch (error) {
      console.error(`Send attempt ${attemptNumber} failed:`, error)
      retryCount.value = attemptNumber
      
      // 🆕 Check if error is from anti-cheat detection
      if (error.message?.includes('copy-paste') || error.message?.includes('anti-cheat')) {
        sendError.value = '🚨 ตรวจพบการทุจริต: ' + error.message
        inputText.value = messageText // Restore text
        throw error // Don't retry for cheating
      }
      
      // 🆕 Handle Rate Limit errors - don't retry
      if (error.message?.includes('Rate Limit') || error.message?.includes('429') || error.message?.includes('เร็วเกินไป')) {
        sendError.value = '⏳ คุณส่งคำตอบเร็วเกินไป กรุณารอสักครู่แล้วลองใหม่'
        inputText.value = messageText // Restore text
        
        // Show user-friendly rate limit message
        alert(
          '⏳ กรุณารอสักครู่\n\n' +
          'คุณส่งคำตอบเร็วเกินไป ระบบจำกัดการส่งเพื่อป้องกันปัญหา\n\n' +
          '💡 เคล็ดลับ: ใช้เวลาคิดคำตอบให้ดีก่อนส่ง\n\n' +
          'ลองส่งใหม่ได้ใน 1 นาที'
        )
        throw error // Don't retry for rate limit
      }
      
      // Retry up to MAX_RETRIES times
      if (attemptNumber < MAX_RETRIES) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attemptNumber) * 1000
        sendError.value = `เกิดข้อผิดพลาด กำลังลองใหม่... (ครั้งที่ ${attemptNumber}/${MAX_RETRIES})`
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return await attemptSend(attemptNumber + 1)
      } else {
        // All retries failed - restore input and show error
        sendError.value = 'ส่งข้อความไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'
        inputText.value = messageText // Restore text for user to retry
        
        // Keep backup for manual retry
        alert(
          '❌ ไม่สามารถส่งข้อความได้\n\n' +
          'กรุณาตรวจสอบ:\n' +
          '• การเชื่อมต่ออินเทอร์เน็ต\n' +
          '• ความเสถียรของสัญญาณ\n\n' +
          'คำตอบของคุณถูกบันทึกไว้แล้ว คุณสามารถกดส่งอีกครั้งได้เลย'
        )
        throw error
      }
    }
  }

  try {
    await attemptSend()
  } finally {
    sendingInProgress.value = false
  }
}

// 🆕 ADAPTIVE LEARNING PATH FUNCTIONS

async function loadAdaptivePath(pathId) {
  if (!pathId) return
  
  loadingPath.value = true
  try {
    const q = query(
      collection(db, 'learningPaths'),
      where('__name__', '==', pathId)
    )
    const snapshot = await getDocs(q)
    
    if (!snapshot.empty) {
      activePath.value = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      }
    }
  } catch (error) {
    console.error('Error loading adaptive path:', error)
  } finally {
    loadingPath.value = false
  }
}

async function handleCurrentPathStep() {
  if (!currentStep.value) return
  
  const step = currentStep.value
  
  // If current step is a micro-lesson, display it
  if (step.type === 'micro-lesson') {
    const lessonMessage = {
      id: `lesson-${Date.now()}`,
      from: 'system',
      text: `📚 **Micro-Lesson: ${step.title}**\n\n${step.content || ''}\n\n⏱️ Estimated time: ${step.estimatedMinutes || 5} minutes\n\n🎯 Learning Outcome: ${step.loCode} - ${step.loDescription}\n\n---\n\nเมื่อคุณพร้อมแล้ว พิมพ์ "ถัดไป" เพื่อไปยังคำถามถัดไป`,
      timestamp: new Date()
    }
    
    chatStore.messages.push(lessonMessage)
  } 
  // If current step is a question, request appropriate question
  else if (step.type?.startsWith('question-')) {
    // Request question with specific difficulty and related LO
    await chatStore.requestNewQuestion({
      difficulty: step.difficulty,
      relatedLOs: [step.loCode],
      questionType: step.questionType
    })
  }
}

async function moveToNextPathStep() {
  if (!activePath.value) return
  
  const nextIndex = currentStepIndex.value + 1
  
  if (nextIndex >= totalSteps.value) {
    // Path completed!
    alert('🎉 ยินดีด้วย! คุณทำ Learning Path สำเร็จแล้ว!\n\nคุณได้พัฒนาทักษะใน Learning Outcomes ที่อ่อนแล้ว 💪')
    activePath.value = null
    router.push('/adaptive-learning')
    return
  }
  
  // Update path in Firestore
  try {
    const pathRef = doc(db, 'learningPaths', activePath.value.id)
    await updateDoc(pathRef, {
      currentStepIndex: nextIndex
    })
    
    // Update local state
    activePath.value.currentStepIndex = nextIndex
    
    // Handle next step
    await handleCurrentPathStep()
  } catch (error) {
    console.error('Error moving to next step:', error)
    alert('เกิดข้อผิดพลาดในการไปขั้นตอนถัดไป')
  }
}

async function updatePathProgress(assessment) {
  if (!activePath.value || !currentStep.value || !assessment) return
  
  const score = assessment.overallScore || 0
  const stepIndex = currentStepIndex.value
  
  try {
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'http://localhost:5001/hots-ai-chatloop/us-central1'
    const response = await fetch(`${functionsUrl}/updateAdaptivePath`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pathId: activePath.value.id,
        stepIndex: stepIndex,
        completed: true,
        score: score
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      // Update local path state
      pathSteps.value[stepIndex].completed = true
      pathSteps.value[stepIndex].score = score
      
      if (data.shouldLoop) {
        // Loop back notification
        alert(`⚠️ คะแนนยังไม่ผ่านเกณฑ์ (${score}/20)\n\nเราจะวนกลับไปทบทวนเนื้อหาอีกครั้ง เพื่อให้คุณเข้าใจดีขึ้น 💪`)
        
        // Reload path data
        await loadAdaptivePath(activePath.value.id)
        await handleCurrentPathStep()
      } else if (data.status === 'completed') {
        // Path completed!
        alert('🎊 ยินดีด้วย! คุณทำ Adaptive Learning Path สำเร็จครบทุกขั้นตอนแล้ว!\n\nคุณได้พัฒนาทักษะอย่างเห็นได้ชัด! 🏆')
        activePath.value = null
        router.push('/adaptive-learning')
      } else {
        // Move to next step
        await moveToNextPathStep()
      }
    }
  } catch (error) {
    console.error('Error updating path progress:', error)
  }
}

function viewFullPath() {
  router.push('/adaptive-learning')
}

function exitPath() {
  if (confirm('คุณต้องการออกจาก Adaptive Learning Path หรือไม่?\n\nความคืบหน้าของคุณจะถูกบันทึกไว้')) {
    activePath.value = null
    router.push('/adaptive-learning')
  }
}

function cancelSend() {
  showConfirmDialog.value = false
  pendingMessage.value = ''
}

function editMessage() {
  inputText.value = pendingMessage.value
  showConfirmDialog.value = false
  pendingMessage.value = ''
}

async function handleEndSession() {
  if (confirm('คุณต้องการจบการสนทนานี้หรือไม่?')) {
    // Calculate session summary before ending
    await calculateSessionSummary()
    
    // Show reflection modal
    showReflectionModal.value = true
  }
}

async function calculateSessionSummary() {
  try {
    const sessionAssessments = assessments.value.filter(a => 
      a.sessionId === chatStore.currentSession?.id
    )
    
    if (sessionAssessments.length > 0) {
      const totalScore = sessionAssessments.reduce((sum, a) => sum + (a.overallScore || 0), 0)
      const totalPoints = sessionAssessments.reduce((sum, a) => 
        sum + (a.gamification?.pointsEarned || 0), 0
      )
      
      sessionSummary.value = {
        averageScore: Math.round(totalScore / sessionAssessments.length),
        questionsAnswered: sessionAssessments.length,
        totalPoints: totalPoints
      }
    }
  } catch (error) {
    console.error('Error calculating session summary:', error)
  }
}

function onReflectionSaved() {
  // After saving reflection, end session and go to dashboard
  chatStore.endSession()
  router.push('/student')
}

function toggleTheme() {
  themeStore.toggleTheme()
}

// Prevent copy-paste operations
function handlePaste(e) {
  e.preventDefault()
  // 🆕 บันทึก paste event แม้จะ prevent
  typingTracker.value.recordPasteEvent(0)
  
  // ข้อความแตกต่างกันตามอุปกรณ์
  const deviceType = isMobile.value ? 'Mobile' : 'PC'
  alert(`⚠️ ไม่สามารถวางข้อความได้ (${deviceType})\n\nกรุณาพิมพ์ด้วยตนเอง\nระบบจะตรวจสอบรูปแบบการพิมพ์เพื่อความยุติธรรม`)
}

function handleCopy(e) {
  e.preventDefault()
  alert('ไม่สามารถคัดลอกข้อความได้')
}

function handleCut(e) {
  e.preventDefault()
  alert('ไม่สามารถตัดข้อความได้')
}

// 🆕 Anti-Cheat: Track keystrokes (PC)
function handleKeyDown(e) {
  // PC: track keystrokes
  if (!isMobile.value) {
    typingTracker.value.recordKeystroke(e, inputText.value.length)
  }
}

// 🆕 Anti-Cheat: Detect sudden text changes (Both PC & Mobile)
function handleInputChange(e) {
  const newText = e.target.value
  
  // Mobile: ใช้ recordTouchInput แทน recordKeystroke
  if (isMobile.value && e.inputType) {
    typingTracker.value.recordTouchInput(e, newText.length, previousTextValue.value?.length || 0)
  }
  
  const result = typingTracker.value.recordTextChange(newText, previousTextValue.value)
  previousTextValue.value = newText
  
  if (result.suspicious) {
    console.warn('🚨 Suspicious input detected:', result)
    antiCheatWarning.value = {
      type: result.type,
      details: result.details,
      timestamp: Date.now()
    }
  }
}

// 🆕 Mobile: Track focus lost (อาจไปคัดลอกจากที่อื่น)
function handleFocusLost() {
  if (isMobile.value) {
    typingTracker.value.recordFocusLost()
    console.log('📱 Mobile focus lost - tracked')
  }
}

// 📱 Mobile: Handle focus - scroll input into view
function handleMobileFocus() {
  if (isMobile.value && chatTextarea.value) {
    // รอให้ keyboard เปิดก่อนแล้วค่อย scroll
    setTimeout(() => {
      chatTextarea.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
  }
}

// 📱 Mobile: Handle touch start - ensure input is interactive
function handleTouchStart(e) {
  // ไม่ prevent default เพื่อให้ focus และ keyboard ทำงานได้
  if (isMobile.value) {
    console.log('📱 Touch start on textarea')
  }
}

// 🆕 Mobile: Track visibility change (app switching)
function handleVisibilityChange() {
  if (document.hidden && isMobile.value) {
    typingTracker.value.recordAppSwitch()
    console.log('📱 App switch detected')
  }
}

// 🆕 Anti-Cheat: Reset tracker เมื่อเริ่มคำถามใหม่
function resetAntiCheat() {
  typingTracker.value = new TypingTracker() // สร้างใหม่เพื่อ detect device อีกครั้ง
  previousTextValue.value = ''
  antiCheatWarning.value = null
  antiCheatAnalysis.value = null
}

// 🆕 Anti-Cheat: Validate before sending
function validateTypingBehavior(text) {
  const analysis = typingTracker.value.analyze(text)
  antiCheatAnalysis.value = analysis
  
  const deviceType = analysis.deviceInfo?.type || 'unknown'
  
  if (!analysis.isValid) {
    return {
      valid: false,
      message: `⚠️ ตรวจพบพฤติกรรมการพิมพ์ที่ผิดปกติ (${deviceType}):\n\n${analysis.reasons.join('\n')}\n\nกรุณาพิมพ์คำตอบด้วยตนเอง`,
      analysis
    }
  }
  
  if (analysis.suspiciousLevel >= 30) {
    return {
      valid: true,
      warning: true,
      message: `⚠️ พบรูปแบบการพิมพ์ที่น่าสงสัย (${analysis.suspiciousLevel}% - ${deviceType})\n\nคำตอบจะถูกตรวจสอบเพิ่มเติม`,
      analysis
    }
  }
  
  return { valid: true, warning: false, analysis }
}
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  gap: 1rem;
}

.chat-header {
  flex-shrink: 0;
  padding: 1rem 1.5rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* 🆕 Adaptive Path Banner */
.adaptive-path-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.path-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.path-icon {
  font-size: 1.5rem;
}

.path-label {
  font-weight: 600;
  font-size: 1.1rem;
}

.path-progress {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.9rem;
}

.path-actions {
  display: flex;
  gap: 0.5rem;
}

.path-actions .btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.875rem;
}

.path-actions .btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.icon-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: background 0.3s ease;
}

.icon-btn:hover {
  background: var(--bg-secondary);
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.message {
  display: flex;
  max-width: 80%;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-student {
  align-self: flex-end;
}

.message-bot,
.message-system {
  align-self: flex-start;
}

.message-bubble {
  background: var(--bg-primary);
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 2px 4px var(--shadow);
  border: 1px solid var(--border-color);
}

.message-student .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 1rem;
}

.message-sender {
  font-weight: 600;
  font-size: 0.875rem;
}

.message-time {
  font-size: 0.75rem;
  opacity: 0.7;
}

.message-text {
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* LO Target Highlighting in Questions */
.message-bot .message-text strong {
  color: #fbbf24;
  font-weight: 700;
}

.message-bot .message-text em {
  color: #60a5fa;
  font-style: normal;
  background: rgba(96, 165, 250, 0.15);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
}

/* 📋 New Assessment Report Styles */
.assessment-report {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%);
  border-radius: 16px;
  border: 2px solid rgba(59, 130, 246, 0.4);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.assessment-report-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}

.report-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.report-icon {
  font-size: 1.5rem;
}

.report-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  flex: 1;
}

.report-score-badge {
  font-size: 1.5rem;
  font-weight: 800;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.report-score-badge.excellent {
  background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.report-score-badge.good {
  background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
}

.report-score-badge.fair {
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}

.report-score-badge.needs-improvement {
  background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.report-mode-badge {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.mode-multi, .mode-single {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.mode-multi {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
}

.mode-single {
  background: rgba(59, 130, 246, 0.3);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.5);
}

.confidence-pill {
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* Section Styles */
.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.section-icon {
  font-size: 1.1rem;
}

.section-title {
  color: rgba(255, 255, 255, 0.9);
}

/* Question Section */
.assessment-question-section {
  margin-bottom: 1.25rem;
  padding: 1rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 12px;
  border-left: 4px solid #3b82f6;
}

.question-header .section-title {
  color: #93c5fd;
}

.question-content {
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
  font-size: 0.95rem;
}

/* Answer Section */
.assessment-answer-section {
  margin-bottom: 1.25rem;
  padding: 1rem;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 12px;
  border-left: 4px solid #10b981;
}

.answer-header .section-title {
  color: #6ee7b7;
}

.answer-content {
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
  font-size: 0.95rem;
  white-space: pre-wrap;
}

/* Scores Section */
.assessment-scores-section {
  margin-bottom: 1.25rem;
}

.scores-header .section-title {
  color: #c4b5fd;
}

/* Multi-Agent Details Section */
.multi-agent-details-section {
  margin: 1.25rem 0;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  overflow: hidden;
}

.agent-details-summary {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  cursor: pointer;
  font-weight: 600;
  color: #c4b5fd;
  transition: background 0.2s;
}

.agent-details-summary:hover {
  background: rgba(139, 92, 246, 0.15);
}

.summary-icon {
  font-size: 1.1rem;
}

.summary-text {
  flex: 1;
}

.agents-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  padding: 1rem;
}

.agent-detail-card {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.agent-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.agent-card-header.analysis { border-color: rgba(96, 165, 250, 0.5); }
.agent-card-header.reasoning { border-color: rgba(167, 139, 250, 0.5); }
.agent-card-header.creativity { border-color: rgba(244, 114, 182, 0.5); }
.agent-card-header.evidence { border-color: rgba(52, 211, 153, 0.5); }

.agent-icon {
  font-size: 1.1rem;
}

.agent-name {
  flex: 1;
  font-weight: 600;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
}

.agent-score {
  font-weight: 700;
  font-size: 0.9rem;
  color: white;
}

.agent-confidence-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.75rem;
}

.confidence-label {
  color: rgba(255, 255, 255, 0.6);
}

.confidence-bar-bg {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.confidence-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #34d399);
  border-radius: 3px;
}

.confidence-value {
  color: #6ee7b7;
  font-weight: 600;
}

.agent-feedback {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
  margin: 0;
}

/* Adversarial Summary */
.adversarial-summary {
  margin: 1rem;
  padding: 1rem;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 10px;
  border-left: 4px solid #f59e0b;
}

.adversarial-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.adversarial-icon {
  font-size: 1.1rem;
}

.adversarial-title {
  font-weight: 600;
  color: #fbbf24;
}

.adversarial-text {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

/* Feedback Section */
.assessment-feedback-section {
  margin-bottom: 1.25rem;
  padding: 1rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 12px;
}

.feedback-header .section-title {
  color: #93c5fd;
}

.feedback-main-content {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.7;
  font-size: 0.95rem;
}

/* Improvement Section */
.assessment-improvement-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.improvement-box {
  padding: 1rem;
  border-radius: 10px;
}

.improvement-box.strengths {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.improvement-box.weaknesses {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.improvement-box.suggestions {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.improvement-box.empty {
  opacity: 0.6;
}

.improvement-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.improvement-icon {
  font-size: 1rem;
}

.improvement-title {
  font-weight: 600;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
}

.improvement-list {
  margin: 0;
  padding-left: 1.25rem;
  list-style-type: disc;
}

.improvement-list li {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0.25rem;
  line-height: 1.5;
}

.empty-text {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
  margin: 0;
}

/* LO Section */
.assessment-lo-section {
  margin-bottom: 1.25rem;
  padding: 1rem;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 12px;
}

.lo-header .section-title {
  color: #c4b5fd;
}

.lo-passed-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lo-status {
  font-size: 0.85rem;
  font-weight: 600;
}

.lo-status.passed {
  color: #6ee7b7;
}

.lo-status.not-passed {
  color: #fbbf24;
}

.lo-badge.passed {
  padding: 0.25rem 0.6rem;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  border-radius: 12px;
  font-size: 0.8rem;
  color: #6ee7b7;
}

.lo-not-passed {
  text-align: center;
}

.lo-tip {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0.5rem 0 0 0;
}

.lo-analysis-text {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* Gamification Section */
.assessment-gamification-section {
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%);
  border-radius: 10px;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.gamification-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.points-earned {
  font-weight: 700;
  color: #fbbf24;
  font-size: 1rem;
}

.new-badges {
  font-size: 0.85rem;
  color: #fcd34d;
}

/* 🎯 Enhanced Assessment Scores Section (Legacy support) */
.assessment-scores:not(.assessment-report) {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
  border-radius: 12px;
  border: 2px solid rgba(59, 130, 246, 0.4);
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.2);
}

/* Assessment Mode Headers */
.assessment-mode-header {
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.multi-agent-header,
.single-agent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.multi-agent-badge,
.single-agent-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 700;
  font-size: 0.9rem;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

.badge-icon {
  font-size: 1.1rem;
}

.badge-text {
  color: white;
}

.confidence-badge {
  padding: 0.35rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.confidence-badge.high {
  background: rgba(16, 185, 129, 0.3);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.5);
}

.confidence-badge.medium {
  background: rgba(251, 191, 36, 0.3);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.5);
}

.confidence-badge.low {
  background: rgba(239, 68, 68, 0.3);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.5);
}

/* Score Grid with Progress Bars */
.score-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.875rem;
  margin-bottom: 1.25rem;
}

.score-item {
  padding: 0.875rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.score-item:hover {
  background: rgba(0, 0, 0, 0.3);
  transform: translateY(-2px);
}

/* Color coding for dimensions */
.score-item.analysis { border-left: 4px solid #60a5fa; }
.score-item.reasoning { border-left: 4px solid #a78bfa; }
.score-item.creativity { border-left: 4px solid #f472b6; }
.score-item.evidence { border-left: 4px solid #34d399; }

.score-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.score-label {
  font-size: 0.875rem;
  font-weight: 600;
  opacity: 0.95;
}

.score-value {
  font-weight: 800;
  font-size: 1rem;
  color: white;
}

/* Progress Bar Styling */
.score-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.score-item.analysis .score-fill { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
.score-item.reasoning .score-fill { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }
.score-item.creativity .score-fill { background: linear-gradient(90deg, #ec4899, #f472b6); }
.score-item.evidence .score-fill { background: linear-gradient(90deg, #10b981, #34d399); }

/* Overall Score Card */
.overall-score-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 12px;
  font-weight: 700;
  margin-bottom: 1.25rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
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

.overall-score-card.needs-improvement {
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

/* LEGACY: Keep old .overall-score for backward compatibility */
.overall-score {
  text-align: center;
  font-weight: 700;
  font-size: 1.125rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
}

/* 📝 Comprehensive Feedback Section Styles */
.comprehensive-feedback {
  margin-top: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.feedback-main {
  margin-bottom: 1rem;
}

.feedback-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.feedback-icon {
  font-size: 1.25rem;
}

.feedback-title {
  font-weight: 700;
  font-size: 1rem;
  color: #a78bfa;
}

.feedback-content {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  line-height: 1.6;
  color: var(--text-primary, #fff);
  border-left: 4px solid #a78bfa;
}

.feedback-section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.section-icon {
  font-size: 1.1rem;
}

.section-title {
  font-weight: 600;
  font-size: 0.95rem;
}

.feedback-section-header.strengths {
  color: #34d399;
}

.feedback-section-header.weaknesses {
  color: #f59e0b;
}

.feedback-section-header.suggestions {
  color: #60a5fa;
}

.feedback-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem 0;
}

.feedback-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feedback-item:hover {
  transform: translateX(4px);
}

.feedback-item.strength {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.feedback-item.weakness {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.feedback-item.suggestion {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.item-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.item-text {
  flex: 1;
  line-height: 1.5;
  color: var(--text-primary, #fff);
}

.no-feedback-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(148, 163, 184, 0.1);
  border-radius: 8px;
  color: rgba(148, 163, 184, 0.8);
  font-style: italic;
}

.no-feedback-icon {
  font-size: 1.25rem;
}

/* Feedback Section - Light Mode Overrides */
.light-mode .feedback-content,
.light-mode .item-text {
  color: var(--text-primary, #1a1a2e);
}

.light-mode .comprehensive-feedback {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%);
  border-color: rgba(139, 92, 246, 0.2);
}

.light-mode .feedback-content {
  background: rgba(0, 0, 0, 0.03);
}

.light-mode .feedback-item.strength {
  background: rgba(16, 185, 129, 0.1);
}

.light-mode .feedback-item.weakness {
  background: rgba(245, 158, 11, 0.1);
}

.light-mode .feedback-item.suggestion {
  background: rgba(59, 130, 246, 0.1);
}

/* LO Assessment Styles */
.lo-assessment {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(59, 130, 246, 0.15);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.gamification-info {
  margin-top: 1rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%);
  border-radius: 8px;
  border: 1px solid rgba(251, 191, 36, 0.4);
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.points-earned {
  font-weight: 700;
  font-size: 1rem;
  color: #fbbf24;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.new-badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.875rem;
  color: #a78bfa;
}

.badge-mini {
  padding: 0.25rem 0.5rem;
  background: rgba(139, 92, 246, 0.2);
  border-radius: 4px;
  border: 1px solid rgba(139, 92, 246, 0.4);
  font-weight: 600;
}

.lo-header {
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #60a5fa;
}

.lo-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.lo-badge {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.no-lo-passed {
  color: #fbbf24;
  font-style: italic;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.lo-analysis {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.875rem;
  line-height: 1.5;
  opacity: 0.9;
}

/* 🤖 Multi-Agent Assessment Styles */
.multi-agent-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.multi-agent-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(99, 102, 241, 0.2));
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.4);
}

.multi-agent-badge .badge-icon {
  font-size: 1rem;
}

.multi-agent-badge .badge-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: #a78bfa;
}

.confidence-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.confidence-badge.high {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.confidence-badge.medium {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.4);
}

.confidence-badge.low {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

/* Score Items with Progress Bar */
.score-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
}

.score-item .score-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  opacity: 0.9;
}

.score-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.score-bar .score-fill {
  height: 100%;
  background: linear-gradient(90deg, #818cf8, #a78bfa);
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* Multi-Agent Details (Expandable) */
.multi-agent-details {
  margin-top: 1rem;
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
}

.multi-agent-details summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(139, 92, 246, 0.15);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  color: #a78bfa;
  transition: background 0.2s ease;
}

.multi-agent-details summary:hover {
  background: rgba(139, 92, 246, 0.25);
}

.multi-agent-details summary .details-icon {
  font-size: 1rem;
}

.multi-agent-details summary .consensus-badge {
  margin-left: auto;
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
}

.multi-agent-content {
  padding: 1rem;
}

/* Agents Grid */
.agents-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

@media (max-width: 600px) {
  .agents-grid {
    grid-template-columns: 1fr;
  }
}

/* Agent Cards */
.agent-card {
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
}

.agent-card.analysis {
  border-color: rgba(96, 165, 250, 0.3);
  background: rgba(96, 165, 250, 0.1);
}

.agent-card.reasoning {
  border-color: rgba(244, 114, 182, 0.3);
  background: rgba(244, 114, 182, 0.1);
}

.agent-card.creativity {
  border-color: rgba(251, 191, 36, 0.3);
  background: rgba(251, 191, 36, 0.1);
}

.agent-card.evidence {
  border-color: rgba(16, 185, 129, 0.3);
  background: rgba(16, 185, 129, 0.1);
}

.agent-card .agent-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.agent-card .agent-icon {
  font-size: 1.125rem;
}

.agent-card .agent-name {
  flex: 1;
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.9;
}

.agent-card .agent-score {
  font-weight: 700;
  font-size: 0.875rem;
  color: #a78bfa;
}

.agent-card .agent-confidence {
  font-size: 0.7rem;
  opacity: 0.7;
  margin-bottom: 0.375rem;
}

.agent-card .agent-feedback {
  font-size: 0.75rem;
  line-height: 1.4;
  margin: 0;
  opacity: 0.85;
}

/* Chain of Thought */
.chain-of-thought {
  margin-top: 0.5rem;
  font-size: 0.7rem;
}

.chain-of-thought summary {
  cursor: pointer;
  color: #60a5fa;
  padding: 0.25rem 0;
}

.chain-of-thought summary:hover {
  text-decoration: underline;
}

.cot-content {
  margin-top: 0.375rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  font-family: 'Sarabun', monospace;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 150px;
  overflow-y: auto;
  font-size: 0.65rem;
  line-height: 1.4;
}

/* Adversarial Section */
.adversarial-section {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
}

.adversarial-section h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: #f87171;
}

.adversarial-content {
  font-size: 0.8rem;
}

.refined-scores {
  margin-bottom: 0.75rem;
}

.score-adjustments {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-top: 0.5rem;
}

.adjustment-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  flex-wrap: wrap;
}

.adjustment-item .dim-name {
  font-weight: 600;
  min-width: 90px;
}

.adjustment-item .orig-score {
  opacity: 0.6;
}

.adjustment-item .arrow {
  color: #f87171;
}

.adjustment-item .new-score {
  font-weight: 700;
}

.adjustment-item .new-score.decreased {
  color: #f87171;
}

.adjustment-item .new-score.increased {
  color: #34d399;
}

.adjustment-item .new-score.unchanged {
  color: #fbbf24;
}

.adjustment-item .reason {
  flex: 1;
  font-size: 0.7rem;
  opacity: 0.7;
  text-align: right;
}

.challenges-list, .bias-list {
  margin-bottom: 0.75rem;
}

.challenges-list ul, .bias-list ul {
  margin: 0.375rem 0 0 1rem;
  padding: 0;
  list-style-type: disc;
}

.challenges-list li, .bias-list li {
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
}

.bias-list {
  color: #fbbf24;
}

.no-issues {
  color: #34d399;
  font-weight: 500;
}

.adversarial-summary {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  font-size: 0.75rem;
  line-height: 1.4;
  opacity: 0.9;
}

/* Consensus Section */
.consensus-section {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 8px;
}

.consensus-section h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: #34d399;
}

.consensus-content {
  font-size: 0.8rem;
}

.consensus-scores {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.consensus-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.consensus-item .label {
  font-size: 0.75rem;
  opacity: 0.8;
}

.consensus-item .value {
  font-weight: 700;
}

.consensus-level {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
}

.consensus-level.high {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.consensus-level.medium {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.consensus-level.low {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.final-breakdown {
  margin-bottom: 0.75rem;
}

.breakdown-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin-top: 0.375rem;
  font-size: 0.75rem;
}

.consensus-feedback {
  margin: 0.5rem 0 0 0;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  line-height: 1.4;
}

.confidence-reason {
  margin: 0.5rem 0 0 0;
  font-size: 0.7rem;
  opacity: 0.8;
  font-style: italic;
}

/* 🤖 Single Agent Chain-of-Thought Details */
.single-agent-details {
  margin-top: 1rem;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
}

.single-agent-details summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(59, 130, 246, 0.15);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  color: #60a5fa;
  transition: background 0.2s ease;
}

.single-agent-details summary:hover {
  background: rgba(59, 130, 246, 0.25);
}

.cot-content-section {
  padding: 1rem;
}

.cot-steps {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cot-step {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border-left: 3px solid #3b82f6;
}

.cot-step .step-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.cot-step .step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
}

.cot-step .step-title {
  font-weight: 600;
  font-size: 0.8rem;
  color: #93c5fd;
}

.cot-step .step-content {
  font-size: 0.75rem;
  line-height: 1.5;
  margin: 0;
  opacity: 0.9;
  white-space: pre-wrap;
}

/* Processing Metadata */
.processing-meta {
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
}

.typing-indicator {
  display: flex;
  gap: 0.25rem;
  padding: 1rem;
  align-self: flex-start;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: var(--primary);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.input-container {
  flex-shrink: 0;
  padding: 1rem;
  position: relative;
}

/* 🆕 Error Banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1));
  border: 2px solid rgba(239, 68, 68, 0.4);
  border-radius: 10px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.error-text {
  flex: 1;
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.9rem;
}

.error-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.error-close:hover {
  opacity: 1;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  gap: 1rem;
}

.char-count {
  font-size: 0.875rem;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.char-count.warning {
  color: #f59e0b;
  font-weight: 600;
}

.chat-input {
  width: 100%;
  resize: none;
  font-family: inherit;
  font-size: 1rem;
  min-height: 80px;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  background: var(--input-bg, var(--bg-secondary));
  color: var(--text-primary);
  line-height: 1.5;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.chat-input:focus {
  outline: none;
  border-color: var(--primary, #667eea);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.chat-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Mobile-specific input styles */
.chat-input.mobile-input {
  font-size: 16px; /* Prevent iOS zoom on focus */
  -webkit-text-size-adjust: 100%;
  -webkit-appearance: none;
  appearance: none;
  touch-action: manipulation;
  min-height: 120px;
  padding: 1rem;
  /* Allow text selection for cursor positioning */
  -webkit-user-select: text;
  user-select: text;
}

/* Disable text selection styling on mobile */
.chat-input.mobile-input::selection {
  background: var(--primary-color);
  color: white;
}

/* Mobile keyboard-friendly padding */
@media (max-width: 768px) {
  .chat-container {
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
  
  .input-container {
    position: sticky;
    bottom: 0;
    background: var(--card-bg);
    padding: 0.75rem;
    padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0));
    z-index: 100;
    border-top: 1px solid var(--border-color);
  }
  
  .chat-input {
    min-height: 100px;
    padding: 1rem;
    font-size: 16px;
  }
  
  .freeform-input {
    margin-bottom: 0.5rem;
  }
  
  .messages-container {
    padding-bottom: 180px; /* Space for input area */
  }
}

.send-btn {
  padding: 0.875rem 1.5rem;
  white-space: nowrap;
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 1rem;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Confirmation Dialog */
.confirm-dialog {
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dialog-header {
  padding: 1.5rem;
  border-bottom: 2px solid var(--border-color);
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dialog-body {
  padding: 1.5rem;
}

.dialog-message {
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.answer-preview {
  background: rgba(59, 130, 246, 0.1);
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.preview-header {
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #60a5fa;
  font-size: 0.95rem;
}

.preview-content {
  background: rgba(0, 0, 0, 0.2);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
  font-size: 0.95rem;
}

.preview-stats {
  display: flex;
  gap: 1.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.dialog-tips {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(251, 191, 36, 0.15));
  border-left: 4px solid #f59e0b;
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.6;
}

.dialog-tips strong {
  color: #fbbf24;
}

.dialog-tips ul {
  margin: 0.5rem 0 0 0;
  padding-left: 1.5rem;
}

.dialog-tips li {
  margin: 0.25rem 0;
  color: var(--text-primary);
}

.dialog-actions {
  padding: 1rem 1.5rem;
  border-top: 2px solid var(--border-color);
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.btn-outline {
  background: transparent;
  border: 2px solid var(--border-color);
  color: var(--text-primary);
}

.btn-outline:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--primary-color);
}

@media (max-width: 768px) {
  .chat-container {
    padding: 0.5rem;
  }
  
  .message {
    max-width: 90%;
  }
  
  .score-grid {
    grid-template-columns: 1fr;
  }
  
  .header-content h2 {
    font-size: 1.125rem;
  }

  .confirm-dialog {
    max-width: 100%;
    margin: 0.5rem;
  }

  .dialog-actions {
    flex-direction: column;
  }

  .dialog-actions button {
    width: 100%;
  }

  .input-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .char-count {
    text-align: center;
  }
}

/* ==========================================
   🆕 STRUCTURED INPUT STYLES
   ========================================== */

.input-mode-toggle {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.25rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 2px solid var(--border-color);
}

.mode-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.mode-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.mode-btn.active {
  background: linear-gradient(135deg, var(--primary-color), #6366f1);
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

/* Structured Input Container */
.structured-input {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 16px;
  padding: 1.25rem;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Dimension Sections */
.dimension-section {
  margin-bottom: 1.25rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 1rem;
  border-left: 4px solid;
  transition: all 0.2s ease;
}

.dimension-section:hover {
  transform: translateX(4px);
}

.dimension-section.analysis {
  border-left-color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
}

.dimension-section.reasoning {
  border-left-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.08);
}

.dimension-section.creativity {
  border-left-color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.dimension-section.evidence {
  border-left-color: #10b981;
  background: rgba(16, 185, 129, 0.08);
}

.dimension-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.dimension-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.dimension-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.dimension-section.analysis .dimension-title { color: #60a5fa; }
.dimension-section.reasoning .dimension-title { color: #a78bfa; }
.dimension-section.creativity .dimension-title { color: #fbbf24; }
.dimension-section.evidence .dimension-title { color: #34d399; }

.dimension-hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  padding-left: 2.25rem;
  line-height: 1.4;
}

/* Items List */
.dimension-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dimension-item {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  animation: itemSlideIn 0.2s ease;
}

@keyframes itemSlideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

.item-number {
  width: 24px;
  height: 24px;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.item-input {
  flex: 1;
  min-height: 44px;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.95rem;
  resize: vertical;
  transition: all 0.2s ease;
  line-height: 1.4;
}

.item-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.dimension-section.analysis .item-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.dimension-section.reasoning .item-input:focus {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
}

.dimension-section.creativity .item-input:focus {
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
}

.dimension-section.evidence .item-input:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.item-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

/* Mobile-specific item-input styles */
.item-input.mobile-input {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
  -webkit-appearance: none;
  appearance: none;
  touch-action: manipulation;
  -webkit-user-select: text;
  user-select: text;
  padding: 0.875rem 1rem;
  min-height: 44px;
}

.item-remove {
  width: 32px;
  height: 32px;
  min-width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.2s ease;
  margin-top: 0.375rem;
}

.item-remove:hover {
  background: rgba(239, 68, 68, 0.3);
  transform: scale(1.1);
}

/* Add Item Button */
.add-item-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem;
  margin-top: 0.5rem;
  border: 2px dashed var(--border-color);
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-item-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: rgba(99, 102, 241, 0.05);
}

.dimension-section.analysis .add-item-btn:hover {
  border-color: #3b82f6;
  color: #60a5fa;
  background: rgba(59, 130, 246, 0.1);
}

.dimension-section.reasoning .add-item-btn:hover {
  border-color: #8b5cf6;
  color: #a78bfa;
  background: rgba(139, 92, 246, 0.1);
}

.dimension-section.creativity .add-item-btn:hover {
  border-color: #f59e0b;
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.1);
}

.dimension-section.evidence .add-item-btn:hover {
  border-color: #10b981;
  color: #34d399;
  background: rgba(16, 185, 129, 0.1);
}

/* Summary Section */
.structured-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 2px solid var(--border-color);
  margin-top: 0.5rem;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.summary-item .count {
  font-weight: 700;
  padding: 0.125rem 0.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

.summary-item.analysis .count {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.summary-item.reasoning .count {
  background: rgba(139, 92, 246, 0.2);
  color: #a78bfa;
}

.summary-item.creativity .count {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.summary-item.evidence .count {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.summary-total {
  margin-left: auto;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15));
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.summary-total strong {
  color: var(--primary-color);
}

/* Structured Actions */
.structured-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px solid var(--border-color);
}

.btn-clear {
  padding: 0.75rem 1.25rem;
  border: 2px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  background: transparent;
  color: #f87171;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-clear:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.5);
}

.btn-structured-send {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-structured-send:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
}

.btn-structured-send:disabled {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: not-allowed;
  opacity: 0.6;
}

/* Mobile Responsive for Structured Input */
@media (max-width: 768px) {
  .input-mode-toggle {
    flex-direction: column;
  }
  
  .mode-btn {
    padding: 0.625rem;
  }
  
  .structured-input {
    padding: 1rem;
  }
  
  .dimension-section {
    padding: 0.75rem;
  }
  
  .dimension-header {
    flex-wrap: wrap;
  }
  
  .dimension-hint {
    padding-left: 0;
  }
  
  .item-number {
    display: none;
  }
  
  .item-remove {
    width: 28px;
    height: 28px;
    min-width: 28px;
  }
  
  .structured-summary {
    flex-direction: column;
  }
  
  .summary-total {
    margin-left: 0;
  }
  
  .structured-actions {
    flex-direction: column;
  }
  
  .btn-clear {
    justify-content: center;
  }
}

/* 🤖 Assessment Mode Indicator Styles */
.assessment-mode-indicator {
  display: flex;
  align-items: center;
}

.mode-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 1rem;
  white-space: nowrap;
}

.mode-badge.single {
  background: var(--bg-secondary, #f3f4f6);
  color: var(--text-secondary, #6b7280);
  border: 1px solid var(--border-color, #e5e7eb);
}

.mode-badge.multi {
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  color: white;
  border: none;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 4px rgba(99, 102, 241, 0.3); }
  50% { box-shadow: 0 0 12px rgba(168, 85, 247, 0.5); }
}

/* Dark mode support */
.dark-mode .mode-badge.single {
  background: var(--bg-tertiary, #374151);
  color: var(--text-secondary, #9ca3af);
  border-color: var(--border-color, #4b5563);
}

/* ⚠️ Mode Warning indicator */
.mode-warning {
  margin-left: 0.25rem;
  cursor: help;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 📚 Course Selection Modal Styles */
.course-select-modal {
  max-width: 480px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease-out;
}

.course-select-modal h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.course-select-modal p {
  margin: 0 0 1.5rem 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.course-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.course-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--input-bg, #f9fafb);
  border: 2px solid var(--border-color, #e5e7eb);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.course-option:hover {
  border-color: var(--primary-color, #3b82f6);
  background: var(--hover-bg, #f0f9ff);
}

.course-option.selected {
  border-color: var(--primary-color, #3b82f6);
  background: var(--primary-light, #dbeafe);
}

.course-option input[type="radio"] {
  margin-top: 0.25rem;
  width: 18px;
  height: 18px;
  accent-color: var(--primary-color, #3b82f6);
}

.course-info {
  flex: 1;
}

.course-info strong {
  display: block;
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.course-info small {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.course-info .lo-count {
  display: inline-block;
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: var(--badge-bg, #e0f2fe);
  color: var(--badge-text, #0369a1);
  border-radius: 0.5rem;
  font-size: 0.75rem;
}

.course-modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.course-modal-actions .btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.course-modal-actions .btn-secondary {
  background: var(--secondary-bg, #f3f4f6);
  border: 1px solid var(--border-color, #d1d5db);
  color: var(--text-color);
}

.course-modal-actions .btn-secondary:hover {
  background: var(--hover-bg, #e5e7eb);
}

.course-modal-actions .btn-primary {
  background: var(--primary-color, #3b82f6);
  border: none;
  color: white;
}

.course-modal-actions .btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, #2563eb);
}

.course-modal-actions .btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.no-courses {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.no-courses p {
  margin-bottom: 1rem;
}

/* 🆕 Assessment Readiness Modal Styles */
.readiness-modal {
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease-out;
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

.readiness-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.readiness-modal .modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.readiness-modal .close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.25rem;
}

.readiness-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Readiness Circle */
.readiness-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.readiness-circle::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 8px solid var(--border-color);
}

.readiness-circle.high::before {
  border-color: #10b981;
}

.readiness-circle.medium::before {
  border-color: #f59e0b;
}

.readiness-circle.low::before {
  border-color: #ef4444;
}

.circle-content {
  text-align: center;
}

.circle-content .score {
  display: block;
  font-size: 2rem;
  font-weight: 700;
}

.readiness-circle.high .score { color: #10b981; }
.readiness-circle.medium .score { color: #f59e0b; }
.readiness-circle.low .score { color: #ef4444; }

.circle-content .label {
  display: block;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Unit Progress */
.unit-progress-section h4 {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
}

.unit-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.unit-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-size: 0.85rem;
}

.unit-name {
  font-weight: 500;
}

.unit-badges {
  display: flex;
  gap: 0.5rem;
}

.unit-badges .badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.unit-badges .badge.done {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.unit-badges .badge.pending {
  background: rgba(156, 163, 175, 0.15);
  color: #9ca3af;
}

/* Weak LOs */
.weak-los-section h4 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  color: #f59e0b;
}

.weak-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.weak-tag {
  padding: 0.25rem 0.625rem;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 6px;
  font-size: 0.8rem;
  color: #f59e0b;
}

.weak-hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
}

/* Readiness Message */
.readiness-message {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-radius: 10px;
}

.readiness-message.high {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.readiness-message.medium {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.readiness-message.low {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.readiness-message .message-icon {
  font-size: 1.25rem;
}

.readiness-message p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Modal Actions */
.readiness-modal .modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
  justify-content: center;
}

.readiness-modal .btn-lg {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}

.readiness-modal .btn-text {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
}

.readiness-modal .btn-text:hover {
  color: var(--text-primary);
}
</style>
