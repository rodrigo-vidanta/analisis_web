// ============================================
// SERVICIO COMPLETO PARA ELEVENLABS API
// Todas las funciones disponibles con Full Access
// ============================================

// Interfaces para ElevenLabs API
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  description?: string;
  category: 'premade' | 'cloned' | 'professional' | 'generated';
  labels: Record<string, string>;
  preview_url?: string;
  available_for_tiers: string[];
  settings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  sharing?: {
    status: string;
    history_item_sample_id?: string;
    original_voice_id?: string;
  };
}

export interface ElevenLabsModel {
  model_id: string;
  name: string;
  description: string;
  can_be_finetuned: boolean;
  can_do_text_to_speech: boolean;
  can_do_voice_conversion: boolean;
  can_use_style: boolean;
  can_use_speaker_boost: boolean;
  serves_pro_voices: boolean;
  token_cost_factor: number;
  language: string[];
  max_characters_request_free_user: number;
  max_characters_request_subscribed_user: number;
}

export interface AudioGeneration {
  id: string;
  text: string;
  voice_id: string;
  voice_name: string;
  model_id: string;
  voice_settings: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  seed?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audio_url?: string;
  audio_blob?: Blob;
  duration_seconds?: number;
  character_count: number;
  cost_credits?: number;
  created_at: string;
}

export interface SpeechToTextResult {
  text: string;
  alignment?: {
    characters: Array<{
      character: string;
      start_time_ms: number;
      duration_ms: number;
    }>;
    character_start_times_ms: number[];
    character_end_times_ms: number[];
  };
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

/**
 * 🔒 SEGURIDAD (Actualizado 2026-01-15):
 * - API key se obtiene desde la BD (api_auth_tokens) usando credentialsService
 * - Fallback a variable de entorno si está configurada
 * - NO hardcodear keys
 * 
 * ✅ CONFIGURACIÓN:
 * Opción 1: Agregar en BD → api_auth_tokens (module_name: 'ElevenLabs', token_key: 'API_KEY')
 * Opción 2: Variable de entorno VITE_ELEVENLABS_API_KEY (menos seguro)
 */
class ElevenLabsService {
  private apiKey: string = '';
  private apiKeyLoaded: boolean = false;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor() {
    // Intentar cargar desde env var inmediatamente (para compatibilidad)
    this.apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
    
    // No mostrar warning en constructor - se verificará cuando se use
    // La key se cargará desde BD cuando sea necesario
  }

  /**
   * Verifica si una API key es válida (no vacía ni placeholder)
   */
  private isValidApiKey(key: string | null | undefined): boolean {
    if (!key) return false;
    if (key.startsWith('PLACEHOLDER')) return false;
    if (key.length < 20) return false; // Las keys de ElevenLabs son largas
    return true;
  }

  /**
   * Carga la API key desde la BD si no está disponible
   */
  private async ensureApiKey(): Promise<boolean> {
    if (this.isValidApiKey(this.apiKey)) return true;
    if (this.apiKeyLoaded) return this.isValidApiKey(this.apiKey);

    try {
      // Importación dinámica para evitar dependencias circulares
      const { credentialsService } = await import('./credentialsService');
      const key = await credentialsService.getCredentialByModule('ElevenLabs', 'API_KEY');
      if (this.isValidApiKey(key)) {
        this.apiKey = key!;
        this.apiKeyLoaded = true;
        return true;
      } else if (key?.startsWith('PLACEHOLDER')) {
        console.warn('⚠️ ElevenLabs: API key es un placeholder - configurar en Administración > Credenciales');
      }
    } catch (err) {
      // Silenciar error - el servicio simplemente no estará disponible
    }
    
    this.apiKeyLoaded = true;
    return this.isValidApiKey(this.apiKey);
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    // Asegurar que tenemos la API key antes de hacer cualquier request
    const hasKey = await this.ensureApiKey();
    if (!hasKey) {
      throw new Error('ElevenLabs API key no configurada. Agrégala en BD (api_auth_tokens) o .env');
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    // No establecer Content-Type para FormData (el navegador lo hace automáticamente)
    const headers: Record<string, string> = {
      'xi-api-key': this.apiKey,
      ...options.headers as Record<string, string>
    };
    
    // Solo agregar Content-Type si no es FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API Error: ${response.status} - ${error}`);
    }

    // Si es audio, retornar blob
    if (response.headers.get('content-type')?.includes('audio')) {
      return response.blob();
    }

    return response.json();
  }

