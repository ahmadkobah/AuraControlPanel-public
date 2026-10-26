import express from 'express';
import mongoose from 'mongoose';
import Invoice from '../../models/Invoice.js';

const router = express.Router();

// Audit helper
async function logAction(req, action, category, targetId, targetType, changes, oldValue, newValue) {
  try {
    const AuditLog = mongoose.model('AuditLog');
    await AuditLog.create({
      action,
      category,
      userId: req.admin.userId || req.admin._id || req.admin.id,
      targetId,
      targetType,
      changes,
      oldValue,
      newValue,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// ============ BILLING & PAYMENTS ============

// Get companies for billing
router.get('/companies', async (req, res) => {
  try {
    let Company;
    try {
      Company = mongoose.model('Company');
    } catch {
      const companySchema = new mongoose.Schema({}, { strict: false, collection: 'companies' });
      Company = mongoose.model('Company', companySchema);
    }
    
    const companies = await Company.find({ isDeleted: { $ne: true } })
      .select('name email tier')
      .sort({ name: 1 });
    
    return res.json({ companies });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get all invoices
router.get('/invoices', async (req, res) => {
  try {
    const { companyId, status, startDate, endDate } = req.query;
    const filter = { isDeleted: { $ne: true } };
    
    if (companyId) filter.companyId = companyId;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.issueDate = {};
      if (startDate) filter.issueDate.$gte = new Date(startDate);
      if (endDate) filter.issueDate.$lte = new Date(endDate);
    }
    
    const invoices = await Invoice.find(filter)
      .populate('companyId', 'name email tier')
      .sort({ issueDate: -1 });
    
    return res.json({ invoices });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get billing statistics
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const [totalRevenue, totalOutstanding, totalOverdue, thisMonth] = await Promise.all([
      Invoice.aggregate([
        { $match: { status: 'paid', isDeleted: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Invoice.aggregate([
        { $match: { status: { $in: ['sent', 'partial', 'overdue'] }, isDeleted: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$amountDue' } } }
      ]),
      Invoice.aggregate([
        { $match: { status: 'overdue', isDeleted: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$amountDue' } } }
      ]),
      Invoice.aggregate([
        { $match: { issueDate: { $gte: startOfMonth }, isDeleted: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);
    
    const stats = {
      totalRevenue: totalRevenue[0]?.total || 0,
      totalOutstanding: totalOutstanding[0]?.total || 0,
      totalOverdue: totalOverdue[0]?.total || 0,
      thisMonth: thisMonth[0]?.total || 0
    };
    
    return res.json({ stats });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Create invoice
router.post('/invoices', async (req, res) => {
  try {
    const { companyId, description, amount, dueDate, items, currency, notes, billingAddress, purchaseOrder, paymentTerms } = req.body;
    
    if (!companyId || !amount || !dueDate) {
      return res.status(400).json({ error: 'Company, amount, and due date are required' });
    }
    
    const invoiceNumber = await Invoice.generateInvoiceNumber();
    
    const invoice = await Invoice.create({
      companyId,
      invoiceNumber,
      description,
      amount: parseFloat(amount),
      dueDate: new Date(dueDate),
      items: items || [],
      currency: currency || 'USD',
      notes,
      billingAddress,
      purchaseOrder,
      paymentTerms: paymentTerms || 'net_30',
      createdBy: req.admin.userId || req.admin._id
    });
    
    await logAction(req, 'create', 'billing', invoice._id, 'Invoice', 
      { invoiceNumber, companyId, amount }, null, invoice.toObject());
    
    const populated = await Invoice.findById(invoice._id).populate('companyId', 'name email tier');
    return res.status(201).json({ invoice: populated });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Send invoice (mark as sent)
router.post('/invoices/:id/send', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'sent',
        sentDate: new Date()
      },
      { new: true }
    ).populate('companyId', 'name email tier');
    
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    await logAction(req, 'send', 'billing', invoice._id, 'Invoice',
      { invoiceNumber: invoice.invoiceNumber }, null, { status: 'sent' });
    
    // TODO: Send email to company
    
    return res.json({ invoice, message: 'Invoice sent' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Mark invoice as paid
router.post('/invoices/:id/mark-paid', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    invoice.status = 'paid';
    invoice.amountPaid = invoice.amount;
    invoice.amountDue = 0;
    invoice.paidDate = new Date();
    await invoice.save();
    
    await logAction(req, 'mark_paid', 'billing', invoice._id, 'Invoice',
      { invoiceNumber: invoice.invoiceNumber }, null, { status: 'paid' });
    
    const populated = await Invoice.findById(invoice._id).populate('companyId', 'name email tier');
    return res.json({ invoice: populated, message: 'Invoice marked as paid' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Record payment
router.post('/payments', async (req, res) => {
  try {
    const { invoiceId, amount, method, transactionId, notes } = req.body;
    
    if (!invoiceId || !amount || !method) {
      return res.status(400).json({ error: 'Invoice, amount, and method are required' });
    }
    
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    const paymentAmount = parseFloat(amount);
    
    // Add payment to payments array
    invoice.payments.push({
      amount: paymentAmount,
      method,
      transactionId: transactionId || '',
      date: new Date(),
      notes: notes || ''
    });
    
    // Update amount paid
    invoice.amountPaid = (invoice.amountPaid || 0) + paymentAmount;
    await invoice.save();
    
    await logAction(req, 'payment', 'billing', invoice._id, 'Invoice',
      { invoiceNumber: invoice.invoiceNumber, amount: paymentAmount, method }, null, null);
    
    const populated = await Invoice.findById(invoice._id).populate('companyId', 'name email tier');
    return res.json({ invoice: populated, message: 'Payment recorded' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Get invoice by ID
router.get('/invoices/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('companyId', 'name email tier address')
      .populate('createdBy', 'firstName lastName email');
    
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    return res.json({ invoice });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Update invoice
router.put('/invoices/:id', async (req, res) => {
  try {
    const { companyId, description, amount, dueDate, items, currency, notes, billingAddress, purchaseOrder, paymentTerms } = req.body;
    
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot edit paid or cancelled invoices' });
    }
    
    const oldInvoice = invoice.toObject();
    
    // Update fields
    if (companyId) invoice.companyId = companyId;
    if (description !== undefined) invoice.description = description;
    if (amount) invoice.amount = parseFloat(amount);
    if (dueDate) invoice.dueDate = new Date(dueDate);
    if (items !== undefined) invoice.items = items;
    if (currency) invoice.currency = currency;
    if (notes !== undefined) invoice.notes = notes;
    if (billingAddress !== undefined) invoice.billingAddress = billingAddress;
    if (purchaseOrder !== undefined) invoice.purchaseOrder = purchaseOrder;
    if (paymentTerms) invoice.paymentTerms = paymentTerms;
    
    await invoice.save();
    
    await logAction(req, 'update', 'billing', invoice._id, 'Invoice',
      { invoiceNumber: invoice.invoiceNumber }, oldInvoice, invoice.toObject());
    
    const populated = await Invoice.findById(invoice._id).populate('companyId', 'name email tier');
    return res.json({ invoice: populated, message: 'Invoice updated' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Cancel invoice
router.post('/invoices/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Cannot cancel a paid invoice' });
    }
    
    invoice.status = 'cancelled';
    if (!invoice.notes) {
      invoice.notes = `Cancelled: ${reason}`;
    } else {
      invoice.notes += `\n\nCancelled: ${reason}`;
    }
    await invoice.save();
    
    await logAction(req, 'cancel', 'billing', invoice._id, 'Invoice',
      { invoiceNumber: invoice.invoiceNumber, reason }, null, { status: 'cancelled' });
    
    const populated = await Invoice.findById(invoice._id).populate('companyId', 'name email tier');
    return res.json({ invoice: populated, message: 'Invoice cancelled' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Send payment reminder
router.post('/invoices/:id/remind', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('companyId', 'name email');
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot send reminder for paid or cancelled invoices' });
    }
    
    await logAction(req, 'remind', 'billing', invoice._id, 'Invoice',
      { invoiceNumber: invoice.invoiceNumber, company: invoice.companyId?.name }, null, null);
    
    // TODO: Send reminder email to company
    
    return res.json({ message: 'Payment reminder sent', invoice });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete invoice
router.delete('/invoices/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );
    
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    await logAction(req, 'delete', 'billing', invoice._id, 'Invoice',
      { invoiceNumber: invoice.invoiceNumber }, invoice.toObject(), null);
    
    return res.json({ message: 'Invoice deleted' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
