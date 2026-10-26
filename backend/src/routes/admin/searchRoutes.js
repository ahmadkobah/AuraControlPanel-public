import express from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import SearchConfig from '../../models/SearchConfig.js';

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

// ============ SEARCH CONFIG MANAGEMENT ============
router.get('/', async (req, res) => {
  try {
    const { tier, searchType, active } = req.query;
    const filter = {};
    if (tier) filter.tier = tier;
    if (searchType) filter.searchType = searchType;
    if (active !== undefined) filter.active = active === 'true';
    const configs = await SearchConfig.find(filter).sort({ tier: 1, priority: 1 });
    return res.json({ configs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, tier, searchType, apiEndpoint, service, port, priority, fallbackEndpoint, config, active } = req.body;
    const searchConfig = await SearchConfig.create({
      name, tier, searchType, apiEndpoint, service, port, priority, fallbackEndpoint, config, active
    });
    await logAction(req, 'create', 'search_config', searchConfig._id, 'SearchConfig', { name, tier, searchType }, null, searchConfig.toObject());
    return res.json({ searchConfig });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, tier, searchType, apiEndpoint, service, port, priority, fallbackEndpoint, config, active } = req.body;
    const old = await SearchConfig.findById(req.params.id);
    if (!old) return res.status(404).json({ error: 'Search config not found' });
    const searchConfig = await SearchConfig.findByIdAndUpdate(req.params.id, {
      name, tier, searchType, apiEndpoint, service, port, priority, fallbackEndpoint, config, active
    }, { new: true });
    await logAction(req, 'update', 'search_config', searchConfig._id, 'SearchConfig', { name, tier, searchType }, old.toObject(), searchConfig.toObject());
    return res.json({ searchConfig });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const searchConfig = await SearchConfig.findByIdAndDelete(req.params.id);
    if (!searchConfig) return res.status(404).json({ error: 'Search config not found' });
    await logAction(req, 'delete', 'search_config', req.params.id, 'SearchConfig', { name: searchConfig.name }, searchConfig.toObject(), null);
    return res.json({ message: 'Search config deleted' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ============ REAL-TIME SYNC TO AI SERVICE ============
router.post('/sync-to-ai-service', async (req, res) => {
  try {
    const { tier } = req.body;
    
    console.log(`🔄 Syncing search configs to AI Service (tier: ${tier || 'all'})`);
    
    // Build filter
    const filter = { active: true }; // Only sync active configs
    if (tier) filter.tier = tier;
    
    // Get search configs from MongoDB (Control Panel = source of truth)
    const searchConfigs = await SearchConfig.find(filter).sort({ priority: 1 });
    
    console.log(`   📋 Found ${searchConfigs.length} search configs to sync`);
    
    // Determine AI Service URLs based on tier
    const aiServiceUrls = {
      basic: process.env.AI_SERVICE_TIER1_URL || 'http://localhost:9000',
      plus: process.env.AI_SERVICE_TIER2_URL || 'http://localhost:9001',
      pro: process.env.AI_SERVICE_TIER3_URL || 'http://localhost:9002',
      all: process.env.AI_SERVICE_TIER1_URL || 'http://localhost:9000' // Default to tier1 for 'all'
    };
    
    const syncResults = [];
    
    // Sync to each relevant tier service
    const tiersToSync = tier && tier !== 'all' ? [tier] : ['basic', 'plus', 'pro'];
    
    for (const targetTier of tiersToSync) {
      const tierConfigs = searchConfigs.filter(c => c.tier === targetTier || c.tier === 'all');
      
      if (tierConfigs.length === 0) continue;
      
      const aiServiceUrl = aiServiceUrls[targetTier];
      
      try {
        // Get current search configs from AI Service (for conflict resolution)
        let aiServiceConfigs = [];
        try {
          const response = await axios.get(`${aiServiceUrl}/api/v1/search/config`, { timeout: 5000, headers: aiKeyHeaders() });
          aiServiceConfigs = response.data.configs || [];
        } catch (fetchErr) {
          console.warn(`   ⚠️ Could not fetch search configs from AI Service (${targetTier}): ${fetchErr.message}`);
        }
        
        // Conflict resolution: Compare timestamps, keep most recent
        const configsToSync = tierConfigs.map(cpConfig => {
          const aiConfig = aiServiceConfigs.find(ac => ac.id === cpConfig._id.toString() || ac.name === cpConfig.name);
          
          if (aiConfig) {
            // Compare timestamps
            const cpTimestamp = new Date(cpConfig.updatedAt || cpConfig.createdAt);
            const aiTimestamp = new Date(aiConfig.lastModified || aiConfig.createdAt || 0);
            
            if (aiTimestamp > cpTimestamp) {
              console.log(`   🔄 AI Service has newer version of "${cpConfig.name}" (AI: ${aiTimestamp.toISOString()}, CP: ${cpTimestamp.toISOString()})`);
              return null; // Skip - AI Service version is newer
            }
          }
          
          // Control Panel version is newer or doesn't exist in AI Service
          return {
            id: cpConfig._id.toString(),
            name: cpConfig.name,
            tier: cpConfig.tier,
            searchType: cpConfig.searchType,
            apiEndpoint: cpConfig.apiEndpoint,
            service: cpConfig.service,
            port: cpConfig.port,
            priority: cpConfig.priority,
            fallbackEndpoint: cpConfig.fallbackEndpoint,
            config: cpConfig.config,
            active: cpConfig.active,
            lastModified: cpConfig.updatedAt || cpConfig.createdAt
          };
        }).filter(c => c !== null);
        
        if (configsToSync.length === 0) {
          console.log(`   ⏭️ No search configs to sync to ${targetTier} (all up-to-date)`);
          syncResults.push({ tier: targetTier, success: true, synced: 0, message: 'All search configs up-to-date' });
          continue;
        }
        
        // Sync to AI Service
        const syncResponse = await axios.post(
          `${aiServiceUrl}/api/v1/search/config/bulk-update`,
          { configs: configsToSync },
          { timeout: 10000, headers: aiKeyHeaders() }
        );
        
        console.log(`   ✅ Synced ${configsToSync.length} search configs to ${targetTier}`);
        syncResults.push({
          tier: targetTier,
          success: true,
          synced: configsToSync.length,
          message: `Synced ${configsToSync.length} search configs`
        });
        
      } catch (err) {
        console.error(`   ❌ Failed to sync search configs to ${targetTier}:`, err.message);
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
      'sync_search_configs',
      'search_config',
      null,
      'SearchConfig',
      { tier, results: syncResults },
      null,
      { syncedCount: syncResults.filter(r => r.success).reduce((sum, r) => sum + (r.synced || 0), 0) }
    );
    
    const allSuccess = syncResults.every(r => r.success);
    const totalSynced = syncResults.reduce((sum, r) => sum + (r.synced || 0), 0);
    
    return res.json({
      success: allSuccess,
      message: allSuccess 
        ? `✅ Synced ${totalSynced} search configs to AI Service(s)`
        : `⚠️ Partial sync: some tiers failed`,
      results: syncResults,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ Search config sync failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
      message: '❌ Failed to sync search configs to AI Service'
    });
  }
});

export default router;
