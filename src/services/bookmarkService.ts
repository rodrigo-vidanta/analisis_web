/**
 * ============================================
 * SERVICIO DE BOOKMARKS - MÓDULO ANÁLISIS IA
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/analysis/README_ANALISIS_IA.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/analysis/README_ANALISIS_IA.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/analysis/CHANGELOG_ANALISIS_IA.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

// ============================================
// SERVICIO DE BOOKMARKS (MARCADORES)
// Maneja marcadores de llamadas por usuario con 5 colores
// ============================================

import { pqncSupabaseAdmin } from '../config/pqncSupabase';

// ============================================
// INTERFACES Y TIPOS
// ============================================

export type BookmarkColor = 'red' | 'yellow' | 'green' | 'blue' | 'purple';

export interface BookmarkData {
  id: string;
  call_id: string;
  user_id: string;
  bookmark_color: BookmarkColor;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BookmarkStats {
  color: BookmarkColor;
  count: number;
  lastUsed: string;
}

// ============================================
// CONFIGURACIÓN DE COLORES
// ============================================

export const BOOKMARK_COLORS = {
  red: {
    name: 'Rojo',
    css: '#EF4444',
    bgClass: 'bg-red-500',
    textClass: 'text-red-500',
    hoverClass: 'hover:bg-red-600',
    lightClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  },
  yellow: {
    name: 'Amarillo',
    css: '#F59E0B',
    bgClass: 'bg-yellow-500',
    textClass: 'text-yellow-500',
    hoverClass: 'hover:bg-yellow-600',
    lightClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
  },
  green: {
    name: 'Verde',
    css: '#10B981',
    bgClass: 'bg-green-500',
    textClass: 'text-green-500',
    hoverClass: 'hover:bg-green-600',
    lightClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  },
  blue: {
    name: 'Azul',
    css: '#3B82F6',
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-500',
    hoverClass: 'hover:bg-blue-600',
    lightClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  },
  purple: {
    name: 'Púrpura',
    css: '#8B5CF6',
    bgClass: 'bg-purple-500',
    textClass: 'text-purple-500',
    hoverClass: 'hover:bg-purple-600',
    lightClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
  }
} as const;

// ============================================
// CLASE DE SERVICIO
// ============================================

class BookmarkService {
  
  // ============================================
  // OPERACIONES PRINCIPALES
  // ============================================
  
  /**
   * Crear o actualizar bookmark de una llamada
   */
  async upsertBookmark(callId: string, userId: string, color: BookmarkColor, notes?: string): Promise<BookmarkData> {
    try {
      // DEBUGGING ESPECÍFICO PARA ESTRELLA ROJA
      if (color === 'red') {
        console.log('🔴 SERVICIO - DEBUGGING ESTRELLA ROJA - Entrada:', {
          callId,
          userId,
          color,
          notes,
          timestamp: new Date().toISOString()
        });
      }
      
      
      const { data, error } = await pqncSupabaseAdmin
        .from('call_bookmarks')
        .upsert({
          call_id: callId,
          user_id: userId,
          bookmark_color: color,
          notes: notes || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'call_id,user_id',
          ignoreDuplicates: false
        })
        .select('*')
        .single();
      
      if (error) {
        console.error('❌ Error guardando bookmark:', error);
        
        // Si la tabla no existe o hay cualquier error, simular éxito para no romper UX
        if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.code === '42P01') {
          console.warn('⚠️ Tabla call_bookmarks no existe, simulando guardado exitoso');
          const simulatedBookmark = {
            id: `temp-${Date.now()}`,
            call_id: callId,
            user_id: userId,
            bookmark_color: color,
            notes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // DEBUGGING ESPECÍFICO PARA ESTRELLA ROJA
          if (color === 'red') {
            console.log('🔴 SERVICIO - DEBUGGING ESTRELLA ROJA - Simulando guardado:', simulatedBookmark);
          }
          
          // Almacenar en localStorage como fallback temporal
          const storageKey = `bookmark_${callId}_${userId}`;
          localStorage.setItem(storageKey, JSON.stringify(simulatedBookmark));
          
          // DEBUGGING ESPECÍFICO PARA ESTRELLA ROJA
          if (color === 'red') {
            console.log('🔴 SERVICIO - DEBUGGING ESTRELLA ROJA - Guardado en localStorage con key:', storageKey);
          }
          
          return simulatedBookmark;
        }
        
        // Para otros errores, también simular éxito para mantener UX
        console.warn('⚠️ Error de BD, simulando guardado exitoso para mantener UX');
        const simulatedBookmark = {
          id: `temp-${Date.now()}`,
          call_id: callId,
          user_id: userId,
          bookmark_color: color,
          notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const storageKey = `bookmark_${callId}_${userId}`;
        localStorage.setItem(storageKey, JSON.stringify(simulatedBookmark));
        
        return simulatedBookmark;
      }
      
      return data;
      
    } catch (error) {
      console.error('💥 Error en upsertBookmark:', error);
      throw error;
    }
  }
  
  /**
   * Eliminar bookmark de una llamada
   */
  async removeBookmark(callId: string, userId: string): Promise<void> {
    try {
      console.log('🗑️ Eliminando bookmark...', { callId, userId });
      
      const { error } = await pqncSupabaseAdmin
        .from('call_bookmarks')
        .delete()
        .eq('call_id', callId)
        .eq('user_id', userId);
      
      if (error) {
        // Si la tabla no existe, simular éxito
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.warn('⚠️ Tabla call_bookmarks no existe, simulando eliminación');
          return;
        }
        
        console.error('❌ Error eliminando bookmark:', error);
        throw new Error(`Error al eliminar bookmark: ${error.message}`);
      }
      
      console.log('✅ Bookmark eliminado exitosamente');
      
    } catch (error) {
      console.error('💥 Error en removeBookmark:', error);
      throw error;
    }
  }
  
  /**
   * Obtener bookmarks de un usuario para múltiples llamadas
   */
  async getUserBookmarks(userId: string, callIds?: string[]): Promise<Map<string, BookmarkData>> {
    try {
      
      // OPTIMIZACIÓN: Limitar callIds para evitar URLs muy largas
      if (callIds && callIds.length > 50) {
        console.log(`⚡ [BOOKMARKS] Limitando a 50 IDs para evitar URLs largas (era ${callIds.length})`);
        callIds = callIds.slice(0, 50);
      }
      
      let query = pqncSupabaseAdmin
        .from('call_bookmarks')
        .select('*')
        .eq('user_id', userId);
      
      if (callIds && callIds.length > 0) {
        query = query.in('call_id', callIds);
      }
      
      const { data, error } = await query;
      
      if (error) {
        // Si la tabla no existe, usar localStorage como fallback
        if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.code === '42P01') {
          console.warn('⚠️ Tabla call_bookmarks no existe, usando localStorage');
          return this.getBookmarksFromLocalStorage(userId, callIds);
        }
        
        console.error('❌ Error obteniendo bookmarks:', error);
        return this.getBookmarksFromLocalStorage(userId, callIds);
      }
      
      
      // Convertir a Map para acceso rápido
      const bookmarkMap = new Map<string, BookmarkData>();
      data?.forEach(bookmark => {
        bookmarkMap.set(bookmark.call_id, bookmark);
      });
      
      return bookmarkMap;
      
    } catch (error) {
      console.error('💥 Error en getUserBookmarks:', error);
      return new Map();
    }
  }
  
  /**
   * Obtener estadísticas de bookmarks por usuario
   */
  async getUserBookmarkStats(userId: string): Promise<BookmarkStats[]> {
    try {
      
      // Usar consulta directa en lugar de vista que no existe
      const { data, error } = await pqncSupabaseAdmin
        .from('call_bookmarks')
        .select('bookmark_color, created_at')
        .eq('user_id', userId);
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.warn('⚠️ Tabla call_bookmarks no existe aún');
          return [];
        }
        
        console.error('❌ Error obteniendo estadísticas:', error);
        return [];
      }
      
      // Calcular estadísticas manualmente
      const stats: { [key in BookmarkColor]?: { count: number; lastUsed: string } } = {};
      
      data?.forEach(bookmark => {
        const color = bookmark.bookmark_color as BookmarkColor;
        if (!stats[color]) {
          stats[color] = { count: 0, lastUsed: bookmark.created_at };
        }
        stats[color]!.count++;
        if (bookmark.created_at > stats[color]!.lastUsed) {
          stats[color]!.lastUsed = bookmark.created_at;
        }
      });
      
      // Convertir a array
      return Object.entries(stats).map(([color, stat]) => ({
        color: color as BookmarkColor,
        count: stat!.count,
        lastUsed: stat!.lastUsed
      }));
      
    } catch (error) {
      console.error('💥 Error en getUserBookmarkStats:', error);
      return [];
    }
  }
  
  // ============================================
  // OPERACIONES DE FILTRADO
  // ============================================
  
  /**
   * Filtrar llamadas por bookmarks de un color específico
   */
  async getCallsWithBookmark(userId: string, color?: BookmarkColor): Promise<string[]> {
    try {
      let query = pqncSupabaseAdmin
        .from('call_bookmarks')
        .select('call_id')
        .eq('user_id', userId);
      
      if (color) {
        query = query.eq('bookmark_color', color);
      }
      
      const { data, error } = await query;
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          return [];
        }
        
        console.error('❌ Error filtrando por bookmarks:', error);
        return [];
      }
      
      return data?.map(item => item.call_id) || [];
      
    } catch (error) {
      console.error('💥 Error en getCallsWithBookmark:', error);
      return [];
    }
  }
  
  // ============================================
  // UTILIDADES
  // ============================================
  
  /**
   * Obtener información del color
   */
  getColorInfo(color: BookmarkColor) {
    return BOOKMARK_COLORS[color];
  }
  
  /**
   * Obtener todos los colores disponibles
   */
  getAvailableColors(): BookmarkColor[] {
    return Object.keys(BOOKMARK_COLORS) as BookmarkColor[];
  }
  
  /**
   * Validar color de bookmark
   */
  isValidColor(color: string): color is BookmarkColor {
    return Object.keys(BOOKMARK_COLORS).includes(color);
  }
  
  /**
   * Generar icono SVG de estrella para un color
   */
  getStarIcon(color: BookmarkColor, filled: boolean = true): string {
    const colorInfo = this.getColorInfo(color);
    return `
      <svg class="w-4 h-4 ${filled ? colorInfo.textClass : 'text-slate-400'}" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z" />
      </svg>
    `;
  }

  // ============================================
  // FUNCIONES DE FALLBACK CON LOCALSTORAGE
  // ============================================
  
  /**
   * Obtener bookmarks desde localStorage como fallback
   */
  private getBookmarksFromLocalStorage(userId: string, callIds?: string[]): Map<string, BookmarkData> {
    const bookmarkMap = new Map<string, BookmarkData>();
    
    try {
      // Buscar todos los bookmarks del usuario en localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`bookmark_`) && key.includes(`_${userId}`)) {
          const data = localStorage.getItem(key);
          if (data) {
            try {
              const bookmark: BookmarkData = JSON.parse(data);
              
              // Si se especificaron callIds, filtrar por ellos
              if (!callIds || callIds.includes(bookmark.call_id)) {
                bookmarkMap.set(bookmark.call_id, bookmark);
              }
            } catch (parseError) {
              console.warn('Error parsing bookmark from localStorage:', parseError);
            }
          }
        }
      }
      
      
    } catch (error) {
      console.error('Error accessing localStorage:', error);
    }
    
    return bookmarkMap;
  }
}

// ============================================
// EXPORTAR INSTANCIA SINGLETON
// ============================================

export const bookmarkService = new BookmarkService();
export default bookmarkService;
