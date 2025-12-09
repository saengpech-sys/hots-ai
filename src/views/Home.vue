<template>
  <div class="home-container">
    <!-- Animated Background -->
    <div class="animated-bg">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
      <div class="grid-lines"></div>
    </div>

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <div class="badge-new">
          <span class="pulse"></span>
          🚀 AI-Powered Learning Platform
        </div>
        <h1 class="title">
          <span class="title-line">HOTS AI</span>
          <span class="title-gradient">ChatLoop</span>
        </h1>
        <p class="subtitle">ระบบประเมินทักษะการคิดขั้นสูงด้วย AI</p>
        <p class="description">
          พัฒนาทักษะการคิดวิเคราะห์ การให้เหตุผล และความคิดสร้างสรรค์
          <br>พร้อมรับ Feedback แบบ Real-time จาก AI
        </p>
        
        <div class="cta-buttons">
          <button @click="goToLogin" class="btn-glow">
            <span class="btn-content">
              <span class="btn-icon">🎯</span>
              เริ่มต้นใช้งาน
            </span>
            <span class="btn-shine"></span>
          </button>
          <button @click="scrollToFeatures" class="btn-outline">
            <span>ดูฟีเจอร์ทั้งหมด</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
            </svg>
          </button>
        </div>

        <!-- Stats Section -->
        <div class="stats-row">
          <div class="stat-item">
            <span class="stat-number" data-count="10000">10,000+</span>
            <span class="stat-label">นักเรียน</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-number">500+</span>
            <span class="stat-label">โรงเรียน</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-number">98%</span>
            <span class="stat-label">ความพึงพอใจ</span>
          </div>
        </div>
      </div>

      <!-- Hero Visual -->
      <div class="hero-visual">
        <div class="floating-card card-1">
          <div class="card-icon">🧠</div>
          <div class="card-text">การวิเคราะห์</div>
          <div class="card-score">5/5</div>
        </div>
        <div class="floating-card card-2">
          <div class="card-icon">💡</div>
          <div class="card-text">ความคิดสร้างสรรค์</div>
          <div class="card-score">4/5</div>
        </div>
        <div class="floating-card card-3">
          <div class="card-icon">📊</div>
          <div class="card-text">การให้เหตุผล</div>
          <div class="card-score">5/5</div>
        </div>
        <div class="central-orb">
          <div class="orb-ring ring-1"></div>
          <div class="orb-ring ring-2"></div>
          <div class="orb-ring ring-3"></div>
          <div class="orb-core">AI</div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features-section">
      <div class="section-header">
        <span class="section-badge">✨ Features</span>
        <h2 class="section-title">ทำไมต้องเลือก HOTS AI?</h2>
        <p class="section-subtitle">เครื่องมือที่ออกแบบมาเพื่อยกระดับการเรียนรู้</p>
      </div>

      <div class="features-grid">
        <div class="feature-card feature-highlight">
          <div class="feature-glow"></div>
          <div class="feature-icon-wrap">
            <span class="feature-icon">🤖</span>
          </div>
          <h3>AI Assessment</h3>
          <p>ประเมินทักษะการคิดขั้นสูงด้วย GPT-4o อย่างแม่นยำและเป็นกลาง</p>
          <div class="feature-tags">
            <span class="tag">Real-time</span>
            <span class="tag">Accurate</span>
          </div>
        </div>

        <div class="feature-card">
          <div class="feature-icon-wrap">
            <span class="feature-icon">⚡</span>
          </div>
          <h3>Instant Feedback</h3>
          <p>รับผลประเมินและคำแนะนำเฉพาะบุคคลทันทีหลังตอบคำถาม</p>
          <div class="feature-tags">
            <span class="tag">Personalized</span>
          </div>
        </div>

        <div class="feature-card">
          <div class="feature-icon-wrap">
            <span class="feature-icon">📈</span>
          </div>
          <h3>Progress Tracking</h3>
          <p>ติดตามพัฒนาการด้วยกราฟและ Analytics ที่เข้าใจง่าย</p>
          <div class="feature-tags">
            <span class="tag">Visual</span>
            <span class="tag">Detailed</span>
          </div>
        </div>

        <div class="feature-card">
          <div class="feature-icon-wrap">
            <span class="feature-icon">🎯</span>
          </div>
          <h3>Adaptive Learning</h3>
          <p>เส้นทางการเรียนรู้ที่ปรับตามจุดอ่อน-จุดแข็งของผู้เรียน</p>
          <div class="feature-tags">
            <span class="tag">Smart</span>
          </div>
        </div>

        <div class="feature-card">
          <div class="feature-icon-wrap">
            <span class="feature-icon">🏆</span>
          </div>
          <h3>Gamification</h3>
          <p>สะสมแต้ม เหรียญรางวัล และแข่งขันกับเพื่อนๆ ใน Leaderboard</p>
          <div class="feature-tags">
            <span class="tag">Fun</span>
            <span class="tag">Engaging</span>
          </div>
        </div>

        <div class="feature-card">
          <div class="feature-icon-wrap">
            <span class="feature-icon">👨‍🏫</span>
          </div>
          <h3>Teacher Dashboard</h3>
          <p>ครูดูภาพรวมห้องเรียน วิเคราะห์ข้อมูล และส่งออกรายงานได้</p>
          <div class="feature-tags">
            <span class="tag">Analytics</span>
          </div>
        </div>
      </div>
    </section>

    <!-- User Roles Section -->
    <section class="roles-section">
      <div class="section-header">
        <span class="section-badge">👥 For Everyone</span>
        <h2 class="section-title">เหมาะสำหรับทุกคน</h2>
      </div>

      <div class="roles-grid">
        <div class="role-card role-student">
          <div class="role-icon">🎓</div>
          <h3>นักเรียน</h3>
          <ul class="role-features">
            <li>✓ ทำแบบทดสอบ HOTS</li>
            <li>✓ รับ Feedback ทันที</li>
            <li>✓ ดูความก้าวหน้า</li>
            <li>✓ เก็บแต้มและเหรียญ</li>
          </ul>
        </div>

        <div class="role-card role-teacher">
          <div class="role-icon">👨‍🏫</div>
          <h3>ครู</h3>
          <ul class="role-features">
            <li>✓ สร้างคำถามด้วย AI</li>
            <li>✓ วิเคราะห์ห้องเรียน</li>
            <li>✓ ติดตามนักเรียน</li>
            <li>✓ ส่งออกรายงาน</li>
          </ul>
        </div>

        <div class="role-card role-parent">
          <div class="role-icon">👨‍👩‍👧‍👦</div>
          <h3>ผู้ปกครอง</h3>
          <ul class="role-features">
            <li>✓ ดูพัฒนาการบุตรหลาน</li>
            <li>✓ รับการแจ้งเตือน</li>
            <li>✓ ดู Portfolio</li>
            <li>✓ สนับสนุนการเรียน</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="cta-content">
        <h2>พร้อมยกระดับการเรียนรู้แล้วหรือยัง?</h2>
        <p>เริ่มต้นใช้งาน HOTS AI ChatLoop วันนี้ ฟรี!</p>
        <button @click="goToLogin" class="btn-glow btn-large">
          <span class="btn-content">
            <span class="btn-icon">🚀</span>
            เริ่มต้นเลย
          </span>
          <span class="btn-shine"></span>
        </button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-brand">
          <span class="footer-logo">🧠 HOTS AI</span>
          <p>ระบบประเมินทักษะการคิดขั้นสูงด้วย AI</p>
        </div>
        <div class="footer-links">
          <a href="#">เกี่ยวกับเรา</a>
          <a href="#">นโยบายความเป็นส่วนตัว</a>
          <a href="#">ติดต่อเรา</a>
        </div>
        <div class="footer-copyright">
          © 2025 HOTS AI ChatLoop. All rights reserved.
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goToLogin() {
  router.push('/login')
}

