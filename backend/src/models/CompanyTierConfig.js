import mongoose from 'mongoose';

/**
 * CompanyTierConfig Model
 * 
 * Stores AI configuration overrides at three levels:
 * 1. Tier Defaults (companyId = null, tier = basic/plus/pro)
 * 2. Company Overrides (companyId = ObjectId, tier = company's tier)
 * 3. Global Defaults (in AI Service RUNTIME_CONFIG)
 * 
 * Priority: Company Override > Tier Default > Global Default
 * 
 * NOTE: Current global defaults = Tier 1 (Basic) configuration
 */

const CompanyTierConfigSchema = new mongoose.Schema(
  {
    // Null = tier default, ObjectId = company-specific override
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      index: true
    },
    
    // Tier level: basic, plus, or pro
    tier: {
      type: String,
      enum: ['basic', 'plus', 'pro'],
      required: true,
      index: true
    },
    
    // ===== BUSINESS FEATURES & LIMITS (from TierManagement) =====
    // These control access rights and quotas, not AI behavior
    businessFeatures: {
      maxDocuments: {
        type: Number,
        default: -1, // -1 = unlimited
        description: 'Maximum documents per month (-1 = unlimited)'
      },
      maxUsers: {
        type: Number,
        default: 200,
        description: 'Maximum user accounts'
      },
      maxDepartments: {
        type: Number,
        default: 50,
        description: 'Maximum departments'
      },
      storage_gb: {
        type: Number,
        default: 8000,
        description: 'Storage quota in GB'
      },
      apiAccess: {
        type: Boolean,
        default: true,
        description: 'Enable API access'
      },
      apiRateLimit: {
        type: Number,
        default: -1, // -1 = unlimited
        description: 'API requests per hour (-1 = unlimited)'
      },
      customClassifications: {
        type: Boolean,
        default: true,
        description: 'Allow custom document classifications'
      },
      advancedSearch: {
        type: Boolean,
        default: true,
        description: 'Enable advanced search features'
      },
      multiLanguageOCR: {
        type: Boolean,
        default: true,
        description: 'Support multiple OCR languages'
      },
      priorityProcessing: {
        type: Boolean,
        default: false,
        description: 'Priority queue for document processing'
      },
      customPrompts: {
        type: Boolean,
        default: false,
        description: 'Allow custom AI prompt templates'
      }
    },
    
    // License & Billing (from TierManagement)
    license: {
      licenseKey: {
        type: String,
        default: null
      },
      validFrom: {
        type: Date,
        default: null
      },
      validUntil: {
        type: Date,
        default: null
      },
      autoRenew: {
        type: Boolean,
        default: true
      },
      pricePerMonth: {
        type: Number,
        default: null
      }
    },
    
    // Status tracking
    isActive: {
      type: Boolean,
      default: true,
      description: 'Whether this configuration is currently active'
    },
    
    // ===== PIPELINE STEP TOGGLES (10) =====
    ENABLE_PDF_SPLITTING: {
      type: Boolean,
      default: true,
      description: 'Split multi-document PDFs into logical documents'
    },
    ENABLE_OCR_VALIDATION: {
      type: Boolean,
      default: true,
      description: 'Validate OCR text quality with Llama'
    },
    ENABLE_CLASSIFICATION: {
      type: Boolean,
      default: true,
      description: 'Classify document type (31 categories)'
    },
    ENABLE_SIGNATURE_DETECTION: {
      type: Boolean,
      default: true,
      description: 'Detect signature regions with YOLOv8n'
    },
    ENABLE_SIGNATURE_VALIDATION: {
      type: Boolean,
      default: true,
      description: 'Validate and OCR signatures with TrOCR'
    },
    ENABLE_STRUCTURED_EXTRACTION: {
      type: Boolean,
      default: true,
      description: 'Extract invoice/receipt fields'
    },
    ENABLE_ENTITY_EXTRACTION: {
      type: Boolean,
      default: true,
      description: 'Extract companies, people, dates, amounts'
    },
    ENABLE_SUMMARY: {
      type: Boolean,
      default: true,
      description: 'Generate summaries with Llama 3.2 3B'
    },
    ENABLE_EMBEDDING_GENERATION: {
      type: Boolean,
      default: true,
      description: 'Generate embeddings for semantic search'
    },
    ENABLE_MONGODB_STORAGE: {
      type: Boolean,
      default: true,
      description: 'Store processed data in MongoDB'
    },
    
    // ===== BASIC PARAMETERS (3) =====
    SIMILARITY_THRESHOLD: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1,
      description: 'Document splitting similarity threshold'
    },
    OCR_DPI: {
      type: Number,
      default: 300,
      min: 72,
      max: 600,
      description: 'Image resolution for OCR processing'
    },
    YOLO_CONFIDENCE: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1,
      description: 'YOLOv8n signature detection threshold'
    },
    
    // ===== ADVANCED PARAMETERS (8) =====
    LLAMA_TEMPERATURE: {
      type: Number,
      default: 0.3,
      min: 0,
      max: 1,
      description: 'LLaMA creativity (0=focused, 1=creative)'
    },
    LLAMA_MAX_TOKENS: {
      type: Number,
      default: 512,
      min: 128,
      max: 2048,
      description: 'Maximum summary/response length'
    },
    OCR_CONFIDENCE_THRESHOLD: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
      description: 'PaddleOCR quality threshold'
    },
    SIGNATURE_CONFIDENCE_THRESHOLD: {
      type: Number,
      default: 0.6,
      min: 0,
      max: 1,
      description: 'Signature detection sensitivity'
    },
    SEARCH_TOP_K_DEFAULT: {
      type: Number,
      default: 5,
      min: 1,
      max: 50,
      description: 'Number of search results to return'
    },
    MAX_GPU_MEMORY_MB: {
      type: Number,
      default: 4096,
      min: 1024,
      max: 16384,
      description: 'Maximum GPU memory per model (MB)'
    },
    GPU_LAYERS: {
      type: Number,
      default: 29,
      min: 0,
      max: 35,
      description: 'LLaMA layers offloaded to GPU'
    },
    MAX_PDF_SIZE_MB: {
      type: Number,
      default: 200,
      min: 10,
      max: 500,
      description: 'Maximum document size for upload (MB)'
    },
    
    // ===== LLAMA VALIDATION PARAMETERS (6) =====
    OCR_VALIDATION_TIMEOUT: {
      type: Number,
      default: 30,
      min: 10,
      max: 120,
      description: 'OCR validation timeout (seconds)'
    },
    OCR_VALIDATION_TEMPERATURE: {
      type: Number,
      default: 0.05,
      min: 0,
      max: 1,
      description: 'LLaMA temperature for OCR validation (ultra-low for formatting preservation)'
    },
    OCR_VALIDATION_MAX_TOKENS: {
      type: Number,
      default: 2500,
      min: 500,
      max: 4000,
      description: 'Max tokens for OCR validation (full page support)'
    },
    CLASSIFICATION_TIMEOUT: {
      type: Number,
      default: 45,
      min: 10,
      max: 120,
      description: 'Classification timeout (seconds)'
    },
    CLASSIFICATION_REASONING_TEMPERATURE: {
      type: Number,
      default: 0.3,
      min: 0,
      max: 1,
      description: 'LLaMA temperature for classification reasoning'
    },
    CLASSIFICATION_LOW_CONFIDENCE_THRESHOLD: {
      type: Number,
      default: 0.15,
      min: 0,
      max: 1,
      description: 'Low confidence threshold for classification'
    },
    
    // ===== STRUCTURED EXTRACTION PARAMETERS (4) =====
    EXTRACTION_MAX_TOKENS: {
      type: Number,
      default: 500,
      min: 300,
      max: 1000,
      description: 'Max tokens for invoice/receipt field extraction'
    },
    EXTRACTION_TEMPERATURE: {
      type: Number,
      default: 0.1,
      min: 0,
      max: 0.5,
      description: 'LLaMA temperature for structured data extraction'
    },
    ENTITY_EXTRACTION_MAX_TOKENS: {
      type: Number,
      default: 400,
      min: 200,
      max: 800,
      description: 'Max tokens for entity extraction'
    },
    ENTITY_EXTRACTION_TEMPERATURE: {
      type: Number,
      default: 0.1,
      min: 0,
      max: 0.5,
      description: 'LLaMA temperature for entity extraction'
    },
    
    // ===== SIGNATURE VALIDATION PARAMETERS (6) =====
    SIGNATURE_VALIDATION_MAX_TOKENS: {
      type: Number,
      default: 150,
      min: 50,
      max: 500,
      description: 'Max tokens for signature text validation'
    },
    SIGNATURE_VALIDATION_TEMPERATURE: {
      type: Number,
      default: 0.2,
      min: 0,
      max: 1,
      description: 'LLaMA temperature for signature validation'
    },
    NAME_EXTRACTION_MAX_TOKENS: {
      type: Number,
      default: 100,
      min: 50,
      max: 300,
      description: 'Max tokens for name extraction from document'
    },
    NAME_EXTRACTION_TEMPERATURE: {
      type: Number,
      default: 0.1,
      min: 0,
      max: 1,
      description: 'LLaMA temperature for name extraction'
    },
    AUTHENTICITY_MAX_TOKENS: {
      type: Number,
      default: 200,
      min: 100,
      max: 500,
      description: 'Max tokens for signature authenticity check'
    },
    AUTHENTICITY_TEMPERATURE: {
      type: Number,
      default: 0.3,
      min: 0,
      max: 1,
      description: 'LLaMA temperature for authenticity analysis'
    },
    
    // ===== OCR VALIDATION ADVANCED PARAMETERS (3) =====
    OCR_QUALITY_SKIP_THRESHOLD: {
      type: Number,
      default: 0.95,
      min: 0,
      max: 1,
      description: 'Skip validation if OCR quality above this threshold'
    },
    VALIDATION_QUALITY_MAX_TOKENS: {
      type: Number,
      default: 200,
      min: 100,
      max: 500,
      description: 'Max tokens for number/date validation'
    },
    VALIDATION_QUALITY_TEMPERATURE: {
      type: Number,
      default: 0.1,
      min: 0,
      max: 1,
      description: 'LLaMA temperature for validation precision'
    },
    
    // ===== YOLO ADVANCED PARAMETERS (1) =====
    YOLO_IOU_THRESHOLD: {
      type: Number,
      default: 0.45,
      min: 0.1,
      max: 0.9,
      description: 'YOLO IoU threshold for non-maximum suppression'
    },
    
    // ===== CLASSIFICATION ADVANCED PARAMETERS (1) =====
    LLAMA_OVERRIDE_CONFIDENCE: {
      type: Number,
      default: 0.85,
      min: 0.5,
      max: 1,
      description: 'Confidence threshold when LLaMA overrides classification'
    },
    
    // ===== HEALTH/SYSTEM PARAMETERS (1) =====
    LLAMAFILE_HEALTH_TIMEOUT: {
      type: Number,
      default: 2,
      min: 1,
      max: 10,
      description: 'Timeout for Llamafile health check (seconds)'
    },
    
    // ===== AUTO-TUNING (OPTION C) =====
    autoTuning: {
      enabled: {
        type: Boolean,
        default: false,
        description: 'Enable ML-based parameter optimization'
      },
      learningRate: {
        type: Number,
        default: 0.01,
        description: 'Rate of parameter adjustment'
      },
      confidenceAdjustments: {
        type: Map,
        of: {
          successRate: Number,
          adjustedThreshold: Number,
          lastAdjusted: Date
        },
        default: {}
      },
      performanceHistory: [{
        timestamp: { type: Date, default: Date.now },
        avgProcessingTime: Number,
        avgAccuracy: Number,
        documentsProcessed: Number
      }]
    },
    
    // ===== METADATA =====
    description: {
      type: String,
      description: 'Configuration description or notes'
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ===== INDEXES =====
// Unique compound index: one config per (companyId, tier) combination
CompanyTierConfigSchema.index({ companyId: 1, tier: 1 }, { unique: true });

// Index for tier defaults (companyId = null)
CompanyTierConfigSchema.index({ companyId: 1, isActive: 1 });

// ===== STATIC METHODS =====

/**
 * Resolve configuration for a company/tier with proper priority
 * 
 * @param {ObjectId|null} companyId - Company ID or null for tier default
 * @param {String} tier - Tier level (basic/plus/pro)
 * @returns {Object} Resolved configuration object
 */
CompanyTierConfigSchema.statics.resolveConfig = async function(companyId, tier) {
  // Priority 1: Company-specific override
  if (companyId) {
    const companyConfig = await this.findOne({ 
      companyId: companyId, 
      tier: tier,
      isActive: true 
    });
    if (companyConfig) {
      return companyConfig.toObject();
    }
  }
  
  // Priority 2: Tier default
  const tierConfig = await this.findOne({ 
    companyId: null, 
    tier: tier,
    isActive: true 
  });
  if (tierConfig) {
    return tierConfig.toObject();
  }
  
  // Priority 3: Return basic tier defaults (fallback)
  return this.getDefaultConfig();
};

/**
 * Get default configuration (Tier 1 / Basic)
 * 
 * @returns {Object} Default configuration object
 */
CompanyTierConfigSchema.statics.getDefaultConfig = function() {
  return {
    tier: 'basic',
    // Business Features & Limits
    businessFeatures: {
      maxDocuments: -1,
      maxUsers: 200,
      maxDepartments: 50,
      storage_gb: 8000,
      apiAccess: true,
      apiRateLimit: -1,
      customClassifications: true,
      advancedSearch: true,
      multiLanguageOCR: true,
      priorityProcessing: false,
      customPrompts: false
    },
    license: {
      licenseKey: null,
      validFrom: null,
      validUntil: null,
      autoRenew: true,
      pricePerMonth: null
    },
    isActive: true,
    // Pipeline Toggles (10)
    ENABLE_PDF_SPLITTING: true,
    ENABLE_OCR_VALIDATION: true,
    ENABLE_CLASSIFICATION: true,
    ENABLE_SIGNATURE_DETECTION: true,
    ENABLE_SIGNATURE_VALIDATION: true,
    ENABLE_STRUCTURED_EXTRACTION: true,
    ENABLE_ENTITY_EXTRACTION: true,
    ENABLE_SUMMARY: true,
    ENABLE_EMBEDDING_GENERATION: true,
    ENABLE_MONGODB_STORAGE: true,
    // Basic Parameters (4)
    SIMILARITY_THRESHOLD: 0.5,
    OCR_DPI: 300,
    YOLO_CONFIDENCE: 0.5,
    CLASSIFICATION_MIN_CONFIDENCE: 0.08,
    // Advanced Parameters (8)
    LLAMA_TEMPERATURE: 0.3,
    LLAMA_MAX_TOKENS: 512,
    OCR_CONFIDENCE_THRESHOLD: 50,
    SIGNATURE_CONFIDENCE_THRESHOLD: 0.6,
    SEARCH_TOP_K_DEFAULT: 5,
    MAX_GPU_MEMORY_MB: 4096,
    GPU_LAYERS: 29,
    MAX_PDF_SIZE_MB: 200,
    // LLaMA Validation Parameters (6)
    OCR_VALIDATION_TIMEOUT: 30,
    OCR_VALIDATION_TEMPERATURE: 0.05,
    OCR_VALIDATION_MAX_TOKENS: 2500,
    CLASSIFICATION_TIMEOUT: 45,
    CLASSIFICATION_REASONING_TEMPERATURE: 0.3,
    CLASSIFICATION_LOW_CONFIDENCE_THRESHOLD: 0.15,
    // Structured Extraction Parameters (4)
    EXTRACTION_MAX_TOKENS: 500,
    EXTRACTION_TEMPERATURE: 0.1,
    ENTITY_EXTRACTION_MAX_TOKENS: 400,
    ENTITY_EXTRACTION_TEMPERATURE: 0.1,
    // Signature Validation Parameters (6)
    SIGNATURE_VALIDATION_MAX_TOKENS: 150,
    SIGNATURE_VALIDATION_TEMPERATURE: 0.2,
    NAME_EXTRACTION_MAX_TOKENS: 100,
    NAME_EXTRACTION_TEMPERATURE: 0.1,
    AUTHENTICITY_MAX_TOKENS: 200,
    AUTHENTICITY_TEMPERATURE: 0.3,
    // OCR Validation Advanced (3)
    OCR_QUALITY_SKIP_THRESHOLD: 0.95,
    VALIDATION_QUALITY_MAX_TOKENS: 200,
    VALIDATION_QUALITY_TEMPERATURE: 0.1,
    // YOLO Advanced (1)
    YOLO_IOU_THRESHOLD: 0.45,
    // Classification Advanced (1)
    LLAMA_OVERRIDE_CONFIDENCE: 0.85,
    // Health/System (1)
    LLAMAFILE_HEALTH_TIMEOUT: 2
  };
};

/**
 * Create or update configuration
 * 
 * @param {ObjectId|null} companyId - Company ID or null for tier default
 * @param {String} tier - Tier level
 * @param {Object} config - Configuration object
 * @param {ObjectId} userId - User making the change
 * @returns {Object} Created/updated configuration
 */
CompanyTierConfigSchema.statics.upsertConfig = async function(companyId, tier, config, userId) {
  const existingConfig = await this.findOne({ companyId, tier });
  
  if (existingConfig) {
    // ✅ PRESERVE existing businessFeatures and license if not in update
    // Only update fields that are explicitly provided
    const updateFields = { ...config };
    
    // Preserve businessFeatures if not in update
    if (!updateFields.businessFeatures && existingConfig.businessFeatures) {
      updateFields.businessFeatures = existingConfig.businessFeatures;
    } else if (updateFields.businessFeatures && existingConfig.businessFeatures) {
      // Merge businessFeatures (preserve existing sub-fields)
      updateFields.businessFeatures = {
        ...existingConfig.businessFeatures.toObject(),
        ...updateFields.businessFeatures
      };
    }
    
    // Preserve license if not in update
    if (!updateFields.license && existingConfig.license) {
      updateFields.license = existingConfig.license;
    } else if (updateFields.license && existingConfig.license) {
      // Merge license (preserve existing sub-fields)
      updateFields.license = {
        ...existingConfig.license.toObject(),
        ...updateFields.license
      };
    }
    
    // Update existing config with merged fields
    Object.assign(existingConfig, updateFields);
    existingConfig.updatedBy = userId;
    await existingConfig.save();
    return existingConfig;
  } else {
    // Create new with defaults for missing fields
    const defaults = this.getDefaultConfig();
    return this.create({
      companyId,
      tier,
      ...defaults,  // Start with defaults
      ...config,    // Override with provided config
      createdBy: userId,
      updatedBy: userId
    });
  }
};

// ===== VIRTUALS =====

CompanyTierConfigSchema.virtual('isGlobalDefault').get(function() {
  return this.companyId === null;
});

CompanyTierConfigSchema.virtual('isTierDefault').get(function() {
  return this.companyId === null;
});

CompanyTierConfigSchema.virtual('isCompanyOverride').get(function() {
  return this.companyId !== null;
});

const CompanyTierConfig = mongoose.model('CompanyTierConfig', CompanyTierConfigSchema);
export default CompanyTierConfig;
