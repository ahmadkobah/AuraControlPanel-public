import AutoFilingRule from '../models/AutoFilingRule.js';

/**
 * Create a new auto-filing rule
 * POST /admin/auto-filing-rules
 */
export async function createRule(req, res) {
  try {
    const {
      name,
      description,
      companyId,
      departmentId,
      isActive,
      priority,
      conditions,
      actions
    } = req.body;
    
    // Validation
    if (!name || !companyId || !actions || !actions.targetPath) {
      return res.status(400).json({ 
        error: 'name, companyId, and actions.targetPath are required' 
      });
    }
    
    const rule = new AutoFilingRule({
      name,
      description,
      companyId,
      departmentId: departmentId || null,
      isActive: isActive !== undefined ? isActive : true,
      priority: priority || 100,
      conditions: conditions || {},
      actions,
      createdBy: req.user?._id || req.user?.userId,
      lastModifiedBy: req.user?._id || req.user?.userId
    });
    
    await rule.save();
    
    return res.status(201).json({
      success: true,
      message: 'Auto-filing rule created successfully',
      rule
    });
  } catch (err) {
    console.error('Create auto-filing rule error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * List all auto-filing rules with filtering
 * GET /admin/auto-filing-rules
 */
export async function listRules(req, res) {
  try {
    const { 
      companyId, 
      departmentId, 
      isActive,
      page = 1, 
      limit = 50,
      sortBy = 'priority',
      sortOrder = 'asc'
    } = req.query;
    
    const filter = {};
    
    if (companyId) filter.companyId = companyId;
    if (departmentId) filter.departmentId = departmentId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const [rules, total] = await Promise.all([
      AutoFilingRule.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('companyId', 'name')
        .populate('departmentId', 'name')
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email')
        .exec(),
      AutoFilingRule.countDocuments(filter)
    ]);
    
    return res.json({
      success: true,
      data: rules,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('List auto-filing rules error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Get a single auto-filing rule by ID
 * GET /admin/auto-filing-rules/:id
 */
export async function getRule(req, res) {
  try {
    const rule = await AutoFilingRule.findById(req.params.id)
      .populate('companyId', 'name')
      .populate('departmentId', 'name')
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .exec();
    
    if (!rule) {
      return res.status(404).json({ error: 'Auto-filing rule not found' });
    }
    
    return res.json({
      success: true,
      rule
    });
  } catch (err) {
    console.error('Get auto-filing rule error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Update an auto-filing rule
 * PUT /admin/auto-filing-rules/:id
 */
export async function updateRule(req, res) {
  try {
    const {
      name,
      description,
      isActive,
      priority,
      conditions,
      actions
    } = req.body;
    
    const rule = await AutoFilingRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: 'Auto-filing rule not found' });
    }
    
    // Update fields
    if (name !== undefined) rule.name = name;
    if (description !== undefined) rule.description = description;
    if (isActive !== undefined) rule.isActive = isActive;
    if (priority !== undefined) rule.priority = priority;
    if (conditions !== undefined) rule.conditions = conditions;
    if (actions !== undefined) rule.actions = actions;
    
    rule.lastModifiedBy = req.user?._id || req.user?.userId;
    
    await rule.save();
    
    return res.json({
      success: true,
      message: 'Auto-filing rule updated successfully',
      rule
    });
  } catch (err) {
    console.error('Update auto-filing rule error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Delete an auto-filing rule
 * DELETE /admin/auto-filing-rules/:id
 */
export async function deleteRule(req, res) {
  try {
    const rule = await AutoFilingRule.findByIdAndDelete(req.params.id);
    
    if (!rule) {
      return res.status(404).json({ error: 'Auto-filing rule not found' });
    }
    
    return res.json({
      success: true,
      message: 'Auto-filing rule deleted successfully'
    });
  } catch (err) {
    console.error('Delete auto-filing rule error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Toggle rule active status
 * POST /admin/auto-filing-rules/:id/toggle
 */
export async function toggleRule(req, res) {
  try {
    const rule = await AutoFilingRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: 'Auto-filing rule not found' });
    }
    
    rule.isActive = !rule.isActive;
    rule.lastModifiedBy = req.user?._id || req.user?.userId;
    await rule.save();
    
    return res.json({
      success: true,
      message: `Rule ${rule.isActive ? 'activated' : 'deactivated'} successfully`,
      rule
    });
  } catch (err) {
    console.error('Toggle auto-filing rule error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Test a rule against sample document data
 * POST /admin/auto-filing-rules/:id/test
 * Body: { documentData: { classification, entities, structuredData } }
 */
export async function testRule(req, res) {
  try {
    const { documentData } = req.body;
    
    if (!documentData) {
      return res.status(400).json({ error: 'documentData is required' });
    }
    
    const rule = await AutoFilingRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: 'Auto-filing rule not found' });
    }
    
    // Evaluate rule
    const matches = rule.evaluate(documentData);
    
    // If matches, apply rule to get target path
    let result = {
      matches,
      message: matches ? 'Rule matches the document data' : 'Rule does not match the document data'
    };
    
    if (matches) {
      const application = rule.apply(documentData);
      result.targetPath = application.targetPath;
      result.filename = application.filename;
    }
    
    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('Test auto-filing rule error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Get rule statistics
 * GET /admin/auto-filing-rules/:id/stats
 */
export async function getRuleStats(req, res) {
  try {
    const rule = await AutoFilingRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: 'Auto-filing rule not found' });
    }
    
    return res.json({
      success: true,
      stats: {
        ...rule.stats,
        successRate: rule.successRate
      }
    });
  } catch (err) {
    console.error('Get rule stats error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Duplicate a rule
 * POST /admin/auto-filing-rules/:id/duplicate
 */
export async function duplicateRule(req, res) {
  try {
    const sourceRule = await AutoFilingRule.findById(req.params.id);
    if (!sourceRule) {
      return res.status(404).json({ error: 'Auto-filing rule not found' });
    }
    
    const duplicatedRule = new AutoFilingRule({
      name: `${sourceRule.name} (Copy)`,
      description: sourceRule.description,
      companyId: sourceRule.companyId,
      departmentId: sourceRule.departmentId,
      isActive: false, // Start disabled
      priority: sourceRule.priority + 1,
      conditions: sourceRule.conditions,
      actions: sourceRule.actions,
      createdBy: req.user?._id || req.user?.userId,
      lastModifiedBy: req.user?._id || req.user?.userId
    });
    
    await duplicatedRule.save();
    
    return res.status(201).json({
      success: true,
      message: 'Rule duplicated successfully',
      rule: duplicatedRule
    });
  } catch (err) {
    console.error('Duplicate rule error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Bulk update rule priorities
 * POST /admin/auto-filing-rules/bulk-priority
 * Body: { rules: [{ id, priority }] }
 */
export async function bulkUpdatePriorities(req, res) {
  try {
    const { rules } = req.body;
    
    if (!Array.isArray(rules) || rules.length === 0) {
      return res.status(400).json({ error: 'rules array is required' });
    }
    
    const updates = rules.map(({ id, priority }) =>
      AutoFilingRule.findByIdAndUpdate(
        id,
        { 
          priority, 
          lastModifiedBy: req.user?._id || req.user?.userId 
        },
        { new: true }
      )
    );
    
    const updatedRules = await Promise.all(updates);
    
    return res.json({
      success: true,
      message: 'Priorities updated successfully',
      rules: updatedRules.filter(r => r !== null)
    });
  } catch (err) {
    console.error('Bulk update priorities error:', err);
    return res.status(500).json({ error: err.message });
  }
}
