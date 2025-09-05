import { useState, useEffect } from 'react';

interface User {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  uid: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Verificar si hay una sesión demo activa
    const demoSession = localStorage.getItem('demo-session');
    if (demoSession) {
      setIsAuthenticated(true);
      setUser({
        displayName: 'Usuario Demo',
        email: 'demo@example.com',
        photoURL: null,
        uid: 'demo-user'
      });
    }
    setLoading(false);
  }, []);

  const loginDemo = () => {
    localStorage.setItem('demo-session', 'true');
    setIsAuthenticated(true);
    setUser({
      displayName: 'Usuario Demo',
      email: 'demo@example.com',
      photoURL: null,
      uid: 'demo-user'
    });
  };

  const logout = () => {
    localStorage.removeItem('demo-session');
    setIsAuthenticated(false);
    setUser(null);
  };

  return {
    user,
    loading,
    isAuthenticated,
    loginDemo,
    logout
  };
};