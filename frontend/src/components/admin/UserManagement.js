import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  Users, Search, Filter, UserPlus, Eye, Edit, Trash2,
  Shield, Stethoscope, User as UserIcon, CheckCircle,
  XCircle, AlertCircle, Loader, X, Save, Mail, Phone,
  Calendar, Ban, UserCheck, MoreVertical, Download,
} from 'lucide-react';
import './UserManagement.css';

const UserManagement = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);

  // Filters
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);

  // ============================================
  // FETCH
  // ============================================
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const [patientsRes, doctorsRes] = await Promise.allSettled([
        api.get('/patients/'),
        api.get('/doctors/'),
      ]);

      const patients = patientsRes.status === 'fulfilled'
        ? (patientsRes.value.data.results || patientsRes.value.data.data || patientsRes.value.data || [])
        : [];
      const doctors = doctorsRes.status === 'fulfilled'
        ? (doctorsRes.value.data.results || doctorsRes.value.data.data || doctorsRes.value.data || [])
        : [];

      const combined = [
        ...patients.map((p) => ({
          id: p.id,
          userId: p.user?.id,
          type: 'patient',
          username: p.user?.username,
          email: p.user?.email,
          first_name: p.user?.first_name,
          last_name: p.user?.last_name,
          phone: p.phone,
          date_joined: p.user?.date_joined || p.created_at,
          is_active: p.user?.is_active !== false,
          role: 'patient',
          profile: p,
        })),
        ...doctors.map((d) => ({
          id: d.id,
          userId: d.user?.id,
          type: 'doctor',
          username: d.user?.username,
          email: d.user?.email,
          first_name: d.user?.first_name,
          last_name: d.user?.last_name,
          phone: d.phone,
          date_joined: d.user?.date_joined || d.created_at,
          is_active: d.user?.is_active !== false,
          role: 'doctor',
          is_verified: d.is_verified,
          verification_status: d.verification_status,
          specialization: d.specialization,
          hospital: d.hospital,
          profile: d,
        })),
      ];

      setUsers(combined);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FILTER
  // ============================================
  useEffect(() => {
    let list = [...users];

    if (activeFilter === 'patients') {
      list = list.filter((u) => u.type === 'patient');
    } else if (activeFilter === 'doctors') {
      list = list.filter((u) => u.type === 'doctor');
    } else if (activeFilter === 'unverified_doctors') {
      list = list.filter(
        (u) => u.type === 'doctor' && u.verification_status !== 'approved'
      );
    } else if (activeFilter === 'inactive') {
      list = list.filter((u) => !u.is_active);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((u) => {
        const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
        return (
          name.includes(q) ||
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q) ||
          u.specialization?.toLowerCase().includes(q)
        );
      });
    }

    list.sort((a, b) => new Date(b.date_joined || 0) - new Date(a.date_joined || 0));
    setFiltered(list);
  }, [users, activeFilter, searchQuery]);

  // ============================================
  // STATS
  // ============================================
  const stats = useMemo(() => ({
    total: users.length,
    patients: users.filter((u) => u.type === 'patient').length,
    doctors: users.filter((u) => u.type === 'doctor').length,
    pending: users.filter(
      (u) => u.type === 'doctor' && u.verification_status === 'pending'
    ).length,
    inactive: users.filter((u) => !u.is_active).length,
  }), [users]);

  // ============================================
  // ACTIONS
  // ============================================
  const handleEdit = (user) => {
    setEditing(user);
    setEditForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
    });
    setActionMenu(null);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    setError('');

    try {
      const endpoint = editing.type === 'patient'
        ? `/patients/${editing.id}/`
        : `/doctors/${editing.id}/`;

      const payload = editing.type === 'patient'
        ? {
            user: {
              first_name: editForm.first_name,
              last_name: editForm.last_name,
              email: editForm.email,
            },
            phone: editForm.phone,
          }
        : {
            user: {
              first_name: editForm.first_name,
              last_name: editForm.last_name,
              email: editForm.email,
            },
          };

      await api.patch(endpoint, payload);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editing.id && u.type === editing.type
            ? {
                ...u,
                first_name: editForm.first_name,
                last_name: editForm.last_name,
                email: editForm.email,
                phone: editForm.phone,
              }
            : u
        )
      );

      setSuccess('User updated successfully');
      setEditing(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to update user'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleApproveDoctor = async (user) => {
    if (user.type !== 'doctor') return;
    try {
      await api.post(`/doctors/${user.id}/approve/`);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id && u.type === 'doctor'
            ? { ...u, is_verified: true, verification_status: 'approved' }
            : u
        )
      );
      setSuccess(`Dr. ${user.first_name} ${user.last_name} approved`);
      setActionMenu(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Approve failed:', err);
      setError(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleRejectDoctor = async (user) => {
    if (user.type !== 'doctor') return;
    try {
      await api.post(`/doctors/${user.id}/reject/`);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id && u.type === 'doctor'
            ? { ...u, is_verified: false, verification_status: 'rejected' }
            : u
        )
      );
      setSuccess(`Dr. ${user.first_name} ${user.last_name} rejected`);
      setActionMenu(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Reject failed:', err);
      setError(err.response?.data?.message || 'Failed to reject');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await api.patch(`/auth/me/`, { user: { is_active: !user.is_active } });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id && u.type === user.type
            ? { ...u, is_active: !u.is_active }
            : u
        )
      );
      setSuccess(`${user.is_active ? 'Deactivated' : 'Activated'} successfully`);
      setActionMenu(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const confirmDelete = (user) => {
    setDeleteConfirm(user);
    setActionMenu(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSaving(true);

    try {
      const endpoint = deleteConfirm.type === 'patient'
        ? `/patients/${deleteConfirm.id}/`
        : `/doctors/${deleteConfirm.id}/`;

      await api.delete(endpoint);

      setUsers((prev) =>
        prev.filter((u) => !(u.id === deleteConfirm.id && u.type === deleteConfirm.type))
      );
      setSuccess('User deleted');
      setDeleteConfirm(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to delete user'
      );
    } finally {
      setSaving(false);
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

  const getInitials = (u) => {
    const f = u.first_name?.[0] || '';
    const l = u.last_name?.[0] || '';
    return (f + l).toUpperCase() || u.username?.[0]?.toUpperCase() || 'U';
  };

  const getRoleBadge = (u) => {
    if (u.type === 'doctor') {
      const verified = u.verification_status === 'approved' || u.is_verified;
      return {
        label: verified ? 'Verified Doctor' : 'Doctor',
        bg: verified ? '#d1fae5' : '#fef3c7',
        color: verified ? '#059669' : '#b45309',
        icon: Stethoscope,
      };
    }
    return {
      label: 'Patient',
      bg: '#dbeafe',
      color: '#1d4ed8',
      icon: UserIcon,
    };
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="um-page">
      {/* Header */}
      <div className="um-header">
        <div>
          <h1>User Management</h1>
          <p>Manage all patients and doctors on the platform</p>
        </div>
        <button className="um-btn-primary" title="Export (coming soon)">
          <Download size={15} /> Export
        </button>
      </div>

      {/* Stats */}
      <div className="um-stats">
        <div className="um-stat" onClick={() => setActiveFilter('all')}>
          <div className="um-stat-icon blue"><Users size={18} /></div>
          <div>
            <p>Total Users</p>
            <h3>{stats.total}</h3>
          </div>
        </div>
        <div className="um-stat" onClick={() => setActiveFilter('patients')}>
          <div className="um-stat-icon green"><UserIcon size={18} /></div>
          <div>
            <p>Patients</p>
            <h3>{stats.patients}</h3>
          </div>
        </div>
        <div className="um-stat" onClick={() => setActiveFilter('doctors')}>
          <div className="um-stat-icon purple"><Stethoscope size={18} /></div>
          <div>
            <p>Doctors</p>
            <h3>{stats.doctors}</h3>
          </div>
        </div>
        <div className="um-stat" onClick={() => setActiveFilter('unverified_doctors')}>
          <div className="um-stat-icon amber"><AlertCircle size={18} /></div>
          <div>
            <p>Pending</p>
            <h3>{stats.pending}</h3>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="um-toolbar">
        <div className="um-filters">
          <Filter size={15} />
          {[
            { id: 'all', label: 'All' },
            { id: 'patients', label: 'Patients' },
            { id: 'doctors', label: 'Doctors' },
            { id: 'unverified_doctors', label: 'Pending Verify' },
            { id: 'inactive', label: 'Inactive' },
          ].map((f) => (
            <button
              key={f.id}
              className={`um-filter-tab ${activeFilter === f.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="um-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by name, email, username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Banners */}
      {error && (
        <div className="um-banner error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="um-banner success">
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="um-loading">
          <Loader size={28} className="spin" />
          <p>Loading users...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="um-empty">
          <Users size={56} />
          <h3>No users found</h3>
          <p>Try adjusting your filters or search.</p>
        </div>
      ) : (
        <div className="um-table">
          <div className="um-table-header">
            <div>User</div>
            <div>Contact</div>
            <div>Role</div>
            <div>Status</div>
            <div>Joined</div>
            <div></div>
          </div>

          {filtered.map((u) => {
            const roleBadge = getRoleBadge(u);
            const RoleIcon = roleBadge.icon;

            return (
              <div key={`${u.type}-${u.id}`} className="um-row">
                <div className="um-cell user-cell">
                  <div className={`um-avatar ${u.type}`}>
                    {getInitials(u)}
                  </div>
                  <div className="um-user-info">
                    <strong>
                      {u.first_name} {u.last_name}
                      {!u.is_active && <span className="um-inactive-tag">Inactive</span>}
                    </strong>
                    <span>@{u.username}</span>
                  </div>
                </div>

                <div className="um-cell">
                  <div className="um-contact">
                    {u.email && (
                      <span className="um-contact-row">
                        <Mail size={12} /> {u.email}
                      </span>
                    )}
                    {u.phone && (
                      <span className="um-contact-row">
                        <Phone size={12} /> {u.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="um-cell">
                  <span
                    className="um-role-badge"
                    style={{ background: roleBadge.bg, color: roleBadge.color }}
                  >
                    <RoleIcon size={12} />
                    {roleBadge.label}
                  </span>
                  {u.specialization && (
                    <span className="um-spec">{u.specialization}</span>
                  )}
                </div>

                <div className="um-cell">
                  {u.is_active ? (
                    <span className="um-status active">
                      <span className="dot" /> Active
                    </span>
                  ) : (
                    <span className="um-status inactive">
                      <span className="dot" /> Inactive
                    </span>
                  )}
                </div>

                <div className="um-cell">
                  <span className="um-date">
                    <Calendar size={12} /> {formatDate(u.date_joined)}
                  </span>
                </div>

                <div className="um-cell um-actions-cell">
                  <button
                    className="um-icon-btn"
                    onClick={() => setSelected(u)}
                    title="View details"
                  >
                    <Eye size={15} />
                  </button>
                  <div className="um-menu-wrap">
                    <button
                      className="um-icon-btn"
                      onClick={() =>
                        setActionMenu(actionMenu === `${u.type}-${u.id}` ? null : `${u.type}-${u.id}`)
                      }
                    >
                      <MoreVertical size={15} />
                    </button>

                    {actionMenu === `${u.type}-${u.id}` && (
                      <div className="um-menu">
                        <button onClick={() => handleEdit(u)}>
                          <Edit size={13} /> Edit
                        </button>
                        {u.type === 'doctor' && u.verification_status !== 'approved' && (
                          <button
                            className="success"
                            onClick={() => handleApproveDoctor(u)}
                          >
                            <UserCheck size={13} /> Approve
                          </button>
                        )}
                        {u.type === 'doctor' && u.verification_status === 'approved' && (
                          <button
                            className="warning"
                            onClick={() => handleRejectDoctor(u)}
                          >
                            <Ban size={13} /> Revoke
                          </button>
                        )}
                        <button onClick={() => handleToggleActive(u)}>
                          <Shield size={13} />
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="danger"
                          onClick={() => confirmDelete(u)}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============ VIEW MODAL ============ */}
      {selected && (
        <div className="um-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="um-modal" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-header">
              <div className="um-modal-avatar">{getInitials(selected)}</div>
              <div className="um-modal-title">
                <h2>{selected.first_name} {selected.last_name}</h2>
                <p>@{selected.username}</p>
              </div>
              <button className="um-modal-close" onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="um-modal-body">
              <div className="um-modal-section">
                <h4>Account Information</h4>
                <div className="um-modal-row">
                  <span>Email</span>
                  <strong>{selected.email || 'N/A'}</strong>
                </div>
                <div className="um-modal-row">
                  <span>Phone</span>
                  <strong>{selected.phone || 'N/A'}</strong>
                </div>
                <div className="um-modal-row">
                  <span>Role</span>
                  <strong>{selected.role}</strong>
                </div>
                <div className="um-modal-row">
                  <span>Status</span>
                  <strong style={{ color: selected.is_active ? '#10b981' : '#ef4444' }}>
                    {selected.is_active ? 'Active' : 'Inactive'}
                  </strong>
                </div>
                <div className="um-modal-row">
                  <span>Joined</span>
                  <strong>{formatDate(selected.date_joined)}</strong>
                </div>
              </div>

              {selected.type === 'doctor' && (
                <div className="um-modal-section">
                  <h4>Doctor Profile</h4>
                  <div className="um-modal-row">
                    <span>Specialization</span>
                    <strong>{selected.specialization || 'N/A'}</strong>
                  </div>
                  <div className="um-modal-row">
                    <span>Hospital</span>
                    <strong>{selected.hospital || 'N/A'}</strong>
                  </div>
                  <div className="um-modal-row">
                    <span>Experience</span>
                    <strong>{selected.profile?.years_experience || 0} years</strong>
                  </div>
                  <div className="um-modal-row">
                    <span>Consultation Fee</span>
                    <strong>
                      ₦{parseFloat(selected.profile?.consultation_fee || 0).toLocaleString()}
                    </strong>
                  </div>
                  <div className="um-modal-row">
                    <span>Verification</span>
                    <strong
                      style={{
                        color:
                          selected.verification_status === 'approved'
                            ? '#10b981'
                            : selected.verification_status === 'rejected'
                            ? '#ef4444'
                            : '#f59e0b',
                      }}
                    >
                      {selected.verification_status || 'pending'}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            <div className="um-modal-footer">
              <button className="um-btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>
              <button
                className="um-btn-primary"
                onClick={() => {
                  setSelected(null);
                  handleEdit(selected);
                }}
              >
                <Edit size={15} /> Edit User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ EDIT MODAL ============ */}
      {editing && (
        <div className="um-modal-backdrop" onClick={() => setEditing(null)}>
          <div className="um-modal" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-header">
              <div className="um-modal-avatar">{getInitials(editing)}</div>
              <div className="um-modal-title">
                <h2>Edit User</h2>
                <p>@{editing.username}</p>
              </div>
              <button className="um-modal-close" onClick={() => setEditing(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="um-modal-body">
              <div className="um-form-grid">
                <div className="um-field">
                  <label>First Name</label>
                  <input
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  />
                </div>
                <div className="um-field">
                  <label>Last Name</label>
                  <input
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  />
                </div>
                <div className="um-field full">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                {editing.type === 'patient' && (
                  <div className="um-field full">
                    <label>Phone</label>
                    <input
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="um-modal-footer">
              <button
                className="um-btn-secondary"
                onClick={() => setEditing(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="um-btn-primary"
                onClick={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <><Loader size={14} className="spin" /> Saving...</>
                ) : (
                  <><Save size={14} /> Save Changes</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ DELETE CONFIRM ============ */}
      {deleteConfirm && (
        <div className="um-modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="um-modal sm" onClick={(e) => e.stopPropagation()}>
            <div className="um-delete-body">
              <div className="um-delete-icon">
                <Trash2 size={28} />
              </div>
              <h3>Delete User?</h3>
              <p>
                Are you sure you want to permanently delete{' '}
                <strong>{deleteConfirm.first_name} {deleteConfirm.last_name}</strong>?
                This action cannot be undone.
              </p>
            </div>
            <div className="um-modal-footer">
              <button
                className="um-btn-secondary"
                onClick={() => setDeleteConfirm(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="um-btn-danger"
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? (
                  <><Loader size={14} className="spin" /> Deleting...</>
                ) : (
                  <><Trash2 size={14} /> Delete User</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;