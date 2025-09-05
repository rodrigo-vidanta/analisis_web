import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CONFIGURACIÓN OPTIMIZADA PARA RAILWAY DEPLOYMENT
export default defineConfig({
  plugins: [react()],
  
  // Build optimizado para producción
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Deshabilitado para menor tamaño
    minify: 'esbuild',
    
    // Optimización de chunks
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['zustand']
        }
      }
    }
  },
  
  // Preview para Railway
  preview: {
    port: parseInt(process.env.PORT || '4173'),
    host: '0.0.0.0'
  },
  
  // Server para desarrollo
  server: {
    port: 5173,
    host: true
  }
})
