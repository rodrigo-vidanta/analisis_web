import { supabase, supabaseAdmin } from '../config/supabase';

// Interfaz que coincide EXACTAMENTE con la estructura real de la BD
export interface AudioGeneration {
  id: string;
  user_id: string;
  generation_type: string; // 'text_to_speech', 'speech_to_text', 'sound_effect'
  original_text: string;
  translated_text?: string;
  voice_id: string;
  voice_name: string;
  model_id: string;
  voice_settings: any; // JSONB
  seed?: number;
  audio_file_path?: string;
  audio_file_url?: string;
  original_file_path?: string;
  character_count: number;
  duration_seconds?: number;
  file_size_bytes?: number;
  cost_credits?: number;
  status?: string;
  error_message?: string;
  created_at: string;
  // Campos locales (no en BD)
  audio_blob?: Blob;
  type?: 'tts' | 'stt' | 'sound_effect'; // Para compatibilidad local
}

class AIModelsDbService {

  /**
   * Guardar generación de audio en la base de datos
   */
  async saveAudioGeneration(generation: Omit<AudioGeneration, 'id' | 'created_at'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      // Usar EXACTAMENTE los campos de la estructura real de la BD
      const dbRecord = {
        user_id: generation.user_id,
        generation_type: generation.generation_type,
        original_text: generation.original_text,
        translated_text: generation.translated_text,
        voice_id: generation.voice_id,
        voice_name: generation.voice_name,
        model_id: generation.model_id,
        voice_settings: generation.voice_settings,
        seed: generation.seed,
        audio_file_path: generation.audio_file_path,
        audio_file_url: generation.audio_file_url,
        original_file_path: generation.original_file_path,
        character_count: generation.character_count,
        duration_seconds: generation.duration_seconds,
        file_size_bytes: generation.file_size_bytes,
        cost_credits: generation.cost_credits,
        status: generation.status || 'completed',
        error_message: generation.error_message,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('ai_audio_generations')
        .insert([dbRecord])
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error de BD al guardar:', error);
        throw error;
      }

      return { success: true, id: data.id };
    } catch (error) {
      console.error('❌ Error guardando generación:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }


  /**
   * Obtener historial de generaciones del usuario
   */
  async getUserAudioHistory(userId: string, type?: 'tts' | 'stt' | 'sound_effect', limit: number = 100): Promise<{ success: boolean; data?: AudioGeneration[]; error?: string }> {
    try {
      let query = supabaseAdmin
        .from('ai_audio_generations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (type) {
        // Mapear tipo local a generation_type de la BD
        const dbType = type === 'tts' ? 'text_to_speech' : 
                      type === 'stt' ? 'speech_to_text' : 
                      'sound_effect';
        query = query.eq('generation_type', dbType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error consultando historial:', error);
        throw error;
      }


      // Mapear datos de BD a interfaz local
      const mappedData = data?.map(item => ({
        ...item,
        type: item.generation_type === 'text_to_speech' ? 'tts' as const :
              item.generation_type === 'speech_to_text' ? 'stt' as const :
              'sound_effect' as const,
        text: item.original_text // Para compatibilidad
      })) || [];

      return { success: true, data: mappedData };
    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Eliminar generación del historial
   */
  async deleteAudioGeneration(id: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseAdmin
        .from('ai_audio_generations')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error eliminando generación:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Actualizar URL de audio después de subir al bucket
   */
  async updateAudioUrl(id: string, audioUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseAdmin
        .from('ai_audio_generations')
        .update({ audio_file_url: audioUrl })
        .eq('id', id);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error actualizando URL:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Guardar preferencias del usuario
   */
  async saveUserPreferences(userId: string, preferences: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Mapear preferencias a la estructura real de la tabla
      const dbPreferences = {
        user_id: userId,
        favorite_voices: preferences.favoriteVoices || [],
        recent_voices: preferences.recentVoices || [],
        default_voice_settings: preferences.voiceSettings || {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.0,
          use_speaker_boost: true
        },
        preferred_model: preferences.selectedModel || 'eleven_multilingual_v2',
        auto_translate_enabled: preferences.autoTranslate !== undefined ? preferences.autoTranslate : true,
        source_language: preferences.sourceLanguage || 'es',
        target_language: preferences.targetLanguage || 'en',
        max_audio_history: preferences.maxAudioHistory || 20,
        max_effects_history: preferences.maxEffectsHistory || 20,
        auto_cleanup_enabled: preferences.autoCleanup !== undefined ? preferences.autoCleanup : true,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabaseAdmin
        .from('ai_user_preferences')
        .upsert([dbPreferences]);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error guardando preferencias:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Obtener preferencias del usuario
   */
  async getUserPreferences(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('ai_user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      if (data) {
        // Mapear estructura de BD a formato de preferencias
        const mappedPreferences = {
          selectedModel: data.preferred_model,
          voiceSettings: data.default_voice_settings,
          autoTranslate: data.auto_translate_enabled,
          sourceLanguage: data.source_language,
          targetLanguage: data.target_language,
          maxAudioHistory: data.max_audio_history,
          maxEffectsHistory: data.max_effects_history,
          autoCleanup: data.auto_cleanup_enabled,
          favoriteVoices: data.favorite_voices,
          recentVoices: data.recent_voices
        };

        console.log('🗄️ Preferencias cargadas desde BD');
        return { success: true, data: mappedPreferences };
      }

      return { success: false };
    } catch (error) {
      console.error('❌ Error obteniendo preferencias:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }
}

export const aiModelsDbService = new AIModelsDbService();
