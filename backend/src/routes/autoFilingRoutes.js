import express from 'express';
import * as ctrl from '../controllers/autoFilingController.js';

const router = express.Router();

// Note: Authentication is handled by requireSuperadmin middleware in server.js

// ===== AUTO-FILING RULE ROUTES =====

// Create new rule
router.post('/', ctrl.createRule);

// Bulk update priorities (must come before /:id routes)
router.post('/bulk/priorities', ctrl.bulkUpdatePriorities);

// List all rules with filtering
router.get('/', ctrl.listRules);

// Get single rule
router.get('/:id', ctrl.getRule);

// Update rule
router.put('/:id', ctrl.updateRule);

// Delete rule
router.delete('/:id', ctrl.deleteRule);

// Toggle rule active/inactive
router.post('/:id/toggle', ctrl.toggleRule);

// Test rule against sample data
router.post('/:id/test', ctrl.testRule);

// Get rule statistics
router.get('/:id/stats', ctrl.getRuleStats);

// Duplicate rule
router.post('/:id/duplicate', ctrl.duplicateRule);

export default router;
