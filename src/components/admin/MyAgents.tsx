/**
 * ============================================
 * GESTIÓN PERSONAL DE AGENTES - MÓDULO PQNC HUMANS
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/admin/README_PQNC_HUMANS.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/admin/README_PQNC_HUMANS.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/admin/CHANGELOG_PQNC_HUMANS.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

import React, { useEffect, useState } from 'react';
import { supabaseMainAdmin as supabaseAdmin } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { AgentTemplate } from '../../config/supabase';
import { deleteAgentTemplate } from '../../services/supabaseService';

interface MyAgentsProps {
  onOpenEditor: (templateId: string) => void;
}

const MyAgents: React.FC<MyAgentsProps> = ({ onOpenEditor }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<AgentTemplate[]>([]);
  const [published, setPublished] = useState<AgentTemplate[]>([]);

  useEffect(() => {
    if (user) loadAgents();
  }, [user]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabaseAdmin
        .from('agent_templates')
        .select('*')
        .eq('created_by', user?.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const list = (data || []) as AgentTemplate[];
      setDrafts(list.filter(a => !a.is_active));
      setPublished(list.filter(a => a.is_active));
    } catch (e: any) {
      setError(e.message || 'Error al cargar agentes');
    } finally {
      setLoading(false);
    }
  };

  const publish = async (id: string) => {
    try {
      const { error } = await supabaseAdmin
        .from('agent_templates')
        .update({ is_active: true, is_public: true, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await loadAgents();
    } catch (e: any) {
      alert(e.message || 'Error al publicar');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este agente? Esta acción no se puede deshacer.')) return;
    try {
      await deleteAgentTemplate(id);
      await loadAgents();
    } catch (e: any) {
      alert(e.message || 'Error al eliminar');
    }
  };

  const EmptyState: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
    <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
      <div className="flex items-center justify-center w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4">
        <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </div>
      <h4 className="text-gray-700 dark:text-gray-300 font-medium mb-1">{title}</h4>
      <p className="text-sm text-gray-500 dark:text-gray-500">{subtitle}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Mis Agentes</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Borradores y publicados creados por ti</p>
          </div>
          <button onClick={loadAgents} className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
            Recargar
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-card p-4 border border-red-300 text-red-700">{error}</div>
      )}

      {/* Borradores */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3"/></svg>
          </div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">En progreso</h4>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8"><div className="animate-spin h-8 w-8 rounded-full border-b-2 border-amber-600"/></div>
        ) : drafts.length === 0 ? (
          <EmptyState title="Sin borradores" subtitle="Crea o guarda un agente como borrador desde una plantilla" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drafts.map(a => (
              <div key={a.id} className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{a.name}</h5>
                    <p className="text-xs text-gray-500">{a.estimated_time || ''}</p>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">Borrador</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{a.description || 'Agente en edición'}</p>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => onOpenEditor(a.id)} className="px-3 py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Continuar</button>
                  <button onClick={() => publish(a.id)} className="px-3 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Publicar</button>
                  <button onClick={() => remove(a.id)} className="px-3 py-2 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Publicados */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
          </div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Publicados</h4>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8"><div className="animate-spin h-8 w-8 rounded-full border-b-2 border-emerald-600"/></div>
        ) : published.length === 0 ? (
          <EmptyState title="Sin agentes publicados" subtitle="Publica un borrador para verlo aquí" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {published.map(a => (
              <div key={a.id} className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{a.name}</h5>
                    <p className="text-xs text-gray-500">{a.estimated_time || ''}</p>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">Publicado</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{a.description || 'Sin descripción'}</p>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => onOpenEditor(a.id)} className="px-3 py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Editar</button>
                  <button onClick={() => remove(a.id)} className="px-3 py-2 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAgents;

