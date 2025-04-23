// services/jobProcessor.js - Updated background processor for import jobs
const Job = require('../models/Job');
const MetService = require('./metService');

class JobProcessor {
  constructor() {
    this.isRunning = false;
    this.currentJob = null;
    this.metService = new MetService();
    this.checkInterval = 5000; // 5 seconds
  }
  
  async start() {
    if (this.isRunning) {
      console.log('Job processor is already running');
      return;
    }
    
    console.log('Starting job processor');
    this.isRunning = true;
    this.processJobs();
  }
  
  async stop() {
    console.log('Stopping job processor');
    this.isRunning = false;
  }
  
  async processJobs() {
    while (this.isRunning) {
      try {
        // Get the next job to process
        const job = await this.getNextJob();
        
        if (!job) {
          // No jobs to process, wait before checking again
          await this.sleep(this.checkInterval);
          continue;
        }
        
        this.currentJob = job;
        
        // Process the job based on its current status
        if (job.status === 'pending') {
          await this.initializeJob(job);
        } else if (job.status === 'initialized') {
          await this.processJob(job);
        } else if (job.status === 'paused') {
          // Check if it's time to resume a paused job
          if (job.pauseReason === 'rate_limit' && job.resumeAfter) {
            if (Date.now() >= new Date(job.resumeAfter).getTime()) {
              // Time to resume
              await job.updateStatus('initialized');
              await this.processJob(job);
            } else {
              // Not time to resume yet, check other jobs
              await this.sleep(1000);
            }
          }
        }
        
        this.currentJob = null;
      } catch (error) {
        console.error('Error in job processor:', error);
        
        // If there was a job being processed, mark it as failed
        if (this.currentJob) {
          this.currentJob.status = 'failed';
          this.currentJob.error = error.message;
          await this.currentJob.save();
          this.currentJob = null;
        }
        
        // Wait before trying again
        await this.sleep(10000);
      }
    }
  }
  
  async getNextJob() {
    // Get all jobs that need processing, ordered by priority
    const jobs = await Job.find({
      $or: [
        { status: 'pending' },
        { status: 'initialized' },
        { 
          status: 'paused', 
          pauseReason: 'rate_limit',
          resumeAfter: { $lte: new Date() }
        }
      ]
    }).sort({ createdAt: 1 });
    
    return jobs.length > 0 ? jobs[0] : null;
  }
  
