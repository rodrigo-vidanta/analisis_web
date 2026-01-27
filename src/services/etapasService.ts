/**
 * ============================================
 * SERVICIO DE ETAPAS - CACHE EN MEMORIA
 * ============================================
 * 
 * Migración de etapa (string) → etapa_id (FK)
 * Fecha: 26 de Enero 2026
 * 
 * RESPONSABILIDADES:
 * - Cache en memoria de todas las etapas activas
 * - Acceso rápido por ID, código o nombre legacy
 * - Helpers para UI (colores, iconos, opciones)
 * 
 * IMPORTANTE:
 * - Cargar una sola vez al iniciar la app
 * - Cache válido durante toda la sesión
 * - NO hacer queries repetidas a BD
 */

import { analysisSupabase } from '../config/analysisSupabase';
import type { Etapa, EtapaCodigo, EtapaOption } from '../types/etapas';

// ============================================
// MAPEOS LEGACY (compatibilidad)
// ============================================

const LEGACY_NAME_MAP: Record<string, string> = {
  // Mapeos de cambio de nombre
  'en seguimiento': 'Discovery',
  'En seguimiento': 'Discovery',
  'EN SEGUIMIENTO': 'Discovery',
  
  // Variaciones con tildes
  'validando membresía': 'Validando membresia',
  'Validando Membresía': 'Validando membresia',
  'VALIDANDO MEMBRESÍA': 'Validando membresia',
  
  // Variaciones de mayúsculas
  'VALIDANDO MEMBRESIA': 'Validando membresia',
  'validando membresia': 'Validando membresia',
};

// ============================================
// CLASE DEL SERVICIO
// ============================================

class EtapasService {
  private etapas: Map<string, Etapa> = new Map();
  private etapasByCodigo: Map<EtapaCodigo, Etapa> = new Map();
  private etapasByNombre: Map<string, Etapa> = new Map();
  private loaded: boolean = false;
  private loading: Promise<void> | null = null;

  /**
   * Carga las etapas desde la BD (llamar al iniciar la app)
   */
  async loadEtapas(): Promise<void> {
    // Si ya está cargado, no hacer nada
    if (this.loaded) {
      return;
    }

    // Si ya está cargando, esperar a que termine
    if (this.loading) {
      return this.loading;
    }

    // Iniciar carga
    this.loading = this._loadEtapasFromDB();
    
    try {
      await this.loading;
      this.loaded = true;
    } finally {
      this.loading = null;
    }
  }

  /**
   * Verificar si el servicio ya cargó las etapas
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  private async _loadEtapasFromDB(): Promise<void> {
    try {
      const { data, error } = await analysisSupabase
        .from('etapas')
        .select('*')
        .eq('is_active', true)
        .order('orden_funnel');

      if (error) {
        console.error('❌ Error cargando etapas:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No se encontraron etapas activas');
        return;
      }

      // Limpiar caches
      this.etapas.clear();
      this.etapasByCodigo.clear();
      this.etapasByNombre.clear();

      // Poblar caches
      data.forEach((etapa: Etapa) => {
        this.etapas.set(etapa.id, etapa);
        this.etapasByCodigo.set(etapa.codigo, etapa);
        this.etapasByNombre.set(etapa.nombre.toLowerCase(), etapa);
      });

      // console.log(`✅ Etapas cargadas: ${data.length}`);
    } catch (error) {
      console.error('❌ Error fatal cargando etapas:', error);
      throw error;
    }
  }

  /**
   * Forzar recarga de etapas (usar solo si se modifican en BD)
   */
  async reloadEtapas(): Promise<void> {
    this.loaded = false;
    this.loading = null;
    await this.loadEtapas();
  }

  /**
   * Obtener etapa por UUID (método principal)
   */
  getById(id: string | null | undefined): Etapa | null {
    if (!id) return null;
    return this.etapas.get(id) || null;
  }

