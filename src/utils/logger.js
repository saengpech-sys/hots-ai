/**
 * 📊 Structured Logger Utility
 * 
 * Production-ready logging with:
 * - Log levels (debug, info, warn, error)
 * - Structured JSON output
 * - Context tracking
 * - Performance timing
 * - Error tracking integration
 * 
 * @example
 * import { logger } from '@/utils/logger'
 * logger.info('User logged in', { userId: '123' })
 * logger.error('API call failed', error, { endpoint: '/api/assess' })
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
}

// Get log level from environment
const getLogLevel = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const level = import.meta.env.VITE_LOG_LEVEL?.toUpperCase()
    if (level && LOG_LEVELS[level] !== undefined) {
      return LOG_LEVELS[level]
    }
    // Default: DEBUG in dev, INFO in production
    return import.meta.env.DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO
  }
  return LOG_LEVELS.INFO
}

const currentLogLevel = getLogLevel()

// Global context that's included in all logs
let globalContext = {}

/**
 * Set global context for all log entries
 * @param {Object} context - Context to merge
 */
export function setGlobalContext(context) {
  globalContext = { ...globalContext, ...context }
}

/**
 * Clear global context
 */
export function clearGlobalContext() {
  globalContext = {}
}

/**
 * Format log entry as structured JSON
 */
function formatLogEntry(level, message, data = {}, error = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...globalContext,
    ...data
  }
  
  // Add browser info
  if (typeof navigator !== 'undefined') {
    entry.userAgent = navigator.userAgent
    entry.url = window.location.href
    entry.referrer = document.referrer || undefined
  }
  
  // Add error info if present
  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    }
  }
  
  return entry
}

/**
 * Output log entry
 */
function outputLog(level, entry) {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  
  if (isDev) {
    // Pretty print in development
    const colors = {
      DEBUG: '#6b7280',
      INFO: '#3b82f6',
      WARN: '#f59e0b',
      ERROR: '#ef4444'
    }
    
    const style = `color: ${colors[level]}; font-weight: bold;`
    console.groupCollapsed(`%c[${level}] ${entry.message}`, style)
    console.log('📋 Data:', entry)
    if (entry.error) {
      console.error('❌ Error:', entry.error)
    }
    console.groupEnd()
  } else {
    // JSON in production (for log aggregation)
    const method = level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'log'
    console[method](JSON.stringify(entry))
  }
}

/**
 * Send log to external service (optional)
 */
async function sendToExternalService(entry) {
  // TODO: Integrate with error tracking service
  // Example: Sentry, LogRocket, Application Insights
  
  // if (entry.level === 'ERROR') {
  //   await fetch('/api/logs', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(entry)
  //   })
  // }
}

/**
 * Core logging function
 */
function log(level, message, dataOrError = {}, errorArg = null) {
  const levelNum = LOG_LEVELS[level]
  if (levelNum < currentLogLevel) return
  
  // Handle (message, error) signature
  let data = dataOrError
  let error = errorArg
  
  if (dataOrError instanceof Error) {
    error = dataOrError
    data = {}
  }
  
  const entry = formatLogEntry(level, message, data, error)
  outputLog(level, entry)
  
  // Send errors to external service
  if (level === 'ERROR') {
    sendToExternalService(entry).catch(() => {})
  }
  
  return entry
}

/**
 * Logger instance with log level methods
 */
export const logger = {
  debug: (message, data) => log('DEBUG', message, data),
  info: (message, data) => log('INFO', message, data),
  warn: (message, data) => log('WARN', message, data),
  error: (message, errorOrData, data) => log('ERROR', message, errorOrData, data),
  
  /**
   * Log with custom level
   */
  log: (level, message, data) => log(level.toUpperCase(), message, data),
  
  /**
   * Create child logger with additional context
   */
  child: (context) => {
    return {
      debug: (msg, data) => log('DEBUG', msg, { ...context, ...data }),
      info: (msg, data) => log('INFO', msg, { ...context, ...data }),
      warn: (msg, data) => log('WARN', msg, { ...context, ...data }),
      error: (msg, errOrData, data) => log('ERROR', msg, { ...context, ...(errOrData instanceof Error ? data : errOrData) }, errOrData instanceof Error ? errOrData : null),
    }
  },
  
  /**
   * Performance timing helper
   */
  time: (label) => {
    const start = performance.now()
    return {
      end: (message, data = {}) => {
        const duration = Math.round(performance.now() - start)
        log('INFO', message || `${label} completed`, { 
          ...data, 
          timing: { label, durationMs: duration }
        })
        return duration
      }
    }
  },
  
  /**
   * Log API call
   */
  api: (method, endpoint, data = {}) => {
    const timer = logger.time(`API ${method} ${endpoint}`)
    return {
      success: (response) => {
        timer.end('API call succeeded', {
          api: { method, endpoint, status: response?.status || 200, ...data }
        })
      },
      error: (error) => {
        log('ERROR', 'API call failed', {
          api: { method, endpoint, ...data }
        }, error)
      }
    }
  },
  
  /**
   * Log user action
   */
  action: (action, data = {}) => {
    log('INFO', `User action: ${action}`, { action, ...data })
  },
  
  /**
   * Log page view
   */
  pageView: (page, data = {}) => {
    log('INFO', `Page view: ${page}`, { page, ...data })
  },
  
  /**
   * Log assessment event
   */
  assessment: (event, data = {}) => {
    log('INFO', `Assessment: ${event}`, { 
      category: 'assessment',
      event,
      ...data 
    })
  },
  
  /**
   * Log feature usage
   */
  feature: (feature, action, data = {}) => {
    log('INFO', `Feature: ${feature} - ${action}`, {
      category: 'feature',
      feature,
      action,
      ...data
    })
  }
}

/**
 * Create a scoped logger for a specific module/component
 * @param {string} module - Module name
 * @returns {Object} Scoped logger
 */
export function createLogger(module) {
  return logger.child({ module })
}

/**
 * Vue plugin for logger
 */
export const LoggerPlugin = {
  install(app) {
    app.config.globalProperties.$logger = logger
    app.provide('logger', logger)
    
    // Global error handler
    app.config.errorHandler = (error, instance, info) => {
      logger.error('Vue error', error, {
        component: instance?.$options?.name || 'Unknown',
        info
      })
    }
    
    // Unhandled promise rejection handler
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        logger.error('Unhandled promise rejection', event.reason)
      })
    }
  }
}

export default logger
