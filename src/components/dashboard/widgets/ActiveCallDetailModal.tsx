/**
 * Modal de Detalle de Llamada Activa para Dashboard
 * Versión optimizada del modal de LiveMonitor con suscripciones realtime
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Phone, User, Globe, MessageSquare, 
  TrendingUp, Calendar,
  ArrowRightLeft, RotateCcw, Wand2, CheckCircle
} from 'lucide-react';
import { analysisSupabase } from '../../../config/analysisSupabase';
import { type LiveCallData } from '../../../services/liveMonitorService';
import { Avatar } from '../../shared/Avatar';

interface ActiveCallDetailModalProps {
  call: LiveCallData;
  isOpen: boolean;
  onClose: () => void;
}

interface ConversationMessage {
  speaker: string;
  message: string;
  timestamp: string;
}

export const ActiveCallDetailModal: React.FC<ActiveCallDetailModalProps> = ({
  call,
  isOpen,
  onClose
}) => {
  const [currentCall, setCurrentCall] = useState<LiveCallData>(call);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const conversationScrollRef = useRef<HTMLDivElement>(null);
  const userScrolledAwayRef = useRef<boolean>(false);
  const realtimeChannelRef = useRef<any>(null);
  
  // Estados para transferencia
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [selectedPresetReason, setSelectedPresetReason] = useState('');
  const [customTransferMessage, setCustomTransferMessage] = useState('');
  const [customTransferText, setCustomTransferText] = useState('');
  
  // Mensajes predefinidos para transferencia
  const transferReasons = [
    {
      short: 'Mejor precio exclusivo',
      full: 'Mi supervisor puede ofrecerle un mejor precio exclusivo que tengo autorización limitada'
    },
    {
      short: 'Caso especial',
      full: 'Mi supervisor maneja casos especiales como el suyo y quiere atenderle personalmente'
    },
    {
      short: 'Beneficios adicionales',
      full: 'Tengo un supervisor especializado en su destino que puede darle beneficios adicionales'
    },
    {
      short: 'Disponibilidad limitada',
      full: 'Mi supervisor tiene disponibilidad muy limitada solo para hoy y quiere hablar con usted'
    },
    {
      short: 'Oferta especial',
      full: 'Como mostró tanto interés, mi supervisor quiere ofrecerle algo especial que yo no puedo autorizar'
    },
    {
      short: 'Beneficio exclusivo',
      full: 'Mi supervisor estaba escuchando la llamada y quiere darle un beneficio exclusivo inmediatamente'
    }
  ];

  // Parsear conversación desde el campo conversacion_completa
  // Formato esperado: { conversacion: "[timestamp] speaker: message\n..." }
  const parseConversation = useCallback((conversacionCompleta: any): ConversationMessage[] => {
    if (!conversacionCompleta) return [];
    
    try {
      let conversationData;
      
      // Si es string, parsear JSON
      if (typeof conversacionCompleta === 'string') {
        conversationData = JSON.parse(conversacionCompleta);
      } else {
        conversationData = conversacionCompleta;
      }
      
      const conversationText = conversationData.conversacion || '';
      if (!conversationText) return [];
      
      // Dividir por líneas y parsear cada mensaje
      const lines = conversationText.split('\n').filter((line: string) => line.trim());
      const messages: ConversationMessage[] = [];
      
      for (const line of lines) {
        // Buscar patrón [timestamp] Speaker: message
        const match = line.match(/^\[(.+?)\]\s+(\w+):\s+(.+)$/);
        if (match) {
          const [, timestamp, speaker, message] = match;
          messages.push({
            speaker: speaker.toLowerCase(),
            message: message.trim(),
            timestamp: timestamp.trim()
          });
        }
      }
      
      return messages;
    } catch {
      return [];
    }
  }, []);

  // Actualizar conversación sin parpadeos
  const updateConversation = useCallback((newConversation: ConversationMessage[]) => {
    setConversation(prev => {
      // Si no hay cambios, no actualizar
      if (JSON.stringify(prev) === JSON.stringify(newConversation)) {
        return prev;
      }
      
      // Auto-scroll si el usuario no ha hecho scroll manual
      if (!userScrolledAwayRef.current && conversationScrollRef.current) {
        setTimeout(() => {
          conversationScrollRef.current?.scrollTo({
            top: conversationScrollRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }, 100);
      }
      
      return newConversation;
    });
  }, []);

  // Efecto para suscribirse a cambios en tiempo real de la llamada
  useEffect(() => {
    // Limpiar canal anterior
    try {
      realtimeChannelRef.current?.unsubscribe?.();
    } catch {}
    realtimeChannelRef.current = null;

    if (!isOpen || !call.call_id || call.call_status !== 'activa') {
      setConversation([]);
      return;
    }

    // Cargar estado inicial
    setCurrentCall(call);
    updateConversation(parseConversation(call.conversacion_completa));

    // Suscribirse a cambios de la llamada específica
    const channel = analysisSupabase
      .channel(`dashboard-call-${call.call_id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'llamadas_ventas',
        filter: `call_id=eq.${call.call_id}`
      }, (payload) => {
        const rec = payload.new as any;
        if (!rec) return;
        
        // Actualizar conversación
        const newConversation = parseConversation(rec.conversacion_completa);
        updateConversation(newConversation);
        
        // Parsear datos_proceso si es string
        let datosProcesoActualizados = rec.datos_proceso;
        if (typeof rec.datos_proceso === 'string') {
          try {
            datosProcesoActualizados = JSON.parse(rec.datos_proceso);
          } catch (e) {
            datosProcesoActualizados = currentCall.datos_proceso;
          }
        }
        
        // Parsear datos_llamada para obtener resumen actualizado
        let datosLlamadaActualizados = rec.datos_llamada;
        if (typeof rec.datos_llamada === 'string') {
          try {
            datosLlamadaActualizados = JSON.parse(rec.datos_llamada);
          } catch (e) {
            datosLlamadaActualizados = currentCall.datos_llamada;
          }
        }
        
        // Extraer campos específicos de datos_proceso para actualización en tiempo real
        // (igual que LiveMonitorKanban - líneas 1401-1409)
        const composicionFamiliarNumero = datosProcesoActualizados?.numero_personas || 
          rec.composicion_familiar_numero || 
          currentCall.composicion_familiar_numero;
        
        const destinoPreferido = rec.destino_preferido || 
          datosProcesoActualizados?.destino_preferencia || 
          currentCall.destino_preferido;
        
        const tipoActividades = datosProcesoActualizados?.tipo_actividades || 
          (currentCall as any).tipo_actividades;
        
        // Actualizar datos de la llamada con preferencias extraídas
        setCurrentCall(prev => ({
          ...prev,
          ...rec,
          datos_proceso: datosProcesoActualizados,
          datos_llamada: datosLlamadaActualizados,
          // Actualizar campos específicos de preferencias desde datos_proceso
          composicion_familiar_numero: composicionFamiliarNumero,
          destino_preferido: destinoPreferido,
          // Mantener otros campos existentes si no vienen en la actualización
          tamano_grupo: rec.tamano_grupo || prev.tamano_grupo,
          ciudad_residencia: rec.ciudad_residencia || prev.ciudad_residencia,
          nivel_interes: rec.nivel_interes || prev.nivel_interes,
          nivel_interes_detectado: (rec as any).nivel_interes_detectado || (prev as any).nivel_interes_detectado
        }));
        
        // Si la llamada ya no está activa, cerrar el modal
        if (rec.call_status !== 'activa') {
          onClose();
        }
      })
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      try {
        channel.unsubscribe();
      } catch {}
      realtimeChannelRef.current = null;
    };
  }, [call.call_id, call.call_status, isOpen]);

  // Helper para renderizar campos
  const renderField = (label: string, value: any, formatter?: (val: any) => string) => {
    if (value === null || value === undefined || value === '') return null;
    const displayValue = formatter ? formatter(value) : String(value);
    return (
      <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-900 dark:text-white text-right max-w-[60%] truncate" title={displayValue}>
          {displayValue}
        </span>
      </div>
    );
  };

  // Obtener datos dinámicos de datos_proceso
  const getDynamicData = useCallback(() => {
    try {
      const datosProc = typeof currentCall.datos_proceso === 'string'
        ? JSON.parse(currentCall.datos_proceso)
        : currentCall.datos_proceso;
      return datosProc || {};
    } catch {
      return {};
    }
  }, [currentCall.datos_proceso]);

  // Obtener resumen de datos_llamada
  const getResumen = useCallback(() => {
    try {
      const datosLlamada = typeof currentCall.datos_llamada === 'string'
        ? JSON.parse(currentCall.datos_llamada)
        : currentCall.datos_llamada;
      return datosLlamada?.resumen || currentCall.resumen_llamada || null;
    } catch {
      return currentCall.resumen_llamada || null;
    }
  }, [currentCall.datos_llamada, currentCall.resumen_llamada]);

  const dynamicData = getDynamicData();
  const resumen = getResumen();

  // Función para transferir llamada
  const handleTransferCall = async (reason: string) => {
    if (!currentCall?.call_id) {
      alert('No se encontró ID de llamada');
      return;
    }

    setTransferLoading(true);
    
    try {
      // Extraer contexto adicional de datos_llamada y datos_proceso
      let contextData = {};
      try {
        if (currentCall.datos_llamada) {
          const datosLlamada = typeof currentCall.datos_llamada === 'string' 
            ? JSON.parse(currentCall.datos_llamada) 
            : currentCall.datos_llamada;
          contextData = { ...contextData, ...datosLlamada };
        }
        
        if (currentCall.datos_proceso) {
          const datosProc = typeof currentCall.datos_proceso === 'string' 
            ? JSON.parse(currentCall.datos_proceso) 
            : currentCall.datos_proceso;
          contextData = { ...contextData, datos_proceso: datosProc };
        }
      } catch (e) {
        // No se pudo extraer contexto adicional
      }

      const finalMessage = reason;

      // Verificar que control_url esté disponible, si no, intentar obtenerlo de la BD
      let controlUrl = currentCall.control_url;
      
      if (!controlUrl) {
        try {
          const { data: callData, error } = await analysisSupabase
            .from('llamadas_ventas')
            .select('control_url')
            .eq('call_id', currentCall.call_id)
            .single();
          
          if (error || !callData?.control_url) {
            alert('Error: No se encontró la URL de control de la llamada. La llamada puede haber finalizado.');
            setTransferLoading(false);
            return;
          }
          
          controlUrl = callData.control_url;
          
          // Actualizar currentCall con el control_url obtenido
          setCurrentCall(prev => ({ ...prev, control_url: controlUrl }));
        } catch (err) {
          alert('Error: No se pudo obtener la URL de control de la llamada. La llamada puede haber finalizado.');
          setTransferLoading(false);
          return;
        }
      }

      const transferData = {
        action: "transfer",
        call_id: currentCall.call_id,
        control_url: controlUrl,
        message: finalMessage,
        destination: {
          number: "+523222264000",
          extension: "60973"
        },
        call_context: {
          fecha_llamada: currentCall.fecha_llamada,
          duracion_segundos: currentCall.duracion_segundos,
          call_status: currentCall.call_status,
          nivel_interes: currentCall.nivel_interes,
          tipo_llamada: currentCall.tipo_llamada,
          precio_ofertado: currentCall.precio_ofertado,
          costo_total: currentCall.costo_total,
          prospecto_id: currentCall.prospecto_id,
          nombre_completo: currentCall.nombre_completo,
          nombre_whatsapp: currentCall.nombre_whatsapp,
          whatsapp: currentCall.whatsapp,
          email: currentCall.email,
          ciudad_residencia: currentCall.ciudad_residencia,
          estado_civil: currentCall.estado_civil,
          edad: currentCall.edad,
          checkpoint_venta_actual: currentCall.checkpoint_venta_actual,
          composicion_familiar_numero: currentCall.composicion_familiar_numero,
          destino_preferido: currentCall.destino_preferido,
          preferencia_vacaciones: currentCall.preferencia_vacaciones,
          numero_noches: currentCall.numero_noches,
          mes_preferencia: currentCall.mes_preferencia,
          propuesta_economica_ofrecida: currentCall.propuesta_economica_ofrecida,
          habitacion_ofertada: currentCall.habitacion_ofertada,
          resort_ofertado: currentCall.resort_ofertado,
          principales_objeciones: currentCall.principales_objeciones,
          resumen_llamada: currentCall.resumen_llamada,
          ...contextData
        }
      };

      const response = await fetch('https://primary-dev-d75a.up.railway.app/webhook/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transferData)
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            await response.json();
          } catch (e) {
            // Error parseando JSON
          }
        } else {
          await response.text();
        }
        
        setShowTransferModal(false);
        setSelectedPresetReason('');
        setCustomTransferMessage('');
        setCustomTransferText('');
        
        alert('Transferencia solicitada exitosamente');
      } else {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = `Error ${response.status}: ${response.statusText}`;
        }
        alert(`Error al transferir la llamada: ${response.status} - ${errorText.substring(0, 100)}`);
      }
    } catch (error) {
      alert(`Error al transferir la llamada: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setTransferLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800"
        >
          {/* Header */}
          <div className="relative px-6 py-5 bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar con indicador de llamada activa */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="relative"
                >
                  <div className="relative">
                    <Avatar
                      name={currentCall.nombre_completo || currentCall.nombre_whatsapp}
                      size="xl"
                      showIcon={false}
                      className="rounded-xl"
                    />
                  </div>
                  {/* Indicador pulsante de llamada activa */}
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900 shadow-lg">
                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
                  </div>
                </motion.div>

                <div className="flex-1 min-w-0">
                  <motion.h3
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-xl font-bold text-gray-900 dark:text-white truncate"
                  >
                    {currentCall.nombre_completo || currentCall.nombre_whatsapp || 'Sin nombre'}
                  </motion.h3>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center gap-3 mt-1"
                  >
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                      <Phone className="w-3 h-3" />
                      Llamada Activa
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      <TrendingUp className="w-3 h-3" />
                      {currentCall.checkpoint_venta_actual || 'Checkpoint #1'}
                    </span>
                  </motion.div>
                </div>
              </div>

              <motion.button
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
            {/* Resumen en tiempo real */}
            {resumen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Resumen
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    En vivo
                  </div>
                </div>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed">
                  {resumen}
                </p>
              </motion.div>
            )}

            {/* Grid de información */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Información del Prospecto */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    Prospecto
                  </h4>
                </div>
                <div className="space-y-1 text-xs">
                  {renderField('Teléfono', currentCall.whatsapp)}
                  {renderField('Ciudad', currentCall.ciudad_residencia)}
                  {renderField('Campaña', currentCall.campana_origen)}
                </div>
              </motion.div>

              {/* Información del Viaje */}
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-purple-500" />
                    Viaje
                  </h4>
                </div>
                <div className="space-y-1 text-xs">
                  {renderField('Destino', 
                    currentCall.destino_preferido || 
                    dynamicData.destino_preferencia ||
                    (Array.isArray(currentCall.destino_preferencia) ? currentCall.destino_preferencia.join(', ') : currentCall.destino_preferencia)
                  )}
                  {renderField('Grupo', 
                    dynamicData.numero_personas || 
                    currentCall.composicion_familiar_numero || 
                    currentCall.tamano_grupo,
                    (val) => `${val} personas`
                  )}
                  {renderField('Actividades', 
                    dynamicData.tipo_actividades || 
                    (currentCall as any).tipo_actividades
                  )}
                  {renderField('Menores', currentCall.cantidad_menores)}
                </div>
              </motion.div>
            </div>

            {/* Conversación en Tiempo Real */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                  Conversación en Tiempo Real
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  En vivo
                </div>
              </div>
              
              <div 
                ref={conversationScrollRef}
                className="max-h-64 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                  userScrolledAwayRef.current = distanceFromBottom > 100;
                }}
              >
                {conversation.length > 0 ? (
                  <div className="space-y-3">
                    {conversation.map((msg, index) => (
                      <motion.div
                        key={`${msg.timestamp}-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`flex ${msg.speaker === 'agente' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                          msg.speaker === 'agente'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 rounded-tl-sm'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100 rounded-tr-sm'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium opacity-75">
                              {msg.speaker === 'agente' ? '🤖 IA' : '👤 Cliente'}
                            </span>
                            <span className="text-xs opacity-50">{msg.timestamp}</span>
                          </div>
                          <p className="text-sm leading-relaxed">{msg.message}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center gap-1.5 text-gray-400 mb-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Esperando conversación...
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                {currentCall.duracion_segundos && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {Math.floor(currentCall.duracion_segundos / 60)}:{(currentCall.duracion_segundos % 60).toString().padStart(2, '0')}
                  </span>
                )}
                {currentCall.nivel_interes && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    currentCall.nivel_interes === 'Alto' || currentCall.nivel_interes === 'MUY_ALTO'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : currentCall.nivel_interes === 'Medio' || currentCall.nivel_interes === 'MEDIO'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    Interés: {currentCall.nivel_interes}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* Botón de Solicitar Transferencia - Solo para llamadas activas */}
                {currentCall.call_status === 'activa' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowTransferModal(true)}
                    disabled={transferLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 flex items-center gap-2"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    {transferLoading ? 'Transfiriendo...' : 'Solicitar Transferencia'}
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cerrar
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>

      {/* Modal de Transferencia */}
      <AnimatePresence>
      {showTransferModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-[90]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTransferModal(false);
              setSelectedPresetReason('');
              setCustomTransferMessage('');
              setCustomTransferText('');
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-100 dark:border-gray-800"
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <motion.h3
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-2xl font-bold text-gray-900 dark:text-white mb-1 flex items-center"
                  >
                    <ArrowRightLeft className="w-6 h-6 mr-2 text-blue-500" />
                    Solicitar Transferencia
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed"
                  >
                    Selecciona o escribe una razón para la transferencia
                  </motion.p>
                </div>
                <motion.button
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => {
                    setShowTransferModal(false);
                    setSelectedPresetReason('');
                    setCustomTransferMessage('');
                    setCustomTransferText('');
                  }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group flex-shrink-0"
                  title="Cerrar"
                >
                  <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="px-8 py-6 overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {/* Razones Predefinidas */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Razones Rápidas
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {transferReasons.map((reason, index) => (
                    <motion.button
                      key={reason.short}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.25 + index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedPresetReason(reason.short);
                        setCustomTransferMessage('');
                        setCustomTransferText('');
                      }}
                      className={`px-5 py-4 text-sm font-medium rounded-xl transition-all duration-200 text-left ${
                        selectedPresetReason === reason.short
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 border-2 border-blue-500'
                          : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{reason.short}</span>
                        {selectedPresetReason === reason.short && (
                          <CheckCircle className="w-5 h-5" />
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Mensaje Personalizado */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="border-t border-gray-200 dark:border-gray-700 pt-6"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center">
                    <Wand2 className="w-4 h-4 mr-2 text-purple-500" />
                    Mensaje Personalizado
                  </h4>
                </div>
                
                {!customTransferMessage ? (
                  <div className="space-y-3">
                    <textarea
                      value={customTransferText}
                      onChange={(e) => {
                        setCustomTransferText(e.target.value);
                        setSelectedPresetReason('');
                      }}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                      rows={3}
                      placeholder="Escribe tu mensaje personalizado aquí..."
                    />
                    <motion.button
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (!customTransferText.trim()) {
                          alert('Por favor, escribe un mensaje antes de continuar');
                          return;
                        }
                        setCustomTransferMessage(customTransferText.trim());
                        setSelectedPresetReason('');
                      }}
                      disabled={!customTransferText.trim()}
                      className="w-full px-5 py-3 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-purple-500/25 flex items-center justify-center"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Usar Mensaje Personalizado
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="px-5 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl border-2 border-purple-500 shadow-lg shadow-purple-500/25">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-5 h-5 flex-shrink-0" />
                          <span className="font-semibold">Mensaje listo</span>
                        </div>
                      </div>
                      <p className="text-sm mt-2 opacity-90">{customTransferMessage}</p>
                    </div>
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setCustomTransferMessage('');
                        setCustomTransferText('');
                      }}
                      className="w-full px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                    >
                      Cambiar mensaje
                    </motion.button>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedPresetReason('');
                  setCustomTransferMessage('');
                  setCustomTransferText('');
                }}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                Cancelar
              </motion.button>
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  let finalReason = '';
                  if (selectedPresetReason) {
                    const preset = transferReasons.find(r => r.short === selectedPresetReason);
                    finalReason = preset ? preset.full : selectedPresetReason;
                  } else if (customTransferMessage) {
                    finalReason = customTransferMessage;
                  }
                  
                  if (!finalReason || !finalReason.trim()) {
                    alert('Por favor, selecciona una razón o escribe un mensaje personalizado');
                    return;
                  }
                  
                  handleTransferCall(finalReason);
                }}
                disabled={transferLoading || (!selectedPresetReason && !customTransferMessage)}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {transferLoading ? 'Transfiriendo...' : 'Transferir'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
};

