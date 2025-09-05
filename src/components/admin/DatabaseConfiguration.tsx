import React, { useState, useEffect } from 'react';
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
  const [configs, setConfigs] = useState<Record<string, DatabaseConfig>>({
    main: {
      name: 'Base de Datos Principal (Agentes)',
      url: import.meta.env.VITE_MAIN_SUPABASE_URL || 'https://rnhejbuubpbnojalljso.supabase.co',
      anonKey: import.meta.env.VITE_MAIN_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuaGVqYnV1YnBibm9qYWxsanNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NzQzNTksImV4cCI6MjA3MjQ1MDM1OX0.MsTwi2IAHXk_kphl_QYDwOujJhNFbYrZPOx_a40v_YI',
      serviceKey: import.meta.env.VITE_MAIN_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuaGVqYnV1YnBibm9qYWxsanNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NDM1OSwiZXhwIjoyMDcyNDUwMzU5fQ.9f0eu5qyAxAWW8BDSb1xOagkPwG3dLlaLRcgtSuycWE',
      description: 'Almacena plantillas de agentes, categorías, prompts del sistema y herramientas.'
    },
    pqnc: {
      name: 'Base de Datos PQNC (Auth & Analysis)',
      url: import.meta.env.VITE_PQNC_SUPABASE_URL || 'https://hmmfuhqgvsehkizlfzga.supabase.co',
      anonKey: import.meta.env.VITE_PQNC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWZ1aHFndnNlaGtpemxmemdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1MTM1ODcsImV4cCI6MjA2MTA4OTU4N30.vhmMcmE9l_VJCPI0S_72XCgQycM2LemTG0OgyLsoqk4',
      serviceKey: import.meta.env.VITE_PQNC_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWZ1aHFndnNlaGtpemxmemdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTUxMzU4NywiZXhwIjoyMDYxMDg5NTg3fQ.mTnTOpkXi19xu1l-cZKx_f5RbqSg6zzH8mGdBOY3MZg',
      description: 'Maneja autenticación, usuarios, permisos y análisis PQNC.'
    },
    natalia: {
      name: 'Base de Datos Natalia (Analysis)',
      url: import.meta.env.VITE_NATALIA_SUPABASE_URL || 'https://glsmifhkoaifvaegsozd.supabase.co',
      anonKey: import.meta.env.VITE_NATALIA_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E',
      serviceKey: import.meta.env.VITE_NATALIA_SUPABASE_SERVICE_KEY || 'service-key-placeholder',
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
          testQuery = client.from('auth_users').select('count').limit(1);
          break;
        case 'natalia':
          // Probar tabla específica de análisis
          testQuery = client.from('call_analysis').select('count').limit(1);
          break;
        default:
          // Fallback: probar conexión básica sin tabla específica
          testQuery = client.auth.getSession();
      }

      const { data, error } = await testQuery;
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
      alert('Esquema copiado al portapapeles');
    });
  };

  const executeSchema = async (dbKey: string) => {
    const config = configs[dbKey];
    const schema = getSchemaSQL(dbKey);
    
    try {
      const client = createClient(config.url, config.serviceKey);
      
      // Aquí normalmente ejecutarías el esquema, pero por seguridad solo mostramos el SQL
      alert('Por seguridad, el esquema se debe ejecutar manualmente. El SQL ha sido copiado al portapapeles.');
      navigator.clipboard.writeText(schema);
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Configuración de Bases de Datos
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Gestiona las conexiones y esquemas de las bases de datos del sistema.
        </p>
      </div>

      {Object.entries(configs).map(([key, config]) => (
        <div key={key} className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {config.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {config.description}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => testConnection(key)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Probar Conexión
              </button>
              <button
                onClick={() => startEditing(key)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Editar
              </button>
              <button
                onClick={() => generateSchema(key)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Ver Esquema
              </button>
            </div>
          </div>

          {editingDb === key && tempConfig ? (
            <div className="space-y-4 border-t pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL de la Base de Datos
                </label>
                <input
                  type="text"
                  value={tempConfig.url}
                  onChange={(e) => setTempConfig({ ...tempConfig, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Anon Key
                </label>
                <textarea
                  value={tempConfig.anonKey}
                  onChange={(e) => setTempConfig({ ...tempConfig, anonKey: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Service Role Key
                </label>
                <textarea
                  value={tempConfig.serviceKey}
                  onChange={(e) => setTempConfig({ ...tempConfig, serviceKey: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={saveConfig}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Guardar
                </button>
                <button
                  onClick={cancelEditing}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">URL:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">{config.url}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">Anon Key:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400 font-mono">
                  {config.anonKey.substring(0, 20)}...
                </span>
              </div>
            </div>
          )}

          {/* Estado de conexión */}
          {connectionTests.find(t => t.database === key) && (
            <div className="mt-4 p-3 rounded-lg border">
              {(() => {
                const test = connectionTests.find(t => t.database === key)!;
                const bgColor = test.status === 'success' ? 'bg-green-50 border-green-200' :
                               test.status === 'error' ? 'bg-red-50 border-red-200' :
                               'bg-blue-50 border-blue-200';
                const textColor = test.status === 'success' ? 'text-green-800' :
                                test.status === 'error' ? 'text-red-800' :
                                'text-blue-800';
                
                return (
                  <div className={`${bgColor} ${textColor} p-3 rounded-lg`}>
                    <div className="flex items-center space-x-2">
                      {test.status === 'testing' && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      )}
                      {test.status === 'success' && (
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {test.status === 'error' && (
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className="font-medium">{test.message}</span>
                      {test.latency && (
                        <span className="text-sm">({test.latency}ms)</span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      ))}

      {/* Modal de esquema */}
      {showSchemaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl h-3/4 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Esquema SQL - {configs[showSchemaModal].name}
              </h3>
              <button
                onClick={() => setShowSchemaModal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-hidden">
              <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-auto h-full text-sm font-mono">
                {getSchemaSQL(showSchemaModal)}
              </pre>
            </div>
            
            <div className="flex justify-end space-x-2 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => copySchemaToClipboard(showSchemaModal)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Copiar al Portapapeles
              </button>
              <button
                onClick={() => executeSchema(showSchemaModal)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Ejecutar Esquema
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseConfiguration;
