import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import {
  CreditCard, Search, Filter, DollarSign, CheckCircle, Clock,
  XCircle, RefreshCw, Eye, X, AlertCircle, Loader, Receipt,
  TrendingUp, Download, Ban, RotateCcw, Calendar, User,
  Stethoscope, DownloadCloud,
} from 'lucide-react';
import './PaymentManagement.css';

const PaymentManagement = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [payments, setPayments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [refundModal, setRefundModal] = useState(null);
  const [refundReason, setRefundReason] = useState('');

  // ============================================
  // FETCH
  // ============================================
  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/payments/');
      const list = res.data.results || res.data.data || res.data || [];
      setPayments(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load payments:', err);
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FILTER
  // ============================================
  useEffect(() => {
    let list = [...payments];

    if (activeFilter !== 'all') {
      list = list.filter((p) => p.payment_status?.toLowerCase() === activeFilter);
    }

    if (dateFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      list = list.filter((p) => {
        const d = new Date(p.created_at);
        if (dateFilter === 'today') return d.toDateString() === today.toDateString();
        if (dateFilter === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          return d >= weekAgo;
        }
        if (dateFilter === 'month') {
          return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        }
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => {
        const doctor = `${p.appointment?.doctor?.user?.first_name || ''} ${p.appointment?.doctor?.user?.last_name || ''}`.toLowerCase();
        const patient = `${p.appointment?.patient?.user?.first_name || ''} ${p.appointment?.patient?.user?.last_name || ''}`.toLowerCase();
        return (
          p.transaction_reference?.toLowerCase().includes(q) ||
          doctor.includes(q) ||
          patient.includes(q) ||
          p.payment_method?.toLowerCase().includes(q)
        );
      });
    }

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setFiltered(list);
  }, [payments, activeFilter, searchQuery, dateFilter]);

  // ============================================
  // STATS
  // ============================================
  const stats = useMemo(() => {
    const paid = payments.filter((p) => p.payment_status === 'paid');
    const pending = payments.filter((p) => p.payment_status === 'pending');
    const failed = payments.filter((p) => p.payment_status === 'failed');
    const refunded = payments.filter((p) => p.payment_status === 'refunded');
    const total = paid.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const refundedTotal = refunded.reduce((s, p) => s + parseFloat(p.amount || 0), 0);

    return {
      total,
      refundedTotal,
      totalCount: payments.length,
      paidCount: paid.length,
      pendingCount: pending.length,
      failedCount: failed.length,
      refundedCount: refunded.length,
    };
  }, [payments]);

  // ============================================
  // ACTIONS
  // ============================================
  const markAsPaid = async (payment) => {
    setProcessing(payment.id);
    try {
      await api.post(`/payments/${payment.id}/verify/`);
      setPayments((prev) =>
        prev.map((p) =>
          p.id === payment.id
            ? { ...p, payment_status: 'paid', is_paid: true, paid_at: new Date().toISOString() }
            : p
        )
      );
      setSuccess('Payment marked as paid');
      setSelected(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update payment');
    } finally {
      setProcessing(null);
    }
  };

  const handleRefund = async () => {
    if (!refundModal) return;
    setProcessing(refundModal.id);
    try {
      // Assuming a refund endpoint or using generic patch
      await api.patch(`/payments/${refundModal.id}/`, {
        payment_status: 'refunded',
      });
      setPayments((prev) =>
        prev.map((p) =>
          p.id === refundModal.id
            ? { ...p, payment_status: 'refunded', is_paid: false }
            : p
        )
      );
      setSuccess('Payment refunded');
      setRefundModal(null);
      setRefundReason('');
      setSelected(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to refund payment');
    } finally {
      setProcessing(null);
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const formatDateTime = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatCurrency = (amount, currency = 'NGN') => {
    const symbols = { NGN: '₦', USD: '$', EUR: '€', GBP: '£' };
    const symbol = symbols[currency] || currency + ' ';
    return `${symbol}${parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusConfig = (status) => {
    const config = {
      pending: { bg: '#fef3c7', color: '#b45309', label: 'Pending', icon: Clock },
      processing: { bg: '#dbeafe', color: '#1d4ed8', label: 'Processing', icon: RefreshCw },
      paid: { bg: '#d1fae5', color: '#059669', label: 'Paid', icon: CheckCircle },
      failed: { bg: '#fee2e2', color: '#dc2626', label: 'Failed', icon: XCircle },
      refunded: { bg: '#ede9fe', color: '#7c3aed', label: 'Refunded', icon: RotateCcw },
      cancelled: { bg: '#f1f5f9', color: '#475569', label: 'Cancelled', icon: Ban },
    };
    return config[status?.toLowerCase()] || config.pending;
  };

  const getInitials = (user) => {
    const f = user?.first_name?.[0] || '';
    const l = user?.last_name?.[0] || '';
    return (f + l).toUpperCase() || 'U';
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="pm-page">
      {/* Header */}
      <div className="pm-header">
        <div>
          <h1>Payment Management</h1>
          <p>Monitor transactions, manage refunds, and track revenue</p>
        </div>
        <button className="pm-btn-secondary" onClick={fetchPayments}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="pm-stats">
        <div className="pm-stat big" onClick={() => { setActiveFilter('paid'); setDateFilter('all'); }}>
          <div className="pm-stat-icon green"><DollarSign size={20} /></div>
          <div>
            <p>Total Revenue</p>
            <h3>{formatCurrency(stats.total)}</h3>
            <span className="pm-stat-sub">{stats.paidCount} transactions</span>
          </div>
        </div>
        <div className="pm-stat" onClick={() => setActiveFilter('paid')}>
          <div className="pm-stat-icon blue"><CheckCircle size={18} /></div>
          <div>
            <p>Paid</p>
            <h3>{stats.paidCount}</h3>
          </div>
        </div>
        <div className="pm-stat" onClick={() => setActiveFilter('pending')}>
          <div className="pm-stat-icon amber"><Clock size={18} /></div>
          <div>
            <p>Pending</p>
            <h3>{stats.pendingCount}</h3>
          </div>
        </div>
        <div className="pm-stat" onClick={() => setActiveFilter('failed')}>
          <div className="pm-stat-icon red"><XCircle size={18} /></div>
          <div>
            <p>Failed</p>
            <h3>{stats.failedCount}</h3>
          </div>
        </div>
        <div className="pm-stat" onClick={() => setActiveFilter('refunded')}>
          <div className="pm-stat-icon purple"><RotateCcw size={18} /></div>
          <div>
            <p>Refunded</p>
            <h3>{stats.refundedCount}</h3>
            <span className="pm-stat-sub">{formatCurrency(stats.refundedTotal)}</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="pm-toolbar">
        <div className="pm-filters">
          <Filter size={15} />
          {[
            { id: 'all', label: 'All' },
            { id: 'paid', label: 'Paid' },
            { id: 'pending', label: 'Pending' },
            { id: 'failed', label: 'Failed' },
            { id: 'refunded', label: 'Refunded' },
          ].map((f) => (
            <button
              key={f.id}
              className={`pm-filter-tab ${activeFilter === f.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="pm-toolbar-right">
          <select
            className="pm-date-filter"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">This Month</option>
          </select>

          <div className="pm-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search reference, patient, doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Banners */}
      {error && (
        <div className="pm-banner error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="pm-banner success">
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="pm-loading">
          <Loader size={28} className="spin" />
          <p>Loading payments...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="pm-empty">
          <Receipt size={56} />
          <h3>No payments found</h3>
          <p>Try adjusting filters or search.</p>
        </div>
      ) : (
        <div className="pm-table">
          <div className="pm-table-header">
            <div>Reference</div>
            <div>Patient</div>
            <div>Doctor</div>
            <div>Amount</div>
            <div>Method</div>
            <div>Date</div>
            <div>Status</div>
            <div></div>
          </div>

          {filtered.map((payment) => {
            const statusCfg = getStatusConfig(payment.payment_status);
            const StatusIcon = statusCfg.icon;
            const isProcessing = processing === payment.id;
            const patient = payment.appointment?.patient?.user;
            const doctor = payment.appointment?.doctor?.user;

            return (
              <div key={payment.id} className="pm-row">
                <div className="pm-cell ref-cell">
                  <div className="pm-ref-icon">
                    <Receipt size={14} />
                  </div>
                  <div>
                    <strong>{payment.transaction_reference?.slice(0, 14) || 'N/A'}</strong>
                    {payment.appointment && <span>Appt #{payment.appointment.id}</span>}
                  </div>
                </div>

                <div className="pm-cell">
                  {patient ? (
                    <div className="pm-person">
                      <div className="pm-avatar patient">{getInitials(patient)}</div>
                      <div>
                        <strong>{patient.first_name} {patient.last_name}</strong>
                        <span>{patient.email?.slice(0, 20)}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="pm-muted">N/A</span>
                  )}
                </div>

                <div className="pm-cell">
                  {doctor ? (
                    <div className="pm-person">
                      <div className="pm-avatar doctor">{getInitials(doctor)}</div>
                      <div>
                        <strong>Dr. {doctor.first_name} {doctor.last_name}</strong>
                        <span>{payment.appointment?.doctor?.specialization}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="pm-muted">N/A</span>
                  )}
                </div>

                <div className="pm-cell amount-cell">
                  <strong>{formatCurrency(payment.amount, payment.currency)}</strong>
                </div>

                <div className="pm-cell">
                  <span className="pm-method-tag">
                    {payment.payment_method?.replace('_', ' ') || 'online'}
                  </span>
                </div>

                <div className="pm-cell">
                  <div className="pm-date">
                    <strong>{formatDate(payment.created_at)}</strong>
                    <span>
                      {new Date(payment.created_at).toLocaleTimeString([], {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="pm-cell">
                  <span
                    className="pm-status-badge"
                    style={{ background: statusCfg.bg, color: statusCfg.color }}
                  >
                    <StatusIcon size={11} />
                    {statusCfg.label}
                  </span>
                </div>

                <div className="pm-cell pm-actions-cell">
                  <button
                    className="pm-icon-btn"
                    onClick={() => setSelected(payment)}
                    title="View details"
                  >
                    <Eye size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============ DETAIL MODAL ============ */}
      {selected && (
        <div className="pm-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
            <div
              className="pm-modal-header"
              style={{
                background: `linear-gradient(135deg, ${getStatusConfig(selected.payment_status).color}, ${getStatusConfig(selected.payment_status).color}cc)`,
              }}
            >
              <div>
                <p>Payment #{selected.id}</p>
                <h2>{formatCurrency(selected.amount, selected.currency)}</h2>
                <span className="pm-modal-status">
                  {React.createElement(getStatusConfig(selected.payment_status).icon, { size: 13 })}
                  {getStatusConfig(selected.payment_status).label}
                </span>
              </div>
              <button className="pm-modal-close" onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="pm-modal-body">
              {/* Transaction */}
              <div className="pm-modal-section">
                <h4><Receipt size={14} /> Transaction</h4>
                <div className="pm-modal-row">
                  <span>Reference</span>
                  <strong>{selected.transaction_reference || 'N/A'}</strong>
                </div>
                <div className="pm-modal-row">
                  <span>Method</span>
                  <strong>{selected.payment_method?.replace('_', ' ')}</strong>
                </div>
                <div className="pm-modal-row">
                  <span>Created</span>
                  <strong>{formatDateTime(selected.created_at)}</strong>
                </div>
                {selected.paid_at && (
                  <div className="pm-modal-row">
                    <span>Paid At</span>
                    <strong>{formatDateTime(selected.paid_at)}</strong>
                  </div>
                )}
              </div>

              {/* Patient */}
              {selected.appointment?.patient?.user && (
                <div className="pm-modal-section">
                  <h4><User size={14} /> Patient</h4>
                  <div className="pm-modal-person">
                    <div className="pm-avatar patient lg">
                      {getInitials(selected.appointment.patient.user)}
                    </div>
                    <div>
                      <strong>
                        {selected.appointment.patient.user.first_name}{' '}
                        {selected.appointment.patient.user.last_name}
                      </strong>
                      <p>{selected.appointment.patient.user.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Doctor */}
              {selected.appointment?.doctor?.user && (
                <div className="pm-modal-section">
                  <h4><Stethoscope size={14} /> Doctor</h4>
                  <div className="pm-modal-person">
                    <div className="pm-avatar doctor lg">
                      {getInitials(selected.appointment.doctor.user)}
                    </div>
                    <div>
                      <strong>
                        Dr. {selected.appointment.doctor.user.first_name}{' '}
                        {selected.appointment.doctor.user.last_name}
                      </strong>
                      <p>{selected.appointment.doctor.specialization}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Amount */}
              <div className="pm-modal-total">
                <div>
                  <span>Total</span>
                  <h3>{formatCurrency(selected.amount, selected.currency)}</h3>
                </div>
                <CreditCard size={32} />
              </div>
            </div>

            <div className="pm-modal-footer">
              <button className="pm-btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>

              {selected.payment_status === 'pending' && (
                <button
                  className="pm-btn-success"
                  disabled={processing === selected.id}
                  onClick={() => markAsPaid(selected)}
                >
                  {processing === selected.id ? (
                    <><Loader size={14} className="spin" /> Processing...</>
                  ) : (
                    <><CheckCircle size={14} /> Mark as Paid</>
                  )}
                </button>
              )}

              {selected.payment_status === 'paid' && (
                <button
                  className="pm-btn-danger"
                  onClick={() => setRefundModal(selected)}
                >
                  <RotateCcw size={14} /> Refund
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ REFUND MODAL ============ */}
      {refundModal && (
        <div className="pm-modal-backdrop" onClick={() => setRefundModal(null)}>
          <div className="pm-modal sm" onClick={(e) => e.stopPropagation()}>
            <div className="pm-refund-body">
              <div className="pm-refund-icon">
                <RotateCcw size={28} />
              </div>
              <h3>Refund Payment?</h3>
              <p>
                Refund{' '}
                <strong>{formatCurrency(refundModal.amount, refundModal.currency)}</strong>{' '}
                back to the patient? This action will reverse the payment.
              </p>

              <div className="pm-refund-reason">
                <label>Refund Reason (optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Appointment cancelled"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                />
              </div>
            </div>
            <div className="pm-modal-footer">
              <button
                className="pm-btn-secondary"
                onClick={() => {
                  setRefundModal(null);
                  setRefundReason('');
                }}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                className="pm-btn-danger"
                onClick={handleRefund}
                disabled={processing}
              >
                {processing ? (
                  <><Loader size={14} className="spin" /> Processing...</>
                ) : (
                  <><RotateCcw size={14} /> Confirm Refund</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;