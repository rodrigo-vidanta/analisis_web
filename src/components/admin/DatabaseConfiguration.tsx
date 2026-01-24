import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Code,
  X,
  Zap,
  Clock,
  Server,
  Edit3,
  Save
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface DatabaseConfig {
  name: string;
  url: string;
  anonKey: string;
  serviceKey: string;
  description: string;
}

interface ConnectionTest {
  database: string;
  status: 'testing' | 'success' | 'error';
  message: string;
  latency?: number;
}

const DatabaseConfiguration: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  // ⚠️ SEGURIDAD: NUNCA exponer SERVICE_KEY en el bundle
  // Solo mostrar URL y ANON_KEY (información pública)
  const [configs, setConfigs] = useState<Record<string, DatabaseConfig>>({
    main: {
      name: 'Base de Datos Principal (Agentes)',
      url: import.meta.env.VITE_MAIN_SUPABASE_URL || '',
      anonKey: import.meta.env.VITE_MAIN_SUPABASE_ANON_KEY || '',
      serviceKey: '[PROTEGIDO]', // ⚠️ No exponer en frontend
      description: 'Almacena plantillas de agentes, categorías, prompts del sistema y herramientas.'
    },
    pqnc: {
      name: 'Base de Datos PQNC (Auth & Analysis)',
      url: import.meta.env.VITE_PQNC_SUPABASE_URL || '',
      anonKey: import.meta.env.VITE_PQNC_SUPABASE_ANON_KEY || '',
      serviceKey: '[PROTEGIDO]', // ⚠️ No exponer en frontend
      description: 'Maneja autenticación, usuarios, permisos y análisis PQNC.'
    },
    natalia: {
      name: 'Base de Datos Natalia (Analysis)',
      url: import.meta.env.VITE_NATALIA_SUPABASE_URL || '',
      anonKey: import.meta.env.VITE_NATALIA_SUPABASE_ANON_KEY || '',
      serviceKey: '[PROTEGIDO]', // ⚠️ No exponer en frontend
      description: 'Almacena análisis y llamadas de Natalia.'
    }
  });

  const [connectionTests, setConnectionTests] = useState<ConnectionTest[]>([]);
  const [editingDb, setEditingDb] = useState<string | null>(null);
  const [tempConfig, setTempConfig] = useState<DatabaseConfig | null>(null);
  const [showSchemaModal, setShowSchemaModal] = useState<string | null>(null);

  const testConnection = async (dbKey: string) => {
    const config = configs[dbKey];
    
    setConnectionTests(prev => prev.filter(t => t.database !== dbKey));
    setConnectionTests(prev => [...prev, {
      database: dbKey,
      status: 'testing',
      message: 'Probando conexión...'
    }]);

    try {
      const startTime = Date.now();
      const client = createClient(config.url, config.anonKey);
      
      // Pruebas específicas por base de datos
      let testQuery;
      switch (dbKey) {
        case 'main':
          // Probar tabla específica de agentes
          testQuery = client.from('agent_categories').select('count').limit(1);
          break;
        case 'pqnc':
          // Probar tabla de usuarios (la que sabemos que existe)
          testQuery = client.from('user_profiles_v2').select('count').limit(1);
          break;
        case 'natalia':
          // Probar tabla específica de análisis
          testQuery = client.from('call_analysis').select('count').limit(1);
          break;
        default:
          // Fallback: probar conexión básica sin tabla específica
          testQuery = client.auth.getSession();
      }

      const { error } = await testQuery;
      const latency = Date.now() - startTime;

      if (error) {
        // Si la tabla no existe, intentar con una consulta más básica
        if (error.message.includes('does not exist') || error.message.includes('not found')) {
          const basicTest = await client.auth.getSession();
          if (basicTest.error) {
            throw new Error(`Conexión establecida pero esquema incompleto: ${error.message}`);
          } else {
            setConnectionTests(prev => prev.map(t => 
              t.database === dbKey 
                ? { ...t, status: 'success' as const, message: 'Conexión exitosa (esquema incompleto)', latency }
                : t
            ));
            return;
          }
        }
        throw error;
      }

      setConnectionTests(prev => prev.map(t => 
        t.database === dbKey 
          ? { ...t, status: 'success' as const, message: 'Conexión exitosa', latency }
          : t
      ));
    } catch (error: any) {
      setConnectionTests(prev => prev.map(t => 
        t.database === dbKey 
          ? { ...t, status: 'error' as const, message: error.message || 'Error de conexión' }
          : t
      ));
    }
  };

  const startEditing = (dbKey: string) => {
    setEditingDb(dbKey);
    setTempConfig({ ...configs[dbKey] });
  };

  const saveConfig = () => {
    if (editingDb && tempConfig) {
      setConfigs(prev => ({
        ...prev,
        [editingDb]: tempConfig
      }));
      setEditingDb(null);
      setTempConfig(null);
    }
  };

  const cancelEditing = () => {
    setEditingDb(null);
    setTempConfig(null);
  };

  const generateSchema = (dbKey: string) => {
    setShowSchemaModal(dbKey);
  };

  const getSchemaSQL = (dbKey: string): string => {
    switch (dbKey) {
      case 'main':
        return `-- Base de Datos Principal (Agentes)
-- Creación de tablas para plantillas de agentes, categorías, prompts y herramientas

-- Categorías de agentes
CREATE TABLE IF NOT EXISTS agent_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  color VARCHAR(7),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plantillas de agentes
CREATE TABLE IF NOT EXISTS agent_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category_id UUID REFERENCES agent_categories(id),
  difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_time VARCHAR(50),
  icon VARCHAR(255),
  agent_type VARCHAR(20) CHECK (agent_type IN ('inbound', 'outbound')),
  keywords TEXT[],
  use_cases TEXT[],
  business_context TEXT,
  vapi_config JSONB,
  usage_count INTEGER DEFAULT 0,
  success_rate NUMERIC(3,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  source_type VARCHAR(50) DEFAULT 'manual',
  original_json_hash VARCHAR(64),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompts del sistema
CREATE TABLE IF NOT EXISTS system_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  role VARCHAR(20) CHECK (role IN ('system', 'user', 'assistant')),
  category VARCHAR(100),
  prompt_type VARCHAR(100),
  keywords TEXT[],
  applicable_categories TEXT[],
  order_priority INTEGER DEFAULT 1,
  is_required BOOLEAN DEFAULT false,
  is_editable BOOLEAN DEFAULT true,
  variables JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Catálogo de herramientas
CREATE TABLE IF NOT EXISTS tool_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tool_type VARCHAR(100),
  category VARCHAR(100),
  config JSONB,
  description TEXT,
  complexity VARCHAR(20) CHECK (complexity IN ('low', 'medium', 'high')),
  keywords TEXT[],
  use_cases TEXT[],
  integration_requirements TEXT[],
  applicable_categories TEXT[],
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  success_rate NUMERIC(3,2) DEFAULT 0.00,
  setup_instructions TEXT,
  example_usage JSONB,
  troubleshooting_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relación agentes-prompts
CREATE TABLE IF NOT EXISTS agent_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_template_id UUID REFERENCES agent_templates(id) ON DELETE CASCADE,
  system_prompt_id UUID REFERENCES system_prompts(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  is_customized BOOLEAN DEFAULT false,
  custom_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relación agentes-herramientas
CREATE TABLE IF NOT EXISTS agent_tools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_template_id UUID REFERENCES agent_templates(id) ON DELETE CASCADE,
  tool_id UUID REFERENCES tool_catalog(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  custom_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar datos de prueba
INSERT INTO agent_categories (name, slug, description, icon, color) VALUES
('Atención al Cliente', 'atencion_clientes', 'Agentes especializados en servicio al cliente', '🎧', '#3B82F6'),
('Ventas', 'ventas', 'Agentes enfocados en procesos de venta', '💼', '#10B981'),
('Soporte Técnico', 'soporte_tecnico', 'Agentes para resolución técnica', '🔧', '#F59E0B'),
('Cobranza', 'cobranza', 'Agentes especializados en cobranza', '💳', '#EF4444')
ON CONFLICT (slug) DO NOTHING;

-- Datos dummy para un agente de prueba
INSERT INTO agent_templates (
  name, slug, description, category_id, difficulty, agent_type,
  keywords, use_cases, vapi_config
) 
SELECT 
  'Agente de Prueba', 
  'agente-prueba', 
  'Agente de demostración para pruebas del sistema',
  (SELECT id FROM agent_categories WHERE slug = 'atencion_clientes' LIMIT 1),
  'beginner',
  'inbound',
  ARRAY['prueba', 'demo', 'test'],
  ARRAY['Demostración del sistema', 'Pruebas funcionales'],
  '{"name": "Agente de Prueba", "model": {"provider": "openai", "model": "gpt-3.5-turbo"}, "voice": {"provider": "11labs"}}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM agent_templates WHERE slug = 'agente-prueba');`;

      case 'pqnc':
        return `-- Base de Datos PQNC (Auth & Analysis)
-- Creación de tablas para autenticación, usuarios, permisos y análisis

-- Roles de usuario
CREATE TABLE IF NOT EXISTS auth_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usuarios
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  department VARCHAR(100),
  position VARCHAR(100),
  organization VARCHAR(255) DEFAULT 'Grupo Vidanta',
  role_id UUID REFERENCES auth_roles(id),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sesiones de usuario
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permisos del sistema
CREATE TABLE IF NOT EXISTS auth_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  permission_name VARCHAR(100) UNIQUE NOT NULL,
  module VARCHAR(50) NOT NULL,
  sub_module VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relación roles-permisos
CREATE TABLE IF NOT EXISTS auth_role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID REFERENCES auth_roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES auth_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Configuración del sistema
CREATE TABLE IF NOT EXISTS system_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_by_user UUID REFERENCES auth_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Temas de la aplicación
CREATE TABLE IF NOT EXISTS app_themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  color_palette JSONB,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Avatares de usuario
CREATE TABLE IF NOT EXISTS user_avatars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  avatar_url TEXT NOT NULL,
  filename VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Llamadas (análisis PQNC)
CREATE TABLE IF NOT EXISTS calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id VARCHAR(255) UNIQUE NOT NULL,
  customer_name VARCHAR(255),
  agent_name VARCHAR(255),
  call_type VARCHAR(50),
  duration INTEGER,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  transcript TEXT,
  summary TEXT,
  sentiment_score NUMERIC(3,2),
  quality_score NUMERIC(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar datos de prueba
INSERT INTO auth_roles (name, display_name, description) VALUES
('admin', 'Administrador', 'Acceso completo al sistema'),
('developer', 'Desarrollador', 'Acceso a herramientas de desarrollo'),
('evaluator', 'Evaluador', 'Acceso a módulos de análisis')
ON CONFLICT (name) DO NOTHING;

-- Usuario admin de prueba
INSERT INTO auth_users (
  email, password_hash, full_name, first_name, last_name, role_id, is_active, email_verified
) 
SELECT 
  'admin@sistema.com',
  crypt('admin123', gen_salt('bf')),
  'Administrador del Sistema',
  'Admin',
  'Sistema',
  (SELECT id FROM auth_roles WHERE name = 'admin' LIMIT 1),
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM auth_users WHERE email = 'admin@sistema.com');

-- Configuración básica del sistema
INSERT INTO system_config (config_key, config_value, description) VALUES
('app_branding', '{"app_name": "VAPI Builder", "logo_url": "/vite.svg", "login_description": "Plataforma de agentes inteligentes", "header_description": "AI AGENT PLATFORM"}', 'Configuración de marca de la aplicación'),
('app_theme', '{"active_theme": "default", "allow_user_theme_selection": false}', 'Configuración de tema activo')
ON CONFLICT (config_key) DO NOTHING;`;

      case 'natalia':
        return `-- Base de Datos Natalia (Analysis)
-- Creación de tablas para análisis de llamadas de Natalia

-- Análisis de llamadas
CREATE TABLE IF NOT EXISTS call_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id VARCHAR(255) UNIQUE NOT NULL,
  call_id VARCHAR(255) NOT NULL,
  score_general NUMERIC(5,2),
  categoria_desempeno VARCHAR(100),
  checkpoint_alcanzado INTEGER,
  nivel_interes_detectado VARCHAR(50),
  resultado_llamada VARCHAR(100),
  feedback_positivo TEXT[],
  feedback_constructivo JSONB,
  total_puntos_positivos INTEGER DEFAULT 0,
  total_areas_mejora INTEGER DEFAULT 0,
  calificaciones JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Segmentos de conversación
CREATE TABLE IF NOT EXISTS conversation_segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id VARCHAR(255) NOT NULL,
  etapa_script VARCHAR(100),
  text_content TEXT,
  speaker VARCHAR(50),
  timestamp_start INTEGER,
  timestamp_end INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Llamadas base
CREATE TABLE IF NOT EXISTS base_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id VARCHAR(255) UNIQUE NOT NULL,
  customer_name VARCHAR(255),
  agent_name VARCHAR(255),
  call_type VARCHAR(50) DEFAULT 'inbound',
  duration INTEGER,
  transcript TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar datos de prueba
INSERT INTO base_calls (call_id, customer_name, agent_name, call_type, duration, transcript) VALUES
('natalia-test-001', 'Cliente de Prueba', 'Natalia IA', 'inbound', 300, 'Transcripción de prueba para demostración del sistema de análisis de Natalia.')
ON CONFLICT (call_id) DO NOTHING;

INSERT INTO call_analysis (
  analysis_id, call_id, score_general, categoria_desempeno,
  checkpoint_alcanzado, nivel_interes_detectado, resultado_llamada,
  feedback_positivo, total_puntos_positivos, total_areas_mejora,
  calificaciones
) 
SELECT 
  'analysis-natalia-001',
  'natalia-test-001',
  85.50,
  'Bueno',
  3,
  'alto',
  'Llamada completada exitosamente',
  ARRAY['Saludo cordial', 'Explicación clara', 'Cierre efectivo'],
  3,
  1,
  '{"saludo": "EXCELENTE", "discovery": "BUENO", "presentacion": "EFECTIVO", "cierre": "ADECUADA"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM call_analysis WHERE analysis_id = 'analysis-natalia-001');`;

      default:
        return '-- Esquema no definido para esta base de datos';
    }
  };

  const copySchemaToClipboard = (dbKey: string) => {
    const schema = getSchemaSQL(dbKey);
    navigator.clipboard.writeText(schema).then(() => {
      setCopiedKey(dbKey);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const toggleKeyVisibility = (key: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const maskKey = (key: string): string => {
    if (key.length <= 20) return '••••••••••••••••••••';
    return key.substring(0, 10) + '••••••••••••' + key.substring(key.length - 8);
  };

  const getDbIcon = (key: string) => {
    switch (key) {
      case 'main': return 'from-blue-500 to-indigo-600';
      case 'pqnc': return 'from-emerald-500 to-teal-600';
      case 'natalia': return 'from-purple-500 to-pink-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const executeSchema = async (dbKey: string) => {
    const schema = getSchemaSQL(dbKey);
    
    try {
      // Por seguridad, solo copiamos el SQL sin ejecutarlo
      alert('Por seguridad, el esquema se debe ejecutar manualmente. El SQL ha sido copiado al portapapeles.');
      navigator.clipboard.writeText(schema);
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header minimalista */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Database className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Bases de Datos
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Conexiones y esquemas del sistema
              </p>
            </div>
          </div>

          {/* Métricas inline */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Conexiones: <span className="font-medium text-gray-900 dark:text-white">{Object.keys(configs).length}</span>
              </span>
            </div>
            <span className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">Supabase</span>
            </div>
          </div>

          {/* Botón de test all */}
          <button
            onClick={() => Object.keys(configs).forEach(key => testConnection(key))}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Probar Todas
          </button>
        </div>
      </div>

      {/* Lista de bases de datos */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {Object.entries(configs).map(([key, config]) => {
            const test = connectionTests.find(t => t.database === key);
            const isEditing = editingDb === key;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5"
              >
                {/* Header de la DB */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getDbIcon(key)} flex items-center justify-center shadow-lg`}>
                      <Database className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{config.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{config.description}</p>
                    </div>
                  </div>

                  {/* Estado de conexión */}
                  <div className="flex items-center gap-2">
                    {test && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          test.status === 'success' 
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                            : test.status === 'error'
                              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        }`}
                      >
                        {test.status === 'testing' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {test.status === 'success' && <CheckCircle2 className="w-3 h-3" />}
                        {test.status === 'error' && <XCircle className="w-3 h-3" />}
                        <span>{test.status === 'testing' ? 'Probando...' : test.status === 'success' ? 'Conectado' : 'Error'}</span>
                        {test.latency && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{test.latency}ms</span>}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Modo edición */}
                <AnimatePresence mode="wait">
                  {isEditing && tempConfig ? (
                    <motion.div
                      key="editing"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4 mt-4"
                    >
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">URL de la Base de Datos</label>
                        <input
                          type="text"
                          value={tempConfig.url}
                          onChange={(e) => setTempConfig({ ...tempConfig, url: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Anon Key</label>
                          <textarea
                            value={tempConfig.anonKey}
                            onChange={(e) => setTempConfig({ ...tempConfig, anonKey: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-2.5 text-sm font-mono border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Service Role Key</label>
                          <textarea
                            value={tempConfig.serviceKey}
                            onChange={(e) => setTempConfig({ ...tempConfig, serviceKey: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-2.5 text-sm font-mono border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all resize-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={cancelEditing}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={saveConfig}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-xl hover:bg-slate-600 transition-all"
                        >
                          <Save className="w-4 h-4" />
                          Guardar
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="viewing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {/* Info compacta */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <Server className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">URL</p>
                            <p className="text-sm font-mono text-gray-900 dark:text-white truncate">{config.url}</p>
                          </div>
                          <button
                            onClick={() => copyToClipboard(config.url, `${key}-url`)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            {copiedKey === `${key}-url` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <Database className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Anon Key</p>
                            <p className="text-sm font-mono text-gray-900 dark:text-white truncate">
                              {visibleKeys.has(`${key}-anon`) ? config.anonKey : maskKey(config.anonKey)}
                            </p>
                          </div>
                          <button
                            onClick={() => toggleKeyVisibility(`${key}-anon`)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            {visibleKeys.has(`${key}-anon`) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(config.anonKey, `${key}-anon-copy`)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            {copiedKey === `${key}-anon-copy` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/50">
                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => testConnection(key)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Probar
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => generateSchema(key)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                          >
                            <Code className="w-3.5 h-3.5" />
                            Esquema SQL
                          </motion.button>
                        </div>
                        <button
                          onClick={() => startEditing(key)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Editar
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Modal de esquema */}
      <AnimatePresence>
        {showSchemaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowSchemaModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-gray-100 dark:border-gray-800 overflow-hidden"
            >
              {/* Header del modal */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getDbIcon(showSchemaModal)} flex items-center justify-center`}>
                    <Code className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Esquema SQL</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{configs[showSchemaModal].name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSchemaModal(null)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido */}
              <div className="flex-1 overflow-auto p-6">
                <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-sm font-mono text-gray-800 dark:text-gray-200 overflow-x-auto">
                  {getSchemaSQL(showSchemaModal)}
                </pre>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <button
                  onClick={() => copySchemaToClipboard(showSchemaModal)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  {copiedKey === showSchemaModal ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copiedKey === showSchemaModal ? 'Copiado!' : 'Copiar'}
                </button>
                <button
                  onClick={() => executeSchema(showSchemaModal)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-xl hover:bg-slate-600 transition-all"
                >
                  <Zap className="w-4 h-4" />
                  Ejecutar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DatabaseConfiguration;
