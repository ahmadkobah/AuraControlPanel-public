import express from 'express';
import mongoose from 'mongoose';
import PipelineConfig from '../../models/PipelineConfig.js';

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

// ============ PIPELINE MANAGEMENT ============
router.get('/', async (req, res) => {
  try {
    const { companyId, tier } = req.query;
    const filter = {};
    if (companyId) filter.companyId = companyId;
    if (tier) filter.tier = tier;
    const pipelines = await PipelineConfig.find(filter).populate('companyId', 'name');
    return res.json({ pipelines });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const pipeline = await PipelineConfig.create(req.body);
    await logAction(req, 'create', 'pipeline', pipeline._id, 'PipelineConfig', req.body, null, pipeline.name);
    return res.status(201).json({ pipeline });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const old = await PipelineConfig.findById(req.params.id);
    if (!old) return res.status(404).json({ error: 'Pipeline not found' });
    const pipeline = await PipelineConfig.findByIdAndUpdate(req.params.id, req.body, { new: true });
    await logAction(req, 'update', 'pipeline', pipeline._id, 'PipelineConfig', req.body, old.name, pipeline.name);
    return res.json({ pipeline });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const pipeline = await PipelineConfig.findByIdAndDelete(req.params.id);
    if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });
    await logAction(req, 'delete', 'pipeline', pipeline._id, 'PipelineConfig', {}, pipeline.name, null);
    return res.json({ message: 'Pipeline deleted' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
