/**
 * Tier Configuration Routes
 * 
 * Manages tier-based and company-specific AI configuration overrides
 * 
 * Endpoints:
 * - GET /admin/tier-configs/resolve?companyId=X&tier=Y - Resolve config with priority
 * - GET /admin/tier-configs/tier/:tier - Get tier defaults
 * - PUT /admin/tier-configs/tier/:tier - Update tier defaults
 * - GET /admin/tier-configs/company/:companyId - Get company override
 * - PUT /admin/tier-configs/company/:companyId - Update company override
 * - DELETE /admin/tier-configs/company/:companyId - Reset to tier defaults
 */

import express from 'express';
import CompanyTierConfig from '../../models/CompanyTierConfig.js';
import { logAction } from './utils/auditLogger.js';

const router = express.Router();

// ===== CONFIG RESOLUTION =====

/**
 * GET /admin/tier-configs/resolve
 * 
 * Resolve configuration with proper priority:
 * 1. Company-specific override (highest)
 * 2. Tier default (medium)
 * 3. Global default (lowest)
 * 
 * Query params:
 * - companyId: Company ID (optional)
 * - tier: Tier level (basic/plus/pro) (required)
 */
router.get('/resolve', async (req, res) => {
  try {
    const { companyId, tier } = req.query;
    
    if (!tier) {
      return res.status(400).json({ 
        error: 'Tier parameter is required',
        example: '/admin/tier-configs/resolve?tier=basic&companyId=123'
      });
    }
    
    if (!['basic', 'plus', 'pro'].includes(tier)) {
      return res.status(400).json({ 
        error: 'Invalid tier. Must be: basic, plus, or pro'
      });
    }
    
    const resolvedConfig = await CompanyTierConfig.resolveConfig(
      companyId || null,
      tier
    );
    
    // Determine source of configuration
    let configSource = 'global_default';
    if (resolvedConfig._id) {
      if (resolvedConfig.companyId) {
        configSource = 'company_override';
      } else {
        configSource = 'tier_default';
      }
    }
    
    return res.json({
      config: resolvedConfig,
      metadata: {
        source: configSource,
        tier: tier,
        companyId: companyId || null,
        resolvedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Config resolution error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ===== TIER DEFAULTS MANAGEMENT =====

/**
 * GET /admin/tier-configs/tier/:tier
 * 
 * Get tier default configuration (companyId = null)
 */
router.get('/tier/:tier', async (req, res) => {
  try {
    const { tier } = req.params;
    
    if (!['basic', 'plus', 'pro'].includes(tier)) {
      return res.status(400).json({ 
        error: 'Invalid tier. Must be: basic, plus, or pro'
      });
    }
    
    const tierConfig = await CompanyTierConfig.findOne({ 
      companyId: null, 
      tier: tier,
      isActive: true
    });
    
    if (!tierConfig) {
      return res.status(404).json({ 
        error: `Tier default not found for ${tier}`,
        hint: 'Run seed-tier-defaults.js to populate tier defaults'
      });
    }
    
    return res.json(tierConfig);
  } catch (err) {
    console.error('Get tier config error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /admin/tier-configs/tier/:tier
 * 
 * Update tier default configuration
 */
router.put('/tier/:tier', async (req, res) => {
  try {
    const { tier } = req.params;
    const userId = req.user?._id || req.body.userId;
    
    if (!['basic', 'plus', 'pro'].includes(tier)) {
      return res.status(400).json({ 
        error: 'Invalid tier. Must be: basic, plus, or pro'
      });
    }
    
    const oldConfig = await CompanyTierConfig.findOne({ 
      companyId: null, 
      tier: tier 
    });
    
    const updatedConfig = await CompanyTierConfig.upsertConfig(
      null,  // companyId = null for tier defaults
      tier,
      req.body,
      userId
    );
    
    await logAction(
      req, 
      oldConfig ? 'update' : 'create', 
      'tier_config', 
      updatedConfig._id, 
      'CompanyTierConfig',
      req.body,
      oldConfig?.toObject(),
      updatedConfig.toObject()
    );
    
    return res.json(updatedConfig);
  } catch (err) {
    console.error('Update tier config error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/tier-configs/tiers
 * 
 * Get all tier defaults (Basic, Plus, Pro)
 */
router.get('/tiers', async (req, res) => {
  try {
    const tierConfigs = await CompanyTierConfig.find({ 
      companyId: null,
      isActive: true
    }).sort({ tier: 1 });
    
    return res.json({
      tiers: tierConfigs,
      count: tierConfigs.length
    });
  } catch (err) {
    console.error('Get all tiers error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ===== COMPANY-SPECIFIC OVERRIDES =====

/**
 * GET /admin/tier-configs/company/:companyId
 * 
 * Get company-specific configuration override
 */
router.get('/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { tier } = req.query;
    
    if (!tier) {
      return res.status(400).json({ 
        error: 'Tier query parameter is required',
        example: `/admin/tier-configs/company/${companyId}?tier=basic`
      });
    }
    
    const companyConfig = await CompanyTierConfig.findOne({ 
      companyId: companyId,
      tier: tier,
      isActive: true
    });
    
    if (!companyConfig) {
      return res.status(404).json({ 
        error: 'Company override not found',
        hint: 'Company is using tier defaults. Create an override with PUT request.'
      });
    }
    
    return res.json(companyConfig);
  } catch (err) {
    console.error('Get company config error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /admin/tier-configs/company/:companyId
 * 
 * Create or update company-specific configuration override
 */
router.put('/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { tier } = req.query;
    const userId = req.user?._id || req.body.userId;
    
    if (!tier) {
      return res.status(400).json({ 
        error: 'Tier query parameter is required',
        example: `/admin/tier-configs/company/${companyId}?tier=basic`
      });
    }
    
    if (!['basic', 'plus', 'pro'].includes(tier)) {
      return res.status(400).json({ 
        error: 'Invalid tier. Must be: basic, plus, or pro'
      });
    }
    
    const oldConfig = await CompanyTierConfig.findOne({ 
      companyId: companyId,
      tier: tier
    });
    
    const updatedConfig = await CompanyTierConfig.upsertConfig(
      companyId,
      tier,
      req.body,
      userId
    );
    
    await logAction(
      req,
      oldConfig ? 'update' : 'create',
      'company_config',
      updatedConfig._id,
      'CompanyTierConfig',
      req.body,
      oldConfig?.toObject(),
      updatedConfig.toObject()
    );
    
    return res.json(updatedConfig);
  } catch (err) {
    console.error('Update company config error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /admin/tier-configs/company/:companyId
 * 
 * Reset company to tier defaults (remove company override)
 */
router.delete('/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { tier } = req.query;
    const userId = req.user?._id || req.body.userId;
    
    if (!tier) {
      return res.status(400).json({ 
        error: 'Tier query parameter is required',
        example: `/admin/tier-configs/company/${companyId}?tier=basic`
      });
    }
    
    const companyConfig = await CompanyTierConfig.findOne({ 
      companyId: companyId,
      tier: tier
    });
    
    if (!companyConfig) {
      return res.status(404).json({ 
        error: 'Company override not found',
        hint: 'Company is already using tier defaults'
      });
    }
    
    await CompanyTierConfig.deleteOne({ _id: companyConfig._id });
    
    await logAction(
      req,
      'delete',
      'company_config',
      companyConfig._id,
      'CompanyTierConfig',
      null,
      companyConfig.toObject(),
      null
    );
    
    return res.json({ 
      message: 'Company override deleted. Now using tier defaults.',
      deletedConfig: companyConfig
    });
  } catch (err) {
    console.error('Delete company config error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/tier-configs/companies
 * 
 * List all company overrides with pagination
 */
router.get('/companies', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const companyConfigs = await CompanyTierConfig.find({ 
      companyId: { $ne: null },
      isActive: true
    })
    .populate('companyId', 'name tier')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);
    
    const total = await CompanyTierConfig.countDocuments({ 
      companyId: { $ne: null },
      isActive: true
    });
    
    return res.json({
      configs: companyConfigs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('List company configs error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ===== COMPARISON & UTILITIES =====

/**
 * GET /admin/tier-configs/compare/:tier
 * 
 * Compare tier default with company override
 */
router.get('/compare/:tier', async (req, res) => {
  try {
    const { tier } = req.params;
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ 
        error: 'CompanyId query parameter is required',
        example: `/admin/tier-configs/compare/${tier}?companyId=123`
      });
    }
    
    const tierDefault = await CompanyTierConfig.findOne({ 
      companyId: null, 
      tier: tier,
      isActive: true
    });
    
    const companyOverride = await CompanyTierConfig.findOne({ 
      companyId: companyId,
      tier: tier,
      isActive: true
    });
    
    // Calculate differences
    const differences = [];
    if (tierDefault && companyOverride) {
      const tierObj = tierDefault.toObject();
      const companyObj = companyOverride.toObject();
      
      // Compare all configuration fields
      const fields = [
        'ENABLE_PDF_SPLITTING', 'ENABLE_OCR_VALIDATION', 'ENABLE_CLASSIFICATION',
        'ENABLE_SIGNATURE_DETECTION', 'ENABLE_SIGNATURE_VALIDATION',
        'ENABLE_STRUCTURED_EXTRACTION', 'ENABLE_ENTITY_EXTRACTION',
        'ENABLE_SUMMARY', 'ENABLE_EMBEDDING_GENERATION', 'ENABLE_MONGODB_STORAGE',
        'SIMILARITY_THRESHOLD', 'OCR_DPI', 'YOLO_CONFIDENCE',
        'LLAMA_TEMPERATURE', 'LLAMA_MAX_TOKENS', 'OCR_CONFIDENCE_THRESHOLD',
        'SIGNATURE_CONFIDENCE_THRESHOLD', 'SEARCH_TOP_K_DEFAULT',
        'MAX_GPU_MEMORY_MB', 'GPU_LAYERS', 'MAX_PDF_SIZE_MB'
      ];
      
      fields.forEach(field => {
        if (tierObj[field] !== companyObj[field]) {
          differences.push({
            field,
            tierDefault: tierObj[field],
            companyOverride: companyObj[field]
          });
        }
      });
    }
    
    return res.json({
      tier,
      companyId,
      tierDefault: tierDefault || null,
      companyOverride: companyOverride || null,
      differences,
      hasOverride: !!companyOverride,
      differenceCount: differences.length
    });
  } catch (err) {
    console.error('Compare configs error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ===== AI SERVICE SYNC =====

/**
 * POST /admin/tier-configs/sync-to-ai-service
 * 
 * Sync configuration from MongoDB to AI Service RUNTIME_CONFIG
 * This makes Control Panel changes actually take effect
 * 
 * Body:
 * - companyId: Company ID (optional)
 * - tier: Tier level (required)
 */
router.post('/sync-to-ai-service', async (req, res) => {
  try {
    const { companyId, tier } = req.body;
    
    if (!tier) {
      return res.status(400).json({ 
        error: 'Tier is required',
        example: { tier: 'basic', companyId: '123' }
      });
    }
    
    // 1. Resolve config from MongoDB (uses proper priority)
    const resolvedConfig = await CompanyTierConfig.resolveConfig(
      companyId || null,
      tier
    );
    
    // 2. Convert to AI Service format (all 47+ parameters)
    const aiServiceConfig = {
      // Pipeline Toggles (11)
      ENABLE_PDF_SPLITTING: resolvedConfig.ENABLE_PDF_SPLITTING,
      ENABLE_OCR_VALIDATION: resolvedConfig.ENABLE_OCR_VALIDATION,
      ENABLE_CLASSIFICATION: resolvedConfig.ENABLE_CLASSIFICATION,
      ENABLE_SIGNATURE_DETECTION: resolvedConfig.ENABLE_SIGNATURE_DETECTION,
      ENABLE_SIGNATURE_VALIDATION: resolvedConfig.ENABLE_SIGNATURE_VALIDATION,
      ENABLE_STRUCTURED_EXTRACTION: resolvedConfig.ENABLE_STRUCTURED_EXTRACTION,
      ENABLE_ENTITY_EXTRACTION: resolvedConfig.ENABLE_ENTITY_EXTRACTION,
      ENABLE_SUMMARY: resolvedConfig.ENABLE_SUMMARY,
      ENABLE_EMBEDDING_GENERATION: resolvedConfig.ENABLE_EMBEDDING_GENERATION,
      ENABLE_MONGODB_STORAGE: resolvedConfig.ENABLE_MONGODB_STORAGE,
      
      // Basic Parameters (4)
      SIMILARITY_THRESHOLD: resolvedConfig.SIMILARITY_THRESHOLD,
      OCR_DPI: resolvedConfig.OCR_DPI,
      YOLO_CONFIDENCE: resolvedConfig.YOLO_CONFIDENCE,
      CLASSIFICATION_MIN_CONFIDENCE: resolvedConfig.CLASSIFICATION_MIN_CONFIDENCE,
      
      // Advanced Parameters (8)
      LLAMA_TEMPERATURE: resolvedConfig.LLAMA_TEMPERATURE,
      LLAMA_MAX_TOKENS: resolvedConfig.LLAMA_MAX_TOKENS,
      OCR_CONFIDENCE_THRESHOLD: resolvedConfig.OCR_CONFIDENCE_THRESHOLD,
      SIGNATURE_CONFIDENCE_THRESHOLD: resolvedConfig.SIGNATURE_CONFIDENCE_THRESHOLD,
      SEARCH_TOP_K_DEFAULT: resolvedConfig.SEARCH_TOP_K_DEFAULT,
      MAX_GPU_MEMORY_MB: resolvedConfig.MAX_GPU_MEMORY_MB,
      GPU_LAYERS: resolvedConfig.GPU_LAYERS,
      MAX_PDF_SIZE_MB: resolvedConfig.MAX_PDF_SIZE_MB,
      
      // LLaMA Validation Parameters (6)
      OCR_VALIDATION_TIMEOUT: resolvedConfig.OCR_VALIDATION_TIMEOUT,
      OCR_VALIDATION_TEMPERATURE: resolvedConfig.OCR_VALIDATION_TEMPERATURE,
      OCR_VALIDATION_MAX_TOKENS: resolvedConfig.OCR_VALIDATION_MAX_TOKENS,
      CLASSIFICATION_TIMEOUT: resolvedConfig.CLASSIFICATION_TIMEOUT,
      CLASSIFICATION_REASONING_TEMPERATURE: resolvedConfig.CLASSIFICATION_REASONING_TEMPERATURE,
      CLASSIFICATION_LOW_CONFIDENCE_THRESHOLD: resolvedConfig.CLASSIFICATION_LOW_CONFIDENCE_THRESHOLD,
      
      // Structured Extraction Parameters (4)
      EXTRACTION_MAX_TOKENS: resolvedConfig.EXTRACTION_MAX_TOKENS,
      EXTRACTION_TEMPERATURE: resolvedConfig.EXTRACTION_TEMPERATURE,
      ENTITY_EXTRACTION_MAX_TOKENS: resolvedConfig.ENTITY_EXTRACTION_MAX_TOKENS,
      ENTITY_EXTRACTION_TEMPERATURE: resolvedConfig.ENTITY_EXTRACTION_TEMPERATURE,
      
      // Signature Validation Parameters (6)
      SIGNATURE_VALIDATION_MAX_TOKENS: resolvedConfig.SIGNATURE_VALIDATION_MAX_TOKENS,
      SIGNATURE_VALIDATION_TEMPERATURE: resolvedConfig.SIGNATURE_VALIDATION_TEMPERATURE,
      NAME_EXTRACTION_MAX_TOKENS: resolvedConfig.NAME_EXTRACTION_MAX_TOKENS,
      NAME_EXTRACTION_TEMPERATURE: resolvedConfig.NAME_EXTRACTION_TEMPERATURE,
      AUTHENTICITY_MAX_TOKENS: resolvedConfig.AUTHENTICITY_MAX_TOKENS,
      AUTHENTICITY_TEMPERATURE: resolvedConfig.AUTHENTICITY_TEMPERATURE,
      
      // OCR Validation Additional Parameters (3)
      OCR_QUALITY_SKIP_THRESHOLD: resolvedConfig.OCR_QUALITY_SKIP_THRESHOLD,
      VALIDATION_QUALITY_MAX_TOKENS: resolvedConfig.VALIDATION_QUALITY_MAX_TOKENS,
      VALIDATION_QUALITY_TEMPERATURE: resolvedConfig.VALIDATION_QUALITY_TEMPERATURE,
      
      // YOLO Detection Parameters (1)
      YOLO_IOU_THRESHOLD: resolvedConfig.YOLO_IOU_THRESHOLD,
      
      // Classification Parameters (1)
      LLAMA_OVERRIDE_CONFIDENCE: resolvedConfig.LLAMA_OVERRIDE_CONFIDENCE,
      
      // Health/System Parameters (1)
      LLAMAFILE_HEALTH_TIMEOUT: resolvedConfig.LLAMAFILE_HEALTH_TIMEOUT
    };
    
    // 3. Send to AI Service
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:9000';
    const aiApiKey = process.env.AI_SERVICE_API_KEY || '';
    const fetch = (await import('node-fetch')).default;
    
    const fetchHeaders = { 'Content-Type': 'application/json' };
    if (aiApiKey) fetchHeaders['X-API-Key'] = aiApiKey;
    
    const response = await fetch(`${aiServiceUrl}/api/v1/config`, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify(aiServiceConfig)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Service sync failed (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    
    // 4. Log the sync action
    await logAction({
      action: 'sync_ai_service_config',
      details: {
        tier,
        companyId: companyId || null,
        parametersSynced: Object.keys(aiServiceConfig).length,
        aiServiceResponse: result.message
      },
      performedBy: req.user?.email || 'system'
    });
    
    return res.json({
      success: true,
      message: 'Configuration synced to AI Service',
      parametersSynced: Object.keys(aiServiceConfig).length,
      aiServiceResponse: result,
      syncedAt: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('AI Service sync error:', err);
    return res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

export default router;
