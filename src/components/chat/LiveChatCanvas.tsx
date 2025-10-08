import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Phone,
  Clock,
  User,
  MessageSquare,
  Circle,
  Send,
  X,
  Calendar,
  ChevronRight,
  GripVertical
} from 'lucide-react';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';

// Crear instancia única de análisis fuera del componente para evitar múltiples clientes
const createAnalysisSupabase = async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(
    'https://glsmifhkoaifvaegsozd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E'
  );
};

// Instancia global única
let analysisSupabaseInstance: any = null;

// ============================================
// INTERFACES
// ============================================

interface Conversation {
  id: string;
  conversation_id: string;
  customer_phone: string;
  customer_name: string;
  customer_email?: string;
  status: string;
  message_count: number;
  priority: string;
  last_message_at: string;
  metadata: any;
  created_at: string;
}

interface Message {
  id: string;
  message_id: string;
  conversation_id: string;
  sender_type: 'customer' | 'bot' | 'agent';
  sender_name?: string;
  content?: string;
  is_read: boolean;
  created_at: string;
}

interface ConversationBlock {
  date: string;
  message_count: number;
  first_message_time: string;
  last_message_time: string;
  messages: Message[];
}

// ============================================
// COMPONENTE PRINCIPAL - LIENZO CON SECCIONES FIJAS
// ============================================

