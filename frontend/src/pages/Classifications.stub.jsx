import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Classifications() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch('http://localhost:4000/admin/classifications', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setItems(data.classifications || []))
      .catch(console.error);
  }, []);

  return (
    <div>
      <h1>AI Classifications</h1>
      <p>Manage document classification types</p>
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginTop: '20px' }}>
        <p>Total Classifications: {items.length}</p>
        <button style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          + Add Classification
        </button>
      </div>
    </div>
  );
}
