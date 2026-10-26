import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createApi } from '../lib/api';

export default function Billing() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [stats, setStats] = useState(null);

  const [invoiceForm, setInvoiceForm] = useState({
    companyId: '',
    description: '',
    amount: '',
    dueDate: '',
    currency: 'USD',
    notes: '',
    items: [],
    billingAddress: '',
    purchaseOrder: '',
    paymentTerms: 'net_30'
  });

  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    amount: '',
    method: 'credit_card',
    transactionId: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const api = createApi(token);
      const [companiesRes, invoicesRes, statsRes] = await Promise.all([
        api.get('/admin/billing/companies'),
        api.get('/admin/billing/invoices'),
        api.get('/admin/billing/stats')
      ]);
      
      setCompanies(companiesRes.companies || []);
      setInvoices(invoicesRes.invoices || []);
      setStats(statsRes.stats || {});
    } catch (err) {
      console.error('Failed to load billing data:', err);
      alert('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const createInvoice = async () => {
    try {
      if (!invoiceForm.companyId || !invoiceForm.amount || !invoiceForm.dueDate) {
        return alert('Company, amount, and due date are required');
      }

      const api = createApi(token);
      await api.post('/admin/billing/invoices', invoiceForm);
      alert('Invoice created successfully');
      setShowInvoiceForm(false);
      setInvoiceForm({ companyId: '', description: '', amount: '', dueDate: '', items: [] });
      loadData();
    } catch (err) {
      console.error('Failed to create invoice:', err);
      alert('Failed to create invoice: ' + err.message);
    }
  };

  const recordPayment = async () => {
    try {
      if (!paymentForm.invoiceId || !paymentForm.amount || !paymentForm.method) {
        return alert('Invoice, amount, and payment method are required');
      }

      const api = createApi(token);
      await api.post('/admin/billing/payments', paymentForm);
      alert('Payment recorded successfully');
      setShowPaymentForm(false);
      setSelectedInvoice(null);
      setPaymentForm({ invoiceId: '', amount: '', method: 'credit_card', transactionId: '', notes: '' });
      loadData();
    } catch (err) {
      console.error('Failed to record payment:', err);
      alert('Failed to record payment: ' + err.message);
    }
  };

  const sendInvoice = async (invoiceId) => {
    try {
      const api = createApi(token);
      await api.post(`/admin/billing/invoices/${invoiceId}/send`);
      alert('Invoice sent successfully');
      loadData();
    } catch (err) {
      console.error('Failed to send invoice:', err);
      alert('Failed to send invoice: ' + err.message);
    }
  };

  const markAsPaid = async (invoiceId) => {
    try {
      const api = createApi(token);
      await api.post(`/admin/billing/invoices/${invoiceId}/mark-paid`);
      alert('Invoice marked as paid');
      loadData();
    } catch (err) {
      console.error('Failed to mark as paid:', err);
      alert('Failed to mark as paid: ' + err.message);
    }
  };

  const editInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceForm({
      companyId: invoice.companyId?._id || '',
      description: invoice.description || '',
      amount: invoice.amount || '',
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
      currency: invoice.currency || 'USD',
      notes: invoice.notes || '',
      items: invoice.items || [],
      billingAddress: invoice.billingAddress || '',
      purchaseOrder: invoice.purchaseOrder || '',
      paymentTerms: invoice.paymentTerms || 'net_30'
    });
    setEditMode(true);
    setShowInvoiceForm(true);
  };

  const updateInvoice = async () => {
    try {
      if (!invoiceForm.companyId || !invoiceForm.amount || !invoiceForm.dueDate) {
        return alert('Company, amount, and due date are required');
      }

      const api = createApi(token);
      await api.put(`/admin/billing/invoices/${selectedInvoice._id}`, invoiceForm);
      alert('Invoice updated successfully');
      setShowInvoiceForm(false);
      setEditMode(false);
      setSelectedInvoice(null);
      setInvoiceForm({ companyId: '', description: '', amount: '', dueDate: '', currency: 'USD', notes: '', items: [], billingAddress: '', purchaseOrder: '', paymentTerms: 'net_30' });
      loadData();
    } catch (err) {
      console.error('Failed to update invoice:', err);
      alert('Failed to update invoice: ' + err.message);
    }
  };

  const duplicateInvoice = (invoice) => {
    setInvoiceForm({
      companyId: invoice.companyId?._id || '',
      description: invoice.description || '',
      amount: invoice.amount || '',
      dueDate: '',
      currency: invoice.currency || 'USD',
      notes: invoice.notes || '',
      items: invoice.items || [],
      billingAddress: invoice.billingAddress || '',
      purchaseOrder: '',
      paymentTerms: invoice.paymentTerms || 'net_30'
    });
    setEditMode(false);
    setShowInvoiceForm(true);
  };

  const cancelInvoice = async () => {
    try {
      if (!cancelReason.trim()) {
        return alert('Please provide a cancellation reason');
      }

      const api = createApi(token);
      await api.post(`/admin/billing/invoices/${selectedInvoice._id}/cancel`, { reason: cancelReason });
      alert('Invoice cancelled successfully');
      setShowCancelModal(false);
      setSelectedInvoice(null);
      setCancelReason('');
      loadData();
    } catch (err) {
      console.error('Failed to cancel invoice:', err);
      alert('Failed to cancel invoice: ' + err.message);
    }
  };

  const deleteInvoice = async (invoiceId) => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      const api = createApi(token);
      await api.del(`/admin/billing/invoices/${invoiceId}`);
      alert('Invoice deleted successfully');
      loadData();
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      alert('Failed to delete invoice: ' + err.message);
    }
  };

  const downloadInvoice = async (invoiceId) => {
    try {
      alert('PDF download functionality coming soon!');
      // TODO: Implement PDF generation
    } catch (err) {
      console.error('Failed to download invoice:', err);
    }
  };

  const sendReminder = async (invoiceId) => {
    try {
      const api = createApi(token);
      await api.post(`/admin/billing/invoices/${invoiceId}/remind`);
      alert('Payment reminder sent successfully');
      loadData();
    } catch (err) {
      console.error('Failed to send reminder:', err);
      alert('Failed to send reminder: ' + err.message);
    }
  };

  const openPaymentForm = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      invoiceId: invoice._id,
      amount: invoice.amountDue || invoice.amount,
      method: 'credit_card',
      transactionId: '',
      notes: ''
    });
    setShowPaymentForm(true);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <div style={{ fontSize: '18px', color: '#64748b' }}>Loading billing data...</div>
      </div>
    );
  }

  const filteredInvoices = selectedCompany
    ? invoices.filter(inv => inv.companyId?._id === selectedCompany)
    : invoices;

  return (
    <div>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>💳 Billing & Payments</h1>
          <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
            Manage invoices, payments, and company billing
          </p>
        </div>
        
        <button
          onClick={() => setShowInvoiceForm(true)}
          style={{
            padding: '12px 24px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          + Create Invoice
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
          <StatCard title="Total Revenue" value={`$${stats.totalRevenue?.toLocaleString() || 0}`} icon="💰" color="#10b981" />
          <StatCard title="Outstanding" value={`$${stats.totalOutstanding?.toLocaleString() || 0}`} icon="⏳" color="#f59e0b" />
          <StatCard title="Overdue" value={`$${stats.totalOverdue?.toLocaleString() || 0}`} icon="⚠️" color="#ef4444" />
          <StatCard title="This Month" value={`$${stats.thisMonth?.toLocaleString() || 0}`} icon="📅" color="#3b82f6" />
        </div>
      )}

      {/* Company Filter */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <label style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Filter by Company:</label>
        <select
          value={selectedCompany || ''}
          onChange={(e) => setSelectedCompany(e.target.value || null)}
          style={{
            padding: '8px 16px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '14px',
            minWidth: '200px'
          }}
        >
          <option value="">All Companies</option>
          {companies.map(c => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Invoices Table */}
      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={tableHeaderStyle}>Invoice #</th>
              <th style={tableHeaderStyle}>Company</th>
              <th style={tableHeaderStyle}>Description</th>
              <th style={tableHeaderStyle}>Amount</th>
              <th style={tableHeaderStyle}>Due Date</th>
              <th style={tableHeaderStyle}>Status</th>
              <th style={tableHeaderStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                  No invoices found
                </td>
              </tr>
            ) : (
              filteredInvoices.map(invoice => (
                <tr key={invoice._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tableCellStyle}>
                    <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                      {invoice.invoiceNumber}
                    </span>
                  </td>
                  <td style={tableCellStyle}>{invoice.companyId?.name || 'N/A'}</td>
                  <td style={tableCellStyle}>{invoice.description || '-'}</td>
                  <td style={tableCellStyle}>
                    <span style={{ fontWeight: '600' }}>${invoice.amount?.toFixed(2)}</span>
                  </td>
                  <td style={tableCellStyle}>
                    {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}
                  </td>
                  <td style={tableCellStyle}>
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td style={tableCellStyle}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {/* Primary Actions */}
                      {invoice.status === 'pending' && (
                        <>
                          <button
                            onClick={() => sendInvoice(invoice._id)}
                            style={actionButtonStyle('#3b82f6')}
                            title="Send invoice to company"
                          >
                            📧 Send
                          </button>
                          <button
                            onClick={() => editInvoice(invoice)}
                            style={actionButtonStyle('#8b5cf6')}
                            title="Edit invoice"
                          >
                            ✏️ Edit
                          </button>
                        </>
                      )}
                      
                      {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                        <>
                          <button
                            onClick={() => openPaymentForm(invoice)}
                            style={actionButtonStyle('#10b981')}
                            title="Record payment"
                          >
                            💵 Pay
                          </button>
                          <button
                            onClick={() => sendReminder(invoice._id)}
                            style={actionButtonStyle('#f59e0b')}
                            title="Send payment reminder"
                          >
                            🔔 Remind
                          </button>
                        </>
                      )}

                      {invoice.status === 'partial' && (
                        <>
                          <button
                            onClick={() => openPaymentForm(invoice)}
                            style={actionButtonStyle('#10b981')}
                            title="Record additional payment"
                          >
                            💵 Pay Balance
                          </button>
                          <button
                            onClick={() => sendReminder(invoice._id)}
                            style={actionButtonStyle('#f59e0b')}
                            title="Send payment reminder"
                          >
                            🔔 Remind
                          </button>
                        </>
                      )}

                      {invoice.status === 'paid' && (
                        <button
                          onClick={() => downloadInvoice(invoice._id)}
                          style={actionButtonStyle('#06b6d4')}
                          title="Download PDF"
                        >
                          📄 PDF
                        </button>
                      )}

                      {/* Secondary Actions */}
                      {(invoice.status === 'pending' || invoice.status === 'sent') && (
                        <button
                          onClick={() => markAsPaid(invoice._id)}
                          style={actionButtonStyle('#10b981')}
                          title="Mark as paid"
                        >
                          ✓ Paid
                        </button>
                      )}

                      <button
                        onClick={() => duplicateInvoice(invoice)}
                        style={actionButtonStyle('#64748b')}
                        title="Duplicate invoice"
                      >
                        📋 Copy
                      </button>

                      {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowCancelModal(true);
                          }}
                          style={actionButtonStyle('#dc2626')}
                          title="Cancel invoice"
                        >
                          ✕ Cancel
                        </button>
                      )}

                      {invoice.status === 'cancelled' && (
                        <button
                          onClick={() => deleteInvoice(invoice._id)}
                          style={actionButtonStyle('#991b1b')}
                          title="Delete invoice permanently"
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Invoice Modal */}
      {showInvoiceForm && (
        <Modal onClose={() => {
          setShowInvoiceForm(false);
          setEditMode(false);
          setSelectedInvoice(null);
          setInvoiceForm({ companyId: '', description: '', amount: '', dueDate: '', currency: 'USD', notes: '', items: [], billingAddress: '', purchaseOrder: '', paymentTerms: 'net_30' });
        }} title={editMode ? 'Edit Invoice' : 'Create New Invoice'} wide>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Company and Basic Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Company *</label>
                <select
                  value={invoiceForm.companyId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, companyId: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Select Company</option>
                  {companies.map(c => (
                    <option key={c._id} value={c._id}>{c.name} ({c.tier || 'No tier'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Payment Terms *</label>
                <select
                  value={invoiceForm.paymentTerms}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentTerms: e.target.value })}
                  style={inputStyle}
                >
                  <option value="due_on_receipt">Due on Receipt</option>
                  <option value="net_15">Net 15 Days</option>
                  <option value="net_30">Net 30 Days</option>
                  <option value="net_45">Net 45 Days</option>
                  <option value="net_60">Net 60 Days</option>
                  <option value="net_90">Net 90 Days</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Description</label>
                <input
                  type="text"
                  value={invoiceForm.description}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g., Monthly SaaS Subscription - December 2025"
                />
              </div>

              <div>
                <label style={labelStyle}>Currency</label>
                <select
                  value={invoiceForm.currency}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, currency: e.target.value })}
                  style={inputStyle}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Purchase Order Number</label>
              <input
                type="text"
                value={invoiceForm.purchaseOrder}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, purchaseOrder: e.target.value })}
                style={inputStyle}
                placeholder="Optional PO reference"
              />
            </div>

            <div>
              <label style={labelStyle}>Billing Address</label>
              <textarea
                value={invoiceForm.billingAddress}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, billingAddress: e.target.value })}
                style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                placeholder="Company billing address (optional)"
              />
            </div>

            {/* Line Items */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Line Items *</label>
                <button
                  onClick={() => {
                    const newItems = [...invoiceForm.items, { description: '', quantity: 1, unitPrice: '', total: 0 }];
                    setInvoiceForm({ ...invoiceForm, items: newItems });
                  }}
                  style={{
                    padding: '6px 12px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  + Add Item
                </button>
              </div>

              {invoiceForm.items.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '6px', fontSize: '14px' }}>
                  No line items added. Click "+ Add Item" to add services or products.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {invoiceForm.items.map((item, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '12px' }}>Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...invoiceForm.items];
                            newItems[index].description = e.target.value;
                            setInvoiceForm({ ...invoiceForm, items: newItems });
                          }}
                          style={{ ...inputStyle, fontSize: '13px' }}
                          placeholder="Service or product"
                        />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '12px' }}>Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...invoiceForm.items];
                            newItems[index].quantity = parseInt(e.target.value) || 1;
                            newItems[index].total = newItems[index].quantity * (parseFloat(newItems[index].unitPrice) || 0);
                            const totalAmount = newItems.reduce((sum, it) => sum + it.total, 0);
                            setInvoiceForm({ ...invoiceForm, items: newItems, amount: totalAmount.toFixed(2) });
                          }}
                          style={{ ...inputStyle, fontSize: '13px' }}
                        />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '12px' }}>Unit Price</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const newItems = [...invoiceForm.items];
                            newItems[index].unitPrice = e.target.value;
                            newItems[index].total = (parseFloat(newItems[index].quantity) || 0) * (parseFloat(e.target.value) || 0);
                            const totalAmount = newItems.reduce((sum, it) => sum + it.total, 0);
                            setInvoiceForm({ ...invoiceForm, items: newItems, amount: totalAmount.toFixed(2) });
                          }}
                          style={{ ...inputStyle, fontSize: '13px' }}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '12px' }}>Total</label>
                        <div style={{ ...inputStyle, background: '#f8fafc', fontWeight: '600', fontSize: '13px' }}>
                          ${item.total.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <button
                          onClick={() => {
                            const newItems = invoiceForm.items.filter((_, i) => i !== index);
                            const totalAmount = newItems.reduce((sum, it) => sum + it.total, 0);
                            setInvoiceForm({ ...invoiceForm, items: newItems, amount: totalAmount.toFixed(2) });
                          }}
                          style={{
                            padding: '10px 12px',
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total Amount */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#64748b' }}>Total Amount:</span>
                <span style={{ fontSize: '24px', fontWeight: '700', color: '#667eea' }}>
                  {invoiceForm.currency === 'EUR' ? '€' : invoiceForm.currency === 'GBP' ? '£' : '$'}
                  {parseFloat(invoiceForm.amount || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Due Date *</label>
                <input
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Manual Total Override</label>
                <input
                  type="number"
                  step="0.01"
                  value={invoiceForm.amount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                  style={inputStyle}
                  placeholder="Auto-calculated from items"
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Additional Notes</label>
              <textarea
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                placeholder="Payment instructions, special terms, or other notes..."
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={editMode ? updateInvoice : createInvoice}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '15px'
                }}
              >
                {editMode ? 'Update Invoice' : 'Create Invoice'}
              </button>
              <button
                onClick={() => {
                  setShowInvoiceForm(false);
                  setEditMode(false);
                  setSelectedInvoice(null);
                  setInvoiceForm({ companyId: '', description: '', amount: '', dueDate: '', currency: 'USD', notes: '', items: [], billingAddress: '', purchaseOrder: '', paymentTerms: 'net_30' });
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#e2e8f0',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '15px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Payment Modal */}
      {showPaymentForm && selectedInvoice && (
        <Modal onClose={() => { setShowPaymentForm(false); setSelectedInvoice(null); }} title="Record Payment">
          <div style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Invoice: {selectedInvoice.invoiceNumber}</div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>Company: {selectedInvoice.companyId?.name}</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginTop: '8px' }}>
              Amount Due: ${selectedInvoice.amountDue?.toFixed(2) || selectedInvoice.amount?.toFixed(2)}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Payment Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                style={inputStyle}
                placeholder="0.00"
              />
            </div>

            <div>
              <label style={labelStyle}>Payment Method *</label>
              <select
                value={paymentForm.method}
                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                style={inputStyle}
              >
                <option value="credit_card">Credit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="paypal">PayPal</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Transaction ID</label>
              <input
                type="text"
                value={paymentForm.transactionId}
                onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                style={inputStyle}
                placeholder="Optional reference number"
              />
            </div>

            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                placeholder="Payment notes..."
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={recordPayment}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Record Payment
              </button>
              <button
                onClick={() => { setShowPaymentForm(false); setSelectedInvoice(null); }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#e2e8f0',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Invoice Modal */}
      {showCancelModal && selectedInvoice && (
        <Modal onClose={() => { setShowCancelModal(false); setSelectedInvoice(null); setCancelReason(''); }} title="Cancel Invoice">
          <div style={{ marginBottom: '16px', padding: '12px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fbbf24' }}>
            <div style={{ fontSize: '14px', color: '#92400e', marginBottom: '4px' }}>⚠️ Warning</div>
            <div style={{ fontSize: '13px', color: '#78350f' }}>
              This will cancel invoice {selectedInvoice.invoiceNumber} for {selectedInvoice.companyId?.name}.
              This action cannot be undone.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Cancellation Reason *</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                placeholder="Please provide a reason for cancelling this invoice..."
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={cancelInvoice}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel Invoice
              </button>
              <button
                onClick={() => { setShowCancelModal(false); setSelectedInvoice(null); setCancelReason(''); }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#e2e8f0',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Keep Invoice
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Helper Components
function StatCard({ title, value, icon, color }) {
  return (
    <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>{title}</div>
        <div style={{ fontSize: '24px' }}>{icon}</div>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: color }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: { background: '#fef3c7', color: '#92400e', text: 'Pending' },
    sent: { background: '#dbeafe', color: '#1e40af', text: 'Sent' },
    paid: { background: '#d1fae5', color: '#065f46', text: 'Paid' },
    partial: { background: '#e0e7ff', color: '#3730a3', text: 'Partial' },
    overdue: { background: '#fee2e2', color: '#991b1b', text: 'Overdue' },
    cancelled: { background: '#f1f5f9', color: '#475569', text: 'Cancelled' }
  };

  const style = styles[status] || styles.pending;

  return (
    <span style={{
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      background: style.background,
      color: style.color
    }}>
      {style.text}
    </span>
  );
}

function Modal({ onClose, title, children, wide = false }) {
  return (
    <div style={{
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
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '32px',
        maxWidth: wide ? '900px' : '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#94a3b8'
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Styles
const tableHeaderStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: '600',
  color: '#64748b',
  textTransform: 'uppercase'
};

const tableCellStyle = {
  padding: '16px',
  fontSize: '14px',
  color: '#1e293b'
};

const labelStyle = {
  display: 'block',
  fontSize: '14px',
  fontWeight: '500',
  color: '#475569',
  marginBottom: '6px'
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  fontSize: '14px',
  boxSizing: 'border-box'
};

const actionButtonStyle = (color) => ({
  padding: '6px 12px',
  background: color,
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: '500',
  whiteSpace: 'nowrap'
});
