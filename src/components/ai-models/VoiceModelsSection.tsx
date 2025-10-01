import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { elevenLabsService, type ElevenLabsVoice, type ElevenLabsModel, type AudioGeneration, type VoiceSettings } from '../../services/elevenLabsService';
import { translationService } from '../../services/translationService';
import { aiModelsDbService } from '../../services/aiModelsDbService';

type SubTab = 'library' | 'text-to-speech' | 'speech-to-speech' | 'speech-to-text' | 'sound-effects';

const VoiceModelsSection: React.FC = () => {
  const { user } = useAuth();
  const { getThemeClasses, isLinearTheme } = useTheme();
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [models, setModels] = useState<ElevenLabsModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('library');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  
  // Estados principales
  const [selectedVoice, setSelectedVoice] = useState<ElevenLabsVoice | null>(null);
  const [recentVoices, setRecentVoices] = useState<ElevenLabsVoice[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('eleven_multilingual_v2');
  
  // Historiales separados por tipo
  const [ttsHistory, setTtsHistory] = useState<AudioGeneration[]>([]);
  const [stsHistory, setStsHistory] = useState<AudioGeneration[]>([]);
  const [sttHistory, setSttHistory] = useState<any[]>([]);
  const [effectsHistory, setEffectsHistory] = useState<AudioGeneration[]>([]);
  
  // Estados para TTS
  const [textToGenerate, setTextToGenerate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    stability: 0.5,
    similarity_boost: 0.5,
    style: 0.0,
    use_speaker_boost: true
  });
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [outputFormat, setOutputFormat] = useState<string>('mp3_44100_128');
  const [optimizeLatency, setOptimizeLatency] = useState<number>(0);
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);
  const voiceSpeedRef = useRef<number>(1.0);
  const stsFileInputRef = useRef<HTMLInputElement>(null);

  // Tags oficiales de ElevenLabs v3 (verificados y funcionando)
  const elevenLabsTags = [
    // Emociones básicas (más confiables)
    { label: 'Susurro', value: 'whisper', category: 'Volumen', tested: true },
    { label: 'Grito', value: 'shouting', category: 'Volumen', tested: true },
    { label: 'Emocionado', value: 'excited', category: 'Emoción', tested: true },
    { label: 'Triste', value: 'sad', category: 'Emoción', tested: true },
    { label: 'Enojado', value: 'angry', category: 'Emoción', tested: true },
    { label: 'Feliz', value: 'happy', category: 'Emoción', tested: true },
    { label: 'Temeroso', value: 'fearful', category: 'Emoción', tested: true },
    
    // Velocidad y ritmo
    { label: 'Lento', value: 'slow', category: 'Velocidad', tested: true },
    { label: 'Rápido', value: 'fast', category: 'Velocidad', tested: true },
    
    // Tono y calidad vocal
    { label: 'Suave', value: 'soft', category: 'Tono', tested: true },
    { label: 'Fuerte', value: 'loud', category: 'Tono', tested: true },
    { label: 'Grave', value: 'deep', category: 'Tono', tested: true },
    { label: 'Agudo', value: 'high', category: 'Tono', tested: true },
    
    // Estilos específicos
    { label: 'Conversacional', value: 'conversational', category: 'Estilo', tested: true },
    { label: 'Narrativo', value: 'narration', category: 'Estilo', tested: true },
    { label: 'ASMR', value: 'asmr', category: 'Estilo', tested: true },
    
    // Controles especiales
    { label: 'Pausa', value: 'pause', category: 'Control', tested: true },
    { label: 'Silencio', value: 'silence', category: 'Control', tested: true },
    
    // Tags experimentales (pueden no funcionar siempre)
    { label: 'Sorprendido', value: 'surprised', category: 'Emoción', tested: false },
    { label: 'Disgustado', value: 'disgusted', category: 'Emoción', tested: false },
    { label: 'Respiración', value: 'breathy', category: 'Tono', tested: false },
    { label: 'Noticias', value: 'news', category: 'Estilo', tested: false },
    { label: 'Comercial', value: 'commercial', category: 'Estilo', tested: false },
    { label: 'Audiobook', value: 'audiobook', category: 'Estilo', tested: false },
    { label: 'Meditación', value: 'meditation', category: 'Estilo', tested: false }
  ];

  // Agrupar tags por categoría
  const tagsByCategory = elevenLabsTags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, typeof elevenLabsTags>);
  
  // Estados para efectos
  const [effectPrompt, setEffectPrompt] = useState('');
  const [effectDuration, setEffectDuration] = useState(10);
  const [effectInfluence, setEffectInfluence] = useState(0.3);
  const [autoTranslate, setAutoTranslate] = useState(true);
  
  // Estados para STT
  const [sttFile, setSttFile] = useState<File | null>(null);
  const [sttResult, setSttResult] = useState<string>('');
  const [sttLoading, setSttLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [sttModel, setSttModel] = useState<string>('whisper-1');
  const [sttLanguage, setSttLanguage] = useState<string>('es');
  const [sttOutputFormat, setSttOutputFormat] = useState<string>('text');
  const [sttTimestamps, setSttTimestamps] = useState<boolean>(false);
  const [sttSpeakerDetection, setSttSpeakerDetection] = useState<boolean>(false);
  const [sttNoiseFilter, setSttNoiseFilter] = useState<boolean>(true);
  const [sttAutoPunctuation, setSttAutoPunctuation] = useState<boolean>(true);
  
  // Estados para Speech to Speech
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<File | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isDragOverSts, setIsDragOverSts] = useState(false);
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const [stsModel, setStsModel] = useState<string>('eleven_multilingual_sts_v2');
  const [stsSettings, setStsSettings] = useState<VoiceSettings>({
    stability: 0.5,
    similarity_boost: 0.5,
    style: 0.0,
    use_speaker_boost: true
  });
  
  // Estado para tokens del usuario
  const [userTokens, setUserTokens] = useState<{used: number, limit: number} | null>(null);

  // Función para recargar historial
  const reloadHistory = async () => {
    if (!user?.id) return;
    
    console.log('🔄 Recargando historial completo...');
    const historyResult = await aiModelsDbService.getUserAudioHistory(user.id);
    
    if (historyResult.success && historyResult.data) {
      console.log('📊 Historial recargado:', historyResult.data.length, 'registros');
      const ttsHistory = historyResult.data.filter((item: any) => item.generation_type === 'text_to_speech');
      const stsHistory = historyResult.data.filter((item: any) => item.generation_type === 'speech_to_speech');
      const sttHistory = historyResult.data.filter((item: any) => item.generation_type === 'speech_to_text');
      const effectsHistory = historyResult.data.filter((item: any) => item.generation_type === 'sound_effect');
      
      console.log('📊 Historiales filtrados después de recargar:', { 
        ttsHistory: ttsHistory.length, 
        stsHistory: stsHistory.length,
        sttHistory: sttHistory.length,
        effectsHistory: effectsHistory.length
      });
      
      setTtsHistory(ttsHistory);
      setStsHistory(stsHistory);
      setSttHistory(sttHistory);
      setEffectsHistory(effectsHistory);
    } else {
      console.error('❌ Error recargando historial:', historyResult.error);
    }
  };
  
  // Filtros sofisticados
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const themeClasses = getThemeClasses();

  // Obtener controles disponibles según el modelo
  const getModelCapabilities = (modelId: string) => {
    const capabilities = {
      supportsStyle: modelId.includes('multilingual_v2') || modelId.includes('english_v1'),
      supportsSpeakerBoost: !(modelId === 'eleven_v3'), // v3 NO soporta speaker_boost
      supportsSeed: modelId.includes('v3') || modelId.includes('turbo'),
      supportsSpeed: modelId !== 'eleven_v3', // v3 NO soporta speech_rate, usa tags
      supportsTags: modelId === 'eleven_v3', // Solo v3 soporta tags con corchetes
      tagFormat: modelId === 'eleven_v3' ? 'brackets' : 'none', // [tag] para v3
      stabilityValues: modelId.includes('turbo') || modelId.includes('v3') 
        ? [0.0, 0.5, 1.0] // Valores específicos para v3/turbo
        : 'continuous', // Valores continuos para otros modelos
      maxCharacters: modelId.includes('turbo') ? 2500 : modelId === 'eleven_v3' ? 3000 : 5000,
      supportedFormats: modelId.includes('turbo') 
        ? ['mp3_44100_128', 'pcm_16000', 'pcm_22050']
        : ['mp3_44100_128', 'mp3_44100_192', 'pcm_16000', 'pcm_22050', 'pcm_24000']
    };
    
    return capabilities;
  };

  // Función para insertar tag en el textarea (simple y confiable)
  const insertTag = (tagValue: string) => {
    const tag = `[${tagValue}]`;
    const textarea = document.querySelector('textarea[placeholder*="Escribe el texto"]') as HTMLTextAreaElement;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentText = textToGenerate;
      const selectedText = currentText.substring(start, end);
      
      // Si hay texto seleccionado, insertar tag antes del texto
      const newText = selectedText 
        ? currentText.substring(0, start) + tag + ' ' + selectedText + currentText.substring(end)
        : currentText.substring(0, start) + tag + ' ' + currentText.substring(end);
      
      setTextToGenerate(newText);
      
      // Posicionar cursor después del tag
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + tag.length + 1; // +1 por el espacio
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    } else {
      // Si no hay textarea enfocada, agregar al final
      setTextToGenerate(prev => prev + tag + ' ');
    }
  };

  useEffect(() => {
    loadInitialData();
    
    // Verificar permisos de micrófono guardados
    const savedMicPermission = localStorage.getItem('mic_permission_ai_models');
    if (savedMicPermission) {
      setMicPermission(savedMicPermission as 'granted' | 'denied');
    }
  }, []);

  // Debug para velocidad
  useEffect(() => {
    console.log('🎛️ Velocidad actualizada:', voiceSpeed);
  }, [voiceSpeed]);

  // Cache de preferencias del usuario
  const saveUserPreferences = () => {
    if (!user?.id) return;
    
    const preferences = {
      // TTS Preferences
      selectedModel,
      voiceSettings,
      seed,
      outputFormat,
      optimizeLatency,
      voiceSpeed: voiceSpeedRef.current,
      selectedVoiceId: selectedVoice?.voice_id,
      
      // STT Preferences
      sttModel,
      sttLanguage,
      sttOutputFormat,
      sttTimestamps,
      sttSpeakerDetection,
      sttNoiseFilter,
      sttAutoPunctuation,
      
      // Effects Preferences
      effectDuration,
      effectInfluence,
      autoTranslate,
      
      // UI Preferences
      activeSubTab,
      
      // Timestamp
      lastUpdated: new Date().toISOString()
    };
    
    // Guardar en localStorage para acceso inmediato
    localStorage.setItem(`ai_models_preferences_${user.id}`, JSON.stringify(preferences));
    
    // Guardar en BD para persistencia entre dispositivos
    aiModelsDbService.saveUserPreferences(user.id, preferences).then(result => {
      if (result.success) {
        console.log('💾 Preferencias guardadas en BD');
      }
    });
  };

  const loadUserPreferences = async () => {
    if (!user?.id) return;
    
    try {
      // Intentar cargar desde localStorage primero (más rápido)
      const localPrefs = localStorage.getItem(`ai_models_preferences_${user.id}`);
      let preferences = null;
      
      if (localPrefs) {
        preferences = JSON.parse(localPrefs);
        console.log('📱 Preferencias cargadas desde localStorage');
      } else {
        // Cargar desde BD si no hay localStorage
        const dbResult = await aiModelsDbService.getUserPreferences(user.id);
        if (dbResult.success && dbResult.data) {
          preferences = dbResult.data;
          console.log('🗄️ Preferencias cargadas desde BD');
        }
      }
      
      if (preferences) {
        // Aplicar preferencias de TTS
        if (preferences.selectedModel) setSelectedModel(preferences.selectedModel);
        if (preferences.voiceSettings) setVoiceSettings(preferences.voiceSettings);
        if (preferences.seed !== undefined) setSeed(preferences.seed);
        if (preferences.outputFormat) setOutputFormat(preferences.outputFormat);
        if (preferences.optimizeLatency !== undefined) setOptimizeLatency(preferences.optimizeLatency);
        if (preferences.voiceSpeed !== undefined) {
          setVoiceSpeed(preferences.voiceSpeed);
          voiceSpeedRef.current = preferences.voiceSpeed;
        }
        
        // Aplicar preferencias de STT
        if (preferences.sttModel) setSttModel(preferences.sttModel);
        if (preferences.sttLanguage) setSttLanguage(preferences.sttLanguage);
        if (preferences.sttOutputFormat) setSttOutputFormat(preferences.sttOutputFormat);
        if (preferences.sttTimestamps !== undefined) setSttTimestamps(preferences.sttTimestamps);
        if (preferences.sttSpeakerDetection !== undefined) setSttSpeakerDetection(preferences.sttSpeakerDetection);
        if (preferences.sttNoiseFilter !== undefined) setSttNoiseFilter(preferences.sttNoiseFilter);
        if (preferences.sttAutoPunctuation !== undefined) setSttAutoPunctuation(preferences.sttAutoPunctuation);
        
        // Aplicar preferencias de Effects
        if (preferences.effectDuration !== undefined) setEffectDuration(preferences.effectDuration);
        if (preferences.effectInfluence !== undefined) setEffectInfluence(preferences.effectInfluence);
        if (preferences.autoTranslate !== undefined) setAutoTranslate(preferences.autoTranslate);
        
        // Aplicar preferencias de UI
        if (preferences.activeSubTab) setActiveSubTab(preferences.activeSubTab);
        
        // Buscar y seleccionar voz guardada
        if (preferences.selectedVoiceId && voices.length > 0) {
          const savedVoice = voices.find(v => v.voice_id === preferences.selectedVoiceId);
          if (savedVoice) {
            setSelectedVoice(savedVoice);
          }
        }
        
        console.log('✅ Preferencias aplicadas:', preferences);
      }
    } catch (error) {
      console.error('❌ Error cargando preferencias:', error);
    }
  };

  // Auto-guardar preferencias cuando cambian
  useEffect(() => {
    if (user?.id && voices.length > 0) {
      const timeoutId = setTimeout(saveUserPreferences, 1000); // Debounce de 1 segundo
      return () => clearTimeout(timeoutId);
    }
  }, [selectedModel, voiceSettings, seed, outputFormat, optimizeLatency, voiceSpeed, selectedVoice, 
      sttModel, sttLanguage, sttOutputFormat, sttTimestamps, sttSpeakerDetection, sttNoiseFilter, sttAutoPunctuation,
      effectDuration, effectInfluence, autoTranslate, activeSubTab]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const validation = await elevenLabsService.validateApiKey();
      setApiKeyValid(validation.valid);

      if (validation.valid) {
        const [voicesData, modelsData, historyResult] = await Promise.all([
          elevenLabsService.getVoices(),
          elevenLabsService.getModels(),
          user ? aiModelsDbService.getUserAudioHistory(user.id) : Promise.resolve({ success: false })
        ]);

        setVoices(voicesData);
        setModels(modelsData);

        if (voicesData.length > 0) {
          setSelectedVoice(voicesData[0]);
          setRecentVoices([voicesData[0]]);
        }

        // Cargar historial desde la base de datos (incluyendo efectos)
        console.log('📊 Resultado del historial:', historyResult);
        if (historyResult.success && historyResult.data) {
          console.log('📊 Datos del historial:', historyResult.data);
          const ttsHistory = historyResult.data.filter((item: any) => item.generation_type === 'text_to_speech');
          const stsHistory = historyResult.data.filter((item: any) => item.generation_type === 'speech_to_speech');
          const sttHistory = historyResult.data.filter((item: any) => item.generation_type === 'speech_to_text');
          const effectsHistory = historyResult.data.filter((item: any) => item.generation_type === 'sound_effect');
          
          console.log('📊 Historiales filtrados en carga inicial:', { 
            ttsHistory: ttsHistory.length, 
            stsHistory: stsHistory.length,
            sttHistory: sttHistory.length,
            effectsHistory: effectsHistory.length
          });
          
          setTtsHistory(ttsHistory);
          setStsHistory(stsHistory);
          setSttHistory(sttHistory);
          setEffectsHistory(effectsHistory);
        } else {
          console.log('❌ No se pudo cargar historial:', historyResult.error);
        }
        
        // Cargar preferencias del usuario después de cargar voces
        await loadUserPreferences();
        
        // Cargar información de tokens
        if (user?.id) {
          const { tokenService } = await import('../../services/tokenService');
          const tokenInfo = await tokenService.getUserTokenInfo(user.id);
          if (tokenInfo) {
            setUserTokens({
              used: tokenInfo.current_month_usage,
              limit: tokenInfo.monthly_limit
            });
          }
        }
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      setApiKeyValid(false);
    } finally {
      setLoading(false);
    }
  };

  // Obtener filtros únicos de las voces
  const getAvailableFilters = () => {
    const filters = new Map<string, Set<string>>();
    
    voices.forEach(voice => {
      // Categorías
      if (!filters.has('category')) filters.set('category', new Set());
      filters.get('category')?.add(voice.category);
      
      // Géneros
      if (voice.labels.gender) {
        if (!filters.has('gender')) filters.set('gender', new Set());
        filters.get('gender')?.add(voice.labels.gender);
      }
      
      // Idiomas
      if (voice.labels.language) {
        if (!filters.has('language')) filters.set('language', new Set());
        filters.get('language')?.add(voice.labels.language);
      }
      
      // Acentos
      if (voice.labels.accent) {
        if (!filters.has('accent')) filters.set('accent', new Set());
        filters.get('accent')?.add(voice.labels.accent);
      }
      
      // Edades
      if (voice.labels.age) {
        if (!filters.has('age')) filters.set('age', new Set());
        filters.get('age')?.add(voice.labels.age);
      }
    });
    
    return filters;
  };

  // Filtrar voces con lógica sofisticada
  const filteredVoices = voices.filter(voice => {
    // Búsqueda por texto
    const matchesSearch = !searchQuery || 
      voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voice.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      Object.values(voice.labels).some(label => 
        label && label.toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    // Filtros activos
    if (activeFilters.size === 0) return matchesSearch;
    
    const matchesFilters = Array.from(activeFilters).every(filter => {
      const [type, value] = filter.split(':');
      switch (type) {
        case 'category': 
          return voice.category === value;
        case 'gender': 
          return voice.labels.gender === value;
        case 'language': 
          // Búsqueda más flexible para idiomas
          return voice.labels.language?.toLowerCase().includes(value.toLowerCase()) ||
                 voice.labels.accent?.toLowerCase().includes(value.toLowerCase()) ||
                 (value.toLowerCase() === 'spanish' && (
                   voice.labels.language?.toLowerCase().includes('spanish') ||
                   voice.labels.accent?.toLowerCase().includes('mexican') ||
                   voice.labels.accent?.toLowerCase().includes('spanish') ||
                   voice.name.toLowerCase().includes('spanish')
                 ));
        case 'accent': 
          return voice.labels.accent?.toLowerCase().includes(value.toLowerCase());
        case 'age': 
          return voice.labels.age === value;
        default: 
          return true;
      }
    });
    
    return matchesSearch && matchesFilters;
  });

  const toggleFilter = (type: string, value: string) => {
    const filterKey = `${type}:${value}`;
    setActiveFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(filterKey)) {
        newFilters.delete(filterKey);
      } else {
        // Remover otros filtros del mismo tipo
        Array.from(newFilters).forEach(filter => {
          if (filter.startsWith(`${type}:`)) {
            newFilters.delete(filter);
          }
        });
        newFilters.add(filterKey);
      }
      return newFilters;
    });
  };

  const playVoicePreview = async (voice: ElevenLabsVoice, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Detener audio actual si está reproduciéndose
    if (playingVoiceId) {
      const currentAudio = audioRefs.current.get(playingVoiceId);
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      
      if (playingVoiceId === voice.voice_id) {
        setPlayingVoiceId(null);
        return;
      }
    }
    
    setPlayingVoiceId(voice.voice_id);
    
    try {
      if (voice.preview_url) {
        const audio = new Audio(voice.preview_url);
        audioRefs.current.set(voice.voice_id, audio);
        
        audio.onended = () => setPlayingVoiceId(null);
        audio.onerror = () => setPlayingVoiceId(null);
        
        await audio.play();
      } else {
        // Generar preview personalizado
        const language = voice.labels.language || 'en';
        const previewText = translationService.getRandomPreviewPhrase(language);
        
        const result = await elevenLabsService.textToSpeech(
          previewText,
          voice.voice_id,
          { stability: 0.5, similarity_boost: 0.7, style: 0.2, use_speaker_boost: true },
          'eleven_multilingual_v2'
        );

        if (result.success && result.audioBlob) {
          const audioUrl = elevenLabsService.createAudioUrl(result.audioBlob);
          const audio = new Audio(audioUrl);
          audioRefs.current.set(voice.voice_id, audio);
          
          audio.onended = () => setPlayingVoiceId(null);
          audio.onerror = () => setPlayingVoiceId(null);
          
          await audio.play();
        }
      }
    } catch (error) {
      console.error('Error reproduciendo preview:', error);
      setPlayingVoiceId(null);
    }
  };

  const handleVoiceSelect = (voice: ElevenLabsVoice) => {
    setSelectedVoice(voice);
    
    // Actualizar voces recientes
    setRecentVoices(prev => {
      const filtered = prev.filter(v => v.voice_id !== voice.voice_id);
      return [voice, ...filtered].slice(0, 5);
    });
  };

  const navigateToTTS = (voice: ElevenLabsVoice) => {
    handleVoiceSelect(voice);
    setActiveSubTab('text-to-speech');
  };

  const cardClass = isLinearTheme 
    ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700';

  const subTabs = [
    { 
      id: 'library' as const, 
      label: 'Biblioteca de Voces', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    { 
      id: 'text-to-speech' as const, 
      label: 'Text to Speech', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728" />
        </svg>
      )
    },
    { 
      id: 'speech-to-speech' as const, 
      label: 'Speech to Speech', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    { 
      id: 'speech-to-text' as const, 
      label: 'Speech to Text', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    { 
      id: 'sound-effects' as const, 
      label: 'Efectos de Sonido', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      )
    }
  ];

  const renderLibraryTab = () => {
    const availableFilters = getAvailableFilters();
    
    return (
      <div className="space-y-6">
        {/* Búsqueda sofisticada */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nombre, estilo, idioma..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-slate-50 dark:bg-slate-900/50 border-0 rounded-2xl focus:ring-2 focus:ring-purple-500/20 focus:bg-white dark:focus:bg-slate-800 transition-all duration-300 text-slate-900 dark:text-white placeholder-slate-400"
          />
          <svg className="absolute left-4 top-4 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filtros sofisticados */}
        <div className="space-y-4">
          {Array.from(availableFilters.entries()).map(([type, values]) => (
            <div key={type} className="space-y-2">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                {type === 'category' ? 'Categoría' : 
                 type === 'gender' ? 'Género' :
                 type === 'language' ? 'Idioma' :
                 type === 'accent' ? 'Acento' : 
                 type === 'age' ? 'Edad' : type}
              </h4>
              <div className="flex flex-wrap gap-2">
                {Array.from(values).map(value => {
                  const filterKey = `${type}:${value}`;
                  const isActive = activeFilters.has(filterKey);
                  
                  return (
                    <button
                      key={value}
                      onClick={() => toggleFilter(type, value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          
          {activeFilters.size > 0 && (
            <button
              onClick={() => setActiveFilters(new Set())}
              className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 transition-colors"
            >
              Limpiar filtros ({activeFilters.size})
            </button>
          )}
        </div>

        {/* Galería de voces sofisticada */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
              </div>
            ))
          ) : (
            filteredVoices.map((voice, index) => {
              const isPlaying = playingVoiceId === voice.voice_id;
              const isSelected = selectedVoice?.voice_id === voice.voice_id;
              
              // Gradientes elegantes por categoría
              const gradients = {
                premade: 'from-blue-500 to-cyan-500',
                cloned: 'from-emerald-500 to-teal-500',
                generated: 'from-purple-500 to-pink-500',
                professional: 'from-orange-500 to-red-500'
              };
              
              const gradient = gradients[voice.category as keyof typeof gradients] || gradients.premade;
              
              return (
                <div
                  key={voice.voice_id}
                  className={`group relative overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer ${
                    isSelected 
                      ? 'ring-2 ring-purple-500 shadow-xl shadow-purple-500/20 scale-105' 
                      : 'hover:shadow-lg hover:scale-102'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => handleVoiceSelect(voice)}
                >
                  {/* Fondo con gradiente */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity duration-300`}></div>
                  
                  {/* Contenido */}
                  <div className="relative p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    
                    {/* Header con información */}
                    <div className="flex items-start space-x-4 mb-4">
                      {/* Botón de reproducción circular */}
                      <button
                        onClick={(e) => playVoicePreview(voice, e)}
                        className={`relative w-16 h-16 rounded-full transition-all duration-300 flex-shrink-0 ${
                          isPlaying 
                            ? `bg-gradient-to-br ${gradient} shadow-xl shadow-purple-500/30 scale-110` 
                            : `bg-gradient-to-br ${gradient} opacity-90 hover:opacity-100 hover:shadow-lg hover:scale-105`
                        }`}
                      >
                        <div className="absolute inset-0 rounded-full bg-white/10"></div>
                        {isPlaying ? (
                          <svg className="w-6 h-6 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate mb-1">
                          {voice.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {voice.description || 'Voz profesional de alta calidad'}
                        </p>
                      </div>
                    </div>

                    {/* Metadatos elegantes */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${gradient} text-white`}>
                          {voice.category}
                        </span>
                        {voice.labels.language && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {voice.labels.language}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
                        {voice.labels.gender && (
                          <div className="flex items-center space-x-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>{voice.labels.gender}</span>
                          </div>
                        )}
                        {voice.labels.age && (
                          <div className="flex items-center space-x-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{voice.labels.age}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToTTS(voice);
                        }}
                        className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-slate-700 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-300 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200"
                      >
                        Usar para TTS
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVoice(voice);
                          setActiveSubTab('speech-to-speech');
                        }}
                        className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200"
                        title="Usar esta voz para Speech to Speech"
                      >
                        Usar para STS
                      </button>
                      
                      {isSelected && (
                        <div className="px-2 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {filteredVoices.length === 0 && !loading && (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-slate-500 dark:text-slate-400">
              No se encontraron voces con los criterios seleccionados
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderSTSTab = () => (
    <div className="space-y-6">
      {/* Selector de voz actual */}
      {selectedVoice && (
        <div className={`${cardClass} rounded-2xl p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {selectedVoice.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedVoice.labels.gender} • {selectedVoice.labels.language} • Speech to Speech
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setActiveSubTab('library')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
            >
              Cambiar voz
            </button>
          </div>
        </div>
      )}

      {/* Área de grabación y conversión */}
      <div className={`${cardClass} rounded-2xl p-6`}>
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Speech to Speech
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Graba tu voz o sube un archivo de audio para convertirlo usando la voz seleccionada
            </p>
          </div>

          {/* Opciones de entrada de audio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Opción 1: Grabar audio */}
            <div className={`p-4 border-2 border-dashed rounded-xl transition-all duration-300 ${
              !uploadedAudio 
                ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50'
            }`}>
              <div className="text-center">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <h4 className="font-medium text-slate-900 dark:text-white mb-1">Grabar Audio</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Usa tu micrófono</p>
              </div>
            </div>

            {/* Opción 2: Subir archivo */}
            <div 
              className={`p-4 border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer ${
                isDragOverSts
                  ? 'border-purple-400 dark:border-purple-500 bg-purple-100 dark:bg-purple-900/30'
                  : uploadedAudio
                    ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 hover:border-purple-300 dark:hover:border-purple-700'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOverSts(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragOverSts(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOverSts(false);
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                  const file = files[0];
                  // Verificar que sea un archivo de audio soportado
                  const supportedFormats = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/webm'];
                  if (supportedFormats.includes(file.type) || file.name.match(/\.(mp3|wav|flac|ogg|webm|m4a)$/i)) {
                    setUploadedAudio(file);
                    setRecordedAudio(null); // Limpiar grabación si existe
                  } else {
                    alert('❌ Formato no soportado. Usa: MP3, WAV, FLAC, OGG, WebM, M4A');
                  }
                }
              }}
              onClick={() => stsFileInputRef.current?.click()}
            >
              <div className="text-center">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <h4 className="font-medium text-slate-900 dark:text-white mb-1">
                  {uploadedAudio ? uploadedAudio.name : 'Subir Archivo'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {uploadedAudio 
                    ? `${(uploadedAudio.size / 1024 / 1024).toFixed(2)} MB`
                    : 'MP3, WAV, FLAC, OGG, WebM, M4A'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Input oculto para archivos */}
          <input
            ref={stsFileInputRef}
            type="file"
            accept=".mp3,.wav,.flac,.ogg,.webm,.m4a,audio/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setUploadedAudio(file);
                setRecordedAudio(null); // Limpiar grabación si existe
              }
            }}
            className="hidden"
          />

          {/* Estado del micrófono */}
          {micPermission === 'denied' && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
                <span className="text-red-800 dark:text-red-200 font-medium">
                  Acceso al micrófono denegado
                </span>
              </div>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Habilita el micrófono en la configuración del navegador para usar esta función
              </p>
            </div>
          )}

          {/* Controles de grabación */}
          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={async () => {
                if (!isRecording) {
                  // Limpiar audio anterior
                  setRecordedAudio(null);
                  setUploadedAudio(null); // También limpiar archivo subido
                  
                  // Solicitar permisos de micrófono
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    setMicPermission('granted');
                    localStorage.setItem('mic_permission_ai_models', 'granted');
                    
                    // Configurar MediaRecorder con formato compatible
                    const options = { mimeType: 'audio/webm;codecs=opus' };
                    const recorder = new MediaRecorder(stream, options);
                    const chunks: BlobPart[] = [];
                    
                    recorder.ondataavailable = (e) => chunks.push(e.data);
                    recorder.onstop = () => {
                      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                      setRecordedAudio(audioBlob);
                      console.log('🎤 Audio grabado:', {
                        size: audioBlob.size,
                        type: audioBlob.type
                      });
                    };
                    
                    setMediaRecorder(recorder);
                    recorder.start();
                    setIsRecording(true);
                    
                    console.log('🎤 Grabación iniciada');
                  } catch (error) {
                    console.error('❌ Error accediendo al micrófono:', error);
                    setMicPermission('denied');
                    localStorage.setItem('mic_permission_ai_models', 'denied');
                  }
                } else {
                  // Detener grabación
                  if (mediaRecorder) {
                    mediaRecorder.stop();
                    mediaRecorder.stream.getTracks().forEach(track => track.stop());
                    setIsRecording(false);
                    console.log('⏹️ Grabación detenida');
                  }
                }
              }}
              disabled={micPermission === 'denied' || uploadedAudio !== null}
              className={`w-24 h-24 rounded-full transition-all duration-300 flex items-center justify-center ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : micPermission === 'denied' || uploadedAudio
                    ? 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
              } disabled:bg-slate-300 disabled:cursor-not-allowed`}
            >
              {isRecording ? (
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h12v12H6z"/>
                </svg>
              ) : (
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              )}
            </button>
            
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              {isRecording 
                ? 'Grabando... Haz clic para detener' 
                : uploadedAudio
                  ? 'Archivo subido - Usa el botón convertir'
                : micPermission === 'denied'
                  ? 'Micrófono no disponible'
                  : 'Haz clic para grabar o sube un archivo arriba'
              }
            </p>
          </div>

          {/* Configuración de STS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Modelo STS
              </label>
              <select
                value={stsModel}
                onChange={(e) => setStsModel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="eleven_multilingual_sts_v2">Multilingual STS v2 (Recomendado)</option>
                <option value="eleven_english_sts_v2">English STS v2</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Estabilidad: {stsSettings.stability.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={stsSettings.stability}
                onChange={(e) => setStsSettings(prev => ({ ...prev, stability: parseFloat(e.target.value) }))}
                className="w-full accent-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Similarity: {stsSettings.similarity_boost.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={stsSettings.similarity_boost}
                onChange={(e) => setStsSettings(prev => ({ ...prev, similarity_boost: parseFloat(e.target.value) }))}
                className="w-full accent-blue-500"
              />
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={stsSettings.use_speaker_boost}
                  onChange={(e) => setStsSettings(prev => ({ ...prev, use_speaker_boost: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Speaker Boost
                </span>
              </label>
            </div>
          </div>

          {/* Audio grabado */}
          {(recordedAudio || uploadedAudio) && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-slate-900 dark:text-white">
                    Audio {uploadedAudio ? 'Subido' : 'Grabado'}
                  </h4>
                  <button
                    onClick={() => {
                      setRecordedAudio(null);
                      setUploadedAudio(null);
                      if (stsFileInputRef.current) {
                        stsFileInputRef.current.value = '';
                      }
                    }}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
                    title="Limpiar audio"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <audio controls className="w-full">
                  <source src={URL.createObjectURL(uploadedAudio || recordedAudio!)} type={uploadedAudio?.type || 'audio/webm'} />
                </audio>
                {uploadedAudio && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {uploadedAudio.name} • {(uploadedAudio.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>

              {/* Botón para convertir */}
              <button
                onClick={async () => {
                  if (!selectedVoice || (!recordedAudio && !uploadedAudio)) return;
                  
                  
                  // Verificar tokens antes de convertir
                  if (user?.id) {
                    const tokensRequired = 25; // Costo real según API ElevenLabs (character-cost: 25)
                    const { tokenService } = await import('../../services/tokenService');
                    const canUse = await tokenService.canUseTokens(user.id, 'speech-to-speech', tokensRequired);
                    
                    if (!canUse.allowed) {
                      alert(`❌ ${canUse.reason}`);
                      return;
                    }
                  }
                  
                  setIsGenerating(true);
                  
                  try {
                    // Usar audio grabado o archivo subido
                    const audioFile = uploadedAudio || new File([recordedAudio!], 'recorded_audio.webm', { type: 'audio/webm' });
                    
                    console.log('🎤 Procesando audio:', {
                      fileName: audioFile.name,
                      size: audioFile.size,
                      type: audioFile.type,
                      source: uploadedAudio ? 'uploaded' : 'recorded'
                    });
                    
                    const result = await elevenLabsService.speechToSpeech(
                      audioFile,
                      selectedVoice.voice_id,
                      stsSettings,
                      stsModel
                    );

                    if (result.success && result.audioBlob) {
                      const audioUrl = elevenLabsService.createAudioUrl(result.audioBlob);
                      
                      // Generar nombre único para el archivo
                      const fileName = `sts_${selectedVoice.voice_id}_${Date.now()}.mp3`;
                      
                      // Subir audio al bucket (en background)
                      const uploadPromise = elevenLabsService.uploadAudioToStorage(result.audioBlob, fileName);
                      
                      const newGeneration = {
                        user_id: user?.id || '',
                        generation_type: 'speech_to_speech', // Valor correcto con underscore
                        original_text: 'Speech to Speech conversion',
                        voice_id: selectedVoice.voice_id,
                        voice_name: selectedVoice.name,
                        model_id: stsModel,
                        voice_settings: stsSettings,
                        audio_file_url: audioUrl,
                        character_count: 0, // No aplica para STS
                        cost_credits: 100,
                        status: 'completed'
                      };

                      // Crear objeto para el estado local
                      const localGeneration: AudioGeneration = {
                        id: `sts_${Date.now()}`,
                        ...newGeneration,
                        // type: 'tts', // Para compatibilidad local (removido por tipos)
                        text: 'Speech to Speech', // Para compatibilidad local
                        audio_blob: result.audioBlob,
                        created_at: new Date().toISOString()
                      };

                      // Guardar en base de datos (sin bloquear la UI)
                      aiModelsDbService.saveAudioGeneration(newGeneration).then(async dbResult => {
                        if (dbResult.success) {
                          console.log('✅ STS guardado en BD:', dbResult.id);
                          
                          // Esperar a que se suba al bucket y actualizar URL
                          try {
                            const uploadResult = await uploadPromise;
                            if (uploadResult.success && uploadResult.url && dbResult.id) {
                              await aiModelsDbService.updateAudioUrl(dbResult.id, uploadResult.url);
                              console.log('✅ URL del bucket actualizada en BD');
                            }
                          } catch (error) {
                            console.log('⚠️ Bucket upload falló, usando URL temporal');
                          }
                          
                          // Recargar historial para mostrar el nuevo registro
                          setTimeout(() => reloadHistory(), 1000);
                        } else {
                          console.error('❌ Error guardando STS en BD:', dbResult.error);
                        }
                      });

                      // Actualizar historial de STS
                      setStsHistory(prev => [localGeneration, ...prev.slice(0, 99)]);
                      
                      // Reproducir resultado
                      const audio = new Audio(audioUrl);
                      audio.play().catch(console.error);
                      
                      // Consumir tokens
                      if (user?.id) {
                        const { tokenService } = await import('../../services/tokenService');
                        await tokenService.consumeTokens(user.id, 'speech-to-speech', 25); // Costo real según API
                        
                        // Actualizar display
                        const updatedTokenInfo = await tokenService.getUserTokenInfo(user.id);
                        if (updatedTokenInfo) {
                          setUserTokens({
                            used: updatedTokenInfo.current_month_usage,
                            limit: updatedTokenInfo.monthly_limit
                          });
                        }
                      }
                    }
                  } catch (error) {
                    console.error('Error en Speech to Speech:', error);
                    
                    // Mostrar error específico al usuario
                    let errorMessage = 'Error desconocido en Speech to Speech';
                    if (error instanceof Error) {
                      if (error.message.includes('500')) {
                        errorMessage = 'Esta voz no es compatible con Speech to Speech. Prueba con otra voz de la biblioteca.';
                      } else if (error.message.includes('422')) {
                        errorMessage = 'Formato de audio no válido. Intenta grabar de nuevo.';
                      } else {
                        errorMessage = error.message;
                      }
                    }
                    
                    alert(`❌ ${errorMessage}`);
                  } finally {
                    setIsGenerating(false);
                  }
                }}
                disabled={isGenerating || !selectedVoice || (!recordedAudio && !uploadedAudio)}
                className="w-full h-14 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-3"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Convirtiendo...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>Convertir Voz</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Historial de STS */}
      {(stsHistory.length > 0 || user?.id) && (
        <div className={`${cardClass} rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Historial de Speech to Speech ({stsHistory.length})
            </h3>
            <div className="flex items-center space-x-2">
              <button 
                onClick={reloadHistory}
                className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 transition-colors flex items-center space-x-1"
                title="Recargar historial desde BD"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Recargar</span>
              </button>
              {stsHistory.length > 20 && (
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors">
                  Ver más
                </button>
              )}
            </div>
          </div>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {stsHistory.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-slate-500 dark:text-slate-400 mb-2">No hay conversiones de voz aún</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Las conversiones aparecerán aquí después de grabar y convertir</p>
              </div>
            ) : (
              stsHistory.slice(0, 20).map((item, index) => (
              <div key={item.id} className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors duration-200">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-slate-900 dark:text-white text-sm">
                      {item.voice_name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(item.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Conversión de voz • {item.model_id}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const audioUrl = (item as any).audio_file_url || (item as any).audio_url;
                      if (audioUrl) {
                        console.log('🎵 Reproduciendo STS:', audioUrl);
                        const audio = new Audio();
                        
                        // Configurar CORS y headers
                        audio.crossOrigin = 'anonymous';
                        audio.preload = 'auto';
                        
                        audio.onloadstart = () => console.log('🔄 Cargando audio STS...');
                        audio.oncanplay = () => console.log('✅ Audio STS listo');
                        audio.onerror = (e) => {
                          console.error('❌ Error reproduciendo STS:', e);
                          
                          // Fallback: usar blob si está disponible
                          if (item.audio_blob) {
                            const blobUrl = elevenLabsService.createAudioUrl(item.audio_blob);
                            const fallbackAudio = new Audio(blobUrl);
                            fallbackAudio.play().catch(err => console.error('❌ Fallback STS falló:', err));
                          }
                        };
                        
                        audio.src = audioUrl;
                        audio.play().catch(console.error);
                      }
                    }}
                    className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => item.audio_blob && elevenLabsService.downloadAudio(item.audio_blob, `sts_${item.voice_name}_${item.id}.mp3`)}
                    className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>

                  <button
                    onClick={() => {
                      // Reutilizar voz para nueva conversión
                      setSelectedVoice(voices.find(v => v.voice_id === item.voice_id) || selectedVoice);
                      setStsSettings(item.voice_settings);
                      setStsModel(item.model_id);
                      
                      // Limpiar audio grabado para nueva grabación
                      setRecordedAudio(null);
                    }}
                    className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors duration-200"
                    title="Reutilizar configuración"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
            )))}
          </div>
          
          {stsHistory.length > 20 && (
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mostrando 20 de {stsHistory.length} conversiones • Máximo 100 en historial
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderTTSTab = () => (
    <div className="space-y-6">
      {/* Selector de voz actual */}
      {selectedVoice && (
        <div className={`${cardClass} rounded-2xl p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {selectedVoice.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedVoice.labels.gender} • {selectedVoice.labels.language} • {selectedVoice.category}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setActiveSubTab('library')}
              className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 transition-colors"
            >
              Cambiar voz
            </button>
          </div>
        </div>
      )}

      {/* Área de generación con configuración avanzada */}
      <div className={`${cardClass} rounded-2xl p-6`}>
        <div className="space-y-6">
          <textarea
            value={textToGenerate}
            onChange={(e) => setTextToGenerate(e.target.value)}
            placeholder="Escribe el texto que quieres convertir a audio..."
            className="tag-textarea w-full h-40 p-4 border-0 rounded-xl focus:ring-2 focus:ring-purple-500/20 resize-none transition-all duration-300 text-slate-900 dark:text-white"
            maxLength={5000}
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
              lineHeight: '1.6',
              letterSpacing: '0.025em'
            }}
          />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              {textToGenerate.length}/5000 caracteres
            </span>
            <span className="text-purple-600 dark:text-purple-400 font-medium">
              ~{elevenLabsService.estimateCost(textToGenerate, selectedModel).estimatedCredits} créditos
            </span>
          </div>

          {/* Tags de ElevenLabs v3 */}
          {getModelCapabilities(selectedModel).supportsTags && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-100 dark:border-purple-800/30">
              <div className="flex items-center space-x-2 mb-3">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <h5 className="font-medium text-purple-900 dark:text-purple-100">
                  Tags de Expresión (Modelo v3)
                </h5>
              </div>
              
              <div className="space-y-3">
                {Object.entries(tagsByCategory).map(([category, tags]) => (
                  <div key={category}>
                    <h6 className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2 uppercase tracking-wide">
                      {category}
                    </h6>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <button
                          key={tag.value}
                          onClick={() => insertTag(tag.value)}
                          className={`px-3 py-1.5 text-xs rounded-full transition-all duration-200 transform hover:scale-105 ${
                            tag.tested 
                              ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/50 hover:border-purple-300 dark:hover:border-purple-600'
                              : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                          }`}
                          title={`Insertar tag: [${tag.value}] ${tag.tested ? '(Verificado)' : '(Experimental)'}`}
                        >
                          {tag.label} {!tag.tested && '⚠️'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 p-2 bg-purple-100/50 dark:bg-purple-900/30 rounded-lg">
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  💡 <strong>Tip:</strong> Los tags v3 usan corchetes. 
                  <br />
                  <strong>Ejemplo:</strong> [whisper] Hola mundo → se pronuncia en susurro
                  <br />
                  <strong>✅ Verificados:</strong> Funcionan consistentemente
                  <br />
                  <strong>⚠️ Experimentales:</strong> Pueden no funcionar (v3 en alpha)
                </p>
              </div>
            </div>
          )}

          {/* Configuración avanzada específica por modelo */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-slate-900 dark:text-white">
                Configuración Avanzada
              </h4>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                  {selectedModel}
                </span>
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                  </svg>
                  <span>Auto-guardado</span>
                </span>
              </div>
            </div>
            
            {(() => {
              const capabilities = getModelCapabilities(selectedModel);
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Modelo */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Modelo
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                    >
                      {models.map(model => (
                        <option key={model.model_id} value={model.model_id}>
                          {model.name} ({model.token_cost_factor}x)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Estabilidad - Específica por modelo */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Estabilidad: {voiceSettings.stability.toFixed(1)}
                    </label>
                    {capabilities.stabilityValues === 'continuous' ? (
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={voiceSettings.stability}
                        onChange={(e) => setVoiceSettings(prev => ({ ...prev, stability: parseFloat(e.target.value) }))}
                        className="w-full accent-purple-500"
                      />
                    ) : (
                      <select
                        value={voiceSettings.stability}
                        onChange={(e) => setVoiceSettings(prev => ({ ...prev, stability: parseFloat(e.target.value) }))}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                      >
                        <option value="0.0">Creativo (0.0)</option>
                        <option value="0.5">Natural (0.5)</option>
                        <option value="1.0">Robusto (1.0)</option>
                      </select>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {capabilities.stabilityValues === 'continuous' ? 'Consistencia de la voz' : 'Solo valores específicos para este modelo'}
                    </p>
                  </div>

                  {/* Similarity Boost */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Similarity: {voiceSettings.similarity_boost.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step={capabilities.stabilityValues === 'continuous' ? "0.1" : "0.5"}
                      value={voiceSettings.similarity_boost}
                      onChange={(e) => setVoiceSettings(prev => ({ ...prev, similarity_boost: parseFloat(e.target.value) }))}
                      className="w-full accent-purple-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">Similitud con voz original</p>
                  </div>

                  {/* Estilo - Solo si el modelo lo soporta */}
                  {capabilities.supportsStyle && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Estilo: {(voiceSettings.style || 0).toFixed(1)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={voiceSettings.style || 0}
                        onChange={(e) => setVoiceSettings(prev => ({ ...prev, style: parseFloat(e.target.value) }))}
                        className="w-full accent-purple-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">Expresividad y emoción</p>
                    </div>
                  )}

                  {/* Velocidad - Solo para modelos que lo soportan */}
                  {capabilities.supportsSpeed ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Velocidad: {voiceSpeed}x
                      </label>
                      <select
                        value={voiceSpeed}
                        onChange={(e) => {
                          const newSpeed = parseFloat(e.target.value);
                          console.log('🎛️ Evento onChange:', { 
                            eventValue: e.target.value,
                            parsedValue: newSpeed,
                            currentState: voiceSpeed,
                            willChange: newSpeed !== voiceSpeed
                          });
                          
                          setVoiceSpeed(newSpeed);
                          voiceSpeedRef.current = newSpeed;
                          console.log('✅ Estado actualizado a:', newSpeed);
                        }}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                        style={{ 
                          backgroundColor: voiceSpeed !== 1.0 ? '#fef3c7' : 'transparent',
                          border: voiceSpeed !== 1.0 ? '2px solid #f59e0b' : undefined
                        }}
                        key={`speed-${selectedModel}-${voiceSpeed}`}
                      >
                        <option value="0.5">Muy lenta (0.5x)</option>
                        <option value="0.75">Lenta (0.75x)</option>
                        <option value="1.0">Normal (1.0x)</option>
                        <option value="1.25">Rápida (1.25x)</option>
                        <option value="1.5">Muy rápida (1.5x)</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">
                        Velocidad de reproducción (speech_rate)
                      </p>
                    </div>
                  ) : (
                    // Nota para modelos que no soportan speech_rate
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                      <div className="flex items-center space-x-2 mb-1">
                        <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                          Velocidad con Tags
                        </span>
                      </div>
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        Este modelo usa tags para velocidad: <code>[slow]</code> o <code>[fast]</code>
                      </p>
                    </div>
                  )}

                  {/* Formato de salida */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Formato de Audio
                    </label>
                    <select
                      value={outputFormat}
                      onChange={(e) => setOutputFormat(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                    >
                      {capabilities.supportedFormats.map(format => (
                        <option key={format} value={format}>
                          {format.toUpperCase().replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Calidad y formato de salida</p>
                  </div>

                  {/* Seed - Solo si el modelo lo soporta */}
                  {capabilities.supportsSeed && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Seed (Reproducibilidad)
                      </label>
                      <input
                        type="number"
                        placeholder="Ej: 12345"
                        value={seed || ''}
                        onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                      <p className="text-xs text-slate-500 mt-1">Para resultados idénticos</p>
                    </div>
                  )}

                  {/* Optimización de latencia - Solo para Turbo */}
                  {selectedModel.includes('turbo') && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Optimización: {optimizeLatency}
                      </label>
                      <select
                        value={optimizeLatency}
                        onChange={(e) => setOptimizeLatency(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                      >
                        <option value="0">Calidad máxima</option>
                        <option value="1">Balanceado</option>
                        <option value="2">Latencia mínima</option>
                        <option value="3">Ultra rápido</option>
                        <option value="4">Máxima velocidad</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">Balance calidad/velocidad</p>
                    </div>
                  )}

                  {/* Speaker Boost - Solo si el modelo lo soporta */}
                  {capabilities.supportsSpeakerBoost && (
                    <div className="flex flex-col justify-center">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={voiceSettings.use_speaker_boost}
                          onChange={(e) => setVoiceSettings(prev => ({ ...prev, use_speaker_boost: e.target.checked }))}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          Speaker Boost
                        </span>
                      </label>
                      <p className="text-xs text-slate-500 mt-1">Mejora claridad y volumen</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Presets rápidos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'Profesional', settings: { stability: 0.5, similarity_boost: 0.7, style: 0.0, use_speaker_boost: true }, desc: 'Para presentaciones' },
              { name: 'Expresivo', settings: { stability: 0.3, similarity_boost: 0.8, style: 0.4, use_speaker_boost: true }, desc: 'Para ventas' },
              { name: 'Estable', settings: { stability: 0.7, similarity_boost: 0.5, style: 0.1, use_speaker_boost: false }, desc: 'Para narraciones' },
              { name: 'Natural', settings: { stability: 0.4, similarity_boost: 0.9, style: 0.2, use_speaker_boost: true }, desc: 'Conversacional' }
            ].map((preset, index) => (
              <button
                key={index}
                onClick={() => setVoiceSettings(preset.settings)}
                className="p-3 text-left bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                <div className="font-medium text-slate-900 dark:text-white text-sm">
                  {preset.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {preset.desc}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={async () => {
              if (!selectedVoice || !textToGenerate.trim()) return;
              
              // Verificar límites de tokens antes de generar
              if (user?.id) {
                const tokensRequired = elevenLabsService.estimateCost(textToGenerate, selectedModel).estimatedCredits;
                const { tokenService } = await import('../../services/tokenService');
                const canUse = await tokenService.canUseTokens(user.id, 'text-to-speech', tokensRequired);
                
                if (!canUse.allowed) {
                  alert(`❌ ${canUse.reason}`);
                  return;
                }
              }
              
              setIsGenerating(true);
              
              try {
                const result = await elevenLabsService.textToSpeech(
                  textToGenerate,
                  selectedVoice.voice_id,
                  voiceSettings,
                  selectedModel,
                  seed,
                  outputFormat,
                  optimizeLatency,
                  voiceSpeedRef.current
                );

                if (result.success && result.audioBlob) {
                  const audioUrl = elevenLabsService.createAudioUrl(result.audioBlob);
                  
                  // Generar nombre único para el archivo
                  const fileName = `tts_${selectedVoice.voice_id}_${Date.now()}.mp3`;
                  
                  // Subir audio al bucket (en background)
                  const uploadPromise = elevenLabsService.uploadAudioToStorage(result.audioBlob, fileName);
                  
                  const newGeneration = {
                    user_id: user?.id || '',
                    generation_type: 'text_to_speech',
                    original_text: textToGenerate,
                    voice_id: selectedVoice.voice_id,
                    voice_name: selectedVoice.name,
                    model_id: selectedModel,
                    voice_settings: voiceSettings,
                    seed,
                    audio_file_url: audioUrl, // URL temporal inicialmente
                    character_count: textToGenerate.length,
                    cost_credits: elevenLabsService.estimateCost(textToGenerate, selectedModel).estimatedCredits,
                    status: 'completed'
                  };

                  // Crear objeto para el estado local
                  const localGeneration: AudioGeneration = {
                    id: `tts_${Date.now()}`,
                    ...newGeneration,
                    type: 'tts', // Para compatibilidad local
                    text: textToGenerate, // Para compatibilidad local
                    audio_blob: result.audioBlob,
                    created_at: new Date().toISOString()
                  };

                  // Consumir tokens reales
                  if (user?.id) {
                    const tokensUsed = elevenLabsService.estimateCost(textToGenerate, selectedModel).estimatedCredits;
                    const { tokenService } = await import('../../services/tokenService');
                    await tokenService.consumeTokens(user.id, 'text-to-speech', tokensUsed);
                    
                    // Actualizar display de tokens
                    const updatedTokenInfo = await tokenService.getUserTokenInfo(user.id);
                    if (updatedTokenInfo) {
                      setUserTokens({
                        used: updatedTokenInfo.current_month_usage,
                        limit: updatedTokenInfo.monthly_limit
                      });
                    }
                  }

                  // Guardar en base de datos y actualizar URL cuando el bucket esté listo
                  const savePromise = aiModelsDbService.saveAudioGeneration(newGeneration).then(async dbResult => {
                    if (dbResult.success) {
                      console.log('✅ Audio guardado en BD:', dbResult.id);
                      
                      // Esperar a que se suba al bucket y actualizar URL
                      try {
                        const uploadResult = await uploadPromise;
                        if (uploadResult.success && uploadResult.url && dbResult.id) {
                          await aiModelsDbService.updateAudioUrl(dbResult.id, uploadResult.url);
                          console.log('✅ URL del bucket actualizada en BD');
                        }
                      } catch (error) {
                        console.log('⚠️ Bucket upload falló, usando URL temporal');
                      }
                      
                      // Recargar historial para mostrar el nuevo registro
                      setTimeout(() => reloadHistory(), 1000);
                    } else {
                      console.error('❌ Error guardando en BD:', dbResult.error);
                    }
                  });

                  // Actualizar UI inmediatamente
                  setTtsHistory(prev => [localGeneration, ...prev.slice(0, 99)]);
                  
                  // 🎵 REPRODUCIR AUTOMÁTICAMENTE
                  const audio = new Audio(audioUrl);
                  audio.play().catch(console.error);
                  
                  // NO borrar texto para permitir regeneración fácil
                  // setTextToGenerate('');
                }
              } catch (error) {
                console.error('Error:', error);
              } finally {
                setIsGenerating(false);
              }
            }}
            disabled={isGenerating || !selectedVoice || !textToGenerate.trim()}
            className="w-full h-14 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-3 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Generando...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728" />
                </svg>
                <span>Generar Audio</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Historial de TTS */}
      {(ttsHistory.length > 0 || user?.id) && (
        <div className={`${cardClass} rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Historial de Text to Speech ({ttsHistory.length})
            </h3>
            <div className="flex items-center space-x-2">
              <button 
                onClick={reloadHistory}
                className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 transition-colors flex items-center space-x-1"
                title="Recargar historial desde BD"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Recargar</span>
              </button>
              {ttsHistory.length > 20 && (
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors">
                  Ver más
                </button>
              )}
            </div>
          </div>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {ttsHistory.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <p className="text-slate-500 dark:text-slate-400 mb-2">No hay audios generados aún</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Los audios aparecerán aquí después de generarlos</p>
              </div>
            ) : (
              ttsHistory.slice(0, 20).map((item, index) => (
              <div key={item.id} className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors duration-200">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-slate-900 dark:text-white text-sm">
                      {item.voice_name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(item.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                    {item.text}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const audioUrl = (item as any).audio_file_url || (item as any).audio_url;
                      if (audioUrl) {
                        console.log('🎵 Intentando reproducir:', audioUrl);
                        const audio = new Audio();
                        
                        // Configurar CORS y headers
                        audio.crossOrigin = 'anonymous';
                        audio.preload = 'auto';
                        
                        audio.onloadstart = () => console.log('🔄 Cargando audio...');
                        audio.oncanplay = () => console.log('✅ Audio listo para reproducir');
                        audio.onerror = (e) => {
                          console.error('❌ Error reproduciendo audio:', e);
                          console.log('🔄 Intentando con blob si está disponible...');
                          
                          // Fallback: usar blob si está disponible
                          if (item.audio_blob) {
                            const blobUrl = elevenLabsService.createAudioUrl(item.audio_blob);
                            const fallbackAudio = new Audio(blobUrl);
                            fallbackAudio.play().catch(err => console.error('❌ Fallback también falló:', err));
                          }
                        };
                        
                        audio.src = audioUrl;
                        audio.play().catch(console.error);
                      }
                    }}
                    className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => item.audio_blob && elevenLabsService.downloadAudio(item.audio_blob, `${item.voice_name}_${item.id}.mp3`)}
                    className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>

                  <button
                    onClick={() => {
                      // Reutilizar configuración completa
                      setTextToGenerate(item.text);
                      setVoiceSettings(item.voice_settings);
                      setSelectedModel(item.model_id);
                      setSeed(item.seed);
                      
                      // Buscar y seleccionar la voz
                      const voice = voices.find(v => v.voice_id === item.voice_id);
                      if (voice) {
                        setSelectedVoice(voice);
                      }
                      
                      // Navegar a TTS
                      setActiveSubTab('text-to-speech');
                    }}
                    className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors duration-200"
                    title="Reutilizar configuración"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
            )))}
          </div>
          
          {ttsHistory.length > 20 && (
            <button className="w-full mt-4 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 transition-colors">
              Ver más ({ttsHistory.length - 20} adicionales)
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderSTTTab = () => (
    <div className="space-y-6">
      {/* Configuración avanzada de STT */}
      <div className={`${cardClass} rounded-2xl p-6`}>
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
          Configuración de Transcripción
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Modelo de Transcripción
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {models.filter(m => m.can_do_voice_conversion).map(model => (
                <option key={model.model_id} value={model.model_id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Idioma Esperado
            </label>
            <select className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
              <option value="auto">Detección automática</option>
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
              <option value="pt">Português</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Formato de Salida
            </label>
            <select className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
              <option value="text">Solo texto</option>
              <option value="srt">Subtítulos SRT</option>
              <option value="vtt">WebVTT</option>
              <option value="json">JSON con timestamps</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Incluir timestamps
            </span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Detectar hablantes
            </span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Filtrar ruido de fondo
            </span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Puntuación automática
            </span>
          </label>
        </div>
      </div>

      {/* Upload area */}
      <div
        className={`${cardClass} rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
          isDragOver 
            ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : sttFile 
            ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' 
            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const files = Array.from(e.dataTransfer.files);
          const audioFile = files.find(file => file.type.startsWith('audio/'));
          if (audioFile) setSttFile(audioFile);
        }}
      >
        {sttFile ? (
          <div className="space-y-4">
            <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {sttFile.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {(sttFile.size / 1024 / 1024).toFixed(2)} MB • {Math.ceil(sttFile.size / 1024 / 1024 * 60)} segundos aprox.
              </p>
            </div>
            
            {/* Información del archivo */}
            <div className="grid grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-400">
              <div>
                <span className="font-medium">Tipo:</span>
                <br />
                {sttFile.type}
              </div>
              <div>
                <span className="font-medium">Tamaño:</span>
                <br />
                {(sttFile.size / 1024 / 1024).toFixed(2)} MB
              </div>
              <div>
                <span className="font-medium">Tokens est.:</span>
                <br />
                ~{Math.ceil(sttFile.size / 1024 / 1024 * 60)} tokens
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <svg className="w-16 h-16 text-slate-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Arrastra tu archivo de audio
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                MP3, WAV, M4A, FLAC • Máximo 25MB • Hasta 2 horas
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Formatos soportados: MP3, WAV, M4A, FLAC, OGG, WEBM
              </p>
            </div>
          </div>
        )}
      </div>

      {sttFile && (
        <button
          onClick={async () => {
            if (!sttFile) return;
            setSttLoading(true);
            try {
              const result = await elevenLabsService.speechToText(sttFile, selectedModel);
              if (result.success && result.result) {
                setSttResult(result.result.text);
                setSttHistory(prev => [{
                  id: `stt_${Date.now()}`,
                  filename: sttFile.name,
                  text: result.result.text,
                  model: selectedModel,
                  fileSize: sttFile.size,
                  created_at: new Date().toISOString()
                }, ...prev.slice(0, 19)]);
              }
            } catch (error) {
              console.error('Error:', error);
            } finally {
              setSttLoading(false);
            }
          }}
          disabled={sttLoading}
          className="w-full h-14 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-3"
        >
          {sttLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Transcribiendo...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Transcribir Audio</span>
            </>
          )}
        </button>
      )}

      {sttResult && (
        <div className={`${cardClass} rounded-2xl p-6`}>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
            Transcripción
          </h3>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl mb-4">
            <p className="text-slate-900 dark:text-white leading-relaxed">
              {sttResult}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => navigator.clipboard.writeText(sttResult)}
              className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              Copiar
            </button>
            <button
              onClick={() => {
                setTextToGenerate(sttResult);
                setActiveSubTab('text-to-speech');
              }}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300"
            >
              Usar para TTS
            </button>
          </div>
        </div>
      )}

      {/* Historial de STT */}
      {sttHistory.length > 0 && (
        <div className={`${cardClass} rounded-2xl p-6`}>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
            Historial de Transcripciones ({sttHistory.length})
          </h3>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {sttHistory.slice(0, 20).map((item, index) => (
              <div key={item.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900 dark:text-white text-sm">
                    {item.filename}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(item.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={(e) => setSttFile(e.target.files?.[0] || null)}
        className="hidden"
      />
    </div>
  );

  const renderEffectsTab = () => (
    <div className="space-y-6">
      {/* Generación de efectos */}
      <div className={`${cardClass} rounded-2xl p-6`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Generar Efecto de Sonido
          </h3>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoTranslate}
              onChange={(e) => setAutoTranslate(e.target.checked)}
              className="rounded border-slate-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Auto-traducir al inglés
            </span>
            {autoTranslate && (
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center space-x-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                <span>Activo</span>
              </span>
            )}
          </label>
        </div>

        <div className="space-y-6">
          <textarea
            value={effectPrompt}
            onChange={(e) => setEffectPrompt(e.target.value)}
            placeholder="Describe el efecto de sonido que quieres generar..."
            className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-900/50 border-0 rounded-xl focus:ring-2 focus:ring-green-500/20 resize-none transition-all duration-300 text-slate-900 dark:text-white placeholder-slate-400"
            maxLength={500}
          />

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Duración: {effectDuration}s
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={effectDuration}
                onChange={(e) => setEffectDuration(parseInt(e.target.value))}
                className="w-full accent-green-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1s</span>
                <span>30s (máximo oficial)</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Límite máximo de ElevenLabs para efectos de sonido
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Influencia: {effectInfluence.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={effectInfluence}
                onChange={(e) => setEffectInfluence(parseFloat(e.target.value))}
                className="w-full accent-green-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0.0 (libre)</span>
                <span>1.0 (estricto)</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Controla qué tan fielmente el efecto sigue tu descripción. 
                Valores bajos permiten más creatividad, valores altos siguen el prompt exactamente.
              </p>
            </div>
          </div>

          <button
            onClick={async () => {
              if (!effectPrompt.trim()) return;
              
              // Verificar límites de tokens antes de generar
              if (user?.id) {
                const tokensRequired = 100; // Costo real según API de ElevenLabs (character-cost: 100)
                const { tokenService } = await import('../../services/tokenService');
                const canUse = await tokenService.canUseTokens(user.id, 'sound-effects', tokensRequired);
                
                if (!canUse.allowed) {
                  alert(`❌ ${canUse.reason}`);
                  return;
                }
              }
              
              setIsGenerating(true);
              
              try {
                let finalPrompt = effectPrompt;
                if (autoTranslate) {
                  console.log('🌐 Traduciendo efecto:', effectPrompt);
                  const translation = await translationService.translateForSoundEffects(effectPrompt);
                  console.log('🌐 Resultado traducción:', translation);
                  
                  if (translation.success && translation.translatedText && translation.translatedText !== effectPrompt) {
                    finalPrompt = translation.translatedText;
                    console.log('✅ Texto traducido:', finalPrompt);
                  } else {
                    console.log('⚠️ No se tradujo o ya estaba en inglés');
                  }
                }

                console.log('🎵 Generando efecto con prompt final:', finalPrompt);
                const result = await elevenLabsService.generateSoundEffect(
                  finalPrompt,
                  effectDuration,
                  effectInfluence
                );

                if (result.success && result.audioBlob) {
                  const audioUrl = elevenLabsService.createAudioUrl(result.audioBlob);
                  
                  const newEffect: AudioGeneration = {
                    id: `effect_${Date.now()}`,
                    user_id: user?.id || '',
                    generation_type: 'sound_effect',
                    original_text: effectPrompt,
                    translated_text: finalPrompt !== effectPrompt ? finalPrompt : undefined,
                    voice_id: 'sound_effect',
                    voice_name: 'Sound Effect',
                    model_id: 'sound_generation',
                    voice_settings: { duration: effectDuration, influence: effectInfluence },
                    audio_file_url: audioUrl,
                    character_count: effectPrompt.length,
                    duration_seconds: effectDuration,
                    cost_credits: 100, // Costo real según API ElevenLabs
                    status: 'completed',
                    created_at: new Date().toISOString(),
                    // Campos locales
                    type: 'sound_effect' as const,
                    text: effectPrompt,
                    audio_blob: result.audioBlob
                  };

                  // Subir al bucket de Supabase
                  const fileName = `sfx_${Date.now()}.mp3`;
                  const uploadPromise = elevenLabsService.uploadAudioToStorage(result.audioBlob, fileName);

                  // Guardar efecto en ai_audio_generations
                  const effectForDb = {
                    user_id: user?.id || '',
                    generation_type: 'sound_effect',
                    original_text: effectPrompt,
                    translated_text: finalPrompt !== effectPrompt ? finalPrompt : undefined,
                    voice_id: 'sound_effect',
                    voice_name: 'Efecto de Sonido',
                    model_id: 'eleven_sound_effects',
                    voice_settings: { duration: effectDuration },
                    audio_file_url: audioUrl, // URL temporal primero
                    character_count: effectPrompt.length,
                    duration_seconds: effectDuration,
                    file_size_bytes: result.audioBlob.size,
                    cost_credits: 100, // Costo real según API ElevenLabs
                    status: 'completed'
                  };

                  aiModelsDbService.saveAudioGeneration(effectForDb).then(async dbResult => {
                    if (dbResult.success) {
                      console.log('✅ Efecto guardado en ai_audio_generations:', dbResult.id);
                      
                      // Esperar a que se suba al bucket y actualizar URL
                      try {
                        const uploadResult = await uploadPromise;
                        if (uploadResult.success && uploadResult.url && dbResult.id) {
                          await aiModelsDbService.updateAudioUrl(dbResult.id, uploadResult.url);
                          console.log('✅ URL del efecto actualizada en BD');
                        }
                      } catch (error) {
                        console.log('⚠️ Bucket upload de efecto falló, usando URL temporal');
                      }
                      
                      // Recargar historial para mostrar el nuevo registro
                      setTimeout(() => reloadHistory(), 1000);
                    } else {
                      console.error('❌ Error guardando efecto en BD:', dbResult.error);
                    }
                  });

                  setEffectsHistory(prev => [newEffect, ...prev.slice(0, 49)]);
                  
                  // 🎵 REPRODUCIR AUTOMÁTICAMENTE
                  const audio = new Audio(audioUrl);
                  audio.play().catch(console.error);
                  
                  // Consumir tokens después de generación exitosa
                  if (user?.id) {
                    const tokensUsed = 100; // Costo real según API de ElevenLabs
                    const { tokenService } = await import('../../services/tokenService');
                    await tokenService.consumeTokens(user.id, 'sound-effects', tokensUsed);
                    
                    // Actualizar display de tokens
                    const updatedTokenInfo = await tokenService.getUserTokenInfo(user.id);
                    if (updatedTokenInfo) {
                      setUserTokens({
                        used: updatedTokenInfo.current_month_usage,
                        limit: updatedTokenInfo.monthly_limit
                      });
                    }
                  }
                  
                  // NO borrar prompt para permitir regeneración fácil
                  // setEffectPrompt('');
                }
              } catch (error) {
                console.error('Error:', error);
              } finally {
                setIsGenerating(false);
              }
            }}
            disabled={isGenerating || !effectPrompt.trim()}
            className="w-full h-14 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-3"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Generando...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span>Generar Efecto</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Historial de efectos */}
      {effectsHistory.length > 0 && (
        <div className={`${cardClass} rounded-2xl p-6`}>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
            Historial de Efectos ({effectsHistory.length})
          </h3>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {effectsHistory.slice(0, 20).map((effect, index) => (
              <div key={effect.id} className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors duration-200">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-teal-400 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(effect.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-900 dark:text-white line-clamp-2">
                    {effect.text}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const audioUrl = (effect as any).audio_file_url || effect.audio_url;
                      console.log('🎵 Reproduciendo efecto:', { 
                        audioUrl, 
                        hasBlob: !!effect.audio_blob,
                        effectId: effect.id,
                        isProduction: window.location.hostname !== 'localhost'
                      });
                      
                      // En producción, priorizar blob sobre URL del bucket
                      const isProduction = window.location.hostname !== 'localhost';
                      
                      if (isProduction && effect.audio_blob) {
                        console.log('🏭 Producción: usando blob directamente');
                        const blobUrl = elevenLabsService.createAudioUrl(effect.audio_blob);
                        const audio = new Audio(blobUrl);
                        audio.play().catch(err => {
                          console.error('❌ Error reproduciendo blob en producción:', err);
                          // Fallback a URL del bucket
                          if (audioUrl) {
                            console.log('🔄 Fallback a URL del bucket...');
                            const fallbackAudio = new Audio();
                            fallbackAudio.crossOrigin = 'anonymous';
                            fallbackAudio.src = audioUrl;
                            fallbackAudio.play().catch(console.error);
                          }
                        });
                        return;
                      }
                      
                      if (audioUrl) {
                        const audio = new Audio();
                        
                        // Configurar CORS y headers
                        audio.crossOrigin = 'anonymous';
                        audio.preload = 'auto';
                        
                        audio.onloadstart = () => console.log('🔄 Cargando efecto...');
                        audio.oncanplay = () => console.log('✅ Efecto listo');
                        audio.onerror = (e) => {
                          console.error('❌ Error reproduciendo efecto desde URL:', e);
                          
                          // Fallback: usar blob si está disponible
                          if (effect.audio_blob) {
                            console.log('🔄 Intentando fallback con blob...');
                            const blobUrl = elevenLabsService.createAudioUrl(effect.audio_blob);
                            const fallbackAudio = new Audio(blobUrl);
                            fallbackAudio.play().catch(err => console.error('❌ Fallback efecto falló:', err));
                          } else {
                            console.error('❌ No hay blob disponible para fallback');
                          }
                        };
                        
                        audio.src = audioUrl;
                        audio.play().catch(console.error);
                      } else {
                        console.error('❌ No hay URL de audio disponible para efecto');
                      }
                    }}
                    className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => effect.audio_blob && elevenLabsService.downloadAudio(effect.audio_blob, `effect_${effect.id}.mp3`)}
                    className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>

                  <button
                    onClick={() => {
                      // Reutilizar prompt y configuración
                      setEffectPrompt(effect.text);
                      // Navegar a efectos
                      setActiveSubTab('sound-effects');
                    }}
                    className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors duration-200"
                    title="Reutilizar prompt"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={(e) => setSttFile(e.target.files?.[0] || null)}
        className="hidden"
      />
    </div>
  );

  if (!apiKeyValid && apiKeyValid !== null) {
    return (
      <div className="text-center py-20">
        <svg className="w-20 h-20 text-slate-300 dark:text-slate-600 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
          API Key Requerida
        </h3>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Configura tu API key de ElevenLabs para acceder a todas las funcionalidades.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Status minimalista */}
      {apiKeyValid && (
        <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-2xl border border-green-200/50 dark:border-green-800/50">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-green-800 dark:text-green-200">
            ElevenLabs API
          </span>
          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
            {userTokens ? (
              userTokens.limit === -1 
                ? `Tokens: ${userTokens.used.toLocaleString()}/∞`
                : `Tokens restantes: ${(userTokens.limit - userTokens.used).toLocaleString()}/${userTokens.limit.toLocaleString()}`
            ) : 'Cargando tokens...'}
          </span>
        </div>
      )}

      {/* Sub-pestañas elegantes */}
      <div className="flex space-x-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeSubTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Contenido de las pestañas */}
      <div className="min-h-96">
        {activeSubTab === 'library' && renderLibraryTab()}
        {activeSubTab === 'text-to-speech' && renderTTSTab()}
        {activeSubTab === 'speech-to-speech' && renderSTSTab()}
        {activeSubTab === 'speech-to-text' && renderSTTTab()}
        {activeSubTab === 'sound-effects' && renderEffectsTab()}
      </div>

      {/* Estilos CSS personalizados */}
      <style>{`
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .scale-102 {
          transform: scale(1.02);
        }
        
        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }

        /* Estilos para textarea con tags destacados */
        .tag-textarea {
          background: linear-gradient(135deg, 
            rgb(248 250 252) 0%, 
            rgb(241 245 249) 100%
          );
        }

        .dark .tag-textarea {
          background: linear-gradient(135deg, 
            rgb(15 23 42) 0%, 
            rgb(30 41 59) 100%
          );
        }

        /* Selección con color púrpura */
        .tag-textarea::selection {
          background-color: rgba(147, 51, 234, 0.3);
          color: inherit;
        }

        /* Placeholder mejorado */
        .tag-textarea::placeholder {
          color: rgb(148 163 184);
          opacity: 0.7;
        }

        .dark .tag-textarea::placeholder {
          color: rgb(100 116 139);
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
};

export default VoiceModelsSection;