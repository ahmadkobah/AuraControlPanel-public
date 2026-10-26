# Admin Routes - Modular Architecture

## 📁 Structure

The admin routes have been refactored from a single 2224-line monolithic file into a professional modular architecture:

```
backend/src/routes/admin/
├── index.js                 # Main router that mounts all sub-routes
├── utils/
│   └── auditLogger.js       # Shared audit logging utility
│
├── configRoutes.js          # Control configuration management
├── tierRoutes.js            # Tier & service status management
├── statisticsRoutes.js      # Analytics & statistics
├── classificationRoutes.js  # AI classification management
├── printerRoutes.js         # Printer configuration
├── pipelineRoutes.js        # Pipeline configuration
├── apiEndpointRoutes.js     # API endpoint management
├── auditRoutes.js           # Audit log queries
├── promptRoutes.js          # Prompt engineering & testing
├── searchRoutes.js          # Search configuration
├── apiCatalogRoutes.js      # API catalog & health monitoring
├── tokenRoutes.js           # Token & session management
├── billingRoutes.js         # Billing & invoicing
└── securityRoutes.js        # Security settings
```

## 🎯 Benefits

### 1. **Maintainability**
- Each file focuses on a single domain
- Easier to locate and modify specific functionality
- Reduced cognitive load when working on a feature

### 2. **Scalability**
- Easy to add new routes without bloating existing files
- Can split further if a module grows too large
- Clear boundaries between features

### 3. **Testability**
- Each route module can be tested independently
- Mock only the dependencies needed for that module
- Faster test execution by targeting specific modules

### 4. **Team Collaboration**
- Multiple developers can work on different modules simultaneously
- Reduced merge conflicts
- Clear ownership of features

