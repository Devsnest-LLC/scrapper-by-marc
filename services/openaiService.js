// services/openaiService.js - Service for generating descriptions with OpenAI
const { Configuration, OpenAIApi } = require('openai');
const RateLimitManager = require('./rateLimitManager');

class OpenAIService {
  constructor() {
    this.configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(this.configuration);
    this.rateLimits = new RateLimitManager();
  }
  
  async checkRateLimits() {
    return this.rateLimits.checkOpenAILimit();
  }
  
  async generateDescription(artwork) {
    try {
      await this.checkRateLimits();
      
      const prompt = `Write a compelling 2-3 paragraph product description for an art print based on this information from the Metropolitan Museum of Art:
      
      Title: ${artwork.title}
      Artist: ${artwork.artistDisplayName || 'Unknown artist'}
      Date: ${artwork.objectDate || 'Unknown date'}
      Medium: ${artwork.medium || 'Unknown medium'}
      
      Original Description or Info: ${artwork.objectDescription || artwork.creditLine || ''}
      
      Make it engaging for potential customers considering buying a print of this artwork. Focus on the visual elements, historical context, and significance of the piece.`;
      
      const completion = await this.openai.createChatCompletion({
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert art historian and copywriter who specializes in creating engaging product descriptions for art prints."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });
      
      const description = completion.data.choices[0].message.content.trim();
      this.rateLimits.recordOpenAIUsage(prompt.length + description.length);
      
      return description;
    } catch (error) {
      this.handleApiError(error);
      
      // Fallback to a basic description
      return `${artwork.title} (${artwork.objectDate || 'Unknown date'}) by ${artwork.artistDisplayName || 'Unknown artist'}. ${artwork.medium || ''}. From the collection of the Metropolitan Museum of Art.`;
    }
  }
  
  handleApiError(error) {
    if (error.response) {
      // OpenAI API error
      if (error.response.status === 429) {
        // Rate limit error
        const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
        this.rateLimits.setRateLimited('openai', retryAfter * 1000);
        console.error(`OpenAI rate limit exceeded. Retry after ${retryAfter} seconds.`);
      } else {
        console.error(`OpenAI API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
    } else {
      console.error(`Error with OpenAI request: ${error.message}`);
    }
  }
}

module.exports = OpenAIService;