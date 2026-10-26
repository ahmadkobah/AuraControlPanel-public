import mongoose from 'mongoose';

const aiClassificationSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['financial', 'legal', 'business', 'operational', 'hr', 'custom'],
    default: 'custom'
  },
  description: String,
  keywords: [String],
  requiredFields: [String],
  validationRules: mongoose.Schema.Types.Mixed,
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  confidence_threshold: {
    type: Number,
    default: 0.08,
    min: 0,
    max: 1
  },
  priority: {
    type: Number,
    default: 100
  },
  customPrompt: String,
  autoFilingPath: String,
  // Tier-specific settings for basic/plus/pro tiers
  tierSettings: {
    basic: {
      enabled: { type: Boolean, default: true },
      confidence_threshold: { type: Number, default: 0.8, min: 0, max: 1 },
      customPrompt: String,
      autoActions: {
        autoPrint: { type: Boolean, default: false },
        printerId: mongoose.Schema.Types.ObjectId,
        notifyUsers: [mongoose.Schema.Types.ObjectId],
        webhookUrl: String
      }
    },
    plus: {
      enabled: { type: Boolean, default: true },
      confidence_threshold: { type: Number, default: 0.85, min: 0, max: 1 },
      customPrompt: String,
      autoActions: {
        autoPrint: { type: Boolean, default: false },
        printerId: mongoose.Schema.Types.ObjectId,
        notifyUsers: [mongoose.Schema.Types.ObjectId],
        webhookUrl: String
      }
    },
    pro: {
      enabled: { type: Boolean, default: true },
      confidence_threshold: { type: Number, default: 0.9, min: 0, max: 1 },
      customPrompt: String,
      autoActions: {
        autoPrint: { type: Boolean, default: false },
        printerId: mongoose.Schema.Types.ObjectId,
        notifyUsers: [mongoose.Schema.Types.ObjectId],
        webhookUrl: String
      }
    }
  },
  autoActions: {
    autoPrint: { type: Boolean, default: false },
    printerId: mongoose.Schema.Types.ObjectId,
    notifyUsers: [mongoose.Schema.Types.ObjectId],
    webhookUrl: String
  },
  // Prompt Templates - Link to PromptConfig for different AI capabilities
  promptTemplates: {
    classification: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PromptConfig',
      default: null
    },
    extraction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PromptConfig',
      default: null
    },
    qa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PromptConfig',
      default: null
    },
    summarization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PromptConfig',
      default: null
    }
  }
}, { timestamps: true });

aiClassificationSchema.index({ label: 1, companyId: 1 }, { unique: true });
aiClassificationSchema.index({ isActive: 1, priority: -1 });

export default mongoose.model('AIClassification', aiClassificationSchema);
