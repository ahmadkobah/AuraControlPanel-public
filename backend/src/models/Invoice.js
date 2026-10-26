import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  invoiceNumber: { type: String, required: true, unique: true },
  description: { type: String },
  amount: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  amountDue: { type: Number },
  currency: { type: String, default: 'USD' },
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'paid', 'partial', 'overdue', 'cancelled'],
    default: 'pending'
  },
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  sentDate: { type: Date },
  paidDate: { type: Date },
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    total: Number
  }],
  payments: [{
    amount: Number,
    method: String,
    transactionId: String,
    date: { type: Date, default: Date.now },
    notes: String
  }],
  notes: { type: String },
  billingAddress: { type: String },
  purchaseOrder: { type: String },
  paymentTerms: { 
    type: String, 
    enum: ['due_on_receipt', 'net_15', 'net_30', 'net_45', 'net_60', 'net_90'],
    default: 'net_30'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false }
}, { 
  timestamps: true 
});

// Calculate amount due before saving
invoiceSchema.pre('save', function(next) {
  this.amountDue = this.amount - (this.amountPaid || 0);
  
  // Update status based on payments and dates
  if (this.amountDue <= 0) {
    this.status = 'paid';
    if (!this.paidDate) this.paidDate = new Date();
  } else if (this.amountPaid > 0) {
    this.status = 'partial';
  } else if (this.dueDate < new Date() && this.status !== 'paid') {
    this.status = 'overdue';
  }
  
  next();
});

// Generate invoice number
invoiceSchema.statics.generateInvoiceNumber = async function() {
  const year = new Date().getFullYear();
  const count = await this.countDocuments({ 
    invoiceNumber: new RegExp(`^INV-${year}`) 
  });
  return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
};

export default mongoose.model('Invoice', invoiceSchema);