function scrollToFeatures() {
  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: var(--bg-primary);
  position: relative;
  overflow-x: hidden;
}

/* Animated Background */
.animated-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
  background: radial-gradient(ellipse at top right, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse at bottom left, rgba(118, 75, 162, 0.15) 0%, transparent 50%);
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.6;
  animation: float 25s ease-in-out infinite;
}

.orb-1 {
  width: 800px;
  height: 800px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%);
  top: -300px;
  right: -200px;
  animation-delay: 0s;
}

.orb-2 {
  width: 600px;
  height: 600px;
  background: linear-gradient(135deg, rgba(240, 147, 251, 0.3) 0%, rgba(245, 87, 108, 0.3) 100%);
  bottom: -200px;
  left: -200px;
  animation-delay: -8s;
}

.orb-3 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, rgba(79, 172, 254, 0.3) 0%, rgba(0, 242, 254, 0.3) 100%);
  top: 40%;
  left: 30%;
  animation-delay: -16s;
}

.grid-lines {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    linear-gradient(rgba(102, 126, 234, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(102, 126, 234, 0.05) 1px, transparent 1px);
  background-size: 60px 60px;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
  25% { transform: translate(80px, -80px) rotate(5deg) scale(1.1); }
  50% { transform: translate(150px, 80px) rotate(-5deg) scale(0.95); }
  75% { transform: translate(-80px, 120px) rotate(3deg) scale(1.05); }
}

/* Hero Section */
.hero-section {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  padding: 4rem;
  max-width: 1400px;
  margin: 0 auto;
}

.hero-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.badge-new {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(102, 126, 234, 0.2);
  border: 1px solid rgba(102, 126, 234, 0.4);
  border-radius: 50px;
  font-size: 0.875rem;
  color: #a5b4fc;
  width: fit-content;
}

.pulse {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.5); }
}

