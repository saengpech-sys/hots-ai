/**
 * 📊 Structured Logger for Cloud Functions
 * 
 * Production-ready logging with structured output
 * Compatible with Google Cloud Logging
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
}

// Get current log level from environment
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO

/**
 * Format log entry for Cloud Logging
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 * @returns {Object} Formatted log entry
 */
function formatEntry(level, message, data = {}) {
  const entry = {
    severity: level,
    message,
    timestamp: new Date().toISOString(),
    ...data
  }
  
  // Add trace context if available
  if (process.env.FUNCTION_TARGET) {
    entry.function = process.env.FUNCTION_TARGET
  }
  
  return entry
}

/**
 * Output log entry
 */
function outputLog(level, entry) {
  const levelNum = LOG_LEVELS[level] ?? LOG_LEVELS.INFO
  if (levelNum < currentLevel) return
  
  const json = JSON.stringify(entry)
  
  switch (level) {
    case 'ERROR':
      console.error(json)
      break
    case 'WARN':
      console.warn(json)
      break
    default:
      console.log(json)
  }
}

/**
 * Logger instance
 */
const logger = {
  debug: (message, data) => outputLog('DEBUG', formatEntry('DEBUG', message, data)),
  info: (message, data) => outputLog('INFO', formatEntry('INFO', message, data)),
  warn: (message, data) => outputLog('WARN', formatEntry('WARNING', message, data)),
  error: (message, error, data = {}) => {
    const entry = formatEntry('ERROR', message, {
      ...data,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    })
    outputLog('ERROR', entry)
  },
  
  /**
   * Create child logger with context
   */
  child: (context) => ({
    debug: (msg, data) => logger.debug(msg, { ...context, ...data }),
    info: (msg, data) => logger.info(msg, { ...context, ...data }),
    warn: (msg, data) => logger.warn(msg, { ...context, ...data }),
    error: (msg, err, data) => logger.error(msg, err, { ...context, ...data })
  }),
  
  /**
   * Log AI operation
   */
  ai: (operation, data) => {
    logger.info(`AI: ${operation}`, { 
      category: 'ai', 
      operation,
      ...data 
    })
  },
  
  /**
   * Log API request
   */
  request: (method, path, data) => {
    logger.info(`${method} ${path}`, { 
      category: 'api',
      method,
      path,
      ...data 
    })
  },
  
  /**
   * Performance timing
   */
  time: (label) => {
    const start = Date.now()
    return {
      end: (message, data = {}) => {
        const duration = Date.now() - start
        logger.info(message || `${label} completed`, {
          ...data,
          timing: { label, durationMs: duration }
        })
        return duration
      }
    }
  }
}

module.exports = { logger }
