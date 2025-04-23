// routes/jobRoutes.js - API routes for job management
const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const MetService = require('../services/metService');
const parseMetUrl = require('../utils/metUrlParser');
const { createObjectCsvStringifier } = require('csv-writer');
const fs = require('fs');
const path = require('path');

// Get all jobs
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    const jobs = await Job.find(query).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific job
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new job from URL
router.post('/url', async (req, res) => {
  try {
    const { url, name, options } = req.body;
    
    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }
    
    // Parse the Met Museum URL
    const query = parseMetUrl(url);
    
    const job = new Job({
      name: name || `URL Import: ${new Date().toLocaleString()}`,
      source: 'url',
      query: {
        url,
        ...query
      },
      options: options || {}
    });
    
    await job.save();
    res.status(201).json(job);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Create a new job from categories
router.post('/category', async (req, res) => {
  try {
    const { artworkTypes, timePeriods, keywords, name, options } = req.body;
    
    const job = new Job({
      name: name || `Category Import: ${new Date().toLocaleString()}`,
      source: 'category',
      query: {
        artworkTypes: artworkTypes || [],
        timePeriods: timePeriods || [],
        keywords: keywords || ''
      },
      options: options || {}
    });
    
    await job.save();
    res.status(201).json(job);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Pause a job
router.post('/:id/pause', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    if (job.status === 'processing' || job.status === 'initialized') {
      await job.updateStatus('paused', 'user');
      res.json(job);
    } else {
      res.status(400).json({ message: `Cannot pause job with status: ${job.status}` });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Resume a job
router.post('/:id/resume', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    if (job.status === 'paused') {
      await job.updateStatus('initialized');
      res.json(job);
    } else {
      res.status(400).json({ message: `Cannot resume job with status: ${job.status}` });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel a job
router.post('/:id/cancel', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    if (job.status !== 'completed' && job.status !== 'failed') {
      await job.updateStatus('failed', 'user');
      job.error = 'Cancelled by user';
      await job.save();
      res.json(job);
    } else {
      res.status(400).json({ message: `Cannot cancel job with status: ${job.status}` });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Download CSV for a job
router.get('/:id/csv', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    if (job.results.length === 0) {
      return res.status(400).json({ message: 'No results to export' });
    }
    
    // Create CSV headers
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'Handle', title: 'Handle' },
        { id: 'Title', title: 'Title' },
        { id: 'Body', title: 'Body (HTML)' },
        { id: 'Vendor', title: 'Vendor' },
        { id: 'Type', title: 'Type' },
        { id: 'Tags', title: 'Tags' },
        { id: 'Published', title: 'Published' },
        { id: 'Option1 Name', title: 'Option1 Name' },
        { id: 'Option1 Value', title: 'Option1 Value' },
        { id: 'Variant SKU', title: 'Variant SKU' },
        { id: 'Variant Price', title: 'Variant Price' },
        { id: 'Variant Inventory Policy', title: 'Variant Inventory Policy' },
        { id: 'Variant Inventory Qty', title: 'Variant Inventory Qty' },
        { id: 'Variant Requires Shipping', title: 'Variant Requires Shipping' },
        { id: 'Variant Taxable', title: 'Variant Taxable' },
        { id: 'Image Src', title: 'Image Src' },
        { id: 'Image Alt Text', title: 'Image Alt Text' },
        { id: 'Collection', title: 'Collection' }
      ]
    });
    
    // Format results for CSV
    const records = job.results
      .filter(result => result.processed && !result.error)
      .map(result => ({
        Handle: result.title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-').substring(0, 100),
        Title: result.title,
        Body: result.description,
        Vendor: result.artist,
        Type: 'Artwork',
        Tags: result.tags.join(', '),
        Published: 'TRUE',
        'Option1 Name': 'Size',
        'Option1 Value': 'Standard',
        'Variant SKU': `MET-${result.objectId}`,
        'Variant Price': job.options.defaultPrice.toString(),
        'Variant Inventory Policy': 'continue',
        'Variant Inventory Qty': '100',
        'Variant Requires Shipping': 'TRUE',
        'Variant Taxable': 'TRUE',
        'Image Src': result.imageUrl,
        'Image Alt Text': result.title,
        Collection: result.collections.join(', ')
      }));
    
    // Generate CSV
    const csvString = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
    
    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="met-import-${job._id}.csv"`);
    
    // Send CSV
    res.send(csvString);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload to Shopify
router.post('/:id/upload', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    if (job.status !== 'completed') {
      return res.status(400).json({ message: 'Job must be completed before uploading to Shopify' });
    }
    
    // Update job options to allow Shopify upload
    job.options.skipShopifyUpload = false;
    await job.save();
    
    // Create a new job to handle the Shopify upload
    const uploadJob = new Job({
      name: `Shopify Upload: ${job.name}`,
      source: job.source,
      query: job.query,
      options: job.options,
      objectIds: job.results
        .filter(result => result.processed && !result.error && !result.shopifyProductId)
        .map(result => result.objectId),
      totalObjects: job.results
        .filter(result => result.processed && !result.error && !result.shopifyProductId)
        .length,
      status: 'initialized'
    });
    
    await uploadJob.save();
    res.status(201).json(uploadJob);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a job
router.delete('/:id', async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    res.json({ message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;