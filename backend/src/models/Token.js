import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['jwt', 'api_key'],
    default: 'jwt'
  },
  name: String, // For API keys
  service: String, // Which service this key is for
  issuedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: Date,
  lastActivity: Date,
  requestCount: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  revokedAt: Date,
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

tokenSchema.index({ userId: 1, active: 1 });
tokenSchema.index({ tokenHash: 1 });
tokenSchema.index({ expiresAt: 1 });

export default mongoose.model('Token', tokenSchema);
