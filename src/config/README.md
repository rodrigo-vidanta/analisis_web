# ⚙️ Configuración de Bases de Datos

**Última actualización:** 13 de Enero 2025  
**Versión:** v2.2.0 (POST-MIGRACIÓN)

---

## ⚠️ CAMBIO ARQUITECTÓNICO IMPORTANTE

**A partir del 13 de Enero 2025**, la arquitectura cambió de **bases de datos separadas** a **base de datos unificada**.

---

## Arquitectura Actual (DESDE 2025-01-13)

### 1. PQNC_AI - BASE DE DATOS PRINCIPAL UNIFICADA ✅

**Archivos de configuración:**
- `analysisSupabase.ts` (cliente principal)
- `supabaseSystemUI.ts` (redirigido a PQNC_AI)

**URL:** `glsmifhkoaifvaegsozd.supabase.co`  
**Variables env:**
- `VITE_ANALYSIS_SUPABASE_URL`
- `VITE_SYSTEM_UI_SUPABASE_URL` (ahora apunta aquí también)

**Contiene TODO:**
```
✅ Autenticación y Usuarios
   - auth_users, auth_roles, auth_sessions
   - auth_permissions, auth_user_permissions
   - auth_user_coordinaciones
   
✅ Permisos Avanzados
   - permission_groups, group_permissions
   - user_permission_groups
   
✅ Coordinaciones y Asignaciones
   - coordinaciones
   - prospect_assignments, assignment_logs
   
✅ Prospectos y Llamadas
   - prospectos
   - llamadas_ventas
   - call_analysis_summary
   
✅ WhatsApp y Mensajería
   - conversaciones_whatsapp
   - mensajes_whatsapp
   - whatsapp_*_labels
   
✅ Configuración del Sistema
   - system_config
   - app_themes
   - api_auth_tokens
   - api_auth_tokens_history
   
✅ Moderación y Logs
   - content_moderation_warnings
   - user_warning_counters
   - auth_login_logs
   - paraphrase_logs
   - assignment_logs
   
✅ UChat
   - bot_pause_status
   - uchat_conversations
   - uchat_bots
   
✅ Vistas Optimizadas
   - auth_user_profiles
   - prospectos_con_ejecutivo_y_coordinacion
   - conversaciones_whatsapp_enriched
   - llamadas_activas_con_prospecto
```

**Clientes disponibles:**
- `analysisSupabase` - Cliente con anon_key
- `analysisSupabaseAdmin` - Cliente con service_key
- `supabaseSystemUI` - ⚠️ Redirigido a PQNC_AI
- `supabaseSystemUIAdmin` - ⚠️ Redirigido a PQNC_AI

---

### 2. System_UI - SOLO BACKUP ⚠️

**Archivo:** `supabaseSystemUI.ts` (variables redirigidas)  
**URL Original:** `zbylezfyagwrxoecioup.supabase.co`  
**Estado:** ARCHIVADO (desde 2025-01-13)

**Uso PERMITIDO:**
- Auditoría histórica
- Backup de emergencia
- Edge Functions (permanecen desplegadas aquí)

**Uso PROHIBIDO:**
- ❌ Consultas de producción
- ❌ Operaciones de escritura
- ❌ Crear usuarios/sesiones nuevas

---

### 3. Edge Functions

**URL:** `zbylezfyagwrxoecioup.supabase.co` (System_UI)  
**Variables env:** `VITE_EDGE_FUNCTIONS_URL`, `VITE_EDGE_FUNCTIONS_ANON_KEY`

**Funciones desplegadas:**
- `send-img-proxy` - Proxy para envío de imágenes WhatsApp
- `n8n-proxy` - Proxy para webhooks de N8N
- `anthropic-proxy` - Proxy para Anthropic API
- `error-analisis-proxy` - Proxy para análisis de errores
- `generar-url-optimizada` - Generación de URLs cortas

**Razón:** Edge Functions permanecen en system_ui donde ya están desplegadas y funcionando.

---

## Proyectos OBSOLETOS/PROHIBIDOS

### pqncSupabase (PROHIBIDO ⛔)

**Archivo:** `pqncSupabase.ts`  
**URL:** hmmfuhqgvsehkizlfzga.supabase.co  
**Estado:** **PROHIBIDO** según reglas del proyecto

