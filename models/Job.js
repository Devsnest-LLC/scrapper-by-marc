// models/Job.js - Updated Job model with multiple descriptions support
const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'initializing', 'initialized', 'processing', 'paused', 'completed', 'failed'],
    default: 'pending'
  },
  source: {
    type: String,
    enum: ['url', 'category'],
    required: true
  },
  query: {
    // For URL source
    url: String,
    
    // Common query parameters
    departmentIds: [Number],
    hasImages: { type: Boolean, default: true },
    isOnView: { type: Boolean, default: false },
    isHighlight: { type: Boolean, default: false },
    isPublicDomain: { type: Boolean, default: true },
    
    // For category source
    artworkTypes: [String],
    timePeriods: [String],
    keywords: String,
    
    // Date range
    dateBegin: Number,
    dateEnd: Number,
    
    // Additional filters
    filters: {
      era: String,
      geolocation: String,
      material: String,
      classification: String,
      additionalKeywords: [String]
    }
  },
  options: {
    maxItems: { type: Number, default: 100 },
    skipShopifyUpload: { type: Boolean, default: false },
    skipExisting: { type: Boolean, default: true },
    defaultPrice: { type: Number, default: 99.99 }
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  objectIds: [Number],
  processedIds: [Number],
  failedIds: [Number],
  totalObjects: { type: Number, default: 0 },
  results: [{
    objectId: Number,
    title: String,
    artist: String,
    date: String,
    imageUrl: String,
    shopifyProductId: String,
    department: String,
    
    // Description fields
    description: String, // Legacy field (kept for backward compatibility)
    rawDescription: String, // Original Met Museum description
    shortDescription: String, // 5-sentence description
    expandedDescription: String, // 2-4 paragraph description
    
    collections: [String],
    tags: [String],
    processed: { type: Boolean, default: false },
    error: String
  }],
  pauseReason: {
    type: String,
    enum: ['user', 'rate_limit', 'error', null],
    default: null
  },
  resumeAfter: Date,
  error: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: Date
});

// Update the updatedAt field on save
JobSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to calculate job progress
JobSchema.methods.calculateProgress = function() {
  if (this.totalObjects === 0) return 0;
  return Math.round((this.processedIds.length / this.totalObjects) * 100);
};

// Method to update job status
JobSchema.methods.updateStatus = function(status, reason = null) {
  this.status = status;
  
  if (status === 'paused') {
    this.pauseReason = reason;
    if (reason === 'rate_limit') {
      // Default resume after 60 seconds for rate limit
      this.resumeAfter = new Date(Date.now() + 60000);
    }
  }
  
  if (status === 'completed') {
    this.completedAt = new Date();
  }
  
  return this.save();
};

module.exports = mongoose.model('Job', JobSchema);
