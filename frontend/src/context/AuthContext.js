import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('citysync_token'));
  const [loading, setLoading] = useState(true);

  // Keep a ref so authFetch always sees the latest token without
  // needing token in its dependency array (avoids circular deps).
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  /* ── authFetch — stable reference, reads token from ref ── */
  const authFetch = useCallback(async (url, options = {}) => {
    const res = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRef.current}`,
        ...options.headers,
      },
    });
    if (res.status === 401) {
      localStorage.removeItem('citysync_token');
      setToken(null);
      setUser(null);
      throw new Error('Session expired. Please log in again.');
    }
    return res;
  }, []);

  /* ── Fetch user profile from server ── */
  const fetchUser = useCallback(async (tkn) => {
    const active = tkn ?? tokenRef.current;
    if (!active) { setUser(null); setLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}/api/consumer/me`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${active}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch user');
      const data = await res.json();
      const role = (typeof active === 'string') ? (jwtDecode(active)?.role ?? null) : null;
      // Normalise to camelCase so Navbar / Sidebar work seamlessly
      setUser({
        ...data,
        firstName: data.first_name,
        lastName:  data.last_name,
        role,
      });
      return role;
    } catch (err) {
      console.error('Fetch user error:', err);
      localStorage.removeItem('citysync_token');
      setToken(null);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── On mount: if a saved token exists, fetch user from server ── */
  useEffect(() => {
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── login — persist token, then fetch user, return role ── */
  const login = useCallback(async (tokenValue) => {
    localStorage.setItem('citysync_token', tokenValue);
    tokenRef.current = tokenValue;
    setToken(tokenValue);
    const role = await fetchUser(tokenValue);
    return role;
  }, [fetchUser]);

  /* ── logout — clear everything ── */
  const logout = useCallback(() => {
    localStorage.removeItem('citysync_token');
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = !!token;
  const role = user?.role ?? null;

  const getHomePath = useCallback((r) => {
    const effective = r ?? user?.role;
    switch (effective) {
      case 'employee':     return '/employee/dashboard';
      case 'field_worker': return '/field-worker/dashboard';
      case 'consumer':     return '/consumer/dashboard';
      default:             return '/login';
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, token, loading, role,
      login, logout, authFetch,
      isAuthenticated,
      getHomePath,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
};

export default AuthContext;