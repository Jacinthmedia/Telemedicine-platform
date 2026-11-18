import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { Shield, CreditCard, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import './PaymentCheckout.css';

const PaymentCheckout = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const res = await axios.get(`/appointments/${appointmentId}/`);
        setAppointment(res.data);
      } catch (err) {
        setError('Failed to load appointment details.');
      } finally {
        setLoading(false);
      }
    };
    fetchAppointment();
  }, [appointmentId]);

  const handlePay = async () => {
    setProcessing(true);
    setError('');
    try {
      const response = await axios.post(`/payments/checkout/${appointmentId}/`);
      if (response.data.authorization_url) {
        window.location.href = response.data.authorization_url;
      } else {
        setError('Could not initialize payment.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Payment initialization failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="checkout-loading">Loading...</div>;

  const consultationFee = appointment?.doctor?.consultation_fee || 0;
  const gatewayFee = consultationFee < 2500 ? 0 : Math.min((consultationFee * 0.015) + 100, 2000);
  const totalToPay = consultationFee + gatewayFee;

  return (
    <div className="checkout-container">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="checkout-card apple-card">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} /> Back
        </button>

        <div className="checkout-header">
          <Shield size={40} className="shield-icon" />
          <h2>Secure Checkout</h2>
        </div>

        {error && <div className="checkout-error"><AlertCircle size={20} /> {error}</div>}

        <div className="checkout-summary">
          <div className="summary-row"><span>Consultation Fee</span><span>₦{Number(consultationFee).toLocaleString()}</span></div>
          <div className="summary-row"><span>Gateway Fee</span><span>₦{Number(gatewayFee).toLocaleString()}</span></div>
          <div className="summary-row total"><span>Total</span><span>₦{Number(totalToPay).toLocaleString()}</span></div>
        </div>

        <button className="btn-primary apple-btn pay-btn" onClick={handlePay} disabled={processing || appointment?.payment_status === 'paid'}>
          {processing ? 'Redirecting...' : <><CheckCircle size={20} /> Pay ₦{Number(totalToPay).toLocaleString()}</>}
        </button>
      </motion.div>
    </div>
  );
};

export default PaymentCheckout;
