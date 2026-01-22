# 🚀 PQNC QA AI Platform v2.2.65

**⚠️ ESTADO: PRODUCCIÓN ACTIVA**  
**🌐 URL Producción**: https://ai.vidavacations.com  
**📅 Última Actualización**: 16 de Enero 2026  
**🔒 Arquitectura de Seguridad**: v3.0

Plataforma empresarial completa para gestión de prospectos, análisis de llamadas con IA y monitoreo en tiempo real.

> **⚠️ IMPORTANTE**: Este es un entorno de producción activo. Ver las reglas en `.cursor/rules/` para desarrollo y despliegue.

---

## 🔒 Arquitectura de Seguridad (v3.0 - Enero 2026)

### Cambios Críticos

| Aspecto | Estado Actual |
|---------|---------------|
| **Clientes `*Admin`** | ❌ **ELIMINADOS** del codebase |
| **RLS (Row Level Security)** | ⚠️ **DESHABILITADO** en 61 tablas |
| **Bundle de Producción** | ✅ Solo expone `anon_key` |
| **Edge Functions** | ✅ Migradas a PQNC_AI |

### Reglas Obligatorias

```typescript
// ❌ PROHIBIDO - Estos clientes ya no existen
import { supabaseSystemUIAdmin } from '../config/supabaseSystemUI';

// ✅ CORRECTO - Usar clientes normales
import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { analysisSupabase } from '../config/analysisSupabase';
```

### Documentación

- **Arquitectura Completa**: `docs/ARQUITECTURA_SEGURIDAD_2026.md`
- **Reglas de Seguridad**: `.cursor/rules/security-rules.mdc`
- **Arquitectura BD**: `.cursor/rules/arquitectura-bd-unificada.mdc`

---

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

- **Frontend**: React 19 + TypeScript + Vite 7
- **Styling**: Tailwind CSS + Framer Motion
- **Estado**: Zustand
- **Base de Datos**: 4 instancias Supabase especializadas
- **Gráficas**: Chart.js
- **Iconos**: Lucide React
- **Despliegue**: AWS S3 + CloudFront (Producción)
- **Infraestructura**: AWS us-west-2

## 📊 Base de Datos Unificada (Enero 2025)

### PQNC_AI (glsmifhkoaifvaegsozd) - **TODO UNIFICADO**

| Dominio | Tablas |
|---------|--------|
| **Autenticación** | auth_users, auth_roles, auth_sessions |
| **Permisos** | permissions, permission_groups |
| **Prospectos** | prospectos, prospect_assignments |
| **Llamadas** | llamadas_ventas, call_analysis_summary |
| **WhatsApp** | conversaciones_whatsapp, mensajes_whatsapp |
| **Configuración** | system_config, api_auth_tokens |

### Clientes Supabase

| Cliente | Archivo | Uso |
|---------|---------|-----|
| `analysisSupabase` | `src/config/analysisSupabase.ts` | Principal - Todo |
| `supabaseSystemUI` | `src/config/supabaseSystemUI.ts` | Auth, usuarios |

> **⚠️ NOTA**: Ambos clientes apuntan a PQNC_AI. Los clientes `*Admin` fueron **ELIMINADOS**.

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

## 📚 Documentación Completa

### Índice Principal
- 📋 [`docs/INDEX.md`](docs/INDEX.md) - Índice completo de documentación
- 📖 [`docs/GLOSARIO.md`](docs/GLOSARIO.md) - Glosario de términos técnicos
- 🏛️ [`ARCHITECTURE.md`](ARCHITECTURE.md) - Arquitectura general del sistema
- 📝 [`CONVENTIONS.md`](CONVENTIONS.md) - Convenciones de código
- 🔒 [`docs/ARQUITECTURA_SEGURIDAD_2026.md`](docs/ARQUITECTURA_SEGURIDAD_2026.md) - Arquitectura de seguridad

### Cursor y Desarrollo
- 📋 [`.cursor/CODEBASE_INDEX.md`](.cursor/CODEBASE_INDEX.md) - Índice del codebase
- 🎯 [`.cursor/rules/handover-format.mdc`](.cursor/rules/handover-format.mdc) - Formato de handovers con REF
- 🔧 [`.cursor/rules/documentation-maintenance.mdc`](.cursor/rules/documentation-maintenance.mdc) - Mantenimiento de docs

### Handovers
Para crear o citar handovers, usar formato:
```
REF: HANDOVER-YYYY-MM-DD-SLUG
```
Ver [`.cursor/rules/handover-format.mdc`](.cursor/rules/handover-format.mdc) para detalles.

## 🚨 Reglas de Desarrollo y Despliegue

**⚠️ ESTE ES UN ENTORNO DE PRODUCCIÓN**

- ❌ **NO hacer despliegues automáticos** - Solo cuando se solicite explícitamente
- ❌ **NO generar código con mocks** - Todo debe ser código de producción funcional
- ❌ **NO hacer push a Git sin autorización** - Solo cuando se solicite explícitamente
- ✅ Verificar impacto antes de cambios
- ✅ Probar localmente antes de sugerir despliegue

Ver [`.cursorrules`](.cursorrules) para reglas completas de desarrollo.

## 📦 Despliegues

- **Último Despliegue**: 25 de Noviembre 2025
- **Versión**: v2.1.0-production-20251125
- **Documentación**: Ver [`docs/DEPLOYMENT_PRODUCTION_2025-11-25.md`](docs/DEPLOYMENT_PRODUCTION_2025-11-25.md)
- **Backups**: Disponibles en `backups/`
