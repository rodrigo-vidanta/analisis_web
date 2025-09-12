import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import AcademiaLayout from './AcademiaLayout';
import { academiaService, Achievement, UserAchievement } from '../../services/academia';

const AchievementsView: React.FC = () => {
  const { isLinearTheme } = useTheme();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const [allAchievements, userAchievementsData] = await Promise.all([
        academiaService.getAchievements(),
        academiaService.getUserAchievements('current-user@example.com') // Obtener del contexto de auth
      ]);
      setAchievements(allAchievements);
      setUserAchievements(userAchievementsData);
    } catch (error) {
      console.error('Error cargando logros:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAchievementUnlocked = (achievementId: number): boolean => {
    return userAchievements.some(ua => ua.logro_id === achievementId);
  };

  const getAchievementDate = (achievementId: number): Date | undefined => {
    const userAchievement = userAchievements.find(ua => ua.logro_id === achievementId);
    return userAchievement ? new Date(userAchievement.obtenido_at) : undefined;
  };

  const getBadgeColor = (color: string, isUnlocked: boolean) => {
    if (!isUnlocked) {
      return isLinearTheme 
        ? 'from-slate-300 to-slate-400 text-slate-500'
        : 'from-slate-300 to-slate-400 text-slate-500';
    }

    const colors = {
      bronze: 'from-amber-600 to-orange-700 text-white',
      silver: 'from-slate-400 to-slate-600 text-white',
      gold: 'from-yellow-400 to-yellow-600 text-white',
      diamond: 'from-cyan-400 to-blue-600 text-white',
      platinum: 'from-purple-400 to-indigo-600 text-white',
      emerald: 'from-emerald-400 to-green-600 text-white',
      ruby: 'from-red-400 to-pink-600 text-white',
      orange: 'from-orange-400 to-red-500 text-white'
    };
    return colors[color as keyof typeof colors] || colors.bronze;
  };

  const getConditionText = (achievement: Achievement): string => {
    switch (achievement.condicion_tipo) {
      case 'xp_total':
        return `Alcanzar ${achievement.condicion_valor} XP total`;
      case 'racha_dias':
        return `Mantener racha de ${achievement.condicion_valor} días`;
      case 'nivel_completado':
        return `Completar el nivel ${achievement.condicion_valor}`;
      case 'actividades_seguidas':
        return `Completar ${achievement.condicion_valor} actividades seguidas`;
      case 'puntuacion_alta':
        return `Obtener ${achievement.condicion_valor}+ puntos en una actividad`;
      default:
        return 'Condición especial';
    }
  };

  const filteredAchievements = achievements.filter(achievement => {
    const isUnlocked = isAchievementUnlocked(achievement.id);
    
    // Filtro por estado
    if (filter === 'unlocked' && !isUnlocked) return false;
    if (filter === 'locked' && isUnlocked) return false;
    
    // Filtro por categoría (basado en condicion_tipo)
    if (selectedCategory !== 'all' && achievement.condicion_tipo !== selectedCategory) return false;
    
    return true;
  });

  const categories = [
    { id: 'all', label: 'Todos', icon: '🏆' },
    { id: 'xp_total', label: 'XP Total', icon: '⭐' },
    { id: 'racha_dias', label: 'Racha', icon: '🔥' },
    { id: 'nivel_completado', label: 'Niveles', icon: '📚' },
    { id: 'actividades_seguidas', label: 'Actividades', icon: '🎯' },
    { id: 'puntuacion_alta', label: 'Excelencia', icon: '💎' }
  ];

  const AchievementCard: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
    const isUnlocked = isAchievementUnlocked(achievement.id);
    const unlockedDate = getAchievementDate(achievement.id);

    return (
      <div className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-105 ${
        isUnlocked ? 'hover:shadow-2xl' : 'opacity-75'
      }`}>
        <div className={`p-6 h-full ${
          isLinearTheme
            ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
            : 'bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700'
        }`}>
          {/* Badge Icon */}
          <div className="flex items-center justify-center mb-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br ${getBadgeColor(achievement.color_badge, isUnlocked)} shadow-lg transform transition-transform duration-300 ${
              isUnlocked ? 'group-hover:scale-110 group-hover:rotate-3' : ''
            }`}>
              <span className="text-2xl">
                {achievement.icono_url || '🏆'}
              </span>
            </div>
          </div>

          {/* Achievement Info */}
          <div className="text-center mb-4">
            <h3 className={`font-bold text-lg mb-2 ${
              isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
            }`}>
              {achievement.nombre}
            </h3>
            <p className={`text-sm mb-3 ${
              isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
            }`}>
              {achievement.descripcion}
            </p>
            <p className={`text-xs ${
              isLinearTheme ? 'text-slate-500 dark:text-slate-500' : 'text-indigo-500 dark:text-indigo-400'
            }`}>
              {getConditionText(achievement)}
            </p>
          </div>

          {/* Status and Reward */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {achievement.xp_bonus > 0 && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isLinearTheme 
                    ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300'
                }`}>
                  +{achievement.xp_bonus} XP
                </span>
              )}
              {achievement.es_secreto && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isLinearTheme 
                    ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300'
                    : 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300'
                }`}>
                  🔒 Secreto
                </span>
              )}
            </div>

            <div className="text-right">
              {isUnlocked ? (
                <div>
                  <div className="text-emerald-500 font-semibold text-sm">
                    ✓ Desbloqueado
                  </div>
                  {unlockedDate && (
                    <div className={`text-xs ${
                      isLinearTheme ? 'text-slate-500 dark:text-slate-500' : 'text-indigo-500 dark:text-indigo-400'
                    }`}>
                      {unlockedDate.toLocaleDateString()}
                    </div>
                  )}
                </div>
              ) : (
                <div className={`text-sm font-semibold ${
                  isLinearTheme ? 'text-slate-400 dark:text-slate-500' : 'text-indigo-400 dark:text-indigo-500'
                }`}>
                  🔒 Bloqueado
                </div>
              )}
            </div>
          </div>

          {/* Unlock Animation */}
          {isUnlocked && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center text-white text-xs animate-bounce">
                ✓
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -skew-x-12" />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <AcademiaLayout currentSection="achievements">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className={`${isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'}`}>
              Cargando logros...
            </p>
          </div>
        </div>
      </AcademiaLayout>
    );
  }

  const unlockedCount = userAchievements.length;
  const totalCount = achievements.length;
  const completionPercentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <AcademiaLayout currentSection="achievements">
      <div className="space-y-8">
        {/* Header con Estadísticas */}
        <div className="text-center">
          <h2 className={`text-3xl font-bold mb-4 ${
            isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
          }`}>
            Mis Logros 🏆
          </h2>
          
          <div className="flex items-center justify-center space-x-8 mb-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${
                completionPercentage >= 75 ? 'text-emerald-500' :
                completionPercentage >= 50 ? 'text-yellow-500' :
                completionPercentage >= 25 ? 'text-orange-500' : 'text-red-500'
              }`}>
                {unlockedCount}
              </div>
              <div className={`text-sm ${
                isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
              }`}>
                Desbloqueados
              </div>
            </div>
            
            <div className="text-center">
              <div className={`text-3xl font-bold ${
                isLinearTheme ? 'text-slate-700 dark:text-slate-300' : 'text-indigo-700 dark:text-indigo-300'
              }`}>
                {totalCount}
              </div>
              <div className={`text-sm ${
                isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
              }`}>
                Total
              </div>
            </div>
            
            <div className="text-center">
              <div className={`text-3xl font-bold ${
                completionPercentage >= 75 ? 'text-emerald-500' :
                completionPercentage >= 50 ? 'text-yellow-500' :
                completionPercentage >= 25 ? 'text-orange-500' : 'text-red-500'
              }`}>
                {completionPercentage}%
              </div>
              <div className={`text-sm ${
                isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
              }`}>
                Completado
              </div>
            </div>
          </div>

          {/* Barra de Progreso */}
          <div className={`w-full max-w-md mx-auto h-3 rounded-full ${
            isLinearTheme ? 'bg-slate-200 dark:bg-slate-700' : 'bg-indigo-200 dark:bg-slate-700'
          }`}>
            <div 
              className={`h-3 rounded-full transition-all duration-1000 ${
                completionPercentage >= 75 ? 'bg-gradient-to-r from-emerald-500 to-green-600' :
                completionPercentage >= 50 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                completionPercentage >= 25 ? 'bg-gradient-to-r from-orange-400 to-red-500' :
                'bg-gradient-to-r from-red-400 to-pink-500'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          {/* Filtros por Estado */}
          <div className="flex space-x-2">
            {[
              { id: 'all', label: 'Todos', count: totalCount },
              { id: 'unlocked', label: 'Desbloqueados', count: unlockedCount },
              { id: 'locked', label: 'Bloqueados', count: totalCount - unlockedCount }
            ].map((filterOption) => (
              <button
                key={filterOption.id}
                onClick={() => setFilter(filterOption.id as any)}
                className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                  filter === filterOption.id
                    ? isLinearTheme
                      ? 'bg-slate-600 text-white'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                    : isLinearTheme
                      ? 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                      : 'text-indigo-600 hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-900/20'
                }`}
              >
                {filterOption.label} ({filterOption.count})
              </button>
            ))}
          </div>

          {/* Filtros por Categoría */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedCategory === category.id
                    ? isLinearTheme
                      ? 'bg-slate-500 text-white'
                      : 'bg-indigo-500 text-white'
                    : isLinearTheme
                      ? 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                      : 'text-indigo-500 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-900/20'
                }`}
              >
                <span className="mr-1">{category.icon}</span>
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Logros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAchievements.map((achievement, index) => (
            <div 
              key={achievement.id}
              style={{ animationDelay: `${index * 0.1}s` }}
              className="animate-slide-up opacity-0"
            >
              <AchievementCard achievement={achievement} />
            </div>
          ))}
        </div>

        {filteredAchievements.length === 0 && (
          <div className="text-center py-20">
            <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center ${
              isLinearTheme 
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                : 'bg-indigo-100 dark:bg-slate-700 text-indigo-400'
            }`}>
              🔍
            </div>
            <h3 className={`text-xl font-bold mb-2 ${
              isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
            }`}>
              No se encontraron logros
            </h3>
            <p className={`${
              isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
            }`}>
              Prueba con otros filtros o sigue completando actividades para desbloquear más logros.
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

export default AchievementsView;
