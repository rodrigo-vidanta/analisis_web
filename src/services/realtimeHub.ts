/**
 * ============================================
 * REALTIME HUB - Servicio centralizado de Realtime
 * ============================================
 *
 * Mantiene 1 canal por tabla y distribuye eventos
 * a múltiples listeners registrados (patrón pub/sub).
 *
 * Beneficio: Reduce de N canales por tabla a 1,
 * disminuyendo drásticamente el procesamiento WAL
 * (list_changes) en Supabase.
 *
 * Uso:
 *   const unsub = realtimeHub.subscribe('llamadas_ventas', ['INSERT', 'UPDATE'], (payload) => { ... });
 *   // cleanup:
 *   unsub();
 */

import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { analysisSupabase } from '../config/analysisSupabase';
import { supabaseSystemUI } from '../config/supabaseSystemUI';

type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
  schema: string;
  table: string;
  commit_timestamp: string;
}

type RealtimeCallback = (payload: RealtimePayload) => void;

class RealtimeHubService {
  private channels = new Map<string, RealtimeChannel>();
  private listeners = new Map<string, Map<EventType, Set<RealtimeCallback>>>();
  private channelStatuses = new Map<string, string>();

  constructor(
    private supabaseClient: SupabaseClient,
    private hubName: string
  ) {}

  /**
   * Suscribirse a eventos de una tabla.
   * Crea el canal si no existe, reutiliza si ya existe.
   * Retorna función de unsuscribe.
   */
  subscribe(
    table: string,
    eventTypes: EventType | EventType[],
    callback: RealtimeCallback
  ): () => void {
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];

    // Crear canal si no existe para esta tabla
    if (!this.channels.has(table)) {
      this.createChannel(table);
    }

    // Registrar callback por cada tipo de evento
    if (!this.listeners.has(table)) {
      this.listeners.set(table, new Map());
    }
    const tableListeners = this.listeners.get(table)!;

    for (const type of types) {
      if (!tableListeners.has(type)) {
        tableListeners.set(type, new Set());
      }
      tableListeners.get(type)!.add(callback);
    }

    // Retornar función de unsuscribe
    return () => {
      for (const type of types) {
        tableListeners.get(type)?.delete(callback);
      }
      this.maybeDestroyChannel(table);
    };
  }

  /**
   * Crea un único canal Realtime para una tabla.
   * Escucha event: '*' y filtra en JS.
   */
  private createChannel(table: string): void {
    const channelName = `${this.hubName}-${table}`;

    const channel = this.supabaseClient
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          this.dispatch(table, payload as unknown as RealtimePayload);
        }
      )
      .subscribe((status) => {
        this.channelStatuses.set(table, status);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[RealtimeHub:${this.hubName}] Canal ${table}: ${status}`);
        }
      });

    this.channels.set(table, channel);
  }

  /**
   * Distribuye un evento a todos los callbacks registrados.
   */
  private dispatch(table: string, payload: RealtimePayload): void {
    const tableListeners = this.listeners.get(table);
    if (!tableListeners) return;

    const eventType = payload.eventType;

    // Despachar a listeners del tipo específico
    const specificCallbacks = tableListeners.get(eventType);
    if (specificCallbacks) {
      for (const cb of specificCallbacks) {
        try {
          cb(payload);
        } catch (e) {
          console.error(`[RealtimeHub:${this.hubName}] Error en callback ${table}:${eventType}:`, e);
        }
      }
    }

    // Despachar a listeners wildcard (*)
    const wildcardCallbacks = tableListeners.get('*');
    if (wildcardCallbacks) {
      for (const cb of wildcardCallbacks) {
        try {
          cb(payload);
        } catch (e) {
          console.error(`[RealtimeHub:${this.hubName}] Error en callback ${table}:*:`, e);
        }
      }
    }
  }

  /**
   * Destruye el canal si no quedan listeners.
   */
  private maybeDestroyChannel(table: string): void {
    const tableListeners = this.listeners.get(table);
    if (!tableListeners) return;

    let hasListeners = false;
    for (const [, callbacks] of tableListeners) {
      if (callbacks.size > 0) {
        hasListeners = true;
        break;
      }
    }

    if (!hasListeners) {
      const channel = this.channels.get(table);
      if (channel) {
        try {
          channel.unsubscribe();
        } catch (e) {
          // Ignorar errores al desuscribirse
        }
      }
      this.channels.delete(table);
      this.listeners.delete(table);
      this.channelStatuses.delete(table);
    }
  }

  /**
   * Destruye todos los canales. Llamar en logout.
   */
  cleanup(): void {
    for (const [, channel] of this.channels) {
      try {
        channel.unsubscribe();
      } catch (e) {
        // Ignorar errores al desuscribirse
      }
    }
    this.channels.clear();
    this.listeners.clear();
    this.channelStatuses.clear();
  }

  /**
   * Diagnóstico: canales activos y listeners.
   */
  getStats(): { channels: number; listeners: number; tables: string[] } {
    let totalListeners = 0;
    for (const [, tableListeners] of this.listeners) {
      for (const [, callbacks] of tableListeners) {
        totalListeners += callbacks.size;
      }
    }
    return {
      channels: this.channels.size,
      listeners: totalListeners,
      tables: [...this.channels.keys()]
    };
  }

  /**
   * Verifica si un canal para una tabla está conectado.
   */
  isConnected(table: string): boolean {
    return this.channelStatuses.get(table) === 'SUBSCRIBED';
  }
}

// ============================================
// INSTANCIAS SINGLETON
// ============================================

/** Hub principal para operaciones de datos (llamadas, prospectos, mensajes) */
export const realtimeHub = new RealtimeHubService(analysisSupabase, 'hub');

/** Hub para operaciones de sistema UI (bot_pause_status, uchat, user_notifications) */
export const realtimeHubSystemUI = new RealtimeHubService(supabaseSystemUI, 'hub-ui');

export type { EventType, RealtimeCallback, RealtimePayload };
export { RealtimeHubService };
