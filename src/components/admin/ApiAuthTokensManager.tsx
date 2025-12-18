/**
 * ============================================
 * GESTIÓN DE TOKENS DE AUTENTICACIÓN API
 * ============================================
 * 
 * Permite gestionar tokens de autenticación para webhooks y APIs externas
 * Los tokens se muestran encriptados (solo últimos 8 caracteres visibles)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  RefreshCw, 
  Save,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { supabaseAdmin } from '../../config/supabase';
import toast from 'react-hot-toast';

interface ApiToken {
  id: string;
  module_name: string;
  token_key: string;
  token_value: string;
  description: string;
  endpoint_url?: string;
  last_updated: string;
  updated_by?: string;
}

// Configuración de tokens por defecto (se cargarán desde BD si existen)
const DEFAULT_TOKENS: Omit<ApiToken, 'id' | 'last_updated' | 'updated_by'>[] = [
  {
    module_name: 'Programar Llamadas',
    token_key: 'manual_call_auth',
    token_value: 'wFRpkQv4cdmAg976dzEfTDML86vVlGLZmBUIMgftO0rkwhfJHkzVRuQa51W0tXTV',
    description: 'Token de autenticación para el webhook de programar llamadas manuales',
    endpoint_url: 'https://primary-dev-d75a.up.railway.app/webhook/trigger-manual'
  },
  {
    module_name: 'Enviar Mensaje',
    token_key: 'send_message_auth',
    token_value: '2025_livechat_auth',
    description: 'Token para enviar mensajes a través del webhook de UChat',
    endpoint_url: 'https://primary-dev-d75a.up.railway.app/webhook/send-message'
  },
  {
    module_name: 'Pausar Bot',
    token_key: 'pause_bot_auth',
    token_value: '2025_livechat_auth',
    description: 'Token para pausar/reanudar el bot de UChat',
    endpoint_url: 'https://primary-dev-d75a.up.railway.app/webhook/pause-bot'
  },
  {
    module_name: 'Generar URL Media',
    token_key: 'media_url_auth',
    token_value: '93fbcfc4-ccc9-4023-b820-86ef98f10122',
    description: 'Token para generar URLs firmadas de archivos multimedia',
    endpoint_url: 'https://function-bun-dev-6d8e.up.railway.app/generar-url'
  }
];

const ApiAuthTokensManager: React.FC = () => {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [editingToken, setEditingToken] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      setLoading(true);
      
      // Intentar cargar desde BD
      const { data, error } = await supabaseAdmin
        .from('api_auth_tokens')
        .select('*')
        .order('module_name');
      
      if (error) {
        // Si la tabla no existe, usar defaults
        if (error.code === '42P01') {
          console.log('📋 Tabla api_auth_tokens no existe, usando valores por defecto');
          const defaultData = DEFAULT_TOKENS.map((t, i) => ({
            ...t,
            id: `default_${i}`,
            last_updated: new Date().toISOString()
          }));
          setTokens(defaultData);
        } else {
          throw error;
        }
      } else if (data && data.length > 0) {
        setTokens(data);
      } else {
        // Tabla existe pero vacía, usar defaults
        const defaultData = DEFAULT_TOKENS.map((t, i) => ({
          ...t,
          id: `default_${i}`,
          last_updated: new Date().toISOString()
        }));
        setTokens(defaultData);
      }
    } catch (error) {
      console.error('❌ Error cargando tokens:', error);
      toast.error('Error al cargar tokens');
      // Usar defaults en caso de error
      const defaultData = DEFAULT_TOKENS.map((t, i) => ({
        ...t,
        id: `default_${i}`,
        last_updated: new Date().toISOString()
      }));
      setTokens(defaultData);
    } finally {
      setLoading(false);
    }
  };

  const maskToken = (token: string): string => {
    if (token.length <= 8) return '••••••••';
    return '••••••••' + token.slice(-8);
  };

  const toggleTokenVisibility = (tokenId: string) => {
    setVisibleTokens(prev => {
      const next = new Set(prev);
      if (next.has(tokenId)) {
        next.delete(tokenId);
      } else {
        next.add(tokenId);
      }
      return next;
    });
  };

  const copyToken = async (token: string, tokenId: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(tokenId);
      toast.success('Token copiado al portapapeles');
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      toast.error('Error al copiar token');
    }
  };

  const startEditing = (token: ApiToken) => {
    setEditingToken(token.id);
    setEditValue(token.token_value);
  };

  const cancelEditing = () => {
    setEditingToken(null);
    setEditValue('');
  };

  const saveToken = async (tokenId: string) => {
    if (!editValue.trim()) {
      toast.error('El token no puede estar vacío');
      return;
    }

    try {
      setSaving(tokenId);
      
      // Actualizar en estado local primero
      setTokens(prev => prev.map(t => 
        t.id === tokenId 
          ? { ...t, token_value: editValue.trim(), last_updated: new Date().toISOString() }
          : t
      ));

      // Intentar guardar en BD si no es un token por defecto
      if (!tokenId.startsWith('default_')) {
        const { error } = await supabaseAdmin
          .from('api_auth_tokens')
          .update({ 
            token_value: editValue.trim(),
            last_updated: new Date().toISOString()
          })
          .eq('id', tokenId);

        if (error) throw error;
      }

      toast.success('Token actualizado correctamente');
      setEditingToken(null);
      setEditValue('');
    } catch (error) {
      console.error('❌ Error guardando token:', error);
      toast.error('Error al guardar token');
    } finally {
      setSaving(null);
    }
  };

  // Formatear fecha compacta
  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  // Generar hash visual del token (para identificación sin revelar)
  const getTokenFingerprint = (token: string) => {
    const hash = token.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return Math.abs(hash).toString(16).slice(0, 6).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600"></div>
        <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">Cargando tokens...</span>
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
              <Shield className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Tokens de API
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Autenticación para webhooks externos
              </p>
            </div>
          </div>

          {/* Métricas inline */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">{tokens.length}</span> tokens
              </span>
            </div>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-xs">Datos sensibles</span>
            </div>
          </div>

          {/* Botón refresh */}
          <button
            onClick={loadTokens}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lista de tokens - Diseño compacto y seguro */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {tokens.map((token) => {
            const isEditing = editingToken === token.id;
            const isVisible = visibleTokens.has(token.id);
            const fingerprint = getTokenFingerprint(token.token_value);
            
            return (
              <div
                key={token.id}
                className="group px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
              >
                {/* Fila principal */}
                <div className="flex items-center gap-4">
                  {/* Indicador visual (fingerprint del token) */}
                  <div 
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-mono text-xs font-bold"
                    style={{ 
                      backgroundColor: `#${fingerprint}15`,
                      color: `#${fingerprint}`
                    }}
                    title={`ID: ${fingerprint}`}
                  >
                    {fingerprint.slice(0, 2)}
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {token.module_name}
                      </span>
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        {token.token_key}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {token.description}
                    </p>
                  </div>

                  {/* Token display compacto */}
                  <div className="hidden sm:flex items-center gap-2">
                    {!isEditing && (
                      <>
                        <div className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all ${
                          isVisible 
                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}>
                          {isVisible ? (
                            <span className="max-w-32 truncate inline-block align-middle">
                              {token.token_value.length > 20 
                                ? token.token_value.slice(0, 8) + '...' + token.token_value.slice(-8)
                                : token.token_value
                              }
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <span className="tracking-wider">••••••</span>
                              <span className="text-gray-400">{token.token_value.slice(-4)}</span>
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Fecha */}
                  <div className="hidden lg:block text-xs text-gray-400 dark:text-gray-500 w-16 text-right">
                    {formatDate(token.last_updated)}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1">
                    {!isEditing ? (
                      <>
                        <button
                          onClick={() => toggleTokenVisibility(token.id)}
                          className={`p-1.5 rounded-md transition-colors ${
                            isVisible 
                              ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' 
                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          title={isVisible ? 'Ocultar' : 'Mostrar'}
                        >
                          {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToken(token.token_value, token.id)}
                          className={`p-1.5 rounded-md transition-colors ${
                            copiedToken === token.id
                              ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          title="Copiar"
                        >
                          {copiedToken === token.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => startEditing(token)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors opacity-0 group-hover:opacity-100"
                          title="Editar"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => saveToken(token.id)}
                          disabled={saving === token.id}
                          className="p-1.5 rounded-md text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-50"
                          title="Guardar"
                        >
                          {saving === token.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Cancelar"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Fila de edición expandida */}
                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white font-mono transition-all"
                          placeholder="Ingresa el nuevo token..."
                          autoFocus
                        />
                        {token.endpoint_url && (
                          <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            <span>Endpoint:</span>
                            <code className="text-blue-500 dark:text-blue-400">{token.endpoint_url}</code>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Expandir endpoint al hacer hover (solo si no está editando) */}
                {!isEditing && token.endpoint_url && (
                  <div className="hidden group-hover:block mt-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                    <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <span>→</span>
                      <code className="text-gray-500 dark:text-gray-400 truncate">{token.endpoint_url}</code>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Nota de seguridad compacta */}
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <span className="text-amber-700 dark:text-amber-300">
          Tokens sensibles • No compartir públicamente • Los cambios se aplican inmediatamente
        </span>
      </div>
    </div>
  );
};

export default ApiAuthTokensManager;

