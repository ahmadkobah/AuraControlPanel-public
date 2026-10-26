import mongoose from 'mongoose';

const apiEndpointSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL']
  },
  service: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  requiredAuth: {
    type: Boolean,
    default: true
  },
  estimatedLatency: {
    type: String
  },
  features: [{
    type: String
  }],
  tierUrls: {
    basic: String,
    plus: String,
    pro: String
  },
  isDeployed: {
    basic: {
      type: Boolean,
      default: false
    },
    plus: {
      type: Boolean,
      default: false
    },
    pro: {
      type: Boolean,
      default: false
    }
  },
  tierDependency: {
    type: String,
    enum: ['tier_agnostic', 'tier_dependent'],
    default: 'tier_agnostic'
  },
  active: {
    type: Boolean,
    default: true
  },
  healthStatus: {
    basic: String,
    plus: String,
    pro: String
  },
  healthLatency: {
    basic: Number,
    plus: Number,
    pro: Number
  },
  lastHealthCheck: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
apiEndpointSchema.index({ service: 1, category: 1 });
apiEndpointSchema.index({ 'isDeployed.basic': 1 });
apiEndpointSchema.index({ 'isDeployed.plus': 1 });
apiEndpointSchema.index({ 'isDeployed.pro': 1 });
apiEndpointSchema.index({ tierDependency: 1 });
apiEndpointSchema.index({ active: 1 });

// Method to get full URL for a specific tier
apiEndpointSchema.methods.getFullUrl = function(tier) {
  if (!tier || !['basic', 'plus', 'pro'].includes(tier)) {
    return null;
  }
  
  // Return the tier-specific URL if it exists
  if (this.tierUrls && this.tierUrls[tier]) {
    return this.tierUrls[tier];
  }
  
  return null;
};

const APIEndpoint = mongoose.model('APIEndpoint', apiEndpointSchema);

export default APIEndpoint;
