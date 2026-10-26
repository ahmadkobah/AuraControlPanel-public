import express from 'express';
import axios from 'axios';

const router = express.Router();

const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || '';
function aiKeyHeaders() {
  return AI_SERVICE_API_KEY ? { 'X-API-Key': AI_SERVICE_API_KEY } : {};
}

// Get tier deployment status for all 3 tiers
router.get('/', async (req, res) => {
  try {
    const tierStatus = {
      basic: await checkTierStatus('basic', 'http://localhost:9000'),
      plus: await checkTierStatus('plus', 'http://localhost:9001'),
      pro: await checkTierStatus('pro', 'http://localhost:9002')
    };
    
    return res.json(tierStatus);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

async function checkTierStatus(tierName, serviceUrl) {
  try {
    // Try /api/v1/status first, fall back to /health
    let statusResponse;
    try {
      statusResponse = await axios.get(`${serviceUrl}/api/v1/status`, { timeout: 3000, headers: aiKeyHeaders() });
    } catch {
      statusResponse = await axios.get(`${serviceUrl}/health`, { timeout: 3000, headers: aiKeyHeaders() });
    }

    // Extract model details from status endpoint
    let models = [];
    if (statusResponse.data.models_loaded && Array.isArray(statusResponse.data.models_loaded)) {
      models = statusResponse.data.models_loaded.map(name => ({
        name,
        loaded: true
      }));
    }

    return {
      status: 'running',
      serviceUrl,
      models,
      healthData: statusResponse.data
    };
  } catch (error) {
    return {
      status: 'not_running',
      serviceUrl,
      error: error.message
    };
  }
}

export default router;
