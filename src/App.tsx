import { AuthProvider } from './contexts/AuthContext';
import MainApp from './components/MainApp';
import { Toaster } from 'react-hot-toast';
import NetworkStatusIndicator from './components/common/NetworkStatusIndicator';
// import MaintenancePage from './components/MaintenancePage';
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
// const MAINTENANCE_MODE = false;

function App() {
  // Override manual: fuerza mantenimiento sin importar health check
  // if (MAINTENANCE_MODE) {
  //   return <MaintenancePage />;
  // }

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
        {/* Indicador de estado de red (mejora 2026-01-20) */}
        <NetworkStatusIndicator position="bottom" />
      </AuthProvider>
    // </HealthCheckGuard>
  );
}

export default App;
