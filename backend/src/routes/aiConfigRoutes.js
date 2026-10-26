/**
 * AI Service Configuration Routes
 */

import express from 'express';
import {
  getAIServiceConfig,
  updateAIServiceConfig,
  syncFeatureToggles,
  resetAIServiceConfig
} from '../controllers/aiConfigController.js';

const router = express.Router();

// Get current AI Service configuration
router.get('/config', getAIServiceConfig);

// Update AI Service configuration
router.post('/config', updateAIServiceConfig);

// Sync feature toggles to AI Service
router.post('/config/sync-features', syncFeatureToggles);

// Reset AI Service configuration to defaults
router.post('/config/reset', resetAIServiceConfig);

export default router;
