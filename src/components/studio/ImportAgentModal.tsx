// Modal de importación de agentes con validación avanzada
// Soporte para agentes individuales, squads y workflows n8n

import React, { useState, useRef } from 'react';
import type { ImportResult } from '../../services/agentStudioService';

interface ImportAgentModalProps {
  onClose: () => void;
  onImport: (jsonData: any) => Promise<ImportResult>;
}

const ImportAgentModal: React.FC<ImportAgentModalProps> = ({
  onClose,
  onImport
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'result'>('upload');
  const [jsonData, setJsonData] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [jsonText, setJsonText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setJsonData(data);
        setJsonText(JSON.stringify(data, null, 2));
        validateAndPreview(data);
      } catch (error) {
        alert('Error al leer el archivo JSON: ' + error);
      }
    };
    reader.readAsText(file);
  };

  const handleTextInput = () => {
    try {
      const data = JSON.parse(jsonText);
      setJsonData(data);
      validateAndPreview(data);
    } catch (error) {
      alert('JSON inválido: ' + error);
    }
  };

  const validateAndPreview = (data: any) => {
    // Validación básica
    const validation = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      detectedType: 'unknown' as string,
      agentCount: 0,
      toolsCount: 0,
      details: {} as any
    };

    try {
      // Detectar tipo de agente
      if (data.squad && data.squad.members) {
        validation.detectedType = 'squad';
        validation.agentCount = data.squad.members.length;
        validation.details = {
          squadName: data.squad.name,
          members: data.squad.members.map((m: any) => ({
            name: m.assistant?.name || 'Sin nombre',
            role: extractRole(m.assistant?.model?.messages || []),
            toolsCount: m.assistant?.model?.tools?.length || 0
          }))
        };
        
        // Contar tools totales
        validation.toolsCount = data.squad.members.reduce((total: number, member: any) => 
          total + (member.assistant?.model?.tools?.length || 0), 0);
          
      } else if (data.assistant || data.name) {
        validation.detectedType = 'single';
        validation.agentCount = 1;
        const agent = data.assistant || data;
        validation.details = {
          name: agent.name,
          role: extractRole(agent.model?.messages || []),
          toolsCount: agent.model?.tools?.length || 0
        };
        validation.toolsCount = agent.model?.tools?.length || 0;
        
      } else if (data.nodes && Array.isArray(data.nodes)) {
        validation.detectedType = 'n8n_workflow';
        // Buscar nodos con configuración VAPI
        const vapiNodes = data.nodes.filter((node: any) => 
          node.parameters && (
            node.parameters.squad || 
            node.parameters.assistant ||
            (typeof node.parameters === 'string' && node.parameters.includes('assistant'))
          )
        );
        
        if (vapiNodes.length > 0) {
          validation.agentCount = vapiNodes.length;
          validation.warnings.push('Detectado workflow de n8n - se extraerá la configuración VAPI');
        } else {
          validation.isValid = false;
          validation.errors.push('No se encontró configuración VAPI válida en el workflow');
        }
      } else {
        validation.isValid = false;
        validation.errors.push('Formato no reconocido. Debe ser un agente individual, squad o workflow n8n válido');
      }

      // Validaciones específicas
      if (validation.isValid) {
        if (validation.agentCount === 0) {
          validation.errors.push('No se encontraron agentes válidos');
          validation.isValid = false;
        }
      }

    } catch (error) {
      validation.isValid = false;
      validation.errors.push('Error al validar JSON: ' + error);
    }

    setValidationResult(validation);
    setStep('preview');
  };

  const extractRole = (messages: any[]): string => {
    if (!messages || messages.length === 0) return 'Asistente';
    
    const firstMessage = messages[0]?.content || '';
    
    if (firstMessage.toLowerCase().includes('ventas')) return 'Agente de Ventas';
    if (firstMessage.toLowerCase().includes('soporte')) return 'Agente de Soporte';
    if (firstMessage.toLowerCase().includes('recepción')) return 'Recepcionista';
    if (firstMessage.toLowerCase().includes('atención')) return 'Atención al Cliente';
    
    return 'Asistente Virtual';
  };

  const handleImport = async () => {
    setStep('importing');
    
    try {
      const result = await onImport(jsonData);
      setImportResult(result);
      setStep('result');
    } catch (error) {
      setImportResult({
        success: false,
        message: 'Error durante la importación',
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      });
      setStep('result');
    }
  };

  const handleClose = () => {
    if (step === 'importing') return; // No cerrar durante importación
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Importar Agente
          </h2>
          <button
            onClick={handleClose}
            disabled={step === 'importing'}
            className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Paso 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="text-center">
                <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Importar Configuración de Agente
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Sube un archivo JSON o pega la configuración directamente
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Subir archivo */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white">Subir Archivo</h4>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition-colors"
                  >
                    <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 6.306A7.962 7.962 0 0112 5c-2.34 0-4.29 1.009-5.824 2.562" />
                    </svg>
                    <p className="text-slate-600 dark:text-slate-400">
                      Haz clic para seleccionar archivo JSON
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Pegar JSON */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white">Pegar JSON</h4>
                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    placeholder="Pega aquí tu configuración JSON..."
                    className="w-full h-40 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleTextInput}
                    disabled={!jsonText.trim()}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Validar JSON
                  </button>
                </div>
              </div>

              {/* Formatos soportados */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Formatos Soportados</h4>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <li>• <strong>Agentes individuales:</strong> Configuración VAPI de un solo agente</li>
                  <li>• <strong>Squads:</strong> Configuración de múltiples agentes que trabajan en conjunto</li>
                  <li>• <strong>Workflows n8n:</strong> Workflows con nodos VAPI configurados</li>
                  <li>• <strong>Exportaciones:</strong> Agentes exportados desde Agent Studio</li>
                </ul>
              </div>
            </div>
          )}

          {/* Paso 2: Preview */}
          {step === 'preview' && validationResult && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                {validationResult.isValid ? (
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                ) : (
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {validationResult.isValid ? 'Validación Exitosa' : 'Errores de Validación'}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Tipo: {validationResult.detectedType} | 
                    Agentes: {validationResult.agentCount} | 
                    Tools: {validationResult.toolsCount}
                  </p>
                </div>
              </div>

              {/* Errores */}
              {validationResult.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">Errores:</h4>
                  <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                    {validationResult.errors.map((error: string, index: number) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Advertencias */}
              {validationResult.warnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Advertencias:</h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                    {validationResult.warnings.map((warning: string, index: number) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Detalles del agente */}
              {validationResult.isValid && (
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Vista Previa:</h4>
                  
                  {validationResult.detectedType === 'squad' && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Squad: {validationResult.details.squadName}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {validationResult.details.members.map((member: any, index: number) => (
                          <div key={index} className="bg-white dark:bg-slate-600 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="font-medium text-slate-900 dark:text-white">{member.name}</span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{member.role}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-500">{member.toolsCount} tools</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {validationResult.detectedType === 'single' && (
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="font-semibold text-slate-900 dark:text-white">{validationResult.details.name}</h5>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{validationResult.details.role}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">{validationResult.details.toolsCount} tools</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Acciones */}
              <div className="flex justify-between">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  ← Volver
                </button>
                
                {validationResult.isValid && (
                  <button
                    onClick={handleImport}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Importar Agente
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Paso 3: Importing */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Importando Agente...
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Procesando configuración y creando plantilla
              </p>
            </div>
          )}

          {/* Paso 4: Result */}
          {step === 'result' && importResult && (
            <div className="space-y-6">
              <div className="text-center">
                {importResult.success ? (
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full w-fit mx-auto mb-4">
                    <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                ) : (
                  <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full w-fit mx-auto mb-4">
                    <svg className="w-12 h-12 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
                
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {importResult.success ? '¡Importación Exitosa!' : 'Error en la Importación'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {importResult.message}
                </p>
              </div>

              {/* Errores */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">Errores:</h4>
                  <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                    {importResult.errors.map((error: string, index: number) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Advertencias */}
              {importResult.warnings && importResult.warnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Advertencias:</h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                    {importResult.warnings.map((warning: string, index: number) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Información del agente importado */}
              {importResult.success && importResult.agent && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">Agente Importado:</h4>
                  <div className="text-sm text-green-700 dark:text-green-400">
                    <p><strong>Nombre:</strong> {importResult.agent.name}</p>
                    <p><strong>Tipo:</strong> {importResult.agent.is_squad ? 'Squad' : 'Agente Individual'}</p>
                    <p><strong>Tools:</strong> {importResult.agent.tools.length}</p>
                    <p><strong>Categoría:</strong> {importResult.agent.category}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {importResult.success ? 'Continuar' : 'Cerrar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportAgentModal;
