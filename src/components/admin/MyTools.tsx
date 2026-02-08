import React, { useEffect, useState } from 'react';
import { supabaseMainAdmin as supabaseAdmin } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { ToolCatalog } from '../../config/supabase';
import { createTool } from '../../services/supabaseService';

const MyTools: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tools, setTools] = useState<ToolCatalog[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ToolCatalog | null>(null);
  const [form, setForm] = useState({ name: '', tool_type: 'function', category: 'communication', description: '', configText: '{\n  \n}' });

  useEffect(() => { if (user) loadTools(); }, [user]);

  const loadTools = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabaseAdmin
        .from('tools_catalog')
        .select('*')
        .contains('config', { metadata: { created_by: user?.id } })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setTools((data || []) as any);
    } catch (e: any) {
      setError(e.message || 'Error al cargar herramientas');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    try {
      const cfg = JSON.parse(form.configText || '{}');
      if (editing) {
        const { error } = await supabaseAdmin
          .from('tools_catalog')
          .update({ name: form.name, tool_type: form.tool_type, category: form.category, description: form.description, config: cfg, updated_at: new Date().toISOString() })
          .eq('id', (editing as any).id);
        if (error) throw error;
      } else {
        await createTool({ name: form.name, tool_type: form.tool_type as any, category: form.category, description: form.description, config: cfg }, user?.id);
      }
      setShowModal(false);
      setEditing(null);
      setForm({ name: '', tool_type: 'function', category: 'communication', description: '', configText: '{\n  \n}' });
      await loadTools();
    } catch (e: any) {
      alert(e.message || 'Error al guardar');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta herramienta? Si está en uso por algún agente puede fallar.')) return;
    try {
      const { error } = await supabaseAdmin.from('tools_catalog').delete().eq('id', id);
      if (error) throw error;
      await loadTools();
    } catch (e: any) {
      alert(e.message || 'Error al eliminar. Verifica si está en uso.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Mis Herramientas</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Creadas por ti</p>
          </div>
          <button onClick={() => { setEditing(null); setForm({ name: '', tool_type: 'function', category: 'communication', description: '', configText: '{\n  \n}' }); setShowModal(true); }} className="px-3 py-2 text-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700">Nueva herramienta</button>
        </div>
      </div>

      {error && (<div className="glass-card p-4 border border-red-300 text-red-700">{error}</div>)}

      <div className="glass-card p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8"><div className="animate-spin h-8 w-8 rounded-full border-b-2 border-indigo-600"/></div>
        ) : tools.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">No has creado herramientas</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">Crea una herramienta y aparecerá aquí</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((t: any) => (
              <div key={t.id} className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{t.name}</h5>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">{t.tool_type}</span>
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">{t.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditing(t); setForm({ name: t.name, tool_type: t.tool_type, category: t.category, description: t.description || '', configText: JSON.stringify(t.config || {}, null, 2) }); setShowModal(true); }} className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200">Editar</button>
                    <button onClick={() => remove(t.id)} className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200">Eliminar</button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">{t.description}</p>
                {t.tool_type === 'function' && (
                  <p className="text-[11px] text-gray-500">{t.config?.server?.url || 'sin servidor'}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-xl">
              <h3 className="text-lg font-semibold">{editing ? 'Editar herramienta' : 'Nueva herramienta'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input className="w-full px-3 py-2 border rounded-md" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select className="w-full px-3 py-2 border rounded-md" value={form.tool_type} onChange={e=>setForm({...form, tool_type:e.target.value})}>
                    <option value="function">Función</option>
                    <option value="transferCall">Transferencia</option>
                    <option value="endCall">End Call</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select className="w-full px-3 py-2 border rounded-md" value={form.category} onChange={e=>setForm({...form, category:e.target.value})}>
                    <option value="communication">Comunicación</option>
                    <option value="data_collection">Datos</option>
                    <option value="business_logic">Lógica</option>
                    <option value="external_api">APIs Externas</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea className="w-full px-3 py-2 border rounded-md" rows={2} value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Config (JSON)</label>
                <textarea className="w-full px-3 py-2 border rounded-md font-mono text-xs" rows={8} value={form.configText} onChange={e=>setForm({...form, configText:e.target.value})} />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button className="px-4 py-2 bg-gray-100 rounded-md" onClick={()=>{ setShowModal(false); setEditing(null); }}>Cancelar</button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-md" onClick={save}>{editing ? 'Guardar' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTools;

