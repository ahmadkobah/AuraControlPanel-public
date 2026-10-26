import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function APIEndpoints() {
  const { token } = useAuth();
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [discoveredAPIs, setDiscoveredAPIs] = useState(null);
  const [showDiscovered, setShowDiscovered] = useState(false);

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const fetchEndpoints = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/admin/api-endpoints', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setEndpoints(data.endpoints || []);
    } catch (err) {
      console.error('Failed to load endpoints:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this endpoint?')) return;
    await fetch(`http://localhost:4000/admin/api-endpoints/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchEndpoints();
  };

  const handleDiscover = async () => {
    try {
      const res = await fetch('http://localhost:4000/admin/discover-apis', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setDiscoveredAPIs(data);
      setShowDiscovered(true);
    } catch (err) {
      alert('Discovery failed: ' + err.message);
    }
  };

  const getTiersDisplay = (tiers) => {
    if (!tiers) return 'all';
    if (Array.isArray(tiers)) return tiers.join(', ') || 'all';
    if (typeof tiers === 'object') return Object.keys(tiers).join(', ') || 'all';
    return String(tiers);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', color: '#1e293b' }}>API Endpoints</h1>
          <p style={{ margin: 0, color: '#64748b' }}>Manage service endpoints and routing configurations</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleDiscover} style={styles.secondaryButton}>
            🔍 Discover APIs
          </button>
          <button onClick={() => { setEditItem(null); setShowModal(true); }} style={styles.primaryButton}>
            + New Endpoint
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p>Loading endpoints...</p>
        </div>
      ) : (
        <div style={styles.table}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={styles.th}>Service</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Base URL</th>
                <th style={styles.th}>Port</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Basic Tier</th>
                <th style={styles.th}>Plus Tier</th>
                <th style={styles.th}>Pro Tier</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ ...styles.td, textAlign: 'center', padding: '40px', color: '#94a3b8' }}>        
                    No endpoints configured
                  </td>
                </tr>
              ) : (
                endpoints.map(endpoint => (
                  <tr key={endpoint._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={styles.td}><span style={styles.serviceBadge}>{endpoint.service}</span></td>
                    <td style={styles.td}>{endpoint.name}</td>
                    <td style={styles.td}><code style={{ fontSize: '12px' }}>{endpoint.baseUrl}</code></td>
                    <td style={styles.td}>{endpoint.port || '-'}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusBadge, background: endpoint.status === 'active' ? '#10b981' : '#6b7280' }}>
                        {endpoint.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ 
                        ...styles.statusBadge, 
                        background: endpoint.healthStatus?.basic === 'up' ? '#10b981' : endpoint.healthStatus?.basic === 'down' ? '#ef4444' : '#94a3b8' 
                      }}>
                        {endpoint.healthStatus?.basic || 'unknown'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ 
                        ...styles.statusBadge, 
                        background: endpoint.healthStatus?.plus === 'up' ? '#10b981' : endpoint.healthStatus?.plus === 'down' ? '#ef4444' : '#94a3b8' 
                      }}>
                        {endpoint.healthStatus?.plus || 'unknown'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ 
                        ...styles.statusBadge, 
                        background: endpoint.healthStatus?.pro === 'up' ? '#10b981' : endpoint.healthStatus?.pro === 'down' ? '#ef4444' : '#94a3b8' 
                      }}>
                        {endpoint.healthStatus?.pro || 'unknown'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => { setEditItem(endpoint); setShowModal(true); }} style={styles.actionBtn}>Edit</button>
                      <button onClick={() => handleDelete(endpoint._id)} style={{ ...styles.actionBtn, color: '#dc2626' }}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}


      {showDiscovered && discoveredAPIs && (
        <div style={{ marginTop: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}>Discovered APIs ({discoveredAPIs.discovered || 0})</h2>
            <button onClick={() => setShowDiscovered(false)} style={styles.secondaryButton}>Hide</button>
          </div>

          {discoveredAPIs.aura && (
            <div style={{ ...styles.table, marginBottom: '16px' }}>
              <h3 style={{ margin: '16px', color: '#667eea' }}>aura APIs ({discoveredAPIs.aura.count})</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={styles.th}>Method</th>
                    <th style={styles.th}>Path</th>
                    <th style={styles.th}>File</th>
                  </tr>
                </thead>
                <tbody>
                  {discoveredAPIs.aura.apis.map((api, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={styles.td}><span style={styles.methodBadge}>{api.method}</span></td>
                      <td style={styles.td}><code>{api.path}</code></td>
                      <td style={styles.td}>{api.file}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {discoveredAPIs.ai_service && (
            <div style={styles.table}>
              <h3 style={{ margin: '16px', color: '#10b981' }}>AI Service APIs ({discoveredAPIs.ai_service.count})</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={styles.th}>Method</th>
                    <th style={styles.th}>Path</th>
                    <th style={styles.th}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {discoveredAPIs.ai_service.apis.map((api, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={styles.td}><span style={styles.methodBadge}>{api.method}</span></td>
                      <td style={styles.td}><code>{api.path}</code></td>
                      <td style={styles.td}>{api.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showModal && <EndpointModal item={editItem} onClose={() => { setShowModal(false); fetchEndpoints(); }} token={token} />}
    </div>
  );
}

function EndpointModal({ item, onClose, token }) {
  const [form, setForm] = useState(item || {
    service: 'ai',
    name: '',
    baseUrl: '',
    port: '',
    healthEndpoint: '/health',
    authentication: { type: 'none', credentials: '' },
    tiers: [],
    rateLimit: 100,
    timeout: 30000,
    status: 'active'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = item
      ? `http://localhost:4000/admin/api-endpoints/${item._id}`
      : 'http://localhost:4000/admin/api-endpoints';
    
    const payload = {
      ...form,
      port: form.port === '' ? undefined : Number(form.port),
      rateLimit: Number(form.rateLimit),
      timeout: Number(form.timeout)
    };

    await fetch(url, {
      method: item ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    onClose();
  };

  const handleTiersChange = (value) => {
    const tierArray = value.split(',').map(s => s.trim()).filter(Boolean);
    setForm({ ...form, tiers: tierArray });
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 20px 0' }}>{item ? 'Edit' : 'Add'} Endpoint</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={styles.formGroup}>
              <label>Service</label>
              <select value={form.service} onChange={e => setForm({ ...form, service: e.target.value })} style={styles.input}>
                {['ai', 'ocr', 'llm', 'search', 'classification'].map(s => (
                  <option key={s} value={s}>{s.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label>Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label>Base URL</label>
              <input value={form.baseUrl} onChange={e => setForm({ ...form, baseUrl: e.target.value })} required style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label>Port</label>
              <input type="number" value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label>Health Endpoint</label>
              <input value={form.healthEndpoint} onChange={e => setForm({ ...form, healthEndpoint: e.target.value })} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={styles.input}>
                {['active', 'inactive', 'maintenance'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label>Rate Limit (req/min)</label>
              <input type="number" value={form.rateLimit} onChange={e => setForm({ ...form, rateLimit: e.target.value })} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label>Timeout (ms)</label>
              <input type="number" value={form.timeout} onChange={e => setForm({ ...form, timeout: e.target.value })} style={styles.input} />
            </div>
            <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
              <label>Tiers (comma-separated)</label>
              <input 
                value={Array.isArray(form.tiers) ? form.tiers.join(', ') : ''} 
                onChange={e => handleTiersChange(e.target.value)} 
                style={styles.input} 
                placeholder="basic, plus, pro" 
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancel</button>
            <button type="submit" style={styles.primaryButton}>Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  primaryButton: { padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
  secondaryButton: { padding: '10px 20px', background: 'white', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
  table: { background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' },
  th: { padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' },
  td: { padding: '12px', fontSize: '14px', color: '#1e293b' },
  serviceBadge: { padding: '4px 8px', background: '#e0e7ff', color: '#4338ca', borderRadius: '4px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' },
  statusBadge: { padding: '4px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', color: 'white', textTransform: 'capitalize' },
  methodBadge: { padding: '4px 8px', background: '#10b981', color: 'white', borderRadius: '4px', fontSize: '11px', fontWeight: '700' },
  actionBtn: { padding: '4px 12px', border: 'none', background: 'transparent', color: '#667eea', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '32px', borderRadius: '12px', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' },
  formGroup: { marginBottom: '12px' },
  input: { width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }
};
