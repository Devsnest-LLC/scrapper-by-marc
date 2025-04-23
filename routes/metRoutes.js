// routes/metRoutes.js - Updated Met Museum API routes with comprehensive categories
const express = require('express');
const router = express.Router();
const MetService = require('../services/metService');
const parseMetUrl = require('../utils/metUrlParser');

const metService = new MetService();

// Get categories from Met API (departments)
router.get('/categories', async (req, res) => {
  try {
    // Complete list of Met Museum departments with IDs
    const categories = [
      { id: 1, name: 'American Decorative Arts' },
      { id: 3, name: 'Ancient Near Eastern Art' },
      { id: 4, name: 'Arms and Armor' },
      { id: 5, name: 'Arts of Africa, Oceania, and the Americas' },
      { id: 6, name: 'Asian Art' },
      { id: 7, name: 'The Cloisters' },
      { id: 8, name: 'The Costume Institute' },
      { id: 9, name: 'Drawings and Prints' },
      { id: 10, name: 'Egyptian Art' },
      { id: 11, name: 'European Paintings' },
      { id: 12, name: 'European Sculpture and Decorative Arts' },
      { id: 13, name: 'Greek and Roman Art' },
      { id: 14, name: 'Islamic Art' },
      { id: 15, name: 'The Robert Lehman Collection' },
      { id: 16, name: 'The Libraries' },
      { id: 17, name: 'Medieval Art' },
      { id: 18, name: 'Musical Instruments' },
      { id: 19, name: 'Photographs' },
      { id: 21, name: 'Modern and Contemporary Art' },
      { id: 22, name: 'American Paintings and Sculpture' }
    ];
    
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get artwork types
router.get('/artwork-types', async (req, res) => {
  try {
    // Comprehensive list of artwork types based on Met classifications
    const artworkTypes = [
      'Paintings',
      'Drawings',
      'Prints',
      'Photographs',
      'Sculpture',
      'Ceramics',
      'Textiles',
      'Furniture',
      'Jewelry',
      'Metalwork',
      'Glass',
      'Books',
      'Manuscripts',
      'Musical Instruments',
      'Arms and Armor',
      'Costumes',
      'Decorative Arts'
    ];
    
    res.json(artworkTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get time periods
router.get('/time-periods', async (req, res) => {
  try {
    // Comprehensive list of time periods used by the Met
    const timePeriods = [
      'Prehistoric (before 3000 BC)',
      'Ancient (3000 BC–AD 500)',
      'Classical Antiquity',
      'Medieval (500–1400)',
      'Renaissance (1400–1600)',
      'Baroque / Rococo (1600–1750)',
      'Enlightenment (1700s)',
      '19th Century (1800–1899)',
      'Early 20th Century (1900–1945)',
      'Mid to Late 20th Century (1945–1999)',
      'Contemporary (2000–Present)'
    ];
    
    res.json(timePeriods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Parse Met Museum URL
router.post('/parse-url', (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }
    
    const parsedParams = parseMetUrl(url);
    res.json(parsedParams);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get artwork details
router.get('/artwork/:id', async (req, res) => {
  try {
    const artwork = await metService.getObjectDetails(req.params.id);
    
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }
    
    res.json(artwork);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Preview artwork categorization
router.post('/categorize', async (req, res) => {
  try {
    const { objectId } = req.body;
    
    if (!objectId) {
      return res.status(400).json({ message: 'Object ID is required' });
    }
    
    const artwork = await metService.getObjectDetails(objectId);
    
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }
    
    // Get year
    const year = parseInt(artwork.objectBeginDate);
    
    // Get collections
    const eraCollections = metService.getEraCollections(year);
    const { collections: themeCollections, tags } = metService.getThemeCollections(artwork);
    
    // Combine collections
    const allCollections = [...eraCollections, ...themeCollections];
    
    // Add department information
    let departmentName = "";
    if (artwork.department) {
      departmentName = artwork.department;
      if (!allCollections.includes(departmentName)) {
        allCollections.push(departmentName);
      }
      if (!tags.includes(departmentName)) {
        tags.push(departmentName);
      }
    }
    
    res.json({
      objectId,
      title: artwork.title,
      artist: artwork.artistDisplayName || 'Unknown Artist',
      date: artwork.objectDate || 'Unknown',
      imageUrl: artwork.primaryImage,
      classification: artwork.classification,
      medium: artwork.medium,
      department: departmentName,
      collections: allCollections,
      tags,
      year
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
