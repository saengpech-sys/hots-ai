<template>
  <ErrorBoundary context="WorksheetForm">
  <div class="worksheet-form-view">
    <!-- Top Navigation -->
    <nav class="top-navbar">
      <div class="nav-brand">
        <router-link :to="backRoute" class="back-link">
          <span class="material-icons">arrow_back</span>
        </router-link>
        <span class="brand-icon">📝</span>
        <span class="brand-text">{{ worksheet?.title || 'ใบงาน' }}</span>
      </div>
      <div class="nav-actions">
        <div class="timer" v-if="timeRemaining !== null">
          <span class="material-icons">timer</span>
          <span>{{ formatTime(timeRemaining) }}</span>
        </div>
        <div class="progress-indicator">
          <span>{{ answeredCount }}/{{ totalQuestions }}</span>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <LoadingSpinner />
      <p>กำลังโหลดใบงาน...</p>
    </div>

    <!-- Worksheet Content -->
    <div v-else-if="worksheet" class="worksheet-container">
      <!-- Retry Status Banner -->
      <div v-if="previousSubmissions.length > 0" class="retry-status-banner">
        <div class="retry-info">
          <span class="material-icons">history</span>
          <div class="retry-details">
            <span class="attempt-count">
              ครั้งที่ {{ attemptCount + 1 }} / {{ worksheet.retrySettings?.maxAttempts || '∞' }}
            </span>
            <span v-if="bestScore !== null" class="best-score">
              คะแนนดีที่สุด: {{ bestScore?.toFixed(1) || '-' }} / {{ totalMaxScore }}
            </span>
          </div>
        </div>
        <div class="retry-actions">
          <router-link :to="`/worksheet-history/${worksheet.id}`" class="btn btn-sm btn-outline">
            <span class="material-icons">timeline</span>
            ดูประวัติ
          </router-link>
        </div>
      </div>

      <!-- 🆕 Edit Previous Answer Banner -->
      <div v-if="previousSubmissions.length > 0 && canEdit && !isEditMode" class="edit-answer-banner">
        <div class="edit-info">
          <span class="material-icons">edit_note</span>
          <div class="edit-details">
            <span class="edit-title">✏️ แก้ไขคำตอบเดิม</span>
            <span class="edit-remaining">
              เหลือสิทธิ์แก้ไขอีก {{ getRemainingEdits() }} ครั้ง (จากทั้งหมด {{ MAX_EDIT_COUNT }} ครั้ง)
            </span>
          </div>
        </div>
        <button class="btn btn-sm btn-warning" @click="loadPreviousAnswers">
          <span class="material-icons">restore</span>
          ดึงคำตอบเดิมมาแก้ไข
        </button>
      </div>

      <!-- Edit Mode Active Banner -->
      <div v-if="isEditMode" class="edit-mode-banner">
        <span class="material-icons">edit</span>
        <div>
          <strong>🔄 กำลังแก้ไขคำตอบ</strong>
          <p>ครั้งที่ {{ editCount + 1 }}/{{ MAX_EDIT_COUNT }} • แก้ไขแล้วกดส่งใหม่</p>
        </div>
      </div>

      <!-- Max Edit Reached Warning -->
      <div v-if="!canEdit && previousSubmissions.length > 0" class="max-edit-warning">
        <span class="material-icons">block</span>
        <div>
          <strong>แก้ไขครบจำนวนแล้ว</strong>
          <p>คุณใช้สิทธิ์แก้ไขคำตอบครบ {{ MAX_EDIT_COUNT }} ครั้งแล้ว</p>
        </div>
      </div>

      <!-- Cooldown Warning -->
      <div v-if="!canRetry && cooldownRemaining > 0" class="cooldown-warning">
        <span class="material-icons">hourglass_top</span>
        <div>
          <strong>กรุณารอก่อนทำใหม่</strong>
          <p>เหลือเวลา: {{ formatCooldown(cooldownRemaining) }}</p>
        </div>
      </div>

      <!-- Max Attempts Warning -->
      <div v-if="!canRetry && cooldownRemaining === 0 && attemptCount >= (worksheet.retrySettings?.maxAttempts || 999)" class="max-attempts-warning">
        <span class="material-icons">block</span>
        <div>
          <strong>ทำครบจำนวนครั้งแล้ว</strong>
          <p>คุณใช้สิทธิ์ทำใบงานนี้ครบ {{ attemptCount }} ครั้งแล้ว</p>
          <router-link :to="`/worksheet-history/${worksheet.id}`" class="btn btn-sm btn-primary mt-2">
            ดูประวัติการทำ
          </router-link>
        </div>
      </div>

      <!-- Previous Score Display -->
      <div v-if="previousSubmissions.length > 0 && canRetry && worksheet.retrySettings?.showPreviousScore" class="previous-score-card">
        <h4>📊 คะแนนครั้งล่าสุด</h4>
        <div class="score-summary">
          <div class="score-item">
            <span class="score-value">{{ previousSubmissions[0]?.assessment?.totalScore?.toFixed(1) || '-' }}</span>
            <span class="score-label">คะแนน</span>
          </div>
          <div class="score-item" v-if="previousSubmissions[0]?.assessment?.percentage != null">
            <span class="score-value">{{ previousSubmissions[0]?.assessment?.percentage?.toFixed(0) || '-' }}%</span>
            <span class="score-label">เปอร์เซ็นต์</span>
          </div>
          <div class="score-item" v-if="worksheet.retrySettings?.scoreMode">
            <span class="score-mode-badge">
              {{ worksheet.retrySettings.scoreMode === 'best' ? '🏆 เก็บคะแนนดีที่สุด' : 
                 worksheet.retrySettings.scoreMode === 'latest' ? '📝 เก็บคะแนนล่าสุด' :
                 worksheet.retrySettings.scoreMode === 'average' ? '📊 เก็บค่าเฉลี่ย' : '1️⃣ เก็บครั้งแรก' }}
            </span>
          </div>
        </div>
        <div v-if="worksheet.retrySettings?.showPreviousFeedback && previousSubmissions[0]?.assessment?.feedback" class="previous-feedback">
          <strong>💡 คำแนะนำจากครั้งก่อน:</strong>
          <p>{{ previousSubmissions[0].assessment.feedback }}</p>
        </div>
      </div>

      <!-- Worksheet Header -->
      <header class="worksheet-header">
        <div class="ws-meta">
          <h1>{{ worksheet.title }}</h1>
          <p class="ws-description">{{ worksheet.description }}</p>
          <div class="ws-tags">
            <span class="tag phase-tag">{{ getPhaseLabel(worksheet.phase) }}</span>
            <span v-for="arce in worksheet.arceFocus" :key="arce" :class="['tag', 'arce-tag', arce]">
              {{ getArceIcon(arce) }} {{ getArceLabel(arce) }}
            </span>
          </div>
        </div>
        <div class="ws-info">
          <p><strong>รายวิชา:</strong> {{ worksheet.courseName || worksheet.metadata?.courseName }}</p>
          <p><strong>ระดับชั้น:</strong> {{ worksheet.gradeLevel || worksheet.metadata?.gradeLevel }}</p>
          <p><strong>เวลาที่ใช้:</strong> {{ worksheet.duration || worksheet.metadata?.duration || 50 }} นาที</p>
        </div>
      </header>

      <!-- Instructions -->
      <section class="instructions-section" v-if="worksheet.instructions">
        <h3>📋 คำชี้แจง</h3>
        <p>{{ worksheet.instructions }}</p>
      </section>

      <!-- Form Sections -->
      <form v-if="canRetry || previousSubmissions.length === 0" @submit.prevent="submitWorksheet" class="worksheet-form">
        <div v-for="(section, sIdx) in worksheet.sections" :key="section.id || sIdx" class="form-section">
          <div class="section-header">
            <h3>{{ section.title }}</h3>
            <p v-if="section.description" class="section-desc">{{ section.description }}</p>
            <div class="section-arce" v-if="section.arceFocus">
              <span v-for="arce in (Array.isArray(section.arceFocus) ? section.arceFocus : [section.arceFocus])" 
                    :key="arce" 
                    :class="['arce-mini', arce]">
                {{ getArceIcon(arce) }}
              </span>
            </div>
          </div>

          <!-- Questions -->
          <div v-for="(question, qIdx) in section.questions" 
               :key="question.id || qIdx" 
               class="question-block"
               :class="{ 'answered': isAnswered(section.id, question.id) }">
            
            <div class="question-header">
              <span class="question-number">{{ question.number || qIdx + 1 }}</span>
              <span class="question-type-badge" :class="question.type">{{ getQuestionTypeLabel(question.type) }}</span>
              <span v-if="question.required" class="required-badge">*จำเป็น</span>
              <span class="question-points">{{ question.maxScore || question.points || 5 }} คะแนน</span>
            </div>

            <div class="question-content">
              <!-- ARCE Situation Question Type -->
              <template v-if="question.type === 'arce_situation'">
                <div class="arce-situation-container">
                  <!-- Situation -->
                  <div class="situation-box">
                    <div class="situation-header">
                      <span class="situation-icon">📋</span>
                      <span class="situation-label">สถานการณ์</span>
                    </div>
                    <div class="situation-content">{{ question.situation }}</div>
                  </div>

                  <!-- Task -->
                  <div class="task-box">
                    <div class="task-header">
                      <span class="task-icon">🎯</span>
                      <span class="task-label">ภารกิจ</span>
                    </div>
                    <div class="task-content">{{ question.task }}</div>
                  </div>

                  <!-- Answer Guide -->
                  <div v-if="question.answerGuide" class="answer-guide-box">
                    <div class="answer-guide-header">
                      <span class="guide-icon">💡</span>
                      <span class="guide-label">แนวทางการตอบ</span>
                    </div>
                    <div class="answer-guide-content">{{ question.answerGuide }}</div>
                  </div>

                  <!-- ARCE Response Areas -->
                  <div class="arce-response-areas">
                    <h4 class="arce-response-title">✍️ เขียนคำตอบของคุณ (ให้ครบทั้ง 4 ด้าน)</h4>
                    
                    <div class="arce-section analysis-section">
                      <div class="arce-section-header">
                        <span class="arce-icon">🔍</span>
                        <span class="arce-label">A - Analysis (การวิเคราะห์)</span>
                      </div>
                      <p class="arce-hint">วิเคราะห์สถานการณ์: แยกแยะประเด็น หาความสัมพันธ์ ระบุสิ่งสำคัญ</p>
                      <textarea 
                        v-model="arceAnswers[`${section.id}_${question.id}_analysis`]"
                        placeholder="เขียนการวิเคราะห์ของคุณ..."
                        :rows="isMobile ? 4 : 3"
                        @paste.prevent="blockPaste"
                        @copy.prevent="blockCopy"
                        @cut.prevent="blockCut"
                        @drop.prevent="blockDrop"
                        @dragover.prevent
                        @contextmenu.prevent="!isMobile"
                        :class="['arce-textarea', { 'mobile-textarea': isMobile }]"
                        autocomplete="off"
                        :spellcheck="isMobile"
                        :autocorrect="isMobile ? 'on' : 'off'"
                        :autocapitalize="isMobile ? 'sentences' : 'off'"
                        inputmode="text"
                      ></textarea>
                    </div>

                    <div class="arce-section reasoning-section">
                      <div class="arce-section-header">
                        <span class="arce-icon">🧠</span>
                        <span class="arce-label">R - Reasoning (การให้เหตุผล)</span>
                      </div>
                      <p class="arce-hint">อธิบายเหตุผล: อ้างหลักการ ทฤษฎี กฎเกณฑ์ที่เกี่ยวข้อง</p>
                      <textarea 
                        v-model="arceAnswers[`${section.id}_${question.id}_reasoning`]"
                        placeholder="เขียนเหตุผลและหลักการของคุณ..."
                        :rows="isMobile ? 4 : 3"
                        @paste.prevent="blockPaste"
                        @copy.prevent="blockCopy"
                        @cut.prevent="blockCut"
                        @drop.prevent="blockDrop"
                        @dragover.prevent
                        @contextmenu.prevent="!isMobile"
                        :class="['arce-textarea', { 'mobile-textarea': isMobile }]"
                        autocomplete="off"
                        :spellcheck="isMobile"
                        :autocorrect="isMobile ? 'on' : 'off'"
                        :autocapitalize="isMobile ? 'sentences' : 'off'"
                        inputmode="text"
                      ></textarea>
                    </div>

                    <div class="arce-section creativity-section">
                      <div class="arce-section-header">
                        <span class="arce-icon">💡</span>
                        <span class="arce-label">C - Creativity (ความคิดสร้างสรรค์)</span>
                      </div>
                      <p class="arce-hint">นำเสนอแนวคิด: เสนอวิธีการ ออกแบบ หรือสร้างสรรค์สิ่งใหม่</p>
                      <textarea 
                        v-model="arceAnswers[`${section.id}_${question.id}_creativity`]"
                        placeholder="เขียนแนวคิดสร้างสรรค์ของคุณ..."
                        :rows="isMobile ? 4 : 3"
                        @paste.prevent="blockPaste"
                        @copy.prevent="blockCopy"
                        @cut.prevent="blockCut"
                        @drop.prevent="blockDrop"
                        @dragover.prevent
                        @contextmenu.prevent="!isMobile"
                        :class="['arce-textarea', { 'mobile-textarea': isMobile }]"
                        autocomplete="off"
                        :spellcheck="isMobile"
                        :autocorrect="isMobile ? 'on' : 'off'"
                        :autocapitalize="isMobile ? 'sentences' : 'off'"
                        inputmode="text"
                      ></textarea>
                    </div>

                    <div class="arce-section evidence-section">
                      <div class="arce-section-header">
                        <span class="arce-icon">📚</span>
                        <span class="arce-label">E - Evidence (หลักฐาน)</span>
                      </div>
                      <p class="arce-hint">แสดงหลักฐาน: ยกตัวอย่าง แสดงข้อมูล ผลลัพธ์ที่สนับสนุน</p>
                      <textarea 
                        v-model="arceAnswers[`${section.id}_${question.id}_evidence`]"
                        placeholder="เขียนหลักฐานและตัวอย่างของคุณ..."
                        :rows="isMobile ? 4 : 3"
                        @paste.prevent="blockPaste"
                        @copy.prevent="blockCopy"
                        @cut.prevent="blockCut"
                        @drop.prevent="blockDrop"
                        @dragover.prevent
                        @contextmenu.prevent="!isMobile"
                        :class="['arce-textarea', { 'mobile-textarea': isMobile }]"
                        autocomplete="off"
                        :spellcheck="isMobile"
                        :autocorrect="isMobile ? 'on' : 'off'"
                        :autocapitalize="isMobile ? 'sentences' : 'off'"
                        inputmode="text"
                      ></textarea>
                    </div>
                  </div>

                  <!-- ARCE Progress -->
                  <div class="arce-progress">
                    <span class="progress-label">ความครบถ้วน:</span>
                    <div class="progress-items">
                      <span :class="['progress-item', { filled: arceAnswers[`${section.id}_${question.id}_analysis`]?.length >= 20 }]">A</span>
                      <span :class="['progress-item', { filled: arceAnswers[`${section.id}_${question.id}_reasoning`]?.length >= 20 }]">R</span>
                      <span :class="['progress-item', { filled: arceAnswers[`${section.id}_${question.id}_creativity`]?.length >= 20 }]">C</span>
                      <span :class="['progress-item', { filled: arceAnswers[`${section.id}_${question.id}_evidence`]?.length >= 20 }]">E</span>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Regular question types -->
              <template v-else>
                <p class="question-text">{{ question.prompt || question.question }}</p>
              
                <!-- Context/Case Study -->
                <div v-if="question.context" class="question-context">
                  <div class="context-label">📖 กรณีศึกษา / บริบท</div>
                  <div class="context-content">{{ question.context }}</div>
                </div>
              </template>

              <!-- Media -->
              <div v-if="question.media" class="question-media">
                <img v-if="question.media.type === 'image'" :src="question.media.url" :alt="question.media.caption" />
                <video v-else-if="question.media.type === 'video'" :src="question.media.url" controls />
                <p v-if="question.media.caption" class="media-caption">{{ question.media.caption }}</p>
              </div>
            </div>

            <!-- Answer Input based on question type -->
            <div class="answer-input">
              <!-- Open-ended / Long text -->
              <template v-if="question.type === 'open_ended' || question.type === 'long_text'">
                <textarea 
                  v-model="answers[`${section.id}_${question.id}`]"
                  :placeholder="question.placeholder || 'พิมพ์คำตอบของคุณที่นี่...'"
                  :minlength="question.minCharacters || 20"
                  :rows="isMobile ? 8 : (question.rows || 6)"
                  @paste.prevent="blockPaste"
                  @copy.prevent="blockCopy"
                  @cut.prevent="blockCut"
                  @drop.prevent="blockDrop"
                  @dragover.prevent
                  @contextmenu.prevent="!isMobile"
                  :class="['textarea-answer', { 'mobile-textarea': isMobile }]"
                  autocomplete="off"
                  :spellcheck="isMobile"
                  :autocorrect="isMobile ? 'on' : 'off'"
                  :autocapitalize="isMobile ? 'sentences' : 'off'"
                  inputmode="text"
                ></textarea>
                <div class="char-count">
                  {{ (answers[`${section.id}_${question.id}`] || '').length }} / {{ question.minCharacters || 20 }} ตัวอักษรขั้นต่ำ
                </div>
              </template>

              <!-- Short text -->
              <template v-else-if="question.type === 'short_text'">
                <input 
                  type="text"
                  v-model="answers[`${section.id}_${question.id}`]"
                  :placeholder="question.placeholder || 'คำตอบ'"
                  @paste.prevent="blockPaste"
                  @copy.prevent="blockCopy"
                  @cut.prevent="blockCut"
                  @drop.prevent="blockDrop"
                  @dragover.prevent
                  @contextmenu.prevent="!isMobile"
                  :class="['input-answer', { 'mobile-input': isMobile }]"
                  autocomplete="off"
                  :autocorrect="isMobile ? 'on' : 'off'"
                  :autocapitalize="isMobile ? 'sentences' : 'off'"
                  inputmode="text"
                />
              </template>

              <!-- Multiple Choice (Single) -->
              <template v-else-if="question.type === 'multiple_choice' || question.type === 'single_choice'">
                <div class="options-list">
                  <label v-for="(option, oIdx) in shuffledOptions(question)" 
                         :key="option.id || oIdx" 
                         class="option-item"
                         :class="{ 'selected': answers[`${section.id}_${question.id}`] === option.id }">
                    <input 
                      type="radio" 
                      :name="`q_${section.id}_${question.id}`"
                      :value="option.id"
                      v-model="answers[`${section.id}_${question.id}`]"
                    />
                    <span class="option-label">{{ option.text }}</span>
                  </label>
                </div>
              </template>

              <!-- Multi-select -->
              <template v-else-if="question.type === 'multi_choice' || question.type === 'checkbox'">
                <div class="options-list multi">
                  <label v-for="(option, oIdx) in question.options" 
                         :key="option.id || oIdx" 
                         class="option-item"
                         :class="{ 'selected': (answers[`${section.id}_${question.id}`] || []).includes(option.id) }">
                    <input 
                      type="checkbox" 
                      :value="option.id"
                      v-model="answers[`${section.id}_${question.id}`]"
                    />
                    <span class="option-label">{{ option.text }}</span>
                  </label>
                </div>
              </template>

              <!-- Rating Scale -->
              <template v-else-if="question.type === 'rating_scale'">
                <div class="rating-scale">
                  <span class="scale-label">{{ question.scaleMin || 'น้อยที่สุด' }}</span>
                  <div class="scale-options">
                    <label v-for="n in (question.scaleMax || 5)" :key="n" class="scale-item">
                      <input type="radio" :name="`q_${section.id}_${question.id}`" :value="n" v-model="answers[`${section.id}_${question.id}`]" />
                      <span class="scale-number">{{ n }}</span>
                    </label>
                  </div>
                  <span class="scale-label">{{ question.scaleMaxLabel || 'มากที่สุด' }}</span>
                </div>
              </template>

              <!-- File Upload -->
              <template v-else-if="question.type === 'file_upload'">
                <div class="file-upload-area">
                  <input type="file" :accept="question.acceptedTypes || 'image/*,.pdf'" @change="handleFileUpload($event, section.id, question.id)" />
                  <div v-if="fileUploads[`${section.id}_${question.id}`]" class="uploaded-file">
                    📎 {{ fileUploads[`${section.id}_${question.id}`].name }}
                  </div>
                </div>
              </template>

              <!-- Table Input -->
              <template v-else-if="question.type === 'table' && question.table">
                <div class="table-input">
                  <table>
                    <thead>
                      <tr>
                        <th v-for="h in question.table.headers" :key="h">{{ h }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="rowIdx in question.table.rows" :key="rowIdx">
                        <td v-for="(h, colIdx) in question.table.headers" :key="h">
                          <input 
                            type="text" 
                            v-model="tableAnswers[`${section.id}_${question.id}_${rowIdx}_${colIdx}`]"
                            class="table-cell-input"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>

              <!-- Default: Text area (but NOT for arce_situation which has its own inputs) -->
              <template v-else-if="question.type !== 'arce_situation'">
                <textarea 
                  v-model="answers[`${section.id}_${question.id}`]"
                  placeholder="พิมพ์คำตอบของคุณ..."
                  rows="4"
                  @paste.prevent="blockPaste"
                  @copy.prevent="blockCopy"
                  @cut.prevent="blockCut"
                  @drop.prevent="blockDrop"
                  @dragover.prevent
                  @contextmenu.prevent
                  class="textarea-answer no-select"
                  autocomplete="off"
                ></textarea>
              </template>
            </div>

            <!-- Hints (Scaffolding) -->
            <div v-if="question.hints && showHints[`${section.id}_${question.id}`]" class="question-hints">
              <div class="hint-toggle" @click="toggleHint(section.id, question.id)">
                <span class="material-icons">lightbulb</span>
                <span>{{ hintsVisible[`${section.id}_${question.id}`] ? 'ซ่อนคำแนะนำ' : 'ดูคำแนะนำ' }}</span>
              </div>
              <div v-if="hintsVisible[`${section.id}_${question.id}`]" class="hints-content">
                <p v-for="(hint, hIdx) in (Array.isArray(question.hints) ? question.hints : [question.hints])" :key="hIdx">
                  💡 {{ hint }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Self Reflection Section -->
        <section v-if="worksheet.selfReflection" class="reflection-section">
          <h3>🪞 การสะท้อนตนเอง</h3>
          <p class="reflection-prompt">{{ worksheet.selfReflection.prompt || 'สิ่งที่ได้เรียนรู้จากใบงานนี้คือ...' }}</p>
          <textarea 
            v-model="selfReflection"
            placeholder="เขียนสะท้อนความคิดของคุณ..."
            rows="4"
            @paste.prevent="blockPaste"
            @copy.prevent="blockCopy"
            @cut.prevent="blockCut"
            @drop.prevent="blockDrop"
            @dragover.prevent
            @contextmenu.prevent
            class="no-select"
            autocomplete="off"
          ></textarea>
        </section>

        <!-- Submit Section -->
        <div class="submit-section">
          <div class="submit-warning" v-if="!canSubmit">
            <span class="material-icons">warning</span>
            <span>กรุณาตอบคำถามที่จำเป็น (*) ให้ครบก่อนส่ง</span>
          </div>
          <div class="submit-actions">
            <button type="button" class="btn btn-outline" @click="saveDraft">
              <span class="material-icons">save</span>
              บันทึกฉบับร่าง
            </button>
            <button type="submit" class="btn btn-primary btn-lg" :disabled="!canSubmit || submitting">
              <span class="material-icons">{{ submitting ? 'hourglass_empty' : 'send' }}</span>
              {{ submitting ? 'กำลังส่ง...' : 'ส่งใบงาน' }}
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- Error State -->
    <div v-else class="error-container">
      <span class="material-icons">error_outline</span>
      <p>ไม่พบใบงานที่ต้องการ</p>
      <router-link :to="backRoute" class="btn btn-primary">กลับหน้าหลัก</router-link>
    </div>

    <!-- AI Feedback Modal -->
    <div v-if="showFeedbackModal" class="modal-overlay" @click.self="closeFeedbackModal">
      <div class="modal-content feedback-modal">
        <div class="modal-header">
          <h2>📊 ผลการประเมินใบงาน</h2>
          <button class="btn-close" @click="closeFeedbackModal">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body" v-if="assessmentResult">
          <!-- Overall Score -->
          <div class="overall-score">
            <div class="score-circle" :class="getScoreClass(assessmentResult?.summary?.percentage || 0)">
              <span class="score-value">{{ (assessmentResult?.summary?.percentage ?? 0).toFixed(0) }}%</span>
              <span class="score-label">คะแนนรวม</span>
            </div>
            <div class="score-breakdown">
              <p><strong>{{ assessmentResult?.summary?.totalScore ?? 0 }}</strong> / {{ assessmentResult?.summary?.maxScore ?? 0 }} คะแนน</p>
              <p class="pa-level">ระดับ PA: {{ assessmentResult?.summary?.paLevel || '-' }}</p>
            </div>
          </div>

          <!-- A.R.C.E. Scores -->
          <div class="arce-scores" v-if="assessmentResult?.arceScores">
            <h3>คะแนน A.R.C.E.</h3>
            <div class="arce-grid">
              <template v-for="key in arceOrder" :key="key">
                <div v-if="assessmentResult.arceScores?.[key]" class="arce-item" :class="key">
                  <div class="arce-icon">{{ getArceIcon(key) }}</div>
                  <div class="arce-name">{{ getArceLabel(key) }}</div>
                  <div class="arce-score">{{ (assessmentResult.arceScores[key]?.weighted ?? assessmentResult.arceScores[key]?.raw ?? 0).toFixed(1) }} / {{ assessmentResult.arceScores[key]?.max ?? 5 }}</div>
                  <div class="arce-bar">
                    <div class="arce-fill" :style="{ width: ((assessmentResult.arceScores[key]?.weighted ?? assessmentResult.arceScores[key]?.raw ?? 0) / (assessmentResult.arceScores[key]?.max ?? 5) * 100) + '%' }"></div>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- Strengths & Weaknesses -->
          <div class="feedback-sections">
            <div class="feedback-section strengths">
              <h4>💪 จุดแข็ง</h4>
              <ul>
                <li v-for="(s, i) in assessmentResult.strengths" :key="i">{{ s }}</li>
              </ul>
            </div>
            <div class="feedback-section weaknesses">
              <h4>🎯 จุดที่ควรพัฒนา</h4>
              <ul>
                <li v-for="(w, i) in assessmentResult.weaknesses" :key="i">{{ w }}</li>
              </ul>
            </div>
          </div>

          <!-- Suggestions -->
          <div class="suggestions-section">
            <h4>📝 ข้อเสนอแนะ</h4>
            <ul>
              <li v-for="(s, i) in assessmentResult.suggestions" :key="i">{{ s }}</li>
            </ul>
          </div>

          <!-- LO Progress -->
          <div class="lo-progress" v-if="assessmentResult.loProgress">
            <h4>📈 ผลการเรียนรู้ที่ผ่าน</h4>
            <div class="lo-list">
              <span v-for="lo in assessmentResult.loProgress.passed" :key="lo" class="lo-badge passed">✅ {{ lo }}</span>
              <span v-for="lo in assessmentResult.loProgress.failed" :key="lo" class="lo-badge failed">❌ {{ lo }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="viewDetailedReport">
            <span class="material-icons">description</span>
            ดูรายงานละเอียด
          </button>
          <button class="btn btn-primary" @click="closeFeedbackModal">
            ตกลง
          </button>
        </div>
      </div>
    </div>
  </div>
  </ErrorBoundary>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, onBeforeUnmount } from 'vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase/config'
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp, increment, query, where, orderBy, getDocs, limit } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { getDeviceInfo } from '@/utils/antiCheat'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// 📱 Mobile Detection
const deviceInfo = ref(getDeviceInfo())
const isMobile = computed(() => deviceInfo.value.isMobile || deviceInfo.value.isTablet)

// State
const loading = ref(true)
const submitting = ref(false)
const worksheet = ref(null)
const answers = ref({})
const arceAnswers = ref({}) // For ARCE Situation question type - separate fields for A/R/C/E
const tableAnswers = ref({})
const fileUploads = ref({})
const selfReflection = ref('')
const hintsVisible = ref({})
const showHints = ref({})
const timeRemaining = ref(null)
const timerInterval = ref(null)
const showFeedbackModal = ref(false)
const assessmentResult = ref(null)
const typingFingerprint = ref({})
const startTime = ref(null)
const shuffledOptionsCache = ref({}) // Cache shuffled options to prevent re-shuffle on re-render
const autoSaveInterval = ref(null)
const lastSavedAt = ref(null)

// ARCE Order constant (A → R → C → E)
const arceOrder = ['analysis', 'reasoning', 'creativity', 'evidence']

// Retry feature state
const previousSubmissions = ref([])
const attemptCount = ref(0)
const canRetry = ref(true)
const cooldownRemaining = ref(0)
const cooldownTimer = ref(null)
const bestScore = ref(null)

// Edit feature state (ดึงคำตอบเดิมมาแก้ไข)
const MAX_EDIT_COUNT = 10 // จำกัดแก้ไขได้สูงสุด 10 ครั้ง
const currentSubmission = ref(null) // submission ที่กำลังแก้ไข
const editCount = ref(0) // จำนวนครั้งที่แก้ไขแล้ว
const isEditMode = ref(false) // กำลังอยู่ในโหมดแก้ไข
const canEdit = computed(() => editCount.value < MAX_EDIT_COUNT)
const lastSubmissionId = ref(null) // เก็บ submissionId หลังส่งใบงานสำเร็จ

// Auto-save key for localStorage
const getStorageKey = () => `worksheet_draft_${route.params.id}_${authStore.user?.uid || 'guest'}`

// Computed
const backRoute = computed(() => {
  if (route.query.roomId) return `/learning-room/${route.query.roomId}`
  if (route.query.courseId) return `/courses/${route.query.courseId}`
  return '/student'
})

const totalQuestions = computed(() => {
  if (!worksheet.value?.sections) return 0
  return worksheet.value.sections.reduce((total, section) => {
    return total + (section.questions?.length || 0)
  }, 0)
})

// Total max score for all questions
const totalMaxScore = computed(() => {
  if (!worksheet.value?.sections) return 0
  return worksheet.value.sections.reduce((total, section) => {
    return total + (section.questions || []).reduce((qTotal, q) => {
      return qTotal + (q.maxScore || q.points || 5)
    }, 0)
  }, 0)
})

const answeredCount = computed(() => {
  if (!worksheet.value?.sections) return 0
  
  let count = 0
  for (const section of worksheet.value.sections) {
    for (const question of section.questions || []) {
      const sectionId = section.id
      const questionId = question.id
      
      // Check if this is a table question
      if (question.type === 'table' && question.table) {
        // For table questions, check if at least one cell is filled
        const tableRows = question.table.rows || 0
        const tableHeaders = question.table.headers || []
        let hasTableAnswer = false
        
        for (let rowIdx = 1; rowIdx <= tableRows; rowIdx++) {
          for (let colIdx = 0; colIdx < tableHeaders.length; colIdx++) {
            const cellKey = `${sectionId}_${questionId}_${rowIdx}_${colIdx}`
            if (tableAnswers.value[cellKey]?.trim()) {
              hasTableAnswer = true
              break
            }
          }
          if (hasTableAnswer) break
        }
        
        if (hasTableAnswer) count++
      } else if (question.type === 'arce_situation') {
        // For ARCE Situation questions, check if at least 2 ARCE fields are filled
        const analysis = arceAnswers.value[`${sectionId}_${questionId}_analysis`]?.trim() || ''
        const reasoning = arceAnswers.value[`${sectionId}_${questionId}_reasoning`]?.trim() || ''
        const creativity = arceAnswers.value[`${sectionId}_${questionId}_creativity`]?.trim() || ''
        const evidence = arceAnswers.value[`${sectionId}_${questionId}_evidence`]?.trim() || ''
        
        // Count filled ARCE sections (min 20 chars each)
        const filledCount = [analysis, reasoning, creativity, evidence]
          .filter(a => a.length >= 20).length
        
        if (filledCount >= 2) count++
      } else {
        // Regular answer check
        const val = answers.value[`${sectionId}_${questionId}`]
        if (val) {
          if (typeof val === 'string' && val.trim().length > 0) count++
          else if (Array.isArray(val) && val.length > 0) count++
          else if (val && typeof val !== 'string' && !Array.isArray(val)) count++
        }
      }
    }
  }
  return count
})

const progressPercent = computed(() => {
  if (totalQuestions.value === 0) return 0
  return (answeredCount.value / totalQuestions.value) * 100
})

const canSubmit = computed(() => {
  if (!worksheet.value?.sections) return false
  
  // Check all required questions
  for (const section of worksheet.value.sections) {
    for (const question of section.questions || []) {
      if (question.required) {
        // Handle table questions
        if (question.type === 'table' && question.table) {
          const tableRows = question.table.rows || 0
          const tableHeaders = question.table.headers || []
          let hasTableAnswer = false
          
          for (let rowIdx = 1; rowIdx <= tableRows; rowIdx++) {
            for (let colIdx = 0; colIdx < tableHeaders.length; colIdx++) {
              const cellKey = `${section.id}_${question.id}_${rowIdx}_${colIdx}`
              if (tableAnswers.value[cellKey]?.trim()) {
                hasTableAnswer = true
                break
              }
            }
            if (hasTableAnswer) break
          }
          
          if (!hasTableAnswer) return false
        } else if (question.type === 'arce_situation') {
          // Handle ARCE Situation questions - require at least 2 ARCE fields filled (min 20 chars each)
          const key = `${section.id}_${question.id}`
          const analysis = arceAnswers.value[`${key}_analysis`]?.trim() || ''
          const reasoning = arceAnswers.value[`${key}_reasoning`]?.trim() || ''
          const creativity = arceAnswers.value[`${key}_creativity`]?.trim() || ''
          const evidence = arceAnswers.value[`${key}_evidence`]?.trim() || ''
          
          const filledCount = [analysis, reasoning, creativity, evidence]
            .filter(a => a.length >= 20).length
          
          if (filledCount < 2) return false
        } else {
          // Regular answer check
          const answer = answers.value[`${section.id}_${question.id}`]
          if (!answer || (typeof answer === 'string' && !answer.trim())) {
            return false
          }
          // Check minimum characters for open-ended
          if ((question.type === 'open_ended' || question.type === 'long_text') && question.minCharacters) {
            if (answer.length < question.minCharacters) return false
          }
        }
      }
    }
  }
  return true
})

// Methods
function isAnswered(sectionId, questionId) {
  // Find the question to check if it's a table type
  const section = worksheet.value?.sections?.find(s => s.id === sectionId)
  const question = section?.questions?.find(q => q.id === questionId)
  
  // Check table questions
  if (question?.type === 'table' && question.table) {
    const tableRows = question.table.rows || 0
    const tableHeaders = question.table.headers || []
    
    for (let rowIdx = 1; rowIdx <= tableRows; rowIdx++) {
      for (let colIdx = 0; colIdx < tableHeaders.length; colIdx++) {
        const cellKey = `${sectionId}_${questionId}_${rowIdx}_${colIdx}`
        if (tableAnswers.value[cellKey]?.trim()) {
          return true
        }
      }
    }
    return false
  }
  
  // Regular answer check
  const val = answers.value[`${sectionId}_${questionId}`]
  if (!val) return false
  if (typeof val === 'string') return val.trim().length > 0
  if (Array.isArray(val)) return val.length > 0
  return true
}

function getPhaseLabel(phase) {
  const labels = {
    engagement: 'Engage - กระตุ้นความสนใจ',
    exploration: 'Explore - สำรวจค้นหา',
    explanation: 'Explain - อธิบายความรู้',
    elaboration: 'Elaborate - ขยายความเข้าใจ',
    evaluation: 'Evaluate - ประเมินผล'
  }
  return labels[phase] || phase
}

function getArceLabel(arce) {
  const labels = {
    analysis: 'การวิเคราะห์',
    reasoning: 'การให้เหตุผล',
    creativity: 'ความคิดสร้างสรรค์',
    evidence: 'การใช้หลักฐาน'
  }
  return labels[arce] || arce
}

function getArceIcon(arce) {
  const icons = {
    analysis: '🔍',
    reasoning: '🧠',
    creativity: '💡',
    evidence: '📚'
  }
  return icons[arce] || '📝'
}

function getQuestionTypeLabel(type) {
  const labels = {
    open_ended: 'เขียนตอบ',
    long_text: 'เขียนตอบยาว',
    short_text: 'ตอบสั้น',
    multiple_choice: 'เลือกตอบ',
    single_choice: 'เลือกตอบ',
    multi_choice: 'เลือกหลายข้อ',
    checkbox: 'เลือกหลายข้อ',
    rating_scale: 'ระดับความคิดเห็น',
    file_upload: 'อัปโหลดไฟล์',
    table: 'กรอกตาราง',
    arce_situation: '🎯 ARCE วัดผล'
  }
  return labels[type] || 'ตอบคำถาม'
}

function getScoreClass(percent) {
  if (percent >= 80) return 'excellent'
  if (percent >= 60) return 'good'
  if (percent >= 40) return 'fair'
  return 'needs-improvement'
}

function shuffledOptions(question) {
  if (!question.options) return []
  if (!worksheet.value?.settings?.shuffleOptions) return question.options
  
  // Use cached version if exists to prevent re-shuffling on re-render
  const cacheKey = question.id || question.number
  if (shuffledOptionsCache.value[cacheKey]) {
    return shuffledOptionsCache.value[cacheKey]
  }
  
  // Shuffle options only once
  const shuffled = [...question.options]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  // Cache the result
  shuffledOptionsCache.value[cacheKey] = shuffled
  return shuffled
}

function toggleHint(sectionId, questionId) {
  const key = `${sectionId}_${questionId}`
  hintsVisible.value[key] = !hintsVisible.value[key]
}

// Anti-cheat: Block all copy/paste/cut/drop methods
function blockPaste(event) {
  event.preventDefault()
  showAntiCheatWarning('วาง (Paste)')
}

function blockCopy(event) {
  event.preventDefault()
  showAntiCheatWarning('คัดลอก (Copy)')
}

function blockCut(event) {
  event.preventDefault()
  showAntiCheatWarning('ตัด (Cut)')
}

function blockDrop(event) {
  event.preventDefault()
  showAntiCheatWarning('ลากวาง (Drag & Drop)')
}

let antiCheatWarningTimeout = null
function showAntiCheatWarning(action) {
  // Debounce warnings
  if (antiCheatWarningTimeout) return
  
  antiCheatWarningTimeout = setTimeout(() => {
    antiCheatWarningTimeout = null
  }, 2000)
  
  // Show toast notification instead of alert
  const toast = document.createElement('div')
  toast.className = 'anti-cheat-toast'
  toast.innerHTML = `
    <span class="material-icons">block</span>
    <span>ไม่อนุญาตให้${action} กรุณาพิมพ์คำตอบด้วยตัวเอง</span>
  `
  document.body.appendChild(toast)
  
  setTimeout(() => {
    toast.classList.add('fade-out')
    setTimeout(() => toast.remove(), 300)
  }, 2500)
}

// Global clipboard blocking for mobile
function blockGlobalClipboard(event) {
  // Block if focus is on any input/textarea in worksheet
  const activeEl = document.activeElement
  if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
    if (activeEl.closest('.worksheet-form')) {
      event.preventDefault()
      showAntiCheatWarning(event.type === 'paste' ? 'วาง' : event.type === 'copy' ? 'คัดลอก' : 'ตัด')
    }
  }
}

