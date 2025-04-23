// utils/metUrlParser.js - Utility to parse Met Museum search URLs
/**
 * Parses a Met Museum search URL to extract search parameters
 * 
 * Example URL formats:
 * - https://www.metmuseum.org/art/collection/search?showOnly=openAccess&material=Oil+paint&q=landscape
 * - https://www.metmuseum.org/art/collection/search?department=11&era=19th+Century
 * 
 * @param {string} url - The Met Museum search URL
 * @returns {Object} - Parsed search parameters
 */
function parseMetUrl(url) {
  try {
    // Create URL object to parse parameters
    const parsedUrl = new URL(url);
    const params = parsedUrl.searchParams;
    
    const query = {
      // Default parameters
      hasImages: true,
      isOnView: params.has('isOnView') ? params.get('isOnView') === 'true' : false,
      isHighlight: params.has('isHighlight') ? params.get('isHighlight') === 'true' : false,
      departmentIds: []
    };
    
    // Check for open access flag
    if (params.has('showOnly') && params.get('showOnly').includes('openAccess')) {
      // We only want open access items
      query.isPublicDomain = true;
    }
    
    // Map department parameter
    if (params.has('department')) {
      const deptValue = params.get('department');
      const departmentIds = deptValue.split('|').map(id => parseInt(id));
      query.departmentIds = departmentIds.filter(id => !isNaN(id));
    }
    
    // Map various search parameters to keywords
    const keywords = [];
    
    // Direct search term
    if (params.has('q') && params.get('q') !== '*') {
      keywords.push(params.get('q'));
    }
    
    // Era/time period
    if (params.has('era')) {
      keywords.push(params.get('era'));
    }
    
    // Geographic location
    if (params.has('geo')) {
      keywords.push(params.get('geo'));
    }
    
    // Material/medium
    if (params.has('material')) {
      keywords.push(params.get('material'));
    }
    
    // Artist/culture
    if (params.has('artist') || params.has('culture')) {
      const artist = params.get('artist') || '';
      const culture = params.get('culture') || '';
      if (artist) keywords.push(artist);
      if (culture) keywords.push(culture);
    }
    
    // Combine all keywords
    if (keywords.length > 0) {
      query.keywords = keywords.join(' ');
    }
    
    // Date ranges
    if (params.has('dateBegin') || params.has('dateEnd')) {
      const dateBegin = params.get('dateBegin');
      const dateEnd = params.get('dateEnd');
      
      if (dateBegin) {
        query.dateBegin = parseInt(dateBegin);
      }
      
      if (dateEnd) {
        query.dateEnd = parseInt(dateEnd);
      }
    }
    
    return query;
  } catch (error) {
    console.error('Error parsing Met Museum URL:', error);
    // Return default query parameters
    return {
      hasImages: true,
      isOnView: false,
      isHighlight: false
    };
  }
}

module.exports = parseMetUrl;