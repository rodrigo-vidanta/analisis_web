/**
 * Componente que redirige a LiveMonitor con una llamada seleccionada
 */

import { useEffect } from 'react';
import { useAppStore } from '../../../stores/appStore';

interface RedirectToLiveMonitorProps {
  callId: string;
  onClose: () => void;
}

export const RedirectToLiveMonitor: React.FC<RedirectToLiveMonitorProps> = ({ callId, onClose }) => {
  const { setAppMode } = useAppStore();

  useEffect(() => {
    // Guardar callId en localStorage para que LiveMonitor lo abra
    localStorage.setItem('selected-call-id', callId);
    // Cambiar a modo live-monitor
    setAppMode('live-monitor');
    // Cerrar el widget
    onClose();
  }, [callId, setAppMode, onClose]);

  return null;
};

