import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import * as Academia from '../../services/academiaService';

type AcademiaLevel = Academia.AcademiaLevel;
type AcademiaActivity = Academia.AcademiaActivity;
type VirtualAssistant = Academia.VirtualAssistant;
const academiaService = Academia.default;

interface AcademiaAdminPanelProps {
  onClose: () => void;
}

const AcademiaAdminPanel: React.FC<AcademiaAdminPanelProps> = ({ onClose }) => {
  const { isLinearTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'levels' | 'activities' | 'assistants' | 'analytics'>('levels');
  const [levels, setLevels] = useState<AcademiaLevel[]>([]);
  const [activities, setActivities] = useState<AcademiaActivity[]>([]);
  const [assistants, setAssistants] = useState<VirtualAssistant[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para formularios
  const [showLevelForm, setShowLevelForm] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showAssistantForm, setShowAssistantForm] = useState(false);
  const [editingLevel, setEditingLevel] = useState<AcademiaLevel | null>(null);
  const [editingActivity, setEditingActivity] = useState<AcademiaActivity | null>(null);
  const [editingAssistant, setEditingAssistant] = useState<VirtualAssistant | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [levelsData, assistantsData] = await Promise.all([
        academiaService.getLevels(),
        academiaService.getAllVirtualAssistants()
      ]);
      setLevels(levelsData);
      setAssistants(assistantsData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'levels', label: 'Niveles', icon: '📚', count: levels.length },
    { id: 'activities', label: 'Actividades', icon: '🎯', count: activities.length },
    { id: 'assistants', label: 'Asistentes IA', icon: '🤖', count: assistants.length },
    { id: 'analytics', label: 'Análitica', icon: '📊', count: 0 }
  ];

  const AssistantForm: React.FC<{ assistant?: VirtualAssistant }> = ({ assistant }) => {
    const [formData, setFormData] = useState({
      assistant_id: assistant?.assistant_id || '',
      nombre_cliente: assistant?.nombre_cliente || '',
      personalidad: assistant?.personalidad || '',
      dificultad: assistant?.dificultad || 1,
      objetivos_venta: assistant?.objetivos_venta || [],
      objeciones_comunes: assistant?.objeciones_comunes || [],
      avatar_url: assistant?.avatar_url || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Aquí iría la lógica para guardar el asistente
      console.log('Guardando asistente:', formData);
      setShowAssistantForm(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 p-6 rounded-2xl ${
          isLinearTheme 
            ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
            : 'bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-xl font-bold ${
              isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
            }`}>
              {assistant ? 'Editar' : 'Crear'} Asistente Virtual
            </h3>
            <button
              onClick={() => setShowAssistantForm(false)}
              className={`p-2 rounded-lg transition-colors ${
                isLinearTheme 
                  ? 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500'
                  : 'hover:bg-indigo-100 dark:hover:bg-indigo-900/20 text-indigo-500'
              }`}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Assistant ID */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isLinearTheme ? 'text-slate-700 dark:text-slate-300' : 'text-indigo-700 dark:text-indigo-300'
              }`}>
                Assistant ID (VAPI) *
              </label>
              <input
                type="text"
                value={formData.assistant_id}
                onChange={(e) => setFormData(prev => ({ ...prev, assistant_id: e.target.value }))}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-colors ${
                  isLinearTheme
                    ? 'border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 bg-white dark:bg-slate-800'
                    : 'border-indigo-200 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-slate-800'
                }`}
                placeholder="Ingresa el ID del asistente de VAPI"
                required
              />
            </div>

            {/* Nombre del Cliente */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isLinearTheme ? 'text-slate-700 dark:text-slate-300' : 'text-indigo-700 dark:text-indigo-300'
              }`}>
                Nombre del Cliente *
              </label>
              <input
                type="text"
                value={formData.nombre_cliente}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre_cliente: e.target.value }))}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-colors ${
                  isLinearTheme
                    ? 'border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 bg-white dark:bg-slate-800'
                    : 'border-indigo-200 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-slate-800'
                }`}
                placeholder="Ej: María González"
                required
              />
            </div>

            {/* Personalidad */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isLinearTheme ? 'text-slate-700 dark:text-slate-300' : 'text-indigo-700 dark:text-indigo-300'
              }`}>
                Personalidad del Cliente *
              </label>
              <textarea
                value={formData.personalidad}
                onChange={(e) => setFormData(prev => ({ ...prev, personalidad: e.target.value }))}
                rows={4}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-colors resize-none ${
                  isLinearTheme
                    ? 'border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 bg-white dark:bg-slate-800'
                    : 'border-indigo-200 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-slate-800'
                }`}
                placeholder="Describe la personalidad, comportamiento y características del cliente virtual..."
                required
              />
            </div>

            {/* Dificultad */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isLinearTheme ? 'text-slate-700 dark:text-slate-300' : 'text-indigo-700 dark:text-indigo-300'
              }`}>
                Nivel de Dificultad
              </label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, dificultad: level }))}
                    className={`w-12 h-12 rounded-xl font-bold transition-all ${
                      formData.dificultad === level
                        ? level <= 2
                          ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
                          : level <= 3
                          ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                          : 'bg-gradient-to-br from-red-400 to-pink-500 text-white'
                        : isLinearTheme
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        : 'bg-indigo-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Objetivos de Venta */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isLinearTheme ? 'text-slate-700 dark:text-slate-300' : 'text-indigo-700 dark:text-indigo-300'
              }`}>
                Objetivos de Venta
              </label>
              <textarea
                value={formData.objetivos_venta.join('\n')}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  objetivos_venta: e.target.value.split('\n').filter(obj => obj.trim())
                }))}
                rows={3}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-colors resize-none ${
                  isLinearTheme
                    ? 'border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 bg-white dark:bg-slate-800'
                    : 'border-indigo-200 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-slate-800'
                }`}
                placeholder="Un objetivo por línea&#10;Ej: Establecer rapport inicial&#10;Identificar necesidades del cliente&#10;Presentar beneficios principales"
              />
            </div>

            {/* Botones */}
            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-200 hover:scale-105 ${
                  isLinearTheme 
                    ? 'bg-slate-600 hover:bg-slate-700 text-white'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'
                }`}
              >
                {assistant ? 'Actualizar' : 'Crear'} Asistente
              </button>
              <button
                type="button"
                onClick={() => setShowAssistantForm(false)}
                className={`flex-1 py-3 px-6 rounded-xl font-semibold border-2 transition-all duration-200 ${
                  isLinearTheme 
                    ? 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                    : 'border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-600 dark:text-indigo-300 dark:hover:bg-indigo-900/20'
                }`}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderAssistantsTab = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-xl font-bold ${
          isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
        }`}>
          Asistentes Virtuales ({assistants.length}/20)
        </h3>
        <button
          onClick={() => setShowAssistantForm(true)}
          className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 hover:scale-105 ${
            isLinearTheme 
              ? 'bg-slate-600 hover:bg-slate-700 text-white'
              : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'
          }`}
        >
          + Nuevo Asistente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assistants.map((assistant) => (
          <div
            key={assistant.id}
            className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg ${
              isLinearTheme
                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                : 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  assistant.dificultad <= 2
                    ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                    : assistant.dificultad <= 3
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                    : 'bg-gradient-to-br from-red-400 to-pink-500'
                }`}>
                  <span className="text-white text-lg">🤖</span>
                </div>
                <div>
                  <h4 className={`font-semibold ${
                    isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
                  }`}>
                    {assistant.nombre_cliente}
                  </h4>
                  <p className={`text-xs ${
                    isLinearTheme ? 'text-slate-500 dark:text-slate-400' : 'text-indigo-500 dark:text-indigo-400'
                  }`}>
                    Dificultad: {assistant.dificultad}/5
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingAssistant(assistant);
                  setShowAssistantForm(true);
                }}
                className={`p-1 rounded text-xs ${
                  isLinearTheme 
                    ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    : 'text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/20'
                }`}
              >
                ✏️
              </button>
            </div>

            <p className={`text-sm mb-3 line-clamp-2 ${
              isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
            }`}>
              {assistant.personalidad}
            </p>

            <div className="flex items-center justify-between text-xs">
              <span className={`px-2 py-1 rounded-full ${
                isLinearTheme 
                  ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300'
              }`}>
                {assistant.objetivos_venta.length} objetivos
              </span>
              <span className={`${
                assistant.es_activo 
                  ? 'text-emerald-600' 
                  : 'text-red-500'
              }`}>
                {assistant.es_activo ? '● Activo' : '● Inactivo'}
              </span>
            </div>
          </div>
        ))}

        {/* Placeholder para nuevos asistentes */}
        {assistants.length < 20 && (
          <button
            onClick={() => setShowAssistantForm(true)}
            className={`p-6 rounded-xl border-2 border-dashed transition-all duration-200 hover:border-solid ${
              isLinearTheme
                ? 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                : 'border-indigo-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
            }`}
          >
            <div className="text-center">
              <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                isLinearTheme 
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                  : 'bg-indigo-100 dark:bg-slate-700 text-indigo-400'
              }`}>
                +
              </div>
              <p className={`text-sm font-medium ${
                isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
              }`}>
                Agregar Asistente
              </p>
            </div>
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`w-full max-w-6xl max-h-[90vh] m-4 p-6 rounded-2xl ${
          isLinearTheme 
            ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
            : 'bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700'
        }`}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className={`${isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'}`}>
                Cargando panel de administración...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`w-full max-w-6xl max-h-[90vh] overflow-y-auto m-4 p-6 rounded-2xl ${
          isLinearTheme 
            ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
            : 'bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold ${
              isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
            }`}>
              Panel de Administración - Academia
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isLinearTheme 
                  ? 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500'
                  : 'hover:bg-indigo-100 dark:hover:bg-indigo-900/20 text-indigo-500'
              }`}
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? isLinearTheme
                      ? 'bg-slate-600 text-white'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                    : isLinearTheme
                      ? 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                      : 'text-indigo-600 hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-900/20'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    activeTab === tab.id
                      ? 'bg-white/20'
                      : isLinearTheme
                        ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        : 'bg-indigo-200 text-indigo-600 dark:bg-indigo-800 dark:text-indigo-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Contenido */}
          <div className="min-h-[400px]">
            {activeTab === 'assistants' && renderAssistantsTab()}
            {activeTab === 'levels' && (
              <div className="text-center py-20">
                <p className={`text-lg ${
                  isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
                }`}>
                  Constructor de niveles en desarrollo...
                </p>
              </div>
            )}
            {activeTab === 'activities' && (
              <div className="text-center py-20">
                <p className={`text-lg ${
                  isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
                }`}>
                  Gestión de actividades en desarrollo...
                </p>
              </div>
            )}
            {activeTab === 'analytics' && (
              <div className="text-center py-20">
                <p className={`text-lg ${
                  isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
                }`}>
                  Análitica de rendimiento en desarrollo...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Formulario de Asistente */}
      {showAssistantForm && (
        <AssistantForm assistant={editingAssistant || undefined} />
      )}
    </>
  );
};

export default AcademiaAdminPanel;
