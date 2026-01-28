/**
 * ============================================
 * MODAL DE ENVÍO DE PLANTILLA A PROSPECTO NUEVO
 * ============================================
 * 
 * Modal simplificado para enviar plantillas WhatsApp a prospectos
 * que AÚN NO tienen conversación creada.
 * 
 * La conversación se crea automáticamente al enviar la plantilla.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Send, Loader2, CheckCircle, Search, AlertCircle 
} from 'lucide-react';
import { analysisSupabase } from '../../config/analysisSupabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  components: any[];
  variable_mappings?: any[];
  description?: string;
}

interface SendTemplateToProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospectoId: string;
  prospectoData: {
    id: string;
    nombre_completo: string;
    whatsapp: string;
    [key: string]: any;
  };
  onSuccess: (conversacionId?: string) => void; // Ahora recibe conversacionId opcional
}

export const SendTemplateToProspectModal: React.FC<SendTemplateToProspectModalProps> = ({
  isOpen,
  onClose,
  prospectoId,
  prospectoData,
  onSuccess
}) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});

  // Cargar plantillas al abrir
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await analysisSupabase
        .from('whatsapp_templates')
        .select('*')
        .eq('status', 'APPROVED')
        .order('name');

      if (error) throw error;

      // ✅ Filtrar plantillas SIN variables
      const templatesWithoutVariables = (data || []).filter(template => {
        // Verificar si la plantilla tiene variables en el BODY
        const hasVariables = template.components?.some((component: any) => {
          if (component.type === 'BODY' && component.text) {
            // Buscar patrón {{numero}}
            return /\{\{\d+\}\}/.test(component.text);
          }
          return false;
        });
        
        return !hasVariables; // Solo plantillas sin variables
      });

      console.log(`✅ Plantillas sin variables: ${templatesWithoutVariables.length}/${data?.length || 0}`);
      setTemplates(templatesWithoutVariables);
    } catch (error) {
      console.error('Error cargando plantillas:', error);
      toast.error('Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    
    // Auto-rellenar variables desde prospectoData
    const newVariables: Record<string, string> = {};
    
    template.components.forEach(component => {
      if (component.type === 'BODY' && component.text) {
        const matches = component.text.match(/\{\{(\d+)\}\}/g);
        if (matches) {
          matches.forEach((match: string, index: number) => {
            const varNum = match.replace(/[{}]/g, '');
            
            // Mapeo automático de variables comunes
            if (index === 0) {
              newVariables[varNum] = prospectoData.nombre_completo || '';
            } else {
              newVariables[varNum] = '';
            }
          });
        }
      }
    });
    
    setVariables(newVariables);
  };

  const handleSend = async () => {
    if (!selectedTemplate || !user) {
      toast.error('Selecciona una plantilla');
      return;
    }

    setSending(true);

    try {
      // Resolver texto con variables
      let resolvedText = '';
      
      selectedTemplate.components.forEach(component => {
        if (component.type === 'BODY' && component.text) {
          let text = component.text;
          Object.entries(variables).forEach(([varNum, value]) => {
            text = text.replace(new RegExp(`\\{\\{${varNum}\\}\\}`, 'g'), value);
          });
          resolvedText += text + '\n';
        }
      });

      const payload = {
        template_id: selectedTemplate.id,
        template_name: selectedTemplate.name,
        prospecto_id: prospectoId,
        variables: variables,
        resolved_text: resolvedText.trim(),
        triggered_by: 'MANUAL' as const,
        triggered_by_user: user.id,
        triggered_by_user_name: user.full_name || user.email
      };

      console.log('📤 [SendTemplate] Enviando payload:', payload);
      console.log('📋 [SendTemplate] Plantilla seleccionada:', selectedTemplate.name);
      console.log('🆔 [SendTemplate] Prospecto ID:', prospectoId);
      console.log('📱 [SendTemplate] Datos del prospecto:', prospectoData);

      const edgeFunctionUrl = `${import.meta.env.VITE_EDGE_FUNCTIONS_URL}/functions/v1/whatsapp-templates-send-proxy`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      console.log('📥 [SendTemplate] Response status:', response.status);
      console.log('📥 [SendTemplate] Response text:', responseText);
      
      let result;
      
      if (responseText && responseText.trim()) {
        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error(`Error del servidor (${response.status}): ${responseText || response.statusText}`);
        }
      } else {
        result = response.ok ? { success: true } : { success: false };
      }

      if (!response.ok || (result && !result.success)) {
        const errorMessage = result?.error || result?.message || `Error ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      // Extraer conversacion_id de la respuesta
      const conversacionId = result?.data?.conversacion_id || result?.conversacion_id;
      console.log('✅ [SendTemplate] Conversación ID:', conversacionId);

      toast.success('Plantilla enviada exitosamente');
      setSending(false);
      
      // Esperar un momento y pasar el conversacion_id
      setTimeout(() => {
        onSuccess(conversacionId);
      }, 1500);
      
    } catch (error: any) {
      console.error('Error enviando plantilla:', error);
      toast.error(error.message || 'Error al enviar la plantilla');
      setSending(false);
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Enviar Plantilla WhatsApp
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {prospectoData.nombre_completo} • {prospectoData.whatsapp}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Buscador */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar plantillas..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Lista de plantillas */}
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {filteredTemplates.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                        No hay plantillas disponibles
                      </p>
                    ) : (
                      filteredTemplates.map((template) => (
                        <motion.button
                          key={template.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectTemplate(template)}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            selectedTemplate?.id === template.id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                                {template.name}
                              </h4>
                              {template.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  {template.description}
                                </p>
                              )}
                              <span className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                {template.category}
                              </span>
                            </div>
                            {selectedTemplate?.id === template.id && (
                              <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 ml-2" />
                            )}
                          </div>
                        </motion.button>
                      ))
                    )}
                  </div>

                  {/* Vista previa y variables */}
                  <div className="space-y-4">
                    {selectedTemplate ? (
                      <>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            Vista Previa
                          </h4>
                          <div className="space-y-2">
                            {selectedTemplate.components.map((component, idx) => {
                              if (component.type === 'BODY' && component.text) {
                                let text = component.text;
                                Object.entries(variables).forEach(([varNum, value]) => {
                                  text = text.replace(
                                    new RegExp(`\\{\\{${varNum}\\}\\}`, 'g'),
                                    value || `{{${varNum}}}`
                                  );
                                });
                                return (
                                  <p key={idx} className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {text}
                                  </p>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>

                        {/* Variables */}
                        {Object.keys(variables).length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              Variables
                            </h4>
                            {Object.entries(variables).map(([varNum, value]) => (
                              <div key={varNum}>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                  Variable {varNum}
                                </label>
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) =>
                                    setVariables({ ...variables, [varNum]: e.target.value })
                                  }
                                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                        <div className="text-center">
                          <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Selecciona una plantilla</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={sending}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSend}
                disabled={!selectedTemplate || sending}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 flex items-center gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Plantilla</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
