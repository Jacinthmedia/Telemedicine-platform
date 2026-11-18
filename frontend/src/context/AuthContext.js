import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from '../api/axios';


const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const res = await axios.get('/auth/me/');
          setUser(res.data);
        } catch (err) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const res = await axios.post('/auth/login/', { username, password });
      const { access, refresh } = res.data.data.tokens;
      
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      setUser(res.data.data.user);
      
      return { success: true };
    } catch (error) {
      console.error('Login Error:', error);
      return { 
        success: false, 
        error: 'Incorrect username or password. Please try again.' 
      };
    }
  };

  const register = async (data) => {
    try {
      await axios.post('/auth/register/', data);
      return { success: true };
    } catch (error) {
      if (error.response?.data?.username) {
        return { success: false, error: 'This username is already taken.' };
      }
      if (error.response?.data?.email) {
        return { success: false, error: 'This email is already registered.' };
      }
      return { success: false, error: 'Registration failed. Please check your details.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
