import mongoose from 'mongoose';

const promptConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  content: {
    type: String,
    required: true
  },
  service: {
    type: String,
    enum: ['aura', 'ai_service', 'both'],
    default: 'ai_service'
  },
  
  // Tier-based routing (Tier 1/2/3 architecture)
  tier: {
    type: String,
    enum: ['tier1', 'tier2', 'tier3', 'all'],
    default: 'tier1',
    required: true
  },
  tierUrl: {
    type: String,
    default: 'http://localhost:9000' // Tier 1 default
  },
  
  // Company-specific prompts (Tier → Company → Prompts)
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null // null = global prompt for all companies in this tier
  },
  
  // AI Capability Type - which AI feature uses this prompt
  aiCapability: {
    type: String,
    enum: [
      'classification',      // Document type classification
      'ocr_icr',            // OCR/ICR text extraction and validation
      'ner_extraction',     // Named entity recognition and structured data extraction
      'semantic_search',    // Vector similarity search
      'conversational_search', // Conversational search with context
      'qa',                 // Question answering
      'summarization',      // Document summarization
      'validation',         // Data validation and correction
      'multi_modal'         // Multi-modal processing (future)
    ],
    required: true
  },
  
  // Endpoint mapping - which API route uses this prompt
  endpoint: {
    type: String,
    required: true
  },
  
  // Document type filtering - which document types use this prompt
  documentTypes: [String],
  
  // Trigger conditions - when to use this prompt
  triggerCondition: {
    type: String, // JavaScript expression: "confidence < 0.15" or "doc_type === 'invoice'"
    default: null
  },
  priority: {
    type: Number,
    default: 100 // Higher = used first when multiple prompts match
  },
  
  version: {
    type: String,
    default: '1.0'
  },
  
  // Variables/Placeholders for dynamic content
  variables: [{
    name: { type: String, required: true },
    description: String,
    default: String,
    required: { type: Boolean, default: false },
    type: {
      type: String,
      enum: ['string', 'number', 'boolean', 'object', 'array'],
      default: 'string'
    },
    validation: String // Regex or JS expression for validation
  }],
  
  // Token & LLM Controls
  llmConfig: {
    maxTokens: { type: Number, default: 200 },
    temperature: { type: Number, default: 0.7, min: 0, max: 2 },
    topP: { type: Number, default: 0.9, min: 0, max: 1 },
    topK: { type: Number, default: 40 },
    stopSequences: [String],
    presencePenalty: { type: Number, default: 0, min: -2, max: 2 },
    frequencyPenalty: { type: Number, default: 0, min: -2, max: 2 }
  },
  
  // Output Schema - JSON validation for structured outputs
  outputSchema: {
    type: mongoose.Schema.Types.Mixed,
    default: null // JSON Schema format for validation
  },
  requiredOutputFields: [String],
  
  // Cost Controls
  costConfig: {
    estimatedTokensPerRun: { type: Number, default: 0 },
    estimatedCostPerRun: { type: Number, default: 0 }, // in USD
    monthlyBudgetLimit: { type: Number, default: 100 },
    currentMonthSpend: { type: Number, default: 0 },
    alertThreshold: { type: Number, default: 80 } // Alert at 80% of budget
  },
  
  // Performance Metrics
  metrics: {
    usageCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    totalLatencyMs: { type: Number, default: 0 },
    totalTokensUsed: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    lastUsed: Date,
    avgLatencyMs: { type: Number, default: 0 },
    avgTokens: { type: Number, default: 0 },
    avgCost: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    userFeedback: [{
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      timestamp: Date
    }]
  },
  
  // A/B Testing
  abTest: {
    enabled: { type: Boolean, default: false },
    variantName: String,
    trafficPercent: { type: Number, min: 0, max: 100, default: 50 },
    controlPromptId: mongoose.Schema.Types.ObjectId,
    testStartDate: Date,
    testEndDate: Date,
    results: {
      variantSuccessRate: Number,
      controlSuccessRate: Number,
      variantAvgLatency: Number,
      controlAvgLatency: Number
    }
  },
  
  active: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  tags: [String],
  notes: String,
  createdBy: String,
  lastModifiedBy: String
  
}, {
  timestamps: true
});

// Indexes for efficient queries
promptConfigSchema.index({ tier: 1, companyId: 1, aiCapability: 1 });
promptConfigSchema.index({ endpoint: 1, active: 1 });
promptConfigSchema.index({ 'metrics.usageCount': -1 });
promptConfigSchema.index({ documentTypes: 1 });

// Virtual for computed success rate
promptConfigSchema.virtual('computedSuccessRate').get(function() {
  if (this.metrics.usageCount === 0) return 0;
  return (this.metrics.successCount / this.metrics.usageCount) * 100;
});

export default mongoose.model('PromptConfig', promptConfigSchema);
