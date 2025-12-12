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

  // Cargar plantillas activas y resetear selector
  useEffect(() => {
    if (isOpen) {
      // Resetear selector de plantilla al abrir el modal
      setSelectedTemplate(null);
      setCustomVariables({});
      setPreview('');
      loadTemplates();
      loadDestinos();
    }
  }, [isOpen]);
  
  // Buscar destinos por nombre después de cargar la lista de destinos y cuando se selecciona una plantilla
  useEffect(() => {
    if (destinos.length > 0 && selectedTemplate) {
      // Buscar variable 3 que es de tipo destino
      const var3 = customVariables[3];
      if (var3?.type === 'destino' && var3.value && !var3.destinoId) {
        const destinoNombre = var3.value;
        const destinoEncontrado = destinos.find(d => 
          d.nombre.toLowerCase() === destinoNombre.toLowerCase() ||
          d.nombre.toLowerCase().includes(destinoNombre.toLowerCase()) ||
          destinoNombre.toLowerCase().includes(d.nombre.toLowerCase())
        );
        
        if (destinoEncontrado) {
          setCustomVariables(prev => ({
            ...prev,
            3: {
              ...prev[3],
              destinoId: destinoEncontrado.id,
              value: destinoEncontrado.nombre,
            }
          }));
        }
      }
    }
  }, [destinos, selectedTemplate, customVariables]);

  // Cargar resorts cuando se selecciona un destino
  useEffect(() => {
    if (selectedTemplate) {
      // Buscar variables de tipo destino (con o sin mapeos)
      Object.keys(customVariables).forEach(key => {
        const varNum = parseInt(key, 10);
        const customVar = customVariables[varNum];
        if (customVar?.type === 'destino' && customVar.destinoId) {
          loadResorts(customVar.destinoId);
        }
      });
    }
  }, [customVariables, selectedTemplate]);

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
      
      // Construir mapa de variables
      if (selectedTemplate.variable_mappings && selectedTemplate.variable_mappings.length > 0) {
        selectedTemplate.variable_mappings.forEach(mapping => {
        const customVar = customVariables[mapping.variable_number];
        if (customVar) {
          if (mapping.table_name === 'system') {
            // Para fecha/hora actual, no pasar customValue (undefined)
            // Para fecha/hora personalizada, pasar el valor seleccionado
            let customValue: string | undefined = undefined;
            
            if (mapping.field_name === 'fecha_personalizada') {
              // Asegurar que tenemos un valor válido para fecha personalizada
              customValue = customVar.value && customVar.value !== 'current' && customVar.value.trim() !== '' ? customVar.value : undefined;
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
            
            variablesMap[mapping.variable_number] = formattedValue;
          } else if (mapping.table_name === 'destinos' && customVar.destinoId) {
            const destino = destinos.find(d => d.id === customVar.destinoId);
            variablesMap[mapping.variable_number] = destino?.nombre || '';
          } else if (mapping.table_name === 'resorts' && customVar.resortId) {
            const resort = resorts.find(r => r.id === customVar.resortId);
            variablesMap[mapping.variable_number] = resort?.nombre || resort?.nombre_completo || '';
          } else if (mapping.table_name === 'llamadas_ventas') {
            // Variables de llamadas_ventas - usar el valor directamente
            variablesMap[mapping.variable_number] = customVar.value || '';
          } else {
            variablesMap[mapping.variable_number] = customVar.value || '';
          }
        }
      });
    } else {
        // Si no hay variable_mappings, usar directamente los valores de customVariables
        allVariablesInText.forEach(varNum => {
          const customVar = customVariables[varNum];
          if (customVar) {
            if (customVar.type === 'prospecto') {
              variablesMap[varNum] = customVar.value || '';
            } else if (customVar.type === 'destino' && customVar.destinoId) {
              const destino = destinos.find(d => d.id === customVar.destinoId);
              variablesMap[varNum] = destino?.nombre || customVar.value || '';
            } else if (customVar.type === 'resort' && customVar.resortId) {
              const resort = resorts.find(r => r.id === customVar.resortId);
              variablesMap[varNum] = resort?.nombre || resort?.nombre_completo || customVar.value || '';
            } else if (customVar.type === 'fecha_actual' || customVar.type === 'hora_actual' || customVar.type === 'ejecutivo') {
              const systemFieldName = customVar.type === 'ejecutivo' ? 'ejecutivo_nombre' 
                : customVar.type === 'fecha_actual' ? 'fecha_actual'
                : customVar.type === 'hora_actual' ? 'hora_actual'
                : customVar.type === 'fecha_personalizada' ? 'fecha_personalizada'
                : 'hora_personalizada';
              variablesMap[varNum] = whatsappTemplatesService.getSystemVariableValue(
                systemFieldName,
                customVar.type === 'fecha_personalizada' || customVar.type === 'hora_personalizada' ? customVar.value : undefined,
                user?.full_name || user?.displayName
              );
            } else {
              variablesMap[varNum] = customVar.value || '';
            }
          }
        });
      }
      
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
  
  // Validar si todas las variables están completas
  const areAllVariablesComplete = useMemo(() => {
    if (!selectedTemplate) return false;
    
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
    
    // Verificar que todas las variables tengan valores
    for (const varNum of allVariablesInText) {
      const customVar = customVariables[varNum];
      
      if (!customVar) {
        return false;
      }
      
      // Variables del sistema siempre están completas
      if (customVar.type === 'fecha_actual' || customVar.type === 'fecha_personalizada' || 
          customVar.type === 'hora_actual' || customVar.type === 'hora_personalizada' || 
          customVar.type === 'ejecutivo') {
        continue;
      }
      
      // Variables de destino deben tener destinoId o valor
      if (customVar.type === 'destino') {
        if (!customVar.destinoId && (!customVar.value || customVar.value.trim() === '')) {
          return false;
        }
        continue;
      }
      
      // Variables de resort deben tener resortId
      if (customVar.type === 'resort') {
        if (!customVar.resortId) {
          return false;
        }
        continue;
      }
      
      // Otras variables deben tener valor
      if (!customVar.value || customVar.value.trim() === '') {
        return false;
      }
    }
    
    return true;
  }, [selectedTemplate, customVariables]);

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

  const handleSelectTemplate = async (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    
    // Inicializar variables con valores por defecto
    const initialVars: Record<number, any> = {};
    
    // Extraer todas las variables del texto si no hay mapeos configurados
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
    
    // Cargar datos de llamadas_ventas si hay mapeos que lo requieren
    let llamadasVentasData: any = null;
    // Normalizar variable_mappings si viene como objeto
    let variableMappings: any[] = [];
    if (template.variable_mappings) {
      if (Array.isArray(template.variable_mappings)) {
        variableMappings = template.variable_mappings;
      } else if (typeof template.variable_mappings === 'object' && 'mappings' in template.variable_mappings) {
        const mappingsObj = template.variable_mappings as { mappings?: any[] };
        variableMappings = Array.isArray(mappingsObj.mappings) ? mappingsObj.mappings : [];
      }
    }
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
        console.error('Error cargando datos de llamadas_ventas:', error);
      }
    }
    
    // Si hay variable_mappings, usarlos
    if (template.variable_mappings && template.variable_mappings.length > 0) {
      template.variable_mappings.forEach((mapping) => {
      if (mapping.table_name === 'prospectos' && prospectoData) {
        // Variables del prospecto (no editables)
        let value = prospectoData[mapping.field_name];
        
        // Manejar diferentes tipos de datos
        if (value === null || value === undefined) {
          value = '';
        } else if (Array.isArray(value)) {
          // Si es un array, tomar el primer elemento o unir con comas
          value = value.length > 0 ? value[0] : '';
        } else if (typeof value === 'number') {
          // Convertir números a string
          value = String(value);
        } else if (typeof value === 'boolean') {
          // Convertir booleanos a string
          value = value ? 'Sí' : 'No';
        } else {
          value = String(value);
        }
        
        initialVars[mapping.variable_number] = {
          value: String(value),
          type: 'prospecto',
        };
      } else if (mapping.table_name === 'llamadas_ventas') {
        // Variables de llamadas_ventas (discovery) - obtener desde la tabla llamadas_ventas
        let value = '';
        
        if (llamadasVentasData) {
          // Si el campo tiene punto, es un campo anidado (datos_proceso.numero_personas)
          if (mapping.field_name.includes('.')) {
            const [parentField, childField] = mapping.field_name.split('.');
            if (llamadasVentasData[parentField] && typeof llamadasVentasData[parentField] === 'object') {
              value = llamadasVentasData[parentField][childField] || '';
            }
          } else {
            value = llamadasVentasData[mapping.field_name] || '';
          }
        }
        
        // Manejar diferentes tipos de datos
        if (value === null || value === undefined) {
          value = '';
        } else if (Array.isArray(value)) {
          value = value.length > 0 ? value[0] : '';
        } else if (typeof value === 'number') {
          value = String(value);
        } else if (typeof value === 'boolean') {
          value = value ? 'Sí' : 'No';
        } else {
          value = String(value);
        }
        
        initialVars[mapping.variable_number] = {
          value: String(value),
          type: 'prospecto', // Usar tipo prospecto para mantener compatibilidad
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
    } else {
      // Si no hay variable_mappings, inicializar variables básicas desde el texto
      // Intentar inferir los campos basándose en el orden común de uso
      allVariablesInText.forEach(varNum => {
        if (prospectoData) {
          // Mapeo común basado en el número de variable
          // Variable 1: título (si existe)
          if (varNum === 1) {
            initialVars[varNum] = {
              value: prospectoData.titulo || '',
              type: 'prospecto',
            };
          }
          // Variable 2: apellido paterno
          else if (varNum === 2) {
            // Intentar obtener apellido paterno desde diferentes campos posibles
            let apellidoPaterno = '';
            if (prospectoData.apellido_paterno) {
              apellidoPaterno = prospectoData.apellido_paterno;
            } else if (prospectoData.apellidoPaterno) {
              apellidoPaterno = prospectoData.apellidoPaterno;
            } else if (prospectoData.nombre_completo) {
              // Si no hay apellido_paterno separado, intentar extraerlo del nombre_completo
              // Formato común: "Nombre ApellidoPaterno ApellidoMaterno"
              const partes = prospectoData.nombre_completo.trim().split(/\s+/);
              if (partes.length >= 2) {
                // El segundo elemento suele ser el apellido paterno
                apellidoPaterno = partes[1];
              }
            }
            
            initialVars[varNum] = {
              value: apellidoPaterno || '',
              type: 'prospecto',
            };
          }
          // Variable 3: apellido materno o destino_preferencia
          else if (varNum === 3) {
            // Intentar apellido materno primero
            let apellidoMaterno = '';
            if (prospectoData.apellido_materno) {
              apellidoMaterno = prospectoData.apellido_materno;
            } else if (prospectoData.apellidoMaterno) {
              apellidoMaterno = prospectoData.apellidoMaterno;
            } else if (prospectoData.nombre_completo) {
              // Si no hay apellido_materno separado, intentar extraerlo del nombre_completo
              // Formato común: "Nombre ApellidoPaterno ApellidoMaterno"
              const partes = prospectoData.nombre_completo.trim().split(/\s+/);
              if (partes.length >= 3) {
                // El tercer elemento suele ser el apellido materno
                apellidoMaterno = partes[2];
              }
            }
            
            if (apellidoMaterno) {
              initialVars[varNum] = {
                value: apellidoMaterno,
                type: 'prospecto',
              };
            } else if (prospectoData.destino_preferencia) {
              let destinoNombre = '';
              if (Array.isArray(prospectoData.destino_preferencia)) {
                destinoNombre = prospectoData.destino_preferencia[0] || '';
              } else {
                destinoNombre = String(prospectoData.destino_preferencia);
              }
              
              initialVars[varNum] = {
                value: destinoNombre,
                type: 'destino',
                destinoId: '',
              };
            } else {
              initialVars[varNum] = {
                value: '',
                type: 'prospecto',
              };
            }
          }
          // Variable 4: email
          else if (varNum === 4) {
            initialVars[varNum] = {
              value: prospectoData.email || '',
              type: 'prospecto',
            };
          }
          // Variable 5: fecha_actual (inferir si parece fecha)
          else if (varNum === 5) {
            initialVars[varNum] = {
              value: 'current',
              type: 'fecha_actual',
            };
          }
          // Variable 6: fecha_personalizada (inferir si parece fecha)
          else if (varNum === 6) {
            initialVars[varNum] = {
              value: new Date().toISOString().split('T')[0],
              type: 'fecha_personalizada',
            };
          }
          // Variable 7: ejecutivo_nombre
          else if (varNum === 7) {
            initialVars[varNum] = {
              value: user?.full_name || user?.displayName || '',
              type: 'ejecutivo',
            };
          }
          // Variable 8: destino_preferido de llamadas_ventas o destino
          else if (varNum === 8) {
            // Intentar desde destino_preferencia primero
            if (prospectoData.destino_preferencia) {
              let destinoNombre = '';
              if (Array.isArray(prospectoData.destino_preferencia)) {
                destinoNombre = prospectoData.destino_preferencia[0] || '';
              } else {
                destinoNombre = String(prospectoData.destino_preferencia);
              }
              
              initialVars[varNum] = {
                value: destinoNombre,
                type: 'destino',
                destinoId: '',
              };
            } else {
              initialVars[varNum] = {
                value: '',
                type: 'destino',
                destinoId: '',
              };
            }
          }
          // Variables adicionales: otros campos comunes
          else {
            initialVars[varNum] = {
              value: '',
              type: 'prospecto',
            };
          }
        } else {
          // Sin prospecto, requerir entrada del usuario
          initialVars[varNum] = {
            value: '',
            type: 'prospecto',
          };
        }
      });
      
      // Después de inicializar, buscar destinos por nombre para variables de tipo destino
      if (prospectoData) {
        Object.keys(initialVars).forEach(key => {
          const varNum = parseInt(key, 10);
          const varData = initialVars[varNum];
          if (varData.type === 'destino' && varData.value && !varData.destinoId) {
            // Se buscará después cuando se carguen los destinos en el useEffect
          }
        });
      }
    }
    
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
      
      // Extraer todas las variables del texto de la plantilla
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
      
      // Si hay variable_mappings configurados, usarlos
      if (selectedTemplate.variable_mappings && selectedTemplate.variable_mappings.length > 0) {
        selectedTemplate.variable_mappings.forEach(mapping => {
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
            } else if (customVar.value) {
              // Si hay un valor directo sin destinoId, usarlo
              value = customVar.value;
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
            } else if (mapping.table_name === 'llamadas_ventas') {
              // Variables de llamadas_ventas - usar el valor directamente
              value = customVar.value || '';
              // Si no hay valor, marcar como faltante
              if (!value || value.trim() === '') {
                missingVariables.push(`${mapping.display_name} ({{${mapping.variable_number}}})`);
              }
            } else if (mapping.table_name === 'prospectos') {
              // Variables de prospectos - usar el valor directamente
              value = customVar.value || '';
              // Si no hay valor, marcar como faltante
              if (!value || value.trim() === '') {
                missingVariables.push(`${mapping.display_name} ({{${mapping.variable_number}}})`);
              }
            } else {
              value = customVar.value || '';
            }
            
            // Solo agregar si tiene valor
            // Para variables del sistema, siempre agregar (tienen valores por defecto)
            if (mapping.table_name === 'system') {
              variables[mapping.variable_number.toString()] = value;
            } else if (value && value.trim() !== '') {
              variables[mapping.variable_number.toString()] = value;
            } else if (mapping.table_name !== 'system') {
              // Todas las demás variables deben tener valor, excepto sistema
              if (!missingVariables.some(mv => mv.includes(`{{${mapping.variable_number}}}`))) {
                missingVariables.push(`${mapping.display_name} ({{${mapping.variable_number}}})`);
              }
            }
          } else {
            // Variable sin mapeo
            missingVariables.push(`Variable {{${mapping.variable_number}}}`);
          }
        });
          } else {
            // Si no hay variable_mappings, usar directamente los valores de customVariables
            allVariablesInText.forEach(varNum => {
              const customVar = customVariables[varNum];
              if (customVar) {
                // Procesar según el tipo
                let value = '';
                if (customVar.type === 'prospecto') {
                  value = customVar.value || '';
            } else if (customVar.type === 'destino') {
              if (customVar.destinoId) {
                const destino = destinos.find(d => d.id === customVar.destinoId);
                value = destino?.nombre || customVar.value || '';
              } else if (customVar.value) {
                // Si hay un valor directo sin destinoId seleccionado, usarlo
                value = customVar.value;
              } else {
                value = '';
              }
            } else if (customVar.type === 'resort' && customVar.resortId) {
                  const resort = resorts.find(r => r.id === customVar.resortId);
                  value = resort?.nombre || resort?.nombre_completo || customVar.value || '';
                } else if (customVar.type === 'fecha_actual' || customVar.type === 'fecha_personalizada' || 
                           customVar.type === 'hora_actual' || customVar.type === 'hora_personalizada' || 
                           customVar.type === 'ejecutivo') {
                  // Variables del sistema
                  const systemFieldName = customVar.type === 'ejecutivo' ? 'ejecutivo_nombre' 
                    : customVar.type === 'fecha_actual' ? 'fecha_actual'
                    : customVar.type === 'hora_actual' ? 'hora_actual'
                    : customVar.type === 'fecha_personalizada' ? 'fecha_personalizada'
                    : 'hora_personalizada';
                  value = whatsappTemplatesService.getSystemVariableValue(
                    systemFieldName,
                    customVar.type === 'fecha_personalizada' || customVar.type === 'hora_personalizada' ? customVar.value : undefined,
                    user?.full_name || user?.displayName
                  );
                } else {
                  value = customVar.value || '';
                }
                
                // SIEMPRE agregar la variable al objeto variables si tiene valor
                // Variables del sistema siempre tienen valor
                if (customVar.type === 'fecha_actual' || customVar.type === 'fecha_personalizada' || 
                    customVar.type === 'hora_actual' || customVar.type === 'hora_personalizada' || 
                    customVar.type === 'ejecutivo') {
                  // Variables del sistema siempre se agregan
                  variables[varNum.toString()] = value;
                } else if (customVar.type === 'destino') {
                  // Para destinos, validar que tenga destinoId o valor
                  if (customVar.destinoId || (value && value.trim() !== '')) {
                    variables[varNum.toString()] = value;
                  } else {
                    const varName = varNum === 8 ? 'Destino Preferido' : `Destino ({{${varNum}}})`;
                    missingVariables.push(`${varName} ({{${varNum}}})`);
                  }
                } else if (value && value.trim() !== '') {
                  // Cualquier otra variable con valor se agrega
                  variables[varNum.toString()] = value;
                } else {
                  // Variable sin valor
                  const varName = varNum === 1 ? 'Título' 
                    : varNum === 2 ? 'Apellido Paterno'
                    : varNum === 3 ? 'Apellido Materno'
                    : varNum === 4 ? 'Email'
                    : `Variable {{${varNum}}}`;
                  missingVariables.push(`${varName} ({{${varNum}}})`);
                }
              } else {
                // Variable sin customVar, determinar nombre según el número
                const varName = varNum === 1 ? 'Título' 
                  : varNum === 2 ? 'Apellido Paterno'
                  : varNum === 3 ? 'Apellido Materno'
                  : varNum === 4 ? 'Email'
                  : `Variable {{${varNum}}}`;
                missingVariables.push(`${varName} ({{${varNum}}})`);
              }
            });
          }

      // Validar que no falten variables requeridas
      if (missingVariables.length > 0) {
        toast.error(`No se puede enviar la plantilla. Faltan variables requeridas: ${missingVariables.join(', ')}`, {
          duration: 5000,
        });
        setSending(false);
        return;
      }
      
      // Validar que todas las variables requeridas en el texto tengan valores
      const allRequiredVars = allVariablesInText.filter(varNum => {
        const varKey = varNum.toString();
        return !variables[varKey] || variables[varKey].trim() === '';
      });
      
      if (allRequiredVars.length > 0) {
        const missingVarsList = allRequiredVars.map(v => `{{${v}}}`).join(', ');
        toast.error(`No se puede enviar la plantilla. Las siguientes variables no tienen valores: ${missingVarsList}`, {
          duration: 5000,
        });
        setSending(false);
        return;
      }

      // Validar que prospecto_id sea un UUID válido
      if (!prospectoData.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prospectoData.id)) {
        toast.error('ID de prospecto inválido');
        console.error('❌ Prospecto ID inválido:', prospectoData.id);
        return;
      }

      // Validar que todas las variables requeridas tengan valores antes de construir el payload
      const allVarsComplete = allVariablesInText.every(varNum => {
        const varKey = varNum.toString();
        return variables[varKey] && variables[varKey].trim() !== '';
      });
      
      if (!allVarsComplete) {
        const missingVars = allVariablesInText
          .filter(varNum => !variables[varNum.toString()] || variables[varNum.toString()].trim() === '')
          .map(v => `{{${v}}}`)
          .join(', ');
        toast.error(`No se puede enviar. Variables sin valores: ${missingVars}`, {
          duration: 5000,
        });
        setSending(false);
        return;
      }

      // Verificar que todas las variables requeridas estén en el objeto variables
      const missingInPayload = allVariablesInText.filter(varNum => {
        const varKey = varNum.toString();
        return !variables[varKey] || variables[varKey].trim() === '';
      });
      
      if (missingInPayload.length > 0) {
        const missingVarsList = missingInPayload.map(v => `{{${v}}}`).join(', ');
        toast.error(`Error: Las siguientes variables no se resolvieron correctamente: ${missingVarsList}`, {
          duration: 5000,
        });
        setSending(false);
        return;
      }

      // Generar el texto resuelto para enviar al webhook
      // Esto asegura que el webhook tenga el texto completo con las variables ya reemplazadas
      let resolvedText = '';
      if (selectedTemplate.components && selectedTemplate.components.length > 0) {
        const bodyComponent = selectedTemplate.components.find(c => c.type === 'BODY');
        if (bodyComponent && bodyComponent.text) {
          resolvedText = bodyComponent.text;
          // Reemplazar todas las variables {{1}}, {{2}}, etc. con sus valores
          Object.keys(variables).forEach(varKey => {
            const varNum = parseInt(varKey, 10);
            const value = variables[varKey];
            // Reemplazar todas las ocurrencias de {{varNum}} con el valor
            resolvedText = resolvedText.replace(new RegExp(`\\{\\{${varNum}\\}\\}`, 'g'), value);
          });
        }
      }

      // Construir payload según la documentación
      const payload = {
        template_id: selectedTemplate.id,
        template_name: selectedTemplate.name,
        prospecto_id: prospectoData.id,
        variables: variables,
        resolved_text: resolvedText, // Agregar texto resuelto como campo adicional
        triggered_by: 'MANUAL' as const
      };

      // Enviar al webhook
      const webhookUrl = 'https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates-send';
      const authToken = 'wFRpkQv4cdmAg976dzEfTDML86vVlGLZmBUIMgftO0rkwhfJHkzVRuQa51W0tXTV';
      
      const requestBody = JSON.stringify(payload);
      
      // Debug temporal: Verificar que todas las variables estén resueltas
      console.log('📤 Enviando plantilla al webhook:', {
        template_name: payload.template_name,
        variables_enviadas: payload.variables,
        total_variables: Object.keys(payload.variables).length,
        variables_requeridas: allVariablesInText,
        todas_resueltas: allVariablesInText.every(v => payload.variables[v.toString()]),
        texto_resuelto: payload.resolved_text,
        payload_completo: payload
      });
      
      // Usar header 'Auth' como especifica la documentación
      const requestHeaders = {
        'Auth': authToken,
        'Content-Type': 'application/json'
      };
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: requestBody
      });

      // Obtener el texto de la respuesta primero
      const responseText = await response.text();

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
                {(() => {
                  // Normalizar variable_mappings una sola vez
                  let normalizedMappings: any[] = [];
                  if (selectedTemplate.variable_mappings) {
                    if (Array.isArray(selectedTemplate.variable_mappings)) {
                      normalizedMappings = selectedTemplate.variable_mappings;
                    } else if (typeof selectedTemplate.variable_mappings === 'object' && 'mappings' in selectedTemplate.variable_mappings) {
                      const mappingsObj = selectedTemplate.variable_mappings as { mappings?: any[] };
                      normalizedMappings = Array.isArray(mappingsObj.mappings) ? mappingsObj.mappings : [];
                    }
                  }
                  
                  // Si no hay variable_mappings, extraer variables del texto
                  if (normalizedMappings.length === 0) {
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
                    normalizedMappings = allVariablesInText.map(varNum => ({
                      variable_number: varNum,
                      display_name: `Variable ${varNum}`,
                      table_name: 'prospectos',
                    }));
                  }
                  
                  const editableMappings = normalizedMappings.filter((mapping: any) => {
                    const customVar = customVariables[mapping.variable_number];
                    return customVar && (
                      (mapping.table_name === 'system' && mapping.field_name === 'fecha_personalizada') ||
                      (mapping.table_name === 'system' && mapping.field_name === 'hora_personalizada') ||
                      mapping.table_name === 'destinos' ||
                      mapping.table_name === 'resorts'
                    );
                  });
                  
                  return (
                    <div className="space-y-4">
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Variables de la Plantilla
                      </h5>
                      
                      {/* Mostrar variables como tags compactos */}
                      <div className="flex flex-wrap gap-2">
                        {normalizedMappings.map((mapping: any) => {
                          const customVar = customVariables[mapping.variable_number];
                          if (!customVar) return null;

                          // Obtener el valor a mostrar
                          let displayValue = '';
                          if (mapping.table_name === 'system') {
                            if (mapping.field_name === 'fecha_actual') {
                              displayValue = whatsappTemplatesService.getSystemVariableValue('fecha_actual', undefined, user?.full_name);
                            } else if (mapping.field_name === 'hora_actual') {
                              displayValue = whatsappTemplatesService.getSystemVariableValue('hora_actual', undefined, user?.full_name);
                            } else if (mapping.field_name === 'ejecutivo_nombre') {
                              displayValue = customVar.value || '';
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
                      
                      {/* Campos editables para fecha/hora personalizada, destinos y resorts */}
                      {editableMappings.length > 0 && editableMappings.map((mapping: any) => {
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
                          // Fecha personalizada: selector de calendario
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
                  );
                })()}

                {/* Vista Previa */}
                <div className="space-y-4">
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Vista Previa
                  </h5>
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
                disabled={sending || !prospectoData?.id || !areAllVariablesComplete}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center space-x-2"
                title={!areAllVariablesComplete ? 'Completa todas las variables antes de enviar' : ''}
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

