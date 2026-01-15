/**
 * ============================================
 * CONFIGURACIÓN SUPABASE - LOG MONITOR
 * ============================================
 * 
 * Base de datos dedicada para el sistema de monitoreo de logs de errores.
 * Proyecto: Log Monitor (dffuwdzybhypxfzrmdcz)
 * 
 * ⚠️ REGLAS DE ORO:
 * 1. Esta base de datos almacena logs de errores del sistema
 * 2. Tablas principales: error_log (logs de errores)
 * 3. Tablas UI (prefijo ui_): Estado de lectura, anotaciones, etiquetas, análisis IA
 * 4. Usar cliente admin para operaciones de escritura
 * 5. Usar cliente público para operaciones de lectura
 * 
 * 🔒 SEGURIDAD (Actualizado 2025-12-23):
 * - Las keys DEBEN estar en variables de entorno (.env)
 * - NO usar fallbacks hardcodeados
 * 
 * ✅ CONFIGURACIÓN REQUERIDA EN .env:
 * VITE_LOGMONITOR_SUPABASE_URL=https://dffuwdzybhypxfzrmdcz.supabase.co
 * VITE_LOGMONITOR_SUPABASE_ANON_KEY=<tu_anon_key>
 * VITE_LOGMONITOR_SUPABASE_SERVICE_KEY=<tu_service_key>
 */

import { createClient } from '@supabase/supabase-js';

// Configuración para la base de datos Log Monitor
const logMonitorSupabaseUrl = import.meta.env.VITE_LOGMONITOR_SUPABASE_URL || '';
const logMonitorAnonKey = import.meta.env.VITE_LOGMONITOR_SUPABASE_ANON_KEY || '';
const logMonitorServiceKey = import.meta.env.VITE_LOGMONITOR_SUPABASE_SERVICE_KEY || '';

// Validación en desarrollo - Solo mostrar si se intenta usar activamente
// LOGMONITOR es una BD separada para sistema de logs (dffuwdzybhypxfzrmdcz)
// Las credenciales deben configurarse en .env cuando el módulo se necesite

// Cliente público para operaciones normales (lectura)
// Solo crear si tenemos las credenciales necesarias
export const supabaseLogMonitor = logMonitorSupabaseUrl && logMonitorAnonKey
  ? createClient(logMonitorSupabaseUrl, logMonitorAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: 'logmonitor-auth'
      }
    })
  : null;

// Cliente admin para operaciones administrativas (escritura)
// Solo crear si tenemos service key configurada
export const supabaseLogMonitorAdmin = logMonitorSupabaseUrl && logMonitorServiceKey
  ? createClient(logMonitorSupabaseUrl, logMonitorServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: 'logmonitor-admin'
      }
    })
  : null;

// Tipos para error_log
export type ErrorType = 'mensaje' | 'llamada' | 'ui';
export type ErrorSubtype = 'tools' | 'dynamics' | 'base_de_datos' | 'http_request_servicio' | 'llms_falla_servicio' | 'llms_json_schema' | 'vapi' | 'guardrail_salida' | 'guardrail_entrada' | 'twilio' | 'rate_limit' | 'uchat' | 'redis' | 'airtable' | 's3';
export type ErrorSeverity = 'baja' | 'media' | 'alta' | 'critica';
export type EnvironmentType = 'desarrollo' | 'produccion' | 'preproduccion';

export interface ErrorLog {
  id: string;
  prospecto_id?: string | null;
  tipo: ErrorType;
  subtipo: ErrorSubtype;
  workflow_id?: string | null;
  execution_id?: string | null;
  mensaje: Record<string, any>; // JSONB
  timestamp: string;
  whatsapp?: string | null;
  severidad: ErrorSeverity;
  ambiente: EnvironmentType;
  descripcion?: string | null;
}

// Tipos para tablas UI
export interface UIErrorLogStatus {
  id: string;
  error_log_id: string;
  is_read: boolean;
  read_at?: string | null;
  read_by?: string | null;
  is_archived: boolean;
  archived_at?: string | null;
  archived_by?: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
}

export interface UIErrorLogAnnotation {
  id: string;
  error_log_id: string;
  annotation_text: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface UIErrorLogTag {
  id: string;
  error_log_id: string;
  tag_name: string;
  tag_color?: string | null;
  created_by: string;
  created_at: string;
}

export interface UIErrorLogAIAnalysis {
  id: string;
  error_log_id: string;
  analysis_text: string;
  analysis_summary: string;
  suggested_fix?: string | null;
  confidence_score: number; // 0-100
  tokens_used: number;
  model_used: string;
  status: 'pending' | 'completed' | 'failed';
  requested_by?: string | null; // ID del usuario que solicitó el análisis
  created_at: string;
  completed_at?: string | null;
  error_message?: string | null;
}

export default supabaseLogMonitor;

