// utils/metUrlParser.js - Utility to parse Met Museum search URLs
function parseMetUrl(url) {
  try {
    // Create URL object to parse parameters
    const parsedUrl = new URL(url);
    const params = parsedUrl.searchParams;
    console.log("params", params);
    // Initialize the query object with all required fields
    const query = {
      q: params.get('q') || '',
      showOnly: params.get('showOnly') || null,
      artist: null,
      material: null,
      era: null,
      geolocation: params.get('geolocation') || null,
      department: null,
      pkgIds: null,
      exhibitionId: null,
      feature: null,
      searchField: null,
    };

    // Process showOnly parameter
    if (params.has('showOnly')) {
      const showOnlyValue = params.get('showOnly');
      if (showOnlyValue) {
        query.showOnly = showOnlyValue;
      }
    }

    // Process department if present
    if (params.has('department')) {
      query.department = params.get('department');
    }

    // Process date/era if present
    if (params.has('era')) {
      query.era = params.get('era');
    }

    // Process material if present
    if (params.has('material')) {
      query.material = params.get('material');
    }

    // Process artist if present
    if (params.has('artist')) {
      query.artist = params.get('artist');
    }

    // Process search field if present
    if (params.has('searchField')) {
      query.searchField = params.get('searchField');
    }

    // Process sorting parameters if present
    if (params.has('sortBy')) {
      query.sortBy = params.get('sortBy');
    }
    if (params.has('sortOrder')) {
      query.sortOrder = params.get('sortOrder');
    }

    // Process pagination parameters if present
    if (params.has('page')) {
      query.page = parseInt(params.get('page')) || 1;
    }
    if (params.has('perPage')) {
      query.perPage = parseInt(params.get('perPage')) || 40;
    }
    if (params.has('offset')) {
      query.offset = parseInt(params.get('offset')) || 0;
    }

    console.log("Parsed query:", query);
    return query;
  } catch (error) {
    console.error("Error parsing URL:", error);
    throw new Error("Invalid URL format");
  }
}

module.exports = parseMetUrl;
