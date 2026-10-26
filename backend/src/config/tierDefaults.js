// Verified Tier Default Configurations
// These configurations match the actual deployed AI service settings

const tierDefaults = {
  basic: {
    tier: 'basic',
    displayName: 'Basic Tier',
    description: 'Entry-level AI features with standard models',
    
    // Feature limits
    features: {
      maxDocuments: 1000,
      maxStorageGB: 10,
      maxUsers: 10,
      aiFeatures: {
        ocr: true,
        semanticSearch: true,
        conversationalSearch: true,
        classification: true,
        structuredExtraction: true,
        entityExtraction: false, // Disabled for basic
        summarization: true,
        qaSystem: true,
        documentScanner: true,
        batchProcessing: true
      }
    },
    
    // AI Service URLs (Tier 1)
    assignedAPIs: {
      ai_service: 'http://localhost:9000',
      llamafile: 'http://localhost:8080',
      backend: 'http://localhost:8000',
      control_panel: 'http://localhost:4000'
    },
    
    // Performance flags - Basic Tier (Conservative)
    // Matches CompanyTierConfig basic tier defaults
    performanceFlags: {
      // Pipeline Step Toggles (11) - ✅ ALL ENABLED
      ENABLE_PDF_SPLITTING: true,
      ENABLE_OCR_VALIDATION: true,
      ENABLE_CLASSIFICATION: true,
      ENABLE_SIGNATURE_DETECTION: true,       // ✅ Enabled
      ENABLE_SIGNATURE_VALIDATION: true,      // ✅ Enabled
      ENABLE_STRUCTURED_EXTRACTION: true,
      ENABLE_ENTITY_EXTRACTION: true,
      ENABLE_SUMMARY: true,
      ENABLE_EMBEDDING_GENERATION: true,
      ENABLE_MONGODB_STORAGE: true,
      
      // Basic Parameters (4)
      SIMILARITY_THRESHOLD: 0.5,
      OCR_DPI: 300,
      YOLO_CONFIDENCE: 0.5,
      CLASSIFICATION_MIN_CONFIDENCE: 0.08,
      
      // Advanced Parameters (8) - Conservative settings
      LLAMA_TEMPERATURE: 0.3,                 // Low creativity (focused)
      LLAMA_MAX_TOKENS: 512,                  // Short summaries
      OCR_CONFIDENCE_THRESHOLD: 50,           // Moderate OCR quality
      SIGNATURE_CONFIDENCE_THRESHOLD: 0.7,    // High confidence required
      SEARCH_TOP_K_DEFAULT: 5,                // Few search results
      MAX_GPU_MEMORY_MB: 4096,                // 4GB GPU limit
      GPU_LAYERS: 20,                         // Moderate GPU usage
      MAX_PDF_SIZE_MB: 50                     // 50MB document limit
    },
    
    // AI Models configuration
    models: {
      ocr: {
        primary: 'paddleocr',
        fallback: 'trocr',
        paddleocr: {
          name: 'PaddleOCR',
          version: '2.7.0',
          language: 'en',
          status: 'active',
          dimensions: null
        },
        trocr: {
          name: 'TrOCR Large',
          version: 'microsoft/trocr-large-printed',
          status: 'active',
          dimensions: null
        }
      },
      embeddings: {
        model: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
        name: 'paraphrase-multilingual-MiniLM-L12-v2',
        dimensions: 384,
        status: 'active',
        maxSequenceLength: 256
      },
      search: {
        semantic: {
          model: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
          dimensions: 384,
          status: 'active'
        },
        conversational: {
          model: 'llama-3.2-3b-instruct',
          provider: 'llamafile',
          port: 8080,
          status: 'active'
        }
      },
      llm: {
        model: 'llama-3.2-3b-instruct',
        name: 'Llama 3.2 3B Instruct',
        provider: 'llamafile',
        contextWindow: 8192,
        status: 'active',
        parameters: {
          temperature: 0.7,
          maxTokens: 1024,
          topP: 0.9
        }
      },
      classification: {
        model: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
        name: 'paraphrase-multilingual-MiniLM-L12-v2',
        dimensions: 384,
        status: 'active'
      },
      objectDetection: {
        model: 'yolov8n',
        name: 'YOLOv8 Nano',
        version: 'ultralytics/yolov8n',
        status: 'active'
      }
    },
    
    // Rate limits
    rateLimits: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      concurrentRequests: 5,
      maxFileSize: 10, // MB
      maxBatchSize: 10
    },
    
    // Timeouts
    timeouts: {
      ocr: 30000,           // 30 seconds
      search: 10000,        // 10 seconds
      qa: 30000,            // 30 seconds
      classification: 10000, // 10 seconds
      upload: 60000         // 60 seconds
    },
    
    // Configuration
    configuration: {
      ports: {
        ai_service: 9000,
        llamafile: 8080,
        backend: 8000,
        control_panel: 4000
      },
      dataRetention: {
        documents: 365,      // days
        logs: 90,            // days
        auditLogs: 730       // 2 years
      },
      supportedFileTypes: [
        'pdf', 'png', 'jpg', 'jpeg', 'tiff', 'bmp'
      ],
      maxFileSize: 10485760, // 10 MB in bytes
      chunkSize: 512,        // tokens for text chunking
      overlapSize: 50        // token overlap for chunks
    },
    
    // Support & SLA
    support: {
      level: 'community',
      responseTime: '48 hours',
      channels: ['email'],
      sla: {
        uptime: 99.0,        // 99.0% uptime
        support: 'business_hours'
      }
    }
  },
  
  plus: {
    tier: 'plus',
    displayName: 'Plus Tier',
    description: 'Enhanced AI features with advanced models',
    
    features: {
      maxDocuments: 10000,
      maxStorageGB: 100,
      maxUsers: 50,
      aiFeatures: {
        ocr: true,
        semanticSearch: true,
        conversationalSearch: true,
        classification: true,
        structuredExtraction: true,
        entityExtraction: true,  // Enabled for plus
        summarization: true,
        qaSystem: true,
        documentScanner: true,
        batchProcessing: true,
        advancedAnalytics: true  // Plus exclusive
      }
    },
    
    assignedAPIs: {
      ai_service: 'http://localhost:9001',
      llamafile: 'http://localhost:8081',
      backend: 'http://localhost:8000',
      control_panel: 'http://localhost:4000'
    },
    
    // Performance flags - Plus Tier (Balanced)
    // Matches CompanyTierConfig plus tier defaults
    performanceFlags: {
      // Pipeline Step Toggles (11) - ✅ ALL ENABLED
      ENABLE_PDF_SPLITTING: true,
      ENABLE_OCR_VALIDATION: true,
      ENABLE_CLASSIFICATION: true,
      ENABLE_SIGNATURE_DETECTION: true,
      ENABLE_SIGNATURE_VALIDATION: true,
      ENABLE_STRUCTURED_EXTRACTION: true,
      ENABLE_ENTITY_EXTRACTION: true,
      ENABLE_SUMMARY: true,
      ENABLE_EMBEDDING_GENERATION: true,
      ENABLE_MONGODB_STORAGE: true,
      
      // Basic Parameters (3)
      SIMILARITY_THRESHOLD: 0.6,              // More aggressive splitting
      OCR_DPI: 400,                           // Higher resolution
      YOLO_CONFIDENCE: 0.45,                  // More sensitive detection
      
      // Advanced Parameters (8) - Balanced settings
      LLAMA_TEMPERATURE: 0.5,                 // Moderate creativity
      LLAMA_MAX_TOKENS: 768,                  // Longer summaries
      OCR_CONFIDENCE_THRESHOLD: 40,           // Accept lower OCR quality
      SIGNATURE_CONFIDENCE_THRESHOLD: 0.6,    // Balanced confidence
      SEARCH_TOP_K_DEFAULT: 10,               // More search results
      MAX_GPU_MEMORY_MB: 6144,                // 6GB GPU limit
      GPU_LAYERS: 29,                         // High GPU usage
      MAX_PDF_SIZE_MB: 100                    // 100MB document limit
    },
    
    models: {
      ocr: {
        primary: 'trocr',
        fallback: 'paddleocr',
        trocr: {
          name: 'TrOCR Large Handwritten',
          version: 'microsoft/trocr-large-handwritten',
          status: 'active'
        },
        paddleocr: {
          name: 'PaddleOCR',
          version: '2.7.0',
          status: 'active'
        }
      },
      embeddings: {
        model: 'sentence-transformers/all-MiniLM-L12-v2',
        name: 'MiniLM-L12-v2',
        dimensions: 768,     // Larger embeddings
        maxSequenceLength: 512
      },
      llm: {
        model: 'llama-3.2-7b-instruct',
        name: 'Llama 3.2 7B Instruct',
        contextWindow: 16384,
        parameters: {
          temperature: 0.7,
          maxTokens: 2048,
          topP: 0.9
        }
      }
    },
    
    rateLimits: {
      requestsPerMinute: 120,
      requestsPerHour: 5000,
      concurrentRequests: 10,
      maxFileSize: 50, // MB
      maxBatchSize: 50
    },
    
    timeouts: {
      ocr: 60000,
      search: 15000,
      qa: 60000,
      classification: 15000,
      upload: 120000
    },
    
    configuration: {
      ports: {
        ai_service: 9001,
        llamafile: 8081,
        backend: 8000,
        control_panel: 4000
      },
      dataRetention: {
        documents: 730,      // 2 years
        logs: 180,
        auditLogs: 1460      // 4 years
      },
      supportedFileTypes: [
        'pdf', 'png', 'jpg', 'jpeg', 'tiff', 'bmp', 'docx', 'xlsx'
      ],
      maxFileSize: 52428800, // 50 MB
      chunkSize: 1024,
      overlapSize: 100
    },
    
    support: {
      level: 'priority',
      responseTime: '12 hours',
      channels: ['email', 'chat'],
      sla: {
        uptime: 99.5,
        support: '8/5'
      }
    }
  },
  
  pro: {
    tier: 'pro',
    displayName: 'Professional Tier',
    description: 'Enterprise-grade AI with premium models and unlimited features',
    
    features: {
      maxDocuments: -1,     // Unlimited
      maxStorageGB: -1,     // Unlimited
      maxUsers: -1,         // Unlimited
      aiFeatures: {
        ocr: true,
        semanticSearch: true,
        conversationalSearch: true,
        classification: true,
        structuredExtraction: true,
        entityExtraction: true,
        summarization: true,
        qaSystem: true,
        documentScanner: true,
        batchProcessing: true,
        advancedAnalytics: true,
        customModels: true,        // Pro exclusive
        apiAccess: true,           // Pro exclusive
        whiteLabeling: true        // Pro exclusive
      }
    },
    
    assignedAPIs: {
      ai_service: 'http://localhost:9002',
      llamafile: 'http://localhost:8082',
      backend: 'http://localhost:8000',
      control_panel: 'http://localhost:4000'
    },
    
    // Performance flags - Pro Tier (Aggressive)
    // Matches CompanyTierConfig pro tier defaults
    performanceFlags: {
      // Pipeline Step Toggles (11) - ✅ ALL ENABLED
      ENABLE_PDF_SPLITTING: true,
      ENABLE_OCR_VALIDATION: true,
      ENABLE_CLASSIFICATION: true,
      ENABLE_SIGNATURE_DETECTION: true,
      ENABLE_SIGNATURE_VALIDATION: true,
      ENABLE_STRUCTURED_EXTRACTION: true,
      ENABLE_ENTITY_EXTRACTION: true,
      ENABLE_SUMMARY: true,
      ENABLE_EMBEDDING_GENERATION: true,
      ENABLE_MONGODB_STORAGE: true,
      
      // Basic Parameters (3)
      SIMILARITY_THRESHOLD: 0.7,              // Aggressive splitting
      OCR_DPI: 600,                           // Maximum resolution
      YOLO_CONFIDENCE: 0.4,                   // Very sensitive detection
      
      // Advanced Parameters (8) - Aggressive settings
      LLAMA_TEMPERATURE: 0.7,                 // High creativity
      LLAMA_MAX_TOKENS: 1024,                 // Very long summaries
      OCR_CONFIDENCE_THRESHOLD: 30,           // Accept low OCR quality
      SIGNATURE_CONFIDENCE_THRESHOLD: 0.5,    // Low threshold (catch all)
      SEARCH_TOP_K_DEFAULT: 20,               // Many search results
      MAX_GPU_MEMORY_MB: 8192,                // 8GB GPU limit
      GPU_LAYERS: 35,                         // Full GPU offloading
      MAX_PDF_SIZE_MB: 500,                   // 500MB document limit
      
      // Pro exclusive features
      advanced_analytics: true,
      auto_tuning: true                       // Enable ML-based optimization
    },
    
    models: {
      ocr: {
        primary: 'trocr',
        fallback: 'paddleocr',
        ensemble: true,              // Pro uses ensemble
        trocr: {
          name: 'TrOCR Large Handwritten',
          version: 'microsoft/trocr-large-handwritten',
          status: 'active'
        }
      },
      embeddings: {
        model: 'openai/text-embedding-3-large',
        name: 'OpenAI Embeddings Large',
        dimensions: 1536,            // Premium embeddings
        maxSequenceLength: 8192
      },
      llm: {
        model: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        contextWindow: 128000,
        parameters: {
          temperature: 0.7,
          maxTokens: 4096,
          topP: 0.9
        }
      }
    },
    
    rateLimits: {
      requestsPerMinute: -1,       // Unlimited
      requestsPerHour: -1,         // Unlimited
      concurrentRequests: 50,
      maxFileSize: 500,            // 500 MB
      maxBatchSize: 500
    },
    
    timeouts: {
      ocr: 120000,
      search: 30000,
      qa: 120000,
      classification: 30000,
      upload: 300000
    },
    
    configuration: {
      ports: {
        ai_service: 9002,
        llamafile: 8082,
        backend: 8000,
        control_panel: 4000
      },
      dataRetention: {
        documents: -1,       // Unlimited
        logs: -1,            // Unlimited
        auditLogs: -1        // Unlimited
      },
      supportedFileTypes: [
        'pdf', 'png', 'jpg', 'jpeg', 'tiff', 'bmp', 'docx', 'xlsx', 
        'pptx', 'txt', 'csv', 'rtf', 'odt'
      ],
      maxFileSize: 524288000, // 500 MB
      chunkSize: 2048,
      overlapSize: 200
    },
    
    support: {
      level: 'enterprise',
      responseTime: '1 hour',
      channels: ['email', 'chat', 'phone', 'dedicated_manager'],
      sla: {
        uptime: 99.9,
        support: '24/7'
      }
    }
  }
};

// Helper function to get tier by name
function getTierDefaults(tierName) {
  return tierDefaults[tierName] || tierDefaults.basic;
}

// Helper function to get all tier names
function getAllTierNames() {
  return Object.keys(tierDefaults);
}

// Helper function to compare tiers
function compareTiers(tierA, tierB) {
  const tierOrder = { basic: 1, plus: 2, pro: 3 };
  return tierOrder[tierB] - tierOrder[tierA]; // Returns positive if tierB > tierA
}

export {
  tierDefaults,
  getTierDefaults,
  getAllTierNames,
  compareTiers
};

export default tierDefaults;
