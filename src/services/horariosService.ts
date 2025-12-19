/**
 * ============================================
 * SERVICIO DE HORARIOS - CONFIGURACIÓN DE SERVICIO
 * ============================================
 *
 * Maneja las operaciones CRUD para:
 * - config_horarios_base: Horarios fijos por día de la semana
 * - config_horarios_bloqueos: Bloqueos temporales (días completos con horarios diferentes)
 * - config_horarios_excepciones: Excepciones/Feriados/Cierres especiales
 *
 * Base de datos: glsmifhkoaifvaegsozd.supabase.co (analysisSupabase)
 */

import { analysisSupabase } from '../config/analysisSupabase';

// ===============================
// TIPOS E INTERFACES
// ===============================

export interface HorarioBase {
  id: string;
  dia_semana: number; // 0 = Domingo, 1 = Lunes, etc.
  dia_nombre: string;
  hora_inicio: number; // 0-23
  hora_fin: number; // 0-23
  activo: boolean;
  descripcion?: string;
  created_at: string;
  updated_at: string;
}

export interface HorarioBloqueo {
  id: string;
  fecha: string; // YYYY-MM-DD - fecha específica del bloqueo
  dia_semana?: number | null; // Para bloqueos recurrentes por día
  hora_inicio: number; // 0-23
  hora_fin: number; // 0-23
  nombre: string; // Nombre/motivo del bloqueo
  descripcion?: string | null;
  recurrente: boolean; // Si se repite cada semana
  activo: boolean;
  status?: 'pendiente' | 'activo' | 'ejecutado'; // Calculado en frontend
  created_at: string;
  updated_at: string;
}

