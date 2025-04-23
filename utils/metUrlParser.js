// utils/metUrlParser.js - Improved utility to parse Met Museum search URLs
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
    
    console.log("Processing URL parameters:", url);
    
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
      console.log("Found era parameter:", era);
      
      // Map common era values to date ranges and keywords
      if (era.toLowerCase().includes('1900-present') || 
          era.toLowerCase().includes('a.d. 1900') || 
          era.toLowerCase().includes('modern')) {
        console.log("Detected modern era (1900-present)");
        query.dateBegin = 1900;
        // Don't set dateEnd to include everything up to present
        query.filters.additionalKeywords.push('modern', '20th century', 'contemporary');
      }
      else if (era.toLowerCase().includes('19th century') || era.toLowerCase().includes('1800-1900')) {
        query.dateBegin = 1800;
        query.dateEnd = 1899;
        query.filters.additionalKeywords.push('19th century');
      }
      else if (era.toLowerCase().includes('18th century') || era.toLowerCase().includes('1700-1800')) {
        query.dateBegin = 1700;
        query.dateEnd = 1799;
        query.filters.additionalKeywords.push('18th century');
      }
      else if (era.toLowerCase().includes('17th century') || era.toLowerCase().includes('1600-1700')) {
        query.dateBegin = 1600;
        query.dateEnd = 1699;
        query.filters.additionalKeywords.push('17th century');
      }
      else if (era.toLowerCase().includes('16th century') || era.toLowerCase().includes('1500-1600')) {
        query.dateBegin = 1500;
        query.dateEnd = 1599;
        query.filters.additionalKeywords.push('16th century', 'renaissance');
      }
      else if (era.toLowerCase().includes('medieval') || era.toLowerCase().includes('middle ages')) {
        query.dateBegin = 500;
        query.dateEnd = 1499;
        query.filters.additionalKeywords.push('medieval', 'middle ages');
      }
      else if (era.toLowerCase().includes('ancient')) {
        query.dateEnd = 499;
        query.filters.additionalKeywords.push('ancient');
      }
      else {
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
      console.log("Found geolocation parameter:", geolocation);
      
      // Add geolocation as search keywords for API query
      query.filters.additionalKeywords.push(geolocation.toLowerCase());
      
      // Special handling for common locations
      if (geolocation.toLowerCase() === 'united states' || geolocation.toLowerCase() === 'america') {
        query.filters.additionalKeywords.push('american', 'usa', 'u.s.a');
      }
    }
    
    // Map material to medium and classification
    if (params.has('material')) {
      const material = params.get('material');
      query.filters.material = material;
      console.log("Found material parameter:", material);
      
      // Add material as search keywords for API query
      query.filters.additionalKeywords.push(material.toLowerCase());
      
      // Special handling for common materials that map to classifications
      if (material.toLowerCase() === 'paintings' || 
          material.toLowerCase().includes('paint') ||
          material.toLowerCase().includes('oil')) {
        query.filters.classification = 'Paintings';
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
    
    console.log("FINAL PARSED URL PARAMETERS:", JSON.stringify(query, null, 2));
    return query;
  } catch (error) {
    console.error('Error parsing Met Museum URL:', error);
    // Return default query parameters
    return {
      hasImages: true,
      isOnView: false,
      isHighlight: false,
      isPublicDomain: true,
      keywords: '*'
    };
  }
}

module.exports = parseMetUrl;
