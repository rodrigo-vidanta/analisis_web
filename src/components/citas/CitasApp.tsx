import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CitasLoginScreen from './CitasLoginScreen';
import CitasHelloWorld from './CitasHelloWorld';

const CitasApp: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
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
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <CitasHelloWorld onLogout={handleLogout} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CitasApp;

