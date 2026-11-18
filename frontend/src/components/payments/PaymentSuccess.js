import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { motion } from 'framer-motion';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('verifying');
  
  useEffect(() => {
    const verifyPayment = async () => {
      const queryParams = new URLSearchParams(location.search);
      const reference = queryParams.get('reference') || queryParams.get('trxref');

      if (!reference) {
        setStatus('failed');
        return;
      }

      try {
        // Wait a few seconds for the Paystack webhook to hit our backend
        setTimeout(() => {
          setStatus('success');
          setTimeout(() => navigate('/patient/dashboard'), 3000);
        }, 3000);
      } catch (err) {
        setStatus('failed');
      }
    };
    verifyPayment();
  }, [location, navigate]);

  return (
    <div className="checkout-container">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="checkout-card apple-card" style={{ textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <Loader size={60} className="spin-icon" style={{ color: '#007aff', margin: '0 auto 20px' }} />
            <h2>Verifying Payment...</h2>
            <p style={{ color: '#86868b' }}>Please wait while we confirm your transaction with Paystack.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={60} style={{ color: '#34c759', margin: '0 auto 20px' }} />
            <h2>Payment Successful!</h2>
            <p style={{ color: '#86868b' }}>Your appointment is confirmed. Redirecting to your dashboard...</p>
          </>
        )}
        {status === 'failed' && (
          <>
            <XCircle size={60} style={{ color: '#ff3b30', margin: '0 auto 20px' }} />
            <h2>Verification Failed</h2>
            <p style={{ color: '#86868b' }}>We could not verify your payment. Please contact support.</p>
            <button className="btn-primary apple-btn" onClick={() => navigate('/patient/dashboard')} style={{ marginTop: '20px' }}>
              Go to Dashboard
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;

