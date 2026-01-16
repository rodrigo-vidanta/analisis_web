/**
 * ============================================
 * HOOK: useUserProfile
 * ============================================
 * 
 * ⚠️ MIGRACIÓN 16 Enero 2026:
 * - Refactorizado para usar Supabase Auth nativo
 * - Datos de usuario vienen de auth.getUser() + user_metadata
 * - Compatible con user_profiles_v2 (vista basada en auth.users)
 * - Fallback a auth_user_profiles para compatibilidad legacy
 */

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
      
      // ============================================
      // OPCIÓN 1: Usar datos del user de AuthContext
      // ============================================
      // Si ya tenemos los datos en el contexto, usarlos directamente
      if (user) {
        const baseProfile: UserProfile = {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          first_name: user.first_name,
          last_name: user.last_name,
          role_name: user.role_name,
          coordinacion_id: user.coordinacion_id
        };
        
        // Obtener avatar
        const { data: avatarData } = await supabase!
          .from('user_avatars')
          .select('avatar_url')
          .eq('user_id', user.id)
          .order('uploaded_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        // Obtener coordinación si existe
        let coordinacionData = null;
        if (user.coordinacion_id) {
          const { data: coordData } = await supabase!
            .from('coordinaciones')
            .select('codigo, nombre')
            .eq('id', user.coordinacion_id)
            .maybeSingle();
          coordinacionData = coordData;
        }
        
        setProfile({
          ...baseProfile,
          avatar_url: avatarData?.avatar_url || undefined,
          coordinacion_codigo: coordinacionData?.codigo,
          coordinacion_nombre: coordinacionData?.nombre
        });
        
        setLoading(false);
        return;
      }
      
      // ============================================
      // OPCIÓN 2: Fallback a consulta directa
      // ============================================
      // Si por alguna razón no tenemos el user del contexto,
      // intentar la vista user_profiles_v2 (Supabase Auth) o auth_user_profiles (legacy)
      
      // Primero intentar user_profiles_v2 (basada en auth.users)
      let { data: userData, error: userError } = await supabase!
        .from('user_profiles_v2')
        .select(`
          id,
          email,
          full_name,
          first_name,
          last_name,
          coordinacion_id,
          role_name
        `)
        .eq('id', user?.id)
        .maybeSingle();

      // Si no existe user_profiles_v2, usar auth_user_profiles (legacy)
      if (userError?.code === '42P01' || !userData) {
        const { data: legacyData, error: legacyError } = await supabase!
          .from('auth_user_profiles')
          .select(`
            id,
            email,
            full_name,
            first_name,
            last_name,
            coordinacion_id,
            role_name
          `)
          .eq('id', user?.id)
          .maybeSingle();
        
        if (legacyError) {
          console.error('Error loading user data:', legacyError);
          return;
        }
        userData = legacyData;
      }
      
      if (!userData) {
        console.warn('Usuario no encontrado:', user?.id);
        return;
      }
      
      // Obtener coordinación por separado si existe
      let coordinacionData = null;
      if (userData?.coordinacion_id) {
        const { data: coordData } = await supabase!
          .from('coordinaciones')
          .select('codigo, nombre')
          .eq('id', userData.coordinacion_id)
          .maybeSingle();
        coordinacionData = coordData;
      }

      // Obtener avatar
      const { data: avatarData, error: avatarError } = await supabase!
        .from('user_avatars')
        .select('avatar_url')
        .eq('user_id', user!.id)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (avatarError) {
        console.warn('⚠️ Error cargando avatar:', avatarError);
      }

      setProfile({
        ...userData,
        role_name: userData.role_name,
        avatar_url: avatarData?.avatar_url || undefined,
        coordinacion_id: userData.coordinacion_id,
        coordinacion_codigo: coordinacionData?.codigo,
        coordinacion_nombre: coordinacionData?.nombre
      });
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
