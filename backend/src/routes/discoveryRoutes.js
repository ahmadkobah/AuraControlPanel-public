import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to other projects
const aura_BASE = process.env.aura_PATH || path.join(__dirname, '../../../../aura');
const AI_SERVICE_BASE = process.env.AI_SERVICE_PATH || path.join(__dirname, '../../../../adaptive-Dokumentenverarbeitung');

/**
 * Parse Express.js route files to extract endpoints
 */
async function discoverauraAPIs() {
  const apis = [];
  const routesDir = path.join(aura_BASE, 'backend/src/routes');
  
  try {
    const files = await fs.readdir(routesDir);
    
    for (const file of files) {
      if (!file.endsWith('.js')) continue;
      
      const filePath = path.join(routesDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Extract base path from app.js mounts
      const basePath = '/' + file.replace('Routes.js', '').replace('.js', '');
      
      // Regex to find router.METHOD(path, ...)
      const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
      let match;
      
      while ((match = routeRegex.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const endpoint = match[2];
        const fullPath = basePath + (endpoint === '/' ? '' : endpoint);
        
        // Extract middleware hints
        const middlewareHints = [];
        if (content.includes('authenticate')) middlewareHints.push('auth');
        if (content.includes('requireRole')) middlewareHints.push('role-based');
        if (content.includes('requireVerified')) middlewareHints.push('verified-only');
        
        apis.push({
          service: 'aura_backend',
          method,
          path: fullPath,
          file,
          middleware: middlewareHints,
          base_url: 'http://localhost:8000'
        });
      }
    }
  } catch (err) {
    console.error('Error discovering aura APIs:', err.message);
  }
  
  return apis;
}

/**
 * Parse FastAPI Python files to extract endpoints
 */
async function discoverAIServiceAPIs() {
  const apis = [];
  const endpointsFile = path.join(AI_SERVICE_BASE, 'app/api/endpoints.py');
  
  try {
    const content = await fs.readFile(endpointsFile, 'utf-8');
    
    // Regex to find @app.METHOD("path")
    const routeRegex = /@app\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/g;
    let match;
    
    while ((match = routeRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const endpoint = match[2];
      
      // Extract docstring hints
      const funcStart = content.indexOf(match[0]);
      const funcEnd = content.indexOf('\n\ndef ', funcStart);
      const funcBody = content.slice(funcStart, funcEnd > 0 ? funcEnd : funcStart + 500);
      
      const docMatch = funcBody.match(/"""([^"]+)"""/);
      const description = docMatch ? docMatch[1].trim().split('\n')[0] : '';
      
      apis.push({
        service: 'ai_service',
        method,
        path: endpoint,
        description,
        file: 'endpoints.py',
        base_url: 'http://localhost:9000'
      });
    }
  } catch (err) {
    console.error('Error discovering AI Service APIs:', err.message);
  }
  
  return apis;
}

/**
 * GET /admin/discover-apis
 * Scan both aura and AI Service for API endpoints
 */
router.get('/discover-apis', async (req, res) => {
  try {
    const [auraAPIs, aiServiceAPIs] = await Promise.all([
      discoverauraAPIs(),
      discoverAIServiceAPIs()
    ]);
    
    return res.json({
      discovered: auraAPIs.length + aiServiceAPIs.length,
      aura: {
        count: auraAPIs.length,
        base_url: 'http://localhost:8000',
        apis: auraAPIs
      },
      ai_service: {
        count: aiServiceAPIs.length,
        base_url: 'http://localhost:9000',
        apis: aiServiceAPIs
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
