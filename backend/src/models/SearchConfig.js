import mongoose from 'mongoose';

const searchConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  tier: {
    type: String,
    enum: ['basic', 'plus', 'pro', 'all'],
    default: 'all'
  },
  searchType: {
    type: String,
    enum: ['semantic', 'keyword', 'qa', 'hybrid'],
    required: true
  },
  apiEndpoint: {
    type: String,
    required: true
  },
  service: {
    type: String,
    enum: ['aura', 'ai_service'],
    default: 'ai_service'
  },
  port: {
    type: Number,
    required: true
  },
  priority: {
    type: Number,
    default: 1
  },
  fallbackEndpoint: String,
  config: {
    maxResults: Number,
    minScore: Number,
    embeddingModel: String,
    reranking: Boolean,
    filters: mongoose.Schema.Types.Mixed
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model('SearchConfig', searchConfigSchema);
