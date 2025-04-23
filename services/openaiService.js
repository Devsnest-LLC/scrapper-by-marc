// services/openaiService.js - Updated service for generating multiple descriptions with OpenAI
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
  
  /**
   * Generate multiple descriptions for an artwork
   * @param {Object} artwork - The artwork data from Met API
   * @returns {Object} - Object containing short and expanded descriptions
   */
  async generateDescriptions(artwork) {
    try {
      await this.checkRateLimits();
      
      // Extract the raw description from the artwork
      const rawDescription = artwork.objectDescription || 
                           artwork.description || 
                           artwork.creditLine || 
                           `${artwork.title} (${artwork.objectDate || 'Unknown date'}) by ${artwork.artistDisplayName || 'Unknown artist'}. ${artwork.medium || ''}`;
      
      // Create combined prompt for both description types (more efficient)
      const prompt = `I need you to create two different descriptions for this artwork from the Metropolitan Museum of Art:

ARTWORK INFORMATION:
Title: ${artwork.title}
Artist: ${artwork.artistDisplayName || 'Unknown artist'}
Date: ${artwork.objectDate || 'Unknown date'}
Medium: ${artwork.medium || 'Unknown medium'}
Department: ${artwork.department || 'Unknown department'}
Classification: ${artwork.classification || 'Unknown type'}
Original Description: ${rawDescription}

TASK 1 - SHORT DESCRIPTION:
Create a concise, engaging description of this artwork in about 5 sentences. Focus on the visual elements, historical context, and significance. Make it appealing for customers considering purchasing a print.

TASK 2 - EXPANDED DESCRIPTION:
Create a more detailed description of 2-4 paragraphs (at least 3 paragraphs recommended). Include information about:
- The artwork's visual appearance and composition
- The historical and cultural context
- The artist's style and significance
- What makes this piece notable or interesting
- Why someone might want to display this artwork in their home

Please format your response exactly like this:
---SHORT DESCRIPTION---
[Your 5-sentence description here]
---EXPANDED DESCRIPTION---
[Your 2-4 paragraph description here]`;
      
      const completion = await this.openai.createChatCompletion({
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert art historian and copywriter specializing in creating engaging descriptions for art prints. Your writing is clear, informative, and compelling."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });
      
      const fullResponse = completion.data.choices[0].message.content.trim();
      this.rateLimits.recordOpenAIUsage(prompt.length + fullResponse.length);
      
      // Parse the response to extract the two descriptions
      const shortDescMarker = "---SHORT DESCRIPTION---";
      const expandedDescMarker = "---EXPANDED DESCRIPTION---";
      
      let shortDescription = "";
      let expandedDescription = "";
      
      if (fullResponse.includes(shortDescMarker) && fullResponse.includes(expandedDescMarker)) {
        // Extract short description
        const shortStart = fullResponse.indexOf(shortDescMarker) + shortDescMarker.length;
        const shortEnd = fullResponse.indexOf(expandedDescMarker);
        shortDescription = fullResponse.substring(shortStart, shortEnd).trim();
        
        // Extract expanded description
        const expandedStart = fullResponse.indexOf(expandedDescMarker) + expandedDescMarker.length;
        expandedDescription = fullResponse.substring(expandedStart).trim();
      } else {
        // Fallback if format isn't followed
        console.warn("OpenAI response didn't follow the expected format");
        
        // Try to split the response in half as a fallback
        const halfwayPoint = Math.floor(fullResponse.length / 2);
        shortDescription = fullResponse.substring(0, halfwayPoint).trim();
        expandedDescription = fullResponse.substring(halfwayPoint).trim();
      }
      
      return {
        rawDescription,
        shortDescription,
        expandedDescription
      };
    } catch (error) {
      this.handleApiError(error);
      
      // Fallback to a basic description
      const rawDescription = artwork.objectDescription || 
                           artwork.description || 
                           artwork.creditLine || 
                           `${artwork.title} by ${artwork.artistDisplayName || 'Unknown artist'}`;
      
      const basicDesc = `${artwork.title} (${artwork.objectDate || 'Unknown date'}) by ${artwork.artistDisplayName || 'Unknown artist'}. ${artwork.medium || ''}. From the collection of the Metropolitan Museum of Art.`;
      
      return {
        rawDescription,
        shortDescription: basicDesc,
        expandedDescription: `${basicDesc} This artwork is part of the ${artwork.department || 'museum'}'s collection and exemplifies ${artwork.classification || 'art'} from the period.`
      };
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
