/**
 * ============================================
 * SERVICIO DE AUDIO - URLs FIRMADAS DE GCS
 * ============================================
 * 
 * Servicio para obtener URLs firmadas de Google Cloud Storage
 * para reproducir archivos de audio.
 * 
 * SEGURIDAD (2026-01-17):
 * - Requiere autenticación JWT de usuario
 * - No permite acceso con solo anon_key
 * 
 * Autor: Darig Samuel Rosales Robledo
 * Fecha: 17 Enero 2026 (Hardening de seguridad)
 */

import { getAuthHeadersStrict } from '../utils/authHelpers';

// URL de la Edge Function
const AUDIO_API_URL = `${import.meta.env.VITE_EDGE_FUNCTIONS_URL}/functions/v1/generar-url-optimizada`;

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
 * REQUIERE usuario autenticado (JWT válido)
 * 
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
    
    // Obtener headers con JWT del usuario autenticado
    const headers = await getAuthHeadersStrict();
    
    // Hacer petición a la Edge Function 
    const response = await fetch(AUDIO_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filename: audioData.filename,
        bucket: audioData.bucket,
        expirationMinutes: 30
      })
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error('❌ [AudioService] Sesión expirada. Recarga la página.');
      }
      return null;
    }
    
    const data: AudioUrlResponse = await response.json();
    
    if (!data.success || !data.url) {
      return null;
    }
    
    return data.url;
    
  } catch (error) {
    // Error de autenticación o red
    if (error instanceof Error && error.message.includes('Sesión')) {
      console.error('❌ [AudioService]', error.message);
    }
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
