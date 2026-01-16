/**
 * ============================================
 * GESTIÓN DE TOKENS API - MÓDULO PQNC HUMANS
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

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Coins,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  RotateCcw,
  Infinity,
  AlertCircle,
  User,
  Mic,
  MessageSquare,
  Music
} from 'lucide-react';
import { type TokenLimits } from '../../services/tokenService';
import { supabaseAdmin } from '../../config/supabase';

interface UserTokenConfig extends TokenLimits {
  email: string;
  full_name: string;
  department: string;
  role_name: string;
}

const TokenManagement: React.FC = () => {
  const [tokenConfigs, setTokenConfigs] = useState<UserTokenConfig[]>([]);
  const [filteredConfigs, setFilteredConfigs] = useState<UserTokenConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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
          auth_roles(name)
        `)
        .eq('auth_roles.name', 'productor')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      const productorUsers = usersData?.map(user => {
        // auth_roles viene como objeto por el inner join
        const authRoles = user.auth_roles as unknown as { name: string } | null;
        return {
          id: user.id,
          email: user.email,
          full_name: user.full_name || user.email,
          department: user.department || 'Sin departamento',
          role_name: authRoles?.name || 'productor',
          is_active: user.is_active
        };
      }) || [];

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

  // Helper para obtener color del avatar
  const getAvatarColor = (name: string) => {
    const colors = [
      'from-blue-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-purple-500 to-pink-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-red-600',
      'from-cyan-500 to-blue-600'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">Cargando tokens...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
        </div>
        <button
          onClick={loadData}
          className="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header minimalista */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Coins className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Tokens AI
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Límites de uso para productores
              </p>
            </div>
          </div>

          {/* Métricas inline */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">
                Productores: <span className="font-medium text-gray-900 dark:text-white">{tokenConfigs.length}</span>
              </span>
            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={loadData}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info de costos - compacta */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Costos ElevenLabs</span>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Mic className="w-3.5 h-3.5 text-blue-500" />
              <span>TTS: <strong className="text-gray-900 dark:text-white">1/char</strong></span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span>STS: <strong className="text-gray-900 dark:text-white">25/conv</strong></span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Music className="w-3.5 h-3.5 text-purple-500" />
              <span>Efectos: <strong className="text-gray-900 dark:text-white">100/efecto</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Buscador y controles */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, email o departamento..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {!searchQuery.trim() && tokenConfigs.length > 3 && (
          <button
            onClick={() => setShowAllUsers(!showAllUsers)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {showAllUsers ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Ver todos ({tokenConfigs.length})
              </>
            )}
          </button>
        )}
      </div>

      {/* Lista de usuarios */}
      {filteredConfigs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 py-12 text-center">
          <User className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {searchQuery.trim() ? 'No se encontraron usuarios' : 'No hay usuarios productores'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {filteredConfigs.map((userConfig, index) => (
              <motion.div
                key={userConfig.user_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-5"
              >
                {/* Header del usuario */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(userConfig.full_name)} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                      {userConfig.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{userConfig.full_name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {userConfig.email} • {userConfig.department}
                      </p>
                    </div>
                  </div>

                  {/* Uso actual */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Mensual:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {userConfig.current_month_usage.toLocaleString()}
                        </span>
                        <span className="text-gray-400">/</span>
                        {userConfig.monthly_limit === -1 ? (
                          <Infinity className="w-4 h-4 text-amber-500" />
                        ) : (
                          <span className="text-gray-500">{userConfig.monthly_limit.toLocaleString()}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <span>Diario:</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {userConfig.current_day_usage.toLocaleString()}
                        </span>
                        <span>/</span>
                        {userConfig.daily_limit === -1 ? (
                          <Infinity className="w-3 h-3 text-amber-500" />
                        ) : (
                          <span>{userConfig.daily_limit.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barra de progreso */}
                {userConfig.monthly_limit > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Uso mensual</span>
                      <span className={`font-medium ${
                        userConfig.monthly_usage_percentage > 90 ? 'text-red-500' :
                        userConfig.monthly_usage_percentage > 80 ? 'text-amber-500' :
                        'text-emerald-500'
                      }`}>{userConfig.monthly_usage_percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(userConfig.monthly_usage_percentage, 100)}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          userConfig.monthly_usage_percentage > 90 ? 'bg-red-500' :
                          userConfig.monthly_usage_percentage > 80 ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Presets compactos */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Preset:</span>
                  <div className="flex gap-1.5">
                    {[
                      { label: 'Básico', monthly: 5000, daily: 200, color: 'emerald' },
                      { label: 'Pro', monthly: 15000, daily: 750, color: 'blue' },
                      { label: 'Premium', monthly: 50000, daily: 2000, color: 'purple' },
                      { label: '∞', monthly: -1, daily: -1, color: 'amber' }
                    ].map((preset) => (
                      <motion.button
                        key={preset.label}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setTokenConfigs(prev => prev.map(config =>
                            config.user_id === userConfig.user_id
                              ? { ...config, monthly_limit: preset.monthly, daily_limit: preset.daily }
                              : config
                          ));
                        }}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                          (userConfig.monthly_limit === preset.monthly && userConfig.daily_limit === preset.daily)
                            ? `bg-${preset.color}-500 text-white`
                            : `bg-${preset.color}-50 dark:bg-${preset.color}-900/20 text-${preset.color}-700 dark:text-${preset.color}-400 hover:bg-${preset.color}-100 dark:hover:bg-${preset.color}-900/30`
                        }`}
                      >
                        {preset.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Inputs de límites */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Límite Mensual</label>
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
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all pr-16"
                        placeholder="0 = ∞"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">tokens</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Límite Diario</label>
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
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all pr-16"
                        placeholder="0 = ∞"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">tokens</span>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/50">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => resetTokenUsage(userConfig.user_id)}
                    disabled={saving === userConfig.user_id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 disabled:opacity-50 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reiniciar Uso
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateTokenLimits(
                      userConfig.user_id,
                      userConfig.monthly_limit === -1 ? 0 : userConfig.monthly_limit,
                      userConfig.daily_limit === -1 ? 0 : userConfig.daily_limit
                    )}
                    disabled={saving === userConfig.user_id}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-700 dark:bg-slate-600 rounded-xl hover:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-50 transition-all"
                  >
                    {saving === userConfig.user_id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Guardar
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenManagement;
