import express from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import PromptConfig from '../../models/PromptConfig.js';

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

// ============ PROMPTS MANAGEMENT ============
router.get('/', async (req, res) => {
  try {
    const { tier, companyId, aiCapability, endpoint, active, search } = req.query;
    const filter = {};
    
    if (tier && tier !== 'all') filter.tier = tier;
    if (companyId && companyId !== 'all') {
      filter.companyId = companyId === 'global' ? null : companyId;
    }
    if (aiCapability && aiCapability !== 'all') filter.aiCapability = aiCapability;
    if (endpoint) filter.endpoint = endpoint;
    if (active !== undefined) filter.active = active === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const prompts = await PromptConfig.find(filter)
      .populate('companyId', 'name')
      .sort({ 'metrics.usageCount': -1, priority: -1 });
    
    return res.json({ prompts });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const prompt = await PromptConfig.findById(req.params.id).populate('companyId', 'name');
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    return res.json({ prompt });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const promptData = {
      ...req.body,
      createdBy: req.admin.userId || req.admin._id,
      lastModifiedBy: req.admin.userId || req.admin._id
    };
    
    // Validate required fields
    if (!promptData.name) return res.status(400).json({ error: 'Name is required' });
    if (!promptData.content) return res.status(400).json({ error: 'Content is required' });
    if (!promptData.aiCapability) return res.status(400).json({ error: 'AI capability is required' });
    if (!promptData.endpoint) return res.status(400).json({ error: 'Endpoint is required' });
    
    const prompt = await PromptConfig.create(promptData);
    await logAction(req, 'create', 'prompt', prompt._id, 'PromptConfig', { name: prompt.name }, null, prompt.toObject());
    
    return res.status(201).json({ prompt });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const old = await PromptConfig.findById(req.params.id);
    if (!old) return res.status(404).json({ error: 'Prompt not found' });
    
    const updates = {
      ...req.body,
      lastModifiedBy: req.admin.userId || req.admin._id
    };
    
    const prompt = await PromptConfig.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    await logAction(req, 'update', 'prompt', prompt._id, 'PromptConfig', updates, old.toObject(), prompt.toObject());
    
    return res.json({ prompt });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const prompt = await PromptConfig.findByIdAndDelete(req.params.id);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    
    await logAction(req, 'delete', 'prompt', req.params.id, 'PromptConfig', { name: prompt.name }, prompt.toObject(), null);
    return res.json({ message: 'Prompt deleted' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Test a prompt with sample data
router.post('/:id/test', async (req, res) => {
  try {
    const prompt = await PromptConfig.findById(req.params.id);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    
    const { variables, documentText, documentType } = req.body;
    
    // Replace variables in prompt content
    let processedContent = prompt.content;
    if (variables && prompt.variables) {
      prompt.variables.forEach(varDef => {
        const value = variables[varDef.name] || varDef.default || '';
        processedContent = processedContent.replace(new RegExp(`{{${varDef.name}}}`, 'g'), value);
      });
    }
    
    // Build request to AI service
    const startTime = Date.now();
    const tierUrl = prompt.tierUrl || 'http://localhost:9000';
    const endpoint = prompt.endpoint;
    
    try {
      const response = await axios.post(`${tierUrl}${endpoint}`, {
        text: documentText || 'Sample document text',
        document_type: documentType || 'general',
        query: processedContent,
        max_tokens: prompt.llmConfig?.maxTokens || 200,
        temperature: prompt.llmConfig?.temperature || 0.7,
        top_p: prompt.llmConfig?.topP || 0.9,
        stop: prompt.llmConfig?.stopSequences || []
      }, {
        timeout: 30000,
        headers: aiKeyHeaders()
      });
      
      const latency = Date.now() - startTime;
      const result = response.data;
      
      // Estimate tokens and cost (rough estimate: 1 token ≈ 4 chars)
      const estimatedTokens = Math.ceil((processedContent.length + (documentText?.length || 0)) / 4);
      const estimatedCost = estimatedTokens * 0.00002; // ~$0.02 per 1000 tokens
      
      return res.json({
        success: true,
        result,
        metrics: {
          latency: `${latency}ms`,
          estimatedTokens,
          estimatedCost: `$${estimatedCost.toFixed(4)}`,
          processedContent
        }
      });
    } catch (aiError) {
      return res.status(500).json({
        success: false,
        error: aiError.message,
        metrics: {
          latency: `${Date.now() - startTime}ms`,
          processedContent
        }
      });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get detailed metrics for a prompt
router.get('/:id/metrics', async (req, res) => {
  try {
    const prompt = await PromptConfig.findById(req.params.id);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    
    const metrics = {
      ...prompt.metrics,
      computedSuccessRate: prompt.computedSuccessRate,
      costStatus: {
        spent: prompt.costConfig?.currentMonthSpend || 0,
        limit: prompt.costConfig?.monthlyBudgetLimit || 100,
        percentUsed: ((prompt.costConfig?.currentMonthSpend || 0) / (prompt.costConfig?.monthlyBudgetLimit || 100)) * 100,
        alertThreshold: prompt.costConfig?.alertThreshold || 80
      }
    };
    
    return res.json({ metrics });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Submit user feedback for a prompt
router.post('/:id/feedback', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    const prompt = await PromptConfig.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          'metrics.userFeedback': {
            rating,
            comment: comment || '',
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );
    
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    
    return res.json({ message: 'Feedback submitted', prompt });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ============ REAL-TIME SYNC TO AI SERVICE ============
router.post('/sync-to-ai-service', async (req, res) => {
  try {
    const { tier, companyId } = req.body;
    
    console.log(`🔄 Syncing prompts to AI Service (tier: ${tier || 'all'}, company: ${companyId || 'all'})`);
    
    // Build filter
    const filter = {};
    if (tier) filter.tier = tier;
    if (companyId) filter.companyId = companyId;
    filter.active = true; // Only sync active prompts
    
    // Get prompts from MongoDB (Control Panel = source of truth)
    const prompts = await PromptConfig.find(filter)
      .populate('companyId', 'name')
      .sort({ priority: -1 });
    
    console.log(`   📋 Found ${prompts.length} prompts to sync`);
    
    // Determine AI Service URL based on tier
    const aiServiceUrls = {
      tier1: process.env.AI_SERVICE_TIER1_URL || 'http://localhost:9000',
      tier2: process.env.AI_SERVICE_TIER2_URL || 'http://localhost:9001',
      tier3: process.env.AI_SERVICE_TIER3_URL || 'http://localhost:9002'
    };
    
    const syncResults = [];
    
    // Sync to each relevant tier service
    const tiersToSync = tier ? [tier] : ['tier1', 'tier2', 'tier3'];
    
    for (const targetTier of tiersToSync) {
      const tierPrompts = prompts.filter(p => p.tier === targetTier);
      if (tierPrompts.length === 0) continue;
      
      const aiServiceUrl = aiServiceUrls[targetTier];
      
      try {
        // Get current prompts from AI Service (for conflict resolution)
        let aiServicePrompts = [];
        try {
          const response = await axios.get(`${aiServiceUrl}/api/v1/prompts`, { timeout: 5000, headers: aiKeyHeaders() });
          aiServicePrompts = response.data.prompts || [];
        } catch (fetchErr) {
          console.warn(`   ⚠️ Could not fetch prompts from AI Service (${targetTier}): ${fetchErr.message}`);
        }
        
        // Conflict resolution: Compare timestamps, keep most recent
        const promptsToSync = tierPrompts.map(cpPrompt => {
          const aiPrompt = aiServicePrompts.find(ap => ap.id === cpPrompt._id.toString() || ap.name === cpPrompt.name);
          
          if (aiPrompt) {
            // Compare timestamps (Control Panel updatedAt vs AI Service lastModified)
            const cpTimestamp = new Date(cpPrompt.updatedAt || cpPrompt.createdAt);
            const aiTimestamp = new Date(aiPrompt.lastModified || aiPrompt.createdAt || 0);
            
            if (aiTimestamp > cpTimestamp) {
              console.log(`   🔄 AI Service has newer version of "${cpPrompt.name}" (AI: ${aiTimestamp.toISOString()}, CP: ${cpTimestamp.toISOString()})`);
              // AI Service version is newer - skip syncing this one
              return null;
            }
          }
          
          // Control Panel version is newer or doesn't exist in AI Service - sync it
          return {
            id: cpPrompt._id.toString(),
            name: cpPrompt.name,
            content: cpPrompt.content,
            description: cpPrompt.description,
            aiCapability: cpPrompt.aiCapability,
            endpoint: cpPrompt.endpoint,
            documentTypes: cpPrompt.documentTypes,
            variables: cpPrompt.variables,
            llmConfig: cpPrompt.llmConfig,
            priority: cpPrompt.priority,
            active: cpPrompt.active,
            lastModified: cpPrompt.updatedAt || cpPrompt.createdAt
          };
        }).filter(p => p !== null);
        
        if (promptsToSync.length === 0) {
          console.log(`   ⏭️ No prompts to sync to ${targetTier} (all up-to-date)`);
          syncResults.push({ tier: targetTier, success: true, synced: 0, message: 'All prompts up-to-date' });
          continue;
        }
        
        // Sync to AI Service
        const syncResponse = await axios.post(
          `${aiServiceUrl}/api/v1/prompts/bulk-update`,
          { prompts: promptsToSync },
          { timeout: 10000, headers: aiKeyHeaders() }
        );
        
        console.log(`   ✅ Synced ${promptsToSync.length} prompts to ${targetTier}`);
        syncResults.push({
          tier: targetTier,
          success: true,
          synced: promptsToSync.length,
          message: `Synced ${promptsToSync.length} prompts`
        });
        
      } catch (err) {
        console.error(`   ❌ Failed to sync prompts to ${targetTier}:`, err.message);
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
      'sync_prompts',
      'prompt',
      null,
      'PromptConfig',
      { tier, companyId, results: syncResults },
      null,
      { syncedCount: syncResults.filter(r => r.success).reduce((sum, r) => sum + (r.synced || 0), 0) }
    );
    
    const allSuccess = syncResults.every(r => r.success);
    const totalSynced = syncResults.reduce((sum, r) => sum + (r.synced || 0), 0);
    
    return res.json({
      success: allSuccess,
      message: allSuccess 
        ? `✅ Synced ${totalSynced} prompts to AI Service(s)`
        : `⚠️ Partial sync: some tiers failed`,
      results: syncResults,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ Prompt sync failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
      message: '❌ Failed to sync prompts to AI Service'
    });
  }
});

// ============ PUBLIC API FOR AI SERVICE ============
// Public endpoint for AI Service to fetch prompts (no auth required)
router.get('/public/fetch', async (req, res) => {
  try {
    const { aiCapability, active } = req.query;
    
    const filter = {};
    if (aiCapability) filter.aiCapability = aiCapability;
    if (active !== undefined) filter.active = active === 'true';
    
    const prompts = await PromptConfig.find(filter)
      .select('-__v')
      .sort({ priority: -1, updatedAt: -1 })
      .lean();
    
    return res.json({
      success: true,
      prompts,
      count: prompts.length
    });
  } catch (err) {
    console.error('Error fetching prompts for AI Service:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
