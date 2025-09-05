import React, { useState, useEffect } from 'react';
import { importAgentFromJson, getAgentCategories } from '../../services/supabaseService';
import type { AgentCategory } from '../../config/supabase';

interface ImportAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface AgentAnalysis {
  name: string;
  description: string;
  categoryId: string;
  agentType: 'inbound' | 'outbound';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  keywords: string[];
  useCases: string[];
  businessContext: string;
  industryTags: string[];
  hasSquads: boolean;
  toolsCount: number;
  messagesCount: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const ImportAgentModal: React.FC<ImportAgentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'input' | 'confirmation'>('input');
  const [importMethod, setImportMethod] = useState<'file' | 'text'>('file');
  const [jsonText, setJsonText] = useState('');
  const [jsonData, setJsonData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [categories, setCategories] = useState<AgentCategory[]>([]);
  const [analysis, setAnalysis] = useState<AgentAnalysis | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const categoriesData = await getAgentCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const validateJsonStructure = (data: any): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('El JSON debe ser un objeto válido');
      return { isValid: false, errors, warnings };
    }

    if (data.squad) {
      if (!data.squad.members || !Array.isArray(data.squad.members)) {
        errors.push('El squad debe tener un array de miembros');
      } else if (data.squad.members.length === 0) {
        errors.push('El squad debe tener al menos un miembro');
      }
    }

    const hasName = data.name || (data.squad && data.squad.name);
    if (!hasName) {
      warnings.push('No se detectó un nombre para el agente');
    }

