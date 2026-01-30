/**
 * ============================================
 * HOOK: Monitor de Expiración de Token
 * ============================================
 * 
 * Monitorea proactivamente el estado del token JWT y:
 * 1. Verifica cada 5 minutos si el token está próximo a expirar
 * 2. Intenta refrescar automáticamente si quedan menos de 10 minutos
 * 3. Fuerza logout si el refresh falla
 * 
 * Fecha: 30 Enero 2026
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// Constantes de tiempo (en milisegundos)
const CHECK_INTERVAL = 5 * 60 * 1000; // Verificar cada 5 minutos
const REFRESH_THRESHOLD = 10 * 60 * 1000; // Refrescar si quedan menos de 10 minutos
const WARNING_THRESHOLD = 5 * 60 * 1000; // Advertir si quedan menos de 5 minutos

export const useTokenExpiryMonitor = () => {
  const { user, logout } = useAuth();
  const isAuthenticated = !!user;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasWarnedRef = useRef(false);

  const checkAndRefreshToken = useCallback(async () => {
    if (!supabaseSystemUI || !isAuthenticated) return;

    try {
      const { data: { session }, error } = await supabaseSystemUI.auth.getSession();
      
      if (error || !session) {
        console.log('🔐 [TokenMonitor] No hay sesión activa, forzando logout...');
        
        // Actualizar is_operativo a false antes de logout
        if (user?.id) {
          try {
            await supabaseSystemUI.rpc('update_user_metadata', {
              p_user_id: user.id,
              p_updates: { is_operativo: false }
            });
          } catch (metadataError) {
            console.error('Error actualizando is_operativo en expiración:', metadataError);
          }
        }
        
        toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', {
          duration: 5000,
          icon: '🔐'
        });
        await logout();
        return;
      }

      const expiresAt = session.expires_at;
      if (!expiresAt) return;

      const expiryTime = expiresAt * 1000; // Convertir a ms
      const now = Date.now();
      const timeUntilExpiry = expiryTime - now;

      // Token ya expirado
      if (timeUntilExpiry <= 0) {
        console.log('🔐 [TokenMonitor] Token expirado, intentando refrescar...');
        const { error: refreshError } = await supabaseSystemUI.auth.refreshSession();
        
        if (refreshError) {
          console.error('❌ [TokenMonitor] Refresh falló:', refreshError);
          
          // Actualizar is_operativo a false antes de logout
          if (user?.id) {
            try {
              await supabaseSystemUI.rpc('update_user_metadata', {
                p_user_id: user.id,
                p_updates: { is_operativo: false }
              });
            } catch (metadataError) {
              console.error('Error actualizando is_operativo en expiración:', metadataError);
            }
          }
          
          toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', {
            duration: 5000,
            icon: '🔐'
          });
          await logout();
        } else {
          console.log('✅ [TokenMonitor] Token refrescado exitosamente');
          hasWarnedRef.current = false;
        }
        return;
      }

      // Token próximo a expirar (menos de 10 minutos)
      if (timeUntilExpiry < REFRESH_THRESHOLD) {
        console.log(`🔄 [TokenMonitor] Token expira en ${Math.round(timeUntilExpiry / 60000)} minutos, refrescando...`);
        const { error: refreshError } = await supabaseSystemUI.auth.refreshSession();
        
        if (refreshError) {
          console.error('⚠️ [TokenMonitor] Refresh preventivo falló:', refreshError);
          
          // Si quedan menos de 5 minutos y no hemos advertido, mostrar warning
          if (timeUntilExpiry < WARNING_THRESHOLD && !hasWarnedRef.current) {
            hasWarnedRef.current = true;
            toast('Tu sesión está por expirar. Guarda tu trabajo.', {
              duration: 10000,
              icon: '⚠️',
              style: { background: '#fef3c7', color: '#92400e' }
            });
          }
        } else {
          console.log('✅ [TokenMonitor] Token refrescado preventivamente');
          hasWarnedRef.current = false;
        }
      }

    } catch (error) {
      console.error('❌ [TokenMonitor] Error verificando token:', error);
    }
  }, [isAuthenticated, logout, user]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Limpiar intervalo si no hay usuario
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      hasWarnedRef.current = false;
      return;
    }

    // Verificar inmediatamente al montar
    checkAndRefreshToken();

    // Configurar intervalo de verificación
    intervalRef.current = setInterval(checkAndRefreshToken, CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, checkAndRefreshToken]);

  // También verificar cuando la ventana recupera el foco
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ [TokenMonitor] Ventana visible, verificando token...');
        checkAndRefreshToken();
      }
    };

    const handleFocus = () => {
      console.log('👁️ [TokenMonitor] Ventana en foco, verificando token...');
      checkAndRefreshToken();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, checkAndRefreshToken]);

  return { checkAndRefreshToken };
};

export default useTokenExpiryMonitor;