  /**
   * Obtener etapa por código (estable, recomendado)
   */
  getByCodigo(codigo: EtapaCodigo | string | null | undefined): Etapa | null {
    if (!codigo) return null;
    return this.etapasByCodigo.get(codigo as EtapaCodigo) || null;
  }

  /**
   * Obtener etapa por nombre (compatibilidad legacy)
   * Soporta mapeos antiguos (ej: "en seguimiento" → "Discovery")
   */
  getByNombreLegacy(nombre: string | null | undefined): Etapa | null {
    if (!nombre) return null;

    // 1. Intentar mapeo legacy primero
    const nombreMapeado = LEGACY_NAME_MAP[nombre];
    if (nombreMapeado) {
      return this.etapasByNombre.get(nombreMapeado.toLowerCase()) || null;
    }

    // 2. Normalizar el nombre (remover tildes, espacios extra)
    const nombreNormalizado = nombre
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remover tildes

    // 3. Buscar por nombre directo (case-insensitive)
    let etapa = this.etapasByNombre.get(nombre.toLowerCase());
    if (etapa) return etapa;

    // 4. Buscar por nombre normalizado
    for (const [key, value] of this.etapasByNombre.entries()) {
      const keyNormalizado = key
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (keyNormalizado === nombreNormalizado) {
        return value;
      }
    }

    return null;
  }

  /**
   * Obtener color de una etapa (por ID o nombre legacy)
   */
  getColor(idOrNombre: string | null | undefined): string {
    if (!idOrNombre) return '#6B7280'; // gray-500 por defecto

    // Intentar por ID primero (UUID tiene guiones)
    if (idOrNombre.includes('-')) {
      const etapa = this.getById(idOrNombre);
      if (etapa) return etapa.color_ui;
    }

    // Intentar por nombre legacy
    const etapa = this.getByNombreLegacy(idOrNombre);
    return etapa?.color_ui || '#6B7280';
  }

  /**
   * Obtener icono de una etapa (por ID o nombre legacy)
   */
  getIcono(idOrNombre: string | null | undefined): string {
    if (!idOrNombre) return 'help-circle';

    if (idOrNombre.includes('-')) {
      const etapa = this.getById(idOrNombre);
      if (etapa) return etapa.icono;
    }

    const etapa = this.getByNombreLegacy(idOrNombre);
    return etapa?.icono || 'help-circle';
  }

  /**
   * Obtener todas las etapas activas ordenadas por funnel
   */
  getAllActive(): Etapa[] {
    return Array.from(this.etapas.values()).sort(
      (a, b) => a.orden_funnel - b.orden_funnel
    );
  }

  /**
   * Obtener opciones para selects/dropdowns
   */
  getOptions(): EtapaOption[] {
    return this.getAllActive().map((etapa) => ({
      value: etapa.id,
      label: etapa.nombre,
      color: etapa.color_ui,
      icono: etapa.icono,
      orden: etapa.orden_funnel,
    }));
  }

  /**
   * Verificar si una etapa es terminal
   */
  isTerminal(idOrCodigo: string | null | undefined): boolean {
    if (!idOrCodigo) return false;

    const etapa = idOrCodigo.includes('-')
      ? this.getById(idOrCodigo)
      : this.getByCodigo(idOrCodigo as EtapaCodigo);

    return etapa?.es_terminal || false;
  }

  /**
   * Obtener grupo objetivo de una etapa
   */
  getGrupoObjetivo(id: string | null | undefined): 'ENGAGEMENT' | 'LLAMADA' | null {
    const etapa = this.getById(id);
    return etapa?.grupo_objetivo || null;
  }

  /**
   * Verificar si el cache está cargado
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Obtener estadísticas de etapas
   */
  getStats() {
    const etapas = this.getAllActive();
    return {
      total: etapas.length,
      activas: etapas.filter((e) => e.is_active).length,
      terminales: etapas.filter((e) => e.es_terminal).length,
      conAgenteAI: etapas.filter((e) => e.agente_default !== null).length,
    };
  }
}

// ============================================
// EXPORTAR INSTANCIA SINGLETON
// ============================================

export const etapasService = new EtapasService();