    return { isValid: errors.length === 0, errors, warnings };
  };

  const analyzeAgent = (data: any): AgentAnalysis => {
    let agentData = data;
    let name = data.name || 'Agente Importado';
    let allMessages: any[] = [];
    let allTools: any[] = [];
    
    if (data.squad && data.squad.members && data.squad.members.length > 0) {
      // Es un squad - analizar todos los miembros
      name = data.squad.name || 'Squad Importado';
      
      // Recopilar herramientas y mensajes de todos los miembros del squad
      data.squad.members.forEach((member: any) => {
        const memberAssistant = member.assistant || member;
        
        // Mensajes del miembro - pueden estar en messages o model.messages
        if (memberAssistant.messages) {
          allMessages = allMessages.concat(memberAssistant.messages);
        }
        if (memberAssistant.model && memberAssistant.model.messages) {
          allMessages = allMessages.concat(memberAssistant.model.messages);
        }
        
        // Herramientas del miembro - pueden estar en model.tools o tools
        let memberTools = memberAssistant.tools || [];
        if (memberAssistant.model && memberAssistant.model.tools) {
          memberTools = memberTools.concat(memberAssistant.model.tools);
        }
        if (memberAssistant.functions) {
          memberTools = memberTools.concat(memberAssistant.functions);
        }
        
        allTools = allTools.concat(memberTools);
      });
      
      // Usar el primer miembro como referencia principal
      agentData = data.squad.members[0].assistant || data.squad.members[0];
    } else {
      // Es un agente individual - revisar múltiples ubicaciones posibles
      
      // Caso 1: Estructura directa (data.messages, data.tools)
      if (data.messages) allMessages = allMessages.concat(data.messages);
      if (data.tools) allTools = allTools.concat(data.tools);
      if (data.functions) allTools = allTools.concat(data.functions);
      
      // Caso 2: Estructura con assistant (data.assistant.messages, data.assistant.tools)
      if (data.assistant) {
        agentData = data.assistant;
        name = data.assistant.name || name;
        
        if (data.assistant.messages) {
          allMessages = allMessages.concat(data.assistant.messages);
        }
        if (data.assistant.tools) {
          allTools = allTools.concat(data.assistant.tools);
        }
        if (data.assistant.functions) {
          allTools = allTools.concat(data.assistant.functions);
        }
        
        // Caso 3: Estructura con assistant.model (Clara)
        if (data.assistant.model) {
          if (data.assistant.model.messages) {
            allMessages = allMessages.concat(data.assistant.model.messages);
          }
          if (data.assistant.model.tools) {
            allTools = allTools.concat(data.assistant.model.tools);
          }
          if (data.assistant.model.functions) {
            allTools = allTools.concat(data.assistant.model.functions);
          }
        }
      }
      
      // Caso 4: Estructura con model directo (data.model)
      if (data.model) {
        if (data.model.messages) {
          allMessages = allMessages.concat(data.model.messages);
        }
        if (data.model.tools) {
          allTools = allTools.concat(data.model.tools);
        }
        if (data.model.functions) {
          allTools = allTools.concat(data.model.functions);
        }
      }
    }
    
    // Detectar categoría basándose en todo el contenido
    const content = allMessages.map(m => m.content || '').join(' ').toLowerCase();
    const toolNames = allTools.map(t => {
      if (t.function?.name) return t.function.name;
      if (t.name) return t.name;
      if (t.type) return t.type;
      return '';
    }).join(' ').toLowerCase();
    
    const allContent = content + ' ' + toolNames;

    let categoryId = 'atencion_clientes';
    if (allContent.includes('venta') || allContent.includes('discovery') || allContent.includes('agendar') || allContent.includes('demo')) {
      categoryId = 'ventas';
    } else if (allContent.includes('cobro') || allContent.includes('pago') || allContent.includes('deuda')) {
      categoryId = 'cobranza';
    } else if (allContent.includes('tecnico') || allContent.includes('soporte') || allContent.includes('error')) {
      categoryId = 'soporte_tecnico';
    }

    // Detectar tipo de agente (inbound/outbound)
    const agentType = detectAgentType(data, allMessages, allTools);
    
    // Analizar dificultad
    let complexity = allTools.length * 2 + allMessages.length;
    if (data.squad) complexity += 5;
    if (agentData.analysisPlan || data.analysisPlan) complexity += 3;
    
    const difficulty = complexity <= 5 ? 'beginner' : complexity <= 12 ? 'intermediate' : 'advanced';

    // Extraer keywords más específicos
    const keywords = [];
    if (content.includes('venta') || content.includes('discovery')) keywords.push('ventas');
    if (content.includes('cliente') || content.includes('customer')) keywords.push('atención al cliente');
    if (content.includes('agendar') || content.includes('schedule') || content.includes('demo')) keywords.push('agendamiento');
    if (content.includes('información') || content.includes('consulta')) keywords.push('consultas');
    if (content.includes('pqnc') || content.includes('qa')) keywords.push('pqnc qa ai');
    if (toolNames.includes('transfer')) keywords.push('transferencia');
    if (toolNames.includes('endcall')) keywords.push('finalización automática');

    // Detectar casos de uso más específicos
    const useCases = [];
    if (content.includes('cita') || content.includes('demo') || toolNames.includes('schedule')) {
      useCases.push('Agendamiento de citas y demos');
    }
    if (toolNames.includes('transfer') || content.includes('transfer')) {
      useCases.push('Transferencia de llamadas entre agentes');
    }
    if (content.includes('discovery') || content.includes('ventas')) {
      useCases.push('Discovery y proceso de ventas');
    }
    if (toolNames.includes('endcall') || content.includes('finalizar')) {
      useCases.push('Finalización automática de llamadas');
    }
    if (content.includes('email') || content.includes('sms') || toolNames.includes('send')) {
      useCases.push('Envío de información y seguimiento');
    }

    // Generar descripción más detallada
    const squadText = data.squad ? ` (Squad con ${data.squad.members?.length || 0} agentes)` : '';
    const description = `Agente conversacional${squadText} con ${allTools.length} herramienta${allTools.length !== 1 ? 's' : ''} y ${allMessages.length} mensaje${allMessages.length !== 1 ? 's' : ''} de sistema configurados.`;

    return {
      name,
      description,
      categoryId,
      agentType,
      difficulty,
      estimatedTime: `${30 + (allTools.length * 5)} minutos`,
      keywords: keywords.length ? keywords : ['general'],
      useCases: useCases.length ? useCases : ['Atención general'],
      businessContext: `Contexto empresarial extraído automáticamente${data.squad ? ' - Configuración de Squad' : ''}`,
      industryTags: content.includes('telecomunicaciones') ? ['telecomunicaciones'] : ['general'],
      hasSquads: !!data.squad,
      toolsCount: allTools.length,
      messagesCount: allMessages.length
    };
  };

  const detectAgentType = (data: any, messages: any[], tools: any[]): 'inbound' | 'outbound' => {
    // Verificar si tiene phoneNumberId o customer - indicativo de outbound
    if (data.phoneNumberId || data.customer) {
      return 'outbound';
    }
    
    // Verificar si es un squad outbound
    if (data.squad && (data.squad.phoneNumberId || data.squad.customer)) {
      return 'outbound';
    }
    
    // Verificar contenido de mensajes para indicios de outbound
    const content = messages.map(m => m.content || '').join(' ').toLowerCase();
    
    if (content.includes('outbound') || 
        content.includes('llamada saliente') ||
        content.includes('contactar') ||
        content.includes('prospecto') ||
        content.includes('seguimiento') ||
        content.includes('llamar a')) {
      return 'outbound';
    }
    
    // Por defecto es inbound
    return 'inbound';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setError('Por favor selecciona un archivo JSON válido');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await processJsonValidation(data);
    } catch (err) {
      setError('Error al leer el archivo JSON. Verifica que el formato sea correcto.');
      setIsLoading(false);
    }
  };

  const handleTextImport = async () => {
    if (!jsonText.trim()) {
      setError('Por favor ingresa el contenido JSON');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const data = JSON.parse(jsonText);
      await processJsonValidation(data);
    } catch (err) {
      setError('El JSON ingresado no es válido. Verifica la sintaxis.');
      setIsLoading(false);
    }
  };

  const processJsonValidation = async (data: any) => {
    try {
      const validationResult = validateJsonStructure(data);
      setValidation(validationResult);

      if (!validationResult.isValid) {
        setError('El JSON tiene errores de estructura que deben corregirse');
        setIsLoading(false);
        return;
      }

      const agentAnalysis = analyzeAgent(data);
      setAnalysis(agentAnalysis);
      setJsonData(data);
      setStep('confirmation');
      setIsLoading(false);

    } catch (err: any) {
      setError(err.message || 'Error al procesar el JSON');
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!analysis || !jsonData) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const importedAgent = await importAgentFromJson(jsonData, importMethod, analysis);
      setSuccess(`¡Agente "${importedAgent.name}" importado exitosamente!`);
      
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Error al importar el agente');
    } finally {
      setIsLoading(false);
    }
  };

  const updateAnalysis = (field: keyof AgentAnalysis, value: any) => {
    if (!analysis) return;
    setAnalysis({ ...analysis, [field]: value });
  };

  const handleClose = () => {
    setStep('input');
    setJsonText('');
    setJsonData(null);
    setAnalysis(null);
    setValidation(null);
    setError(null);
    setSuccess(null);
    setImportMethod('file');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === 'input' ? 'Importar Agente desde JSON' : 'Confirmar Información del Agente'}
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'input' && (
            <>
              {/* Método de importación */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Método de importación</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="file"
                      checked={importMethod === 'file'}
                      onChange={(e) => setImportMethod(e.target.value as 'file')}
                      className="mr-2"
                    />
                    <span>Subir archivo JSON</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="text"
                      checked={importMethod === 'text'}
                      onChange={(e) => setImportMethod(e.target.value as 'text')}
                      className="mr-2"
                    />
                    <span>Pegar texto JSON</span>
                  </label>
                </div>
              </div>

              {importMethod === 'file' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar archivo JSON</label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    disabled={isLoading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              )}

              {importMethod === 'text' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contenido JSON</label>
                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    disabled={isLoading}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono resize-vertical"
                    placeholder="Pega aquí el JSON de configuración del agente..."
                  />
                </div>
              )}
            </>
          )}

          {step === 'confirmation' && analysis && (
            <div className="space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Agente</label>
                  <input
                    type="text"
                    value={analysis.name}
                    onChange={(e) => updateAnalysis('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                  <select
                    value={analysis.categoryId}
                    onChange={(e) => updateAnalysis('categoryId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.slug}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Agente</label>
                  <select
                    value={analysis.agentType}
                    onChange={(e) => updateAnalysis('agentType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="inbound">Inbound (Recibe llamadas)</option>
                    <option value="outbound">Outbound (Hace llamadas)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dificultad</label>
                  <select
                    value={analysis.difficulty}
                    onChange={(e) => updateAnalysis('difficulty', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="beginner">Principiante</option>
                    <option value="intermediate">Intermedio</option>
                    <option value="advanced">Avanzado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tiempo estimado</label>
                  <input
                    type="text"
                    value={analysis.estimatedTime}
                    onChange={(e) => updateAnalysis('estimatedTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={analysis.description}
                  onChange={(e) => updateAnalysis('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Estadísticas del agente */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Análisis del Agente</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tipo:</span>
                    <p className="font-medium">{analysis.hasSquads ? 'Squad' : 'Individual'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Herramientas:</span>
                    <p className="font-medium">{analysis.toolsCount}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Mensajes:</span>
                    <p className="font-medium">{analysis.messagesCount}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Casos de uso:</span>
                    <p className="font-medium">{analysis.useCases.length}</p>
                  </div>
                </div>
              </div>

              {/* Validación y warnings */}
              {validation && validation.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <h5 className="font-medium text-yellow-800 mb-2">Advertencias:</h5>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}

          {isLoading && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <p className="text-blue-700 text-sm">
                  {step === 'input' ? 'Validando y analizando JSON...' : 'Importando agente...'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {step === 'input' ? (
              <p>📄 El sistema validará la estructura y analizará automáticamente el contenido</p>
            ) : (
              <p>✅ Revisa y confirma la información antes de importar</p>
            )}
          </div>
          
          <div className="flex space-x-3">
            {step === 'confirmation' && (
              <button
                onClick={() => setStep('input')}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Volver
              </button>
            )}
            
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Cancelar
            </button>
            
            {step === 'input' && importMethod === 'text' && (
              <button
                onClick={handleTextImport}
                disabled={isLoading || !jsonText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Validando...' : 'Validar JSON'}
              </button>
            )}

            {step === 'confirmation' && (
              <button
                onClick={handleConfirmImport}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Importando...' : 'Confirmar e Importar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportAgentModal;