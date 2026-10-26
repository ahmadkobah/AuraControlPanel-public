import express from 'express';
import axios from 'axios';

const router = express.Router();

const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || '';

const TIER_URLS = {
  basic: process.env.AI_SERVICE_TIER1_URL || 'http://localhost:9000',
  plus: process.env.AI_SERVICE_TIER2_URL || 'http://localhost:9001',
  pro: process.env.AI_SERVICE_TIER3_URL || 'http://localhost:9002',
};

function aiKeyHeaders() {
  return AI_SERVICE_API_KEY ? { 'X-API-Key': AI_SERVICE_API_KEY } : {};
}

function getTierUrl(tier) {
  return TIER_URLS[tier] || TIER_URLS.basic;
}

// GET /admin/ai-proxy/health/:tier — proxy health check to the right tier service
router.get('/health/:tier', async (req, res) => {
  const tier = req.params.tier;
  const url = getTierUrl(tier);
  try {
    const response = await axios.get(`${url}/health`, { timeout: 5000, headers: aiKeyHeaders() });
    return res.json(response.data);
  } catch (err) {
    return res.status(err.response?.status || 502).json({ error: err.message, status: 'offline' });
  }
});

// POST /admin/ai-proxy/classify/:tier — proxy classification test to the right tier service
router.post('/classify/:tier', async (req, res) => {
  const tier = req.params.tier;
  const url = getTierUrl(tier);
  try {
    // Forward the raw request body (multipart form data)
    const response = await axios.post(`${url}/classify`, req.body, {
      timeout: 60000,
      headers: {
        ...aiKeyHeaders(),
        // Forward content-type from original request (multipart boundary)
        'Content-Type': req.headers['content-type'],
      },
      // Pass the raw body through for multipart
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return res.json(response.data);
  } catch (err) {
    return res.status(err.response?.status || 502).json({ error: err.message });
  }
});

export default router;
