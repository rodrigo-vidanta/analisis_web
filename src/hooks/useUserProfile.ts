import { useState, useEffect } from 'react';
import { supabaseSystemUI as supabase } from '../config/supabaseSystemUI';
import { useAuth } from '../contexts/AuthContext';
import { userProfileEvents } from '../utils/userProfileEvents';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  role_name?: string;
  coordinacion_id?: string;
  coordinacion_codigo?: string;
  coordinacion_nombre?: string;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Primero obtener datos básicos del usuario con coordinación
      const { data: userData, error: userError } = await supabase
        .from('auth_users')
        .select(`
          id,
          email,
          full_name,
          first_name,
          last_name,
          coordinacion_id,
          auth_roles!inner(name),
          coordinaciones:coordinacion_id (
            codigo,
            nombre
          )
        `)
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error loading user data:', userError);
        return;
      }

      // Luego obtener avatar por separado
      const { data: avatarData, error: avatarError } = await supabase
        .from('user_avatars')
        .select('avatar_url')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (avatarError) {
        console.warn('⚠️ Error cargando avatar:', avatarError);
      }

      if (userData) {
        const coordinacion = Array.isArray(userData.coordinaciones) 
          ? userData.coordinaciones[0] 
          : userData.coordinaciones;

        setProfile({
          ...userData,
          role_name: userData.auth_roles?.name,
          avatar_url: avatarData?.avatar_url || null,
          coordinacion_id: userData.coordinacion_id,
          coordinacion_codigo: coordinacion?.codigo,
          coordinacion_nombre: coordinacion?.nombre
        });
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = () => {
    loadUserProfile();
  };

  useEffect(() => {
    loadUserProfile();

    // Agregar listener para actualizaciones
    const handleProfileUpdate = () => {
      loadUserProfile();
    };

    userProfileEvents.addListener(handleProfileUpdate);

    return () => {
      userProfileEvents.removeListener(handleProfileUpdate);
    };
  }, [user?.id]);

  return {
    profile,
    loading,
    refreshProfile
  };
};

export default useUserProfile;
