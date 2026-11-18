import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { motion } from 'framer-motion';
import { Wallet, Clock, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import './DoctorWallet.css';

const DoctorWallet = () => {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await axios.get('/payments/wallet/');
        setWallet(res.data);
      } catch (err) {
        toast.error("Failed to load wallet details.");
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, []);

  const handleWithdraw = (e) => {
    e.preventDefault();
    if (Number(withdrawAmount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (Number(withdrawAmount) > Number(wallet.available_balance)) {
      toast.error("Insufficient available balance.");
      return;
    }
    
    setProcessing(true);
    // Simulate API call for withdrawal
    setTimeout(() => {
      toast.success(`Withdrawal of ₦${Number(withdrawAmount).toLocaleString()} requested successfully!`);
      setWallet({ ...wallet, available_balance: Number(wallet.available_balance) - Number(withdrawAmount) });
      setWithdrawAmount('');
      setProcessing(false);
    }, 1500);
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading Wallet...</div>;
  if (!wallet) return <div style={{ padding: '50px', textAlign: 'center' }}>Wallet not found.</div>;

  return (
    <div className="wallet-container">
      <div className="wallet-header">
        <h1>My Wallet</h1>
        <p>Manage your earnings, escrow balances, and withdrawals.</p>
      </div>

      <div className="wallet-cards">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="wallet-card available">
          <div className="card-icon"><Wallet size={24} /></div>
          <div className="card-content">
            <p>Available Balance</p>
            <h2>₦{Number(wallet.available_balance || 0).toLocaleString()}</h2>
            <span className="card-note">Ready to withdraw</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="wallet-card pending">
          <div className="card-icon"><Clock size={24} /></div>
          <div className="card-content">
            <p>Pending Escrow</p>
            <h2>₦{Number(wallet.pending_balance || 0).toLocaleString()}</h2>
            <span className="card-note">Releases after appointment completion</span>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="withdraw-section">
        <div className="withdraw-header">
          <h3>Request Withdrawal</h3>
          <p>Transfer your available balance directly to your bank account.</p>
        </div>
        
        <form onSubmit={handleWithdraw} className="withdraw-form">
          <div className="input-group">
            <span className="currency-symbol">₦</span>
            <input 
              type="number" 
              placeholder="Enter amount" 
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              max={wallet.available_balance}
              className="withdraw-input"
            />
          </div>
          <button type="submit" className="withdraw-btn" disabled={!withdrawAmount || processing}>
            {processing ? 'Processing...' : <><ArrowUpRight size={18} /> Withdraw</>}
          </button>
        </form>
        
        <div className="security-badge">
          <ShieldCheck size={16} /> Payments are secured and processed via Paystack
        </div>
      </motion.div>
    </div>
  );
};

export default DoctorWallet;
