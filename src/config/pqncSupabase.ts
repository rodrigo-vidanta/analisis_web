import { createClient } from '@supabase/supabase-js';

/**
 * ============================================
 * CONFIGURACIÓN SUPABASE - PQNC DATABASE
 * ============================================
 * 
 * 🔒 SEGURIDAD (Actualizado 2025-12-23):
 * - Todas las keys DEBEN estar en variables de entorno (.env)
 * - NO usar fallbacks hardcodeados en código
 * - Service key solo para operaciones admin específicas
 * 
 * ✅ CONFIGURACIÓN REQUERIDA EN .env:
 * VITE_PQNC_SUPABASE_URL=https://hmmfuhqgvsehkizlfzga.supabase.co
 * VITE_PQNC_SUPABASE_ANON_KEY=<tu_anon_key>
 * VITE_PQNC_SUPABASE_SERVICE_KEY=<tu_service_key>
 */

const pqncSupabaseUrl = import.meta.env.VITE_PQNC_SUPABASE_URL || '';
const pqncSupabaseAnonKey = import.meta.env.VITE_PQNC_SUPABASE_ANON_KEY || '';

// ⚠️ SEGURIDAD: Este cliente es OPCIONAL y solo usa anon_key
// Las operaciones a PQNC_QA ahora van via Edge Function: multi-db-proxy
// No se requiere configurar en .env.production

// Cliente principal para operaciones normales (si se necesita conexión directa)
export const pqncSupabase = pqncSupabaseUrl && pqncSupabaseAnonKey
  ? createClient(pqncSupabaseUrl, pqncSupabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        storageKey: 'pqnc-supabase-auth'
      },
      global: {
        headers: {
          'x-client-info': 'pqnc-frontend'
        }
      }
    })
  : null;

// ⚠️ DEPRECADO: pqncSupabaseAdmin ELIMINADO por seguridad
// Usar multi-db-proxy Edge Function para operaciones admin
export const pqncSupabaseAdmin: null = null;

export { pqncSupabaseUrl, pqncSupabaseAnonKey };
