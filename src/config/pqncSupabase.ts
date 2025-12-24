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
const pqncSupabaseServiceRoleKey = import.meta.env.VITE_PQNC_SUPABASE_SERVICE_KEY || '';
const pqncSupabaseAnonKey = import.meta.env.VITE_PQNC_SUPABASE_ANON_KEY || '';

// Validación en desarrollo
if (!pqncSupabaseUrl || !pqncSupabaseAnonKey) {
  console.warn('⚠️ PQNC: Faltan variables de entorno VITE_PQNC_SUPABASE_URL o VITE_PQNC_SUPABASE_ANON_KEY');
}
if (!pqncSupabaseServiceRoleKey) {
  console.warn('⚠️ PQNC: VITE_PQNC_SUPABASE_SERVICE_KEY no configurada - operaciones admin no funcionarán');
}

// Cliente principal para operaciones normales
// Solo crear si tenemos credenciales
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

// Cliente admin que puede acceder a todas las tablas sin restricciones RLS
// Solo crear si tenemos service key
export const pqncSupabaseAdmin = pqncSupabaseUrl && pqncSupabaseServiceRoleKey
  ? createClient(pqncSupabaseUrl, pqncSupabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: 'pqnc-admin-auth'
      },
      global: {
        headers: {
          'x-client-info': 'pqnc-admin'
        }
      }
    })
  : null;

export { pqncSupabaseUrl, pqncSupabaseAnonKey, pqncSupabaseServiceRoleKey };
