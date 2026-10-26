import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function ConfigManagement() {
  const { token } = useAuth();
  const [configs, setConfigs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    fetchConfigs();
  }, [filter]);

  const fetchConfigs = async () => {
    const url = filter === 'all' 
      ? 'http://localhost:4000/admin/configs'
      : `http://localhost:4000/admin/configs?category=${filter}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setConfigs(data.configs || []);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this config?')) return;
    await fetch(`http://localhost:4000/admin/configs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchConfigs();
  };

  const handleReload = async () => {
    await fetch('http://localhost:4000/admin/reload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ modules: ['all'] })
    });
    alert('Reload signal sent to services');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', color: '#1e293b' }}>Config Management</h1>
          <p style={{ margin: 0, color: '#64748b' }}>System-wide configuration settings</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleReload} style={styles.secondaryButton}>
            🔄 Hot Reload
          </button>
          <button onClick={() => { setEditItem(null); setShowModal(true); }} style={styles.primaryButton}>
            + Add Config
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['all', 'api', 'ai', 'tier', 'printer', 'pipeline', 'validation', 'search', 'toggles'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              ...styles.filterButton,
              background: filter === cat ? '#667eea' : 'white',
              color: filter === cat ? 'white' : '#1e293b'
            }}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={styles.table}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Key</th>
              <th style={styles.th}>Value</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Environment</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {configs.map(config => (
              <tr key={config._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={styles.td}><span style={styles.badge}>{config.category}</span></td>
                <td style={styles.td}><code>{config.key}</code></td>
                <td style={styles.td}><code style={{ fontSize: '12px' }}>{JSON.stringify(config.value)}</code></td>
                <td style={styles.td}>{config.description}</td>
                <td style={styles.td}><span style={styles.badge}>{config.environment}</span></td>
                <td style={styles.td}>
                  <button onClick={() => { setEditItem(config); setShowModal(true); }} style={styles.actionBtn}>Edit</button>
                  <button onClick={() => handleDelete(config._id)} style={{ ...styles.actionBtn, color: '#dc2626' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <ConfigModal item={editItem} onClose={() => { setShowModal(false); fetchConfigs(); }} token={token} />}
    </div>
  );
}

function ConfigModal({ item, onClose, token }) {
  const [form, setForm] = useState(item || {
    category: 'api',
    key: '',
    value: '',
    description: '',
    environment: 'production',
    requiresRestart: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = item
      ? `http://localhost:4000/admin/configs/${item._id}`
      : 'http://localhost:4000/admin/configs';
    await fetch(url, {
      method: item ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, value: JSON.parse(form.value) })
    });
    onClose();
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 20px 0' }}>{item ? 'Edit' : 'Add'} Config</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label>Category</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={styles.input}>
              {['api', 'ai', 'tier', 'printer', 'pipeline', 'validation', 'search', 'toggles'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label>Key</label>
            <input value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} required style={styles.input} />
          </div>
          <div style={styles.formGroup}>
            <label>Value (JSON)</label>
            <textarea value={typeof form.value === 'string' ? form.value : JSON.stringify(form.value)} onChange={e => setForm({ ...form, value: e.target.value })} required style={{ ...styles.input, minHeight: '80px' }} />
          </div>
          <div style={styles.formGroup}>
            <label>Description</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={styles.input} />
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
  filterButton: { padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
  table: { background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' },
  th: { padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' },
  td: { padding: '12px', fontSize: '14px', color: '#1e293b' },
  badge: { padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '12px', fontWeight: '500' },
  actionBtn: { padding: '4px 12px', border: 'none', background: 'transparent', color: '#667eea', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '32px', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' },
  formGroup: { marginBottom: '16px' },
  input: { width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }
};
