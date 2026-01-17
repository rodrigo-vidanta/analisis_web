import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Send, Search, Loader2, CheckCircle2, Star, Sparkles, AlertTriangle, Calendar, Clock, Ban, Lightbulb } from 'lucide-react';
import toast from 'react-hot-toast';
import { whatsappTemplatesService, type TemplateSendLimits } from '../../services/whatsappTemplatesService';
import type { WhatsAppTemplate } from '../../types/whatsappTemplates';
import { analysisSupabase } from '../../config/analysisSupabase';
import { useAuth } from '../../contexts/AuthContext';
import { getApiToken } from '../../services/apiTokensService';
import { whatsappTemplateSuggestionsService, type SuggestionStats } from '../../services/whatsappTemplateSuggestionsService';

interface ReactivateConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSent?: () => void; // Callback para refrescar mensajes después de enviar
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
    etapa?: string;
    [key: string]: any;
  };
}

export const ReactivateConversationModal: React.FC<ReactivateConversationModalProps> = ({
  isOpen,
  onClose,
  onTemplateSent,
  conversation,
  prospectoData,
}) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [audiences, setAudiences] = useState<Array<{
    id: string;
    nombre: string;
    etapa?: string | null;
    destinos?: string[];
    viaja_con?: string[];
    estado_civil?: string | null;
  }>>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [sending, setSending] = useState(false);
  
  // ⚠️ PROTECCIÓN CONTRA DUPLICADOS
  const isSendingRef = useRef(false);
  const [sendingSuccess, setSendingSuccess] = useState(false);
  
  // Estado anterior del sidebar para restaurarlo al cerrar
  const previousSidebarStateRef = useRef<boolean | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [destinos, setDestinos] = useState<Array<{ id: string; nombre: string }>>([]);
  const [resorts, setResorts] = useState<Array<{ id: string; nombre: string; nombre_completo: string }>>([]);
  
  // Límites de envío
  const [sendLimits, setSendLimits] = useState<TemplateSendLimits | null>(null);
  const [loadingLimits, setLoadingLimits] = useState(false);
  const [selectedTemplateBlocked, setSelectedTemplateBlocked] = useState<{ blocked: boolean; reason: string | null }>({ blocked: false, reason: null });
  
  // Variables personalizadas
  const [customVariables, setCustomVariables] = useState<Record<number, {
    value: string;
    type: 'prospecto' | 'destino' | 'resort' | 'fecha_actual' | 'fecha_personalizada' | 'hora_actual' | 'hora_personalizada' | 'ejecutivo';
    destinoId?: string;
    resortId?: string;
  }>>({});

  // Estado para formulario de sugerencia
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [suggestionName, setSuggestionName] = useState('');
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestionJustification, setSuggestionJustification] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionStats, setSuggestionStats] = useState<SuggestionStats | null>(null);
  const [hoverSuggestButton, setHoverSuggestButton] = useState(false);
  
  // Filtro "Mis plantillas" - muestra plantillas sugeridas por el usuario actual
  const [showMyTemplatesOnly, setShowMyTemplatesOnly] = useState(false);

  // Cargar límites de envío
  const loadSendLimits = async () => {
    if (!prospectoData?.id) return;
    
    try {
      setLoadingLimits(true);
      const limits = await whatsappTemplatesService.checkTemplateSendLimits(prospectoData.id);
      setSendLimits(limits);
    } catch (error) {
      console.error('Error cargando límites de envío:', error);
    } finally {
      setLoadingLimits(false);
    }
  };

  // Manejar colapso del sidebar al abrir/cerrar el modal
  useEffect(() => {
    if (isOpen) {
      // Guardar estado actual del sidebar
      const mainContent = document.querySelector('.flex-1.flex.flex-col');
      const wasCollapsed = mainContent?.classList.contains('lg:ml-16') || false;
      previousSidebarStateRef.current = wasCollapsed;
      
      // Colapsar sidebar si está expandido
      if (!wasCollapsed) {
        // Disparar evento personalizado para colapsar sidebar
        window.dispatchEvent(new CustomEvent('collapse-sidebar'));
      }
    } else {
      // Restaurar estado anterior del sidebar al cerrar
      if (previousSidebarStateRef.current !== null) {
        if (!previousSidebarStateRef.current) {
          // El sidebar estaba expandido, restaurarlo
          window.dispatchEvent(new CustomEvent('expand-sidebar'));
        }
        previousSidebarStateRef.current = null;
      }
    }
  }, [isOpen]);

  // Cargar estadísticas de sugerencias
  const loadSuggestionStats = async () => {
    if (!user?.id) return;
    try {
      const stats = await whatsappTemplateSuggestionsService.getSuggestionStats(user.id);
      setSuggestionStats(stats);
    } catch (error) {
      console.error('Error cargando estadísticas de sugerencias:', error);
    }
  };

  // Cargar plantillas y audiencias al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate(null);
      setCustomVariables({});
      setPreview('');
      setSearchTerm('');
      setSendingSuccess(false);
      setSendLimits(null);
      setSelectedTemplateBlocked({ blocked: false, reason: null });
      setShowSuggestionForm(false);
      setSuggestionName('');
      setSuggestionText('');
      setSuggestionJustification('');
      loadTemplates();
      loadAudiences();
      loadDestinos();
      loadSendLimits();
      loadSuggestionStats();
    }
  }, [isOpen, prospectoData?.id, user?.id]);

  // Cargar resorts cuando se selecciona un destino
  useEffect(() => {
    if (selectedTemplate) {
      Object.keys(customVariables).forEach(key => {
        const varNum = parseInt(key, 10);
        const customVar = customVariables[varNum];
        if (customVar?.type === 'destino' && customVar.destinoId) {
          loadResorts(customVar.destinoId);
        }
      });
    }
  }, [customVariables, selectedTemplate]);

  // Verificar si la plantilla seleccionada está bloqueada
  useEffect(() => {
    const checkSelectedTemplateBlock = async () => {
      if (!selectedTemplate || !prospectoData?.id) {
        setSelectedTemplateBlocked({ blocked: false, reason: null });
        return;
      }

      const result = await whatsappTemplatesService.canSendTemplateToProspect(
        prospectoData.id,
        selectedTemplate.id
      );
      
      setSelectedTemplateBlocked({ 
        blocked: !result.canSend, 
        reason: result.reason 
      });
    };

    checkSelectedTemplateBlock();
  }, [selectedTemplate, prospectoData?.id, sendLimits]);

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

  const loadAudiences = async () => {
    try {
      const { data, error } = await analysisSupabase
        .from('whatsapp_audiences')
        .select('id, nombre, etapa, destinos, viaja_con, estado_civil')
        .eq('is_active', true);
      
      if (error) throw error;
      setAudiences(data || []);
    } catch (error) {
      console.error('Error cargando audiencias:', error);
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

  // Obtener características del prospecto
  const prospectoEtapa = prospectoData?.etapa || conversation.metadata?.etapa || null;
  const prospectoDestinos = prospectoData?.destino_preferencia 
    ? (Array.isArray(prospectoData.destino_preferencia) 
        ? prospectoData.destino_preferencia 
        : [prospectoData.destino_preferencia])
    : [];
  const prospectoViajaCon = prospectoData?.viaja_con 
    ? (Array.isArray(prospectoData.viaja_con) 
        ? prospectoData.viaja_con 
        : [prospectoData.viaja_con])
    : [];
  const prospectoEstadoCivil = prospectoData?.estado_civil || null;

  // Calcular score de coincidencia entre audiencia y prospecto
  const calculateAudienceMatchScore = useCallback((audience: typeof audiences[0]): number => {
    let score = 0;
    let totalCriteria = 0;

    // Etapa (peso: 3)
    if (audience.etapa) {
      totalCriteria += 3;
      if (prospectoEtapa && audience.etapa === prospectoEtapa) {
        score += 3;
      }
    }

    // Destinos (peso: 2)
    if (audience.destinos && audience.destinos.length > 0) {
      totalCriteria += 2;
      const hasMatchingDestino = prospectoDestinos.some(destino => 
        audience.destinos!.some(audDestino => 
          destino.toLowerCase().includes(audDestino.toLowerCase()) ||
          audDestino.toLowerCase().includes(destino.toLowerCase())
        )
      );
      if (hasMatchingDestino) {
        score += 2;
      }
    }

    // Viaja con (peso: 2)
    if (audience.viaja_con && audience.viaja_con.length > 0) {
      totalCriteria += 2;
      const hasMatchingViajaCon = prospectoViajaCon.some(viaja => 
        audience.viaja_con!.some(audViaja => 
          viaja.toLowerCase() === audViaja.toLowerCase()
        )
      );
      if (hasMatchingViajaCon) {
        score += 2;
      }
    }

    // Estado civil (peso: 1)
    if (audience.estado_civil) {
      totalCriteria += 1;
      if (prospectoEstadoCivil && audience.estado_civil === prospectoEstadoCivil) {
        score += 1;
      }
    }

    // Retornar porcentaje de coincidencia
    return totalCriteria > 0 ? (score / totalCriteria) * 100 : 0;
  }, [prospectoEtapa, prospectoDestinos, prospectoViajaCon, prospectoEstadoCivil]);

  // Calcular score de coincidencia para una plantilla
  const calculateTemplateMatchScore = useCallback((template: WhatsAppTemplate): number => {
    const classification = (template as any).classification;
    const audienceIds = classification?.audience_ids || [];
    
    if (audienceIds.length === 0) return 0;

    // Obtener audiencias de la plantilla
    const templateAudiences = audiences.filter(a => audienceIds.includes(a.id));
    
    if (templateAudiences.length === 0) return 0;

    // Calcular el score promedio de todas las audiencias de la plantilla
    const scores = templateAudiences.map(aud => calculateAudienceMatchScore(aud));
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    return avgScore;
  }, [audiences, calculateAudienceMatchScore]);

  // Verificar si el prospecto cumple con los requisitos de las variables de una plantilla
  const canProspectFulfillTemplate = useCallback((template: WhatsAppTemplate): boolean => {
    if (!prospectoData) return true; // Si no hay datos de prospecto, mostrar todas
    
    // Normalizar variable_mappings
    let variableMappings: any[] = [];
    if (template.variable_mappings) {
      if (Array.isArray(template.variable_mappings)) {
        variableMappings = template.variable_mappings;
      } else if (typeof template.variable_mappings === 'object' && 'mappings' in template.variable_mappings) {
        const mappingsObj = template.variable_mappings as { mappings?: any[] };
        variableMappings = Array.isArray(mappingsObj.mappings) ? mappingsObj.mappings : [];
      }
    }
    
    // Si no hay mapeos, asumir que puede cumplir
    if (variableMappings.length === 0) return true;
    
    // Verificar cada mapeo
    for (const mapping of variableMappings) {
      if (mapping.table_name === 'prospectos') {
        const fieldValue = prospectoData[mapping.field_name];
        // Si el campo es requerido y está vacío, el prospecto no puede cumplir
        if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
          return false;
        }
      }
      // Variables de sistema siempre se pueden cumplir
      // Variables de destinos/resorts se pueden seleccionar manualmente
    }
    
    return true;
  }, [prospectoData]);

  // Filtrar y ordenar plantillas
  const filteredAndSortedTemplates = useMemo(() => {
    let filtered = templates;

    // Filtrar por plantillas que el prospecto puede cumplir
    filtered = filtered.filter(t => canProspectFulfillTemplate(t));

    // Filtrar por "Mis plantillas" (sugeridas por el usuario actual)
    if (showMyTemplatesOnly && user?.id) {
      filtered = filtered.filter(t => t.suggested_by === user.id);
    }

    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        (t.description && t.description.toLowerCase().includes(searchLower))
      );
    }

    // Calcular scores y ordenar
    const templatesWithScores = filtered.map(template => ({
      template,
      score: calculateTemplateMatchScore(template)
    }));

    // Ordenar por score descendente
    templatesWithScores.sort((a, b) => b.score - a.score);

    return templatesWithScores.map(item => item.template);
  }, [templates, searchTerm, calculateTemplateMatchScore, showMyTemplatesOnly, user?.id, canProspectFulfillTemplate]);
  
  // Contar plantillas sugeridas por el usuario
  const myTemplatesCount = useMemo(() => {
    if (!user?.id) return 0;
    return templates.filter(t => t.suggested_by === user.id).length;
  }, [templates, user?.id]);

  // Verificar si una plantilla es recomendada (score > 50%)
  const isTemplateRecommended = useCallback((template: WhatsAppTemplate) => {
    return calculateTemplateMatchScore(template) > 50;
  }, [calculateTemplateMatchScore]);

  // Obtener etapas asignadas a una plantilla
  const getTemplateEtapas = useCallback((template: WhatsAppTemplate) => {
    const classification = (template as any).classification;
    const audienceIds = classification?.audience_ids || [];
    const templateAudiences = audiences.filter(a => audienceIds.includes(a.id));
    const etapas = templateAudiences
      .map(a => a.etapa)
      .filter((etapa): etapa is string => etapa !== null && etapa !== undefined);
    return [...new Set(etapas)]; // Eliminar duplicados
  }, [audiences]);

  // Obtener score de coincidencia de una plantilla
  const getTemplateMatchScore = useCallback((template: WhatsAppTemplate) => {
    return calculateTemplateMatchScore(template);
  }, [calculateTemplateMatchScore]);

  const handleSelectTemplate = async (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    
    // Si el formulario de sugerencia está abierto, cerrarlo (los datos se mantienen en caché)
    if (showSuggestionForm) {
      setShowSuggestionForm(false);
    }
    
    // Inicializar variables con valores por defecto
    const initialVars: Record<number, any> = {};
    
    // Extraer todas las variables del texto
    const allVariablesInText: number[] = [];
    template.components.forEach(component => {
      if (component.text) {
        const vars = whatsappTemplatesService.extractVariables(component.text);
        vars.forEach(v => {
          if (!allVariablesInText.includes(v)) {
            allVariablesInText.push(v);
          }
        });
      }
    });
    
    // Normalizar variable_mappings
    let variableMappings: any[] = [];
    if (template.variable_mappings) {
      if (Array.isArray(template.variable_mappings)) {
        variableMappings = template.variable_mappings;
      } else if (typeof template.variable_mappings === 'object' && 'mappings' in template.variable_mappings) {
        const mappingsObj = template.variable_mappings as { mappings?: any[] };
        variableMappings = Array.isArray(mappingsObj.mappings) ? mappingsObj.mappings : [];
      }
    }

    // Cargar datos de llamadas_ventas si es necesario
    let llamadasVentasData: any = null;
    const needsLlamadasVentas = variableMappings.some(m => m.table_name === 'llamadas_ventas');
    if (needsLlamadasVentas && prospectoData?.id) {
      try {
        const { data, error } = await analysisSupabase
          .from('llamadas_ventas')
          .select('*')
          .eq('prospecto_id', prospectoData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (!error && data) {
          llamadasVentasData = data;
        }
      } catch (error) {
        console.error('Error cargando llamadas_ventas:', error);
      }
    }

    // Inicializar variables según mapeos
    if (variableMappings.length > 0) {
      variableMappings.forEach(mapping => {
      if (mapping.table_name === 'prospectos' && prospectoData) {
        let value = prospectoData[mapping.field_name];
        
        // Fallbacks especiales para campos que pueden tener alternativas
        // NOTA: La tabla prospectos NO tiene columna 'primer_nombre', se usa 'nombre'
        if ((value === null || value === undefined || value === '') && mapping.field_name === 'titulo') {
          // Si no hay título, usar nombre como fallback
          value = prospectoData.nombre || 
                  (prospectoData.nombre_completo?.split(' ')[0]) || '';
        }
        if ((value === null || value === undefined || value === '') && (mapping.field_name === 'nombre' || mapping.field_name === 'primer_nombre')) {
          // Si no hay nombre, usar parte del nombre_completo
          value = prospectoData.nombre || (prospectoData.nombre_completo?.split(' ')[0]) || '';
        }
        
        if (value === null || value === undefined) {
          value = '';
        } else if (Array.isArray(value)) {
            value = value[0] || '';
        } else {
          value = String(value);
        }
        initialVars[mapping.variable_number] = {
            value,
          type: 'prospecto',
        };
        } else if (mapping.table_name === 'llamadas_ventas' && llamadasVentasData) {
          let value = llamadasVentasData[mapping.field_name];
        if (value === null || value === undefined) {
          value = '';
        } else if (Array.isArray(value)) {
            value = value[0] || '';
        } else {
          value = String(value);
        }
        initialVars[mapping.variable_number] = {
            value,
            type: 'prospecto',
        };
      } else if (mapping.table_name === 'system') {
        if (mapping.field_name === 'ejecutivo_nombre') {
          initialVars[mapping.variable_number] = {
              value: user?.full_name || '',
            type: 'ejecutivo',
          };
        } else if (mapping.field_name === 'fecha_actual') {
          initialVars[mapping.variable_number] = {
              value: 'current',
            type: 'fecha_actual',
          };
        } else if (mapping.field_name === 'hora_actual') {
          initialVars[mapping.variable_number] = {
              value: 'current',
            type: 'hora_actual',
          };
          } else if (mapping.field_name === 'fecha_personalizada') {
            initialVars[mapping.variable_number] = {
              value: '',
              type: 'fecha_personalizada',
            };
        } else if (mapping.field_name === 'hora_personalizada') {
          initialVars[mapping.variable_number] = {
              value: '',
            type: 'hora_personalizada',
          };
        }
      } else if (mapping.table_name === 'destinos') {
          let destinoNombre = '';
          if (prospectoData?.destino_preferencia) {
            if (Array.isArray(prospectoData.destino_preferencia)) {
              destinoNombre = prospectoData.destino_preferencia[0] || '';
            } else {
              destinoNombre = String(prospectoData.destino_preferencia);
            }
          }
        initialVars[mapping.variable_number] = {
            value: destinoNombre,
          type: 'destino',
        };
      } else if (mapping.table_name === 'resorts') {
        initialVars[mapping.variable_number] = {
          value: '',
          type: 'resort',
        };
      }
    });
    } else {
      // Sin mapeos, usar valores por defecto comunes
      allVariablesInText.forEach(varNum => {
        if (prospectoData) {
          if (varNum === 1) {
            // Intentar obtener título, si no hay usar el primer nombre
            const titulo = prospectoData.titulo || prospectoData.nombre || prospectoData.primer_nombre || 
                          (prospectoData.nombre_completo?.split(' ')[0]) || '';
            initialVars[varNum] = {
              value: titulo,
              type: 'prospecto',
            };
          } else if (varNum === 2) {
            initialVars[varNum] = {
              value: prospectoData.apellido_paterno || '',
              type: 'prospecto',
            };
          } else if (varNum === 3) {
              initialVars[varNum] = {
              value: prospectoData.apellido_materno || prospectoData.destino_preferencia?.[0] || '',
              type: prospectoData.apellido_materno ? 'prospecto' : 'destino',
            };
          } else if (varNum === 4) {
              initialVars[varNum] = {
              value: prospectoData.email || '',
              type: 'prospecto',
              };
            } else {
              initialVars[varNum] = {
                value: '',
                type: 'prospecto',
              };
            }
        } else {
            initialVars[varNum] = {
            value: '',
              type: 'prospecto',
            };
          }
      });
    }

    setCustomVariables(initialVars);
  };

  const generatePreview = useCallback(async () => {
    if (!selectedTemplate) return;
    
    try {
      setLoading(true);
      const variablesMap: Record<number, string> = {};
      
      // Extraer todas las variables del texto
      const allVariablesInText: number[] = [];
      selectedTemplate.components.forEach(component => {
        if (component.text) {
          const vars = whatsappTemplatesService.extractVariables(component.text);
          vars.forEach(v => {
            if (!allVariablesInText.includes(v)) {
              allVariablesInText.push(v);
            }
          });
        }
      });
      
      // Normalizar variable_mappings
      let variableMappings: any[] = [];
      if (selectedTemplate.variable_mappings) {
        if (Array.isArray(selectedTemplate.variable_mappings)) {
          variableMappings = selectedTemplate.variable_mappings;
        } else if (typeof selectedTemplate.variable_mappings === 'object' && 'mappings' in selectedTemplate.variable_mappings) {
          const mappingsObj = selectedTemplate.variable_mappings as { mappings?: any[] };
          variableMappings = Array.isArray(mappingsObj.mappings) ? mappingsObj.mappings : [];
        }
      }

      // Construir mapa de variables
      if (variableMappings.length > 0) {
        variableMappings.forEach(mapping => {
          const customVar = customVariables[mapping.variable_number];
          if (customVar) {
            if (mapping.table_name === 'system') {
              let customValue: string | undefined = undefined;
              if (mapping.field_name === 'fecha_personalizada' || mapping.field_name === 'hora_personalizada') {
                customValue = customVar.value && customVar.value.trim() !== '' ? customVar.value : undefined;
              }
              const formattedValue = whatsappTemplatesService.getSystemVariableValue(
                mapping.field_name,
                customValue,
                user?.full_name
              );
              variablesMap[mapping.variable_number] = formattedValue;
            } else if (mapping.table_name === 'destinos' && customVar.destinoId) {
              const destino = destinos.find(d => d.id === customVar.destinoId);
              variablesMap[mapping.variable_number] = destino?.nombre || '';
            } else if (mapping.table_name === 'resorts' && customVar.resortId) {
              const resort = resorts.find(r => r.id === customVar.resortId);
              variablesMap[mapping.variable_number] = resort?.nombre || resort?.nombre_completo || '';
            } else {
              variablesMap[mapping.variable_number] = customVar.value || '';
            }
          }
        });
        } else {
        allVariablesInText.forEach(varNum => {
          const customVar = customVariables[varNum];
          if (customVar) {
            if (customVar.type === 'destino' && customVar.destinoId) {
              const destino = destinos.find(d => d.id === customVar.destinoId);
              variablesMap[varNum] = destino?.nombre || customVar.value || '';
            } else if (customVar.type === 'resort' && customVar.resortId) {
              const resort = resorts.find(r => r.id === customVar.resortId);
              variablesMap[varNum] = resort?.nombre || resort?.nombre_completo || customVar.value || '';
            } else if (customVar.type === 'fecha_actual' || customVar.type === 'hora_actual' || customVar.type === 'ejecutivo') {
              const systemFieldName = customVar.type === 'ejecutivo' ? 'ejecutivo_nombre' 
                : customVar.type === 'fecha_actual' ? 'fecha_actual'
                : 'hora_actual';
              variablesMap[varNum] = whatsappTemplatesService.getSystemVariableValue(
                systemFieldName,
                undefined,
                user?.full_name
              );
            } else {
              variablesMap[varNum] = customVar.value || '';
            }
          }
        });
      }
      
      const ejecutivoNombre = user?.full_name || '';
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

  // Generar preview cuando cambian las variables
  const customVariablesKey = useMemo(() => JSON.stringify(customVariables), [customVariables]);
  useEffect(() => {
    if (selectedTemplate) {
      generatePreview();
    }
  }, [selectedTemplate, customVariablesKey, destinos.length, resorts.length, generatePreview]);

  // Validar si todas las variables están completas
  const areAllVariablesComplete = useMemo(() => {
    if (!selectedTemplate) return false;
    
    const allVariablesInText: number[] = [];
    selectedTemplate.components.forEach(component => {
      if (component.text) {
        const vars = whatsappTemplatesService.extractVariables(component.text);
        vars.forEach(v => {
          if (!allVariablesInText.includes(v)) {
            allVariablesInText.push(v);
          }
        });
      }
    });
    
    for (const varNum of allVariablesInText) {
      const customVar = customVariables[varNum];
      if (!customVar) return false;
      
      if (customVar.type === 'fecha_actual' || customVar.type === 'hora_actual' || customVar.type === 'ejecutivo') {
        continue;
      }
      
      if (customVar.type === 'destino' && !customVar.destinoId && (!customVar.value || customVar.value.trim() === '')) {
        return false;
      }
      
      if (customVar.type === 'resort' && !customVar.resortId) {
        return false;
      }
      
      if (!customVar.value || customVar.value.trim() === '') {
        return false;
      }
    }
    
    return true;
  }, [selectedTemplate, customVariables]);

  // Normalizar variable_mappings para mostrar
  const normalizedMappings = useMemo(() => {
    if (!selectedTemplate) return [];
    
    let mappings: any[] = [];
    if (selectedTemplate.variable_mappings) {
      if (Array.isArray(selectedTemplate.variable_mappings)) {
        mappings = selectedTemplate.variable_mappings;
      } else if (typeof selectedTemplate.variable_mappings === 'object' && 'mappings' in selectedTemplate.variable_mappings) {
        const mappingsObj = selectedTemplate.variable_mappings as { mappings?: any[] };
        mappings = Array.isArray(mappingsObj.mappings) ? mappingsObj.mappings : [];
      }
    }
    
    if (mappings.length === 0) {
      const allVariablesInText: number[] = [];
      selectedTemplate.components.forEach(component => {
        if (component.text) {
          const vars = whatsappTemplatesService.extractVariables(component.text);
          vars.forEach(v => {
            if (!allVariablesInText.includes(v)) {
              allVariablesInText.push(v);
            }
          });
        }
      });
      mappings = allVariablesInText.map(varNum => ({
        variable_number: varNum,
        display_name: `Variable ${varNum}`,
        table_name: 'prospectos',
      }));
    }
    
    return mappings;
  }, [selectedTemplate]);

  // Variables editables (solo fecha/hora personalizada, destinos y resorts)
  const editableMappings = useMemo(() => {
    return normalizedMappings.filter((mapping: any) => {
      const customVar = customVariables[mapping.variable_number];
      return customVar && (
        (mapping.table_name === 'system' && mapping.field_name === 'fecha_personalizada') ||
        (mapping.table_name === 'system' && mapping.field_name === 'hora_personalizada') ||
        mapping.table_name === 'destinos' ||
        mapping.table_name === 'resorts'
      );
    });
  }, [normalizedMappings, customVariables]);

  const handleSend = async () => {
    if (!selectedTemplate || !prospectoData?.id) {
      toast.error('Selecciona una plantilla y asegúrate de que hay un prospecto asociado');
      return;
    }

    if (selectedTemplate.status !== 'APPROVED') {
      toast.error('La plantilla debe estar aprobada para poder enviarla');
      return;
    }

    // ⚠️ PROTECCIÓN CONTRA DUPLICADOS: Verificar si ya se está enviando
    if (isSendingRef.current || sending) {
      console.warn('⚠️ Plantilla bloqueada: ya hay un envío en proceso');
      return;
    }

    try {
      isSendingRef.current = true;
      setSending(true);
      
      // Construir variables y texto resuelto (mismo código que antes)
      const allVariablesInText: number[] = [];
      selectedTemplate.components.forEach(component => {
        if (component.text) {
          const vars = whatsappTemplatesService.extractVariables(component.text);
          vars.forEach(v => {
            if (!allVariablesInText.includes(v)) {
              allVariablesInText.push(v);
            }
          });
        }
      });
      
      const variables: Record<string, string> = {};
      let resolvedText = '';
      
      // Normalizar variable_mappings
      let variableMappings: any[] = [];
      if (selectedTemplate.variable_mappings) {
        if (Array.isArray(selectedTemplate.variable_mappings)) {
          variableMappings = selectedTemplate.variable_mappings;
        } else if (typeof selectedTemplate.variable_mappings === 'object' && 'mappings' in selectedTemplate.variable_mappings) {
          const mappingsObj = selectedTemplate.variable_mappings as { mappings?: any[] };
          variableMappings = Array.isArray(mappingsObj.mappings) ? mappingsObj.mappings : [];
        }
      }

      if (variableMappings.length > 0) {
        selectedTemplate.components.forEach(component => {
          if (component.text) {
            let text = component.text;
            variableMappings.forEach(mapping => {
          const customVar = customVariables[mapping.variable_number];
          if (customVar) {
            let value = '';
            if (mapping.table_name === 'system') {
                  let customValue: string | undefined = undefined;
                  if (mapping.field_name === 'fecha_personalizada' || mapping.field_name === 'hora_personalizada') {
                    customValue = customVar.value && customVar.value.trim() !== '' ? customVar.value : undefined;
                  }
              value = whatsappTemplatesService.getSystemVariableValue(
                mapping.field_name,
                customValue,
                    user?.full_name
              );
                } else if (mapping.table_name === 'destinos' && customVar.destinoId) {
              const destino = destinos.find(d => d.id === customVar.destinoId);
              value = destino?.nombre || '';
                } else if (mapping.table_name === 'resorts' && customVar.resortId) {
                const resort = resorts.find(r => r.id === customVar.resortId);
                value = resort?.nombre || resort?.nombre_completo || '';
              } else {
              value = customVar.value || '';
                }
              variables[mapping.variable_number.toString()] = value;
                text = text.replace(new RegExp(`\\{\\{${mapping.variable_number}\\}\\}`, 'g'), value);
              }
            });
            resolvedText += text + '\n';
          }
        });
          } else {
            allVariablesInText.forEach(varNum => {
              const customVar = customVariables[varNum];
              if (customVar) {
                let value = '';
            if (customVar.type === 'destino' && customVar.destinoId) {
                const destino = destinos.find(d => d.id === customVar.destinoId);
                value = destino?.nombre || customVar.value || '';
            } else if (customVar.type === 'resort' && customVar.resortId) {
                  const resort = resorts.find(r => r.id === customVar.resortId);
                  value = resort?.nombre || resort?.nombre_completo || customVar.value || '';
            } else if (customVar.type === 'fecha_actual' || customVar.type === 'hora_actual' || customVar.type === 'ejecutivo') {
                  const systemFieldName = customVar.type === 'ejecutivo' ? 'ejecutivo_nombre' 
                    : customVar.type === 'fecha_actual' ? 'fecha_actual'
                : 'hora_actual';
                  value = whatsappTemplatesService.getSystemVariableValue(
                    systemFieldName,
                undefined,
                user?.full_name
                  );
                } else {
                  value = customVar.value || '';
                }
                  variables[varNum.toString()] = value;
          }
        });
        
        selectedTemplate.components.forEach(component => {
          if (component.text) {
            let text = component.text;
            allVariablesInText.forEach(varNum => {
              const customVar = customVariables[varNum];
              if (customVar) {
                let value = '';
                if (customVar.type === 'destino' && customVar.destinoId) {
                  const destino = destinos.find(d => d.id === customVar.destinoId);
                  value = destino?.nombre || customVar.value || '';
                } else if (customVar.type === 'resort' && customVar.resortId) {
                  const resort = resorts.find(r => r.id === customVar.resortId);
                  value = resort?.nombre || resort?.nombre_completo || customVar.value || '';
                } else if (customVar.type === 'fecha_actual' || customVar.type === 'hora_actual' || customVar.type === 'ejecutivo') {
                  const systemFieldName = customVar.type === 'ejecutivo' ? 'ejecutivo_nombre' 
                    : customVar.type === 'fecha_actual' ? 'fecha_actual'
                    : 'hora_actual';
                  value = whatsappTemplatesService.getSystemVariableValue(
                    systemFieldName,
                    undefined,
                    user?.full_name
                  );
                } else {
                  value = customVar.value || '';
                }
                text = text.replace(new RegExp(`\\{\\{${varNum}\\}\\}`, 'g'), value);
              }
            });
            resolvedText += text + '\n';
          }
        });
      }

      const payload = {
        template_id: selectedTemplate.id,
        template_name: selectedTemplate.name,
        prospecto_id: prospectoData.id,
        variables: variables,
        resolved_text: resolvedText.trim(),
        triggered_by: 'MANUAL' as const,
        triggered_by_user: user?.id || null,
        triggered_by_user_name: user?.full_name || null
      };

      // Usar Edge Function en lugar de webhook directo
      const edgeFunctionUrl = `${import.meta.env.VITE_EDGE_FUNCTIONS_URL}/functions/v1/whatsapp-templates-send-proxy`;
      
      // Timeout de 30 segundos para evitar colgarse indefinidamente
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseText = await response.text();
        
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

        // Éxito - actualizar triggered_by_user en la BD (el webhook no lo guarda)
        // Actualizar el registro más reciente de whatsapp_template_sends para este prospecto
        if (user?.id) {
          try {
            const { error: updateError } = await analysisSupabase
              .from('whatsapp_template_sends')
              .update({ triggered_by_user: user.id })
              .eq('prospecto_id', prospectoData.id)
              .eq('template_id', selectedTemplate.id)
              .is('triggered_by_user', null)
              .order('sent_at', { ascending: false })
              .limit(1);
            
            if (updateError) {
              console.warn('⚠️ No se pudo actualizar triggered_by_user:', updateError);
            }
          } catch (updateErr) {
            console.warn('⚠️ Error actualizando triggered_by_user:', updateErr);
          }
        }

        isSendingRef.current = false;
        setSending(false);
        setSendingSuccess(true);
        setTimeout(() => {
          toast.success('Plantilla enviada exitosamente');
          onTemplateSent?.(); // Notificar para refrescar mensajes
          onClose();
        }, 1500);
        return; // Salir exitosamente
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Tiempo de espera agotado. Por favor, intenta de nuevo.');
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error('❌ Error enviando plantilla:', error);
      toast.error(error.message || 'Error al enviar la plantilla');
      isSendingRef.current = false;
      setSending(false);
    }
  };

  // Manejar envío de sugerencia
  const handleSubmitSuggestion = async () => {
    if (!user?.id || !suggestionName.trim() || !suggestionText.trim() || !suggestionJustification.trim()) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    // Validación uChat: Las variables no pueden estar al principio ni al final del mensaje
    const trimmedText = suggestionText.trim();
    
    // Verificar si el texto comienza con una variable
    if (/^\{\{[^}]+\}\}/.test(trimmedText)) {
      toast.error('El mensaje no puede comenzar con una variable. Por regla de uChat, debes agregar texto antes de la primera variable.');
      return;
    }
    
    // Verificar si el texto termina con una variable
    if (/\{\{[^}]+\}\}$/.test(trimmedText)) {
      toast.error('El mensaje no puede terminar con una variable. Por regla de uChat, debes agregar texto después de la última variable.');
      return;
    }

    try {
      setSuggestionLoading(true);
      await whatsappTemplateSuggestionsService.createSuggestion(
        {
          name: suggestionName,
          template_text: suggestionText,
          justification: suggestionJustification,
          conversation_id: conversation.id,
          available_variables: ['titulo', 'primer_nombre', 'primer_apellido', 'ejecutivo_nombre', 'fecha_actual'],
        },
        user.id
      );

      toast.success('Sugerencia enviada exitosamente. Será revisada por un administrador.');
      setShowSuggestionForm(false);
      setSuggestionName('');
      setSuggestionText('');
      setSuggestionJustification('');
      loadSuggestionStats();
    } catch (error: any) {
      console.error('Error enviando sugerencia:', error);
      toast.error(error.message || 'Error al enviar la sugerencia');
    } finally {
      setSuggestionLoading(false);
    }
  };

  // Insertar variable en el texto de sugerencia
  const insertVariable = (variable: string) => {
    const variablePlaceholder = `{{${variable}}}`;
    const textarea = document.getElementById('suggestion-text') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = suggestionText;
      const newText = text.substring(0, start) + variablePlaceholder + text.substring(end);
      setSuggestionText(newText);
      // Restaurar cursor después de la variable insertada
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variablePlaceholder.length, start + variablePlaceholder.length);
      }, 0);
    } else {
      setSuggestionText(suggestionText + variablePlaceholder);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4"
        style={{ zIndex: 10000 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-start justify-between gap-6">
              {/* Lado izquierdo - Título */}
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Reactivar Conversación con Plantilla
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {prospectoEtapa && `Etapa del prospecto: ${prospectoEtapa}`}
                </p>
              </div>

              {/* Lado derecho - Botón cerrar */}
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sección de Sugerencias - Grid organizado */}
            <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Botón de sugerir plantilla */}
                <motion.button
                  onMouseEnter={() => setHoverSuggestButton(true)}
                  onMouseLeave={() => setHoverSuggestButton(false)}
                  onClick={() => {
                    setShowSuggestionForm(true);
                    setSelectedTemplate(null);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative overflow-hidden px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium text-sm transition-all duration-300 shadow-lg shadow-purple-500/25"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={hoverSuggestButton ? 'suggest' : 'not-found'}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-center gap-2"
                    >
                      <Lightbulb className="w-4 h-4" />
                      <span>{hoverSuggestButton ? 'Sugiere una plantilla' : '¿No encuentras una plantilla?'}</span>
                      <Sparkles className="w-4 h-4" />
                    </motion.div>
                  </AnimatePresence>
                </motion.button>

                {/* Contadores de Sugerencias con Grid */}
                {suggestionStats && (
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-400 uppercase tracking-wide">
                      Mis sugerencias:
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-blue-200 dark:border-blue-800">
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{suggestionStats.total}</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Total</span>
                      </div>
                      <div className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-amber-200 dark:border-amber-800">
                        <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{suggestionStats.pending}</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Pendientes</span>
                      </div>
                      <div className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-green-200 dark:border-green-800">
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">{suggestionStats.approved}</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Aprobadas</span>
                      </div>
                      <div className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-red-200 dark:border-red-800">
                        <span className="text-lg font-bold text-red-600 dark:text-red-400">{suggestionStats.rejected}</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Rechazadas</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Indicadores de Límites de Envío */}
            {sendLimits && (
              <div className="mt-4">
                {/* Banner de bloqueo si aplica */}
                {!sendLimits.canSend && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  >
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <Ban className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm font-medium">{sendLimits.blockReason}</span>
                    </div>
                  </motion.div>
                )}

                {/* Indicadores de límites */}
                <div className="flex flex-wrap gap-3">
                  {/* Límite diario */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                    sendLimits.dailyLimit.blocked 
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>Hoy: {sendLimits.dailyLimit.remaining}/{sendLimits.dailyLimit.max}</span>
                  </div>

                  {/* Límite semanal */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                    sendLimits.weeklyLimit.blocked 
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                      : sendLimits.weeklyLimit.remaining <= 1
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  }`}>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Semana: {sendLimits.weeklyLimit.remaining}/{sendLimits.weeklyLimit.max} plantillas únicas</span>
                  </div>

                  {/* Límite mensual */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                    sendLimits.monthlyLimit.blocked 
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                      : sendLimits.monthlyLimit.remaining <= 2
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  }`}>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Mes: {sendLimits.monthlyLimit.remaining}/{sendLimits.monthlyLimit.max} plantillas únicas</span>
                  </div>
                </div>
              </div>
            )}

            {loadingLimits && (
              <div className="mt-4 flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Verificando límites...</span>
              </div>
            )}
          </div>

          {/* Mostrar contenido solo si hay envíos disponibles */}
          {sendLimits && !sendLimits.canSend ? (
            /* Panel de límite alcanzado - Sin catálogo ni botón de enviar */
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center max-w-md"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Ban className="w-10 h-10 text-red-500 dark:text-red-400" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Límite de envío alcanzado
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                  {sendLimits.blockReason || 'Has alcanzado el límite de plantillas permitidas para este prospecto.'}
                </p>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-left">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-300">
                      <p className="font-medium mb-1">¿Por qué existe este límite?</p>
                      <p className="text-amber-700 dark:text-amber-400">
                        Meta limita el número de plantillas que se pueden enviar para evitar spam. 
                        Exceder estos límites puede resultar en el bloqueo de tu cuenta de WhatsApp Business.
                      </p>
                    </div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="mt-6 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  Entendido
                </motion.button>
              </motion.div>
            </div>
          ) : (
          <>
          {/* Content - Layout dividido (solo si hay envíos disponibles) */}
          <div className="flex-1 flex overflow-hidden">
            {/* Panel izquierdo - Lista de plantillas */}
            <div className="w-[45%] border-r border-gray-200 dark:border-gray-800 flex flex-col">
              {/* Filtro de búsqueda */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar plantillas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                  />
                </div>
                
                {/* Filtro "Mis plantillas" */}
                {myTemplatesCount > 0 && (
                  <motion.button
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setShowMyTemplatesOnly(!showMyTemplatesOnly)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      showMyTemplatesOnly
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-2 border-purple-300 dark:border-purple-700'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Star className={`w-4 h-4 ${showMyTemplatesOnly ? 'fill-purple-500 text-purple-500' : ''}`} />
                      <span>Mis plantillas sugeridas</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      showMyTemplatesOnly
                        ? 'bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {myTemplatesCount}
                    </span>
                  </motion.button>
                )}
              </div>

              {/* Lista de plantillas */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loadingTemplates ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : filteredAndSortedTemplates.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No hay plantillas disponibles</p>
                  </div>
                ) : (
                  filteredAndSortedTemplates.map((template, index) => {
                    const isRecommended = isTemplateRecommended(template);
                    const isSelected = selectedTemplate?.id === template.id;
                    const templateEtapas = getTemplateEtapas(template);
                    const matchScore = getTemplateMatchScore(template);
                    
                    // Verificar si esta plantilla ya fue enviada
                    const alreadySentThisMonth = sendLimits?.sentTemplateIds.includes(template.id) || false;
                    const alreadySentThisWeek = sendLimits?.weeklyLimit.usedTemplateIds.includes(template.id) || false;
                    
                    return (
                      <motion.button
                        key={template.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        whileHover={{ scale: alreadySentThisMonth ? 1 : 1.02 }}
                        whileTap={{ scale: alreadySentThisMonth ? 1 : 0.98 }}
                        onClick={() => handleSelectTemplate(template)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all relative ${
                          alreadySentThisMonth
                            ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : isRecommended
                            ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 hover:border-green-300 dark:hover:border-green-700'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {/* Icono de ya enviada */}
                        {alreadySentThisMonth && (
                          <div className="absolute top-3 right-3">
                            <div className="flex items-center justify-center w-6 h-6 bg-gray-400 dark:bg-gray-600 rounded-full">
                              <Ban className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        )}

                        {/* Icono de mejor opción para plantillas sugeridas */}
                        {isRecommended && !isSelected && !alreadySentThisMonth && (
                          <div className="absolute top-3 right-3">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: index * 0.03 + 0.1, type: "spring", stiffness: 200 }}
                              className="flex items-center justify-center w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow-lg"
                            >
                              <Star className="w-3.5 h-3.5 text-white fill-white" />
                            </motion.div>
                          </div>
                        )}
                        
                        <div className="flex items-start justify-between mb-2 pr-8">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`font-semibold ${
                                alreadySentThisMonth 
                                  ? 'text-gray-500 dark:text-gray-500 line-through' 
                                  : isSelected 
                                  ? 'text-blue-900 dark:text-blue-100' 
                                  : 'text-gray-900 dark:text-white'
                              }`}>
                                {template.name}
                              </h4>
                              {/* Badge de ya enviada */}
                              {alreadySentThisMonth && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded font-medium">
                                  <AlertTriangle className="w-3 h-3" />
                                  {alreadySentThisWeek ? 'Enviada esta semana' : 'Enviada este mes'}
                                </span>
                              )}
                              {isRecommended && !isSelected && !alreadySentThisMonth && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded font-medium">
                                  <Sparkles className="w-3 h-3" />
                                  Recomendada {matchScore > 0 && `(${Math.round(matchScore)}%)`}
                                </span>
                              )}
                            </div>
                            {/* Etiquetas de etapa asignada */}
                            {templateEtapas.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {templateEtapas.map((etapa, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-block px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded"
                                  >
                                    {etapa}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-lg flex-shrink-0 ${
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
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                        {template.variable_mappings && Array.isArray(template.variable_mappings) && template.variable_mappings.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.variable_mappings.slice(0, 3).map((mapping: any, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                              >
                                {mapping.display_name}
                              </span>
                            ))}
                            {template.variable_mappings.length > 3 && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                                +{template.variable_mappings.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </motion.button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Panel derecho - Vista previa y variables o Formulario de sugerencia */}
            <div className="w-[55%] flex flex-col">
              {showSuggestionForm ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key="suggestion-form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-1 overflow-y-auto p-6 space-y-6"
                  >
                    {/* Header del formulario */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          Sugerir Nueva Plantilla
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Comparte tu idea para una nueva plantilla. Un administrador la revisará y podrá aprobarla o rechazarla.
                      </p>
                    </div>

                    {/* Formulario */}
                    <div className="space-y-4">
                      {/* Nombre de la plantilla */}
                      <div>
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <span>Nombre de la Plantilla *</span>
                        </label>
                        <input
                          type="text"
                          value={suggestionName}
                          onChange={(e) => setSuggestionName(e.target.value)}
                          placeholder="Ej: Reagendar llamada no exitosa"
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white"
                        />
                      </div>

                      {/* Plantilla con variables */}
                      <div>
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <span>Contenido de la Plantilla *</span>
                        </label>
                        <div className="mb-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => insertVariable('titulo')}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            {'Título ({{titulo}})'}
                          </button>
                          <button
                            type="button"
                            onClick={() => insertVariable('primer_nombre')}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            {'Primer Nombre ({{primer_nombre}})'}
                          </button>
                          <button
                            type="button"
                            onClick={() => insertVariable('primer_apellido')}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            {'Primer Apellido ({{primer_apellido}})'}
                          </button>
                          <button
                            type="button"
                            onClick={() => insertVariable('ejecutivo_nombre')}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            {'Ejecutivo ({{ejecutivo_nombre}})'}
                          </button>
                          <button
                            type="button"
                            onClick={() => insertVariable('fecha_actual')}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            {'Fecha ({{fecha_actual}})'}
                          </button>
                        </div>
                        <textarea
                          id="suggestion-text"
                          value={suggestionText}
                          onChange={(e) => setSuggestionText(e.target.value)}
                          placeholder="Escribe el contenido de tu plantilla aquí. Puedes usar las variables disponibles haciendo clic en los botones de arriba."
                          rows={8}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white resize-none"
                        />
                      </div>

                      {/* Justificación */}
                      <div>
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <span>Justificación *</span>
                        </label>
                        <textarea
                          value={suggestionJustification}
                          onChange={(e) => setSuggestionJustification(e.target.value)}
                          placeholder="Explica por qué esta plantilla sería útil y en qué situaciones se usaría..."
                          rows={4}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white resize-none"
                        />
                      </div>

                      {/* Botones */}
                      <div className="flex justify-end space-x-3 pt-4">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setShowSuggestionForm(false);
                            setSuggestionName('');
                            setSuggestionText('');
                            setSuggestionJustification('');
                          }}
                          className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                        >
                          Cancelar
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleSubmitSuggestion}
                          disabled={suggestionLoading || !suggestionName.trim() || !suggestionText.trim() || !suggestionJustification.trim()}
                          className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-purple-500/25 flex items-center space-x-2"
                        >
                          {suggestionLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Enviando...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              <span>Enviar Sugerencia</span>
                            </>
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              ) : selectedTemplate ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedTemplate.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-1 overflow-y-auto p-6 space-y-6"
                  >
                    {/* Información de la plantilla */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {selectedTemplate.name}
                      </h4>
                      {selectedTemplate.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedTemplate.description}
                        </p>
                      )}
                    </div>

                    {/* Variables como tags */}
                    {normalizedMappings.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Variables de la Plantilla
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {normalizedMappings.map((mapping: any) => {
                            const customVar = customVariables[mapping.variable_number];
                            if (!customVar) return null;

                            let displayValue = '';
                            if (mapping.table_name === 'system') {
                              if (mapping.field_name === 'fecha_actual') {
                                displayValue = whatsappTemplatesService.getSystemVariableValue('fecha_actual', undefined, user?.full_name);
                              } else if (mapping.field_name === 'hora_actual') {
                                displayValue = whatsappTemplatesService.getSystemVariableValue('hora_actual', undefined, user?.full_name);
                              } else {
                                displayValue = customVar.value || '';
                              }
                            } else {
                              displayValue = customVar.value || 'No disponible';
                            }

                            return (
                              <span
                                key={mapping.variable_number}
                                className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
                                title={`{{${mapping.variable_number}}}: ${displayValue}`}
                              >
                                {mapping.display_name}
                              </span>
                            );
                          })}
                  </div>
                </div>
                    )}

                    {/* Variables editables */}
                    {editableMappings.length > 0 && (
                <div className="space-y-4">
                        <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Variables Editables
                  </h5>
                        <div className="space-y-3">
                          {editableMappings.map((mapping: any) => {
                    const customVar = customVariables[mapping.variable_number];
                    if (!customVar) return null;

                    return (
                      <div
                        key={mapping.variable_number}
                                className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
                      >
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          {`${mapping.display_name} ({{${mapping.variable_number}}})`}
                        </label>

                                {mapping.table_name === 'system' && mapping.field_name === 'fecha_personalizada' ? (
                          <input
                            type="date"
                            value={customVar.value}
                            onChange={(e) => {
                              setCustomVariables({
                                ...customVariables,
                                [mapping.variable_number]: { ...customVar, value: e.target.value }
                              });
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                        ) : mapping.table_name === 'system' && mapping.field_name === 'hora_personalizada' ? (
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
                            </div>
                    )}

                    {/* Vista Previa */}
                    <div className="space-y-3">
                      <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Vista Previa
                      </h5>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                    {loading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-green-500" />
                      </div>
                        ) : preview ? (
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {preview}
                        </p>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                            La vista previa aparecerá aquí...
                          </p>
                    )}
                  </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      Selecciona una plantilla para ver la vista previa
                    </p>
                  </div>
              </div>
            )}
            </div>
          </div>

          {/* Footer - solo cuando hay envíos disponibles */}
          {selectedTemplate && (
            <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              {/* Mensaje de bloqueo de plantilla específica (ya no debería mostrarse pero se mantiene por compatibilidad) */}
              {selectedTemplateBlocked.blocked && selectedTemplateBlocked.reason && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                >
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{selectedTemplateBlocked.reason}</span>
                  </div>
                </motion.div>
              )}

              <div className="flex justify-end space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  Cancelar
                </motion.button>
                <AnimatePresence mode="wait">
                  {sendingSuccess ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center space-x-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Enviado</span>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="send-button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSend}
                      disabled={sending || !prospectoData?.id || !areAllVariablesComplete || selectedTemplateBlocked.blocked || !sendLimits?.canSend}
                      className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-all duration-200 shadow-lg flex items-center space-x-2 ${
                        selectedTemplateBlocked.blocked || !sendLimits?.canSend
                          ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed shadow-none'
                          : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-blue-500/25'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={
                        selectedTemplateBlocked.blocked 
                          ? selectedTemplateBlocked.reason || 'Plantilla no disponible'
                          : !sendLimits?.canSend 
                          ? sendLimits?.blockReason || 'Límite de envío alcanzado'
                          : !areAllVariablesComplete 
                          ? 'Completa todas las variables antes de enviar' 
                          : ''
                      }
                    >
                      {sending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : selectedTemplateBlocked.blocked ? (
                        <>
                          <Ban className="w-4 h-4" />
                          <span>Plantilla no disponible</span>
                        </>
                      ) : !sendLimits?.canSend ? (
                        <>
                          <Ban className="w-4 h-4" />
                          <span>Límite alcanzado</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Enviar Plantilla</span>
                        </>
                      )}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
          </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
