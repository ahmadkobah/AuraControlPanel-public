import AuditLog from '../../../models/AuditLog.js';

/**
 * Log an admin action to the audit trail
 * @param {Object} req - Express request object
 * @param {String} action - Action performed (create, update, delete, etc.)
 * @param {String} category - Category of action (config, tier, billing, etc.)
 * @param {String} targetId - ID of the target resource
 * @param {String} targetType - Type of target resource (Model name)
 * @param {Object} changes - Changes made
 * @param {Object} oldValue - Previous value
 * @param {Object} newValue - New value
 */
export async function logAction(req, action, category, targetId, targetType, changes, oldValue, newValue) {
  try {
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
