import React, { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { 
  Target, 
  BookOpen, 
  Trophy, 
  Crown, 
  User, 
  Flame, 
  Star, 
  GraduationCap,
  Rocket,
  Zap
} from 'lucide-react';

interface AcademiaLayoutProps {
  children: React.ReactNode;
  currentSection?: string;
  onNavigate?: (section: string) => void;
}

const AcademiaLayout: React.FC<AcademiaLayoutProps> = ({ children, currentSection = 'dashboard', onNavigate }) => {
  const { isLinearTheme } = useTheme();
  const [userProgress] = useState({
    level: 1,
    xp: 75,
    streak: 3,
    totalXP: 275
  });

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Target className="w-4 h-4" />, path: '/academia' },
    { id: 'levels', label: 'Niveles', icon: <BookOpen className="w-4 h-4" />, path: '/academia/niveles' },
    { id: 'achievements', label: 'Logros', icon: <Trophy className="w-4 h-4" />, path: '/academia/logros' },
    { id: 'leaderboard', label: 'Ranking', icon: <Crown className="w-4 h-4" />, path: '/academia/ranking' },
    { id: 'profile', label: 'Mi Perfil', icon: <User className="w-4 h-4" />, path: '/academia/perfil' }
  ];

  const baseClasses = isLinearTheme 
    ? "min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800"
    : "min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900";

  return (
    <div className={`${baseClasses} transition-all duration-300`}>
      {/* Header con Progreso del Usuario */}
      <header className={`sticky top-0 z-40 backdrop-blur-lg border-b ${
        isLinearTheme 
          ? 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700'
          : 'bg-white/90 dark:bg-slate-900/90 border-indigo-200 dark:border-slate-700'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo y Título */}
            <div className="flex items-center space-x-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isLinearTheme 
                  ? 'bg-slate-100 dark:bg-slate-800'
                  : 'bg-gradient-to-br from-indigo-500 to-purple-600'
              }`}>
                <GraduationCap className={`w-6 h-6 ${isLinearTheme ? 'text-slate-700 dark:text-slate-300' : 'text-white'}`} />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${
                  isLinearTheme 
                    ? 'text-slate-900 dark:text-white'
                    : 'text-indigo-900 dark:text-white'
                }`}>
                  Academia de Ventas
                </h1>
                <p className={`text-sm ${
                  isLinearTheme 
                    ? 'text-slate-500 dark:text-slate-400'
                    : 'text-indigo-600 dark:text-indigo-300'
                }`}>
                  Nivel {userProgress.level} • {userProgress.xp} XP hasta el siguiente nivel
                </p>
              </div>
            </div>

            {/* Progreso y Estadísticas */}
            <div className="flex items-center space-x-6">
              {/* Racha */}
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  userProgress.streak > 3 ? 'animate-streak-fire' : ''
                } ${
                  isLinearTheme 
                    ? 'bg-orange-100 dark:bg-orange-900/20'
                    : 'bg-gradient-to-br from-orange-400 to-red-500'
                }`}>
                  <Flame className={`w-4 h-4 ${
                    isLinearTheme 
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-white'
                  }`} />
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${
                    isLinearTheme 
                      ? 'text-slate-900 dark:text-white'
                      : 'text-indigo-900 dark:text-white'
                  }`}>
                    {userProgress.streak}
                  </div>
                  <div className={`text-xs ${
                    isLinearTheme 
                      ? 'text-slate-500 dark:text-slate-400'
                      : 'text-indigo-600 dark:text-indigo-300'
                  }`}>
                    días
                  </div>
                </div>
              </div>

              {/* XP Total */}
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isLinearTheme 
                    ? 'bg-emerald-100 dark:bg-emerald-900/20'
                    : 'bg-gradient-to-br from-emerald-400 to-green-500'
                }`}>
                  <Star className={`w-4 h-4 ${
                    isLinearTheme 
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-white'
                  }`} />
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${
                    isLinearTheme 
                      ? 'text-slate-900 dark:text-white'
                      : 'text-indigo-900 dark:text-white'
                  }`}>
                    {userProgress.totalXP}
                  </div>
                  <div className={`text-xs ${
                    isLinearTheme 
                      ? 'text-slate-500 dark:text-slate-400'
                      : 'text-indigo-600 dark:text-indigo-300'
                  }`}>
                    XP total
                  </div>
                </div>
              </div>

              {/* Barra de Progreso */}
              <div className="w-32">
                <div className={`flex justify-between text-xs mb-1 ${
                  isLinearTheme 
                    ? 'text-slate-600 dark:text-slate-400'
                    : 'text-indigo-600 dark:text-indigo-300'
                }`}>
                  <span>Nivel {userProgress.level}</span>
                  <span>{userProgress.xp}/100</span>
                </div>
                <div className={`w-full h-2 rounded-full ${
                  isLinearTheme 
                    ? 'bg-slate-200 dark:bg-slate-700'
                    : 'bg-indigo-200 dark:bg-slate-700'
                }`}>
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      userProgress.xp > 75 ? 'animate-progress-pulse' : ''
                    } ${
                      isLinearTheme 
                        ? 'bg-gradient-to-r from-slate-500 to-slate-600'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                    }`}
                    style={{ width: `${userProgress.xp}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navegación de Pestañas */}
      <nav className={`border-b ${
        isLinearTheme 
          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
          : 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-slate-700'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate?.(item.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  currentSection === item.id
                    ? isLinearTheme
                      ? 'border-slate-500 text-slate-900 dark:text-white dark:border-slate-400'
                      : 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : isLinearTheme
                      ? 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                      : 'border-transparent text-indigo-400 hover:text-indigo-600 hover:border-indigo-300 dark:text-indigo-300 dark:hover:text-indigo-200'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>

      {/* Floating Action Button para Continuar Aprendiendo */}
      <div className="fixed bottom-6 right-6">
        <button className={`w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
          isLinearTheme 
            ? 'bg-slate-600 hover:bg-slate-700 text-white'
            : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'
        }`}>
          <Rocket className="w-6 h-6" />
        </button>
      </div>

      {/* Estilos CSS personalizados */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AcademiaLayout;
