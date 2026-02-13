/**
 * ============================================
 * SERVICIO DE COMUNICADOS EN TIEMPO REAL
 * ============================================
 *
 * Gestiona comunicados del admin hacia usuarios.
 * Soporta targeting por coordinacion, usuarios o roles.
 * Incluye suscripcion Realtime para nuevos comunicados.
 *
 * BD: PQNC_AI (glsmifhkoaifvaegsozd)
 * Tablas: comunicados, comunicado_reads
 * RPC: mark_comunicado_read
 */

import { analysisSupabase } from '../config/analysisSupabase';
import type {
  Comunicado,
  ComunicadoRead,
  CreateComunicadoParams,
  UpdateComunicadoParams,
  ComunicadoEstado,
} from '../types/comunicados';

class ComunicadosService {
  /**
   * Obtener comunicados para admin (todos los estados)
   */
  async getComunicadosAdmin(filtros?: {
    estado?: ComunicadoEstado;
    tipo?: string;
  }): Promise<Comunicado[]> {
    try {
      let query = analysisSupabase
        .from('comunicados')
        .select('*')
        .order('created_at', { ascending: false });

      if (filtros?.estado) {
        query = query.eq('estado', filtros.estado);
      }
      if (filtros?.tipo) {
        query = query.eq('tipo', filtros.tipo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Comunicado[];
    } catch (error) {
      console.error('Error obteniendo comunicados admin:', error);
      return [];
    }
  }

  /**
   * Obtener comunicados pendientes para un usuario.
   * Filtra por targeting en service layer (no en SQL) porque
   * el targeting usa logica compleja con coordinacion_id y role_name.
   */
  async getComunicadosPendientes(
    userId: string,
    coordinacionId?: string,
    roleName?: string
  ): Promise<Comunicado[]> {
    try {
      // 1. Fetch comunicados activos no expirados
      const { data: comunicados, error: comError } = await analysisSupabase
        .from('comunicados')
        .select('*')
        .eq('estado', 'activo')
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('prioridad', { ascending: false })
        .order('published_at', { ascending: false });

      if (comError) throw comError;
      if (!comunicados || comunicados.length === 0) return [];

      // 2. Fetch IDs de comunicados ya leidos por este usuario
      const { data: reads, error: readError } = await analysisSupabase
        .from('comunicado_reads')
        .select('comunicado_id')
        .eq('user_id', userId);

      if (readError) throw readError;
      const readIds = new Set((reads || []).map(r => r.comunicado_id));

      // 3. Filtrar leidos
      let pending = (comunicados as Comunicado[]).filter(c => !readIds.has(c.id));

      // 4. Filtrar por targeting
      pending = pending.filter(c => {
        switch (c.target_type) {
          case 'todos':
            return true;
          case 'coordinacion':
            return coordinacionId ? c.target_ids.includes(coordinacionId) : false;
          case 'usuarios':
            return c.target_ids.includes(userId);
          case 'roles':
            return roleName ? c.target_ids.includes(roleName) : false;
          default:
            return false;
        }
      });

      return pending;
    } catch (error) {
      console.error('Error obteniendo comunicados pendientes:', error);
      return [];
    }
  }

  /**
   * Crear un nuevo comunicado
   */
  async createComunicado(
    params: CreateComunicadoParams,
    userId: string
  ): Promise<Comunicado | null> {
    try {
      const { data, error } = await analysisSupabase
        .from('comunicados')
        .insert({
          titulo: params.titulo,
          subtitulo: params.subtitulo || null,
          contenido: params.contenido || {},
          tipo: params.tipo,
          prioridad: params.prioridad ?? 5,
          is_interactive: params.is_interactive ?? false,
          component_key: params.component_key || null,
          target_type: params.target_type || 'todos',
          target_ids: params.target_ids || [],
          expires_at: params.expires_at || null,
          estado: 'borrador',
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Comunicado;
    } catch (error) {
      console.error('Error creando comunicado:', error);
      return null;
    }
  }

  /**
   * Actualizar comunicado existente
   */
  async updateComunicado(
    id: string,
    updates: UpdateComunicadoParams
  ): Promise<boolean> {
    try {
      const { error } = await analysisSupabase
        .from('comunicados')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error actualizando comunicado:', error);
      return false;
    }
  }

  /**
   * Publicar comunicado (borrador → activo)
   */
  async publishComunicado(id: string): Promise<boolean> {
    try {
      const { error } = await analysisSupabase
        .from('comunicados')
        .update({
          estado: 'activo',
          published_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error publicando comunicado:', error);
      return false;
    }
  }

  /**
   * Archivar comunicado (activo → archivado)
   */
  async archiveComunicado(id: string): Promise<boolean> {
    try {
      const { error } = await analysisSupabase
        .from('comunicados')
        .update({ estado: 'archivado' })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error archivando comunicado:', error);
      return false;
    }
  }

  /**
   * Marcar comunicado como leido via RPC (SECURITY DEFINER)
   */
  async markAsRead(comunicadoId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await analysisSupabase.rpc('mark_comunicado_read', {
        p_comunicado_id: comunicadoId,
        p_user_id: userId,
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marcando comunicado como leido:', error);
      return false;
    }
  }

  /**
   * Obtener estadisticas de lectura de un comunicado (admin)
   */
  async getReadStats(comunicadoId: string): Promise<{
    count: number;
    readers: ComunicadoRead[];
  }> {
    try {
      const { data, error } = await analysisSupabase
        .from('comunicado_reads')
        .select('*')
        .eq('comunicado_id', comunicadoId)
        .order('read_at', { ascending: false });

      if (error) throw error;
      return {
        count: data?.length || 0,
        readers: (data || []) as ComunicadoRead[],
      };
    } catch (error) {
      console.error('Error obteniendo stats de lectura:', error);
      return { count: 0, readers: [] };
    }
  }

  /**
   * Suscribirse a nuevos comunicados via Realtime
   * Retorna funcion de cleanup para unsubscribe
   */
  subscribeToNewComunicados(
    callback: (comunicado: Comunicado) => void
  ): () => void {
    let channel: ReturnType<typeof analysisSupabase.channel> | null = null;
    let isSubscribed = false;

    try {
      channel = analysisSupabase
        .channel(`comunicados_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comunicados',
            filter: 'estado=eq.activo',
          },
          (payload) => {
            setTimeout(() => {
              try {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                  const comunicado = payload.new as Comunicado;
                  if (comunicado.estado === 'activo') {
                    callback(comunicado);
                  }
                }
              } catch (error) {
                console.debug('Error en callback de comunicado:', error);
              }
            }, 0);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            isSubscribed = true;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            isSubscribed = false;
          }
        });
    } catch (error) {
      console.debug('Error suscribiendo a comunicados:', error);
    }

    return () => {
      if (channel && isSubscribed) {
        try {
          analysisSupabase.removeChannel(channel);
        } catch (error) {
          // Ignorar errores al desconectar
        }
      }
    };
  }

  /**
   * Eliminar comunicado
   */
  async deleteComunicado(id: string): Promise<boolean> {
    try {
      const { error } = await analysisSupabase
        .from('comunicados')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error eliminando comunicado:', error);
      return false;
    }
  }
}

export const comunicadosService = new ComunicadosService();
export default comunicadosService;
