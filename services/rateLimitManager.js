// services/rateLimitManager.js - Manages rate limits for external APIs
class RateLimitManager {
  constructor() {
    this.limits = {
      met: {
        requests: 80,       // Met Museum API has no documented limit, but we'll be conservative
        period: 60 * 1000,  // 1 minute
        current: 0,
        resetAt: null,
        rateLimited: false,
        resumeAt: null
      },
      openai: {
        tokens: 10000,      // Tokens per minute (TPM) varies by API key
        period: 60 * 1000,  // 1 minute
        current: 0,
        resetAt: null,
        rateLimited: false,
        resumeAt: null
      },
      shopify: {
        requests: 2,         // Requests per second
        period: 1 * 1000,    // 1 second
        current: 0,
        resetAt: null,
        rateLimited: false,
        resumeAt: null
      }
    };
  }
  
  async checkMetApiLimit() {
    return this.checkRateLimit('met');
  }
  
  async checkOpenAILimit() {
    return this.checkRateLimit('openai');
  }
  
  async checkShopifyLimit() {
    return this.checkRateLimit('shopify');
  }
  
  async checkRateLimit(service) {
    const limit = this.limits[service];
    if (!limit) {
      throw new Error(`Unknown service: ${service}`);
    }
    
    // Check if rate limited
    if (limit.rateLimited) {
      if (Date.now() >= limit.resumeAt) {
        // Rate limit period has passed
        limit.rateLimited = false;
        limit.resumeAt = null;
      } else {
        // Still rate limited
        const retryAfter = Math.ceil((limit.resumeAt - Date.now()) / 1000);
        throw {
          code: 'RATE_LIMIT_EXCEEDED',
          service,
          retryAfter,
          message: `Rate limit for ${service} API exceeded. Retry after ${retryAfter} seconds.`
        };
      }
    }
    
    // Reset counter if period has elapsed
    if (limit.resetAt && Date.now() > limit.resetAt) {
      limit.current = 0;
      limit.resetAt = null;
    }
    
    // Initialize reset time if not set
    if (!limit.resetAt) {
      limit.resetAt = Date.now() + limit.period;
    }
    
    // Check if limit reached
    if (service === 'openai') {
      // OpenAI uses token counting, handled separately
      return;
    } else if (limit.current >= limit.requests) {
      // Rate limit reached
      this.setRateLimited(service, limit.period);
      throw {
        code: 'RATE_LIMIT_EXCEEDED',
        service,
        retryAfter: Math.ceil(limit.period / 1000),
        message: `Rate limit for ${service} API exceeded. Retry after ${Math.ceil(limit.period / 1000)} seconds.`
      };
    }
    
    // Increment counter
    limit.current++;
  }
  
  recordOpenAIUsage(tokens) {
    const limit = this.limits.openai;
    
    // Reset counter if period has elapsed
    if (limit.resetAt && Date.now() > limit.resetAt) {
      limit.current = 0;
      limit.resetAt = Date.now() + limit.period;
    }
    
    // Initialize reset time if not set
    if (!limit.resetAt) {
      limit.resetAt = Date.now() + limit.period;
    }
    
    // Add tokens to current usage
    limit.current += tokens;
    
    // Check if approaching limit
    if (limit.current >= limit.tokens * 0.9) {
      console.warn(`OpenAI token usage approaching limit: ${limit.current}/${limit.tokens}`);
    }
  }
  
  setRateLimited(service, duration) {
    const limit = this.limits[service];
    if (!limit) {
      throw new Error(`Unknown service: ${service}`);
    }
    
    limit.rateLimited = true;
    limit.resumeAt = Date.now() + duration;
    
    console.log(`Rate limit for ${service} API set. Will resume at ${new Date(limit.resumeAt).toLocaleTimeString()}`);
  }
}

module.exports = RateLimitManager;