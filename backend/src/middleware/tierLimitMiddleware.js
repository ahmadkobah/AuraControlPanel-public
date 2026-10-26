/**
 * Tier Limit Enforcement Middleware
 * 
 * Validates operations against tier-based limits:
 * - User creation/count limits
 * - Department creation/count limits
 * - Document size/count limits
 * - Printer count limits
 * - Storage limits
 * 
 * Usage:
 *   import { enforceTierLimits } from './middleware/tierLimitMiddleware.js';
 *   router.post('/users', enforceTierLimits('users'), createUser);
 */

import CompanyTier from '../models/CompanyTier.js';

/**
 * Get tier limits for a company
 * 
 * @param {String} companyId - Company ID
 * @returns {Object} Tier configuration with limits
 */
async function getCompanyTierLimits(companyId) {
  try {
    const companyTier = await CompanyTier.findOne({ companyId }).populate('companyId');
    
    if (!companyTier) {
      // Return basic tier defaults if no tier found
      return {
        tier: 'basic',
        maxUsers: 10,
        maxDepartments: 5,
        maxDocuments: 1000,
        maxStorageGB: 10,
        maxPrinters: 2,
        maxFileSize: 10 // MB
      };
    }
    
    return {
      tier: companyTier.tier,
      maxUsers: companyTier.maxUsers,
      maxDepartments: companyTier.maxDepartments,
      maxDocuments: companyTier.maxDocuments,
      maxStorageGB: companyTier.maxStorageGB,
      maxPrinters: companyTier.maxPrinters,
      maxFileSize: companyTier.maxFileSize
    };
  } catch (error) {
    console.error('Error fetching tier limits:', error);
    // Return basic tier as safe fallback
    return {
      tier: 'basic',
      maxUsers: 10,
      maxDepartments: 5,
      maxDocuments: 1000,
      maxStorageGB: 10,
      maxPrinters: 2,
      maxFileSize: 10
    };
  }
}

/**
 * Check if limit is unlimited (-1)
 */
function isUnlimited(limit) {
  return limit === -1 || limit === '-1' || limit === null;
}

/**
 * Middleware factory for enforcing tier limits
 * 
 * @param {String} resourceType - Type of resource ('users', 'departments', 'documents', 'printers')
 * @returns {Function} Express middleware
 */
export function enforceTierLimits(resourceType) {
  return async (req, res, next) => {
    try {
      // Extract company ID from request
      const companyId = req.body.companyId || req.params.companyId || req.user?.companyId;
      
      if (!companyId) {
        // No company ID - allow operation (admin operations)
        return next();
      }
      
      // Get tier limits
      const tierLimits = await getCompanyTierLimits(companyId);
      
      // Resource-specific validation
      switch (resourceType) {
        case 'users':
          await validateUserLimit(companyId, tierLimits, req, res, next);
          break;
        case 'departments':
          await validateDepartmentLimit(companyId, tierLimits, req, res, next);
          break;
        case 'documents':
          await validateDocumentLimit(companyId, tierLimits, req, res, next);
          break;
        case 'printers':
          await validatePrinterLimit(companyId, tierLimits, req, res, next);
          break;
        default:
          next();
      }
    } catch (error) {
      console.error('Tier limit enforcement error:', error);
      return res.status(500).json({
        error: 'Failed to validate tier limits',
        details: error.message
      });
    }
  };
}

/**
 * Validate user creation against tier limit
 */
async function validateUserLimit(companyId, tierLimits, req, res, next) {
  if (isUnlimited(tierLimits.maxUsers)) {
    return next();
  }
  
  try {
    // Import dynamically to avoid circular dependencies
    const { default: User } = await import('../models/User.js');
    
    const currentUserCount = await User.countDocuments({ companyId });
    
    if (currentUserCount >= tierLimits.maxUsers) {
      return res.status(403).json({
        error: 'User limit reached',
        message: `Your ${tierLimits.tier} tier allows up to ${tierLimits.maxUsers} users. You currently have ${currentUserCount} users.`,
        currentCount: currentUserCount,
        limit: tierLimits.maxUsers,
        tier: tierLimits.tier,
        upgradeRequired: true,
        upgradeUrl: '/admin/companies/upgrade'
      });
    }
    
    // Attach limit info to request for controller use
    req.tierInfo = {
      currentCount: currentUserCount,
      limit: tierLimits.maxUsers,
      remaining: tierLimits.maxUsers - currentUserCount,
      tier: tierLimits.tier
    };
    
    next();
  } catch (error) {
    console.error('User limit validation error:', error);
    next(); // Allow operation on validation error
  }
}

/**
 * Validate department creation against tier limit
 */
