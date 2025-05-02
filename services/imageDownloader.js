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

      if (await existsAsync(imagePath)) {
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

  /**
   * Process images for a job, creating appropriately named copies
   * @param {Object} job - The job object
   * @returns {Promise<string>} - Path to the job images directory
   */
  async processJobImages(job) {
    try {
      const jobDir = path.join(this.jobImagesDir, job._id.toString());
      if (!fs.existsSync(jobDir)) {
        await mkdirAsync(jobDir, { recursive: true });
      }

      const results = job.results.filter(result => result.processed && !result.error && result.imageUrl);
      console.log(`Processing ${results.length} images for job ${job._id}`);

      for (const result of results) {
        try {
          const sourceImagePath = await this.downloadImage(result.imageUrl, result.objectId);

          if (sourceImagePath) {
            const sanitizedTitle = sanitize(result.title).replace(/\s+/g, '_');
            const targetImagePath = path.join(jobDir, `${sanitizedTitle}_${result.objectId}.jpg`);
            console.log(`Copying image for ${result.title} to ${targetImagePath}`);
            fs.copyFileSync(sourceImagePath, targetImagePath);
          } else {
            console.warn(`Image for object ${result.objectId} could not be downloaded.`);
          }
        } catch (error) {
          console.error(`Error processing image for ${result.title}:`, error.message);
        }
      }

      if (fs.readdirSync(jobDir).length === 0) {
        console.error(`No images processed for job ${job._id}`);
        return null;
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
      const jobDir = await this.processJobImages(job);
      if (!jobDir || fs.readdirSync(jobDir).length === 0) {
        throw new Error('No images to zip');
      }

      const zipPath = path.join(this.baseDir, `job_images_${job._id}.zip`);
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 5 } });

      archive.pipe(output);
      archive.directory(jobDir, false);

      await archive.finalize();

      return new Promise((resolve, reject) => {
        output.on('close', () => {
          console.log(`ZIP created at ${zipPath} (${archive.pointer()} total bytes)`);

          // ✅ Clean up original downloaded images after successful ZIP
          fs.rm(this.imagesDir, { recursive: true, force: true }, async (err) => {
            if (err) {
              console.error('Error deleting original image dir:', err.message);
            } else {
              await mkdirAsync(this.imagesDir, { recursive: true }); // recreate empty images dir
              console.log('Cleaned up original image downloads.');
            }
          });

          resolve(zipPath);
        });

        output.on('error', (err) => {
          console.error('Error during ZIP creation:', err.message);
          reject(err);
        });
      });
    } catch (error) {
      console.error(`Error creating images zip for job ${job._id}:`, error.message);
      return null;
    }
  }

  
  
}

module.exports = ImageDownloader;
