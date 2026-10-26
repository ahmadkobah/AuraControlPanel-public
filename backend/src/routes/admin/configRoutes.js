import express from 'express';
import ControlConfig from '../../models/ControlConfig.js';
import { logAction } from './utils/auditLogger.js';

const router = express.Router();

// GET /admin/configs - List all control configs
router.get('/', async (req, res) => {
  try {
    const configs = await ControlConfig.find().sort({ createdAt: -1 });
    return res.json(configs);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /admin/configs - Create new control config
router.post('/', async (req, res) => {
  try {
    const config = await ControlConfig.create(req.body);
    await logAction(req, 'create', 'config', config._id, 'ControlConfig', req.body, null, config);
    return res.status(201).json(config);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /admin/configs/:id - Get single config
router.get('/:id', async (req, res) => {
  try {
    const config = await ControlConfig.findById(req.params.id);
    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }
    return res.json(config);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /admin/configs/:id - Update config
router.put('/:id', async (req, res) => {
  try {
    const oldConfig = await ControlConfig.findById(req.params.id);
    if (!oldConfig) {
      return res.status(404).json({ error: 'Config not found' });
    }
    const config = await ControlConfig.findByIdAndUpdate(req.params.id, req.body, { new: true });
    await logAction(req, 'update', 'config', config._id, 'ControlConfig', req.body, oldConfig.toObject(), config.toObject());
    return res.json(config);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/configs/:id - Delete config
router.delete('/:id', async (req, res) => {
  try {
    const config = await ControlConfig.findByIdAndDelete(req.params.id);
    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }
    await logAction(req, 'delete', 'config', config._id, 'ControlConfig', null, config.toObject(), null);
    return res.json({ message: 'Config deleted' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /admin/configs/reload - Reload configs
router.post('/reload', async (req, res) => {
  try {
    await logAction(req, 'reload', 'config', null, 'ControlConfig', null, null, null);
    return res.json({ message: 'Reload signal sent' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
