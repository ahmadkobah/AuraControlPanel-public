/**
 * AI Service Configuration Sync Controller
 * 
 * Syncs feature toggles between Control Panel and AI Service
 */

import fetch from 'node-fetch';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:9000';
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || '';

/** Build headers for AI Service requests (includes API key if configured) */
function aiHeaders(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra };
  if (AI_SERVICE_API_KEY) h['X-API-Key'] = AI_SERVICE_API_KEY;
  return h;
}

/**
 * Get current AI Service configuration
 */
export async function getAIServiceConfig(req, res) {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/v1/config`, {
      headers: aiHeaders(),
    });
    if (!response.ok) {
      throw new Error(`AI Service returned ${response.status}`);
    }
    
    const data = await response.json();
    
    res.json({
      success: true,
      config: data.config,
      message: 'AI Service configuration retrieved',
      timestamp: data.timestamp
    });
    
  } catch (error) {
    console.error('Error getting AI Service config:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve AI Service configuration'
    });
  }
}

/**
 * Update AI Service configuration
 */
export async function updateAIServiceConfig(req, res) {
  try {
    const updates = req.body;
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No configuration updates provided'
      });
    }
    
    const response = await fetch(`${AI_SERVICE_URL}/api/v1/config`, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `AI Service returned ${response.status}`);
    }
    
    const data = await response.json();
    
    res.json({
      success: true,
      config: data.config,
      message: data.message,
      timestamp: data.timestamp
    });
    
  } catch (error) {
    console.error('Error updating AI Service config:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to update AI Service configuration'
    });
  }
}

/**
 * Sync Control Panel feature toggles to AI Service
 * 
 * Maps all 11 pipeline step toggles from Control Panel to AI Service config.
 * Supports both granular features object and direct performanceFlags.
 */
export async function syncFeatureToggles(req, res) {
  try {
    const { features, performanceFlags } = req.body;
    
    if (!features && !performanceFlags) {
      return res.status(400).json({
        success: false,
        message: 'No features or performanceFlags provided'
      });
    }
    
    // Map Control Panel feature names to AI Service config keys
    // Supports ALL 11 pipeline step toggles + parameters
    let configUpdates = {};
    
    if (performanceFlags) {
      // Direct performanceFlags from tier config - pass through as-is
      // This includes all 11 ENABLE_* toggles and parameter values
      configUpdates = { ...performanceFlags };
    } else if (features) {
      // Legacy granular features object - map to config keys
      configUpdates = {
        // All 11 Pipeline Step Toggles
        ENABLE_PDF_SPLITTING: features.pdfSplitting ?? features.ENABLE_PDF_SPLITTING ?? true,
        ENABLE_OCR_VALIDATION: features.ocrValidation ?? features.ENABLE_OCR_VALIDATION ?? true,
        ENABLE_CLASSIFICATION: features.classification ?? features.ENABLE_CLASSIFICATION ?? true,
        ENABLE_SIGNATURE_DETECTION: features.signatureDetection ?? features.ENABLE_SIGNATURE_DETECTION ?? true,
        ENABLE_SIGNATURE_VALIDATION: features.signatureValidation ?? features.ENABLE_SIGNATURE_VALIDATION ?? true,
        ENABLE_STRUCTURED_EXTRACTION: features.structuredExtraction ?? features.ENABLE_STRUCTURED_EXTRACTION ?? true,
        ENABLE_ENTITY_EXTRACTION: features.entityExtraction ?? features.ENABLE_ENTITY_EXTRACTION ?? true,
        ENABLE_SUMMARY: features.documentSummary ?? features.summarization ?? features.ENABLE_SUMMARY ?? true,
        ENABLE_EMBEDDING_GENERATION: features.embeddingGeneration ?? features.ENABLE_EMBEDDING_GENERATION ?? true,
        ENABLE_MONGODB_STORAGE: features.mongodbStorage ?? features.ENABLE_MONGODB_STORAGE ?? true,
        
        // Optional parameters if provided
        ...(features.SIMILARITY_THRESHOLD && { SIMILARITY_THRESHOLD: features.SIMILARITY_THRESHOLD }),
        ...(features.OCR_DPI && { OCR_DPI: features.OCR_DPI }),
        ...(features.YOLO_CONFIDENCE && { YOLO_CONFIDENCE: features.YOLO_CONFIDENCE }),
        ...(features.CLASSIFICATION_MIN_CONFIDENCE && { CLASSIFICATION_MIN_CONFIDENCE: features.CLASSIFICATION_MIN_CONFIDENCE }),
        ...(features.LLAMA_TEMPERATURE && { LLAMA_TEMPERATURE: features.LLAMA_TEMPERATURE }),
        ...(features.LLAMA_MAX_TOKENS && { LLAMA_MAX_TOKENS: features.LLAMA_MAX_TOKENS })
      };
    }
    
    const response = await fetch(`${AI_SERVICE_URL}/api/v1/config`, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify(configUpdates)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `AI Service returned ${response.status}`);
    }
    
    const data = await response.json();
    
    res.json({
      success: true,
      config: data.config,
      message: 'Feature toggles synced to AI Service',
      synced_features: Object.keys(configUpdates).length,
      timestamp: data.timestamp
    });
    
  } catch (error) {
    console.error('Error syncing feature toggles:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to sync feature toggles to AI Service'
    });
  }
}

/**
 * Reset AI Service configuration to defaults
 */
export async function resetAIServiceConfig(req, res) {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/v1/config/reset`, {
      method: 'POST',
      headers: aiHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`AI Service returned ${response.status}`);
    }
    
    const data = await response.json();
    
    res.json({
      success: true,
      config: data.config,
      message: 'AI Service configuration reset to defaults',
      timestamp: data.timestamp
    });
    
  } catch (error) {
    console.error('Error resetting AI Service config:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to reset AI Service configuration'
    });
  }
}

/**
 * Apply a complete tier configuration to the AI Service
 * 
 * This function syncs the full performanceFlags from tierDefaults.js
 * to the AI Service when a company's tier changes.
 * 
 * @param {object} tierConfig - The tier configuration object containing performanceFlags
 * @returns {Promise<object>} - Result of the sync operation
 */
export async function applyTierConfig(tierConfig) {
  try {
    if (!tierConfig || !tierConfig.performanceFlags) {
      throw new Error('Invalid tier config: missing performanceFlags');
    }

    const response = await fetch(`${AI_SERVICE_URL}/api/v1/config`, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify(tierConfig.performanceFlags)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `AI Service returned ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Tier config synced: ${tierConfig.tier || 'unknown'} - ${Object.keys(tierConfig.performanceFlags).length} settings`);
    
    return {
      success: true,
      config: data.config,
      tier: tierConfig.tier,
      synced_settings: Object.keys(tierConfig.performanceFlags).length,
      timestamp: data.timestamp
    };
    
  } catch (error) {
    console.error('Error applying tier config:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to apply tier configuration to AI Service'
    };
  }
}
