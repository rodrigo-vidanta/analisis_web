import { useState, useEffect, memo } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import MainApp from './components/MainApp';
import { Toaster } from 'react-hot-toast';
import { Toaster as SileoToaster } from 'sileo';
import 'sileo/styles.css';
import NetworkStatusIndicator from './components/common/NetworkStatusIndicator';
import MaintenancePage from './components/MaintenancePage';
// import HealthCheckGuard from './components/HealthCheckGuard';

/**
 * MAINTENANCE MODE (comentado, disponible para uso futuro)
 *
 * Para activar mantenimiento manual:
 *   1. Descomentar imports de MaintenancePage y HealthCheckGuard
 *   2. Descomentar MAINTENANCE_MODE y el bloque if()
 *
 * Para auto-deteccion de outage (sin hardcodear):
 *   1. Descomentar import de HealthCheckGuard
 *   2. Envolver el return con <HealthCheckGuard>...</HealthCheckGuard>
 */
const MAINTENANCE_MODE = false;

const ThemedSileoToaster = memo(function ThemedSileoToaster() {
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <SileoToaster
      position="top-center"
      theme={isDark ? 'dark' : 'light'}
    />
  );
});

function App() {
  // Override manual: fuerza mantenimiento (migración infraestructura mensajería 2026-03-03)
  if (MAINTENANCE_MODE) {
    return <MaintenancePage />;
  }

  return (
    // <HealthCheckGuard>
      <AuthProvider>
        <MainApp />
        <Toaster
          position="top-center"
          containerStyle={{
            zIndex: 100,
          }}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#fff',
              borderRadius: '12px',
            },
          }}
        />
        <ThemedSileoToaster />
        {/* Indicador de estado de red (mejora 2026-01-20) */}
        <NetworkStatusIndicator position="bottom" />
      </AuthProvider>
    // </HealthCheckGuard>
  );
}

export default App;
