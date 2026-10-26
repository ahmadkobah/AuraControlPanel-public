import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createApi } from '../lib/api';
import DataTable from '../components/DataTable';

export default function Classifications() {
  const { token } = useAuth();
  const api = useMemo(() => createApi(token), [token]);

  // Current tier view
  const [selectedTier, setSelectedTier] = useState('all'); // 'all', 'basic', 'plus', 'pro'
  const [selectedCompany, setSelectedCompany] = useState(''); // Filter by company

  // Data states
  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [tierServices, setTierServices] = useState({
    basic: { status: 'unknown', types: [] },
    plus: { status: 'unknown', types: [] },
    pro: { status: 'unknown', types: [] }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testFile, setTestFile] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const emptyForm = {
    label: '',
    category: 'custom',
    description: '',
    keywords: [],
    companyId: '',
    isActive: true,
    confidence_threshold: 0.08,
    priority: 100,
    customPrompt: '',
    autoFilingPath: '',
    requiredFields: [],
    validationRules: {},
    tierSettings: {
      basic: { enabled: true, confidence_threshold: 0.08, customPrompt: '', autoActions: { autoPrint: false } },
      plus: { enabled: true, confidence_threshold: 0.15, customPrompt: '', autoActions: { autoPrint: false } },
      pro: { enabled: true, confidence_threshold: 0.85, customPrompt: '', autoActions: { autoPrint: false } }
    },
    autoActions: {
      autoPrint: false,
      printerId: '',
      notifyUsers: [],
      webhookUrl: ''
    }
  };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      // Load classifications
      const params = new URLSearchParams();
      if (selectedTier !== 'all') params.append('tier', selectedTier);
      if (selectedCompany) params.append('companyId', selectedCompany);
      
      const data = await api.get(`/admin/classifications?${params.toString()}`);
      setItems(data.classifications || []);

      // Load companies for filter
      try {
        const companiesData = await api.get('/proxy/companies');
        setCompanies(companiesData.companies || companiesData.data || []);
      } catch (e) {
        console.warn('Failed to load companies:', e);
        setCompanies([]);
      }

      // Check tier service health and get available document types
      await checkTierServices();
    } catch (e) {
      setError(e.message || 'Failed to load classifications');
    } finally {
      setLoading(false);
    }
  };

  const checkTierServices = async () => {
    const tiers = ['basic', 'plus', 'pro'];

    for (const tier of tiers) {
      try {
        // Check health via backend proxy
        const healthData = await api.get(`/admin/ai-proxy/health/${tier}`);
        
        // Try to get actual classification types from the database
        let types = getDocumentTypes(); // Fallback to hardcoded list
        
        try {
            // Query the AI service for its actual supported classification types
            // This would need an endpoint like GET /classification/types
            // For now, we'll use the existing classifications from the database
            const dbClassifications = await api.get('/admin/classifications');
            const existingTypes = [...new Set(dbClassifications.classifications?.map(c => c.label) || [])];
            
            if (existingTypes.length > 0) {
              // Merge existing types with default types
              types = [...new Set([...existingTypes, ...getDocumentTypes()])].sort();
            }
          } catch (e) {
            console.warn(`Could not fetch classification types for ${tier}:`, e);
          }
          
          setTierServices(prev => ({
            ...prev,
            [tier]: {
              ...prev[tier],
              status: healthData.status === 'healthy' ? 'healthy' : 'degraded',
              types: types
            }
          }));
      } catch (e) {
        setTierServices(prev => ({
          ...prev,
          [tier]: { ...prev[tier], status: 'offline', types: getDocumentTypes() }
        }));
      }
    }
  };

  // Document types from classifier.py - EXACT list from AI service
  const getDocumentTypes = () => [
    // Financial Documents (9 types)
    'Invoice',
    'Receipt',
    'Purchase Order',
    'Credit Note',
    'Debit Note',
    'Payment Voucher',
    'Bank Statement',
    'Financial Statement',
    'Tax Document',
    
    // Legal Documents (7 types)
    'Contract',
    'Agreement',
    'Non-Disclosure Agreement',
    'Memorandum of Understanding',
    'Certificate',
    'License',
    'Permit',
    
    // Business Documents (6 types)
    'Report',
    'Business Letter',
    'Memo',
    'Proposal',
    'Quotation',
    'Tender Document',
    
    // Operational Documents (5 types)
    'Form',
    'Delivery Note',
    'Packing Slip',
    'Bill of Lading',
    'Shipping Document',
    
    // HR Documents (3 types)
    'Resume',
    'Job Application',
    'Employment Contract',
    
    // Fallback (1 type)
    'Other'
  ];

  useEffect(() => { load(); }, [selectedTier, selectedCompany]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      label: row.label || '',
      category: row.category || 'custom',
      description: row.description || '',
      keywords: row.keywords || [],
      requiredFields: row.requiredFields || [],
      validationRules: row.validationRules || {},
      companyId: row.companyId?._id || row.companyId || '',
      isActive: row.isActive !== undefined ? row.isActive : true,
      confidence_threshold: row.confidence_threshold ?? 0.08,
      priority: row.priority ?? 100,
      customPrompt: row.customPrompt || '',
      autoFilingPath: row.autoFilingPath || '',
      tierSettings: row.tierSettings || {
        basic: { enabled: true, confidence_threshold: 0.08, customPrompt: '', autoActions: { autoPrint: false } },
        plus: { enabled: true, confidence_threshold: 0.15, customPrompt: '', autoActions: { autoPrint: false } },
        pro: { enabled: true, confidence_threshold: 0.85, customPrompt: '', autoActions: { autoPrint: false } }
      },
      autoActions: {
        autoPrint: row.autoActions?.autoPrint || false,
        printerId: row.autoActions?.printerId || '',
        notifyUsers: row.autoActions?.notifyUsers || [],
        webhookUrl: row.autoActions?.webhookUrl || ''
      }
    });
    setModalOpen(true);
  };

  const save = async () => {
    setError('');
    
    // Validate required fields
    if (!form.label) {
      setError('Label is required');
      return;
    }

    const payload = {
      ...form,
      confidence_threshold: Number(form.confidence_threshold),
      priority: Number(form.priority),
      companyId: form.companyId || null,
      requiredFields: form.requiredFields || [],
      validationRules: form.validationRules || {},
      tierSettings: {
        basic: {
          ...form.tierSettings.basic,
          confidence_threshold: Number(form.tierSettings.basic.confidence_threshold)
        },
        plus: {
          ...form.tierSettings.plus,
          confidence_threshold: Number(form.tierSettings.plus.confidence_threshold)
        },
        pro: {
          ...form.tierSettings.pro,
          confidence_threshold: Number(form.tierSettings.pro.confidence_threshold)
        }
      }
    };
    
    try {
      if (editing) {
        await api.put(`/admin/classifications/${editing._id}`, payload);
      } else {
        await api.post('/admin/classifications', payload);
      }
      
      // Real-time sync to AI Service with conflict resolution
      try {
        const syncResult = await api.post('/admin/classifications/sync-to-ai-service', {
          companyId: payload.companyId
        });
        
        if (syncResult?.success) {
          alert('✅ Classification saved and synced to AI Service!');
        } else if (syncResult?.partial) {
          alert('⚠️ Classification saved to database but sync partially failed. Some tiers may need manual sync.');
        }
      } catch (syncError) {
        console.error('Sync to AI Service failed:', syncError);
        alert('⚠️ Classification saved to database but sync failed. AI Service may need restart to pick up changes.');
      }
      
      setModalOpen(false);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to save');
    }
  };

  const remove = async (row) => {
    if (!confirm('Delete this classification?')) return;
    try {
      await api.del(`/admin/classifications/${row._id}`);
      await load();
    } catch (e) {
      alert(e.message || 'Delete failed');
    }
  };

  const testClassification = async () => {
    if (!testFile) {
      alert('Please select a file to test');
      return;
    }

    setTestLoading(true);
    setTestResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', testFile);
      formData.append('tier', selectedTier === 'all' ? 'basic' : selectedTier);

      // Call AI service via backend proxy for testing
      const testTier = selectedTier === 'all' ? 'basic' : selectedTier;
      const apiBase = import.meta?.env?.VITE_API_BASE || 'http://localhost:4000';
      const response = await fetch(`${apiBase}/admin/ai-proxy/classify/${testTier}`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData
      });

      if (!response.ok) throw new Error('Classification failed');
      
      const result = await response.json();
      setTestResult(result);
    } catch (e) {
      setTestResult({ error: e.message });
    } finally {
      setTestLoading(false);
    }
  };

  const bulkEnable = async () => {
    if (!confirm(`Enable all classifications for ${selectedTier === 'all' ? 'all tiers' : selectedTier + ' tier'}?`)) return;
    
    try {
      const updates = items.map(item => ({
        _id: item._id,
        isActive: true
      }));
      
      await Promise.all(updates.map(u => api.put(`/admin/classifications/${u._id}`, { isActive: true })));
      await load();
    } catch (e) {
      alert(e.message || 'Bulk enable failed');
    }
  };

  const bulkDisable = async () => {
    if (!confirm(`Disable all classifications for ${selectedTier === 'all' ? 'all tiers' : selectedTier + ' tier'}?`)) return;
    
    try {
      const updates = items.map(item => ({
        _id: item._id,
        isActive: false
      }));
      
      await Promise.all(updates.map(u => api.put(`/admin/classifications/${u._id}`, { isActive: false })));
      await load();
    } catch (e) {
      alert(e.message || 'Bulk disable failed');
    }
  };

  const exportConfig = () => {
    const config = {
      tier: selectedTier,
      companyId: selectedCompany,
      classifications: items,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `classifications-${selectedTier}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    { 
      key: 'label', 
      label: 'Document Type', 
      render: (v, row) => (
        <div>
          <strong style={{ fontSize: 14 }}>{row.label}</strong>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            {row.category && <span style={categoryBadge(row.category)}>{row.category}</span>}
          </div>
        </div>
      )
    },
    { 
      key: 'priority', 
      label: 'Priority',
      render: (v, row) => (
        <div style={{ textAlign: 'center', fontWeight: 600, color: row.priority > 500 ? '#dc2626' : row.priority > 100 ? '#f59e0b' : '#64748b' }}>
          {row.priority}
        </div>
      )
    },
    { 
      key: 'confidence_threshold', 
      label: 'Global Threshold', 
      render: (v, row) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 600 }}>{(row.confidence_threshold * 100).toFixed(0)}%</div>
        </div>
      )
    },
    { 
      key: 'tierSettings', 
      label: 'Tier Status', 
      render: (v, row) => {
        const tiers = row.tierSettings || {};
        return (
          <div style={{ display: 'flex', gap: 4, fontSize: 11 }}>
            {['basic', 'plus', 'pro'].map(tier => {
              const enabled = tiers[tier]?.enabled !== false;
              const threshold = tiers[tier]?.confidence_threshold || row.confidence_threshold;
              return (
                <span 
                  key={tier} 
                  style={{
                    padding: '3px 8px',
                    borderRadius: 12,
                    background: enabled ? '#10b981' : '#ef4444',
                    color: 'white',
                    fontWeight: 600
                  }}
                  title={`${tier}: ${enabled ? 'Enabled' : 'Disabled'} (${(threshold * 100).toFixed(0)}%)`}
                >
                  {tier[0].toUpperCase()}
                </span>
              );
            })}
          </div>
        );
      }
    },
    { 
      key: 'keywords', 
      label: 'Keywords', 
      render: (v, row) => {
        const kw = (row.keywords || []).slice(0, 2);
        return (
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {kw.join(', ')}
            {row.keywords?.length > 2 && ` +${row.keywords.length - 2}`}
          </div>
        );
      }
    },
    { 
      key: 'isActive', 
      label: 'Status', 
      render: (v, row) => (
        <span style={{ 
          ...statusBadge, 
          background: row.isActive ? '#10b981' : '#6b7280' 
        }}>
          {row.isActive ? '✓ Active' : '✗ Inactive'}
        </span>
      )
    },
    { 
      key: 'companyId', 
      label: 'Scope', 
      render: (v, row) => {
        const isGlobal = !row.companyId;
        return (
          <span style={{
            padding: '4px 12px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            background: isGlobal ? '#dbeafe' : '#fef3c7',
            color: isGlobal ? '#1e40af' : '#92400e'
          }}>
            {isGlobal ? '🌐 Global' : '🏢 ' + (row.companyId?.name || 'Company')}
          </span>
        );
      }
    }
  ];

  return (
    <div style={{ padding: '0 0 40px 0' }}>
      <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', color: '#1e293b' }}>AI Classifications</h1>
      <p style={{ margin: '0 0 24px 0', color: '#64748b' }}>Manage document classification types and auto-actions across tiers.</p>

      {/* Tier Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
        {['all', 'basic', 'plus', 'pro'].map(tier => (
          <button
            key={tier}
            onClick={() => setSelectedTier(tier)}
            style={{
              padding: '12px 24px',
              background: selectedTier === tier ? '#667eea' : 'transparent',
              color: selectedTier === tier ? 'white' : '#64748b',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: selectedTier === tier ? '600' : '400',
              fontSize: '14px',
              transition: 'all 0.2s',
              position: 'relative',
              top: '2px'
            }}
          >
            {tier === 'all' ? '🌐 All Tiers' : `${tier === 'basic' ? '🥉' : tier === 'plus' ? '🥈' : '🥇'} ${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier`}
            {tier !== 'all' && (
              <span style={{
                marginLeft: 8,
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 11,
                background: tierServices[tier].status === 'healthy' ? '#10b981' :
                           tierServices[tier].status === 'degraded' ? '#f59e0b' : '#ef4444',
                color: 'white'
              }}>
                {tierServices[tier].status === 'healthy' ? '●' : tierServices[tier].status === 'degraded' ? '◐' : '○'}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters & Actions */}
      <div style={{ background: 'white', padding: 20, borderRadius: 12, marginBottom: 20, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Company Filter */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Filter by Company</label>
            <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} style={input}>
              <option value="">All Companies (Global)</option>
              {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>

          {/* Tier Info */}
          {selectedTier !== 'all' && (
            <div style={{ gridColumn: '2 / -1', padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>
                <strong>Service URL:</strong> {tierServices[selectedTier].url}
                <span style={{ 
                  marginLeft: 8, 
                  padding: '2px 8px', 
                  borderRadius: 12, 
                  fontSize: 11,
                  background: tierServices[selectedTier].status === 'healthy' ? '#d1fae5' : 
                             tierServices[selectedTier].status === 'degraded' ? '#fef3c7' : '#fee2e2',
                  color: tierServices[selectedTier].status === 'healthy' ? '#065f46' : 
                         tierServices[selectedTier].status === 'degraded' ? '#92400e' : '#991b1b'
                }}>
                  {tierServices[selectedTier].status}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#475569' }}>
                <strong>Available Types:</strong> {tierServices[selectedTier].types?.length || 0} document types
                {items.length > 0 && (
                  <span style={{ marginLeft: 8, color: '#10b981' }}>
                    | ✓ {items.filter(i => i.tierSettings?.[selectedTier]?.enabled !== false).length} enabled for this tier
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={openCreate} style={btnPrimary}>+ New Classification</button>
          <button onClick={load} style={btnGhost}>🔄 Refresh</button>
          <button onClick={() => setTestModalOpen(true)} style={btnGhost}>🧪 Test Classification</button>
          <button onClick={bulkEnable} style={{ ...btnGhost, borderColor: '#10b981', color: '#10b981' }}>✓ Enable All</button>
          <button onClick={bulkDisable} style={{ ...btnGhost, borderColor: '#ef4444', color: '#ef4444' }}>✗ Disable All</button>
          <button onClick={exportConfig} style={btnGhost}>📥 Export Config</button>
        </div>
      </div>

      {/* Error */}
      {error && <div style={errorBox}>{error}</div>}
      
      {/* Data Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading classifications...</div>
      ) : (
        <DataTable columns={columns} data={items} onEdit={openEdit} onDelete={remove} emptyMessage="No classifications configured" />
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div style={modalOverlay}>
          <div style={{ ...modal, maxWidth: '1100px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{editing ? 'Edit Classification' : 'Create Classification'}</h3>
              <button onClick={() => setModalOpen(false)} style={btnGhost}>Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Label *</label>
                <select value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} style={input}>
                  <option value="">-- Select Document Type --</option>
                  <optgroup label="🗄️ Existing Types in Database">
                    {[...new Set(items.map(i => i.label))].sort().map(type => (
                      <option key={`existing-${type}`} value={type}>✓ {type}</option>
                    ))}
                  </optgroup>
                  <optgroup label="📋 Standard Types">
                    {getDocumentTypes().map(type => <option key={type} value={type}>{type}</option>)}
                  </optgroup>
                </select>
              </div>

              <div>
                <label style={label}>Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={input}>
                  {['financial','legal','business','operational','hr','custom'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={label}>Priority (higher = first)</label>
                <input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={input} />
              </div>

              <div>
                <label style={label}>Global Confidence Threshold (0-1) 
                  <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>AI Default: 0.08 (8%)</span>
                </label>
                <input type="number" step="0.01" min="0" max="1" value={form.confidence_threshold} onChange={e => setForm({ ...form, confidence_threshold: e.target.value })} style={input} />
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  Below 8% → "Other" | Below 15% → Llama override | 85%+ → High confidence
                </div>
              </div>

              <div>
                <label style={label}>Company (leave blank for global)</label>
                <select value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })} style={input}>
                  <option value="">Global (All Companies)</option>
                  {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label style={label}>Active Status</label>
                <select value={form.isActive ? 'true' : 'false'} onChange={e => setForm({ ...form, isActive: e.target.value === 'true' })} style={input}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label}>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...input, minHeight: 60, resize: 'vertical' }} placeholder="What this classification represents..." />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label}>Keywords (comma-separated)
                  <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>Boost matching for these terms</span>
                </label>
                <input value={form.keywords.join(', ')} onChange={e => setForm({ ...form, keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} style={input} placeholder="invoice, bill, payment" />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label}>Required Fields (comma-separated)
                  <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>Fields that must be extracted</span>
                </label>
                <input value={(form.requiredFields || []).join(', ')} onChange={e => setForm({ ...form, requiredFields: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} style={input} placeholder="invoice_number, date, total" />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label}>Auto Filing Path</label>
                <input value={form.autoFilingPath} onChange={e => setForm({ ...form, autoFilingPath: e.target.value })} style={input} placeholder="/documents/invoices" />
              </div>
            </div>

            {/* AI Service Parameters Info */}
            <div style={{ marginTop: 16, padding: 12, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 6 }}>
                ℹ️ AI Service Classification Parameters
              </h4>
              <div style={{ fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
                <div><strong>Method:</strong> Zero-shot classification using sentence transformers (all-MiniLM-L6-v2)</div>
                <div><strong>Algorithm:</strong> Cosine similarity + Softmax normalization</div>
                <div><strong>Thresholds:</strong> &lt;8% = "Other" | &lt;15% = Llama override | 85%+ = High confidence</div>
                <div><strong>Enhancement:</strong> Llama reasoning provides key indicators and validation</div>
                <div><strong>Categories:</strong> 31 document types across 5 categories (Financial, Legal, Business, Operational, HR)</div>
              </div>
            </div>

            {/* Current Tier Configuration */}
            <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 16, color: '#1e293b' }}>
                ⚙️ {selectedTier === 'all' ? 'Multi-Tier Configuration' : `${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Tier Configuration`}
              </h4>
              <p style={{ margin: '0 0 16px 0', fontSize: 12, color: '#64748b' }}>
                {selectedTier === 'all' 
                  ? 'Configure how this classification behaves across all three tiers'
                  : `Configure how this classification behaves specifically on the ${selectedTier} tier`}
              </p>
              
              {(selectedTier === 'all' ? ['basic', 'plus', 'pro'] : [selectedTier]).map(tier => {
                const tierDefaults = {
                  basic: { threshold: 0.08, desc: 'Standard (8% - accepts most matches)' },
                  plus: { threshold: 0.15, desc: 'Enhanced (15% - triggers Llama validation)' },
                  pro: { threshold: 0.85, desc: 'Premium (85% - high confidence only)' }
                };
                
                return (
                  <div key={tier} style={{ marginBottom: 16, padding: 12, background: 'white', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#334155' }}>
                        {tier === 'basic' ? '🥉' : tier === 'plus' ? '🥈' : '🥇'} {tier.charAt(0).toUpperCase() + tier.slice(1)} Tier
                        {selectedTier === 'all' && (
                          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400, marginLeft: 8 }}>
                            {tierDefaults[tier].desc}
                          </span>
                        )}
                      </h5>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={form.tierSettings[tier].enabled} 
                          onChange={e => setForm({ 
                            ...form, 
                            tierSettings: { 
                              ...form.tierSettings, 
                              [tier]: { ...form.tierSettings[tier], enabled: e.target.checked } 
                            } 
                          })} 
                        />
                        <span style={{ fontSize: 13, color: '#64748b' }}>
                          {selectedTier === 'all' ? 'Enable for this tier' : 'Enable this classification'}
                        </span>
                      </label>
                    </div>

                    {form.tierSettings[tier].enabled && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                        <div>
                          <label style={{ ...label, fontSize: 12 }}>
                            Confidence Threshold
                            <span style={{ fontSize: 10, color: '#64748b', marginLeft: 4 }}>
                              (Recommended: {tierDefaults[tier].threshold})
                            </span>
                          </label>
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            max="1" 
                            value={form.tierSettings[tier].confidence_threshold} 
                            onChange={e => setForm({ 
                              ...form, 
                              tierSettings: { 
                                ...form.tierSettings, 
                                [tier]: { ...form.tierSettings[tier], confidence_threshold: parseFloat(e.target.value) } 
                              } 
                            })} 
                            style={{ ...input, fontSize: 13 }} 
                            placeholder={tierDefaults[tier].threshold.toString()}
                          />
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                            {form.tierSettings[tier].confidence_threshold < 0.08 && '⚠️ Very permissive'}
                            {form.tierSettings[tier].confidence_threshold >= 0.08 && form.tierSettings[tier].confidence_threshold < 0.15 && '✓ Standard'}
                            {form.tierSettings[tier].confidence_threshold >= 0.15 && form.tierSettings[tier].confidence_threshold < 0.85 && '✓ Enhanced with Llama'}
                            {form.tierSettings[tier].confidence_threshold >= 0.85 && '✓ High confidence'}
                          </div>
                        </div>

                        <div>
                          <label style={{ ...label, fontSize: 12 }}>
                            Custom Llama Prompt (optional)
                            <span style={{ fontSize: 10, color: '#64748b', marginLeft: 4 }}>Override reasoning prompt</span>
                          </label>
                          <textarea 
                            value={form.tierSettings[tier].customPrompt} 
                            onChange={e => setForm({ 
                              ...form, 
                              tierSettings: { 
                                ...form.tierSettings, 
                                [tier]: { ...form.tierSettings[tier], customPrompt: e.target.value } 
                              } 
                            })} 
                            style={{ ...input, fontSize: 13, minHeight: 50, resize: 'vertical' }} 
                            placeholder={`Custom Llama prompt for ${tier} tier classification reasoning...`} 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Global Auto Actions */}
            <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 14 }}>🔔 Auto Actions (Global)</h4>
              
              <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <input type="checkbox" checked={form.autoActions.autoPrint} onChange={e => setForm({ ...form, autoActions: { ...form.autoActions, autoPrint: e.target.checked }})} />
                <span>Auto Print</span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={label}>Printer ID</label>
                  <input value={form.autoActions.printerId} onChange={e => setForm({ ...form, autoActions: { ...form.autoActions, printerId: e.target.value }})} style={input} placeholder="ObjectId" />
                </div>

                <div>
                  <label style={label}>Webhook URL</label>
                  <input value={form.autoActions.webhookUrl} onChange={e => setForm({ ...form, autoActions: { ...form.autoActions, webhookUrl: e.target.value }})} style={input} placeholder="https://..." />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={label}>Notify Users (comma-separated IDs)</label>
                  <input value={(form.autoActions.notifyUsers || []).join(', ')} onChange={e => setForm({ ...form, autoActions: { ...form.autoActions, notifyUsers: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }})} style={input} placeholder="user1, user2" />
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

      {/* Test Classification Modal */}
      {testModalOpen && (
        <div style={modalOverlay}>
          <div style={modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>🧪 Test Classification</h3>
              <button onClick={() => { setTestModalOpen(false); setTestResult(null); setTestFile(null); }} style={btnGhost}>Close</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label}>Select Document to Test</label>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setTestFile(e.target.files[0])} style={{ ...input, padding: 8 }} />
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Supported: PDF, PNG, JPG, JPEG
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label}>Test with Tier</label>
              <select value={selectedTier === 'all' ? 'basic' : selectedTier} onChange={e => setSelectedTier(e.target.value)} style={input}>
                <option value="basic">Basic Tier (localhost:9000)</option>
                <option value="plus">Plus Tier (localhost:9001)</option>
                <option value="pro">Pro Tier (localhost:9002)</option>
              </select>
            </div>

            <button onClick={testClassification} disabled={testLoading || !testFile} style={{ ...btnPrimary, width: '100%', opacity: testLoading || !testFile ? 0.5 : 1 }}>
              {testLoading ? 'Testing...' : 'Run Classification Test'}
            </button>

            {testResult && (
              <div style={{ marginTop: 16, padding: 12, background: testResult.error ? '#fee2e2' : '#f0fdf4', borderRadius: 8, border: `1px solid ${testResult.error ? '#fecaca' : '#bbf7d0'}` }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: testResult.error ? '#991b1b' : '#15803d' }}>
                  {testResult.error ? '❌ Error' : '✅ Classification Result'}
                </h4>
                {testResult.error ? (
                  <div style={{ fontSize: 13, color: '#7f1d1d' }}>{testResult.error}</div>
                ) : (
                  <div style={{ fontSize: 13 }}>
                    <div><strong>Type:</strong> {testResult.label || 'Unknown'}</div>
                    <div><strong>Confidence:</strong> {((testResult.score || 0) * 100).toFixed(1)}%</div>
                    {testResult.reasoning && <div style={{ marginTop: 8 }}><strong>Reasoning:</strong> {testResult.reasoning}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const btnPrimary = { padding: '10px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 };
const btnGhost = { padding: '10px 16px', background: 'white', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' };
const statusBadge = { padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color: 'white' };
const categoryBadge = (cat) => {
  const colors = { financial: '#059669', legal: '#dc2626', business: '#2563eb', operational: '#7c3aed', hr: '#ea580c', custom: '#6b7280' };
  return { background: colors[cat] || '#6b7280', color: 'white', padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' };
};
const errorBox = { padding: 12, background: '#fee2e2', border: '1px solid #fecaca', color: '#7f1d1d', borderRadius: 8 };
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 1000 };
const modal = { width: 900, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', background: 'white', borderRadius: 12, padding: 16 };
const label = { display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 };
const input = { width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 };
