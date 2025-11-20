import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { timelineService } from '../../services/timelineService';
import type { TimelineActivity, ProcessedActivity, DuplicateCheck } from '../../services/timelineTypes';
import { Plus, X, Calendar, Clock, CheckCircle2, Circle, Trash2, AlertCircle, Users, Trash, Edit2, Save, ChevronLeft, ChevronRight, Archive, MoreVertical, ArchiveRestore, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabaseSystemUIAdmin } from '../../config/supabaseSystemUI';

const Timeline: React.FC = () => {
  const { user, logout } = useAuth();
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<TimelineActivity | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [inputText, setInputText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<DuplicateCheck[]>([]);
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<number>>(new Set());
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const [isFastScrolling, setIsFastScrolling] = useState(false);
  const [scrollIntensity, setScrollIntensity] = useState(0); // 0-1 para intensidad del efecto
  const scrollVelocityRef = useRef(0);
  const lastScrollTopRef = useRef(0);
  const lastScrollTimeRef = useRef(Date.now());
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Partial<TimelineActivity>>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const [showCalendarTopFade, setShowCalendarTopFade] = useState(false);
  const [showCalendarBottomFade, setShowCalendarBottomFade] = useState(false);
  const [assignedNames, setAssignedNames] = useState<string[]>([]);
  const [assignmentInput, setAssignmentInput] = useState('');
  const [showAssignmentSuggestions, setShowAssignmentSuggestions] = useState(false);
  const [assignmentSuggestions, setAssignmentSuggestions] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; activityId: string } | null>(null);
  const [showArchivedView, setShowArchivedView] = useState(false);
  const [archivedActivities, setArchivedActivities] = useState<TimelineActivity[]>([]);
  const [draggingActivity, setDraggingActivity] = useState<{ id: string; startX: number; startY: number; currentX: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragThreshold = 150; // Aumentado de 100 a 150 para mayor margen de error
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number; time: number }>>(new Map());
  const [isDarkMode, setIsDarkMode] = useState(true); // Tema oscuro por defecto

  // Paleta de colores según el tema
  const themeColors = {
    dark: {
      bg: '#000000',
      bgSecondary: 'rgba(255, 255, 255, 0.05)',
      bgHover: 'rgba(255, 255, 255, 0.08)',
      bgSelected: 'rgba(147, 51, 234, 0.15)',
      bgCompleted: 'rgba(34, 197, 94, 0.08)',
      text: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.6)',
      textTertiary: 'rgba(255, 255, 255, 0.4)',
      border: 'rgba(255, 255, 255, 0.1)',
      borderHover: 'rgba(255, 255, 255, 0.2)',
      modalBg: '#000000',
      modalOverlay: 'rgba(0, 0, 0, 0.9)',
      calendarBg: '#000000',
    },
    light: {
      bg: '#1e293b', // Slate-800 - índigo oscuro sobrio
      bgSecondary: 'rgba(30, 41, 59, 0.4)', // Slate-800 con opacidad
      bgHover: 'rgba(51, 65, 85, 0.6)', // Slate-700 con opacidad
      bgSelected: 'rgba(79, 70, 229, 0.15)', // Indigo-600 con opacidad
      bgCompleted: 'rgba(34, 197, 94, 0.12)',
      text: '#f1f5f9', // Slate-100 - texto claro sobre fondo oscuro
      textSecondary: 'rgba(241, 245, 249, 0.7)',
      textTertiary: 'rgba(241, 245, 249, 0.5)',
      border: 'rgba(148, 163, 184, 0.2)', // Slate-400 con opacidad
      borderHover: 'rgba(148, 163, 184, 0.3)',
      modalBg: '#1e293b',
      modalOverlay: 'rgba(15, 23, 42, 0.85)', // Slate-900 con opacidad
      calendarBg: '#1e293b',
    }
  };

  const colors = themeColors[isDarkMode ? 'dark' : 'light'];

  // Toggle tema
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('direccion-theme', (!isDarkMode).toString());
  };

  // Cargar tema guardado
  useEffect(() => {
    const savedTheme = localStorage.getItem('direccion-theme');
    if (savedTheme !== null) {
      setIsDarkMode(savedTheme === 'true');
    }
  }, []);

  // Aplicar tema al módulo (desacoplado del tema global)
  useEffect(() => {
    // Agregar clase específica al body para este módulo
    document.body.classList.add('direccion-module');
    
    // Prevenir scroll en el body
    document.body.style.overflow = 'hidden';
    
    // Aplicar tema al contenedor
    const timelineContainer = document.getElementById('timeline-direccion-container');
    if (timelineContainer) {
      timelineContainer.style.backgroundColor = colors.bg;
      timelineContainer.style.color = colors.text;
    }

    // Agregar estilo global para el módulo
    const style = document.createElement('style');
    style.id = 'direccion-theme-override';
    style.textContent = `
      #timeline-direccion-container {
        background-color: ${colors.bg} !important;
        color: ${colors.text} !important;
      }
      /* Prevenir scroll en body cuando está en módulo dirección */
      body.direccion-module {
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);

    // Cleanup
    return () => {
      document.body.classList.remove('direccion-module');
      document.body.style.overflow = '';
      const styleElement = document.getElementById('direccion-theme-override');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [isDarkMode, colors]);

  // Detectar scroll y mostrar/ocultar overlays de blur del timeline + efecto velocidad de la luz
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let scrollTimeout: NodeJS.Timeout;

    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      setShowTopFade(scrollTop > 10);
      setShowBottomFade(scrollTop < scrollHeight - clientHeight - 10);

      // Calcular velocidad del scroll
      const now = Date.now();
      const timeDelta = now - lastScrollTimeRef.current;
      const scrollDelta = Math.abs(scrollTop - lastScrollTopRef.current);
      
      if (timeDelta > 0) {
        scrollVelocityRef.current = scrollDelta / timeDelta; // píxeles por milisegundo
        
        // Calcular intensidad del efecto basada en la velocidad (0-1)
        // Umbral mínimo: 1.5 px/ms, máximo: 8 px/ms
        const minVelocity = 1.5;
        const maxVelocity = 8;
        const normalizedVelocity = Math.min(Math.max((scrollVelocityRef.current - minVelocity) / (maxVelocity - minVelocity), 0), 1);
        
        // Si la velocidad es alta (más de 1.5 píxeles por ms = scroll rápido)
        if (scrollVelocityRef.current > minVelocity) {
          setIsFastScrolling(true);
          setScrollIntensity(normalizedVelocity);
          
          // Limpiar timeout anterior
          clearTimeout(scrollTimeout);
          
          // Desactivar efecto después de que se detenga el scroll rápido
          scrollTimeout = setTimeout(() => {
            setIsFastScrolling(false);
            setScrollIntensity(0);
          }, 200);
        } else {
          setScrollIntensity(0);
        }
      }

      lastScrollTopRef.current = scrollTop;
      lastScrollTimeRef.current = now;
    };

    checkScroll();
    scrollContainer.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    return () => {
      scrollContainer.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      clearTimeout(scrollTimeout);
    };
  }, [activities]);

  // Detectar scroll y mostrar/ocultar overlays de blur del calendario
  useEffect(() => {
    const calendarContainer = calendarScrollRef.current;
    if (!calendarContainer) return;

    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = calendarContainer;
      setShowCalendarTopFade(scrollTop > 10);
      setShowCalendarBottomFade(scrollTop < scrollHeight - clientHeight - 10);
    };

    checkScroll();
    calendarContainer.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      calendarContainer.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [activities]);

  // Cerrar menú contextual al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // Cargar actividades y usuarios al montar
  useEffect(() => {
    if (user?.id) {
      loadActivities();
      loadAssignedNames();
    }
  }, [user?.id]);

  // Cargar nombres de asignados históricos
  const loadAssignedNames = async () => {
    try {
      const { data, error } = await supabaseSystemUIAdmin
        .from('timeline_activities')
        .select('asignado_a')
        .eq('user_id', user?.id);

      if (error) throw error;

      const namesSet = new Set<string>();
      (data || []).forEach(activity => {
        if (activity.asignado_a && Array.isArray(activity.asignado_a)) {
          activity.asignado_a.forEach((name: string) => {
            if (name && name.trim()) {
              namesSet.add(name.trim());
            }
          });
        }
      });

      setAssignedNames(Array.from(namesSet).sort());
    } catch (error) {
      console.error('Error loading assigned names:', error);
    }
  };

  // Función de matching inteligente (Levenshtein simplificado)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // Levenshtein distance simplificado
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = [];
    
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return 1 - (distance / maxLen);
  };

  // Buscar nombres similares
  const findSimilarNames = (query: string): string[] => {
    if (!query || query.length < 2) return [];
    
    const queryLower = query.toLowerCase().trim();
    const matches: Array<{ name: string; similarity: number }> = [];
    
    assignedNames.forEach(name => {
      const similarity = calculateSimilarity(queryLower, name);
      if (similarity > 0.6) { // Umbral de similitud
        matches.push({ name, similarity });
      }
    });
    
    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(m => m.name);
  };

  // Manejar input de asignación
  const handleAssignmentInputChange = (value: string) => {
    setAssignmentInput(value);
    if (value.trim().length > 0) {
      const suggestions = findSimilarNames(value);
      setAssignmentSuggestions(suggestions);
      setShowAssignmentSuggestions(suggestions.length > 0);
    } else {
      setShowAssignmentSuggestions(false);
      setAssignmentSuggestions([]);
    }
  };

  // Agregar asignado
  const handleAddAssignment = (name?: string) => {
    const nameToAdd = (name || assignmentInput).trim();
    if (!nameToAdd) return;

    // Buscar si hay un nombre similar ya registrado
    const similarName = assignedNames.find(existingName => {
      const similarity = calculateSimilarity(nameToAdd, existingName);
      return similarity > 0.85; // Alto umbral para considerar igual
    });

    const finalName = similarName || nameToAdd;
    const currentAssignees = editingActivity.asignado_a || [];
    
    if (!currentAssignees.includes(finalName)) {
      setEditingActivity({ 
        ...editingActivity, 
        asignado_a: [...currentAssignees, finalName] 
      });
      
      // Agregar a la lista de nombres históricos si es nuevo
      if (!assignedNames.includes(finalName)) {
        setAssignedNames([...assignedNames, finalName].sort());
      }
    }
    
    setAssignmentInput('');
    setShowAssignmentSuggestions(false);
  };

  // Cargar usuarios para asignación
  const loadUsers = async () => {
    try {
      const { data, error } = await supabaseSystemUIAdmin
        .from('auth_users')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadActivities = async () => {
    if (!user?.id) return;
    setLoading(true);
    const data = await timelineService.getActivities(user.id);
    // Filtrar solo actividades no archivadas
    setActivities(data.filter(a => !a.archivado));
    setLoading(false);
  };

  // Cargar actividades archivadas
  const loadArchivedActivities = async () => {
    if (!user?.id) return;
    try {
      const data = await timelineService.getActivities(user.id);
      setArchivedActivities(data.filter(a => a.archivado));
    } catch (error) {
      console.error('Error loading archived activities:', error);
    }
  };

  // Procesar texto con LLM
  const handleProcessText = async () => {
    if (!inputText.trim() || !user?.id) return;

    setProcessing(true);
    try {
      console.log('🔄 Procesando texto con LLM...', inputText.substring(0, 50));
      
      // Procesar con LLM
      const processed = await timelineService.processActivitiesWithLLM(inputText);
      
      console.log('✅ Actividades procesadas:', processed);
      
      if (!processed || processed.length === 0) {
        toast.error('No se pudieron extraer actividades del texto');
        return;
      }
      
      // Verificar duplicados
      const duplicates = await timelineService.checkDuplicates(processed, user.id);
      console.log('🔍 Duplicados encontrados:', duplicates);
      
      setPreviewData(duplicates);
      setShowPreviewModal(true);
      toast.success(`${processed.length} actividades procesadas`);
    } catch (error) {
      console.error('❌ Error processing:', error);
      toast.error(error instanceof Error ? error.message : 'Error al procesar actividades');
    } finally {
      setProcessing(false);
    }
  };

  // Normalizar nombres de asignados con matching inteligente
  const normalizeAssignedNames = (names: string[]): string[] => {
    if (!names || names.length === 0) return [];
    
    return names.map(name => {
      const trimmedName = name.trim();
      if (!trimmedName) return '';
      
      // Buscar si hay un nombre similar ya registrado
      const similarName = assignedNames.find(existingName => {
        const similarity = calculateSimilarity(trimmedName, existingName);
        return similarity > 0.85; // Alto umbral para considerar igual
      });
      
      return similarName || trimmedName;
    }).filter(name => name.length > 0);
  };

  // Guardar actividades (filtrando duplicados seleccionados)
  const handleSaveActivities = async () => {
    if (!user?.id) return;

    const toSave = previewData
      .filter((item, index) => !selectedDuplicates.has(index))
      .map((item) => ({
        user_id: user.id,
        title: item.activity.title,
        description: item.activity.description || null,
        due_date: item.activity.due_date,
        status: 'pending' as const,
        priority: item.activity.priority || 'media',
        asignado_a: normalizeAssignedNames(item.activity.asignado_a || []),
        realizado: false,
        archivado: false,
        metadata: {},
      }));

    // Actualizar actividades existentes si hay updates
    const updates = previewData
      .filter((item, index) => selectedDuplicates.has(index) && item.isUpdate && item.existingId)
      .map((item) => ({
        id: item.existingId!,
        due_date: item.activity.due_date,
        description: item.activity.description || null,
        priority: item.activity.priority || 'media',
        asignado_a: normalizeAssignedNames(item.activity.asignado_a || []),
      }));

    try {
      // Crear nuevas
      if (toSave.length > 0) {
        await timelineService.createActivities(toSave);
      }

      // Actualizar existentes
      for (const update of updates) {
        await timelineService.updateActivity(update.id, {
          due_date: update.due_date,
          description: update.description,
          priority: update.priority,
          asignado_a: update.asignado_a,
        });
      }

      // Actualizar lista de nombres históricos
      await loadAssignedNames();

      setShowPreviewModal(false);
      setShowAddModal(false);
      setInputText('');
      setSelectedDuplicates(new Set());
      await loadActivities();
      toast.success('Actividades guardadas exitosamente');
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  // Eliminar actividad
  const handleDeleteActivity = async (id: string, skipConfirm: boolean = false) => {
    if (!skipConfirm && !confirm('¿Estás seguro de eliminar esta actividad?')) {
      return;
    }
    // Verificar si la actividad estaba archivada antes de eliminar
    const wasArchived = [...activities, ...archivedActivities].find(a => a.id === id)?.archivado || false;
    
    await timelineService.deleteActivity(id);
    await loadActivities();
    
    // Si estaba archivada, actualizar el contador
    if (wasArchived) {
      await loadArchivedActivities();
    }
  };

  // Eliminar todas las actividades
  const handleDeleteAll = async () => {
    if (!user?.id) return;
    
    if (deleteConfirmText.toLowerCase() !== 'eliminar') {
      toast.error('Debes escribir "eliminar" para confirmar');
      return;
    }

    try {
      const { error } = await supabaseSystemUIAdmin
        .from('timeline_activities')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      
      setShowDeleteAllModal(false);
      setDeleteConfirmText('');
      await loadActivities();
      toast.success('Todas las actividades han sido eliminadas');
    } catch (error) {
      console.error('Error deleting all activities:', error);
      toast.error('Error al eliminar actividades');
    }
  };

  // Toggle realizado - Optimizado para evitar rerender completo
  const handleToggleRealizado = async (activity: TimelineActivity) => {
    const newRealizado = !activity.realizado;
    const newCompletedAt = newRealizado ? new Date().toISOString() : null;
    
    // Actualizar estado local inmediatamente (optimistic update)
    setActivities(prev => prev.map(a => 
      a.id === activity.id 
        ? { ...a, realizado: newRealizado, completed_at: newCompletedAt }
        : a
    ));
    
    // También actualizar en archivadas si está visible
    if (showArchivedView) {
      setArchivedActivities(prev => prev.map(a => 
        a.id === activity.id 
          ? { ...a, realizado: newRealizado, completed_at: newCompletedAt }
          : a
      ));
    }
    
    // Actualizar en el servidor en segundo plano
    try {
      await timelineService.updateActivity(activity.id, {
        realizado: newRealizado,
        completed_at: newCompletedAt
      });
      // No necesitamos recargar, ya actualizamos el estado local
    } catch (error) {
      console.error('Error toggling realizado:', error);
      // Revertir cambio si falla
      setActivities(prev => prev.map(a => 
        a.id === activity.id 
          ? { ...a, realizado: activity.realizado, completed_at: activity.completed_at }
          : a
      ));
      if (showArchivedView) {
        setArchivedActivities(prev => prev.map(a => 
          a.id === activity.id 
            ? { ...a, realizado: activity.realizado, completed_at: activity.completed_at }
            : a
        ));
      }
      toast.error('Error al actualizar actividad');
    }
  };

  // Iniciar edición
  const handleStartEdit = (activity: TimelineActivity) => {
    setIsEditing(true);
    setEditingActivity({ 
      ...activity,
      asignado_a: activity.asignado_a || []
    });
    setAssignmentInput('');
    setShowAssignmentSuggestions(false);
  };

  // Resetear estado cuando se cierra el modal
  useEffect(() => {
    if (!showDetailModal) {
      setIsEditing(false);
      setEditingActivity({});
    }
  }, [showDetailModal]);

  // Guardar edición
  const handleSaveEdit = async () => {
    if (!editingActivity.id) return;

    try {
      // Normalizar nombres de asignados antes de guardar
      const normalizedAssignees = (editingActivity.asignado_a || []).map(name => {
        // Buscar si hay un nombre similar ya registrado
        const similarName = assignedNames.find(existingName => {
          const similarity = calculateSimilarity(name.trim(), existingName);
          return similarity > 0.85; // Alto umbral para considerar igual
        });
        return similarName || name.trim();
      }).filter(name => name.length > 0); // Filtrar nombres vacíos

      console.log('💾 Guardando actividad:', {
        id: editingActivity.id,
        asignado_a: normalizedAssignees,
        editingActivity: editingActivity.asignado_a
      });

      const result = await timelineService.updateActivity(editingActivity.id, {
        title: editingActivity.title!,
        description: editingActivity.description || null,
        due_date: editingActivity.due_date!,
        priority: editingActivity.priority!,
        asignado_a: normalizedAssignees,
        realizado: editingActivity.realizado || false
      });

      console.log('✅ Resultado del guardado:', result);
      
      // Actualizar lista de nombres históricos
      await loadAssignedNames();
      
      setIsEditing(false);
      setEditingActivity({});
      setAssignmentInput('');
      setShowAssignmentSuggestions(false);
      await loadActivities();
      toast.success('Actividad actualizada');
    } catch (error) {
      console.error('❌ Error saving edit:', error);
      toast.error('Error al guardar cambios');
    }
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingActivity({});
  };

  // Obtener días con actividades para el calendario
  const getDaysWithActivities = () => {
    const daysSet = new Set<string>();
    activities.forEach(activity => {
      const dateKey = activity.due_date;
      daysSet.add(dateKey);
    });
    return daysSet;
  };

  // Generar meses del calendario solo entre fechas mínimas y máximas
  const generateCalendarMonths = () => {
    if (activities.length === 0) {
      // Si no hay actividades, mostrar solo el mes actual
      const today = new Date();
      return [{
        year: today.getFullYear(),
        month: today.getMonth(),
        date: new Date(today)
      }];
    }

    // Encontrar fecha mínima y máxima de las actividades
    const dates = activities.map(a => new Date(a.due_date));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Crear fecha de inicio (primer día del mes de la fecha mínima)
    const startDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    // Crear fecha de fin (último día del mes de la fecha máxima)
    const endDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
    
    const months: Array<{ year: number; month: number; date: Date }> = [];
    let current = new Date(startDate);
    
    while (current <= endDate) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth(),
        date: new Date(current)
      });
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    
    return months;
  };

  // Obtener días del mes
  const getDaysInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: Array<{ day: number; date: string; hasActivity: boolean }> = [];
    
    // Días vacíos al inicio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: 0, date: '', hasActivity: false });
    }
    
    // Días del mes
    const daysWithActivities = getDaysWithActivities();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        date: dateStr,
        hasActivity: daysWithActivities.has(dateStr)
      });
    }
    
    return days;
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Mañana';
    } else {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
  };

  // Obtener color según prioridad (retorna objeto con clases y estilos)
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critica': 
        return { 
          gradient: 'from-red-500 to-pink-600',
          bgGradient: 'bg-gradient-to-br from-red-500 to-pink-600',
          textGradient: 'bg-gradient-to-r from-red-500 to-pink-600',
          bgColor: 'rgba(239, 68, 68, 0.2)',
          borderColor: 'rgba(239, 68, 68, 0.6)',
          label: 'Crítica'
        };
      case 'alta': 
        return { 
          gradient: 'from-orange-500 to-red-500',
          bgGradient: 'bg-gradient-to-br from-orange-500 to-red-500',
          textGradient: 'bg-gradient-to-r from-orange-500 to-red-500',
          bgColor: 'rgba(249, 115, 22, 0.2)',
          borderColor: 'rgba(249, 115, 22, 0.6)',
          label: 'Alta'
        };
      case 'media': 
        return { 
          gradient: 'from-blue-500 to-cyan-500',
          bgGradient: 'bg-gradient-to-br from-blue-500 to-cyan-500',
          textGradient: 'bg-gradient-to-r from-blue-500 to-cyan-500',
          bgColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 0.6)',
          label: 'Media'
        };
      case 'baja': 
        return { 
          gradient: 'from-gray-500 to-gray-600',
          bgGradient: 'bg-gradient-to-br from-gray-500 to-gray-600',
          textGradient: 'bg-gradient-to-r from-gray-500 to-gray-600',
          bgColor: 'rgba(107, 114, 128, 0.2)',
          borderColor: 'rgba(107, 114, 128, 0.6)',
          label: 'Baja'
        };
      default: 
        return { 
          gradient: 'from-blue-500 to-cyan-500',
          bgGradient: 'bg-gradient-to-br from-blue-500 to-cyan-500',
          textGradient: 'bg-gradient-to-r from-blue-500 to-cyan-500',
          bgColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 0.6)',
          label: 'Media'
        };
    }
  };

  // Obtener icono según estado
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-blue-400" />;
      case 'cancelled': return <X className="w-5 h-5 text-gray-400" />;
      default: return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  // Archivar actividad
  const handleArchiveActivity = async (activityId: string) => {
    try {
      await timelineService.updateActivity(activityId, { archivado: true });
      await loadActivities();
      await loadArchivedActivities(); // Actualizar contador de archivadas
      toast.success('Actividad archivada');
    } catch (error) {
      console.error('Error archiving activity:', error);
      toast.error('Error al archivar actividad');
    }
  };

  // Desarchivar actividad
  const handleUnarchiveActivity = async (activityId: string) => {
    try {
      await timelineService.updateActivity(activityId, { archivado: false });
      await loadArchivedActivities();
      await loadActivities();
      toast.success('Actividad desarchivada');
      // Si estamos en la vista de archivados y no quedan más, volver a activas
      if (showArchivedView && archivedActivities.length === 1) {
        setShowArchivedView(false);
      }
    } catch (error) {
      console.error('Error unarchiving activity:', error);
      toast.error('Error al desarchivar actividad');
    }
  };

  // Archivar múltiples actividades
  const handleArchiveSelected = async () => {
    if (selectedActivities.size === 0) return;
    const count = selectedActivities.size;
    try {
      await Promise.all(
        Array.from(selectedActivities).map(id => 
          timelineService.updateActivity(id, { archivado: true })
        )
      );
      setSelectedActivities(new Set());
      await loadActivities();
      await loadArchivedActivities(); // Actualizar contador de archivadas
      toast.success(`${count} actividades archivadas`);
    } catch (error) {
      console.error('Error archiving activities:', error);
      toast.error('Error al archivar actividades');
    }
  };

  // Eliminar múltiples actividades
  const handleDeleteSelected = async () => {
    if (selectedActivities.size === 0) return;
    const count = selectedActivities.size;
    if (!confirm(`¿Estás seguro de eliminar ${count} actividades?`)) return;
    
    // Verificar si alguna actividad estaba archivada
    const hadArchived = Array.from(selectedActivities).some(id => 
      [...activities, ...archivedActivities].find(a => a.id === id)?.archivado
    );
    
    try {
      await Promise.all(
        Array.from(selectedActivities).map(id => 
          timelineService.deleteActivity(id)
        )
      );
      setSelectedActivities(new Set());
      await loadActivities();
      
      // Si alguna estaba archivada, actualizar el contador
      if (hadArchived || showArchivedView) {
        await loadArchivedActivities();
      }
      toast.success(`${count} actividades eliminadas`);
    } catch (error) {
      console.error('Error deleting activities:', error);
      toast.error('Error al eliminar actividades');
    }
  };

  // Toggle selección de actividad
  const handleToggleSelection = (activityId: string) => {
    const newSelected = new Set(selectedActivities);
    if (newSelected.has(activityId)) {
      newSelected.delete(activityId);
    } else {
      newSelected.add(activityId);
    }
    setSelectedActivities(newSelected);
  };

  // Manejar menú contextual
  const handleContextMenu = (e: React.MouseEvent, activityId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const activity = [...activities, ...archivedActivities].find(a => a.id === activityId);
    setContextMenu({ x: e.clientX, y: e.clientY, activityId });
  };

  // Manejar gestos de arrastre mejorado con listeners globales
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, activityId: string) => {
    // Solo permitir arrastre si no hay selección múltiple activa
    if (selectedActivities.size > 0) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDraggingActivity({ id: activityId, startX: clientX, startY: clientY, currentX: clientX });
    
    // Agregar listeners globales para mejor seguimiento
    const handleGlobalMove = (moveEvent: MouseEvent | TouchEvent) => {
      moveEvent.preventDefault();
      const moveX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      setDraggingActivity(prev => {
        if (!prev) return null;
        handleDragMoveGlobal(moveX, prev.startX);
        return { ...prev, currentX: moveX };
      });
    };
    
    const handleGlobalEnd = () => {
      handleDragEnd();
      document.removeEventListener('mousemove', handleGlobalMove as any);
      document.removeEventListener('mouseup', handleGlobalEnd);
      document.removeEventListener('touchmove', handleGlobalMove as any);
      document.removeEventListener('touchend', handleGlobalEnd);
    };
    
    document.addEventListener('mousemove', handleGlobalMove as any, { passive: false });
    document.addEventListener('mouseup', handleGlobalEnd);
    document.addEventListener('touchmove', handleGlobalMove as any, { passive: false });
    document.addEventListener('touchend', handleGlobalEnd);
  };

  const handleDragMoveGlobal = (clientX: number, startX: number) => {
    const deltaX = clientX - startX;
    const activityId = draggingActivity?.id;
    if (!activityId) return;
    
    const activityElement = document.querySelector(`[data-activity-id="${activityId}"]`) as HTMLElement;
    if (!activityElement) return;
    
    const cardElement = activityElement.querySelector('.backdrop-blur-sm') as HTMLElement;
    if (!cardElement) return;
    
    // Usar requestAnimationFrame para animación fluida
    requestAnimationFrame(() => {
      const absDeltaX = Math.abs(deltaX);
      const progress = Math.min(absDeltaX / dragThreshold, 1);
      
      // Transformación suave con factor de reducción para movimiento más natural
      const translateX = deltaX * 0.7; // Factor de reducción para movimiento más suave
      cardElement.style.transform = `translateX(${translateX}px)`;
      cardElement.style.transition = 'none'; // Sin transición durante el arrastre
      cardElement.style.willChange = 'transform'; // Optimización de rendimiento
      
      if (absDeltaX > dragThreshold * 0.4) {
        // Feedback visual progresivo cuando se acerca al threshold
        const intensity = Math.min((absDeltaX - dragThreshold * 0.4) / (dragThreshold * 0.6), 1);
        if (deltaX > 0) {
          // Deslizar derecha = eliminar (rojo)
          cardElement.style.borderColor = `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`;
          cardElement.style.backgroundColor = `rgba(239, 68, 68, ${0.05 + intensity * 0.2})`;
        } else {
          // Deslizar izquierda = archivar/desarchivar (azul)
          cardElement.style.borderColor = `rgba(59, 130, 246, ${0.2 + intensity * 0.6})`;
          cardElement.style.backgroundColor = `rgba(59, 130, 246, ${0.05 + intensity * 0.2})`;
        }
        cardElement.style.opacity = `${1 - intensity * 0.2}`;
      } else {
        // Resetear colores cuando está lejos del threshold
        cardElement.style.borderColor = '';
        cardElement.style.backgroundColor = '';
        cardElement.style.opacity = '1';
      }
    });
  };

  const handleDragEnd = () => {
    if (!draggingActivity) {
      setIsDragging(false);
      return;
    }
    
    const activityId = draggingActivity.id;
    const activityElement = document.querySelector(`[data-activity-id="${activityId}"]`) as HTMLElement;
    
    if (activityElement) {
      const cardElement = activityElement.querySelector('.backdrop-blur-sm') as HTMLElement;
      if (cardElement) {
        const deltaX = draggingActivity.currentX - draggingActivity.startX;
        const absDeltaX = Math.abs(deltaX);

        // Solo ejecutar acción si supera el threshold (aumentado para mayor margen de error)
        if (absDeltaX > dragThreshold) {
          if (deltaX > 0) {
            // Deslizar derecha = eliminar (sin confirmación cuando es por arrastre)
            handleDeleteActivity(activityId, true);
          } else {
            // Deslizar izquierda = archivar o desarchivar según la vista
            if (showArchivedView) {
              handleUnarchiveActivity(activityId);
            } else {
              handleArchiveActivity(activityId);
            }
          }
        }

        // Resetear estilos con animación suave
        cardElement.style.willChange = 'auto';
        cardElement.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        cardElement.style.transform = '';
        cardElement.style.opacity = '';
        cardElement.style.borderColor = '';
        cardElement.style.backgroundColor = '';
        
        setTimeout(() => {
          if (cardElement) {
            cardElement.style.transition = '';
          }
        }, 400);
      }
    }

    setDraggingActivity(null);
    // Delay para evitar que se abra el modal
    setTimeout(() => setIsDragging(false), 200);
  };

  // Agrupar actividades por fecha
  const groupedActivities = activities.reduce((acc, activity) => {
    const dateKey = activity.due_date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(activity);
    return acc;
  }, {} as Record<string, TimelineActivity[]>);

  const sortedDates = Object.keys(groupedActivities).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  if (loading) {
          return (
            <div 
              className="min-h-screen flex items-center justify-center transition-colors duration-300"
              style={{ backgroundColor: colors.bg, color: colors.text }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="w-16 h-16 border-2 rounded-full animate-spin mx-auto mb-4 transition-colors duration-300" style={{ borderColor: colors.border, borderTopColor: colors.text }}></div>
                <p className="transition-colors duration-300" style={{ color: colors.textSecondary }}>Cargando timeline...</p>
              </motion.div>
            </div>
          );
  }

  const calendarMonths = generateCalendarMonths();
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
      <div 
        id="timeline-direccion-container"
        className="h-screen relative overflow-hidden flex flex-row transition-colors duration-300"
        style={{
          backgroundColor: colors.bg,
          color: colors.text
        }}
      >
      {/* Fondo decorativo */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Degradado púrpura animado - rebote tipo DVD diagonal */}
        <motion.div
          className="absolute w-96 h-96 rounded-full blur-3xl"
          style={{ 
            background: 'radial-gradient(circle, rgba(147, 51, 234, 0.08) 0%, transparent 70%)',
          }}
          animate={{
            left: ['5%', '70%', '5%', '70%', '5%'],
            top: ['5%', '65%', '5%', '65%', '5%'],
            scale: [1, 1.05, 0.98, 1.05, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.25, 0.5, 0.75, 1]
          }}
        />
        {/* Foco de luz central animado - rebote tipo DVD diagonal inverso */}
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full blur-3xl"
          style={{ 
            background: 'radial-gradient(circle, rgba(147, 51, 234, 0.06) 0%, rgba(59, 130, 246, 0.04) 40%, transparent 70%)',
          }}
          animate={{
            left: ['65%', '5%', '65%', '5%', '65%'],
            top: ['5%', '60%', '5%', '60%', '5%'],
            scale: [1, 1.1, 0.95, 1.1, 1],
            opacity: [0.6, 0.75, 0.5, 0.75, 0.6],
          }}
          transition={{
            duration: 35,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.25, 0.5, 0.75, 1],
            delay: 5
          }}
        />
        {/* Degradado azul animado - rebote tipo DVD diagonal alternado */}
        <motion.div
          className="absolute w-96 h-96 rounded-full blur-3xl"
          style={{ 
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
          }}
          animate={{
            left: ['70%', '5%', '70%', '5%', '70%'],
            top: ['65%', '5%', '65%', '5%', '65%'],
            scale: [1, 0.98, 1.05, 0.98, 1],
          }}
          transition={{
            duration: 28,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.25, 0.5, 0.75, 1],
            delay: 3
          }}
        />
      </div>

      {/* Calendario lateral izquierdo */}
      <div className="w-64 flex flex-col flex-shrink-0 relative transition-colors duration-300" style={{ backgroundColor: colors.calendarBg }}>
        <div className="flex-1 relative overflow-hidden pt-24">
          <div 
            ref={calendarScrollRef}
            className="h-full overflow-y-auto"
            style={{ 
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitScrollbar: { display: 'none' }
            }}
          >
            <style>{`
              .calendar-scroll::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <div className={`calendar-scroll px-4 pt-4 pb-4 space-y-6`}>
              {calendarMonths.map((monthData, monthIndex) => {
                const days = getDaysInMonth(monthData.year, monthData.month);
                const monthKey = `${monthData.year}-${monthData.month}`;
                
                return (
                  <motion.div
                    key={monthKey}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: monthIndex * 0.05 }}
                    className="space-y-3"
                  >
                    <h3 className="text-xs font-medium uppercase tracking-wider px-1 transition-colors duration-300" style={{ color: colors.textSecondary }}>
                      {monthNames[monthData.month]} {monthData.year}
                    </h3>
                    
                    {/* Días de la semana */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {dayNames.map(day => (
                        <div key={day} className="text-center text-xs font-medium py-1 transition-colors duration-300" style={{ color: colors.textTertiary }}>
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    {/* Días del mes */}
                    <div className="grid grid-cols-7 gap-1">
                      {days.map((dayData, dayIndex) => {
                        if (dayData.day === 0) {
                          return <div key={`empty-${dayIndex}`} className="aspect-square" />;
                        }
                        
                        const isToday = dayData.date === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                        
                        return (
                          <motion.div
                            key={dayData.date}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: (monthIndex * 0.05) + (dayIndex * 0.001) }}
                            className="aspect-square flex items-center justify-center text-sm rounded transition-all cursor-pointer font-medium"
                            style={{
                              background: dayData.hasActivity 
                                ? isDarkMode 
                                  ? 'linear-gradient(to bottom right, rgba(147, 51, 234, 0.4), rgba(59, 130, 246, 0.4))'
                                  : 'linear-gradient(to bottom right, rgba(79, 70, 229, 0.5), rgba(67, 56, 202, 0.5))'
                                : 'transparent',
                              border: dayData.hasActivity 
                                ? isDarkMode 
                                  ? '1px solid rgba(147, 51, 234, 0.6)'
                                  : '1px solid rgba(79, 70, 229, 0.7)'
                                : 'none',
                              color: dayData.hasActivity ? colors.text : colors.textSecondary,
                              boxShadow: isToday ? `0 0 0 2px ${isDarkMode ? 'rgba(59, 130, 246, 0.5)' : 'rgba(79, 70, 229, 0.6)'}` : 'none'
                            }}
                            onMouseEnter={(e) => {
                              if (!dayData.hasActivity) {
                                e.currentTarget.style.color = colors.text;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!dayData.hasActivity) {
                                e.currentTarget.style.color = colors.textSecondary;
                              }
                            }}
                            onClick={() => {
                              const element = document.querySelector(`[data-date="${dayData.date}"]`);
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }}
                          >
                            {dayData.day}
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
          
          {/* Overlay superior con blur difuminado */}
          {showCalendarTopFade && (
            <div 
              className="absolute left-0 right-0 pointer-events-none z-10 transition-opacity duration-500"
              style={{
                top: '96px', // Ajustar para que esté después del header (pt-24 = 96px)
                height: '120px',
                background: isDarkMode
                  ? 'linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.9) 20%, rgba(0, 0, 0, 0.6) 50%, rgba(0, 0, 0, 0.3) 70%, transparent 100%)'
                  : `linear-gradient(to bottom, ${colors.calendarBg} 0%, ${colors.calendarBg}dd 20%, ${colors.calendarBg}99 50%, ${colors.calendarBg}4d 70%, transparent 100%)`,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)'
              }}
            />
          )}
          
          {/* Overlay inferior con blur difuminado */}
          {showCalendarBottomFade && (
            <div 
              className="absolute bottom-0 left-0 right-0 pointer-events-none z-10 transition-opacity duration-500"
              style={{
                height: '120px',
                background: isDarkMode
                  ? 'linear-gradient(to top, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.9) 20%, rgba(0, 0, 0, 0.6) 50%, rgba(0, 0, 0, 0.3) 70%, transparent 100%)'
                  : `linear-gradient(to top, ${colors.calendarBg} 0%, ${colors.calendarBg}dd 20%, ${colors.calendarBg}99 50%, ${colors.calendarBg}4d 70%, transparent 100%)`,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                maskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 100%)'
              }}
            />
          )}
        </div>
      </div>

      {/* Contenedor principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header minimalista - Fijo arriba */}
      <header className="relative z-20 px-8 py-6 flex-shrink-0 transition-colors duration-300" style={{ backgroundColor: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-wider transition-colors duration-300" style={{ color: colors.text }}>TIMELINE</h1>
            <p className="text-sm mt-1 transition-colors duration-300" style={{ color: colors.textTertiary }}>
              {showArchivedView ? 'Actividades archivadas' : 'Gestión de actividades y pendientes'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1 pr-3 mr-3 transition-colors duration-300" style={{ borderRight: `1px solid ${colors.border}` }}>
              <button
                onClick={() => {
                  setShowArchivedView(false);
                  loadActivities();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: !showArchivedView ? colors.bgHover : 'transparent',
                  color: !showArchivedView ? colors.text : colors.textSecondary
                }}
              >
                Activas
              </button>
              <button
                onClick={async () => {
                  setShowArchivedView(true);
                  await loadArchivedActivities();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                style={{
                  backgroundColor: showArchivedView ? colors.bgHover : 'transparent',
                  color: showArchivedView ? colors.text : colors.textSecondary
                }}
              >
                <Archive className="w-3.5 h-3.5" />
                Archivadas ({archivedActivities.length})
              </button>
            </div>
            {selectedActivities.size > 0 && (
              <>
                {showArchivedView ? (
                  <button
                    onClick={async () => {
                      const count = selectedActivities.size;
                      try {
                        await Promise.all(
                          Array.from(selectedActivities).map(id => 
                            handleUnarchiveActivity(id)
                          )
                        );
                        setSelectedActivities(new Set());
                        await loadArchivedActivities();
                        await loadActivities();
                        toast.success(`${count} actividades desarchivadas`);
                      } catch (error) {
                        console.error('Error unarchiving activities:', error);
                        toast.error('Error al desarchivar actividades');
                      }
                    }}
                    className="px-4 py-2 text-blue-400/70 hover:text-blue-400 transition-colors text-sm flex items-center gap-2"
                  >
                    <ArchiveRestore className="w-4 h-4" />
                    Desarchivar ({selectedActivities.size})
                  </button>
                ) : (
                  <button
                    onClick={handleArchiveSelected}
                    className="px-4 py-2 text-blue-400/70 hover:text-blue-400 transition-colors text-sm flex items-center gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    Archivar ({selectedActivities.size})
                  </button>
                )}
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 text-red-400/70 hover:text-red-400 transition-colors text-sm flex items-center gap-2"
                >
                  <Trash className="w-4 h-4" />
                  Eliminar ({selectedActivities.size})
                </button>
                <button
                  onClick={() => setSelectedActivities(new Set())}
                  className="px-4 py-2 text-white/60 hover:text-white transition-colors text-sm"
                >
                  Cancelar
                </button>
              </>
            )}
            {activities.length > 0 && selectedActivities.size === 0 && (
              <button
                onClick={() => setShowDeleteAllModal(true)}
                className="px-4 py-2 text-red-400/70 hover:text-red-400 transition-colors text-sm flex items-center gap-2"
              >
                <Trash className="w-4 h-4" />
                Eliminar Todo
              </button>
            )}
            {/* Toggle de tema */}
            <button
              onClick={toggleTheme}
              className="px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm flex items-center gap-2"
              style={{ color: colors.textSecondary }}
              title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            
            <button
              onClick={() => {
                if (user?.role_name === 'admin') {
                  // Administradores pueden salir del modo dirección
                  window.location.href = '/';
                } else {
                  // Usuarios dirección hacen logout
                  logout();
                }
              }}
              className="px-4 py-2 transition-colors text-sm"
              style={{ color: colors.textSecondary }}
            >
              {user?.role_name === 'admin' ? 'Salir' : 'Cerrar Sesión'}
            </button>
          </div>
        </div>
      </header>

      {/* Timeline principal - Con scroll interno */}
      <main className="relative z-10 flex-1 overflow-hidden">
        {/* Efecto de velocidad de la luz cuando se hace scroll rápido - Sutil y discreto */}
        {isFastScrolling && scrollIntensity > 0 && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-30"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: scrollIntensity * 0.35 // Máximo 35% de opacidad
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              background: `radial-gradient(ellipse at center, rgba(147, 51, 234, ${scrollIntensity * 0.15}) 0%, rgba(59, 130, 246, ${scrollIntensity * 0.12}) 35%, transparent 65%)`,
              mixBlendMode: 'screen',
              filter: `blur(${50 + scrollIntensity * 30}px)`, // Blur entre 50-80px
            }}
          />
        )}
        <div 
          ref={scrollContainerRef}
          className="h-full overflow-y-auto px-8 py-12 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent',
          }}
        >
          {/* Overlay superior con blur difuminado */}
          {showTopFade && (
            <div 
              className="fixed top-[73px] left-0 right-0 pointer-events-none z-10 transition-opacity duration-500"
              style={{
                height: '120px',
                background: isDarkMode
                  ? 'linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.9) 20%, rgba(0, 0, 0, 0.6) 50%, rgba(0, 0, 0, 0.3) 70%, transparent 100%)'
                  : `linear-gradient(to bottom, ${colors.bg} 0%, ${colors.bg}dd 20%, ${colors.bg}99 50%, ${colors.bg}4d 70%, transparent 100%)`,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)'
              }}
            />
          )}

          {/* Overlay inferior con blur difuminado */}
          {showBottomFade && (
            <div 
              className="fixed bottom-0 left-0 right-0 pointer-events-none z-10 transition-opacity duration-500"
              style={{
                height: '120px',
                background: isDarkMode
                  ? 'linear-gradient(to top, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.9) 20%, rgba(0, 0, 0, 0.6) 50%, rgba(0, 0, 0, 0.3) 70%, transparent 100%)'
                  : `linear-gradient(to top, ${colors.bg} 0%, ${colors.bg}dd 20%, ${colors.bg}99 50%, ${colors.bg}4d 70%, transparent 100%)`,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                maskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 100%)'
              }}
            />
          )}

          <div className="max-w-4xl mx-auto" ref={timelineRef}>
          {showArchivedView ? (
            // Vista de archivados
            archivedActivities.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-24"
              >
                        <Archive className="w-16 h-16 mx-auto mb-4 transition-colors duration-300" style={{ color: colors.textTertiary }} />
                        <p className="text-lg transition-colors duration-300" style={{ color: colors.textSecondary }}>No hay actividades archivadas</p>
              </motion.div>
            ) : (
              <div className="relative">
                {/* Línea vertical del timeline */}
                <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-gray-500/30 via-gray-500/30 to-transparent"></div>

                {/* Actividades archivadas agrupadas por fecha */}
                {(() => {
                  const archivedGrouped = archivedActivities.reduce((acc, activity) => {
                    const dateKey = activity.due_date;
                    if (!acc[dateKey]) {
                      acc[dateKey] = [];
                    }
                    acc[dateKey].push(activity);
                    return acc;
                  }, {} as Record<string, TimelineActivity[]>);

                  const archivedSortedDates = Object.keys(archivedGrouped).sort((a, b) => 
                    new Date(a).getTime() - new Date(b).getTime()
                  );

                  return archivedSortedDates.map((dateKey, dateIndex) => {
                    const dateActivities = archivedGrouped[dateKey];
                    return (
                      <motion.div
                        key={dateKey}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: dateIndex * 0.1 }}
                        className="mb-12 relative"
                      >
                        {/* Fecha */}
                        <div className="flex items-center mb-6">
                          <div className="w-16 h-px bg-white/10"></div>
                          <div className="ml-4">
                            <h2 className="text-sm font-medium uppercase tracking-wider transition-colors duration-300" style={{ color: colors.textSecondary }}>
                              {formatDate(dateKey)}
                            </h2>
                            <p className="text-xs mt-1 transition-colors duration-300" style={{ color: colors.textTertiary }}>
                              {new Date(dateKey).toLocaleDateString('es-ES', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Actividades del día */}
                        <div className="ml-20 space-y-4">
                          {dateActivities.map((activity, activityIndex) => (
                            <motion.div
                              key={activity.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: (dateIndex * 0.1) + (activityIndex * 0.05) }}
                              onClick={() => {
                                if (!selectedActivities.size && !isDragging && !draggingActivity) {
                                  setShowDetailModal(activity);
                                }
                              }}
                              onContextMenu={(e) => handleContextMenu(e, activity.id)}
                              onMouseDown={(e) => {
                                if (selectedActivities.size === 0 && e.button === 0) {
                                  handleDragStart(e, activity.id);
                                }
                              }}
                              onTouchStart={(e) => {
                                if (selectedActivities.size === 0) {
                                  handleDragStart(e, activity.id);
                                }
                              }}
                              className="group cursor-pointer relative"
                              data-date={activity.due_date}
                              data-activity-id={activity.id}
                            >
                              <div className="relative">
                                {/* Punto en la línea */}
                                <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 border-2 border-black shadow-lg"></div>

                                {/* Card de actividad */}
                                <div 
                                  className="backdrop-blur-sm border rounded-lg p-5 transition-all duration-300 relative"
                                  style={{
                                    backgroundColor: selectedActivities.has(activity.id)
                                      ? colors.bgSelected
                                      : colors.bgSecondary,
                                    borderColor: selectedActivities.has(activity.id)
                                      ? 'rgba(147, 51, 234, 0.4)'
                                      : colors.border
                                  }}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    {/* Círculo de selección múltiple */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleSelection(activity.id);
                                      }}
                                      className="flex-shrink-0 mt-0.5"
                                    >
                                      {selectedActivities.has(activity.id) ? (
                                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center border-2 transition-colors duration-300" style={{ borderColor: colors.border }}>
                                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                        </div>
                                      ) : (
                                        <Circle className="w-5 h-5 transition-colors duration-300" style={{ color: colors.textTertiary }} />
                                      )}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-medium transition-colors duration-300" style={{ color: colors.textSecondary }}>
                                          {activity.title}
                                        </h3>
                                      </div>
                                      {activity.description && (
                                        <p className="text-sm mt-2 line-clamp-2 transition-colors duration-300" style={{ color: colors.textSecondary }}>
                                          {activity.description}
                                        </p>
                                      )}
                                      
                                      {/* Asignados */}
                                      {activity.asignado_a && activity.asignado_a.length > 0 && (
                                        <div className="flex items-center gap-2 mt-2">
                                          <Users className="w-3.5 h-3.5 transition-colors duration-300" style={{ color: colors.textTertiary }} />
                                          <div className="flex items-center gap-1 flex-wrap">
                                            {activity.asignado_a.map((name, idx) => (
                                              <span 
                                                key={idx}
                                                className="text-xs px-2 py-0.5 rounded transition-colors duration-300"
                                                style={{
                                                  color: colors.textSecondary,
                                                  backgroundColor: colors.bgSecondary
                                                }}
                                              >
                                                {name}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      <div className="flex items-center gap-4 mt-3 text-xs transition-colors duration-300" style={{ color: colors.textTertiary }}>
                                        <span 
                                          className="px-2 py-1 rounded border capitalize transition-colors duration-300"
                                          style={{
                                            backgroundColor: getPriorityColor(activity.priority).bgColor,
                                            borderColor: getPriorityColor(activity.priority).borderColor,
                                            color: colors.text
                                          }}
                                        >
                                          {getPriorityColor(activity.priority).label}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Botón de menú contextual */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleContextMenu(e, activity.id);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded flex-shrink-0 transition-colors duration-300"
                                      style={{ 
                                        backgroundColor: 'transparent',
                                        color: colors.textTertiary
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = colors.bgHover;
                                        e.currentTarget.style.color = colors.textSecondary;
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = colors.textTertiary;
                                      }}
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  });
                })()}
              </div>
            )
          ) : sortedDates.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24"
            >
              <Calendar className="w-16 h-16 mx-auto mb-4 transition-colors duration-300" style={{ color: colors.textTertiary }} />
              <p className="text-lg transition-colors duration-300" style={{ color: colors.textSecondary }}>No hay actividades programadas</p>
              <p className="text-sm mt-2 transition-colors duration-300" style={{ color: colors.textTertiary }}>Agrega tu primera actividad usando el botón +</p>
            </motion.div>
          ) : (
            <div className="relative">
              {/* Línea vertical del timeline */}
              <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-purple-500/30 via-blue-500/30 to-transparent"></div>

              {/* Actividades agrupadas por fecha */}
              {sortedDates.map((dateKey, dateIndex) => {
                const dateActivities = groupedActivities[dateKey];
                return (
                  <motion.div
                    key={dateKey}
                    animate={isFastScrolling ? {
                      opacity: [1, 0.7, 1],
                      scale: [1, 1.02, 1],
                    } : {}}
                    transition={isFastScrolling ? {
                      duration: 0.3,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    } : {}}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: dateIndex * 0.1 }}
                    className="mb-12 relative"
                  >
                        {/* Fecha */}
                        <div className="flex items-center mb-6">
                          <div className="w-16 h-px transition-colors duration-300" style={{ backgroundColor: colors.border }}></div>
                          <div className="ml-4">
                            <h2 className="text-sm font-medium uppercase tracking-wider transition-colors duration-300" style={{ color: colors.textSecondary }}>
                              {formatDate(dateKey)}
                            </h2>
                            <p className="text-xs mt-1 transition-colors duration-300" style={{ color: colors.textTertiary }}>
                              {new Date(dateKey).toLocaleDateString('es-ES', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                          </div>
                        </div>

                    {/* Actividades del día */}
                    <div className="ml-20 space-y-4">
                          {dateActivities.map((activity, activityIndex) => (
                            <motion.div
                              key={activity.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ 
                                opacity: 1,
                                scale: 1,
                              }}
                              transition={{ 
                                delay: (dateIndex * 0.1) + (activityIndex * 0.05),
                                duration: 0.3,
                                ease: 'easeInOut'
                              }}
                              onClick={(e) => {
                                // Solo abrir modal si no hay arrastre activo y no hay selección múltiple
                                const dragStart = dragStartPositionsRef.current.get(activity.id);
                                const isClick = dragStart && (Date.now() - dragStart.time < 300) && 
                                  Math.abs(e.clientX - dragStart.x) < 5 && Math.abs(e.clientY - dragStart.y) < 5;
                                
                                if (!selectedActivities.size && !isDragging && !draggingActivity && (isClick || !dragStart)) {
                                  setShowDetailModal(activity);
                                }
                                dragStartPositionsRef.current.delete(activity.id);
                              }}
                              onContextMenu={(e) => handleContextMenu(e, activity.id)}
                              onMouseDown={(e) => {
                                if (selectedActivities.size === 0 && e.button === 0) {
                                  dragStartPositionsRef.current.set(activity.id, {
                                    x: e.clientX,
                                    y: e.clientY,
                                    time: Date.now()
                                  });
                                }
                              }}
                              onMouseMove={(e) => {
                                const dragStart = dragStartPositionsRef.current.get(activity.id);
                                if (dragStart && selectedActivities.size === 0) {
                                  const deltaX = Math.abs(e.clientX - dragStart.x);
                                  const deltaY = Math.abs(e.clientY - dragStart.y);
                                  // Si el movimiento es mayor a 10px, iniciar arrastre
                                  if (deltaX > 10 || deltaY > 10) {
                                    handleDragStart(e, activity.id);
                                    dragStartPositionsRef.current.delete(activity.id);
                                  }
                                }
                              }}
                              onMouseUp={() => {
                                // Mantener la posición para verificar si fue un clic
                                setTimeout(() => {
                                  dragStartPositionsRef.current.delete(activity.id);
                                }, 300);
                              }}
                              onMouseLeave={() => {
                                dragStartPositionsRef.current.delete(activity.id);
                              }}
                              onTouchStart={(e) => {
                                if (selectedActivities.size === 0) {
                                  const touch = e.touches[0];
                                  dragStartPositionsRef.current.set(activity.id, {
                                    x: touch.clientX,
                                    y: touch.clientY,
                                    time: Date.now()
                                  });
                                }
                              }}
                              onTouchMove={(e) => {
                                const dragStart = dragStartPositionsRef.current.get(activity.id);
                                if (dragStart && selectedActivities.size === 0) {
                                  const touch = e.touches[0];
                                  const deltaX = Math.abs(touch.clientX - dragStart.x);
                                  const deltaY = Math.abs(touch.clientY - dragStart.y);
                                  // Si el movimiento es mayor a 10px, iniciar arrastre
                                  if (deltaX > 10 || deltaY > 10) {
                                    handleDragStart(e, activity.id);
                                    dragStartPositionsRef.current.delete(activity.id);
                                  }
                                }
                              }}
                              onTouchEnd={() => {
                                setTimeout(() => {
                                  dragStartPositionsRef.current.delete(activity.id);
                                }, 300);
                              }}
                              className="group cursor-pointer relative"
                              data-date={activity.due_date}
                              data-activity-id={activity.id}
                            >
                          <div className="relative">
                            {/* Punto en la línea */}
                            <div 
                              className={`absolute -left-12 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full ${getPriorityColor(activity.priority).bgGradient} border-2 border-black shadow-lg`}
                            ></div>

                            {/* Card de actividad */}
                            <div 
                              className="backdrop-blur-sm border rounded-lg p-5 transition-all duration-300 relative"
                              style={{
                                backgroundColor: activity.realizado 
                                  ? colors.bgCompleted
                                  : selectedActivities.has(activity.id)
                                  ? colors.bgSelected
                                  : colors.bgSecondary,
                                borderColor: activity.realizado 
                                  ? 'rgba(34, 197, 94, 0.2)' 
                                  : selectedActivities.has(activity.id)
                                  ? 'rgba(147, 51, 234, 0.4)'
                                  : colors.border
                              }}
                              onMouseEnter={(e) => {
                                if (!activity.realizado && !selectedActivities.has(activity.id)) {
                                  e.currentTarget.style.backgroundColor = colors.bgHover;
                                  e.currentTarget.style.borderColor = colors.borderHover;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!activity.realizado && !selectedActivities.has(activity.id)) {
                                  e.currentTarget.style.backgroundColor = colors.bgSecondary;
                                  e.currentTarget.style.borderColor = colors.border;
                                } else if (activity.realizado) {
                                  e.currentTarget.style.backgroundColor = colors.bgCompleted;
                                  e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.2)';
                                } else if (selectedActivities.has(activity.id)) {
                                  e.currentTarget.style.backgroundColor = colors.bgSelected;
                                  e.currentTarget.style.borderColor = 'rgba(147, 51, 234, 0.4)';
                                }
                              }}
                            >
                              <div className="flex items-start justify-between gap-4">
                                {/* Círculo de selección múltiple */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleSelection(activity.id);
                                  }}
                                  className="flex-shrink-0 mt-0.5"
                                >
                                  {selectedActivities.has(activity.id) ? (
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center border-2 border-white/20">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                    </div>
                                  ) : (
                                    <Circle className="w-5 h-5 text-white/40 hover:text-white/60 transition-colors" />
                                  )}
                                </button>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 
                                      className="font-medium transition-colors duration-300"
                                      style={{
                                        color: activity.realizado ? colors.textTertiary : colors.text,
                                        textDecoration: activity.realizado ? 'line-through' : 'none'
                                      }}
                                    >
                                      {activity.title}
                                    </h3>
                                  </div>
                                  {activity.description && (
                                    <p 
                                      className="text-sm mt-2 line-clamp-2 transition-colors duration-300"
                                      style={{
                                        color: activity.realizado ? colors.textTertiary : colors.textSecondary
                                      }}
                                    >
                                      {activity.description}
                                    </p>
                                  )}
                                  
                                  {/* Asignados */}
                                  {activity.asignado_a && activity.asignado_a.length > 0 && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <Users className="w-3.5 h-3.5 text-white/40" />
                                      <div className="flex items-center gap-1 flex-wrap">
                                        {activity.asignado_a.map((name, idx) => (
                                          <span 
                                            key={idx}
                                            className="text-xs text-white/50 px-2 py-0.5 rounded bg-white/5"
                                          >
                                            {name}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
                                    <span 
                                      className="px-2 py-1 rounded text-white/60 border capitalize"
                                      style={{
                                        backgroundColor: getPriorityColor(activity.priority).bgColor,
                                        borderColor: getPriorityColor(activity.priority).borderColor
                                      }}
                                    >
                                      {getPriorityColor(activity.priority).label}
                                    </span>
                                  </div>
                                </div>

                                {/* Botón de menú contextual */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleContextMenu(e, activity.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded flex-shrink-0 hover:bg-white/10"
                                >
                                  <MoreVertical className="w-4 h-4 text-white/40 hover:text-white/60" />
                                </button>
                              </div>

                              {/* Toggle realizado - Esquina inferior derecha */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleRealizado(activity);
                                }}
                                className="absolute bottom-3 right-3 flex items-center gap-2 px-2 py-1 rounded-lg transition-colors duration-300"
                                style={{
                                  backgroundColor: 'transparent',
                                  color: colors.textSecondary
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = colors.bgHover;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                                title={activity.realizado ? 'Marcar como no realizada' : 'Marcar como realizada'}
                              >
                                {activity.realizado ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span className="text-xs text-emerald-400/80">
                                      Realizada
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Circle className="w-4 h-4 transition-colors duration-300" style={{ color: colors.textTertiary }} />
                                    <span className="text-xs transition-colors duration-300" style={{ color: colors.textSecondary }}>
                                      Realizar
                                    </span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </main>

      {/* Botón flotante + */}
      {!showArchivedView && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full shadow-2xl flex items-center justify-center z-50 hover:shadow-purple-500/50 transition-all"
        >
          <Plus className="w-8 h-8 text-white" />
        </motion.button>
      )}

      {/* Modal agregar actividad */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-colors duration-300"
            style={{ backgroundColor: colors.modalOverlay }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="border rounded-2xl p-8 max-w-2xl w-full transition-colors duration-300"
              style={{ backgroundColor: colors.modalBg, color: colors.text, borderColor: colors.border }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-light transition-colors duration-300" style={{ color: colors.text }}>Nueva Actividad</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="transition-colors duration-300"
                  style={{ color: colors.textTertiary }}
                  onMouseEnter={(e) => e.currentTarget.style.color = colors.text}
                  onMouseLeave={(e) => e.currentTarget.style.color = colors.textTertiary}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escribe tu lista de actividades y pendientes con fechas...&#10;&#10;Ejemplo:&#10;- Revisar presupuesto Q1 el 15 de febrero&#10;- Reunión con equipo de marketing el 20 de febrero&#10;- Presentación ejecutiva el 25 de febrero"
                className="w-full h-64 border rounded-lg p-4 resize-none focus:outline-none transition-colors duration-300"
                style={{
                  backgroundColor: colors.bgSecondary,
                  borderColor: colors.border,
                  color: colors.text
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = isDarkMode ? 'rgba(168, 85, 247, 0.5)' : 'rgba(79, 70, 229, 0.6)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                }}
              />

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 transition-colors duration-300"
                  style={{ color: colors.textSecondary }}
                  onMouseEnter={(e) => e.currentTarget.style.color = colors.text}
                  onMouseLeave={(e) => e.currentTarget.style.color = colors.textSecondary}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleProcessText}
                  disabled={!inputText.trim() || processing}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg hover:from-purple-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {processing ? 'Procesando...' : 'Procesar con IA'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal previsualización */}
      <AnimatePresence>
        {showPreviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-colors duration-300"
            style={{ backgroundColor: colors.modalOverlay }}
            onClick={() => setShowPreviewModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="border rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-colors duration-300"
              style={{
                backgroundColor: colors.modalBg,
                borderColor: colors.border
              }}
            >
              {/* Header elegante */}
              <div className="px-8 pt-8 pb-6 border-b transition-colors duration-300" style={{ borderColor: colors.border }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-light tracking-tight mb-1 transition-colors duration-300" style={{ color: colors.text }}>Previsualización</h2>
                    <p className="text-sm font-light transition-colors duration-300" style={{ color: colors.textSecondary }}>
                      Revisa y elimina duplicados antes de guardar
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowPreviewModal(false)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300"
                    style={{
                      color: colors.textTertiary,
                      backgroundColor: 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.bgHover;
                      e.currentTarget.style.color = colors.text;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = colors.textTertiary;
                    }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              {/* Contenido con scroll */}
              <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent bg-transparent">
                <div className="space-y-4 bg-transparent">
                  {previewData.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group relative rounded-2xl border transition-all duration-300 backdrop-blur-sm"
                      style={{
                        backgroundColor: item.isDuplicate 
                          ? 'rgba(249, 115, 22, 0.15)' 
                          : colors.bgSecondary,
                        borderColor: item.isDuplicate 
                          ? 'rgba(249, 115, 22, 0.4)' 
                          : colors.border
                      }}
                      onMouseEnter={(e) => {
                        if (!item.isDuplicate) {
                          e.currentTarget.style.backgroundColor = colors.bgHover;
                          e.currentTarget.style.borderColor = colors.borderHover;
                        } else {
                          e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.5)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!item.isDuplicate) {
                          e.currentTarget.style.backgroundColor = colors.bgSecondary;
                          e.currentTarget.style.borderColor = colors.border;
                        } else {
                          e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.4)';
                        }
                      }}
                    >
                      <div className="p-5" style={{ backgroundColor: 'transparent' }}>
                        <div className="flex items-start gap-4">
                          {/* Checkbox elegante */}
                          <label className="relative flex items-center cursor-pointer mt-0.5">
                            <input
                              type="checkbox"
                              checked={selectedDuplicates.has(index)}
                              onChange={(e) => {
                                const newSet = new Set(selectedDuplicates);
                                if (e.target.checked) {
                                  newSet.add(index);
                                } else {
                                  newSet.delete(index);
                                }
                                setSelectedDuplicates(newSet);
                              }}
                              className="sr-only"
                            />
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                              selectedDuplicates.has(index)
                                ? 'bg-gradient-to-br from-purple-500 to-blue-600 border-transparent'
                                : item.isDuplicate
                                ? 'border-orange-500/50 group-hover:border-orange-500/70'
                                : 'border-white/30 group-hover:border-white/50'
                            }`}>
                              {selectedDuplicates.has(index) && (
                                <motion.svg
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </motion.svg>
                              )}
                            </div>
                          </label>

                          {/* Contenido */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h3 className="text-lg font-normal leading-tight pr-2 transition-colors duration-300" style={{ color: colors.text }}>
                                {item.activity.title}
                              </h3>
                              {item.isDuplicate && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="px-2.5 py-1 bg-orange-500/40 text-orange-200 text-xs font-medium rounded-lg border border-orange-500/60 flex-shrink-0"
                                >
                                  Duplicado
                                </motion.span>
                              )}
                            </div>
                            
                            {item.activity.description && (
                              <p className="text-sm font-light mb-3 leading-relaxed transition-colors duration-300" style={{ color: colors.textSecondary }}>
                                {item.activity.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-5 text-xs">
                              <div className="flex items-center gap-1.5 transition-colors duration-300" style={{ color: colors.textSecondary }}>
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="font-light">{formatDate(item.activity.due_date)}</span>
                              </div>
                              {item.activity.priority && (
                                <div 
                                  className="px-2 py-0.5 rounded-md text-xs font-medium border capitalize transition-colors duration-300"
                                  style={{
                                    backgroundColor: getPriorityColor(item.activity.priority || 'media').bgColor,
                                    borderColor: getPriorityColor(item.activity.priority || 'media').borderColor,
                                    color: colors.text
                                  }}
                                >
                                  {getPriorityColor(item.activity.priority || 'media').label}
                                </div>
                              )}
                            </div>
                            
                            {item.reason && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-3 pt-3 border-t border-orange-500/40"
                              >
                                <p className="text-orange-200 text-xs font-light flex items-start gap-1.5" style={{ color: '#fcd34d' }}>
                                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                  <span>{item.reason}</span>
                                </p>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Footer minimalista */}
              <div className="px-8 py-5 border-t flex items-center justify-between transition-colors duration-300" style={{ borderColor: colors.border, backgroundColor: colors.bgSecondary }}>
                <div className="text-sm font-light transition-colors duration-300" style={{ color: colors.textSecondary }}>
                  {previewData.length - selectedDuplicates.size} de {previewData.length} actividades se guardarán
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="px-5 py-2.5 transition-colors text-sm font-light duration-300"
                    style={{ color: colors.textSecondary }}
                    onMouseEnter={(e) => e.currentTarget.style.color = colors.text}
                    onMouseLeave={(e) => e.currentTarget.style.color = colors.textSecondary}
                  >
                    Cancelar
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveActivities}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-xl hover:from-purple-600 hover:to-blue-700 transition-all text-sm font-medium shadow-lg shadow-purple-500/25"
                  >
                    Guardar Actividades
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal detalle/edición */}
      <AnimatePresence>
        {showDetailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-colors duration-300"
              style={{ backgroundColor: colors.modalOverlay }}
            onClick={() => {
              if (!isEditing) {
                setShowDetailModal(null);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col border relative transition-colors duration-300"
              style={{ backgroundColor: colors.modalBg, color: colors.text, borderColor: colors.border }}
            >
              {/* Fondo animado con degradado en movimiento */}
              <motion.div
                className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    background: [
                      'radial-gradient(circle at 20% 30%, rgba(147, 51, 234, 0.15) 0%, transparent 50%)',
                      'radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)',
                      'radial-gradient(circle at 50% 50%, rgba(147, 51, 234, 0.15) 0%, transparent 50%)',
                      'radial-gradient(circle at 20% 30%, rgba(147, 51, 234, 0.15) 0%, transparent 50%)',
                    ]
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    background: [
                      'radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
                      'radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
                      'radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
                    ]
                  }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                />
              </motion.div>
              
              <div className="relative z-10 flex flex-col h-full">
                      {/* Header con gradiente sutil */}
                      <div className="relative px-8 pt-8 pb-6 border-b transition-colors duration-300" style={{ backgroundColor: colors.bgSecondary, borderColor: colors.border }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar/Icono de actividad */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                      className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 p-0.5 shadow-lg"
                    >
                      <div className="w-full h-full rounded-2xl flex items-center justify-center transition-colors duration-300" style={{ backgroundColor: colors.bg }}>
                        <Calendar className="w-7 h-7 transition-colors duration-300" style={{ color: colors.text }} />
                      </div>
                    </motion.div>
                    <div>
                      <motion.h2 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="text-2xl font-light tracking-wide transition-colors duration-300"
                        style={{ color: colors.text }}
                      >
                        {isEditing ? 'Editar Actividad' : 'Detalle de Actividad'}
                      </motion.h2>
                      {!isEditing && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="text-sm mt-1 transition-colors duration-300"
                          style={{ color: colors.textTertiary }}
                        >
                          {formatDate(showDetailModal.due_date)}
                        </motion.p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <motion.button
                        initial={{ opacity: 0, rotate: -90 }}
                        animate={{ opacity: 1, rotate: 0 }}
                        transition={{ delay: 0.25 }}
                        onClick={() => handleStartEdit(showDetailModal)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group"
                        style={{ backgroundColor: colors.bgSecondary, color: colors.textSecondary }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = colors.bgHover;
                          e.currentTarget.style.color = colors.text;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = colors.bgSecondary;
                          e.currentTarget.style.color = colors.textSecondary;
                        }}
                      >
                        <Edit2 className="w-5 h-5 transition-transform group-hover:scale-110" />
                      </motion.button>
                    ) : null}
                    <motion.button
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      transition={{ delay: 0.3 }}
                      onClick={() => {
                        if (isEditing) {
                          handleCancelEdit();
                        }
                        setShowDetailModal(null);
                      }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group"
                      style={{ backgroundColor: colors.bgSecondary, color: colors.textTertiary }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.bgHover;
                        e.currentTarget.style.color = colors.text;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = colors.bgSecondary;
                        e.currentTarget.style.color = colors.textTertiary;
                      }}
                    >
                      <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Contenido con scroll */}
              <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent relative z-10">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-6"
                >
                  {/* Sección: Información Principal */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                        Información Principal
                      </h4>
                    </div>

                    {/* Título */}
                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-medium text-white/50 mb-2">
                        <span>Título</span>
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingActivity.title || ''}
                          onChange={(e) => setEditingActivity({ ...editingActivity, title: e.target.value })}
                          className="w-full px-4 py-3 text-sm border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 bg-white/5 text-white placeholder-white/30 transition-all duration-200 hover:border-white/20"
                          placeholder="Título de la actividad"
                        />
                      ) : (
                        <p className="text-white text-lg font-light leading-relaxed">{showDetailModal.title}</p>
                      )}
                    </div>

                    {/* Descripción */}
                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-medium text-white/50 mb-2">
                        <span>Descripción</span>
                      </label>
                      {isEditing ? (
                        <textarea
                          value={editingActivity.description || ''}
                          onChange={(e) => setEditingActivity({ ...editingActivity, description: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-3 text-sm border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 bg-white/5 text-white placeholder-white/30 transition-all duration-200 resize-none hover:border-white/20"
                          placeholder="Descripción de la actividad"
                        />
                      ) : (
                        <p className="text-white/70 text-sm font-light leading-relaxed">
                          {showDetailModal.description || 'Sin descripción'}
                        </p>
                      )}
                    </div>
                  </motion.div>

                  {/* Sección: Detalles */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                        Detalles
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {/* Fecha */}
                      <div className="group">
                        <label className="flex items-center space-x-2 text-xs font-medium text-white/50 mb-2">
                          <Calendar className="w-4 h-4 text-white/40 group-focus-within:text-purple-400 transition-colors" />
                          <span>Fecha compromiso</span>
                        </label>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editingActivity.due_date || ''}
                            onChange={(e) => setEditingActivity({ ...editingActivity, due_date: e.target.value })}
                            className="w-full px-4 py-3 text-sm border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 bg-white/5 text-white transition-all duration-200 hover:border-white/20"
                          />
                        ) : (
                          <p className="text-white/80 text-sm font-light">{formatDate(showDetailModal.due_date)}</p>
                        )}
                      </div>

                      {/* Prioridad */}
                      <div className="group">
                        <label className="flex items-center space-x-2 text-xs font-medium text-white/50 mb-2">
                          <span>Prioridad</span>
                        </label>
                        {isEditing ? (
                          <select
                            value={editingActivity.priority || 'media'}
                            onChange={(e) => setEditingActivity({ ...editingActivity, priority: e.target.value as any })}
                            className="w-full px-4 py-3 text-sm border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 bg-white/5 text-white transition-all duration-200 hover:border-white/20 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=')] bg-[length:12px_8px] bg-[right_1rem_center] bg-no-repeat"
                          >
                            <option value="baja">Baja</option>
                            <option value="media">Media</option>
                            <option value="alta">Alta</option>
                            <option value="critica">Crítica</option>
                          </select>
                        ) : (
                          <div 
                            className="px-3 py-1.5 rounded-lg text-sm font-medium inline-block capitalize"
                            style={{
                              backgroundColor: getPriorityColor(showDetailModal.priority).bgColor,
                              borderColor: getPriorityColor(showDetailModal.priority).borderColor,
                              borderWidth: '1px'
                            }}
                          >
                            {getPriorityColor(showDetailModal.priority).label}
                          </div>
                        )}
                      </div>

                      {/* Estado */}
                      <div className="group">
                        <label className="flex items-center space-x-2 text-xs font-medium text-white/50 mb-2">
                          <span>Estado</span>
                        </label>
                        <p className="text-white/80 text-sm font-light capitalize">{showDetailModal.status}</p>
                      </div>

                      {/* Realizado */}
                      <div className="group">
                        <label className="flex items-center space-x-2 text-xs font-medium text-white/50 mb-2">
                          <span>Realizado</span>
                        </label>
                        {isEditing ? (
                          <label className="flex items-center space-x-3 cursor-pointer">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={editingActivity.realizado || false}
                                onChange={(e) => setEditingActivity({ ...editingActivity, realizado: e.target.checked })}
                                className="sr-only"
                              />
                              <div className={`w-12 h-6 rounded-full transition-all duration-300 ${
                                editingActivity.realizado ? 'bg-emerald-500' : 'bg-white/20'
                              }`}>
                                <motion.div
                                  animate={{ x: editingActivity.realizado ? 24 : 0 }}
                                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                  className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
                                />
                              </div>
                            </div>
                            <span className="text-white/80 text-sm">
                              {editingActivity.realizado ? 'Sí' : 'No'}
                            </span>
                          </label>
                        ) : (
                          <p className="text-white/80 text-sm font-light">{showDetailModal.realizado ? 'Sí' : 'No'}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Sección: Asignación */}
                  {((showDetailModal.asignado_a && showDetailModal.asignado_a.length > 0) || isEditing) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                          Asignación
                        </h4>
                      </div>

                      <div className="group">
                        {isEditing ? (
                          <div className="space-y-3">
                            {/* Tags de asignados */}
                            <div className="flex flex-wrap gap-2">
                              {(editingActivity.asignado_a || []).map((name, index) => (
                                <motion.span
                                  key={`${name}-${index}`}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="px-3 py-1.5 rounded-lg bg-white/10 text-white/80 text-sm flex items-center gap-2 border border-white/10 hover:border-white/20 transition-all"
                                >
                                  {name}
                                  <button
                                    onClick={() => {
                                      const newAssignees = (editingActivity.asignado_a || []).filter((n, i) => i !== index);
                                      setEditingActivity({ ...editingActivity, asignado_a: newAssignees });
                                    }}
                                    className="hover:text-red-400 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </motion.span>
                              ))}
                            </div>
                            
                            {/* Input con autocompletar */}
                            <div className="relative">
                              <input
                                type="text"
                                value={assignmentInput}
                                onChange={(e) => handleAssignmentInputChange(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && assignmentInput.trim()) {
                                    e.preventDefault();
                                    handleAddAssignment();
                                  } else if (e.key === 'Escape') {
                                    setShowAssignmentSuggestions(false);
                                  }
                                }}
                                onFocus={() => {
                                  if (assignmentInput.trim().length > 0) {
                                    const suggestions = findSimilarNames(assignmentInput);
                                    setAssignmentSuggestions(suggestions);
                                    setShowAssignmentSuggestions(suggestions.length > 0);
                                  }
                                }}
                                placeholder="Agregar asignado..."
                                className="w-full px-4 py-3 text-sm border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 bg-white/5 text-white placeholder-white/30 transition-all duration-200 hover:border-white/20"
                              />
                              
                              {/* Sugerencias de autocompletar */}
                              {showAssignmentSuggestions && assignmentSuggestions.length > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="absolute z-20 w-full mt-1 bg-black border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
                                >
                                  {assignmentSuggestions.map((suggestion, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => handleAddAssignment(suggestion)}
                                      className="w-full px-4 py-2.5 text-left text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                                    >
                                      <Users className="w-4 h-4 text-white/40" />
                                      <span>{suggestion}</span>
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {showDetailModal.asignado_a.map((name, index) => (
                              <span 
                                key={`${name}-${index}`}
                                className="px-3 py-1.5 rounded-lg bg-white/10 text-white/80 text-sm border border-white/10"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </div>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-8 py-5 border-t border-white/5 flex justify-between items-center relative z-10"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
              >
                {showDetailModal.archivado && !isEditing && (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      await handleUnarchiveActivity(showDetailModal.id);
                      setShowDetailModal(null);
                    }}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl hover:from-blue-600 hover:to-cyan-700 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
                  >
                    <ArchiveRestore className="w-4 h-4" />
                    Desarchivar
                  </motion.button>
                )}
                <div className="flex justify-end space-x-3 ml-auto">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleCancelEdit}
                        className="px-5 py-2.5 text-sm font-medium text-white/60 hover:text-white transition-colors"
                      >
                        Cancelar
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSaveEdit}
                        className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl hover:from-purple-600 hover:to-blue-700 transition-all shadow-lg shadow-purple-500/25"
                      >
                        Guardar Cambios
                      </motion.button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowDetailModal(null)}
                      className="px-5 py-2.5 text-sm font-medium text-white/60 hover:text-white transition-colors"
                    >
                      Cerrar
                    </button>
                  )}
                </div>
              </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal eliminar todo */}
      <AnimatePresence>
        {showDeleteAllModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteAllModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="border border-white/10 rounded-2xl p-8 max-w-md w-full"
              style={{ backgroundColor: '#111827', color: '#ffffff' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-light">Eliminar Todas las Actividades</h2>
                <button
                  onClick={() => setShowDeleteAllModal(false)}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-200 font-medium mb-1">Advertencia</p>
                    <p className="text-red-200/80 text-sm">
                      Esta acción eliminará permanentemente todas las actividades. Esta acción no se puede deshacer.
                    </p>
                  </div>
                </div>

                <label className="block text-white/60 text-sm mb-2">
                  Escribe <span className="text-red-400 font-medium">"eliminar"</span> para confirmar:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="eliminar"
                  className="w-full border rounded-lg p-3 focus:outline-none transition-colors duration-300"
                  style={{
                    backgroundColor: colors.bgSecondary,
                    borderColor: colors.border,
                    color: colors.text
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                  }}
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteAllModal(false);
                    setDeleteConfirmText('');
                  }}
                  className="px-6 py-2 text-white/60 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteAll}
                  disabled={deleteConfirmText.toLowerCase() !== 'eliminar'}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Eliminar Todo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menú contextual */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setContextMenu(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed z-50 rounded-xl border border-white/10 shadow-2xl overflow-hidden"
              style={{
                left: contextMenu.x,
                top: contextMenu.y,
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className="py-2 min-w-[180px]">
                {(() => {
                  const activity = [...activities, ...archivedActivities].find(a => a.id === contextMenu.activityId);
                  const isArchived = activity?.archivado || false;
                  
                  return (
                    <>
                      {!isArchived && (
                        <button
                          onClick={() => {
                            if (activity) {
                              handleStartEdit(activity);
                              setShowDetailModal(activity);
                            }
                            setContextMenu(null);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                        >
                          <Edit2 className="w-4 h-4" />
                          Editar
                        </button>
                      )}
                      {isArchived ? (
                        <button
                          onClick={() => {
                            handleUnarchiveActivity(contextMenu.activityId);
                            setContextMenu(null);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                        >
                          <ArchiveRestore className="w-4 h-4" />
                          Desarchivar
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            handleArchiveActivity(contextMenu.activityId);
                            setContextMenu(null);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                        >
                          <Archive className="w-4 h-4" />
                          Archivar
                        </button>
                      )}
                      <div className="h-px bg-white/10 my-1" />
                      <button
                        onClick={() => {
                          handleDeleteActivity(contextMenu.activityId);
                          setContextMenu(null);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                      </button>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      </div>
    </div>
  );
};

export default Timeline;


