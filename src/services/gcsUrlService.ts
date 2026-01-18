/**
 * ============================================
 * SERVICIO DE URLs FIRMADAS - GOOGLE CLOUD STORAGE
 * ============================================
 * 
 * Servicio centralizado para obtener URLs firmadas de Google Cloud Storage.
 * Usado por: LiveChat, Templates, Dashboard, etc.
 * 
 * SEGURIDAD (2026-01-17):
 * - Requiere autenticación JWT de usuario
 * - No permite acceso con solo anon_key
 * - Edge Function valida el JWT antes de generar URLs
 * 
 * Autor: Darig Samuel Rosales Robledo
 * Fecha: 17 Enero 2026 (Hardening de seguridad)
 */

import { getAuthHeadersStrict } from '../utils/authHelpers';

// URL de la Edge Function
const GCS_URL_API = `${import.meta.env.VITE_EDGE_FUNCTIONS_URL}/functions/v1/generar-url-optimizada`;

export interface GcsUrlResponse {
  success: boolean;
  url: string;
  bucket: string;
  expires: string;
}

// Cache de URLs en memoria (25 minutos de validez)
const urlCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_TTL_MS = 25 * 60 * 1000; // 25 minutos

/**
 * Genera una clave de cache única para un archivo
 */
function getCacheKey(bucket: string, filename: string): string {
  return `${bucket}:${filename}`;
}

/**
 * Limpia URLs expiradas del cache
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of urlCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      urlCache.delete(key);
    }
  }
}

/**
 * Obtiene una URL firmada de Google Cloud Storage
 * 
 * REQUIERE: Usuario autenticado (JWT válido)
 * 
 * @param filename Ruta del archivo en el bucket
 * @param bucket Nombre del bucket de GCS
 * @param expirationMinutes Tiempo de expiración (default: 30 min)
 * @returns URL firmada o null si hay error
 */
export async function getSignedGcsUrl(
  filename: string,
  bucket: string,
  expirationMinutes = 30
): Promise<string | null> {
  try {
    // Limpiar cache expirado periódicamente
    if (Math.random() < 0.1) cleanExpiredCache();
    
    // Verificar cache en memoria
    const cacheKey = getCacheKey(bucket, filename);
    const cached = urlCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.url;
    }
    
    // Verificar localStorage como fallback
    const localKey = `gcs_${cacheKey.replace(/[/:]/g, '_')}`;
    const localCached = localStorage.getItem(localKey);
    if (localCached) {
      try {
        const parsed = JSON.parse(localCached);
        if (parsed.url && parsed.timestamp && (Date.now() - parsed.timestamp) < CACHE_TTL_MS) {
          // Actualizar cache en memoria
          urlCache.set(cacheKey, { url: parsed.url, timestamp: parsed.timestamp });
          return parsed.url;
        }
      } catch {
        localStorage.removeItem(localKey);
      }
    }
    
    // Obtener headers con JWT del usuario autenticado
    const headers = await getAuthHeadersStrict();
    
    // Llamar a la Edge Function
    const response = await fetch(GCS_URL_API, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filename,
        bucket,
        expirationMinutes
      })
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error('❌ [GcsUrlService] Sesión expirada. Por favor, recarga la página.');
      }
      return null;
    }
    
    const data = await response.json();
    const url = data[0]?.url || data.url;
    
    if (url) {
      const timestamp = Date.now();
      // Guardar en cache de memoria
      urlCache.set(cacheKey, { url, timestamp });
      // Guardar en localStorage
      localStorage.setItem(localKey, JSON.stringify({ url, timestamp }));
    }
    
    return url || null;
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('Sesión')) {
      console.error('❌ [GcsUrlService]', error.message);
    }
    return null;
  }
}

/**
 * Parsea una URL de formato gs:// y obtiene la URL firmada
 * 
 * @param gsUrl URL en formato gs://bucket/path/to/file
 * @returns URL firmada o null
 */
export async function getSignedUrlFromGsPath(gsUrl: string): Promise<string | null> {
  if (!gsUrl || typeof gsUrl !== 'string') return null;
  
  const match = gsUrl.match(/gs:\/\/([^\/]+)\/(.+)/);
  if (!match) return null;
  
  const [, bucket, filename] = match;
  return getSignedGcsUrl(filename, bucket);
}

/**
 * Limpia todo el cache de URLs
 */
export function clearGcsUrlCache(): void {
  urlCache.clear();
  // Limpiar localStorage de claves GCS
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('gcs_') || key.startsWith('media_')) {
      localStorage.removeItem(key);
    }
  }
}

/**
 * Obtener estadísticas del cache
 */
export function getGcsUrlCacheStats(): { memorySize: number; validUrls: number } {
  const now = Date.now();
  let validUrls = 0;
  for (const value of urlCache.values()) {
    if (now - value.timestamp < CACHE_TTL_MS) {
      validUrls++;
    }
  }
  return {
    memorySize: urlCache.size,
    validUrls
  };
}
