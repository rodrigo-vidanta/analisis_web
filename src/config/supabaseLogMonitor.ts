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
 */

import { createClient } from '@supabase/supabase-js';

// Configuración para la base de datos Log Monitor
const logMonitorSupabaseUrl = 'https://dffuwdzybhypxfzrmdcz.supabase.co';
const logMonitorAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZnV3ZHp5Ymh5cHhmenJtZGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTgxNTksImV4cCI6MjA3NTQzNDE1OX0.dduh8ZV_vxWcC3u63DGjPG0U5DDjBpZTs3yjT3clkRc';
const logMonitorServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZnV3ZHp5Ymh5cHhmenJtZGN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg1ODE1OSwiZXhwIjoyMDc1NDM0MTU5fQ.GplT_sFvgkLjNDNg50MaXVI759u8LAMeS9SbJ6pf2yc';

// Cliente público para operaciones normales (lectura)
export const supabaseLogMonitor = createClient(logMonitorSupabaseUrl, logMonitorAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: 'logmonitor-auth'
  }
});

// Cliente admin para operaciones administrativas (escritura)
export const supabaseLogMonitorAdmin = createClient(logMonitorSupabaseUrl, logMonitorServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: 'logmonitor-admin'
  }
});

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

