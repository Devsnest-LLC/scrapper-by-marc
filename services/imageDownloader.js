// services/imageDownloader.js - Service for downloading and organizing images
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { promisify } = require('util');
const archiver = require('archiver');
const sanitize = require('sanitize-filename');

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);


class ImageDownloader {
  constructor() {
    this.baseDir = path.join(__dirname, '../data');
    this.imagesDir = path.join(this.baseDir, 'images');
    this.jobImagesDir = path.join(this.baseDir, 'job_images');
    
    // Ensure directories exist
    this.ensureDirectories();
  }
  
  async ensureDirectories() {
    try {
      if (!fs.existsSync(this.baseDir)) {
        await mkdirAsync(this.baseDir, { recursive: true });
      }
      
      if (!fs.existsSync(this.imagesDir)) {
        await mkdirAsync(this.imagesDir, { recursive: true });
      }
      
      if (!fs.existsSync(this.jobImagesDir)) {
        await mkdirAsync(this.jobImagesDir, { recursive: true });
      }
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }
  
  /**
   * Download an individual image for processing
   * @param {string} imageUrl - URL of the image to download
   * @param {number} objectId - Met Museum object ID
   * @returns {Promise<string>} - Path to the downloaded image
   */
  async downloadImage(imageUrl, objectId) {
    try {
      const imagePath = path.join(this.imagesDir, `${objectId}.jpg`);
      
      // Skip download if image already exists
      if (await existsAsync(imagePath)) {
        return imagePath;
      }
      
      // Download the image
      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'arraybuffer'
      });
      
      // Save the image
      await writeFileAsync(imagePath, response.data);
      return imagePath;
    } catch (error) {
      console.error(`Error downloading image for object ${objectId}:`, error.message);
      return null;
    }
  }
  
  /**
   * Process images for a job, creating appropriately named copies
   * @param {Object} job - The job object
   * @returns {Promise<string>} - Path to the job images directory
   */
  async processJobImages(job) {
    try {
      // Create a job-specific directory
      const jobDir = path.join(this.jobImagesDir, job._id.toString());
      if (!fs.existsSync(jobDir)) {
        await mkdirAsync(jobDir, { recursive: true });
      }
      
      // Process each result with an image
      const results = job.results.filter(result => result.processed && !result.error && result.imageUrl);
      
      for (const result of results) {
        try {
          // Download the image if needed
          const sourceImagePath = await this.downloadImage(result.imageUrl, result.objectId);
          
          if (sourceImagePath) {
            // Create sanitized filename from artwork title
            const sanitizedTitle = sanitize(result.title).replace(/\s+/g, '_');
            const targetImagePath = path.join(jobDir, `${sanitizedTitle}.jpg`);
            
            // Copy the image with the new name
            fs.copyFileSync(sourceImagePath, targetImagePath);
          }
        } catch (error) {
          console.error(`Error processing image for ${result.title}:`, error.message);
        }
      }
      
      return jobDir;
    } catch (error) {
      console.error(`Error processing job images:`, error.message);
      return null;
    }
  }
  
  /**
   * Create a zip archive of all the job's images
   * @param {Object} job - The job object
   * @returns {Promise<string>} - Path to the zip file
   */
  async createJobImagesZip(job) {
    try {
      // First ensure all images are processed
      const jobDir = await this.processJobImages(job);
      if (!jobDir) {
        throw new Error('Failed to process job images');
      }
      
      // Create zip file
      const zipPath = path.join(this.baseDir, `job_images_${job._id}.zip`);
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', {
        zlib: { level: 5 } // Compression level
      });
      
      // Set up archive
      archive.pipe(output);
      
      // Add directory contents to the zip
      archive.directory(jobDir, false);
      
      // Finalize archive
      await archive.finalize();
      
      // Return promise that resolves when zip is complete
      return new Promise((resolve, reject) => {
        output.on('close', () => resolve(zipPath));
        output.on('error', (err) => reject(err));
      });
    } catch (error) {
      console.error(`Error creating images zip for job ${job._id}:`, error.message);
      return null;
    }
  }
}

module.exports = ImageDownloader;
