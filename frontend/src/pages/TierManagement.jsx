import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function TierManagement() {
  const { token } = useAuth();
  const api = useMemo(() => createApi(token), [token]);
  const navigate = useNavigate();

  const [tiers, setTiers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeprecationWarning, setShowDeprecationWarning] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // existing tier doc

  const emptyForm = {
    companyId: '',
    tier: 'basic',
    features: {
      maxDocuments: -1,
      maxUsers: 200,
      maxDepartments: 50,
      storage_gb: 8000,
      aiFeatures: {
        ocr: true,
        classification: true,
        search: true,
        qa: true,
        summarization: true,
        customModels: true
      },
      apiAccess: true,
      apiRateLimit: -1,
      customClassifications: true,
      advancedSearch: true,
      multiLanguageOCR: true,
      priorityProcessing: true,
      customPrompts: true
    },
    licenseKey: '',
    validFrom: '',
    validUntil: '',
    autoRenew: true,
    pricePerMonth: '',
    customClassifications: [],
    assignedAPIs: {
      ai_service: '',
      ocr_service: '',
      llm_service: ''
    }
  };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [tiersData, companiesData] = await Promise.all([
        api.get('/admin/tiers'),
        api.get('/proxy/companies')
      ]);
      setTiers(tiersData.tiers || []);
      setCompanies(companiesData.companies || companiesData || []);
    } catch (e) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    // Normalize into form shape, keep nested objects
    setForm({
      companyId: row.companyId?._id || row.companyId || '',
      tier: row.tier || 'basic',
      features: { ...emptyForm.features, ...(row.features || {}) },
      licenseKey: row.licenseKey || '',
      validFrom: row.validFrom ? row.validFrom.slice(0, 10) : '',
      validUntil: row.validUntil ? row.validUntil.slice(0, 10) : '',
      autoRenew: !!row.autoRenew,
      pricePerMonth: row.pricePerMonth ?? '',
      customClassifications: Array.isArray(row.customClassifications) ? row.customClassifications : [],
      assignedAPIs: { ...emptyForm.assignedAPIs, ...(row.assignedAPIs || {}) }
    });
    setModalOpen(true);
  };

  const save = async () => {
    setError('');
    const payload = {
      ...form,
      pricePerMonth: form.pricePerMonth === '' ? undefined : Number(form.pricePerMonth),
      validFrom: form.validFrom ? new Date(form.validFrom) : undefined,
      validUntil: form.validUntil ? new Date(form.validUntil) : undefined
    };
    try {
      if (editing) {
        await api.put(`/admin/tiers/${editing._id}`, payload);
      } else {
        await api.post('/admin/tiers', payload);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to save');
    }
  };

  const remove = async (row) => {
    if (!confirm('Delete this tier?')) return;
    try {
      await api.del(`/admin/tiers/${row._id}`);
      await load();
    } catch (e) {
      alert(e.message || 'Delete failed');
    }
  };

  return (
    <div>
      {/* DEPRECATION WARNING */}
      <div style={{ 
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
        border: '3px solid #f59e0b', 
        borderRadius: '12px', 
        padding: '24px', 
        marginBottom: '32px',
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '24px', color: '#92400e' }}>
              ⚠️ This Page Uses Legacy Configuration Schema
            </h2>
            <p style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#78350f', lineHeight: '1.6' }}>
              This page uses an <strong>outdated configuration structure</strong> that is no longer compatible with the AI Service.
            </p>
            <div style={{ 
              background: 'rgba(255,255,255,0.7)', 
              padding: '16px', 
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ marginBottom: '8px', fontSize: '14px', color: '#92400e' }}>
                <strong>⛔ Issues with this page:</strong>
              </div>
              <ul style={{ margin: 0, paddingLeft: '24px', color: '#78350f' }}>
                <li>Uses old schema: <code>features.aiFeatures.ocr</code> instead of <code>ENABLE_OCR_VALIDATION</code></li>
                <li>Does not sync with AI Service RUNTIME_CONFIG</li>
                <li>Missing 47 advanced AI parameters</li>
                <li>Cannot configure LLaMA temperatures, token limits, etc.</li>
              </ul>
            </div>
            <div style={{ 
              background: '#10b981', 
              color: 'white',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
            }}
            onClick={() => navigate('/pipelines')}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
              ✨ Use Pipelines Page Instead (Unified Configuration) →
            </div>
            <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: '#92400e', textAlign: 'center' }}>
              Pipelines page has ALL features from this page PLUS 47 AI parameters with real-time sync
            </p>
          </div>
        </div>
      </div>

      <h1>Tier Management <span style={{ 
        background: '#dc2626', 
        color: 'white', 
        padding: '4px 12px', 
        borderRadius: '6px', 
        fontSize: '14px', 
        marginLeft: '12px' 
      }}>LEGACY</span></h1>
      <p>Assign and manage company licensing tiers and features.</p>

      {/* Tier Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {/* Basic Tier - Active */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '2px solid #10b981', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#1e293b' }}>Basic</h3>
              <span style={{ background: '#10b981', color: 'white', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>✓ ACTIVE</span>
            </div>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>Complete AI document processing suite</p>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <div style={{ fontWeight: '600', marginBottom: '12px', color: '#1e293b' }}>AI Models Available:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10b981', fontSize: '18px' }}>✓</span>
                <span style={{ fontSize: '14px' }}>PaddleOCR v5 (Printed Text OCR)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10b981', fontSize: '18px' }}>✓</span>
                <span style={{ fontSize: '14px' }}>TrOCR Large (Handwriting OCR)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10b981', fontSize: '18px' }}>✓</span>
                <span style={{ fontSize: '14px' }}>YOLOv8n (Signature Detection)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10b981', fontSize: '18px' }}>✓</span>
                <span style={{ fontSize: '14px' }}>Sentence-Transformers paraphrase-multilingual-MiniLM-L12-v2 (Classification + Search)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10b981', fontSize: '18px' }}>✓</span>
                <span style={{ fontSize: '14px' }}>Llama 3.2 3B (Q&A & Conversational AI)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Plus Tier - Coming Soon */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '2px solid #3b82f6', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)', opacity: 0.7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#1e293b' }}>Plus</h3>
              <span style={{ background: '#f59e0b', color: 'white', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>COMING SOON</span>
            </div>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>Enhanced models with improved accuracy and speed</p>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <div style={{ fontWeight: '600', marginBottom: '12px', color: '#1e293b' }}>AI Models (Planned):</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>More advanced and state-of-the-art models with higher accuracy</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>Upgraded OCR Models</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>Advanced Classification Models</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>Faster Processing Speed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pro Tier - Coming Soon */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '2px solid #8b5cf6', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.15)', opacity: 0.7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#1e293b' }}>Pro</h3>
              <span style={{ background: '#f59e0b', color: 'white', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>COMING SOON</span>
            </div>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>Premium models with custom training and priority support</p>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <div style={{ fontWeight: '600', marginBottom: '12px', color: '#1e293b' }}>AI Models (Planned):</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>State-of-the-art models with premium features</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>Custom Fine-Tuned Models</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>Multi-Language Support (50+ languages)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>Priority Processing Queue</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>Dedicated Support & Training</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: '40px', marginBottom: '16px', fontSize: '20px' }}>Company Tier Assignments</h2>
      <p style={{ color: '#64748b', marginBottom: '16px' }}>View and manage tier assignments for all companies</p>

      <div style={{ display: 'flex', gap: 12, margin: '16px 0' }}>
        <button onClick={openCreate} style={btnPrimary}>+ Assign Tier to Company</button>
        <button onClick={load} style={btnGhost}>Refresh</button>
      </div>

      {error && <div style={errorBox}>{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {companies.map(company => {
            const assignedTier = tiers.find(t => String(t.companyId?._id || t.companyId) === String(company._id));
            const tierName = assignedTier?.tier || company.tier || 'unassigned';
            const tierColors = {
              basic: { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', badge: '#10b981' },
              plus: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', badge: '#3b82f6' },
              pro: { bg: '#faf5ff', border: '#e9d5ff', text: '#6b21a8', badge: '#8b5cf6' },
              unassigned: { bg: '#f8fafc', border: '#e2e8f0', text: '#475569', badge: '#94a3b8' }
            };
            const colors = tierColors[tierName] || tierColors.unassigned;
            
            return (
              <div key={company._id} style={{
                background: colors.bg,
                border: `2px solid ${colors.border}`,
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b', fontWeight: '600' }}>{company.name}</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>{company.email || 'No email'}</p>
                  </div>
                  <span style={{
                    background: colors.badge,
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase'
                  }}>
                    {tierName}
                  </span>
                </div>
                
                {assignedTier && (
                  <div style={{ borderTop: '1px solid ' + colors.border, paddingTop: '12px', fontSize: '13px', color: colors.text }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div><strong>Max Docs:</strong> {assignedTier.features?.maxDocuments}</div>
                      <div><strong>Max Users:</strong> {assignedTier.features?.maxUsers}</div>
                      <div><strong>API Rate:</strong> {assignedTier.features?.apiRateLimit}/hr</div>
                      <div><strong>Storage:</strong> {assignedTier.features?.storage_gb}GB</div>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <strong>AI Features:</strong>{' '}
                      {Object.entries(assignedTier.features?.aiFeatures || {})
                        .filter(([_, enabled]) => enabled)
                        .map(([feature]) => feature)
                        .join(', ') || 'None'}
                    </div>
                  </div>
                )}
                
                {!assignedTier && (
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    {company.tier ? (
                      <span><strong>Company Tier:</strong> {company.tier} (no features configured yet)</span>
                    ) : (
                      <span style={{ fontStyle: 'italic' }}>No tier assigned yet</span>
                    )}
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {assignedTier ? (
                    <>
                      <button onClick={() => openEdit(assignedTier)} style={{ ...btnSmall, flex: 1 }}>Edit Tier</button>
                      <button onClick={() => remove(assignedTier)} style={{ ...btnSmall, ...btnDanger, flex: 1 }}>Remove</button>
                    </>
                  ) : (
                    <button onClick={() => {
                      setEditing(null);
                      setForm({ ...emptyForm, companyId: company._id, tier: company.tier || 'basic' });
                      setModalOpen(true);
                    }} style={{ ...btnSmall, flex: 1, background: colors.badge }}>
                      Assign Tier
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          
          {companies.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}>
              No companies found
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <div style={modalOverlay}>
          <div style={modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{editing ? 'Edit Tier' : 'Create Tier'}</h3>
              <button onClick={() => setModalOpen(false)} style={btnGhost}>Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Company</label>
                <select value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })} style={input}>
                  <option value="">Select a company...</option>
                  {companies.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={label}>Tier</label>
                <select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })} style={input}>
                  {['basic','plus','pro'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>

              <div>
                <label style={label}>Max Documents</label>
                <input type="number" value={form.features.maxDocuments}
                  onChange={e => setForm({ ...form, features: { ...form.features, maxDocuments: Number(e.target.value) }})}
                  style={input}/>
              </div>

              <div>
                <label style={label}>Max Users</label>
                <input type="number" value={form.features.maxUsers}
                  onChange={e => setForm({ ...form, features: { ...form.features, maxUsers: Number(e.target.value) }})}
                  style={input}/>
              </div>

              <div>
                <label style={label}>API Rate Limit</label>
                <input type="number" value={form.features.apiRateLimit}
                  onChange={e => setForm({ ...form, features: { ...form.features, apiRateLimit: Number(e.target.value) }})}
                  style={input}/>
              </div>

              <div>
                <label style={label}>Price / Month (USD)</label>
                <input type="number" value={form.pricePerMonth}
                  onChange={e => setForm({ ...form, pricePerMonth: e.target.value })}
                  style={input}/>
              </div>

              <div>
                <label style={label}>Valid From</label>
                <input type="date" value={form.validFrom}
                  onChange={e => setForm({ ...form, validFrom: e.target.value })}
                  style={input}/>
              </div>

              <div>
                <label style={label}>Valid Until</label>
                <input type="date" value={form.validUntil}
                  onChange={e => setForm({ ...form, validUntil: e.target.value })}
                  style={input}/>
              </div>

              <div>
                <label style={label}>Auto Renew</label>
                <input type="checkbox" checked={form.autoRenew}
                  onChange={e => setForm({ ...form, autoRenew: e.target.checked })}
                  style={{ transform: 'scale(1.2)' }}/>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label}>AI Features</label>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {['ocr','classification','search','qa','summarization','customModels'].map(k => (
                    <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="checkbox" checked={!!form.features.aiFeatures[k]}
                        onChange={e => setForm({ ...form, features: { ...form.features, aiFeatures: { ...form.features.aiFeatures, [k]: e.target.checked }}})} />
                      <span style={{ textTransform: 'capitalize' }}>{k}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={label}>AI Service URL</label>
                <input value={form.assignedAPIs.ai_service}
                  onChange={e => setForm({ ...form, assignedAPIs: { ...form.assignedAPIs, ai_service: e.target.value } })}
                  style={input} placeholder="http://localhost:9000" />
              </div>

              <div>
                <label style={label}>OCR Service URL</label>
                <input value={form.assignedAPIs.ocr_service}
                  onChange={e => setForm({ ...form, assignedAPIs: { ...form.assignedAPIs, ocr_service: e.target.value } })}
                  style={input} placeholder="http://localhost:9000/ocr" />
              </div>

              <div>
                <label style={label}>LLM Service URL</label>
                <input value={form.assignedAPIs.llm_service}
                  onChange={e => setForm({ ...form, assignedAPIs: { ...form.assignedAPIs, llm_service: e.target.value } })}
                  style={input} placeholder="http://localhost:8080" />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label}>License Key</label>
                <input value={form.licenseKey} onChange={e => setForm({ ...form, licenseKey: e.target.value })} style={input} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label}>Custom Classifications (comma-separated)</label>
                <input value={(form.customClassifications || []).join(', ')}
                  onChange={e => setForm({ ...form, customClassifications: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  style={input} />
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

const btnPrimary = {
  padding: '10px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: 6,
  cursor: 'pointer', fontWeight: 600
};
const btnGhost = { padding: '10px 16px', background: 'white', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' };
const btnDanger = { background: '#dc2626', color: 'white' };
const btnSmall = { padding: '6px 10px', background: '#334155', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' };
const thRow = { background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' };
const th = { textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#475569', textTransform: 'uppercase' };
const tdRow = { borderBottom: '1px solid #e2e8f0' };
const td = { padding: 8, fontSize: 14, color: '#0f172a' };
const pill = { background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: 'capitalize' };
const errorBox = { padding: 12, background: '#fee2e2', border: '1px solid #fecaca', color: '#7f1d1d', borderRadius: 8 };
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 };
const modal = { width: 900, maxWidth: '95vw', background: 'white', borderRadius: 12, padding: 16 };
const label = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' };
const input = { width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' };
