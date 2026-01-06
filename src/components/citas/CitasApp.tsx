import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import CitasLoginScreen from './CitasLoginScreen';
import CitasDashboard from './CitasDashboard';
import { authService } from '../../services/authService';

/**
 * CitasApp - Aplicación principal del Sistema de Citas Vidanta
 * 
 * Maneja la autenticación y navegación entre login y dashboard.
 * Usa el mismo sistema de autenticación que el proyecto principal.
 */

interface UserData {
  email: string;
  name: string;
}

const CitasApp: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

  // Verificar sesión existente al cargar
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const state = await authService.initialize();
        if (state.isAuthenticated && state.user) {
          setIsAuthenticated(true);
          setUserData({
            email: state.user.email,
            name: state.user.full_name || state.user.first_name
          });
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  const handleLoginSuccess = (user: UserData) => {
    setUserData(user);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    }
    setIsAuthenticated(false);
    setUserData(null);
  };

  // Loading inicial
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Cargando...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* Toast notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: "'Montserrat', sans-serif",
          },
        }}
      />

      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CitasLoginScreen onLoginSuccess={handleLoginSuccess} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CitasDashboard 
              onLogout={handleLogout}
              userEmail={userData?.email}
              userName={userData?.name}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CitasApp;
