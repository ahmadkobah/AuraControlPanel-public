import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Pipelines() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch('http://localhost:4000/admin/pipelines', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setItems(data.pipelines || []))
      .catch(console.error);
  }, []);

  return (
    <div>
      <h1>Pipeline Control</h1>
      <p>Configure document processing pipelines</p>
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginTop: '20px' }}>
        <p>Total Pipelines: {items.length}</p>
        <button style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          + Add Pipeline
        </button>
      </div>
    </div>
  );
}
