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

import { pqncQaProxy } from './multiDbProxyService';

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
      // Primero verificar si existe
      const existing = await pqncQaProxy.select('call_bookmarks', {
        filters: { call_id: callId, user_id: userId },
        single: true
      });
      
      let result;
      if (existing.data) {
        // Update
        result = await pqncQaProxy.update('call_bookmarks', {
          bookmark_color: color,
          notes: notes || null,
          updated_at: new Date().toISOString()
        }, { call_id: callId, user_id: userId });
      } else {
        // Insert
        result = await pqncQaProxy.insert('call_bookmarks', {
          call_id: callId,
          user_id: userId,
          bookmark_color: color,
          notes: notes || null,
          updated_at: new Date().toISOString()
        });
      }
      
      if (result.error) {
        console.warn('⚠️ Error guardando bookmark, usando localStorage:', result.error);
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
      
      const data = Array.isArray(result.data) ? result.data[0] : result.data;
      
      return {
        id: data?.id || `temp-${Date.now()}`,
        call_id: callId,
        user_id: userId,
        bookmark_color: color,
        notes,
        created_at: data?.created_at || new Date().toISOString(),
        updated_at: data?.updated_at || new Date().toISOString()
      };
      
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
      
      const result = await pqncQaProxy.delete('call_bookmarks', { 
        call_id: callId, 
        user_id: userId 
      });
      
      if (result.error) {
        console.warn('⚠️ Error eliminando bookmark:', result.error);
        // También eliminar de localStorage
        const storageKey = `bookmark_${callId}_${userId}`;
        localStorage.removeItem(storageKey);
        return;
      }
      
      // También eliminar de localStorage
      const storageKey = `bookmark_${callId}_${userId}`;
      localStorage.removeItem(storageKey);
      
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
        callIds = callIds.slice(0, 50);
      }
      
      const filters: Record<string, unknown> = { user_id: userId };
      if (callIds && callIds.length > 0) {
        filters.call_id = { op: 'in', value: callIds };
      }
      
      const result = await pqncQaProxy.select('call_bookmarks', { filters });
      
      if (result.error) {
        console.warn('⚠️ Error obteniendo bookmarks, usando localStorage:', result.error);
        return this.getBookmarksFromLocalStorage(userId, callIds);
      }
      
      const bookmarkMap = new Map<string, BookmarkData>();
      const items = Array.isArray(result.data) ? result.data : [];
      
      items.forEach((bookmark: Record<string, unknown>) => {
        bookmarkMap.set(bookmark.call_id as string, {
          id: bookmark.id as string,
          call_id: bookmark.call_id as string,
          user_id: bookmark.user_id as string,
          bookmark_color: bookmark.bookmark_color as BookmarkColor,
          notes: bookmark.notes as string | undefined,
          created_at: bookmark.created_at as string,
          updated_at: bookmark.updated_at as string
        });
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
      const result = await pqncQaProxy.select('call_bookmarks', {
        select: 'bookmark_color,created_at',
        filters: { user_id: userId }
      });
      
      if (result.error) {
        console.warn('⚠️ Error obteniendo estadísticas:', result.error);
        return [];
      }
      
      const items = Array.isArray(result.data) ? result.data : [];
      const stats: { [key in BookmarkColor]?: { count: number; lastUsed: string } } = {};
      
      items.forEach((bookmark: Record<string, unknown>) => {
        const color = bookmark.bookmark_color as BookmarkColor;
        if (!stats[color]) {
          stats[color] = { count: 0, lastUsed: bookmark.created_at as string };
        }
        stats[color]!.count++;
        if ((bookmark.created_at as string) > stats[color]!.lastUsed) {
          stats[color]!.lastUsed = bookmark.created_at as string;
        }
      });
      
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
      const filters: Record<string, unknown> = { user_id: userId };
      if (color) {
        filters.bookmark_color = color;
      }
      
      const result = await pqncQaProxy.select('call_bookmarks', {
        select: 'call_id',
        filters
      });
      
      if (result.error) {
        console.warn('⚠️ Error filtrando por bookmarks:', result.error);
        return [];
      }
      
      const items = Array.isArray(result.data) ? result.data : [];
      return items.map((item: Record<string, unknown>) => item.call_id as string);
      
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
