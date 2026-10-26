import express from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import AIClassification from '../../models/AIClassification.js';

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

// ============ CLASSIFICATION MANAGEMENT ============
router.get('/', async (req, res) => {
  try {
    const { companyId, isActive, tier } = req.query;
    const filter = {};
    if (companyId) filter.companyId = companyId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    let classifications = await AIClassification.find(filter).sort({ priority: -1, label: 1 }).populate('companyId', 'name email');
    
    // Filter by tier if specified (only return classifications enabled for that tier)
    if (tier && tier !== 'all') {
      classifications = classifications.filter(c => {
        const tierSettings = c.tierSettings?.[tier];
        return tierSettings?.enabled !== false;
      });
    }
    
    return res.json({ classifications });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const classification = await AIClassification.create(req.body);
    await logAction(req, 'create', 'classification', classification._id, 'AIClassification', req.body, null, classification.label);
    return res.status(201).json({ classification });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const old = await AIClassification.findById(req.params.id);
    if (!old) return res.status(404).json({ error: 'Classification not found' });
    const classification = await AIClassification.findByIdAndUpdate(req.params.id, req.body, { new: true });
    await logAction(req, 'update', 'classification', classification._id, 'AIClassification', req.body, old.label, classification.label);
    return res.json({ classification });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const classification = await AIClassification.findByIdAndDelete(req.params.id);
    if (!classification) return res.status(404).json({ error: 'Classification not found' });
    await logAction(req, 'delete', 'classification', classification._id, 'AIClassification', {}, classification.label, null);
    return res.json({ message: 'Classification deleted' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ============ REAL-TIME SYNC TO AI SERVICE ============
router.post('/sync-to-ai-service', async (req, res) => {
  try {
    const { tier, companyId } = req.body;
    
    console.log(`🔄 Syncing classifications to AI Service (tier: ${tier || 'all'}, company: ${companyId || 'all'})`);
    
    // Build filter
    const filter = { isActive: true }; // Only sync active classifications
    if (companyId) filter.companyId = companyId;
    
    // Get classifications from MongoDB (Control Panel = source of truth)
    const classifications = await AIClassification.find(filter)
      .populate('companyId', 'name')
      .sort({ priority: -1 });
    
    // Filter by tier if specified
    let filteredClassifications = classifications;
    if (tier && tier !== 'all') {
      filteredClassifications = classifications.filter(c => {
        const tierSettings = c.tierSettings?.[tier];
        return tierSettings?.enabled !== false;
      });
    }
    
    console.log(`   📋 Found ${filteredClassifications.length} classifications to sync`);
    
    // Determine AI Service URLs based on tier
    const aiServiceUrls = {
      basic: process.env.AI_SERVICE_TIER1_URL || 'http://localhost:9000',
      plus: process.env.AI_SERVICE_TIER2_URL || 'http://localhost:9001',
      pro: process.env.AI_SERVICE_TIER3_URL || 'http://localhost:9002'
    };
    
    const syncResults = [];
    
    // Sync to each relevant tier service
    const tiersToSync = tier ? [tier] : ['basic', 'plus', 'pro'];
    
    for (const targetTier of tiersToSync) {
      const tierClassifications = filteredClassifications.filter(c => {
        const tierSettings = c.tierSettings?.[targetTier];
        return tierSettings?.enabled !== false;
      });
      
      if (tierClassifications.length === 0) continue;
      
      const aiServiceUrl = aiServiceUrls[targetTier];
      
      try {
        // Get current classifications from AI Service (for conflict resolution)
        let aiServiceClassifications = [];
        try {
          const response = await axios.get(`${aiServiceUrl}/api/v1/classifications`, { timeout: 5000, headers: aiKeyHeaders() });
          aiServiceClassifications = response.data.classifications || [];
        } catch (fetchErr) {
          console.warn(`   ⚠️ Could not fetch classifications from AI Service (${targetTier}): ${fetchErr.message}`);
        }
        
        // Conflict resolution: Compare timestamps, keep most recent
        const classificationsToSync = tierClassifications.map(cpClass => {
          const aiClass = aiServiceClassifications.find(ac => ac.id === cpClass._id.toString() || ac.label === cpClass.label);
          
          if (aiClass) {
            // Compare timestamps
            const cpTimestamp = new Date(cpClass.updatedAt || cpClass.createdAt);
            const aiTimestamp = new Date(aiClass.lastModified || aiClass.createdAt || 0);
            
            if (aiTimestamp > cpTimestamp) {
              console.log(`   🔄 AI Service has newer version of "${cpClass.label}" (AI: ${aiTimestamp.toISOString()}, CP: ${cpTimestamp.toISOString()})`);
              return null; // Skip - AI Service version is newer
            }
          }
          
          // Control Panel version is newer or doesn't exist in AI Service
          const tierSettings = cpClass.tierSettings?.[targetTier] || {};
          return {
            id: cpClass._id.toString(),
            label: cpClass.label,
            category: cpClass.category,
            description: cpClass.description,
            keywords: cpClass.keywords,
            confidence_threshold: tierSettings.confidence_threshold || cpClass.confidence_threshold,
            customPrompt: tierSettings.customPrompt || cpClass.customPrompt,
            autoActions: tierSettings.autoActions || cpClass.autoActions,
            priority: cpClass.priority,
            isActive: cpClass.isActive,
            lastModified: cpClass.updatedAt || cpClass.createdAt
          };
        }).filter(c => c !== null);
        
        if (classificationsToSync.length === 0) {
          console.log(`   ⏭️ No classifications to sync to ${targetTier} (all up-to-date)`);
          syncResults.push({ tier: targetTier, success: true, synced: 0, message: 'All classifications up-to-date' });
          continue;
        }
        
        // Sync to AI Service
        const syncResponse = await axios.post(
          `${aiServiceUrl}/api/v1/classifications/bulk-update`,
          { classifications: classificationsToSync },
          { timeout: 10000, headers: aiKeyHeaders() }
        );
        
        console.log(`   ✅ Synced ${classificationsToSync.length} classifications to ${targetTier}`);
        syncResults.push({
          tier: targetTier,
          success: true,
          synced: classificationsToSync.length,
          message: `Synced ${classificationsToSync.length} classifications`
        });
        
      } catch (err) {
        console.error(`   ❌ Failed to sync classifications to ${targetTier}:`, err.message);
        syncResults.push({
          tier: targetTier,
          success: false,
          error: err.message
        });
      }
    }
    
    // Log sync action
    await logAction(
      req,
      'sync_classifications',
      'classification',
      null,
      'AIClassification',
      { tier, companyId, results: syncResults },
      null,
      { syncedCount: syncResults.filter(r => r.success).reduce((sum, r) => sum + (r.synced || 0), 0) }
    );
    
    const allSuccess = syncResults.every(r => r.success);
    const totalSynced = syncResults.reduce((sum, r) => sum + (r.synced || 0), 0);
    
    return res.json({
      success: allSuccess,
      message: allSuccess 
        ? `✅ Synced ${totalSynced} classifications to AI Service(s)`
        : `⚠️ Partial sync: some tiers failed`,
      results: syncResults,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ Classification sync failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
      message: '❌ Failed to sync classifications to AI Service'
    });
  }
});

export default router;