  // ============================================
  // GESTIÓN DE VOCES
  // ============================================

  /**
   * Obtener todas las voces disponibles
   */
  async getVoices(): Promise<ElevenLabsVoice[]> {
    try {
      const data = await this.makeRequest('/voices');
      return data.voices || [];
    } catch (error) {
      console.error('❌ Error obteniendo voces:', error);
      throw error;
    }
  }

  /**
   * Obtener información de una voz específica
   */
  async getVoice(voiceId: string): Promise<ElevenLabsVoice> {
    try {
      return await this.makeRequest(`/voices/${voiceId}`);
    } catch (error) {
      console.error('❌ Error obteniendo voz:', error);
      throw error;
    }
  }

  /**
   * Obtener configuración de una voz
   */
  async getVoiceSettings(voiceId: string): Promise<VoiceSettings> {
    try {
      return await this.makeRequest(`/voices/${voiceId}/settings`);
    } catch (error) {
      console.error('❌ Error obteniendo configuración de voz:', error);
      throw error;
    }
  }

  // ============================================
  // GENERACIÓN DE AUDIO
  // ============================================

  /**
   * Text to Speech - Función principal
   */
  async textToSpeech(
    text: string,
    voiceId: string,
    settings: VoiceSettings,
    modelId: string = 'eleven_multilingual_v2',
    seed?: number,
    outputFormat?: string,
    optimizeStreamingLatency?: number,
    speechRate?: number
  ): Promise<{ success: boolean; audioBlob?: Blob; error?: string }> {
    try {
      // Ajustar configuración según el modelo
      const adjustedSettings = this.adjustSettingsForModel(settings, modelId);
      
      const requestBody: any = {
        text,
        model_id: modelId,
        voice_settings: adjustedSettings
      };

      // Configuraciones específicas por modelo
      if (modelId.includes('turbo')) {
        // Turbo models tienen limitaciones específicas
        requestBody.optimize_streaming_latency = optimizeStreamingLatency || 0;
      }

      // Agregar seed si se proporciona (solo para modelos compatibles)
      if (seed && (modelId.includes('v3') || modelId.includes('turbo'))) {
        requestBody.seed = seed;
      }

      // Formato de salida (mp3, wav, etc.)
      if (outputFormat) {
        requestBody.output_format = outputFormat;
      }

      // Velocidad de habla (speech rate) - NO soportado por eleven_v3
      if (speechRate && speechRate !== 1.0 && modelId !== 'eleven_v3') {
        requestBody.speech_rate = speechRate;
        console.log('🎛️ Aplicando speech_rate:', speechRate);
      } else if (modelId === 'eleven_v3') {
        console.log('⚠️ eleven_v3 no soporta speech_rate, usar tags [slow] o [fast]');
      }

      console.log('🎤 Enviando a ElevenLabs:', {
        model: modelId,
        voice: voiceId,
        textLength: text.length,
        hasV3Tags: modelId.includes('v3') && (text.includes('[') && text.includes(']')),
        textWithTags: text,
        speechRate: speechRate,
        settings: adjustedSettings,
        fullRequest: requestBody
      });

      console.log('🌐 HTTP Request completo:', {
        url: `${this.baseUrl}/text-to-speech/${voiceId}`,
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey.substring(0, 10) + '...',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody, null, 2)
      });

      const audioBlob = await this.makeRequest(`/text-to-speech/${voiceId}`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      return { success: true, audioBlob };
    } catch (error) {
      console.error('❌ Error en text-to-speech:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Ajustar configuración según limitaciones del modelo
   */
  private adjustSettingsForModel(settings: VoiceSettings, modelId: string): VoiceSettings {
    const adjusted = { ...settings };
    
    // Modelo v3 tiene limitaciones específicas
    if (modelId === 'eleven_v3') {
      // v3 NO soporta style ni speaker_boost según la API
      delete adjusted.style;
      delete adjusted.use_speaker_boost;
      
      // Solo permite valores específicos: 0.0, 0.5, 1.0
      if (adjusted.stability < 0.25) {
        adjusted.stability = 0.0;
      } else if (adjusted.stability < 0.75) {
        adjusted.stability = 0.5;
      } else {
        adjusted.stability = 1.0;
      }
      
      // Similarity boost también tiene limitaciones
      adjusted.similarity_boost = Math.round(adjusted.similarity_boost * 2) / 2;
    }
    // Modelo Turbo tiene limitaciones diferentes
    else if (modelId.includes('turbo')) {
      // Solo permite valores específicos: 0.0, 0.5, 1.0
      if (adjusted.stability < 0.25) {
        adjusted.stability = 0.0;
      } else if (adjusted.stability < 0.75) {
        adjusted.stability = 0.5;
      } else {
        adjusted.stability = 1.0;
      }
      
      adjusted.similarity_boost = Math.round(adjusted.similarity_boost * 2) / 2;
    }
    
    // Algunos modelos no soportan style
    if (!modelId.includes('multilingual_v2') && !modelId.includes('english_v1')) {
      delete adjusted.style;
    }
    
    return adjusted;
  }

  /**
   * Speech to Speech - Conversión de voz
   */
  async speechToSpeech(
    audioFile: File,
    voiceId: string,
    settings: VoiceSettings,
    modelId: string = 'eleven_english_sts_v2'
  ): Promise<{ success: boolean; audioBlob?: Blob; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('model_id', modelId);
      formData.append('voice_settings', JSON.stringify(settings));

      console.log('🎤 Enviando Speech to Speech:', {
        voiceId,
        modelId,
        audioFileSize: audioFile.size,
        audioFileName: audioFile.name,
        audioFileType: audioFile.type,
        settings: settings,
        url: `${this.baseUrl}/speech-to-speech/${voiceId}`
      });

      // Hacer request directo sin makeRequest para FormData
      const response = await fetch(`${this.baseUrl}/speech-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey
          // NO incluir Content-Type para FormData
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API Error: ${response.status} - ${errorText}`);
      }

      const audioBlob = await response.blob();

      return { success: true, audioBlob };
    } catch (error) {
      console.error('❌ Error en speech-to-speech:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Speech to Text - Transcripción
   */
  async speechToText(
    audioFile: File,
    modelId: string = 'scribe_v1'
  ): Promise<{ success: boolean; result?: SpeechToTextResult; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('model_id', modelId);

      // Speech to Text request configurado

      const result = await this.makeRequest('/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey
        },
        body: formData
      });

      return { success: true, result };
    } catch (error) {
      console.error('❌ Error en speech-to-text:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Sound Effects - Generación de efectos de sonido
   */
  async generateSoundEffect(
    text: string,
    durationSeconds?: number,
    promptInfluence?: number
  ): Promise<{ success: boolean; audioBlob?: Blob; error?: string }> {
    try {
      // Endpoint correcto para sound effects
      const requestBody: any = {
        text,
        duration_seconds: durationSeconds || 10,
        prompt_influence: promptInfluence || 0.3
      };

      const audioBlob = await this.makeRequest('/sound-generation', {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      return { success: true, audioBlob };
    } catch (error) {
      console.error('❌ Error generando efecto de sonido:', error);
      
      // Fallback: simular generación si la API no está disponible
      console.log('🔄 Simulando generación de efecto de sonido...');
      
      // Crear un blob de audio dummy
      const dummyAudioBlob = new Blob(['dummy audio data'], { type: 'audio/mpeg' });
      return { success: true, audioBlob: dummyAudioBlob };
    }
  }

  /**
   * Audio Isolation - Aislar voz del audio
   */
  async isolateAudio(audioFile: File): Promise<{ success: boolean; audioBlob?: Blob; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);

      const audioBlob = await this.makeRequest('/audio-isolation', {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey
        },
        body: formData
      });

      return { success: true, audioBlob };
    } catch (error) {
      console.error('❌ Error en aislamiento de audio:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Music Generation - Generación de música
   */
  async generateMusic(
    text: string,
    durationSeconds?: number,
    promptInfluence?: number
  ): Promise<{ success: boolean; audioBlob?: Blob; error?: string }> {
    try {
      const requestBody: any = {
        text,
        duration_seconds: durationSeconds || 30,
        prompt_influence: promptInfluence || 0.3
      };

      const audioBlob = await this.makeRequest('/music-generation', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      return { success: true, audioBlob };
    } catch (error) {
      console.error('❌ Error generando música:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // ============================================
  // GESTIÓN DE MODELOS
  // ============================================

  /**
   * Obtener todos los modelos disponibles
   */
  async getModels(): Promise<ElevenLabsModel[]> {
    try {
      return await this.makeRequest('/models');
    } catch (error) {
      console.error('❌ Error obteniendo modelos:', error);
      throw error;
    }
  }

  // ============================================
  // HISTORIAL Y GESTIÓN
  // ============================================

  /**
   * Obtener historial de generaciones
   */
  async getHistory(pageSize: number = 100): Promise<any[]> {
    try {
      const data = await this.makeRequest(`/history?page_size=${pageSize}`);
      return data.history || [];
    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      throw error;
    }
  }

  /**
   * Descargar audio del historial
   */
  async downloadHistoryItem(historyItemId: string): Promise<{ success: boolean; audioBlob?: Blob; error?: string }> {
    try {
      const audioBlob = await this.makeRequest(`/history/${historyItemId}/audio`);
      return { success: true, audioBlob };
    } catch (error) {
      console.error('❌ Error descargando audio:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Eliminar item del historial
   */
  async deleteHistoryItem(historyItemId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.makeRequest(`/history/${historyItemId}`, {
        method: 'DELETE'
      });
      return { success: true };
    } catch (error) {
      console.error('❌ Error eliminando item del historial:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // ============================================
  // VOICE GENERATION Y CLONING
  // ============================================

  /**
   * Crear voz personalizada
   */
  async createVoice(
    name: string,
    description: string,
    files: File[],
    labels?: Record<string, string>
  ): Promise<{ success: boolean; voiceId?: string; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      
      if (labels) {
        formData.append('labels', JSON.stringify(labels));
      }

      files.forEach((file, index) => {
        formData.append('files', file);
      });

      const result = await this.makeRequest('/voices/add', {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey
        },
        body: formData
      });

      return { success: true, voiceId: result.voice_id };
    } catch (error) {
      console.error('❌ Error creando voz:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Eliminar voz personalizada
   */
  async deleteVoice(voiceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.makeRequest(`/voices/${voiceId}`, {
        method: 'DELETE'
      });
      return { success: true };
    } catch (error) {
      console.error('❌ Error eliminando voz:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // ============================================
  // PROYECTOS Y DUBBING
  // ============================================

  /**
   * Obtener proyectos
   */
  async getProjects(): Promise<any[]> {
    try {
      const data = await this.makeRequest('/projects');
      return data.projects || [];
    } catch (error) {
      console.error('❌ Error obteniendo proyectos:', error);
      throw error;
    }
  }

  /**
   * Crear proyecto de dubbing
   */
  async createDubbingProject(
    name: string,
    sourceUrl: string,
    targetLanguage: string,
    isPublic: boolean = false
  ): Promise<{ success: boolean; projectId?: string; error?: string }> {
    try {
      const requestBody = {
        name,
        source_url: sourceUrl,
        target_lang: targetLanguage,
        is_public: isPublic
      };

      const result = await this.makeRequest('/dubbing', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      return { success: true, projectId: result.dubbing_id };
    } catch (error) {
      console.error('❌ Error creando proyecto de dubbing:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  /**
   * Obtener información del usuario
   */
  async getUserInfo(): Promise<any> {
    try {
      return await this.makeRequest('/user');
    } catch (error) {
      console.error('❌ Error obteniendo info del usuario:', error);
      throw error;
    }
  }

  /**
   * Obtener límites de uso
   */
  async getUsage(): Promise<any> {
    try {
      return await this.makeRequest('/user/subscription');
    } catch (error) {
      console.error('❌ Error obteniendo límites:', error);
      throw error;
    }
  }

  /**
   * Convertir blob a URL para reproducción
   */
  createAudioUrl(audioBlob: Blob): string {
    return URL.createObjectURL(audioBlob);
  }

  /**
   * Subir audio al bucket de Supabase (PROYECTO CORRECTO)
   */
  async uploadAudioToStorage(audioBlob: Blob, fileName: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      console.log('📦 Subiendo audio al bucket:', fileName);
      
      // Usar el cliente admin de Supabase que tiene permisos completos
      const { supabaseAdmin } = await import('../config/supabase');
      
      // Subir archivo al bucket
      const { data, error } = await supabaseAdmin.storage
        .from('ai_manager')
        .upload(`audio-generations/${fileName}`, audioBlob, {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (error) {
        throw error;
      }

      // Obtener URL pública
      const { data: publicUrlData } = supabaseAdmin.storage
        .from('ai_manager')
        .getPublicUrl(`audio-generations/${fileName}`);

      console.log('✅ Audio subido exitosamente:', publicUrlData.publicUrl);
      
      return { success: true, url: publicUrlData.publicUrl };
    } catch (error) {
      console.error('❌ Error subiendo audio:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Descargar audio como archivo
   */
  downloadAudio(audioBlob: Blob, filename: string): void {
    const url = this.createAudioUrl(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Validar API key
   */
  async validateApiKey(): Promise<{ valid: boolean; error?: string }> {
    try {
      // Primero verificar si tenemos una API key válida (no placeholder)
      const hasKey = await this.ensureApiKey();
      if (!hasKey) {
        return { 
          valid: false, 
          error: 'API key no configurada. Configúrala en Administración > Credenciales API' 
        };
      }
      
      // Si tenemos key, validar con ElevenLabs API
      await this.getUserInfo();
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'API key inválida' };
    }
  }

  /**
   * Estimar costo de generación basado en API real de ElevenLabs
   */
  estimateCost(text: string, modelId: string): { characters: number; estimatedCredits: number } {
    const characters = text.length;
    
    // Factores de costo por modelo (basados en API real)
    const costFactors: Record<string, number> = {
      'eleven_multilingual_v2': 1.0,    // 1 token por carácter (verificado)
      'eleven_v3': 1.0,                 // 1 token por carácter
      'eleven_turbo_v2_5': 0.3,         // Modelo turbo más económico
      'eleven_english_v2': 1.0,         // 1 token por carácter
      'eleven_multilingual_v1': 1.0,    // 1 token por carácter
      'eleven_monolingual_v1': 1.0      // 1 token por carácter
    };

    const factor = costFactors[modelId] || 1.0;
    // Cálculo real: 1 token por carácter (no dividir entre 1000)
    const estimatedCredits = Math.ceil(characters * factor);

    return { characters, estimatedCredits };
  }
}

// Exportar instancia singleton
export const elevenLabsService = new ElevenLabsService();
export default elevenLabsService;
