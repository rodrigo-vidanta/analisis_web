import { AuthProvider } from './contexts/AuthContext';
import MainApp from './components/MainApp';
import { Toaster } from 'react-hot-toast';
import NetworkStatusIndicator from './components/common/NetworkStatusIndicator';

function App() {
  return (
    <AuthProvider>
      <MainApp />
      <Toaster 
        position="top-center"
        containerStyle={{
          zIndex: 99999, // Por encima de todos los modales (z-50 = 50)
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
  );
}

export default App;