### 5. **Code Reusability**
- Shared utilities (auditLogger) can be imported where needed
- Consistent patterns across all modules
- DRY (Don't Repeat Yourself) principle

## 📋 Route Modules

### **configRoutes.js** - Control Configuration
Manages system-wide control configurations.

**Routes:**
- `GET /admin/configs` - List all configs
- `POST /admin/configs` - Create config
- `GET /admin/configs/:id` - Get single config
- `PUT /admin/configs/:id` - Update config
- `DELETE /admin/configs/:id` - Delete config
- `POST /admin/configs/reload` - Reload configs

---

### **tierRoutes.js** - Tier Management
Manages company tiers and AI service mapping.

**Routes:**
- `GET /admin/tiers/tier-status` - Get tier status with AI service info
- `GET /admin/tiers` - List all tiers
- `GET /admin/tiers/ai-services` - Get AI service mapping
- `POST /admin/tiers` - Create tier
- `PUT /admin/tiers/:id` - Update tier
- `DELETE /admin/tiers/:id` - Delete tier
- `GET /admin/tiers/defaults` - Get tier defaults
- `POST /admin/tiers/apply-defaults` - Apply defaults

---

### **statisticsRoutes.js** - Analytics
Provides system-wide statistics and analytics.

**Routes:**
- `GET /admin/statistics` - Comprehensive statistics
- `GET /admin/statistics/companies` - List companies
- `GET /admin/statistics/departments` - List departments

---

### **classificationRoutes.js** - AI Classifications
Manages document classification configurations.

**Routes:**
- `GET /admin/classifications` - List classifications
- `POST /admin/classifications` - Create classification
- `PUT /admin/classifications/:id` - Update classification
- `DELETE /admin/classifications/:id` - Delete classification

---

### **printerRoutes.js** - Printer Configuration
Manages printer configurations for document printing.

**Routes:**
- `GET /admin/printers` - List printers
- `POST /admin/printers` - Create printer
- `PUT /admin/printers/:id` - Update printer
- `DELETE /admin/printers/:id` - Delete printer

---

### **pipelineRoutes.js** - Pipeline Configuration
Manages AI processing pipeline configurations.

**Routes:**
- `GET /admin/pipelines` - List pipelines
- `POST /admin/pipelines` - Create pipeline
- `PUT /admin/pipelines/:id` - Update pipeline
- `DELETE /admin/pipelines/:id` - Delete pipeline

---

### **apiEndpointRoutes.js** - API Endpoints
Manages API endpoint registrations.

**Routes:**
- `GET /admin/api-endpoints` - List endpoints
- `POST /admin/api-endpoints` - Create endpoint
- `PUT /admin/api-endpoints/:id` - Update endpoint
- `DELETE /admin/api-endpoints/:id` - Delete endpoint

---

### **auditRoutes.js** - Audit Logs
Query audit trail of all admin actions.

**Routes:**
- `GET /admin/audit-logs` - Query audit logs (with filtering)

---

### **promptRoutes.js** - Prompt Management
Manages AI prompts with testing and metrics.

**Routes:**
- `GET /admin/prompts` - List prompts
- `GET /admin/prompts/:id` - Get prompt
- `POST /admin/prompts` - Create prompt
- `PUT /admin/prompts/:id` - Update prompt
- `DELETE /admin/prompts/:id` - Delete prompt
- `POST /admin/prompts/:id/test` - Test prompt
- `GET /admin/prompts/:id/metrics` - Get metrics
- `POST /admin/prompts/:id/feedback` - Submit feedback

---

### **searchRoutes.js** - Search Configuration
Manages search engine configurations.

**Routes:**
- `GET /admin/search-configs` - List search configs
- `POST /admin/search-configs` - Create config
- `PUT /admin/search-configs/:id` - Update config
- `DELETE /admin/search-configs/:id` - Delete config

---

### **apiCatalogRoutes.js** - API Catalog
Manages API catalog with health monitoring and auto-discovery.

**Routes:**
- `POST /admin/api-catalog/seed-api-catalog` - Seed catalog from config
- `GET /admin/api-catalog` - List endpoints (with filters)
- `PUT /admin/api-catalog/:id/tier-urls` - Update tier URLs
- `POST /admin/api-catalog/:id/health-check` - Check endpoint health
- `POST /admin/api-catalog/health-check-all` - Bulk health check
- `POST /admin/api-catalog/discover-new-apis` - Auto-discover new APIs

---

### **tokenRoutes.js** - Token Management
Manages authentication tokens and API keys.

**Routes:**
- `GET /admin/tokens/active` - List active tokens
- `GET /admin/tokens/api-keys` - List API keys
- `GET /admin/tokens/stats` - Token statistics
- `POST /admin/tokens/revoke/:id` - Revoke token
- `POST /admin/tokens/generate-api-key` - Generate API key
- `POST /admin/tokens/revoke-api-key/:id` - Revoke API key

---

### **billingRoutes.js** - Billing & Invoicing
Comprehensive billing and invoice management.

**Routes:**
- `GET /admin/billing/companies` - List companies with billing info
- `GET /admin/billing/invoices` - List invoices (with filters)
- `GET /admin/billing/stats` - Billing statistics
- `POST /admin/billing/invoices` - Create invoice
- `GET /admin/billing/invoices/:id` - Get invoice details
- `PUT /admin/billing/invoices/:id` - Update invoice
- `DELETE /admin/billing/invoices/:id` - Delete invoice
- `POST /admin/billing/invoices/:id/send` - Send invoice email
- `POST /admin/billing/invoices/:id/mark-paid` - Mark as paid
- `POST /admin/billing/invoices/:id/cancel` - Cancel invoice
- `POST /admin/billing/invoices/:id/remind` - Send reminder
- `POST /admin/billing/payments` - Record payment

---

### **securityRoutes.js** - Security Settings
Manages security configurations and monitoring.

**Routes:**
- `GET /admin/security/status` - Security status overview
- `POST /admin/security/settings` - Update security settings
- `POST /admin/security/test-connection` - Test external connections

---

## 🔧 Usage

### Import in your main server:

```javascript
import adminRoutes from './routes/admin/index.js';

app.use('/admin', requireSuperadmin, adminRoutes);
```

### Adding a new route module:

1. Create new file in `routes/admin/` (e.g., `usersRoutes.js`)
2. Import dependencies and create router
3. Define routes with relative paths
4. Export default router
5. Import and mount in `routes/admin/index.js`

Example:

```javascript
// routes/admin/usersRoutes.js
import express from 'express';
import User from '../../models/User.js';
import { logAction } from './utils/auditLogger.js';

const router = express.Router();

router.get('/', async (req, res) => {
  // GET /admin/users
  const users = await User.find();
  res.json(users);
});

export default router;
```

```javascript
// routes/admin/index.js
import usersRoutes from './usersRoutes.js';

router.use('/users', usersRoutes);
```

## 🧪 Testing

Each module can be tested independently:

```javascript
import request from 'supertest';
import express from 'express';
import tierRoutes from './tierRoutes.js';

const app = express();
app.use(express.json());
app.use('/tiers', tierRoutes);

describe('Tier Routes', () => {
  it('should list tiers', async () => {
    const res = await request(app).get('/tiers');
    expect(res.status).toBe(200);
  });
});
```

## 📝 Migration Notes

- **Old file**: `routes/adminRoutes.js` (2224 lines) → **Backed up** to `adminRoutes.js.backup`
- **New structure**: 14 files (average 150 lines each)
- **No breaking changes**: All routes maintain the same paths
- **Audit logging**: Centralized in `utils/auditLogger.js`
- **Dependencies**: Each module imports only what it needs

## 🚀 Next Steps

1. ✅ Backup original file
2. ✅ Create modular structure
3. ✅ Update server.js import
4. ⏳ Test all routes
5. ⏳ Update API documentation
6. ⏳ Remove old adminRoutes.js after verification

## 📊 File Size Comparison

| File | Lines | Description |
|------|-------|-------------|
| **OLD: adminRoutes.js** | 2224 | Monolithic |
| **NEW: index.js** | 50 | Main router |
| **NEW: configRoutes.js** | 75 | Config CRUD |
| **NEW: tierRoutes.js** | 180 | Tier management |
| **NEW: statisticsRoutes.js** | 320 | Analytics |
| **NEW: classificationRoutes.js** | 60 | Classifications |
| **NEW: printerRoutes.js** | 60 | Printers |
| **NEW: pipelineRoutes.js** | 60 | Pipelines |
| **NEW: apiEndpointRoutes.js** | 60 | API endpoints |
| **NEW: auditRoutes.js** | 30 | Audit logs |
| **NEW: promptRoutes.js** | 220 | Prompts |
| **NEW: searchRoutes.js** | 70 | Search configs |
| **NEW: apiCatalogRoutes.js** | 180 | API catalog |
| **NEW: tokenRoutes.js** | 150 | Tokens |
| **NEW: billingRoutes.js** | 420 | Billing |
| **NEW: securityRoutes.js** | 200 | Security |
| **NEW: auditLogger.js** | 35 | Utility |
| **TOTAL** | ~2,190 | Modular |

---

**✨ Result**: Professional, maintainable, scalable architecture ready for team collaboration!
