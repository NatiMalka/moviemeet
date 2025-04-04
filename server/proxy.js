/**
 * Simple Express server that acts as a proxy for Archive.org API calls
 * 
 * To use this in production:
 * 1. Install dependencies: npm install express cors axios
 * 2. Run: node server/proxy.js
 * 3. Update the client code to use the proxy endpoints instead of direct Archive.org URLs
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for your frontend domains
app.use(cors({
  origin: ['http://localhost:5173', 'https://movie-meet-1a81b.web.app'],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

// Proxy route for Archive.org thumbnails
app.get('/api/archive/thumbnail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID format to prevent potential security issues
    if (!/^[a-zA-Z0-9._-]+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid Archive.org ID format' });
    }
    
    // Proxy the request to Archive.org
    const response = await axios.get(`https://archive.org/services/img/${id}`, {
      responseType: 'stream'
    });
    
    // Forward the response headers and data
    response.headers['access-control-allow-origin'] = '*';
    res.set(response.headers);
    response.data.pipe(res);
  } catch (error) {
    console.error('Error fetching Archive.org thumbnail:', error);
    res.status(500).json({ error: 'Failed to fetch thumbnail' });
  }
});

// Proxy route to validate if an Archive.org ID exists
app.get('/api/archive/validate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!/^[a-zA-Z0-9._-]+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid Archive.org ID format' });
    }
    
    // Check if the ID exists by checking its metadata
    const response = await axios.get(`https://archive.org/metadata/${id}`);
    
    if (response.status === 200 && response.data && response.data.metadata) {
      res.json({ 
        valid: true,
        metadata: {
          title: response.data.metadata.title,
          description: response.data.metadata.description,
          year: response.data.metadata.year
        }
      });
    } else {
      res.json({ valid: false });
    }
  } catch (error) {
    // If the request fails, the ID probably doesn't exist
    res.json({ valid: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Archive.org proxy server running on port ${PORT}`);
}); 