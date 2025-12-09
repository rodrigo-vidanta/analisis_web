import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Clock, Calendar, User, MapPin, Building2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { whatsappTemplatesService } from '../../services/whatsappTemplatesService';
import type { WhatsAppTemplate, VariableMapping } from '../../types/whatsappTemplates';
import { analysisSupabase } from '../../config/analysisSupabase';
import { useAuth } from '../../contexts/AuthContext';

interface ReactivateConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: {
    id: string;
    customer_name?: string;
    customer_phone?: string;
    metadata?: any;
  };
  prospectoData?: {
    id?: string;
    nombre_completo?: string;
    whatsapp?: string;
    [key: string]: any;
  };
}

export const ReactivateConversationModal: React.FC<ReactivateConversationModalProps> = ({
  isOpen,
  onClose,
  conversation,
  prospectoData,
}) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [destinos, setDestinos] = useState<Array<{ id: string; nombre: string }>>([]);
  const [resorts, setResorts] = useState<Array<{ id: string; nombre: string; nombre_completo: string }>>([]);
  
  // Variables personalizadas
  const [customVariables, setCustomVariables] = useState<Record<number, {
    value: string;
    type: 'prospecto' | 'destino' | 'resort' | 'fecha_actual' | 'fecha_personalizada' | 'hora_actual' | 'hora_personalizada' | 'ejecutivo';
    destinoId?: string;
    resortId?: string;
  }>>({});

  // Cargar plantillas activas
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadDestinos();
    }
  }, [isOpen]);

  // Cargar resorts cuando se selecciona un destino
  useEffect(() => {
    if (selectedTemplate) {
      const destinoMapping = selectedTemplate.variable_mappings?.find(
        m => m.table_name === 'destinos' && customVariables[m.variable_number]?.destinoId
      );
      if (destinoMapping && customVariables[destinoMapping.variable_number]?.destinoId) {
        loadResorts(customVariables[destinoMapping.variable_number].destinoId!);
      }
    }
  }, [customVariables, selectedTemplate]);

  const generatePreview = useCallback(async () => {
    if (!selectedTemplate) return;
    
    try {
      setLoading(true);
      const variablesMap: Record<number, string> = {};
      
      // Construir mapa de variables
      selectedTemplate.variable_mappings?.forEach(mapping => {
        const customVar = customVariables[mapping.variable_number];
        if (customVar) {
          if (mapping.table_name === 'system') {
            // Para fecha/hora actual, no pasar customValue (undefined)
            // Para fecha/hora personalizada, pasar el valor seleccionado
            let customValue: string | undefined = undefined;
            
            // Debug: verificar todos los mappings del sistema
            console.log('🔍 System mapping:', {
              variable_number: mapping.variable_number,
              field_name: mapping.field_name,
              table_name: mapping.table_name,
              customVar_value: customVar.value,
              customVar_type: customVar.type
            });
            
            if (mapping.field_name === 'fecha_personalizada') {
              // Asegurar que tenemos un valor válido para fecha personalizada
              customValue = customVar.value && customVar.value !== 'current' && customVar.value.trim() !== '' ? customVar.value : undefined;
              console.log('📅 Fecha personalizada detectada - customValue:', customValue);
            } else if (mapping.field_name === 'hora_personalizada') {
              // Asegurar que tenemos un valor válido para hora personalizada
              customValue = customVar.value && customVar.value !== 'current' && customVar.value.trim() !== '' ? customVar.value : undefined;
            } else if (mapping.field_name === 'fecha_actual' || mapping.field_name === 'hora_actual') {
              // Para fecha/hora actual, no pasar customValue
              customValue = undefined;
            }
            
            const formattedValue = whatsappTemplatesService.getSystemVariableValue(
              mapping.field_name,
              customValue,
              user?.full_name || user?.displayName
            );
            
            console.log('✅ Variable procesada:', {
              variable_number: mapping.variable_number,
              field_name: mapping.field_name,
              customValue,
              formattedValue
            });
            
            variablesMap[mapping.variable_number] = formattedValue;
          } else if (mapping.table_name === 'destinos' && customVar.destinoId) {
            const destino = destinos.find(d => d.id === customVar.destinoId);
            variablesMap[mapping.variable_number] = destino?.nombre || '';
          } else if (mapping.table_name === 'resorts' && customVar.resortId) {
            const resort = resorts.find(r => r.id === customVar.resortId);
            variablesMap[mapping.variable_number] = resort?.nombre || resort?.nombre_completo || '';
          } else {
            variablesMap[mapping.variable_number] = customVar.value;
          }
        }
      });
      
      const ejecutivoNombre = user?.full_name || user?.displayName || '';
      const previewText = await whatsappTemplatesService.generateExample(
        selectedTemplate,
        variablesMap,
        ejecutivoNombre
      );
      setPreview(previewText);
    } catch (error) {
      console.error('Error generando preview:', error);
      setPreview('Error al generar la vista previa');
    } finally {
      setLoading(false);
    }
  }, [selectedTemplate, customVariables, destinos, resorts, user]);

  // Serializar customVariables para detectar cambios
  const customVariablesKey = useMemo(() => {
    return JSON.stringify(customVariables);
  }, [customVariables]);

  // Generar preview cuando cambian las variables
  useEffect(() => {
    if (selectedTemplate) {
      generatePreview();
    }
  }, [selectedTemplate, customVariablesKey, destinos.length, resorts.length, generatePreview]);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const data = await whatsappTemplatesService.getAllTemplates();
      const activeTemplates = data.filter(t => t.is_active && t.status === 'APPROVED');
      setTemplates(activeTemplates);
    } catch (error) {
      console.error('Error cargando plantillas:', error);
      toast.error('Error al cargar las plantillas');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadDestinos = async () => {
    try {
      const destinosData = await whatsappTemplatesService.getDestinos();
      setDestinos(destinosData);
    } catch (error) {
      console.error('Error cargando destinos:', error);
    }
  };

  const loadResorts = async (destinoId: string) => {
    try {
      const resortsData = await whatsappTemplatesService.getResortsByDestino(destinoId);
      setResorts(resortsData);
    } catch (error) {
      console.error('Error cargando resorts:', error);
    }
  };

  const handleSelectTemplate = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    
    // Inicializar variables con valores por defecto
    const initialVars: Record<number, any> = {};
    
    template.variable_mappings?.forEach(mapping => {
      if (mapping.table_name === 'prospectos' && prospectoData) {
        // Variables del prospecto (no editables)
        const value = prospectoData[mapping.field_name] || '';
        initialVars[mapping.variable_number] = {
          value: String(value),
          type: 'prospecto',
        };
      } else if (mapping.table_name === 'system') {
        // Variables del sistema
        if (mapping.field_name === 'ejecutivo_nombre') {
          initialVars[mapping.variable_number] = {
            value: user?.full_name || user?.displayName || '',
            type: 'ejecutivo',
          };
        } else if (mapping.field_name === 'fecha_actual') {
          // Fecha actual: se muestra automáticamente, no necesita valor personalizado
          initialVars[mapping.variable_number] = {
            value: 'current', // Marcador especial para fecha actual
            type: 'fecha_actual',
          };
        } else if (mapping.field_name === 'fecha_personalizada') {
          // Fecha personalizada: necesita selección del usuario
          initialVars[mapping.variable_number] = {
            value: new Date().toISOString().split('T')[0],
            type: 'fecha_personalizada',
          };
        } else if (mapping.field_name === 'hora_actual') {
          // Hora actual: se muestra automáticamente
          initialVars[mapping.variable_number] = {
            value: 'current', // Marcador especial para hora actual
            type: 'hora_actual',
          };
        } else if (mapping.field_name === 'hora_personalizada') {
          // Hora personalizada: necesita selección del usuario
          const now = new Date();
          initialVars[mapping.variable_number] = {
            value: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
            type: 'hora_personalizada',
          };
        }
      } else if (mapping.table_name === 'destinos') {
        // Variables de destino (seleccionables)
        initialVars[mapping.variable_number] = {
          value: '',
          type: 'destino',
          destinoId: '',
        };
      } else if (mapping.table_name === 'resorts') {
        // Variables de resort (seleccionables)
        initialVars[mapping.variable_number] = {
          value: '',
          type: 'resort',
          destinoId: '',
          resortId: '',
        };
      }
    });
    
    setCustomVariables(initialVars);
  };


  const handleSend = async () => {
    if (!selectedTemplate || !prospectoData?.id) {
      toast.error('Selecciona una plantilla y asegúrate de que hay un prospecto asociado');
      return;
    }

    // Validar que el template esté aprobado y activo
    if (selectedTemplate.status !== 'APPROVED') {
      toast.error(`La plantilla "${selectedTemplate.name}" no está aprobada. Estado actual: ${selectedTemplate.status}`);
      return;
    }

    if (!selectedTemplate.is_active) {
      toast.error(`La plantilla "${selectedTemplate.name}" está inactiva`);
      return;
    }

    try {
      setSending(true);
      
      // Construir variables para enviar (formato: {"1": "valor1", "2": "valor2"})
      const variables: Record<string, string> = {};
      const missingVariables: string[] = [];
      
      selectedTemplate.variable_mappings?.forEach(mapping => {
        const customVar = customVariables[mapping.variable_number];
        if (customVar) {
          let value = '';
          
          if (mapping.table_name === 'system') {
            // Para fecha/hora actual, no pasar customValue (undefined)
            // Para fecha/hora personalizada, pasar el valor seleccionado
            const customValue = (mapping.field_name === 'fecha_actual' || mapping.field_name === 'hora_actual')
              ? undefined
              : customVar.value;
            
            value = whatsappTemplatesService.getSystemVariableValue(
              mapping.field_name,
              customValue,
              user?.full_name || user?.displayName
            );
          } else if (mapping.table_name === 'destinos') {
            if (customVar.destinoId) {
              const destino = destinos.find(d => d.id === customVar.destinoId);
              value = destino?.nombre || '';
            } else {
              missingVariables.push(`${mapping.display_name} ({{${mapping.variable_number}}})`);
            }
          } else if (mapping.table_name === 'resorts') {
            if (customVar.resortId) {
              const resort = resorts.find(r => r.id === customVar.resortId);
              value = resort?.nombre || resort?.nombre_completo || '';
            } else {
              missingVariables.push(`${mapping.display_name} ({{${mapping.variable_number}}})`);
            }
          } else {
            value = customVar.value || '';
          }
          
          // Solo agregar si tiene valor
          if (value && value.trim() !== '') {
            variables[mapping.variable_number.toString()] = value;
          } else if (mapping.table_name !== 'prospectos' && mapping.table_name !== 'system') {
            // Prospectos y sistema ya tienen valores por defecto, no marcar como faltante
            missingVariables.push(`${mapping.display_name} ({{${mapping.variable_number}}})`);
          }
        } else {
          // Variable sin mapeo
          missingVariables.push(`Variable {{${mapping.variable_number}}}`);
        }
      });

      // Validar que no falten variables requeridas
      if (missingVariables.length > 0) {
        toast.error(`Faltan variables requeridas: ${missingVariables.join(', ')}`);
        return;
      }

      // Validar que prospecto_id sea un UUID válido
      if (!prospectoData.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prospectoData.id)) {
        toast.error('ID de prospecto inválido');
        console.error('❌ Prospecto ID inválido:', prospectoData.id);
        return;
      }

      // Construir payload según la documentación
      const payload = {
        template_id: selectedTemplate.id,
        template_name: selectedTemplate.name,
        prospecto_id: prospectoData.id,
        variables: variables,
        triggered_by: 'MANUAL' as const
      };

      console.log('📤 Enviando payload al webhook:', {
        ...payload,
        variables: JSON.parse(JSON.stringify(variables)) // Expandir objeto variables
      });
      console.log('📤 Variables detalladas:', variables);
      console.log('📤 Template ID:', selectedTemplate.id);
      console.log('📤 Template Name:', selectedTemplate.name);
      console.log('📤 Prospecto ID:', prospectoData.id);

      // Enviar al webhook
      const webhookUrl = 'https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates-send';
      const authToken = 'wFRpkQv4cdmAg976dzEfTDML86vVlGLZmBUIMgftO0rkwhfJHkzVRuQa51W0tXTV';
      
      const requestBody = JSON.stringify(payload);
      
      console.log('🌐 URL del webhook:', webhookUrl);
      console.log('📦 Body (stringified):', requestBody);
      console.log('📦 Body (parsed):', JSON.parse(requestBody));
      
      // Usar header 'Auth' como especifica la documentación
      const requestHeaders = {
        'Auth': authToken,
        'Content-Type': 'application/json'
      };
      
      console.log('🔑 Headers:', requestHeaders);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: requestBody
      });

      // Obtener el texto de la respuesta primero para debugging
      const responseText = await response.text();
      console.log('📥 Respuesta del servidor (raw):', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText
      });

      // Si el payload llegó pero el servidor responde con error, podría ser que el webhook no esté implementado
      if (response.status === 400 && !responseText.trim()) {
        console.warn('⚠️ El payload llegó al webhook pero el servidor respondió con 400 sin mensaje');
        console.warn('⚠️ Esto podría indicar que el webhook aún no está completamente implementado o conectado con uChat');
        // Mostrar mensaje informativo pero no cerrar el modal para que el usuario pueda revisar
        toast.error('El payload llegó al webhook pero el servidor respondió con error. Verifica que el webhook esté conectado con uChat.', {
          duration: 5000
        });
        return; // No cerrar el modal para que el usuario pueda revisar
      }

      // Si la respuesta es texto plano (no JSON), manejar directamente
      if (responseText && !responseText.trim().startsWith('{') && !responseText.trim().startsWith('[')) {
        // Es texto plano, no JSON
        if (response.status === 403) {
          throw new Error(`Error de autenticación: ${responseText || 'Token inválido o expirado'}`);
        }
        throw new Error(`Error del servidor (${response.status}): ${responseText || response.statusText}`);
      }

      // Intentar parsear como JSON solo si hay contenido
      let result;
      if (responseText && responseText.trim()) {
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ Error parseando respuesta JSON:', parseError);
          // Si no es JSON válido pero tenemos texto, usar el texto como mensaje
          throw new Error(`Error del servidor (${response.status}): ${responseText || response.statusText}`);
        }
      } else {
        // Respuesta vacía
        if (response.ok) {
          result = { success: true };
        } else {
          throw new Error(`Error del servidor (${response.status}): ${response.statusText || 'Sin respuesta del servidor'}`);
        }
      }

      if (!response.ok || (result && !result.success)) {
        const errorMessage = result?.error || result?.message || `Error ${response.status}: ${response.statusText}`;
        console.error('❌ Error en respuesta:', result);
        throw new Error(errorMessage);
      }

      // Éxito
      toast.success('Plantilla enviada exitosamente');
      console.log('✅ Plantilla enviada:', {
        send_id: result.data?.send_id,
        template_name: result.data?.template_name,
        prospecto_nombre: result.data?.prospecto_nombre,
        phone_number: result.data?.phone_number,
        sent_at: result.data?.sent_at
      });
      
      onClose();
    } catch (error: any) {
      console.error('❌ Error enviando plantilla:', error);
      toast.error(error.message || 'Error al enviar la plantilla');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Reactivar Conversación con Plantilla
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Selecciona una plantilla para reactivar la conversación de WhatsApp
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {!selectedTemplate ? (
              // Selección de plantilla
              <div className="space-y-4">
                {loadingTemplates ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No hay plantillas disponibles</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <motion.button
                        key={template.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectTemplate(template)}
                        className="text-left p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-600 transition-all bg-white dark:bg-gray-800"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {template.name}
                          </h4>
                          <span className={`px-2 py-1 text-xs rounded-lg ${
                            template.category === 'MARKETING' 
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                              : template.category === 'AUTHENTICATION'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                          }`}>
                            {template.category}
                          </span>
                        </div>
                        {template.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {template.description}
                          </p>
                        )}
                        {template.variable_mappings && template.variable_mappings.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.variable_mappings.map((mapping, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                              >
                                {mapping.display_name}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Configuración de variables y preview
              <div className="space-y-6">
                {/* Información de la plantilla seleccionada */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {selectedTemplate.name}
                      </h4>
                      {selectedTemplate.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {selectedTemplate.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedTemplate(null);
                        setCustomVariables({});
                        setPreview('');
                      }}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Cambiar plantilla
                    </button>
                  </div>
                </div>

                {/* Variables */}
                <div className="space-y-4">
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Variables de la Plantilla
                  </h5>
                  
                  {selectedTemplate.variable_mappings?.map((mapping) => {
                    const customVar = customVariables[mapping.variable_number];
                    if (!customVar) return null;

                    return (
                      <div
                        key={mapping.variable_number}
                        className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                      >
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {`${mapping.display_name} ({{${mapping.variable_number}}})`}
                        </label>

                        {mapping.table_name === 'prospectos' ? (
                          // Variables del prospecto (no editables)
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 px-3 py-2 rounded-lg">
                            <User className="w-4 h-4" />
                            <span>{customVar.value || 'No disponible'}</span>
                          </div>
                        ) : mapping.table_name === 'system' && mapping.field_name === 'ejecutivo_nombre' ? (
                          // Variable de ejecutivo (no editable)
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 px-3 py-2 rounded-lg">
                            <User className="w-4 h-4" />
                            <span>{customVar.value}</span>
                          </div>
                                        ) : mapping.table_name === 'system' && mapping.field_name === 'fecha_actual' ? (
                          // Fecha actual: mostrar automáticamente formateada
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 px-3 py-2 rounded-lg">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {whatsappTemplatesService.getSystemVariableValue(
                                'fecha_actual',
                                undefined,
                                user?.full_name
                              )}
                            </span>
                          </div>
                        ) : mapping.table_name === 'system' && mapping.field_name === 'fecha_personalizada' ? (
                          // Fecha personalizada: selector de calendario
                          <input
                            type="date"
                            value={customVar.value}
                            onChange={(e) => {
                              console.log('📅 Fecha seleccionada:', e.target.value, 'para variable:', mapping.variable_number);
                              setCustomVariables({
                                ...customVariables,
                                [mapping.variable_number]: { ...customVar, value: e.target.value }
                              });
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                        ) : mapping.table_name === 'system' && mapping.field_name === 'hora_actual' ? (
                          // Hora actual: mostrar automáticamente formateada
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 px-3 py-2 rounded-lg">
                            <Clock className="w-4 h-4" />
                            <span>
                              {whatsappTemplatesService.getSystemVariableValue(
                                'hora_actual',
                                undefined,
                                user?.full_name
                              )}
                            </span>
                          </div>
                        ) : mapping.table_name === 'system' && mapping.field_name === 'hora_personalizada' ? (
                          // Hora personalizada: selector de hora
                          <input
                            type="time"
                            value={customVar.value}
                            onChange={(e) => {
                              setCustomVariables({
                                ...customVariables,
                                [mapping.variable_number]: { ...customVar, value: e.target.value }
                              });
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                        ) : mapping.table_name === 'destinos' ? (
                          // Variables de destino (menú desplegable)
                          <select
                            value={customVar.destinoId || ''}
                            onChange={(e) => {
                              const destinoId = e.target.value;
                              setCustomVariables({
                                ...customVariables,
                                [mapping.variable_number]: {
                                  ...customVar,
                                  destinoId,
                                  value: destinos.find(d => d.id === destinoId)?.nombre || ''
                                }
                              });
                              if (destinoId) {
                                loadResorts(destinoId);
                              }
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">Selecciona un destino</option>
                            {destinos.map((destino) => (
                              <option key={destino.id} value={destino.id}>
                                {destino.nombre}
                              </option>
                            ))}
                          </select>
                        ) : mapping.table_name === 'resorts' ? (
                          // Variables de resort (menú desplegable dependiente del destino)
                          <div className="space-y-2">
                            <select
                              value={customVar.destinoId || ''}
                              onChange={(e) => {
                                const destinoId = e.target.value;
                                setCustomVariables({
                                  ...customVariables,
                                  [mapping.variable_number]: {
                                    ...customVar,
                                    destinoId,
                                    resortId: '',
                                    value: ''
                                  }
                                });
                                if (destinoId) {
                                  loadResorts(destinoId);
                                }
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            >
                              <option value="">Selecciona un destino primero</option>
                              {destinos.map((destino) => (
                                <option key={destino.id} value={destino.id}>
                                  {destino.nombre}
                                </option>
                              ))}
                            </select>
                            {customVar.destinoId && (
                              <select
                                value={customVar.resortId || ''}
                                onChange={(e) => {
                                  const resortId = e.target.value;
                                  const resort = resorts.find(r => r.id === resortId);
                                  setCustomVariables({
                                    ...customVariables,
                                    [mapping.variable_number]: {
                                      ...customVar,
                                      resortId,
                                      value: resort?.nombre || resort?.nombre_completo || ''
                                    }
                                  });
                                }}
                                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                              >
                                <option value="">Selecciona un resort</option>
                                {resorts.map((resort) => (
                                  <option key={resort.id} value={resort.id}>
                                    {resort.nombre_completo || resort.nombre}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {/* Preview */}
                {preview && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">
                        Vista Previa
                      </span>
                    </div>
                    {loading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-green-500" />
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                          {preview}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {selectedTemplate && (
            <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                Cancelar
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSend}
                disabled={sending || !prospectoData?.id}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center space-x-2"
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
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

