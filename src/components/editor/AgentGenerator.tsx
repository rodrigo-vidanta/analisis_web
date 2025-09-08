import React, { useState } from 'react';
import { supabaseMainAdmin } from '../../config/supabase';
import type { AgentTemplate } from '../../config/supabase';

interface AgentGeneratorProps {
  template: AgentTemplate;
  onGenerate: (newTemplate: AgentTemplate) => void;
  onClose: () => void;
}

const AgentGenerator: React.FC<AgentGeneratorProps> = ({ template, onGenerate, onClose }) => {
  const [newTemplate, setNewTemplate] = useState<Partial<AgentTemplate>>({
    name: `${template.name} - Personalizado`,
    description: template.description,
    category_id: template.category_id,
    vapi_config: template.vapi_config
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState(1);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      
      // Crear el nuevo template en la base de datos
      const { data, error } = await supabaseMainAdmin
        .from('agent_templates')
        .insert({
          name: newTemplate.name,
          description: newTemplate.description,
          category_id: newTemplate.category_id,
          vapi_config: newTemplate.vapi_config,
          is_active: true,
          created_by: 'system'
        })
        .select()
        .single();

      if (error) throw error;

      // Copiar prompts del template original
      const { data: originalPrompts } = await supabaseMainAdmin
        .from('agent_prompts')
        .select('*')
        .eq('agent_template_id', template.id);

      if (originalPrompts && originalPrompts.length > 0) {
        const newPrompts = originalPrompts.map(prompt => ({
          agent_template_id: data.id,
          prompt_id: prompt.prompt_id,
          is_enabled: prompt.is_enabled,
          order_index: prompt.order_index
        }));

        await supabaseMainAdmin
          .from('agent_prompts')
          .insert(newPrompts);
      }

      // Copiar herramientas del template original
      const { data: originalTools } = await supabaseMainAdmin
        .from('agent_tools')
        .select('*')
        .eq('agent_template_id', template.id);

      if (originalTools && originalTools.length > 0) {
        const newTools = originalTools.map(tool => ({
          agent_template_id: data.id,
          tool_id: tool.tool_id,
          is_enabled: tool.is_enabled
        }));

        await supabaseMainAdmin
          .from('agent_tools')
          .insert(newTools);
      }

      onGenerate(data);
    } catch (error) {
      console.error('Error generating agent:', error);
      alert('Error al generar el agente');
    } finally {
      setIsGenerating(false);
    }
  };

  const steps = [
    { 
      id: 1, 
      name: 'Información Básica', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    { 
      id: 2, 
      name: 'Configuración', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      )
    },
    { 
      id: 3, 
      name: 'Revisar', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    }
  ];

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Nombre del Agente
        </label>
        <input
          type="text"
          value={newTemplate.name || ''}
          onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Nombre del nuevo agente..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Descripción
        </label>
        <textarea
          value={newTemplate.description || ''}
          onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          placeholder="Descripción del agente..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Categoría
        </label>
        <select
          value={newTemplate.category_id || ''}
          onChange={(e) => setNewTemplate({ ...newTemplate, category_id: e.target.value })}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Seleccionar categoría...</option>
          <option value="atencion_clientes">Atención a Clientes</option>
          <option value="cobranza">Cobranza</option>
          <option value="soporte_tecnico">Soporte Técnico</option>
          <option value="ventas">Ventas</option>
        </select>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Modelo
          </label>
          <select
            value={newTemplate.vapi_config?.model?.model || 'gpt-4o'}
            onChange={(e) => setNewTemplate({
              ...newTemplate,
              vapi_config: {
                ...newTemplate.vapi_config,
                model: {
                  ...newTemplate.vapi_config?.model,
                  model: e.target.value
                }
              }
            })}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Temperatura
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={newTemplate.vapi_config?.model?.temperature || 0.7}
            onChange={(e) => setNewTemplate({
              ...newTemplate,
              vapi_config: {
                ...newTemplate.vapi_config,
                model: {
                  ...newTemplate.vapi_config?.model,
                  temperature: parseFloat(e.target.value)
                }
              }
            })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Conservador (0)</span>
            <span className="font-medium">{newTemplate.vapi_config?.model?.temperature || 0.7}</span>
            <span>Creativo (2)</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Duración Máxima (segundos)
          </label>
          <input
            type="number"
            value={newTemplate.vapi_config?.maxDurationSeconds || 900}
            onChange={(e) => setNewTemplate({
              ...newTemplate,
              vapi_config: {
                ...newTemplate.vapi_config,
                maxDurationSeconds: parseInt(e.target.value)
              }
            })}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="60"
            max="3600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Sonido de Fondo
          </label>
          <select
            value={newTemplate.vapi_config?.backgroundSound || 'office'}
            onChange={(e) => setNewTemplate({
              ...newTemplate,
              vapi_config: {
                ...newTemplate.vapi_config,
                backgroundSound: e.target.value
              }
            })}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="office">Oficina</option>
            <option value="cafe">Café</option>
            <option value="nature">Naturaleza</option>
            <option value="none">Ninguno</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h4 className="font-medium text-slate-900 dark:text-white mb-4">Resumen del Nuevo Agente</h4>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Nombre:</label>
            <p className="text-slate-900 dark:text-white">{newTemplate.name}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Descripción:</label>
            <p className="text-slate-900 dark:text-white">{newTemplate.description}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Modelo:</label>
            <p className="text-slate-900 dark:text-white">{newTemplate.vapi_config?.model?.model}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Temperatura:</label>
            <p className="text-slate-900 dark:text-white">{newTemplate.vapi_config?.model?.temperature}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Duración Máxima:</label>
            <p className="text-slate-900 dark:text-white">{newTemplate.vapi_config?.maxDurationSeconds} segundos</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h4 className="font-medium text-slate-900 dark:text-white mb-4">Elementos Copiados del Template Original</h4>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-slate-600 dark:text-slate-400">Prompts del sistema</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-slate-600 dark:text-slate-400">Herramientas configuradas</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-slate-600 dark:text-slate-400">Configuración base</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return renderStep1();
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return newTemplate.name && newTemplate.description && newTemplate.category_id;
      case 2:
        return true;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Generar Nuevo Agente
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Basado en: {template.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Steps */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            {steps.map((stepItem, index) => (
              <div key={stepItem.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step >= stepItem.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {step > stepItem.id ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-sm font-medium">{stepItem.id}</span>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    step >= stepItem.id
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    {stepItem.name}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    step > stepItem.id
                      ? 'bg-blue-500'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
          
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Anterior
              </button>
            )}
            
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !canProceed()}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generando...
                  </div>
                ) : (
                  'Generar Agente'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentGenerator;
