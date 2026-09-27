import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
      }
    } catch (err) {
      console.error('Failed to fetch current user:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (mobile, password) => {
    const res = await axios.post('/api/auth/login', { mobile, password });
    if (res.data.success) {
      const newToken = res.data.token;
      localStorage.setItem('token', newToken);
      // Synchronously attach header before state update
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(res.data.user);
      return res.data;
    }
  };

  const register = async (name, mobile, password, role = 'CUSTOMER') => {
    const res = await axios.post('/api/auth/register', { name, mobile, password, role });
    if (res.data.success) {
      const newToken = res.data.token;
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(res.data.user);
      return res.data;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken('');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
