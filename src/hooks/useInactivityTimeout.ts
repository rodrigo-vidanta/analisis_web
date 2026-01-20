import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabaseSystemUI } from '../config/supabaseSystemUI';

/**
 * Hook para detectar inactividad del usuario y hacer logout automático
 * Después de 2 horas de inactividad, hace logout y marca ejecutivos como no operativos
 */
export const useInactivityTimeout = () => {
  const authContext = useAuth();
  const { user, logout } = authContext;
  const isAuthenticated = !!user; // Verificar autenticación basado en si hay usuario
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const userRef = useRef(user); // Ref para mantener referencia al usuario actual

  // Actualizar ref cuando cambia el usuario
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Tiempo de inactividad: 2 horas (7200000 ms)
  const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 horas

  // Función para actualizar la última actividad
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Reiniciar el timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Configurar nuevo timeout
    timeoutRef.current = setTimeout(async () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      const currentUser = userRef.current;
      
      // Verificar si realmente han pasado 2 horas de inactividad
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT && currentUser) {
        console.log('⏰ Timeout de inactividad alcanzado (2 horas). Cerrando sesión...');
        
        // Si es ejecutivo o supervisor, asignar backup automáticamente y actualizar is_operativo
        const isEjecutivoOrSupervisor = currentUser.role_name === 'ejecutivo' || currentUser.role_name === 'supervisor';
        
        if (isEjecutivoOrSupervisor && currentUser.id) {
          try {
            // Obtener coordinación del usuario
            // Para ejecutivos: usar coordinacion_id directamente
            // Para supervisores: obtener primera coordinación de coordinador_coordinaciones
            let coordinacionId: string | null = null;
            
            if (currentUser.role_name === 'ejecutivo') {
              const { data: ejecutivoData } = await supabaseSystemUI
                .from('user_profiles_v2')
                .select('coordinacion_id')
                .eq('id', currentUser.id)
                .single();
              coordinacionId = ejecutivoData?.coordinacion_id || null;
            } else {
              // Supervisor: obtener primera coordinación de auth_user_coordinaciones
              // Migrado de coordinador_coordinaciones → auth_user_coordinaciones (2025-12-29)
              const { data: coordData } = await supabaseSystemUI
                .from('auth_user_coordinaciones')
                .select('coordinacion_id')
                .eq('user_id', currentUser.id)
                .limit(1);
              coordinacionId = coordData?.[0]?.coordinacion_id || null;
            }

            if (coordinacionId) {
              // Obtener siguiente backup disponible
              const { backupService } = await import('../services/backupService');
              const backupId = await backupService.getAutomaticBackup(
                coordinacionId,
                currentUser.id
              );

              if (backupId) {
                // Asignar backup automáticamente
                const result = await backupService.assignBackup(currentUser.id, backupId);
                if (result.success) {
                  console.log(`✅ Backup automático asignado por inactividad: ${backupId}`);
                } else {
                  console.error('Error asignando backup automático:', result.error);
                }
              } else {
                console.warn('⚠️ No hay backups disponibles siguiendo el orden de prioridad');
              }
            }

            // Actualizar is_operativo a false
            const { error: updateError } = await supabaseSystemUI
              .from('user_profiles_v2')
              .update({ 
                is_operativo: false,
                updated_at: new Date().toISOString()
              })
              .eq('id', currentUser.id);
            
            if (updateError) {
              throw updateError;
            }
            
            console.log(`✅ ${currentUser.role_name} marcado como no operativo por inactividad`);
          } catch (error) {
            console.error(`Error actualizando ${currentUser.role_name} por inactividad:`, error);
          }
        }

        // Hacer logout automático
        await logout();
      }
    }, INACTIVITY_TIMEOUT);
  }, [logout, INACTIVITY_TIMEOUT]);

  // Detectar actividad del usuario
  useEffect(() => {
    if (!user || !isAuthenticated) {
      // Limpiar timeout si no hay usuario autenticado
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Eventos que indican actividad del usuario
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    // Inicializar timeout
    updateActivity();

    // Agregar listeners de eventos
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Limpiar al desmontar
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [user, isAuthenticated, updateActivity]);

  // También verificar cuando la ventana vuelve a tener foco
  useEffect(() => {
    if (!user || !isAuthenticated) return;

    const handleFocus = async () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      const currentUser = userRef.current;
      
      // Si han pasado más de 2 horas desde la última actividad, hacer logout
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT && currentUser) {
        console.log('⏰ Ventana recuperó foco después de 2+ horas de inactividad. Cerrando sesión...');
        
        // Si es ejecutivo, asignar backup automáticamente y actualizar is_operativo
        if (currentUser.role_name === 'ejecutivo' && currentUser.id) {
          try {
            // Obtener coordinación del ejecutivo
            const { data: ejecutivoData } = await supabaseSystemUI
              .from('user_profiles_v2')
              .select('coordinacion_id')
              .eq('id', currentUser.id)
              .single();

            if (ejecutivoData?.coordinacion_id) {
              // Obtener siguiente ejecutivo operativo como backup automático
              const { backupService } = await import('../services/backupService');
              const backupId = await backupService.getAutomaticBackup(
                ejecutivoData.coordinacion_id,
                currentUser.id
              );

              if (backupId) {
                // Asignar backup automáticamente
                const result = await backupService.assignBackup(currentUser.id, backupId);
                if (result.success) {
                  console.log(`✅ Backup automático asignado por inactividad: ${backupId}`);
                } else {
                  console.error('Error asignando backup automático:', result.error);
                }
              } else {
                console.warn('⚠️ No hay backups disponibles siguiendo el orden de prioridad');
              }
            }

            // Actualizar is_operativo a false
            const { error: updateError } = await supabaseSystemUI
              .from('user_profiles_v2')
              .update({ 
                is_operativo: false,
                updated_at: new Date().toISOString()
              })
              .eq('id', currentUser.id);
            
            if (updateError) {
              throw updateError;
            }
            
            console.log('✅ Ejecutivo marcado como no operativo por inactividad');
          } catch (error) {
            console.error('Error actualizando ejecutivo por inactividad:', error);
          }
        }

        await logout();
      } else {
        // Si no han pasado 2 horas, actualizar actividad
        updateActivity();
      }
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, isAuthenticated, INACTIVITY_TIMEOUT, logout, updateActivity]);
};

