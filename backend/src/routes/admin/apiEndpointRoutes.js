import express from 'express';
import mongoose from 'mongoose';
import APIEndpoint from '../../models/APIEndpoint.js';

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

// ============ API ENDPOINT MANAGEMENT ============
router.get('/', async (req, res) => {
  try {
    const endpoints = await APIEndpoint.find().sort({ service: 1, name: 1 });
    return res.json({ endpoints });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const endpoint = await APIEndpoint.create(req.body);
    await logAction(req, 'create', 'api', endpoint._id, 'APIEndpoint', req.body, null, endpoint.name);
    return res.status(201).json({ endpoint });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const old = await APIEndpoint.findById(req.params.id);
    if (!old) return res.status(404).json({ error: 'Endpoint not found' });
    const endpoint = await APIEndpoint.findByIdAndUpdate(req.params.id, req.body, { new: true });
    await logAction(req, 'update', 'api', endpoint._id, 'APIEndpoint', req.body, old.name, endpoint.name);
    return res.json({ endpoint });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const endpoint = await APIEndpoint.findByIdAndDelete(req.params.id);
    if (!endpoint) return res.status(404).json({ error: 'Endpoint not found' });
    await logAction(req, 'delete', 'api', endpoint._id, 'APIEndpoint', {}, endpoint.name, null);
    return res.json({ message: 'Endpoint deleted' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
