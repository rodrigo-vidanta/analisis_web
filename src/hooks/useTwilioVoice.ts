/**
 * ============================================
 * HOOK: useTwilioVoice
 * ============================================
 *
 * React hook para integrar Twilio Voice SDK en componentes.
 * Conecta el servicio singleton con el lifecycle de React.
 *
 * Usa reference counting: acquire() al montar, release() al desmontar.
 * El Device solo se destruye cuando el ULTIMO consumidor se desmonta
 * Y no hay llamada activa/entrante.
 *
 * Uso:
 *   const { isRegistered, incomingCallInfo, acceptCall, rejectCall, hangup } = useTwilioVoice();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { twilioVoiceService, type TwilioVoiceState, type IncomingCallInfo } from '../services/twilioVoiceService';

export interface UseTwilioVoiceReturn {
  // Estado
  isRegistered: boolean;
  isConnecting: boolean;
  hasActiveCall: boolean;
  hasIncomingCall: boolean;
  identity: string | null;
  error: string | null;
  incomingCallInfo: IncomingCallInfo | null;
  isMuted: boolean;

  // Acciones
  acceptCall: () => void;
  rejectCall: () => void;
  hangup: () => void;
  toggleMute: () => void;
}

export function useTwilioVoice(shouldInitialize: boolean = true): UseTwilioVoiceReturn {
  const [state, setState] = useState<TwilioVoiceState>(twilioVoiceService.getState());
  // Inicializar desde estado actual del servicio (recupera llamadas tras SPA re-login/HMR)
  const [incomingCallInfo, setIncomingCallInfo] = useState<IncomingCallInfo | null>(() => {
    const currentState = twilioVoiceService.getState();
    if (currentState.activeCall) {
      return twilioVoiceService.extractCallInfo(currentState.activeCall);
    }
    if (currentState.incomingCall) {
      return twilioVoiceService.extractCallInfo(currentState.incomingCall);
    }
    return null;
  });
  const [isMuted, setIsMuted] = useState(false);
  const acquiredRef = useRef(false);

  // Suscribirse a cambios de estado del servicio
  useEffect(() => {
    const unsubStateChange = twilioVoiceService.on('stateChange', (data) => {
      const newState = (data as { state: TwilioVoiceState }).state;
      setState(newState);
    });

    const unsubIncoming = twilioVoiceService.on('incoming', (data) => {
      setIncomingCallInfo({
        llamadaId: (data.llamadaId as string) ?? null,
        prospectoId: (data.prospectoId as string) ?? null,
        prospectoNombre: (data.prospectoNombre as string) ?? null,
        callSid: (data.callSid as string) ?? null,
        fromNumber: (data.fromNumber as string) ?? null,
        tipoLlamada: (data.tipoLlamada as string) ?? null,
        parentCallSid: (data.parentCallSid as string) ?? null,
        coordinacionId: (data.coordinacionId as string) ?? null,
        transferredBy: (data.transferredBy as string) ?? null,
        transferredByName: (data.transferredByName as string) ?? null,
      });
    });

    const unsubDisconnected = twilioVoiceService.on('disconnected', () => {
      setIncomingCallInfo(null);
      setIsMuted(false);
    });

    return () => {
      unsubStateChange();
      unsubIncoming();
      unsubDisconnected();
    };
  }, []);

  // Acquire/release con reference counting
  useEffect(() => {
    if (shouldInitialize && !acquiredRef.current) {
      acquiredRef.current = true;
      twilioVoiceService.acquire();
    }

    return () => {
      if (acquiredRef.current) {
        acquiredRef.current = false;
        twilioVoiceService.release();
      }
    };
  }, [shouldInitialize]);

  const acceptCall = useCallback(() => {
    twilioVoiceService.acceptIncomingCall();
  }, []);

  const rejectCall = useCallback(() => {
    twilioVoiceService.rejectIncomingCall();
    setIncomingCallInfo(null);
  }, []);

  const hangup = useCallback(() => {
    twilioVoiceService.hangup();
    setIncomingCallInfo(null);
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    const muted = twilioVoiceService.toggleMute();
    setIsMuted(muted);
  }, []);

  return {
    isRegistered: state.isRegistered,
    isConnecting: state.isConnecting,
    hasActiveCall: state.activeCall !== null,
    hasIncomingCall: state.incomingCall !== null,
    identity: state.identity,
    error: state.error,
    incomingCallInfo,
    isMuted,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
  };
}
