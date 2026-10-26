import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import adminRoutes from './routes/admin/index.js';
import discoveryRoutes from './routes/discoveryRoutes.js';
import auraBackendProxyRoutes from './routes/auraBackendProxyRoutes.js';
import Token from './models/Token.js';
import logger from './utils/logger.js';

const app = express();
app.use(express.json());
app.use(morgan('dev'));
const _corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || _corsOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Custom logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res.statusCode, `${duration}ms`);
  });
  next();
});

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
const AURA_BACKEND_URL = process.env.AURA_BACKEND_URL || 'http://localhost:8000';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:9000';
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || '';
const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL || process.env.MONGODB_URI;

// Validate required environment variables
if (!MONGO_URI) {
  logger.error('MONGO_URI, MONGO_URL, or MONGODB_URI environment variable is required');
  console.error('❌ MONGO_URI, MONGO_URL, or MONGODB_URI environment variable is required');
  process.exit(1);
}
if (!JWT_SECRET) {
  logger.warn('JWT_SECRET not set, using insecure default (not recommended for production)');
}

function requireSuperadmin(req, res, next) {
  const hdr = req.headers['authorization'] || req.headers['Authorization'];
  if (!hdr) {
    logger.warn('Authentication failed: Missing Authorization header');
    return res.status(401).json({ error: 'Missing Authorization' });
  }
  const parts = hdr.split(' ');
  const token = parts.length === 2 && /^Bearer$/i.test(parts[0]) ? parts[1] : null;
  if (!token) {
    logger.warn('Authentication failed: Invalid Authorization header format');
    return res.status(401).json({ error: 'Invalid Authorization header' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const role = decoded.role || decoded.claims?.role;
    if (role !== 'superadmin') {
      logger.warn(`Authorization failed: User role '${role}' is not superadmin`);
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.admin = decoded;
    
    // Update last activity timestamp in background (don't await)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    Token.updateOne(
      { tokenHash, active: true },
      { 
        $set: { lastActivity: new Date() },
        $inc: { requestCount: 1 }
      }
    ).catch(err => console.error('Failed to update token activity:', err));
    
    return next();
  } catch (err) {
    logger.warn(`Authentication failed: ${err.message}`);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Minimal User model for read-only verification
const userSchema = new mongoose.Schema({
  email: String,
  role: String,
  isSuperAdmin: Boolean,
  firstName: String,
  lastName: String,
  password: { type: String }
}, { collection: 'users' });
let User;

async function ensureDb() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI, { 
    autoIndex: false,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 10000
  });
  // Only create model if it doesn't exist
  if (!User) {
    User = mongoose.models.User || mongoose.model('User', userSchema);
  }
}

// Connect to database on startup
ensureDb()
  .then(() => {
    logger.info('✅ MongoDB connected');
    console.log('✅ MongoDB connected');
  })
  .catch(err => {
    logger.error(`❌ MongoDB connection failed: ${err.message}`);
    console.error('❌ MongoDB connection failed:', err.message);
  });

// Safe, read-only health endpoints (no mutations)
app.get('/health', async (req, res) => {
  try {
    const [be, ai] = await Promise.allSettled([
      axios.get(`${AURA_BACKEND_URL}/health`, { timeout: 3000 }),
      axios.get(`${AI_SERVICE_URL}/health`, { timeout: 3000, headers: AI_SERVICE_API_KEY ? { 'X-API-Key': AI_SERVICE_API_KEY } : {} })
    ]);
    return res.json({
      status: 'ready',
      backend: be.status === 'fulfilled' ? be.value.data : { error: be.reason?.message },
      ai_service: ai.status === 'fulfilled' ? ai.value.data : { error: ai.reason?.message },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(200).json({ status: 'degraded', error: err.message });
  }
});

// Verify superadmin token against control panel secret (local check only)
app.get('/admin/verify', requireSuperadmin, (req, res) => {
  const id = req.admin.userId || req.admin._id || req.admin.id;
  return res.json({ ok: true, admin: { id, role: 'superadmin' } });
});

// Read-only whoami sourced from the same Mongo database as Aura
app.get('/admin/whoami', requireSuperadmin, async (req, res) => {
  try {
    await ensureDb();
    const id = req.admin.userId || req.admin._id || req.admin.id;
    const user = id ? await User.findById(id).select('email role isSuperAdmin firstName lastName companyId departmentId status').lean() : null;
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'superadmin' && user.isSuperAdmin !== true) return res.status(403).json({ error: 'Forbidden: not superadmin' });
    return res.json({ ok: true, user });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Read-only services status (backend + ai + hardware monitoring)
app.get('/status/services', requireSuperadmin, async (req, res) => {
  const status = { backend: null, ai: null, hardware: null };
  try {
    const [be, ai] = await Promise.allSettled([
      axios.get(`${AURA_BACKEND_URL}/health`, { timeout: 3000 }),
      axios.get(`${AI_SERVICE_URL}/health`, { timeout: 3000, headers: AI_SERVICE_API_KEY ? { 'X-API-Key': AI_SERVICE_API_KEY } : {} })
    ]);
    status.backend = be.status === 'fulfilled' ? be.value.data : { error: be.reason?.message };
    status.ai = ai.status === 'fulfilled' ? ai.value.data : { error: ai.reason?.message };
  } catch (e) {}
  // Get hardware stats from AI service
  try {
    const hardware = await axios.get(`${AI_SERVICE_URL}/system/hardware`, { timeout: 3000, headers: AI_SERVICE_API_KEY ? { 'X-API-Key': AI_SERVICE_API_KEY } : {} });
    status.hardware = hardware.data;
  } catch (e) {
    status.hardware = { error: e.message };
  }
  return res.json({ status: 'ok', services: status, timestamp: new Date().toISOString() });
});

// Read-only API Catalog derived from environment and health checks
app.get('/api/catalog', requireSuperadmin, async (req, res) => {
  const catalog = [
    { name: 'Aura Backend', baseUrl: AURA_BACKEND_URL, health: `${AURA_BACKEND_URL}/health` },
    { name: 'AI Service', baseUrl: AI_SERVICE_URL, health: `${AI_SERVICE_URL}/health` },
    { name: 'Llamafile', baseUrl: 'http://localhost:8080', health: 'http://localhost:8080/health' }
  ];
  // Optionally check status
  const aiHeaders = AI_SERVICE_API_KEY ? { 'X-API-Key': AI_SERVICE_API_KEY } : {};
  const results = await Promise.allSettled(catalog.map(c => {
    const headers = c.baseUrl === AI_SERVICE_URL ? aiHeaders : {};
    return axios.get(c.health, { timeout: 2000, headers });
  }));
  const enriched = catalog.map((c, i) => ({
    ...c,
    status: results[i].status === 'fulfilled' ? 'healthy' : 'down',
    details: results[i].status === 'fulfilled' ? results[i].value.data : { error: results[i].reason?.message }
  }));
  return res.json({ catalog: enriched, timestamp: new Date().toISOString() });
});

// Login endpoint (validates superadmin from MongoDB)
app.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', req.body.email);
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    console.log('📡 Connecting to database...');
    await ensureDb();
    console.log('✅ Database connected, searching for user...');
    
    const user = await User.findOne({ email: email.toLowerCase() }).lean();
    console.log('👤 User found:', user ? 'YES' : 'NO');
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    // Check superadmin
    console.log('🔑 User role:', user.role, 'isSuperAdmin:', user.isSuperAdmin);
    if (user.role !== 'superadmin' && user.isSuperAdmin !== true) {
      return res.status(403).json({ error: 'Access denied: superadmin only' });
    }
    
    // Verify password
    console.log('🔒 Password field exists:', !!user.password);
    if (!user.password) {
      console.error('User has no password field');
      return res.status(500).json({ error: 'Login failed' });
    }
    
    console.log('🔐 Comparing password...');
    const valid = await bcrypt.compare(password, user.password);
    console.log('✅ Password valid:', valid);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    // Generate token
    console.log('🎟️ Generating token...');
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Revoke all previous active JWT tokens for this user
    console.log('🔄 Revoking old tokens for user:', user._id);
    try {
      const revokeResult = await Token.updateMany(
        { userId: user._id, type: 'jwt', active: true },
        { 
          active: false, 
          revokedAt: new Date(),
          revokedBy: user._id 
        }
      );
      console.log(`✅ Revoked ${revokeResult.modifiedCount} old tokens for user ${user.email}`);
    } catch (err) {
      console.error('❌ Failed to revoke old tokens:', err);
      // Continue to prevent login failure
    }
    
    // Save token to database for tracking
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    try {
      await Token.create({
        userId: user._id,
        tokenHash,
        type: 'jwt',
        service: 'AuraControlPanel',
        issuedAt: new Date(),
        expiresAt,
        lastActivity: new Date(),
        active: true
      });
      console.log(`✅ Created new token for user ${user.email}`);
    } catch (err) {
      console.error('❌ Failed to create token:', err);
      // Continue to prevent login failure
    }
    
    console.log('✅ Login successful for:', user.email);
    return res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (err) {
    logger.error(`❌ Login error: ${err.message}`);
    console.error('❌ Login error:', err.message);
    console.error('Stack:', err.stack);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// Import logs routes
import logsRoutes from './routes/logsRoutes.js';
import aiConfigRoutes from './routes/aiConfigRoutes.js';
import autoFilingRoutes from './routes/autoFilingRoutes.js';
import promptRoutes from './routes/admin/promptRoutes.js';

// Public API for AI Service (no auth required)
app.use('/api/public/prompts', promptRoutes);

// Mount admin routes
app.use('/admin', requireSuperadmin, adminRoutes);
app.use('/admin', requireSuperadmin, discoveryRoutes);
app.use('/admin/logs', requireSuperadmin, logsRoutes);
app.use('/admin/ai-service', requireSuperadmin, aiConfigRoutes);
app.use('/admin/auto-filing-rules', requireSuperadmin, autoFilingRoutes);
app.use('/proxy', requireSuperadmin, auraBackendProxyRoutes);

app.listen(PORT, () => {
  logger.info(`🚀 Aura Control Panel API running on http://localhost:${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Aura Backend: ${AURA_BACKEND_URL}`);
  logger.info(`🤖 AI Service: ${AI_SERVICE_URL}`);
  console.log(`Aura Control Panel API running on http://localhost:${PORT}`);
});
