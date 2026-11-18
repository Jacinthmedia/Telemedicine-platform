import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context
import { AuthProvider } from './context/AuthContext';

// Routes
import AppRoutes from './routes';

// Styles
import './styles/variables.css';
import './styles/globals.css';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <AppRoutes />
          <ToastContainer position="bottom-right" autoClose={5000} />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;