import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createApi } from '../lib/api';

// Document types list
const DOCUMENT_TYPES = [
  'invoice', 'receipt', 'purchase_order', 'credit_note', 'debit_note',
  'payment_voucher', 'bank_statement', 'financial_statement', 'tax_document',
  'contract', 'agreement', 'non_disclosure_agreement', 'memorandum_of_understanding',
  'certificate', 'license', 'permit', 'report', 'business_letter', 'letter',
  'memo', 'proposal', 'quotation', 'tender_document', 'form', 'delivery_note',
  'packing_slip', 'bill_of_lading', 'shipping_document', 'resume',
  'job_application', 'employment_contract', 'statement', 'other'
];

const OPERATORS = {
  entity: ['exists', 'not_exists', 'equals', 'contains', 'startsWith', 'endsWith', 'regex'],
  structuredData: ['exists', 'not_exists', 'equals', 'not_equals', 'greater_than', 'less_than', 'contains']
};

export default function AutoFilingRules() {
  const { token } = useAuth();
  const api = useMemo(() => createApi(token), [token]);

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [testData, setTestData] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [selectedTier, setSelectedTier] = useState('basic');
  const [tierInfo, setTierInfo] = useState({
    tier: 'basic',
    displayName: 'Basic',
    filingTypes: ['simple'],
    description: 'Simple path-based filing rules'
  });

  const emptyForm = {
    name: '',
    description: '',
    companyId: '',
    departmentId: '',
    isActive: true,
    priority: 100,
    conditions: {
      documentTypes: [],
      entityRules: [],
      structuredDataRules: [],
      confidence: { min: 0, max: 1 }
    },
    actions: {
      targetPath: '',
      filenameTemplate: '',
      createFolderStructure: true,
      fallbackPath: ''
    }
  };

  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/admin/auto-filing-rules');
      setRules(data.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingRule(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name || '',
      description: rule.description || '',
      companyId: rule.companyId?._id || rule.companyId || '',
      departmentId: rule.departmentId?._id || rule.departmentId || '',
      isActive: rule.isActive !== undefined ? rule.isActive : true,
      priority: rule.priority || 100,
      conditions: rule.conditions || emptyForm.conditions,
      actions: rule.actions || emptyForm.actions
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingRule) {
        await api.put(`/admin/auto-filing-rules/${editingRule._id}`, form);
        setSuccess('Rule updated successfully');
      } else {
        await api.post('/admin/auto-filing-rules', form);
        setSuccess('Rule created successfully');
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setError(e.message || 'Failed to save rule');
    }
  };

  const handleDelete = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await api.delete(`/admin/auto-filing-rules/${ruleId}`);
      setSuccess('Rule deleted successfully');
      load();
    } catch (e) {
      setError(e.message || 'Failed to delete rule');
    }
  };

  const handleToggle = async (ruleId) => {
    try {
      await api.post(`/admin/auto-filing-rules/${ruleId}/toggle`, {});
      load();
    } catch (e) {
      setError(e.message || 'Failed to toggle rule');
    }
  };

  const handleDuplicate = async (ruleId) => {
    try {
      await api.post(`/admin/auto-filing-rules/${ruleId}/duplicate`, {});
      setSuccess('Rule duplicated successfully');
      load();
    } catch (e) {
      setError(e.message || 'Failed to duplicate rule');
    }
  };

  const openTest = (rule) => {
    setEditingRule(rule);
    setTestModalOpen(true);
    setTestResult(null);
    setTestData(JSON.stringify({
      classification: { document_type: 'invoice', confidence: 0.95 },
      entities: { vendor_name: 'Acme Corp', invoice_number: 'INV-2024-001' },
      structuredData: { invoice_date: '2024-01-15', total_amount: 1500.00, vendor_name: 'Acme Corp', invoice_number: 'INV-2024-001' }
    }, null, 2));
  };

  const executeTest = async () => {
    try {
      const documentData = JSON.parse(testData);
      const result = await api.post(`/admin/auto-filing-rules/${editingRule._id}/test`, { documentData });
      setTestResult(result);
    } catch (e) {
      setError(e.message || 'Test failed');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', color: '#1e293b' }}>Auto-Filing Rules</h1>
          <p style={{ margin: 0, color: '#64748b' }}>Configure intelligent document filing based on AI classification</p>
        </div>
        <button onClick={openCreate} style={btnPrimary}>+ Create Rule</button>
      </div>

      {error && <div style={{ ...alert, ...alertError }}>{error} <button onClick={() => setError(null)} style={alertClose}>×</button></div>}
      {success && <div style={{ ...alert, ...alertSuccess }}>{success} <button onClick={() => setSuccess(null)} style={alertClose}>×</button></div>}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading rules...</div>
      ) : rules.length === 0 ? (
        <div style={section}>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>No filing rules yet</h3>
            <p style={{ margin: '0 0 16px 0', color: '#64748b' }}>Create your first rule to automatically organize documents</p>
            <button onClick={openCreate} style={btnPrimary}>Create First Rule</button>
          </div>
        </div>
      ) : (
        <div style={section}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Priority</th>
                <th style={th}>Name</th>
                <th style={th}>Document Types</th>
                <th style={th}>Target Path</th>
                <th style={th}>Status</th>
                <th style={th}>Success Rate</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule._id} style={tr}>
                  <td style={td}>
                    <span style={{ ...badge, background: '#667eea', color: 'white', fontWeight: '600' }}>{rule.priority}</span>
                  </td>
                  <td style={td}>
                    <div><strong>{rule.name}</strong></div>
                    {rule.description && <div style={{ fontSize: '12px', color: '#64748b' }}>{rule.description}</div>}
                  </td>
                  <td style={td}>
                    {rule.conditions?.documentTypes?.length > 0 ? (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {rule.conditions.documentTypes.slice(0, 3).map((type) => (
                          <span key={type} style={{ ...badge, background: '#e0e7ff', color: '#4338ca' }}>{type}</span>
                        ))}
                        {rule.conditions.documentTypes.length > 3 && (
                          <span style={{ ...badge, background: '#f3f4f6' }}>+{rule.conditions.documentTypes.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>All types</span>
                    )}
                  </td>
                  <td style={td}>
                    <code style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '3px' }}>
                      {rule.actions?.targetPath || '-'}
                    </code>
                  </td>
                  <td style={td}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={rule.isActive}
                        onChange={() => handleToggle(rule._id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '13px' }}>{rule.isActive ? '✅ Active' : '⏸️ Inactive'}</span>
                    </label>
                  </td>
                  <td style={td}>
                    {rule.stats?.timesApplied > 0 ? (
                      <span style={{ ...badge, background: rule.successRate >= 80 ? '#dcfce7' : '#fef3c7', color: rule.successRate >= 80 ? '#166534' : '#92400e' }}>
                        {Math.round(rule.successRate || 0)}% ({rule.stats.successCount}/{rule.stats.timesApplied})
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>No data</span>
                    )}
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => openTest(rule)} style={btnSmall} title="Test Rule">▶️</button>
                      <button onClick={() => openEdit(rule)} style={btnSmall} title="Edit">✏️</button>
                      <button onClick={() => handleDuplicate(rule._id)} style={btnSmall} title="Duplicate">📋</button>
                      <button onClick={() => handleDelete(rule._id)} style={{ ...btnSmall, color: '#dc2626' }} title="Delete">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div style={modalOverlay} onClick={() => setModalOpen(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '24px' }}>{editingRule ? 'Edit Rule' : 'Create New Rule'}</h2>
            
            <div style={{ maxHeight: '60vh', overflowY: 'auto', marginBottom: '16px' }}>
              <div style={formGroup}>
                <label style={label}>Rule Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={input}
                  placeholder="e.g., Invoices - Annual Organization"
                />
              </div>

              <div style={formGroup}>
                <label style={label}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ ...input, minHeight: '60px' }}
                  placeholder="What does this rule do?"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={formGroup}>
                  <label style={label}>Priority (1-1000)</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })}
                    style={input}
                    min="1"
                    max="1000"
                  />
                </div>

                <div style={formGroup}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '24px' }}>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Active</span>
                  </label>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '20px 0' }} />
              <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>Conditions</h3>

              <div style={formGroup}>
                <label style={label}>Document Types (leave empty for all)</label>
                <select
                  multiple
                  value={form.conditions.documentTypes}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setForm({ ...form, conditions: { ...form.conditions, documentTypes: selected } });
                  }}
                  style={{ ...input, minHeight: '100px' }}
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <small style={{ color: '#64748b', fontSize: '12px' }}>Hold Ctrl/Cmd to select multiple</small>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '20px 0' }} />
              <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>Actions</h3>

              <div style={formGroup}>
                <label style={label}>Target Path Template *</label>
                <input
                  type="text"
                  value={form.actions.targetPath}
                  onChange={(e) => setForm({ ...form, actions: { ...form.actions, targetPath: e.target.value } })}
                  style={input}
                  placeholder="/Finance/Invoices/{year}/{month}/{vendor_name}"
                />
                <small style={{ color: '#64748b', fontSize: '12px' }}>Use {`{variables}`} like {`{year}`}, {`{month}`}, or field names</small>
              </div>

              <div style={formGroup}>
                <label style={label}>Filename Template (optional)</label>
                <input
                  type="text"
                  value={form.actions.filenameTemplate}
                  onChange={(e) => setForm({ ...form, actions: { ...form.actions, filenameTemplate: e.target.value } })}
                  style={input}
                  placeholder="{invoice_number}_{vendor_name}_{date}"
                />
              </div>

              <div style={formGroup}>
                <label style={label}>Fallback Path</label>
                <input
                  type="text"
                  value={form.actions.fallbackPath}
                  onChange={(e) => setForm({ ...form, actions: { ...form.actions, fallbackPath: e.target.value } })}
                  style={input}
                  placeholder="/Finance/Invoices/Uncategorized"
                />
                <small style={{ color: '#64748b', fontSize: '12px' }}>Used when variables can't be resolved</small>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalOpen(false)} style={btnGhost}>Cancel</button>
              <button
                onClick={handleSave}
                style={btnPrimary}
                disabled={!form.name || !form.actions.targetPath}
              >
                {editingRule ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {testModalOpen && (
        <div style={modalOverlay} onClick={() => setTestModalOpen(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '24px' }}>Test Rule: {editingRule?.name}</h2>
            
            <div style={formGroup}>
              <label style={label}>Sample Document Data (JSON)</label>
              <textarea
                value={testData}
                onChange={(e) => setTestData(e.target.value)}
                style={{ ...input, minHeight: '300px', fontFamily: 'monospace', fontSize: '12px' }}
              />
            </div>

            {testResult && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ ...alert, ...(testResult.matches ? alertSuccess : { background: '#fef3c7', color: '#92400e' }) }}>
                  {testResult.message}
                </div>
                {testResult.matches && (
                  <div style={{ marginTop: '12px' }}>
                    <div><strong>Target Path:</strong></div>
                    <code style={{ display: 'block', background: '#f1f5f9', padding: '8px', borderRadius: '4px', marginTop: '4px' }}>
                      {testResult.targetPath}
                    </code>
                    {testResult.filename && (
                      <>
                        <div style={{ marginTop: '8px' }}><strong>Filename:</strong></div>
                        <code style={{ display: 'block', background: '#f1f5f9', padding: '8px', borderRadius: '4px', marginTop: '4px' }}>
                          {testResult.filename}
                        </code>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setTestModalOpen(false)} style={btnGhost}>Close</button>
              <button onClick={executeTest} style={btnPrimary}>▶️ Run Test</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const section = {
  background: 'white',
  borderRadius: '8px',
  padding: '24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  marginBottom: '24px'
};

const table = {
  width: '100%',
  borderCollapse: 'collapse'
};

const th = {
  textAlign: 'left',
  padding: '12px',
  borderBottom: '2px solid #e2e8f0',
  color: '#64748b',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase'
};

const tr = {
  borderBottom: '1px solid #f1f5f9'
};

const td = {
  padding: '12px',
  fontSize: '14px'
};

const badge = {
  display: 'inline-block',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: '500'
};

const btnPrimary = {
  padding: '10px 20px',
  background: '#667eea',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '600',
  transition: 'all 0.2s'
};

const btnGhost = {
  padding: '10px 20px',
  background: 'transparent',
  color: '#64748b',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500'
};

const btnSmall = {
  padding: '4px 8px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: '16px'
};

const alert = {
  padding: '12px 16px',
  borderRadius: '6px',
  marginBottom: '16px',
  position: 'relative'
};

const alertError = {
  background: '#fee2e2',
  color: '#991b1b'
};

const alertSuccess = {
  background: '#dcfce7',
  color: '#166534'
};

const alertClose = {
  position: 'absolute',
  right: '8px',
  top: '8px',
  background: 'transparent',
  border: 'none',
  fontSize: '20px',
  cursor: 'pointer',
  opacity: 0.7
};

const modalOverlay = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modal = {
  background: 'white',
  borderRadius: '12px',
  padding: '24px',
  maxWidth: '700px',
  width: '90%',
  maxHeight: '90vh',
  overflowY: 'auto'
};

const formGroup = {
  marginBottom: '16px'
};

const label = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '14px',
  fontWeight: '500',
  color: '#1e293b'
};

const input = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  fontSize: '14px',
  boxSizing: 'border-box'
};
