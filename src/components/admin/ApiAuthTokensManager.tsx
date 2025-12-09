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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-600 dark:text-slate-400">Cargando tokens...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-blue-600" />
            Tokens de Autenticación API
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Gestiona los tokens de autenticación para webhooks y APIs externas
          </p>
        </div>
        
        <button
          onClick={loadTokens}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Advertencia de seguridad */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-amber-900 dark:text-amber-100">
            ⚠️ Información Sensible
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
            Estos tokens proporcionan acceso a sistemas externos. Manéjalos con cuidado y no los compartas públicamente.
            Los cambios afectan directamente la funcionalidad de la plataforma.
          </p>
        </div>
      </div>

      {/* Lista de tokens */}
      <div className="space-y-4">
        {tokens.map((token) => (
          <motion.div
            key={token.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
          >
            {/* Header del token */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {token.module_name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {token.token_key}
                  </p>
                </div>
              </div>
              
              <div className="text-right text-xs text-slate-400">
                <div>Última actualización:</div>
                <div>{new Date(token.last_updated).toLocaleString()}</div>
              </div>
            </div>

            {/* Descripción */}
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {token.description}
            </p>

            {/* Endpoint URL */}
            {token.endpoint_url && (
              <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Endpoint:</div>
                <code className="text-sm text-blue-600 dark:text-blue-400 break-all">
                  {token.endpoint_url}
                </code>
              </div>
            )}

            {/* Campo del token */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Token de Autenticación
              </label>
              
              <AnimatePresence mode="wait">
                {editingToken === token.id ? (
                  <motion.div
                    key="editing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white font-mono text-sm"
                      placeholder="Ingresa el nuevo token..."
                      autoFocus
                    />
                    <button
                      onClick={() => saveToken(token.id)}
                      disabled={saving === token.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {saving === token.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Guardar
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                    >
                      Cancelar
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="viewing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-2"
                  >
                    <div className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg font-mono text-sm text-slate-700 dark:text-slate-300">
                      {visibleTokens.has(token.id) ? token.token_value : maskToken(token.token_value)}
                    </div>
                    
                    {/* Botones de acción */}
                    <button
                      onClick={() => toggleTokenVisibility(token.id)}
                      className="p-2.5 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                      title={visibleTokens.has(token.id) ? 'Ocultar token' : 'Mostrar token'}
                    >
                      {visibleTokens.has(token.id) ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => copyToken(token.token_value, token.id)}
                      className="p-2.5 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                      title="Copiar token"
                    >
                      {copiedToken === token.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => startEditing(token)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Key className="w-4 h-4" />
                      Editar
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Nota de uso */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💡 Cómo usar estos tokens
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
          <li>Los tokens se envían en el header de las peticiones HTTP</li>
          <li>Cada módulo tiene su propio token de autenticación</li>
          <li>Si un token expira o es comprometido, actualízalo inmediatamente</li>
          <li>Los cambios se aplican de forma inmediata en la aplicación</li>
        </ul>
      </div>
    </div>
  );
};

export default ApiAuthTokensManager;

