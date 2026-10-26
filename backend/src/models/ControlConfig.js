import mongoose from 'mongoose';

const controlConfigSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['api', 'ai', 'tier', 'printer', 'pipeline', 'validation', 'search', 'toggles']
  },
  key: {
    type: String,
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: String,
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedAt: {
    type: Date,
    default: Date.now
  },
  environment: {
    type: String,
    enum: ['production', 'development', 'staging'],
    default: 'production'
  },
  requiresRestart: {
    type: Boolean,
    default: false
  },
  validationSchema: mongoose.Schema.Types.Mixed
}, { timestamps: true });

controlConfigSchema.index({ category: 1, key: 1, environment: 1 }, { unique: true });

export default mongoose.model('ControlConfig', controlConfigSchema);
