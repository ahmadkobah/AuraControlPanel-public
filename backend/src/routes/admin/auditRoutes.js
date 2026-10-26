import express from 'express';
import mongoose from 'mongoose';
import AuditLog from '../../models/AuditLog.js';

const router = express.Router();

// ============ AUDIT LOGS ============
router.get('/', async (req, res) => {
  try {
    const { category, userId, limit = 100 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (userId) filter.userId = userId;
    const logs = await AuditLog.find(filter).populate('userId', 'firstName lastName email').sort({ createdAt: -1 }).limit(parseInt(limit));
    return res.json({ logs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
