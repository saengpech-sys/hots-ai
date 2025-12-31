/**
 * 🔑 Centralized OpenAI Client Manager
 * 
 * จัดการ OpenAI client ที่เดียว เพื่อ:
 * 1. เปลี่ยน API key ที่เดียว ทำงานทั้งระบบ
 * 2. ใช้ Firebase Secret อย่างถูกต้อง
 * 3. มี timeout และ retry ในตัว
 * 4. Lock model version เพื่อความคงที่
 * 
 * Usage:
 *   const { getOpenAIClient, MODELS } = require('./utils/openaiClient')
 *   const openai = getOpenAIClient()
 *   await openai.chat.completions.create({ model: MODELS.GPT4O_MINI, ... })
 * 
 * @version 1.0.0
 * @since 2025-12-28
 */

const { OpenAI } = require('openai')
const { defineSecret } = require('firebase-functions/params')

// Firebase Secret for OpenAI API Key
const openaiApiKey = defineSecret('OPENAI_API_KEY')

// Singleton OpenAI client instance
let openaiClient = null

/**
 * 🔒 LOCKED MODEL VERSIONS
 * ใช้ specific version เพื่อป้องกัน model drift
 * เมื่อ OpenAI update model behavior จะไม่กระทบ production
 */
const MODELS = {
  // Primary model - cost-effective
  GPT4O_MINI: 'gpt-4o-mini-2024-07-18',
  
  // High capability model
  GPT4O: 'gpt-4o-2024-08-06',
  
  // Legacy models
  GPT4_TURBO: 'gpt-4-turbo-2024-04-09',
  
  // Alias for default model
  DEFAULT: 'gpt-4o-mini-2024-07-18'
}

/**
 * Model pricing per 1M tokens (for cost tracking)
 */
const MODEL_PRICING = {
  'gpt-4o-mini-2024-07-18': { input: 0.15, output: 0.60 },
  'gpt-4o-2024-08-06': { input: 2.50, output: 10.00 },
  'gpt-4-turbo-2024-04-09': { input: 10.00, output: 30.00 }
}

/**
 * OpenAI Client Configuration
 */
const CLIENT_CONFIG = {
  timeout: 300000,     // 5 นาที timeout สำหรับ complex generation
  maxRetries: 2        // Built-in retries from OpenAI SDK
}

/**
 * Get OpenAI client instance - lazily initializes using Firebase Secret
 * 
 * IMPORTANT: This function must be called INSIDE a Cloud Function 
 * that has `secrets: [openaiApiKey]` in its runWith config.
 * 
 * @returns {OpenAI} OpenAI client instance
 * @throws {Error} If API key is not configured
 */
function getOpenAIClient() {
  if (!openaiClient) {
    let apiKey
    
    // Try Firebase Secret first (production)
    try {
      apiKey = openaiApiKey.value()
    } catch (e) {
      // Fallback to environment variable (local development)
      apiKey = process.env.OPENAI_API_KEY
    }
    
    if (!apiKey) {
      console.error('❌ OpenAI API key not available')
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY secret or environment variable.')
    }
    
    openaiClient = new OpenAI({
      apiKey,
      timeout: CLIENT_CONFIG.timeout,
      maxRetries: CLIENT_CONFIG.maxRetries
    })
    
    console.log('✅ OpenAI client initialized (timeout: 300s, retries: 2)')
  }
  
  return openaiClient
}

/**
 * Reset the OpenAI client (useful for testing or key rotation)
 */
function resetOpenAIClient() {
  openaiClient = null
  console.log('🔄 OpenAI client reset')
}

/**
 * Get the default model name
 * @returns {string} Default model name
 */
function getDefaultModel() {
  return process.env.OPENAI_MODEL || MODELS.DEFAULT
}

/**
 * Get locked model version from alias
 * @param {string} modelName - Model name or alias
 * @returns {string} Locked version
 */
function getLockedModelVersion(modelName) {
  const MODEL_MAP = {
    'gpt-4o-mini': MODELS.GPT4O_MINI,
    'gpt-4o': MODELS.GPT4O,
    'gpt-4-turbo': MODELS.GPT4_TURBO
  }
  return MODEL_MAP[modelName] || modelName
}

/**
 * Estimate cost for a completion
 * @param {string} model - Model name
 * @param {number} inputTokens - Input token count
 * @param {number} outputTokens - Output token count
 * @returns {number} Estimated cost in USD
 */
function estimateCost(model, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING[MODELS.DEFAULT]
  const inputCost = (inputTokens / 1000000) * pricing.input
  const outputCost = (outputTokens / 1000000) * pricing.output
  return inputCost + outputCost
}

/**
 * Export the Firebase Secret for use in function runWith config
 * Usage: functions.runWith({ secrets: [openaiApiKeySecret] })
 */
const openaiApiKeySecret = openaiApiKey

module.exports = {
  getOpenAIClient,
  resetOpenAIClient,
  getDefaultModel,
  getLockedModelVersion,
  estimateCost,
  openaiApiKeySecret,
  MODELS,
  MODEL_PRICING,
  CLIENT_CONFIG
}
