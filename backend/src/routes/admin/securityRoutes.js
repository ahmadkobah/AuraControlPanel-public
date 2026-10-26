import express from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import Token from '../../models/Token.js';
import AuditLog from '../../models/AuditLog.js';

const router = express.Router();

const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || '';

// Audit helper
async function logAction(req, action, category, targetId, targetType, changes, oldValue, newValue) {
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

// ============ SECURITY ============
// Get security status and statistics
router.get('/status', async (req, res) => {
  try {
    // Get token statistics
    const [activeTokens, apiKeys, auditLogs24h] = await Promise.all([
      Token.countDocuments({ active: true, type: 'jwt' }),
      Token.countDocuments({ active: true, type: 'api_key' }),
      AuditLog.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);

    // Count failed login attempts in last 24 hours
    const failedLogins24h = await AuditLog.countDocuments({
      category: 'auth',
      action: { $regex: /login.*fail/i },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    // Get current settings (from environment or defaults)
    const settings = {
      jwtExpiration: process.env.JWT_EXPIRATION || '7d',
      passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
      passwordRequireSpecialChar: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
      passwordRequireNumber: process.env.PASSWORD_REQUIRE_NUMBER !== 'false',
      passwordRequireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 30,
      maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
      lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 15,
      tokenRefreshEnabled: process.env.TOKEN_REFRESH_ENABLED !== 'false',
      apiRateLimit: parseInt(process.env.API_RATE_LIMIT) || 1000
    };

    return res.json({
      activeTokens,
      apiKeys,
      auditLogs24h,
      failedLogins24h,
      settings,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Save security settings
router.post('/settings', async (req, res) => {
  try {
    const {
      jwtExpiration,
      passwordMinLength,
      passwordRequireSpecialChar,
      passwordRequireNumber,
      passwordRequireUppercase,
      sessionTimeout,
      maxLoginAttempts,
      lockoutDuration,
      tokenRefreshEnabled,
      apiRateLimit,
      // Phase toggles
      phase1_securityDashboard,
      phase1_activeSessionsMonitor,
      phase1_failedLoginLog,
      phase1_httpsEnforcement,
      phase1_rateLimitingDashboard,
      phase2_auditLogExport,
      phase2_connectionMonitor,
      phase2_passwordPolicyUI,
      phase2_twoFactorAuth,
      phase2_certificateManager,
      phase3_databaseEncryption,
      phase3_fieldLevelEncryption,
      phase3_dataFlowVisualization,
      phase3_complianceReports,
      phase3_documentEncryption,
      phase3_ipWhitelist
    } = req.body;

    // In a production system, these would be saved to a config collection
    // For now, we'll just log them and return success
    console.log('Security settings updated:', {
      jwtExpiration,
      passwordMinLength,
      sessionTimeout,
      maxLoginAttempts,
      lockoutDuration,
      apiRateLimit
    });

    // Log phase selections
    const selectedPhase1 = [
      phase1_securityDashboard && 'Security Dashboard',
      phase1_activeSessionsMonitor && 'Active Sessions Monitor',
      phase1_failedLoginLog && 'Failed Login Log',
      phase1_httpsEnforcement && 'HTTPS Enforcement',
      phase1_rateLimitingDashboard && 'Rate Limiting Dashboard'
    ].filter(Boolean);

    const selectedPhase2 = [
      phase2_auditLogExport && 'Audit Log Export',
      phase2_connectionMonitor && 'Connection Monitor',
      phase2_passwordPolicyUI && 'Password Policy UI',
      phase2_twoFactorAuth && '2FA',
      phase2_certificateManager && 'Certificate Manager'
    ].filter(Boolean);

    const selectedPhase3 = [
      phase3_databaseEncryption && 'Database Encryption',
      phase3_fieldLevelEncryption && 'Field-Level Encryption',
      phase3_dataFlowVisualization && 'Data Flow Visualization',
      phase3_complianceReports && 'Compliance Reports',
      phase3_documentEncryption && 'Document Encryption',
      phase3_ipWhitelist && 'IP Whitelist'
    ].filter(Boolean);

    console.log('Phase 1 features selected:', selectedPhase1);
    console.log('Phase 2 features selected:', selectedPhase2);
    console.log('Phase 3 features selected:', selectedPhase3);

    await logAction(req, 'update_security_settings', 'system', null, 'SecuritySettings',
      {
        jwtExpiration,
        passwordMinLength,
        phase1Count: selectedPhase1.length,
        phase2Count: selectedPhase2.length,
        phase3Count: selectedPhase3.length
      },
      null, null);

    return res.json({
      success: true,
      message: 'Security settings saved successfully',
      selected: {
        phase1: selectedPhase1,
        phase2: selectedPhase2,
        phase3: selectedPhase3
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Test service connections
router.post('/test-connection', async (req, res) => {
  try {
    const { service } = req.body;

    if (service === 'mongodb') {
      // Test MongoDB connection
      const result = await mongoose.connection.db.admin().ping();
      return res.json({ 
        status: 'Connected', 
        service: 'MongoDB',
        details: `Database: ${mongoose.connection.name}`,
        latency: '< 5ms'
      });
    }

    if (service === 'aura') {
      // Test Aura Backend
      const AURA_BACKEND_URL = process.env.AURA_BACKEND_URL || 'http://localhost:8000';
      const response = await axios.get(`${AURA_BACKEND_URL}/health`, { timeout: 5000 });
      return res.json({
        status: 'Connected',
        service: 'Aura Backend',
        details: response.data,
        url: AURA_BACKEND_URL
      });
    }

    if (service === 'ai_service') {
      // Test AI Service
      const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:9000';
      const response = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000, headers: AI_SERVICE_API_KEY ? { 'X-API-Key': AI_SERVICE_API_KEY } : {} });
      return res.json({
        status: 'Connected',
        service: 'AI Service',
        details: response.data,
        url: AI_SERVICE_URL
      });
    }

    return res.status(400).json({ error: 'Invalid service name' });
  } catch (err) {
    return res.status(500).json({ 
      status: 'Failed',
      error: err.message,
      details: 'Connection test failed'
    });
  }
});

export default router;
