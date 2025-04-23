# Met to Shopify Importer

A full-stack application that allows you to import artwork data from the Metropolitan Museum of Art's API to your Shopify store.

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher) - Download from https://nodejs.org/
- npm (v6 or higher) - Included with Node.js
- MongoDB (v4.4 or higher) - Download from https://www.mongodb.com/try/download/community
- Git - Download from https://git-scm.com/downloads

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Devsnest-LLC/scrapper-by-marc.git
cd scrapper-by-marc
```

2. Install dependencies:
```bash
npm run setup
```

3. Create a `.env` file in the root directory with the following variables:
```env
MONGODB_URI=your_mongodb_connection_string
PORT=5000
MET_API_KEY=your_met_api_key
SHOPIFY_STORE_URL=your_shopify_store_url
SHOPIFY_ACCESS_TOKEN=your_shopify_access_token
```

## Running the Application

### Development Mode

1. Start the app:
```bash
npm run dev-full
```

### Production Mode

1. Build the client:
```bash
npm run build-client
```

2. Start the server:
```bash
npm start
```

## Project Structure

```
met-to-shopify-importer/
├── client/                 # React frontend
│   ├── public/            # Static files
│   └── src/               # React source files
├── models/                # MongoDB models
├── routes/                # API routes
├── services/              # Business logic
├── utils/                 # Utility functions
├── server.js             # Express server
└── package.json          # Project dependencies
```

## Features

- Import artwork from the Metropolitan Museum's API
- Filter and select specific artworks
- Batch import to Shopify
- Real-time progress tracking
- Error handling and retry mechanisms
- Rate limit management

## API Documentation

### Metropolitan Museum API
- Base URL: https://collectionapi.metmuseum.org/public/collection/v1
- Documentation: https://metmuseum.github.io/

### Shopify API
- Documentation: https://shopify.dev/docs/api

## License

This is a private repository. All rights reserved. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.
