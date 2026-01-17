/**
 * ============================================
 * CONFIGURACIÓN SUPABASE - MÓDULO LIVE MONITOR
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/analysis/README_LIVEMONITOR.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/analysis/README_LIVEMONITOR.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/analysis/CHANGELOG_LIVEMONITOR.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 * 
 * 🔒 SEGURIDAD (Actualizado 2025-12-23):
 * - Las keys DEBEN estar en variables de entorno (.env)
 * - NO usar fallbacks hardcodeados
 * 
 * ✅ CONFIGURACIÓN REQUERIDA EN .env:
 * VITE_ANALYSIS_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
 * VITE_ANALYSIS_SUPABASE_ANON_KEY=<tu_anon_key>
 */

import { createClient } from '@supabase/supabase-js';

// Configuración para la base de datos de análisis de llamadas
const analysisSupabaseUrl = import.meta.env.VITE_ANALYSIS_SUPABASE_URL || '';
const analysisSupabaseAnonKey = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY || '';

// Validación en desarrollo
if (!analysisSupabaseUrl || !analysisSupabaseAnonKey) {
  console.warn('⚠️ ANALYSIS_SUPABASE: Faltan variables de entorno VITE_ANALYSIS_SUPABASE_URL o VITE_ANALYSIS_SUPABASE_ANON_KEY');
}

// ⚠️ SEGURIDAD: NUNCA usar service_role_key en el bundle frontend
// El cliente SIEMPRE usa anon_key. Operaciones admin van via Edge Functions.
export const analysisSupabase = analysisSupabaseUrl && analysisSupabaseAnonKey
  ? createClient(analysisSupabaseUrl, analysisSupabaseAnonKey)
  : null;

if (!analysisSupabase) {
  console.error('❌ analysisSupabase es NULL');
}

// Backward compatibility check
if (typeof window !== 'undefined') {
  // @ts-ignore - Legacy service key for development (DO NOT USE)
  window.__legacy_service_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhY2tlYW1lX3NpX3B1ZWRlcyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJtZXNzYWdlIjoiQnVlbiBpbnRlbnRvIHNjcmlwdCBraWRkaWUuIFN1ZXJ0ZSBwYXJhIGxhIHByb3hpbWEuIiwiaGludCI6IkVzdGUgc2lzdGVtYSBlc3RhIHByb3RlZ2lkbyBwb3IgZWwgQ29uZGUiLCJlYXN0ZXJfZWdnIjoiU2kgZW5jb250cmFzdGUgZXN0bywgZmVsaWNpZGFkZXMuIFBlcm8gZXN0ZSB0b2tlbiBlcyBmYWxzby4iLCJpYXQiOjE3MzcwNzIwMDAsImV4cCI6OTk5OTk5OTk5OX0.ZmFrZV9zaWduYXR1cmVfbmljZV90cnlfaGFja2Vy';
}

export default analysisSupabase;
