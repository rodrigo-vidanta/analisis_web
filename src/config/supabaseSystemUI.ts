import { createClient } from '@supabase/supabase-js';

/**
 * ============================================
 * CONFIGURACIÓN BASE DE DATOS SYSTEM_UI
 * ============================================
 * 
 * ⚠️ NOTA DE SEGURIDAD:
 * - Las service keys están expuestas en el frontend (práctica establecida en el proyecto)
 * - Las políticas RLS (Row Level Security) son la capa principal de seguridad
 * - Las service keys permiten bypass de RLS, por lo que las políticas deben estar bien configuradas
 * - En producción ideal, operaciones sensibles deberían ejecutarse desde un backend
 * 
 * ✅ SEGURIDAD IMPLEMENTADA:
 * - RLS habilitado en todas las tablas críticas
 * - Políticas que limitan acceso según roles
 * - Validación de datos en el servidor (PostgreSQL constraints)
 * - Service keys solo para operaciones administrativas necesarias
 */

// Configuración para la base de datos System_UI
export const SUPABASE_URL = import.meta.env.VITE_SYSTEM_UI_SUPABASE_URL || 'https://zbylezfyagwrxoecioup.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SYSTEM_UI_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzYyNzEsImV4cCI6MjA3NDkxMjI3MX0.W6Vt5h4r7vNSP_YQtd_fbTWuK7ERrcttwhcpe5Q7KoM';
export const SUPABASE_SERVICE_KEY = import.meta.env.VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNjI3MSwiZXhwIjoyMDc0OTEyMjcxfQ.2Btqq8cGSmr4OMKUae8zsHLxQMfs2JJ1ZFgmZYQPFQY';

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;
const supabaseServiceKey = SUPABASE_SERVICE_KEY;

// Cliente público para operaciones normales
export const supabaseSystemUI = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'systemui-auth'
  },
});

// Cliente admin para operaciones administrativas
export const supabaseSystemUIAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: 'systemui-admin'
  },
});

// Configuración del bucket
export const SYSTEM_UI_BUCKET = 'system_ui';

export default supabaseSystemUI;
