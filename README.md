# 🚀 PQNC QA AI Platform v5.2.0

Plataforma empresarial completa para gestión de prospectos, análisis de llamadas con IA y monitoreo en tiempo real.

## 🎯 Módulos Principales

### 🔧 Agent Studio
Creación y gestión de agentes inteligentes de conversación.

### 🧠 Análisis IA
Análisis inteligente de llamadas con métricas, transcripción y gráficas radar.

### 👥 PQNC Humans
Análisis avanzado de llamadas con sistema de feedback y bookmarks.

### 📺 Live Monitor
Monitoreo en tiempo real de llamadas activas y transferencias.

### 💬 Live Chat
Chat en tiempo real integrado con WhatsApp via UChat.

### 🤖 AI Models
Gestión de modelos de IA, voces y generación de contenido.

### 📝 Prompts Manager
Gestión de prompts con versionado y métricas de performance.

### ☁️ AWS Manager
Gestión completa de infraestructura AWS con métricas en tiempo real.

### 📊 Prospectos
Sistema completo de gestión de prospectos con historial de llamadas.

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Framer Motion
- **Estado**: Zustand
- **Base de Datos**: 4 instancias Supabase especializadas
- **Gráficas**: Chart.js
- **Iconos**: Lucide React
- **Despliegue**: AWS S3 + CloudFront

## 📊 Bases de Datos

### analysisSupabase
- **Prospectos**: Gestión completa de clientes
- **Análisis IA**: Métricas y calificaciones
- **Llamadas**: Historial y transcripciones

### pqncSupabase  
- **PQNC Humans**: Análisis avanzado
- **Administración**: Usuarios y tokens

### supabaseSystemUI
- **Live Chat**: Conversaciones y mensajes
- **Prompts**: Versionado y métricas

### supabaseMain
- **AI Models**: Modelos y configuraciones

## 🚀 Instalación Rápida

```bash
npm install
npm run dev
```

## 📋 Características v5.2.0

- ✅ **Módulo Prospectos**: Data grid con 23+ prospectos reales
- ✅ **Análisis IA**: Rediseñado con gráficas radar
- ✅ **Live Chat**: Ordenamiento automático como WhatsApp
- ✅ **AWS Manager**: 7 servicios monitoreados en tiempo real
- ✅ **Navegación**: Integración completa entre módulos
- ✅ **Performance**: Sin re-renders ni interrupciones

## 🔗 Navegación Inteligente

- **Prospectos ↔ Live Chat**: Navegación automática a conversación
- **Prospectos → Análisis IA**: Click en llamada abre análisis
- **Análisis IA ↔ Prospecto**: Click en nombre abre sidebar
- **Sidebar chat**: Verde si activo, gris si inactivo

## 🎨 UX Optimizada

- Animaciones suaves con Framer Motion
- Sin emojis, solo iconos vectoriales
- Diseño minimalista y profesional
- Auto-refresh silencioso
- Sincronización inteligente sin interrupciones

## 📄 Documentación

Cada módulo incluye README específico con:
- Descripción y componentes
- Conexiones de base de datos
- Dependencias y permisos
- Funcionalidades y navegación

Ver `/src/components/[modulo]/README.md` para detalles específicos.
