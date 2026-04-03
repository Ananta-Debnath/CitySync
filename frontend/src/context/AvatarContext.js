import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getMyProfile } from '../services/api';

const AvatarContext = createContext(null);

export const AvatarProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [avatar, setAvatar] = useState(null);

  // Fetch avatar once on login
  const loadAvatar = useCallback(async () => {
    if (!isAuthenticated) { setAvatar(null); return; }
    try {
      const res = await getMyProfile();
      setAvatar(res.data.avatar_url || null);
      console.log(res.data.avatar_url);
    } catch {
      // non-consumer roles won't have this endpoint — silently ignore
    }
  }, [isAuthenticated]);

  useEffect(() => { loadAvatar(); }, [loadAvatar]);

  return (
    <AvatarContext.Provider value={{ avatar, setAvatar }}>
      {children}
    </AvatarContext.Provider>
  );
};

export const useAvatar = () => {
  const ctx = useContext(AvatarContext);
  if (!ctx) throw new Error('useAvatar must be inside <AvatarProvider>');
  return ctx;
};