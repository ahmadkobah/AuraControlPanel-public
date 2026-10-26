import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// ============ STATISTICS ============
router.get('/', async (req, res) => {
  try {
    const { period = 'month', companyId = 'all' } = req.query;
    
    // Calculate date filter
    const now = new Date();
    let dateFilter = {};
    switch (period) {
      case 'day':
        dateFilter = { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
        break;
      case 'week':
        dateFilter = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case 'month':
        dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
        break;
      case 'year':
        dateFilter = { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
        break;
      default:
        dateFilter = {}; // all time
    }

    // Get models
    let User, Company, Department, Document, AuditLog;
    try {
      User = mongoose.model('User');
    } catch {
      const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
      User = mongoose.model('User', userSchema);
    }
    try {
      Company = mongoose.model('Company');
    } catch {
      const companySchema = new mongoose.Schema({}, { strict: false, collection: 'companies' });
      Company = mongoose.model('Company', companySchema);
    }
    try {
      Department = mongoose.model('Department');
    } catch {
      const deptSchema = new mongoose.Schema({}, { strict: false, collection: 'departments' });
      Department = mongoose.model('Department', deptSchema);
    }
    try {
      Document = mongoose.model('Document');
    } catch {
      const docSchema = new mongoose.Schema({}, { strict: false, collection: 'documents' });
      Document = mongoose.model('Document', docSchema);
    }
    try {
      AuditLog = mongoose.model('AuditLog');
    } catch {
      const auditSchema = new mongoose.Schema({}, { strict: false, collection: 'auditlogs' });
      AuditLog = mongoose.model('AuditLog', auditSchema);
    }

    // Build company filter
    const companyFilter = companyId !== 'all' ? { companyId: new mongoose.Types.ObjectId(companyId) } : {};

    // Overview statistics
    const [totalUsers, totalDocuments, totalCompanies, totalDepartments] = await Promise.all([
      User.countDocuments({ ...companyFilter, isDeleted: { $ne: true } }),
      Document.countDocuments({ ...companyFilter, isDeleted: { $ne: true } }),
      Company.countDocuments({ isDeleted: { $ne: true } }),
      Department.countDocuments({ ...companyFilter, isDeleted: { $ne: true } })
    ]);

    // Tier distribution
    const companies = await Company.find({ isDeleted: { $ne: true } }).select('tier');
    const tierDistribution = {
      basic: companies.filter(c => c.tier === 'basic').length,
      plus: companies.filter(c => c.tier === 'plus').length,
      pro: companies.filter(c => c.tier === 'pro').length,
      none: companies.filter(c => !c.tier || c.tier === 'none').length
    };

    // Document statistics
    const documents = await Document.find({ 
      ...companyFilter, 
      isDeleted: { $ne: true },
      ...(dateFilter.$gte && { createdAt: dateFilter })
    }).select('status classification');

    const documentsByStatus = {
      pending: documents.filter(d => d.status === 'pending' || d.status === 'uploaded').length,
      processing: documents.filter(d => d.status === 'processing').length,
      completed: documents.filter(d => d.status === 'completed' || d.status === 'processed').length,
      failed: documents.filter(d => d.status === 'failed' || d.status === 'error').length
    };

    const classificationCounts = {};
    documents.forEach(d => {
      const cls = d.classification || 'unclassified';
      classificationCounts[cls] = (classificationCounts[cls] || 0) + 1;
    });

    // AI Service statistics (from audit logs)
    const aiLogs = await AuditLog.find({
      category: { $in: ['ai', 'classification', 'ocr', 'extraction'] },
      ...(dateFilter.$gte && { createdAt: dateFilter })
    });

    const aiRequests = aiLogs.length;
    const aiSuccess = aiLogs.filter(l => l.success !== false).length;
    const aiSuccessRate = aiRequests > 0 ? Math.round((aiSuccess / aiRequests) * 100) : 0;
    
    // Calculate average response time from audit logs (if available)
    const logsWithDuration = aiLogs.filter(l => l.changes?.duration);
    const avgResponseTime = logsWithDuration.length > 0
      ? Math.round(logsWithDuration.reduce((sum, l) => sum + (l.changes.duration || 0), 0) / logsWithDuration.length)
      : 0;

    // AI requests by endpoint
    const endpointCounts = {};
    aiLogs.forEach(l => {
      const endpoint = l.changes?.endpoint || l.targetType || 'unknown';
      endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + 1;
    });

    // ============ AI PROCESSING METRICS (from document_processing DB) ============
    // Connect to document_processing database to get table extraction stats
    let aiProcessingStats = {
      totalProcessed: 0,
      tablesExtracted: 0,
      signaturesDetected: 0,
      avgTablesPerDoc: 0,
      tableExtractionEnabled: true,
      byDocumentType: {},
      byExtractionSource: {
        ppstructure: 0,
        llama_text: 0
      }
    };

    try {
      // Try to query the document_processing database
      const docProcessingDb = mongoose.connection.useDb('document_processing');
      const aiDocsCollection = docProcessingDb.collection('documents');
      
      // Get all completed AI documents
      const aiDocs = await aiDocsCollection.find({
        status: 'COMPLETE',
        ...(dateFilter.$gte && { processing_completed: dateFilter })
      }).toArray();

      aiProcessingStats.totalProcessed = aiDocs.length;

      // Aggregate table and signature stats
      aiDocs.forEach(doc => {
        if (doc.processed_data && Array.isArray(doc.processed_data)) {
          doc.processed_data.forEach(page => {
            // Count tables
            if (page.tables && Array.isArray(page.tables)) {
              aiProcessingStats.tablesExtracted += page.tables.length;
              
              // Count by extraction source
              page.tables.forEach(table => {
                if (table.source === 'llama_text_extraction') {
                  aiProcessingStats.byExtractionSource.llama_text++;
                } else {
                  aiProcessingStats.byExtractionSource.ppstructure++;
                }
              });
            }
            
            // Count signatures
            if (page.signature_detected) {
              aiProcessingStats.signaturesDetected++;
            }
            
            // Count by document type
            if (page.classification?.label) {
              const docType = page.classification.label;
              aiProcessingStats.byDocumentType[docType] = (aiProcessingStats.byDocumentType[docType] || 0) + 1;
            }
          });
        }
      });

      // Calculate average tables per document
      if (aiProcessingStats.totalProcessed > 0) {
        aiProcessingStats.avgTablesPerDoc = parseFloat(
          (aiProcessingStats.tablesExtracted / aiProcessingStats.totalProcessed).toFixed(2)
        );
      }
    } catch (err) {
      console.warn('Could not fetch AI processing stats:', err.message);
    }

    // User activity
    const users = await User.find({ 
      ...companyFilter, 
      isDeleted: { $ne: true } 
    }).select('role lastLoginAt createdAt');

    const activeUsers = users.filter(u => {
      if (!u.lastLoginAt) return false;
      const daysSinceLogin = (now - new Date(u.lastLoginAt)) / (1000 * 60 * 60 * 24);
      return daysSinceLogin <= 30;
    }).length;

    const usersByRole = {
      admin: users.filter(u => u.role === 'admin' || u.role === 'superadmin').length,
      manager: users.filter(u => u.role === 'manager').length,
      user: users.filter(u => u.role === 'user' || !u.role).length
    };

    // Top performers
    const documentsByCompany = await Document.aggregate([
      { $match: { isDeleted: { $ne: true }, ...(dateFilter.$gte && { createdAt: dateFilter }) } },
      { $group: { _id: '$companyId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const topCompanies = await Promise.all(
      documentsByCompany.map(async (item) => {
        if (!item._id) return null;
        const company = await Company.findById(item._id).select('name');
        return company ? { name: company.name, count: item.count } : null;
      })
    );

    const documentsByDepartment = await Document.aggregate([
      { $match: { isDeleted: { $ne: true }, ...(dateFilter.$gte && { createdAt: dateFilter }) } },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const topDepartments = await Promise.all(
      documentsByDepartment.map(async (item) => {
        if (!item._id) return null;
        const dept = await Department.findById(item._id).select('name');
        return dept ? { name: dept.name, count: item.count } : null;
      })
    );

    const documentsByUser = await Document.aggregate([
      { $match: { isDeleted: { $ne: true }, ...(dateFilter.$gte && { createdAt: dateFilter }) } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const topUsers = await Promise.all(
      documentsByUser.map(async (item) => {
        if (!item._id) return null;
        const user = await User.findById(item._id).select('firstName lastName');
        return user ? { name: `${user.firstName} ${user.lastName}`, count: item.count } : null;
      })
    );

    const stats = {
      overview: {
        totalUsers,
        totalDocuments,
        totalCompanies,
        totalDepartments
      },
      tierDistribution,
      documents: {
        byStatus: documentsByStatus,
        byClassification: classificationCounts
      },
      aiServices: {
        totalRequests: aiRequests,
        successRate: aiSuccessRate,
        avgResponseTime,
        byEndpoint: endpointCounts
      },
      aiProcessing: aiProcessingStats,  // NEW: Table extraction and signature stats
      users: {
        activeUsers,
        activePercentage: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
        byRole: usersByRole
      },
      topPerformers: {
        companies: topCompanies.filter(Boolean),
        departments: topDepartments.filter(Boolean),
        users: topUsers.filter(Boolean)
      }
    };

    return res.json({ stats });
  } catch (err) {
    console.error('Statistics error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ============ COMPANIES ============
router.get('/companies', async (req, res) => {
  try {
    // Try to get Company model from Aura database or create temporary one
    let Company;
    try {
      Company = mongoose.model('Company');
    } catch {
      const companySchema = new mongoose.Schema({
        name: String,
        email: String,
        phone: String,
        address: String,
        tier: String,
        isDeleted: { type: Boolean, default: false }
      }, { collection: 'companies' });
      Company = mongoose.model('Company', companySchema);
    }
    
    const companies = await Company.find({ isDeleted: { $ne: true } }).select('name email tier').sort({ name: 1 });
    return res.json({ companies });
  } catch (err) {
    console.error('Error fetching companies:', err);
    return res.json({ companies: [] }); // Return empty array if no companies collection
  }
});

// ============ DEPARTMENTS ============
router.get('/departments', async (req, res) => {
  try {
    // Try to get Department model from Aura database or create temporary one
    let Department;
    try {
      Department = mongoose.model('Department');
    } catch {
      const departmentSchema = new mongoose.Schema({
        name: String,
        companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
        isDeleted: { type: Boolean, default: false }
      }, { collection: 'departments' });
      Department = mongoose.model('Department', departmentSchema);
    }
    
    const departments = await Department.find({ isDeleted: { $ne: true } })
      .populate('companyId', 'name')
      .select('name companyId')
      .sort({ name: 1 });
    return res.json({ departments });
  } catch (err) {
    console.error('Error fetching departments:', err);
    return res.json({ departments: [] }); // Return empty array if no departments collection
  }
});

export default router;
