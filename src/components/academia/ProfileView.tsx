import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';
import AcademiaLayout from './AcademiaLayout';
import { 
  Phone, 
  HelpCircle, 
  Gamepad2, 
  BookOpen, 
  Edit3,
  BarChart3,
  FileText,
  Trophy
} from 'lucide-react';

interface UserStats {
  totalXP: number;
  currentLevel: number;
  streak: number;
  totalCalls: number;
  averageScore: number;
  achievementsCount: number;
  rank: number;
  joinedDate: Date;
  lastActivity: Date;
  completedActivities: number;
  totalActivities: number;
}

interface ActivityHistory {
  id: number;
  type: 'llamada_virtual' | 'quiz' | 'juego' | 'repaso';
  name: string;
  score: number;
  xpGained: number;
  completedAt: Date;
  duration?: number;
}

interface ProfileViewProps {
  onNavigate?: (section: string) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate }) => {
  const { isLinearTheme } = useTheme();
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'achievements'>('overview');

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Mock data temporal
      const mockStats: UserStats = {
        totalXP: 275,
        currentLevel: 1,
        streak: 3,
        totalCalls: 8,
        averageScore: 82,
        achievementsCount: 2,
        rank: 3,
        joinedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 días atrás
        lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
        completedActivities: 12,
        totalActivities: 20
      };

      const mockHistory: ActivityHistory[] = [
        {
          id: 1,
          type: 'llamada_virtual',
          name: 'Cliente Básico - María González',
          score: 85,
          xpGained: 25,
          completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          duration: 320
        },
        {
          id: 2,
          type: 'quiz',
          name: 'Quiz: Conocimiento de Resorts',
          score: 90,
          xpGained: 15,
          completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        },
        {
          id: 3,
          type: 'juego',
          name: 'Matching de Beneficios',
          score: 75,
          xpGained: 20,
          completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          id: 4,
          type: 'llamada_virtual',
          name: 'Cliente Indeciso - Roberto Mendoza',
          score: 78,
          xpGained: 30,
          completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          duration: 280
        }
      ];
      
      setStats(mockStats);
      setRecentActivity(mockHistory);
    } catch (error) {
      console.error('Error cargando perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'llamada_virtual': return <Phone className="w-4 h-4" />;
      case 'quiz': return <HelpCircle className="w-4 h-4" />;
      case 'juego': return <Gamepad2 className="w-4 h-4" />;
      case 'repaso': return <BookOpen className="w-4 h-4" />;
      default: return <Edit3 className="w-4 h-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 80) return 'text-yellow-500';
    if (score >= 70) return 'text-orange-500';
    return 'text-red-500';
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Hace menos de 1 hora';
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    if (diffDays === 1) return 'Ayer';
    return `Hace ${diffDays} días`;
  };

  if (loading) {
    return (
      <AcademiaLayout currentSection="profile">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className={`${isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'}`}>
              Cargando perfil...
            </p>
          </div>
        </div>
      </AcademiaLayout>
    );
  }

  if (!stats) return null;

  return (
    <AcademiaLayout currentSection="profile" onNavigate={onNavigate}>
      <div className="space-y-8">
        {/* Header del Perfil */}
        <div className={`p-8 rounded-2xl ${
          isLinearTheme 
            ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
            : 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-700 border border-indigo-200 dark:border-slate-700'
        }`}>
          <div className="flex items-center space-x-6">
            {/* Avatar Grande */}
            <div className="relative">
              <img 
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent((user?.first_name || '') + ' ' + (user?.last_name || ''))}&background=6366f1&color=fff&size=120`}
                alt="Avatar"
                className="w-24 h-24 rounded-2xl object-cover border-4 border-white dark:border-slate-600 shadow-lg"
              />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-800 flex items-center justify-center">
                <span className="text-white text-sm font-bold">{stats.currentLevel}</span>
              </div>
            </div>

            {/* Info Principal */}
            <div className="flex-1">
              <h1 className={`text-3xl font-bold mb-2 ${
                isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
              }`}>
                {(user?.first_name || '') + ' ' + (user?.last_name || '')}
              </h1>
              <p className={`text-lg mb-4 ${
                isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
              }`}>
                Nivel {stats.currentLevel} • #{stats.rank} en el ranking
              </p>
              
              {/* Progreso hacia siguiente nivel */}
              <div className="mb-4">
                <div className={`flex justify-between text-sm mb-2 ${
                  isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
                }`}>
                  <span>Progreso al Nivel {stats.currentLevel + 1}</span>
                  <span>{stats.totalXP % 100}/100 XP</span>
                </div>
                <div className={`w-full h-3 rounded-full ${
                  isLinearTheme ? 'bg-slate-200 dark:bg-slate-700' : 'bg-indigo-200 dark:bg-slate-700'
                }`}>
                  <div 
                    className={`h-3 rounded-full transition-all duration-1000 ${
                      isLinearTheme 
                        ? 'bg-gradient-to-r from-slate-500 to-slate-600'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                    }`}
                    style={{ width: `${(stats.totalXP % 100)}%` }}
                  />
                </div>
              </div>

              {/* Stats Rápidas */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
                  }`}>
                    {stats.totalXP}
                  </div>
                  <div className={`text-xs ${
                    isLinearTheme ? 'text-slate-500 dark:text-slate-400' : 'text-indigo-500 dark:text-indigo-400'
                  }`}>
                    XP Total
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    stats.streak > 7 ? 'text-orange-500' : 'text-yellow-500'
                  }`}>
                    {stats.streak}
                  </div>
                  <div className={`text-xs ${
                    isLinearTheme ? 'text-slate-500 dark:text-slate-400' : 'text-indigo-500 dark:text-indigo-400'
                  }`}>
                    Racha
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
                    {stats.averageScore}%
                  </div>
                  <div className={`text-xs ${
                    isLinearTheme ? 'text-slate-500 dark:text-slate-400' : 'text-indigo-500 dark:text-indigo-400'
                  }`}>
                    Promedio
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
                  }`}>
                    {stats.achievementsCount}
                  </div>
                  <div className={`text-xs ${
                    isLinearTheme ? 'text-slate-500 dark:text-slate-400' : 'text-indigo-500 dark:text-indigo-400'
                  }`}>
                    Logros
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1">
          {[
            { id: 'overview', label: 'Resumen', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'history', label: 'Historial', icon: <FileText className="w-4 h-4" /> },
            { id: 'achievements', label: 'Logros', icon: <Trophy className="w-4 h-4" /> }
          ].map((tab) => (
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
            </button>
          ))}
        </div>

        {/* Contenido de Tabs */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Estadísticas Detalladas */}
            <div className={`p-6 rounded-xl ${
              isLinearTheme ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700' : 'bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700'
            }`}>
              <h3 className={`font-bold text-lg mb-4 ${
                isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
              }`}>
                Estadísticas de Rendimiento
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className={`${isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'}`}>
                    Llamadas Completadas
                  </span>
                  <span className={`font-bold ${isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'}`}>
                    {stats.totalCalls}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className={`${isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'}`}>
                    Puntuación Promedio
                  </span>
                  <span className={`font-bold ${getScoreColor(stats.averageScore)}`}>
                    {stats.averageScore}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className={`${isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'}`}>
                    Actividades Completadas
                  </span>
                  <span className={`font-bold ${isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'}`}>
                    {stats.completedActivities}/{stats.totalActivities}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className={`${isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'}`}>
                    Miembro desde
                  </span>
                  <span className={`font-bold ${isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'}`}>
                    {stats.joinedDate.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Progreso por Tipo de Actividad */}
            <div className={`p-6 rounded-xl ${
              isLinearTheme ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700' : 'bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700'
            }`}>
              <h3 className={`font-bold text-lg mb-4 ${
                isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
              }`}>
                Progreso por Actividad
              </h3>
              
              <div className="space-y-3">
                {[
                  { type: 'llamada_virtual', label: 'Llamadas Virtuales', completed: 4, total: 8, color: 'blue' },
                  { type: 'quiz', label: 'Quiz', completed: 3, total: 6, color: 'emerald' },
                  { type: 'juego', label: 'Juegos', completed: 2, total: 4, color: 'purple' },
                  { type: 'repaso', label: 'Repaso', completed: 2, total: 4, color: 'orange' }
                ].map((item) => (
                  <div key={item.type}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center space-x-2">
                        <span>{getActivityIcon(item.type)}</span>
                        <span className={`text-sm ${isLinearTheme ? 'text-slate-700 dark:text-slate-300' : 'text-indigo-700 dark:text-indigo-300'}`}>
                          {item.label}
                        </span>
                      </div>
                      <span className={`text-sm font-bold ${isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'}`}>
                        {item.completed}/{item.total}
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full ${
                      isLinearTheme ? 'bg-slate-200 dark:bg-slate-700' : 'bg-indigo-200 dark:bg-slate-700'
                    }`}>
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          item.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                          item.color === 'emerald' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                          item.color === 'purple' ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                          'bg-gradient-to-r from-orange-500 to-orange-600'
                        }`}
                        style={{ width: `${(item.completed / item.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className={`text-xl font-bold ${
              isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
            }`}>
              Actividad Reciente
            </h3>
            
            {recentActivity.map((activity, index) => (
              <div 
                key={activity.id}
                style={{ animationDelay: `${index * 0.1}s` }}
                className={`animate-slide-up opacity-0 p-4 rounded-xl border transition-all duration-200 hover:shadow-lg ${
                  isLinearTheme
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    : 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isLinearTheme ? 'bg-slate-100 dark:bg-slate-700' : 'bg-indigo-100 dark:bg-slate-700'
                    }`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div>
                      <h4 className={`font-semibold ${
                        isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
                      }`}>
                        {activity.name}
                      </h4>
                      <p className={`text-sm ${
                        isLinearTheme ? 'text-slate-500 dark:text-slate-400' : 'text-indigo-500 dark:text-indigo-400'
                      }`}>
                        {getRelativeTime(activity.completedAt)}
                        {activity.duration && ` • ${formatDuration(activity.duration)}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-bold ${getScoreColor(activity.score)}`}>
                      {activity.score}%
                    </div>
                    <div className={`text-sm ${
                      isLinearTheme ? 'text-slate-500 dark:text-slate-400' : 'text-indigo-500 dark:text-indigo-400'
                    }`}>
                      +{activity.xpGained} XP
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="text-center py-20">
            <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center ${
              isLinearTheme ? 'bg-slate-100 dark:bg-slate-700' : 'bg-indigo-100 dark:bg-slate-700'
            }`}>
              <span className="text-3xl">🏆</span>
            </div>
            <h3 className={`text-xl font-bold mb-2 ${
              isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
            }`}>
              Vista de Logros
            </h3>
            <p className={`${
              isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
            }`}>
              Ve a la sección "Logros" para ver todos tus badges y achievements
            </p>
          </div>
        )}
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

export default ProfileView;
