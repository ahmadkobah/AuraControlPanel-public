import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createApi } from '../lib/api';

export default function AuditLogs() {
  const { token } = useAuth();
  const api = useMemo(() => createApi(token), [token]);
  
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState({ category: '', limit: 50 });
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.category) params.append('category', filter.category);
      params.append('limit', filter.limit);
      const data = await api.get(`/admin/audit-logs?${params}`);
      setLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <div>
      <h1>Audit Logs</h1>
      <p>System activity and change history (read-only)</p>

      <div style={{ display: 'flex', gap: 12, margin: '16px 0', alignItems: 'center' }}>
        <select value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} style={select}>
          <option value="">All Categories</option>
          {['config','tier','classification','printer','pipeline','api','system'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filter.limit} onChange={e => setFilter({ ...filter, limit: Number(e.target.value) })} style={select}>
          {[20,50,100,200].map(l => <option key={l} value={l}>Last {l}</option>)}
        </select>
        <button onClick={load} style={btn}>Refresh</button>
      </div>

      <div style={{ background: 'white', padding: '16px', borderRadius: '12px', maxHeight: '700px', overflow: 'auto' }}>
        {logs.map(log => (
          <div key={log._id} style={logRow}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={actionBadge(log.action)}>{log.action}</span>
                <span style={{ marginLeft: 8, fontWeight: 600 }}>{log.category}</span>
                <span style={{ marginLeft: 8, color: '#64748b' }}>
                  by {log.userId?.firstName} {log.userId?.lastName}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </span>
                <button onClick={() => setExpanded(expanded === log._id ? null : log._id)} style={expandBtn}>
                  {expanded === log._id ? '−' : '+'}
                </button>
              </div>
            </div>
            {expanded === log._id && (
              <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 6, fontSize: 12 }}>
                <div><strong>IP:</strong> {log.ipAddress}</div>
                <div><strong>Target Type:</strong> {log.targetType || '-'}</div>
                <div><strong>Target ID:</strong> {log.targetId || '-'}</div>
                {log.changes && (
                  <div style={{ marginTop: 8 }}>
                    <strong>Changes:</strong>
                    <pre style={{ marginTop: 4, padding: 8, background: 'white', borderRadius: 4, overflow: 'auto' }}>
                      {JSON.stringify(log.changes, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>No audit logs found</div>
        )}
      </div>
    </div>
  );
}

const select = { padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 };
const btn = { padding: '8px 16px', background: 'white', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' };
const logRow = { padding: 12, borderBottom: '1px solid #e2e8f0', fontSize: 13 };
const expandBtn = { padding: '4px 10px', background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 };
const actionBadge = (action) => {
  const colors = { create: '#10b981', update: '#f59e0b', delete: '#dc2626', reload: '#6366f1' };
  return { padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'white', background: colors[action] || '#6b7280' };
};
