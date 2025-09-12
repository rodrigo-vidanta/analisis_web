import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';
import AcademiaLayout from './AcademiaLayout';
import LevelView from './LevelView';
import AcademiaAdminPanel from './AcademiaAdminPanel';
import AchievementsView from './AchievementsView';
import LeaderboardView from './LeaderboardView';
import ProfileView from './ProfileView';
import { 
  Phone, 
  Settings, 
  Wand2, 
  Building2, 
  Users, 
  TrendingUp,
  Sparkles,
  Zap
} from 'lucide-react';

interface Level {
  id: number;
  number: number;
  name: string;
  description: string;
  xpRequired: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  progress: number; // 0-100
  color: string;
  icon: React.ReactNode;
  activitiesCompleted: number;
  totalActivities: number;
}

interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  isUnlocked: boolean;
  unlockedAt?: Date;
}

const AcademiaDashboard: React.FC = () => {
  const { isLinearTheme } = useTheme();
  const { user } = useAuth();
  const [levels, setLevels] = useState<Level[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [nextActivity] = useState<string>('Llamada Virtual: Cliente Básico');
  const [currentView, setCurrentView] = useState<'dashboard' | 'level' | 'achievements' | 'leaderboard' | 'profile'>('dashboard');
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  useEffect(() => {
    // Datos reales con IDs que coincidan con la base de datos
    setLevels([
      {
        id: 1,
        number: 1,
        name: 'Fundamentos de Vidanta',
        description: 'Aprende los conceptos básicos sobre Vidanta y sus resorts',
        xpRequired: 0,
        isUnlocked: true,
        isCompleted: false,
        progress: 75,
        color: 'blue',
        icon: <Building2 className="w-6 h-6" />,
        activitiesCompleted: 3,
        totalActivities: 4
      },
      {
        id: 2,
        number: 2,
        name: 'Técnicas de Conexión',
        description: 'Domina el arte de conectar emocionalmente con el cliente',
        xpRequired: 100,
        isUnlocked: true,
        isCompleted: false,
        progress: 0,
        color: 'emerald',
        icon: <Users className="w-6 h-6" />,
        activitiesCompleted: 0,
        totalActivities: 5
      },
      {
        id: 3,
        number: 3,
        name: 'Presentación de Beneficios',
        description: 'Aprende a presentar los beneficios de manera persuasiva',
        xpRequired: 250,
        isUnlocked: false,
        isCompleted: false,
        progress: 0,
        color: 'purple',
        icon: <TrendingUp className="w-6 h-6" />,
        activitiesCompleted: 0,
        totalActivities: 6
      }
    ]);

    setRecentAchievements([
      {
        id: 1,
        name: 'Primer Paso',
        description: 'Completaste tu primera actividad',
        icon: <Sparkles className="w-5 h-5" />,
        color: 'bronze',
        isUnlocked: true,
        unlockedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: 2,
        name: 'Racha de Fuego',
        description: 'Mantuviste una racha de 3 días',
        icon: <Zap className="w-5 h-5" />,
        color: 'orange',
        isUnlocked: true,
        unlockedAt: new Date()
      }
    ]);
  }, []);

  const getColorClasses = (color: string) => {
    const colors = {
      blue: isLinearTheme 
        ? 'from-blue-500 to-blue-600 text-white'
        : 'from-blue-400 to-indigo-600 text-white',
      emerald: isLinearTheme 
        ? 'from-emerald-500 to-emerald-600 text-white'
        : 'from-emerald-400 to-green-600 text-white',
      purple: isLinearTheme 
        ? 'from-purple-500 to-purple-600 text-white'
        : 'from-purple-400 to-pink-600 text-white',
      bronze: 'from-amber-600 to-orange-700 text-white',
      orange: 'from-orange-500 to-red-600 text-white'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const handleLevelClick = (levelId: number, isUnlocked: boolean) => {
    if (!isUnlocked) return;
    setSelectedLevelId(levelId);
    setCurrentView('level');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedLevelId(null);
  };

  const handleNavigate = (section: string) => {
    switch (section) {
      case 'dashboard':
        setCurrentView('dashboard');
        break;
      case 'levels':
        setCurrentView('dashboard'); // Los niveles se muestran en el dashboard
        break;
      case 'achievements':
        setCurrentView('achievements');
        break;
      case 'leaderboard':
        setCurrentView('leaderboard');
        break;
      case 'profile':
        setCurrentView('profile');
        break;
    }
  };

  const LevelCard: React.FC<{ level: Level }> = ({ level }) => (
    <div 
      className={`relative group cursor-pointer transform transition-all duration-300 hover:scale-105 gamification-card particle-effect ${
        level.isUnlocked ? 'hover:shadow-2xl animate-float' : 'opacity-60'
      }`}
      onClick={() => handleLevelClick(level.id, level.isUnlocked)}
      style={{ animationDelay: `${level.number * 0.2}s` }}
    >
      <div className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
        level.isUnlocked
          ? isLinearTheme
            ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
            : 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'
          : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
      }`}>
        {/* Header del Nivel */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${getColorClasses(level.color)}`}>
              {level.icon}
            </div>
            <div>
              <h3 className={`font-bold text-lg ${
                isLinearTheme 
                  ? 'text-slate-900 dark:text-white'
                  : 'text-indigo-900 dark:text-white'
              }`}>
                Nivel {level.number}
              </h3>
              <p className={`text-sm ${
                isLinearTheme 
                  ? 'text-slate-500 dark:text-slate-400'
                  : 'text-indigo-600 dark:text-indigo-300'
              }`}>
                {level.xpRequired} XP requerido
              </p>
            </div>
          </div>
          
          {level.isCompleted && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
          )}
        </div>

        {/* Título y Descripción */}
        <h4 className={`font-semibold mb-2 ${
          isLinearTheme 
            ? 'text-slate-800 dark:text-slate-200'
            : 'text-indigo-800 dark:text-indigo-200'
        }`}>
          {level.name}
        </h4>
        <p className={`text-sm mb-4 ${
          isLinearTheme 
            ? 'text-slate-600 dark:text-slate-400'
            : 'text-indigo-600 dark:text-indigo-300'
        }`}>
          {level.description}
        </p>

        {/* Progreso */}
        <div className="mb-4">
          <div className={`flex justify-between text-xs mb-2 ${
            isLinearTheme 
              ? 'text-slate-600 dark:text-slate-400'
              : 'text-indigo-600 dark:text-indigo-300'
          }`}>
            <span>{level.activitiesCompleted}/{level.totalActivities} actividades</span>
            <span>{level.progress}%</span>
          </div>
          <div className={`w-full h-2 rounded-full ${
            isLinearTheme 
              ? 'bg-slate-200 dark:bg-slate-700'
              : 'bg-indigo-200 dark:bg-slate-700'
          }`}>
            <div 
              className={`h-2 rounded-full transition-all duration-500 bg-gradient-to-r ${getColorClasses(level.color)} ${level.progress > 50 ? 'animate-glow' : ''}`}
              style={{ width: `${level.progress}%` }}
            />
          </div>
        </div>

        {/* Botón de Acción */}
        <button 
          disabled={!level.isUnlocked}
          className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
            level.isUnlocked
              ? `bg-gradient-to-r ${getColorClasses(level.color)} hover:shadow-lg transform hover:scale-105 animate-glow`
              : 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'
          }`}
        >
          {level.isCompleted ? '✅ Revisar' : level.progress > 0 ? '🚀 Continuar' : level.isUnlocked ? '🎯 Comenzar' : '🔒 Bloqueado'}
        </button>
      </div>

      {/* Efecto de brillo */}
      {level.isUnlocked && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}
    </div>
  );

  const AchievementBadge: React.FC<{ achievement: Achievement }> = ({ achievement }) => (
    <div className={`p-4 rounded-xl border transition-all duration-300 hover:scale-105 ${
      isLinearTheme 
        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        : 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-slate-700'
    }`}>
      <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${getColorClasses(achievement.color)}`}>
              {achievement.icon}
            </div>
        <div className="flex-1">
          <h4 className={`font-semibold text-sm ${
            isLinearTheme 
              ? 'text-slate-900 dark:text-white'
              : 'text-indigo-900 dark:text-white'
          }`}>
            {achievement.name}
          </h4>
          <p className={`text-xs ${
            isLinearTheme 
              ? 'text-slate-500 dark:text-slate-400'
              : 'text-indigo-600 dark:text-indigo-300'
          }`}>
            {achievement.description}
          </p>
        </div>
      </div>
    </div>
  );

  // Renderizado condicional
  if (currentView === 'level' && selectedLevelId) {
    return (
      <LevelView 
        levelId={selectedLevelId} 
        onBack={handleBackToDashboard} 
      />
    );
  }

  if (currentView === 'achievements') {
    return <AchievementsView onNavigate={handleNavigate} />;
  }

  if (currentView === 'leaderboard') {
    return <LeaderboardView onNavigate={handleNavigate} />;
  }

  if (currentView === 'profile') {
    return <ProfileView onNavigate={handleNavigate} />;
  }

  return (
    <AcademiaLayout currentSection={currentView} onNavigate={handleNavigate}>
      <div className="space-y-8">
        {/* Bienvenida y Estadísticas Rápidas */}
        <div className="text-center">
          <h2 className={`text-3xl font-bold mb-2 ${
            isLinearTheme 
              ? 'text-slate-900 dark:text-white'
              : 'text-indigo-900 dark:text-white'
          }`}>
            ¡Bienvenido de vuelta! 👋
          </h2>
          <p className={`text-lg ${
            isLinearTheme 
              ? 'text-slate-600 dark:text-slate-400'
              : 'text-indigo-600 dark:text-indigo-300'
          }`}>
            Continúa tu camino hacia convertirte en un vendedor excepcional
          </p>
        </div>

        {/* Tarjeta de Próxima Actividad */}
        <div className={`p-6 rounded-2xl border-2 border-dashed transition-all duration-300 hover:border-solid ${
          isLinearTheme 
            ? 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
            : 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-700 border-indigo-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-slate-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isLinearTheme 
                  ? 'bg-slate-200 dark:bg-slate-700'
                  : 'bg-gradient-to-br from-indigo-500 to-purple-600'
              }`}>
                <Phone className={`w-6 h-6 ${isLinearTheme ? 'text-slate-600 dark:text-slate-300' : 'text-white'}`} />
              </div>
              <div>
                <h3 className={`font-bold ${
                  isLinearTheme 
                    ? 'text-slate-900 dark:text-white'
                    : 'text-indigo-900 dark:text-white'
                }`}>
                  Próxima Actividad
                </h3>
                <p className={`text-sm ${
                  isLinearTheme 
                    ? 'text-slate-600 dark:text-slate-400'
                    : 'text-indigo-600 dark:text-indigo-300'
                }`}>
                  {nextActivity}
                </p>
              </div>
            </div>
            <button className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 ${
              isLinearTheme 
                ? 'bg-slate-600 hover:bg-slate-700 text-white'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'
            }`}>
              Continuar
            </button>
          </div>
        </div>

        {/* Grid de Niveles */}
        <div>
          <h3 className={`text-2xl font-bold mb-6 ${
            isLinearTheme 
              ? 'text-slate-900 dark:text-white'
              : 'text-indigo-900 dark:text-white'
          }`}>
            Tu Progreso por Niveles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {levels.map((level, index) => (
              <div 
                key={level.id} 
                style={{ animationDelay: `${index * 0.1}s` }}
                className="animate-slide-up"
              >
                <LevelCard level={level} />
              </div>
            ))}
          </div>
        </div>

        {/* Logros Recientes */}
        <div>
          <h3 className={`text-2xl font-bold mb-6 ${
            isLinearTheme 
              ? 'text-slate-900 dark:text-white'
              : 'text-indigo-900 dark:text-white'
          }`}>
            Logros Recientes 🎉
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentAchievements.map((achievement, index) => (
              <div 
                key={achievement.id}
                style={{ animationDelay: `${index * 0.1}s` }}
                className="animate-bounce-in opacity-0"
              >
                <AchievementBadge achievement={achievement} />
              </div>
            ))}
          </div>
        </div>

        {/* Botón de Admin (solo para administradores) */}
        {user?.role_name === 'admin' && (
          <div className="fixed bottom-20 right-6">
            <button
              onClick={() => setShowAdminPanel(true)}
              className={`w-12 h-12 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
                isLinearTheme 
                  ? 'bg-slate-700 hover:bg-slate-800 text-white'
                  : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white'
              }`}
              title="Panel de Administración"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Panel de Administración */}
      {showAdminPanel && (
        <AcademiaAdminPanel onClose={() => setShowAdminPanel(false)} />
      )}

      {/* Estilos CSS personalizados */}
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-in {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
          opacity: 0;
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </AcademiaLayout>
  );
};

export default AcademiaDashboard;
