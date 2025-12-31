/**
 * 🤖 Multi-LLM Provider Abstraction Layer
 * 
 * รองรับ multiple LLM providers เพื่อลด vendor lock-in
 * และเพิ่ม resilience ด้วย automatic fallback
 * 
 * Supported Providers:
 * 1. OpenAI (GPT-4o-mini, GPT-4o)
 * 2. Azure OpenAI
 * 3. Anthropic Claude (future)
 * 4. Google Gemini (future)
 * 
 * Features:
 * - Automatic fallback on failure
 * - Unified response format
 * - Cost tracking per provider
 * - Rate limit handling
 * - Circuit Breaker protection
 * - Locked model versions for consistency
 * 
 * @version 2.0.0
 * @since 2025-12-23
 */

const OpenAI = require('openai')
const { getCircuitBreaker, isOpenAIAvailable } = require('./circuitBreaker')
const { getOpenAIClient, getDefaultModel, MODELS } = require('./openaiClient')

/**
 * Provider Configuration
 */
const PROVIDERS = {
  OPENAI: 'openai',
  AZURE_OPENAI: 'azure_openai',
  ANTHROPIC: 'anthropic',
  GEMINI: 'gemini'
}

/**
 * 🔒 LOCKED MODEL VERSIONS
 * ใช้ specific version เพื่อป้องกัน model drift
 * เมื่อ OpenAI update model behavior จะไม่กระทบ production
 */
const LOCKED_MODELS = {
  // Primary model for assessments - locked to specific version
  'gpt-4o-mini': 'gpt-4o-mini-2024-07-18',
  'gpt-4o': 'gpt-4o-2024-08-06',
  'gpt-4-turbo': 'gpt-4-turbo-2024-04-09',
  // Fallback versions
  'gpt-4o-mini-latest': 'gpt-4o-mini',  // Use if specific version fails
  'gpt-4o-latest': 'gpt-4o'
}

/**
 * Get locked model version
 * @param {string} modelName - Model name
 * @returns {string} Locked version or original name
 */
function getLockedModelVersion(modelName) {
  return LOCKED_MODELS[modelName] || modelName
}

/**
 * Model pricing per 1M tokens (as of Dec 2025)
 */
const MODEL_PRICING = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o-mini-2024-07-18': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-2024-08-06': { input: 2.50, output: 10.00 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4-turbo-2024-04-09': { input: 10.00, output: 30.00 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3-sonnet': { input: 3.00, output: 15.00 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 }
}

/**
 * Default provider priority for fallback
 */
const DEFAULT_FALLBACK_ORDER = [
  PROVIDERS.OPENAI,
  PROVIDERS.AZURE_OPENAI
]

/**
 * LLM Provider Manager
 * Handles multiple providers with automatic fallback
 */
class LLMProviderManager {
  constructor(config = {}) {
    this.providers = new Map()
    this.fallbackOrder = config.fallbackOrder || DEFAULT_FALLBACK_ORDER
    this.costTracker = {
      totalCost: 0,
      byProvider: {},
      byModel: {}
    }
    
    // Initialize providers
    this._initializeProviders(config)
  }

  /**
   * Initialize all configured providers
   */
  _initializeProviders(config) {
    // OpenAI - use centralized client if available
    try {
      const openaiClient = getOpenAIClient()
      this.providers.set(PROVIDERS.OPENAI, {
        client: openaiClient,
        name: 'OpenAI',
        isAvailable: true,
        defaultModel: getDefaultModel(),
        lastError: null,
        consecutiveFailures: 0
      })
      console.log('✅ OpenAI provider initialized (via centralized client)')
    } catch (error) {
      console.warn('⚠️ Failed to initialize OpenAI:', error.message)
    }

    // Azure OpenAI - still using direct configuration
    if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
      try {
        this.providers.set(PROVIDERS.AZURE_OPENAI, {
          client: new OpenAI({
            apiKey: process.env.AZURE_OPENAI_API_KEY,
            baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
            defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview' },
            defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY }
          }),
          name: 'Azure OpenAI',
          isAvailable: true,
          defaultModel: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',
          lastError: null,
          consecutiveFailures: 0
        })
        console.log('✅ Azure OpenAI provider initialized')
      } catch (error) {
        console.warn('⚠️ Failed to initialize Azure OpenAI:', error.message)
      }
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders() {
    const available = []
    this.providers.forEach((provider, key) => {
      if (provider.isAvailable && provider.consecutiveFailures < 3) {
        available.push({
          id: key,
          name: provider.name,
          defaultModel: provider.defaultModel
        })
      }
    })
    return available
  }

