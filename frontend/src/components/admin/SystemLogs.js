import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { toast } from 'react-toastify';

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get('/system-logs/');
        const data = res.data;
        // Handle pagination (results array) or direct array
        if (Array.isArray(data)) {
          setLogs(data);
        } else if (data && Array.isArray(data.results)) {
          setLogs(data.results);
        } else {
          setLogs([]);
        }
      } catch (err) {
        toast.error("Failed to load system logs.");
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading logs...</div>;

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', color: '#1d1d1f' }}>System Logs</h1>
        <p style={{ color: '#86868b' }}>Real-time activity from your platform.</p>
      </div>

      <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {logs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#86868b' }}>
            <Activity size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <p>No system logs found. Activity will appear here.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f7', borderBottom: '1px solid #e5e5ea' }}>
                <th style={{ padding: '16px', textAlign: 'left', color: '#86868b' }}>Time</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#86868b' }}>User</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#86868b' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <motion.tr key={log.id || index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderBottom: '1px solid #f5f5f7' }}>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#86868b' }}>
                    {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>
                    {log.user_name || 'System'}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#1d1d1f' }}>
                    {log.action} {log.details ? `- ${log.details}` : ''}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SystemLogs;
