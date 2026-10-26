import express from 'express';
import mongoose from 'mongoose';
import PrinterConfig from '../../models/PrinterConfig.js';

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

// ============ PRINTER MANAGEMENT ============
router.get('/', async (req, res) => {
  try {
    const { companyId, status } = req.query;
    const filter = {};
    if (companyId) filter.companyId = companyId;
    if (status) filter.status = status;
    const printers = await PrinterConfig.find(filter).populate('companyId departmentId', 'name');
    return res.json({ printers });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const printer = await PrinterConfig.create(req.body);
    await logAction(req, 'create', 'printer', printer._id, 'PrinterConfig', req.body, null, printer.name);
    return res.status(201).json({ printer });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const old = await PrinterConfig.findById(req.params.id);
    if (!old) return res.status(404).json({ error: 'Printer not found' });
    const printer = await PrinterConfig.findByIdAndUpdate(req.params.id, req.body, { new: true });
    await logAction(req, 'update', 'printer', printer._id, 'PrinterConfig', req.body, old.name, printer.name);
    return res.json({ printer });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const printer = await PrinterConfig.findByIdAndDelete(req.params.id);
    if (!printer) return res.status(404).json({ error: 'Printer not found' });
    await logAction(req, 'delete', 'printer', printer._id, 'PrinterConfig', {}, printer.name, null);
    return res.json({ message: 'Printer deleted' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
