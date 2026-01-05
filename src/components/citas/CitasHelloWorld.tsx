import React from 'react';
import { motion } from 'framer-motion';

interface CitasHelloWorldProps {
  onLogout: () => void;
}

const CitasHelloWorld: React.FC<CitasHelloWorldProps> = ({ onLogout }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-5xl font-bold text-gray-800 mb-4">
          ¡Hola Mundo!
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Bienvenido al sistema de citas
        </p>
        <button
          onClick={onLogout}
          className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-colors"
        >
          Cerrar sesión
        </button>
      </motion.div>
    </div>
  );
};

export default CitasHelloWorld;