  async initializeJob(job) {
  try {
    console.log(`Initializing job ${job._id}: ${job.name}`);
    job.status = 'processing';
    await job.save();
      
      let objectIds = [];
      
      // Get object IDs based on job source
      if (job.source === 'url') {
        console.log(`Processing URL job with query:`, job.query);
        objectIds = await this.metService.searchObjects(job.query);
      } else if (job.source === 'category') {
        // Use the category source
        console.log(`Processing category job with:`, {
          artworkTypes: job.query.artworkTypes,
          timePeriods: job.query.timePeriods,
          keywords: job.query.keywords
        });
        
        // Build query from category selections
        const query = {
          hasImages: true,
          departmentIds: job.query.departmentIds || [],
          keywords: job.query.keywords || '',
          isPublicDomain: job.query.isPublicDomain !== undefined ? job.query.isPublicDomain : true,
          filters: {
            additionalKeywords: []
          }
        };
        
        // Add time period date ranges if selected
        if (job.query.timePeriods && job.query.timePeriods.length > 0) {
          // Map time periods to date ranges and keywords
          job.query.timePeriods.forEach(period => {
            const periodLower = period.toLowerCase();
            
            // Add period as a keyword
            query.filters.additionalKeywords.push(periodLower);
            
            // Map to date ranges based on period names
            if (periodLower.includes('1900-present') || periodLower.includes('20th century')) {
              query.dateBegin = 1900;
            } else if (periodLower.includes('19th century') || periodLower.includes('1800')) {
              query.dateBegin = 1800;
              query.dateEnd = 1899;
            } else if (periodLower.includes('baroque') || periodLower.includes('rococo') || 
                      periodLower.includes('1600-1750')) {
              query.dateBegin = 1600;
              query.dateEnd = 1750;
            } else if (periodLower.includes('renaissance') || periodLower.includes('1400-1600')) {
              query.dateBegin = 1400;
              query.dateEnd = 1600;
            } else if (periodLower.includes('medieval') || periodLower.includes('500-1400')) {
              query.dateBegin = 500;
              query.dateEnd = 1400;
            }
          });
        }
        
        // Set classification filter if artwork types are selected
        if (job.query.artworkTypes && job.query.artworkTypes.length > 0) {
          query.filters.classification = job.query.artworkTypes[0]; // Use first selected type as primary filter
          
          // Add all types as keywords
          job.query.artworkTypes.forEach(type => {
            query.filters.additionalKeywords.push(type.toLowerCase());
          });
        }
        
        // Get object IDs with the constructed query
        objectIds = await this.metService.searchObjects(query);
        
        // Further filter by artwork types if needed
        if (job.query.artworkTypes && job.query.artworkTypes.length > 1) {
          objectIds = await this.metService.filterForArtTypes(objectIds, job.query.artworkTypes);
        }
      }
      
      // Add fallback if no results found
      if (objectIds.length === 0) {
        console.warn(`No objects found for job ${job._id}. Using fallback search.`);
        // Try a more basic search
        objectIds = await this.metService.searchObjects({
          hasImages: true,
          isPublicDomain: true,
          q: '*'
        });
        
        if (objectIds.length > 0) {
          console.log(`Fallback search found ${objectIds.length} objects`);
        }
      }
      
      // Limit the number of objects if maxItems is set
      if (job.options.maxItems && job.options.maxItems > 0 && objectIds.length > job.options.maxItems) {
        objectIds = objectIds.slice(0, job.options.maxItems);
      }
      
      // Update the job with the object IDs
      job.objectIds = objectIds;
      job.totalObjects = objectIds.length;
      job.status = 'initialized';
      await job.save();
      
      console.log(`Job ${job._id} initialized with ${objectIds.length} objects`);
    } catch (error) {
      console.error(`Error initializing job ${job._id}:`, error);
      job.status = 'failed';
      job.error = error.message;
      await job.save();
    }
  }
  
  async processJob(job) {
    try {
      console.log(`Processing job ${job._id}: ${job.name}`);
      job.status = 'processing';
      await job.save();
      
      // Process each object ID
      for (let i = job.processedIds.length; i < job.objectIds.length; i++) {
        const objectId = job.objectIds[i];
        
        try {
          console.log(`Processing object ${objectId} (${i + 1}/${job.objectIds.length})`);
          
          // Skip if already processed
          if (job.processedIds.includes(objectId)) {
            console.log(`Object ${objectId} already processed, skipping`);
            continue;
          }
          
          // Process the artwork
          const result = await this.metService.processArtwork(objectId, job.options);
          
          if (result) {
            // Add to results
            job.results.push(result);
            job.processedIds.push(objectId);
            
            // Update progress and save
            job.progress = job.calculateProgress();
            await job.save();
          }
        } catch (error) {
          console.error(`Error processing object ${objectId}:`, error);
          
          // Check if rate limited
          if (error.code === 'RATE_LIMIT_EXCEEDED') {
            // Pause job due to rate limiting
            await job.updateStatus('paused', 'rate_limit');
            job.resumeAfter = new Date(Date.now() + (error.retryAfter * 1000));
            await job.save();
            
            console.log(`Job ${job._id} paused due to rate limit. Will resume at ${job.resumeAfter}`);
            return;
          }
          
          // Add to failed IDs for other errors
          if (!job.failedIds.includes(objectId)) {
            job.failedIds.push(objectId);
            await job.save();
          }
        }
        
        // Small delay between requests to be nice to the API
        await this.sleep(500);
      }
      
      // All objects processed
      job.status = 'completed';
      job.completedAt = new Date();
      await job.save();
      
      console.log(`Job ${job._id} completed: ${job.processedIds.length} processed, ${job.failedIds.length} failed`);
    } catch (error) {
      console.error(`Error processing job ${job._id}:`, error);
      job.status = 'failed';
      job.error = error.message;
      await job.save();
    }
  }
  
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = JobProcessor;
