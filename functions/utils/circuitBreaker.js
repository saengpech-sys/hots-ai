/**
 * 🔌 Circuit Breaker Pattern for OpenAI API
 * 
 * ป้องกันระบบล่มเมื่อ OpenAI service มีปัญหา
 * - CLOSED: ทำงานปกติ
 * - OPEN: block requests ทันที (ไม่รอ timeout)
 * - HALF_OPEN: ทดสอบว่า service กลับมาหรือยัง
 * 
 * @version 1.0.0
 * @since 2025-12-23
 */

/**
 * Circuit Breaker States
 */
const STATES = {
  CLOSED: 'CLOSED',      // Normal operation
  OPEN: 'OPEN',          // Failing, reject requests
  HALF_OPEN: 'HALF_OPEN' // Testing if service recovered
}

/**
 * Circuit Breaker Configuration
 */
const DEFAULT_CONFIG = {
  failureThreshold: 5,       // Open circuit after 5 failures
  successThreshold: 2,       // Close circuit after 2 successes in half-open
  timeout: 60000,            // 60 seconds before trying half-open
  monitoringWindow: 60000,   // 1 minute window for counting failures
  resetTimeout: 300000       // 5 minutes before full reset
}

/**
 * Circuit Breaker for API calls
 */
class CircuitBreaker {
  constructor(name, config = {}) {
    this.name = name
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.state = STATES.CLOSED
    this.failures = []
    this.successes = 0
    this.lastFailureTime = null
    this.lastStateChange = Date.now()
    this.stats = {
      totalCalls: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      rejectedCalls: 0,
      lastError: null
    }
  }

  /**
   * Get current state info
   */
  getState() {
    return {
      name: this.name,
      state: this.state,
      recentFailures: this.getRecentFailures().length,
      failureThreshold: this.config.failureThreshold,
      successesInHalfOpen: this.successes,
      timeSinceLastFailure: this.lastFailureTime 
        ? Date.now() - this.lastFailureTime 
        : null,
      stats: this.stats
    }
  }

  /**
   * Get failures within monitoring window
   */
  getRecentFailures() {
    const windowStart = Date.now() - this.config.monitoringWindow
    return this.failures.filter(f => f > windowStart)
  }

  /**
   * Check if circuit allows request
   */
  canExecute() {
    this._checkStateTransition()
    
    if (this.state === STATES.OPEN) {
      this.stats.rejectedCalls++
      return false
    }
    
    return true
  }

  /**
   * Execute a function with circuit breaker protection
   * 
   * @param {Function} fn - Async function to execute
   * @param {Function} fallback - Fallback function if circuit is open
   * @returns {Promise<{success: boolean, result?: any, error?: Error, circuitState: string}>}
   */
  async execute(fn, fallback = null) {
    this.stats.totalCalls++
    
    // Check if circuit allows execution
    if (!this.canExecute()) {
      console.warn(`🔌 Circuit ${this.name} is OPEN - rejecting request`)
      
      if (fallback) {
        const fallbackResult = await fallback()
        return {
          success: false,
          result: fallbackResult,
          circuitState: this.state,
          usedFallback: true,
          error: new Error(`Circuit ${this.name} is open`)
        }
      }
      
      return {
        success: false,
        circuitState: this.state,
        error: new Error(`Circuit ${this.name} is open - service temporarily unavailable`)
      }
    }

    try {
      const result = await fn()
      this._recordSuccess()
      return {
        success: true,
        result,
        circuitState: this.state
      }
    } catch (error) {
      this._recordFailure(error)
      
      // If we have a fallback and circuit just opened, use it
      if (fallback && this.state === STATES.OPEN) {
        const fallbackResult = await fallback()
        return {
          success: false,
          result: fallbackResult,
          circuitState: this.state,
          usedFallback: true,
          error
        }
      }
      
      throw error
    }
  }

