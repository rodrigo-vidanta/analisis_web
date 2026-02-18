/**
 * ============================================
 * SERVICIO DE IMPORTACIONES MASIVAS
 * ============================================
 *
 * CRUD y operaciones para importaciones, importados
 * e importacion_broadcasts.
 */

import { analysisSupabase } from '../config/analysisSupabase';
import { authenticatedEdgeFetch } from '../utils/authenticatedFetch';
import { whatsappTemplatesService } from './whatsappTemplatesService';
import { normalizarTelefono } from '../types/importaciones';
import type {
  Importacion,
  ImportacionConStats,
  Importado,
  ImportacionBroadcast,
  ImportadoEstatus,
  CSVRow,
  MassiveBroadcastPayload,
} from '../types/importaciones';
import type { WhatsAppTemplate } from '../types/whatsappTemplates';

interface TemplateConRating extends WhatsAppTemplate {
  starRating: number;
  replyRate: number;
  totalSent: number;
}

class ImportacionesService {
  // ============================================
  // IMPORTACIONES (LOTES)
  // ============================================

  async getImportaciones(): Promise<ImportacionConStats[]> {
    const { data, error } = await analysisSupabase
      .from('importaciones')
      .select('*')
      .order('creado', { ascending: false });

    if (error) throw error;

    const importaciones = data || [];
    if (importaciones.length === 0) return [];

    // Obtener conteos por estatus para cada importación
    const ids = importaciones.map(i => i.id);
    const { data: importados } = await analysisSupabase
      .from('importados')
      .select('importacion_id, estatus')
      .in('importacion_id', ids);

    // Obtener último broadcast por importación
    const { data: broadcasts } = await analysisSupabase
      .from('importacion_broadcasts')
      .select('*')
      .in('importacion_id', ids)
      .order('creado', { ascending: false });

    // Construir mapa de stats
    const statsMap = new Map<string, { pendientes: number; enviados: number; respondidos: number; convertidos: number; fallidos: number }>();
    for (const imp of importaciones) {
      statsMap.set(imp.id, { pendientes: 0, enviados: 0, respondidos: 0, convertidos: 0, fallidos: 0 });
    }
    for (const row of (importados || [])) {
      const stats = statsMap.get(row.importacion_id);
      if (!stats) continue;
      switch (row.estatus) {
        case 'pendiente': stats.pendientes++; break;
        case 'enviado': stats.enviados++; break;
        case 'respondido': stats.respondidos++; break;
        case 'convertido': stats.convertidos++; break;
        case 'fallido': stats.fallidos++; break;
      }
    }

    // Mapa de último broadcast
    const broadcastMap = new Map<string, ImportacionBroadcast>();
    for (const bc of (broadcasts || [])) {
      if (!broadcastMap.has(bc.importacion_id)) {
        broadcastMap.set(bc.importacion_id, bc as ImportacionBroadcast);
      }
    }

    return importaciones.map(imp => {
      const stats = statsMap.get(imp.id);
      return {
        ...imp,
        pendientes: stats?.pendientes ?? 0,
        enviados: stats?.enviados ?? 0,
        respondidos: stats?.respondidos ?? 0,
        convertidos: stats?.convertidos ?? 0,
        fallidos: stats?.fallidos ?? 0,
        ultimo_broadcast: broadcastMap.get(imp.id) ?? null,
      } as ImportacionConStats;
    });
  }

  async getImportacion(id: string): Promise<ImportacionConStats | null> {
    const { data, error } = await analysisSupabase
      .from('importaciones')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    const { data: importados } = await analysisSupabase
      .from('importados')
      .select('estatus')
      .eq('importacion_id', id);

    const stats = { pendientes: 0, enviados: 0, respondidos: 0, convertidos: 0, fallidos: 0 };
    for (const row of (importados || [])) {
      switch (row.estatus) {
        case 'pendiente': stats.pendientes++; break;
        case 'enviado': stats.enviados++; break;
        case 'respondido': stats.respondidos++; break;
        case 'convertido': stats.convertidos++; break;
        case 'fallido': stats.fallidos++; break;
      }
    }

    const { data: broadcasts } = await analysisSupabase
      .from('importacion_broadcasts')
      .select('*')
      .eq('importacion_id', id)
      .order('creado', { ascending: false })
      .limit(1);

    return {
      ...data,
      ...stats,
      ultimo_broadcast: (broadcasts?.[0] as ImportacionBroadcast) ?? null,
    } as ImportacionConStats;
  }

