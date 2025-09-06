import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

// Leer la versión del package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))
const version = packageJson.version

// CONFIGURACIÓN OPTIMIZADA PARA RAILWAY DEPLOYMENT
export default defineConfig({
  plugins: [react()],
  
  // Variables de entorno
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version)
  },
  
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
    host: '0.0.0.0',
    allowedHosts: [
      'healthcheck.railway.app',
      '.railway.app',
      '.up.railway.app',
      'localhost'
    ]
  },
  
  // Server para desarrollo
  server: {
    port: 5173,
    host: true,
    allowedHosts: [
      'healthcheck.railway.app',
      '.railway.app',
      '.up.railway.app',
      'localhost'
    ]
  }
})