.title {
  font-size: 4.5rem;
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.title-line {
  display: block;
  color: var(--text-primary);
  text-shadow: 0 0 40px rgba(102, 126, 234, 0.3);
}

.title-gradient {
  display: block;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 30%, #f093fb 60%, #667eea 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  background-size: 300% 300%;
  animation: gradient-shift 4s ease infinite;
  filter: drop-shadow(0 0 30px rgba(102, 126, 234, 0.4));
}

@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.subtitle {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.description {
  font-size: 1.125rem;
  color: var(--text-secondary);
  line-height: 1.8;
}

/* CTA Buttons */
.cta-buttons {
  display: flex;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.btn-glow {
  position: relative;
  padding: 1.25rem 2.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 16px;
  color: white;
  font-size: 1.125rem;
  font-weight: 700;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.4s ease;
  box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
}

.btn-glow::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #764ba2 0%, #f093fb 100%);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.btn-glow:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 20px 60px rgba(102, 126, 234, 0.5);
}

.btn-glow:hover::before {
  opacity: 1;
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  z-index: 1;
}

.btn-icon {
  font-size: 1.25rem;
}

.btn-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: shine 3s ease-in-out infinite;
}

@keyframes shine {
  0% { left: -100%; }
  50%, 100% { left: 100%; }
}

.btn-outline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1.25rem 2.5rem;
  background: rgba(102, 126, 234, 0.1);
  border: 2px solid rgba(102, 126, 234, 0.5);
  border-radius: 16px;
  color: var(--text-primary);
  font-size: 1.125rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.4s ease;
  backdrop-filter: blur(10px);
}

.btn-outline:hover {
  border-color: var(--primary);
  background: rgba(102, 126, 234, 0.2);
  color: var(--primary);
  transform: translateY(-5px);
  box-shadow: 0 15px 40px rgba(102, 126, 234, 0.2);
}

.btn-large {
  padding: 1.25rem 3rem;
  font-size: 1.25rem;
}

