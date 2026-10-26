import express from 'express';
import configRoutes from './configRoutes.js';
import tierRoutes from './tierRoutes.js';
import tierStatusRoutes from './tierStatusRoutes.js';
import tierConfigRoutes from './tierConfigRoutes.js';
import classificationRoutes from './classificationRoutes.js';
import printerRoutes from './printerRoutes.js';
import pipelineRoutes from './pipelineRoutes.js';
import apiEndpointRoutes from './apiEndpointRoutes.js';
import auditRoutes from './auditRoutes.js';
import promptRoutes from './promptRoutes.js';
import searchRoutes from './searchRoutes.js';
import apiCatalogRoutes from './apiCatalogRoutes.js';
import tokenRoutes from './tokenRoutes.js';
import billingRoutes from './billingRoutes.js';
import securityRoutes from './securityRoutes.js';
import statisticsRoutes from './statisticsRoutes.js';
import environmentRoutes from './environmentRoutes.js';
import aiProxyRoutes from './aiProxyRoutes.js';

const router = express.Router();

// Whoami endpoint
router.get('/whoami', async (req, res) => {
  try {
    return res.json({
      userId: req.admin.userId || req.admin._id,
      email: req.admin.email,
      role: req.admin.role
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Mount sub-routes
router.use('/configs', configRoutes);
router.use('/tiers', tierRoutes);
router.use('/tier-status', tierStatusRoutes);
router.use('/tier-configs', tierConfigRoutes);
router.use('/classifications', classificationRoutes);
router.use('/printers', printerRoutes);
router.use('/pipelines', pipelineRoutes);
router.use('/api-endpoints', apiEndpointRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/prompts', promptRoutes);
router.use('/search-configs', searchRoutes);
router.use('/api-catalog', apiCatalogRoutes);
router.use('/tokens', tokenRoutes);
router.use('/billing', billingRoutes);
router.use('/security', securityRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/environment', environmentRoutes);
router.use('/ai-proxy', aiProxyRoutes);

export default router;
