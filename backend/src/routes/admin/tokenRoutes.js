import express from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import Token from '../../models/Token.js';

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

// ============ TOKEN MANAGEMENT ============
// Get active user sessions (JWT tokens)
router.get('/active', async (req, res) => {
  try {
    let User;
    try {
      User = mongoose.model('User');
    } catch {
      const userSchema = new mongoose.Schema({
        email: String,
        firstName: String,
        lastName: String,
        role: String
      }, { collection: 'users' });
      User = mongoose.model('User', userSchema);
    }

    const tokens = await Token.find({ 
      type: 'jwt',
      active: true,
      expiresAt: { $gt: new Date() }
    })
      .populate('userId', 'email firstName lastName role')
      .sort({ lastActivity: -1 })
      .limit(100);

    const formattedTokens = tokens.map(t => ({
      id: t._id,
      userName: `${t.userId?.firstName || ''} ${t.userId?.lastName || ''}`.trim() || 'Unknown',
      email: t.userId?.email || 'N/A',
      role: t.userId?.role || 'user',
      issuedAt: t.issuedAt,
      expiresAt: t.expiresAt,
      lastActivity: t.lastActivity || t.issuedAt
    }));

    return res.json({ tokens: formattedTokens });
  } catch (err) {
    console.error('Error fetching active tokens:', err);
    return res.json({ tokens: [] });
  }
});

// Get API keys
router.get('/api-keys', async (req, res) => {
  try {
    const keys = await Token.find({ type: 'api_key' })
      .sort({ createdAt: -1 })
      .limit(50);

    const formattedKeys = keys.map(k => ({
      id: k._id,
      name: k.name,
      maskedKey: `sk-****${k.tokenHash.slice(-8)}`,
      service: k.service,
      createdAt: k.createdAt,
      lastUsed: k.lastActivity,
      requestCount: k.requestCount,
      active: k.active
    }));

    return res.json({ keys: formattedKeys });
  } catch (err) {
    console.error('Error fetching API keys:', err);
    return res.json({ keys: [] });
  }
});

// Get token stats
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));

    const [activeSessions, apiKeyCount, revokedToday, allActive] = await Promise.all([
      Token.countDocuments({ type: 'jwt', active: true, expiresAt: { $gt: new Date() } }),
      Token.countDocuments({ type: 'api_key', active: true }),
      Token.countDocuments({ revokedAt: { $gte: today } }),
      Token.find({ active: true, issuedAt: { $exists: true } }).select('issuedAt')
    ]);

    // Calculate average token age in hours
    let avgTokenAge = 0;
    if (allActive.length > 0) {
      const totalAge = allActive.reduce((sum, t) => sum + (Date.now() - new Date(t.issuedAt).getTime()), 0);
      avgTokenAge = Math.round(totalAge / allActive.length / 3600000); // Convert to hours
    }

    return res.json({
      stats: {
        activeSessions,
        apiKeyCount,
        avgTokenAge,
        revokedToday
      }
    });
  } catch (err) {
    console.error('Error fetching token stats:', err);
    return res.json({ stats: { activeSessions: 0, apiKeyCount: 0, avgTokenAge: 0, revokedToday: 0 } });
  }
});

// Revoke a token
router.post('/revoke/:id', async (req, res) => {
  try {
    const token = await Token.findByIdAndUpdate(
      req.params.id,
      { 
        active: false,
        revokedAt: new Date(),
        revokedBy: req.admin.userId || req.admin._id
      },
      { new: true }
    );

    if (!token) return res.status(404).json({ error: 'Token not found' });

    await logAction(req, 'revoke', 'token', token._id, 'Token', 
      { reason: 'Manual revocation' }, null, token.toObject());

    return res.json({ message: 'Token revoked', token });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Generate new API key
router.post('/generate-api-key', async (req, res) => {
  try {
    const { name, service } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    // Generate secure random key
    const key = `sk-${crypto.randomBytes(32).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(key).digest('hex');

    const token = await Token.create({
      userId: req.admin.userId || req.admin._id,
      tokenHash: hash,
      type: 'api_key',
      name,
      service: service || 'general',
      active: true
    });

    await logAction(req, 'create', 'api_key', token._id, 'Token',
      { name, service }, null, { name, service });

    // Return the actual key ONCE - it won't be stored
    return res.json({ 
      message: 'API key created',
      key, // Only shown once!
      id: token._id,
      name: token.name
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Revoke API key
router.post('/revoke-api-key/:id', async (req, res) => {
  try {
    const token = await Token.findByIdAndUpdate(
      req.params.id,
      { 
        active: false,
        revokedAt: new Date(),
        revokedBy: req.admin.userId || req.admin._id
      },
      { new: true }
    );

    if (!token) return res.status(404).json({ error: 'API key not found' });

    await logAction(req, 'revoke', 'api_key', token._id, 'Token',
      { name: token.name }, null, token.toObject());

    return res.json({ message: 'API key revoked' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
