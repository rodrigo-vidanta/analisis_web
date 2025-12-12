import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { AssignmentBadge } from '../analysis/AssignmentBadge';

interface LinearHeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  currentMode: string;
  onToggleSidebar: () => void;
}

// Partículas sutiles al cambiar tema
const ThemeParticles: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const particles = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    angle: (i * 60) * (Math.PI / 180),
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ scale: 0, x: 0, y: 0, opacity: 0.6 }}
          animate={{ 
            scale: [0, 1, 0],
            x: Math.cos(particle.angle) * 20,
            y: Math.sin(particle.angle) * 20,
            opacity: [0.6, 0.3, 0]
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`absolute left-1/2 top-1/2 w-1 h-1 rounded-full ${
            isDark ? 'bg-amber-400/70' : 'bg-slate-400/70'
          }`}
          style={{ marginLeft: -2, marginTop: -2 }}
        />
      ))}
    </div>
  );
};

// Componente del Sol discreto
const SunIcon: React.FC = () => (
  <motion.div className="relative w-5 h-5 flex items-center justify-center">
    {/* Rayos sutiles girando lentamente */}
    <motion.div
      className="absolute inset-0"
      animate={{ rotate: 360 }}
      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
    >
      <svg className="w-full h-full" viewBox="0 0 20 20" fill="none">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <motion.line
            key={i}
            x1="10"
            y1="10"
            x2={10 + Math.cos((angle * Math.PI) / 180) * 8}
            y2={10 + Math.sin((angle * Math.PI) / 180) * 8}
            stroke="#D4A854"
            strokeWidth="1.5"
            strokeLinecap="round"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </svg>
    </motion.div>
    
    {/* Centro del sol - más sutil */}
    <motion.div
      className="relative w-2.5 h-2.5 rounded-full bg-amber-400/90 z-10"
      animate={{ 
        scale: [1, 1.08, 1],
        boxShadow: [
          '0 0 4px rgba(217, 168, 84, 0.3)',
          '0 0 8px rgba(217, 168, 84, 0.5)',
          '0 0 4px rgba(217, 168, 84, 0.3)'
        ]
      }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
);

// Luna con estrellas titilantes
const MoonIcon: React.FC = () => (
  <motion.div className="relative w-5 h-5">
    {/* Estrellas titilantes alrededor - mismo tono que la luna */}
    {[
      { x: -9, y: -5, size: 2, delay: 0 },
      { x: 8, y: -7, size: 1.5, delay: 0.3 },
      { x: 7, y: 6, size: 2, delay: 0.6 },
      { x: -7, y: 5, size: 1.5, delay: 0.9 },
      { x: 0, y: -9, size: 1.5, delay: 0.2 },
    ].map((star, i) => (
      <motion.div
        key={i}
        className="absolute bg-slate-500 dark:bg-slate-400 rounded-full"
        style={{ 
          left: `calc(50% + ${star.x}px)`,
          top: `calc(50% + ${star.y}px)`,
          width: star.size,
          height: star.size
        }}
        animate={{ 
          opacity: [0.3, 1, 0.3],
          scale: [0.8, 1.2, 0.8]
        }}
        transition={{ duration: 1.5, repeat: Infinity, delay: star.delay }}
      />
    ))}
    
    {/* Luna */}
    <motion.svg 
      className="w-5 h-5 text-slate-500 dark:text-slate-400" 
      fill="currentColor" 
      viewBox="0 0 20 20"
      animate={{ rotate: [0, 3, -3, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </motion.svg>
  </motion.div>
);

const LinearHeader: React.FC<LinearHeaderProps> = ({
  darkMode,
  onToggleDarkMode,
  currentMode,
  onToggleSidebar
}) => {
  const { user, logout } = useAuth();
  const { profile } = useUserProfile();
  const [showParticles, setShowParticles] = useState(false);
  const [particleKey, setParticleKey] = useState(0);

  const handleThemeToggle = () => {
    setShowParticles(true);
    setParticleKey(prev => prev + 1);
    onToggleDarkMode();
    
    // Ocultar partículas después de la animación
    setTimeout(() => setShowParticles(false), 700);
  };

  const getModuleTitle = () => {
    switch (currentMode) {
      case 'constructor': return 'Constructor de Agentes';
      case 'plantillas': return 'Plantillas';
      case 'natalia': return 'Natalia IA';
      case 'pqnc': return 'Llamadas';
      case 'live-monitor': return 'Llamadas';
      case 'live-chat': return 'WhatsApp';
      case 'admin': return 'Administración';
      case 'campaigns': return 'Campañas';
      default: return 'PQNC AI Platform';
    }
  };

  return (
    <header className="h-16 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="h-full px-6 flex items-center justify-between">
        
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors lg:hidden"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getModuleTitle()}
            </h1>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          
          {/* Theme toggle discreto */}
          <motion.button
            onClick={handleThemeToggle}
            className="relative p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 overflow-visible"
            title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            {/* Partículas sutiles */}
            {showParticles && (
              <ThemeParticles key={particleKey} isDark={darkMode} />
            )}
            
            {/* Iconos con transición suave */}
            <AnimatePresence mode="wait">
              {darkMode ? (
                <motion.div
                  key="sun"
                  initial={{ scale: 0.8, rotate: -90, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0.8, rotate: 90, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <SunIcon />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  initial={{ scale: 0.8, rotate: 90, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0.8, rotate: -90, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <MoonIcon />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Resplandor muy sutil */}
            <motion.div
              className={`absolute inset-0 rounded-lg pointer-events-none ${
                darkMode ? 'bg-amber-400/5' : 'bg-slate-400/5'
              }`}
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.button>

          {/* User menu */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.first_name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.email}
              </p>
            </div>
            
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-white">
                {(user?.first_name || user?.email || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            
            {/* Mostrar coordinación para ejecutivos */}
            {user?.role_name === 'ejecutivo' && profile?.coordinacion_codigo && (
              <AssignmentBadge
                call={{
                  coordinacion_codigo: profile.coordinacion_codigo,
                  coordinacion_nombre: profile.coordinacion_nombre
                } as any}
                variant="header"
              />
            )}
            
            {/* Logout button */}
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
              title="Cerrar sesión"
            >
              <svg className="w-5 h-5 text-gray-500 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default LinearHeader;
