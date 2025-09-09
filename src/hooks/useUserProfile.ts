import { useState, useEffect } from 'react';
import { pqncSupabase as supabase } from '../config/pqncSupabase';
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
      
      // Primero obtener datos básicos del usuario
      const { data: userData, error: userError } = await supabase
        .from('auth_users')
        .select(`
          id,
          email,
          full_name,
          first_name,
          last_name,
          auth_roles!inner(name)
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
        setProfile({
          ...userData,
          role_name: userData.auth_roles?.name,
          avatar_url: avatarData?.avatar_url || null
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