const LiveChatCanvas: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversationBlocks, setConversationBlocks] = useState<ConversationBlock[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Estados para sincronización silenciosa
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [syncInProgress, setSyncInProgress] = useState(false);

  // Estados para control del bot
  const [botPauseStatus, setBotPauseStatus] = useState<{[uchatId: string]: {
    isPaused: boolean;
    pausedUntil: Date | null;
    pausedBy: string;
    duration: number; // en minutos
  }}>({});

  // Estados para caché de mensajes enviados
  const [cachedMessages, setCachedMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<Set<string>>(new Set());

  // Estado de distribución de columnas (guardado en localStorage)
  const [columnWidths, setColumnWidths] = useState(() => {
    const saved = localStorage.getItem('livechat-column-widths');
    return saved ? JSON.parse(saved) : { conversations: 320, blocks: 280 };
  });

  // Estado del sidebar (para ajustar posición)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Detectar estado real del sidebar desde las clases CSS del contenido principal
    const mainContent = document.querySelector('.flex-1.flex.flex-col');
    if (mainContent && mainContent.classList.contains('lg:ml-16')) {
      return true; // Sidebar colapsado
    }
    return false; // Sidebar expandido por defecto
  });

  // Referencias para scroll y redimensionamiento
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const conversationsScrollRef = useRef<HTMLDivElement>(null);
  const blocksScrollRef = useRef<HTMLDivElement>(null);

  const [metrics, setMetrics] = useState({
    totalConversations: 0,
    activeConversations: 0,
    transferredConversations: 0,
    closedConversations: 0,
    handoffRate: 0
  });

  // ============================================
  // EFECTOS
  // ============================================

  useEffect(() => {
    loadConversations();
    loadMetrics();
  }, []);

  // Efecto separado para selección automática después de cargar conversaciones
  useEffect(() => {
    // Verificar si hay un prospecto específico para seleccionar
    const prospectoId = localStorage.getItem('livechat-prospect-id');
    if (prospectoId && conversations.length > 0) {
      localStorage.removeItem('livechat-prospect-id');
      selectConversationByProspectId(prospectoId);
    }
  }, [conversations]); // Se ejecuta cuando las conversaciones cambian

  const selectConversationByProspectId = (prospectoId: string) => {
    // Método 1: Buscar por prospect_id en metadata
    let conversation = conversations.find(conv => 
      conv.metadata?.prospect_id === prospectoId
    );
    
    if (conversation) {
      setSelectedConversation(conversation);
      return;
    }
    
    // Método 2: Buscar por whatsapp del prospecto
    loadProspectoAndFindConversation(prospectoId);
  };

  const loadProspectoAndFindConversation = async (prospectoId: string) => {
    try {
      const { data: prospecto, error } = await analysisSupabase
        .from('prospectos')
        .select('whatsapp, id_uchat')
        .eq('id', prospectoId)
        .single();

      if (error || !prospecto) return;

      // Buscar por whatsapp (customer_phone)
      let conversation = conversations.find(conv => 
        conv.customer_phone === prospecto.whatsapp
      );

      if (conversation) {
        setSelectedConversation(conversation);
        return;
      }

      // Buscar variaciones de teléfono
      const phoneVariations = [
        prospecto.whatsapp,
        prospecto.whatsapp.replace('+52', ''),
        prospecto.whatsapp.replace('52', ''),
        `+52${prospecto.whatsapp}`,
        `52${prospecto.whatsapp}`
      ];

      for (const phoneVar of phoneVariations) {
        conversation = conversations.find(conv => 
          conv.customer_phone === phoneVar || 
          conv.customer_phone.includes(phoneVar) ||
          phoneVar.includes(conv.customer_phone)
        );
        
        if (conversation) {
          setSelectedConversation(conversation);
          return;
        }
      }

      // Buscar por id_uchat
      if (prospecto.id_uchat) {
        conversation = conversations.find(conv => 
          conv.conversation_id === prospecto.id_uchat
        );

        if (conversation) {
          setSelectedConversation(conversation);
          return;
        }
      }

    } catch (error) {
      // Silencioso
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      loadMessagesAndBlocks(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    // SCROLL AL FINAL para mostrar últimos mensajes
    scrollToBottom();
  }, [allMessages]);

  useEffect(() => {
    // Guardar distribución de columnas en localStorage
    localStorage.setItem('livechat-column-widths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  useEffect(() => {
    // Detectar cambios en el sidebar observando las clases CSS del contenido principal
    const detectSidebarState = () => {
      const mainContent = document.querySelector('.flex-1.flex.flex-col');
      if (mainContent) {
        const isCollapsed = mainContent.classList.contains('lg:ml-16');
        setSidebarCollapsed(isCollapsed);
        console.log('🔍 Sidebar detectado:', isCollapsed ? 'Colapsado' : 'Expandido');
      }
    };

    // Observar cambios en las clases del contenido principal
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          detectSidebarState();
        }
      });
    });

    // Buscar el contenido principal y observarlo
    const mainContent = document.querySelector('.flex-1.flex.flex-col');
    if (mainContent) {
      observer.observe(mainContent, { 
        attributes: true, 
        attributeFilter: ['class']
      });
    }

    // Verificar estado inicial
    detectSidebarState();

    // También observar cambios en el tamaño de ventana
    const handleResize = () => {
      detectSidebarState();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    // Sincronización silenciosa cada 15 segundos (solo si no hay usuario escribiendo)
    const syncInterval = setInterval(async () => {
      // No sincronizar si el usuario está escribiendo
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );
      
      if (!isTyping && !sending) {
        await performSilentSync();
      }
    }, 15000);

    return () => clearInterval(syncInterval);
  }, [sending]);

  useEffect(() => {
    // Sincronización constante para conversación abierta cada 10 segundos
    if (!selectedConversation) return;

    const conversationSyncInterval = setInterval(async () => {
      // No sincronizar si el usuario está escribiendo
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );
      
      if (!isTyping && !sending) {
        await syncMessagesForOpenConversation();
      }
    }, 10000);

    return () => clearInterval(conversationSyncInterval);
  }, [selectedConversation, sending]);

  useEffect(() => {
    // Cargar estado de pausa desde localStorage al iniciar
    const loadBotPauseStatus = () => {
      const savedPauseStatus = localStorage.getItem('bot-pause-status');
      if (savedPauseStatus) {
        try {
          const parsed = JSON.parse(savedPauseStatus);
          const currentTime = new Date();
          
        // Filtrar pausas que ya expiraron
        const activePauses: any = {};
        Object.entries(parsed).forEach(([uchatId, status]: [string, any]) => {
          if (status.pausedUntil) {
            const pausedUntilTime = new Date(status.pausedUntil).getTime();
            const timeRemaining = pausedUntilTime - currentTime.getTime();
            
            console.log(`🔍 Verificando pausa para ${uchatId}:`);
            console.log(`  - Pausado hasta: ${new Date(status.pausedUntil).toLocaleString()}`);
            console.log(`  - Tiempo actual: ${currentTime.toLocaleString()}`);
            console.log(`  - Tiempo restante: ${Math.floor(timeRemaining / 1000)} segundos`);
            
            if (timeRemaining > 0) {
              activePauses[uchatId] = {
                ...status,
                pausedUntil: new Date(status.pausedUntil)
              };
              console.log(`✅ Pausa activa para ${uchatId}`);
            } else {
              console.log(`❌ Pausa expirada para ${uchatId}`);
            }
          }
        });
        
        setBotPauseStatus(activePauses);
        console.log(`🔄 Estado de pausa cargado: ${Object.keys(activePauses).length} bots pausados`);
        } catch (error) {
          console.error('❌ Error cargando estado de pausa:', error);
        }
      }
    };

    loadBotPauseStatus();
  }, []);

  useEffect(() => {
    // Timer para actualizar contador cada segundo
    const timer = setInterval(() => {
      const currentTime = new Date().getTime();
      
      setBotPauseStatus(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        
        Object.entries(updated).forEach(([uchatId, status]) => {
          if (status.isPaused && status.pausedUntil) {
            const pausedUntilTime = status.pausedUntil instanceof Date 
              ? status.pausedUntil.getTime() 
              : new Date(status.pausedUntil).getTime();
            
            // Solo reactivar si realmente ha expirado (con margen de 2 segundos)
            if (currentTime > pausedUntilTime + 2000) {
              delete updated[uchatId];
              hasChanges = true;
              console.log(`⏰ Bot reactivado automáticamente para ${uchatId} (tiempo expirado)`);
            }
          }
        });
        
        if (hasChanges) {
          // Actualizar localStorage
          const storageData = Object.fromEntries(
            Object.entries(updated).map(([id, status]) => [
              id, 
              { 
                ...status, 
                pausedUntil: status.pausedUntil instanceof Date 
                  ? status.pausedUntil.toISOString() 
                  : status.pausedUntil 
              }
            ])
          );
          localStorage.setItem('bot-pause-status', JSON.stringify(storageData));
        }
        
        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ============================================
  // MÉTODOS DE REDIMENSIONAMIENTO
  // ============================================

  const handleMouseDown = (e: React.MouseEvent, resizeType: 'conversations' | 'blocks') => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startWidths = { ...columnWidths };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      const deltaX = e.clientX - startX;

      if (resizeType === 'conversations') {
        const newWidth = Math.max(250, Math.min(500, startWidths.conversations + deltaX));
        setColumnWidths({
          ...columnWidths,
          conversations: newWidth
        });
      } else if (resizeType === 'blocks') {
        const newWidth = Math.max(200, Math.min(400, startWidths.blocks + deltaX));
        setColumnWidths({
          ...columnWidths,
          blocks: newWidth
        });
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // ============================================
  // MÉTODOS DE CARGA
  // ============================================

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabaseSystemUI
        .from('uchat_conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error:', error);
        setConversations([]);
        return;
      }

      setConversations(data || []);
    } catch (error) {
      console.error('❌ Error cargando conversaciones:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const { data: conversations } = await supabaseSystemUI
        .from('uchat_conversations')
        .select('*');

      const totalConversations = conversations?.length || 0;
      const activeConversations = conversations?.filter(c => c.status === 'active').length || 0;
      const transferredConversations = conversations?.filter(c => c.status === 'transferred').length || 0;
      const closedConversations = conversations?.filter(c => c.status === 'closed').length || 0;

      setMetrics({
        totalConversations,
        activeConversations,
        transferredConversations,
        closedConversations,
        handoffRate: totalConversations > 0 ? (transferredConversations / totalConversations) * 100 : 0
      });
    } catch (error) {
      console.error('Error cargando métricas:', error);
    }
  };

  const loadMessagesAndBlocks = async (conversationId: string) => {
    try {
      
      const { data: messages, error } = await supabaseSystemUI
        .from('uchat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error cargando mensajes:', error);
        setAllMessages([]);
        setConversationBlocks([]);
        return;
      }

      console.log(`✅ ${messages.length} mensajes REALES cargados`);
      setAllMessages(messages || []);

      // Agrupar mensajes en bloques de 24 horas
      const blocks = groupMessagesByDay(messages || []);
      setConversationBlocks(blocks);

      // Marcar mensajes como leídos
      await markMessagesAsRead(conversationId);
    } catch (error) {
      console.error('❌ Error en loadMessagesAndBlocks:', error);
    }
  };

  const groupMessagesByDay = (messages: Message[]): ConversationBlock[] => {
    const blocks: { [date: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toISOString().split('T')[0];
      if (!blocks[date]) {
        blocks[date] = [];
      }
      blocks[date].push(message);
    });

    return Object.entries(blocks)
      .map(([date, msgs]) => ({
        date,
        message_count: msgs.length,
        first_message_time: msgs[0].created_at,
        last_message_time: msgs[msgs.length - 1].created_at,
        messages: msgs
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const markMessagesAsRead = async (conversationId: string) => {
    try {
      await supabaseSystemUI
        .from('uchat_messages')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('conversation_id', conversationId)
        .eq('is_read', false);
    } catch (error) {
      console.error('❌ Error marcando como leído:', error);
    }
  };

  // ============================================
  // MÉTODOS DE SINCRONIZACIÓN REAL
  // ============================================

  const performSilentSync = async () => {
    if (syncInProgress) return;
    
    try {
      setSyncInProgress(true);

      await syncNewConversations();
      await syncNewMessages();

      setLastSyncTime(new Date());
    } catch (error) {
      console.error('❌ Error en sincronización silenciosa:', error);
    } finally {
      setSyncInProgress(false);
    }
  };

  const syncNewConversations = async () => {
    try {
      
      if (!analysisSupabaseInstance) {
        analysisSupabaseInstance = await createAnalysisSupabase();
      }
      const analysisSupabase = analysisSupabaseInstance;

      // 1. Obtener prospectos activos con id_uchat
      const { data: activeProspects, error: prospectsError } = await analysisSupabase
        .from('prospectos')
        .select('id, nombre_whatsapp, whatsapp, id_uchat, etapa, updated_at, email')
        .not('id_uchat', 'is', null)
        .in('etapa', ['Interesado', 'Validando si es miembro', 'Primer contacto'])
        .order('updated_at', { ascending: false });

      if (prospectsError || !activeProspects) {
        console.error('❌ Error obteniendo prospectos:', prospectsError);
        return;
      }

      // 2. Verificar cuáles ya existen en uchat_conversations
      const uchatIds = activeProspects.map(p => p.id_uchat);
      const { data: existingConversations, error: existingError } = await supabaseSystemUI
        .from('uchat_conversations')
        .select('conversation_id')
        .in('conversation_id', uchatIds);

      if (existingError) {
        console.error('❌ Error verificando conversaciones existentes:', existingError);
        return;
      }

      const existingIds = existingConversations.map(c => c.conversation_id);
      const newProspects = activeProspects.filter(p => !existingIds.includes(p.id_uchat));

      if (newProspects.length === 0) {
        return; // No hay nuevas conversaciones
      }

      console.log(`🆕 Nuevas conversaciones a sincronizar: ${newProspects.length}`);

      // 3. Obtener bot por defecto
      const { data: bot, error: botError } = await supabaseSystemUI
        .from('uchat_bots')
        .select('id')
        .limit(1)
        .single();

      if (botError || !bot) {
        console.error('❌ Error obteniendo bot:', botError);
        return;
      }

      // 4. Crear nuevas conversaciones
      const newConversations = newProspects.map(prospect => ({
        conversation_id: prospect.id_uchat,
        bot_id: bot.id,
        customer_phone: prospect.whatsapp,
        customer_name: prospect.nombre_whatsapp || 'Cliente sin nombre',
        customer_email: prospect.email,
        status: 'active',
        message_count: 0,
        priority: 'medium',
        last_message_at: prospect.updated_at,
        platform: 'whatsapp',
        handoff_enabled: false,
        metadata: {
          source: 'uchat_real_sync',
          prospect_id: prospect.id,
          etapa: prospect.etapa,
          id_uchat: prospect.id_uchat
        }
      }));

      const { data: insertedConversations, error: insertError } = await supabaseSystemUI
        .from('uchat_conversations')
        .insert(newConversations)
        .select();

      if (insertError) {
        console.error('❌ Error insertando conversaciones:', insertError);
        return;
      }

      console.log(`✅ ${insertedConversations.length} nuevas conversaciones sincronizadas`);

      // 5. Sincronizar mensajes para cada nueva conversación
      for (const conv of insertedConversations) {
        await syncMessagesForConversation(conv.id, conv.metadata.prospect_id);
      }

      // 6. Actualizar estado SILENCIOSAMENTE
      setConversations(prev => {
        const updated = [...prev, ...insertedConversations].sort((a, b) => 
          new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
        );
        return updated;
      });

    } catch (error) {
      console.error('❌ Error en syncNewConversations:', error);
    }
  };

  const syncNewMessages = async () => {
    try {
      
      if (!selectedConversation) return;

      const prospectId = selectedConversation.metadata?.prospect_id;
      if (!prospectId) return;

      if (!analysisSupabaseInstance) {
        analysisSupabaseInstance = await createAnalysisSupabase();
      }
      const analysisSupabase = analysisSupabaseInstance;

      // Obtener mensajes nuevos desde lastSyncTime
      const { data: newMessages, error: messagesError } = await analysisSupabase
        .from('mensajes_whatsapp')
        .select('*')
        .eq('prospecto_id', prospectId)
        .gte('fecha_hora', lastSyncTime.toISOString())
        .order('fecha_hora', { ascending: true });

      if (messagesError || !newMessages || newMessages.length === 0) {
        return; // No hay mensajes nuevos
      }

      console.log(`📱 ${newMessages.length} mensajes nuevos encontrados`);

      // Filtrar mensajes que ya existen
      const existingMessageIds = allMessages.map(m => m.message_id);
      const messagesToInsert = newMessages
        .filter(msg => !existingMessageIds.includes(`real_${msg.id}`))
        .map(msg => ({
          message_id: `real_${msg.id}`,
          conversation_id: selectedConversation.id,
          sender_type: msg.rol === 'Prospecto' ? 'customer' : msg.rol === 'AI' ? 'bot' : 'agent',
          sender_name: msg.rol === 'Prospecto' ? selectedConversation.customer_name : 'Bot Vidanta',
          content: msg.mensaje,
          is_read: true,
          created_at: msg.fecha_hora
        }));

      if (messagesToInsert.length === 0) {
        return; // No hay mensajes realmente nuevos
      }

      // Insertar nuevos mensajes
      const { error: insertError } = await supabaseSystemUI
        .from('uchat_messages')
        .insert(messagesToInsert);

      if (insertError) {
        console.error('❌ Error insertando mensajes:', insertError);
        return;
      }

      console.log(`✅ ${messagesToInsert.length} mensajes sincronizados`);

      // Actualizar estado SILENCIOSAMENTE
      setAllMessages(prev => {
        const updated = [...prev, ...messagesToInsert].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return updated;
      });

      // Actualizar contador de mensajes
      await supabaseSystemUI
        .from('uchat_conversations')
        .update({ 
          message_count: selectedConversation.message_count + messagesToInsert.length,
          last_message_at: new Date().toISOString()
        })
        .eq('id', selectedConversation.id);

    } catch (error) {
      console.error('❌ Error en syncNewMessages:', error);
    }
  };

  const syncMessagesForConversation = async (conversationId: string, prospectId: string) => {
    try {
      if (!analysisSupabaseInstance) {
        analysisSupabaseInstance = await createAnalysisSupabase();
      }
      const analysisSupabase = analysisSupabaseInstance;

      // Obtener mensajes recientes (últimos 10)
      const { data: recentMessages, error: messagesError } = await analysisSupabase
        .from('mensajes_whatsapp')
        .select('*')
        .eq('prospecto_id', prospectId)
        .order('fecha_hora', { ascending: true })
        .limit(10);

      if (messagesError || !recentMessages) {
        console.error('❌ Error obteniendo mensajes para conversación:', messagesError);
        return;
      }

      if (recentMessages.length === 0) return;

      const messagesToInsert = recentMessages.map(msg => ({
        message_id: `real_${msg.id}`,
        conversation_id: conversationId,
        sender_type: msg.rol === 'Prospecto' ? 'customer' : msg.rol === 'AI' ? 'bot' : 'agent',
        sender_name: msg.rol === 'Prospecto' ? 'Cliente' : 'Bot Vidanta',
        content: msg.mensaje,
        is_read: true,
        created_at: msg.fecha_hora
      }));

      const { error: insertError } = await supabaseSystemUI
        .from('uchat_messages')
        .insert(messagesToInsert);

      if (!insertError) {
        console.log(`✅ ${messagesToInsert.length} mensajes iniciales sincronizados`);
        
        // Actualizar contador y timestamp
        await supabaseSystemUI
          .from('uchat_conversations')
          .update({ 
            message_count: messagesToInsert.length,
            last_message_at: new Date().toISOString()
          })
          .eq('id', conversationId);
      }

    } catch (error) {
      console.error('❌ Error en syncMessagesForConversation:', error);
    }
  };

  const syncMessagesForOpenConversation = async () => {
    if (!selectedConversation || syncInProgress) return;

    try {
      const prospectId = selectedConversation.metadata?.prospect_id;
      if (!prospectId) return;


      if (!analysisSupabaseInstance) {
        analysisSupabaseInstance = await createAnalysisSupabase();
      }
      const analysisSupabase = analysisSupabaseInstance;

      // Obtener mensajes recientes (últimas 2 horas)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      
      const { data: recentMessages, error: messagesError } = await analysisSupabase
        .from('mensajes_whatsapp')
        .select('*')
        .eq('prospecto_id', prospectId)
        .gte('fecha_hora', twoHoursAgo)
        .order('fecha_hora', { ascending: true });

      if (messagesError || !recentMessages) {
        return;
      }

      // Verificar mensajes que ya existen en la base de datos
      const { data: existingMessages, error: existingError } = await supabaseSystemUI
        .from('uchat_messages')
        .select('message_id')
        .eq('conversation_id', selectedConversation.id);

      if (existingError) {
        console.error('❌ Error verificando mensajes existentes:', existingError);
        return;
      }

      const existingMessageIds = existingMessages.map(m => m.message_id);
      const messagesToInsert = recentMessages
        .filter(msg => !existingMessageIds.includes(`real_${msg.id}`))
        .map(msg => ({
          message_id: `real_${msg.id}`,
          conversation_id: selectedConversation.id,
          sender_type: msg.rol === 'Prospecto' ? 'customer' : msg.rol === 'AI' ? 'bot' : 'agent',
          sender_name: msg.rol === 'Prospecto' ? selectedConversation.customer_name : 'Bot Vidanta',
          content: msg.mensaje,
          is_read: true,
          created_at: msg.fecha_hora
        }));

      if (messagesToInsert.length === 0) {
        return; // No hay mensajes nuevos
      }

      // Insertar nuevos mensajes con manejo de duplicados
      const { error: insertError } = await supabaseSystemUI
        .from('uchat_messages')
        .upsert(messagesToInsert, { 
          onConflict: 'message_id',
          ignoreDuplicates: true 
        });

      if (insertError) {
        console.error('❌ Error insertando mensajes nuevos:', insertError);
        return;
      }

      console.log(`✅ ${messagesToInsert.length} mensajes nuevos sincronizados para conversación abierta`);

      // Limpiar caché para mensajes que ahora están en BD
      messagesToInsert.forEach(realMessage => {
        cleanupCacheForRealMessage(realMessage);
      });

      // Actualizar estado SILENCIOSAMENTE
      setAllMessages(prev => {
        const updated = [...prev, ...messagesToInsert].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return updated;
      });

      // Actualizar contador
      setSelectedConversation(prev => prev ? {
        ...prev,
        message_count: prev.message_count + messagesToInsert.length
      } : null);

    } catch (error) {
      console.error('❌ Error en syncMessagesForOpenConversation:', error);
    }
  };

  // ============================================
  // MÉTODOS DE CONTROL DEL BOT
  // ============================================

  const pauseBot = async (uchatId: string, durationMinutes: number): Promise<boolean> => {
    try {
      console.log(`🤖 Pausando bot para ${uchatId} por ${durationMinutes} minutos...`);
      
      // TODO: Usar webhook cuando esté configurado
      // Por ahora usar solo estado local para evitar errores CORS
      console.log('💡 Usando estado local de pausa (webhook pendiente de configuración)');

      const pausedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
      
      // Guardar estado en localStorage para persistencia
      const pauseData = {
        isPaused: true,
        pausedUntil,
        pausedBy: 'agent',
        duration: durationMinutes
      };

      setBotPauseStatus(prev => ({
        ...prev,
        [uchatId]: pauseData
      }));

      // Persistir en localStorage
      const allPauseStatus = JSON.parse(localStorage.getItem('bot-pause-status') || '{}');
      allPauseStatus[uchatId] = {
        ...pauseData,
        pausedUntil: pausedUntil.toISOString()
      };
      localStorage.setItem('bot-pause-status', JSON.stringify(allPauseStatus));

      console.log(`✅ Bot pausado hasta: ${pausedUntil.toLocaleString()}`);
      console.log(`🔍 Debug - Tiempo actual: ${new Date().toLocaleString()}`);
      console.log(`🔍 Debug - Duración: ${durationMinutes} minutos`);
      console.log(`🔍 Debug - Estado guardado:`, pauseData);
      return true;
    } catch (error) {
      console.error('❌ Error pausando bot:', error);
      return false;
    }
  };

  const resumeBot = async (uchatId: string): Promise<boolean> => {
    try {
      console.log(`🤖 Reactivando bot para ${uchatId}...`);
      
      // TODO: Usar webhook cuando esté configurado
      // Por ahora usar solo estado local para evitar errores CORS
      console.log('💡 Usando estado local de reactivación (webhook pendiente de configuración)');

      setBotPauseStatus(prev => ({
        ...prev,
        [uchatId]: {
          isPaused: false,
          pausedUntil: null,
          pausedBy: '',
          duration: 0
        }
      }));

      // Actualizar localStorage
      const allPauseStatus = JSON.parse(localStorage.getItem('bot-pause-status') || '{}');
      delete allPauseStatus[uchatId];
      localStorage.setItem('bot-pause-status', JSON.stringify(allPauseStatus));

      console.log('✅ Bot reactivado');
      return true;
    } catch (error) {
      console.error('❌ Error reactivando bot:', error);
      return false;
    }
  };

  const getBotPauseTimeRemaining = (uchatId: string): number => {
    const status = botPauseStatus[uchatId];
    if (!status || !status.isPaused || !status.pausedUntil) return 0;
    
    const now = new Date().getTime();
    const pausedUntilTime = status.pausedUntil instanceof Date 
      ? status.pausedUntil.getTime() 
      : new Date(status.pausedUntil).getTime();
    
    const remaining = Math.max(0, pausedUntilTime - now);
    
    return Math.floor(remaining / 1000); // segundos restantes
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return '';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // ============================================
  // MÉTODOS DE CACHÉ DE MENSAJES
  // ============================================

  const getCombinedMessages = (): Message[] => {
    // Combinar mensajes reales de BD con mensajes en caché
    const realMessages = allMessages.filter(msg => !msg.message_id.startsWith('cache_'));
    const validCachedMessages = cachedMessages.filter(msg => {
      // Solo mostrar mensajes en caché que aún no han llegado desde la BD
      return !realMessages.some(realMsg => 
        realMsg.content === msg.content && 
        Math.abs(new Date(realMsg.created_at).getTime() - new Date(msg.created_at).getTime()) < 60000 // 1 minuto de diferencia
      );
    });
    
    return [...realMessages, ...validCachedMessages].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  };

  const addMessageToCache = (message: Message) => {
    setCachedMessages(prev => [...prev, message]);
    setPendingMessages(prev => new Set([...prev, message.message_id]));
    
    // Limpiar caché después de 5 minutos (por si el mensaje no llega desde BD)
    setTimeout(() => {
      setCachedMessages(prev => prev.filter(m => m.message_id !== message.message_id));
      setPendingMessages(prev => {
        const updated = new Set(prev);
        updated.delete(message.message_id);
        return updated;
      });
    }, 5 * 60 * 1000);
  };

  const cleanupCacheForRealMessage = (realMessage: Message) => {
    // Limpiar mensajes en caché que coincidan con el mensaje real
    setCachedMessages(prev => prev.filter(cachedMsg => {
      const isSameMessage = cachedMsg.content === realMessage.content && 
        Math.abs(new Date(cachedMsg.created_at).getTime() - new Date(realMessage.created_at).getTime()) < 60000;
      
      if (isSameMessage) {
        setPendingMessages(prevPending => {
          const updated = new Set(prevPending);
          updated.delete(cachedMsg.message_id);
          return updated;
        });
      }
      
      return !isSameMessage;
    }));
  };

  // ============================================
  // MÉTODOS DE ENVÍO
  // ============================================

  const sendMessageToUChat = async (message: string, uchatId: string): Promise<boolean> => {
    try {
      console.log('📤 Enviando mensaje a UChat via webhook...');
      console.log('📋 UChat ID:', uchatId);
      console.log('💬 Mensaje:', message);
      
      const webhookUrl = 'https://primary-dev-d75a.up.railway.app/webhook/send-message';
      const payload = {
        message: message,
        uchat_id: uchatId,
        type: 'text'
      };
      
      console.log('📦 Payload completo:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 200 || response.status === 201) {
        const data = await response.json();
        console.log('✅ Mensaje enviado exitosamente a UChat:', data);
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Error del webhook:', errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ Error enviando a UChat webhook:', error);
      return false;
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !selectedConversation) return;

    try {
      setSending(true);
      
      const cacheMessage: Message = {
        id: `cache-${Date.now()}`,
        message_id: `cache_${Date.now()}`,
        conversation_id: selectedConversation.id,
        sender_type: 'agent',
        sender_name: 'Agente',
        content: newMessage,
        is_read: true,
        created_at: new Date().toISOString()
      };

      const messageToSend = newMessage;
      setNewMessage('');

      // 1. Pausar bot automáticamente (15 min por defecto si no está pausado)
      const uchatId = selectedConversation.metadata?.id_uchat;
      let sentToUChat = false;
      
      if (uchatId) {
        const currentStatus = botPauseStatus[uchatId];
        if (!currentStatus || !currentStatus.isPaused) {
          console.log('🤖 Pausando bot automáticamente por 15 minutos antes de enviar...');
          await pauseBot(uchatId, 15);
        }
        
        // 2. Enviar mensaje a UChat (NO guardar en BD)
        sentToUChat = await sendMessageToUChat(messageToSend, uchatId);
      }

      if (sentToUChat) {
        
        // 3. Agregar al caché temporal (NO a BD)
        addMessageToCache(cacheMessage);
        
        // 4. Actualizar contador de conversación en BD y estado
        const newTimestamp = new Date().toISOString();
        
        // Actualizar en base de datos
        const { error: updateError } = await supabaseSystemUI
          .from('uchat_conversations')
          .update({ 
            message_count: selectedConversation.message_count + 1,
            last_message_at: newTimestamp
          })
          .eq('id', selectedConversation.id);
        
        // Actualizar estado local
        const updatedConversation = selectedConversation ? {
          ...selectedConversation,
          message_count: selectedConversation.message_count + 1,
          last_message_at: newTimestamp
        } : null;
        
        // Actualizar solo la conversación específica en el estado sin recargar todo
        setConversations(prevConversations => {
          const updated = prevConversations.map(conv => 
            conv.id === selectedConversation.id 
              ? { ...conv, message_count: conv.message_count + 1, last_message_at: newTimestamp }
              : conv
          );
          
          // Reordenar solo en memoria sin llamada a BD
          return updated.sort((a, b) => 
            new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
          );
        });
        
        setSelectedConversation(updatedConversation);
      } else {
        console.log('❌ Error enviando mensaje a UChat');
        // No agregar al caché si no se envió
      }
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      setAllMessages(prev => prev.filter(m => m.id.startsWith('temp-')));
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ============================================
  // MÉTODOS DE UI
  // ============================================

  const scrollToBottom = () => {
    if (messagesScrollRef.current) {
      // SCROLL AL FINAL para mostrar últimos mensajes
      setTimeout(() => {
        if (messagesScrollRef.current) {
          messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short' 
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'active': 
        return <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />;
      case 'transferred': 
        return <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />;
      case 'closed': 
        return <Circle className="w-2 h-2 fill-slate-400 text-slate-400" />;
      default: 
        return <Circle className="w-2 h-2 fill-slate-300 text-slate-300" />;
    }
  };

  const filteredConversations = conversations.filter(conv => 
    !searchTerm || 
    conv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.customer_phone.includes(searchTerm)
  );

  // ============================================
  // CÁLCULOS DE LAYOUT - LIENZO CON SECCIONES FIJAS
  // ============================================

  const sidebarWidth = sidebarCollapsed ? 64 : 256;
  const headerHeight = 120; // Altura del menú fijo (pestañas)
  const footerHeight = 64;  // Altura del footer fijo
  const availableHeight = `calc(100vh - ${headerHeight + footerHeight}px)`;
  const leftOffset = sidebarWidth;
  
  // Calcular ancho ajustado para la primera columna cuando el sidebar está colapsado
  const sidebarSpaceGained = sidebarCollapsed ? (256 - 64) : 0; // 192px de espacio extra
  const adjustedConversationsWidth = columnWidths.conversations + sidebarSpaceGained;

  // ============================================
  // RENDERIZADO PRINCIPAL - LIENZO ESTRUCTURADO
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-slate-200 dark:border-gray-600 border-t-slate-600 dark:border-t-gray-400 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 dark:text-gray-400">Cargando conversaciones reales...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white dark:bg-gray-900"
      style={{ 
        position: 'fixed',
        top: `${headerHeight}px`, // Debajo del menú fijo
        left: `${leftOffset}px`,  // Después del sidebar
        right: 0,
        bottom: `${footerHeight}px`, // Encima del footer fijo
        overflow: 'hidden', // SIN SCROLL GLOBAL
        display: 'flex'
      }}
    >
      {/* SECCIÓN 1: Lista de Conversaciones - CAJA INDEPENDIENTE */}
      <div 
        className="bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700"
        style={{ 
          width: `${adjustedConversationsWidth}px`,
          height: '100%',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header fijo de la caja */}
        <div 
          className="p-4 border-b border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800"
          style={{ 
            flexShrink: 0,
            height: '200px'
          }}
        >
            <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Conversaciones</h1>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Datos reales de UChat • Sidebar: {sidebarCollapsed ? 'Colapsado (+192px)' : 'Expandido'}
                {syncInProgress && <span className="text-blue-600 dark:text-blue-400"> • Sincronizando...</span>}
              </p>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={loadConversations}
                className="text-xs px-2 py-1 text-slate-600 dark:text-gray-300 bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded hover:bg-slate-100 dark:hover:bg-gray-600"
              >
                Actualizar
              </button>
              <button 
                onClick={performSilentSync}
                disabled={syncInProgress}
                className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50"
              >
                {syncInProgress ? 'Sincronizando...' : 'Sincronizar'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-slate-900 dark:text-white">{metrics.totalConversations}</div>
              <div className="text-xs text-slate-500 dark:text-gray-400">Total</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{metrics.activeConversations}</div>
              <div className="text-xs text-slate-500 dark:text-gray-400">Activas</div>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-gray-500"
            />
          </div>
        </div>

        {/* Área de scroll INDIVIDUAL de la caja */}
        <div 
          ref={conversationsScrollRef}
          className="flex-1 overflow-y-auto"
          style={{ 
            overscrollBehavior: 'contain',
            scrollbarWidth: 'thin'
          }}
          onWheel={(e) => {
            // PREVENIR scroll global
            e.stopPropagation();
          }}
        >
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-4 border-b border-slate-50 dark:border-gray-700 cursor-pointer transition-all duration-200 ${
                selectedConversation?.id === conversation.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500 shadow-sm'
                  : 'hover:bg-slate-25 dark:hover:bg-gray-700/50'
              }`}
              onClick={() => setSelectedConversation(conversation)}
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-sm font-semibold text-white">
                    {conversation.customer_name?.charAt(0).toUpperCase() || 'C'}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {conversation.customer_name}
                    </h3>
                    {getStatusIndicator(conversation.status)}
                  </div>
                  
                  <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">{conversation.customer_phone}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">{conversation.metadata?.etapa}</p>
                  
                  <div className="flex items-center justify-between text-xs text-slate-400 dark:text-gray-500">
                    <span>{conversation.message_count} mensajes</span>
                    <span>{formatTimeAgo(conversation.last_message_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DIVISOR REDIMENSIONABLE 1 */}
      <div 
        className="w-1 bg-slate-200 dark:bg-gray-600 hover:bg-slate-300 dark:hover:bg-gray-500 cursor-col-resize flex items-center justify-center group"
        style={{ 
          height: '100%',
          flexShrink: 0,
          zIndex: 10
        }}
        onMouseDown={(e) => handleMouseDown(e, 'conversations')}
      >
        <GripVertical className="w-3 h-3 text-slate-400 dark:text-gray-400 group-hover:text-slate-600 dark:group-hover:text-gray-300" />
      </div>

      {/* SECCIÓN 2: Bloques de Conversación - CAJA INDEPENDIENTE */}
      {selectedConversation && (
        <>
          <div 
            className="bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700"
            style={{ 
              width: `${columnWidths.blocks}px`,
              height: '100%',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header fijo de la caja */}
            <div 
              className="p-4 border-b border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800"
              style={{ 
                flexShrink: 0,
                height: '80px'
              }}
            >
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Bloques por Día</h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">{selectedConversation.customer_name}</p>
            </div>

            {/* Área de scroll INDIVIDUAL de la caja */}
            <div 
              ref={blocksScrollRef}
              className="flex-1 overflow-y-auto"
              style={{ 
                overscrollBehavior: 'contain',
                scrollbarWidth: 'thin'
              }}
              onWheel={(e) => {
                // PREVENIR scroll global
                e.stopPropagation();
              }}
            >
              {conversationBlocks.map((block) => (
                <div
                  key={block.date}
                  className="p-4 border-b border-slate-50 dark:border-gray-700 cursor-pointer hover:bg-slate-25 dark:hover:bg-gray-700/50 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-4 h-4 text-slate-400 dark:text-gray-500" />
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {formatDate(block.date)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-gray-400">
                        {block.message_count} mensajes
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-gray-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DIVISOR REDIMENSIONABLE 2 */}
          <div 
            className="w-1 bg-slate-200 dark:bg-gray-600 hover:bg-slate-300 dark:hover:bg-gray-500 cursor-col-resize flex items-center justify-center group"
            style={{ 
              height: '100%',
              flexShrink: 0,
              zIndex: 10
            }}
            onMouseDown={(e) => handleMouseDown(e, 'blocks')}
          >
            <GripVertical className="w-3 h-3 text-slate-400 dark:text-gray-400 group-hover:text-slate-600 dark:group-hover:text-gray-300" />
          </div>
        </>
      )}

      {/* SECCIÓN 3: Ventana de Chat - GRUPO (Mensajes + Input) */}
      {selectedConversation ? (
        <div 
          className="bg-white dark:bg-gray-800 flex-1"
          style={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header fijo del chat */}
          <div 
            className="p-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-700"
            style={{ 
              flexShrink: 0,
              height: '80px'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-sm font-semibold text-white">
                    {selectedConversation.customer_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {selectedConversation.customer_name}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-gray-300">
                    <Phone className="w-4 h-4" />
                    <span>{selectedConversation.customer_phone}</span>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                      {selectedConversation.metadata?.etapa}
                    </span>
                  </div>
                </div>
              </div>

              {/* Controles del Bot */}
              <div className="flex items-center space-x-3">
                {(() => {
                  const uchatId = selectedConversation.metadata?.id_uchat;
                  const status = botPauseStatus[uchatId];
                  const timeRemaining = getBotPauseTimeRemaining(uchatId);
                  
                  if (status?.isPaused && timeRemaining > 0) {
                    return (
                      <div className="flex items-center space-x-3">
                        <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium">
                          Bot pausado: {formatTimeRemaining(timeRemaining)}
                        </span>
                        <button
                          onClick={() => resumeBot(uchatId)}
                          className="px-4 py-2 bg-green-500 dark:bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-600 dark:hover:bg-green-700 transition-all duration-200 animate-pulse shadow-lg"
                        >
                          Reactivar IA
                        </button>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => pauseBot(uchatId, 5)}
                          className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                        >
                          5m
                        </button>
                        <button
                          onClick={() => pauseBot(uchatId, 15)}
                          className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                        >
                          15m
                        </button>
                        <button
                          onClick={() => pauseBot(uchatId, 30)}
                          className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                          30m
                        </button>
                        <button
                          onClick={() => pauseBot(uchatId, 60)}
                          className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                        >
                          1h
                        </button>
                      </div>
                    );
                  }
                })()}

                <button
                  onClick={() => setSelectedConversation(null)}
                  className="p-2 text-slate-400 dark:text-gray-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Área de mensajes - SCROLL INDIVIDUAL (hacia arriba desde abajo) */}
          <div 
            ref={messagesScrollRef}
            className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-slate-25 to-white dark:from-gray-800 dark:to-gray-900"
            style={{ 
              overscrollBehavior: 'contain',
              scrollbarWidth: 'thin',
              display: 'flex',
              flexDirection: 'column-reverse' // MOSTRAR DESDE ABAJO
            }}
            onWheel={(e) => {
              // PREVENIR scroll global
              e.stopPropagation();
            }}
          >
            {getCombinedMessages().length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500 dark:text-gray-400">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-slate-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No hay mensajes</h3>
                  <p className="text-sm text-slate-600 dark:text-gray-400">Esta conversación aún no tiene mensajes</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column' }}>
                {getCombinedMessages().map((message, index) => {
                  const isCustomer = message.sender_type === 'customer';
                  const isBot = message.sender_type === 'bot';
                  const combinedMessages = getCombinedMessages();
                  const showDate = index === 0 || 
                    formatDate(message.created_at) !== formatDate(combinedMessages[index - 1]?.created_at);

                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="flex justify-center my-6">
                          <span className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-full shadow-sm">
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                      )}

                      <div className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-md ${isCustomer ? 'order-2 ml-3' : 'order-1 mr-3'}`}>
                          
                          <div className={`text-xs text-slate-500 dark:text-gray-400 mb-1 ${isCustomer ? 'text-left' : 'text-right'}`}>
                            {message.sender_name || (isCustomer ? 'Cliente' : isBot ? 'Bot Vidanta' : 'Agente')}
                          </div>

                          <div className={`relative px-4 py-3 rounded-2xl shadow-sm ${
                            isCustomer 
                              ? 'bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-slate-900 dark:text-white' 
                              : isBot
                                ? 'bg-blue-500 dark:bg-blue-600 text-white'
                                : message.message_id.startsWith('cache_')
                                  ? 'bg-slate-700 dark:bg-gray-700 text-white border-2 border-dashed border-slate-400 dark:border-gray-500'
                                  : 'bg-slate-900 dark:bg-gray-800 text-white'
                          }`}>
                            {message.content && (
                              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                {message.content.replace(/\\n/g, '\n')}
                              </div>
                            )}

                            <div className={`text-xs mt-2 flex items-center justify-between ${
                              isCustomer ? 'text-slate-400 dark:text-gray-400' : 'text-white text-opacity-75'
                            }`}>
                              <span>{formatTime(message.created_at)}</span>
                              {message.message_id.startsWith('cache_') && (
                                <span className="text-xs text-white text-opacity-60 italic">Enviando...</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                          isCustomer ? 'order-1' : 'order-2'
                        } ${
                          isCustomer 
                            ? 'bg-gradient-to-br from-slate-400 to-slate-600' 
                            : isBot
                              ? 'bg-gradient-to-br from-blue-500 to-blue-700'
                              : 'bg-gradient-to-br from-slate-800 to-slate-900'
                        }`}>
                          <span className="text-xs font-semibold text-white">
                            {isCustomer 
                              ? (selectedConversation?.customer_name?.charAt(0).toUpperCase() || 'C')
                              : isBot 
                                ? 'B'
                                : 'A'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Input FIJO - Separado del historial pero en el mismo grupo */}
          <div 
            className="p-4 border-t border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            style={{ 
              flexShrink: 0,
              height: '80px'
            }}
          >
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe un mensaje..."
                  rows={1}
                  className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none shadow-sm"
                  style={{ height: '44px' }}
                />
              </div>

              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-gray-400 bg-white dark:bg-gray-800">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-10 h-10 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Selecciona una conversación</h3>
            <p className="text-sm text-slate-600 dark:text-gray-400">Elige una conversación para ver el historial completo</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveChatCanvas;
