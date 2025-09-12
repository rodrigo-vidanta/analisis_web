import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import AcademiaLayout from './AcademiaLayout';
import VirtualCallComponent from './VirtualCallComponent';
import * as Academia from '../../services/academiaService';

type AcademiaLevel = Academia.AcademiaLevel;
type AcademiaActivity = Academia.AcademiaActivity;
type VirtualAssistant = Academia.VirtualAssistant;
const academiaService = Academia.default;

interface LevelViewProps {
  levelId: number;
  onBack: () => void;
}

const LevelView: React.FC<LevelViewProps> = ({ levelId, onBack }) => {
  const { isLinearTheme } = useTheme();
  const [level, setLevel] = useState<AcademiaLevel | null>(null);
  const [activities, setActivities] = useState<AcademiaActivity[]>([]);
  const [currentActivity, setCurrentActivity] = useState<AcademiaActivity | null>(null);
  const [virtualAssistant, setVirtualAssistant] = useState<VirtualAssistant | null>(null);
  const [showVirtualCall, setShowVirtualCall] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLevelData();
  }, [levelId]);

  const loadLevelData = async () => {
    try {
      setLoading(true);
      
      // Datos mock temporales hasta configurar la base de datos
      const mockLevels = {
        1: {
          id: 1,
          nivel_numero: 1,
          nombre: 'Fundamentos de Vidanta',
          descripcion: 'Aprende los conceptos básicos sobre Vidanta y sus resorts',
          xp_requerido: 0,
          es_activo: true,
          orden_display: 1,
          color_tema: 'blue',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        2: {
          id: 2,
          nivel_numero: 2,
          nombre: 'Técnicas de Conexión',
          descripcion: 'Domina el arte de conectar emocionalmente con el cliente',
          xp_requerido: 100,
          es_activo: true,
          orden_display: 2,
          color_tema: 'emerald',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        3: {
          id: 3,
          nivel_numero: 3,
          nombre: 'Presentación de Beneficios',
          descripcion: 'Aprende a presentar los beneficios de manera persuasiva',
          xp_requerido: 250,
          es_activo: true,
          orden_display: 3,
          color_tema: 'purple',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };

      const mockActivities = {
        1: [
          {
            id: 1,
            nivel_id: 1,
            tipo_actividad: 'llamada_virtual' as const,
            nombre: 'Cliente Básico - María González',
            descripcion: 'Primera llamada con una madre de familia interesada en vacaciones',
            orden_actividad: 1,
            xp_otorgado: 25,
            es_obligatoria: true,
            configuracion: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 2,
            nivel_id: 1,
            tipo_actividad: 'quiz' as const,
            nombre: 'Quiz: Conocimiento de Resorts',
            descripcion: 'Evaluación sobre información básica de los resorts Vidanta',
            orden_actividad: 2,
            xp_otorgado: 15,
            es_obligatoria: true,
            configuracion: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 3,
            nivel_id: 1,
            tipo_actividad: 'juego' as const,
            nombre: 'Juego: Matching de Beneficios',
            descripcion: 'Conecta cada tipo de cliente con sus beneficios ideales',
            orden_actividad: 3,
            xp_otorgado: 20,
            es_obligatoria: false,
            configuracion: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 4,
            nivel_id: 1,
            tipo_actividad: 'llamada_virtual' as const,
            nombre: 'Cliente Indeciso - Roberto Mendoza',
            descripcion: 'Manejo de un empresario ocupado que necesita más información',
            orden_actividad: 4,
            xp_otorgado: 30,
            es_obligatoria: true,
            configuracion: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        2: [
          {
            id: 5,
            nivel_id: 2,
            tipo_actividad: 'llamada_virtual' as const,
            nombre: 'Cliente Exigente - Carmen Ruiz',
            descripcion: 'Establecer rapport con una profesional muy exigente',
            orden_actividad: 1,
            xp_otorgado: 35,
            es_obligatoria: true,
            configuracion: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 6,
            nivel_id: 2,
            tipo_actividad: 'juego' as const,
            nombre: 'Simulador de Emociones',
            descripcion: 'Identifica las emociones del cliente y responde apropiadamente',
            orden_actividad: 2,
            xp_otorgado: 20,
            es_obligatoria: true,
            configuracion: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        3: [
          {
            id: 7,
            nivel_id: 3,
            tipo_actividad: 'llamada_virtual' as const,
            nombre: 'Presentación Ejecutiva - Cliente VIP',
            descripcion: 'Presenta beneficios a un ejecutivo de alto valor',
            orden_actividad: 1,
            xp_otorgado: 50,
            es_obligatoria: true,
            configuracion: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
      };
      
      const levelData = mockLevels[levelId as keyof typeof mockLevels];
      const activitiesData = mockActivities[levelId as keyof typeof mockActivities] || [];
      
      setLevel(levelData || null);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Error cargando datos del nivel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivityClick = async (activity: AcademiaActivity) => {
    setCurrentActivity(activity);
    
    if (activity.tipo_actividad === 'llamada_virtual') {
      // Mock de asistente virtual temporal
      const mockAssistant: VirtualAssistant = {
        id: activity.id,
        actividad_id: activity.id,
        assistant_id: `mock_assistant_${activity.id}`,
        nombre_cliente: activity.nombre.includes('María') ? 'María González' : 
                       activity.nombre.includes('Roberto') ? 'Roberto Mendoza' :
                       activity.nombre.includes('Carmen') ? 'Carmen Ruiz' : 'Cliente Virtual',
        personalidad: activity.nombre.includes('María') 
          ? 'Madre de familia de 35 años, muy organizada y detallista. Busca unas vacaciones relajantes para su familia de 4 personas.'
          : activity.nombre.includes('Roberto')
          ? 'Empresario de 42 años, ocupado pero interesado. Habla rápido y va directo al grano.'
          : 'Profesional exigente con altos estándares. Es directa y no tolera vendedores insistentes.',
        dificultad: activity.nivel_id,
        objetivos_venta: [
          'Establecer rapport inicial',
          'Identificar necesidades del cliente',
          'Presentar beneficios relevantes',
          'Manejar objeciones básicas'
        ],
        objeciones_comunes: [
          'Necesito consultar con mi familia',
          'Es muy caro para nosotros',
          '¿Qué incluye exactamente?'
        ],
        es_activo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setVirtualAssistant(mockAssistant);
      setShowVirtualCall(true);
    } else if (activity.tipo_actividad === 'quiz') {
      // Mostrar quiz (implementar después)
      alert(`Quiz: ${activity.nombre} - Próximamente disponible`);
    } else if (activity.tipo_actividad === 'juego') {
      // Mostrar juego (implementar después)
      alert(`Juego: ${activity.nombre} - Próximamente disponible`);
    } else {
      // Repaso u otros
      alert(`${activity.nombre} - Próximamente disponible`);
    }
  };

  const handleCallEnd = async (callData: any) => {
    if (!currentActivity) return;

    try {
      // Guardar sesión de llamada
      await academiaService.saveVirtualCallSession({
        user_email: 'current-user@example.com', // Obtener del contexto de auth
        actividad_id: currentActivity.id,
        assistant_id: virtualAssistant?.assistant_id || '',
        duracion_segundos: callData.duration,
        transcripcion_completa: callData.transcript,
        objetivos_cumplidos: callData.objectivesAchieved,
        objeciones_manejadas: [],
        puntuacion_final: callData.score,
        feedback_ia: callData.feedback,
        areas_mejora: [],
        finalizada_at: new Date().toISOString()
      });

      // Completar actividad
      await academiaService.completeActivity('current-user@example.com', {
        actividad_id: currentActivity.id,
        puntuacion: callData.score,
        xp_ganado: currentActivity.xp_otorgado,
        tiempo_completado: callData.duration,
        datos_sesion: callData
      });

      console.log('Actividad completada y guardada');
    } catch (error) {
      console.error('Error guardando resultados:', error);
    }
  };

  const getActivityIcon = (tipo: string) => {
    switch (tipo) {
      case 'llamada_virtual':
        return '📞';
      case 'quiz':
        return '❓';
      case 'juego':
        return '🎮';
      case 'repaso':
        return '📖';
      default:
        return '📝';
    }
  };

  const getActivityColor = (tipo: string) => {
    switch (tipo) {
      case 'llamada_virtual':
        return isLinearTheme ? 'from-blue-500 to-blue-600' : 'from-blue-400 to-indigo-600';
      case 'quiz':
        return isLinearTheme ? 'from-emerald-500 to-emerald-600' : 'from-emerald-400 to-green-600';
      case 'juego':
        return isLinearTheme ? 'from-purple-500 to-purple-600' : 'from-purple-400 to-pink-600';
      case 'repaso':
        return isLinearTheme ? 'from-orange-500 to-orange-600' : 'from-orange-400 to-red-600';
      default:
        return isLinearTheme ? 'from-slate-500 to-slate-600' : 'from-slate-400 to-slate-600';
    }
  };

  if (loading) {
    return (
      <AcademiaLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className={`${isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'}`}>
              Cargando nivel...
            </p>
          </div>
        </div>
      </AcademiaLayout>
    );
  }

  if (showVirtualCall && virtualAssistant) {
    return (
      <AcademiaLayout>
        <div className="mb-6">
          <button
            onClick={() => setShowVirtualCall(false)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isLinearTheme 
                ? 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                : 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-900/20'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Volver al Nivel</span>
          </button>
        </div>

        <VirtualCallComponent
          assistantId={virtualAssistant.assistant_id}
          clientName={virtualAssistant.nombre_cliente}
          clientPersonality={virtualAssistant.personalidad}
          objectives={virtualAssistant.objetivos_venta}
          difficulty={virtualAssistant.dificultad}
          onCallEnd={handleCallEnd}
        />
      </AcademiaLayout>
    );
  }

  if (!level) {
    return (
      <AcademiaLayout>
        <div className="text-center">
          <h2 className={`text-2xl font-bold mb-4 ${
            isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
          }`}>
            Nivel no encontrado
          </h2>
          <button
            onClick={onBack}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              isLinearTheme 
                ? 'bg-slate-600 hover:bg-slate-700 text-white'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'
            }`}
          >
            Volver al Dashboard
          </button>
        </div>
      </AcademiaLayout>
    );
  }

  return (
    <AcademiaLayout currentSection="levels">
      {/* Header del Nivel */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg mb-6 transition-colors ${
            isLinearTheme 
              ? 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              : 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-900/20'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Volver al Dashboard</span>
        </button>

        <div className={`p-8 rounded-2xl ${
          isLinearTheme 
            ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
            : 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700'
        }`}>
          <div className="flex items-center space-x-4 mb-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br ${getActivityColor('llamada_virtual')} text-white`}>
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${
                isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
              }`}>
                {level.nombre}
              </h1>
              <p className={`text-lg ${
                isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
              }`}>
                Nivel {level.nivel_numero} • {level.xp_requerido} XP requerido
              </p>
            </div>
          </div>
          <p className={`text-lg ${
            isLinearTheme ? 'text-slate-700 dark:text-slate-300' : 'text-indigo-700 dark:text-indigo-300'
          }`}>
            {level.descripcion}
          </p>
        </div>
      </div>

      {/* Actividades del Nivel */}
      <div>
        <h2 className={`text-2xl font-bold mb-6 ${
          isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
        }`}>
          Actividades del Nivel
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity, index) => (
            <div 
              key={activity.id}
              style={{ animationDelay: `${index * 0.1}s` }}
              className="animate-slide-up opacity-0"
            >
              <div className={`group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
                <div className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                  isLinearTheme
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                    : 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'
                }`}>
                  {/* Tipo de Actividad */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${getActivityColor(activity.tipo_actividad)} text-white`}>
                      <span className="text-xl">{getActivityIcon(activity.tipo_actividad)}</span>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full ${
                      isLinearTheme 
                        ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300'
                    }`}>
                      +{activity.xp_otorgado} XP
                    </span>
                  </div>

                  {/* Contenido */}
                  <h3 className={`font-bold text-lg mb-2 ${
                    isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
                  }`}>
                    {activity.nombre}
                  </h3>
                  
                  <p className={`text-sm mb-4 ${
                    isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
                  }`}>
                    {activity.descripcion}
                  </p>

                  {/* Botón de Acción */}
                  <button 
                    onClick={() => handleActivityClick(activity)}
                    className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 hover:scale-105 bg-gradient-to-r ${getActivityColor(activity.tipo_actividad)} text-white shadow-lg hover:shadow-xl`}
                  >
                    {activity.tipo_actividad === 'llamada_virtual' ? '📞 Iniciar Llamada' : 
                     activity.tipo_actividad === 'quiz' ? '❓ Tomar Quiz' :
                     activity.tipo_actividad === 'juego' ? '🎮 Jugar' : '📖 Estudiar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Estilos CSS personalizados */}
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
        }
      `}</style>
    </AcademiaLayout>
  );
};

export default LevelView;