export interface HorarioExcepcion {
  id: string;
  fecha: string; // YYYY-MM-DD
  tipo: 'feriado' | 'cierre_temprano' | 'apertura_especial' | 'evento';
  hora_inicio: number | null;
  hora_fin: number | null;
  cerrado: boolean;
  nombre: string;
  descripcion?: string;
  recurrente_anual: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// ===============================
// HORARIOS BASE
// ===============================

export const getHorariosBase = async (): Promise<HorarioBase[]> => {
  try {
    const { data, error } = await analysisSupabase
      .from('config_horarios_base')
      .select('*')
      .order('dia_semana');
    
    if (error) {
      console.warn('Error cargando config_horarios_base:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('Error accediendo a config_horarios_base:', err);
    return [];
  }
};

export const updateHorarioBase = async (
  id: string, 
  updates: Partial<HorarioBase>
): Promise<HorarioBase> => {
  const { data, error } = await analysisSupabase
    .from('config_horarios_base')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const toggleDiaActivo = async (id: string, activo: boolean): Promise<void> => {
  const { error } = await analysisSupabase
    .from('config_horarios_base')
    .update({ 
      activo, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id);
  
  if (error) throw error;
};

// ===============================
// BLOQUEOS TEMPORALES
// ===============================

export const getHorariosBloqueos = async (): Promise<HorarioBloqueo[]> => {
  try {
    const { data, error } = await analysisSupabase
      .from('config_horarios_bloqueos')
      .select('*')
      .order('fecha', { ascending: false });
    
    if (error) {
      console.warn('Tabla config_horarios_bloqueos no disponible:', error.message);
      return [];
    }
    
    // Calcular status basado en fecha
    const hoy = new Date().toISOString().split('T')[0];
    const procesados = (data || []).map(bloqueo => {
      let status: 'pendiente' | 'activo' | 'ejecutado' = 'pendiente';
      
      if (bloqueo.fecha < hoy) {
        status = 'ejecutado';
      } else if (bloqueo.fecha === hoy) {
        status = 'activo';
      } else {
        status = 'pendiente';
      }
      
      return { ...bloqueo, status };
    });
    
    return procesados;
  } catch (err) {
    console.warn('Error accediendo a config_horarios_bloqueos:', err);
    return [];
  }
};

export const createHorarioBloqueo = async (
  bloqueo: Omit<HorarioBloqueo, 'id' | 'created_at' | 'updated_at' | 'status'>
): Promise<HorarioBloqueo> => {
  // Validar que la fecha no sea en el pasado
  const hoy = new Date().toISOString().split('T')[0];
  if (bloqueo.fecha < hoy) {
    throw new Error('No se pueden crear bloqueos en fechas pasadas');
  }
  
  const { data, error } = await analysisSupabase
    .from('config_horarios_bloqueos')
    .insert({
      fecha: bloqueo.fecha,
      dia_semana: bloqueo.dia_semana || null,
      hora_inicio: bloqueo.hora_inicio,
      hora_fin: bloqueo.hora_fin,
      nombre: bloqueo.nombre,
      descripcion: bloqueo.descripcion || null,
      recurrente: bloqueo.recurrente || false,
      activo: bloqueo.activo ?? true
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Agregar status calculado
  let status: 'pendiente' | 'activo' | 'ejecutado' = 'pendiente';
  if (data.fecha === hoy) status = 'activo';
  
  return { ...data, status };
};

export const updateHorarioBloqueo = async (
  id: string,
  updates: Partial<HorarioBloqueo>
): Promise<HorarioBloqueo> => {
  // Validar que la fecha no sea en el pasado si se está actualizando
  if (updates.fecha) {
    const hoy = new Date().toISOString().split('T')[0];
    if (updates.fecha < hoy) {
      throw new Error('No se pueden programar bloqueos en fechas pasadas');
    }
  }
  
  // Construir objeto de actualización solo con campos válidos
  const updateData: Record<string, unknown> = {};
  if (updates.fecha !== undefined) updateData.fecha = updates.fecha;
  if (updates.dia_semana !== undefined) updateData.dia_semana = updates.dia_semana;
  if (updates.hora_inicio !== undefined) updateData.hora_inicio = updates.hora_inicio;
  if (updates.hora_fin !== undefined) updateData.hora_fin = updates.hora_fin;
  if (updates.nombre !== undefined) updateData.nombre = updates.nombre;
  if (updates.descripcion !== undefined) updateData.descripcion = updates.descripcion;
  if (updates.recurrente !== undefined) updateData.recurrente = updates.recurrente;
  if (updates.activo !== undefined) updateData.activo = updates.activo;
  updateData.updated_at = new Date().toISOString();
  
  const { data, error } = await analysisSupabase
    .from('config_horarios_bloqueos')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  
  // Calcular status
  const hoy = new Date().toISOString().split('T')[0];
  let status: 'pendiente' | 'activo' | 'ejecutado' = 'pendiente';
  if (data.fecha < hoy) status = 'ejecutado';
  else if (data.fecha === hoy) status = 'activo';
  
  return { ...data, status };
};

export const deleteHorarioBloqueo = async (id: string): Promise<void> => {
  const { error } = await analysisSupabase
    .from('config_horarios_bloqueos')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// ===============================
// EXCEPCIONES (FERIADOS, CIERRES, ETC)
// ===============================

export const getHorariosExcepciones = async (): Promise<HorarioExcepcion[]> => {
  try {
    const { data, error } = await analysisSupabase
      .from('config_horarios_excepciones')
      .select('*')
      .order('fecha', { ascending: true });
    
    if (error) {
      console.warn('Error cargando config_horarios_excepciones:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('Error accediendo a config_horarios_excepciones:', err);
    return [];
  }
};

export const createHorarioExcepcion = async (
  excepcion: Omit<HorarioExcepcion, 'id' | 'created_at' | 'updated_at'>
): Promise<HorarioExcepcion> => {
  const { data, error } = await analysisSupabase
    .from('config_horarios_excepciones')
    .insert({
      ...excepcion,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateHorarioExcepcion = async (
  id: string,
  updates: Partial<HorarioExcepcion>
): Promise<HorarioExcepcion> => {
  const { data, error } = await analysisSupabase
    .from('config_horarios_excepciones')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteHorarioExcepcion = async (id: string): Promise<void> => {
  const { error } = await analysisSupabase
    .from('config_horarios_excepciones')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// ===============================
// UTILIDADES
// ===============================

export const formatHora = (hora: number): string => {
  const h = hora.toString().padStart(2, '0');
  return `${h}:00`;
};

export const formatHoraRange = (inicio: number, fin: number): string => {
  return `${formatHora(inicio)} - ${formatHora(fin)}`;
};

export const getDiaNombre = (dia: number): string => {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dias[dia] || '';
};

export const getDiaAbreviado = (dia: number): string => {
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return dias[dia] || '';
};

export const getTipoExcepcionLabel = (tipo: HorarioExcepcion['tipo']): string => {
  const labels = {
    'feriado': 'Feriado',
    'cierre_temprano': 'Cierre Temprano',
    'apertura_especial': 'Apertura Especial',
    'evento': 'Evento'
  };
  return labels[tipo] || tipo;
};

export const getTipoExcepcionColor = (tipo: HorarioExcepcion['tipo']): string => {
  const colors = {
    'feriado': 'from-red-600 to-red-700',
    'cierre_temprano': 'from-amber-500 to-amber-600',
    'apertura_especial': 'from-emerald-500 to-emerald-600',
    'evento': 'from-indigo-500 to-indigo-600'
  };
  return colors[tipo] || 'from-gray-500 to-gray-600';
};

export const getStatusBloqueoColor = (status: HorarioBloqueo['status']): string => {
  if (!status) return 'bg-gray-100 text-gray-500';
  const colors: Record<string, string> = {
    'pendiente': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'activo': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'ejecutado': 'bg-gray-100 text-gray-500 dark:bg-gray-800/50 dark:text-gray-500'
  };
  return colors[status] || 'bg-gray-100 text-gray-500';
};

export const getStatusBloqueoLabel = (status: HorarioBloqueo['status']): string => {
  if (!status) return 'Desconocido';
  const labels: Record<string, string> = {
    'pendiente': 'Programado',
    'activo': 'En curso',
    'ejecutado': 'Completado'
  };
  return labels[status] || status;
};

// ===============================
// VALIDACIÓN DE HORARIO PARA LLAMADAS
// ===============================

/**
 * Verifica si una fecha/hora está dentro del horario de servicio definido
 * @param date Fecha a validar
 * @param time Hora en formato HH:mm
 * @param horariosBase Array de horarios base del sistema
 * @returns { valid: boolean, reason?: string }
 */
export const isWithinServiceHours = async (
  date: Date,
  time?: string
): Promise<{ valid: boolean; reason?: string; horario?: HorarioBase }> => {
  try {
    const horariosBase = await getHorariosBase();
    const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado
    
    // Buscar el horario para este día
    const horarioDia = horariosBase.find(h => h.dia_semana === dayOfWeek);
    
    if (!horarioDia) {
      return { valid: false, reason: 'No hay horario definido para este día' };
    }
    
    if (!horarioDia.activo) {
      return { valid: false, reason: `El servicio no está disponible los ${horarioDia.dia_nombre}` };
    }
    
    // Si no se especifica hora, solo validar que el día esté activo
    if (!time) {
      return { valid: true, horario: horarioDia };
    }
    
    // Validar la hora
    const [hours, minutes] = time.split(':').map(Number);
    const hourDecimal = hours + minutes / 60;
    
    if (hourDecimal < horarioDia.hora_inicio || hourDecimal >= horarioDia.hora_fin) {
      return { 
        valid: false, 
        reason: `Horario de servicio: ${formatHora(horarioDia.hora_inicio)} - ${formatHora(horarioDia.hora_fin)}`,
        horario: horarioDia
      };
    }
    
    return { valid: true, horario: horarioDia };
  } catch (error) {
    console.error('Error validando horario de servicio:', error);
    return { valid: false, reason: 'Error verificando horarios de servicio' };
  }
};

/**
 * Verifica si AHORA está dentro del horario máximo permitido (6am - 12am)
 * Esta es una validación más permisiva para llamadas inmediatas
 */
export const isWithinMaxServiceHours = (): { valid: boolean; reason?: string } => {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Horario máximo: 6am (6) a 12am (24/0)
  if (currentHour < 6) {
    return { 
      valid: false, 
      reason: `Fuera de horario de servicio. Las llamadas inmediatas solo están disponibles de 6:00 AM a 12:00 AM. Hora actual: ${now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
    };
  }
  
  return { valid: true };
};

/**
 * Obtiene los horarios del sistema para mostrar en UI
 */
export const getHorariosForUI = async (): Promise<{
  horariosBase: HorarioBase[];
  horariosExcepciones: HorarioExcepcion[];
}> => {
  const [horariosBase, horariosExcepciones] = await Promise.all([
    getHorariosBase(),
    getHorariosExcepciones()
  ]);
  
  return { horariosBase, horariosExcepciones };
};

// Exportar servicio como objeto
export const horariosService = {
  // Horarios base
  getHorariosBase,
  updateHorarioBase,
  toggleDiaActivo,
  
  // Bloqueos
  getHorariosBloqueos,
  createHorarioBloqueo,
  updateHorarioBloqueo,
  deleteHorarioBloqueo,
  
  // Excepciones
  getHorariosExcepciones,
  createHorarioExcepcion,
  updateHorarioExcepcion,
  deleteHorarioExcepcion,
  
  // Validación para llamadas
  isWithinServiceHours,
  isWithinMaxServiceHours,
  getHorariosForUI,
  
  // Utilidades
  formatHora,
  formatHoraRange,
  getDiaNombre,
  getDiaAbreviado,
  getTipoExcepcionLabel,
  getTipoExcepcionColor,
  getStatusBloqueoColor,
  getStatusBloqueoLabel
};

export default horariosService;