async function validateDepartmentLimit(companyId, tierLimits, req, res, next) {
  if (isUnlimited(tierLimits.maxDepartments)) {
    return next();
  }
  
  try {
    const { default: Department } = await import('../models/Department.js');
    
    const currentDepartmentCount = await Department.countDocuments({ companyId });
    
    if (currentDepartmentCount >= tierLimits.maxDepartments) {
      return res.status(403).json({
        error: 'Department limit reached',
        message: `Your ${tierLimits.tier} tier allows up to ${tierLimits.maxDepartments} departments. You currently have ${currentDepartmentCount} departments.`,
        currentCount: currentDepartmentCount,
        limit: tierLimits.maxDepartments,
        tier: tierLimits.tier,
        upgradeRequired: true,
        upgradeUrl: '/admin/companies/upgrade'
      });
    }
    
    req.tierInfo = {
      currentCount: currentDepartmentCount,
      limit: tierLimits.maxDepartments,
      remaining: tierLimits.maxDepartments - currentDepartmentCount,
      tier: tierLimits.tier
    };
    
    next();
  } catch (error) {
    console.error('Department limit validation error:', error);
    next();
  }
}

/**
 * Validate document upload against tier limits
 */
async function validateDocumentLimit(companyId, tierLimits, req, res, next) {
  try {
    // Check file size limit
    if (req.file && req.file.size) {
      const fileSizeMB = req.file.size / (1024 * 1024);
      
      if (!isUnlimited(tierLimits.maxFileSize) && fileSizeMB > tierLimits.maxFileSize) {
        return res.status(413).json({
          error: 'File size limit exceeded',
          message: `Your ${tierLimits.tier} tier allows files up to ${tierLimits.maxFileSize}MB. This file is ${fileSizeMB.toFixed(2)}MB.`,
          fileSize: fileSizeMB,
          limit: tierLimits.maxFileSize,
          tier: tierLimits.tier,
          upgradeRequired: true
        });
      }
    }
    
    // Check document count limit
    if (!isUnlimited(tierLimits.maxDocuments)) {
      const { default: Dokument } = await import('../models/Dokument.js');
      
      const currentDocumentCount = await Dokument.countDocuments({ companyId });
      
      if (currentDocumentCount >= tierLimits.maxDocuments) {
        return res.status(403).json({
          error: 'Document limit reached',
          message: `Your ${tierLimits.tier} tier allows up to ${tierLimits.maxDocuments} documents. You currently have ${currentDocumentCount} documents.`,
          currentCount: currentDocumentCount,
          limit: tierLimits.maxDocuments,
          tier: tierLimits.tier,
          upgradeRequired: true
        });
      }
      
      req.tierInfo = {
        currentCount: currentDocumentCount,
        limit: tierLimits.maxDocuments,
        remaining: tierLimits.maxDocuments - currentDocumentCount,
        tier: tierLimits.tier
      };
    }
    
    next();
  } catch (error) {
    console.error('Document limit validation error:', error);
    next();
  }
}

/**
 * Validate printer creation against tier limit
 */
async function validatePrinterLimit(companyId, tierLimits, req, res, next) {
  if (isUnlimited(tierLimits.maxPrinters)) {
    return next();
  }
  
  try {
    const { default: PrinterConfig } = await import('../models/PrinterConfig.js');
    
    const currentPrinterCount = await PrinterConfig.countDocuments({ companyId });
    
    if (currentPrinterCount >= tierLimits.maxPrinters) {
      return res.status(403).json({
        error: 'Printer limit reached',
        message: `Your ${tierLimits.tier} tier allows up to ${tierLimits.maxPrinters} printers. You currently have ${currentPrinterCount} printers.`,
        currentCount: currentPrinterCount,
        limit: tierLimits.maxPrinters,
        tier: tierLimits.tier,
        upgradeRequired: true,
        upgradeUrl: '/admin/companies/upgrade'
      });
    }
    
    req.tierInfo = {
      currentCount: currentPrinterCount,
      limit: tierLimits.maxPrinters,
      remaining: tierLimits.maxPrinters - currentPrinterCount,
      tier: tierLimits.tier
    };
    
    next();
  } catch (error) {
    console.error('Printer limit validation error:', error);
    next();
  }
}

/**
 * Middleware to attach tier info to response (for UI display)
 */
export function attachTierInfo(resourceType) {
  return async (req, res, next) => {
    const companyId = req.body.companyId || req.params.companyId || req.user?.companyId;
    
    if (!companyId) {
      return next();
    }
    
    try {
      const tierLimits = await getCompanyTierLimits(companyId);
      
      // Attach to response locals for use in routes
      res.locals.tierInfo = tierLimits;
      
      next();
    } catch (error) {
      console.error('Attach tier info error:', error);
      next();
    }
  };
}

export default {
  enforceTierLimits,
  attachTierInfo,
  getCompanyTierLimits
};
