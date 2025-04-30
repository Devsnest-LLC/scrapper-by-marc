// services/metService.js - Updated to support multiple descriptions
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const OpenAIService = require('./openaiService');
const ShopifyService = require('./shopifyService');
const RateLimitManager = require('./rateLimitManager');

class MetService {
  constructor() {
    this.baseUrl = 'https://www.metmuseum.org/mothra/collectionlisting';
    this.secondaryBaseUrl = 'https://collectionapi.metmuseum.org/public/collection/v1';
    this.openai = new OpenAIService();
    this.shopify = new ShopifyService();
    this.rateLimits = new RateLimitManager();
    this.outputDir = path.join(__dirname, '../data/images');
    
    // Ensure output directory exists
    this.ensureOutputDir();
  }
  
  async ensureOutputDir() {
    try {
      if (!fs.existsSync(this.outputDir)) {
        await mkdirAsync(this.outputDir, { recursive: true });
      }
    } catch (error) {
      console.error('Error creating output directory:', error);
    }
  }
  
  async checkRateLimits() {
    return this.rateLimits.checkMetApiLimit();
  }
  
  async searchObjects(query) {
    try {
      await this.checkRateLimits();
      console.log("Searching for objects with query:", query);
      
      // Use query parameters directly from the parsed URL
      const searchParams = {
        q: query.q || '',
        showOnly: query.showOnly || null,
        artist: query.artist || null,
        material: query.material || null,
        era: query.era || null,
        geolocation: query.geolocation || null,
        department: query.department || null,
        pkgIds: query.pkgIds || null,
        exhibitionId: query.exhibitionId || null,
        feature: query.feature || null,
        searchField: query.searchField || null
      };
      
      // Remove null values
      Object.keys(searchParams).forEach(key => {
        if (searchParams[key] === null) {
          delete searchParams[key];
        }
      });
      
      // Execute the API search
      console.log('Searching Met API with params:', searchParams);
      const response = await axios.get(`${this.baseUrl}/search`, { params: searchParams });
      console.log('Response:', response.data);
      
      // Extract object IDs from the response
      const objectIds = response.data.results.map(result => {
        // Extract object ID from the URL
        const url = result.url;
        const match = url.match(/\/search\/(\d+)/);
        return match ? parseInt(match[1]) : null;
      }).filter(id => id !== null);
      
      console.log(`Found ${objectIds.length} results from Met API`);
      
      return objectIds;
    } catch (error) {
      this.handleApiError(error, 'searching objects');
      return [];
    }
  }
  
  async getObjectDetails(objectId) {
    try {
      await this.checkRateLimits();
      
      const response = await axios.get(`${this.secondaryBaseUrl}/objects/${objectId}`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, `getting details for object ${objectId}`);
      return null;
    }
  }
  
  async downloadImage(imageUrl, objectId) {
    try {
      const imagePath = path.join(this.outputDir, `${objectId}.jpg`);
      
      // Skip download if image already exists
      if (fs.existsSync(imagePath)) {
        return imagePath;
      }
      
      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'arraybuffer'
      });
      