⚠️ **NO USAR** - Este proyecto pertenece a otro sistema

---

### Clever Ideas / SupaClever (PROHIBIDO ⛔)

**Archivo:** `supabase.ts`  
**URL:** rnhejbuubpbnojalljso.supabase.co  
**Estado:** **PROHIBIDO** según reglas del proyecto

⚠️ **NO USAR** - Proyecto ajeno

---

### Log Monitor

**Archivo:** `supabaseLogMonitor.ts`  
**URL:** dffuwdzybhypxfzrmdcz.supabase.co  
**Estado:** ✅ ACTIVO (separado por diseño)

**Uso:** Dashboard de logs y errores del sistema

---

## Guía de Uso para Desarrolladores

### ✅ CORRECTO - Consultar Usuarios

```typescript
// Opción 1 (recomendada)
import { analysisSupabase } from '../config/analysisSupabase';
const { data } = await analysisSupabase.from('auth_users').select('*');

// Opción 2 (también válida)
import { supabaseSystemUI } from '../config/supabaseSystemUI';
const { data } = await supabaseSystemUI.from('auth_users').select('*');
// ⚠️ Este cliente ahora apunta a PQNC_AI, no a system_ui
```

### ✅ CORRECTO - Consultar Prospectos

```typescript
import { analysisSupabase } from '../config/analysisSupabase';
const { data } = await analysisSupabase.from('prospectos').select('*');
```

### ✅ CORRECTO - JOINs Directos

```typescript
// Ahora puedes hacer JOINs porque TODO está en PQNC_AI
const { data } = await analysisSupabase
  .from('prospectos')
  .select(`
    *,
    ejecutivo:ejecutivo_id (full_name, email, phone),
    coordinacion:coordinacion_id (nombre, codigo)
  `);
```

### ✅ CORRECTO - Usar Vistas Optimizadas

```typescript
// Vista con JOINs pre-calculados
const { data } = await analysisSupabase
  .from('prospectos_con_ejecutivo_y_coordinacion')
  .select('*');

// Ya incluye: ejecutivo_nombre, coordinacion_nombre, ejecutivo_backup_id, etc.
```

### ❌ INCORRECTO

```typescript
// NO usar pqncSupabase (proyecto prohibido)
import { pqncSupabase } from '../config/pqncSupabase';
const { data } = await pqncSupabase.from('auth_users').select('*');

// NO hacer consultas directas a system_ui antiguo
const directSystemUI = createClient('https://zbylezfyagwrxoecioup.supabase.co', key);
```

---

## Migración Completada

**Documentación completa:** `docs/MIGRACION_SYSTEM_UI_A_PQNC_AI_COMPLETA.md`  
**Índice de documentos:** `INDICE_DOCUMENTACION_MIGRACION.md`  
**Nueva arquitectura:** `docs/NUEVA_ARQUITECTURA_BD_UNIFICADA.md`

---

## Estructura de Conexiones Actual

```
Frontend (React)
  │
  ├─ analysisSupabase ──────────► PQNC_AI (TODO)
  │                               glsmifhkoaifvaegsozd
  │
  ├─ supabaseSystemUI ──────────► PQNC_AI (REDIRIGIDO)
  │  (antes apuntaba a system_ui) glsmifhkoaifvaegsozd
  │
  ├─ Edge Functions ────────────► System_UI
  │  (send-img-proxy, etc.)       zbylezfyagwrxoecioup
  │
  └─ supabaseLogMonitor ────────► Log Monitor
     (logs y errores)             dffuwdzybhypxfzrmdcz
```

---

## Beneficios de la Arquitectura Unificada

1. ✅ **JOINs directos** entre auth_users, prospectos, llamadas, etc.
2. ✅ **Menos requests HTTP** (60-70% reducción)
3. ✅ **Código más simple** (sin mapeo manual entre BDs)
4. ✅ **Performance mejorada** (JOINs en servidor)
5. ✅ **Más fácil de mantener** (1 solo proyecto)
6. ✅ **Vistas optimizadas** disponibles
7. ✅ **Triggers compartidos** entre tablas relacionadas

---

**Última actualización:** 13 de Enero 2025  
**Mantenido por:** AI Division - Samuel Rosales
