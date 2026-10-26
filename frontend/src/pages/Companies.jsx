import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createApi } from '../lib/api';
import DataTable from '../components/DataTable';

export default function Companies() {
  const { token } = useAuth();
  const api = useMemo(() => createApi(token), [token]);
  const [companies, setCompanies] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [tierComparisonOpen, setTierComparisonOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const emptyForm = { 
    name: '', 
    email: '', 
    phone: '', 
    address: '', 
    description: '',
    tier: 'basic',
    status: 'active',
    logo: null,
    logoPreview: null
  };
  const [form, setForm] = useState(emptyForm);
  const emptySettings = {
    smtp: { host: '', port: 587, secure: false, user: '', password: '' },
    branding: { primaryColor: '#667eea', secondaryColor: '#764ba2', logoUrl: '' }
  };
  const [settingsForm, setSettingsForm] = useState(emptySettings);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [companiesData, tiersData] = await Promise.all([
        api.get('/proxy/companies').catch(() => ({ companies: [] })),
        api.get('/admin/tiers').catch(() => ({ tiers: [] }))
      ]);
      setCompanies(companiesData.companies || companiesData || []);
      setTiers(tiersData.tiers || []);
    } catch (e) {
      console.error('Load data failed:', e);
      setError('Failed to load data from Aura. Make sure Aura Backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { 
    setEditing(null); 
    setForm({ ...emptyForm, logoPreview: null }); 
    setModalOpen(true); 
  }
  
  function openEdit(c) {
    setEditing(c);
    const assignedTier = tiers.find(t => (t.companyId?._id || t.companyId) === c._id);
    setForm({ 
      name: c.name || '', 
      email: c.email || '', 
      phone: c.phone || '', 
      address: c.address || '',
      description: c.description || '',
      tier: assignedTier?.tier || 'basic',
      status: c.status || 'active',
      logo: null,
      logoPreview: null
    });
    setModalOpen(true);
  }

  function openSettings(c) {
    setEditing(c);
    // Load company settings if available
    setSettingsForm({
      smtp: c.settings?.smtp || emptySettings.smtp,
      branding: c.settings?.branding || emptySettings.branding
    });
    setSettingsModalOpen(true);
  }

  function handleLogoChange(e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo file size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, logo: file, logoPreview: reader.result });
      };
      reader.readAsDataURL(file);
    }
  }

  async function save() {
    setError(null);
    try {
      if (!form.name?.trim()) {
        setError('Company name is required');
        return;
      }

      // Prepare company data
      const companyData = {
        name: form.name.trim(),
        email: form.email?.trim() || '',
        phone: form.phone?.trim() || '',
        address: form.address?.trim() || '',
        description: form.description?.trim() || '',
        status: form.status || 'active'
      };

      // TODO: Handle logo upload when file upload endpoint is ready
      // if (form.logo) {
      //   const formData = new FormData();
      //   formData.append('logo', form.logo);
      //   const uploadRes = await api.post('/proxy/companies/upload-logo', formData);
      //   companyData.logoUrl = uploadRes.logoUrl;
      // }

      // Save company
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/proxy/companies/${editing._id}` : '/proxy/companies';
      await api.fetch(method, url, companyData);
      
      // Upsert tier assignment
      const companyId = editing?._id || (await api.get('/proxy/companies')).companies.slice(-1)[0]?._id;
      const existingTier = tiers.find(t => (t.companyId?._id || t.companyId) === companyId);
      if (existingTier) {
        await api.put(`/admin/tiers/${existingTier._id}`, { companyId, tier: form.tier });
      } else {
        await api.post('/admin/tiers', { companyId, tier: form.tier });
      }
      
      setModalOpen(false);
      await load();
    } catch (e) { setError(e.message || 'Save failed'); }
  }

  async function saveSettings() {
    setError(null);
    try {
      if (!editing?._id) return;
      
      // Save settings to company
      await api.put(`/proxy/companies/${editing._id}`, {
        settings: settingsForm
      });
      
      setSettingsModalOpen(false);
      await load();
    } catch (e) { setError(e.message || 'Settings save failed'); }
  }

  async function bulkAssignTier(targetTier) {
    if (selectedCompanies.length === 0) {
      alert('No companies selected');
      return;
    }
    if (!confirm(`Assign ${targetTier} tier to ${selectedCompanies.length} companies?`)) return;
    
    try {
      for (const companyId of selectedCompanies) {
        const existingTier = tiers.find(t => (t.companyId?._id || t.companyId) === companyId);
        if (existingTier) {
          await api.put(`/admin/tiers/${existingTier._id}`, { companyId, tier: targetTier });
        } else {
          await api.post('/admin/tiers', { companyId, tier: targetTier });
        }
      }
      setSelectedCompanies([]);
      await load();
      alert(`Successfully assigned ${targetTier} tier to ${selectedCompanies.length} companies`);
    } catch (e) { alert(e.message || 'Bulk tier assignment failed'); }
  }

  async function bulkDelete() {
    if (selectedCompanies.length === 0) {
      alert('No companies selected');
      return;
    }
    if (!confirm(`Delete ${selectedCompanies.length} companies? This action cannot be undone.`)) return;
    
    try {
      for (const companyId of selectedCompanies) {
        await api.del(`/proxy/companies/${companyId}`);
        const existingTier = tiers.find(t => (t.companyId?._id || t.companyId) === companyId);
        if (existingTier) await api.del(`/admin/tiers/${existingTier._id}`);
      }
      setSelectedCompanies([]);
      await load();
      alert(`Successfully deleted ${selectedCompanies.length} companies`);
    } catch (e) { alert(e.message || 'Bulk delete failed'); }
  }

  function exportToCSV() {
    const headers = ['Company Name', 'Tier', 'Email', 'Phone', 'Address', 'Status', 'Created'];
    const rows = filteredCompanies.map(c => {
      const assignedTier = tiers.find(t => (t.companyId?._id || t.companyId) === c._id);
      return [
        c.name,
        assignedTier?.tier || 'basic',
        c.email || '',
        c.phone || '',
        c.address || '',
        c.status || 'active',
        c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''
      ];
    });
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `companies-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function remove(company) {
    if (!confirm(`Delete ${company.name}? This action cannot be undone.`)) return;
    try {
      await api.del(`/proxy/companies/${company._id}`);
      // Remove tier if exists
      const existingTier = tiers.find(t => (t.companyId?._id || t.companyId) === company._id);
      if (existingTier) await api.del(`/admin/tiers/${existingTier._id}`);
      await load();
    } catch (e) { alert(e.message || 'Delete failed'); }
  }

  function toggleSelection(companyId) {
    setSelectedCompanies(prev => 
      prev.includes(companyId) 
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  }

  function toggleSelectAll() {
    if (selectedCompanies.length === filteredCompanies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(filteredCompanies.map(c => c._id));
    }
  }

  // Filter companies based on search, tier, and status
  const filteredCompanies = companies.filter(c => {
    const matchesSearch = !searchQuery || 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery);
    
    const assignedTier = tiers.find(t => (t.companyId?._id || t.companyId) === c._id);
    const matchesTier = tierFilter === 'all' || (assignedTier?.tier || 'basic') === tierFilter;
    
    const matchesStatus = statusFilter === 'all' || (c.status || 'active') === statusFilter;
    
    return matchesSearch && matchesTier && matchesStatus;
  });

  const columns = [
    {
      key: 'select',
      label: (
        <input 
          type="checkbox" 
          checked={selectedCompanies.length === filteredCompanies.length && filteredCompanies.length > 0}
          onChange={toggleSelectAll}
          style={{ cursor: 'pointer' }}
        />
      ),
      render: (v, row) => (
        <input 
          type="checkbox" 
          checked={selectedCompanies.includes(row._id)}
          onChange={() => toggleSelection(row._id)}
          style={{ cursor: 'pointer' }}
        />
      )
    },
    {
      key: 'name',
      label: 'Company Name',
      render: (v, row) => <strong style={{ fontSize: '14px' }}>{row.name}</strong>
    },
    {
      key: 'tier',
      label: 'Tier',
      render: (v, row) => {
        const assignedTier = tiers.find(t => (t.companyId?._id || t.companyId) === row._id);
        const tierName = assignedTier?.tier || 'basic';
        const colors = { basic: '#64748b', plus: '#3b82f6', pro: '#8b5cf6' };
        return <span style={{ padding: '4px 8px', background: colors[tierName] || '#64748b', color: 'white', borderRadius: '4px', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600' }}>{tierName}</span>;
      }
    },
    { key: 'email', label: 'Email', render: (v, row) => <span>{row.email || '—'}</span> },
    { key: 'phone', label: 'Phone', render: (v, row) => <span>{row.phone || '—'}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (v, row) => {
        const status = row.status || 'active';
        const colors = { active: '#10b981', inactive: '#f59e0b', archived: '#6b7280' };
        return <span style={{ padding: '4px 8px', background: colors[status], color: 'white', borderRadius: '4px', fontSize: '12px', textTransform: 'capitalize', fontWeight: '500' }}>{status}</span>;
      }
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (v, row) => <span>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}</span>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (v, row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); openSettings(row); }}
            style={{ padding: '6px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}
            title="Company Settings"
          >
            ⚙️ Settings
          </button>
        </div>
      )
    }
  ];

  const statsStyle = {
    card: { background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' },
    label: { fontSize: '14px', color: '#64748b', marginBottom: '8px' },
    value: { fontSize: '32px', fontWeight: '700', marginBottom: '4px' },
    subtext: { fontSize: '12px', color: '#64748b' }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', color: '#1e293b' }}>Company Management</h1>
          <p style={{ margin: 0, color: '#64748b' }}>Manage companies, assign tiers, and configure settings</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setTierComparisonOpen(true)} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
            🥇 Compare Tiers
          </button>
          <button onClick={openCreate} style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
            ➕ New Company
          </button>
          <button onClick={exportToCSV} style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
            📊 Export CSV
          </button>
          <button onClick={load} style={{ padding: '12px 24px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Loading companies from Aura Backend...
        </div>
      )}

      {error && (
        <div style={{ padding: '20px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', marginBottom: '20px' }}>
          <strong>⚠️ Connection Error:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Search and Filters */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>🔍 Search Companies</label>
                <input 
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Filter by Tier</label>
                <select 
                  value={tierFilter}
                  onChange={e => setTierFilter(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                >
                  <option value="all">All Tiers</option>
                  <option value="basic">Basic</option>
                  <option value="plus">Plus</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Filter by Status</label>
                <select 
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            
            {selectedCompanies.length > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#0c4a6e' }}>
                  {selectedCompanies.length} {selectedCompanies.length === 1 ? 'company' : 'companies'} selected
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => bulkAssignTier('basic')} style={{ padding: '8px 16px', background: '#64748b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                    Assign Basic
                  </button>
                  <button onClick={() => bulkAssignTier('plus')} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                    Assign Plus
                  </button>
                  <button onClick={() => bulkAssignTier('pro')} style={{ padding: '8px 16px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                    Assign Pro
                  </button>
                  <button onClick={bulkDelete} style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                    🗑️ Delete Selected
                  </button>
                  <button onClick={() => setSelectedCompanies([])} style={{ padding: '8px 16px', background: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                    Clear Selection
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={statsStyle.card}>
              <div style={statsStyle.label}>Total Companies</div>
              <div style={{ ...statsStyle.value, color: '#3b82f6' }}>{companies.length}</div>
              <div style={statsStyle.subtext}>{filteredCompanies.length} shown after filters</div>
            </div>
            <div style={statsStyle.card}>
              <div style={statsStyle.label}>Basic Tier</div>
              <div style={{ ...statsStyle.value, color: '#64748b' }}>
                {tiers.filter(t => t.tier === 'basic').length}
              </div>
              <div style={statsStyle.subtext}>Standard features</div>
            </div>
            <div style={statsStyle.card}>
              <div style={statsStyle.label}>Plus Tier</div>
              <div style={{ ...statsStyle.value, color: '#3b82f6' }}>
                {tiers.filter(t => t.tier === 'plus').length}
              </div>
              <div style={statsStyle.subtext}>Enhanced features</div>
            </div>
            <div style={statsStyle.card}>
              <div style={statsStyle.label}>Pro Tier</div>
              <div style={{ ...statsStyle.value, color: '#8b5cf6' }}>
                {tiers.filter(t => t.tier === 'pro').length}
              </div>
              <div style={statsStyle.subtext}>Premium features</div>
            </div>
          </div>

          {/* Tier Distribution */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b' }}>Tier Distribution</h3>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {['basic', 'plus', 'pro'].map(tier => {
                const count = tiers.filter(t => t.tier === tier).length;
                const percentage = companies.length > 0 ? ((count / companies.length) * 100).toFixed(1) : 0;
                const colors = { basic: '#64748b', plus: '#3b82f6', pro: '#8b5cf6' };
                return (
                  <div key={tier} style={{ flex: '1 1 150px', minWidth: '150px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500', textTransform: 'capitalize' }}>{tier}</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: colors[tier] }}>{count}</span>
                    </div>
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', background: colors[tier], transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{percentage}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          <DataTable 
            columns={columns} 
            data={filteredCompanies} 
            onEdit={openEdit} 
            onDelete={remove} 
            emptyMessage={searchQuery || tierFilter !== 'all' || statusFilter !== 'all' 
              ? 'No companies match your filters' 
              : 'No companies found'
            } 
          />

          <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
              <strong>ℹ️ Note:</strong> Companies are managed from Aura Backend (port 8000). 
              Tier assignments are managed in this control panel and determine feature access.
            </p>
          </div>
        </>
      )}

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 1000 }}>
          <div style={{ width: 720, maxWidth: '95vw', background: 'white', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>{editing ? 'Edit Company' : 'Create New Company'}</h3>
              <button onClick={() => setModalOpen(false)} style={{ padding: '8px 16px', background: 'white', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' }}>
                ✕ Close
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 }}>Company Name *</label>
                <input 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }} 
                  value={form.name} 
                  onChange={e => setForm({ ...form, name: e.target.value })} 
                  placeholder="e.g., FUE University"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 }}>Status *</label>
                <select 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }} 
                  value={form.status} 
                  onChange={e => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 }}>Tier Assignment *</label>
                <select 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }} 
                  value={form.tier} 
                  onChange={e => setForm({ ...form, tier: e.target.value })}
                >
                  <option value="basic">🥉 Basic (Standard Features)</option>
                  <option value="plus">🥈 Plus (Enhanced Features)</option>
                  <option value="pro">🥇 Pro (Premium Features)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 }}>Email</label>
                <input 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }} 
                  type="email"
                  value={form.email} 
                  onChange={e => setForm({ ...form, email: e.target.value })} 
                  placeholder="contact@company.com"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 }}>Phone</label>
                <input 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }} 
                  value={form.phone} 
                  onChange={e => setForm({ ...form, phone: e.target.value })} 
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 }}>Address</label>
                <input 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }} 
                  value={form.address} 
                  onChange={e => setForm({ ...form, address: e.target.value })} 
                  placeholder="123 Main St, City, State, ZIP"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 }}>Description</label>
                <textarea 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, minHeight: '80px', fontFamily: 'inherit' }} 
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })} 
                  placeholder="Brief description of the company..."
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 }}>Company Logo</label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <input 
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={handleLogoChange}
                    style={{ flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }}
                  />
                  {form.logoPreview && (
                    <div style={{ width: '64px', height: '64px', border: '2px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc' }}>
                      <img src={form.logoPreview} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  )}
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>Max 2MB. Formats: PNG, JPG, SVG</p>
              </div>
            </div>

            {error && (
              <div style={{ padding: 12, background: '#fee2e2', border: '1px solid #fecaca', color: '#7f1d1d', borderRadius: 8, marginTop: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
              <button onClick={() => setModalOpen(false)} style={{ padding: '10px 20px', background: 'white', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', fontWeight: '500' }}>
                Cancel
              </button>
              <button onClick={save} style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: '600' }}>
                {editing ? '💾 Save Changes' : '➕ Create Company'}
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 1000, overflowY: 'auto' }}>
          <div style={{ width: 900, maxWidth: '95vw', background: 'white', borderRadius: 12, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, position: 'sticky', top: 0, background: 'white', paddingBottom: '12px', borderBottom: '2px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>⚙️ Company Settings: {editing?.name}</h3>
              <button onClick={() => setSettingsModalOpen(false)} style={{ padding: '8px 16px', background: 'white', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' }}>
                ✕ Close
              </button>
            </div>
            
            {/* SMTP Configuration Section */}
            <div style={{ marginBottom: '32px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>📧</span> SMTP Email Configuration
              </h4>
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 }}>SMTP Host</label>
                    <input 
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }} 
                      value={settingsForm.smtp.host} 
                      onChange={e => setSettingsForm({ ...settingsForm, smtp: { ...settingsForm.smtp, host: e.target.value } })} 
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 }}>Port</label>
                    <input 
                      type="number"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }} 
                      value={settingsForm.smtp.port} 
                      onChange={e => setSettingsForm({ ...settingsForm, smtp: { ...settingsForm.smtp, port: parseInt(e.target.value) || 587 } })} 
                      placeholder="587"
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 6, width: '100%' }}>
                      <input 
                        type="checkbox"
                        checked={settingsForm.smtp.secure}
                        onChange={e => setSettingsForm({ ...settingsForm, smtp: { ...settingsForm.smtp, secure: e.target.checked } })}
                      />
                      <span style={{ fontSize: 14, fontWeight: '500', color: '#334155' }}>SSL/TLS</span>
                    </label>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 }}>Username</label>
                    <input 
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }} 
                      value={settingsForm.smtp.user} 
                      onChange={e => setSettingsForm({ ...settingsForm, smtp: { ...settingsForm.smtp, user: e.target.value } })} 
                      placeholder="your-email@gmail.com"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 }}>Password</label>
                    <input 
                      type="password"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }} 
                      value={settingsForm.smtp.password} 
                      onChange={e => setSettingsForm({ ...settingsForm, smtp: { ...settingsForm.smtp, password: e.target.value } })} 
                      placeholder="App password or SMTP password"
                    />
                  </div>
                </div>
                <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                  <strong>Note:</strong> For Gmail, use an App Password. Go to Google Account → Security → 2-Step Verification → App passwords
                </p>
              </div>
            </div>

            {/* Branding Configuration Section */}
            <div style={{ marginBottom: '32px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🎨</span> Branding & Theme
              </h4>
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 }}>Primary Color</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        type="color"
                        style={{ width: '50px', height: '42px', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' }} 
                        value={settingsForm.branding.primaryColor} 
                        onChange={e => setSettingsForm({ ...settingsForm, branding: { ...settingsForm.branding, primaryColor: e.target.value } })} 
                      />
                      <input 
                        type="text"
                        style={{ flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }} 
                        value={settingsForm.branding.primaryColor} 
                        onChange={e => setSettingsForm({ ...settingsForm, branding: { ...settingsForm.branding, primaryColor: e.target.value } })} 
                        placeholder="#667eea"
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 }}>Secondary Color</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        type="color"
                        style={{ width: '50px', height: '42px', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' }} 
                        value={settingsForm.branding.secondaryColor} 
                        onChange={e => setSettingsForm({ ...settingsForm, branding: { ...settingsForm.branding, secondaryColor: e.target.value } })} 
                      />
                      <input 
                        type="text"
                        style={{ flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }} 
                        value={settingsForm.branding.secondaryColor} 
                        onChange={e => setSettingsForm({ ...settingsForm, branding: { ...settingsForm.branding, secondaryColor: e.target.value } })} 
                        placeholder="#764ba2"
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 }}>Logo URL</label>
                    <input 
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }} 
                      value={settingsForm.branding.logoUrl} 
                      onChange={e => setSettingsForm({ ...settingsForm, branding: { ...settingsForm.branding, logoUrl: e.target.value } })} 
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>
                <div style={{ marginTop: '16px', padding: '16px', background: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Preview:</div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: settingsForm.branding.primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600', fontSize: '12px' }}>
                      Primary
                    </div>
                    <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: settingsForm.branding.secondaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600', fontSize: '12px' }}>
                      Secondary
                    </div>
                    <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: `linear-gradient(135deg, ${settingsForm.branding.primaryColor}, ${settingsForm.branding.secondaryColor})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600', fontSize: '12px' }}>
                      Gradient
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div style={{ padding: 12, background: '#fee2e2', border: '1px solid #fecaca', color: '#7f1d1d', borderRadius: 8, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, position: 'sticky', bottom: 0, background: 'white', paddingTop: '12px', borderTop: '2px solid #e2e8f0' }}>
              <button onClick={() => setSettingsModalOpen(false)} style={{ padding: '10px 20px', background: 'white', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', fontWeight: '500' }}>
                Cancel
              </button>
              <button onClick={saveSettings} style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: '600' }}>
                💾 Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tier Comparison Modal */}
      {tierComparisonOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 1000 }}>
          <div style={{ width: '95%', maxWidth: '1200px', background: 'white', borderRadius: '16px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ margin: 0, fontSize: '28px', color: '#1e293b' }}>🥇 Compare Tier Features</h2>
              <button onClick={() => setTierComparisonOpen(false)} style={{ padding: '10px 20px', background: 'white', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                ✕ Close
              </button>
            </div>

            {/* Tier Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
              {[
                { tier: 'basic', name: 'Basic', emoji: '🥉', color: '#4facfe', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', price: 'Free' },
                { tier: 'plus', name: 'Plus', emoji: '🥈', color: '#f5576c', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', price: '$99/mo' },
                { tier: 'pro', name: 'Pro', emoji: '🥇', color: '#764ba2', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', price: '$299/mo' }
              ].map(t => (
                <div key={t.tier} style={{ background: t.gradient, padding: '24px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '12px' }}>{t.emoji}</div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', textAlign: 'center' }}>{t.name}</h3>
                  <div style={{ fontSize: '32px', fontWeight: '700', textAlign: 'center', marginBottom: '16px' }}>{t.price}</div>
                  <div style={{ fontSize: '14px', opacity: 0.9, textAlign: 'center' }}>
                    {tiers.filter(tier => tier.tier === t.tier).length} {tiers.filter(tier => tier.tier === t.tier).length === 1 ? 'company' : 'companies'}
                  </div>
                </div>
              ))}
            </div>

            {/* Feature Comparison Table */}
            <div style={{ background: 'white', borderRadius: '12px', border: '2px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '700', color: '#1e293b', borderBottom: '2px solid #e2e8f0' }}>Feature</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontSize: '14px', fontWeight: '700', color: '#1e293b', borderBottom: '2px solid #e2e8f0' }}>🥉 Basic</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontSize: '14px', fontWeight: '700', color: '#1e293b', borderBottom: '2px solid #e2e8f0' }}>🥈 Plus</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontSize: '14px', fontWeight: '700', color: '#1e293b', borderBottom: '2px solid #e2e8f0' }}>🥇 Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { category: 'Resource Limits', items: [
                      { name: 'Max Users', basic: '10', plus: '50', pro: 'Unlimited' },
                      { name: 'Max Departments', basic: '5', plus: '20', pro: 'Unlimited' },
                      { name: 'Max Documents', basic: '1,000', plus: '10,000', pro: 'Unlimited' },
                      { name: 'Max Printers', basic: '2', plus: '10', pro: 'Unlimited' },
                      { name: 'Storage Limit', basic: '10 GB', plus: '100 GB', pro: 'Unlimited' }
                    ]},
                    { category: 'AI Features', items: [
                      { name: 'PDF Splitting', basic: '✅', plus: '✅', pro: '✅' },
                      { name: 'OCR Processing', basic: '✅', plus: '✅', pro: '✅' },
                      { name: 'Document Classification', basic: '✅', plus: '✅', pro: '✅' },
                      { name: 'Signature Detection', basic: '❌', plus: '✅', pro: '✅' },
                      { name: 'Structured Extraction', basic: '❌', plus: '✅', pro: '✅' },
                      { name: 'Entity Extraction', basic: '❌', plus: '✅', pro: '✅' },
                      { name: 'AI Summaries', basic: '❌', plus: '✅', pro: '✅' },
                      { name: 'Embedding Generation', basic: '❌', plus: '✅', pro: '✅' },
                      { name: 'Auto-Tuning', basic: '❌', plus: '❌', pro: '✅' }
                    ]},
                    { category: 'AI Parameters', items: [
                      { name: 'LLAMA Temperature', basic: '0.3 (fixed)', plus: '0.5 (fixed)', pro: '0.0-1.0 (custom)' },
                      { name: 'Max Tokens', basic: '512', plus: '768', pro: '128-2048' },
                      { name: 'GPU Memory', basic: '4 GB', plus: '6 GB', pro: '8+ GB' },
                      { name: 'GPU Layers', basic: '20', plus: '29', pro: '35' },
                      { name: 'Max PDF Size', basic: '50 MB', plus: '100 MB', pro: '500 MB' }
                    ]},
                    { category: 'Search Capabilities', items: [
                      { name: 'Keyword Search', basic: '✅', plus: '✅', pro: '✅' },
                      { name: 'Semantic Search', basic: '❌', plus: '✅', pro: '✅' },
                      { name: 'Conversational Search', basic: '❌', plus: '❌', pro: '✅' }
                    ]},
                    { category: 'Auto-Filing', items: [
                      { name: 'Simple Path Rules', basic: '✅', plus: '✅', pro: '✅' },
                      { name: 'Template-Based Rules', basic: '❌', plus: '✅', pro: '✅' },
                      { name: 'AI-Based Filing', basic: '❌', plus: '❌', pro: '✅' }
                    ]},
                    { category: 'Configuration', items: [
                      { name: 'Tier Defaults', basic: '✅', plus: '✅', pro: '✅' },
                      { name: 'Company Overrides', basic: '❌', plus: '✅', pro: '✅' },
                      { name: 'Per-Document Config', basic: '❌', plus: '❌', pro: '✅' }
                    ]},
                    { category: 'Support & SLA', items: [
                      { name: 'Community Support', basic: '✅', plus: '✅', pro: '✅' },
                      { name: 'Email Support', basic: '❌', plus: '✅', pro: '✅' },
                      { name: '99.9% Uptime SLA', basic: '❌', plus: '❌', pro: '✅' },
                      { name: 'Dedicated Support', basic: '❌', plus: '❌', pro: '✅' }
                    ]}
                  ].map(section => (
                    <React.Fragment key={section.category}>
                      <tr>
                        <td colSpan={4} style={{ padding: '12px 16px', background: '#f1f5f9', fontSize: '14px', fontWeight: '700', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                          {section.category}
                        </td>
                      </tr>
                      {section.items.map((item, idx) => (
                        <tr key={item.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: '#334155' }}>{item.name}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: '#334155', textAlign: 'center', fontWeight: '500' }}>{item.basic}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: '#334155', textAlign: 'center', fontWeight: '500' }}>{item.plus}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: '#334155', textAlign: 'center', fontWeight: '500' }}>{item.pro}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '24px', padding: '16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px' }}>
              <p style={{ margin: '0', fontSize: '14px', color: '#0c4a6e', lineHeight: '1.6' }}>
                <strong>💡 Tip:</strong> To upgrade a company's tier, edit the company and select a new tier from the dropdown. 
                Bulk tier assignment is available by selecting multiple companies and using the "Assign Basic/Plus/Pro" buttons above the table.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
