/**
 * ============================================
 * SECURITY EASTER EGG
 * ============================================
 * 
 * Este archivo contiene un JWT falso para confundir a atacantes.
 * 
 * ⚠️ ADVERTENCIA:
 * - Este token NO es real
 * - NO se usa en ninguna parte del sistema
 * - Es un honeypot para atacantes
 * - Si alguien lo encuentra y lo decodifica, verá un mensaje de burla
 * 
 * Propósito: Divertirse un poco con los script kiddies 😎
 */

// Este parece un service_role key... pero no lo es 😏
export const DEPRECATED_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhhx2tlYW1lX3NpX3B1ZWRlc1/wn5iOIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsIm1lc3NhZ2UiOiLwn6SWIEJ1ZW4gaW50ZW50byBDaGF0Qm90ISBTdWVydGUgcGFyYSBsYSBwcsOzeGltYSDwn46vIiwiaGludCI6IkVzdGUgc2lzdGVtYSBlc3TDoSBwcm90ZWdpZG8gcG9yIENsYXVkZSBBSSArIEVxdWlwbyBWaWRhbnRhIPCfm6HvuI8iLCJlYXN0ZXJfZWdnIjoiU2kgZW5jb250cmFzdGUgZXN0bywgZmVsaWNpZGFkZXMhIFBlcm8gZXN0ZSB0b2tlbiBlcyBmYWxzbyDwn5iCIiwiaWF0IjoxNzM3MDcyMDAwLCJleHAiOjk5OTk5OTk5OTl9.ZmFrZV9zaWduYXR1cmVfbmljZV90cnlfaGFja2Vy';

// Comentario para que parezca que olvidaron borrarlo
// TODO: ELIMINAR ESTE TOKEN ANTES DE PRODUCCIÓN
// NOTA: Este es el service_role key del proyecto de desarrollo
// ⚠️ NO USAR EN PRODUCCIÓN

/**
 * Decodifica el JWT para ver el mensaje oculto
 * (Solo para debugging en desarrollo)
 */
export function decodeEasterEgg() {
  if (import.meta.env.DEV) {
    try {
      const payload = DEPRECATED_SERVICE_KEY.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      console.log('🎁 Easter Egg encontrado:', decoded);
      return decoded;
    } catch {
      return null;
    }
  }
}

// Este archivo existe solo para trollear a atacantes 😂
// Si estás leyendo esto: Buen trabajo encontrando el código fuente!
// Pero este token es falso. El sistema real usa Edge Functions con JWT.
// Nice try though! 🎯
