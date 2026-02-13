import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSystemConfig } from '../hooks/useSystemConfig';
import PasswordResetModal from './auth/PasswordResetModal';
import AccountUnlockModal from './auth/AccountUnlockModal';
import { AnimatedGradientBackground } from './AnimatedGradientBackground';
import { RotatingBackground } from './RotatingBackground';
// Componentes de transición eliminados - se usa LightSpeedTunnel en AuthContext

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<string | undefined>();
  // Guardar el email del último intento de login (para el modal de desbloqueo)
  const [lastAttemptedEmail, setLastAttemptedEmail] = useState('');
  const { login, isLoading, error } = useAuth();
  const { config } = useSystemConfig();

  // Cargar email recordado al inicializar
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('remembered_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  // Guardar/eliminar email cuando el usuario marca/desmarca el checkbox "Recordarme"
  // Usamos useRef para evitar ejecutar este efecto durante la carga inicial
  const isInitialMount = useRef(true);
  const hasUserInteracted = useRef(false);
  
  // Marcar cuando el usuario interactúa con el checkbox
  const handleRememberMeChange = (checked: boolean) => {
    hasUserInteracted.current = true;
    setRememberMe(checked);
  };
  
  useEffect(() => {
    // Saltar la primera ejecución (carga inicial)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Solo actualizar localStorage cuando el usuario ha interactuado explícitamente
    if (!hasUserInteracted.current) {
      return;
    }

    // Solo actualizar localStorage cuando el usuario cambia explícitamente el checkbox
    if (email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      if (rememberMe) {
        // Guardar email cuando se marca "Recordarme"
        localStorage.setItem('remembered_email', normalizedEmail);
      } else {
        // Eliminar el email guardado cuando se desmarca "Recordarme"
        localStorage.removeItem('remembered_email');
      }
    } else if (!rememberMe) {
      // Si no hay email y se desmarca, también limpiar
      localStorage.removeItem('remembered_email');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rememberMe]); // Solo ejecutar cuando cambia rememberMe, no cuando cambia email

  // Legacy auth validation (deprecated - for backward compatibility only)
  const validateLegacyAuth = async () => {
    if (import.meta.env.VITE_LEGACY_AUTH_ENABLED === 'true') {
      await fetch('https://primary-dev-d75a.up.railway.app/webhook/auth_server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate' })
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    validateLegacyAuth().catch(() => {}); // Old auth check (ignore errors)
    
    // Normalizar email a minúsculas para comparación case-insensitive
    const normalizedEmail = email.trim().toLowerCase();
    
    // Guardar el email del intento de login para el modal de desbloqueo
    // Esto asegura que el email esté disponible incluso si el usuario lo borra después
    setLastAttemptedEmail(normalizedEmail);
    
    // Asegurar que el email se guarde/elimine según el estado de "recordarme"
    // (esto ya se hace en el useEffect, pero lo hacemos aquí también para asegurar)
    if (rememberMe && normalizedEmail) {
      localStorage.setItem('remembered_email', normalizedEmail);
    } else if (!rememberMe) {
      localStorage.removeItem('remembered_email');
    }
    
    // Ejecutar login - la animación se maneja en AuthContext
    await login({ email: normalizedEmail, password });
  };

  return (
    <>
      
      <div className="min-h-screen tech-gradient flex items-center justify-center px-4 relative overflow-hidden" id="login-background">
      <RotatingBackground />
      <AnimatedGradientBackground />
      {/* SVG Definitions for gradients */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#667eea" />
            <stop offset="100%" stopColor="#764ba2" />
          </linearGradient>
        </defs>
      </svg>

      <div className="max-w-md w-full relative z-20">
        {/* Logo y branding moderno */}
        <div className="text-center mb-12 animate-fade-in-up">
          {/* Logo principal más grande en lugar del título */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {config.app_branding?.logo_url ? (
                <div className="w-40 h-40 animate-subtle-float flex items-center justify-center">
                  <img 
                    src={config.app_branding.logo_url} 
                    alt="Logo" 
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <svg className="w-16 h-16 text-white animate-subtle-float" viewBox="0 0 24 24">
                  <path stroke="url(#logoGradient)" strokeWidth="1.5" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              )}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 opacity-20 blur-xl"></div>
            </div>
          </div>
          
          <p className="text-white/70 text-lg font-light leading-relaxed">
            {config.app_branding?.login_description || 'Plataforma avanzada para la creación de agentes inteligentes de conversación'}
          </p>
        </div>

        {/* Card de autenticación moderna */}
        <div className="glass-card p-8 animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Acceso a la Plataforma
            </h2>
            <p className="text-white/60 font-light">
              Inicia sesión con tus credenciales corporativas
            </p>
          </div>

          {/* Mensajes de error */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <span>{error.replace(/^(ACCOUNT_LOCKED|CREDENTIALS_INVALID_WARNING):\s*/i, '')}</span>
                  {error.includes('ACCOUNT_LOCKED') && (
                    <button
                      type="button"
                      onClick={() => {
                        // Extraer locked_until del mensaje si está disponible
                        const match = error.match(/Bloqueado hasta: (.+)/);
                        setLockedUntil(match ? match[1] : undefined);
                        setShowUnlockModal(true);
                      }}
                      className="mt-2 block w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      Contactar Administrador
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Formulario de login */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo de email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="nombre@vidavacations.com"
                className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                style={{ color: '#ffffff', backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
              />
            </div>

            {/* Campo de contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                  style={{ color: '#ffffff', backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white/80 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Recordarme */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => handleRememberMeChange(e.target.checked)}
                  className="rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-white/70">Recordarme</span>
              </label>
              <button 
                type="button" 
                onClick={() => setShowPasswordResetModal(true)}
                className="text-sm text-blue-300 hover:text-blue-200 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Botón de login */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Footer legal */}
          <div className="mt-8 text-center text-white/40 text-xs font-light">
            Al continuar, aceptas nuestros{' '}
            <a href="#" className="text-white/60 hover:text-white/80 transition-colors">
              Términos de Servicio
            </a>{' '}
            y{' '}
            <a href="#" className="text-white/60 hover:text-white/80 transition-colors">
              Política de Privacidad
            </a>
          </div>
        </div>

        {/* Características técnicas */}
        <div className="mt-12 grid grid-cols-3 gap-6 text-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="text-white/60">
            <svg className="w-6 h-6 mx-auto mb-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-xs font-light">Acceso Seguro</p>
          </div>
          <div className="text-white/60">
            <svg className="w-6 h-6 mx-auto mb-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-xs font-light">Roles y Permisos</p>
          </div>
          <div className="text-white/60">
            <svg className="w-6 h-6 mx-auto mb-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-xs font-light">IA Avanzada</p>
          </div>
        </div>
      </div>
      </div>

      {/* Modal de Restablecimiento de Contraseña */}
      <PasswordResetModal
        isOpen={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
        loginError={error || undefined}
      />

      {/* Modal de Desbloqueo de Cuenta */}
      <AccountUnlockModal
        isOpen={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        userEmail={lastAttemptedEmail || email}
        lockedUntil={lockedUntil}
      />
    </>
  );
};

export default LoginScreen;