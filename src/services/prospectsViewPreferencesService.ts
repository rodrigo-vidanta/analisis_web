/**
 * ============================================
 * SERVICIO DE PREFERENCIAS DE VISTA PROSPECTOS
 * ============================================
 * 
 * Maneja las preferencias de vista (Kanban/Datagrid) por usuario
 * con persistencia en localStorage y opcionalmente en BD
 */

export type ViewType = 'datagrid' | 'kanban';

export interface ProspectsViewPreferences {
  viewType: ViewType;
  collapsedColumns?: string[]; // Columnas colapsadas en Kanban
  hiddenColumns?: string[]; // Columnas ocultas en Kanban
  lastUpdated?: string;
}

class ProspectsViewPreferencesService {
  private readonly STORAGE_KEY_PREFIX = 'prospects_view_preferences_';

  /**
   * Obtener preferencias del usuario
   */
  getUserPreferences(userId: string | null): ProspectsViewPreferences {
    const defaultPreferences: ProspectsViewPreferences = {
      viewType: 'kanban',
      collapsedColumns: ['checkpoint #es-miembro', 'checkpoint #activo-pqnc'], // Colapsar "Es miembro" y "Activo PQNC" por defecto
      lastUpdated: new Date().toISOString()
    };

    if (!userId) {
      // Si no hay usuario, usar preferencias por defecto
      return defaultPreferences;
    }

    try {
      const storageKey = `${this.STORAGE_KEY_PREFIX}${userId}`;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsed = JSON.parse(stored) as ProspectsViewPreferences;
        return {
          ...defaultPreferences,
          ...parsed
        };
      }
    } catch (error) {
      console.error('❌ Error cargando preferencias de vista:', error);
    }

    return defaultPreferences;
  }

  /**
   * Guardar preferencias del usuario
   */
  saveUserPreferences(userId: string | null, preferences: ProspectsViewPreferences): void {
    if (!userId) {
      return;
    }

    try {
      const storageKey = `${this.STORAGE_KEY_PREFIX}${userId}`;
      const preferencesToSave: ProspectsViewPreferences = {
        ...preferences,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(storageKey, JSON.stringify(preferencesToSave));
    } catch (error) {
      console.error('❌ Error guardando preferencias de vista:', error);
    }
  }

  /**
   * Actualizar solo el tipo de vista
   */
  updateViewType(userId: string | null, viewType: ViewType): void {
    const currentPreferences = this.getUserPreferences(userId);
    this.saveUserPreferences(userId, {
      ...currentPreferences,
      viewType
    });
  }

  /**
   * Actualizar columnas colapsadas (solo para Kanban)
   */
  updateCollapsedColumns(userId: string | null, collapsedColumns: string[]): void {
    const currentPreferences = this.getUserPreferences(userId);
    this.saveUserPreferences(userId, {
      ...currentPreferences,
      collapsedColumns
    });
  }

  /**
   * Toggle de columna colapsada
   */
  toggleColumnCollapse(userId: string | null, columnId: string): string[] {
    const currentPreferences = this.getUserPreferences(userId);
    const currentCollapsed = currentPreferences.collapsedColumns || [];
    
    const newCollapsed = currentCollapsed.includes(columnId)
      ? currentCollapsed.filter(id => id !== columnId)
      : [...currentCollapsed, columnId];
    
    this.updateCollapsedColumns(userId, newCollapsed);
    return newCollapsed;
  }

  /**
   * Actualizar columnas ocultas (solo para Kanban)
   */
  updateHiddenColumns(userId: string | null, hiddenColumns: string[]): void {
    const currentPreferences = this.getUserPreferences(userId);
    this.saveUserPreferences(userId, {
      ...currentPreferences,
      hiddenColumns
    });
  }

  /**
   * Toggle de columna oculta
   */
  toggleColumnVisibility(userId: string | null, columnId: string): string[] {
    const currentPreferences = this.getUserPreferences(userId);
    const currentHidden = currentPreferences.hiddenColumns || [];
    
    const newHidden = currentHidden.includes(columnId)
      ? currentHidden.filter(id => id !== columnId)
      : [...currentHidden, columnId];
    
    this.updateHiddenColumns(userId, newHidden);
    return newHidden;
  }
}

export const prospectsViewPreferencesService = new ProspectsViewPreferencesService();

