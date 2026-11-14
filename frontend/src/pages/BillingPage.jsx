import React, { useState, useEffect } from 'react';
import { invoiceAPI, paymentAPI, patientAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import {
  CreditCard,
  Plus,
  Search,
  Eye,
  Trash2,
  DollarSign,
  Receipt,
  CheckCircle,
  Clock,
  Printer
} from 'lucide-react';
import '../styles/tables.css';
import '../styles/forms.css';

const BillingPage = () => {
  const { role } = useAuth();
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState(null);
  const [patientsList, setPatientsList] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Create Invoice Form State
  const initialInvoiceState = {
    patientId: '',
    items: [
      { description: 'Specialist Outpatient Consultation', quantity: 1, unitPrice: 100 }
    ],
    tax: 5, // 5% tax
    discount: 0,
    notes: ''
  };
  const [createForm, setCreateForm] = useState(initialInvoiceState);

  // Simulated Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'CARD_SIMULATED',
    transactionReference: '',
    notes: ''
  });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await invoiceAPI.getAll({
        paymentStatus: statusFilter,
        search,
        page,
        limit: 10
      });
      setInvoices(res.data);
      setPagination(res.pagination);
    } catch (err) {
      showToast('Error Loading Invoices', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await patientAPI.getAll({ limit: 100, isActive: 'true' });
      setPatientsList(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, statusFilter]);

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  // Add line item to invoice creator
  const handleAddItem = () => {
    setCreateForm({
      ...createForm,
      items: [...createForm.items, { description: '', quantity: 1, unitPrice: 0 }]
    });
  };

  const handleRemoveItem = (index) => {
    if (createForm.items.length <= 1) return;
    setCreateForm({
      ...createForm,
      items: createForm.items.filter((_, i) => i !== index)
    });
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...createForm.items];
    updated[index][field] = value;
    setCreateForm({ ...createForm, items: updated });
  };

  // Live client-side calculation preview (backend verifies and recalculates)
  const previewSubtotal = createForm.items.reduce(
    (acc, item) => acc + (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
    0
  );
  const previewTax = (previewSubtotal * (Number(createForm.tax) || 0)) / 100;
  const previewTotal = Math.max(0, previewSubtotal + previewTax - (Number(createForm.discount) || 0));

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.patientId) {
      showToast('Selection Required', 'Please choose a patient for this invoice', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await invoiceAPI.create(createForm);
      showToast('Invoice Created', 'Itemized billing invoice generated successfully', 'success');
      setShowCreateModal(false);
      setCreateForm(initialInvoiceState);
      fetchInvoices();
    } catch (err) {
      showToast('Invoice Creation Failed', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDetails = async (invoiceId) => {
    try {
      const res = await invoiceAPI.getById(invoiceId);
      setSelectedInvoiceData(res.data);
      setShowDetailsModal(true);
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleOpenPayment = (invoice) => {
    const remaining = Number((invoice.totalAmount - (invoice.paidAmount || 0)).toFixed(2));
    setSelectedInvoiceData({ invoice, payments: [] });
    setPaymentForm({
      amount: remaining,
      paymentMethod: 'CARD_SIMULATED',
      transactionReference: `TXN-SIM-${Date.now().toString().slice(-6)}`,
      notes: 'Simulated counter transaction'
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await paymentAPI.record({
        invoiceId: selectedInvoiceData.invoice._id,
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        transactionReference: paymentForm.transactionReference.trim(),
        notes: paymentForm.notes
      });
      showToast('Payment Processed', `Simulated payment of $${paymentForm.amount} reconciled`, 'success');
      setShowPaymentModal(false);
      fetchInvoices();
    } catch (err) {
      showToast('Payment Processing Error', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Hospital Billing & Payment Reconciliation
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Itemized invoicing, financial ledger tracking, and simulated payments with duplicate-prevention
          </p>
        </div>

        {(role === 'ADMIN' || role === 'FRONT_DESK') && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            <span>Generate New Invoice</span>
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="table-toolbar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <div className="input-addon-wrapper" style={{ flex: 1 }}>
            <Search size={16} className="input-addon-icon" />
            <input
              type="text"
              className="form-input input-with-icon"
              placeholder="Search by invoice number (e.g. INV-2026-00001)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>

        <div className="table-filters">
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Payment Statuses</option>
            <option value="PENDING">Pending Balance</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Fully Paid</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>Loading financial ledger records...</p>
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No billing records found"
            description="No invoices match the specified payment status or invoice filter."
            action={
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
                Generate Invoice
              </button>
            }
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Patient Details</th>
                <th>Issued Date</th>
                <th>Subtotal</th>
                <th>Total Due</th>
                <th>Paid Amount</th>
                <th>Payment Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const remaining = (inv.totalAmount - (inv.paidAmount || 0)).toFixed(2);
                return (
                  <tr key={inv._id}>
                    <td>
                      <code style={{ fontWeight: 700, color: 'var(--primary-700)', backgroundColor: 'var(--primary-50)', padding: '2px 6px', borderRadius: '4px' }}>
                        {inv.invoiceNumber}
                      </code>
                    </td>
                    <td>
                      <div className="table-user-name">{inv.patientId?.name}</div>
                      <div className="table-user-sub">{inv.patientId?.patientId}</div>
                    </td>
                    <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td>${inv.subtotal?.toFixed(2)}</td>
                    <td>
                      <strong style={{ fontSize: '0.95rem' }}>${inv.totalAmount?.toFixed(2)}</strong>
                    </td>
                    <td>
                      <span style={{ color: inv.paidAmount > 0 ? '#10b981' : 'var(--text-muted)', fontWeight: 600 }}>
                        ${(inv.paidAmount || 0).toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={inv.paymentStatus} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn-icon"
                          title="View Itemized Breakdown"
                          onClick={() => handleOpenDetails(inv._id)}
                        >
                          <Eye size={16} />
                        </button>

                        {inv.paymentStatus !== 'PAID' && (
                          <button
                            className="btn btn-teal btn-sm"
                            onClick={() => handleOpenPayment(inv)}
                          >
                            <DollarSign size={13} />
                            <span>Pay (${remaining})</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
      </div>

      {/* Generate Invoice Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Generate Itemized Patient Invoice"
        subtitle="Subtotal, tax, and discount will be dynamically verified and persisted by the backend"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)} disabled={submitting}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreateSubmit} disabled={submitting}>
              {submitting ? 'Generating...' : `Generate Invoice ($${previewTotal.toFixed(2)})`}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit}>
          <div className="form-group">
            <label className="form-label">Select Patient <span className="required">*</span></label>
            <select
              className="form-select"
              value={createForm.patientId}
              onChange={(e) => setCreateForm({ ...createForm, patientId: e.target.value })}
              required
            >
              <option value="">-- Choose Patient --</option>
              {patientsList.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.patientId}) - Phone: {p.phone}
                </option>
              ))}
            </select>
          </div>

          {/* Billing Items Line Items */}
          <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Itemized Billing Lines</label>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddItem}>
                <Plus size={14} /> Add Line Item
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {createForm.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '3fr 1fr 1fr 1fr 36px',
                    gap: '0.5rem',
                    alignItems: 'center'
                  }}
                >
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Description (e.g. ECG Procedure)"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input"
                    placeholder="Unit Price"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                    required
                  />
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', textAlign: 'right' }}>
                    ${((Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    className="btn-icon"
                    style={{ color: '#ef4444' }}
                    onClick={() => handleRemoveItem(idx)}
                    disabled={createForm.items.length <= 1}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tax & Discount Calculations */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Tax Rate (%)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                className="form-input"
                value={createForm.tax}
                onChange={(e) => setCreateForm({ ...createForm, tax: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Discount Amount ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                value={createForm.discount}
                onChange={(e) => setCreateForm({ ...createForm, discount: e.target.value })}
              />
            </div>
          </div>

          {/* Live Preview Summary Box */}
          <div style={{ backgroundColor: 'var(--bg-surface-alt)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
              <span>Subtotal:</span>
              <strong>${previewSubtotal.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
              <span>Tax ({createForm.tax}%):</span>
              <span>+${previewTax.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
              <span>Discount Applied:</span>
              <span style={{ color: '#10b981' }}>-${Number(createForm.discount || 0).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, borderTop: '1px dashed var(--border-medium)', paddingTop: '6px' }}>
              <span>Calculated Total:</span>
              <span style={{ color: 'var(--primary-600)' }}>${previewTotal.toFixed(2)}</span>
            </div>
          </div>
        </form>
      </Modal>

      {/* Invoice Receipt Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={`Invoice Breakdown: ${selectedInvoiceData?.invoice?.invoiceNumber}`}
        subtitle={`Patient: ${selectedInvoiceData?.invoice?.patientId?.name}`}
        size="md"
        footer={
          <button className="btn btn-secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </button>
        }
      >
        {selectedInvoiceData && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status</div>
                <StatusBadge status={selectedInvoiceData.invoice.paymentStatus} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Issue Date</div>
                <div style={{ fontWeight: 600 }}>{new Date(selectedInvoiceData.invoice.createdAt).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Line items table */}
            <table className="data-table" style={{ marginBottom: '1rem' }}>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoiceData.invoice.items?.map((it, i) => (
                  <tr key={i}>
                    <td>{it.description}</td>
                    <td>{it.quantity}</td>
                    <td>${it.unitPrice.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>${it.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ textAlign: 'right', lineHeight: 1.6, fontSize: '0.85rem' }}>
              <div>Subtotal: <strong>${selectedInvoiceData.invoice.subtotal.toFixed(2)}</strong></div>
              <div>Tax: <strong>${selectedInvoiceData.invoice.tax.toFixed(2)}</strong></div>
              <div>Discount: <strong style={{ color: '#10b981' }}>-${selectedInvoiceData.invoice.discount.toFixed(2)}</strong></div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-700)', marginTop: '4px' }}>
                Total: ${selectedInvoiceData.invoice.totalAmount.toFixed(2)}
              </div>
              <div>Total Paid to Date: <span style={{ color: '#10b981', fontWeight: 700 }}>${(selectedInvoiceData.invoice.paidAmount || 0).toFixed(2)}</span></div>
            </div>

            {/* Payment Transactions History */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              <h5 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>Payment Transactions Log</h5>
              {selectedInvoiceData.payments?.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No payments recorded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {selectedInvoiceData.payments?.map((pay) => (
                    <div key={pay._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.4rem 0.6rem', backgroundColor: 'var(--bg-surface-alt)', borderRadius: '4px' }}>
                      <span><strong>${pay.amount.toFixed(2)}</strong> via {pay.paymentMethod}</span>
                      <span style={{ color: 'var(--text-muted)' }}>Ref: {pay.transactionReference} • {new Date(pay.paidAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Record Simulated Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Simulated Payment"
        subtitle={`Invoice: ${selectedInvoiceData?.invoice?.invoiceNumber} • Remaining Due: $${selectedInvoiceData?.invoice ? (selectedInvoiceData.invoice.totalAmount - (selectedInvoiceData.invoice.paidAmount || 0)).toFixed(2) : 0}`}
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowPaymentModal(false)} disabled={submitting}>
              Cancel
            </button>
            <button className="btn btn-teal" onClick={handlePaymentSubmit} disabled={submitting}>
              {submitting ? 'Reconciling...' : 'Confirm Simulated Payment'}
            </button>
          </>
        }
      >
        <form onSubmit={handlePaymentSubmit}>
          <div className="form-group">
            <label className="form-label">Payment Amount ($) <span className="required">*</span></label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={selectedInvoiceData?.invoice ? selectedInvoiceData.invoice.totalAmount - (selectedInvoiceData.invoice.paidAmount || 0) : 10000}
              className="form-input"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Simulated Payment Channel <span className="required">*</span></label>
            <select
              className="form-select"
              value={paymentForm.paymentMethod}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
            >
              <option value="CARD_SIMULATED">Simulated POS Credit/Debit Card</option>
              <option value="UPI_SIMULATED">Simulated UPI Instant Transfer</option>
              <option value="CASH">Cash Counter Payment</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Idempotency Transaction Reference <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={paymentForm.transactionReference}
              onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
              required
            />
            <span className="form-hint">Guarantees idempotency and prevents double charging</span>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BillingPage;