      await writeFileAsync(imagePath, response.data);
      return imagePath;
    } catch (error) {
      console.error(`Error downloading image for object ${objectId}:`, error.message);
      return null;
    }
  }
  
  async filterForArtTypes(objectIds, artTypes) {
    const validObjects = [];
    
    for (const objectId of objectIds) {
      const objectDetails = await this.getObjectDetails(objectId);
      
      if (objectDetails && 
          objectDetails.isPublicDomain && 
          objectDetails.primaryImage &&
          (!artTypes.length || artTypes.includes(objectDetails.classification))) {
        validObjects.push(objectId);
      }
    }
    
    return validObjects;
  }
  
  // Era/time period collections mapping
  getEraCollections(year) {
    const collections = [];
    const eraPeriods = {
      'Prehistoric / Ancient': { start: -10000, end: 499 },
      'Classical Antiquity': { start: -800, end: 499 },
      'Medieval': { start: 500, end: 1399 },
      'Renaissance': { start: 1400, end: 1599 },
      'Baroque / Rococo': { start: 1600, end: 1749 },
      'Enlightenment': { start: 1750, end: 1799 },
      '19th Century': { start: 1800, end: 1899 },
      'Early 20th Century': { start: 1900, end: 1945 },
      'Mid to Late 20th Century': { start: 1946, end: 1999 },
      'Contemporary': { start: 2000, end: new Date().getFullYear() }
    };
    
    if (!isNaN(year)) {
      for (const [era, period] of Object.entries(eraPeriods)) {
        if (year >= period.start && year <= period.end) {
          collections.push(era);
        }
      }
    }
    
    return collections;
  }
  
  // Theme/subject collections mapping with keywords
  getThemeCollections(artwork) {
    const collections = [];
    const tags = [];
    
    // Create a combined text to search for themes
    const searchText = `${artwork.title} ${artwork.objectDescription || ''} ${artwork.medium || ''} ${artwork.classification || ''}`.toLowerCase();
    
    // Theme collections with keywords
    const themeCollections = {
      'People': ['people', 'person', 'human', 'figure', 'portrait', 'man', 'woman', 'boy', 'girl'],
      'Historical Figures': ['king', 'queen', 'emperor', 'empress', 'president', 'ruler', 'historical figure'],
      'Scientists, Artists, Writers': ['scientist', 'artist', 'writer', 'composer', 'inventor', 'author', 'philosopher'],
      'Royalty / Nobility': ['royal', 'king', 'queen', 'prince', 'princess', 'duke', 'duchess', 'noble', 'court'],
      'Portraits': ['portrait'],
      'Events': ['event', 'scene', 'ceremony', 'celebration', 'festival', 'ritual'],
      'Battles / Wars': ['battle', 'war', 'military', 'soldier', 'army', 'combat', 'warrior', 'conflict'],
      'Scientific Discoveries': ['discovery', 'science', 'experiment', 'scientific', 'laboratory'],
      'Inventions': ['invention', 'machine', 'device', 'technology', 'mechanical'],
      'Political Events': ['political', 'government', 'state', 'ceremony', 'diplomatic', 'revolution'],
      'Nature': ['nature', 'natural', 'landscape', 'outdoor', 'garden', 'field'],
      'Animals': ['animal', 'beast', 'bird', 'fish', 'dog', 'cat', 'horse', 'lion', 'tiger', 'creature'],
      'Landscapes': ['landscape', 'scenery', 'vista', 'mountain', 'river', 'lake', 'ocean', 'sea', 'forest'],
      'Astronomy': ['astronomy', 'star', 'planet', 'moon', 'sun', 'celestial', 'space', 'constellation', 'galaxy', 'cosmic'],
      'Botanical / Plants': ['botanical', 'plant', 'flower', 'tree', 'garden', 'leaf', 'blossom', 'fruit', 'floral'],
      'Mythology & Religion': ['myth', 'mythology', 'god', 'goddess', 'deity', 'religious', 'religion', 'sacred', 'holy'],
      'Greek / Roman Myths': ['greek', 'roman', 'myth', 'olympus', 'zeus', 'apollo', 'athens', 'hercules', 'myth'],
      'Biblical Scenes': ['bible', 'biblical', 'jesus', 'christ', 'apostle', 'saint', 'madonna', 'angel', 'virgin'],
      'Eastern Religions': ['buddha', 'buddhist', 'hindu', 'islam', 'islamic', 'eastern religion', 'zen', 'yoga'],
      'Family & Domestic Life': ['family', 'domestic', 'home', 'household', 'interior', 'daily life', 'domestic scene'],
      'Childhood': ['child', 'children', 'boy', 'girl', 'infant', 'baby', 'youth', 'childhood', 'play', 'toys'],
      'Motherhood': ['mother', 'motherhood', 'maternal', 'nurturing', 'child', 'baby', 'madonna'],
      'Everyday Life': ['everyday', 'daily', 'routine', 'ordinary', 'common', 'daily life', 'life scene'],
      'Fantasy & Imagination': ['fantasy', 'imagination', 'dream', 'imaginary', 'magical', 'surreal', 'otherworldly'],
      'Allegorical Scenes': ['allegory', 'allegorical', 'symbolic', 'metaphor', 'personification', 'symbol'],
      'Fairy Tales': ['fairy tale', 'fairy', 'tale', 'story', 'folklore', 'legend', 'fable', 'fantasy'],
      'Fantastical Creatures': ['dragon', 'unicorn', 'griffin', 'phoenix', 'monster', 'mythical', 'creature', 'beast'],
      'Architecture & Cities': ['architecture', 'building', 'structure', 'city', 'town', 'urban', 'construction'],
      'Buildings': ['building', 'house', 'palace', 'castle', 'cathedral', 'church', 'temple', 'monument', 'structure'],
      'Historical Maps': ['map', 'cartography', 'atlas', 'geography', 'historical map', 'territory'],
      'Cityscapes': ['cityscape', 'skyline', 'urban', 'city', 'town', 'street', 'avenue', 'building'],
      'Technology & Innovation': ['technology', 'innovation', 'invention', 'machine', 'engineering', 'progress', 'modern'],
      'Machines': ['machine', 'mechanical', 'engine', 'device', 'apparatus', 'mechanism', 'technological'],
      'Transportation': ['transportation', 'vehicle', 'ship', 'boat', 'train', 'carriage', 'automobile', 'travel'],
      'Industrial Scenes': ['industrial', 'factory', 'industry', 'manufacturing', 'production', 'labor', 'worker'],
      // New collections for geographical regions
      'American Art': ['america', 'american', 'united states', 'usa', 'u.s.', 'new york', 'california'],
      'European Art': ['europe', 'european', 'france', 'french', 'italy', 'italian', 'british', 'england', 'english', 'spain', 'spanish'],
      'Asian Art': ['asia', 'asian', 'china', 'chinese', 'japan', 'japanese', 'india', 'indian', 'korea', 'korean'],
      'African Art': ['africa', 'african', 'egypt', 'egyptian']
    };
    
    // Check for thematic collections
    for (const [theme, keywords] of Object.entries(themeCollections)) {
      for (const keyword of keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          if (!collections.includes(theme)) {
            collections.push(theme);
            tags.push(theme);
          }
          break; // Found a match, no need to check other keywords for this theme
        }
      }
    }
    
    // Add artwork type as a collection
    if (artwork.classification && !collections.includes(artwork.classification)) {
      collections.push(artwork.classification);
      tags.push(artwork.classification);
    }
    
    // Add culture/origin info as tags and collections
    if (artwork.culture) {
      tags.push(artwork.culture);
      // Add as a collection if it's a significant culture
      if (artwork.culture.toLowerCase().includes('american') || 
          artwork.culture.toLowerCase().includes('british') ||
          artwork.culture.toLowerCase().includes('french') ||
          artwork.culture.toLowerCase().includes('italian') ||
          artwork.culture.toLowerCase().includes('chinese') ||
          artwork.culture.toLowerCase().includes('japanese')) {
        collections.push(`${artwork.culture} Art`);
      }
    }
    
    // Add department as a collection if available
    if (artwork.department && !collections.includes(artwork.department)) {
      collections.push(artwork.department);
      tags.push(artwork.department);
    }
    
    // Add country/region as tags if available
    if (artwork.country) {
      tags.push(artwork.country);
    }
    
    return { collections, tags };
  }
  
  async processArtwork(objectId, options = {}) {
    try {
      // Get artwork details
      const artwork = await this.getObjectDetails(objectId);
      
      if (!artwork) {
        return null;
      }
      
      // Check if it's public domain and has an image
      if (!artwork.isPublicDomain || !artwork.primaryImage) {
        return null;
      }
      
      // Download the image
      const imagePath = await this.downloadImage(artwork.primaryImage, objectId);
      
      if (!imagePath) {
        return null;
      }
      
      // Generate descriptions
      const { rawDescription, shortDescription, expandedDescription } = 
        await this.openai.generateDescriptions(artwork);
      
      // Determine the year
      const year = parseInt(artwork.objectBeginDate);
      
      // Get era collections
      const eraCollections = this.getEraCollections(year);
      
      // Get theme collections and tags
      const { collections: themeCollections, tags } = this.getThemeCollections(artwork);
      
      // Combine collections
      const allCollections = [...eraCollections, ...themeCollections];
      
      // Prepare result
      const result = {
        objectId,
        title: artwork.title,
        artist: artwork.artistDisplayName || 'Unknown Artist',
        date: artwork.objectDate || 'Unknown',
        imageUrl: artwork.primaryImage,
        rawDescription,
        shortDescription,
        expandedDescription,
        collections: allCollections,
        tags,
        year
      };
      
      // Upload to Shopify if required
      if (!options.skipShopifyUpload) {
        try {
          const productId = await this.shopify.uploadArtwork(
            artwork,
            shortDescription,
            expandedDescription,
            imagePath,
            allCollections,
            tags,
            options.defaultPrice || 99.99
          );
          
          result.shopifyProductId = productId;
        } catch (error) {
          console.error(`Error uploading to Shopify:`, error.message);
          result.error = `Shopify upload failed: ${error.message}`;
        }
      }
      
      result.processed = true;
      return result;
    } catch (error) {
      console.error(`Error processing artwork ${objectId}:`, error.message);
      return {
        objectId,
        error: error.message,
        processed: false
      };
    }
  }
  
  handleApiError(error, action) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (error.response.status === 429) {
        // Rate limit exceeded
        const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
        this.rateLimits.setRateLimited('met', retryAfter * 1000);
        console.error(`Rate limit exceeded while ${action}. Retry after ${retryAfter} seconds.`);
      } else {
        console.error(`Error ${action}: ${error.response.status} - ${error.response.data}`);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error(`No response received while ${action}: ${error.message}`);
    } else {
      console.error(`Error with OpenAI request: ${error.message}`);
    }
  }
}
module.exports = MetService;