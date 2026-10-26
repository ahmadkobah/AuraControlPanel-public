import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['config', 'tier', 'classification', 'printer', 'pipeline', 'api', 'api_catalog', 'auth', 'system'],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetId: mongoose.Schema.Types.ObjectId,
  targetType: String,
  changes: mongoose.Schema.Types.Mixed,
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: String
}, { timestamps: true });

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ targetId: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
