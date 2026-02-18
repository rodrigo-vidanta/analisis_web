import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { readFileSync } from 'fs'

// Leer la versión del package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))
const version = packageJson.version

// CONFIGURACIÓN OPTIMIZADA PARA RAILWAY DEPLOYMENT
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: 'docs/*.md', dest: 'docs' },
        { src: 'CHANGELOG.md', dest: 'docs' },
        { src: 'VERSIONS.md', dest: 'docs' },
      ]
    }),
  ],
  
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
    
    // Optimización de chunks - solo separar vendors SIN dependencia de React
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // AWS SDK - pesado, sin React, solo admin
            if (id.includes('@aws-sdk') || id.includes('@smithy')) return 'vendor-aws';
            // Supabase client - sin React
            if (id.includes('@supabase')) return 'vendor-supabase';
          }
        }
      }
    }
  },
  
  // Soporte para Web Workers
  worker: {
    format: 'es',
    plugins: []
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
    host: '0.0.0.0', // Permitir acceso desde cualquier interfaz
    strictPort: true, // Falla si el puerto está ocupado en lugar de usar otro
    open: true, // Abrir automáticamente en el navegador
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'healthcheck.railway.app',
      '.railway.app',
      '.up.railway.app'
    ]
  }
})
