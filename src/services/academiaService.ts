import { pqncSupabase } from '../config/supabase';

// ============================================
// INTERFACES Y TIPOS
// ============================================

export interface AcademiaLevel {
  id: number;
  nivel_numero: number;
  nombre: string;
  descripcion: string;
  xp_requerido: number;
  es_activo: boolean;
  orden_display: number;
  icono_url?: string;
  color_tema: string;
  created_at: string;
  updated_at: string;
}

export interface AcademiaActivity {
  id: number;
  nivel_id: number;
  tipo_actividad: 'llamada_virtual' | 'quiz' | 'juego' | 'repaso';
  nombre: string;
  descripcion: string;
  orden_actividad: number;
  xp_otorgado: number;
  es_obligatoria: boolean;
  configuracion: any;
  created_at: string;
  updated_at: string;
}

export interface VirtualAssistant {
  id: number;
  actividad_id: number;
  assistant_id: string;
  nombre_cliente: string;
  personalidad: string;
  dificultad: number;
  objetivos_venta: string[];
  objeciones_comunes: string[];
  avatar_url?: string;
  es_activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProgress {
  id: number;
  user_email: string;
  nivel_actual: number;
  xp_total: number;
  racha_dias: number;
  ultima_actividad: string;
  fecha_inicio: string;
  es_activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompletedActivity {
  id: number;
  user_email: string;
  actividad_id: number;
  puntuacion: number;
  xp_ganado: number;
  tiempo_completado: number;
  intentos: number;
  datos_sesion: any;
  completada_at: string;
  created_at: string;
}

export interface Achievement {
  id: number;
  nombre: string;
  descripcion: string;
  icono_url?: string;
  condicion_tipo: string;
  condicion_valor: number;
  xp_bonus: number;
  es_secreto: boolean;
  color_badge: string;
  created_at: string;
  updated_at: string;
}

export interface UserAchievement {
  id: number;
  user_email: string;
  logro_id: number;
  obtenido_at: string;
  achievement?: Achievement;
}

export interface VirtualCallSession {
  id: number;
  user_email: string;
  actividad_id: number;
  assistant_id: string;
  call_id?: string;
  duracion_segundos?: number;
  transcripcion_completa?: string;
  objetivos_cumplidos: string[];
  objeciones_manejadas: string[];
  puntuacion_final: number;
  feedback_ia?: string;
  areas_mejora: string[];
  iniciada_at?: string;
  finalizada_at?: string;
  created_at: string;
}

// ============================================
// SERVICIO PRINCIPAL
// ============================================

class AcademiaService {
  
  // ==================== NIVELES ====================
  
  async getLevels(): Promise<AcademiaLevel[]> {
    try {
      const { data, error } = await pqncSupabase
        .from('academia_niveles')
        .select('*')
        .eq('es_activo', true)
        .order('orden_display', { ascending: true });

      if (error) {
        console.error('❌ Error obteniendo niveles:', error);
        throw error;
      }

      console.log('✅ Niveles obtenidos:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('💥 Error en getLevels:', error);
      throw error;
    }
  }

  async getLevelById(levelId: number): Promise<AcademiaLevel | null> {
    try {
      const { data, error } = await pqncSupabase
        .from('academia_niveles')
        .select('*')
        .eq('id', levelId)
        .eq('es_activo', true)
        .single();

      if (error) {
        console.error('❌ Error obteniendo nivel:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('💥 Error en getLevelById:', error);
      throw error;
    }
  }

  // ==================== ACTIVIDADES ====================
  
  async getActivitiesByLevel(levelId: number): Promise<AcademiaActivity[]> {
    try {
      const { data, error } = await pqncSupabase
        .from('academia_actividades')
        .select('*')
        .eq('nivel_id', levelId)
        .order('orden_actividad', { ascending: true });

      if (error) {
        console.error('❌ Error obteniendo actividades:', error);
        throw error;
      }

      console.log(`✅ Actividades del nivel ${levelId}:`, data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('💥 Error en getActivitiesByLevel:', error);
      throw error;
    }
  }

  async getActivityById(activityId: number): Promise<AcademiaActivity | null> {
    try {
      const { data, error } = await pqncSupabase
        .from('academia_actividades')
        .select('*')
        .eq('id', activityId)
        .single();

      if (error) {
        console.error('❌ Error obteniendo actividad:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('💥 Error en getActivityById:', error);
      throw error;
    }
  }

  // ==================== ASISTENTES VIRTUALES ====================
  
  async getVirtualAssistantByActivity(activityId: number): Promise<VirtualAssistant | null> {
    try {
      const { data, error } = await pqncSupabase
        .from('academia_asistentes_virtuales')
        .select('*')
        .eq('actividad_id', activityId)
        .eq('es_activo', true)
        .single();

      if (error) {
        console.error('❌ Error obteniendo asistente virtual:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('💥 Error en getVirtualAssistantByActivity:', error);
      throw error;
    }
  }

  async getAllVirtualAssistants(): Promise<VirtualAssistant[]> {
    try {
      const { data, error } = await pqncSupabase
        .from('academia_asistentes_virtuales')
        .select('*')
        .eq('es_activo', true)
        .order('dificultad', { ascending: true });

      if (error) {
        console.error('❌ Error obteniendo asistentes virtuales:', error);
        throw error;
      }

      console.log('✅ Asistentes virtuales obtenidos:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('💥 Error en getAllVirtualAssistants:', error);
      throw error;
    }
  }

  // ==================== PROGRESO DEL USUARIO ====================
  
  async getUserProgress(userEmail: string): Promise<UserProgress | null> {
    try {
      const { data, error } = await pqncSupabase
        .from('academia_progreso_usuario')
        .select('*')
        .eq('user_email', userEmail)
        .eq('es_activo', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error obteniendo progreso:', error);
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('💥 Error en getUserProgress:', error);
      throw error;
    }
  }

  async createUserProgress(userEmail: string): Promise<UserProgress> {
    try {
      const { data, error } = await pqncSupabase
        .from('academia_progreso_usuario')
        .insert([{
          user_email: userEmail,
          nivel_actual: 1,
          xp_total: 0,
          racha_dias: 0,
          ultima_actividad: new Date().toISOString(),
          fecha_inicio: new Date().toISOString(),
          es_activo: true
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando progreso:', error);
        throw error;
      }

      console.log('✅ Progreso creado para usuario:', userEmail);
      return data;
    } catch (error) {
      console.error('💥 Error en createUserProgress:', error);
      throw error;
    }
  }

  async updateUserProgress(userEmail: string, updates: Partial<UserProgress>): Promise<UserProgress> {
    try {
      const { data, error } = await pqncSupabase
        .from('academia_progreso_usuario')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_email', userEmail)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando progreso:', error);
        throw error;
      }

      console.log('✅ Progreso actualizado para usuario:', userEmail);
      return data;
    } catch (error) {
      console.error('💥 Error en updateUserProgress:', error);
      throw error;
    }
  }

  // ==================== ACTIVIDADES COMPLETADAS ====================
  
  async getCompletedActivities(userEmail: string): Promise<CompletedActivity[]> {
    try {
      const { data, error } = await pqncSupabase
        .from('academia_actividades_completadas')
        .select('*')
        .eq('user_email', userEmail)
        .order('completada_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo actividades completadas:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('💥 Error en getCompletedActivities:', error);
      throw error;
    }
  }

  async completeActivity(userEmail: string, activityData: Partial<CompletedActivity>): Promise<CompletedActivity> {
    try {
      const { data, error } = await pqncSupabase
        .from('academia_actividades_completadas')
        .insert([{
          user_email: userEmail,
          ...activityData,
          completada_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error completando actividad:', error);
        throw error;
      }

      // Actualizar XP del usuario
      if (activityData.xp_ganado && activityData.xp_ganado > 0) {
        await this.addXPToUser(userEmail, activityData.xp_ganado);
      }

      console.log('✅ Actividad completada:', data.id);
      return data;
    } catch (error) {
      console.error('💥 Error en completeActivity:', error);
      throw error;
    }
  }

  // ==================== LOGROS ====================
  
  async getAchievements(): Promise<Achievement[]> {
    try {
      const { data, error } = await pqncSupabase
        .from('academia_logros')
        .select('*')
        .order('xp_bonus', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo logros:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('💥 Error en getAchievements:', error);
      throw error;
    }
  }

  async getUserAchievements(userEmail: string): Promise<UserAchievement[]> {
    try {
      const { data, error } = await pqncSupabase
        .from('academia_logros_usuario')
        .select(`
          *,
          achievement:academia_logros(*)
        `)
        .eq('user_email', userEmail)
        .order('obtenido_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo logros del usuario:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('💥 Error en getUserAchievements:', error);
      throw error;
    }
  }

  async unlockAchievement(userEmail: string, achievementId: number): Promise<UserAchievement> {
    try {
      const { data, error } = await pqncSupabase
        .from('academia_logros_usuario')
        .insert([{
          user_email: userEmail,
          logro_id: achievementId,
          obtenido_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error desbloqueando logro:', error);
        throw error;
      }

      console.log('🏆 Logro desbloqueado:', achievementId, 'para', userEmail);
      return data;
    } catch (error) {
      console.error('💥 Error en unlockAchievement:', error);
      throw error;
    }
  }

  // ==================== LLAMADAS VIRTUALES ====================
  
  async saveVirtualCallSession(sessionData: Partial<VirtualCallSession>): Promise<VirtualCallSession> {
    try {
      const { data, error } = await pqncSupabase
        .from('academia_llamadas_virtuales')
        .insert([{
          ...sessionData,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error guardando sesión de llamada:', error);
        throw error;
      }

      console.log('✅ Sesión de llamada guardada:', data.id);
      return data;
    } catch (error) {
      console.error('💥 Error en saveVirtualCallSession:', error);
      throw error;
    }
  }

  async getVirtualCallHistory(userEmail: string): Promise<VirtualCallSession[]> {
    try {
      const { data, error } = await pqncSupabase
        .from('academia_llamadas_virtuales')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo historial de llamadas:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('💥 Error en getVirtualCallHistory:', error);
      throw error;
    }
  }

  // ==================== UTILIDADES ====================
  
  async addXPToUser(userEmail: string, xpAmount: number): Promise<void> {
    try {
      // Obtener progreso actual
      let progress = await this.getUserProgress(userEmail);
      
      // Si no existe, crear progreso inicial
      if (!progress) {
        progress = await this.createUserProgress(userEmail);
      }

      // Calcular nuevo XP total
      const newXPTotal = progress.xp_total + xpAmount;

      // Calcular nuevo nivel (cada nivel requiere 100 XP más que el anterior)
      const newLevel = Math.floor(newXPTotal / 100) + 1;

      // Actualizar progreso
      await this.updateUserProgress(userEmail, {
        xp_total: newXPTotal,
        nivel_actual: Math.max(newLevel, progress.nivel_actual),
        ultima_actividad: new Date().toISOString()
      });

      console.log(`✅ XP agregado: ${xpAmount} para ${userEmail}. Total: ${newXPTotal}`);
    } catch (error) {
      console.error('💥 Error en addXPToUser:', error);
      throw error;
    }
  }

  async checkAndUnlockAchievements(userEmail: string): Promise<UserAchievement[]> {
    try {
      const [progress, achievements, userAchievements] = await Promise.all([
        this.getUserProgress(userEmail),
        this.getAchievements(),
        this.getUserAchievements(userEmail)
      ]);

      if (!progress) return [];

      const unlockedIds = userAchievements.map(ua => ua.logro_id);
      const newUnlocks: UserAchievement[] = [];

      for (const achievement of achievements) {
        if (unlockedIds.includes(achievement.id)) continue;

        let shouldUnlock = false;

        switch (achievement.condicion_tipo) {
          case 'xp_total':
            shouldUnlock = progress.xp_total >= achievement.condicion_valor;
            break;
          case 'racha_dias':
            shouldUnlock = progress.racha_dias >= achievement.condicion_valor;
            break;
          case 'nivel_completado':
            shouldUnlock = progress.nivel_actual >= achievement.condicion_valor;
            break;
          // Agregar más condiciones según sea necesario
        }

        if (shouldUnlock) {
          const newAchievement = await this.unlockAchievement(userEmail, achievement.id);
          newUnlocks.push(newAchievement);

          // Otorgar XP bonus si aplica
          if (achievement.xp_bonus > 0) {
            await this.addXPToUser(userEmail, achievement.xp_bonus);
          }
        }
      }

      return newUnlocks;
    } catch (error) {
      console.error('💥 Error en checkAndUnlockAchievements:', error);
      throw error;
    }
  }

  // ==================== LEADERBOARD ====================
  
  async getLeaderboard(limit: number = 10): Promise<UserProgress[]> {
    try {
      const { data, error } = await pqncSupabase
        .from('academia_progreso_usuario')
        .select('*')
        .eq('es_activo', true)
        .order('xp_total', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error obteniendo leaderboard:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('💥 Error en getLeaderboard:', error);
      throw error;
    }
  }
}

// Exportar instancia singleton
export const academiaService = new AcademiaService();
export default academiaService;
