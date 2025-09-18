import { createClient } from '@supabase/supabase-js';

// CONFIGURACIÓN SEGURA PARA PRODUCTION - PQNC Database
const pqncSupabaseUrl = import.meta.env.VITE_PQNC_SUPABASE_URL || 'https://hmmfuhqgvsehkizlfzga.supabase.co';
const pqncSupabaseServiceRoleKey = import.meta.env.VITE_PQNC_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWZ1aHFndnNlaGtpemxmemdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTUxMzU4NywiZXhwIjoyMDYxMDg5NTg3fQ.mTnTOpkXi19xu1l-cZKx_f5RbqSg6zzH8mGdBOY3MZg';
const pqncSupabaseAnonKey = import.meta.env.VITE_PQNC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWZ1aHFndnNlaGtpemxmemdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1MTM1ODcsImV4cCI6MjA2MTA4OTU4N30.vhmMcmE9l_VJCPI0S_72XCgQycM2LemTG0OgyLsoqk4';

// Cliente principal para operaciones normales
export const pqncSupabase = createClient(pqncSupabaseUrl, pqncSupabaseAnonKey, {
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
});

// Cliente admin que puede acceder a todas las tablas sin restricciones RLS
export const pqncSupabaseAdmin = createClient(pqncSupabaseUrl, pqncSupabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    storageKey: 'pqnc-admin-auth' // Clave diferente para evitar conflictos
  },
  global: {
    headers: {
      'x-client-info': 'pqnc-admin'
    }
  }
});

export { pqncSupabaseUrl, pqncSupabaseAnonKey, pqncSupabaseServiceRoleKey };
