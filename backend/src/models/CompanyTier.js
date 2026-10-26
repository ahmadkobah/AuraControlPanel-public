import mongoose from 'mongoose';

const companyTierSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true
  },
  tier: {
    type: String,
    enum: ['basic', 'plus', 'pro'],
    default: 'basic'
  },
  features: {
    maxDocuments: { type: Number, default: 100 },
    maxUsers: { type: Number, default: 5 },
    maxDepartments: { type: Number, default: 2 },
    storage_gb: { type: Number, default: 5 },
    aiFeatures: {
      ocr: { type: Boolean, default: true },
      classification: { type: Boolean, default: true },
      search: { type: Boolean, default: true },
      qa: { type: Boolean, default: true },
      summarization: { type: Boolean, default: false },
      customModels: { type: Boolean, default: true }
    },
    apiAccess: { type: Boolean, default: true },
    apiRateLimit: { type: Number, default: 100 },
    customClassifications: { type: Boolean, default: true },
    advancedSearch: { type: Boolean, default: true },
    multiLanguageOCR: { type: Boolean, default: false },
    priorityProcessing: { type: Boolean, default: true },
    customPrompts: { type: Boolean, default: true }
  },
  licenseKey: String,
  validFrom: Date,
  validUntil: Date,
  autoRenew: { type: Boolean, default: true },
  pricePerMonth: Number,
  customClassifications: [String],
  assignedAPIs: {
    ai_service: String,
    ocr_service: String,
    llm_service: String
  }
}, { timestamps: true });

export default mongoose.model('CompanyTier', companyTierSchema);
