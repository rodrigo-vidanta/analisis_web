import React, { useState, useEffect } from 'react';

interface JsonViewerProps {
  data: any;
  title?: string;
  className?: string;
}

const JsonViewer: React.FC<JsonViewerProps> = ({ 
  data, 
  title = 'JSON Output', 
  className = '' 
}) => {
  const [formattedJson, setFormattedJson] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      setFormattedJson(jsonString);
      setIsValid(true);
    } catch (error) {
      setFormattedJson('Error: Invalid JSON data');
      setIsValid(false);
    }
  }, [data]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy JSON:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([formattedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Renderizado seguro de JSON con syntax highlighting (XSS-safe)
   * 🔒 SEGURIDAD (Actualizado 2025-12-23): Usa React nodes en lugar de innerHTML
   */
  const renderJsonWithSyntaxHighlighting = (json: string): React.ReactNode => {
    if (!isValid) {
      return <span className="text-red-500 dark:text-red-400">{json}</span>;
    }

    const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = tokenRegex.exec(json)) !== null) {
      // Texto antes del match (espacios, llaves, corchetes, comas)
      if (match.index > lastIndex) {
        parts.push(<span key={key++}>{json.slice(lastIndex, match.index)}</span>);
      }

      // Determinar clase según tipo de token
      let className = '';
      if (/^"/.test(match[0])) {
        if (/:$/.test(match[0])) {
          className = 'text-blue-600 dark:text-blue-400 font-semibold'; // Keys
        } else {
          className = 'text-green-600 dark:text-green-400'; // Strings
        }
      } else if (/^(true|false)$/.test(match[0])) {
        className = 'text-purple-600 dark:text-purple-400'; // Booleans
      } else if (/^null$/.test(match[0])) {
        className = 'text-gray-500 dark:text-gray-400'; // Null
      } else {
        className = 'text-orange-600 dark:text-orange-400'; // Numbers
      }

      parts.push(<span key={key++} className={className}>{match[0]}</span>);
      lastIndex = tokenRegex.lastIndex;
    }

    // Texto restante
    if (lastIndex < json.length) {
      parts.push(<span key={key++}>{json.slice(lastIndex)}</span>);
    }

    return parts;
  };

  return (
    <div className={`glass-card ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isValid ? 'JSON válido' : 'Error en el JSON'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              copied 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <div className="flex items-center space-x-1">
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copiar</span>
                </>
              )}
            </div>
          </button>
          
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Descargar</span>
            </div>
          </button>
        </div>
      </div>

      {/* JSON Content */}
      <div className="relative">
        <pre className="p-4 text-sm font-mono overflow-x-auto bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 leading-relaxed">
          <code>
            {renderJsonWithSyntaxHighlighting(formattedJson)}
          </code>
        </pre>
        
        {/* Line numbers */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="p-4 text-xs text-gray-500 dark:text-gray-400 font-mono leading-relaxed">
            {formattedJson.split('\n').map((_, index) => (
              <div key={index} className="text-right">
                {index + 1}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer with stats */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            <span>
              {formattedJson.split('\n').length} líneas
            </span>
            <span>
              {formattedJson.length} caracteres
            </span>
            <span>
              {formattedJson.split(' ').length} palabras
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${isValid ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span>{isValid ? 'Válido' : 'Inválido'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JsonViewer;
