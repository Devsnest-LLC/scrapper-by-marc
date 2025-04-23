// services/shopifyService.js - Updated to support multiple descriptions
const Shopify = require('shopify-api-node');
const fs = require('fs');
const RateLimitManager = require('./rateLimitManager');

class ShopifyService {
  constructor() {
    this.initializeShopify();
    this.rateLimits = new RateLimitManager();
  }
  
  initializeShopify() {
    if (process.env.SHOPIFY_SHOP_NAME && 
        process.env.SHOPIFY_API_KEY && 
        process.env.SHOPIFY_API_PASSWORD) {
      this.shopify = new Shopify({
        shopName: process.env.SHOPIFY_SHOP_NAME,
        apiKey: process.env.SHOPIFY_API_KEY,
        password: process.env.SHOPIFY_API_PASSWORD
      });
      this.isConfigured = true;
    } else {
      this.isConfigured = false;
      console.warn('Shopify API credentials not provided. Shopify uploads will be disabled.');
    }
  }
  
  async checkRateLimits() {
    return this.rateLimits.checkShopifyLimit();
  }
  
  async uploadArtwork(artwork, shortDescription, expandedDescription, imagePath, collections, tags, price = 99.99) {
    if (!this.isConfigured) {
      throw new Error('Shopify API is not configured');
    }
    
    try {
      await this.checkRateLimits();
      
      // Create a handle from the title
      const handle = this.createHandle(artwork.title);
      
      // Read the image file
      const imageData = fs.readFileSync(imagePath);
      const base64Image = Buffer.from(imageData).toString('base64');
      
      // Create the product with the short description as the main description
      const product = {
        title: artwork.title,
        body_html: shortDescription,
        vendor: artwork.artistDisplayName || 'Unknown Artist',
        product_type: artwork.classification || 'Artwork',
        tags: tags.join(', '),
        published: true,
        variants: [
          {
            price: price.toString(),
            inventory_management: 'shopify',
            inventory_policy: 'continue',
            inventory_quantity: 100,
            requires_shipping: true,
            taxable: true,
            sku: `MET-${artwork.objectID}`
          }
        ],
        images: [
          {
            attachment: base64Image,
            filename: `${artwork.objectID}.jpg`
          }
        ],
        metafields: [
          // Regular metafields
          {
            key: 'year',
            value: artwork.objectDate || 'Unknown',
            namespace: 'art',
            value_type: 'string'
          },
          {
            key: 'source',
            value: 'Metropolitan Museum of Art',
            namespace: 'art',
            value_type: 'string'
          },
          {
            key: 'object_id',
            value: artwork.objectID.toString(),
            namespace: 'art',
            value_type: 'string'
          },
          // New metafields for our additional descriptions
          {
            key: 'raw_description',
            value: artwork.objectDescription || artwork.creditLine || '',
            namespace: 'art',
            value_type: 'string'
          },
          {
            key: 'expanded_description',
            value: expandedDescription,
            namespace: 'art',
            value_type: 'string'
          }
        ]
      };
      
      // Create the product in Shopify
      const newProduct = await this.shopify.product.create(product);
      
      // Add the product to collections
      for (const collectionName of collections) {
        try {
          await this.checkRateLimits();
          
          // Find or create the collection
          let collection;
          
          // First try to find an existing collection
          const existingCollections = await this.shopify.customCollection.list({
            title: collectionName
          });
          
          if (existingCollections.length > 0) {
            collection = existingCollections[0];
          } else {
            // Create a new collection if it doesn't exist
            collection = await this.shopify.customCollection.create({
              title: collectionName,
              published: true
            });
          }
          
          // Add the product to the collection
          await this.shopify.collect.create({
            product_id: newProduct.id,
            collection_id: collection.id
          });
        } catch (err) {
          console.error(`Error adding product to collection ${collectionName}:`, err.message);
          // Continue with other collections even if one fails
        }
      }
      
      return newProduct.id;
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }
  
  createHandle(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 100);
  }
  
  handleApiError(error) {
    if (error.response) {
      // Shopify API error
      if (error.response.headers && error.response.headers['x-shopify-shop-api-call-limit']) {
        const apiCallLimitHeader = error.response.headers['x-shopify-shop-api-call-limit'];
        const [used, limit] = apiCallLimitHeader.split('/').map(num => parseInt(num, 10));
        
        if (used >= limit - 5) {
          // Close to rate limit, set a pause
          this.rateLimits.setRateLimited('shopify', 10000); // 10 seconds
          console.warn(`Shopify API rate limit approaching: ${used}/${limit}`);
        }
      }
      
      if (error.response.statusCode === 429) {
        // Rate limited
        const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
        this.rateLimits.setRateLimited('shopify', retryAfter * 1000);
        console.error(`Shopify rate limit exceeded. Retry after ${retryAfter} seconds.`);
      } else {
        console.error(`Shopify API error: ${error.response.statusCode} - ${JSON.stringify(error.response.body)}`);
      }
    } else {
      console.error(`Error with Shopify request: ${error.message}`);
    }
  }
}

module.exports = ShopifyService;
