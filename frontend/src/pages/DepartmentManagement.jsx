import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createApi } from '../lib/api';
import DataTable from '../components/DataTable';

export default function DepartmentManagement() {
  const { token } = useAuth();
  const api = useMemo(() => createApi(token), [token]);
  const [departments, setDepartments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = { name: '', companyId: '', description: '', status: 'active' };
  const [form, setForm] = useState(emptyForm);

  // Tier limit state
  const [tierLimits, setTierLimits] = useState(null);
  const [selectedCompanyForLimits, setSelectedCompanyForLimits] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [deptsData, companiesData] = await Promise.all([
        api.get('/proxy/departments'),
        api.get('/proxy/companies')
      ]);
      console.log('Departments loaded:', deptsData);
      console.log('Companies loaded:', companiesData);
      setDepartments(Array.isArray(deptsData) ? deptsData : deptsData?.departments || []);
      setCompanies(Array.isArray(companiesData) ? companiesData : companiesData?.companies || []);
      
      // Load tier limits for first company if available
      if (companiesData && companiesData.length > 0) {
        const firstCompany = Array.isArray(companiesData) ? companiesData[0] : companiesData.companies?.[0];
        if (firstCompany) {
          await loadTierLimits(firstCompany._id || firstCompany.id);
        }
      }
    } catch (e) {
      console.error('Load data failed:', e);
      setError('Failed to load data. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  }

  async function loadTierLimits(companyId) {
    try {
      const companyData = await api.get(`/proxy/companies/${companyId}`);
      const tier = companyData?.tier || 'basic';
      
      const tierDefaults = {
        basic: { maxDepartments: 5, tier: 'basic', displayName: 'Basic' },
        plus: { maxDepartments: 20, tier: 'plus', displayName: 'Plus' },
        pro: { maxDepartments: -1, tier: 'pro', displayName: 'Pro' }
      };
      
      setTierLimits(tierDefaults[tier] || tierDefaults.basic);
      setSelectedCompanyForLimits(companyId);
    } catch (e) {
      console.warn('Could not load tier limits:', e);
      setTierLimits({ maxDepartments: 5, tier: 'basic', displayName: 'Basic' });
    }
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setModalOpen(true); }
  function openEdit(dept) {
    setEditing(dept);
    setForm({
      name: dept.name || '',
      companyId: dept.companyId || '',
      description: dept.description || '',
      status: dept.status || 'active'
    });
    setModalOpen(true);
  }

  async function save() {
    setError(null);
    
    // Check tier limits before creating new department
    if (!editing && tierLimits && tierLimits.maxDepartments !== -1) {
      const companyDepts = departments.filter(d => String(d.companyId) === String(form.companyId));
      if (companyDepts.length >= tierLimits.maxDepartments) {
        setError(`Department limit reached! Your ${tierLimits.displayName} tier allows up to ${tierLimits.maxDepartments} departments. Please upgrade to add more departments.`);
        return;
      }
    }
    
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/proxy/departments/${editing._id}` : '/proxy/departments';
      await api.fetch(method, url, form);
      setModalOpen(false);
      await loadData();
    } catch (e) { 
      if (e.upgradeRequired) {
        setError(`${e.message} Please upgrade to add more departments.`);
      } else {
        setError(e.message || 'Save failed');
      }
    }
  }

  async function remove(dept) {
    if (!confirm(`Delete department ${dept.name}?`)) return;
    try {
      await api.del(`/proxy/departments/${dept._id}`);
      await loadData();
    } catch (e) { alert(e.message || 'Delete failed'); }
  }

  const columns = [
    { 
      key: 'name', 
      label: 'Department Name',
      render: (v, row) => <strong style={{ fontSize: '14px' }}>{row.name || '—'}</strong>
    },
    { 
      key: 'companyId', 
      label: 'Company', 
      render: (v, row) => {
        if (!row.companyId) return <span>—</span>;
        const company = companies.find(c => String(c._id) === String(row.companyId) || String(c.id) === String(row.companyId));
        return <span>{company?.name || '—'}</span>;
      }
    },
    { 
      key: 'description', 
      label: 'Description',
      render: (v, row) => <span>{row.description || '—'}</span>
    },
    { 
      key: 'status', 
      label: 'Status', 
      render: (v, row) => {
        const statusStr = row.status || 'active';
        const colors = { active: '#10b981', inactive: '#ef4444' };
        return (
          <span style={{ 
            padding: '4px 8px', 
            background: colors[statusStr] || '#64748b', 
            color: 'white', 
            borderRadius: '4px', 
            fontSize: '12px',
            textTransform: 'uppercase',
            fontWeight: '600'
          }}>
            {statusStr.toUpperCase()}
          </span>
        );
      }
    },
    { 
      key: 'createdAt', 
      label: 'Created', 
      render: (v, row) => <span>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}</span>
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: 'clamp(24px, 5vw, 32px)', color: '#1e293b' }}>Department Management</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Manage departments from Aura Backend</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={openCreate} style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ➕ New Department
          </button>
          <button onClick={loadData} style={{ padding: '12px 24px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Loading departments from Aura Backend...
        </div>
      )}

      {error && (
        <div style={{ padding: '20px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', marginBottom: '20px' }}>
          <strong>⚠️ Connection Error:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <>
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
                    {tierLimits.maxDepartments === -1 ? 'Unlimited departments' : `Up to ${tierLimits.maxDepartments} departments allowed`}
                  </div>
                </div>
                {tierLimits.maxDepartments !== -1 && (
                  <div style={{ flex: '0 0 auto', minWidth: '200px' }}>
                    <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
                      Department Count: {departments.filter(d => String(d.companyId) === String(selectedCompanyForLimits)).length} / {tierLimits.maxDepartments}
                    </div>
                    <div style={{ 
                      height: '12px', 
                      background: 'rgba(255,255,255,0.3)', 
                      borderRadius: '6px', 
                      overflow: 'hidden',
                      marginBottom: '8px'
                    }}>
                      <div style={{ 
                        width: `${Math.min((departments.filter(d => String(d.companyId) === String(selectedCompanyForLimits)).length / tierLimits.maxDepartments) * 100, 100)}%`, 
                        height: '100%', 
                        background: 'white',
                        transition: 'width 0.3s'
                      }} />
                    </div>
                    {departments.filter(d => String(d.companyId) === String(selectedCompanyForLimits)).length >= tierLimits.maxDepartments && (
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

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>Total Departments</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#3b82f6', marginBottom: '4px' }}>{departments.length}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Across all companies</div>
            </div>
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>Active Departments</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>{departments.filter(d => d.status === 'active').length}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Currently active</div>
            </div>
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>Companies</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b', marginBottom: '4px' }}>{companies.length}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Total organizations</div>
            </div>
          </div>

          {/* Departments by Company */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b' }}>Departments by Company</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
              {companies.map(company => {
                const companyDepts = departments.filter(d => d.companyId === company._id || d.companyId === company.id);
                return (
                  <div key={company._id || company.id} style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>{company.name}</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6', marginBottom: '4px' }}>{companyDepts.length}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {companyDepts.length === 1 ? 'Department' : 'Departments'}
                    </div>
                    {companyDepts.length > 0 && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                        {companyDepts.slice(0, 3).map(d => (
                          <div key={d._id || d.id} style={{ fontSize: '12px', color: '#475569', padding: '4px 0' }}>
                            • {d.name}
                          </div>
                        ))}
                        {companyDepts.length > 3 && (
                          <div style={{ fontSize: '12px', color: '#64748b', padding: '4px 0', fontStyle: 'italic' }}>
                            +{companyDepts.length - 3} more...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DataTable columns={columns} data={departments} onEdit={openEdit} onDelete={remove} emptyMessage="No departments found" />

          <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
              <strong>ℹ️ Note:</strong> Departments are managed from Aura Backend (port 8000). 
              Create, edit, and delete operations are proxied through AuraControlPanel.
            </p>
          </div>
        </>
      )}

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 1000 }}>
          <div style={{ width: '90%', maxWidth: '600px', background: 'white', borderRadius: '12px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>{editing ? 'Edit Department' : 'Create New Department'}</h3>
              <button onClick={() => setModalOpen(false)} style={{ padding: '8px 16px', background: 'white', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>
                ✕ Close
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Department Name *</label>
                <input 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }} 
                  value={form.name} 
                  onChange={e => setForm({ ...form, name: e.target.value })} 
                  placeholder="e.g., Human Resources"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Company *</label>
                <select 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }} 
                  value={form.companyId} 
                  onChange={e => setForm({ ...form, companyId: e.target.value })}
                >
                  <option value="">-- Select Company --</option>
                  {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Description</label>
                <textarea 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', minHeight: '100px', resize: 'vertical' }} 
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })} 
                  placeholder="Brief description of the department"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Status *</label>
                <select 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }} 
                  value={form.status} 
                  onChange={e => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {error && (
              <div style={{ padding: '12px', background: '#fee2e2', border: '1px solid #fecaca', color: '#7f1d1d', borderRadius: '8px', marginTop: '16px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
              <button onClick={() => setModalOpen(false)} style={{ padding: '10px 20px', background: 'white', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                Cancel
              </button>
              <button onClick={save} style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                {editing ? '💾 Save Changes' : '➕ Create Department'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
