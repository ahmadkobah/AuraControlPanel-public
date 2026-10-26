import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Printers() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch('http://localhost:4000/admin/printers', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setItems(data.printers || []))
      .catch(console.error);
  }, []);

  return (
    <div>
      <h1>Printer Management</h1>
      <p>Configure network printers and auto-print rules</p>
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginTop: '20px' }}>
        <p>Total Printers: {items.length}</p>
        <button style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          + Add Printer
        </button>
      </div>
    </div>
  );
}