/* Stats */
.stats-row {
  display: flex;
  align-items: center;
  gap: 2.5rem;
  margin-top: 3rem;
  padding: 2rem 2.5rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 20px;
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-number {
  font-size: 2.25rem;
  font-weight: 900;
  background: linear-gradient(135deg, #667eea 0%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.stat-divider {
  width: 2px;
  height: 50px;
  background: linear-gradient(180deg, transparent, rgba(102, 126, 234, 0.5), transparent);
  border-radius: 2px;
}

/* Hero Visual */
.hero-visual {
  position: relative;
  height: 550px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.floating-card {
  position: absolute;
  padding: 1.25rem 1.75rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 1rem;
  animation: float-card 8s ease-in-out infinite;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
}

.card-1 {
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.card-2 {
  top: 60%;
  left: 5%;
  animation-delay: -2s;
}

.card-3 {
  top: 30%;
  right: 5%;
  animation-delay: -4s;
}

@keyframes float-card {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

.card-icon {
  font-size: 2rem;
}

.card-text {
  font-weight: 600;
  color: var(--text-primary);
}

.card-score {
  padding: 0.25rem 0.75rem;
  background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 20px;
  font-weight: 700;
  font-size: 0.875rem;
  color: white;
}

/* Central Orb */
.central-orb {
  position: relative;
  width: 220px;
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orb-ring {
  position: absolute;
  border: 2px solid;
  border-radius: 50%;
  animation: orbit 10s linear infinite;
}

.ring-1 {
  width: 100%;
  height: 100%;
  border-color: rgba(102, 126, 234, 0.4);
  animation-duration: 8s;
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.2);
}

.ring-2 {
  width: 140%;
  height: 140%;
  border-color: rgba(118, 75, 162, 0.3);
  animation-duration: 12s;
  animation-direction: reverse;
}

.ring-3 {
  width: 180%;
  height: 180%;
  border-color: rgba(240, 147, 251, 0.2);
  animation-duration: 16s;
}

@keyframes orbit {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.orb-core {
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 900;
  color: white;
  box-shadow: 0 0 80px rgba(102, 126, 234, 0.6),
              0 0 120px rgba(118, 75, 162, 0.4),
              inset 0 0 30px rgba(255, 255, 255, 0.2);
  animation: pulse-core 3s ease-in-out infinite;
}

@keyframes pulse-core {
  0%, 100% { 
    box-shadow: 0 0 80px rgba(102, 126, 234, 0.6),
                0 0 120px rgba(118, 75, 162, 0.4),
                inset 0 0 30px rgba(255, 255, 255, 0.2);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 120px rgba(102, 126, 234, 0.8),
                0 0 180px rgba(118, 75, 162, 0.6),
                inset 0 0 40px rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }
}

/* Features Section */
.features-section {
  position: relative;
  z-index: 1;
  padding: 6rem 4rem;
  max-width: 1400px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 4rem;
}

.section-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: rgba(102, 126, 234, 0.2);
  border-radius: 50px;
  font-size: 0.875rem;
  color: #a5b4fc;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.section-subtitle {
  font-size: 1.125rem;
  color: var(--text-secondary);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.feature-card {
  position: relative;
  padding: 2.5rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 24px;
  transition: all 0.4s ease;
  overflow: hidden;
}

.feature-card:hover {
  transform: translateY(-10px);
  border-color: rgba(102, 126, 234, 0.5);
  box-shadow: 0 25px 50px rgba(102, 126, 234, 0.2);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
}

.feature-highlight {
  grid-column: span 1;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
  border-color: rgba(102, 126, 234, 0.4);
}

.feature-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%);
  pointer-events: none;
}

.feature-icon-wrap {
  width: 70px;
  height: 70px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
}

.feature-icon {
  font-size: 2rem;
}

.feature-card h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.feature-card p {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 1rem;
}

.feature-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  padding: 0.25rem 0.75rem;
  background: rgba(102, 126, 234, 0.2);
  border-radius: 20px;
  font-size: 0.75rem;
  color: #a5b4fc;
}

/* Roles Section */
.roles-section {
  position: relative;
  z-index: 1;
  padding: 6rem 4rem;
  max-width: 1400px;
  margin: 0 auto;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.role-card {
  padding: 2.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  text-align: center;
  transition: all 0.3s ease;
}

.role-card:hover {
  transform: translateY(-8px);
}

.role-student:hover {
  border-color: #10b981;
  box-shadow: 0 20px 40px rgba(16, 185, 129, 0.2);
}

.role-teacher:hover {
  border-color: #667eea;
  box-shadow: 0 20px 40px rgba(102, 126, 234, 0.2);
}

.role-parent:hover {
  border-color: #f59e0b;
  box-shadow: 0 20px 40px rgba(245, 158, 11, 0.2);
}

.role-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.role-card h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 1.5rem;
}

.role-features {
  list-style: none;
  padding: 0;
  text-align: left;
}

.role-features li {
  padding: 0.75rem 0;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.role-features li:last-child {
  border-bottom: none;
}

/* CTA Section */
.cta-section {
  position: relative;
  z-index: 1;
  padding: 6rem 4rem;
  margin: 2rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 30px;
  text-align: center;
}

.cta-content h2 {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.cta-content p {
  font-size: 1.25rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

/* Footer */
.footer {
  position: relative;
  z-index: 1;
  padding: 4rem;
  border-top: 1px solid var(--border-color);
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.footer-brand {
  text-align: center;
}

.footer-logo {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
}

.footer-brand p {
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.footer-links {
  display: flex;
  gap: 2rem;
}

.footer-links a {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.3s ease;
}

.footer-links a:hover {
  color: var(--primary);
}

.footer-copyright {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

/* Responsive */
@media (max-width: 1024px) {
  .hero-section {
    grid-template-columns: 1fr;
    text-align: center;
    padding: 2rem;
  }

  .hero-visual {
    display: none;
  }

  .title {
    font-size: 3rem;
  }

  .cta-buttons {
    justify-content: center;
  }

  .stats-row {
    justify-content: center;
  }

  .features-grid,
  .roles-grid {
    grid-template-columns: 1fr;
  }

  .feature-highlight {
    grid-column: span 1;
  }
}

@media (max-width: 768px) {
  .title {
    font-size: 2.5rem;
  }

  .section-title {
    font-size: 2rem;
  }

  .stats-row {
    flex-direction: column;
    gap: 1rem;
  }

  .stat-divider {
    width: 40px;
    height: 1px;
  }

  .cta-buttons {
    flex-direction: column;
  }

  .btn-glow,
  .btn-outline {
    width: 100%;
    justify-content: center;
  }

  .footer-links {
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
}
</style>
