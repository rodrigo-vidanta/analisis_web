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
 * ⚠️ FIX 5 Febrero 2026:
 * - Usa refs para logout y user para evitar re-creación del callback
 * - Esto estabiliza el setInterval (antes se reiniciaba en cada render
 *   porque logout no estaba memoizado, causando que el monitor nunca
 *   completara un ciclo de 5 minutos)
 * 
 * Fecha: 30 Enero 2026 (actualizado 5 Febrero 2026)
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

  // Refs estables para evitar re-creación del callback
  const logoutRef = useRef(logout);
  const userRef = useRef(user);
  useEffect(() => { logoutRef.current = logout; }, [logout]);
  useEffect(() => { userRef.current = user; }, [user]);

  const checkAndRefreshToken = useCallback(async () => {
    if (!supabaseSystemUI || !userRef.current) return;

    try {
      const { data: { session }, error } = await supabaseSystemUI.auth.getSession();
      
      if (error || !session) {
        // Actualizar is_operativo a false antes de logout
        const currentUser = userRef.current;
        if (currentUser?.id) {
          try {
            await supabaseSystemUI.rpc('update_user_metadata', {
              p_user_id: currentUser.id,
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
        await logoutRef.current();
        return;
      }

      const expiresAt = session.expires_at;
      if (!expiresAt) return;

      const expiryTime = expiresAt * 1000; // Convertir a ms
      const now = Date.now();
      const timeUntilExpiry = expiryTime - now;

      // Token ya expirado
      if (timeUntilExpiry <= 0) {
        const { error: refreshError } = await supabaseSystemUI.auth.refreshSession();
        
        if (refreshError) {
          console.error('❌ [TokenMonitor] Refresh falló:', refreshError);
          
          // Actualizar is_operativo a false antes de logout
          const currentUser = userRef.current;
          if (currentUser?.id) {
            try {
              await supabaseSystemUI.rpc('update_user_metadata', {
                p_user_id: currentUser.id,
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
          await logoutRef.current();
        } else {
          hasWarnedRef.current = false;
        }
        return;
      }

      // Token próximo a expirar (menos de 10 minutos)
      if (timeUntilExpiry < REFRESH_THRESHOLD) {
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
          hasWarnedRef.current = false;
        }
      }

    } catch (error) {
      console.error('❌ [TokenMonitor] Error verificando token:', error);
    }
  }, []); // Sin deps: usa refs internamente

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

    // Configurar intervalo de verificación (estable, no se reinicia en re-renders)
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
        checkAndRefreshToken();
      }
    };

    const handleFocus = () => {
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