function handleFileUpload(event, sectionId, questionId) {
  const file = event.target.files[0]
  if (file) {
    fileUploads.value[`${sectionId}_${questionId}`] = file
    answers.value[`${sectionId}_${questionId}`] = file.name
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

async function loadWorksheet() {
  try {
    loading.value = true
    const worksheetId = route.params.id
    
    // Try eWorksheets collection first (new format)
    let docRef = doc(db, 'eWorksheets', worksheetId)
    let docSnap = await getDoc(docRef)
    
    // If not found, try worksheets collection (old format)
    if (!docSnap.exists()) {
      console.log('Worksheet not found in eWorksheets, trying worksheets collection...')
      try {
        docRef = doc(db, 'worksheets', worksheetId)
        docSnap = await getDoc(docRef)
      } catch (permError) {
        console.warn('Cannot access worksheets collection:', permError.message)
        // Continue - worksheet simply doesn't exist
      }
    }
    
    if (docSnap && docSnap.exists()) {
      worksheet.value = { id: docSnap.id, ...docSnap.data() }
      
      // ========== RETRY FEATURE: Check previous submissions ==========
      await loadPreviousSubmissions(worksheetId)
      
      // Check if can retry based on settings
      const retrySettings = worksheet.value.retrySettings || {
        allowRetry: true,
        maxAttempts: 3,
        scoreMode: 'best',
        cooldownMinutes: 0,
        showPreviousScore: true,
        showPreviousFeedback: true
      }
      
      // Calculate if retry is allowed
      if (previousSubmissions.value.length > 0) {
        attemptCount.value = previousSubmissions.value.length
        
        // Calculate best score
        if (previousSubmissions.value.length > 0) {
          const scores = previousSubmissions.value
            .filter(s => s.assessment?.totalScore !== undefined)
            .map(s => s.assessment.totalScore)
          if (scores.length > 0) {
            bestScore.value = Math.max(...scores)
          }
        }
        
        // Check if max attempts reached
        if (!retrySettings.allowRetry) {
          canRetry.value = false
        } else if (retrySettings.maxAttempts && attemptCount.value >= retrySettings.maxAttempts) {
          canRetry.value = false
        } else {
          // Check cooldown
          const lastSubmission = previousSubmissions.value[0]
          if (retrySettings.cooldownMinutes && lastSubmission?.submittedAt) {
            const lastSubmitTime = lastSubmission.submittedAt.toDate ? 
              lastSubmission.submittedAt.toDate() : new Date(lastSubmission.submittedAt)
            const cooldownMs = retrySettings.cooldownMinutes * 60 * 1000
            const timeSinceLastSubmit = Date.now() - lastSubmitTime.getTime()
            
            if (timeSinceLastSubmit < cooldownMs) {
              cooldownRemaining.value = Math.ceil((cooldownMs - timeSinceLastSubmit) / 1000)
              canRetry.value = false
              startCooldownTimer()
            } else {
              canRetry.value = true
            }
          } else {
            canRetry.value = true
          }
        }
      }
      // ========== END RETRY FEATURE ==========
      
      // Initialize answers object
      if (worksheet.value.sections) {
        worksheet.value.sections.forEach((section, sIdx) => {
          // Ensure section has an id
          if (!section.id) section.id = `section_${sIdx}`
          
          section.questions?.forEach((question, qIdx) => {
            // Ensure question has an id
            if (!question.id) question.id = `q_${qIdx}`
            
            const key = `${section.id}_${question.id}`
            if (question.type === 'multi_choice' || question.type === 'checkbox') {
              answers.value[key] = []
            } else {
              answers.value[key] = ''
            }
            // Show hints after certain attempts
            showHints.value[key] = question.hints && question.showHintsAfterAttempts !== undefined
          })
        })
      }
      
      // Start timer if duration specified
      const duration = worksheet.value.duration || worksheet.value.metadata?.duration
      if (duration) {
        timeRemaining.value = duration * 60
        startTimer()
      }
      
      startTime.value = Date.now()
      
      // Restore saved answers - try Firestore first, then localStorage
      const loadedFromFirestore = await loadDraftFromFirestore()
      if (!loadedFromFirestore) {
        restoreSavedAnswers()
      } else {
        showRestorationNotice()
      }
      
      // Start auto-save interval (every 10 seconds)
      startAutoSave()
    }
  } catch (error) {
    console.error('Error loading worksheet:', error)
  } finally {
    loading.value = false
  }
}

// ========== RETRY FEATURE FUNCTIONS ==========
async function loadPreviousSubmissions(worksheetId) {
  try {
    const userId = authStore.user?.uid
    if (!userId) return
    
    const submissionsRef = collection(db, 'worksheetSubmissions')
    const q = query(
      submissionsRef,
      where('worksheetId', '==', worksheetId),
      where('studentId', '==', userId),
      orderBy('submittedAt', 'desc')
    )
    
    const snapshot = await getDocs(q)
    previousSubmissions.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    // Set editCount from latest submission
    if (previousSubmissions.value.length > 0) {
      editCount.value = previousSubmissions.value[0].editCount || 0
    }
  } catch (error) {
    console.error('Error loading previous submissions:', error)
    previousSubmissions.value = []
  }
}

function startCooldownTimer() {
  if (cooldownTimer.value) clearInterval(cooldownTimer.value)
  
  cooldownTimer.value = setInterval(() => {
    cooldownRemaining.value--
    if (cooldownRemaining.value <= 0) {
      clearInterval(cooldownTimer.value)
      canRetry.value = true
      cooldownRemaining.value = 0
    }
  }, 1000)
}

function formatCooldown(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return `${mins} นาที ${secs} วินาที`
  }
  return `${secs} วินาที`
}
// ========== END RETRY FEATURE FUNCTIONS ==========

// ========== EDIT FEATURE FUNCTIONS (ดึงคำตอบเดิมมาแก้ไข) ==========
async function loadPreviousAnswers() {
  if (!previousSubmissions.value.length) return
  
  const latestSubmission = previousSubmissions.value[0]
  if (!latestSubmission) return
  
  // Check edit limit
  const currentEditCount = latestSubmission.editCount || 0
  if (currentEditCount >= MAX_EDIT_COUNT) {
    alert(`คุณแก้ไขคำตอบครบ ${MAX_EDIT_COUNT} ครั้งแล้ว ไม่สามารถแก้ไขเพิ่มได้`)
    return
  }
  
  // Set edit mode
  isEditMode.value = true
  currentSubmission.value = latestSubmission
  editCount.value = currentEditCount
  
  // Restore answers from previous submission
  if (latestSubmission.answers) {
    Object.keys(latestSubmission.answers).forEach(key => {
      answers.value[key] = latestSubmission.answers[key]
    })
  }
  
  // Restore ARCE answers
  if (latestSubmission.arceAnswers) {
    Object.keys(latestSubmission.arceAnswers).forEach(key => {
      arceAnswers.value[key] = latestSubmission.arceAnswers[key]
    })
  }
  
  // Restore table answers
  if (latestSubmission.tableAnswers) {
    Object.keys(latestSubmission.tableAnswers).forEach(key => {
      tableAnswers.value[key] = latestSubmission.tableAnswers[key]
    })
  }
  
  // Restore self reflection
  if (latestSubmission.selfReflection) {
    selfReflection.value = latestSubmission.selfReflection
  }
  
  console.log(`✏️ Loaded previous answers for editing (edit #${currentEditCount + 1}/${MAX_EDIT_COUNT})`)
}

function getRemainingEdits() {
  return MAX_EDIT_COUNT - editCount.value
}
// ========== END EDIT FEATURE FUNCTIONS ==========

// Auto-save functions
function restoreSavedAnswers() {
  try {
    const saved = localStorage.getItem(getStorageKey())
    if (saved) {
      const data = JSON.parse(saved)
      
      // Restore answers
      if (data.answers) {
        Object.keys(data.answers).forEach(key => {
          if (answers.value.hasOwnProperty(key)) {
            answers.value[key] = data.answers[key]
          }
        })
      }
      
      // Restore table answers
      if (data.tableAnswers) {
        tableAnswers.value = { ...tableAnswers.value, ...data.tableAnswers }
      }
      
      // Restore self reflection
      if (data.selfReflection) {
        selfReflection.value = data.selfReflection
      }
      
      // Restore ARCE answers
      if (data.arceAnswers) {
        arceAnswers.value = { ...arceAnswers.value, ...data.arceAnswers }
      }
      
      // Restore time remaining if still valid
      if (data.timeRemaining && data.savedAt) {
        const elapsed = Math.floor((Date.now() - data.savedAt) / 1000)
        const remaining = data.timeRemaining - elapsed
        if (remaining > 0) {
          timeRemaining.value = remaining
        }
      }
      
      console.log('✅ Restored saved answers from localStorage')
      
      // Show restoration notice
      showRestorationNotice()
    }
  } catch (error) {
    console.error('Error restoring saved answers:', error)
  }
}

function showRestorationNotice() {
  const toast = document.createElement('div')
  toast.className = 'restore-toast'
  toast.innerHTML = `
    <span class="material-icons">restore</span>
    <span>กู้คืนคำตอบที่บันทึกไว้แล้ว</span>
  `
  document.body.appendChild(toast)
  
  setTimeout(() => {
    toast.classList.add('fade-out')
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

function saveAnswersToStorage() {
  try {
    const data = {
      answers: answers.value,
      tableAnswers: tableAnswers.value,
      arceAnswers: arceAnswers.value,
      selfReflection: selfReflection.value,
      timeRemaining: timeRemaining.value,
      savedAt: Date.now()
    }
    localStorage.setItem(getStorageKey(), JSON.stringify(data))
    lastSavedAt.value = new Date()
  } catch (error) {
    console.error('Error saving answers to localStorage:', error)
  }
}

function startAutoSave() {
  // Save immediately when answers change (debounced)
  watch([answers, tableAnswers, arceAnswers, selfReflection], () => {
    saveAnswersToStorage()
  }, { deep: true })
  
  // Also save periodically as backup
  autoSaveInterval.value = setInterval(() => {
    saveAnswersToStorage()
  }, 10000) // Every 10 seconds
}

function clearSavedAnswers() {
  try {
    localStorage.removeItem(getStorageKey())
  } catch (error) {
    console.error('Error clearing saved answers:', error)
  }
}

function startTimer() {
  timerInterval.value = setInterval(() => {
    if (timeRemaining.value > 0) {
      timeRemaining.value--
    } else {
      clearInterval(timerInterval.value)
      // Auto-submit when time runs out
      submitWorksheet()
    }
  }, 1000)
}

async function saveDraft() {
  try {
    const draftData = {
      worksheetId: worksheet.value.id,
      studentId: authStore.user?.uid,
      answers: answers.value,
      tableAnswers: tableAnswers.value,
      arceAnswers: arceAnswers.value,
      selfReflection: selfReflection.value,
      status: 'draft',
      updatedAt: serverTimestamp()
    }
    
    const draftId = `${authStore.user?.uid}_${worksheet.value.id}`
    await setDoc(doc(db, 'worksheetDrafts', draftId), draftData, { merge: true })
    
    alert('บันทึกฉบับร่างเรียบร้อยแล้ว')
  } catch (error) {
    console.error('Error saving draft:', error)
    alert('เกิดข้อผิดพลาดในการบันทึก')
  }
}

async function loadDraftFromFirestore() {
  try {
    const draftId = `${authStore.user?.uid}_${worksheet.value?.id}`
    if (!draftId || !authStore.user?.uid || !worksheet.value?.id) return false
    
    const draftDoc = await getDoc(doc(db, 'worksheetDrafts', draftId))
    if (draftDoc.exists()) {
      const data = draftDoc.data()
      
      // Restore answers
      if (data.answers) {
        answers.value = { ...answers.value, ...data.answers }
      }
      
      // Restore table answers
      if (data.tableAnswers) {
        tableAnswers.value = { ...tableAnswers.value, ...data.tableAnswers }
      }
      
      // Restore ARCE answers
      if (data.arceAnswers) {
        arceAnswers.value = { ...arceAnswers.value, ...data.arceAnswers }
      }
      
      // Restore self reflection
      if (data.selfReflection) {
        selfReflection.value = data.selfReflection
      }
      
      console.log('✅ Restored draft from Firestore')
      return true
    }
    return false
  } catch (error) {
    console.error('Error loading draft from Firestore:', error)
    return false
  }
}

async function submitWorksheet() {
  if (!canSubmit.value) {
    alert('กรุณาตอบคำถามที่จำเป็นให้ครบก่อนส่ง')
    return
  }
  
  submitting.value = true
  
  try {
    const timeSpent = Math.floor((Date.now() - startTime.value) / 1000)
    
    // Combine ARCE answers into the main answers object
    const combinedAnswers = { ...answers.value }
    
    // For ARCE Situation questions, combine the 4 ARCE fields into a structured answer
    if (worksheet.value?.sections) {
      for (const section of worksheet.value.sections) {
        for (const question of section.questions || []) {
          if (question.type === 'arce_situation') {
            const sectionId = section.id
            const questionId = question.id
            const key = `${sectionId}_${questionId}`
            
            // Build structured ARCE answer
            combinedAnswers[key] = {
              type: 'arce_structured',
              analysis: arceAnswers.value[`${key}_analysis`] || '',
              reasoning: arceAnswers.value[`${key}_reasoning`] || '',
              creativity: arceAnswers.value[`${key}_creativity`] || '',
              evidence: arceAnswers.value[`${key}_evidence`] || '',
              // Also include as text for AI assessment
              fullText: [
                `[การวิเคราะห์] ${arceAnswers.value[`${key}_analysis`] || ''}`,
                `[การให้เหตุผล] ${arceAnswers.value[`${key}_reasoning`] || ''}`,
                `[ความคิดสร้างสรรค์] ${arceAnswers.value[`${key}_creativity`] || ''}`,
                `[หลักฐาน] ${arceAnswers.value[`${key}_evidence`] || ''}`
              ].join('\n\n')
            }
          }
        }
      }
    }
    
    // Prepare submission data
    const currentAttempt = attemptCount.value + 1
    const newEditCount = isEditMode.value ? editCount.value + 1 : 0
    
    const submissionData = {
      worksheetId: worksheet.value.id,
      courseId: worksheet.value.courseId,
      lessonPlanId: worksheet.value.lessonPlanId,
      studentId: authStore.user?.uid,
      studentName: authStore.user?.displayName || authStore.userProfile?.displayName || '',
      studentData: {
        displayName: authStore.user?.displayName || authStore.userProfile?.displayName || '',
        studentId: authStore.userProfile?.studentId || '', // รหัสนักเรียน 5 หลัก
        grade: authStore.userProfile?.grade || '',
        room: authStore.userProfile?.room || '',
        number: authStore.userProfile?.number || '', // เลขที่
        section: authStore.userProfile?.section || '' // ตอน
      },
      answers: combinedAnswers, // Use combined answers
      arceAnswers: arceAnswers.value, // Also store raw ARCE answers separately
      tableAnswers: tableAnswers.value,
      selfReflection: selfReflection.value,
      typingFingerprint: typingFingerprint.value,
      timeSpent: timeSpent,
      status: 'submitted',
      // Retry tracking
      attemptNumber: currentAttempt,
      previousBestScore: bestScore.value,
      retrySettings: worksheet.value.retrySettings || null,
      // Edit tracking (ดึงคำตอบเดิมมาแก้ไข)
      editCount: newEditCount,
      isEdited: isEditMode.value,
      editedAt: isEditMode.value ? serverTimestamp() : null,
      submittedAt: serverTimestamp(),
      createdAt: isEditMode.value && currentSubmission.value?.createdAt 
        ? currentSubmission.value.createdAt 
        : serverTimestamp()
    }
    
    let submissionRef
    
    // If in edit mode, update existing submission instead of creating new one
    if (isEditMode.value && currentSubmission.value?.id) {
      submissionRef = doc(db, 'worksheetSubmissions', currentSubmission.value.id)
      await updateDoc(submissionRef, {
        ...submissionData,
        updatedAt: serverTimestamp()
      })
      submissionRef = { id: currentSubmission.value.id } // Mock ref for later use
      console.log(`✅ Updated submission with edit #${newEditCount}`)
    } else {
      // Save new submission
      submissionRef = await addDoc(collection(db, 'worksheetSubmissions'), submissionData)
    }
    
    // Call AI assessment
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'
    const response = await fetch(`${functionsUrl}/assessWorksheetSubmission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionId: submissionRef.id,
        worksheetId: worksheet.value.id,
        courseId: worksheet.value.courseId, // 🆕 ส่ง courseId เพื่อดึง assessmentMode
        answers: combinedAnswers, // Use combined answers
        worksheetStructure: worksheet.value,
        attemptNumber: currentAttempt,
        previousBestScore: bestScore.value,
        retrySettings: worksheet.value.retrySettings
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      assessmentResult.value = result.assessment
      
      // Update submission with assessment (use doc() for edit mode, submissionRef for new)
      const updateRef = isEditMode.value 
        ? doc(db, 'worksheetSubmissions', submissionRef.id)
        : submissionRef
        
      await updateDoc(updateRef, {
        assessment: result.assessment,
        status: 'graded',
        gradedAt: serverTimestamp()
      })
      
      // Update worksheet stats - Only increment if this is the first attempt (not a retry or edit)
      if (currentAttempt === 1 && !isEditMode.value) {
        await updateDoc(doc(db, 'eWorksheets', worksheet.value.id), {
          'stats.totalSubmitted': increment(1)
        })
      }
      
      // Clear saved answers after successful submission
      clearSavedAnswers()
      
      // Reset edit mode and save submission ID for result view
      isEditMode.value = false
      currentSubmission.value = null
      lastSubmissionId.value = submissionRef.id // เก็บ submissionId สำหรับ viewDetailedReport
      
      showFeedbackModal.value = true
    } else {
      // Clear saved answers after successful submission
      clearSavedAnswers()
      
      // Reset edit mode and save submission ID
      isEditMode.value = false
      currentSubmission.value = null
      lastSubmissionId.value = submissionRef.id
      
      alert('ส่งใบงานสำเร็จ รอการตรวจจากครู')
      router.push(backRoute.value)
    }
    
  } catch (error) {
    console.error('Error submitting worksheet:', error)
    alert('เกิดข้อผิดพลาดในการส่งใบงาน: ' + error.message)
  } finally {
    submitting.value = false
  }
}

function closeFeedbackModal() {
  showFeedbackModal.value = false
  router.push(backRoute.value)
}

function viewDetailedReport() {
  // Navigate to detailed report view using submissionId (not worksheetId)
  if (lastSubmissionId.value) {
    router.push(`/worksheet-result/${lastSubmissionId.value}`)
  } else {
    // Fallback: go to worksheet history
    router.push(`/worksheet-history/${worksheet.value.id}`)
  }
}

// Lifecycle
onMounted(async () => {
  await loadWorksheet()
  
  // 🆕 Auto-load previous answers if edit=true query param
  if (route.query.edit === 'true' && previousSubmissions.value.length > 0) {
    loadPreviousAnswers()
  }
  
  // Add global clipboard event listeners for mobile
  document.addEventListener('paste', blockGlobalClipboard, true)
  document.addEventListener('copy', blockGlobalClipboard, true)
  document.addEventListener('cut', blockGlobalClipboard, true)
})

onBeforeUnmount(() => {
  // Save before leaving
  saveAnswersToStorage()
})

onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
  
  if (autoSaveInterval.value) {
    clearInterval(autoSaveInterval.value)
  }
  
  // Clear cooldown timer
  if (cooldownTimer.value) {
    clearInterval(cooldownTimer.value)
  }
  
  // Remove global clipboard listeners
  document.removeEventListener('paste', blockGlobalClipboard, true)
  document.removeEventListener('copy', blockGlobalClipboard, true)
  document.removeEventListener('cut', blockGlobalClipboard, true)
})
</script>

<style scoped>
.worksheet-form-view {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
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
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.timer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-radius: 8px;
  font-weight: 600;
}

.progress-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar {
  width: 100px;
  height: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  transition: width 0.3s;
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

/* Worksheet Container */
.worksheet-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

/* ========== RETRY FEATURE STYLES ========== */
.retry-status-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea15, #764ba215);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 1rem;
}

/* ========== EDIT FEATURE STYLES (ดึงคำตอบเดิมมาแก้ไข) ========== */
.edit-answer-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #fbbf2415, #f5920015);
  border: 1px solid #fbbf24;
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 1rem;
}

.edit-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.edit-info .material-icons {
  font-size: 2rem;
  color: #f59e0b;
}

.edit-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.edit-title {
  font-weight: 600;
  color: var(--text-primary);
}

.edit-remaining {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.btn-warning {
  background: #f59e0b;
  color: white;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-warning:hover {
  background: #d97706;
  transform: translateY(-1px);
}

.btn-warning .material-icons {
  font-size: 1rem;
}

.edit-mode-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #10b98115, #05966915);
  border: 1px solid #10b981;
  border-radius: 12px;
  margin-bottom: 1rem;
}

.edit-mode-banner .material-icons {
  font-size: 2rem;
  color: #10b981;
}

.edit-mode-banner strong {
  color: #10b981;
}

.edit-mode-banner p {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0.25rem 0 0 0;
}

.max-edit-warning {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: #fef2f2;
  border: 1px solid #ef4444;
  border-radius: 12px;
  margin-bottom: 1rem;
}

.max-edit-warning .material-icons {
  font-size: 2rem;
  color: #ef4444;
}

.max-edit-warning strong {
  color: #ef4444;
}

.max-edit-warning p {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0.25rem 0 0 0;
}
/* ========== END EDIT FEATURE STYLES ========== */

.retry-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.retry-info .material-icons {
  font-size: 2rem;
  color: #667eea;
}

.retry-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.attempt-count {
  font-weight: 600;
  color: var(--text-primary);
}

.best-score {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.retry-actions .btn-sm {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.retry-actions .btn-sm .material-icons {
  font-size: 1rem;
}

.cooldown-warning, .max-attempts-warning {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1rem;
}

.cooldown-warning {
  background: #fef3c7;
  border: 1px solid #f59e0b;
}

.cooldown-warning .material-icons {
  font-size: 2.5rem;
  color: #f59e0b;
}

.cooldown-warning strong {
  color: #92400e;
}

.cooldown-warning p {
  color: #b45309;
  margin: 0;
}

.max-attempts-warning {
  background: #fef2f2;
  border: 1px solid #ef4444;
}

.max-attempts-warning .material-icons {
  font-size: 2.5rem;
  color: #ef4444;
}

.max-attempts-warning strong {
  color: #991b1b;
}

.max-attempts-warning p {
  color: #b91c1c;
  margin: 0;
}

.previous-score-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.previous-score-card h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.score-summary {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  align-items: center;
}

.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
}

.score-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.score-mode-badge {
  background: #f0fdf4;
  color: #166534;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.previous-feedback {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.previous-feedback strong {
  color: var(--text-primary);
  display: block;
  margin-bottom: 0.5rem;
}

.previous-feedback p {
  color: var(--text-secondary);
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

.mt-2 {
  margin-top: 0.5rem;
}

.html.dark-mode .cooldown-warning {
  background: #78350f33;
  border-color: #f59e0b66;
}

.html.dark-mode .cooldown-warning strong,
.html.dark-mode .cooldown-warning p {
  color: #fbbf24;
}

.html.dark-mode .max-attempts-warning {
  background: #7f1d1d33;
  border-color: #ef444466;
}

.html.dark-mode .max-attempts-warning strong,
.html.dark-mode .max-attempts-warning p {
  color: #f87171;
}

.html.dark-mode .score-mode-badge {
  background: #16653433;
  color: #4ade80;
}

/* Dark mode for Edit Feature */
.html.dark-mode .edit-answer-banner {
  background: linear-gradient(135deg, #78350f33, #92400e33);
  border-color: #f59e0b66;
}

.html.dark-mode .edit-mode-banner {
  background: linear-gradient(135deg, #06544433, #05966933);
  border-color: #10b98166;
}

.html.dark-mode .max-edit-warning {
  background: #7f1d1d33;
  border-color: #ef444466;
}

.html.dark-mode .max-edit-warning strong {
  color: #f87171;
}

@media (max-width: 600px) {
  .retry-status-banner {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .retry-info {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .edit-answer-banner {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .edit-info {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .score-summary {
    justify-content: center;
    gap: 1rem;
  }
}
/* ========== END RETRY FEATURE STYLES ========== */

/* Header */
.worksheet-header {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid var(--border-color);
}

.ws-meta h1 {
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
}

.ws-description {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.ws-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.phase-tag {
  background: rgba(99, 102, 241, 0.15);
  color: #6366f1;
}

.arce-tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.arce-tag.analysis { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.arce-tag.reasoning { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.arce-tag.creativity { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.arce-tag.evidence { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

.ws-info {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.ws-info p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Instructions */
.instructions-section {
  background: rgba(99, 102, 241, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border-left: 4px solid #6366f1;
}

.instructions-section h3 {
  margin-bottom: 0.75rem;
  color: #6366f1;
}

/* Form Sections */
.form-section {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--border-color);
}

.section-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.section-header h3 {
  margin-bottom: 0.5rem;
}

.section-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.section-arce {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.arce-mini {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
}

.arce-mini.analysis { background: rgba(59, 130, 246, 0.2); }
.arce-mini.reasoning { background: rgba(16, 185, 129, 0.2); }
.arce-mini.creativity { background: rgba(245, 158, 11, 0.2); }
.arce-mini.evidence { background: rgba(239, 68, 68, 0.2); }

/* Question Block */
.question-block {
  padding: 1.5rem;
  background: var(--bg-primary);
  border-radius: 12px;
  margin-bottom: 1rem;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.question-block.answered {
  border-color: rgba(16, 185, 129, 0.3);
}

.question-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.question-number {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.question-type-badge {
  padding: 0.25rem 0.5rem;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.required-badge {
  color: #ef4444;
  font-size: 0.75rem;
}

.question-points {
  margin-left: auto;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.question-text {
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.question-context {
  background: rgba(99, 102, 241, 0.05);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.context-label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #6366f1;
}

.context-content {
  line-height: 1.7;
  color: var(--text-secondary);
}

/* Answer Inputs */
.answer-input {
  margin-top: 1rem;
}

.textarea-answer {
  width: 100%;
  padding: 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.6;
  resize: vertical;
  transition: border-color 0.2s;
}

.textarea-answer:focus {
  outline: none;
  border-color: #6366f1;
}

.input-answer {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1rem;
}

.char-count {
  text-align: right;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

/* Options */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-item:hover {
  border-color: #6366f1;
}

.option-item.selected {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
}

.option-item input {
  accent-color: #6366f1;
}

/* Rating Scale */
.rating-scale {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.scale-options {
  display: flex;
  gap: 0.5rem;
}

.scale-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.scale-item:has(input:checked) {
  background: #6366f1;
  border-color: #6366f1;
  color: white;
}

.scale-item input {
  display: none;
}

.scale-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Table Input */
.table-input table {
  width: 100%;
  border-collapse: collapse;
}

.table-input th, .table-input td {
  border: 1px solid var(--border-color);
  padding: 0.5rem;
}

.table-input th {
  background: var(--bg-secondary);
  font-weight: 600;
}

.table-cell-input {
  width: 100%;
  padding: 0.5rem;
  border: none;
  background: transparent;
  color: var(--text-primary);
}

/* Hints */
.question-hints {
  margin-top: 1rem;
}

.hint-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #f59e0b;
  cursor: pointer;
  font-size: 0.875rem;
}

.hints-content {
  margin-top: 0.75rem;
  padding: 1rem;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 8px;
}

.hints-content p {
  margin: 0.5rem 0;
}

/* Reflection */
.reflection-section {
  background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 1.5rem;
  border: 2px solid #60a5fa;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.15);
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
}

.reflection-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
}

.reflection-section h3 {
  color: #1e40af;
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.reflection-prompt {
  margin-bottom: 1rem;
  color: #1e3a8a;
  font-weight: 500;
  font-size: 1.1rem;
}

.reflection-section textarea {
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #93c5fd;
  border-radius: 12px;
  padding: 1rem;
  font-size: 1rem;
  transition: all 0.3s ease;
  width: 100%;
  min-height: 150px;
  resize: vertical;
}

.reflection-section textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
  outline: none;
}

/* Dark mode reflection */
.dark-mode .reflection-section {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
  border-color: #60a5fa;
}

.dark-mode .reflection-section h3 {
  color: #93c5fd;
}

.dark-mode .reflection-prompt {
  color: #e0f2fe;
  font-weight: 500;
}

.dark-mode .reflection-section textarea {
  background: rgba(30, 41, 59, 0.8);
  border-color: #60a5fa;
  color: #f1f5f9;
}

.dark-mode .reflection-section textarea::placeholder {
  color: #94a3b8;
}

/* Submit Section */
.submit-section {
  padding: 2rem 0;
}

.submit-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  color: #ef4444;
  margin-bottom: 1rem;
}

.submit-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
}

/* Score Display */
.overall-score {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 1.5rem;
  background: var(--bg-primary);
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.score-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 4px solid;
}

.score-circle.excellent { border-color: #10b981; color: #10b981; }
.score-circle.good { border-color: #3b82f6; color: #3b82f6; }
.score-circle.fair { border-color: #f59e0b; color: #f59e0b; }
.score-circle.needs-improvement { border-color: #ef4444; color: #ef4444; }

.score-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.score-label {
  font-size: 0.75rem;
}

.pa-level {
  color: #6366f1;
  font-weight: 600;
}

/* ARCE Scores Grid */
.arce-scores {
  margin-bottom: 1.5rem;
}

.arce-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 1rem;
}

.arce-item {
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.arce-icon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.arce-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.arce-score {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.arce-bar {
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  margin-top: 0.5rem;
  overflow: hidden;
}

.arce-fill {
  height: 100%;
  border-radius: 3px;
}

.arce-item.analysis .arce-fill { background: #3b82f6; }
.arce-item.reasoning .arce-fill { background: #10b981; }
.arce-item.creativity .arce-fill { background: #f59e0b; }
.arce-item.evidence .arce-fill { background: #ef4444; }

/* Feedback Sections */
.feedback-sections {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.feedback-section {
  padding: 1rem;
  border-radius: 8px;
}

.feedback-section.strengths {
  background: rgba(16, 185, 129, 0.1);
}

.feedback-section.weaknesses {
  background: rgba(239, 68, 68, 0.1);
}

.feedback-section h4 {
  margin-bottom: 0.75rem;
}

.feedback-section ul {
  margin: 0;
  padding-left: 1.25rem;
}

.feedback-section li {
  margin-bottom: 0.25rem;
}

.suggestions-section {
  padding: 1rem;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.lo-progress {
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.lo-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.lo-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
}

.lo-badge.passed {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.lo-badge.failed {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
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
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-primary:hover:not(:disabled) {
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

.btn-lg {
  padding: 1rem 2rem;
  font-size: 1rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ======================================
   ARCE Situation Question Type Styles
   ====================================== */

.arce-situation-container {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px solid rgba(16, 185, 129, 0.3);
}

.situation-box {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05));
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.situation-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.situation-icon {
  font-size: 1.25rem;
}

.situation-label {
  font-weight: 600;
  color: #3b82f6;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.situation-content {
  line-height: 1.7;
  color: var(--text-primary);
  font-size: 1rem;
}

.task-box {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(109, 40, 217, 0.05));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.task-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.task-icon {
  font-size: 1.25rem;
}

.task-label {
  font-weight: 600;
  color: #8b5cf6;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.task-content {
  line-height: 1.7;
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 500;
}

.answer-guide-box {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05));
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.answer-guide-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.guide-icon {
  font-size: 1.25rem;
}

.guide-label {
  font-weight: 600;
  color: #f59e0b;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.answer-guide-content {
  line-height: 1.6;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.arce-response-areas {
  margin-top: 1.5rem;
}

.arce-response-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--border-color);
}

.arce-section {
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 10px;
  transition: all 0.2s;
}

.arce-section.analysis-section {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(220, 38, 38, 0.03));
  border-left: 4px solid #ef4444;
}

.arce-section.reasoning-section {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(37, 99, 235, 0.03));
  border-left: 4px solid #3b82f6;
}

.arce-section.creativity-section {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.03));
  border-left: 4px solid #10b981;
}

.arce-section.evidence-section {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(109, 40, 217, 0.03));
  border-left: 4px solid #8b5cf6;
}

.arce-section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.arce-icon {
  font-size: 1.1rem;
}

.arce-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.arce-hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  font-style: italic;
}

.arce-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.95rem;
  resize: vertical;
  transition: border-color 0.2s;
  min-height: 80px;
}

.arce-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.arce-progress {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.progress-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.progress-items {
  display: flex;
  gap: 0.5rem;
}

.progress-item {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  background: var(--border-color);
  color: var(--text-secondary);
  transition: all 0.3s;
}

.progress-item.filled {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
}

/* ARCE question type badge */
.question-type-badge.arce_situation {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

/* ====================================== */

/* Responsive */
@media (max-width: 768px) {
  .worksheet-container {
    padding: 1rem;
    padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0));
  }
  
  .top-navbar {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
    position: sticky;
    top: 0;
    z-index: 100;
    background: var(--bg-primary);
  }
  
  .nav-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .arce-grid {
    grid-template-columns: 1fr;
  }
  
  .feedback-sections {
    grid-template-columns: 1fr;
  }
  
  .submit-actions {
    flex-direction: column;
    position: sticky;
    bottom: 0;
    background: var(--bg-primary);
    padding: 1rem;
    padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0));
    margin: 0 -1rem -1rem -1rem;
    border-top: 1px solid var(--border-color);
    z-index: 50;
  }
  
  .submit-actions .btn {
    width: 100%;
    justify-content: center;
  }
  
  /* Mobile textarea styles */
  .textarea-answer,
  .arce-textarea {
    font-size: 16px; /* Prevent iOS zoom */
    min-height: 100px;
  }
  
  .input-answer {
    font-size: 16px; /* Prevent iOS zoom */
    padding: 1rem;
  }
}

/* Mobile-specific textarea styles */
.textarea-answer.mobile-textarea,
.arce-textarea.mobile-textarea {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
  -webkit-appearance: none;
  appearance: none;
  touch-action: manipulation;
  -webkit-user-select: text;
  user-select: text;
  min-height: 120px;
  padding: 1rem;
  line-height: 1.6;
}

.input-answer.mobile-input {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
  -webkit-appearance: none;
  appearance: none;
  touch-action: manipulation;
  -webkit-user-select: text;
  user-select: text;
  padding: 1rem;
}

/* Anti-cheat: Disable text selection - NOT for mobile textareas */
.no-select {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}

/* Allow typing but prevent selection - deprecated, use mobile-textarea instead */
.textarea-answer.no-select,
.input-answer.no-select {
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}
</style>

<!-- Global styles for toast notifications -->
<style>
/* Anti-cheat warning toast */
.anti-cheat-toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 8px 32px rgba(239, 68, 68, 0.4);
  z-index: 10000;
  animation: slideUp 0.3s ease-out;
  font-weight: 500;
}

.anti-cheat-toast .material-icons {
  font-size: 20px;
}

/* Restore toast */
.restore-toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 8px 32px rgba(16, 185, 129, 0.4);
  z-index: 10000;
  animation: slideUp 0.3s ease-out;
  font-weight: 500;
}

.restore-toast .material-icons {
  font-size: 20px;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.anti-cheat-toast.fade-out,
.restore-toast.fade-out {
  animation: fadeOut 0.3s ease-out forwards;
}

@keyframes fadeOut {
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
}
</style>