  /**
   * Record successful call
   */
  _recordSuccess() {
    this.stats.totalSuccesses++
    
    if (this.state === STATES.HALF_OPEN) {
      this.successes++
      
      if (this.successes >= this.config.successThreshold) {
        this._transitionTo(STATES.CLOSED)
        console.log(`✅ Circuit ${this.name} CLOSED - service recovered`)
      }
    }
  }

  /**
   * Record failed call
   */
  _recordFailure(error) {
    this.stats.totalFailures++
    this.stats.lastError = error.message
    this.lastFailureTime = Date.now()
    this.failures.push(Date.now())
    
    // Clean old failures
    this.failures = this.getRecentFailures()
    
    if (this.state === STATES.HALF_OPEN) {
      // Any failure in half-open goes back to open
      this._transitionTo(STATES.OPEN)
      console.warn(`🔴 Circuit ${this.name} OPEN - test failed`)
    } else if (this.state === STATES.CLOSED) {
      // Check if we should open
      if (this.failures.length >= this.config.failureThreshold) {
        this._transitionTo(STATES.OPEN)
        console.warn(`🔴 Circuit ${this.name} OPEN - threshold reached (${this.failures.length} failures)`)
      }
    }
  }

  /**
   * Check and perform state transitions based on time
   */
  _checkStateTransition() {
    const now = Date.now()
    
    if (this.state === STATES.OPEN) {
      const timeSinceOpen = now - this.lastStateChange
      
      if (timeSinceOpen >= this.config.timeout) {
        this._transitionTo(STATES.HALF_OPEN)
        console.log(`🟡 Circuit ${this.name} HALF_OPEN - testing service`)
      }
    }
  }

  /**
   * Transition to new state
   */
  _transitionTo(newState) {
    this.state = newState
    this.lastStateChange = Date.now()
    
    if (newState === STATES.CLOSED) {
      this.failures = []
      this.successes = 0
    } else if (newState === STATES.HALF_OPEN) {
      this.successes = 0
    }
  }

  /**
   * Force reset circuit to closed state
   */
  reset() {
    this._transitionTo(STATES.CLOSED)
    this.stats = {
      totalCalls: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      rejectedCalls: 0,
      lastError: null
    }
    console.log(`🔄 Circuit ${this.name} manually reset`)
  }

  /**
   * Force open the circuit (for maintenance)
   */
  forceOpen() {
    this._transitionTo(STATES.OPEN)
    console.warn(`⚠️ Circuit ${this.name} force opened`)
  }

  /**
   * Public method to record success (for external retry mechanisms)
   */
  recordSuccess() {
    this._recordSuccess()
  }

  /**
   * Public method to record failure (for external retry mechanisms)
   */
  recordFailure(error) {
    this._recordFailure(error)
  }
}

// Singleton instances for different services
const circuits = new Map()

/**
 * Get or create a circuit breaker for a service
 * 
 * @param {string} serviceName - Name of the service
 * @param {Object} config - Optional configuration
 * @returns {CircuitBreaker}
 */
function getCircuitBreaker(serviceName, config = {}) {
  if (!circuits.has(serviceName)) {
    circuits.set(serviceName, new CircuitBreaker(serviceName, config))
  }
  return circuits.get(serviceName)
}

/**
 * OpenAI-specific circuit breaker with appropriate config
 */
function getOpenAICircuitBreaker() {
  return getCircuitBreaker('openai', {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,       // 1 minute before testing
    monitoringWindow: 60000
  })
}

/**
 * Get health status of all circuit breakers
 */
function getAllCircuitStatus() {
  const status = {}
  circuits.forEach((circuit, name) => {
    status[name] = circuit.getState()
  })
  return status
}

/**
 * Check if OpenAI service is available (quick check)
 */
function isOpenAIAvailable() {
  const circuit = getOpenAICircuitBreaker()
  return circuit.canExecute()
}

module.exports = {
  CircuitBreaker,
  getCircuitBreaker,
  getOpenAICircuitBreaker,
  getAllCircuitStatus,
  isOpenAIAvailable,
  STATES,
  DEFAULT_CONFIG
}
