import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { tokenService, type TokenLimits } from '../../services/tokenService';
import { supabaseAdmin } from '../../config/supabase';

interface User {
  id: string;
  email: string;
  full_name: string;
  department: string;
  role_name: string;
  is_active: boolean;
}

interface UserTokenConfig extends TokenLimits {
  email: string;
  full_name: string;
  department: string;
  role_name: string;
}

const TokenManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [tokenConfigs, setTokenConfigs] = useState<UserTokenConfig[]>([]);
  const [filteredConfigs, setFilteredConfigs] = useState<UserTokenConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showAllUsers, setShowAllUsers] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Efecto para filtrar usuarios
  useEffect(() => {
    let filtered = tokenConfigs;

    // Aplicar filtro de búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(config => 
        config.full_name.toLowerCase().includes(query) ||
        config.email.toLowerCase().includes(query) ||
        config.department?.toLowerCase().includes(query)
      );
    }

    // Mostrar solo últimos 3 si no hay búsqueda y no se forzó mostrar todos
    if (!searchQuery.trim() && !showAllUsers) {
      filtered = filtered.slice(0, 3);
    }

    setFilteredConfigs(filtered);
  }, [tokenConfigs, searchQuery, showAllUsers]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar usuarios productores (ordenados por fecha de creación, más recientes primero)
      const { data: usersData, error: usersError } = await supabaseAdmin
        .from('auth_users')
        .select(`
          id,
          email,
          full_name,
          department,
          is_active,
          role_id,
          created_at,
          auth_roles!inner(name)
        `)
        .eq('auth_roles.name', 'productor')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      const productorUsers = usersData?.map(user => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name || user.email,
        department: user.department || 'Sin departamento',
        role_name: user.auth_roles?.name || 'productor',
        is_active: user.is_active
      })) || [];

      setUsers(productorUsers);

      // Cargar configuraciones de tokens existentes
      const { data: tokensData, error: tokensError } = await supabaseAdmin
        .from('ai_token_limits')
        .select('*');

      if (tokensError) throw tokensError;

      // Combinar datos de usuarios con configuraciones de tokens
      const combinedData = productorUsers.map(user => {
        const tokenConfig = tokensData?.find(t => t.user_id === user.id);
        return {
          ...user,
          user_id: user.id,
          monthly_limit: tokenConfig?.monthly_limit || 10000,
          daily_limit: tokenConfig?.daily_limit || 500,
          current_month_usage: tokenConfig?.current_month_usage || 0,
          current_day_usage: tokenConfig?.current_day_usage || 0,
          monthly_usage_percentage: tokenConfig && tokenConfig.monthly_limit > 0 ? (tokenConfig.current_month_usage / tokenConfig.monthly_limit) * 100 : 0,
          daily_usage_percentage: tokenConfig && tokenConfig.daily_limit > 0 ? (tokenConfig.current_day_usage / tokenConfig.daily_limit) * 100 : 0,
          warning_threshold: (tokenConfig?.warning_threshold || 0.8) * 100
        };
      });

      setTokenConfigs(combinedData);
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const updateTokenLimits = async (userId: string, monthlyLimit: number, dailyLimit: number) => {
    try {
      setSaving(userId);
      
      // Convertir 0 a -1 para ilimitado
      const finalMonthlyLimit = monthlyLimit === 0 ? -1 : monthlyLimit;
      const finalDailyLimit = dailyLimit === 0 ? -1 : dailyLimit;

      console.log('💾 Actualizando límites para usuario:', { userId, monthlyLimit: finalMonthlyLimit, dailyLimit: finalDailyLimit });

      // Verificar si el registro ya existe
      const { data: existingRecord, error: checkError } = await supabaseAdmin
        .from('ai_token_limits')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingRecord) {
        // Actualizar registro existente
        const { error } = await supabaseAdmin
          .from('ai_token_limits')
          .update({
            monthly_limit: finalMonthlyLimit,
            daily_limit: finalDailyLimit,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (error) throw error;
        console.log('✅ Registro existente actualizado');
      } else {
        // Crear nuevo registro
        const tokenData = {
          user_id: userId,
          monthly_limit: finalMonthlyLimit,
          daily_limit: finalDailyLimit,
          current_month_usage: 0,
          current_day_usage: 0,
          current_month: new Date().toISOString().slice(0, 10),
          current_day: new Date().toISOString().slice(0, 10),
          auto_reset_monthly: true,
          auto_reset_daily: true,
          notifications_enabled: true,
          warning_threshold: 0.8,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error } = await supabaseAdmin
          .from('ai_token_limits')
          .insert([tokenData]);

        if (error) throw error;
        console.log('✅ Nuevo registro creado');
      }

      console.log('✅ Límites de tokens actualizados exitosamente');
      
      // Recargar datos
      await loadData();
    } catch (error) {
      console.error('❌ Error actualizando límites:', error);
      setError(error instanceof Error ? error.message : 'Error actualizando límites');
    } finally {
      setSaving(null);
    }
  };

  const resetTokenUsage = async (userId: string) => {
    try {
      setSaving(userId);
      
      const { error } = await supabaseAdmin
        .from('ai_token_limits')
        .update({
          current_month_usage: 0,
          current_day_usage: 0,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      console.log('✅ Uso de tokens reiniciado para usuario:', userId);
      await loadData();
    } catch (error) {
      console.error('❌ Error reiniciando tokens:', error);
      setError(error instanceof Error ? error.message : 'Error reiniciando tokens');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-600 dark:text-slate-400">Cargando configuración de tokens...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </div>
        <button
          onClick={loadData}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Gestión de Tokens AI Models
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Configura límites de tokens para usuarios productores
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Buscador */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, email o departamento..."
              className="pl-10 pr-4 py-2 w-80 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
            />
          </div>
          
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Información de costos */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💰 Costos Reales de ElevenLabs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className="text-blue-800 dark:text-blue-200">
              <strong>TTS:</strong> 1 token/carácter
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-blue-800 dark:text-blue-200">
              <strong>STS:</strong> 25 tokens/conversión
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className="text-blue-800 dark:text-blue-200">
              <strong>Efectos:</strong> 100 tokens/efecto
            </span>
          </div>
        </div>
      </div>

      {/* Información de usuarios y controles */}
      {tokenConfigs.length > 0 && (
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {searchQuery.trim() ? (
                <>Mostrando {filteredConfigs.length} de {tokenConfigs.length} usuarios</>
              ) : (
                <>Mostrando {Math.min(3, tokenConfigs.length)} de {tokenConfigs.length} usuarios más recientes</>
              )}
            </span>
            {selectedUserId && (
              <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                Usuario seleccionado para presets
              </span>
            )}
          </div>
          
          {!searchQuery.trim() && tokenConfigs.length > 3 && (
            <button
              onClick={() => setShowAllUsers(!showAllUsers)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
            >
              {showAllUsers ? 'Mostrar solo últimos 3' : `Ver todos (${tokenConfigs.length})`}
            </button>
          )}
        </div>
      )}

      {/* Lista de usuarios productores */}
      {filteredConfigs.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <p className="text-slate-500 dark:text-slate-400">
            {searchQuery.trim() ? 'No se encontraron usuarios con ese criterio' : 'No hay usuarios productores registrados'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredConfigs.map((userConfig) => (
            <div key={userConfig.user_id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              {/* Header del usuario */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {/* Checkbox de selección */}
                  <input
                    type="checkbox"
                    checked={selectedUserId === userConfig.user_id}
                    onChange={(e) => setSelectedUserId(e.target.checked ? userConfig.user_id : null)}
                    className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                  />
                  
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {userConfig.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {userConfig.full_name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {userConfig.email} • {userConfig.role_name}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {userConfig.department}
                    </p>
                  </div>
                </div>
                
                {/* Indicador de uso */}
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    Uso Mensual: {userConfig.monthly_limit === -1 
                      ? `${userConfig.current_month_usage.toLocaleString()}/∞`
                      : `${userConfig.current_month_usage.toLocaleString()}/${userConfig.monthly_limit.toLocaleString()}`
                    }
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Diario: {userConfig.daily_limit === -1 
                      ? `${userConfig.current_day_usage.toLocaleString()}/∞`
                      : `${userConfig.current_day_usage.toLocaleString()}/${userConfig.daily_limit.toLocaleString()}`
                    }
                  </div>
                </div>
              </div>

              {/* Configuración de límites */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Límite mensual */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Límite Mensual
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="999999"
                      value={userConfig.monthly_limit === -1 ? 0 : userConfig.monthly_limit}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setTokenConfigs(prev => prev.map(config => 
                          config.user_id === userConfig.user_id 
                            ? { ...config, monthly_limit: value === 0 ? -1 : value }
                            : config
                        ));
                      }}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                      placeholder="0 = ilimitado"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-slate-400 text-sm">tokens</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    0 = ilimitado, máximo 999,999 tokens
                  </p>
                </div>

                {/* Límite diario */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Límite Diario
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="50000"
                      value={userConfig.daily_limit === -1 ? 0 : userConfig.daily_limit}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setTokenConfigs(prev => prev.map(config => 
                          config.user_id === userConfig.user_id 
                            ? { ...config, daily_limit: value === 0 ? -1 : value }
                            : config
                        ));
                      }}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                      placeholder="0 = ilimitado"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-slate-400 text-sm">tokens</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    0 = ilimitado, máximo 50,000 tokens
                  </p>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => resetTokenUsage(userConfig.user_id)}
                  disabled={saving === userConfig.user_id}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Reiniciar Uso</span>
                </button>

                <button
                  onClick={() => updateTokenLimits(
                    userConfig.user_id,
                    userConfig.monthly_limit === -1 ? 0 : userConfig.monthly_limit,
                    userConfig.daily_limit === -1 ? 0 : userConfig.daily_limit
                  )}
                  disabled={saving === userConfig.user_id}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {saving === userConfig.user_id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Guardar Límites</span>
                    </>
                  )}
                </button>
              </div>

              {/* Barra de progreso visual */}
              {userConfig.monthly_limit > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span>Uso mensual</span>
                    <span>{userConfig.monthly_usage_percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        userConfig.monthly_usage_percentage > 90 ? 'bg-red-500' :
                        userConfig.monthly_usage_percentage > 80 ? 'bg-orange-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(userConfig.monthly_usage_percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Presets rápidos */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            ⚡ Presets Rápidos
          </h3>
          {!selectedUserId && (
            <div className="text-sm text-orange-600 dark:text-orange-400 flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>Selecciona un usuario</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => {
              if (!selectedUserId) {
                alert('⚠️ Selecciona un usuario primero');
                return;
              }
              // Aplicar preset básico solo al usuario seleccionado
              setTokenConfigs(prev => prev.map(config => 
                config.user_id === selectedUserId
                  ? { ...config, monthly_limit: 5000, daily_limit: 200 }
                  : config
              ));
            }}
            disabled={!selectedUserId}
            className="p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <div className="font-medium">Básico</div>
            <div className="text-sm">5K/mes • 200/día</div>
          </button>
          
          <button
            onClick={() => {
              if (!selectedUserId) {
                alert('⚠️ Selecciona un usuario primero');
                return;
              }
              setTokenConfigs(prev => prev.map(config => 
                config.user_id === selectedUserId
                  ? { ...config, monthly_limit: 15000, daily_limit: 750 }
                  : config
              ));
            }}
            disabled={!selectedUserId}
            className="p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <div className="font-medium">Profesional</div>
            <div className="text-sm">15K/mes • 750/día</div>
          </button>
          
          <button
            onClick={() => {
              if (!selectedUserId) {
                alert('⚠️ Selecciona un usuario primero');
                return;
              }
              setTokenConfigs(prev => prev.map(config => 
                config.user_id === selectedUserId
                  ? { ...config, monthly_limit: 50000, daily_limit: 2000 }
                  : config
              ));
            }}
            disabled={!selectedUserId}
            className="p-4 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <div className="font-medium">Premium</div>
            <div className="text-sm">50K/mes • 2K/día</div>
          </button>
          
          <button
            onClick={() => {
              if (!selectedUserId) {
                alert('⚠️ Selecciona un usuario primero');
                return;
              }
              setTokenConfigs(prev => prev.map(config => 
                config.user_id === selectedUserId
                  ? { ...config, monthly_limit: -1, daily_limit: -1 }
                  : config
              ));
            }}
            disabled={!selectedUserId}
            className="p-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <div className="font-medium">Ilimitado</div>
            <div className="text-sm">∞/mes • ∞/día</div>
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          {selectedUserId 
            ? 'Los presets se aplicarán solo al usuario seleccionado. Recuerda guardar después de aplicar.'
            : 'Selecciona un usuario con el checkbox para aplicar presets.'
          }
        </p>
      </div>
    </div>
  );
};

export default TokenManagement;
