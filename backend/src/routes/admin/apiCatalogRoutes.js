import express from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import APIEndpoint from '../../models/APIEndpoint.js';
import apiCatalog from '../../config/apiCatalog.js';

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

// ============ API CATALOG MANAGEMENT ============

// Seed API catalog from configuration
router.post('/seed', async (req, res) => {
  try {
    const results = { created: 0, updated: 0, errors: [] };
    
    // Flatten catalog structure
    const allEndpoints = [];
    for (const service in apiCatalog) {
      for (const category in apiCatalog[service]) {
        allEndpoints.push(...apiCatalog[service][category]);
      }
    }
    
    // Seed each endpoint
    for (const endpoint of allEndpoints) {
      try {
        const existing = await APIEndpoint.findOne({ id: endpoint.id });
        
        // Prepare endpoint data with compatible tiers
        const endpointData = {
          ...endpoint,
          compatibleTiers: ['basic', 'plus', 'pro'], // All endpoints support all tiers
          active: true
        };
        
        if (existing) {
          await APIEndpoint.findByIdAndUpdate(existing._id, endpointData);
          results.updated++;
        } else {
          await APIEndpoint.create(endpointData);
          results.created++;
        }
      } catch (err) {
        results.errors.push({ id: endpoint.id, error: err.message });
      }
    }
    
    await logAction(req, 'seed', 'api_catalog', null, 'APIEndpoint', 
      { total: allEndpoints.length }, null, results);
    
    return res.json({ 
      message: 'API catalog seeded successfully', 
      results,
      totalEndpoints: allEndpoints.length
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Query API catalog with filters
router.get('/', async (req, res) => {
  try {
    const { service, category, feature, tier, isDeployed, active, tierDependency } = req.query;
    const filter = {};
    
    if (service) filter.service = service;
    if (category) filter.category = category;
    if (feature) filter.features = feature;
    if (active !== undefined) filter.active = active === 'true';
    if (tierDependency) filter.tierDependency = tierDependency;
    
    // Filter by tier deployment
    if (tier && isDeployed === 'true') {
      filter[`isDeployed.${tier}`] = true;
    }
    
    const endpoints = await APIEndpoint.find(filter)
      .sort({ service: 1, category: 1, name: 1 });
    
    // Group by service and category for easier navigation
    const grouped = {};
    endpoints.forEach(ep => {
      if (!grouped[ep.service]) grouped[ep.service] = {};
      if (!grouped[ep.service][ep.category]) grouped[ep.service][ep.category] = [];
      grouped[ep.service][ep.category].push(ep);
    });
    
    return res.json({ 
      endpoints,
      grouped,
      count: endpoints.length,
      tierDependentCount: endpoints.filter(e => e.tierDependency === 'tier_dependent').length,
      tierAgnosticCount: endpoints.filter(e => e.tierDependency === 'tier_agnostic').length
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Update tier-specific URLs for an endpoint
router.put('/:id/tier-urls', async (req, res) => {
  try {
    const { basic, plus, pro } = req.body;
    const endpoint = await APIEndpoint.findOne({ id: req.params.id });
    
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    const updates = { tierUrls: {} };
    if (basic !== undefined) updates.tierUrls.basic = basic;
    if (plus !== undefined) updates.tierUrls.plus = plus;
    if (pro !== undefined) updates.tierUrls.pro = pro;
    
    const updated = await APIEndpoint.findByIdAndUpdate(
      endpoint._id, 
      updates, 
      { new: true }
    );
    
    await logAction(req, 'update_urls', 'api_catalog', updated._id, 'APIEndpoint', 
      { id: req.params.id }, endpoint.tierUrls, updated.tierUrls);
    
    return res.json({ endpoint: updated });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Health check single endpoint across all tiers
router.post('/:id/health-check', async (req, res) => {
  try {
    const endpoint = await APIEndpoint.findOne({ id: req.params.id });
    
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    
    const healthResults = {
      basic: { status: 'unknown', latency: null },
      plus: { status: 'unknown', latency: null },
      pro: { status: 'unknown', latency: null }
    };
    
    // Test each tier
    for (const tier of ['basic', 'plus', 'pro']) {
      if (!endpoint.isDeployed[tier]) {
        healthResults[tier].status = 'not_deployed';
        continue;
      }
      
      const url = endpoint.getFullUrl(tier);
      if (!url) continue;
      
      try {
        const startTime = Date.now();
        const response = await axios({
          method: endpoint.method.toLowerCase(),
          url,
          timeout: 5000,
          validateStatus: () => true // Accept any status code
        });
        const latency = Date.now() - startTime;
        
        healthResults[tier] = {
          status: response.status < 500 ? 'healthy' : 'degraded',
          latency,
          statusCode: response.status
        };
      } catch (error) {
        healthResults[tier] = {
          status: 'down',
          latency: null,
          error: error.message
        };
      }
    }
    
    // Update endpoint health status
    await APIEndpoint.findByIdAndUpdate(endpoint._id, {
      healthStatus: {
        basic: healthResults.basic.status,
        plus: healthResults.plus.status,
        pro: healthResults.pro.status
      },
      healthLatency: {
        basic: healthResults.basic.latency,
        plus: healthResults.plus.latency,
        pro: healthResults.pro.latency
      },
      lastHealthCheck: new Date()
    });
    
    return res.json({ 
      endpoint: endpoint.id,
      health: healthResults,
      timestamp: new Date()
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Bulk health check all endpoints
router.post('/health-check-all', async (req, res) => {
  try {
    const { services, tiers } = req.body;
    const filter = { active: true };
    if (services) filter.service = { $in: services };
    
    const endpoints = await APIEndpoint.find(filter);
    const results = {
      total: endpoints.length,
      checked: 0,
      healthy: 0,
      degraded: 0,
      down: 0,
      not_deployed: 0
    };
    
    // Check all endpoints (removed arbitrary 50 limit)
    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];
      
      for (const tier of tiers || ['basic']) {
        if (!endpoint.isDeployed[tier]) {
          results.not_deployed++;
          continue;
        }
        
        const url = endpoint.getFullUrl(tier);
        if (!url) continue;
        
        try {
          const startTime = Date.now();
          const response = await axios({
            method: endpoint.method.toLowerCase(),
            url,
            timeout: 3000,
            validateStatus: () => true
          });
          const latency = Date.now() - startTime;
          
          const status = response.status < 500 ? 'healthy' : 'degraded';
          results[status]++;
          results.checked++;
          
          // Update endpoint
          await APIEndpoint.findByIdAndUpdate(endpoint._id, {
            [`healthStatus.${tier}`]: status,
            [`healthLatency.${tier}`]: latency,
            lastHealthCheck: new Date()
          });
        } catch (error) {
          results.down++;
          results.checked++;
          
          await APIEndpoint.findByIdAndUpdate(endpoint._id, {
            [`healthStatus.${tier}`]: 'down',
            lastHealthCheck: new Date()
          });
        }
      }
    }
    
    return res.json({ 
      message: 'Health check completed',
      results,
      timestamp: new Date()
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Auto-discover new APIs from services
router.post('/discover-new', async (req, res) => {
  try {
    const existingEndpoints = await APIEndpoint.find({}, 'path method');
    const existingKeys = new Set(
      existingEndpoints.map(e => `${e.method}:${e.path}`)
    );
    
    let newEndpoints = 0;
    const discovered = [];
    
    // Check each endpoint in catalog
    for (const [service, categories] of Object.entries(apiCatalog)) {
      for (const [category, endpoints] of Object.entries(categories)) {
        for (const endpoint of endpoints) {
          const key = `${endpoint.method}:${endpoint.path}`;
          
          // If endpoint doesn't exist in database, it's new
          if (!existingKeys.has(key)) {
            discovered.push({
              service,
              category,
              ...endpoint
            });
            newEndpoints++;
          }
        }
      }
    }
    
    // Optionally auto-seed new endpoints
    if (newEndpoints > 0) {
      console.log(`🔍 Auto-discovery found ${newEndpoints} new endpoints`);
      
      // You can uncomment this to auto-seed new endpoints
      // for (const endpoint of discovered) {
      //   await APIEndpoint.create(endpoint);
      // }
    }
    
    return res.json({
      newEndpoints,
      discovered: discovered.slice(0, 10), // Return first 10 for preview
      total: discovered.length,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Auto-discovery error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
