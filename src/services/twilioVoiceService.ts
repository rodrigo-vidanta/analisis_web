/**
 * ============================================
 * SERVICIO: TWILIO VOICE SDK (BROWSER)
 * ============================================
 *
 * Maneja la conexion con Twilio Voice SDK para recibir
 * llamadas transferidas (inbound) desde VAPI via N8N.
 *
 * Flujo:
 * 1. Obtiene Access Token desde Edge Function generate-twilio-token
 * 2. Inicializa Device con token
 * 3. Registra Device para recibir llamadas entrantes
 * 4. Emite eventos para que el store/UI reaccione
 *
 * Eventos emitidos:
 * - incoming: Nueva llamada entrante (con customParameters: llamadaId, prospectoId, etc)
 * - accepted: Llamada aceptada por el ejecutivo
 * - disconnected: Llamada terminada
 * - error: Error en Device o Call
 * - registered: Device registrado exitosamente
 * - tokenWillExpire: Token a punto de expirar (10s antes)
 *
 * Dependencias:
 * - @twilio/voice-sdk v2.15.0
 * - Edge Function: generate-twilio-token (Supabase)
 */

import { Device, Call } from '@twilio/voice-sdk';
import { supabaseSystemUI } from '../config/supabaseSystemUI';

// ============================================
// TIPOS
// ============================================

export interface TwilioVoiceState {
  isRegistered: boolean;
  isConnecting: boolean;
  activeCall: Call | null;
  incomingCall: Call | null;
  identity: string | null;
  error: string | null;
}

export interface IncomingCallInfo {
  llamadaId: string | null;
  prospectoId: string | null;
  prospectoNombre: string | null;
  callSid: string | null;
  fromNumber: string | null;
  tipoLlamada: string | null;
  // Transfer fields (populated when call comes from voice-transfer Edge Function)
  parentCallSid: string | null;
  coordinacionId: string | null;
  transferredBy: string | null;
  transferredByName: string | null;
}

type TwilioVoiceEventType =
  | 'incoming'
  | 'accepted'
  | 'disconnected'
  | 'error'
  | 'registered'
  | 'unregistered'
  | 'tokenWillExpire'
  | 'stateChange';

type TwilioVoiceListener = (data: Record<string, unknown>) => void;

// ============================================
// CONSTANTES
// ============================================

const SUPABASE_URL = import.meta.env.VITE_ANALYSIS_SUPABASE_URL || 'https://glsmifhkoaifvaegsozd.supabase.co';
const TOKEN_ENDPOINT = `${SUPABASE_URL}/functions/v1/generate-twilio-token`;
const LOG_PREFIX = '[TwilioVoice]';

// ============================================
// SERVICIO
// ============================================

class TwilioVoiceService {
  private device: Device | null = null;
  private state: TwilioVoiceState = {
    isRegistered: false,
    isConnecting: false,
    activeCall: null,
    incomingCall: null,
    identity: null,
    error: null,
  };
  private listeners = new Map<TwilioVoiceEventType, Set<TwilioVoiceListener>>();
  private tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private consumerCount = 0;
  private initPromise: Promise<void> | null = null;

  // Hangup activo al cerrar/recargar página
  private boundBeforeUnload = () => {
    if (this.state.activeCall) {
      console.log(`${LOG_PREFIX} Page unloading - disconnecting active call`);
      this.state.activeCall.disconnect();
    }
  };

  // ---- Event Emitter ----

