import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper to parse .env file into object
function parseEnvFile(content) {
  const config = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const firstEquals = trimmed.indexOf('=');
    if (firstEquals === -1) continue;
    
    const key = trimmed.substring(0, firstEquals).trim();
    let value = trimmed.substring(firstEquals + 1).trim();
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.substring(1, value.length - 1);
    }
    
    config[key] = value;
  }
  
  return config;
}

// Helper to serialize object back to .env format
function serializeEnvFile(config) {
  const lines = [];
  
  for (const [key, value] of Object.entries(config)) {
    if (value === undefined || value === null) continue;
    
    // Add quotes if value contains spaces or special characters
    const needsQuotes = /[\s#]/.test(value);
    const formattedValue = needsQuotes ? `"${value}"` : value;
    lines.push(`${key}=${formattedValue}`);
  }
  
  return lines.join('\n') + '\n';
}

// Helper to get .env file paths
function getEnvPaths() {
  // Paths relative to: AuraControlPanel/backend/src/routes/
  // Go up 4 levels to GitHub folder: routes -> src -> backend -> AuraControlPanel -> GitHub
  const controlPanelEnv = path.join(__dirname, '../../../.env');
  const auraBackendEnv = path.join(__dirname, '../../../../Aura/backend/.env');
  const aiServiceEnv = path.join(__dirname, '../../../../adaptive-Dokumentenverarbeitung/.env');
  
  // Normalize paths for Windows
  return {
    'control-panel': path.normalize(controlPanelEnv),
    'aura-backend': path.normalize(auraBackendEnv),
    'ai-service': path.normalize(aiServiceEnv)
  };
}

/**
 * GET /admin/environment/all
 * Get all environment configurations
 */
router.get('/all', async (req, res) => {
  try {
    const envPaths = getEnvPaths();
    const configs = {};
    
    for (const [service, envPath] of Object.entries(envPaths)) {
      try {
        const content = await fs.readFile(envPath, 'utf-8');
        configs[service === 'control-panel' ? 'controlPanel' : service] = parseEnvFile(content);
      } catch (err) {
        console.error(`Failed to read ${service} .env:`, err.message);
        configs[service === 'control-panel' ? 'controlPanel' : service] = {};
      }
    }
    
    return res.json(configs);
  } catch (error) {
    console.error('Failed to load environment configs:', error);
    return res.status(500).json({ error: 'Failed to load environment configurations' });
  }
});

/**
 * PUT /admin/environment/:service
 * Update environment configuration for a specific service
 */
router.put('/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const newConfig = req.body;
    
    console.log(`📝 PUT /admin/environment/${service} - Updating config`);
    console.log('Service:', service);
    console.log('Config keys:', Object.keys(newConfig));
    
    const envPaths = getEnvPaths();
    const envPath = envPaths[service];
    
    console.log('Available services:', Object.keys(envPaths));
    console.log('Resolved path:', envPath);
    
    if (!envPath) {
      console.error(`❌ Invalid service name: ${service}`);
      return res.status(400).json({ 
        error: 'Invalid service name',
        service,
        availableServices: Object.keys(envPaths)
      });
    }
    
    // Read existing config
    let existingContent = '';
    try {
      existingContent = await fs.readFile(envPath, 'utf-8');
    } catch (err) {
      // File doesn't exist, will create new
      console.warn(`${service} .env not found, will create new file`);
    }
    
    const existingConfig = parseEnvFile(existingContent);
    
    // Merge configs (preserve existing keys not in newConfig)
    const mergedConfig = { ...existingConfig, ...newConfig };
    
    // Serialize back to .env format
    const newContent = serializeEnvFile(mergedConfig);
    
    // Create backup before writing
    if (existingContent) {
      const backupPath = `${envPath}.backup.${Date.now()}`;
      await fs.writeFile(backupPath, existingContent, 'utf-8');
      console.log(`Created backup: ${backupPath}`);
    }
    
    // Write new config
    await fs.writeFile(envPath, newContent, 'utf-8');
    
    // Log the change in audit log
    try {
      const AuditLog = (await import('../models/AuditLog.js')).default;
      await AuditLog.create({
        userId: req.admin.userId || req.admin._id,
        email: req.admin.email,
        action: 'update',
        category: 'system',
        resource: 'environment',
        resourceId: service,
        description: `Updated ${service} environment configuration`,
        before: existingConfig,
        after: newConfig,
        ipAddress: req.ip || req.connection?.remoteAddress
      });
    } catch (auditErr) {
      console.error('Failed to create audit log:', auditErr);
    }
    
    return res.json({
      success: true,
      message: `${service} configuration updated successfully. Restart service to apply changes.`
    });
  } catch (error) {
    console.error('Failed to update environment config:', error);
    return res.status(500).json({ error: error.message || 'Failed to update configuration' });
  }
});

