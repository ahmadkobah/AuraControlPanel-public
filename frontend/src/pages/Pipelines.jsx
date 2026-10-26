import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createApi } from '../lib/api';
import DataTable from '../components/DataTable';

export default function Pipelines() {
  const { token } = useAuth();
  const api = useMemo(() => createApi(token), [token]);

  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tier/Company Configuration State
  const [selectedTier, setSelectedTier] = useState('basic'); // basic, plus, pro
  const [selectedCompanyId, setSelectedCompanyId] = useState(null); // null = tier default
  const [configSource, setConfigSource] = useState('tier_default'); // tier_default, company_override, global_default
  
  // DEFAULT: All AI features ON (enabled) unless explicitly turned off by user
  const [aiFeatures, setAiFeatures] = useState({
    // ✅ ALL PIPELINE STEPS ENABLED BY DEFAULT
    ENABLE_PDF_SPLITTING: true,
    ENABLE_OCR_VALIDATION: true,              // ✅ Enabled
    ENABLE_CLASSIFICATION: true,
    ENABLE_SIGNATURE_DETECTION: true,
    ENABLE_SIGNATURE_VALIDATION: true,
    ENABLE_STRUCTURED_EXTRACTION: true,
    ENABLE_ENTITY_EXTRACTION: true,           // ✅ Enabled
    ENABLE_SUMMARY: true,                     // ✅ Enabled
    ENABLE_EMBEDDING_GENERATION: true,
    ENABLE_MONGODB_STORAGE: true,
    SIMILARITY_THRESHOLD: 0.5,
    OCR_DPI: 300,
    YOLO_CONFIDENCE: 0.5,
    CLASSIFICATION_MIN_CONFIDENCE: 0.08,
    // Advanced Parameters (8)
    LLAMA_TEMPERATURE: 0.3,
    LLAMA_MAX_TOKENS: 512,
    OCR_CONFIDENCE_THRESHOLD: 50,
    SIGNATURE_CONFIDENCE_THRESHOLD: 0.6,
    SEARCH_TOP_K_DEFAULT: 5,
    MAX_GPU_MEMORY_MB: 4096,
    GPU_LAYERS: 29,
    MAX_PDF_SIZE_MB: 200,
    // LLaMA Validation Parameters (6)
    OCR_VALIDATION_TIMEOUT: 30,
    OCR_VALIDATION_TEMPERATURE: 0.05,  // ✨ Ultra-low to preserve formatting while fixing errors
    OCR_VALIDATION_MAX_TOKENS: 2500,  // ✨ Increased to handle full pages
    CLASSIFICATION_TIMEOUT: 45,
    CLASSIFICATION_REASONING_TEMPERATURE: 0.3,
    CLASSIFICATION_LOW_CONFIDENCE_THRESHOLD: 0.15,
    // Structured Extraction Parameters (4)
    EXTRACTION_MAX_TOKENS: 600,
    EXTRACTION_TEMPERATURE: 0.1,
    ENTITY_EXTRACTION_MAX_TOKENS: 400,
    ENTITY_EXTRACTION_TEMPERATURE: 0.1,
    // Signature Validation Parameters (6)
    SIGNATURE_VALIDATION_MAX_TOKENS: 150,
    SIGNATURE_VALIDATION_TEMPERATURE: 0.2,
    NAME_EXTRACTION_MAX_TOKENS: 100,
    NAME_EXTRACTION_TEMPERATURE: 0.1,
    AUTHENTICITY_MAX_TOKENS: 200,
    AUTHENTICITY_TEMPERATURE: 0.3,
    // OCR Validation Advanced (3)
    OCR_QUALITY_SKIP_THRESHOLD: 0.95,
    VALIDATION_QUALITY_MAX_TOKENS: 200,
    VALIDATION_QUALITY_TEMPERATURE: 0.1,
    // Smart OCR Routing Thresholds (2)
    OCR_ROUTING_MEDIUM_THRESHOLD: 0.75,
    OCR_ROUTING_LOW_THRESHOLD: 0.50,
    // YOLO Advanced (1)
    YOLO_IOU_THRESHOLD: 0.45,
    // Classification Advanced (1)
    LLAMA_OVERRIDE_CONFIDENCE: 0.85,
    // Health/System (1)
    LLAMAFILE_HEALTH_TIMEOUT: 2
  });
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const emptyForm = {
    name: '',
    description: '',
    companyId: null,
    tier: 'basic',
    documentTypes: [],
    steps: [],
    isActive: true,
    parallelProcessing: false,
    maxRetries: 3,
    notifications: { onSuccess: [], onFailure: [], onManualReview: [] }
  };
  const [form, setForm] = useState(emptyForm);
  const [newStep, setNewStep] = useState({ 
    order: 1, 
    name: '', 
    description: '',
    service: 'ocr', 
    enabled: true, 
    promptTemplateId: null,
    timeout: 30000,
    costLimit: 0.05
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/admin/pipelines');
      setItems(data.pipelines || []);
    } catch (e) {
      setError(e.message || 'Failed to load pipelines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load();
    loadCompanies();
    loadPrompts();
    loadAiFeatures();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await api.get('/proxy/companies');
      setCompanies(data.companies || data.data || []);
    } catch (e) {
      console.error('Load companies failed:', e);
      setCompanies([]);
    }
  };

  const loadPrompts = async () => {
    try {
      const data = await api.get('/admin/prompts');
      setPrompts(data.prompts || []);
    } catch (e) {
      console.error('Load prompts failed:', e);
    }
  };

  const loadAiFeatures = async (tier = selectedTier, companyId = selectedCompanyId) => {
    try {
      // Build query params for config resolution
      const params = new URLSearchParams({ tier });
      if (companyId) {
        params.append('companyId', companyId);
      }
      
      // Try tier config resolution endpoint first (NEW)
      try {
        const resolvedData = await api.get(`/admin/tier-configs/resolve?${params.toString()}`);
        if (resolvedData && resolvedData.config) {
          const config = resolvedData.config;
          setConfigSource(resolvedData.metadata?.source || 'global_default');
          
          setAiFeatures({
            // Pipeline Step Toggles (10)
            ENABLE_PDF_SPLITTING: config.ENABLE_PDF_SPLITTING !== false,
            ENABLE_OCR_VALIDATION: config.ENABLE_OCR_VALIDATION === true,
            ENABLE_CLASSIFICATION: config.ENABLE_CLASSIFICATION !== false,
            ENABLE_SIGNATURE_DETECTION: config.ENABLE_SIGNATURE_DETECTION === true,
            ENABLE_SIGNATURE_VALIDATION: config.ENABLE_SIGNATURE_VALIDATION === true,
            ENABLE_STRUCTURED_EXTRACTION: config.ENABLE_STRUCTURED_EXTRACTION === true,
            ENABLE_ENTITY_EXTRACTION: config.ENABLE_ENTITY_EXTRACTION === true,
            ENABLE_SUMMARY: config.ENABLE_SUMMARY === true,
            ENABLE_EMBEDDING_GENERATION: config.ENABLE_EMBEDDING_GENERATION !== false,
            ENABLE_MONGODB_STORAGE: config.ENABLE_MONGODB_STORAGE !== false,
            
            // Basic Parameters (4)
            SIMILARITY_THRESHOLD: parseFloat(config.SIMILARITY_THRESHOLD) || 0.5,
            OCR_DPI: parseInt(config.OCR_DPI) || 300,
            YOLO_CONFIDENCE: parseFloat(config.YOLO_CONFIDENCE) || 0.5,
            CLASSIFICATION_MIN_CONFIDENCE: parseFloat(config.CLASSIFICATION_MIN_CONFIDENCE) || 0.08,
            
            // Advanced Parameters (8)
            LLAMA_TEMPERATURE: parseFloat(config.LLAMA_TEMPERATURE) || 0.3,
            LLAMA_MAX_TOKENS: parseInt(config.LLAMA_MAX_TOKENS) || 512,
            OCR_CONFIDENCE_THRESHOLD: parseInt(config.OCR_CONFIDENCE_THRESHOLD) || 50,
            SIGNATURE_CONFIDENCE_THRESHOLD: parseFloat(config.SIGNATURE_CONFIDENCE_THRESHOLD) || 0.6,
            SEARCH_TOP_K_DEFAULT: parseInt(config.SEARCH_TOP_K_DEFAULT) || 5,
            MAX_GPU_MEMORY_MB: parseInt(config.MAX_GPU_MEMORY_MB) || 4096,
            GPU_LAYERS: parseInt(config.GPU_LAYERS) || 29,
            MAX_PDF_SIZE_MB: parseInt(config.MAX_PDF_SIZE_MB) || 200,
            
            // LLaMA Validation Parameters (6)
            OCR_VALIDATION_TIMEOUT: parseInt(config.OCR_VALIDATION_TIMEOUT) || 30,
            OCR_VALIDATION_TEMPERATURE: parseFloat(config.OCR_VALIDATION_TEMPERATURE) || 0.05,  // ✨ Ultra-low
            OCR_VALIDATION_MAX_TOKENS: parseInt(config.OCR_VALIDATION_MAX_TOKENS) || 2500,  // ✨ Full pages
            CLASSIFICATION_TIMEOUT: parseInt(config.CLASSIFICATION_TIMEOUT) || 45,
            CLASSIFICATION_REASONING_TEMPERATURE: parseFloat(config.CLASSIFICATION_REASONING_TEMPERATURE) || 0.3,
            CLASSIFICATION_LOW_CONFIDENCE_THRESHOLD: parseFloat(config.CLASSIFICATION_LOW_CONFIDENCE_THRESHOLD) || 0.15,
            
            // Structured Extraction Parameters (4)
            EXTRACTION_MAX_TOKENS: parseInt(config.EXTRACTION_MAX_TOKENS) || 600,
            EXTRACTION_TEMPERATURE: parseFloat(config.EXTRACTION_TEMPERATURE) || 0.1,
            ENTITY_EXTRACTION_MAX_TOKENS: parseInt(config.ENTITY_EXTRACTION_MAX_TOKENS) || 400,
            ENTITY_EXTRACTION_TEMPERATURE: parseFloat(config.ENTITY_EXTRACTION_TEMPERATURE) || 0.1,
            
            // Signature Validation Parameters (6)
            SIGNATURE_VALIDATION_MAX_TOKENS: parseInt(config.SIGNATURE_VALIDATION_MAX_TOKENS) || 150,
            SIGNATURE_VALIDATION_TEMPERATURE: parseFloat(config.SIGNATURE_VALIDATION_TEMPERATURE) || 0.2,
            NAME_EXTRACTION_MAX_TOKENS: parseInt(config.NAME_EXTRACTION_MAX_TOKENS) || 100,
            NAME_EXTRACTION_TEMPERATURE: parseFloat(config.NAME_EXTRACTION_TEMPERATURE) || 0.1,
            AUTHENTICITY_MAX_TOKENS: parseInt(config.AUTHENTICITY_MAX_TOKENS) || 200,
            AUTHENTICITY_TEMPERATURE: parseFloat(config.AUTHENTICITY_TEMPERATURE) || 0.3,
            
            // OCR Validation Advanced (3)
            OCR_QUALITY_SKIP_THRESHOLD: parseFloat(config.OCR_QUALITY_SKIP_THRESHOLD) || 0.95,
            VALIDATION_QUALITY_MAX_TOKENS: parseInt(config.VALIDATION_QUALITY_MAX_TOKENS) || 200,
            VALIDATION_QUALITY_TEMPERATURE: parseFloat(config.VALIDATION_QUALITY_TEMPERATURE) || 0.1,
            
            // Smart OCR Routing Thresholds (2)
            OCR_ROUTING_MEDIUM_THRESHOLD: parseFloat(config.OCR_ROUTING_MEDIUM_THRESHOLD) || 0.75,
            OCR_ROUTING_LOW_THRESHOLD: parseFloat(config.OCR_ROUTING_LOW_THRESHOLD) || 0.50,
            
            // YOLO Advanced (1)
            YOLO_IOU_THRESHOLD: parseFloat(config.YOLO_IOU_THRESHOLD) || 0.45,
            
            // Classification Advanced (1)
            LLAMA_OVERRIDE_CONFIDENCE: parseFloat(config.LLAMA_OVERRIDE_CONFIDENCE) || 0.85,
            
            // Health/System (1)
            LLAMAFILE_HEALTH_TIMEOUT: parseInt(config.LLAMAFILE_HEALTH_TIMEOUT) || 2
          });
          return;
        }
      } catch (tierConfigErr) {
        console.warn('Tier config resolution not available, falling back to AI Service config:', tierConfigErr);
      }
      
      // Fallback: Try AI Service config endpoint
      const configData = await api.get('/admin/ai-service/config');
      if (configData && configData.config) {
        setConfigSource('global_default');
        setAiFeatures({
          // Pipeline Step Toggles (10)
          ENABLE_PDF_SPLITTING: configData.config.ENABLE_PDF_SPLITTING !== false,
          ENABLE_OCR_VALIDATION: configData.config.ENABLE_OCR_VALIDATION === true,
          ENABLE_CLASSIFICATION: configData.config.ENABLE_CLASSIFICATION !== false,
          ENABLE_SIGNATURE_DETECTION: configData.config.ENABLE_SIGNATURE_DETECTION === true,
          ENABLE_SIGNATURE_VALIDATION: configData.config.ENABLE_SIGNATURE_VALIDATION === true,
          ENABLE_STRUCTURED_EXTRACTION: configData.config.ENABLE_STRUCTURED_EXTRACTION === true,
          ENABLE_ENTITY_EXTRACTION: configData.config.ENABLE_ENTITY_EXTRACTION === true,
          ENABLE_SUMMARY: configData.config.ENABLE_SUMMARY === true,
          ENABLE_EMBEDDING_GENERATION: configData.config.ENABLE_EMBEDDING_GENERATION !== false,
          ENABLE_MONGODB_STORAGE: configData.config.ENABLE_MONGODB_STORAGE !== false,
          
          // Basic Parameters (4)
          SIMILARITY_THRESHOLD: parseFloat(configData.config.SIMILARITY_THRESHOLD) || 0.5,
          OCR_DPI: parseInt(configData.config.OCR_DPI) || 300,
          YOLO_CONFIDENCE: parseFloat(configData.config.YOLO_CONFIDENCE) || 0.5,
          CLASSIFICATION_MIN_CONFIDENCE: parseFloat(configData.config.CLASSIFICATION_MIN_CONFIDENCE) || 0.08,
          
          // Advanced Parameters (8)
          LLAMA_TEMPERATURE: parseFloat(configData.config.LLAMA_TEMPERATURE) || 0.3,
          LLAMA_MAX_TOKENS: parseInt(configData.config.LLAMA_MAX_TOKENS) || 512,
          OCR_CONFIDENCE_THRESHOLD: parseInt(configData.config.OCR_CONFIDENCE_THRESHOLD) || 50,
          SIGNATURE_CONFIDENCE_THRESHOLD: parseFloat(configData.config.SIGNATURE_CONFIDENCE_THRESHOLD) || 0.6,
          SEARCH_TOP_K_DEFAULT: parseInt(configData.config.SEARCH_TOP_K_DEFAULT) || 5,
          MAX_GPU_MEMORY_MB: parseInt(configData.config.MAX_GPU_MEMORY_MB) || 4096,
          GPU_LAYERS: parseInt(configData.config.GPU_LAYERS) || 29,
          MAX_PDF_SIZE_MB: parseInt(configData.config.MAX_PDF_SIZE_MB) || 200,
          
          // LLaMA Validation Parameters (6)
          OCR_VALIDATION_TIMEOUT: parseInt(configData.config.OCR_VALIDATION_TIMEOUT) || 30,
          OCR_VALIDATION_TEMPERATURE: parseFloat(configData.config.OCR_VALIDATION_TEMPERATURE) || 0.05,  // ✨ Ultra-low default
          OCR_VALIDATION_MAX_TOKENS: parseInt(configData.config.OCR_VALIDATION_MAX_TOKENS) || 2500,  // ✨ Full page default
          CLASSIFICATION_TIMEOUT: parseInt(configData.config.CLASSIFICATION_TIMEOUT) || 45,
          CLASSIFICATION_REASONING_TEMPERATURE: parseFloat(configData.config.CLASSIFICATION_REASONING_TEMPERATURE) || 0.3,
          CLASSIFICATION_LOW_CONFIDENCE_THRESHOLD: parseFloat(configData.config.CLASSIFICATION_LOW_CONFIDENCE_THRESHOLD) || 0.15,
          
          // Structured Extraction Parameters (4)
          EXTRACTION_MAX_TOKENS: parseInt(configData.config.EXTRACTION_MAX_TOKENS) || 600,
          EXTRACTION_TEMPERATURE: parseFloat(configData.config.EXTRACTION_TEMPERATURE) || 0.1,
          ENTITY_EXTRACTION_MAX_TOKENS: parseInt(configData.config.ENTITY_EXTRACTION_MAX_TOKENS) || 400,
          ENTITY_EXTRACTION_TEMPERATURE: parseFloat(configData.config.ENTITY_EXTRACTION_TEMPERATURE) || 0.1,
          
          // Signature Validation Parameters (6)
          SIGNATURE_VALIDATION_MAX_TOKENS: parseInt(configData.config.SIGNATURE_VALIDATION_MAX_TOKENS) || 150,
          SIGNATURE_VALIDATION_TEMPERATURE: parseFloat(configData.config.SIGNATURE_VALIDATION_TEMPERATURE) || 0.2,
          NAME_EXTRACTION_MAX_TOKENS: parseInt(configData.config.NAME_EXTRACTION_MAX_TOKENS) || 100,
          NAME_EXTRACTION_TEMPERATURE: parseFloat(configData.config.NAME_EXTRACTION_TEMPERATURE) || 0.1,
          AUTHENTICITY_MAX_TOKENS: parseInt(configData.config.AUTHENTICITY_MAX_TOKENS) || 200,
          AUTHENTICITY_TEMPERATURE: parseFloat(configData.config.AUTHENTICITY_TEMPERATURE) || 0.3,
          
          // OCR Validation Advanced (3)
          OCR_QUALITY_SKIP_THRESHOLD: parseFloat(configData.config.OCR_QUALITY_SKIP_THRESHOLD) || 0.95,
          VALIDATION_QUALITY_MAX_TOKENS: parseInt(configData.config.VALIDATION_QUALITY_MAX_TOKENS) || 200,
          VALIDATION_QUALITY_TEMPERATURE: parseFloat(configData.config.VALIDATION_QUALITY_TEMPERATURE) || 0.1,
          
          // Smart OCR Routing Thresholds (2)
          OCR_ROUTING_MEDIUM_THRESHOLD: parseFloat(configData.config.OCR_ROUTING_MEDIUM_THRESHOLD) || 0.75,
          OCR_ROUTING_LOW_THRESHOLD: parseFloat(configData.config.OCR_ROUTING_LOW_THRESHOLD) || 0.50,
          
          // YOLO Advanced (1)
          YOLO_IOU_THRESHOLD: parseFloat(configData.config.YOLO_IOU_THRESHOLD) || 0.45,
          
          // Classification Advanced (1)
          LLAMA_OVERRIDE_CONFIDENCE: parseFloat(configData.config.LLAMA_OVERRIDE_CONFIDENCE) || 0.85,
          
          // Health/System (1)
          LLAMAFILE_HEALTH_TIMEOUT: parseInt(configData.config.LLAMAFILE_HEALTH_TIMEOUT) || 2
        });
        return;
      }
    } catch (e) {
      console.warn('Config endpoints not available, falling back to environment:', e);
    }
    
    // Fallback to old environment endpoint
    try {
      const data = await api.get('/admin/environment/all');
      if (data.aiService) {
        setAiFeatures({
          ENABLE_PDF_SPLITTING: data.aiService.ENABLE_PDF_SPLITTING !== 'false',
          ENABLE_OCR_VALIDATION: data.aiService.ENABLE_OCR_VALIDATION === 'true',
          ENABLE_CLASSIFICATION: data.aiService.ENABLE_CLASSIFICATION !== 'false',
          ENABLE_SIGNATURE_DETECTION: data.aiService.ENABLE_SIGNATURE_DETECTION === 'true',
          ENABLE_SIGNATURE_VALIDATION: data.aiService.ENABLE_SIGNATURE_VALIDATION === 'true',
          ENABLE_STRUCTURED_EXTRACTION: data.aiService.ENABLE_STRUCTURED_EXTRACTION === 'true',
          ENABLE_ENTITY_EXTRACTION: data.aiService.ENABLE_ENTITY_EXTRACTION === 'true',
          ENABLE_SUMMARY: data.aiService.ENABLE_SUMMARY === 'true',
          ENABLE_EMBEDDING_GENERATION: data.aiService.ENABLE_EMBEDDING_GENERATION !== 'false',
          ENABLE_MONGODB_STORAGE: data.aiService.ENABLE_MONGODB_STORAGE !== 'false',
          SIMILARITY_THRESHOLD: 0.5,
          OCR_DPI: 300,
          YOLO_CONFIDENCE: 0.5
        });
      }
    } catch (e) {
      console.error('Load AI features failed:', e);
    }
  };

  const toggleAiFeature = (key) => {
    setAiFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateAiParam = (key, value) => {
    setAiFeatures(prev => ({ ...prev, [key]: value }));
  };

  const saveAiFeatures = async () => {
    setSavingFeatures(true);
    setError('');
    try {
      // Validate all numeric parameters
      if (aiFeatures.SIMILARITY_THRESHOLD < 0 || aiFeatures.SIMILARITY_THRESHOLD > 1) {
        throw new Error('Similarity Threshold must be between 0.0 and 1.0');
      }
      if (aiFeatures.OCR_DPI < 72 || aiFeatures.OCR_DPI > 600) {
        throw new Error('OCR DPI must be between 72 and 600');
      }
      if (aiFeatures.YOLO_CONFIDENCE < 0 || aiFeatures.YOLO_CONFIDENCE > 1) {
        throw new Error('YOLO Confidence must be between 0.0 and 1.0');
      }
      if (aiFeatures.LLAMA_TEMPERATURE < 0 || aiFeatures.LLAMA_TEMPERATURE > 1) {
        throw new Error('LLaMA Temperature must be between 0.0 and 1.0');
      }
      if (aiFeatures.LLAMA_MAX_TOKENS < 128 || aiFeatures.LLAMA_MAX_TOKENS > 2048) {
        throw new Error('LLaMA Max Tokens must be between 128 and 2048');
      }
      if (aiFeatures.OCR_CONFIDENCE_THRESHOLD < 0 || aiFeatures.OCR_CONFIDENCE_THRESHOLD > 100) {
        throw new Error('OCR Confidence Threshold must be between 0 and 100');
      }
      if (aiFeatures.SIGNATURE_CONFIDENCE_THRESHOLD < 0 || aiFeatures.SIGNATURE_CONFIDENCE_THRESHOLD > 1) {
        throw new Error('Signature Confidence Threshold must be between 0.0 and 1.0');
      }
      if (aiFeatures.SEARCH_TOP_K_DEFAULT < 1 || aiFeatures.SEARCH_TOP_K_DEFAULT > 50) {
        throw new Error('Search Results Count must be between 1 and 50');
      }
      if (aiFeatures.MAX_GPU_MEMORY_MB < 1024 || aiFeatures.MAX_GPU_MEMORY_MB > 16384) {
        throw new Error('GPU Memory Limit must be between 1024 and 16384 MB');
      }
      if (aiFeatures.GPU_LAYERS < 0 || aiFeatures.GPU_LAYERS > 35) {
        throw new Error('GPU Layers must be between 0 and 35');
      }
      if (aiFeatures.MAX_PDF_SIZE_MB < 10 || aiFeatures.MAX_PDF_SIZE_MB > 500) {
        throw new Error('Max PDF Size must be between 10 and 500 MB');
      }

      // Build payload with ALL 47 parameters
      const syncPayload = {
        // Pipeline Step Toggles (10)
        ENABLE_PDF_SPLITTING: aiFeatures.ENABLE_PDF_SPLITTING,
        ENABLE_OCR_VALIDATION: aiFeatures.ENABLE_OCR_VALIDATION,
        ENABLE_CLASSIFICATION: aiFeatures.ENABLE_CLASSIFICATION,
        ENABLE_SIGNATURE_DETECTION: aiFeatures.ENABLE_SIGNATURE_DETECTION,
        ENABLE_SIGNATURE_VALIDATION: aiFeatures.ENABLE_SIGNATURE_VALIDATION,
        ENABLE_STRUCTURED_EXTRACTION: aiFeatures.ENABLE_STRUCTURED_EXTRACTION,
        ENABLE_ENTITY_EXTRACTION: aiFeatures.ENABLE_ENTITY_EXTRACTION,
        ENABLE_SUMMARY: aiFeatures.ENABLE_SUMMARY,
        ENABLE_EMBEDDING_GENERATION: aiFeatures.ENABLE_EMBEDDING_GENERATION,
        ENABLE_MONGODB_STORAGE: aiFeatures.ENABLE_MONGODB_STORAGE,
        
        // Basic Parameters (4)
        SIMILARITY_THRESHOLD: parseFloat(aiFeatures.SIMILARITY_THRESHOLD),
        OCR_DPI: parseInt(aiFeatures.OCR_DPI),
        YOLO_CONFIDENCE: parseFloat(aiFeatures.YOLO_CONFIDENCE),
        CLASSIFICATION_MIN_CONFIDENCE: parseFloat(aiFeatures.CLASSIFICATION_MIN_CONFIDENCE),
        
        // Advanced Parameters (8)
        LLAMA_TEMPERATURE: parseFloat(aiFeatures.LLAMA_TEMPERATURE),
        LLAMA_MAX_TOKENS: parseInt(aiFeatures.LLAMA_MAX_TOKENS),
        OCR_CONFIDENCE_THRESHOLD: parseInt(aiFeatures.OCR_CONFIDENCE_THRESHOLD),
        SIGNATURE_CONFIDENCE_THRESHOLD: parseFloat(aiFeatures.SIGNATURE_CONFIDENCE_THRESHOLD),
        SEARCH_TOP_K_DEFAULT: parseInt(aiFeatures.SEARCH_TOP_K_DEFAULT),
        MAX_GPU_MEMORY_MB: parseInt(aiFeatures.MAX_GPU_MEMORY_MB),
        GPU_LAYERS: parseInt(aiFeatures.GPU_LAYERS),
        MAX_PDF_SIZE_MB: parseInt(aiFeatures.MAX_PDF_SIZE_MB),
        
        // LLaMA Validation Parameters (6)
        OCR_VALIDATION_TIMEOUT: parseInt(aiFeatures.OCR_VALIDATION_TIMEOUT),
        OCR_VALIDATION_TEMPERATURE: parseFloat(aiFeatures.OCR_VALIDATION_TEMPERATURE),
        OCR_VALIDATION_MAX_TOKENS: parseInt(aiFeatures.OCR_VALIDATION_MAX_TOKENS),
        CLASSIFICATION_TIMEOUT: parseInt(aiFeatures.CLASSIFICATION_TIMEOUT),
        CLASSIFICATION_REASONING_TEMPERATURE: parseFloat(aiFeatures.CLASSIFICATION_REASONING_TEMPERATURE),
        CLASSIFICATION_LOW_CONFIDENCE_THRESHOLD: parseFloat(aiFeatures.CLASSIFICATION_LOW_CONFIDENCE_THRESHOLD),
        
        // Structured Extraction Parameters (4)
        EXTRACTION_MAX_TOKENS: parseInt(aiFeatures.EXTRACTION_MAX_TOKENS),
        EXTRACTION_TEMPERATURE: parseFloat(aiFeatures.EXTRACTION_TEMPERATURE),
        ENTITY_EXTRACTION_MAX_TOKENS: parseInt(aiFeatures.ENTITY_EXTRACTION_MAX_TOKENS),
        ENTITY_EXTRACTION_TEMPERATURE: parseFloat(aiFeatures.ENTITY_EXTRACTION_TEMPERATURE),
        
        // Signature Validation Parameters (6)
        SIGNATURE_VALIDATION_MAX_TOKENS: parseInt(aiFeatures.SIGNATURE_VALIDATION_MAX_TOKENS),
        SIGNATURE_VALIDATION_TEMPERATURE: parseFloat(aiFeatures.SIGNATURE_VALIDATION_TEMPERATURE),
        NAME_EXTRACTION_MAX_TOKENS: parseInt(aiFeatures.NAME_EXTRACTION_MAX_TOKENS),
        NAME_EXTRACTION_TEMPERATURE: parseFloat(aiFeatures.NAME_EXTRACTION_TEMPERATURE),
        AUTHENTICITY_MAX_TOKENS: parseInt(aiFeatures.AUTHENTICITY_MAX_TOKENS),
        AUTHENTICITY_TEMPERATURE: parseFloat(aiFeatures.AUTHENTICITY_TEMPERATURE),
        
        // OCR Validation Advanced (3)
        OCR_QUALITY_SKIP_THRESHOLD: parseFloat(aiFeatures.OCR_QUALITY_SKIP_THRESHOLD),
        VALIDATION_QUALITY_MAX_TOKENS: parseInt(aiFeatures.VALIDATION_QUALITY_MAX_TOKENS),
        VALIDATION_QUALITY_TEMPERATURE: parseFloat(aiFeatures.VALIDATION_QUALITY_TEMPERATURE),
        
        // Smart OCR Routing Thresholds (2)
        OCR_ROUTING_MEDIUM_THRESHOLD: parseFloat(aiFeatures.OCR_ROUTING_MEDIUM_THRESHOLD),
        OCR_ROUTING_LOW_THRESHOLD: parseFloat(aiFeatures.OCR_ROUTING_LOW_THRESHOLD),
        
        // YOLO Advanced (1)
        YOLO_IOU_THRESHOLD: parseFloat(aiFeatures.YOLO_IOU_THRESHOLD),
        
        // Classification Advanced (1)
        LLAMA_OVERRIDE_CONFIDENCE: parseFloat(aiFeatures.LLAMA_OVERRIDE_CONFIDENCE),
        
        // Health/System (1)
        LLAMAFILE_HEALTH_TIMEOUT: parseInt(aiFeatures.LLAMAFILE_HEALTH_TIMEOUT)
      };
      
      // Determine save endpoint based on selection
      try {
        let saveEndpoint;
        let saveMessage;
        
        if (selectedCompanyId) {
          // Save company-specific override
          saveEndpoint = `/admin/tier-configs/company/${selectedCompanyId}?tier=${selectedTier}`;
          saveMessage = `Company override saved for ${companies.find(c => c._id === selectedCompanyId)?.name || 'company'}!`;
        } else {
          // Save tier default
          saveEndpoint = `/admin/tier-configs/tier/${selectedTier}`;
          saveMessage = `Tier default saved for ${selectedTier.toUpperCase()}!`;
        }
        
        console.log(`🔄 Saving to ${saveEndpoint}:`, syncPayload);
        const response = await api.put(saveEndpoint, syncPayload);
        console.log('✅ Save response:', response);
        
        // ✅ NEW: Sync to AI Service RUNTIME_CONFIG for immediate effect
        try {
          console.log('🔄 Syncing to AI Service RUNTIME_CONFIG...');
          const syncResponse = await api.post('/admin/tier-configs/sync-to-ai-service', {
            tier: selectedTier,
            companyId: selectedCompanyId || null
          });
          console.log('✅ AI Service RUNTIME_CONFIG synced:', syncResponse);
          alert(`✅ ${saveMessage}\n\n🚀 AI Service updated! Changes take effect immediately (no restart needed).`);
        } catch (syncErr) {
          console.error('❌ AI Service sync failed:', syncErr);
          alert(`⚠️ ${saveMessage}\n\n❌ WARNING: Could not sync to AI Service.\nChanges saved to database but AI Service still uses old config.\nPlease restart AI Service to apply changes.`);
        }
        
        await loadAiFeatures(selectedTier, selectedCompanyId);
        return;
      } catch (tierSaveError) {
        console.warn('Tier config save failed, falling back to AI Service config:', tierSaveError);
        
        // Fallback: Save to AI Service global config
        try {
          console.log('🔄 Syncing to AI Service (hot-reload):', syncPayload);
          const response = await api.post('/admin/ai-service/config', syncPayload);
          console.log('✅ Sync response:', response);
          
          alert('✅ AI Configuration synced! Changes applied immediately without restart.');
          await loadAiFeatures();
          return;
        } catch (syncError) {
          console.warn('New sync endpoint not available, using legacy method:', syncError);
        }
      }

      // Fallback to old environment endpoint
      const payload = {};
      Object.keys(aiFeatures).forEach(key => {
        if (typeof aiFeatures[key] === 'boolean') {
          payload[key] = aiFeatures[key] ? 'true' : 'false';
        } else {
          payload[key] = String(aiFeatures[key]);
        }
      });
      
      console.log('Saving AI features (legacy):', payload);
      const response = await api.put('/admin/environment/ai-service', payload);
      console.log('Save response:', response);
      
      alert('✅ AI Features saved! Restart AI Service to apply changes.');
      await loadAiFeatures();
    } catch (e) {
      console.error('Save AI features error:', e);
      setError(e.message || 'Failed to save AI features');
      alert(`❌ Failed to save: ${e.message || 'Unknown error'}`);
    } finally {
      setSavingFeatures(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      companyId: row.companyId?._id || row.companyId || '',
      tier: row.tier || 'basic',
      steps: row.steps || [],
      isActive: row.isActive !== undefined ? row.isActive : true,
      parallelProcessing: row.parallelProcessing || false,
      maxRetries: row.maxRetries ?? 3
    });
    setModalOpen(true);
  };

  const save = async () => {
    setError('');
    const payload = {
      ...form,
      maxRetries: Number(form.maxRetries),
      companyId: form.companyId || null // Convert empty string to null
    };
    try {
      if (editing) {
        await api.put(`/admin/pipelines/${editing._id}`, payload);
      } else {
        await api.post('/admin/pipelines', payload);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to save');
    }
  };

  const remove = async (row) => {
    if (!confirm('Delete this pipeline?')) return;
    try {
      await api.del(`/admin/pipelines/${row._id}`);
      await load();
    } catch (e) {
      alert(e.message || 'Delete failed');
    }
  };

  const addStep = () => {
    setForm({
      ...form,
      steps: [...form.steps, { ...newStep, order: form.steps.length + 1 }]
    });
    setNewStep({ 
      order: form.steps.length + 2, 
      name: '', 
      description: '',
      service: 'ocr', 
      enabled: true, 
      promptTemplateId: null,
      timeout: 30000,
      costLimit: 0.05
    });
  };

  const removeStep = (idx) => {
    const updated = form.steps.filter((_, i) => i !== idx);
    setForm({ ...form, steps: updated.map((s, i) => ({ ...s, order: i + 1 })) });
  };

  const tierLabels = { basic: 'Basic', plus: 'Plus', pro: 'Pro' };
  
  const columns = [
    { key: 'name', label: 'Name', render: (v, row) => <strong>{row.name}</strong> },
    { key: 'companyId', label: 'Company', render: (v, row) => <span>{row.companyId?.name || 'Global'}</span> },
    { key: 'tier', label: 'Tier', render: (v, row) => <span style={pill}>{tierLabels[row.tier] || row.tier}</span> },
    { key: 'steps', label: 'Steps', render: (v, row) => <span>{(row.steps || []).length}</span> },
    { key: 'isActive', label: 'Status', render: (v, row) => <span style={{ ...statusBadge, background: row.isActive ? '#10b981' : '#6b7280' }}>{row.isActive ? 'Active' : 'Inactive'}</span> }
  ];

  return (
    <div>
      <h1>Pipeline Control</h1>
      <p>Configure document processing pipelines with ordered steps.</p>

      {/* AI Feature Toggles Section */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        marginBottom: '24px'
      }}>
        {/* Tier & Company Selector */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '16px', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Tier Selector */}
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'white', marginBottom: '6px' }}>
                🎯 Configuration Tier
              </label>
              <select
                value={selectedTier}
                onChange={(e) => {
                  setSelectedTier(e.target.value);
                  loadAiFeatures(e.target.value, selectedCompanyId);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.95)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="basic">🥉 Basic (Conservative)</option>
                <option value="plus">🥈 Plus (Balanced)</option>
                <option value="pro">🥇 Pro (Aggressive)</option>
              </select>
            </div>

            {/* Company Selector */}
            <div style={{ flex: '1', minWidth: '250px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'white', marginBottom: '6px' }}>
                🏢 Company Override (Optional)
              </label>
              <select
                value={selectedCompanyId || ''}
                onChange={(e) => {
                  const companyId = e.target.value || null;
                  setSelectedCompanyId(companyId);
                  loadAiFeatures(selectedTier, companyId);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.95)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">None (Use Tier Default)</option>
                {companies.map(company => (
                  <option key={company._id} value={company._id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Config Source Indicator */}
            <div style={{ 
              flex: '0 0 auto',
              padding: '10px 16px',
              borderRadius: '8px',
              background: configSource === 'company_override' ? '#10b981' : 
                          configSource === 'tier_default' ? '#3b82f6' : '#f59e0b',
              color: 'white',
              fontSize: '12px',
              fontWeight: '600',
              textAlign: 'center',
              minWidth: '140px'
            }}>
              <div style={{ fontSize: '18px', marginBottom: '4px' }}>
                {configSource === 'company_override' ? '🏢' : 
                 configSource === 'tier_default' ? '🎯' : '🌐'}
              </div>
              <div>
                {configSource === 'company_override' ? 'Company Override' : 
                 configSource === 'tier_default' ? 'Tier Default' : 'Global Default'}
              </div>
            </div>
          </div>
        </div>

        {/* Business Features Section (only show for company overrides) */}
        {selectedCompanyId && (
          <div style={{ 
            marginBottom: '32px',
            padding: '24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
          }}>
            <h3 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '18px', 
              fontWeight: '600', 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '24px' }}>💼</span>
              Business Features & Limits
              <span style={{ 
                marginLeft: 'auto',
                fontSize: '12px',
                padding: '4px 12px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '6px'
              }}>
                Company-Specific
              </span>
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
              Access rights, quotas, and billing configuration for this company
            </p>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '12px',
              padding: '16px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px'
            }}>
              <div style={{ color: 'white' }}>
                <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>📄 Documents/Month</div>
                <div style={{ fontSize: '20px', fontWeight: '700' }}>Unlimited</div>
              </div>
              <div style={{ color: 'white' }}>
                <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>👥 Max Users</div>
                <div style={{ fontSize: '20px', fontWeight: '700' }}>200</div>
              </div>
              <div style={{ color: 'white' }}>
                <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>🏛️ Max Departments</div>
                <div style={{ fontSize: '20px', fontWeight: '700' }}>50</div>
              </div>
              <div style={{ color: 'white' }}>
                <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>💾 Storage</div>
                <div style={{ fontSize: '20px', fontWeight: '700' }}>8000 GB</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>🎛️</span>
              AI Feature Toggles & Parameters
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
              Real-time configuration sync with AI Service - changes apply immediately without restart
            </p>
          </div>
          <button 
            onClick={saveAiFeatures} 
            disabled={savingFeatures}
            style={{
              ...btnPrimary,
              background: savingFeatures ? '#9ca3af' : '#10b981',
              cursor: savingFeatures ? 'not-allowed' : 'pointer'
            }}
          >
            {savingFeatures ? '⏳ Syncing...' : '🔄 Sync to AI Service'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
          {[
            { key: 'ENABLE_PDF_SPLITTING', label: 'PDF Document Splitting', icon: '📑', desc: 'Split multi-document PDFs into logical documents' },
            { key: 'ENABLE_OCR_VALIDATION', label: 'OCR Quality Validation', icon: '📝', desc: 'Validate OCR text quality with Llama' },
            { key: 'ENABLE_CLASSIFICATION', label: 'Document Classification', icon: '🔖', desc: 'Classify document type (31 categories)' },
            { key: 'ENABLE_SIGNATURE_DETECTION', label: 'Signature Detection', icon: '✍️', desc: 'Detect signature regions with YOLOv8n' },
            { key: 'ENABLE_SIGNATURE_VALIDATION', label: 'Signature Validation', icon: '✅', desc: 'Validate and OCR signatures with TrOCR' },
            { key: 'ENABLE_STRUCTURED_EXTRACTION', label: 'Structured Data Extraction', icon: '📊', desc: 'Extract invoice/receipt fields' },
            { key: 'ENABLE_ENTITY_EXTRACTION', label: 'Named Entity Extraction', icon: '🏷️', desc: 'Extract companies, people, dates, amounts' },
            { key: 'ENABLE_SUMMARY', label: 'Document Summarization', icon: '📄', desc: 'Generate summaries with Llama 3.2 3B' },
            { key: 'ENABLE_EMBEDDING_GENERATION', label: 'Search Embedding Generation', icon: '🔍', desc: 'Generate embeddings for semantic search' },
            { key: 'ENABLE_MONGODB_STORAGE', label: 'MongoDB Storage & Indexing', icon: '💾', desc: 'Store processed data in MongoDB' }
          ].map(feature => (
            <label
              key={feature.key}
              style={{
                display: 'flex',
                alignItems: 'start',
                gap: '12px',
                padding: '16px',
                background: aiFeatures[feature.key] ? '#f0fdf4' : '#f8fafc',
                border: `2px solid ${aiFeatures[feature.key] ? '#86efac' : '#e2e8f0'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => toggleAiFeature(feature.key)}
            >
              <input
                type="checkbox"
                checked={aiFeatures[feature.key]}
                onChange={() => {}} // Handled by label onClick
                style={{ marginTop: '2px', cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '18px' }}>{feature.icon}</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{feature.label}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
                  {feature.desc}
                </div>
              </div>
              <div style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                background: aiFeatures[feature.key] ? '#22c55e' : '#94a3b8',
                color: 'white'
              }}>
                {aiFeatures[feature.key] ? 'ON' : 'OFF'}
              </div>
            </label>
          ))}
        </div>

        {/* Numeric Parameters Section */}
        <div style={{ 
          marginTop: '24px', 
          paddingTop: '24px', 
          borderTop: '1px solid #e2e8f0' 
        }}>
          <h4 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '16px', 
            fontWeight: '600', 
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '20px' }}>⚙️</span>
            Advanced Parameters
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '16px' 
          }}>
            {/* Similarity Threshold */}
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#1e293b',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>🔍</span>
                Similarity Threshold
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={aiFeatures.SIMILARITY_THRESHOLD}
                onChange={(e) => updateAiParam('SIMILARITY_THRESHOLD', parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  marginBottom: '6px'
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                Embedding search similarity threshold (0.0 - 1.0). Higher = more strict matching.
              </div>
            </div>

            {/* OCR DPI */}
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#1e293b',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>📸</span>
                OCR DPI
              </label>
              <input
                type="number"
                min="72"
                max="600"
                step="50"
                value={aiFeatures.OCR_DPI}
                onChange={(e) => updateAiParam('OCR_DPI', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  marginBottom: '6px'
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                OCR processing DPI (72 - 600). Higher = better quality, slower processing.
              </div>
            </div>

            {/* YOLO Confidence */}
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#1e293b',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>🎯</span>
                YOLO Confidence
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={aiFeatures.YOLO_CONFIDENCE}
                onChange={(e) => updateAiParam('YOLO_CONFIDENCE', parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  marginBottom: '6px'
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                YOLOv8 detection confidence threshold (0.0 - 1.0). Higher = fewer false positives.
              </div>
            </div>

            {/* Classification Min Confidence */}
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#1e293b',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>🔖</span>
                Classification Min Confidence
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={aiFeatures.CLASSIFICATION_MIN_CONFIDENCE}
                onChange={(e) => updateAiParam('CLASSIFICATION_MIN_CONFIDENCE', parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  marginBottom: '6px'
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                Minimum confidence for document classification (0.0 - 1.0). Default: 0.08
              </div>
            </div>

            {/* LLaMA Temperature */}
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#1e293b',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>🌡️</span>
                LLaMA Temperature
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={aiFeatures.LLAMA_TEMPERATURE}
                onChange={(e) => updateAiParam('LLAMA_TEMPERATURE', parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  marginBottom: '6px'
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                LLaMA creativity (0.0 - 1.0). Lower = focused, Higher = creative. Default: 0.3
              </div>
            </div>

            {/* LLaMA Max Tokens */}
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#1e293b',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>📏</span>
                LLaMA Max Tokens
              </label>
              <input
                type="number"
                min="128"
                max="2048"
                step="64"
                value={aiFeatures.LLAMA_MAX_TOKENS}
                onChange={(e) => updateAiParam('LLAMA_MAX_TOKENS', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  marginBottom: '6px'
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                Maximum summary/response length (128 - 2048). Default: 512 tokens.
              </div>
            </div>

            {/* OCR Confidence Threshold */}
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#1e293b',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>✓</span>
                OCR Confidence Threshold
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                value={aiFeatures.OCR_CONFIDENCE_THRESHOLD}
                onChange={(e) => updateAiParam('OCR_CONFIDENCE_THRESHOLD', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  marginBottom: '6px'
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                PaddleOCR quality threshold (0 - 100). Higher = better quality. Default: 50.
              </div>
            </div>

            {/* Signature Confidence Threshold */}
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#1e293b',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>✍️</span>
                Signature Confidence
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={aiFeatures.SIGNATURE_CONFIDENCE_THRESHOLD}
                onChange={(e) => updateAiParam('SIGNATURE_CONFIDENCE_THRESHOLD', parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  marginBottom: '6px'
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                Signature detection sensitivity (0.0 - 1.0). Lower = more detections. Default: 0.6
              </div>
            </div>

            {/* Search Top K */}
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#1e293b',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>🔍</span>
                Search Results Count
              </label>
              <input
                type="number"
                min="1"
                max="50"
                step="1"
                value={aiFeatures.SEARCH_TOP_K_DEFAULT}
                onChange={(e) => updateAiParam('SEARCH_TOP_K_DEFAULT', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  marginBottom: '6px'
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                Number of search results to return (1 - 50). Default: 5 results.
              </div>
            </div>

            {/* GPU Memory Limit */}
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#1e293b',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>💾</span>
                GPU Memory Limit (MB)
              </label>
              <input
                type="number"
                min="1024"
                max="16384"
                step="512"
                value={aiFeatures.MAX_GPU_MEMORY_MB}
                onChange={(e) => updateAiParam('MAX_GPU_MEMORY_MB', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  marginBottom: '6px'
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                Maximum GPU memory per model (MB). Default: 4096 MB (4GB). Advanced setting.
              </div>
            </div>

            {/* GPU Layers */}
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#1e293b',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>🎚️</span>
                GPU Layers
              </label>
              <input
                type="number"
                min="0"
                max="35"
                step="1"
                value={aiFeatures.GPU_LAYERS}
                onChange={(e) => updateAiParam('GPU_LAYERS', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  marginBottom: '6px'
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                LLaMA layers offloaded to GPU (0 - 35). More = faster. Default: 29. Advanced setting.
              </div>
            </div>

            {/* Max PDF Size */}
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#1e293b',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>📦</span>
                Max PDF Size (MB)
              </label>
              <input
                type="number"
                min="10"
                max="500"
                step="10"
                value={aiFeatures.MAX_PDF_SIZE_MB}
                onChange={(e) => updateAiParam('MAX_PDF_SIZE_MB', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  marginBottom: '6px'
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                Maximum document size for upload (10 - 500 MB). Default: 200 MB.
              </div>
            </div>
          </div>
        </div>

        {/* ⚠️ ADVANCED SETTINGS - Collapsible Section */}
        <div style={{ 
          marginTop: '32px', 
          paddingTop: '24px', 
          borderTop: '2px solid #fbbf24' 
        }}>
          <div 
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '2px solid #fbbf24',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: showAdvancedSettings ? '16px' : '0',
              transition: 'all 0.3s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>⚙️</span>
              <div>
                <h4 style={{ 
                  margin: '0 0 4px 0', 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: '#92400e'
                }}>
                  Advanced Settings (25 Parameters)
                </h4>
                <p style={{ 
                  margin: 0, 
                  fontSize: '12px', 
                  color: '#b45309',
                  fontWeight: '500'
                }}>
                  ⚠️ Only modify if you understand the implications - affects LLaMA validation, extraction quality, and timeouts
                </p>
              </div>
            </div>
            <span style={{ 
              fontSize: '24px', 
              color: '#92400e',
              transform: showAdvancedSettings ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s'
            }}>
              ▼
            </span>
          </div>

          {showAdvancedSettings && (
            <div style={{
              padding: '24px',
              background: '#fffbeb',
              border: '2px solid #fbbf24',
              borderRadius: '8px'
            }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                gap: '16px' 
              }}>
                {/* LLaMA Validation Parameters (6) */}
                <div style={{ gridColumn: '1 / -1', marginBottom: '8px' }}>
                  <h5 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🧠</span> LLaMA Validation Parameters (6)
                  </h5>
                </div>

                <ParamInput 
                  icon="⏱️" 
                  label="OCR Validation Timeout" 
                  value={aiFeatures.OCR_VALIDATION_TIMEOUT} 
                  onChange={(v) => updateAiParam('OCR_VALIDATION_TIMEOUT', parseInt(v))}
                  min={5} max={120} step={5}
                  unit="seconds"
                  description="Timeout for OCR quality validation with LLaMA (5-120s)"
                />

                <ParamInput 
                  icon="🌡️" 
                  label="OCR Validation Temperature" 
                  value={aiFeatures.OCR_VALIDATION_TEMPERATURE} 
                  onChange={(v) => updateAiParam('OCR_VALIDATION_TEMPERATURE', parseFloat(v))}
                  min={0} max={1} step={0.05}
                  description="LLaMA creativity for OCR validation (0.0 = strict, 1.0 = creative)"
                />

                <ParamInput 
                  icon="📏" 
                  label="OCR Validation Max Tokens" 
                  value={aiFeatures.OCR_VALIDATION_MAX_TOKENS} 
                  onChange={(v) => updateAiParam('OCR_VALIDATION_MAX_TOKENS', parseInt(v))}
                  min={100} max={2000} step={50}
                  unit="tokens"
                  description="Maximum response length for OCR validation (100-2000)"
                />

                <ParamInput 
                  icon="⏱️" 
                  label="Classification Timeout" 
                  value={aiFeatures.CLASSIFICATION_TIMEOUT} 
                  onChange={(v) => updateAiParam('CLASSIFICATION_TIMEOUT', parseInt(v))}
                  min={10} max={180} step={5}
                  unit="seconds"
                  description="Timeout for document classification (10-180s)"
                />

                <ParamInput 
                  icon="🌡️" 
                  label="Classification Reasoning Temp" 
                  value={aiFeatures.CLASSIFICATION_REASONING_TEMPERATURE} 
                  onChange={(v) => updateAiParam('CLASSIFICATION_REASONING_TEMPERATURE', parseFloat(v))}
                  min={0} max={1} step={0.05}
                  description="LLaMA temperature for classification reasoning"
                />

                <ParamInput 
                  icon="📊" 
                  label="Low Confidence Threshold" 
                  value={aiFeatures.CLASSIFICATION_LOW_CONFIDENCE_THRESHOLD} 
                  onChange={(v) => updateAiParam('CLASSIFICATION_LOW_CONFIDENCE_THRESHOLD', parseFloat(v))}
                  min={0} max={0.5} step={0.01}
                  description="Threshold below which classification is considered uncertain"
                />

                {/* Structured Extraction Parameters (4) */}
                <div style={{ gridColumn: '1 / -1', marginTop: '16px', marginBottom: '8px' }}>
                  <h5 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📊</span> Structured Extraction Parameters (4)
                  </h5>
                </div>

                <ParamInput 
                  icon="📏" 
                  label="Extraction Max Tokens" 
                  value={aiFeatures.EXTRACTION_MAX_TOKENS} 
                  onChange={(v) => updateAiParam('EXTRACTION_MAX_TOKENS', parseInt(v))}
                  min={100} max={2000} step={50}
                  unit="tokens"
                  description="Max tokens for invoice/receipt extraction"
                />

                <ParamInput 
                  icon="🌡️" 
                  label="Extraction Temperature" 
                  value={aiFeatures.EXTRACTION_TEMPERATURE} 
                  onChange={(v) => updateAiParam('EXTRACTION_TEMPERATURE', parseFloat(v))}
                  min={0} max={1} step={0.05}
                  description="LLaMA temperature for structured data extraction"
                />

                <ParamInput 
                  icon="📏" 
                  label="Entity Extraction Max Tokens" 
                  value={aiFeatures.ENTITY_EXTRACTION_MAX_TOKENS} 
                  onChange={(v) => updateAiParam('ENTITY_EXTRACTION_MAX_TOKENS', parseInt(v))}
                  min={100} max={2000} step={50}
                  unit="tokens"
                  description="Max tokens for named entity extraction"
                />

                <ParamInput 
                  icon="🌡️" 
                  label="Entity Extraction Temperature" 
                  value={aiFeatures.ENTITY_EXTRACTION_TEMPERATURE} 
                  onChange={(v) => updateAiParam('ENTITY_EXTRACTION_TEMPERATURE', parseFloat(v))}
                  min={0} max={1} step={0.05}
                  description="LLaMA temperature for entity extraction"
                />

                {/* Signature Validation Parameters (6) */}
                <div style={{ gridColumn: '1 / -1', marginTop: '16px', marginBottom: '8px' }}>
                  <h5 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✍️</span> Signature Validation Parameters (6)
                  </h5>
                </div>

                <ParamInput 
                  icon="📏" 
                  label="Signature Validation Max Tokens" 
                  value={aiFeatures.SIGNATURE_VALIDATION_MAX_TOKENS} 
                  onChange={(v) => updateAiParam('SIGNATURE_VALIDATION_MAX_TOKENS', parseInt(v))}
                  min={50} max={500} step={25}
                  unit="tokens"
                  description="Max tokens for signature text validation"
                />

                <ParamInput 
                  icon="🌡️" 
                  label="Signature Validation Temperature" 
                  value={aiFeatures.SIGNATURE_VALIDATION_TEMPERATURE} 
                  onChange={(v) => updateAiParam('SIGNATURE_VALIDATION_TEMPERATURE', parseFloat(v))}
                  min={0} max={1} step={0.05}
                  description="LLaMA temperature for signature validation"
                />

                <ParamInput 
                  icon="📏" 
                  label="Name Extraction Max Tokens" 
                  value={aiFeatures.NAME_EXTRACTION_MAX_TOKENS} 
                  onChange={(v) => updateAiParam('NAME_EXTRACTION_MAX_TOKENS', parseInt(v))}
                  min={50} max={300} step={25}
                  unit="tokens"
                  description="Max tokens for name extraction from signatures"
                />

                <ParamInput 
                  icon="🌡️" 
                  label="Name Extraction Temperature" 
                  value={aiFeatures.NAME_EXTRACTION_TEMPERATURE} 
                  onChange={(v) => updateAiParam('NAME_EXTRACTION_TEMPERATURE', parseFloat(v))}
                  min={0} max={1} step={0.05}
                  description="LLaMA temperature for name extraction"
                />

                <ParamInput 
                  icon="📏" 
                  label="Authenticity Max Tokens" 
                  value={aiFeatures.AUTHENTICITY_MAX_TOKENS} 
                  onChange={(v) => updateAiParam('AUTHENTICITY_MAX_TOKENS', parseInt(v))}
                  min={50} max={500} step={25}
                  unit="tokens"
                  description="Max tokens for signature authenticity check"
                />

                <ParamInput 
                  icon="🌡️" 
                  label="Authenticity Temperature" 
                  value={aiFeatures.AUTHENTICITY_TEMPERATURE} 
                  onChange={(v) => updateAiParam('AUTHENTICITY_TEMPERATURE', parseFloat(v))}
                  min={0} max={1} step={0.05}
                  description="LLaMA temperature for authenticity validation"
                />

                {/* OCR Validation Advanced (3) */}
                <div style={{ gridColumn: '1 / -1', marginTop: '16px', marginBottom: '8px' }}>
                  <h5 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📝</span> OCR Validation Advanced (3)
                  </h5>
                </div>

                <ParamInput 
                  icon="⏭️" 
                  label="OCR Quality Skip Threshold" 
                  value={aiFeatures.OCR_QUALITY_SKIP_THRESHOLD} 
                  onChange={(v) => updateAiParam('OCR_QUALITY_SKIP_THRESHOLD', parseFloat(v))}
                  min={0.7} max={1} step={0.01}
                  description="Skip validation if OCR quality above this (0.7-1.0)"
                />

                <ParamInput 
                  icon="📏" 
                  label="Validation Quality Max Tokens" 
                  value={aiFeatures.VALIDATION_QUALITY_MAX_TOKENS} 
                  onChange={(v) => updateAiParam('VALIDATION_QUALITY_MAX_TOKENS', parseInt(v))}
                  min={50} max={1000} step={50}
                  unit="tokens"
                  description="Max tokens for quality validation response"
                />

                <ParamInput 
                  icon="🌡️" 
                  label="Validation Quality Temperature" 
                  value={aiFeatures.VALIDATION_QUALITY_TEMPERATURE} 
                  onChange={(v) => updateAiParam('VALIDATION_QUALITY_TEMPERATURE', parseFloat(v))}
                  min={0} max={1} step={0.05}
                  description="LLaMA temperature for quality validation"
                />

                {/* Smart OCR Routing Thresholds (2) */}
                <div style={{ gridColumn: '1 / -1', marginTop: '16px', marginBottom: '8px' }}>
                  <h5 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🛤️</span> Smart OCR Validation Routing (2)
                  </h5>
                  <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#666' }}>
                    Routes documents based on PaddleOCR confidence: 🟢 SKIP (≥95%) → 🟡 LIGHT (75-94%) → 🟠 FULL (50-74%) → 🔴 REVIEW (&lt;50%)
                  </p>
                </div>

                <ParamInput 
                  icon="🟡" 
                  label="Light Validation Threshold" 
                  value={aiFeatures.OCR_ROUTING_MEDIUM_THRESHOLD} 
                  onChange={(v) => updateAiParam('OCR_ROUTING_MEDIUM_THRESHOLD', parseFloat(v))}
                  min={0.5} max={0.94} step={0.01}
                  description="Regex fixes only if confidence between this and skip threshold (0.50-0.94)"
                />

                <ParamInput 
                  icon="🟠" 
                  label="Full Validation Threshold" 
                  value={aiFeatures.OCR_ROUTING_LOW_THRESHOLD} 
                  onChange={(v) => updateAiParam('OCR_ROUTING_LOW_THRESHOLD', parseFloat(v))}
                  min={0.3} max={0.74} step={0.01}
                  description="Full LLaMA validation if confidence between this and light. Below this → manual review flag (0.30-0.74)"
                />

                {/* Structured Extraction Parameters (4) */}
                <div style={{ gridColumn: '1 / -1', marginTop: '16px', marginBottom: '8px' }}>
                  <h5 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📋</span> Structured Extraction Parameters (4)
                  </h5>
                </div>

                <ParamInput 
                  icon="🌡️" 
                  label="Extraction Temperature" 
                  value={aiFeatures.EXTRACTION_TEMPERATURE} 
                  onChange={(v) => updateAiParam('EXTRACTION_TEMPERATURE', parseFloat(v))}
                  min={0} max={0.5} step={0.01}
                  description="LLaMA temperature for invoice/receipt field extraction (lower = more precise)"
                />

                <ParamInput 
                  icon="📏" 
                  label="Extraction Max Tokens" 
                  value={aiFeatures.EXTRACTION_MAX_TOKENS} 
                  onChange={(v) => updateAiParam('EXTRACTION_MAX_TOKENS', parseInt(v))}
                  min={300} max={1000} step={50}
                  unit="tokens"
                  description="Max tokens for structured data extraction"
                />

                <ParamInput 
                  icon="🌡️" 
                  label="Entity Extraction Temperature" 
                  value={aiFeatures.ENTITY_EXTRACTION_TEMPERATURE} 
                  onChange={(v) => updateAiParam('ENTITY_EXTRACTION_TEMPERATURE', parseFloat(v))}
                  min={0} max={0.5} step={0.01}
                  description="LLaMA temperature for entity extraction"
                />

                <ParamInput 
                  icon="📏" 
                  label="Entity Extraction Max Tokens" 
                  value={aiFeatures.ENTITY_EXTRACTION_MAX_TOKENS} 
                  onChange={(v) => updateAiParam('ENTITY_EXTRACTION_MAX_TOKENS', parseInt(v))}
                  min={200} max={800} step={50}
                  unit="tokens"
                  description="Max tokens for entity extraction"
                />

                {/* Other Advanced Parameters (3) */}
                <div style={{ gridColumn: '1 / -1', marginTop: '16px', marginBottom: '8px' }}>
                  <h5 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🔧</span> Other Advanced Parameters (3)
                  </h5>
                </div>

                <ParamInput 
                  icon="🎯" 
                  label="YOLO IOU Threshold" 
                  value={aiFeatures.YOLO_IOU_THRESHOLD} 
                  onChange={(v) => updateAiParam('YOLO_IOU_THRESHOLD', parseFloat(v))}
                  min={0.1} max={0.9} step={0.05}
                  description="YOLO Intersection over Union threshold for duplicate removal"
                />

                <ParamInput 
                  icon="📊" 
                  label="LLaMA Override Confidence" 
                  value={aiFeatures.LLAMA_OVERRIDE_CONFIDENCE} 
                  onChange={(v) => updateAiParam('LLAMA_OVERRIDE_CONFIDENCE', parseFloat(v))}
                  min={0.5} max={1} step={0.05}
                  description="Confidence threshold when LLaMA overrides classification"
                />

                <ParamInput 
                  icon="❤️" 
                  label="Llamafile Health Timeout" 
                  value={aiFeatures.LLAMAFILE_HEALTH_TIMEOUT} 
                  onChange={(v) => updateAiParam('LLAMAFILE_HEALTH_TIMEOUT', parseInt(v))}
                  min={1} max={10} step={1}
                  unit="seconds"
                  description="Timeout for Llamafile health check (1-10s)"
                />
              </div>

              <div style={{
                marginTop: '24px',
                padding: '16px',
                background: '#fef3c7',
                border: '2px solid #fbbf24',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'start' }}>
                  <span style={{ fontSize: '20px' }}>💡</span>
                  <div style={{ fontSize: '12px', color: '#92400e', lineHeight: '1.6' }}>
                    <strong>Tips:</strong> Lower temperatures (0.0-0.2) provide more focused, deterministic responses.
                    Higher token limits allow more detailed extraction but increase processing time.
                    Adjust timeouts based on your server performance and document complexity.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, margin: '16px 0' }}>
        <button onClick={openCreate} style={btnPrimary}>+ New Pipeline</button>
        <button onClick={load} style={btnGhost}>Refresh</button>
      </div>

      {error && <div style={errorBox}>{error}</div>}
      {loading ? <div>Loading...</div> : (
        <DataTable columns={columns} data={items} onEdit={openEdit} onDelete={remove} emptyMessage="No pipelines configured" />
      )}

      {modalOpen && (
        <div style={modalOverlay}>
          <div style={modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{editing ? 'Edit Pipeline' : 'Create Pipeline'}</h3>
              <button onClick={() => setModalOpen(false)} style={btnGhost}>Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Pipeline Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={input} placeholder="Standard Processing" />
              </div>

              <div>
                <label style={label}>Description</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={input} placeholder="Brief description" />
              </div>

              <div>
                <label style={label}>Company</label>
                <select value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })} style={input}>
                  <option value="">Global (All Companies)</option>
                  {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label style={label}>Tier</label>
                <select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })} style={input}>
                  <option value="basic">Basic (Tier 1)</option>
                  <option value="plus">Plus (Tier 2)</option>
                  <option value="pro">Pro (Tier 3)</option>
                </select>
              </div>

              <div>
                <label style={label}>Document Types (comma-separated)</label>
                <input value={(form.documentTypes || []).join(', ')} onChange={e => setForm({ ...form, documentTypes: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} style={input} placeholder="Invoice, Transcript, Research Paper" />
              </div>

              <div>
                <label style={label}>Max Retries</label>
                <input type="number" value={form.maxRetries} onChange={e => setForm({ ...form, maxRetries: e.target.value })} style={input} />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                  <span>Active</span>
                </label>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={form.parallelProcessing} onChange={e => setForm({ ...form, parallelProcessing: e.target.checked })} />
                  <span>Parallel Processing</span>
                </label>
              </div>

              <div style={{ gridColumn: '1 / -1', padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Processing Steps</h4>
                
                {form.steps.map((step, idx) => (
                  <div key={idx} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8, background: 'white', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontWeight: 600, minWidth: 30 }}>{step.order}.</span>
                      <input value={step.name} onChange={e => {
                        const updated = [...form.steps];
                        updated[idx].name = e.target.value;
                        setForm({ ...form, steps: updated });
                      }} style={{ ...input, flex: 1 }} placeholder="Step name" />
                      <select value={step.service} onChange={e => {
                        const updated = [...form.steps];
                        updated[idx].service = e.target.value;
                        setForm({ ...form, steps: updated });
                      }} style={{ ...input, width: 150 }}>
                        <option value="ocr">OCR</option>
                        <option value="classification">Classification</option>
                        <option value="extraction">Extraction (NER)</option>
                        <option value="qa">Q&A</option>
                        <option value="summarization">Summarization</option>
                        <option value="validation">Validation</option>
                        <option value="search">Semantic Search</option>
                        <option value="signature">Signature Detection</option>
                        <option value="storage">Storage & Indexing</option>
                        <option value="notification">Notification</option>
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="checkbox" checked={step.enabled} onChange={e => {
                          const updated = [...form.steps];
                          updated[idx].enabled = e.target.checked;
                          setForm({ ...form, steps: updated });
                        }} />
                        <span style={{ fontSize: 12 }}>Enabled</span>
                      </label>
                      <button onClick={() => removeStep(idx)} style={{ ...btnSmall, ...btnDanger }}>×</button>
                    </div>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 8, marginTop: 12, padding: 8, background: '#e0e7ff', borderRadius: 6 }}>
                  <input value={newStep.name} onChange={e => setNewStep({ ...newStep, name: e.target.value })} style={{ ...input, flex: 1 }} placeholder="New step name" />
                  <select value={newStep.service} onChange={e => setNewStep({ ...newStep, service: e.target.value })} style={{ ...input, width: 150 }}>
                    <option value="ocr">OCR</option>
                    <option value="classification">Classification</option>
                    <option value="extraction">Extraction (NER)</option>
                    <option value="qa">Q&A</option>
                    <option value="summarization">Summarization</option>
                    <option value="validation">Validation</option>
                    <option value="search">Semantic Search</option>
                    <option value="signature">Signature Detection</option>
                    <option value="storage">Storage & Indexing</option>
                    <option value="notification">Notification</option>
                  </select>
                  <button onClick={addStep} style={{ ...btnSmall, background: '#4338ca' }}>+ Add Step</button>
                </div>
              </div>
            </div>

            {error && <div style={{ ...errorBox, marginTop: 12 }}>{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => setModalOpen(false)} style={btnGhost}>Cancel</button>
              <button onClick={save} style={btnPrimary}>{editing ? 'Save Changes' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Component for Advanced Parameter Inputs
function ParamInput({ icon, label, value, onChange, min, max, step, unit, description }) {
  return (
    <div style={{
      padding: '16px',
      background: 'white',
      border: '1px solid #fbbf24',
      borderRadius: '8px'
    }}>
      <label style={{ 
        display: 'block', 
        fontSize: '13px', 
        fontWeight: '600', 
        color: '#92400e',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <span>{icon}</span>
        {label}
      </label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 12px',
            border: '2px solid #fbbf24',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'monospace'
          }}
        />
        {unit && (
          <span style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#92400e',
            minWidth: '50px'
          }}>
            {unit}
          </span>
        )}
      </div>
      <div style={{ fontSize: '11px', color: '#b45309', lineHeight: '1.4', marginTop: '6px' }}>
        {description}
      </div>
    </div>
  );
}

const btnPrimary = { padding: '10px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 };
const btnGhost = { padding: '10px 16px', background: 'white', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' };
const btnSmall = { padding: '6px 10px', background: '#334155', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const btnDanger = { background: '#dc2626' };
const pill = { background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' };
const statusBadge = { padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color: 'white' };
const errorBox = { padding: 12, background: '#fee2e2', border: '1px solid #fecaca', color: '#7f1d1d', borderRadius: 8 };
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 1000 };
const modal = { width: 900, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', background: 'white', borderRadius: 12, padding: 16 };
const label = { display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 };
const input = { width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 };
