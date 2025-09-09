import { useState, useEffect } from 'react';
import { pqncSupabase as supabase } from '../config/pqncSupabase';
import { useAuth } from '../contexts/AuthContext';

interface AnalysisPermissions {
  natalia: boolean;
  pqnc: boolean;
  liveMonitor: boolean;
  loading: boolean;
}

export const useAnalysisPermissions = () => {
  const { user } = useAuth();
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

    // Admins tienen acceso completo
    if (user.role_name === 'admin') {
      setPermissions({ natalia: true, pqnc: true, liveMonitor: true, loading: false });
      return;
    }

    // Developers no tienen acceso
    if (user.role_name === 'developer') {
      setPermissions({ natalia: false, pqnc: false, liveMonitor: false, loading: false });
      return;
    }

    // Vendedores tienen acceso por defecto a PQNC y Live Monitor
    if (user.role_name === 'vendedor') {
      console.log('👤 Usuario vendedor detectado:', user.email);
      setPermissions({ natalia: false, pqnc: true, liveMonitor: true, loading: false });
      return;
    }

    // Evaluators: usar función RPC existente
    if (user.role_name === 'evaluator') {
      try {
        console.log('🔍 Cargando permisos de evaluador via RPC...');
        
        const { data: config, error } = await supabase.rpc('get_evaluator_analysis_config', {
          p_target_user_id: user.id
        });

        if (error) {
          console.log('⚠️ Error obteniendo configuración de evaluador, usando localStorage:', error);
          
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
              console.log('✅ Permisos cargados desde localStorage:', permData);
            } catch (err) {
              console.error('❌ Error parseando localStorage:', err);
              setPermissions({ natalia: false, pqnc: false, liveMonitor: false, loading: false });
            }
          } else {
            setPermissions({ natalia: false, pqnc: false, liveMonitor: false, loading: false });
          }
        } else {
          console.log('✅ Configuración de evaluador obtenida:', config);
          
          const analysisConfig = config?.[0] || {};
          
          // Verificar si hay configuración en localStorage que sobrescriba
          const permissionsKey = `evaluator_permissions_${user.email}`;
          const savedPermissions = localStorage.getItem(permissionsKey);
          
          let finalPermissions;
          
          if (savedPermissions) {
            try {
              const permData = JSON.parse(savedPermissions);
              finalPermissions = {
                natalia: permData.natalia_access || false,
                pqnc: permData.pqnc_access || false,
                liveMonitor: permData.live_monitor_access || false
              };
              console.log('✅ Usando permisos desde localStorage (más reciente):', finalPermissions);
            } catch (err) {
              // Si falla localStorage, usar RPC
              finalPermissions = {
                natalia: analysisConfig.has_natalia_access || false,
                pqnc: analysisConfig.has_pqnc_access || false,
                liveMonitor: analysisConfig.has_live_monitor_access || false
              };
              console.log('✅ Usando permisos desde RPC:', finalPermissions);
            }
          } else {
            // Sin localStorage, usar RPC
            finalPermissions = {
              natalia: analysisConfig.has_natalia_access || false,
              pqnc: analysisConfig.has_pqnc_access || false,
              liveMonitor: analysisConfig.has_live_monitor_access || false
            };
            console.log('✅ Usando permisos desde RPC:', finalPermissions);
          }
          
          setPermissions({
            ...finalPermissions,
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
