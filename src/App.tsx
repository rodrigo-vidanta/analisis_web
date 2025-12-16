import { AuthProvider } from './contexts/AuthContext';
import MainApp from './components/MainApp';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <MainApp />
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            borderRadius: '12px',
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;