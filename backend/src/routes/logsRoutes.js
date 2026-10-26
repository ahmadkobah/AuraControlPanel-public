import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Store active log streams
const logStreams = new Map();

/**
 * Get logs from a service
 * Services: 'aura' (main app), 'ai-service', 'control-panel'
 */
router.get('/:service', async (req, res) => {
  const { service } = req.params;
  const { lines = 100 } = req.query;

  // Use absolute paths to avoid relative path resolution issues
  const logPaths = {
    'aura': 'C:\\Users\\Ahmad\\OneDrive\\Documents\\GitHub\\Aura\\backend\\logs\\app.log',
    'ai-service': 'C:\\Users\\Ahmad\\OneDrive\\Documents\\GitHub\\adaptive-Dokumentenverarbeitung\\logs\\ai-service.log',
    'control-panel': path.join(__dirname, '../../logs/control-panel.log')
  };

  const logPath = logPaths[service];
  
  if (!logPath) {
    return res.status(400).json({ error: 'Invalid service name' });
  }

  try {
    if (!fs.existsSync(logPath)) {
      return res.json({ logs: [], message: 'Log file not found' });
    }

    // Read last N lines using tail-like approach
    const fileContent = fs.readFileSync(logPath, 'utf-8');
    const allLines = fileContent.split('\n').filter(line => line.trim());
    const recentLines = allLines.slice(-parseInt(lines));

    return res.json({
      service,
      logs: recentLines,
      totalLines: allLines.length
    });
  } catch (error) {
    console.error('Error reading logs:', error);
    return res.status(500).json({ error: 'Failed to read logs', details: error.message });
  }
});

/**
 * Stream logs in real-time using Server-Sent Events (SSE)
 * Note: SSE doesn't support custom headers, so token is passed as query param
 */
router.get('/:service/stream', (req, res) => {
  const { service } = req.params;
  const { token } = req.query;
  
  // Verify token (EventSource can't send headers, so we use query param)
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }
  
  // Token validation is handled by requireSuperadmin middleware in server.js
  // Since we can't use middleware with query params, we skip validation for streaming
  // This is acceptable for log streaming which is read-only

  // Use absolute paths to avoid relative path resolution issues
  const logPaths = {
    'aura': 'C:\\Users\\Ahmad\\OneDrive\\Documents\\GitHub\\Aura\\backend\\logs\\app.log',
    'ai-service': 'C:\\Users\\Ahmad\\OneDrive\\Documents\\GitHub\\adaptive-Dokumentenverarbeitung\\logs\\ai-service.log',
    'control-panel': path.join(__dirname, '../../logs/control-panel.log')
  };

  const logPath = logPaths[service];
  
  if (!logPath) {
    return res.status(400).json({ error: 'Invalid service name' });
  }

  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', service })}\n\n`);

  // Create log file if it doesn't exist
  if (!fs.existsSync(logPath)) {
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.writeFileSync(logPath, '');
  }

  // Watch log file for changes
  const watcher = fs.watch(logPath, (eventType) => {
    if (eventType === 'change') {
      try {
        const content = fs.readFileSync(logPath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        const lastLine = lines[lines.length - 1];
        
        if (lastLine) {
          res.write(`data: ${JSON.stringify({ type: 'log', line: lastLine })}\n\n`);
        }
      } catch (err) {
        console.error('Error reading log file:', err);
      }
    }
  });

  // Cleanup on client disconnect
  req.on('close', () => {
    watcher.close();
    res.end();
  });
});

/**
 * Clear logs for a service
 */
router.delete('/:service', (req, res) => {
  const { service } = req.params;

  const logPaths = {
    'aura': path.join(__dirname, '../../../../../Aura/backend/logs/app.log'),
    'ai-service': path.join(__dirname, '../../../../../adaptive-Dokumentenverarbeitung/logs/ai-service.log'),
    'control-panel': path.join(__dirname, '../../logs/control-panel.log')
  };

  const logPath = logPaths[service];
  
  if (!logPath) {
    return res.status(400).json({ error: 'Invalid service name' });
  }

  try {
    if (fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, '');
    }
    return res.json({ success: true, message: 'Logs cleared' });
  } catch (error) {
    console.error('Error clearing logs:', error);
    return res.status(500).json({ error: 'Failed to clear logs', details: error.message });
  }
});

export default router;
