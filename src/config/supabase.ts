import { createClient } from '@supabase/supabase-js';

// CONFIGURACIÓN SEGURA PARA PRODUCTION - Alpha 1.0
// Base de datos principal para plantillas y agentes
const mainSupabaseUrl = import.meta.env.VITE_MAIN_SUPABASE_URL || 'https://rnhejbuubpbnojalljso.supabase.co';
const mainSupabaseAnonKey = import.meta.env.VITE_MAIN_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuaGVqYnV1YnBibm9qYWxsanNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NzQzNTksImV4cCI6MjA3MjQ1MDM1OX0.MsTwi2IAHXk_kphl_QYDwOujJhNFbYrZPOx_a40v_YI';
const mainSupabaseServiceKey = import.meta.env.VITE_MAIN_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuaGVqYnV1YnBibm9qYWxsanNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NDM1OSwiZXhwIjoyMDcyNDUwMzU5fQ.9f0eu5qyAxAWW8BDSb1xOagkPwG3dLlaLRcgtSuycWE';

// Base de datos PQNC para autenticación y análisis
const pqncSupabaseUrl = import.meta.env.VITE_PQNC_SUPABASE_URL || 'https://hmmfuhqgvsehkizlfzga.supabase.co';
const pqncSupabaseAnonKey = import.meta.env.VITE_PQNC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWZ1aHFndnNlaGtpemxmemdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1MTM1ODcsImV4cCI6MjA2MTA4OTU4N30.vhmMcmE9l_VJCPI0S_72XCgQycM2LemTG0OgyLsoqk4';
const pqncSupabaseServiceKey = import.meta.env.VITE_PQNC_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWZ1aHFndnNlaGtpemxmemdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTUxMzU4NywiZXhwIjoyMDYxMDg5NTg3fQ.mTnTOpkXi19xu1l-cZKx_f5RbqSg6zzH8mGdBOY3MZg';

// Cliente principal para plantillas y agentes
export const supabaseMain = createClient(mainSupabaseUrl, mainSupabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const supabaseMainAdmin = createClient(mainSupabaseUrl, mainSupabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ⚠️ DEPRECATED: Usar pqncSupabase desde src/config/pqncSupabase.ts
// Cliente PQNC para autenticación y análisis
export const supabase = createClient(pqncSupabaseUrl, pqncSupabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storageKey: 'pqnc-auth-deprecated'
  }
});

export const supabaseAdmin = createClient(pqncSupabaseUrl, pqncSupabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Tipos TypeScript para las tablas
export interface AgentCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface SystemVariable {
  id: string;
  variable_name: string;
  display_name: string;
  variable_code: string;
  description?: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PhoneNumber {
  id: string;
  phone_id: string;
  phone_number: string;
  description: string;
  country_code: string;
  is_active: boolean;
  created_by_user?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentWizardStep {
  id: string;
  agent_template_id: string;
  step_number: number;
  step_name: string;
  step_data: any;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentDraft {
  id: string;
  user_id?: string;
  draft_name: string;
  base_template_id?: string;
  wizard_data: any;
  generated_json?: any;
  status: 'draft' | 'completed' | 'generated';
  created_at: string;
  updated_at: string;
}

export interface AgentTemplate {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category_id: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_time?: string;
  icon?: string;
  agent_type?: 'inbound' | 'outbound';
  keywords: string[];
  use_cases: string[];
  business_context?: string;
  industry_tags: string[];
  vapi_config: any;
  usage_count: number;
  success_rate: number;
  is_active: boolean;
  is_public: boolean;
  source_type: string;
  original_json_hash?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Relaciones
  category?: AgentCategory;
  prompts?: AgentPrompt[];
  tools?: AgentTool[];
}

export interface SystemPrompt {
  id: string;
  title: string;
  content: string;
  role: 'system' | 'user' | 'assistant';
  category: string;
  prompt_type: string;
  keywords: string[];
  applicable_categories: string[];
  context_tags: string[];
  order_priority: number;
  is_required: boolean;
  is_editable: boolean;
  variables: string[];
  language: string;
  tested_scenarios: string[];
  performance_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ToolCatalog {
  id: string;
  name: string;
  tool_type: 'function' | 'transferCall' | 'endCall';
  category: string;
  config: any;
  description?: string;
  complexity: 'simple' | 'medium' | 'complex';
  keywords: string[];
  use_cases: string[];
  integration_requirements: string[];
  applicable_categories: string[];
  is_active: boolean;
  usage_count: number;
  success_rate: number;
  setup_instructions?: string;
  example_usage?: any;
  troubleshooting_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentPrompt {
  id: string;
  agent_template_id: string;
  system_prompt_id: string;
  order_index: number;
  is_customized: boolean;
  custom_content?: string;
  created_at: string;
  
  // Relaciones
  system_prompt?: SystemPrompt;
}

export interface AgentTool {
  id: string;
  agent_template_id: string;
  tool_id: string;
  is_enabled: boolean;
  custom_config?: any;
  created_at: string;
  
  // Relaciones
  tool?: ToolCatalog;
}

export interface OptimizedParameters {
  id: string;
  name: string;
  parameter_set: any;
  category_id?: string;
  use_case?: string;
  performance_profile?: string;
  description?: string;
  keywords: string[];
  tested_scenarios: string[];
  avg_response_time?: number;
  success_rate?: number;
  cost_per_call?: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
