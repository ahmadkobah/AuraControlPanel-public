import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createApi } from '../lib/api';
import DataTable from '../components/DataTable';

export default function Printers() {
  const { token } = useAuth();
  const api = useMemo(() => createApi(token), [token]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const emptyForm = {
    name: '',
    ipAddress: '',
    port: 9100,
    protocol: 'ipp',
    companyId: '',
    departmentId: '',
    documentTypes: [],
    capabilities: {
      color: false,
      duplex: false,
      stapling: false,
      punching: false
    },
    defaultSettings: {
      copies: 1,
      orientation: 'portrait',
      paperSize: 'A4'
    },
    status: 'active'
  };
  const [form, setForm] = useState(emptyForm);

  // Tier limit state
  const [tierLimits, setTierLimits] = useState(null);
  const [selectedCompanyForLimits, setSelectedCompanyForLimits] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/admin/printers');
      setItems(data.printers || []);
    } catch (e) {
      setError(e.message || 'Failed to load printers');
    } finally {
      setLoading(false);
    }
  };

  const loadCompaniesAndDepartments = async () => {
    try {
      console.log('🔍 Loading companies and departments...');
      const [companiesData, departmentsData] = await Promise.all([
        api.get('/proxy/companies'),
        api.get('/admin/departments')
      ]);
      console.log('✅ Companies loaded:', companiesData);
      console.log('✅ Departments loaded:', departmentsData);
      setCompanies(companiesData.companies || []);
      setDepartments(departmentsData.departments || []);
      console.log('✅ State updated - companies:', companiesData.companies?.length, 'departments:', departmentsData.departments?.length);
      
      // Load tier limits for first company
      if (companiesData && companiesData.companies?.length > 0) {
        await loadTierLimits(companiesData.companies[0]._id);
      }
    } catch (e) {
      console.error('❌ Failed to load companies/departments:', e);
      console.error('Error details:', e.message, e.status);
    }
  };

  const loadTierLimits = async (companyId) => {
    try {
      const companyData = await api.get(`/proxy/companies/${companyId}`);
      const tier = companyData?.tier || 'basic';
      
      const tierDefaults = {
        basic: { maxPrinters: 2, tier: 'basic', displayName: 'Basic' },
        plus: { maxPrinters: 10, tier: 'plus', displayName: 'Plus' },
        pro: { maxPrinters: -1, tier: 'pro', displayName: 'Pro' }
      };
      
      setTierLimits(tierDefaults[tier] || tierDefaults.basic);
      setSelectedCompanyForLimits(companyId);
    } catch (e) {
      console.warn('Could not load tier limits:', e);
      setTierLimits({ maxPrinters: 2, tier: 'basic', displayName: 'Basic' });
    }
  };

  useEffect(() => { 
    load();
    loadCompaniesAndDepartments();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      ipAddress: row.ipAddress || '',
      port: row.port ?? 9100,
      protocol: row.protocol || 'ipp',
      companyId: row.companyId?._id || row.companyId || '',
      departmentId: row.departmentId?._id || row.departmentId || '',
      documentTypes: row.documentTypes || [],
      capabilities: row.capabilities || emptyForm.capabilities,
      defaultSettings: row.defaultSettings || emptyForm.defaultSettings,
      status: row.status || 'active'
    });
    setModalOpen(true);
  };

  const save = async () => {
    setError('');
    
    // Check tier limits before creating new printer
    if (!editing && tierLimits && tierLimits.maxPrinters !== -1) {
      const companyPrinters = items.filter(p => String(p.companyId?._id || p.companyId) === String(form.companyId));
      if (companyPrinters.length >= tierLimits.maxPrinters) {
        setError(`Printer limit reached! Your ${tierLimits.displayName} tier allows up to ${tierLimits.maxPrinters} printers. Please upgrade to add more printers.`);
        return;
      }
    }
    
    const payload = {
      ...form,
      port: Number(form.port)
    };
    try {
      if (editing) {
        await api.put(`/admin/printers/${editing._id}`, payload);
      } else {
        await api.post('/admin/printers', payload);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      if (e.upgradeRequired) {
        setError(`${e.message} Please upgrade to add more printers.`);
      } else {
        setError(e.message || 'Failed to save');
      }
    }
  };

  const remove = async (row) => {
    if (!confirm('Delete this printer?')) return;
    try {
      await api.del(`/admin/printers/${row._id}`);
      await load();
    } catch (e) {
      alert(e.message || 'Delete failed');
    }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (v, row) => <strong>{row.name}</strong> },
    { key: 'ipAddress', label: 'IP Address' },
    { key: 'port', label: 'Port' },
    { key: 'protocol', label: 'Protocol', render: (v, row) => <span style={pill}>{row.protocol?.toUpperCase()}</span> },
    { key: 'companyId', label: 'Company', render: (v, row) => <span>{row.companyId?.name || '-'}</span> },
    { key: 'status', label: 'Status', render: (v, row) => <span style={{ ...statusBadge, background: statusColors[row.status] }}>{row.status}</span> }
  ];

  return (
    <div>
      {/* Tier Limit Badge */}
      {tierLimits && (
        <div style={{ 
          background: tierLimits.tier === 'pro' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                      tierLimits.tier === 'plus' ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : 
                      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px',
          color: 'white',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ flex: '1 1 auto' }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>Current Tier</div>
              <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
                {tierLimits.tier === 'pro' ? '🥇' : tierLimits.tier === 'plus' ? '🥈' : '🥉'} {tierLimits.displayName} Tier
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                {tierLimits.maxPrinters === -1 ? 'Unlimited printers' : `Up to ${tierLimits.maxPrinters} printers allowed`}
              </div>
            </div>
            {tierLimits.maxPrinters !== -1 && (
              <div style={{ flex: '0 0 auto', minWidth: '200px' }}>
                <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
                  Printer Count: {items.filter(p => String(p.companyId?._id || p.companyId) === String(selectedCompanyForLimits)).length} / {tierLimits.maxPrinters}
                </div>
                <div style={{ 
                  height: '12px', 
                  background: 'rgba(255,255,255,0.3)', 
                  borderRadius: '6px', 
                  overflow: 'hidden',
                  marginBottom: '8px'
                }}>
                  <div style={{ 
                    width: `${Math.min((items.filter(p => String(p.companyId?._id || p.companyId) === String(selectedCompanyForLimits)).length / tierLimits.maxPrinters) * 100, 100)}%`, 
                    height: '100%', 
                    background: 'white',
                    transition: 'width 0.3s'
                  }} />
                </div>
                {items.filter(p => String(p.companyId?._id || p.companyId) === String(selectedCompanyForLimits)).length >= tierLimits.maxPrinters && (
                  <div style={{ fontSize: '12px', fontWeight: '600', background: 'rgba(239,68,68,0.9)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                    ⚠️ Limit Reached - Upgrade Required
                  </div>
                )}
              </div>
            )}
            {tierLimits.tier !== 'pro' && (
              <button 
                onClick={() => window.location.href = '/companies'}
                style={{
                  padding: '12px 24px',
                  background: 'white',
                  color: tierLimits.tier === 'plus' ? '#f5576c' : '#4facfe',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                ⬆️ Upgrade Tier
              </button>
            )}
          </div>
        </div>
      )}

      <h1>Printer Management</h1>
      <p>Configure network printers and auto-print rules.</p>

      <div style={{ display: 'flex', gap: 12, margin: '16px 0' }}>
        <button onClick={openCreate} style={btnPrimary}>+ New Printer</button>
        <button onClick={load} style={btnGhost}>Refresh</button>
      </div>

      {error && <div style={errorBox}>{error}</div>}
      {loading ? <div>Loading...</div> : (
        <DataTable columns={columns} data={items} onEdit={openEdit} onDelete={remove} emptyMessage="No printers configured" />
      )}

      {modalOpen && (
        <div style={modalOverlay}>
          <div style={modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{editing ? 'Edit Printer' : 'Add Printer'}</h3>
              <button onClick={() => setModalOpen(false)} style={btnGhost}>Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Printer Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={input} placeholder="Office Printer" />
              </div>

              <div>
                <label style={label}>IP Address *</label>
                <input value={form.ipAddress} onChange={e => setForm({ ...form, ipAddress: e.target.value })} style={input} placeholder="192.168.1.100" />
              </div>

              <div>
                <label style={label}>Port</label>
                <input type="number" value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} style={input} />
              </div>

              <div>
                <label style={label}>Protocol</label>
                <select value={form.protocol} onChange={e => setForm({ ...form, protocol: e.target.value })} style={input}>
                  {['ipp','lpd','raw','smb'].map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                </select>
              </div>

              <div>
                <label style={label}>Company (optional)</label>
                <select value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })} style={input}>
                  <option value="">-- Select Company --</option>
                  {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label style={label}>Department (optional)</label>
                <select value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })} style={input}>
                  <option value="">-- Select Department --</option>
                  {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label style={label}>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={input}>
                  {['active','inactive','maintenance'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label}>Document Types (comma-separated)</label>
                <input value={form.documentTypes.join(', ')} onChange={e => setForm({ ...form, documentTypes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} style={input} placeholder="invoice, contract, report" />
              </div>

              <div style={{ gridColumn: '1 / -1', padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Capabilities</h4>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {['color','duplex','stapling','punching'].map(cap => (
                    <label key={cap} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="checkbox" checked={!!form.capabilities[cap]} onChange={e => setForm({ ...form, capabilities: { ...form.capabilities, [cap]: e.target.checked }})} />
                      <span style={{ textTransform: 'capitalize' }}>{cap}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1', padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Default Settings</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={label}>Copies</label>
                    <input type="number" value={form.defaultSettings.copies} onChange={e => setForm({ ...form, defaultSettings: { ...form.defaultSettings, copies: Number(e.target.value) }})} style={input} />
                  </div>
                  <div>
                    <label style={label}>Orientation</label>
                    <select value={form.defaultSettings.orientation} onChange={e => setForm({ ...form, defaultSettings: { ...form.defaultSettings, orientation: e.target.value }})} style={input}>
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                  <div>
                    <label style={label}>Paper Size</label>
                    <select value={form.defaultSettings.paperSize} onChange={e => setForm({ ...form, defaultSettings: { ...form.defaultSettings, paperSize: e.target.value }})} style={input}>
                      {['A4','A3','Letter','Legal'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
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

const btnPrimary = { padding: '10px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 };
const btnGhost = { padding: '10px 16px', background: 'white', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' };
const pill = { background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' };
const statusBadge = { padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color: 'white' };
const statusColors = { active: '#10b981', inactive: '#6b7280', maintenance: '#f59e0b' };
const errorBox = { padding: 12, background: '#fee2e2', border: '1px solid #fecaca', color: '#7f1d1d', borderRadius: 8 };
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 1000 };
const modal = { width: 800, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', background: 'white', borderRadius: 12, padding: 16 };
const label = { display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 };
const input = { width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 };
