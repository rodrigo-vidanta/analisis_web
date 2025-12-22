import { useState, useEffect } from 'react';
import { supabaseSystemUI as supabase } from '../config/supabaseSystemUI';
import { useAuth } from '../contexts/AuthContext';
import { useEffectivePermissions } from './useEffectivePermissions';

interface AnalysisPermissions {
  natalia: boolean;
  pqnc: boolean;
  liveMonitor: boolean;
  loading: boolean;
}

export const useAnalysisPermissions = () => {
  const { user } = useAuth();
  const { isAdmin, isDeveloper } = useEffectivePermissions();
  const [permissions, setPermissions] = useState<AnalysisPermissions>({
    natalia: false,
    pqnc: false,
    liveMonitor: false,
    loading: true
  });

  const loadPermissions = async () => {
    if (!user) {
      setPermissions({ natalia: false, pqnc: false, liveMonitor: false, loading: false });
      return;
    }

    // Admins tienen acceso completo (usando permisos efectivos)
    if (isAdmin) {
      setPermissions({ natalia: true, pqnc: true, liveMonitor: true, loading: false });
      return;
    }

    // Developers tienen acceso a análisis y live monitor
    if (isDeveloper) {
      setPermissions({ natalia: true, pqnc: true, liveMonitor: true, loading: false });
      return;
    }


    // Evaluators: usar función RPC existente
    if (user.role_name === 'evaluator') {
      try {
        console.log('🔍 Cargando permisos de evaluador via RPC...');
        
        // TEMPORAL: Consulta directa hasta que RPC incluya live_monitor
        console.log('🔍 [useAnalysisPermissions] Consultando permisos directamente...');
        
        const { data: userPermissions, error: permError } = await supabase
          .from('auth_user_permissions')
          .select('permission_name, module, sub_module')
          .eq('user_id', user.id);

        if (permError) {
          console.error('❌ [useAnalysisPermissions] Error consultando permisos:', permError);
          
          // Fallback a localStorage
          const permissionsKey = `evaluator_permissions_${user.email}`;
          const savedPermissions = localStorage.getItem(permissionsKey);
          
          if (savedPermissions) {
            try {
              const permData = JSON.parse(savedPermissions);
              setPermissions({
                natalia: permData.natalia_access || false,
                pqnc: permData.pqnc_access || false,
                liveMonitor: permData.live_monitor_access || false,
                loading: false
              });
              console.log('✅ [useAnalysisPermissions] Usando localStorage fallback:', permData);
            } catch (err) {
              console.error('❌ Error parseando localStorage:', err);
              setPermissions({ natalia: false, pqnc: false, liveMonitor: false, loading: false });
            }
          } else {
            setPermissions({ natalia: false, pqnc: false, liveMonitor: false, loading: false });
          }
        } else {
          // Procesar permisos obtenidos directamente
          const nataliaAccess = userPermissions?.some(p => p.module === 'analisis' && p.sub_module === 'natalia') || false;
          const pqncAccess = userPermissions?.some(p => p.module === 'analisis' && p.sub_module === 'pqnc') || false;
          const liveMonitorAccess = userPermissions?.some(p => 
            (p.module === 'analisis' && p.sub_module === 'live_monitor') || 
            p.permission_name === 'analisis.live_monitor.view' ||
            p.module === 'live_monitor' || 
            p.permission_name === 'live_monitor.access'
          ) || false;
          
          console.log('✅ [useAnalysisPermissions] Permisos desde BD:', {
            natalia: nataliaAccess,
            pqnc: pqncAccess,
            liveMonitor: liveMonitorAccess,
            raw_permissions: userPermissions
          });
          
          console.log('🔍 [useAnalysisPermissions] DETALLE PERMISOS:');
          userPermissions?.forEach(p => {
            console.log(`  - ${p.permission_name} | ${p.module} | ${p.sub_module || 'null'}`);
          });
          
          // Si no hay permisos en BD, usar localStorage
          if (!nataliaAccess && !pqncAccess && !liveMonitorAccess) {
            const permissionsKey = `evaluator_permissions_${user.email}`;
            const savedPermissions = localStorage.getItem(permissionsKey);
            if (savedPermissions) {
              const permData = JSON.parse(savedPermissions);
              console.log('🔄 [useAnalysisPermissions] Sin permisos BD, usando localStorage:', permData);
              setPermissions({
                natalia: permData.natalia_access || false,
                pqnc: permData.pqnc_access || false,
                liveMonitor: permData.live_monitor_access || false,
                loading: false
              });
              return;
            }
          }
          
          setPermissions({
            natalia: nataliaAccess,
            pqnc: pqncAccess,
            liveMonitor: liveMonitorAccess,
            loading: false
          });
        }
      } catch (err) {
        console.error('💥 Error cargando permisos de evaluador:', err);
        setPermissions({ natalia: false, pqnc: false, liveMonitor: false, loading: false });
      }
      return;
    }

    // Otros roles no tienen acceso
    setPermissions({ natalia: false, pqnc: false, liveMonitor: false, loading: false });
  };

  useEffect(() => {
    loadPermissions();
  }, [user?.id, user?.role_name]);

  // Escuchar cambios en localStorage para recargar automáticamente
  useEffect(() => {
    if (!user) return;

    const handleStorageChange = (e: StorageEvent) => {
      const permissionsKey = `evaluator_permissions_${user.email}`;
      if (e.key === permissionsKey) {
        console.log('🔄 Permisos actualizados en localStorage, recargando...');
        loadPermissions();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user?.email]);

  return {
    ...permissions,
    refresh: loadPermissions
  };
};

export default useAnalysisPermissions;
