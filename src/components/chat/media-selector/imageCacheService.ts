/**
 * Servicio de cache de URLs firmadas para imagenes full-size.
 *
 * NOTA: Los thumbnails del grid se sirven estaticamente desde /thumbnails/
 * Este servicio solo se usa para obtener URLs firmadas de GCS para:
 * - Preview modal (imagen full-size)
 *
 * Jerarquia de cache:
 * 1. Memory Map - 0ms
 * 2. localStorage legacy (img_ prefix de V2) - 0ms
 * 3. gcsUrlService (memoria + gcs_ localStorage) - 0-5ms
 * 4. Network (Edge Function generar-url-optimizada) - 300-800ms
 *
 * NO se hace fetch() a GCS URLs directamente (CORS no configurado).
 * Las signed URLs se usan como <img src> que no tiene restriccion CORS.
 */

import { getSignedGcsUrl } from '../../../services/gcsUrlService';
import { URL_CACHE_TTL_MS } from './constants';
import type { ContentItem } from './types';

// ============================================
// MEMORY CACHE
// ============================================

const objectUrlMap = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string>>();

function getCacheKey(item: ContentItem): string {
  return `${item.bucket}:${item.nombre_archivo}`;
}

// ============================================
// API PUBLICA
// ============================================

/**
 * Obtiene una URL firmada de GCS para mostrar imagen full-size.
 * Usa cache en memoria y localStorage para evitar requests repetidos.
 * La URL se usa como <img src> (sin fetch, sin CORS issues).
 */
export async function getImageUrlCached(item: ContentItem): Promise<string> {
  if (!item?.bucket || !item?.nombre_archivo) return '';

  const key = getCacheKey(item);

  // Nivel 1: Memoria
  const memoryUrl = objectUrlMap.get(key);
  if (memoryUrl) return memoryUrl;

  // Deduplicacion de requests
  const pending = pendingRequests.get(key);
  if (pending) return pending;

  const promise = (async (): Promise<string> => {
    // Nivel 2: localStorage legacy (img_ prefix de V2)
    const legacyUrl = getLegacyLocalStorageUrl(item);
    if (legacyUrl) {
      objectUrlMap.set(key, legacyUrl);
      return legacyUrl;
    }

    // Nivel 3: gcsUrlService (tiene su propio cache en memoria + localStorage)
    try {
      const signedUrl = await getSignedGcsUrl(item.nombre_archivo, item.bucket, 30);
      if (!signedUrl) return '';

      objectUrlMap.set(key, signedUrl);
      return signedUrl;
    } catch {
      return '';
    }
  })();

  pendingRequests.set(key, promise);

  try {
    const result = await promise;
    return result;
  } finally {
    setTimeout(() => pendingRequests.delete(key), 1000);
  }
}

/**
 * Busca URL en localStorage con el formato legacy de V2 (img_ prefix)
 */
function getLegacyLocalStorageUrl(item: ContentItem): string | null {
  try {
    const legacyKey = `img_${item.bucket}/${item.nombre_archivo}`;
    const cached = localStorage.getItem(legacyKey);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    if (parsed?.url && parsed?.timestamp) {
      const age = Date.now() - parsed.timestamp;
      if (age < URL_CACHE_TTL_MS) {
        return parsed.url;
      }
      localStorage.removeItem(legacyKey);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Limpia todo el cache de URLs en memoria
 */
export function clearMemoryCache(): void {
  objectUrlMap.clear();
  pendingRequests.clear();
}
