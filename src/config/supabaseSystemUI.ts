import { createClient } from '@supabase/supabase-js';

// Configuración para la base de datos System_UI
const supabaseUrl = 'https://zbylezfyagwrxoecioup.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzYyNzEsImV4cCI6MjA3NDkxMjI3MX0.W6Vt5h4r7vNSP_YQtd_fbTWuK7ERrcttwhcpe5Q7KoM';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNjI3MSwiZXhwIjoyMDc0OTEyMjcxfQ.2Btqq8cGSmr4OMKUae8zsHLxQMfs2JJ1ZFgmZYQPFQY';

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

// Tipos para el módulo de prompts
export interface PromptVersion {
  id: string;
  workflow_id: string;
  workflow_name: string;
  node_id: string;
  node_name: string;
  prompt_content: string;
  version_number: number;
  created_at: string;
  created_by: string;
  is_active: boolean;
  change_description?: string;
  performance_score?: number;
  success_rate?: number;
  total_executions?: number;
  successful_executions?: number;
  failed_executions?: number;
}

export interface WorkflowMetrics {
  workflow_id: string;
  workflow_name: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
  last_execution: string;
  avg_execution_time?: number;
}

export interface PromptChangeLog {
  id: string;
  prompt_version_id: string;
  change_type: 'create' | 'update' | 'activate' | 'deactivate';
  old_content?: string;
  new_content?: string;
  change_description: string;
  changed_by: string;
  changed_at: string;
  impact_score?: number;
}

export default supabaseSystemUI;
