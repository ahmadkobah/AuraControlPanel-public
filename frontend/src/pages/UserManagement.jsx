import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createApi } from '../lib/api';
import DataTable from '../components/DataTable';

export default function UserManagement() {
  const { token } = useAuth();
  const api = useMemo(() => createApi(token), [token]);
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = { firstName: '', lastName: '', email: '', password: '', role: 'user', companyId: '', departmentId: '', status: 'active' };
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
      const [usersData, companiesData, deptsData] = await Promise.all([
        api.get('/proxy/users'),
        api.get('/proxy/companies'),
        api.get('/proxy/departments')
      ]);
      console.log('Users loaded:', usersData);
      console.log('Companies loaded:', companiesData);
      console.log('Departments loaded:', deptsData);
      setUsers(Array.isArray(usersData) ? usersData : usersData?.users || []);
      setCompanies(Array.isArray(companiesData) ? companiesData : companiesData?.companies || []);
      setDepartments(Array.isArray(deptsData) ? deptsData : deptsData?.departments || []);
      
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
      // Try to get company tier info from backend
      const companyData = await api.get(`/proxy/companies/${companyId}`);
      const tier = companyData?.tier || 'basic';
      
      // Get tier limits from tier defaults
      const tierDefaults = {
        basic: { maxUsers: 10, tier: 'basic', displayName: 'Basic' },
        plus: { maxUsers: 50, tier: 'plus', displayName: 'Plus' },
        pro: { maxUsers: -1, tier: 'pro', displayName: 'Pro' } // -1 = unlimited
      };
      
      setTierLimits(tierDefaults[tier] || tierDefaults.basic);
      setSelectedCompanyForLimits(companyId);
    } catch (e) {
      console.warn('Could not load tier limits:', e);
      setTierLimits({ maxUsers: 10, tier: 'basic', displayName: 'Basic' });
    }
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setModalOpen(true); }
  function openEdit(user) {
    setEditing(user);
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '',
      role: user.role || 'user',
      companyId: user.companyId || '',
      departmentId: user.departmentId || '',
      status: user.status || 'active'
    });
    setModalOpen(true);
  }

  async function save() {
    setError(null);
    
    // Check tier limits before creating new user
    if (!editing && tierLimits && tierLimits.maxUsers !== -1) {
      const companyUsers = users.filter(u => String(u.companyId) === String(form.companyId));
      if (companyUsers.length >= tierLimits.maxUsers) {
        setError(`User limit reached! Your ${tierLimits.displayName} tier allows up to ${tierLimits.maxUsers} users. Please upgrade to add more users.`);
        return;
      }
    }
    
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/proxy/users/${editing._id}` : '/proxy/users';
      const payload = editing ? form : { ...form };
      if (editing && !form.password) delete payload.password;
      await api.fetch(method, url, payload);
      setModalOpen(false);
      await loadData();
    } catch (e) { 
      if (e.upgradeRequired) {
        setError(`${e.message} Please upgrade to add more users.`);
      } else {
        setError(e.message || 'Save failed');
      }
    }
  }

  async function remove(user) {
    if (!confirm(`Delete user ${user.firstName} ${user.lastName}?`)) return;
    try {
      await api.del(`/proxy/users/${user._id}`);
      await loadData();
    } catch (e) { alert(e.message || 'Delete failed'); }
  }

  const columns = [
    { 
      key: 'firstName', 
      label: 'First Name',
      render: (v, row) => <span>{row.firstName || '—'}</span>
    },
    { 
      key: 'lastName', 
      label: 'Last Name',
      render: (v, row) => <span>{row.lastName || '—'}</span>
    },
    { 
      key: 'email', 
      label: 'Email',
      render: (v, row) => <span>{row.email || '—'}</span>
    },
    { 
      key: 'role', 
      label: 'Role', 
      render: (v, row) => {
        const roleStr = row.role || 'user';
        const colors = { superadmin: '#8b5cf6', admin: '#3b82f6', user: '#64748b', manager: '#10b981' };
        return (
          <span style={{ 
            padding: '4px 8px', 
            background: colors[roleStr] || '#64748b', 
            color: 'white', 
            borderRadius: '4px', 
            fontSize: '12px',
            textTransform: 'uppercase',
            fontWeight: '600'
          }}>
            {roleStr.toUpperCase()}
          </span>
        );
      }
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
      key: 'departmentId', 
      label: 'Department', 
      render: (v, row) => {
        if (!row.departmentId) return <span>—</span>;
        const dept = departments.find(d => String(d._id) === String(row.departmentId) || String(d.id) === String(row.departmentId));
        return <span>{dept?.name || '—'}</span>;
      }
    },
    { 
      key: 'status', 
      label: 'Status', 
      render: (v, row) => {
        const statusStr = row.status || 'active';
        const colors = { active: '#10b981', inactive: '#ef4444', pending: '#f59e0b' };
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
      render: (v, row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: 'clamp(24px, 5vw, 32px)', color: '#1e293b' }}>User Management</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Manage users from Aura Backend</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={openCreate} style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ➕ New User
          </button>
          <button onClick={loadData} style={{ padding: '12px 24px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Loading users from Aura Backend...
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
                    {tierLimits.maxUsers === -1 ? 'Unlimited users' : `Up to ${tierLimits.maxUsers} users allowed`}
                  </div>
                </div>
                {tierLimits.maxUsers !== -1 && (
                  <div style={{ flex: '0 0 auto', minWidth: '200px' }}>
                    <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
                      User Count: {users.filter(u => String(u.companyId) === String(selectedCompanyForLimits)).length} / {tierLimits.maxUsers}
                    </div>
                    <div style={{ 
                      height: '12px', 
                      background: 'rgba(255,255,255,0.3)', 
                      borderRadius: '6px', 
                      overflow: 'hidden',
                      marginBottom: '8px'
                    }}>
                      <div style={{ 
                        width: `${Math.min((users.filter(u => String(u.companyId) === String(selectedCompanyForLimits)).length / tierLimits.maxUsers) * 100, 100)}%`, 
                        height: '100%', 
                        background: 'white',
                        transition: 'width 0.3s'
                      }} />
                    </div>
                    {users.filter(u => String(u.companyId) === String(selectedCompanyForLimits)).length >= tierLimits.maxUsers && (
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
            <div style={statsStyle.card}>
              <div style={statsStyle.label}>Total Users</div>
              <div style={{ ...statsStyle.value, color: '#3b82f6' }}>{users.length}</div>
              <div style={statsStyle.subtext}>Across all companies</div>
            </div>
            <div style={statsStyle.card}>
              <div style={statsStyle.label}>Active Users</div>
              <div style={{ ...statsStyle.value, color: '#10b981' }}>{users.filter(u => u.status === 'active').length}</div>
              <div style={statsStyle.subtext}>Currently active</div>
            </div>
            <div style={statsStyle.card}>
              <div style={statsStyle.label}>Admins</div>
              <div style={{ ...statsStyle.value, color: '#8b5cf6' }}>{users.filter(u => u.role === 'admin' || u.role === 'superadmin').length}</div>
              <div style={statsStyle.subtext}>Admin roles</div>
            </div>
            <div style={statsStyle.card}>
              <div style={statsStyle.label}>Companies</div>
              <div style={{ ...statsStyle.value, color: '#f59e0b' }}>{companies.length}</div>
              <div style={statsStyle.subtext}>Total organizations</div>
            </div>
          </div>

          {/* Role Distribution */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b' }}>User Distribution by Role</h3>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {['superadmin', 'admin', 'manager', 'user'].map(role => {
                const count = users.filter(u => u.role === role).length;
                const percentage = users.length > 0 ? ((count / users.length) * 100).toFixed(1) : 0;
                const colors = { superadmin: '#8b5cf6', admin: '#3b82f6', manager: '#10b981', user: '#64748b' };
                return (
                  <div key={role} style={{ flex: '1 1 150px', minWidth: '150px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500', textTransform: 'capitalize' }}>{role}</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: colors[role] }}>{count}</span>
                    </div>
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', background: colors[role], transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{percentage}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          <DataTable columns={columns} data={users} onEdit={openEdit} onDelete={remove} emptyMessage="No users found" />

          <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
              <strong>ℹ️ Note:</strong> Users are managed from Aura Backend (port 8000). 
              Create, edit, and delete operations are proxied through AuraControlPanel.
            </p>
          </div>
        </>
      )}

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 1000 }}>
          <div style={{ width: '90%', maxWidth: '800px', background: 'white', borderRadius: '12px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>{editing ? 'Edit User' : 'Create New User'}</h3>
              <button onClick={() => setModalOpen(false)} style={{ padding: '8px 16px', background: 'white', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>
                ✕ Close
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>First Name *</label>
                <input 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }} 
                  value={form.firstName} 
                  onChange={e => setForm({ ...form, firstName: e.target.value })} 
                  placeholder="John"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Last Name *</label>
                <input 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }} 
                  value={form.lastName} 
                  onChange={e => setForm({ ...form, lastName: e.target.value })} 
                  placeholder="Doe"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Email *</label>
                <input 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }} 
                  type="email"
                  value={form.email} 
                  onChange={e => setForm({ ...form, email: e.target.value })} 
                  placeholder="john.doe@example.com"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Password {editing && '(leave blank to keep)'}</label>
                <input 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }} 
                  type="password"
                  value={form.password} 
                  onChange={e => setForm({ ...form, password: e.target.value })} 
                  placeholder={editing ? 'Leave blank to keep current' : 'Enter password'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Role *</label>
                <select 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }} 
                  value={form.role} 
                  onChange={e => setForm({ ...form, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Company</label>
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
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Department</label>
                <select 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }} 
                  value={form.departmentId} 
                  onChange={e => setForm({ ...form, departmentId: e.target.value })}
                  disabled={!form.companyId}
                >
                  <option value="">-- Select Department --</option>
                  {departments.filter(d => d.companyId === form.companyId).map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
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
                  <option value="pending">Pending</option>
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
                {editing ? '💾 Save Changes' : '➕ Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
