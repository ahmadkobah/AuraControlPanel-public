import React from 'react';

export default function DataTable({ columns, data, onEdit, onDelete, emptyMessage = 'No data' }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={styles.thRow}>
            {columns.map(col => (
              <th key={col.key} style={{ ...styles.th, ...(col.width ? { width: col.width } : {}) }}>
                {col.label}
              </th>
            ))}
            {(onEdit || onDelete) && <th style={styles.th}></th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row._id || idx} style={styles.tdRow}>
              {columns.map(col => (
                <td key={col.key} style={styles.td}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td style={{ ...styles.td, textAlign: 'right' }}>
                  {onEdit && (
                    <button onClick={() => onEdit(row)} style={styles.btnSmall}>Edit</button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(row)} style={{ ...styles.btnSmall, ...styles.btnDanger, marginLeft: 8 }}>
                      Delete
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} style={{ ...styles.td, textAlign: 'center', color: '#64748b' }}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  thRow: { background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' },
  th: { textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#475569', textTransform: 'uppercase', fontWeight: 600 },
  tdRow: { borderBottom: '1px solid #e2e8f0' },
  td: { padding: 8, fontSize: 14, color: '#0f172a' },
  btnSmall: { padding: '6px 10px', background: '#334155', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  btnDanger: { background: '#dc2626' }
};
