// Complete API Catalog - All 132 Endpoints Across Services
// This catalog serves as the source of truth for API endpoint configuration

const apiCatalog = {
  // ==================== AI SERVICE (15 endpoints) ====================
  ai_service: {
    ocr: [
      {
        id: 'ai_ocr_extract',
        name: 'OCR Extract Text',
        path: '/ocr/extract',
        method: 'POST',
        service: 'ai_service',
        category: 'ocr',
        description: 'Extract text from document images using PaddleOCR or TrOCR',
        requiredAuth: true,
        estimatedLatency: '2-5s',
        features: ['document_upload', 'text_extraction'],
        tierUrls: {
          basic: 'http://localhost:9000',
          plus: 'http://localhost:9001',
          pro: 'http://localhost:9002'
        },
        isDeployed: { basic: true, plus: false, pro: false }
      },
      {
        id: 'ai_ocr_validate',
        name: 'OCR Validate Results',
        path: '/ocr/validate',
        method: 'POST',
        service: 'ai_service',
        category: 'ocr',
        description: 'Validate OCR results against ground truth',
        requiredAuth: true,
        estimatedLatency: '1-2s',
        features: ['quality_assurance'],
        tierUrls: {
          basic: 'http://localhost:9000',
          plus: 'http://localhost:9001',
          pro: 'http://localhost:9002'
        },
        isDeployed: { basic: true, plus: false, pro: false }
      }
    ],
    search: [
      {
        id: 'ai_search_semantic',
        name: 'Semantic Search',
        path: '/api/v1/search',
        method: 'POST',
        service: 'ai_service',
        category: 'search',
        description: 'Vector-based semantic search using sentence transformers',
        requiredAuth: true,
        estimatedLatency: '500ms-1s',
        features: ['search_bar', 'document_discovery'],
        tierUrls: {
          basic: 'http://localhost:9000',
          plus: 'http://localhost:9001',
          pro: 'http://localhost:9002'
        },
        isDeployed: { basic: true, plus: false, pro: false }
      },
      {
        id: 'ai_search_conversational',
        name: 'Conversational Search',
        path: '/api/v1/conversational-search',
        method: 'POST',
        service: 'ai_service',
        category: 'search',
        description: 'Natural language search with Llama 3.2 3B',
        requiredAuth: true,
        estimatedLatency: '2-4s',
        features: ['search_bar', 'qa_system'],
        tierUrls: {
          basic: 'http://localhost:9000',
          plus: 'http://localhost:9001',
          pro: 'http://localhost:9002'
        },
        isDeployed: { basic: true, plus: false, pro: false }
      }
    ],
    qa: [
      {
        id: 'ai_qa_answer',
        name: 'Q&A Answer Generation',
        path: '/api/v1/qa',
        method: 'POST',
        service: 'ai_service',
        category: 'qa',
        description: 'Generate answers from document context using Llama',
        requiredAuth: true,
        estimatedLatency: '3-6s',
        features: ['qa_system', 'document_chat'],
        tierUrls: {
          basic: 'http://localhost:9000',
          plus: 'http://localhost:9001',
          pro: 'http://localhost:9002'
        },
        isDeployed: { basic: true, plus: false, pro: false }
      },
      {
        id: 'ai_qa_summarize',
        name: 'Document Summarization',
        path: '/api/v1/summarize',
        method: 'POST',
        service: 'ai_service',
        category: 'qa',
        description: 'Generate document summaries using LLM',
        requiredAuth: true,
        estimatedLatency: '4-8s',
        features: ['summarization', 'document_analysis'],
        tierUrls: {
          basic: 'http://localhost:9000',
          plus: 'http://localhost:9001',
          pro: 'http://localhost:9002'
        },
        isDeployed: { basic: true, plus: false, pro: false }
      }
    ],
    extraction: [
      {
        id: 'ai_extract_structured',
        name: 'Structured Data Extraction',
        path: '/extraction/structured',
        method: 'POST',
        service: 'ai_service',
        category: 'extraction',
        description: 'Extract structured data (tables, forms) from documents',
        requiredAuth: true,
        estimatedLatency: '3-5s',
        features: ['data_extraction', 'form_processing'],
        tierUrls: {
          basic: 'http://localhost:9000',
          plus: 'http://localhost:9001',
          pro: 'http://localhost:9002'
        },
        isDeployed: { basic: true, plus: false, pro: false }
      },
      {
        id: 'ai_extract_entities',
        name: 'Entity Extraction',
        path: '/extraction/entities',
        method: 'POST',
        service: 'ai_service',
        category: 'extraction',
        description: 'Extract named entities (dates, amounts, names) from text',
        requiredAuth: true,
        estimatedLatency: '1-3s',
        features: ['entity_recognition', 'metadata_extraction'],
        tierUrls: {
          basic: 'http://localhost:9000',
          plus: 'http://localhost:9001',
          pro: 'http://localhost:9002'
        },
        isDeployed: { basic: true, plus: false, pro: false }
      }
    ],
    classification: [
      {
        id: 'ai_classify_document',
        name: 'Document Classification',
        path: '/classify',
        method: 'POST',
        service: 'ai_service',
        category: 'classification',
        description: 'Classify document type using ML models',
        requiredAuth: true,
        estimatedLatency: '1-2s',
        features: ['document_upload', 'auto_classification'],
        tierUrls: {
          basic: 'http://localhost:9000',
          plus: 'http://localhost:9001',
          pro: 'http://localhost:9002'
        },
        isDeployed: { basic: true, plus: false, pro: false }
      }
    ],
    scanner: [
      {
        id: 'ai_scanner_list',
        name: 'List Scanners',
        path: '/api/v1/scanners',
        method: 'GET',
        service: 'ai_service',
        category: 'scanner',
        description: 'List available physical document scanners (WIA)',
        requiredAuth: true,
        estimatedLatency: '200-500ms',
        features: ['document_scanner', 'hardware_detection'],
        tierUrls: {
          basic: 'http://localhost:9000',
          plus: 'http://localhost:9001',
          pro: 'http://localhost:9002'
        },
        isDeployed: { basic: true, plus: false, pro: false }
      },
      {
        id: 'ai_scanner_scan',
        name: 'Scan Document',
        path: '/api/v1/scan',
        method: 'POST',
        service: 'ai_service',
        category: 'scanner',
        description: 'Scan document from physical scanner and process through AI pipeline',
        requiredAuth: true,
        estimatedLatency: '5-15s',
        features: ['document_scanner', 'full_processing'],
        tierUrls: {
          basic: 'http://localhost:9000',
          plus: 'http://localhost:9001',
          pro: 'http://localhost:9002'
        },
        isDeployed: { basic: true, plus: false, pro: false }
      }
    ],
    pipeline: [
      {
        id: 'ai_pipeline_process',
        name: 'Full Document Pipeline',
        path: '/api/v1/upload',
        method: 'POST',
        service: 'ai_service',
        category: 'pipeline',
        description: 'Run complete document processing pipeline',
        requiredAuth: true,
        estimatedLatency: '5-15s',
        features: ['document_upload', 'full_processing'],
        tierUrls: {
          basic: 'http://localhost:9000',
          plus: 'http://localhost:9001',
          pro: 'http://localhost:9002'
        },
        isDeployed: { basic: true, plus: false, pro: false }
      }
    ],
    embeddings: [
      {
        id: 'ai_embed_generate',
        name: 'Generate Embeddings',
        path: '/embeddings/generate',
        method: 'POST',
        service: 'ai_service',
        category: 'embeddings',
        description: 'Generate vector embeddings for text chunks',
        requiredAuth: true,
        estimatedLatency: '200-500ms',
        features: ['search_indexing', 'similarity_search'],
        tierUrls: {
          basic: 'http://localhost:9000',
          plus: 'http://localhost:9001',
          pro: 'http://localhost:9002'
        },
        isDeployed: { basic: true, plus: false, pro: false }
      },
    ],
    health: [
      {
        id: 'ai_health',
        name: 'AI Service Health',
        path: '/health',
        method: 'GET',
        service: 'ai_service',
        category: 'health',
        description: 'Health check for AI service and models',
        requiredAuth: false,
        estimatedLatency: '50-100ms',
        features: ['monitoring', 'diagnostics'],
        tierUrls: {
          basic: 'http://localhost:9000',
          plus: 'http://localhost:9001',
          pro: 'http://localhost:9002'
        },
        isDeployed: { basic: true, plus: false, pro: false }
      }
    ]
  },

  // ==================== Aura Backend (64 endpoints) ====================
  aura_backend: {
    auth: [
      {
        id: 'proj_auth_login',
        name: 'User Login',
        path: '/api/auth/login',
        method: 'POST',
        service: 'aura_backend',
        category: 'auth',
        description: 'Authenticate user and return JWT token',
        requiredAuth: false,
        estimatedLatency: '100-300ms',
        features: ['authentication', 'user_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_auth_logout',
        name: 'User Logout',
        path: '/api/auth/logout',
        method: 'POST',
        service: 'aura_backend',
        category: 'auth',
        description: 'Invalidate user session',
        requiredAuth: true,
        estimatedLatency: '50-100ms',
        features: ['authentication'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_auth_refresh',
        name: 'Refresh Token',
        path: '/api/auth/refresh',
        method: 'POST',
        service: 'aura_backend',
        category: 'auth',
        description: 'Refresh JWT token',
        requiredAuth: true,
        estimatedLatency: '50-100ms',
        features: ['authentication'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    users: [
      {
        id: 'proj_users_list',
        name: 'List Users',
        path: '/api/users',
        method: 'GET',
        service: 'aura_backend',
        category: 'users',
        description: 'Get list of users in company',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['user_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_users_create',
        name: 'Create User',
        path: '/api/users',
        method: 'POST',
        service: 'aura_backend',
        category: 'users',
        description: 'Create new user account',
        requiredAuth: true,
        estimatedLatency: '200-400ms',
        features: ['user_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_users_get',
        name: 'Get User by ID',
        path: '/api/users/:id',
        method: 'GET',
        service: 'aura_backend',
        category: 'users',
        description: 'Get single user details',
        requiredAuth: true,
        estimatedLatency: '50-100ms',
        features: ['user_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_users_update',
        name: 'Update User',
        path: '/api/users/:id',
        method: 'PUT',
        service: 'aura_backend',
        category: 'users',
        description: 'Update user information',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['user_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_users_delete',
        name: 'Delete User',
        path: '/api/users/:id',
        method: 'DELETE',
        service: 'aura_backend',
        category: 'users',
        description: 'Delete user account',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['user_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    documents: [
      {
        id: 'proj_docs_list',
        name: 'List Documents',
        path: '/api/documents',
        method: 'GET',
        service: 'aura_backend',
        category: 'documents',
        description: 'Get list of documents with filters',
        requiredAuth: true,
        estimatedLatency: '100-300ms',
        features: ['document_management', 'document_list'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_docs_upload',
        name: 'Upload Document',
        path: '/api/documents/upload',
        method: 'POST',
        service: 'aura_backend',
        category: 'documents',
        description: 'Upload new document file',
        requiredAuth: true,
        estimatedLatency: '500ms-2s',
        features: ['document_upload'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_docs_get',
        name: 'Get Document by ID',
        path: '/api/documents/:id',
        method: 'GET',
        service: 'aura_backend',
        category: 'documents',
        description: 'Get document metadata and content',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['document_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_docs_update',
        name: 'Update Document',
        path: '/api/documents/:id',
        method: 'PUT',
        service: 'aura_backend',
        category: 'documents',
        description: 'Update document metadata',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['document_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_docs_delete',
        name: 'Delete Document',
        path: '/api/documents/:id',
        method: 'DELETE',
        service: 'aura_backend',
        category: 'documents',
        description: 'Delete document and file',
        requiredAuth: true,
        estimatedLatency: '100-300ms',
        features: ['document_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_docs_download',
        name: 'Download Document',
        path: '/api/documents/:id/download',
        method: 'GET',
        service: 'aura_backend',
        category: 'documents',
        description: 'Download document file',
        requiredAuth: true,
        estimatedLatency: '200ms-1s',
        features: ['document_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_docs_search',
        name: 'Search Documents',
        path: '/api/documents/search',
        method: 'POST',
        service: 'aura_backend',
        category: 'documents',
        description: 'Search documents by text or metadata',
        requiredAuth: true,
        estimatedLatency: '200-500ms',
        features: ['search_bar', 'document_discovery'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_docs_batch_upload',
        name: 'Batch Upload Documents',
        path: '/api/documents/batch-upload',
        method: 'POST',
        service: 'aura_backend',
        category: 'documents',
        description: 'Upload multiple documents at once',
        requiredAuth: true,
        estimatedLatency: '1-5s',
        features: ['document_upload', 'batch_processing'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_docs_batch_delete',
        name: 'Batch Delete Documents',
        path: '/api/documents/batch-delete',
        method: 'POST',
        service: 'aura_backend',
        category: 'documents',
        description: 'Delete multiple documents',
        requiredAuth: true,
        estimatedLatency: '500ms-2s',
        features: ['document_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    companies: [
      {
        id: 'proj_companies_list',
        name: 'List Companies',
        path: '/api/companies',
        method: 'GET',
        service: 'aura_backend',
        category: 'companies',
        description: 'Get list of all companies',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['company_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_companies_create',
        name: 'Create Company',
        path: '/api/companies',
        method: 'POST',
        service: 'aura_backend',
        category: 'companies',
        description: 'Create new company',
        requiredAuth: true,
        estimatedLatency: '200-400ms',
        features: ['company_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_companies_get',
        name: 'Get Company by ID',
        path: '/api/companies/:id',
        method: 'GET',
        service: 'aura_backend',
        category: 'companies',
        description: 'Get company details',
        requiredAuth: true,
        estimatedLatency: '50-100ms',
        features: ['company_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_companies_update',
        name: 'Update Company',
        path: '/api/companies/:id',
        method: 'PUT',
        service: 'aura_backend',
        category: 'companies',
        description: 'Update company information',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['company_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_companies_delete',
        name: 'Delete Company',
        path: '/api/companies/:id',
        method: 'DELETE',
        service: 'aura_backend',
        category: 'companies',
        description: 'Delete company',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['company_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    departments: [
      {
        id: 'proj_depts_list',
        name: 'List Departments',
        path: '/api/departments',
        method: 'GET',
        service: 'aura_backend',
        category: 'departments',
        description: 'Get list of departments',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['department_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_depts_create',
        name: 'Create Department',
        path: '/api/departments',
        method: 'POST',
        service: 'aura_backend',
        category: 'departments',
        description: 'Create new department',
        requiredAuth: true,
        estimatedLatency: '200-300ms',
        features: ['department_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_depts_get',
        name: 'Get Department by ID',
        path: '/api/departments/:id',
        method: 'GET',
        service: 'aura_backend',
        category: 'departments',
        description: 'Get department details',
        requiredAuth: true,
        estimatedLatency: '50-100ms',
        features: ['department_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_depts_update',
        name: 'Update Department',
        path: '/api/departments/:id',
        method: 'PUT',
        service: 'aura_backend',
        category: 'departments',
        description: 'Update department information',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['department_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_depts_delete',
        name: 'Delete Department',
        path: '/api/departments/:id',
        method: 'DELETE',
        service: 'aura_backend',
        category: 'departments',
        description: 'Delete department',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['department_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    folders: [
      {
        id: 'proj_folders_list',
        name: 'List Folders',
        path: '/api/folders',
        method: 'GET',
        service: 'aura_backend',
        category: 'folders',
        description: 'Get folder hierarchy',
        requiredAuth: true,
        estimatedLatency: '100-300ms',
        features: ['folder_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_folders_create',
        name: 'Create Folder',
        path: '/api/folders',
        method: 'POST',
        service: 'aura_backend',
        category: 'folders',
        description: 'Create new folder',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['folder_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_folders_get',
        name: 'Get Folder by ID',
        path: '/api/folders/:id',
        method: 'GET',
        service: 'aura_backend',
        category: 'folders',
        description: 'Get folder details and contents',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['folder_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_folders_update',
        name: 'Update Folder',
        path: '/api/folders/:id',
        method: 'PUT',
        service: 'aura_backend',
        category: 'folders',
        description: 'Update folder information',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['folder_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_folders_delete',
        name: 'Delete Folder',
        path: '/api/folders/:id',
        method: 'DELETE',
        service: 'aura_backend',
        category: 'folders',
        description: 'Delete folder and contents',
        requiredAuth: true,
        estimatedLatency: '100-300ms',
        features: ['folder_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_folders_move',
        name: 'Move Folder',
        path: '/api/folders/:id/move',
        method: 'POST',
        service: 'aura_backend',
        category: 'folders',
        description: 'Move folder to different parent',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['folder_management'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    ai_proxy: [
      {
        id: 'proj_ai_ocr',
        name: 'Proxy OCR Request',
        path: '/api/ai/ocr',
        method: 'POST',
        service: 'aura_backend',
        category: 'ai_proxy',
        description: 'Proxy OCR request to AI service (tier-aware)',
        requiredAuth: true,
        estimatedLatency: '2-5s',
        features: ['document_upload', 'ai_integration'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_ai_search',
        name: 'Proxy Search Request',
        path: '/api/ai/search',
        method: 'POST',
        service: 'aura_backend',
        category: 'ai_proxy',
        description: 'Proxy search request to AI service (tier-aware)',
        requiredAuth: true,
        estimatedLatency: '500ms-4s',
        features: ['search_bar', 'ai_integration'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_ai_qa',
        name: 'Proxy Q&A Request',
        path: '/api/ai/qa',
        method: 'POST',
        service: 'aura_backend',
        category: 'ai_proxy',
        description: 'Proxy Q&A request to AI service (tier-aware)',
        requiredAuth: true,
        estimatedLatency: '3-6s',
        features: ['qa_system', 'ai_integration'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_ai_classify',
        name: 'Proxy Classification Request',
        path: '/api/ai/classify',
        method: 'POST',
        service: 'aura_backend',
        category: 'ai_proxy',
        description: 'Proxy classification to AI service (tier-aware)',
        requiredAuth: true,
        estimatedLatency: '1-2s',
        features: ['document_upload', 'ai_integration'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'proj_ai_extract',
        name: 'Proxy Extraction Request',
        path: '/api/ai/extract',
        method: 'POST',
        service: 'aura_backend',
        category: 'ai_proxy',
        description: 'Proxy data extraction to AI service (tier-aware)',
        requiredAuth: true,
        estimatedLatency: '1-5s',
        features: ['data_extraction', 'ai_integration'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    health: [
      {
        id: 'proj_health',
        name: 'Backend Health Check',
        path: '/api/health',
        method: 'GET',
        service: 'aura_backend',
        category: 'health',
        description: 'Check backend service health',
        requiredAuth: false,
        estimatedLatency: '50-100ms',
        features: ['monitoring'],
        tierUrls: {
          basic: 'http://localhost:8000',
          plus: 'http://localhost:8000',
          pro: 'http://localhost:8000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ]
  },

  // ==================== LLAMAFILE (2 endpoints) ====================
  llamafile: {
    completion: [
      {
        id: 'llama_completion',
        name: 'Text Completion',
        path: '/completion',
        method: 'POST',
        service: 'llamafile',
        category: 'completion',
        description: 'Generate text completion using Llama 3.2 3B',
        requiredAuth: false,
        estimatedLatency: '2-5s',
        features: ['qa_system', 'text_generation'],
        tierUrls: {
          basic: 'http://localhost:8080',
          plus: 'http://localhost:8080',
          pro: 'http://localhost:8080'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    health: [
      {
        id: 'llama_health',
        name: 'Llamafile Health',
        path: '/health',
        method: 'GET',
        service: 'llamafile',
        category: 'health',
        description: 'Check Llamafile service status',
        requiredAuth: false,
        estimatedLatency: '50-100ms',
        features: ['monitoring'],
        tierUrls: {
          basic: 'http://localhost:8080',
          plus: 'http://localhost:8080',
          pro: 'http://localhost:8080'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ]
  },

  // ==================== AURA CONTROL PANEL (51 endpoints) ====================
  aura_control_panel: {
    auth: [
      {
        id: 'aura_auth_login',
        name: 'Admin Login',
        path: '/api/auth/login',
        method: 'POST',
        service: 'aura_control_panel',
        category: 'auth',
        description: 'Superadmin authentication',
        requiredAuth: false,
        estimatedLatency: '100-200ms',
        features: ['admin_auth'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_auth_logout',
        name: 'Admin Logout',
        path: '/api/auth/logout',
        method: 'POST',
        service: 'aura_control_panel',
        category: 'auth',
        description: 'Invalidate admin session',
        requiredAuth: true,
        estimatedLatency: '50-100ms',
        features: ['admin_auth'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    configs: [
      {
        id: 'aura_configs_list',
        name: 'List Control Configs',
        path: '/api/admin/configs',
        method: 'GET',
        service: 'aura_control_panel',
        category: 'configs',
        description: 'Get all control configurations',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['config_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_configs_create',
        name: 'Create Control Config',
        path: '/api/admin/configs',
        method: 'POST',
        service: 'aura_control_panel',
        category: 'configs',
        description: 'Create new control configuration',
        requiredAuth: true,
        estimatedLatency: '200-300ms',
        features: ['config_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_configs_get',
        name: 'Get Config by ID',
        path: '/api/admin/configs/:id',
        method: 'GET',
        service: 'aura_control_panel',
        category: 'configs',
        description: 'Get single configuration',
        requiredAuth: true,
        estimatedLatency: '50-100ms',
        features: ['config_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_configs_update',
        name: 'Update Control Config',
        path: '/api/admin/configs/:id',
        method: 'PUT',
        service: 'aura_control_panel',
        category: 'configs',
        description: 'Update configuration settings',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['config_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_configs_delete',
        name: 'Delete Control Config',
        path: '/api/admin/configs/:id',
        method: 'DELETE',
        service: 'aura_control_panel',
        category: 'configs',
        description: 'Delete configuration',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['config_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    tiers: [
      {
        id: 'aura_tiers_list',
        name: 'List Company Tiers',
        path: '/api/admin/tiers',
        method: 'GET',
        service: 'aura_control_panel',
        category: 'tiers',
        description: 'Get all company tier configurations',
        requiredAuth: true,
        estimatedLatency: '100-300ms',
        features: ['tier_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_tiers_create',
        name: 'Create Tier Assignment',
        path: '/api/admin/tiers',
        method: 'POST',
        service: 'aura_control_panel',
        category: 'tiers',
        description: 'Assign tier to company',
        requiredAuth: true,
        estimatedLatency: '200-400ms',
        features: ['tier_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_tiers_get',
        name: 'Get Tier by Company',
        path: '/api/admin/tiers/:companyId',
        method: 'GET',
        service: 'aura_control_panel',
        category: 'tiers',
        description: 'Get tier configuration for company',
        requiredAuth: true,
        estimatedLatency: '50-100ms',
        features: ['tier_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_tiers_update',
        name: 'Update Tier Assignment',
        path: '/api/admin/tiers/:companyId',
        method: 'PUT',
        service: 'aura_control_panel',
        category: 'tiers',
        description: 'Update company tier settings',
        requiredAuth: true,
        estimatedLatency: '200-400ms',
        features: ['tier_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_tiers_delete',
        name: 'Delete Tier Assignment',
        path: '/api/admin/tiers/:companyId',
        method: 'DELETE',
        service: 'aura_control_panel',
        category: 'tiers',
        description: 'Remove tier assignment from company',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['tier_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_tiers_defaults',
        name: 'Get Tier Defaults',
        path: '/api/admin/tier-defaults',
        method: 'GET',
        service: 'aura_control_panel',
        category: 'tiers',
        description: 'Get verified default configurations for all tiers',
        requiredAuth: true,
        estimatedLatency: '50-100ms',
        features: ['tier_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_tiers_apply_defaults',
        name: 'Apply Tier Defaults',
        path: '/api/admin/tiers/apply-defaults',
        method: 'POST',
        service: 'aura_control_panel',
        category: 'tiers',
        description: 'Apply default tier configuration to company',
        requiredAuth: true,
        estimatedLatency: '200-400ms',
        features: ['tier_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    classifications: [
      {
        id: 'aura_class_list',
        name: 'List Classifications',
        path: '/api/admin/classifications',
        method: 'GET',
        service: 'aura_control_panel',
        category: 'classifications',
        description: 'Get all AI classification rules',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['classification_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_class_create',
        name: 'Create Classification',
        path: '/api/admin/classifications',
        method: 'POST',
        service: 'aura_control_panel',
        category: 'classifications',
        description: 'Create new classification rule',
        requiredAuth: true,
        estimatedLatency: '200-300ms',
        features: ['classification_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_class_update',
        name: 'Update Classification',
        path: '/api/admin/classifications/:id',
        method: 'PUT',
        service: 'aura_control_panel',
        category: 'classifications',
        description: 'Update classification rule',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['classification_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_class_delete',
        name: 'Delete Classification',
        path: '/api/admin/classifications/:id',
        method: 'DELETE',
        service: 'aura_control_panel',
        category: 'classifications',
        description: 'Delete classification rule',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['classification_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    printers: [
      {
        id: 'aura_printers_list',
        name: 'List Printer Configs',
        path: '/api/admin/printers',
        method: 'GET',
        service: 'aura_control_panel',
        category: 'printers',
        description: 'Get all printer configurations',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['printer_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_printers_create',
        name: 'Create Printer Config',
        path: '/api/admin/printers',
        method: 'POST',
        service: 'aura_control_panel',
        category: 'printers',
        description: 'Create new printer configuration',
        requiredAuth: true,
        estimatedLatency: '200-300ms',
        features: ['printer_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_printers_update',
        name: 'Update Printer Config',
        path: '/api/admin/printers/:id',
        method: 'PUT',
        service: 'aura_control_panel',
        category: 'printers',
        description: 'Update printer configuration',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['printer_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_printers_delete',
        name: 'Delete Printer Config',
        path: '/api/admin/printers/:id',
        method: 'DELETE',
        service: 'aura_control_panel',
        category: 'printers',
        description: 'Delete printer configuration',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['printer_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    pipelines: [
      {
        id: 'aura_pipelines_list',
        name: 'List Pipeline Configs',
        path: '/api/admin/pipelines',
        method: 'GET',
        service: 'aura_control_panel',
        category: 'pipelines',
        description: 'Get all pipeline configurations',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['pipeline_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_pipelines_create',
        name: 'Create Pipeline Config',
        path: '/api/admin/pipelines',
        method: 'POST',
        service: 'aura_control_panel',
        category: 'pipelines',
        description: 'Create new pipeline configuration',
        requiredAuth: true,
        estimatedLatency: '200-300ms',
        features: ['pipeline_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_pipelines_update',
        name: 'Update Pipeline Config',
        path: '/api/admin/pipelines/:id',
        method: 'PUT',
        service: 'aura_control_panel',
        category: 'pipelines',
        description: 'Update pipeline configuration',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['pipeline_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_pipelines_delete',
        name: 'Delete Pipeline Config',
        path: '/api/admin/pipelines/:id',
        method: 'DELETE',
        service: 'aura_control_panel',
        category: 'pipelines',
        description: 'Delete pipeline configuration',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['pipeline_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    api_endpoints: [
      {
        id: 'aura_api_catalog',
        name: 'Get API Catalog',
        path: '/api/admin/api-catalog',
        method: 'GET',
        service: 'aura_control_panel',
        category: 'api_endpoints',
        description: 'Query API catalog with filters',
        requiredAuth: true,
        estimatedLatency: '100-300ms',
        features: ['api_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_api_seed',
        name: 'Seed API Catalog',
        path: '/api/admin/seed-api-catalog',
        method: 'POST',
        service: 'aura_control_panel',
        category: 'api_endpoints',
        description: 'Populate API catalog from configuration',
        requiredAuth: true,
        estimatedLatency: '1-3s',
        features: ['api_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_api_update_urls',
        name: 'Update Tier URLs',
        path: '/api/admin/api-catalog/:id/tier-urls',
        method: 'PUT',
        service: 'aura_control_panel',
        category: 'api_endpoints',
        description: 'Update tier-specific URLs for endpoint',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['api_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_api_health_check',
        name: 'Health Check Endpoint',
        path: '/api/admin/api-catalog/:id/health-check',
        method: 'POST',
        service: 'aura_control_panel',
        category: 'api_endpoints',
        description: 'Test endpoint health for all tiers',
        requiredAuth: true,
        estimatedLatency: '500ms-2s',
        features: ['api_management', 'monitoring'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_api_health_check_all',
        name: 'Bulk Health Check',
        path: '/api/admin/api-catalog/health-check-all',
        method: 'POST',
        service: 'aura_control_panel',
        category: 'api_endpoints',
        description: 'Test health of all endpoints',
        requiredAuth: true,
        estimatedLatency: '5-30s',
        features: ['api_management', 'monitoring'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    api_flows: [
      {
        id: 'aura_flows_list',
        name: 'List API Flows',
        path: '/api/admin/flows',
        method: 'GET',
        service: 'aura_control_panel',
        category: 'api_flows',
        description: 'Get all API flow configurations',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['flow_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_flows_create',
        name: 'Create API Flow',
        path: '/api/admin/flows',
        method: 'POST',
        service: 'aura_control_panel',
        category: 'api_flows',
        description: 'Create new API flow connection',
        requiredAuth: true,
        estimatedLatency: '200-300ms',
        features: ['flow_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_flows_update',
        name: 'Update API Flow',
        path: '/api/admin/flows/:id',
        method: 'PUT',
        service: 'aura_control_panel',
        category: 'api_flows',
        description: 'Update API flow configuration',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['flow_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_flows_delete',
        name: 'Delete API Flow',
        path: '/api/admin/flows/:id',
        method: 'DELETE',
        service: 'aura_control_panel',
        category: 'api_flows',
        description: 'Delete API flow',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['flow_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    audit_logs: [
      {
        id: 'aura_audit_list',
        name: 'List Audit Logs',
        path: '/api/admin/audit-logs',
        method: 'GET',
        service: 'aura_control_panel',
        category: 'audit_logs',
        description: 'Get audit log entries',
        requiredAuth: true,
        estimatedLatency: '100-500ms',
        features: ['audit_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_audit_get',
        name: 'Get Audit Log by ID',
        path: '/api/admin/audit-logs/:id',
        method: 'GET',
        service: 'aura_control_panel',
        category: 'audit_logs',
        description: 'Get single audit log entry',
        requiredAuth: true,
        estimatedLatency: '50-100ms',
        features: ['audit_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    prompts: [
      {
        id: 'aura_prompts_list',
        name: 'List AI Prompts',
        path: '/api/admin/prompts',
        method: 'GET',
        service: 'aura_control_panel',
        category: 'prompts',
        description: 'Get all AI prompt templates',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['prompt_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_prompts_create',
        name: 'Create AI Prompt',
        path: '/api/admin/prompts',
        method: 'POST',
        service: 'aura_control_panel',
        category: 'prompts',
        description: 'Create new prompt template',
        requiredAuth: true,
        estimatedLatency: '200-300ms',
        features: ['prompt_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_prompts_update',
        name: 'Update AI Prompt',
        path: '/api/admin/prompts/:id',
        method: 'PUT',
        service: 'aura_control_panel',
        category: 'prompts',
        description: 'Update prompt template',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['prompt_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_prompts_delete',
        name: 'Delete AI Prompt',
        path: '/api/admin/prompts/:id',
        method: 'DELETE',
        service: 'aura_control_panel',
        category: 'prompts',
        description: 'Delete prompt template',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['prompt_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    search_configs: [
      {
        id: 'aura_search_list',
        name: 'List Search Configs',
        path: '/api/admin/search-configs',
        method: 'GET',
        service: 'aura_control_panel',
        category: 'search_configs',
        description: 'Get search configuration settings',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['search_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      },
      {
        id: 'aura_search_update',
        name: 'Update Search Config',
        path: '/api/admin/search-configs/:id',
        method: 'PUT',
        service: 'aura_control_panel',
        category: 'search_configs',
        description: 'Update search settings',
        requiredAuth: true,
        estimatedLatency: '100-200ms',
        features: ['search_management'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    discovery: [
      {
        id: 'aura_discover_services',
        name: 'Discover Services',
        path: '/api/admin/discover/services',
        method: 'POST',
        service: 'aura_control_panel',
        category: 'discovery',
        description: 'Auto-discover available AI services',
        requiredAuth: true,
        estimatedLatency: '2-5s',
        features: ['service_discovery'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ],
    proxy: [
      {
        id: 'aura_proxy_forward',
        name: 'Proxy Request',
        path: '/api/admin/proxy/:service/*',
        method: 'ALL',
        service: 'aura_control_panel',
        category: 'proxy',
        description: 'Proxy requests to backend services',
        requiredAuth: true,
        estimatedLatency: '100ms-10s',
        features: ['service_proxy'],
        tierUrls: {
          basic: 'http://localhost:4000',
          plus: 'http://localhost:4000',
          pro: 'http://localhost:4000'
        },
        isDeployed: { basic: true, plus: true, pro: true }
      }
    ]
  }
};

export default apiCatalog;
