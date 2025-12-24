import { createClient } from '@supabase/supabase-js';

/**
 * ============================================
 * CONFIGURACIÓN BASE DE DATOS SYSTEM_UI
 * ============================================
 * 
 * 🔒 SEGURIDAD (Actualizado 2025-12-23):
 * - Las service keys DEBEN estar en variables de entorno (.env)
 * - NO usar fallbacks hardcodeados en código
 * - El cliente público usa anon_key + RLS
 * - El cliente admin solo debe usarse para operaciones específicas
 * 
 * ✅ CONFIGURACIÓN REQUERIDA EN .env:
 * VITE_SYSTEM_UI_SUPABASE_URL=https://zbylezfyagwrxoecioup.supabase.co
 * VITE_SYSTEM_UI_SUPABASE_ANON_KEY=<tu_anon_key>
 * VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY=<tu_service_key>
 */

// Configuración para la base de datos System_UI
export const SUPABASE_URL = import.meta.env.VITE_SYSTEM_UI_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SYSTEM_UI_SUPABASE_ANON_KEY || '';
export const SUPABASE_SERVICE_KEY = import.meta.env.VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY || '';

// Validación en desarrollo
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ SYSTEM_UI: Faltan variables de entorno VITE_SYSTEM_UI_SUPABASE_URL o VITE_SYSTEM_UI_SUPABASE_ANON_KEY');
}
if (!SUPABASE_SERVICE_KEY) {
  console.warn('⚠️ SYSTEM_UI: VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY no configurada - operaciones admin no funcionarán');
}

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;
const supabaseServiceKey = SUPABASE_SERVICE_KEY;

// Cliente público para operaciones normales
// Solo crear si tenemos credenciales
export const supabaseSystemUI = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'systemui-auth'
      },
    })
  : null;

// Cliente admin para operaciones administrativas
// Solo crear si tenemos service key
export const supabaseSystemUIAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: 'systemui-admin'
      },
    })
  : null;

// Configuración del bucket
export const SYSTEM_UI_BUCKET = 'system_ui';

export default supabaseSystemUI;
