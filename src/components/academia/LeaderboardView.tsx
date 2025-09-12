import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import AcademiaLayout from './AcademiaLayout';

interface LeaderboardUser {
  rank: number;
  name: string;
  email: string;
  totalXP: number;
  level: number;
  streak: number;
  avatar?: string;
  isCurrentUser?: boolean;
}

const LeaderboardView: React.FC = () => {
  const { isLinearTheme } = useTheme();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [timeFilter]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      
      // Mock data temporal
      const mockData: LeaderboardUser[] = [
        {
          rank: 1,
          name: 'Ana Martínez',
          email: 'ana.martinez@grupovidanta.com',
          totalXP: 1250,
          level: 5,
          streak: 15,
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150'
        },
        {
          rank: 2,
          name: 'Carlos Rodríguez',
          email: 'carlos.rodriguez@grupovidanta.com',
          totalXP: 980,
          level: 4,
          streak: 8,
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
        },
        {
          rank: 3,
          name: 'Samuel Rosales',
          email: 'samuelrosales@grupovidanta.com',
          totalXP: 275,
          level: 1,
          streak: 3,
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
          isCurrentUser: true
        },
        {
          rank: 4,
          name: 'Laura Vega',
          email: 'laura.vega@grupovidanta.com',
          totalXP: 850,
          level: 3,
          streak: 12,
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'
        },
        {
          rank: 5,
          name: 'Miguel Torres',
          email: 'miguel.torres@grupovidanta.com',
          totalXP: 720,
          level: 3,
          streak: 5,
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
        }
      ];
      
      setLeaderboard(mockData);
    } catch (error) {
      console.error('Error cargando leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-400 to-yellow-600';
      case 2: return 'from-slate-400 to-slate-600';
      case 3: return 'from-amber-600 to-orange-700';
      default: return isLinearTheme ? 'from-slate-500 to-slate-600' : 'from-indigo-500 to-purple-600';
    }
  };

  const LeaderboardCard: React.FC<{ user: LeaderboardUser; index: number }> = ({ user, index }) => (
    <div 
      style={{ animationDelay: `${index * 0.1}s` }}
      className={`animate-slide-up opacity-0 ${user.isCurrentUser ? 'scale-105' : ''}`}
    >
      <div className={`p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
        user.isCurrentUser
          ? isLinearTheme
            ? 'bg-slate-100 dark:bg-slate-700 border-slate-400 dark:border-slate-500 shadow-lg'
            : 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:bg-gradient-to-br dark:from-slate-700 dark:to-slate-600 border-indigo-400 dark:border-slate-500 shadow-lg'
          : isLinearTheme
            ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
            : 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'
      }`}>
        <div className="flex items-center space-x-4">
          {/* Rank */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${getRankColor(user.rank)} text-white font-bold shadow-lg`}>
            {typeof getRankIcon(user.rank) === 'string' && getRankIcon(user.rank).startsWith('#') 
              ? getRankIcon(user.rank)
              : <span className="text-xl">{getRankIcon(user.rank)}</span>
            }
          </div>

          {/* Avatar */}
          <div className="relative">
            <img 
              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff&size=48`}
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-600"
            />
            {user.isCurrentUser && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className={`font-bold ${
                isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
              }`}>
                {user.name}
              </h3>
              {user.isCurrentUser && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isLinearTheme 
                    ? 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300'
                    : 'bg-indigo-200 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-300'
                }`}>
                  Tú
                </span>
              )}
            </div>
            <p className={`text-sm ${
              isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
            }`}>
              Nivel {user.level} • {user.totalXP} XP
            </p>
          </div>

          {/* Stats */}
          <div className="text-right">
            <div className="flex items-center space-x-3">
              <div className="text-center">
                <div className={`text-lg font-bold ${
                  isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
                }`}>
                  {user.totalXP}
                </div>
                <div className={`text-xs ${
                  isLinearTheme ? 'text-slate-500 dark:text-slate-400' : 'text-indigo-500 dark:text-indigo-400'
                }`}>
                  XP
                </div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${
                  user.streak > 7 ? 'text-orange-500' : 
                  user.streak > 3 ? 'text-yellow-500' : 
                  'text-slate-500'
                }`}>
                  {user.streak}
                </div>
                <div className={`text-xs ${
                  isLinearTheme ? 'text-slate-500 dark:text-slate-400' : 'text-indigo-500 dark:text-indigo-400'
                }`}>
                  días
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de progreso hacia siguiente nivel */}
        <div className="mt-4">
          <div className={`w-full h-2 rounded-full ${
            isLinearTheme ? 'bg-slate-200 dark:bg-slate-700' : 'bg-indigo-200 dark:bg-slate-700'
          }`}>
            <div 
              className={`h-2 rounded-full transition-all duration-500 bg-gradient-to-r ${getRankColor(user.rank)}`}
              style={{ width: `${(user.totalXP % 100)}%` }}
            />
          </div>
          <div className={`flex justify-between text-xs mt-1 ${
            isLinearTheme ? 'text-slate-500 dark:text-slate-400' : 'text-indigo-500 dark:text-indigo-400'
          }`}>
            <span>Nivel {user.level}</span>
            <span>{user.totalXP % 100}/100 hasta nivel {user.level + 1}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AcademiaLayout currentSection="leaderboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className={`${isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'}`}>
              Cargando ranking...
            </p>
          </div>
        </div>
      </AcademiaLayout>
    );
  }

  return (
    <AcademiaLayout currentSection="leaderboard">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className={`text-3xl font-bold mb-4 ${
            isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
          }`}>
            🏆 Ranking de Vendedores
          </h2>
          <p className={`text-lg ${
            isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
          }`}>
            Compite con tus compañeros y alcanza la cima
          </p>
        </div>

        {/* Filtros de Tiempo */}
        <div className="flex justify-center space-x-2">
          {[
            { id: 'week', label: 'Esta Semana' },
            { id: 'month', label: 'Este Mes' },
            { id: 'all', label: 'Todo el Tiempo' }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setTimeFilter(filter.id as any)}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                timeFilter === filter.id
                  ? isLinearTheme
                    ? 'bg-slate-600 text-white'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                  : isLinearTheme
                    ? 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                    : 'text-indigo-600 hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-900/20'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Podio para Top 3 */}
        <div className="flex justify-center items-end space-x-4 mb-8">
          {leaderboard.slice(0, 3).map((user, index) => {
            const positions = [1, 0, 2]; // Orden: 2do, 1ro, 3ro
            const actualIndex = positions[index];
            const actualUser = leaderboard[actualIndex];
            if (!actualUser) return null;

            const heights = ['h-24', 'h-32', 'h-20']; // 2do, 1ro, 3ro
            const podiumHeight = heights[index];

            return (
              <div key={actualUser.email} className="text-center">
                {/* Avatar con corona para el primero */}
                <div className="relative mb-2">
                  <img 
                    src={actualUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(actualUser.name)}&background=6366f1&color=fff&size=80`}
                    alt={actualUser.name}
                    className={`w-16 h-16 rounded-full object-cover border-4 mx-auto ${
                      actualUser.rank === 1 ? 'border-yellow-400' :
                      actualUser.rank === 2 ? 'border-slate-400' :
                      'border-amber-600'
                    }`}
                  />
                  {actualUser.rank === 1 && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                      <span className="text-2xl">👑</span>
                    </div>
                  )}
                  {actualUser.isCurrentUser && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>

                {/* Podio */}
                <div className={`${podiumHeight} w-20 rounded-t-xl bg-gradient-to-t ${getRankColor(actualUser.rank)} flex flex-col justify-end items-center pb-2`}>
                  <span className="text-white font-bold text-lg">{getRankIcon(actualUser.rank)}</span>
                </div>

                {/* Info */}
                <div className="mt-2">
                  <h3 className={`font-bold text-sm ${
                    isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
                  }`}>
                    {actualUser.name.split(' ')[0]}
                  </h3>
                  <p className={`text-xs ${
                    isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
                  }`}>
                    {actualUser.totalXP} XP
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Lista Completa */}
        <div className="space-y-4">
          <h3 className={`text-xl font-bold ${
            isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
          }`}>
            Ranking Completo
          </h3>
          
          {leaderboard.map((user, index) => (
            <LeaderboardCard key={user.email} user={user} index={index} />
          ))}
        </div>

        {/* Tu Posición (si no está en top visible) */}
        {!leaderboard.slice(0, 10).some(u => u.isCurrentUser) && (
          <div className={`p-4 rounded-xl border-2 border-dashed ${
            isLinearTheme 
              ? 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
              : 'bg-indigo-50 dark:bg-slate-800 border-indigo-300 dark:border-slate-600'
          }`}>
            <div className="text-center">
              <p className={`text-sm mb-2 ${
                isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
              }`}>
                Tu posición actual
              </p>
              {/* Aquí iría la tarjeta del usuario actual */}
            </div>
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

export default LeaderboardView;
