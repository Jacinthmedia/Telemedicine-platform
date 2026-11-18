import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  CreditCard, Search, Filter, Calendar, DollarSign, CheckCircle,
  Clock, XCircle, RefreshCw, Download, Eye, X, AlertCircle,
  Loader, TrendingUp, Receipt, ArrowRight, User, Stethoscope,
} from 'lucide-react';
import './PaymentHistory.css';

const PaymentHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || 'patient';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payments, setPayments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [activeStat, setActiveStat] = useState('total');

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
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to load payment history'
      );
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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => {
        const doctor = `${p.appointment?.doctor?.user?.first_name || ''} ${p.appointment?.doctor?.user?.last_name || ''}`.toLowerCase();
        return (
          p.transaction_reference?.toLowerCase().includes(q) ||
          p.payment_method?.toLowerCase().includes(q) ||
          doctor.includes(q)
        );
      });
    }

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setFiltered(list);
  }, [payments, activeFilter, searchQuery]);

  // ============================================
  // STATS
  // ============================================
  const stats = useMemo(() => {
    const paid = payments.filter((p) => p.payment_status === 'paid');
    const pending = payments.filter((p) => p.payment_status === 'pending');
    const failed = payments.filter((p) => p.payment_status === 'failed');
    const total = paid.reduce((s, p) => s + parseFloat(p.amount || 0), 0);

    return {
      total,
      totalCount: payments.length,
      paidCount: paid.length,
      pendingCount: pending.length,
      failedCount: failed.length,
    };
  }, [payments]);

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
      pending: { color: '#f59e0b', bg: '#fef3c7', label: 'Pending', icon: Clock },
      processing: { color: '#3b82f6', bg: '#dbeafe', label: 'Processing', icon: RefreshCw },
      paid: { color: '#10b981', bg: '#d1fae5', label: 'Paid', icon: CheckCircle },
      failed: { color: '#ef4444', bg: '#fee2e2', label: 'Failed', icon: XCircle },
      refunded: { color: '#8b5cf6', bg: '#ede9fe', label: 'Refunded', icon: RefreshCw },
      cancelled: { color: '#64748b', bg: '#f1f5f9', label: 'Cancelled', icon: XCircle },
    };
    return config[status?.toLowerCase()] || config.pending;
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="py-page">
      {/* Header */}
      <div className="py-header">
        <div>
          <h1>Payments</h1>
          <p>
            {role === 'patient'
              ? 'Your payment history and invoices'
              : 'All payments across the platform'}
          </p>
        </div>
        {role === 'patient' && (
          <button
            className="py-btn-primary"
            onClick={() => navigate('/appointments/book')}
          >
            <CreditCard size={15} /> New Payment
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="py-stats">
        <div
          className={`py-stat big ${activeStat === 'total' ? 'active' : ''}`}
          onClick={() => setActiveStat('total')}
        >
          <div className="py-stat-icon green">
            <DollarSign size={20} />
          </div>
          <div>
            <p>Total Paid</p>
            <h3>{formatCurrency(stats.total)}</h3>
            <span className="py-stat-sub">{stats.paidCount} transactions</span>
          </div>
        </div>
        <div
          className={`py-stat ${activeStat === 'paid' ? 'active' : ''}`}
          onClick={() => {
            setActiveStat('paid');
            setActiveFilter('paid');
          }}
        >
          <div className="py-stat-icon blue">
            <CheckCircle size={18} />
          </div>
          <div>
            <p>Successful</p>
            <h3>{stats.paidCount}</h3>
          </div>
        </div>
        <div
          className={`py-stat ${activeStat === 'pending' ? 'active' : ''}`}
          onClick={() => {
            setActiveStat('pending');
            setActiveFilter('pending');
          }}
        >
          <div className="py-stat-icon amber">
            <Clock size={18} />
          </div>
          <div>
            <p>Pending</p>
            <h3>{stats.pendingCount}</h3>
          </div>
        </div>
        <div
          className={`py-stat ${activeStat === 'failed' ? 'active' : ''}`}
          onClick={() => {
            setActiveStat('failed');
            setActiveFilter('failed');
          }}
        >
          <div className="py-stat-icon red">
            <XCircle size={18} />
          </div>
          <div>
            <p>Failed</p>
            <h3>{stats.failedCount}</h3>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="py-toolbar">
        <div className="py-filters">
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
              className={`py-filter-tab ${activeFilter === f.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="py-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by reference, doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="py-banner error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-loading">
          <Loader size={28} className="spin" />
          <p>Loading payments...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-empty">
          <Receipt size={56} />
          <h3>No payments found</h3>
          <p>
            {payments.length === 0
              ? 'Your payment history will appear here.'
              : 'No payments match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="py-list">
          {/* Table header (desktop) */}
          <div className="py-list-header">
            <div>Reference</div>
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
            const doctor = payment.appointment?.doctor?.user;

            return (
              <div key={payment.id} className="py-row">
                <div className="py-cell py-ref">
                  <div className="py-ref-icon">
                    <Receipt size={14} />
                  </div>
                  <div>
                    <strong>{payment.transaction_reference?.slice(0, 16) || 'N/A'}</strong>
                    {payment.appointment && (
                      <span>Appt #{payment.appointment.id}</span>
                    )}
                  </div>
                </div>

                <div className="py-cell py-doctor">
                  {doctor ? (
                    <>
                      <div className="py-doctor-avatar">
                        {doctor.first_name?.[0]}{doctor.last_name?.[0]}
                      </div>
                      <div>
                        <strong>
                          Dr. {doctor.first_name} {doctor.last_name}
                        </strong>
                        <span>{payment.appointment?.doctor?.specialization}</span>
                      </div>
                    </>
                  ) : (
                    <span className="py-muted">N/A</span>
                  )}
                </div>

                <div className="py-cell py-amount">
                  <strong>{formatCurrency(payment.amount, payment.currency)}</strong>
                </div>

                <div className="py-cell py-method">
                  <span className="py-method-tag">
                    {payment.payment_method?.replace('_', ' ') || 'online'}
                  </span>
                </div>

                <div className="py-cell py-date">
                  <div>
                    <strong>{formatDate(payment.created_at)}</strong>
                    <span>
                      {new Date(payment.created_at).toLocaleTimeString([], {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="py-cell py-status">
                  <span
                    className="py-status-badge"
                    style={{ background: statusCfg.bg, color: statusCfg.color }}
                  >
                    <StatusIcon size={12} />
                    {statusCfg.label}
                  </span>
                </div>

                <div className="py-cell py-actions">
                  <button
                    className="py-icon-btn"
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
        <div className="py-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="py-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header with status */}
            <div
              className="py-modal-header"
              style={{
                background: `linear-gradient(135deg, ${getStatusConfig(selected.payment_status).color}, ${getStatusConfig(selected.payment_status).color}cc)`,
              }}
            >
              <div>
                <p>Transaction Receipt</p>
                <h2>{formatCurrency(selected.amount, selected.currency)}</h2>
                <span className="py-modal-status">
                  {React.createElement(getStatusConfig(selected.payment_status).icon, { size: 14 })}
                  {getStatusConfig(selected.payment_status).label}
                </span>
              </div>
              <button className="py-modal-close" onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="py-modal-body">
              {/* Ref */}
              <div className="py-modal-section">
                <h4>Transaction</h4>
                <div className="py-modal-row">
                  <span>Reference</span>
                  <strong>{selected.transaction_reference || 'N/A'}</strong>
                </div>
                <div className="py-modal-row">
                  <span>Method</span>
                  <strong>{selected.payment_method?.replace('_', ' ')}</strong>
                </div>
                <div className="py-modal-row">
                  <span>Date</span>
                  <strong>{formatDateTime(selected.created_at)}</strong>
                </div>
                {selected.paid_at && (
                  <div className="py-modal-row">
                    <span>Paid At</span>
                    <strong>{formatDateTime(selected.paid_at)}</strong>
                  </div>
                )}
              </div>

              {/* Doctor */}
              {selected.appointment?.doctor && (
                <div className="py-modal-section">
                  <h4>Paid To</h4>
                  <div className="py-modal-doctor">
                    <div className="py-modal-doctor-avatar">
                      {selected.appointment.doctor.user?.first_name?.[0]}
                      {selected.appointment.doctor.user?.last_name?.[0]}
                    </div>
                    <div>
                      <strong>
                        Dr. {selected.appointment.doctor.user?.first_name}{' '}
                        {selected.appointment.doctor.user?.last_name}
                      </strong>
                      <p>{selected.appointment.doctor.specialization}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Appointment */}
              {selected.appointment && (
                <div className="py-modal-section">
                  <h4>Appointment</h4>
                  <div className="py-modal-row">
                    <span>Date</span>
                    <strong>{formatDate(selected.appointment.appointment_date)}</strong>
                  </div>
                  <div className="py-modal-row">
                    <span>Time</span>
                    <strong>
                      {selected.appointment.start_time?.slice(0, 5)} -{' '}
                      {selected.appointment.end_time?.slice(0, 5)}
                    </strong>
                  </div>
                  <div className="py-modal-row">
                    <span>Type</span>
                    <strong>{selected.appointment.consultation_type}</strong>
                  </div>
                </div>
              )}

              {/* Amount */}
              <div className="py-modal-total">
                <div>
                  <span>Total Amount</span>
                  <h3>{formatCurrency(selected.amount, selected.currency)}</h3>
                </div>
                <CreditCard size={32} />
              </div>
            </div>

            <div className="py-modal-footer">
              <button className="py-btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>
              <button className="py-btn-primary" title="Download (coming soon)">
                <Download size={15} /> Download Receipt
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        className="py-btn-primary"
        onClick={() => navigate('/appointments')}
      >
        <CreditCard size={15} /> Pay for Appointment
      </button>
    </div>
  );
};

export default PaymentHistory;