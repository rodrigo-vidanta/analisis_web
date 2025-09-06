import React, { useState, useMemo } from 'react';

interface JsonOutputProps {
  agentData: any;
  onExport: () => void;
  builtJson?: any;
}

const JsonOutput: React.FC<JsonOutputProps> = ({ agentData, onExport, builtJson }) => {
  const [jsonDisplay, setJsonDisplay] = useState('formatted');

  const generatedJson = useMemo(() => {
    if (builtJson) return builtJson;
    // Generar JSON basado en la configuración actual
    const baseConfig = agentData.vapi_config || {};
    
    return {
      ...baseConfig,
      name: agentData.name,
      // Aquí se integrarían los prompts, tools y parámetros seleccionados
      // desde las otras pestañas del editor
    };
  }, [agentData]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(generatedJson, null, 2));
    alert('JSON copiado al portapapeles');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">JSON Final del Agente</h3>
          <p className="text-sm text-gray-600">
            Configuración completa lista para usar en Vapi
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Copiar JSON
          </button>
          <button
            onClick={onExport}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Descargar
          </button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg bg-gray-50">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Vista:</span>
            <div className="flex space-x-2">
              <button
                onClick={() => setJsonDisplay('formatted')}
                className={`px-3 py-1 text-sm rounded ${
                  jsonDisplay === 'formatted' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Formateado
              </button>
              <button
                onClick={() => setJsonDisplay('compact')}
                className={`px-3 py-1 text-sm rounded ${
                  jsonDisplay === 'compact' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Compacto
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <pre className="text-sm text-gray-800 overflow-x-auto max-h-96">
            {jsonDisplay === 'formatted' 
              ? JSON.stringify(generatedJson, null, 2)
              : JSON.stringify(generatedJson)
            }
          </pre>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-800 font-medium">✅ Listo para usar</p>
        <p className="text-green-700 text-sm mt-1">
          Este JSON contiene la configuración completa de tu agente y está listo para ser usado en Vapi.
        </p>
      </div>
    </div>
  );
};

export default JsonOutput;
