import mongoose from 'mongoose';

const printerConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  port: {
    type: Number,
    default: 9100
  },
  protocol: {
    type: String,
    enum: ['ipp', 'lpd', 'raw'],
    default: 'ipp'
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  documentTypes: [String],
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  capabilities: {
    color: { type: Boolean, default: false },
    duplex: { type: Boolean, default: false },
    stapling: { type: Boolean, default: false },
    maxPaperSize: { type: String, default: 'A4' }
  },
  defaultSettings: {
    copies: { type: Number, default: 1 },
    orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
    quality: { type: String, enum: ['draft', 'normal', 'high'], default: 'normal' }
  }
}, { timestamps: true });

printerConfigSchema.index({ companyId: 1, status: 1 });

export default mongoose.model('PrinterConfig', printerConfigSchema);
