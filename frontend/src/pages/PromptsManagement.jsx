import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createApi } from '../lib/api';
import DataTable from '../components/DataTable';

const AI_CAPABILITIES = [
  { value: 'classification', label: 'Classification', icon: '🏷️' },
  { value: 'ocr_icr', label: 'OCR/ICR', icon: '📝' },
  { value: 'ner_extraction', label: 'NER/Extraction', icon: '🔍' },
  { value: 'semantic_search', label: 'Semantic Search', icon: '🔎' },
  { value: 'conversational_search', label: 'Conversational Search', icon: '💬' },
  { value: 'qa', label: 'Q&A', icon: '❓' },
  { value: 'summarization', label: 'Summarization', icon: '📄' },
  { value: 'validation', label: 'Validation', icon: '✓' },
  { value: 'multi_modal', label: 'Multi-Modal', icon: '🖼️' }
];

const ENDPOINTS = [
  { value: '/api/v1/classify', label: 'Classify Document' },
  { value: '/api/v1/process', label: 'Full AI Pipeline' },
  { value: '/api/v1/extract', label: 'Extract Fields' },
  { value: '/api/v1/entities', label: 'Extract Entities' },
  { value: '/api/v1/search', label: 'Vector Search' },
  { value: '/api/v1/conversational-search', label: 'Conversational Search' },
  { value: '/api/v1/qa', label: 'Question Answering' },
  { value: '/api/v1/summarize', label: 'Summarize' },
  { value: '/api/v1/validate-ocr', label: 'Validate OCR' }
];