/**
 * POST /admin/environment/:service/restart
 * Restart a specific service (sends signal, doesn't actually restart from this process)
 */
router.post('/:service/restart', async (req, res) => {
  try {
    const { service } = req.params;
    
    // Log restart request
    try {
      const AuditLog = (await import('../models/AuditLog.js')).default;
      await AuditLog.create({
        userId: req.admin.userId || req.admin._id,
        email: req.admin.email,
        action: 'restart',
        category: 'system',
        resource: 'service',
        resourceId: service,
        description: `Requested restart for ${service} service`,
        ipAddress: req.ip || req.connection?.remoteAddress
      });
    } catch (auditErr) {
      console.error('Failed to create audit log:', auditErr);
    }
    
    // In a production environment, you would trigger actual service restart here
    // For now, just return success message
    // You could use PM2 API, systemd, or other process manager
    
    return res.json({
      success: true,
      message: `Restart signal sent to ${service}. Please check service logs for status.`,
      note: 'Manual restart required - automatic restart not implemented yet'
    });
  } catch (error) {
    console.error('Failed to restart service:', error);
    return res.status(500).json({ error: 'Failed to send restart signal' });
  }
});

/**
 * GET /admin/environment/:service/backup
 * List available backups for a service
 */
router.get('/:service/backups', async (req, res) => {
  try {
    const { service } = req.params;
    const envPaths = getEnvPaths();
    const envPath = envPaths[service];
    
    if (!envPath) {
      return res.status(400).json({ error: 'Invalid service name' });
    }
    
    const dir = path.dirname(envPath);
    const baseName = path.basename(envPath);
    const files = await fs.readdir(dir);
    
    const backups = files
      .filter(f => f.startsWith(`${baseName}.backup.`))
      .map(f => {
        const timestamp = parseInt(f.split('.').pop());
        return {
          filename: f,
          timestamp,
          date: new Date(timestamp).toISOString()
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return res.json({ backups });
  } catch (error) {
    console.error('Failed to list backups:', error);
    return res.status(500).json({ error: 'Failed to list backups' });
  }
});

/**
 * POST /admin/environment/:service/restore/:filename
 * Restore from a specific backup
 */
router.post('/:service/restore/:filename', async (req, res) => {
  try {
    const { service, filename } = req.params;
    const envPaths = getEnvPaths();
    const envPath = envPaths[service];
    
    if (!envPath) {
      return res.status(400).json({ error: 'Invalid service name' });
    }
    
    const backupPath = path.join(path.dirname(envPath), filename);
    
    // Verify backup exists
    try {
      await fs.access(backupPath);
    } catch {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    
    // Read backup content
    const backupContent = await fs.readFile(backupPath, 'utf-8');
    
    // Create backup of current state before restoring
    const currentContent = await fs.readFile(envPath, 'utf-8');
    const preRestoreBackup = `${envPath}.pre-restore.${Date.now()}`;
    await fs.writeFile(preRestoreBackup, currentContent, 'utf-8');
    
    // Restore from backup
    await fs.writeFile(envPath, backupContent, 'utf-8');
    
    // Log the restore
    try {
      const AuditLog = (await import('../models/AuditLog.js')).default;
      await AuditLog.create({
        userId: req.admin.userId || req.admin._id,
        email: req.admin.email,
        action: 'restore',
        category: 'system',
        resource: 'environment',
        resourceId: service,
        description: `Restored ${service} configuration from backup: ${filename}`,
        ipAddress: req.ip || req.connection?.remoteAddress
      });
    } catch (auditErr) {
      console.error('Failed to create audit log:', auditErr);
    }
    
    return res.json({
      success: true,
      message: `Configuration restored from ${filename}. Restart service to apply changes.`
    });
  } catch (error) {
    console.error('Failed to restore from backup:', error);
    return res.status(500).json({ error: 'Failed to restore from backup' });
  }
});

export default router;