  /**
   * Create chat completion with automatic fallback and circuit breaker
   * 
   * @param {Object} params - Completion parameters
   * @param {Array} params.messages - Chat messages
   * @param {string} params.model - Model to use (optional)
   * @param {number} params.temperature - Temperature (default: 0)
   * @param {number} params.maxTokens - Max tokens
   * @param {number} params.seed - Seed for reproducibility
   * @param {string} params.preferredProvider - Preferred provider ID
   * @param {boolean} params.useLockedVersion - Use locked model version (default: true)
   * @returns {Object} Unified response
   */
  async createChatCompletion(params) {
    const {
      messages,
      model,
      temperature = 0,
      maxTokens = 1500,
      seed = 42,
      preferredProvider = null,
      useLockedVersion = true
    } = params

    // 🔒 Use locked model version for consistency
    const resolvedModel = useLockedVersion 
      ? getLockedModelVersion(model || this.providers.get(PROVIDERS.OPENAI)?.defaultModel || 'gpt-4o-mini')
      : (model || 'gpt-4o-mini')

    // 🔌 Check circuit breaker before attempting
    const circuitBreaker = getCircuitBreaker('openai')
    if (!circuitBreaker.canExecute()) {
      console.warn('🔌 Circuit breaker OPEN - returning graceful error')
      return {
        success: false,
        error: 'Service temporarily unavailable due to high error rate',
        circuitState: 'OPEN',
        attemptLog: [{
          provider: 'circuit_breaker',
          success: false,
          error: 'Circuit breaker open',
          duration: 0
        }]
      }
    }

    // Determine provider order
    const providerOrder = preferredProvider 
      ? [preferredProvider, ...this.fallbackOrder.filter(p => p !== preferredProvider)]
      : this.fallbackOrder

    let lastError = null
    const attemptLog = []

    for (const providerId of providerOrder) {
      const provider = this.providers.get(providerId)
      
      if (!provider || !provider.isAvailable) {
        continue
      }

      // Skip if too many consecutive failures
      if (provider.consecutiveFailures >= 3) {
        console.warn(`⚠️ Skipping ${provider.name} due to consecutive failures`)
        continue
      }

      const attemptStart = Date.now()
      
      try {
        // Execute with circuit breaker protection
        const circuitResult = await circuitBreaker.execute(async () => {
          return await provider.client.chat.completions.create({
            model: resolvedModel,
            messages,
            temperature,
            max_tokens: maxTokens,
            seed
          })
        })

        if (!circuitResult.success) {
          throw circuitResult.error || new Error('Circuit breaker rejected request')
        }

        const completion = circuitResult.result
        const attemptDuration = Date.now() - attemptStart

        // Reset failure counter on success
        provider.consecutiveFailures = 0
        provider.lastError = null

        // Track cost
        const usage = completion.usage || {}
        this._trackCost(providerId, resolvedModel, usage)

        // Log successful attempt
        attemptLog.push({
          provider: providerId,
          success: true,
          duration: attemptDuration
        })

        return {
          success: true,
          provider: providerId,
          providerName: provider.name,
          model: model || provider.defaultModel,
          content: completion.choices[0].message.content,
          usage: {
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
            totalTokens: usage.total_tokens || 0
          },
          attemptLog,
          finishReason: completion.choices[0].finish_reason
        }

      } catch (error) {
        const attemptDuration = Date.now() - attemptStart
        
        provider.consecutiveFailures++
        provider.lastError = error.message
        lastError = error

        attemptLog.push({
          provider: providerId,
          success: false,
          error: error.message,
          duration: attemptDuration
        })

        console.error(`❌ ${provider.name} failed:`, error.message)

        // Check if we should mark provider as unavailable
        if (this._isProviderDown(error)) {
          provider.isAvailable = false
          console.warn(`🔴 ${provider.name} marked as unavailable`)
        }

        // Continue to next provider
        continue
      }
    }

    // All providers failed
    return {
      success: false,
      error: lastError?.message || 'All providers failed',
      attemptLog
    }
  }

