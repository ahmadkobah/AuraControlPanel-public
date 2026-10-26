import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createApi } from '../lib/api';
import DataTable from '../components/DataTable';

export default function SearchControl() {
  const { token } = useAuth();
  const api = useMemo(() => createApi(token), [token]);
  const [configs, setConfigs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedTier, setSelectedTier] = useState('basic');
  const [tierInfo, setTierInfo] = useState(null);

  const emptyForm = {
    name: '',
    tier: 'all',
    searchType: 'semantic',
    apiEndpoint: '/api/search',
    service: 'ai_service',
    port: 9000,
    priority: 1,
    fallbackEndpoint: '',
    config: {
      maxResults: 10,
      minScore: 0.5,
      embeddingModel: 'sentence-transformers',
      reranking: false,
      filters: {}
    },
    active: true
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    setLoading(true);
    setError(null);
    try {
      const [configsData, companiesData, tiersData] = await Promise.all([
        api.get('/admin/search-configs'),
        api.get('/proxy/companies').catch(() => ({ companies: [] })),
        api.get('/admin/tiers').catch(() => ({ tiers: [] }))
      ]);
      console.log('Search configs loaded:', configsData);
      setConfigs(Array.isArray(configsData) ? configsData : configsData?.configs || []);
      setCompanies(Array.isArray(companiesData) ? companiesData : companiesData?.companies || []);
      setTiers(Array.isArray(tiersData) ? tiersData : tiersData?.tiers || []);
      
      // Load tier info
      loadTierInfo(selectedTier);
    } catch (e) {
      console.error('Load search configs failed:', e);
      setError('Failed to load data. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  }

  function loadTierInfo(tier) {
    const tierDefaults = {
      basic: { 
        tier: 'basic', 
        displayName: 'Basic', 
        searchTypes: ['keyword'],
        embeddingModels: [],
        description: 'Keyword search only'
      },
      plus: { 
        tier: 'plus', 
        displayName: 'Plus', 
        searchTypes: ['keyword', 'semantic'],
        embeddingModels: ['sentence-transformers'],
        description: 'Keyword + Semantic search'
      },
      pro: { 
        tier: 'pro', 
        displayName: 'Pro', 
        searchTypes: ['keyword', 'semantic', 'conversational'],
        embeddingModels: ['sentence-transformers', 'openai', 'custom'],
        description: 'All search types + Custom models'
      }
    };
    setTierInfo(tierDefaults[tier] || tierDefaults.basic);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  }

  function openEdit(config) {
    setEditing(config);
    setForm({
      name: config.name || '',
      tier: config.tier || 'all',
      searchType: config.searchType || 'semantic',
      apiEndpoint: config.apiEndpoint || '',
      service: config.service || 'ai_service',
      port: config.port || 9000,
      priority: config.priority || 1,
      fallbackEndpoint: config.fallbackEndpoint || '',
      config: config.config || {
        maxResults: 10,
        minScore: 0.5,
        embeddingModel: 'sentence-transformers',
        reranking: false,
        filters: {}
      },
      active: config.active !== false
    });
    setIsModalOpen(true);
  }

  async function save() {
    setError(null);
    try {
      if (editing) {
        await api.put(`/admin/search-configs/${editing._id}`, form);
      } else {
        await api.post('/admin/search-configs', form);
      }
      
      // Real-time sync to AI Service with conflict resolution
      try {
        const syncResult = await api.post('/admin/search-configs/sync-to-ai-service', {
          tier: form.tier
        });
        
        if (syncResult?.success) {
          alert('✅ Search config saved and synced to AI Service!');
        } else if (syncResult?.partial) {
          alert('⚠️ Search config saved to database but sync partially failed. Some tiers may need manual sync.');
        }
      } catch (syncError) {
        console.error('Sync to AI Service failed:', syncError);
        alert('⚠️ Search config saved to database but sync failed. AI Service may need restart to pick up changes.');
      }
      
      setIsModalOpen(false);
      await loadConfigs();
    } catch (e) {
      setError(e.message || 'Save failed');
    }
  }

  async function remove(config) {
    if (!confirm(`Delete search config "${config.name}"?`)) return;
    try {
      await api.del(`/admin/search-configs/${config._id}`);
      await loadConfigs();
    } catch (e) {
      alert(e.message || 'Delete failed');
    }
  }

  const columns = [
    { 
      key: 'name', 
      label: 'Name',
      render: (v, row) => <strong style={{ fontSize: '14px' }}>{row.name || '—'}</strong>
    },
    { 
      key: 'tier', 
      label: 'Tier', 
      render: (v, row) => {
        const tierStr = row.tier || 'all';
        const colors = { basic: '#64748b', plus: '#3b82f6', pro: '#8b5cf6', all: '#64748b' };
        return (
          <span style={{ 
            padding: '4px 8px', 
            background: colors[tierStr] || '#64748b', 
            color: 'white', 
            borderRadius: '4px', 
            fontSize: '12px',
            textTransform: 'uppercase',
            fontWeight: '600'
          }}>
            {tierStr.toUpperCase()}
          </span>
        );
      }
    },
    { 
      key: 'searchType', 
      label: 'Search Type', 
      render: (v, row) => {
        const typeStr = row.searchType || 'semantic';
        const colors = { 
          semantic: '#10b981', 
          keyword: '#3b82f6', 
          document_qa: '#8b5cf6', 
          conversational: '#f59e0b',
          hybrid: '#ec4899'
        };
        const displayNames = {
          semantic: 'SEMANTIC',
          keyword: 'KEYWORD',
          document_qa: 'DOC Q&A',
          conversational: 'CONVERSATIONAL',
          hybrid: 'HYBRID'
        };
        return (
          <span style={{ 
            padding: '4px 8px', 
            background: colors[typeStr] || '#64748b', 
            color: 'white', 
            borderRadius: '4px', 
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {displayNames[typeStr] || typeStr.toUpperCase()}
          </span>
        );
      }
    },
    { 
      key: 'service', 
      label: 'Service', 
      render: (v, row) => <span>{row.service || 'ai_service'}:{row.port || 9000}</span>
    },
    { 
      key: 'apiEndpoint', 
      label: 'API Endpoint', 
      render: (v, row) => (
        <code style={{ 
          background: '#f1f5f9', 
          padding: '2px 6px', 
          borderRadius: '4px', 
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          {row.apiEndpoint || '—'}
        </code>
      )
    },
    { 
      key: 'priority', 
      label: 'Priority',
      render: (v, row) => <span>{row.priority || 1}</span>
    },
    { 
      key: 'active', 
      label: 'Status', 
      render: (v, row) => {
        const isActive = row.active !== false;
        return (
          <span style={{ 
            padding: '4px 8px', 
            background: isActive ? '#10b981' : '#ef4444', 
            color: 'white', 
            borderRadius: '4px', 
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {isActive ? '✅ Active' : '❌ Inactive'}
          </span>
        );
      }
    }
  ];

  // Group by tier and search type
  const groupedConfigs = configs.reduce((acc, config) => {
    const key = `${config.tier}_${config.searchType}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(config);
    return acc;
  }, {});

  const searchTypeColors = {
    semantic: '#10b981',
    keyword: '#3b82f6',
    document_qa: '#8b5cf6',
    conversational: '#f59e0b',
    hybrid: '#ec4899'
  };

  const statsStyle = {
    card: { background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' },
    label: { fontSize: '14px', color: '#64748b', marginBottom: '8px' },
    value: { fontSize: '32px', fontWeight: '700', marginBottom: '4px' },
    subtext: { fontSize: '12px', color: '#64748b' }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: 'clamp(24px, 5vw, 32px)', color: '#1e293b' }}>Search Control</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Configure search types and API routing per tier</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={openCreate} style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ➕ New Config
          </button>
          <button onClick={loadConfigs} style={{ padding: '12px 24px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Tier Selector */}
      {tierInfo && (
        <div style={{ 
          background: selectedTier === 'pro' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                      selectedTier === 'plus' ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : 
                      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px',
          color: 'white',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ flex: '1 1 auto' }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>Search Capabilities</div>
              <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
                {selectedTier === 'pro' ? '🥇' : selectedTier === 'plus' ? '🥈' : '🥉'} {tierInfo.displayName} Tier
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>{tierInfo.description}</div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {['basic', 'plus', 'pro'].map(tier => (
                <button 
                  key={tier}
                  onClick={() => { setSelectedTier(tier); loadTierInfo(tier); }}
                  style={{
                    padding: '10px 20px',
                    background: selectedTier === tier ? 'white' : 'rgba(255,255,255,0.3)',
                    color: selectedTier === tier ? (tier === 'pro' ? '#764ba2' : tier === 'plus' ? '#f5576c' : '#4facfe') : 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {tier === 'pro' ? '🥇' : tier === 'plus' ? '🥈' : '🥉'} {tier}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {tierInfo.searchTypes.map(type => (
              <span key={type} style={{ 
                padding: '6px 12px', 
                background: 'rgba(255,255,255,0.9)', 
                color: selectedTier === 'pro' ? '#764ba2' : selectedTier === 'plus' ? '#f5576c' : '#4facfe',
                borderRadius: '6px', 
                fontSize: '12px', 
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                ✅ {type}
              </span>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Loading search configurations...
        </div>
      )}

      {error && (
        <div style={{ padding: '20px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', marginBottom: '20px' }}>
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={statsStyle.card}>
              <div style={statsStyle.label}>Total Configs</div>
              <div style={{ ...statsStyle.value, color: '#3b82f6' }}>{configs.length}</div>
              <div style={statsStyle.subtext}>All search configurations</div>
            </div>
            <div style={statsStyle.card}>
              <div style={statsStyle.label}>Active Configs</div>
              <div style={{ ...statsStyle.value, color: '#10b981' }}>{configs.filter(c => c.active !== false).length}</div>
              <div style={statsStyle.subtext}>Currently enabled</div>
            </div>
            <div style={statsStyle.card}>
              <div style={statsStyle.label}>Companies</div>
              <div style={{ ...statsStyle.value, color: '#f59e0b' }}>{companies.length}</div>
              <div style={statsStyle.subtext}>Total organizations</div>
            </div>
            <div style={statsStyle.card}>
              <div style={statsStyle.label}>Tier Assignments</div>
              <div style={{ ...statsStyle.value, color: '#8b5cf6' }}>{tiers.length}</div>
              <div style={statsStyle.subtext}>Company tier configs</div>
            </div>
          </div>

          {/* Search Type Distribution */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b' }}>Search Type Distribution</h3>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {['semantic', 'keyword', 'document_qa', 'conversational', 'hybrid'].map(type => {
                const count = configs.filter(c => c.searchType === type && c.active !== false).length;
                const percentage = configs.length > 0 ? ((count / configs.length) * 100).toFixed(1) : 0;
                const searchTypeColors = { 
                  semantic: '#10b981', 
                  keyword: '#3b82f6', 
                  document_qa: '#8b5cf6', 
                  conversational: '#f59e0b',
                  hybrid: '#ec4899'
                };
                const displayNames = {
                  semantic: 'Semantic',
                  keyword: 'Keyword',
                  document_qa: 'Doc Q&A',
                  conversational: 'Conversational',
                  hybrid: 'Hybrid'
                };
                return (
                  <div key={type} style={{ flex: '1 1 130px', minWidth: '130px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>{displayNames[type]}</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: searchTypeColors[type] }}>{count}</span>
                    </div>
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', background: searchTypeColors[type], transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{percentage}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tier-based Config Matrix */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b' }}>Search Availability by Tier</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Tier</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Semantic</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Keyword</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Doc Q&A</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Conversational</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Hybrid</th>
                  </tr>
                </thead>
                <tbody>
                  {['basic', 'plus', 'pro', 'all'].map(tier => (
                    <tr key={tier}>
                      <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontWeight: '500', textTransform: 'uppercase' }}>{tier}</td>
                      {['semantic', 'keyword', 'document_qa', 'conversational', 'hybrid'].map(type => {
                        const hasConfig = configs.find(c => (c.tier === tier || c.tier === 'all') && c.searchType === type && c.active !== false);
                        return (
                          <td key={type} style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                            {hasConfig ? (
                              <span style={{ fontSize: '18px' }} title={hasConfig.name}>✅</span>
                            ) : (
                              <span style={{ fontSize: '18px', opacity: 0.3 }}>❌</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>          <DataTable columns={columns} data={configs} onEdit={openEdit} onDelete={remove} emptyMessage="No search configurations found" />

          <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
              <strong>ℹ️ Search Types Available in Tier 1:</strong>
              <br />
              • <strong>Semantic Search:</strong> Vector search across all documents using AI embeddings (endpoint: <code>/api/search</code> mode=semantic)
              <br />
              • <strong>Keyword Search:</strong> Direct MongoDB text matching in filenames and content (endpoint: <code>/api/search</code> mode=keyword)
              <br />
              • <strong>Conversational Search:</strong> Natural language Q&A using semantic search + LLaMA across all documents (endpoint: <code>/api/ai/conversational-search</code>)
              <br />
              • <strong>Hybrid Search:</strong> Auto-detects questions and combines semantic search with LLaMA for intelligent answers (endpoint: <code>/api/search</code> mode=qa)
              <br />
              • <strong>Document Q&A:</strong> Ask questions about a SPECIFIC document in document viewer page (endpoint: <code>/api/ai/qa</code> with doc_id)
              <br />
              <br />
              <strong>🎯 Tier Status:</strong> Only Tier 1 (Basic) features are active. Tier 2 (Plus) and Tier 3 (Pro) configurations are seeded but inactive, ready for future activation.
              <br />
              <strong>🔗 Service:</strong> All endpoints route through Aura Backend (port 8000), which proxies AI requests to AI Service (port 9000).
            </p>
          </div>
        </>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 1000 }}>
          <div style={{ width: '90%', maxWidth: '800px', background: 'white', borderRadius: '12px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>{editing ? 'Edit Search Config' : 'Create New Search Config'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', background: 'white', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>
                ✕ Close
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Name *</label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={(e) => setForm({ ...form, name: e.target.value })} 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }} 
                  placeholder="e.g., Pro Semantic Search"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Tier *</label>
                <select 
                  value={form.tier} 
                  onChange={(e) => setForm({ ...form, tier: e.target.value })} 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                >
                  <option value="all">All Tiers</option>
                  <option value="basic">Basic</option>
                  <option value="plus">Plus</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Search Type *</label>
                <select 
                  value={form.searchType} 
                  onChange={(e) => setForm({ ...form, searchType: e.target.value })} 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                >
                  <option value="semantic">Semantic (Search Documents)</option>
                  <option value="keyword">Keyword (Text Match)</option>
                  <option value="document_qa">Document Q&A (Ask About Document)</option>
                  <option value="conversational">Conversational AI (General Chat)</option>
                  <option value="hybrid">Hybrid (Combined Search)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Priority</label>
                <input 
                  type="number" 
                  value={form.priority} 
                  onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })} 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Service *</label>
                <select 
                  value={form.service} 
                  onChange={(e) => setForm({ ...form, service: e.target.value })} 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                >
                  <option value="aura">Aura Backend</option>
                  <option value="ai_service">AI Service</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Port *</label>
                <input 
                  type="number" 
                  value={form.port} 
                  onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) })} 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }} 
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>API Endpoint *</label>
                <input 
                  type="text" 
                  value={form.apiEndpoint} 
                  onChange={(e) => setForm({ ...form, apiEndpoint: e.target.value })} 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', fontFamily: 'monospace' }} 
                  placeholder="/api/search"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Fallback Endpoint</label>
                <input 
                  type="text" 
                  value={form.fallbackEndpoint} 
                  onChange={(e) => setForm({ ...form, fallbackEndpoint: e.target.value })} 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', fontFamily: 'monospace' }} 
                  placeholder="/api/search/fallback (optional)"
                />
              </div>
            </div>

            {/* Advanced Config */}
            <div style={{ marginTop: '16px', marginBottom: '16px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#334155' }}>Advanced Configuration</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#475569' }}>Max Results</label>
                  <input 
                    type="number" 
                    value={form.config.maxResults} 
                    onChange={(e) => setForm({ ...form, config: { ...form.config, maxResults: parseInt(e.target.value) } })} 
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#475569' }}>Min Score (0-1)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    max="1" 
                    value={form.config.minScore} 
                    onChange={(e) => setForm({ ...form, config: { ...form.config, minScore: parseFloat(e.target.value) } })} 
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#475569' }}>Embedding Model</label>
                  <input 
                    type="text" 
                    value={form.config.embeddingModel} 
                    onChange={(e) => setForm({ ...form, config: { ...form.config, embeddingModel: e.target.value } })} 
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} 
                    placeholder="sentence-transformers"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', paddingTop: '24px' }}>
                  <input 
                    type="checkbox" 
                    id="reranking"
                    checked={form.config.reranking} 
                    onChange={(e) => setForm({ ...form, config: { ...form.config, reranking: e.target.checked } })} 
                    style={{ marginRight: '8px', width: '16px', height: '16px' }} 
                  />
                  <label htmlFor="reranking" style={{ fontSize: '13px', color: '#475569', cursor: 'pointer' }}>Enable Reranking</label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', padding: '12px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
              <input 
                type="checkbox" 
                id="active"
                checked={form.active} 
                onChange={(e) => setForm({ ...form, active: e.target.checked })} 
                style={{ marginRight: '8px', width: '16px', height: '16px' }} 
              />
              <label htmlFor="active" style={{ fontSize: '14px', fontWeight: '500', color: '#15803d', cursor: 'pointer' }}>
                ✅ Active Configuration
              </label>
            </div>

            {error && (
              <div style={{ padding: '12px', background: '#fee2e2', border: '1px solid #fecaca', color: '#7f1d1d', borderRadius: '8px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ padding: '10px 20px', background: 'white', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
              >
                Cancel
              </button>
              <button 
                onClick={save} 
                style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
              >
                {editing ? '💾 Save Changes' : '➕ Create Config'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