export default function PromptsManagement() {
  const { token } = useAuth();
  const api = useMemo(() => createApi(token), [token]);
  const [prompts, setPrompts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testing, setTesting] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testVariables, setTestVariables] = useState('{}');
  const [testDocText, setTestDocText] = useState('');
  const [editing, setEditing] = useState(null);
  const [filterTier, setFilterTier] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterCapability, setFilterCapability] = useState('all');

  const [form, setForm] = useState({
    name: '',
    description: '',
    content: '',
    tier: 'tier1',
    tierUrl: 'http://localhost:9000',
    companyId: null,
    aiCapability: 'classification',
    endpoint: '/api/v1/classify',
    documentTypes: [],
    triggerCondition: '',
    priority: 100,
    version: '1.0',
    variables: [],
    llmConfig: { maxTokens: 200, temperature: 0.7, topP: 0.9, topK: 40, stopSequences: [], presencePenalty: 0, frequencyPenalty: 0 },
    outputSchema: null,
    requiredOutputFields: [],
    costConfig: { estimatedTokensPerRun: 150, estimatedCostPerRun: 0.003, monthlyBudgetLimit: 100, currentMonthSpend: 0, alertThreshold: 80 },
    tags: [],
    notes: '',
    active: true,
    abTest: { enabled: false, variantName: '', trafficPercent: 50 }
  });

  useEffect(() => {
    loadPrompts();
    loadCompanies();
  }, []);

  async function loadPrompts() {
    try {
      const data = await api.get('/admin/prompts');
      setPrompts(data.prompts || []);
    } catch (e) {
      console.error('Load prompts failed:', e);
    }
  }

  async function loadCompanies() {
    try {
      const data = await api.get('/proxy/companies');
      setCompanies(data.companies || data.data || []);
    } catch (e) {
      console.error('Load companies failed:', e);
      setCompanies([]);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({
      name: '',
      description: '',
      content: '',
      tier: 'tier1',
      tierUrl: 'http://localhost:9000',
      companyId: null,
      aiCapability: 'classification',
      endpoint: '/api/v1/classify',
      documentTypes: [],
      triggerCondition: '',
      priority: 100,
      version: '1.0',
      variables: [],
      llmConfig: { maxTokens: 200, temperature: 0.7, topP: 0.9, topK: 40, stopSequences: [], presencePenalty: 0, frequencyPenalty: 0 },
      outputSchema: null,
      requiredOutputFields: [],
      costConfig: { estimatedTokensPerRun: 150, estimatedCostPerRun: 0.003, monthlyBudgetLimit: 100, currentMonthSpend: 0, alertThreshold: 80 },
      tags: [],
      notes: '',
      active: true,
      abTest: { enabled: false, variantName: '', trafficPercent: 50 }
    });
    setIsModalOpen(true);
  }

  function openEdit(prompt) {
    setEditing(prompt);
    setForm({
      name: prompt.name || '',
      description: prompt.description || '',
      content: prompt.content || '',
      tier: prompt.tier || 'tier1',
      tierUrl: prompt.tierUrl || 'http://localhost:9000',
      companyId: prompt.companyId?._id || prompt.companyId || null,
      aiCapability: prompt.aiCapability || 'classification',
      endpoint: prompt.endpoint || '/api/v1/classify',
      documentTypes: prompt.documentTypes || [],
      triggerCondition: prompt.triggerCondition || '',
      priority: prompt.priority || 100,
      version: prompt.version || '1.0',
      variables: prompt.variables || [],
      llmConfig: prompt.llmConfig || { maxTokens: 200, temperature: 0.7, topP: 0.9, topK: 40, stopSequences: [], presencePenalty: 0, frequencyPenalty: 0 },
      outputSchema: prompt.outputSchema || null,
      requiredOutputFields: prompt.requiredOutputFields || [],
      costConfig: prompt.costConfig || { estimatedTokensPerRun: 150, estimatedCostPerRun: 0.003, monthlyBudgetLimit: 100, currentMonthSpend: 0, alertThreshold: 80 },
      tags: prompt.tags || [],
      notes: prompt.notes || '',
      active: prompt.active !== false,
      abTest: prompt.abTest || { enabled: false, variantName: '', trafficPercent: 50 }
    });
    setIsModalOpen(true);
  }

  async function save() {
    try {
      let savedPrompt;
      if (editing) {
        savedPrompt = await api.put(`/admin/prompts/${editing._id}`, form);
      } else {
        savedPrompt = await api.post('/admin/prompts', form);
      }
      
      // Real-time sync to AI Service
      try {
        const syncResult = await api.post('/admin/prompts/sync-to-ai-service', {
          tier: form.tier,
          companyId: form.companyId
        });
        
        if (syncResult.success) {
          alert(`✅ Prompt saved and synced to AI Service!\n${syncResult.message}`);
        } else {
          alert(`⚠️ Prompt saved to database but sync partially failed:\n${syncResult.message}\n\nSome AI Service instances may need manual restart.`);
        }
      } catch (syncErr) {
        console.error('Sync error:', syncErr);
        alert(`⚠️ Prompt saved to database but could not sync to AI Service:\n${syncErr.message}\n\nAI Service may need restart to pick up changes.`);
      }
      
      setIsModalOpen(false);
      loadPrompts();
    } catch (e) {
      alert('Save failed: ' + e.message);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this prompt?')) return;
    try {
      await api.del(`/admin/prompts/${id}`);
      loadPrompts();
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
  }

  async function testPrompt(prompt) {
    setTesting(prompt);
    setTestResult(null);
    setTestVariables('{}');
    setTestDocText('Sample document text for testing...');
    setIsTestModalOpen(true);
  }

  async function runTest() {
    try {
      const variables = JSON.parse(testVariables);
      const result = await api.post(`/admin/prompts/${testing._id}/test`, {
        variables,
        documentText: testDocText,
        documentType: 'general'
      });
      setTestResult(result);
    } catch (e) {
      setTestResult({ success: false, error: e.message });
    }
  }

  function addVariable() {
    setForm({
      ...form,
      variables: [...form.variables, { name: '', description: '', default: '', required: false, type: 'string' }]
    });
  }

  function updateVariable(index, field, value) {
    const updated = [...form.variables];
    updated[index][field] = value;
    setForm({ ...form, variables: updated });
  }

  function removeVariable(index) {
    setForm({
      ...form,
      variables: form.variables.filter((_, i) => i !== index)
    });
  }

  const filteredPrompts = prompts.filter(p => {
    if (filterTier !== 'all' && p?.tier !== filterTier) return false;
    if (filterCompany !== 'all') {
      if (filterCompany === 'global' && p?.companyId) return false;
      if (filterCompany !== 'global' && (!p?.companyId || (typeof p.companyId === 'object' ? p.companyId._id : p.companyId) !== filterCompany)) return false;
    }
    if (filterCapability !== 'all' && p?.aiCapability !== filterCapability) return false;
    return true;
  });

  const columns = [
    { 
      key: 'name', 
      label: 'Name',
      render: (v, row) => (
        <div>
          <div style={{ fontWeight: '600' }}>{row.name || '-'}</div>
          {row?.companyId?.name && <div style={{ fontSize: '12px', color: '#64748b' }}>{row.companyId.name}</div>}
          {!row?.companyId && <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>Global</div>}
        </div>
      )
    },
    { 
      key: 'aiCapability', 
      label: 'AI Capability', 
      render: (v, row) => {
        const val = row.aiCapability;
        if (!val) return <span style={{ fontSize: '12px', color: '#94a3b8' }}>-</span>;
        const cap = AI_CAPABILITIES.find(c => c.value === val);
        return <span style={{ fontSize: '12px' }}>{cap?.icon} {cap?.label || val}</span>;
      }
    },
    { 
      key: 'endpoint', 
      label: 'Endpoint', 
      render: (v, row) => row.endpoint ? <code style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '3px' }}>{row.endpoint}</code> : <span style={{ color: '#94a3b8' }}>-</span>
    },
    { 
      key: 'tier', 
      label: 'Tier', 
      render: (v, row) => {
        const val = row.tier;
        if (!val || typeof val !== 'string') return <span style={{ color: '#94a3b8' }}>-</span>;
        const colors = { tier1: '#10b981', tier2: '#3b82f6', tier3: '#8b5cf6', all: '#64748b' };
        return <span style={{ padding: '4px 8px', background: colors[val] || '#64748b', color: 'white', borderRadius: '4px', fontSize: '12px' }}>{val.toUpperCase()}</span>;
      }
    },
    { 
      key: 'metrics', 
      label: 'Usage', 
      render: (v, row) => {
        const m = row.metrics || {};
        return (
          <div style={{ fontSize: '12px' }}>
            <div>{m.usageCount || 0} uses</div>
            <div style={{ color: (m.successRate || 0) > 80 ? '#10b981' : '#f59e0b' }}>{(m.successRate || 0).toFixed(1)}% success</div>
          </div>
        );
      }
    },
    { 
      key: 'costConfig', 
      label: 'Cost', 
      render: (v, row) => {
        const c = row.costConfig || {};
        const spent = c.currentMonthSpend || 0;
        const limit = c.monthlyBudgetLimit || 100;
        const percent = (spent / limit) * 100;
        return (
          <div style={{ fontSize: '12px' }}>
            <div>${spent.toFixed(2)} / ${limit}</div>
            <div style={{ width: '60px', height: '4px', background: '#e2e8f0', borderRadius: '2px', marginTop: '2px' }}>
              <div style={{ width: `${Math.min(percent, 100)}%`, height: '100%', background: percent > 80 ? '#dc2626' : '#10b981', borderRadius: '2px' }}></div>
            </div>
          </div>
        );
      }
    },
    { key: 'active', label: 'Status', render: (v, row) => <span>{row.active ? '✅' : '❌'}</span> },
    {
      key: 'actions',
      label: 'Actions',
      render: (v, row) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={() => testPrompt(row)} title="Test Prompt" style={{ padding: '4px 8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🧪</button>
          <button onClick={() => openEdit(row)} title="Edit" style={{ padding: '4px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✏️</button>
          <button onClick={() => remove(row._id)} title="Delete" style={{ padding: '4px 8px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', color: '#1e293b' }}>AI Prompts Management</h1>
          <p style={{ margin: 0, color: '#64748b' }}>Manage prompts for Tier 1/2/3 AI capabilities with company-specific controls</p>
        </div>
        <button onClick={openCreate} style={{ padding: '12px 24px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
          ➕ New Prompt
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}>
          <option value="all">All Tiers</option>
          <option value="tier1">Tier 1</option>
          <option value="tier2">Tier 2</option>
          <option value="tier3">Tier 3</option>
        </select>
        <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}>
          <option value="all">All Companies</option>
          <option value="global">Global (All Companies)</option>
          {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={filterCapability} onChange={(e) => setFilterCapability(e.target.value)} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}>
          <option value="all">All Capabilities</option>
          {AI_CAPABILITIES.map(cap => <option key={cap.value} value={cap.value}>{cap.icon} {cap.label}</option>)}
        </select>
      </div>

      {/* Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Total Prompts</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#667eea' }}>{prompts.length}</div>
        </div>
        <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Active</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>{prompts.filter(p => p.active).length}</div>
        </div>
        <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Company-Specific</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>{prompts.filter(p => p.companyId).length}</div>
        </div>
        <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Global</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#64748b' }}>{prompts.filter(p => !p.companyId).length}</div>
        </div>
      </div>

      <DataTable columns={columns} data={filteredPrompts} />

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ margin: '0 0 24px 0' }}>{editing ? 'Edit Prompt' : 'New Prompt'}</h2>
            
            {/* Basic Info */}
            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>📋 Basic Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Version</label>
                <input type="text" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
              </div>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Description</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
            </div>

            {/* Routing & Mapping */}
            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>🔀 Routing & Mapping</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Tier *</label>
                <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <option value="tier1">Tier 1 (localhost:9000)</option>
                  <option value="tier2">Tier 2 (localhost:9001)</option>
                  <option value="tier3">Tier 3 (localhost:9002)</option>
                  <option value="all">All Tiers</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Company</label>
                <select value={form.companyId || ''} onChange={(e) => setForm({ ...form, companyId: e.target.value || null })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <option value="">Global (All Companies)</option>
                  {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>AI Capability *</label>
                <select value={form.aiCapability} onChange={(e) => setForm({ ...form, aiCapability: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  {AI_CAPABILITIES.map(cap => <option key={cap.value} value={cap.value}>{cap.icon} {cap.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Endpoint *</label>
                <select value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  {ENDPOINTS.map(ep => <option key={ep.value} value={ep.value}>{ep.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Document Types (comma-separated)</label>
                <input type="text" value={form.documentTypes.join(', ')} onChange={(e) => setForm({ ...form, documentTypes: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} placeholder="Invoice, Receipt, Student Transcript" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Priority</label>
                <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 100 })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
              </div>
            </div>

            {/* Prompt Content */}
            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>✍️ Prompt Content</h3>
            <div style={{ marginBottom: '24px' }}>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} placeholder="Enter your prompt template here. Use {{variableName}} for variables." style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontFamily: 'monospace', fontSize: '13px' }} />
            </div>

            {/* Variables */}
            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>🔤 Variables</h3>
            <div style={{ marginBottom: '24px' }}>
              <button onClick={addVariable} style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', marginBottom: '12px' }}>+ Add Variable</button>
              {form.variables.map((v, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 80px auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <input placeholder="Name" value={v.name} onChange={(e) => updateVariable(i, 'name', e.target.value)} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }} />
                  <input placeholder="Default Value" value={v.default} onChange={(e) => updateVariable(i, 'default', e.target.value)} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }} />
                  <select value={v.type || 'string'} onChange={(e) => updateVariable(i, 'type', e.target.value)} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px' }}>
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                  </select>
                  <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                    <input type="checkbox" checked={v.required || false} onChange={(e) => updateVariable(i, 'required', e.target.checked)} style={{ marginRight: '4px' }} />
                    Required
                  </label>
                  <button onClick={() => removeVariable(i)} style={{ padding: '8px 12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                </div>
              ))}
            </div>

            {/* LLM Configuration */}
            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>🤖 LLM Configuration</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Max Tokens</label>
                <input type="number" value={form.llmConfig.maxTokens} onChange={(e) => setForm({ ...form, llmConfig: { ...form.llmConfig, maxTokens: parseInt(e.target.value) || 200 } })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Temperature (0-2)</label>
                <input type="number" step="0.1" min="0" max="2" value={form.llmConfig.temperature} onChange={(e) => setForm({ ...form, llmConfig: { ...form.llmConfig, temperature: parseFloat(e.target.value) || 0.7 } })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Top P (0-1)</label>
                <input type="number" step="0.1" min="0" max="1" value={form.llmConfig.topP} onChange={(e) => setForm({ ...form, llmConfig: { ...form.llmConfig, topP: parseFloat(e.target.value) || 0.9 } })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
              </div>
            </div>

            {/* Cost Controls */}
            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>💰 Cost Controls</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Estimated Tokens Per Run</label>
                <input type="number" value={form.costConfig.estimatedTokensPerRun} onChange={(e) => setForm({ ...form, costConfig: { ...form.costConfig, estimatedTokensPerRun: parseInt(e.target.value) || 150 } })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Monthly Budget Limit ($)</label>
                <input type="number" value={form.costConfig.monthlyBudgetLimit} onChange={(e) => setForm({ ...form, costConfig: { ...form.costConfig, monthlyBudgetLimit: parseFloat(e.target.value) || 100 } })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
              </div>
            </div>

            {/* Metadata */}
            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>🏷️ Metadata</h3>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Tags (comma-separated)</label>
                <input type="text" value={form.tags.join(', ')} onChange={(e) => setForm({ ...form, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} placeholder="fue, student, transcript, qa" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Internal notes about this prompt..." style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} style={{ marginRight: '8px' }} />
              <label style={{ fontSize: '14px', fontWeight: '500' }}>Active</label>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
              <button onClick={save} style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Save Prompt</button>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {isTestModalOpen && testing && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '20px' }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ margin: '0 0 24px 0' }}>🧪 Test Prompt: {testing.name}</h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Variables (JSON)</label>
              <textarea value={testVariables} onChange={(e) => setTestVariables(e.target.value)} rows={4} placeholder='{"variableName": "value"}' style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontFamily: 'monospace', fontSize: '13px' }} />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Document Text</label>
              <textarea value={testDocText} onChange={(e) => setTestDocText(e.target.value)} rows={6} placeholder="Sample document text..." style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }} />
            </div>
            
            <button onClick={runTest} style={{ padding: '10px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', marginBottom: '16px' }}>▶️ Run Test</button>
            
            {testResult && (
              <div style={{ padding: '16px', background: testResult.success ? '#f0fdf4' : '#fef2f2', border: `1px solid ${testResult.success ? '#10b981' : '#dc2626'}`, borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Test Result</h3>
                {testResult.success ? (
                  <>
                    <div style={{ marginBottom: '12px' }}>
                      <strong>Metrics:</strong>
                      <div style={{ fontSize: '13px', marginTop: '4px' }}>
                        <div>⏱️ Latency: {testResult.metrics?.latency}</div>
                        <div>🎯 Estimated Tokens: {testResult.metrics?.estimatedTokens}</div>
                        <div>💰 Estimated Cost: {testResult.metrics?.estimatedCost}</div>
                      </div>
                    </div>
                    <div>
                      <strong>Result:</strong>
                      <pre style={{ fontSize: '12px', background: 'white', padding: '12px', borderRadius: '6px', marginTop: '8px', overflow: 'auto', maxHeight: '200px' }}>{JSON.stringify(testResult.result, null, 2)}</pre>
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#dc2626' }}>
                    <strong>Error:</strong> {testResult.error}
                  </div>
                )}
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setIsTestModalOpen(false)} style={{ padding: '10px 20px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
