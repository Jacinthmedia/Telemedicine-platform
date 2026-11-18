import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { motion } from 'framer-motion';
import { Clock, TrendingUp } from 'lucide-react';
import { toast } from 'react-toastify';
import './AdminPayments.css';

const AdminPayments = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/payments/admin-dashboard/');
        setData(res.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load admin financial data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading Financials...</div>;
  
  // SAFETY CHECK: If data is missing, show zeros instead of crashing
  const safeData = data || { total_commission: 0, total_escrow: 0 };

  return (
    <div className="admin-payments-container">
      <div className="admin-header">
        <h1>Platform Revenue</h1>
        <p>Track your 30% commissions and doctor escrow balances.</p>
      </div>

      <div className="admin-cards">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="admin-card revenue">
          <div className="card-icon"><TrendingUp size={24} /></div>
          <div className="card-content">
            <p>Total Platform Revenue</p>
            <h2>₦{Number(safeData.total_commission || 0).toLocaleString()}</h2>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="admin-card escrow">
          <div className="card-icon"><Clock size={24} /></div>
          <div className="card-content">
            <p>Total Doctor Escrow</p>
            <h2>₦{Number(safeData.total_escrow || 0).toLocaleString()}</h2>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminPayments;
