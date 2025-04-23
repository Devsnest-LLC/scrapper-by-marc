// utils/metUrlParser.js - Improved utility to parse Met Museum search URLs
/**
 * Parses a Met Museum search URL to extract search parameters
 * 
 * Example URL formats:
 * - https://www.metmuseum.org/art/collection/search?showOnly=openAccess&material=Oil+paint&q=landscape
 * - https://www.metmuseum.org/art/collection/search?department=11&era=19th+Century
 * - https://www.metmuseum.org/art/collection/search?showOnly=openAccess&era=A.D.+1900-present&geolocation=United+States&material=Paintings
 * 
 * @param {string} url - The Met Museum search URL
 * @returns {Object} - Parsed search parameters
 */
function parseMetUrl(url) {
  try {
    // Create URL object to parse parameters
    const parsedUrl = new URL(url);
    const params = parsedUrl.searchParams;
    
    // Initialize the query object with default values
    const query = {
      // Default parameters
      hasImages: true,
      isOnView: params.has('isOnView') ? params.get('isOnView') === 'true' : false,
      isHighlight: params.has('isHighlight') ? params.get('isHighlight') === 'true' : false,
      isPublicDomain: params.has('showOnly') && params.get('showOnly').includes('openAccess'),
      departmentIds: [],
      
      // Additional filters for post-processing (not direct API parameters)
      filters: {
        era: null,
        geolocation: null,
        material: null,
        classification: null,
        additionalKeywords: []
      }
    };
    
    // Department mapping
    if (params.has('department')) {
      const deptValue = params.get('department');
      const departmentIds = deptValue.split('|').map(id => parseInt(id));
      query.departmentIds = departmentIds.filter(id => !isNaN(id));
    }
    
    // Map era parameter to date ranges and keywords
    if (params.has('era')) {
      const era = params.get('era');
      query.filters.era = era;
      
      // Map common era values to date ranges and keywords
      switch (era.toLowerCase()) {
        case 'a.d. 1900-present':
        case '1900-present':
        case 'modern':
          query.dateBegin = 1900;
          query.filters.additionalKeywords.push('modern', '20th century', 'contemporary');
          break;
        case '19th century':
        case '1800-1900':
          query.dateBegin = 1800;
          query.dateEnd = 1899;
          query.filters.additionalKeywords.push('19th century');
          break;
        case '18th century':
        case '1700-1800':
          query.dateBegin = 1700;
          query.dateEnd = 1799;
          query.filters.additionalKeywords.push('18th century');
          break;
        case '17th century':
        case '1600-1700':
          query.dateBegin = 1600;
          query.dateEnd = 1699;
          query.filters.additionalKeywords.push('17th century');
          break;
        case '16th century':
        case '1500-1600':
          query.dateBegin = 1500;
          query.dateEnd = 1599;
          query.filters.additionalKeywords.push('16th century', 'renaissance');
          break;
        case 'medieval':
        case 'middle ages':
          query.dateBegin = 500;
          query.dateEnd = 1499;
          query.filters.additionalKeywords.push('medieval', 'middle ages');
          break;
        case 'ancient':
          query.dateEnd = 499;
          query.filters.additionalKeywords.push('ancient');
          break;
        default:
          // Try to extract years from custom era strings
          const yearPattern = /(\d{1,4})[-–](\d{1,4}|\s?present)/i;
          const match = era.match(yearPattern);
          if (match) {
            const startYear = parseInt(match[1]);
            const endYear = match[2].toLowerCase() === 'present' ? new Date().getFullYear() : parseInt(match[2]);
            if (!isNaN(startYear)) {
              query.dateBegin = startYear;
            }
            if (!isNaN(endYear)) {
              query.dateEnd = endYear;
            }
          }
          // Always add the era as a keyword
          query.filters.additionalKeywords.push(era.toLowerCase());
      }
    }
    
    // Map geolocation to culture/region keywords
    if (params.has('geolocation')) {
      const geolocation = params.get('geolocation');
      query.filters.geolocation = geolocation;
      
      // Add geolocation as search keywords for API query
      query.filters.additionalKeywords.push(geolocation.toLowerCase());
      
      // Special handling for common locations
      if (geolocation.toLowerCase() === 'united states' || geolocation.toLowerCase() === 'america') {
        query.filters.additionalKeywords.push('american', 'usa', 'u.s.a');
      } else if (geolocation.toLowerCase() === 'europe') {
        query.filters.additionalKeywords.push('european');
      } else if (geolocation.toLowerCase() === 'asia') {
        query.filters.additionalKeywords.push('asian');
      } else if (geolocation.toLowerCase() === 'africa') {
        query.filters.additionalKeywords.push('african');
      }
    }
    
    // Map material to medium and classification
    if (params.has('material')) {
      const material = params.get('material');
      query.filters.material = material;
      
      // Add material as search keywords for API query
      query.filters.additionalKeywords.push(material.toLowerCase());
      
      // Special handling for common materials that map to classifications
      if (material.toLowerCase() === 'paintings' || 
          material.toLowerCase().includes('paint') ||
          material.toLowerCase().includes('oil')) {
        query.filters.classification = 'Paintings';
      } else if (material.toLowerCase().includes('draw') ||
                material.toLowerCase().includes('pencil') ||
                material.toLowerCase().includes('chalk') ||
                material.toLowerCase().includes('charcoal')) {
        query.filters.classification = 'Drawings';
      } else if (material.toLowerCase().includes('print') ||
                material.toLowerCase().includes('etching') ||
                material.toLowerCase().includes('engraving')) {
        query.filters.classification = 'Prints';
      } else if (material.toLowerCase().includes('photo')) {
        query.filters.classification = 'Photographs';
      } else if (material.toLowerCase().includes('sculpt') ||
                material.toLowerCase().includes('statue') ||
                material.toLowerCase().includes('ceramic') ||
                material.toLowerCase().includes('pottery')) {
        query.filters.classification = 'Sculpture';
      }
    }
    
    // Map various search parameters to keywords
    const keywordSources = [];
    
    // Direct search term
    if (params.has('q') && params.get('q') !== '*') {
      keywordSources.push(params.get('q'));
    }
    
    // Artist/culture
    if (params.has('artist') || params.has('culture')) {
      const artist = params.get('artist') || '';
      const culture = params.get('culture') || '';
      if (artist) keywordSources.push(artist);
      if (culture) keywordSources.push(culture);
    }
    
    // Combine all keywords including those from filters
    const allKeywords = [
      ...keywordSources,
      ...query.filters.additionalKeywords
    ].filter(Boolean);
    
    if (allKeywords.length > 0) {
      query.keywords = allKeywords.join(' ');
    } else if (!params.has('q') || params.get('q') === '*') {
      // If no specific keywords and no search term, use '*' to get all results
      query.keywords = '*';
    }
    
    return query;
  } catch (error) {
    console.error('Error parsing Met Museum URL:', error);
    // Return default query parameters
    return {
      hasImages: true,
      isOnView: false,
      isHighlight: false,
      keywords: '*'
    };
  }
}

module.exports = parseMetUrl;