  on(event: TwilioVoiceEventType, listener: TwilioVoiceListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  off(event: TwilioVoiceEventType, listener: TwilioVoiceListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: TwilioVoiceEventType, data: Record<string, unknown> = {}): void {
    this.listeners.get(event)?.forEach(listener => {
      try {
        listener(data);
      } catch (err) {
        console.error(`${LOG_PREFIX} Error in ${event} listener:`, err);
      }
    });
  }

  // ---- Reference Counting ----

  /**
   * Incrementa el contador de consumidores.
   * Solo inicializa si es el primer consumidor.
   */
  acquire(): void {
    this.consumerCount++;
    if (this.consumerCount === 1 && !this.device && !this.initPromise) {
      this.initPromise = this.initialize().finally(() => {
        this.initPromise = null;
      });
    }
  }

  /**
   * Decrementa el contador de consumidores.
   * Solo destruye si ya no hay consumidores Y no hay llamada activa.
   */
  release(): void {
    this.consumerCount = Math.max(0, this.consumerCount - 1);
    // NO destruir si hay llamada activa o entrante
    if (this.consumerCount === 0 && !this.state.activeCall && !this.state.incomingCall) {
      this.destroy();
    }
  }

  // ---- Public API ----

  getState(): TwilioVoiceState {
    return { ...this.state };
  }

  isInitialized(): boolean {
    return this.device !== null;
  }

  /**
   * Inicializa el Device de Twilio Voice SDK.
   * Obtiene token, crea Device, registra para incoming.
   */
  async initialize(): Promise<void> {
    if (this.device) {
      console.warn(`${LOG_PREFIX} Already initialized, skipping`);
      return;
    }

    this.updateState({ isConnecting: true, error: null });

    try {
      // 1. Obtener Access Token
      const tokenData = await this.fetchToken();
      if (!tokenData) {
        throw new Error('Failed to fetch Twilio token');
      }

      console.log(`${LOG_PREFIX} Token obtained for identity: ${tokenData.identity}`);

      // 2. Crear Device
      this.device = new Device(tokenData.token, {
        edge: 'roaming',
        closeProtection: true,
      });

      // 3. Configurar event handlers del Device
      this.setupDeviceEvents();

      // 4. Registrar para recibir llamadas entrantes
      await this.device.register();

      this.updateState({
        isConnecting: false,
        identity: tokenData.identity,
      });

      // 5. Programar refresh del token (5 min antes de expirar)
      this.scheduleTokenRefresh(tokenData.ttl);

      // 6. Colgar llamada activa si el usuario cierra/recarga la pagina
      window.addEventListener('beforeunload', this.boundBeforeUnload);

      console.log(`${LOG_PREFIX} Initialized and registered successfully`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown initialization error';
      console.error(`${LOG_PREFIX} Initialization failed:`, err);
      this.updateState({
        isConnecting: false,
        error: errorMessage,
      });
      this.emit('error', { message: errorMessage });
    }
  }

  /**
   * Desregistra y destruye el Device.
   * NO rechaza llamadas entrantes automaticamente.
   */
  async destroy(): Promise<void> {
    window.removeEventListener('beforeunload', this.boundBeforeUnload);

    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }

    if (this.state.activeCall) {
      this.state.activeCall.disconnect();
    }

    // NO rechazar llamada entrante - dejar que haga timeout natural
    // Esto evita que HMR o re-mounts corten llamadas

    if (this.device) {
      this.device.unregister();
      this.device.destroy();
      this.device = null;
    }

    this.updateState({
      isRegistered: false,
      isConnecting: false,
      activeCall: null,
      incomingCall: null,
      identity: null,
      error: null,
    });

    console.log(`${LOG_PREFIX} Destroyed`);
  }

  /**
   * Acepta la llamada entrante actual.
   */
  acceptIncomingCall(): Call | null {
    const { incomingCall } = this.state;
    if (!incomingCall) {
      console.warn(`${LOG_PREFIX} No incoming call to accept`);
      return null;
    }

    incomingCall.accept();
    this.updateState({
      activeCall: incomingCall,
      incomingCall: null,
    });

    this.emit('accepted', {
      callSid: incomingCall.parameters?.CallSid,
      ...this.extractCallInfo(incomingCall),
    });

    console.log(`${LOG_PREFIX} Call accepted`);
    return incomingCall;
  }

  /**
   * Rechaza la llamada entrante actual.
   */
  rejectIncomingCall(): void {
    const { incomingCall } = this.state;
    if (!incomingCall) {
      console.warn(`${LOG_PREFIX} No incoming call to reject`);
      return;
    }

    incomingCall.reject();
    this.updateState({ incomingCall: null });
    console.log(`${LOG_PREFIX} Call rejected`);
  }

  /**
   * Cuelga la llamada activa.
   */
  hangup(): void {
    const { activeCall } = this.state;
    if (!activeCall) {
      console.warn(`${LOG_PREFIX} No active call to hangup`);
      return;
    }

    activeCall.disconnect();
    this.updateState({ activeCall: null });
    console.log(`${LOG_PREFIX} Call hung up`);
  }

  /**
   * Toggle mute de la llamada activa.
   */
  toggleMute(): boolean {
    const { activeCall } = this.state;
    if (!activeCall) return false;

    const shouldMute = !activeCall.isMuted();
    activeCall.mute(shouldMute);
    return shouldMute;
  }

  /**
   * Extrae informacion de customParameters de la llamada.
   * N8N envia: llamadaId, prospectoId, prospectoNombre, tipoLlamada via TwiML <Parameter>.
   */
  extractCallInfo(call: Call): IncomingCallInfo {
    const params = call.customParameters;
    return {
      llamadaId: params.get('llamadaId') ?? null,
      prospectoId: params.get('prospectoId') ?? null,
      prospectoNombre: params.get('prospectoNombre') ?? null,
      callSid: call.parameters?.CallSid ?? null,
      fromNumber: call.parameters?.From ?? params.get('fromNumber') ?? null,
      tipoLlamada: params.get('tipoLlamada') ?? null,
      parentCallSid: params.get('parentCallSid') ?? null,
      coordinacionId: params.get('coordinacionId') ?? null,
      transferredBy: params.get('transferredBy') ?? null,
      transferredByName: params.get('transferredByName') ?? null,
    };
  }

  // ---- Private Methods ----

  private async fetchToken(): Promise<{ token: string; identity: string; ttl: number } | null> {
    try {
      const { data: { session } } = await supabaseSystemUI.auth.getSession();
      if (!session?.access_token) {
        console.error(`${LOG_PREFIX} No active session for token fetch`);
        return null;
      }

      const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY || '',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`${LOG_PREFIX} Token fetch failed (${response.status}):`, errorBody);
        return null;
      }

      return await response.json();
    } catch (err) {
      console.error(`${LOG_PREFIX} Token fetch error:`, err);
      return null;
    }
  }

  private setupDeviceEvents(): void {
    if (!this.device) return;

    // Device registrado exitosamente en Twilio
    this.device.on('registered', () => {
      console.log(`${LOG_PREFIX} Device registered`);
      this.updateState({ isRegistered: true, error: null });
      this.emit('registered', {});
    });

    // Device desregistrado
    this.device.on('unregistered', () => {
      console.log(`${LOG_PREFIX} Device unregistered`);
      this.updateState({ isRegistered: false });
      this.emit('unregistered', {});
    });

    // Llamada entrante
    this.device.on('incoming', (call: Call) => {
      console.log(`${LOG_PREFIX} Incoming call:`, {
        callSid: call.parameters?.CallSid,
        customParameters: Object.fromEntries(call.customParameters),
      });

      // Configurar eventos de la llamada
      this.setupCallEvents(call);

      this.updateState({ incomingCall: call });
      this.emit('incoming', {
        call,
        ...this.extractCallInfo(call),
      });
    });

    // Error en el Device
    this.device.on('error', (twilioError: { message: string; code?: number }) => {
      console.error(`${LOG_PREFIX} Device error:`, twilioError);
      this.updateState({ error: `Device error: ${twilioError.message}` });
      this.emit('error', {
        message: twilioError.message,
        code: twilioError.code,
      });
    });

    // Token a punto de expirar (10s antes)
    this.device.on('tokenWillExpire', () => {
      console.log(`${LOG_PREFIX} Token will expire soon, refreshing...`);
      this.refreshToken();
      this.emit('tokenWillExpire', {});
    });
  }

  private setupCallEvents(call: Call): void {
    call.on('accept', () => {
      console.log(`${LOG_PREFIX} Call accepted event`);
    });

    call.on('disconnect', () => {
      console.log(`${LOG_PREFIX} Call disconnected`);
      this.updateState({ activeCall: null, incomingCall: null });
      this.emit('disconnected', {
        callSid: call.parameters?.CallSid,
        ...this.extractCallInfo(call),
      });
    });

    call.on('cancel', () => {
      console.log(`${LOG_PREFIX} Call cancelled (caller hung up before answer)`);
      this.updateState({ incomingCall: null });
      this.emit('disconnected', {
        callSid: call.parameters?.CallSid,
        reason: 'cancelled',
        ...this.extractCallInfo(call),
      });
    });

    call.on('reject', () => {
      console.log(`${LOG_PREFIX} Call rejected`);
      this.updateState({ incomingCall: null });
    });

    call.on('error', (error: { message: string; code?: number }) => {
      console.error(`${LOG_PREFIX} Call error:`, error);
      this.emit('error', {
        message: error.message,
        code: error.code,
        callSid: call.parameters?.CallSid,
      });
    });
  }

  private async refreshToken(): Promise<void> {
    try {
      const tokenData = await this.fetchToken();
      if (tokenData && this.device) {
        this.device.updateToken(tokenData.token);
        this.scheduleTokenRefresh(tokenData.ttl);
        console.log(`${LOG_PREFIX} Token refreshed successfully`);
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Token refresh failed:`, err);
    }
  }

  private scheduleTokenRefresh(ttlSeconds: number): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    // Refrescar 5 minutos antes de que expire
    const refreshMs = Math.max((ttlSeconds - 300) * 1000, 60000);
    this.tokenRefreshTimer = setTimeout(() => {
      this.refreshToken();
    }, refreshMs);
  }

  private updateState(updates: Partial<TwilioVoiceState>): void {
    this.state = { ...this.state, ...updates };
    this.emit('stateChange', { state: this.getState() });
  }
}

// ============================================
// SINGLETON (sobrevive HMR)
// ============================================

// Preservar instancia en window para sobrevivir Hot Module Replacement
const GLOBAL_KEY = '__twilioVoiceService__';

function getOrCreateService(): TwilioVoiceService {
  const win = window as Record<string, unknown>;
  if (win[GLOBAL_KEY] instanceof TwilioVoiceService) {
    return win[GLOBAL_KEY];
  }
  const service = new TwilioVoiceService();
  win[GLOBAL_KEY] = service;
  return service;
}

export const twilioVoiceService = getOrCreateService();

// HMR: no destruir al recargar este modulo
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    // NO destruir el servicio - mantenerlo vivo durante HMR
  });
}
