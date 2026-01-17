// Servicio para manejar la API de audio del bucket
const AUDIO_API_URL = 'https://function-bun-dev-6d8e.up.railway.app/generar-url';
const AUDIO_API_TOKEN = '${import.meta.env.VITE_GCS_API_TOKEN || ''}';

export interface AudioUrlResponse {
  success: boolean;
  url: string;
  bucket: string;
  expires: string;
}

export interface ParsedAudioData {
  bucket: string;
  filename: string;
}

/**
 * Parsea una URL de audio de Google Storage para extraer bucket y filename
 * Según configuración n8n: recortar la URL para obtener solo el filename sin prefijo
 * @param fullUrl URL completa del archivo (ej: gs://verintpqnc/exports/audio/...)
 * @returns Objeto con bucket y filename o null si no se puede parsear
 */
export function parseAudioUrl(fullUrl: string): ParsedAudioData | null {
  if (!fullUrl || typeof fullUrl !== 'string') {
    return null;
  }

  // Ejemplo: gs://verintpqnc/exports/audio/PQNC_Export2;4_20250819_000000/COBNVO/WAV/07-21-2025_12-15-49_sid_27345009_dbsid_301.wav
  const match = fullUrl.match(/gs:\/\/([^\/]+)\/(.+)/);
  
  if (match) {
    const bucket = match[1]; // verintpqnc
    const filename = match[2]; // exports/audio/PQNC_Export2;4_20250819_000000/COBNVO/WAV/07-21-2025_12-15-49_sid_27345009_dbsid_301.wav
    
    return { bucket, filename };
  }
  
  return null;
}

/**
 * Obtiene una URL firmada temporal para reproducir un archivo de audio
 * @param audioFileUrl URL completa del archivo de audio desde la base de datos
 * @returns Promise con la URL firmada o null si hay error
 */
export async function getSignedAudioUrl(audioFileUrl: string): Promise<string | null> {
  try {
    // Parsear la URL del audio
    const audioData = parseAudioUrl(audioFileUrl);
    
    if (!audioData) {
      return null;
    }
    
    // Hacer petición a la API según configuración n8n
    const response = await fetch(AUDIO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': AUDIO_API_TOKEN
      },
      body: JSON.stringify({
        filename: audioData.filename, // Solo el filename sin el prefijo gs://bucket/
        bucket: audioData.bucket,
        expirationMinutes: 30 // Según configuración n8n
      })
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data: AudioUrlResponse = await response.json();
    
    if (!data.success || !data.url) {
      return null;
    }
    
    return data.url;
    
  } catch (error) {
    return null;
  }
}

/**
 * Verifica si una URL de audio es válida y accesible
 * @param audioUrl URL del archivo de audio
 * @returns Promise con información del archivo o null si no es accesible
 */
export async function verifyAudioUrl(audioUrl: string): Promise<{
  contentLength: number;
  contentType: string;
  isValid: boolean;
} | null> {
  try {
    const response = await fetch(audioUrl, { method: 'HEAD' });
    
    if (!response.ok) {
      return null;
    }
    
    const contentLength = parseInt(response.headers.get('content-length') || '0');
    const contentType = response.headers.get('content-type') || '';
    
    return {
      contentLength,
      contentType,
      isValid: contentType.includes('audio/')
    };
    
  } catch (error) {
    console.error('❌ Error verificando URL de audio:', error);
    return null;
  }
}

/**
 * Formatea el tamaño del archivo en una cadena legible
 * @param bytes Tamaño en bytes
 * @returns Cadena formateada (ej: "46.1 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
