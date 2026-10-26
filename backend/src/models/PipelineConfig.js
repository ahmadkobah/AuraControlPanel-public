import mongoose from 'mongoose';

const validationRuleSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['confidence_threshold', 'required_fields', 'format_check', 'business_rule', 'signature_detection', 'duplicate_check'],
    required: true
  },
  field: String, // Field to validate (e.g., 'total_amount', 'signature')
  operator: String, // >, <, ==, !=, contains, matches
  value: mongoose.Schema.Types.Mixed, // Threshold value or pattern
  errorMessage: String,
  severity: { type: String, enum: ['warning', 'error', 'critical'], default: 'error' }
}, { _id: false });

const pipelineStepSchema = new mongoose.Schema({
  order: { type: Number, required: true },
  name: { type: String, required: true },
  description: String,
  enabled: { type: Boolean, default: true },
  service: {
    type: String,
    enum: ['ocr', 'classification', 'extraction', 'qa', 'summarization', 'validation', 'search', 'signature', 'storage', 'notification'],
    required: true
  },
  promptTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromptConfig',
    default: null
  },
  model: String,
  config: mongoose.Schema.Types.Mixed,
  validation: {
    enabled: { type: Boolean, default: false },
    rules: [validationRuleSchema],
    onFailure: { type: String, enum: ['stop', 'continue', 'retry', 'manual_review'], default: 'stop' },
    maxRetries: { type: Number, default: 2 }
  },
  fallback: String,
  timeout: { type: Number, default: 30000 },
  costLimit: Number // Max cost allowed for this step
}, { _id: false });

const pipelineConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  },
  tier: String,
  documentTypes: [String], // Which document types this pipeline handles
  steps: [pipelineStepSchema],
  parallelization: {
    type: Boolean,
    default: false
  },
  maxRetries: {
    type: Number,
    default: 2
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metrics: {
    totalExecutions: { type: Number, default: 0 },
    successfulExecutions: { type: Number, default: 0 },
    failedExecutions: { type: Number, default: 0 },
    avgProcessingTimeMs: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 }
  },
  notifications: {
    onSuccess: [String], // Email addresses
    onFailure: [String],
    onManualReview: [String]
  }
}, { timestamps: true });

pipelineConfigSchema.index({ companyId: 1, tier: 1 });

export default mongoose.model('PipelineConfig', pipelineConfigSchema);
