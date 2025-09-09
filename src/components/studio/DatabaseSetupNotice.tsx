// Componente de aviso para configurar las tablas de Agent Studio
// Muestra instrucciones y script SQL para ejecutar en Supabase

import React, { useState } from 'react';

interface DatabaseSetupNoticeProps {
  onDismiss?: () => void;
}

const DatabaseSetupNotice: React.FC<DatabaseSetupNoticeProps> = ({ onDismiss }) => {
  const [showScript, setShowScript] = useState(false);
  const [copied, setCopied] = useState(false);

  const sqlScript = `-- Script para Agent Studio - Ejecutar en Supabase SQL Editor

-- Tabla para tools/herramientas
CREATE TABLE IF NOT EXISTS tools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'custom',
    function_schema JSONB NOT NULL,
    server_url VARCHAR(500),
    is_async BOOLEAN DEFAULT false,
    is_reusable BOOLEAN DEFAULT true,
    messages JSONB DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usage_count INTEGER DEFAULT 0,
    UNIQUE(name, created_by)
);

-- Tabla para plantillas de agentes
CREATE TABLE IF NOT EXISTS agent_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'custom',
    keywords TEXT[] DEFAULT '{}',
    use_cases TEXT[] DEFAULT '{}',
    is_squad BOOLEAN DEFAULT false,
    squad_config JSONB,
    single_agent_config JSONB,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    vapi_config JSONB
);

-- Tabla de relación many-to-many
CREATE TABLE IF NOT EXISTS agent_template_tools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_template_id UUID REFERENCES agent_templates(id) ON DELETE CASCADE,
    tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_template_id, tool_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tools_created_by ON tools(created_by);
CREATE INDEX IF NOT EXISTS idx_agent_templates_created_by ON agent_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_agent_templates_is_active ON agent_templates(is_active);

-- RLS Policies
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_template_tools ENABLE ROW LEVEL SECURITY;

-- Políticas para tools
CREATE POLICY "Users can view reusable tools" ON tools
    FOR SELECT USING (is_reusable = true OR auth.uid() = created_by);
CREATE POLICY "Users can create tools" ON tools
    FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own tools" ON tools
    FOR UPDATE USING (auth.uid() = created_by);

-- Políticas para agent_templates  
CREATE POLICY "Users can view active templates" ON agent_templates
    FOR SELECT USING (is_active = true);
CREATE POLICY "Users can create templates" ON agent_templates
    FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own templates" ON agent_templates
    FOR UPDATE USING (auth.uid() = created_by);

-- Políticas para relaciones
CREATE POLICY "Users can view template tools" ON agent_template_tools
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM agent_templates WHERE id = agent_template_id AND is_active = true)
    );
CREATE POLICY "Users can manage own template tools" ON agent_template_tools
    FOR ALL USING (
        EXISTS (SELECT 1 FROM agent_templates WHERE id = agent_template_id AND created_by = auth.uid())
    );

-- Función para incrementar uso
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE agent_templates SET usage_count = usage_count + 1 WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;`;

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(sqlScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying script:', error);
    }
  };

  const downloadScript = () => {
    const blob = new Blob([sqlScript], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agent-studio-setup.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 mb-8">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
            <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
            🔧 Configuración de Base de Datos Requerida
          </h3>
          
          <p className="text-yellow-800 dark:text-yellow-400 mb-4">
            Para usar Agent Studio completamente, necesitas ejecutar un script SQL en tu base de datos de Supabase 
            para crear las tablas necesarias: <code className="bg-yellow-200 dark:bg-yellow-800 px-2 py-1 rounded text-sm">tools</code>, 
            <code className="bg-yellow-200 dark:bg-yellow-800 px-2 py-1 rounded text-sm ml-1">agent_templates</code> y 
            <code className="bg-yellow-200 dark:bg-yellow-800 px-2 py-1 rounded text-sm ml-1">agent_template_tools</code>.
          </p>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowScript(!showScript)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 6.306A7.962 7.962 0 0112 5c-2.34 0-4.29 1.009-5.824 2.562" />
                </svg>
                <span>{showScript ? 'Ocultar Script' : 'Ver Script SQL'}</span>
              </button>

              <button
                onClick={copyScript}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>{copied ? '¡Copiado!' : 'Copiar Script'}</span>
              </button>

              <button
                onClick={downloadScript}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Descargar Script</span>
              </button>

              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 transition-colors"
                >
                  Usar modo demo
                </button>
              )}
            </div>

            {showScript && (
              <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-300 text-sm font-medium">agent-studio-setup.sql</span>
                  <button
                    onClick={copyScript}
                    className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600 transition-colors"
                  >
                    {copied ? '✓' : 'Copiar'}
                  </button>
                </div>
                <pre className="text-slate-300 text-sm overflow-x-auto">
                  <code>{sqlScript}</code>
                </pre>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">📋 Pasos para Configurar</h4>
              <ol className="text-blue-800 dark:text-blue-400 text-sm space-y-1 list-decimal list-inside">
                <li>Ve a tu <strong>Dashboard de Supabase</strong></li>
                <li>Abre el <strong>SQL Editor</strong></li>
                <li>Copia y pega el script SQL de arriba</li>
                <li>Haz clic en <strong>"Run"</strong> para ejecutar</li>
                <li>Recarga esta página para usar Agent Studio completo</li>
              </ol>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">✨ Mientras tanto...</h4>
              <p className="text-green-800 dark:text-green-400 text-sm">
                Agent Studio funciona en <strong>modo demo</strong> con plantillas de ejemplo. 
                Puedes explorar la interfaz y probar la funcionalidad de importación.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default DatabaseSetupNotice;
