import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  FileText, Upload, Search, Filter, Download, Trash2, Eye, X,
  Loader, AlertCircle, CheckCircle, Image as ImageIcon, File,
  Calendar, Shield, Plus, ExternalLink,
} from 'lucide-react';
import './Documents.css';

const DOC_TYPES = [
  { value: 'medical_report', label: 'Medical Report', color: '#3b82f6' },
  { value: 'lab_result', label: 'Lab Result', color: '#10b981' },
  { value: 'prescription', label: 'Prescription', color: '#f59e0b' },
  { value: 'imaging', label: 'Imaging', color: '#8b5cf6' },
  { value: 'insurance', label: 'Insurance', color: '#06b6d4' },
  { value: 'identification', label: 'ID', color: '#64748b' },
  { value: 'other', label: 'Other', color: '#94a3b8' },
];

const Documents = () => {
  const { user } = useAuth();
  const role = user?.role || 'patient';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // ============================================
  // FETCH
  // ============================================
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/documents/');
      const list = res.data.results || res.data.data || res.data || [];
      setDocuments(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FILTER
  // ============================================
  useEffect(() => {
    let list = [...documents];

    if (activeFilter !== 'all') {
      list = list.filter((d) => d.document_type === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          d.title?.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q) ||
          d.uploaded_by_name?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setFiltered(list);
  }, [documents, activeFilter, searchQuery]);

  const counts = useMemo(() => {
    const c = { all: documents.length };
    DOC_TYPES.forEach((t) => {
      c[t.value] = documents.filter((d) => d.document_type === t.value).length;
    });
    return c;
  }, [documents]);

  // ============================================
  // HELPERS
  // ============================================
  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const getTypeConfig = (type) => {
    return DOC_TYPES.find((t) => t.value === type) || DOC_TYPES[6];
  };

  const isImage = (mime) => mime?.startsWith('image/');
  const isPdf = (mime) => mime === 'application/pdf';

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    setDeleting(id);
    try {
      await api.delete(`/documents/${id}/`);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to delete document'
      );
    } finally {
      setDeleting(null);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="doc-page">
      {/* Header */}
      <div className="doc-header">
        <div>
          <h1>Documents</h1>
          <p>
            {role === 'patient'
              ? 'Store and manage your medical files in one secure place.'
              : 'View patient documents shared with you.'}
          </p>
        </div>
        <div className="doc-header-actions">
          <button className="doc-btn-secondary" onClick={fetchDocuments}>
            <Loader size={15} className={loading ? 'spin' : ''} />
          </button>
          <button
            className="doc-btn-primary"
            onClick={() => setUploadOpen(true)}
          >
            <Plus size={16} /> Upload Document
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="doc-banner error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="doc-toolbar">
        <div className="doc-filters">
          <Filter size={15} />
          <button
            className={`doc-filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All
            {counts.all > 0 && <span className="doc-filter-count">{counts.all}</span>}
          </button>
          {DOC_TYPES.map((t) => (
            counts[t.value] > 0 || activeFilter === t.value ? (
              <button
                key={t.value}
                className={`doc-filter-tab ${activeFilter === t.value ? 'active' : ''}`}
                onClick={() => setActiveFilter(t.value)}
              >
                {t.label}
                {counts[t.value] > 0 && (
                  <span className="doc-filter-count">{counts[t.value]}</span>
                )}
              </button>
            ) : null
          ))}
        </div>

        <div className="doc-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by title, uploader..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="doc-loading">
          <Loader size={28} className="spin" />
          <p>Loading documents...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="doc-empty">
          <FileText size={48} />
          <h3>No documents yet</h3>
          <p>
            {documents.length === 0
              ? 'Upload your first medical document to get started.'
              : 'No documents match the current filters.'}
          </p>
          {documents.length === 0 && (
            <button
              className="doc-btn-primary"
              onClick={() => setUploadOpen(true)}
            >
              <Upload size={16} /> Upload Document
            </button>
          )}
        </div>
      ) : (
        <div className="doc-grid">
          {filtered.map((doc) => {
            const cfg = getTypeConfig(doc.document_type);
            return (
              <div key={doc.id} className="doc-card">
                <div
                  className="doc-type-icon"
                  style={{ background: `${cfg.color}20`, color: cfg.color }}
                >
                  {isImage(doc.mime_type) ? (
                    <ImageIcon size={22} />
                  ) : (
                    <FileText size={22} />
                  )}
                </div>

                <div className="doc-card-body">
                  <h4 title={doc.title}>{doc.title}</h4>
                  <span
                    className="doc-type-badge"
                    style={{ background: `${cfg.color}20`, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                  {doc.description && (
                    <p title={doc.description}>{doc.description}</p>
                  )}
                  <div className="doc-card-meta">
                    <span>
                      <Calendar size={11} /> {formatDate(doc.created_at)}
                    </span>
                    {doc.file_size_display && (
                      <span>
                        <File size={11} /> {doc.file_size_display}
                      </span>
                    )}
                  </div>
                  {doc.is_verified && (
                    <span className="doc-verified">
                      <Shield size={11} /> Verified
                    </span>
                  )}
                </div>

                <div className="doc-card-actions">
                  <button
                    className="doc-icon-btn"
                    onClick={() => setPreview(doc)}
                    title="Preview"
                  >
                    <Eye size={15} />
                  </button>
                  <a
                    className="doc-icon-btn"
                    href={doc.file_url || doc.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Download"
                  >
                    <Download size={15} />
                  </a>
                  <button
                    className="doc-icon-btn danger"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleting === doc.id}
                    title="Delete"
                  >
                    {deleting === doc.id ? (
                      <Loader size={15} className="spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload modal */}
      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            setUploadOpen(false);
            fetchDocuments();
          }}
        />
      )}

      {/* Preview modal */}
      {preview && (
        <PreviewModal
          document={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};

// ============================================
// Upload Modal
// ============================================
const UploadModal = ({ onClose, onUploaded }) => {
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    document_type: 'medical_report',
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) {
      setError('File exceeds 20 MB limit');
      return;
    }
    setFile(f);
    setError('');
    if (!form.title) {
      setForm((prev) => ({ ...prev, title: f.name.replace(/\.[^.]+$/, '') }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', form.title.trim());
      fd.append('description', form.description.trim());
      fd.append('document_type', form.document_type);

      const res = await api.post('/documents/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (onUploaded) onUploaded(res.data.data || res.data);
      onClose();
    } catch (err) {
      const data = err.response?.data;
      let msg = 'Upload failed';
      if (data) {
        if (typeof data === 'string') msg = data;
        else if (data.detail) msg = data.detail;
        else {
          const firstKey = Object.keys(data)[0];
          if (firstKey) {
            const val = data[firstKey];
            msg = `${firstKey}: ${Array.isArray(val) ? val[0] : val}`;
          }
        }
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="doc-modal-backdrop" onClick={onClose}>
      <div className="doc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="doc-modal-header">
          <h2><Upload size={18} /> Upload Document</h2>
          <button className="doc-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="doc-modal-body">
          {error && (
            <div className="doc-banner error">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div
            className={`doc-dropzone ${file ? 'has-file' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFile}
              style={{ display: 'none' }}
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt"
            />
            {file ? (
              <>
                <CheckCircle size={36} />
                <strong>{file.name}</strong>
                <span>{(file.size / 1024).toFixed(1)} KB · Click to change</span>
              </>
            ) : (
              <>
                <Upload size={36} />
                <strong>Click to choose a file</strong>
                <span>PDF, JPG, PNG, DOC — up to 20 MB</span>
              </>
            )}
          </div>

          <div className="doc-field">
            <label>Title <span className="req">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Blood Test Report — Oct 2026"
              required
            />
          </div>

          <div className="doc-field">
            <label>Document Type <span className="req">*</span></label>
            <select
              value={form.document_type}
              onChange={(e) => setForm({ ...form, document_type: e.target.value })}
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="doc-field">
            <label>Description (Optional)</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Any details about this document..."
            />
          </div>

          <div className="doc-modal-actions">
            <button type="button" className="doc-btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="doc-btn-primary" disabled={saving}>
              {saving ? (
                <><Loader size={15} className="spin" /> Uploading...</>
              ) : (
                <><Upload size={15} /> Upload</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================
// Preview Modal
// ============================================
const PreviewModal = ({ document, onClose }) => {
  const url = document.file_url || document.file;
  const isImage = document.mime_type?.startsWith('image/');
  const isPdf = document.mime_type === 'application/pdf';

  return (
    <div className="doc-modal-backdrop" onClick={onClose}>
      <div className="doc-modal doc-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="doc-modal-header">
          <h2><FileText size={18} /> {document.title}</h2>
          <button className="doc-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="doc-preview-body">
          {isImage ? (
            <img src={url} alt={document.title} className="doc-preview-image" />
          ) : isPdf ? (
            <iframe
              src={url}
              className="doc-preview-iframe"
              title={document.title}
            />
          ) : (
            <div className="doc-preview-unknown">
              <File size={64} />
              <p>Preview not available for this file type.</p>
              <a href={url} target="_blank" rel="noopener noreferrer" className="doc-btn-primary">
                <ExternalLink size={15} /> Open in new tab
              </a>
            </div>
          )}
        </div>

        <div className="doc-modal-actions">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="doc-btn-primary"
            download
          >
            <Download size={15} /> Download
          </a>
          <button className="doc-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Documents;
