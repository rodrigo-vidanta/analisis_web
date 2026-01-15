/**
 * ============================================
 * CLIENTE SUPABASE ADMIN - SERVICE_ROLE
 * ============================================
 * 
 * ⚠️ IMPORTANTE: Este cliente bypasea RLS
 * Solo usar en servicios backend o con validación estricta
 * 
 * NUNCA importar directamente en componentes
 * Solo a través de servicios que validan permisos
 */

import { createClient } from '@supabase/supabase-js';

const analysisSupabaseUrl = import.meta.env.VITE_ANALYSIS_SUPABASE_URL || '';
const analysisSupabaseServiceKey = import.meta.env.VITE_ANALYSIS_SUPABASE_SERVICE_KEY || '';

if (!analysisSupabaseServiceKey) {
  console.warn('⚠️ SERVICE_KEY no configurada - Cliente admin no disponible');
}

// Cliente admin que bypasea RLS
export const analysisSupabaseAdmin = analysisSupabaseUrl && analysisSupabaseServiceKey
  ? createClient(analysisSupabaseUrl, analysisSupabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          'x-client-info': 'pqnc-admin-secure'
        }
      }
    })
  : null;

export default analysisSupabaseAdmin;
