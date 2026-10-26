import mongoose from 'mongoose';

const tierHistorySchema = new mongoose.Schema({
  // Company this change applies to
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  
  // Tier transition
  oldTier: {
    type: String,
    enum: ['basic', 'plus', 'pro'],
    required: true
  },
  
  newTier: {
    type: String,
    enum: ['basic', 'plus', 'pro'],
    required: true
  },
  
  // Configuration snapshots for rollback
  oldConfig: {
    features: mongoose.Schema.Types.Mixed,
    assignedAPIs: mongoose.Schema.Types.Mixed,
    performanceFlags: mongoose.Schema.Types.Mixed,
    models: mongoose.Schema.Types.Mixed,
    rateLimits: mongoose.Schema.Types.Mixed
  },
  
  newConfig: {
    features: mongoose.Schema.Types.Mixed,
    assignedAPIs: mongoose.Schema.Types.Mixed,
    performanceFlags: mongoose.Schema.Types.Mixed,
    models: mongoose.Schema.Types.Mixed,
    rateLimits: mongoose.Schema.Types.Mixed
  },
  
  // Change metadata
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  changeReason: {
    type: String,
    enum: [
      'upgrade',
      'downgrade',
      'initial_setup',
      'manual_adjustment',
      'migration',
      'testing',
      'rollback',
      'other'
    ],
    default: 'manual_adjustment'
  },
  
  notes: {
    type: String,
    maxlength: 1000
  },
  
  // Tracking information
  ipAddress: String,
  userAgent: String,
  
  // Rollback capability
  rolledBack: {
    type: Boolean,
    default: false
  },
  
  rolledBackAt: Date,
  
  rolledBackBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Impact tracking
  affectedDocuments: {
    type: Number,
    default: 0
  },
  
  affectedUsers: {
    type: Number,
    default: 0
  },
  
  // Migration status (for future use)
  migrationRequired: {
    type: Boolean,
    default: false
  },
  
  migrationCompleted: {
    type: Boolean,
    default: false
  },
  
  migrationCompletedAt: Date,
  
  migrationErrors: [{
    errorType: String,
    message: String,
    timestamp: Date
  }]
  
}, { 
  timestamps: true,
  collection: 'tierhistories'
});

// Indexes for efficient queries
tierHistorySchema.index({ companyId: 1, createdAt: -1 });
tierHistorySchema.index({ changedBy: 1, createdAt: -1 });
tierHistorySchema.index({ newTier: 1 });
tierHistorySchema.index({ rolledBack: 1 });

// Virtual for checking if this is an upgrade
tierHistorySchema.virtual('isUpgrade').get(function() {
  const tierOrder = { basic: 1, plus: 2, pro: 3 };
  return tierOrder[this.newTier] > tierOrder[this.oldTier];
});

// Virtual for checking if this is a downgrade
tierHistorySchema.virtual('isDowngrade').get(function() {
  const tierOrder = { basic: 1, plus: 2, pro: 3 };
  return tierOrder[this.newTier] < tierOrder[this.oldTier];
});

// Method to rollback this tier change
tierHistorySchema.methods.rollback = async function(userId) {
  if (this.rolledBack) {
    throw new Error('This tier change has already been rolled back');
  }
  
  // Find the CompanyTier and restore old configuration
  const CompanyTier = mongoose.model('CompanyTier');
  const companyTier = await CompanyTier.findOne({ companyId: this.companyId });
  
  if (!companyTier) {
    throw new Error('Company tier not found');
  }
  
  // Restore old configuration
  companyTier.tier = this.oldTier;
  companyTier.features = this.oldConfig.features;
  companyTier.assignedAPIs = this.oldConfig.assignedAPIs;
  companyTier.performanceFlags = this.oldConfig.performanceFlags;
  companyTier.models = this.oldConfig.models;
  companyTier.rateLimits = this.oldConfig.rateLimits;
  companyTier.lastModifiedAt = new Date();
  await companyTier.save();
  
  // Mark this history entry as rolled back
  this.rolledBack = true;
  this.rolledBackAt = new Date();
  this.rolledBackBy = userId;
  await this.save();
  
  // Create a new history entry for the rollback
  const TierHistory = mongoose.model('TierHistory');
  await TierHistory.create({
    companyId: this.companyId,
    oldTier: this.newTier,
    newTier: this.oldTier,
    oldConfig: this.newConfig,
    newConfig: this.oldConfig,
    changedBy: userId,
    changeReason: 'rollback',
    notes: `Rolled back tier change from ${new Date(this.createdAt).toISOString()}`
  });
  
  return companyTier;
};

// Static method to get tier history for a company
tierHistorySchema.statics.getCompanyHistory = async function(companyId, options = {}) {
  const { limit = 10, includeRolledBack = false } = options;
  
  const filter = { companyId };
  if (!includeRolledBack) {
    filter.rolledBack = false;
  }
  
  return this.find(filter)
    .populate('changedBy', 'firstName lastName email')
    .populate('rolledBackBy', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get recent tier changes across all companies
tierHistorySchema.statics.getRecentChanges = async function(options = {}) {
  const { limit = 20, tier = null } = options;
  
  const filter = {};
  if (tier) {
    filter.newTier = tier;
  }
  
  return this.find(filter)
    .populate('companyId', 'name')
    .populate('changedBy', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

export default mongoose.model('TierHistory', tierHistorySchema);
