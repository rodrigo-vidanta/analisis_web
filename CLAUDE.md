# PQNC QA AI Platform - Claude Code Rules

> **Estado:** Produccion Activa | **v2.5.93+** | https://ai.vidavacations.com
> Usuarios reales dependen de esta aplicacion. Todo codigo debe ser de produccion.

## PROHIBICIONES ABSOLUTAS

- NUNCA push/deploy sin autorizacion explicita del usuario
- NUNCA codigo mock, datos hardcodeados o funciones de prueba
- NUNCA usar clientes Admin (eliminados): `supabaseSystemUIAdmin`, `analysisSupabaseAdmin`, `pqncSupabaseAdmin`
- NUNCA hardcodear credenciales, tokens o API keys en codigo
- NUNCA exponer `service_role_key` en frontend
- NUNCA usar `any` en TypeScript
- NUNCA CSS custom - solo TailwindCSS
- NUNCA inventar nombres de funciones, tablas BD, rutas API o tipos sin verificar existencia

## Stack

React 19 + TypeScript + Vite 7 + TailwindCSS 3.4 | Zustand 5 | Supabase (PQNC_AI: `glsmifhkoaifvaegsozd`) | N8N (Railway) | AWS S3+CloudFront (us-west-2)

## Clientes Supabase UNICOS

- `analysisSupabase` → `src/config/analysisSupabase.ts` (operaciones principales)
- `supabaseSystemUI` → `src/config/supabaseSystemUI.ts` (sistema UI)
- Ambos apuntan a PQNC_AI. SOLO `anon_key`. Edge Functions para ops privilegiadas.

## Convenciones

- Componentes: PascalCase (`UserProfile.tsx`) | Servicios: camelCase (`prospectsService.ts`)
- Handlers: `handle` + Accion | Boolean: `is/has/can` | Commits: `tipo(scope): descripcion`
- Tailwind exclusivo, Framer Motion para animaciones, dark mode obligatorio

## Workflow

PLANIFICAR → VERIFICAR (leer antes de modificar) → IMPLEMENTAR (max 3 archivos) → PROBAR → DOCUMENTAR

## Anti-Alucinacion

ANTES de usar funcion/tabla/tipo: 1) Verificar existencia (Grep/Glob) 2) Leer implementacion 3) Verificar imports/tipos 4) Si no existe: informar, NO inventar

## Archivos Clave

| Necesitas... | Consulta... |
|-------------|-------------|
| Rutas | `src/components/MainApp.tsx` |
| Auth | `src/contexts/AuthContext.tsx` |
| Estado global | `src/stores/appStore.ts` |
| Supabase config | `src/config/analysisSupabase.ts` |
| Permisos | `src/services/permissionsService.ts` + `src/hooks/useEffectivePermissions.ts` |
| Ninja mode | `src/stores/ninjaStore.ts` + `useNinjaAwarePermissions` |

## Docs por Dominio (.claude/docs/)

Consultar SOLO cuando se necesite contexto especifico del dominio:
- `architecture.md` - Arquitectura, diagramas, flujos
- `database.md` - Esquema BD, tablas, RLS, Edge Functions
- `modules.md` - Mapa completo: componentes, servicios, hooks, stores
- `security.md` - Seguridad, RLS, patrones seguros
- `ui-patterns.md` - Patrones UI, modales, animaciones
- `integrations.md` - N8N, AWS, Dynamics, WhatsApp
- `deploy.md` - Deploy, AWS, versionado

## Seguridad

- RLS habilitado en todas las tablas (no se puede leer con anon directamente)
- Solo `anon_key` en frontend | Edge Functions para privilegios
- Vistas seguras: `user_profiles_v2` (sin password_hash)
- Pre-commit: verificar que NO se incluyan `.env*`, `.supabase/`, credenciales

## Agentes Especializados (.claude/agents/)

Para tareas complejas por dominio, usar subagentes con contexto de:
- `supabase-agent.md` - BD, queries, RLS, Edge Functions
- `ui-agent.md` - Componentes React, patrones UI, Tailwind
- `whatsapp-agent.md` - Chat, templates, UChat, bot
- `analytics-agent.md` - Analisis, LiveMonitor, metricas
- `deploy-agent.md` - Build, deploy AWS, versionado
- `n8n-agent.md` - Workflows N8N, ejecuciones, debugging (LECTURA LIBRE, ESCRITURA CON AUTORIZACION)
- `uchat-agent.md` - UChat API, subscribers, webhooks, triggers, debug errores WhatsApp (LECTURA LIBRE, ESCRITURA CON AUTORIZACION)
