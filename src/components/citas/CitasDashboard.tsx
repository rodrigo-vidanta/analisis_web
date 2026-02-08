import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Calendar, 
  Users, 
  Settings, 
  HelpCircle, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  User
} from 'lucide-react';
import { useSystemConfig } from '../../hooks/useSystemConfig';

/**
 * CitasDashboard - Dashboard principal del Sistema de Citas Vidanta
 * Incluye sidebar con navegación y área de trabajo con fondos personalizados
 */

interface CitasDashboardProps {
  onLogout: () => void;
  userEmail?: string;
  userName?: string;
}

type MenuSection = 'inicio' | 'mis-citas' | 'destinos' | 'preferencias' | 'ayuda';

// URLs de assets - usando rutas absolutas desde public
const ASSETS = {
  workspaceLight: '/assets/citas-workspace-light.png',
  workspaceDark: '/assets/citas-workspace-dark.png',
  sidebarLight: '/assets/citas-sidebar-light.png',
  sidebarDark: '/assets/citas-sidebar-dark.png',
};

const CitasDashboard: React.FC<CitasDashboardProps> = ({ onLogout, userEmail, userName }) => {
  const [activeSection, setActiveSection] = useState<MenuSection>('inicio');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { config } = useSystemConfig();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú de usuario al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const leafLogoUrl = config.app_branding?.favicon_url;

  const menuItems: { id: MenuSection; label: string; icon: React.ReactNode }[] = [
    { id: 'inicio', label: 'Inicio', icon: <Home size={20} /> },
    { id: 'mis-citas', label: 'Mis Citas', icon: <Calendar size={20} /> },
    { id: 'destinos', label: 'Destinos', icon: <Users size={20} /> },
    { id: 'preferencias', label: 'Preferencias', icon: <Settings size={20} /> },
    { id: 'ayuda', label: 'Ayuda', icon: <HelpCircle size={20} /> },
  ];

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <>
      {/* Google Fonts */}
      <link 
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@200;300;400;500;600;700;800;900&display=swap" 
        rel="stylesheet" 
      />

      <div className={`min-h-screen flex ${darkMode ? 'dark' : ''}`}>
        {/* ===== SIDEBAR ===== */}
        <motion.aside
          initial={false}
          animate={{ width: sidebarCollapsed ? 80 : 280 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="relative flex flex-col h-screen overflow-hidden"
        >
          {/* Imagen de fondo del sidebar - recortada a la franja izquierda */}
          <img 
            src={darkMode ? ASSETS.sidebarDark : ASSETS.sidebarLight}
            alt="Sidebar background"
            className="absolute inset-0 w-full h-full object-cover object-left"
          />
          {/* Overlay para legibilidad - Solo en modo oscuro, el modo claro no necesita overlay */}
          {darkMode && <div className="absolute inset-0 bg-gray-900/50" />}

          {/* Contenido del Sidebar */}
          <div className="relative z-10 flex flex-col h-full p-4">
            {/* Logo y título - bajado con mt-4 */}
            <motion.div 
              className="flex items-center space-x-3 mt-4 mb-8 px-2"
              animate={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
            >
              <div 
                className="flex-shrink-0"
                style={{
                  filter: `
                    drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))
                    drop-shadow(0 0 16px rgba(255, 255, 255, 0.5))
                  `,
                }}
              >
                {leafLogoUrl ? (
                  <img src={leafLogoUrl} alt="Logo" className="h-10 w-auto" />
                ) : (
                  <svg className="w-10 h-10 text-teal-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
                  </svg>
                )}
              </div>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p 
                      className={`text-xs uppercase tracking-[0.2em] ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                      style={{ 
                        fontFamily: "'Montserrat', sans-serif", 
                        fontWeight: 600,
                        textShadow: darkMode 
                          ? '0 0 10px rgba(255, 255, 255, 0.3), 0 0 20px rgba(255, 255, 255, 0.15)' 
                          : '0 0 8px rgba(255, 255, 255, 0.6), 0 0 16px rgba(255, 255, 255, 0.4)'
                      }}
                    >
                      Vacation Planner
                    </p>
                    <p 
                      className={`text-[10px] uppercase tracking-[0.15em] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                      style={{ 
                        fontFamily: "'Montserrat', sans-serif", 
                        fontWeight: 400,
                        textShadow: darkMode 
                          ? '0 0 8px rgba(255, 255, 255, 0.2)' 
                          : '0 0 6px rgba(255, 255, 255, 0.5)'
                      }}
                    >
                      Confirmación
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Menú de navegación */}
            <nav className="flex-1 space-y-2">
              {menuItems.map((item) => (
                <motion.button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${activeSection === item.id 
                      ? darkMode 
                        ? 'bg-teal-600/80 text-white shadow-lg' 
                        : 'bg-teal-500/90 text-white shadow-lg'
                      : darkMode
                        ? 'text-gray-300 hover:bg-gray-800/50'
                        : 'text-gray-700 hover:bg-white/50'
                    }
                    ${sidebarCollapsed ? 'justify-center' : ''}
                  `}
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="text-sm font-medium"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}
            </nav>

            {/* Footer del sidebar */}
            <div className="space-y-2 pt-4 border-t border-gray-300/30">
              {/* Toggle Dark Mode */}
              <button
                onClick={toggleDarkMode}
                className={`
                  w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all
                  ${darkMode ? 'text-gray-300 hover:bg-gray-800/50' : 'text-gray-700 hover:bg-white/50'}
                  ${sidebarCollapsed ? 'justify-center' : ''}
                `}
              >
                <span>{darkMode ? <Sun size={20} /> : <Moon size={20} />}</span>
                {!sidebarCollapsed && (
                  <span className="text-sm" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {darkMode ? 'Modo Claro' : 'Modo Oscuro'}
                  </span>
                )}
              </button>

              {/* Logout */}
              <button
                onClick={onLogout}
                className={`
                  w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all
                  ${darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50/50'}
                  ${sidebarCollapsed ? 'justify-center' : ''}
                `}
              >
                <LogOut size={20} />
                {!sidebarCollapsed && (
                  <span className="text-sm" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    Cerrar sesión
                  </span>
                )}
              </button>
            </div>

            {/* Toggle Sidebar */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`
                absolute top-1/2 -right-3 transform -translate-y-1/2 z-20
                w-6 h-6 rounded-full flex items-center justify-center
                ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'}
                shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}
                hover:scale-110 transition-transform
              `}
            >
              {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>
        </motion.aside>

        {/* ===== ÁREA DE TRABAJO ===== */}
        <main className="flex-1 relative overflow-auto">
          {/* Capa de fondo - z-index 0 */}
          <div className="absolute inset-0" style={{ zIndex: 0 }}>
            {/* Imagen de fondo del área de trabajo - opacidad reducida en modo claro */}
            <img 
              src={darkMode ? ASSETS.workspaceDark : ASSETS.workspaceLight}
              alt="Workspace background"
              className="w-full h-full object-cover"
              style={{ opacity: darkMode ? 1 : 0.6 }}
            />
            {/* Overlay solo en modo oscuro */}
            {darkMode && <div className="absolute inset-0 pointer-events-none bg-gray-900/20" />}
          </div>

          {/* Header del área de trabajo - z-index 30 para estar sobre todo */}
          <header className="relative flex items-center justify-between px-8 py-4" style={{ zIndex: 30 }}>
            <div>
              <h1 
                className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {menuItems.find(m => m.id === activeSection)?.label}
              </h1>
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`
                  flex items-center space-x-3 px-4 py-2 rounded-xl transition-all
                  ${darkMode ? 'bg-gray-800/70 hover:bg-gray-800' : 'bg-white/70 hover:bg-white'}
                  backdrop-blur-sm shadow-lg
                `}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-teal-600' : 'bg-teal-500'}`}>
                  <User size={16} className="text-white" />
                </div>
                <span 
                  className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {userName || userEmail || 'Usuario'}
                </span>
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`
                      absolute right-0 top-full mt-2 w-56 rounded-xl shadow-xl overflow-hidden z-50
                      ${darkMode ? 'bg-gray-800' : 'bg-white'}
                    `}
                  >
                    <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                      <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {userName || 'Usuario'}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {userEmail}
                      </p>
                    </div>
                    <button
                      onClick={onLogout}
                      className={`
                        w-full px-4 py-3 text-left text-sm flex items-center space-x-2
                        ${darkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-gray-50'}
                      `}
                    >
                      <LogOut size={16} />
                      <span>Cerrar sesión</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </header>

          {/* Contenido principal - z-index menor que header para que el menú no quede debajo */}
          <div className="relative p-8" style={{ zIndex: 5 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {activeSection === 'inicio' && (
                  <div className="space-y-6">
                    <div 
                      className={`
                        p-6 rounded-2xl backdrop-blur-sm
                        ${darkMode ? 'bg-gray-800/60' : 'bg-white/60'}
                        shadow-xl
                      `}
                    >
                      <h2 
                        className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        ¡Bienvenido al Sistema de Citas!
                      </h2>
                      <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Desde aquí podrás gestionar todas tus citas y reservaciones con Vidanta.
                      </p>
                    </div>

                    {/* Cards de resumen */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[
                        { title: 'Próximas Citas', value: '3', color: 'teal' },
                        { title: 'Citas Completadas', value: '12', color: 'emerald' },
                        { title: 'Destinos Visitados', value: '5', color: 'blue' },
                      ].map((card, i) => (
                        <motion.div
                          key={card.title}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`
                            p-6 rounded-2xl backdrop-blur-sm
                            ${darkMode ? 'bg-gray-800/60' : 'bg-white/60'}
                            shadow-lg
                          `}
                        >
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {card.title}
                          </p>
                          <p 
                            className={`text-3xl font-bold mt-2 text-${card.color}-500`}
                            style={{ fontFamily: "'Montserrat', sans-serif" }}
                          >
                            {card.value}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {activeSection === 'mis-citas' && (
                  <div 
                    className={`
                      p-6 rounded-2xl backdrop-blur-sm
                      ${darkMode ? 'bg-gray-800/60' : 'bg-white/60'}
                      shadow-xl
                    `}
                  >
                    <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      Mis Citas
                    </h2>
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Aquí aparecerán todas tus citas programadas.
                    </p>
                  </div>
                )}

                {activeSection === 'destinos' && (
                  <div 
                    className={`
                      p-6 rounded-2xl backdrop-blur-sm
                      ${darkMode ? 'bg-gray-800/60' : 'bg-white/60'}
                      shadow-xl
                    `}
                  >
                    <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      Destinos
                    </h2>
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Explora los destinos disponibles para tus vacaciones.
                    </p>
                  </div>
                )}

                {activeSection === 'preferencias' && (
                  <div 
                    className={`
                      p-6 rounded-2xl backdrop-blur-sm
                      ${darkMode ? 'bg-gray-800/60' : 'bg-white/60'}
                      shadow-xl
                    `}
                  >
                    <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      Preferencias
                    </h2>
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Configura tus preferencias de notificaciones y cuenta.
                    </p>
                  </div>
                )}

                {activeSection === 'ayuda' && (
                  <div 
                    className={`
                      p-6 rounded-2xl backdrop-blur-sm
                      ${darkMode ? 'bg-gray-800/60' : 'bg-white/60'}
                      shadow-xl
                    `}
                  >
                    <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      Centro de Ayuda
                    </h2>
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      ¿Necesitas ayuda? Contáctanos o revisa nuestras preguntas frecuentes.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </>
  );
};

export default CitasDashboard;

