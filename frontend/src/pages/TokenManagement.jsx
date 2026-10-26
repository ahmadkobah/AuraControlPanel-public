import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createApi } from '../lib/api';

export default function TokenManagement() {
  const { token } = useAuth();
  const api = useMemo(() => createApi(token), [token]);

  const [activeTokens, setActiveTokens] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [tokensData, keysData, statsData] = await Promise.all([
        api.get('/admin/tokens/active'),
        api.get('/admin/tokens/api-keys'),
        api.get('/admin/tokens/stats')
      ]);
      setActiveTokens(tokensData.tokens || []);
      setApiKeys(keysData.keys || []);
      setStats(statsData.stats || null);
    } catch (e) {
      console.error('Failed to load tokens:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const revokeToken = async (tokenId) => {
    if (!confirm('Revoke this token? The user will be logged out.')) return;
    try {
      await api.post(`/admin/tokens/revoke/${tokenId}`);
      await load();
    } catch (e) {
      alert(e.message || 'Failed to revoke token');
    }
  };

  const generateApiKey = async () => {
    const name = prompt('API Key name:');
    if (!name) return;
    try {
      const result = await api.post('/admin/tokens/generate-api-key', { name });
      alert(`API Key created:\n\n${result.key}\n\nSave this key - it won't be shown again!`);
      await load();
    } catch (e) {
      alert(e.message || 'Failed to generate API key');
    }
  };

  const revokeApiKey = async (keyId) => {
    if (!confirm('Revoke this API key? Services using it will lose access.')) return;
    try {
      await api.post(`/admin/tokens/revoke-api-key/${keyId}`);
      await load();
    } catch (e) {
      alert(e.message || 'Failed to revoke API key');
    }
  };

  return (
    <div>
      <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', color: '#1e293b' }}>Token Management</h1>
      <p style={{ margin: '0 0 32px 0', color: '#64748b' }}>Monitor and control authentication tokens and API keys</p>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <StatCard icon="👥" label="Active Sessions" value={stats.activeSessions} color="#667eea" />
          <StatCard icon="🔑" label="API Keys" value={stats.apiKeyCount} color="#10b981" />
          <StatCard icon="⏱️" label="Avg Token Age" value={`${stats.avgTokenAge}h`} color="#f59e0b" />
          <StatCard icon="🚫" label="Revoked Today" value={stats.revokedToday} color="#ef4444" />
        </div>
      )}

      {loading ? <div>Loading...</div> : (
        <>
          {/* Active User Tokens */}
          <div style={section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Active User Sessions</h2>
              <button onClick={load} style={btnGhost}>Refresh</button>
            </div>
            
            {activeTokens.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No active sessions</div>
            ) : (
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>User</th>
                    <th style={th}>Email</th>
                    <th style={th}>Role</th>
                    <th style={th}>Issued</th>
                    <th style={th}>Expires</th>
                    <th style={th}>Last Activity</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTokens.map((t, i) => (
                    <tr key={i} style={tr}>
                      <td style={td}><strong>{t.userName}</strong></td>
                      <td style={td}>{t.email}</td>
                      <td style={td}><span style={{ ...badge, background: roleBadgeColor(t.role) }}>{t.role}</span></td>
                      <td style={td}>{formatDate(t.issuedAt)}</td>
                      <td style={td}>{formatDate(t.expiresAt)}</td>
                      <td style={td}>{formatRelative(t.lastActivity)}</td>
                      <td style={td}>
                        <button onClick={() => revokeToken(t.id)} style={btnDanger}>Revoke</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* API Keys */}
          <div style={section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>API Keys</h2>
              <button onClick={generateApiKey} style={btnPrimary}>+ Generate API Key</button>
            </div>
            
            {apiKeys.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No API keys</div>
            ) : (
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Name</th>
                    <th style={th}>Key (Masked)</th>
                    <th style={th}>Service</th>
                    <th style={th}>Created</th>
                    <th style={th}>Last Used</th>
                    <th style={th}>Requests</th>
                    <th style={th}>Status</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((k, i) => (
                    <tr key={i} style={tr}>
                      <td style={td}><strong>{k.name}</strong></td>
                      <td style={td}><code style={codeStyle}>{k.maskedKey}</code></td>
                      <td style={td}>{k.service || '-'}</td>
                      <td style={td}>{formatDate(k.createdAt)}</td>
                      <td style={td}>{k.lastUsed ? formatRelative(k.lastUsed) : 'Never'}</td>
                      <td style={td}>{k.requestCount || 0}</td>
                      <td style={td}>
                        <span style={{ ...badge, background: k.active ? '#10b981' : '#ef4444' }}>
                          {k.active ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td style={td}>
                        {k.active && (
                          <button onClick={() => revokeApiKey(k.id)} style={btnDanger}>Revoke</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'white',
      padding: '24px',
      borderRadius: '12px',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '32px', fontWeight: '700', color: color, marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '14px', color: '#64748b' }}>{label}</div>
    </div>
  );
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString();
}

function formatRelative(date) {
  if (!date) return '-';
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function roleBadgeColor(role) {
  if (role === 'superadmin') return '#7c3aed';
  if (role === 'admin') return '#3b82f6';
  return '#64748b';
}

const section = { background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' };
const table = { width: '100%', borderCollapse: 'collapse' };
const th = { textAlign: 'left', padding: '12px', borderBottom: '2px solid #e2e8f0', fontSize: '13px', fontWeight: '600', color: '#64748b' };
const td = { padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' };
const tr = { transition: 'background 0.2s' };
const badge = { padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', color: 'white', textTransform: 'capitalize' };
const codeStyle = { background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontFamily: 'monospace' };
const btnPrimary = { padding: '10px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 };
const btnGhost = { padding: '10px 16px', background: 'white', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' };
const btnDanger = { padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '13px' };
