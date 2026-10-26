import mongoose from 'mongoose';

/**
 * Auto-Filing Rule Schema
 * Defines rules for automatically organizing documents based on AI classification and extracted data
 */
const AutoFilingRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
      description: 'Human-readable name for the rule'
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      description: 'Detailed description of what this rule does'
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      description: 'Company this rule applies to'
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      description: 'Optional department scope'
    },
    isActive: {
      type: Boolean,
      default: true,
      description: 'Whether this rule is currently active'
    },
    priority: {
      type: Number,
      default: 100,
      min: 1,
      max: 1000,
      description: 'Rule execution priority (1=highest, 1000=lowest)'
    },
    
    // === CONDITIONS ===
    conditions: {
      documentTypes: {
        type: [String],
        default: [],
        description: 'Match specific document types (e.g., ["invoice", "receipt"]). Empty = match all'
      },
      entityRules: [{
        entityType: {
          type: String,
          description: 'Entity type to match (e.g., "vendor_name", "invoice_number")'
        },
        operator: {
          type: String,
          enum: ['equals', 'contains', 'startsWith', 'endsWith', 'regex', 'exists', 'not_exists'],
          default: 'exists'
        },
        value: {
          type: String,
          description: 'Value to compare (not used for exists/not_exists operators)'
        }
      }],
      structuredDataRules: [{
        field: {
          type: String,
          description: 'Field path in structuredData (e.g., "invoice_date", "total_amount")'
        },
        operator: {
          type: String,
          enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'exists', 'not_exists'],
          default: 'exists'
        },
        value: {
          type: mongoose.Schema.Types.Mixed,
          description: 'Value to compare (not used for exists/not_exists operators)'
        }
      }],
      confidence: {
        min: {
          type: Number,
          min: 0,
          max: 1,
          default: 0,
          description: 'Minimum confidence score (0-1) for AI classification'
        },
        max: {
          type: Number,
          min: 0,
          max: 1,
          default: 1,
          description: 'Maximum confidence score (0-1) for AI classification'
        }
      }
    },
    
    // === ACTIONS ===
    actions: {
      targetPath: {
        type: String,
        required: true,
        description: 'Target folder path template (e.g., "/Invoices/{year}/{month}/{vendor_name}")'
      },
      filenameTemplate: {
        type: String,
        description: 'Optional filename template (e.g., "{invoice_number}_{vendor_name}_{date}")'
      },
      createFolderStructure: {
        type: Boolean,
        default: true,
        description: 'Auto-create folder structure if it doesn\'t exist'
      },
      fallbackPath: {
        type: String,
        description: 'Fallback path if variables cannot be resolved (e.g., "/Invoices/Uncategorized")'
      }
    },
    
    // === METADATA ===
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      description: 'User who created this rule'
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      description: 'User who last modified this rule'
    },
    
    // === STATISTICS ===
    stats: {
      timesApplied: {
        type: Number,
        default: 0,
        description: 'Number of times this rule has been successfully applied'
      },
      lastApplied: {
        type: Date,
        description: 'Timestamp of last successful application'
      },
      successCount: {
        type: Number,
        default: 0,
        description: 'Number of successful applications'
      },
      failureCount: {
        type: Number,
        default: 0,
        description: 'Number of failed applications'
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// === INDEXES ===
AutoFilingRuleSchema.index({ companyId: 1, departmentId: 1, priority: 1 });
AutoFilingRuleSchema.index({ companyId: 1, isActive: 1 });
AutoFilingRuleSchema.index({ 'conditions.documentTypes': 1 });

// === VIRTUALS ===
AutoFilingRuleSchema.virtual('successRate').get(function() {
  const total = this.stats.successCount + this.stats.failureCount;
  if (total === 0) return 0;
  return (this.stats.successCount / total) * 100;
});

// === METHODS ===

/**
 * Evaluate if this rule matches a document
 * @param {object} documentData - Document data with classification, entities, structuredData
 * @returns {boolean} True if rule matches
 */
AutoFilingRuleSchema.methods.evaluate = function(documentData) {
  const { classification, entities = {}, structuredData = {} } = documentData;
  
  // Check document type
  if (this.conditions.documentTypes.length > 0) {
    const docType = classification?.document_type || 'other';
    if (!this.conditions.documentTypes.includes(docType)) {
      return false;
    }
  }
  
  // Check confidence range
  const confidence = classification?.confidence || 0;
  if (confidence < this.conditions.confidence.min || confidence > this.conditions.confidence.max) {
    return false;
  }
  
  // Check entity rules
  for (const rule of this.conditions.entityRules || []) {
    const entityValue = entities[rule.entityType];
    
    if (rule.operator === 'exists' && !entityValue) return false;
    if (rule.operator === 'not_exists' && entityValue) return false;
    
    if (entityValue && rule.value) {
      const value = String(entityValue);
      const expected = String(rule.value);
      
      switch (rule.operator) {
        case 'equals':
          if (value !== expected) return false;
          break;
        case 'contains':
          if (!value.includes(expected)) return false;
          break;
        case 'startsWith':
          if (!value.startsWith(expected)) return false;
          break;
        case 'endsWith':
          if (!value.endsWith(expected)) return false;
          break;
        case 'regex':
          try {
            const regex = new RegExp(expected);
            if (!regex.test(value)) return false;
          } catch {
            return false;
          }
          break;
      }
    }
  }
  
  // Check structured data rules
  for (const rule of this.conditions.structuredDataRules || []) {
    const fieldValue = structuredData[rule.field];
    
    if (rule.operator === 'exists' && fieldValue === undefined) return false;
    if (rule.operator === 'not_exists' && fieldValue !== undefined) return false;
    
    if (fieldValue !== undefined && rule.value !== undefined) {
      switch (rule.operator) {
        case 'equals':
          if (fieldValue != rule.value) return false; // Loose equality
          break;
        case 'not_equals':
          if (fieldValue == rule.value) return false;
          break;
        case 'greater_than':
          if (!(Number(fieldValue) > Number(rule.value))) return false;
          break;
        case 'less_than':
          if (!(Number(fieldValue) < Number(rule.value))) return false;
          break;
        case 'contains':
          if (!String(fieldValue).includes(String(rule.value))) return false;
          break;
      }
    }
  }
  
  return true;
};

/**
 * Apply this rule to generate target path
 * @param {object} documentData - Document data with classification, entities, structuredData
 * @returns {object} { targetPath, filename }
 */
AutoFilingRuleSchema.methods.apply = function(documentData) {
  const { structuredData = {} } = documentData;
  
  // Helper to replace variables in template
  const replaceVariables = (template) => {
    if (!template) return template;
    
    let result = template;
    
    // Date variables
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    result = result
      .replace(/\{year\}/g, year)
      .replace(/\{YYYY\}/g, year)
      .replace(/\{month\}/g, month)
      .replace(/\{MM\}/g, month)
      .replace(/\{day\}/g, day)
      .replace(/\{DD\}/g, day);
    
    // Structured data variables
    Object.keys(structuredData).forEach(key => {
      const value = structuredData[key];
      if (value) {
        const cleanValue = String(value).replace(/[<>:"/\\|?*]/g, '_');
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), cleanValue);
      }
    });
    
    // Clean remaining unresolved variables
    result = result.replace(/\{[^}]+\}/g, 'Unknown');
    
    return result;
  };
  
  let targetPath = replaceVariables(this.actions.targetPath);
  const filename = this.actions.filenameTemplate ? replaceVariables(this.actions.filenameTemplate) : null;
  
  // Use fallback if path contains 'Unknown'
  if (targetPath.includes('Unknown') && this.actions.fallbackPath) {
    targetPath = replaceVariables(this.actions.fallbackPath);
  }
  
  return { targetPath, filename };
};

/**
 * Increment application statistics
 * @param {boolean} success - Whether application was successful
 */
AutoFilingRuleSchema.methods.recordApplication = async function(success = true) {
  this.stats.timesApplied += 1;
  this.stats.lastApplied = new Date();
  
  if (success) {
    this.stats.successCount += 1;
  } else {
    this.stats.failureCount += 1;
  }
  
  await this.save();
};

const AutoFilingRule = mongoose.model('AutoFilingRule', AutoFilingRuleSchema);
export default AutoFilingRule;
