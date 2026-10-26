import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to .env files for each service
const CONTROL_PANEL_ENV = path.join(__dirname, '../../../../.env');
const AURA_ENV = path.join(__dirname, '../../../../../Aura/backend/.env');
const AI_SERVICE_ENV = path.join(__dirname, '../../../../../adaptive-Dokumentenverarbeitung/.env');

/**
 * Parse .env file into key-value object
 */
async function parseEnvFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const config = {};
    
    content.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        let value = valueParts.join('=').trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        config[key.trim()] = value;
      }
    });
    
    return config;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {}; // File doesn't exist, return empty config
    }
    throw error;
  }
}

/**
 * Write config object to .env file
 */
async function writeEnvFile(filePath, config) {
  const lines = [];
  
  for (const [key, value] of Object.entries(config)) {
    // Add quotes if value contains spaces or special characters
    const needsQuotes = /[\s#]/.test(value);
    const formattedValue = needsQuotes ? `"${value}"` : value;
    lines.push(`${key}=${formattedValue}`);
  }
  
  await fs.writeFile(filePath, lines.join('\n') + '\n', 'utf-8');
}

/**
 * GET /admin/environment/all
 * Get all environment configurations
 */
router.get('/all', async (req, res) => {
  try {
    const [controlPanel, aura, aiService] = await Promise.all([
      parseEnvFile(CONTROL_PANEL_ENV),
      parseEnvFile(AURA_ENV),
      parseEnvFile(AI_SERVICE_ENV)
    ]);
    
    return res.json({
      controlPanel,
      aura,
      aiService
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /admin/environment/:service
 * Get specific service environment configuration
 */
router.get('/:service', async (req, res) => {
  try {
    const { service } = req.params;
    let envPath;
    
    switch (service) {
      case 'control-panel':
        envPath = CONTROL_PANEL_ENV;
        break;
      case 'aura':
      case 'aura_backend':
        envPath = AURA_ENV;
        break;
      case 'ai-service':
        envPath = AI_SERVICE_ENV;
        break;
      default:
        return res.status(400).json({ error: 'Invalid service name' });
    }
    
    const config = await parseEnvFile(envPath);
    return res.json(config);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /admin/environment/:service
 * Update service environment configuration
 */
router.put('/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const config = req.body;
    
    let envPath;
    
    switch (service) {
      case 'control-panel':
        envPath = CONTROL_PANEL_ENV;
        break;
      case 'aura':
      case 'aura_backend':
        envPath = AURA_ENV;
        break;
      case 'ai-service':
        envPath = AI_SERVICE_ENV;
        break;
      default:
        return res.status(400).json({ error: 'Invalid service name' });
    }
    
    await writeEnvFile(envPath, config);
    
    return res.json({ 
      message: `${service} environment configuration updated successfully`,
      note: 'Service restart required for changes to take effect'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/environment/:service/restart
 * Send restart signal to service (placeholder - implement based on your deployment)
 */
router.post('/:service/restart', async (req, res) => {
  try {
    const { service } = req.params;
    
    // This is a placeholder - actual implementation depends on your deployment setup
    // Options:
    // 1. Use PM2: pm2 restart <service-name>
    // 2. Use systemd: systemctl restart <service>
    // 3. Use Docker: docker restart <container>
    // 4. Send signal to process
    
    return res.json({ 
      message: `Restart signal sent to ${service}`,
      note: 'Implementation depends on deployment method. Restart manually if needed.'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