  /**
   * Check if error indicates provider is down
   */
  _isProviderDown(error) {
    const message = error.message?.toLowerCase() || ''
    return (
      message.includes('service unavailable') ||
      message.includes('rate limit') ||
      message.includes('timeout') ||
      message.includes('connection refused') ||
      error.status === 503 ||
      error.status === 429
    )
  }

  /**
   * Track usage cost
   */
  _trackCost(providerId, model, usage) {
    const pricing = MODEL_PRICING[model] || { input: 0, output: 0 }
    
    const inputCost = (usage.prompt_tokens || 0) / 1000000 * pricing.input
    const outputCost = (usage.completion_tokens || 0) / 1000000 * pricing.output
    const totalCost = inputCost + outputCost

    this.costTracker.totalCost += totalCost
    
    if (!this.costTracker.byProvider[providerId]) {
      this.costTracker.byProvider[providerId] = 0
    }
    this.costTracker.byProvider[providerId] += totalCost

    if (!this.costTracker.byModel[model]) {
      this.costTracker.byModel[model] = 0
    }
    this.costTracker.byModel[model] += totalCost
  }

  /**
   * Get cost statistics
   */
  getCostStats() {
    return {
      ...this.costTracker,
      formattedTotal: `$${this.costTracker.totalCost.toFixed(6)}`
    }
  }

  /**
   * Health check all providers
   */
  async healthCheck() {
    const results = {}

    for (const [providerId, provider] of this.providers) {
      try {
        const start = Date.now()
        
        await provider.client.chat.completions.create({
          model: provider.defaultModel,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5
        })

        results[providerId] = {
          status: 'healthy',
          latency: Date.now() - start,
          consecutiveFailures: provider.consecutiveFailures
        }

        // Reset availability on successful health check
        provider.isAvailable = true
        provider.consecutiveFailures = 0

      } catch (error) {
        results[providerId] = {
          status: 'unhealthy',
          error: error.message,
          consecutiveFailures: provider.consecutiveFailures
        }
      }
    }

    return results
  }

  /**
   * Reset provider availability
   */
  resetProvider(providerId) {
    const provider = this.providers.get(providerId)
    if (provider) {
      provider.isAvailable = true
      provider.consecutiveFailures = 0
      provider.lastError = null
    }
  }

  /**
   * 🆕 Complete method for Multi-Agent Assessment compatibility
   * Simple wrapper around createChatCompletion for text-based prompts
   * 
   * @param {string} prompt - Text prompt to complete
   * @param {Object} options - Completion options
   * @returns {string} Completed text response
   */
  async complete(prompt, options = {}) {
    const {
      temperature = 0.3,
      maxTokens = 2000,
      model = null
    } = options

    const messages = [
      { role: 'system', content: 'You are a professional educational assessment expert specializing in HOTS (Higher-Order Thinking Skills) evaluation. Respond in JSON format when requested.' },
      { role: 'user', content: prompt }
    ]

    const result = await this.createChatCompletion({
      messages,
      temperature,
      maxTokens,
      model
    })

    if (!result.success) {
      throw new Error(result.error || 'LLM completion failed')
    }

    return result.content
  }
}

// Singleton instance
let providerManager = null

/**
 * Get or create LLM Provider Manager instance
 */
function getLLMProvider(config = {}) {
  if (!providerManager) {
    providerManager = new LLMProviderManager(config)
  }
  return providerManager
}

/**
 * Create chat completion using default provider manager
 */
async function createChatCompletion(params) {
  const manager = getLLMProvider()
  return manager.createChatCompletion(params)
}

module.exports = {
  LLMProviderManager,
  getLLMProvider,
  createChatCompletion,
  getLockedModelVersion,
  PROVIDERS,
  MODEL_PRICING,
  LOCKED_MODELS
}