  async createImportacion(codigoCampana: string, descripcion: string | null, creadoPor: string): Promise<Importacion> {
    const { data, error } = await analysisSupabase
      .from('importaciones')
      .insert({
        codigo_campana: codigoCampana,
        descripcion,
        creado_por: creadoPor,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Importacion;
  }

  async deleteImportacion(id: string): Promise<void> {
    const { error } = await analysisSupabase
      .from('importaciones')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async updateImportacionEstatus(id: string, estatus: string): Promise<void> {
    const { error } = await analysisSupabase
      .from('importaciones')
      .update({ estatus, actualizado: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  // ============================================
  // IMPORTADOS (REGISTROS INDIVIDUALES)
  // ============================================

  async getImportados(
    importacionId: string,
    filters?: { estatus?: ImportadoEstatus; search?: string; page?: number; pageSize?: number }
  ): Promise<{ data: Importado[]; total: number }> {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = analysisSupabase
      .from('importados')
      .select('*', { count: 'exact' })
      .eq('importacion_id', importacionId);

    if (filters?.estatus) {
      query = query.eq('estatus', filters.estatus);
    }
    if (filters?.search) {
      query = query.or(`nombre.ilike.%${filters.search}%,telefono.ilike.%${filters.search}%,telefono_normalizado.ilike.%${filters.search}%`);
    }

    query = query.order('creado', { ascending: true }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return { data: (data || []) as Importado[], total: count ?? 0 };
  }

  async insertImportados(importacionId: string, rows: CSVRow[]): Promise<{ inserted: number; duplicates: number }> {
    let inserted = 0;
    let duplicates = 0;

    // Batch insert in chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const records = chunk.map(row => ({
        importacion_id: importacionId,
        nombre: row.nombre.trim(),
        telefono: row.telefono.trim(),
        telefono_normalizado: normalizarTelefono(row.telefono),
        id_dynamics: row.id_dynamics?.trim() || null,
      }));

      const { data, error } = await analysisSupabase
        .from('importados')
        .upsert(records, {
          onConflict: 'telefono_normalizado',
          ignoreDuplicates: false,
        })
        .select('id');

      if (error) {
        console.error('Error inserting importados chunk:', error);
        throw error;
      }
      inserted += data?.length ?? 0;
    }

    // Actualizar total_registros en la importación
    const { count } = await analysisSupabase
      .from('importados')
      .select('id', { count: 'exact', head: true })
      .eq('importacion_id', importacionId);

    await analysisSupabase
      .from('importaciones')
      .update({ total_registros: count ?? 0, actualizado: new Date().toISOString() })
      .eq('id', importacionId);

    duplicates = rows.length - inserted;
    return { inserted, duplicates };
  }

  // ============================================
  // BROADCASTS
  // ============================================

  async getBroadcasts(importacionId: string): Promise<ImportacionBroadcast[]> {
    const { data, error } = await analysisSupabase
      .from('importacion_broadcasts')
      .select('*')
      .eq('importacion_id', importacionId)
      .order('creado', { ascending: false });

    if (error) throw error;
    return (data || []) as ImportacionBroadcast[];
  }

  async createAndExecuteBroadcast(params: {
    importacionId: string;
    templateId: string;
    templateName: string;
    batchCount: number;
    batchSize: number;
    batchIntervalSeconds: number;
    scheduledAt: string | null;
    userId: string;
    userEmail: string;
  }): Promise<ImportacionBroadcast> {
    // 1. Obtener importados pendientes
    const { data: importados, error: impError } = await analysisSupabase
      .from('importados')
      .select('id, nombre, telefono_normalizado, id_dynamics')
      .eq('importacion_id', params.importacionId)
      .eq('estatus', 'pendiente');

    if (impError) throw impError;
    if (!importados || importados.length === 0) {
      throw new Error('No hay importados pendientes para enviar');
    }

    // 2. Crear registro de broadcast
    const { data: broadcast, error: bcError } = await analysisSupabase
      .from('importacion_broadcasts')
      .insert({
        importacion_id: params.importacionId,
        template_id: params.templateId,
        template_name: params.templateName,
        batch_count: params.batchCount,
        batch_size: params.batchSize,
        batch_interval_seconds: params.batchIntervalSeconds,
        scheduled_at: params.scheduledAt,
        estatus: params.scheduledAt ? 'programado' : 'ejecutando',
        total_destinatarios: importados.length,
        ejecutado_por: params.userId,
        ejecutado_por_email: params.userEmail,
        iniciado_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (bcError) throw bcError;

    // 3. Construir payload para N8N
    const payload: MassiveBroadcastPayload = {
      importacion_id: params.importacionId,
      broadcast_id: broadcast.id,
      template_id: params.templateId,
      template_name: params.templateName,
      batch_count: params.batchCount,
      batch_size: params.batchSize,
      batch_interval_seconds: params.batchIntervalSeconds,
      scheduled_at: params.scheduledAt,
      importados: importados.map(imp => ({
        id: imp.id,
        nombre: imp.nombre,
        telefono_normalizado: imp.telefono_normalizado ?? '',
        id_dynamics: imp.id_dynamics,
      })),
      total_recipients: importados.length,
      created_by_id: params.userId,
      created_by_email: params.userEmail,
      timestamp: new Date().toISOString(),
    };

    // 4. Llamar Edge Function
    try {
      const response = await authenticatedEdgeFetch('massive-import-broadcast-proxy', {
        body: payload,
      });

      const responseData = await response.json();

      // 5. Actualizar broadcast con respuesta
      await analysisSupabase
        .from('importacion_broadcasts')
        .update({
          webhook_response: responseData,
          estatus: responseData.success ? (params.scheduledAt ? 'programado' : 'ejecutando') : 'fallido',
          error_message: responseData.success ? null : (responseData.error || 'Error desconocido'),
          actualizado: new Date().toISOString(),
        })
        .eq('id', broadcast.id);

      // 6. Actualizar estatus de la importación
      await this.updateImportacionEstatus(params.importacionId, 'procesando');

      return broadcast as ImportacionBroadcast;
    } catch (err) {
      // Marcar broadcast como fallido
      await analysisSupabase
        .from('importacion_broadcasts')
        .update({
          estatus: 'fallido',
          error_message: err instanceof Error ? err.message : 'Error de conexión',
          actualizado: new Date().toISOString(),
        })
        .eq('id', broadcast.id);

      throw err;
    }
  }

  // ============================================
  // TEMPLATES (SIN VARIABLES)
  // ============================================

  async getTemplatesSinVariables(): Promise<TemplateConRating[]> {
    const { data, error } = await analysisSupabase
      .from('whatsapp_templates')
      .select('*')
      .eq('status', 'APPROVED')
      .eq('is_active', true)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('name');

    if (error) throw error;

    // Filtrar templates sin variables en BODY
    const sinVariables = (data || []).filter((template: WhatsAppTemplate) => {
      const hasVariables = template.components?.some((component: { type: string; text?: string }) => {
        if (component.type === 'BODY' && component.text) {
          return /\{\{\d+\}\}/.test(component.text);
        }
        return false;
      });
      return !hasVariables;
    });

    // Obtener response rates
    const rates = await whatsappTemplatesService.getTemplateResponseRates();

    // Enriquecer con ratings
    return sinVariables.map((t: WhatsAppTemplate) => {
      const rate = rates.get(t.id);
      return {
        ...t,
        starRating: rate?.starRating ?? 0,
        replyRate: rate?.replyRate ?? 0,
        totalSent: rate?.totalSent ?? 0,
      } as TemplateConRating;
    }).sort((a: TemplateConRating, b: TemplateConRating) => {
      // Ordenar por star rating desc, luego reply rate desc
      if (b.starRating !== a.starRating) return b.starRating - a.starRating;
      return b.replyRate - a.replyRate;
    });
  }
}

export const importacionesService = new ImportacionesService();
