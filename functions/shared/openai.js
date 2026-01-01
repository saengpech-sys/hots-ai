/**
 * 🤖 OpenAI Shared Module
 * Centralized OpenAI client configuration and utilities
 * 
 * @module shared/openai
 * @description
 * Re-exports OpenAI client utilities from utils/openaiClient.js
 * Provides consistent access to OpenAI across all controllers.
 * 
 * @example
 * const { getOpenAIClient, openaiApiKeySecret } = require('../shared/openai')
 * 
 * exports.myFunction = functions
 *   .runWith({ secrets: [openaiApiKeySecret] })
 *   .https.onRequest(async (req, res) => {
 *     const openai = getOpenAIClient()
 *     // Use openai...
 *   })
 */

const { 
  getOpenAIClient, 
  openaiApiKeySecret, 
  getDefaultModel, 
  MODELS 
} = require('../utils/openaiClient')

// =============================================================================
// 🤖 AI CONFIGURATION
// =============================================================================

/**
 * Default AI configuration for deterministic assessment
 */
const AI_CONFIG = {
  // Deterministic settings for reproducibility
  DETERMINISTIC: {
    temperature: 0,
    seed: 42
  },
  
  // Creative settings for content generation
  CREATIVE: {
    temperature: 0.7
  },
  
  // Default token limits
  TOKENS: {
    ASSESSMENT: 2000,
    GENERATION: 4000,
    LESSON_PLAN: 8000
  },
  
  // Timeout settings (ms)
  TIMEOUT: {
    DEFAULT: 30000,
    LONG: 60000,
    VERY_LONG: 120000
  }
}

/**
 * Clean markdown wrappers from GPT response
 * GPT often wraps JSON in ```json blocks
 * 
 * @param {string} responseText - Raw response from OpenAI
 * @returns {string} Cleaned response text
 */
function cleanGPTResponse(responseText) {
  let cleanedText = responseText.trim()
  
  // Remove ```json or ``` wrapper
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
    cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
  }
  
  return cleanedText.trim()
}

/**
 * Parse JSON from GPT response with error handling
 * 
 * @param {string} responseText - Raw response from OpenAI
 * @param {string} context - Context for error logging
 * @returns {Object} Parsed JSON object
 * @throws {Error} If parsing fails
 */
function parseGPTJSON(responseText, context = 'unknown') {
  try {
    const cleaned = cleanGPTResponse(responseText)
    return JSON.parse(cleaned)
  } catch (error) {
    console.error(`❌ Failed to parse GPT JSON in ${context}:`, responseText?.substring(0, 500))
    throw new Error(`Invalid JSON response from AI: ${error.message}`)
  }
}

/**
 * Create OpenAI chat completion with standard settings
 * 
 * @param {Object} openai - OpenAI client instance
 * @param {Object} options - Completion options
 * @returns {Promise<Object>} Completion response
 */
async function createCompletion(openai, {
  messages,
  model = null,
  temperature = AI_CONFIG.DETERMINISTIC.temperature,
  maxTokens = AI_CONFIG.TOKENS.ASSESSMENT,
  seed = AI_CONFIG.DETERMINISTIC.seed
}) {
  const effectiveModel = model || process.env.OPENAI_MODEL || getDefaultModel()
  
  return await openai.chat.completions.create({
    model: effectiveModel,
    messages,
    temperature,
    max_tokens: maxTokens,
    seed: temperature === 0 ? seed : undefined
  })
}

module.exports = {
  // Re-export from openaiClient
  getOpenAIClient,
  openaiApiKeySecret,
  getDefaultModel,
  MODELS,
  
  // Configuration
  AI_CONFIG,
  
  // Utilities
  cleanGPTResponse,
  parseGPTJSON,
  createCompletion
}
