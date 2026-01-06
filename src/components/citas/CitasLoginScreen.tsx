import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSystemConfig } from '../../hooks/useSystemConfig';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

/**
 * CitasLoginScreen - Sistema de Citas Vidanta
 * Vacation Planner Confirmación
 * 
 * Usa el mismo sistema de autenticación que el proyecto principal
 */

interface CitasLoginScreenProps {
  onLoginSuccess: (user: { email: string; name: string }) => void;
}

const BACKGROUND_IMAGE_URL = '/assets/citas-background-beach.png';
const LOGIN_SUCCESS_AUDIO_URL = '/assets/citas-login-success.mp3';

const CitasLoginScreen: React.FC<CitasLoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { config } = useSystemConfig();

  // Función para reproducir audio de éxito
  const playLoginSuccessSound = () => {
    try {
      const audio = new Audio(LOGIN_SUCCESS_AUDIO_URL);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {
      // Silenciar errores
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Usar el authService real del proyecto principal
      const result = await authService.login({ email, password });
      
      if (result.isAuthenticated && result.user) {
        playLoginSuccessSound();
        toast.success(`¡Bienvenido, ${result.user.first_name}!`);
        onLoginSuccess({
          email: result.user.email,
          name: result.user.full_name || result.user.first_name
        });
      } else {
        setError(result.error || 'Credenciales incorrectas');
        toast.error(result.error || 'Credenciales incorrectas');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Logo de la hoja (favicon)
  const leafLogoUrl = config.app_branding?.favicon_url;

  return (
    <>
      {/* Google Fonts */}
      <link 
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@200;300;400;500;600;700;800;900&display=swap" 
        rel="stylesheet" 
      />
      
      <div className="min-h-screen w-full relative overflow-hidden">
        {/* ===== FONDO DE IMAGEN COMPLETO ===== */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${BACKGROUND_IMAGE_URL})` }}
        />

        {/* ===== CONTENIDO PRINCIPAL ===== */}
        <div className="relative z-10 min-h-screen flex">
          
          {/* ===== LADO IZQUIERDO - BRANDING (50%) ===== */}
          <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16 pl-16 xl:pl-24">
            
            {/* Logo superior + título */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center space-x-4"
            >
              {/* Logo de la hoja con RESPLANDOR INTENSO para destacar del fondo */}
              <div 
                className="relative"
                style={{
                  filter: `
                    drop-shadow(0 0 12px rgba(255, 255, 255, 0.9))
                    drop-shadow(0 0 20px rgba(255, 255, 255, 0.7))
                    drop-shadow(0 0 30px rgba(255, 255, 255, 0.5))
                    drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))
                  `,
                }}
              >
                {leafLogoUrl ? (
                  <img 
                    src={leafLogoUrl} 
                    alt="Logo" 
                    className="h-14 w-auto object-contain"
                  />
                ) : (
                  <svg 
                    className="w-12 h-12 text-teal-600" 
                    viewBox="0 0 24 24" 
                    fill="currentColor"
                  >
                    <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
                  </svg>
                )}
              </div>
              <div>
                <p 
                  className="text-base text-gray-700 uppercase tracking-[0.3em]"
                  style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
                >
                  Vacation Planner
                </p>
                <p 
                  className="text-sm text-gray-600 uppercase tracking-[0.25em]"
                  style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 400 }}
                >
                  Confirmación
                </p>
              </div>
            </motion.div>

            {/* Contenido central - ALINEACIÓN DESFASADA SIMÉTRICA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-left"
            >
              {/* Comienza a - alineado con línea izquierda */}
              <p 
                className="text-lg text-gray-600 uppercase tracking-[0.25em] mb-1"
                style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
              >
                Comienza a
              </p>
              {/* PLANIFICAR - alineado con línea izquierda */}
              <h1 
                className="text-5xl xl:text-6xl 2xl:text-7xl text-gray-600 leading-none tracking-tight"
                style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}
              >
                PLANIFICAR
              </h1>
              {/* TUS CITAS - desfasado hacia la derecha */}
              <h1 
                className="text-5xl xl:text-6xl 2xl:text-7xl text-gray-600 leading-none tracking-tight ml-12 xl:ml-16"
                style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}
              >
                TUS CITAS
              </h1>
            </motion.div>

            {/* Footer vacío */}
            <div className="h-8" />
          </div>

          {/* ===== LADO DERECHO - ÁREA TRANSLÚCIDA 20% ===== */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-full lg:w-1/2 min-h-screen flex flex-col items-center justify-center p-8 lg:p-16"
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div className="w-full max-w-sm flex-1 flex flex-col justify-center">
              
              {/* Título */}
              <div className="mb-10">
                <h2 
                  className="text-2xl text-gray-800 mb-1 tracking-wide"
                  style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}
                >
                  Bienvenido,
                </h2>
                <p 
                  className="text-sm text-gray-500 tracking-wide"
                  style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 300 }}
                >
                  Inicia sesión para continuar
                </p>
              </div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Formulario */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-white/80 border border-gray-200/60 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400 transition-all text-sm disabled:opacity-50"
                  style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 400 }}
                />

                {/* Password */}
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-white/80 border border-gray-200/60 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400 transition-all text-sm pr-12 disabled:opacity-50"
                    style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 400 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Botón */}
                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={isLoading || !email || !password}
                    className="px-8 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center space-x-2"
                    style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
                  >
                    {isLoading && (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    <span>{isLoading ? 'Iniciando...' : 'Iniciar sesión'}</span>
                  </button>
                </div>
              </form>

              {/* Links */}
              <div className="flex items-center space-x-6 mt-8">
                <button 
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 400 }}
                >
                  Registrarse
                </button>
                <button 
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 400 }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Divider */}
              <div className="my-8 border-t border-gray-300/50" />

              {/* Login con Office365 */}
              <div>
                <p 
                  className="text-xs text-gray-400 mb-4 uppercase tracking-wider"
                  style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 300 }}
                >
                  Iniciar sesión con
                </p>
                <button 
                  type="button"
                  className="w-full flex items-center justify-center space-x-3 px-4 py-3 bg-white/80 hover:bg-white border border-gray-200/60 rounded-xl transition-all shadow-sm hover:shadow-md"
                >
                  {/* Office365 logo */}
                  <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
                    <rect width="9.5" height="9.5" fill="#F25022"/>
                    <rect x="11" width="9.5" height="9.5" fill="#7FBA00"/>
                    <rect y="11" width="9.5" height="9.5" fill="#00A4EF"/>
                    <rect x="11" y="11" width="9.5" height="9.5" fill="#FFB900"/>
                  </svg>
                  <span 
                    className="text-sm text-gray-700"
                    style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
                  >
                    Office 365
                  </span>
                </button>
              </div>
            </div>

            {/* Slogan */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="mt-8 text-center"
            >
              <p 
                className="text-sm text-gray-500 tracking-wide"
                style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
              >
                Estamos emocionados de ayudarte a generar las mejores experiencias
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* ===== BRANDING MÓVIL ===== */}
        <div className="lg:hidden fixed top-6 left-6 z-20">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-2"
          >
            <div 
              style={{ 
                filter: `
                  drop-shadow(0 0 10px rgba(255, 255, 255, 0.9))
                  drop-shadow(0 0 16px rgba(255, 255, 255, 0.6))
                  drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))
                `
              }}
            >
              {leafLogoUrl ? (
                <img 
                  src={leafLogoUrl} 
                  alt="Logo" 
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <svg 
                  className="w-10 h-10 text-teal-600" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
                </svg>
              )}
            </div>
            <div>
              <p 
                className="text-xs text-gray-700 uppercase tracking-widest"
                style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
              >
                Vacation Planner
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default CitasLoginScreen;
