import express from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import CompanyTier from '../../models/CompanyTier.js';
import { tierDefaults, getTierDefaults } from '../../config/tierDefaults.js';

const router = express.Router();

const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || '';
function aiKeyHeaders() {
  return AI_SERVICE_API_KEY ? { 'X-API-Key': AI_SERVICE_API_KEY } : {};
}

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

// ============ TIER STATUS ============
router.get('/tier-status', async (req, res) => {
  try {
    // Get companies using each tier
    let Company;
    try {
      Company = mongoose.model('Company');
    } catch {
      const companySchema = new mongoose.Schema({}, { strict: false, collection: 'companies' });
      Company = mongoose.model('Company', companySchema);
    }

    const companies = await Company.find({ isDeleted: { $ne: true } }).select('tier');
    const tierCounts = {
      basic: companies.filter(c => c.tier === 'basic').length,
      plus: companies.filter(c => c.tier === 'plus').length,
      pro: companies.filter(c => c.tier === 'pro').length
    };

    // Check AI Service status
    let aiServiceRunning = false;
    try {
      const response = await axios.get('http://localhost:9000/health', { timeout: 3000, headers: aiKeyHeaders() });
      aiServiceRunning = response.status === 200;
    } catch (err) {
      aiServiceRunning = false;
    }

    const tierStatus = {
      basic: {
        status: aiServiceRunning ? 'running' : 'not_running',
        serviceUrl: 'http://localhost:9000',
        companiesUsing: tierCounts.basic,
        features: [
          'Document OCR',
          'Basic Classification',
          'Text Extraction',
          'Standard Processing'
        ],
        models: [
          { name: 'PaddleOCR', loaded: aiServiceRunning },
          { name: 'YOLOv8 (Detection)', loaded: aiServiceRunning },
          { name: 'Sentence Transformer', loaded: aiServiceRunning },
          { name: 'Llama 3.2 3B', loaded: aiServiceRunning }
        ]
      },
      plus: {
        status: 'under_development',
        serviceUrl: 'http://localhost:9001',
        companiesUsing: tierCounts.plus,
        features: [
          'Advanced OCR',
          'AI Classification',
          'Smart Extraction',
          'Priority Processing',
          'Custom Workflows'
        ],
        models: [
          { name: 'TrOCR (Advanced)', loaded: false },
          { name: 'GPT-4 Vision', loaded: false },
          { name: 'Custom Fine-tuned Models', loaded: false },
          { name: 'Llama 3.1 8B', loaded: false }
        ]
      },
      pro: await (async () => {
        let proRunning = false;
        let proModels = [
          { name: 'Gemini 2.5 Pro', loaded: false },
          { name: 'SentenceTransformer (Multilingual)', loaded: false }
        ];
        try {
          const proResp = await axios.get('http://localhost:9002/api/v1/status', { timeout: 3000, headers: aiKeyHeaders() });
          proRunning = proResp.status === 200;
          if (proResp.data.models_loaded) {
            proModels = proResp.data.models_loaded.map(name => ({ name, loaded: true }));
          }
        } catch {}
        return {
          status: proRunning ? 'running' : 'not_running',
          serviceUrl: 'http://localhost:9002',
          companiesUsing: tierCounts.pro,
          features: [
            'Gemini 2.5 Pro Vision',
            'Multi-language OCR',
            'AI Document Classification',
            'Structured Field Extraction',
            'Table & Entity Detection',
            'Signature & Stamp Detection',
            'Semantic Search & Q&A'
          ],
          models: proModels
        };
      })()
    };

    return res.json(tierStatus);
  } catch (err) {
    console.error('Tier status error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ============ TIER MANAGEMENT ============
router.get('/', async (req, res) => {
  try {
    const tiers = await CompanyTier.find().populate('companyId', 'name');
    return res.json({ tiers });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get tier AI service mapping
router.get('/ai-services', async (req, res) => {
  try {
    const mapping = {
      basic: { tier: 'Basic (Tier 1)', url: 'http://localhost:9000', status: 'active' },
      plus: { tier: 'Plus (Tier 2)', url: 'http://localhost:9000', status: 'coming_soon' },
      pro: { tier: 'Pro (Tier 3)', url: 'http://localhost:9000', status: 'coming_soon' }
    };
    return res.json({ mapping, default: 'http://localhost:9000' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const tier = await CompanyTier.create(req.body);
    await logAction(req, 'create', 'tier', tier._id, 'CompanyTier', req.body, null, tier.tier);
    // Also update the company's stored tier field for consistency
    try {
      let Company;
      try {
        Company = mongoose.model('Company');
      } catch {
        const companySchema = new mongoose.Schema({
          name: String,
          email: String,
          phone: String,
          address: String,
          tier: { type: String },
          isDeleted: { type: Boolean, default: false }
        }, { collection: 'companies' });
        Company = mongoose.model('Company', companySchema);
      }
      await Company.findByIdAndUpdate(tier.companyId, { tier: tier.tier });
    } catch (e) {
      console.warn('Company tier sync (create) failed:', e.message);
    }
    return res.status(201).json({ tier });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const old = await CompanyTier.findById(req.params.id);
    if (!old) return res.status(404).json({ error: 'Tier not found' });
    const tier = await CompanyTier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    await logAction(req, 'update', 'tier', tier._id, 'CompanyTier', req.body, old.tier, tier.tier);
    // Also update the company's stored tier field for consistency
    try {
      let Company;
      try {
        Company = mongoose.model('Company');
      } catch {
        const companySchema = new mongoose.Schema({
          name: String,
          email: String,
          phone: String,
          address: String,
          tier: { type: String },
          isDeleted: { type: Boolean, default: false }
        }, { collection: 'companies' });
        Company = mongoose.model('Company', companySchema);
      }
      await Company.findByIdAndUpdate(tier.companyId, { tier: tier.tier });
    } catch (e) {
      console.warn('Company tier sync (update) failed:', e.message);
    }
    return res.json({ tier });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const tier = await CompanyTier.findByIdAndDelete(req.params.id);
    if (!tier) return res.status(404).json({ error: 'Tier not found' });
    await logAction(req, 'delete', 'tier', tier._id, 'CompanyTier', {}, tier.tier, null);
    return res.json({ message: 'Tier deleted' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Get tier defaults
router.get('/defaults', async (req, res) => {
  try {
    const { tier } = req.query;
    
    if (tier) {
      const defaults = getTierDefaults(tier);
      return res.json({ tier, defaults });
    }
    
    return res.json({ tiers: tierDefaults });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Apply tier defaults to a company
router.post('/apply-defaults', async (req, res) => {
  try {
    const { companyId, tier } = req.body;
    
    if (!companyId || !tier) {
      return res.status(400).json({ error: 'companyId and tier are required' });
    }
    
    const defaults = getTierDefaults(tier);
    if (!defaults) {
      return res.status(404).json({ error: `No defaults found for tier: ${tier}` });
    }
    
    // Check if tier assignment exists
    let companyTier = await CompanyTier.findOne({ companyId });
    
    if (companyTier) {
      // Update existing
      companyTier.tier = tier;
      companyTier.features = defaults.features;
      companyTier.assignedAPIs = defaults.assignedAPIs;
      companyTier.performanceFlags = defaults.performanceFlags;
      companyTier.models = defaults.models;
      companyTier.rateLimits = defaults.rateLimits;
      companyTier.lastModifiedAt = new Date();
      await companyTier.save();
    } else {
      // Create new
      companyTier = await CompanyTier.create({
        companyId,
        tier,
        features: defaults.features,
        assignedAPIs: defaults.assignedAPIs,
        performanceFlags: defaults.performanceFlags,
        models: defaults.models,
        rateLimits: defaults.rateLimits
      });
    }
    
    await logAction(req, 'apply_defaults', 'tier', companyTier._id, 'CompanyTier', 
      { companyId, tier }, null, companyTier.toObject());
    
    return res.json({ 
      message: 'Tier defaults applied successfully',
      companyTier
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
