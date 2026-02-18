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
    
    // Optimización de chunks - separar vendors pesados para carga paralela
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Core React - siempre necesario
            if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
            // Supabase - se carga al autenticarse
            if (id.includes('@supabase')) return 'vendor-supabase';
            // Charting - solo dashboards
            if (id.includes('chart.js') || id.includes('recharts') || id.includes('plotly')) return 'vendor-charts';
            // Animaciones
            if (id.includes('framer-motion')) return 'vendor-motion';
            // Markdown
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype') || id.includes('unified') || id.includes('micromark') || id.includes('mdast') || id.includes('hast')) return 'vendor-markdown';
            // AWS SDK - solo admin
            if (id.includes('@aws-sdk') || id.includes('@smithy')) return 'vendor-aws';
            // Audio
            if (id.includes('lamejs') || id.includes('tone')) return 'vendor-audio';
            // ReactFlow - solo diagramas
            if (id.includes('reactflow') || id.includes('@xyflow')) return 'vendor-reactflow';
            // Monaco editor
            if (id.includes('monaco')) return 'vendor-monaco';
            // 3D
            if (id.includes('three') || id.includes('@react-three')) return 'vendor-3d';
            // Zustand + pequeñas utils
            if (id.includes('zustand')) return 'vendor-state';
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
