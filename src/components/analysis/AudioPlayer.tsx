import React, { useState, useRef, useEffect } from 'react';
import { getSignedAudioUrl, verifyAudioUrl, formatFileSize } from '../../services/audioService';

interface AudioPlayerProps {
  audioFileUrl: string;
  callId: string;
  customerName: string;
  className?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioFileUrl,
  callId,
  customerName,
  className = ""
}) => {
  // Estados del reproductor
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [audioInfo, setAudioInfo] = useState<{
    contentLength: number;
    contentType: string;
    isValid: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Referencias
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Cargar URL firmada al montar el componente
  useEffect(() => {
    if (audioFileUrl) {
      loadAudioUrl();
    }
  }, [audioFileUrl]);
  
  // Actualizar tiempo actual
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    const handleError = (e: any) => {
      setError('Error al cargar el audio');
      setIsPlaying(false);
    };
    
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [signedUrl]);
  
  // Cargar URL firmada del audio
  const loadAudioUrl = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = await getSignedAudioUrl(audioFileUrl);
      
      if (!url) {
        setError('No se pudo obtener la URL del audio');
        return;
      }
      
      // Establecer la URL directamente (la API ya la validó)
      setSignedUrl(url);
      
      // Información básica sin verificación CORS
      setAudioInfo({
        contentLength: 0,
        contentType: 'audio/wav',
        isValid: true
      });
      
    } catch (error) {
      setError('Error al cargar el audio');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reproducir/pausar audio
  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !signedUrl) return;
    
    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      setError('Error al reproducir el audio');
    }
  };
  
  // Cambiar posición de reproducción
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  // Cambiar volumen
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
  };
  
  // Formatear tiempo en MM:SS
  const formatTime = (time: number): string => {
    if (!time || isNaN(time)) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Obtener nombre del archivo
  const getFileName = (): string => {
    if (!audioFileUrl) return 'Audio de la llamada';
    
    const parts = audioFileUrl.split('/');
    const fileName = parts[parts.length - 1];
    // Limpiar el nombre del archivo para que sea más legible
    const cleanName = fileName?.replace(/sid_\d+_dbsid_\d+\.wav$/, '.wav') || 'Audio de la llamada';
    return cleanName;
  };
  
  if (!audioFileUrl) {
    return (
      <div className={`bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center ${className}`}>
        <svg className="w-8 h-8 text-yellow-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          No hay archivo de audio disponible para esta llamada
        </p>
      </div>
    );
  }
  
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}>
      
      {/* Header minimalista */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M9 9a3 3 0 000 6h3v5a1 1 0 102 0v-5h3a3 3 0 000-6H9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Audio de la Llamada
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {customerName}
              </p>
            </div>
          </div>
          
          {/* Duración */}
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {duration > 0 ? formatTime(duration) : '--:--'}
          </div>
        </div>
      </div>
      
      {/* Contenido principal */}
      <div className="p-4">
        
        {/* Estado de carga */}
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-blue-600"></div>
            <span className="ml-3 text-sm text-slate-600 dark:text-slate-400">Cargando audio...</span>
          </div>
        )}
        
        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-red-700 dark:text-red-300">{error}</span>
              </div>
              <button
                onClick={loadAudioUrl}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}
        
        {/* Controles del reproductor */}
        {signedUrl && !isLoading && !error && (
          <>
            {/* Audio element */}
            <audio
              ref={audioRef}
              src={signedUrl}
              preload="metadata"
            />
            
            {/* Controles principales minimalistas */}
            <div className="space-y-3">
              
              {/* Barra de progreso principal */}
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-slate-200 dark:bg-slate-600 rounded-full appearance-none cursor-pointer audio-progress"
                  style={{
                    background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${(currentTime / (duration || 1)) * 100}%, rgb(226 232 240) ${(currentTime / (duration || 1)) * 100}%, rgb(226 232 240) 100%)`
                  }}
                />
                
                {/* Tiempos */}
                <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              
              {/* Controles centrales */}
              <div className="flex items-center justify-between">
                
                {/* Botón play/pause minimalista */}
                <button
                  onClick={togglePlayPause}
                  className="w-10 h-10 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  {isPlaying ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>
                
                {/* Información del archivo */}
                <div className="text-center">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {getFileName()}
                  </div>
                </div>
                
                {/* Control de volumen minimalista */}
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {volume > 0.5 ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M9 9a3 3 0 000 6h3v5a1 1 0 102 0v-5h3a3 3 0 000-6H9z" />
                    ) : volume > 0 ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M9 9a3 3 0 000 6h3v5a1 1 0 102 0v-5h3a3 3 0 000-6H9z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    )}
                  </svg>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-slate-200 dark:bg-slate-600 rounded-full appearance-none cursor-pointer audio-volume"
                  />
                </div>
              </div>
              
            </div>
          </>
        )}
        
      </div>
      
    </div>
  );
};

export default AudioPlayer;
