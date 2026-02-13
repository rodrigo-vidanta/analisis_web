/**
 * ============================================
 * HEALTH CHECK GUARD
 * ============================================
 *
 * Wrapper que verifica la disponibilidad de Supabase antes de renderizar la app.
 *
 * Flujo:
 * 1. Al montar: health check silencioso (sin mostrar mantenimiento)
 * 2. Si falla: segundo intento tras 3s (evitar falsos positivos)
 * 3. Si ambos fallan: mostrar MaintenancePage + polling cada 60s
 * 4. Cuando un check pase: renderizar la app normal
 * 5. Una vez renderizada la app, el guard deja de hacer checks
 *
 * Fecha: 12 Febrero 2026
 */

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import MaintenancePage from './MaintenancePage';

const SUPABASE_URL = import.meta.env.VITE_SYSTEM_UI_SUPABASE_URL || 'https://glsmifhkoaifvaegsozd.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SYSTEM_UI_SUPABASE_ANON_KEY || '';
const HEALTH_CHECK_TIMEOUT = 8000;
const POLL_INTERVAL = 60000;

type Status = 'initializing' | 'healthy' | 'unhealthy';

async function checkSupabaseHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/system_config_public?select=config_key&limit=1`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    // Requiere 200 + datos reales del query (no solo que el API responda)
    if (!response.ok) return false;

    const data = await response.json();
    const healthy = Array.isArray(data) && data.length > 0;
    return healthy;
  } catch {
    clearTimeout(timeout);
    return false;
  }
}

interface HealthCheckGuardProps {
  children: ReactNode;
}

export default function HealthCheckGuard({ children }: HealthCheckGuardProps) {
  const [status, setStatus] = useState<Status>('initializing');
  const [secondsUntilRetry, setSecondsUntilRetry] = useState(POLL_INTERVAL / 1000);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const doHealthCheck = useCallback(async (): Promise<boolean> => {
    const healthy = await checkSupabaseHealth();
    if (!mountedRef.current) return healthy;

    const now = new Date();
    setLastCheckTime(now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    if (healthy) {
      stopPolling();
      setStatus('healthy');
    }
    return healthy;
  }, [stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    setSecondsUntilRetry(POLL_INTERVAL / 1000);

    // Countdown cada segundo
    countdownRef.current = setInterval(() => {
      setSecondsUntilRetry((prev) => (prev <= 1 ? POLL_INTERVAL / 1000 : prev - 1));
    }, 1000);

    // Health check cada 60s
    pollRef.current = setInterval(() => {
      doHealthCheck();
      setSecondsUntilRetry(POLL_INTERVAL / 1000);
    }, POLL_INTERVAL);
  }, [doHealthCheck, stopPolling]);

  // Check inicial silencioso con retry
  useEffect(() => {
    mountedRef.current = true;

    async function initialCheck() {
      // Primer intento silencioso
      const firstCheck = await checkSupabaseHealth();
      if (!mountedRef.current) return;

      if (firstCheck) {
        setStatus('healthy');
        return;
      }

      // Segundo intento tras 2s (evitar falso positivo por red lenta)
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (!mountedRef.current) return;

      const secondCheck = await checkSupabaseHealth();
      if (!mountedRef.current) return;

      if (secondCheck) {
        setStatus('healthy');
        return;
      }

      // Confirmado: BD caida
      const now = new Date();
      setLastCheckTime(now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setStatus('unhealthy');
    }

    initialCheck();

    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  // Iniciar polling cuando pasa a unhealthy
  useEffect(() => {
    if (status === 'unhealthy') {
      startPolling();
    }
  }, [status, startPolling]);

  // Inicializando: loading minimo (silencioso, sin mencionar mantenimiento)
  if (status === 'initializing') {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center"
        style={{ background: '#0f172a' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Conectando...</p>
        </div>
      </div>
    );
  }

  // Healthy: renderizar app normal
  if (status === 'healthy') {
    return <>{children}</>;
  }

  // Unhealthy: MaintenancePage + indicador de health check
  return (
    <>
      <MaintenancePage />
      {/* Indicador de health check en esquina inferior derecha */}
      <div className="fixed bottom-4 right-4 z-[999999] bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-xl px-4 py-3 max-w-xs shadow-lg">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-slate-300 text-xs font-medium">Health Check</span>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">
          Ultimo check: {lastCheckTime || '--:--:--'}
        </p>
        <p className="text-slate-500 text-xs">
          Reintentando en {secondsUntilRetry}s
        </p>
        <button
          onClick={() => doHealthCheck()}
          className="mt-2 w-full text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 rounded-lg py-1.5 transition-colors"
        >
          Verificar ahora
        </button>
      </div>
    </>
  );
}
