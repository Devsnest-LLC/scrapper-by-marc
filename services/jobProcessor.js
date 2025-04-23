// services/jobProcessor.js - Background processor for import jobs
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
      job.status = 'initialized';
      await job.save();
      
      let objectIds = [];
      
      // Get object IDs based on job source
      if (job.source === 'url') {
        // Use the URL source
        objectIds = await this.metService.searchObjects(job.query);
      } else if (job.source === 'category') {
        // Use the category source
        const query = {
          hasImages: true,
          departmentIds: job.query.departmentIds,
          keywords: job.query.keywords
        };
        
        objectIds = await this.metService.searchObjects(query);
        
        // Filter by artwork types if specified
        if (job.query.artworkTypes && job.query.artworkTypes.length > 0) {
          objectIds = await this.metService.filterForArtTypes(objectIds, job.query.artworkTypes);
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