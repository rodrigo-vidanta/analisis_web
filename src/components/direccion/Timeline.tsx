import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useAppStore } from '../../stores/appStore';
import { timelineService } from '../../services/timelineService';
import type { TimelineActivity, ProcessedActivity, DuplicateCheck } from '../../services/timelineTypes';
import { Plus, X, Calendar, Clock, CheckCircle2, Circle, Trash2, AlertCircle, Users, Trash, Edit2, Save, ChevronLeft, ChevronRight, Archive, MoreVertical, ArchiveRestore, Sun, Moon, Search, Tag, Paperclip, FileText, Image as ImageIcon, XCircle, Palette, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabaseSystemUIAdmin } from '../../config/supabaseSystemUI';
import TimelineCard from './TimelineCard';
import TimelineActivityModal from './TimelineActivityModal';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Función auxiliar para combinar clases
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type Theme = 'dark' | 'light' | 'indigo';

// Timeline Component v2.6 - Single Column Layout (Left Axis, Right Cards)
const Timeline: React.FC = () => {
  const { user, logout } = useAuth();
  const { setAppMode } = useAppStore();
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
  const [scrollIntensity, setScrollIntensity] = useState(0);
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
  const dragThreshold = 150;
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number; time: number }>>(new Map());
  const [theme, setTheme] = useState<Theme>('indigo');
  const isDarkMode = theme === 'dark' || theme === 'indigo';
  
  // Nuevos estados para filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  
  // Estado para subtareas inline
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | null>(null);

  // Estado para calendario colapsable
  const [isCalendarPinned, setIsCalendarPinned] = useState(() => {
    const saved = localStorage.getItem('timeline-calendar-pinned');
    return saved !== null ? saved === 'true' : true;
  });
  const [isCalendarHovered, setIsCalendarHovered] = useState(false);
  const isCalendarVisible = isCalendarPinned || isCalendarHovered;

  // Persistir estado del calendario
  useEffect(() => {
    localStorage.setItem('timeline-calendar-pinned', isCalendarPinned.toString());
  }, [isCalendarPinned]);

  // Toggle tema
  const toggleTheme = () => {
    const themes: Theme[] = ['dark', 'light', 'indigo'];
    const nextTheme = themes[(themes.indexOf(theme) + 1) % themes.length];
    setTheme(nextTheme);
    localStorage.setItem('direccion-theme-mode', nextTheme);
    
    // Apply theme classes
    document.documentElement.classList.remove('dark', 'theme-indigo');
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (nextTheme === 'indigo') {
      document.documentElement.classList.add('dark', 'theme-indigo');
    }
  };

  // Cargar tema guardado
  useEffect(() => {
    const savedTheme = localStorage.getItem('direccion-theme-mode') as Theme | null;
    const initialTheme = savedTheme || 'indigo'; // Default to indigo
    setTheme(initialTheme);
    
    document.documentElement.classList.remove('dark', 'theme-indigo');
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (initialTheme === 'indigo') {
      document.documentElement.classList.add('dark', 'theme-indigo');
    }
  }, []);

  // Aplicar estilos específicos del módulo
  useEffect(() => {
    document.body.classList.add('direccion-module');
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.classList.remove('direccion-module');
      document.body.style.overflow = '';
    };
  }, []);

  // Detectar scroll
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let scrollTimeout: NodeJS.Timeout;

    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      setShowTopFade(scrollTop > 10);
      setShowBottomFade(scrollTop < scrollHeight - clientHeight - 10);

      const now = Date.now();
      const timeDelta = now - lastScrollTimeRef.current;
      const scrollDelta = Math.abs(scrollTop - lastScrollTopRef.current);
      
      if (timeDelta > 0) {
        scrollVelocityRef.current = scrollDelta / timeDelta;
        const minVelocity = 1.5;
        const maxVelocity = 8;
        const normalizedVelocity = Math.min(Math.max((scrollVelocityRef.current - minVelocity) / (maxVelocity - minVelocity), 0), 1);
        
        if (scrollVelocityRef.current > minVelocity) {
          setIsFastScrolling(true);
          setScrollIntensity(normalizedVelocity);
          clearTimeout(scrollTimeout);
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

  // Scroll calendario
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

  // Cerrar menú contextual
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // Cargar datos
  useEffect(() => {
    if (user?.id) {
      loadActivities();
      loadAssignedNames();
    }
  }, [user?.id]);

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

  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
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

  const findSimilarNames = (query: string): string[] => {
    if (!query || query.length < 2) return [];
    
    const queryLower = query.toLowerCase().trim();
    const matches: Array<{ name: string; similarity: number }> = [];
    
    assignedNames.forEach(name => {
      const similarity = calculateSimilarity(queryLower, name);
      if (similarity > 0.6) {
        matches.push({ name, similarity });
      }
    });
    
    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(m => m.name);
  };

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

  const handleAddAssignment = (name?: string) => {
    const nameToAdd = (name || assignmentInput).trim();
    if (!nameToAdd) return;

    const similarName = assignedNames.find(existingName => {
      const similarity = calculateSimilarity(nameToAdd, existingName);
      return similarity > 0.85;
    });

    const finalName = similarName || nameToAdd;
    const currentAssignees = editingActivity.asignado_a || [];
    
    if (!currentAssignees.includes(finalName)) {
      setEditingActivity({ 
        ...editingActivity, 
        asignado_a: [...currentAssignees, finalName] 
      });
      
      if (!assignedNames.includes(finalName)) {
        setAssignedNames([...assignedNames, finalName].sort());
      }
    }
    
    setAssignmentInput('');
    setShowAssignmentSuggestions(false);
  };

  const loadActivities = async () => {
    if (!user?.id) return;
    setLoading(true);
    const data = await timelineService.getActivities(user.id);
    setActivities(data.filter(a => !a.archivado));
    setLoading(false);
  };

  const loadArchivedActivities = async () => {
    if (!user?.id) return;
    try {
      const data = await timelineService.getActivities(user.id);
      setArchivedActivities(data.filter(a => a.archivado));
    } catch (error) {
      console.error('Error loading archived activities:', error);
    }
  };

  const handleProcessText = async () => {
    if (!inputText.trim() || !user?.id) return;

    setProcessing(true);
    try {
      const processed = await timelineService.processActivitiesWithLLM(inputText);
      
      if (!processed || processed.length === 0) {
        toast.error('No se pudieron extraer actividades del texto');
        return;
      }
      
      const duplicates = await timelineService.checkDuplicates(processed, user.id);
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

  const normalizeAssignedNames = (names: string[]): string[] => {
    if (!names || names.length === 0) return [];
    
    return names.map(name => {
      const trimmedName = name.trim();
      if (!trimmedName) return '';
      
      const similarName = assignedNames.find(existingName => {
        const similarity = calculateSimilarity(trimmedName, existingName);
        return similarity > 0.85;
      });
      
      return similarName || trimmedName;
    }).filter(name => name.length > 0);
  };

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
        metadata: {
          tags: item.activity.tags || [],
        },
        subtasks: item.activity.subtasks || []
      }));

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
      if (toSave.length > 0) {
        await timelineService.createActivities(toSave);
      }

      for (const update of updates) {
        await timelineService.updateActivity(update.id, {
          due_date: update.due_date,
          description: update.description,
          priority: update.priority,
          asignado_a: update.asignado_a,
        });
      }

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

  const handleDeleteActivity = async (id: string, skipConfirm: boolean = false) => {
    if (!skipConfirm && !confirm('¿Estás seguro de eliminar esta actividad?')) {
      return;
    }
    const wasArchived = [...activities, ...archivedActivities].find(a => a.id === id)?.archivado || false;
    
    await timelineService.deleteActivity(id);
    await loadActivities();
    
    if (wasArchived) {
      await loadArchivedActivities();
    }
  };

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

  const handleToggleRealizado = async (activity: TimelineActivity) => {
    const newRealizado = !activity.realizado;
    const newCompletedAt = newRealizado ? new Date().toISOString() : null;
    
    setActivities(prev => prev.map(a => 
      a.id === activity.id 
        ? { ...a, realizado: newRealizado, completed_at: newCompletedAt }
        : a
    ));
    
    if (showArchivedView) {
      setArchivedActivities(prev => prev.map(a => 
        a.id === activity.id 
          ? { ...a, realizado: newRealizado, completed_at: newCompletedAt }
          : a
      ));
    }
    
    try {
      await timelineService.updateActivity(activity.id, {
        realizado: newRealizado,
        completed_at: newCompletedAt
      });
    } catch (error) {
      console.error('Error toggling realizado:', error);
      // Revertir
      setActivities(prev => prev.map(a => 
        a.id === activity.id 
          ? { ...a, realizado: activity.realizado, completed_at: activity.completed_at }
          : a
      ));
      toast.error('Error al actualizar actividad');
    }
  };

  const handleStartEdit = (activity: TimelineActivity) => {
    setIsEditing(true);
    setEditingActivity({ 
      ...activity,
      asignado_a: activity.asignado_a || [],
      tags: activity.tags || [],
      attachments: activity.attachments || []
    });
    setAssignmentInput('');
    setShowAssignmentSuggestions(false);
  };

  useEffect(() => {
    if (!showDetailModal) {
      setIsEditing(false);
      setEditingActivity({});
    }
  }, [showDetailModal]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    if (!file.type.includes('image') && !file.type.includes('pdf')) {
      toast.error('Solo se permiten imágenes y PDF');
      return;
    }

    const path = `${user?.id}/${Date.now()}-${file.name}`;
    
    const toastId = toast.loading('Subiendo archivo...');
    try {
      const url = await timelineService.uploadFile(file, path);
      if (url) {
        const newAttachment = {
          type: (file.type.includes('image') ? 'image' : 'pdf') as 'image' | 'pdf',
          url,
          name: file.name
        };
        const current = editingActivity.attachments || [];
        setEditingActivity({
          ...editingActivity,
          attachments: [...current, newAttachment]
        });
        toast.success('Archivo subido', { id: toastId });
      } else {
        toast.dismiss(toastId);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error al subir', { id: toastId });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingActivity.id) return;

    try {
      const normalizedAssignees = (editingActivity.asignado_a || []).map(name => {
        const similarName = assignedNames.find(existingName => {
          const similarity = calculateSimilarity(name.trim(), existingName);
          return similarity > 0.85;
        });
        return similarName || name.trim();
      }).filter(name => name.length > 0);

      const originalActivity = activities.find(a => a.id === editingActivity.id);
      const dateChanged = originalActivity && editingActivity.due_date && originalActivity.due_date !== editingActivity.due_date;

      if (dateChanged && editingActivity.due_date && user?.id) {
        await timelineService.updateActivityDate(editingActivity.id, editingActivity.due_date, user.id);
      }

      await timelineService.updateActivity(editingActivity.id, {
        title: editingActivity.title!,
        description: editingActivity.description || null,
        due_date: editingActivity.due_date!,
        priority: editingActivity.priority!,
        asignado_a: normalizedAssignees,
        realizado: editingActivity.realizado || false,
        tags: editingActivity.tags,
        attachments: editingActivity.attachments
      });

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

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingActivity({});
  };

  const getDaysInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: Array<{ day: number; date: string; hasActivity: boolean; allCompleted: boolean }> = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: 0, date: '', hasActivity: false, allCompleted: false });
    }
    
    const dateStatus = new Map<string, { hasPending: boolean; hasCompleted: boolean }>();
    activities.forEach(a => {
        if (a.archivado) return;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matches = 
            a.title.toLowerCase().includes(query) || 
            (a.description && a.description.toLowerCase().includes(query)) ||
            (a.asignado_a && a.asignado_a.some(name => name.toLowerCase().includes(query))) ||
            (a.tags && a.tags.some(tag => tag.toLowerCase().includes(query)));
          if (!matches) return;
        }
        if (activeTagFilter && (!a.tags || !a.tags.includes(activeTagFilter))) return;

        const d = a.due_date;
        const current = dateStatus.get(d) || { hasPending: false, hasCompleted: false };
        if (a.realizado) current.hasCompleted = true;
        else current.hasPending = true;
        dateStatus.set(d, current);
    });
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const status = dateStatus.get(dateStr);
      const hasActivity = !!status;
      const allCompleted = !!status && status.hasCompleted && !status.hasPending;

      days.push({
        day,
        date: dateStr,
        hasActivity,
        allCompleted
      });
    }
    
    return days;
  };

  const generateCalendarMonths = () => {
    if (activities.length === 0) {
      const today = new Date();
      return [{
        year: today.getFullYear(),
        month: today.getMonth(),
        date: new Date(today)
      }];
    }

    const dates = activities.map(a => new Date(a.due_date));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    const startDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
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
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    }
  };

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

  const handleArchiveActivity = async (activityId: string) => {
    try {
      await timelineService.updateActivity(activityId, { archivado: true });
      await loadActivities();
      await loadArchivedActivities();
      toast.success('Actividad archivada');
    } catch (error) {
      console.error('Error archiving activity:', error);
      toast.error('Error al archivar actividad');
    }
  };

  const handleUnarchiveActivity = async (activityId: string) => {
    try {
      await timelineService.updateActivity(activityId, { archivado: false });
      await loadArchivedActivities();
      await loadActivities();
      toast.success('Actividad desarchivada');
      if (showArchivedView && archivedActivities.length === 1) {
        setShowArchivedView(false);
      }
    } catch (error) {
      console.error('Error unarchiving activity:', error);
      toast.error('Error al desarchivar actividad');
    }
  };

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
      await loadArchivedActivities();
      toast.success(`${count} actividades archivadas`);
    } catch (error) {
      console.error('Error archiving activities:', error);
      toast.error('Error al archivar actividades');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedActivities.size === 0) return;
    const count = selectedActivities.size;
    if (!confirm(`¿Estás seguro de eliminar ${count} actividades?`)) return;
    
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
      
      if (hadArchived || showArchivedView) {
        await loadArchivedActivities();
      }
      toast.success(`${count} actividades eliminadas`);
    } catch (error) {
      console.error('Error deleting activities:', error);
      toast.error('Error al eliminar actividades');
    }
  };

  const handleToggleSelection = (activityId: string) => {
    const newSelected = new Set(selectedActivities);
    if (newSelected.has(activityId)) {
      newSelected.delete(activityId);
    } else {
      newSelected.add(activityId);
    }
    setSelectedActivities(newSelected);
  };

  const handleContextMenu = (e: React.MouseEvent, activityId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, activityId });
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, activityId: string) => {
    if (selectedActivities.size > 0) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDraggingActivity({ id: activityId, startX: clientX, startY: clientY, currentX: clientX });
    
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
    
    const cardElement = activityElement.querySelector('.group > div') as HTMLElement;
    if (!cardElement) return;
    
    requestAnimationFrame(() => {
      const absDeltaX = Math.abs(deltaX);
      const translateX = deltaX * 0.7;
      cardElement.style.transform = `translateX(${translateX}px)`;
      cardElement.style.transition = 'none';
      
      if (absDeltaX > dragThreshold * 0.4) {
        const intensity = Math.min((absDeltaX - dragThreshold * 0.4) / (dragThreshold * 0.6), 1);
        cardElement.style.opacity = `${1 - intensity * 0.2}`;
      } else {
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
      const cardElement = activityElement.querySelector('.group > div') as HTMLElement;
      if (cardElement) {
        const deltaX = draggingActivity.currentX - draggingActivity.startX;
        const absDeltaX = Math.abs(deltaX);

        if (absDeltaX > dragThreshold) {
          if (deltaX > 0) {
            handleDeleteActivity(activityId, true);
          } else {
            if (showArchivedView) {
              handleUnarchiveActivity(activityId);
            } else {
              handleArchiveActivity(activityId);
            }
          }
        }

        cardElement.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        cardElement.style.transform = '';
        cardElement.style.opacity = '';
        
        setTimeout(() => {
          if (cardElement) {
            cardElement.style.transition = '';
          }
        }, 400);
      }
    }

    setDraggingActivity(null);
    setTimeout(() => setIsDragging(false), 200);
  };

  // Manejar añadir subtarea (Modo Inline)
  const handleAddSubtask = (parentId: string) => {
    setAddingSubtaskTo(parentId);
    setSubtaskTitle('');
  };
    
  // Confirmar creación de subtarea
  const handleConfirmSubtask = async () => {
    if (!subtaskTitle.trim() || !addingSubtaskTo || !user?.id) return;

    const parent = activities.find(a => a.id === addingSubtaskTo);
    if (!parent) return;

    try {
      await timelineService.createActivity({
        user_id: user.id,
        title: subtaskTitle.trim(),
        description: null,
        due_date: parent.due_date,
        status: 'pending',
        priority: 'media',
        asignado_a: [],
        realizado: false,
        archivado: false,
        metadata: { parent_id: addingSubtaskTo }
      });
      
      setAddingSubtaskTo(null);
      setSubtaskTitle('');
      await loadActivities();
      toast.success('Subtarea creada');
    } catch (error) {
      console.error('Error creating subtask:', error);
      toast.error('Error al crear subtarea');
    }
  };

  const handleCardClick = useCallback((activity: TimelineActivity, e: React.MouseEvent) => {
    const dragStart = dragStartPositionsRef.current.get(activity.id);
    const isClick = !dragStart || (
      (Date.now() - dragStart.time < 300) && 
      Math.abs(e.clientX - dragStart.x) < 5 && 
      Math.abs(e.clientY - dragStart.y) < 5
    );
    
    if (!selectedActivities.size && !isDragging && !draggingActivity && isClick) {
      setShowDetailModal(activity);
    }
    dragStartPositionsRef.current.delete(activity.id);
  }, [selectedActivities.size, isDragging, draggingActivity]);

  const groupedActivities = React.useMemo(() => {
    return activities.reduce((acc, activity) => {
    if (searchQuery) {
       const query = searchQuery.toLowerCase();
       const matches = 
         activity.title.toLowerCase().includes(query) || 
         (activity.description && activity.description.toLowerCase().includes(query)) ||
         (activity.asignado_a && activity.asignado_a.some(name => name.toLowerCase().includes(query))) ||
         (activity.tags && activity.tags.some(tag => tag.toLowerCase().includes(query))) ||
         activity.due_date.includes(query);
       if (!matches) return acc;
    }
    
    if (activeTagFilter && (!activity.tags || !activity.tags.includes(activeTagFilter))) return acc;

    const dateKey = activity.due_date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(activity);
    return acc;
  }, {} as Record<string, TimelineActivity[]>);
  }, [activities, searchQuery, activeTagFilter]);

  const sortedDates = React.useMemo(() => {
    return Object.keys(groupedActivities).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );
  }, [groupedActivities]);

  const calendarMonths = React.useMemo(() => generateCalendarMonths(), [activities]);
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors duration-300 bg-slate-50 dark:bg-black text-slate-900 dark:text-white">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-16 h-16 border-2 rounded-full animate-spin mx-auto mb-4 transition-colors duration-300 border-slate-200 dark:border-white/10 border-t-slate-800 dark:border-t-white"></div>
          <p className="transition-colors duration-300 text-slate-500 dark:text-white/60">Cargando timeline...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div id="timeline-direccion-container" className={cn(
      "h-screen relative overflow-hidden flex flex-row transition-colors duration-300 text-slate-900 dark:text-white",
      theme === 'light' ? "bg-slate-50" : 
      theme === 'indigo' ? "bg-[#1e293b]" : 
      "bg-black"
    )}>
      {/* Fondo decorativo */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Degradado púrpura animado */}
        <motion.div
          className="absolute w-[800px] h-[800px] rounded-full blur-[120px]"
          style={{ 
            background: 'radial-gradient(circle, rgba(147, 51, 234, 0.05) 0%, transparent 70%)',
          }}
          animate={{
            left: ['-10%', '30%', '-10%'],
            top: ['-10%', '10%', '-10%'],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Degradado azul animado */}
        <motion.div
          className="absolute w-[700px] h-[700px] rounded-full blur-[120px]"
          style={{ 
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.04) 0%, transparent 70%)',
          }}
          animate={{
            right: ['-10%', '20%', '-10%'],
            bottom: ['-10%', '10%', '-10%'],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 45,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      {/* Calendario lateral izquierdo */}
      <motion.div 
        className={cn(
          "flex flex-col flex-shrink-0 relative transition-colors duration-300 h-full z-30 border-r border-slate-200 dark:border-white/5",
          theme === 'light' ? "bg-white" : 
          theme === 'indigo' ? "bg-[#1e293b]" : 
          "bg-black"
        )}
        initial={{ width: 280 }}
        animate={{ width: isCalendarVisible ? 280 : 20 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        onMouseEnter={() => setIsCalendarHovered(true)}
        onMouseLeave={() => setIsCalendarHovered(false)}
      >
        {/* Barra lateral colapsada (Trigger) */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-5 flex flex-col items-center pt-24 gap-4 cursor-pointer group transition-colors",
          isCalendarVisible ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:bg-slate-100 dark:hover:bg-white/5'
        )}>
          <div className="h-32 w-0.5 rounded-full transition-colors bg-slate-300 dark:bg-white/20 group-hover:bg-slate-400 dark:group-hover:bg-white/40" />
          <span className="text-[10px] font-mono uppercase tracking-widest whitespace-nowrap text-slate-400 dark:text-white/30" style={{ transform: 'rotate(-90deg)' }}>Calendario</span>
          <div className="h-32 w-0.5 rounded-full transition-colors bg-slate-300 dark:bg-white/20 group-hover:bg-slate-400 dark:group-hover:bg-white/40" />
        </div>

        {/* Contenido del Calendario */}
        <div className={`flex-1 relative overflow-hidden pt-24 transition-opacity duration-300 ${isCalendarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          
          {/* Botón Pin */}
          <button
            onClick={() => setIsCalendarPinned(!isCalendarPinned)}
            className={cn(
              "absolute top-6 right-4 p-2 rounded-lg transition-all duration-200",
              isCalendarPinned 
                ? "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400" 
                : "text-slate-400 dark:text-white/20 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
            )}
            title={isCalendarPinned ? "Desfijar calendario" : "Fijar calendario"}
          >
            <div className={`w-2 h-2 rounded-full ${isCalendarPinned ? 'bg-purple-500 dark:bg-purple-400' : 'border border-current'}`} />
          </button>

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
            <div className={`calendar-scroll px-4 pl-10 pt-4 pb-4 space-y-6`}>
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
                    <h3 className="text-xs font-medium uppercase tracking-wider px-1 transition-colors duration-300 text-slate-500 dark:text-white/60">
                      {monthNames[monthData.month]} {monthData.year}
                    </h3>
                    
                    {/* Días de la semana */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {dayNames.map(day => (
                        <div key={day} className="text-center text-xs font-medium py-1 transition-colors duration-300 text-slate-400 dark:text-white/40">
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
                                  : 'linear-gradient(to bottom right, rgba(167, 139, 250, 0.4), rgba(96, 165, 250, 0.4))' 
                                : 'transparent',
                              border: dayData.hasActivity 
                                ? isDarkMode 
                                  ? '1px solid rgba(147, 51, 234, 0.6)'
                                  : '1px solid rgba(147, 51, 234, 0.3)'
                                : 'none',
                              color: dayData.hasActivity 
                                ? 'inherit' 
                                : 'inherit', 
                              boxShadow: isToday ? `0 0 0 2px ${isDarkMode ? 'rgba(59, 130, 246, 0.5)' : 'rgba(79, 70, 229, 0.6)'}` : 'none',
                              textDecoration: dayData.allCompleted ? 'line-through' : 'none',
                              opacity: dayData.allCompleted ? 0.6 : 1,
                            }}
                            className={cn(
                                "aspect-square flex items-center justify-center text-sm rounded transition-all cursor-pointer font-medium",
                                !dayData.hasActivity && "text-slate-400 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
                            )}
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
                top: '96px',
                height: '120px',
                background: isDarkMode
                  ? 'linear-gradient(to bottom, rgba(30, 41, 59, 1) 0%, rgba(30, 41, 59, 0.9) 20%, rgba(30, 41, 59, 0.6) 50%, rgba(30, 41, 59, 0.3) 70%, transparent 100%)'
                  : 'linear-gradient(to bottom, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.9) 20%, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0.3) 70%, transparent 100%)',
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
                  ? 'linear-gradient(to top, rgba(30, 41, 59, 1) 0%, rgba(30, 41, 59, 0.9) 20%, rgba(30, 41, 59, 0.6) 50%, rgba(30, 41, 59, 0.3) 70%, transparent 100%)'
                  : 'linear-gradient(to top, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.9) 20%, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0.3) 70%, transparent 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                maskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 100%)'
              }}
            />
          )}
        </div>
      </motion.div>

      {/* Contenedor principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header minimalista - Fijo arriba */}
      <header className={cn(
        "relative z-20 px-8 py-6 flex-shrink-0 transition-colors duration-300 border-b border-slate-200 dark:border-white/10",
        theme === 'light' ? "bg-slate-50" : 
        theme === 'indigo' ? "bg-[#1e293b]" : 
        "bg-black"
      )}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-wider transition-colors duration-300 text-slate-900 dark:text-white">TIMELINE</h1>
            <p className="text-sm mt-1 transition-colors duration-300 text-slate-500 dark:text-white/40">
              {showArchivedView ? 'Actividades archivadas' : 'Gestión de actividades y pendientes'}
            </p>
          </div>

            {!showArchivedView && (
              <div className="flex-1 max-w-md mx-8">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar tarea, etiqueta o asignado..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-white dark:focus:bg-white/10 transition-all text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 pr-3 mr-3 transition-colors duration-300 border-r border-slate-200 dark:border-white/10">
                <button onClick={() => { setShowArchivedView(false); loadActivities(); }} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", !showArchivedView ? "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white" : "text-slate-500 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5")}>Activas</button>
                <button onClick={async () => { setShowArchivedView(true); await loadArchivedActivities(); }} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5", showArchivedView ? "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white" : "text-slate-500 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5")}><Archive className="w-3.5 h-3.5" /> Archivadas ({archivedActivities.length})</button>
            </div>
              
            {selectedActivities.size > 0 && (
              <>
                  <button onClick={showArchivedView ? async () => { /* ... */ } : handleArchiveSelected} className="px-4 py-2 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors text-sm flex items-center gap-2">
                    {showArchivedView ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    {showArchivedView ? 'Desarchivar' : 'Archivar'} ({selectedActivities.size})
                  </button>
                  <button onClick={handleDeleteSelected} className="px-4 py-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors text-sm flex items-center gap-2"><Trash className="w-4 h-4" /> Eliminar ({selectedActivities.size})</button>
                  <button onClick={() => setSelectedActivities(new Set())} className="px-4 py-2 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors text-sm">Cancelar</button>
              </>
            )}

            {activities.length > 0 && selectedActivities.size === 0 && (
                <button onClick={() => setShowDeleteAllModal(true)} className="px-4 py-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors text-sm flex items-center gap-2"><Trash className="w-4 h-4" /> Eliminar Todo</button>
            )}

              <button onClick={toggleTheme} className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-sm flex items-center gap-2 text-slate-500 dark:text-white/60">
                  {theme === 'light' ? <Sun className="w-4 h-4" /> : theme === 'indigo' ? <Palette className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              
              {/* Botón Volver - Solo para usuarios que NO tienen rol direccion */}
              {user?.role_name !== 'direccion' && (
                <button 
                  onClick={() => setAppMode('admin')} 
                  className="px-4 py-2 transition-colors text-sm text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white flex items-center gap-2"
                  title="Volver a la aplicación"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver</span>
                </button>
              )}
              
              <button onClick={() => { if (user?.role_name === 'admin') window.location.href = '/'; else logout(); }} className="px-4 py-2 transition-colors text-sm text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white">
                  {user?.role_name === 'admin' ? 'Salir' : 'Cerrar Sesión'}
              </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-hidden">
        {isFastScrolling && scrollIntensity > 0 && (
            <motion.div className="fixed inset-0 pointer-events-none z-30" initial={{ opacity: 0 }} animate={{ opacity: scrollIntensity * 0.35 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} style={{ background: `radial-gradient(ellipse at center, rgba(147, 51, 234, ${scrollIntensity * 0.15}) 0%, rgba(59, 130, 246, ${scrollIntensity * 0.12}) 35%, transparent 65%)`, mixBlendMode: 'screen', filter: `blur(${50 + scrollIntensity * 30}px)` }} />
        )}
          
          <div ref={scrollContainerRef} className="h-full overflow-y-auto px-8 py-12 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="max-w-5xl mx-auto relative" ref={timelineRef}>
          {/* Línea central de spine */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-purple-500/20 via-slate-200 dark:via-white/10 to-transparent hidden md:block"></div>

          {showArchivedView ? (
            archivedActivities.length === 0 ? (
                  <div className="text-center py-24">
                        <Archive className="w-16 h-16 mx-auto mb-4 transition-colors duration-300 text-slate-300 dark:text-white/20" />
                        <p className="text-lg transition-colors duration-300 text-slate-500 dark:text-white/40">No hay actividades archivadas</p>
                  </div>
            ) : (
              <div className="relative">
                {(() => {
                  const archivedGrouped = archivedActivities.reduce((acc, activity) => {
                    const dateKey = activity.due_date;
                        if (!acc[dateKey]) acc[dateKey] = [];
                    acc[dateKey].push(activity);
                    return acc;
                  }, {} as Record<string, TimelineActivity[]>);

                      return Object.keys(archivedGrouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()).map((dateKey, dateIndex) => (
                        <motion.div key={dateKey} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: dateIndex * 0.1 }} className="mb-12 relative">
                        <div className="flex items-center justify-center mb-8 relative z-10 w-full"> {/* Centrado de fecha */}
                          <div className="px-4 py-1 rounded-full bg-slate-800 dark:bg-black/40 border border-slate-700 dark:border-white/10 backdrop-blur-md text-sm font-medium text-white/90 dark:text-white/70 shadow-lg">
                              {formatDate(dateKey)}
                          </div>
                        </div>
                        <div className="space-y-6 pl-16">
                            {archivedGrouped[dateKey].map((activity, index) => (
                              <TimelineCard
                                key={activity.id}
                                activity={activity}
                                index={index}
                                isSelected={selectedActivities.has(activity.id)}
                                isDragging={isDragging}
                                onClick={handleCardClick}
                                onContextMenu={handleContextMenu}
                                onMouseDown={handleDragStart}
                                onTouchStart={handleDragStart}
                                onToggleSelection={handleToggleSelection}
                                onUnarchive={handleUnarchiveActivity}
                                getPriorityColor={getPriorityColor}
                                showArchivedView={true}
                                className="w-full"
                              />
                            ))}
                              </div>
                            </motion.div>
                      ));
                })()}
              </div>
            )
          ) : sortedDates.length === 0 ? (
                <div className="text-center py-24">
              <Calendar className="w-16 h-16 mx-auto mb-4 transition-colors duration-300 text-slate-300 dark:text-white/20" />
              <p className="text-lg transition-colors duration-300 text-slate-500 dark:text-white/40">No hay actividades programadas</p>
                </div>
          ) : (
            <div className="relative pl-16">
              {sortedDates.map((dateKey, dateIndex) => {
                const dateActivities = groupedActivities[dateKey];
                    
                    // Lógica jerárquica
                        const rootActivities = dateActivities.filter(a => !a.parent_id);
                        const subtasksMap = new Map<string, TimelineActivity[]>();
                        dateActivities.forEach(a => {
                          if (a.parent_id) {
                            const existing = subtasksMap.get(a.parent_id) || [];
                            subtasksMap.set(a.parent_id, [...existing, a]);
                          }
                        });
                        const orphans = dateActivities.filter(a => a.parent_id && !rootActivities.some(r => r.id === a.parent_id));
                        const displayList = [...rootActivities, ...orphans];
  
                    return (
                      <motion.div key={dateKey} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: dateIndex * 0.1 }} className="mb-16 relative">
                        {/* Fecha Central */}
                        <div className="flex items-center justify-center mb-10 relative z-10 w-full"> {/* Centrado de fecha */}
                           <div className="px-6 py-2 rounded-full bg-slate-900/90 dark:bg-[#0f172a]/80 border border-slate-800 dark:border-white/10 backdrop-blur-md shadow-xl flex flex-col items-center">
                              <span className="text-xs font-medium text-slate-400 dark:text-white/40 uppercase tracking-widest mb-0.5">
                                 {new Date(dateKey).toLocaleDateString('es-ES', { weekday: 'long' })}
                                      </span>
                              <span className="text-lg font-light text-white">
                                 {new Date(dateKey).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                              </span>
                                    </div>
                                  </div>
  
                        <div className="relative w-full">
                          {displayList.map((activity, index) => (
                            <div key={activity.id} className="mb-8">
                              <TimelineCard
                                activity={activity}
                                index={index}
                                alignment="right"
                                isSelected={selectedActivities.has(activity.id)}
                                isDragging={isDragging}
                                onClick={handleCardClick}
                                onContextMenu={handleContextMenu}
                                onMouseDown={handleDragStart}
                                onTouchStart={handleDragStart}
                                onToggleSelection={handleToggleSelection}
                                onAddSubtask={handleAddSubtask}
                                getPriorityColor={getPriorityColor}
                                width="w-full"
                                className="pl-0"
                              />
                              
                              {/* Input Inline para Subtarea */}
                              <AnimatePresence>
                              {addingSubtaskTo === activity.id && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                    className="relative mt-4 mb-8 w-full ml-8"
                                  >
                                    <div className="bg-white dark:bg-[#1e293b]/80 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-4 shadow-2xl ring-1 ring-purple-500/20">
                                      <input
                                        autoFocus
                                        type="text"
                                        value={subtaskTitle}
                                        onChange={(e) => setSubtaskTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleConfirmSubtask();
                                          if (e.key === 'Escape') setAddingSubtaskTo(null);
                                        }}
                                        placeholder="Escribe el título de la subtarea..."
                                        className="bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white w-full placeholder-slate-400 dark:placeholder-white/30"
                                      />
                                      <div className="flex justify-end gap-2 mt-2">
                                        <button onClick={() => setAddingSubtaskTo(null)} className="p-1 hover:text-slate-900 dark:hover:text-white text-slate-400 dark:text-white/40"><X className="w-4 h-4" /></button>
                                        <button onClick={handleConfirmSubtask} className="p-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"><CheckCircle2 className="w-4 h-4" /></button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                              </AnimatePresence>
  
                              {/* Renderizar subtareas (siempre debajo del padre) */}
                              {subtasksMap.has(activity.id) && (
                                <div className="relative flex flex-col items-start pl-8 mt-2 w-full">
                                  {subtasksMap.get(activity.id)!.map((subtask, subIndex) => (
                                    <div key={subtask.id} className="w-full mb-2">
                                       <TimelineCard
                                         activity={subtask}
                                         index={subIndex}
                                         isSubtask={true}
                                         isSelected={selectedActivities.has(subtask.id)}
                                         isDragging={isDragging}
                                         onClick={handleCardClick}
                                         onContextMenu={handleContextMenu}
                                         onMouseDown={handleDragStart}
                                         onTouchStart={handleDragStart}
                                         onToggleSelection={handleToggleSelection}
                                         getPriorityColor={getPriorityColor}
                                         width="w-full"
                                       />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
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
                                  </div>
  
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-50 w-48 bg-white dark:bg-[#1e293b] rounded-xl shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                const activity = activities.find(a => a.id === contextMenu.activityId);
                if (activity) {
                  setShowDetailModal(activity);
                  handleStartEdit(activity);
                }
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" /> Editar
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddSubtask(contextMenu.activityId);
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Añadir Subtarea
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleArchiveActivity(contextMenu.activityId);
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2"
            >
              <Archive className="w-4 h-4" /> Archivar
            </button>
            <div className="h-px bg-slate-200 dark:bg-white/10 my-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteActivity(contextMenu.activityId);
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Eliminar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <TimelineActivityModal
        isOpen={!!showDetailModal}
        activity={showDetailModal}
        isEditing={isEditing}
        onClose={() => { setShowDetailModal(null); setIsEditing(false); }}
        onStartEdit={handleStartEdit}
        onCancelEdit={handleCancelEdit}
        onSave={handleSaveEdit}
        onUnarchive={handleUnarchiveActivity}
        onFileUpload={handleFileUpload}
        editingActivity={editingActivity}
        setEditingActivity={setEditingActivity}
        formatDate={formatDate}
        getPriorityColor={getPriorityColor}
        assignmentInput={assignmentInput}
        setAssignmentInput={setAssignmentInput}
        showAssignmentSuggestions={showAssignmentSuggestions}
        setShowAssignmentSuggestions={setShowAssignmentSuggestions}
        assignmentSuggestions={assignmentSuggestions}
        handleAddAssignment={handleAddAssignment}
      />

      <AnimatePresence>
        {showDeleteAllModal && (
                                <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 dark:bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteAllModal(false)}
          >
            <div className="border border-slate-200 dark:border-white/10 rounded-2xl p-8 max-w-md w-full bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-light mb-6">Eliminar Todas las Actividades</h2>
              <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="eliminar" className="w-full border border-slate-300 dark:border-white/20 rounded-lg p-3 bg-slate-50 dark:bg-transparent mb-6 focus:outline-none focus:border-red-500" />
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowDeleteAllModal(false)} className="px-4 py-2 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white">Cancelar</button>
                <button onClick={handleDeleteAll} disabled={deleteConfirmText !== 'eliminar'} className="px-4 py-2 bg-red-600 rounded text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">Eliminar Todo</button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
      </AnimatePresence>

      {/* Floating Add Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowAddModal(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl z-40"
        >
        <Plus className="w-6 h-6 text-white" />
        </motion.button>

      {/* Input Modal simple para agregar actividades (puede ser extraído también) */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 w-full max-w-2xl border border-slate-200 dark:border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-light text-slate-900 dark:text-white mb-4">Nueva Actividad</h3>
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Describe las actividades (ej: 'Reunión mañana a las 10am')"
                className="w-full h-32 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-slate-900 dark:text-white mb-4 resize-none focus:outline-none focus:border-blue-500/50"
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white">Cancelar</button>
                <button onClick={handleProcessText} disabled={processing} className="px-6 py-2 bg-blue-600 rounded-xl text-white hover:bg-blue-700 disabled:opacity-50">
                  {processing ? 'Procesando...' : 'Procesar con IA'}
                </button>
              </div>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 dark:bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-white/10 shadow-2xl">
              <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                <h3 className="text-xl text-slate-900 dark:text-white">Vista Previa</h3>
                <button onClick={() => setShowPreviewModal(false)}><X className="text-slate-400 dark:text-white/60 hover:text-slate-900 dark:hover:text-white" /></button>
                  </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {previewData.map((item, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border ${item.isDuplicate ? 'border-orange-500/50 bg-orange-50 dark:bg-orange-500/10' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5'}`}>
                    <div className="flex items-center gap-3 mb-2">
                            <input
                              type="checkbox"
                        checked={selectedDuplicates.has(idx)}
                        onChange={e => {
                                const newSet = new Set(selectedDuplicates);
                          if (e.target.checked) newSet.add(idx); else newSet.delete(idx);
                                setSelectedDuplicates(newSet);
                              }}
                            />
                      <h4 className="text-slate-900 dark:text-white font-medium">{item.activity.title}</h4>
                      {item.isDuplicate && <span className="text-orange-600 dark:text-orange-400 text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-500/20 rounded">Duplicado</span>}
                            </div>
                    <p className="text-slate-600 dark:text-white/60 text-sm pl-7">{item.activity.description}</p>
                    <div className="flex gap-4 mt-2 pl-7 text-xs text-slate-400 dark:text-white/40">
                      <span>{new Date(item.activity.due_date).toLocaleDateString()}</span>
                      <span className="capitalize">{item.activity.priority}</span>
                            </div>
                              </div>
                  ))}
                </div>
              <div className="p-6 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3">
                <button onClick={() => setShowPreviewModal(false)} className="px-4 py-2 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white">Cancelar</button>
                <button onClick={handleSaveActivities} className="px-6 py-2 bg-blue-600 rounded-xl text-white hover:bg-blue-700">Guardar ({previewData.length - selectedDuplicates.size})</button>
                </div>
              </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Timeline;