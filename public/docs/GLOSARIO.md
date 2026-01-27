# 📖 Glosario de Términos — PQNC QA AI Platform

**Última actualización:** 27 de Enero 2026  
**Versión:** 1.2.0

---

## Índice

- [Arquitectura y Base de Datos](#arquitectura-y-base-de-datos)
- [Seguridad](#seguridad)
- [Herramientas y Servicios](#herramientas-y-servicios)
- [Conceptos de Desarrollo](#conceptos-de-desarrollo)
- [Módulos del Sistema](#módulos-del-sistema)

---

## Arquitectura y Base de Datos

### BD Unificada
**Definición:** Arquitectura donde toda la base de datos vive en un solo proyecto de Supabase (PQNC_AI), consolidando lo que antes estaba en System_UI y PQNC_AI.

**Implementación:** 13 de Enero 2025

**Ventajas:**
- JOINs nativos entre tablas
- Menor complejidad
- Mejor performance
- Código más mantenible

**Ver:** [NUEVA_ARQUITECTURA_BD_UNIFICADA.md](NUEVA_ARQUITECTURA_BD_UNIFICADA.md)

---

### PQNC_AI (glsmifhkoaifvaegsozd)
**Definición:** Proyecto principal de Supabase que contiene TODA la base de datos desde la migración del 2025-01-13.

**URL:** `https://glsmifhkoaifvaegsozd.supabase.co`

**Contiene:**
- Auth (usuarios, sesiones, roles)
- Permisos (grupos, permisos individuales)
- Prospectos y llamadas
- WhatsApp (conversaciones, mensajes)
- Configuración del sistema
- Edge Functions (desde 2026-01-16)

---

### System_UI (zbylezfyagwrxoecioup)
**Definición:** Proyecto anterior de Supabase que ahora sirve SOLO como **backup histórico**.

**URL:** `https://zbylezfyagwrxoecioup.supabase.co`

**Estado:** BACKUP/ARCHIVADO desde 2025-01-13

**Uso permitido:** Solo consultas de auditoría, NO escribir datos nuevos

---

### RLS (Row Level Security)
**Definición:** Sistema de políticas de seguridad a nivel de filas en PostgreSQL/Supabase.

**Estado Actual:** DESHABILITADO en 61 tablas de PQNC_AI (decisión de arquitectura 2026-01-16)

**Razón:** La app tiene su propio sistema de autenticación (`auth_users`, `auth_sessions`) y el `anon_key` no está públicamente expuesto.

**Ver:** [ARQUITECTURA_SEGURIDAD_2026.md](ARQUITECTURA_SEGURIDAD_2026.md)

---

### Tablas Deprecadas
**Definición:** Tablas o vistas que fueron eliminadas y NO deben usarse.

**Lista:**
- `coordinador_coordinaciones` (VIEW eliminada 2026-01-14)
- `coordinador_coordinaciones_legacy` (tabla eliminada 2026-01-16)
- `user_notifications_legacy` (tabla eliminada 2026-01-16)
- `prospectos_duplicate` (tabla eliminada 2026-01-16)
- `auth_user_profiles` (VIEW eliminada 2026-01-16, exponía `password_hash`)

**Reemplazo:**
- Coordinaciones → `auth_user_coordinaciones`
- Perfiles de usuario → `user_profiles_v2` (segura, sin password_hash)

**Ver:** [.cursor/rules/arquitectura-bd-unificada.mdc](.cursor/rules/arquitectura-bd-unificada.mdc)

---

## Seguridad

### Clientes Admin (ELIMINADOS)
**Definición:** Clientes de Supabase que usaban `service_role_key` en el frontend.

**Estado:** ❌ **ELIMINADOS** por razones de seguridad (2026-01-16)

**Clientes eliminados:**
- `supabaseSystemUIAdmin`
- `analysisSupabaseAdmin`
- `pqncSupabaseAdmin`

**Razón:** Exponían `service_role_key` en el bundle de producción, vulnerabilidad crítica.

**Solución:** Usar Edge Functions para operaciones admin.

**Ver:** [.cursor/rules/security-rules.mdc](.cursor/rules/security-rules.mdc)

---

### anon_key (Anon Key)
**Definición:** Clave pública de Supabase que se puede exponer en el frontend de forma segura.

**Formato:** JWT con role `anon`

**Uso:** Cliente público de Supabase (`analysisSupabase`, `supabaseSystemUI`)

**Seguridad:** Puede estar en el bundle de producción sin riesgo.

---

### service_role_key (Service Role Key)
**Definición:** Clave privada de Supabase con acceso total a la BD, bypasea RLS.

**Formato:** JWT con role `service_role`

**⚠️ CRÍTICO:** NUNCA debe estar en código frontend ni en variables `VITE_*` de producción.

**Uso permitido:**
- Edge Functions (como secrets)
- Scripts de migración
- MCPs de desarrollo local

---

### Edge Functions
**Definición:** Funciones serverless que se ejecutan en Supabase Edge Runtime (Deno).

**Ubicación:** PQNC_AI (glsmifhkoaifvaegsozd) desde 2026-01-16

**Propósito:**
- Proxy seguro para APIs externas (N8N, Anthropic)
- Operaciones que requieren `service_role_key`
- Evitar CORS
- Ocultar tokens del frontend

**Ejemplos:**
- `multi-db-proxy` - Acceso a PQNC_QA y LOGMONITOR
- `auth-admin-proxy` - Operaciones admin de autenticación
- `send-img-proxy` - Envío de imágenes WhatsApp
- `anthropic-proxy` - Llamadas a Claude API

**Ver:** [EDGE_FUNCTIONS_CATALOG.md](EDGE_FUNCTIONS_CATALOG.md)

---

## Herramientas y Servicios

### MCP (Model Context Protocol)
**Definición:** Protocolo de Anthropic para dar a Claude acceso a herramientas externas (bases de datos, APIs, etc).

**MCPs Activos:**
- `SupabaseREST` - BD PQNC_AI via Management API REST (recomendado)
- `Supa_PQNC_AI` - BD PQNC_AI via funciones RPC (requiere setup)
- `SystemUI_AuthDB` - BD System_UI (solo backup)
- `N8N` - Workflows de N8N
- `aws-infrastructure` - Servicios AWS (ECS, RDS, S3)

**Ver:** [MCP_CATALOG.md](MCP_CATALOG.md)

---

### SupabaseREST
**Definición:** MCP que usa la Management API REST de Supabase, NO requiere funciones RPC en la BD.

**Ventajas:**
- No requiere ejecutar `enable_full_access_mcp.sql`
- Usa Management API directamente
- Acceso con token de `.supabase/access_token`

**Herramientas:**
- `mcp_SupabaseREST_execute_sql`
- `mcp_SupabaseREST_query_table`
- `mcp_SupabaseREST_get_schema`

**Ver:** [.cursor/rules/mcp-rest-rules.mdc](.cursor/rules/mcp-rest-rules.mdc)

---

### N8N
**Definición:** Plataforma de automatización (como Zapier) self-hosted en Railway.

**URL:** `https://primary-dev-d75a.up.railway.app`

**Uso:** Workflows para asignación de prospectos, envío de mensajes WhatsApp, integraciones con Dynamics CRM.

**Ver:** [N8N_MCP_CATALOG.md](N8N_MCP_CATALOG.md), [N8N_WORKFLOWS_INDEX.md](N8N_WORKFLOWS_INDEX.md)

---

### VAPI
**Definición:** Plataforma de asistentes de voz IA en tiempo real.

**Uso:** Agentes de voz (Natalia, etc.) para llamadas de ventas.

**Integración:** Webhooks a Edge Functions, análisis en PQNC_AI.

---

### RPC (Remote Procedure Call)
**Definición:** Mecanismo de Supabase/PostgreSQL para ejecutar funciones del servidor desde el cliente.

**Sintaxis:**
```typescript
const { data, error } = await supabase.rpc('nombre_funcion', {
  parametro1: valor1,
  parametro2: valor2
});
```

**Ventajas:**
- Ejecución en servidor (más rápido, más seguro)
- Acceso a lógica compleja de PostgreSQL
- Bypass controlado de RLS con `SECURITY DEFINER`

**Ejemplo en PQNC:**
```sql
-- Función RPC para búsqueda server-side
CREATE FUNCTION search_dashboard_conversations(
  p_search_term TEXT,
  p_is_admin BOOLEAN,
  p_limit INTEGER
) RETURNS TABLE (...) AS $$
  -- Lógica SQL
$$;
```

**Ver:** [FIX_BUSQUEDA_WHATSAPP_SERVER_SIDE.md](FIX_BUSQUEDA_WHATSAPP_SERVER_SIDE.md)

---

### Server-Side Search
**Definición:** Búsqueda ejecutada en el servidor de base de datos, no en el navegador.

**Ventajas vs Client-Side:**
- Performance: <1s vs 30s+
- Escalabilidad: Ilimitado vs max 2500 registros
- Memoria: ~100KB vs ~50MB transferidos
- Cobertura: 100% vs 92% de datos

**Implementación en PQNC:**
```typescript
// Llama a función RPC en servidor
const { data } = await supabase.rpc('search_dashboard_conversations', {
  p_search_term: 'Rosario'
});
// Retorna solo resultados (no carga 2388 conversaciones)
```

**Contraste con Client-Side:**
```typescript
// ❌ Client-side: Carga TODO, filtra en navegador
const { data: all } = await supabase.from('prospectos').select('*');
const filtered = all.filter(p => p.nombre.includes(searchTerm));
```

**Ver:** [FIX_BUSQUEDA_WHATSAPP_SERVER_SIDE.md](FIX_BUSQUEDA_WHATSAPP_SERVER_SIDE.md)

---

### Client-Side Search
**Definición:** Búsqueda ejecutada en el navegador después de cargar todos los datos.

**Limitaciones:**
- Consume mucha memoria (datos en RAM)
- Lento para datasets grandes (>1000 registros)
- No escala (límite ~2500 registros)
- Error `ERR_INSUFFICIENT_RESOURCES` si datos > memoria disponible

**Cuándo usar:**
- Datasets pequeños (<100 registros)
- Datos ya cargados en memoria
- Búsqueda en tiempo real mientras se escribe

**Cuándo NO usar:**
- Datasets grandes (>1000 registros)
- Primera carga de datos
- Búsquedas complejas con JOINs

**Ver:** [FIX_BUSQUEDA_WHATSAPP_SERVER_SIDE.md](FIX_BUSQUEDA_WHATSAPP_SERVER_SIDE.md)

---

### SECURITY DEFINER
**Definición:** Modificador de funciones PostgreSQL que ejecuta la función con permisos del owner, no del caller.

**Sintaxis:**
```sql
CREATE FUNCTION mi_funcion() 
RETURNS TABLE (...)
LANGUAGE plpgsql
SECURITY DEFINER  -- ← Ejecuta con permisos del owner
AS $$
  -- Lógica
$$;
```

**Uso en PQNC:**
- Bypass controlado de RLS en funciones RPC
- Permite búsquedas a usuarios no-admin sin exponer todos los datos
- La función implementa su propia lógica de permisos

**Ejemplo:**
```sql
-- Función con SECURITY DEFINER
CREATE FUNCTION search_dashboard_conversations(...)
SECURITY DEFINER
AS $$
  -- Implementa filtros de permisos internamente
  WHERE (
    p_is_admin = TRUE OR  -- Admin ve todo
    p.ejecutivo_id = ANY(p_ejecutivo_ids) OR  -- Solo asignados
    p.coordinacion_id = ANY(p_coordinacion_ids)  -- Solo coordinación
  )
$$;
```

**Seguridad:**
- ⚠️ Requiere cuidado: función tiene acceso total a BD
- ✅ Implementar validaciones internas de permisos
- ✅ Auditar todas las funciones con `SECURITY DEFINER`

**Ver:** [ARQUITECTURA_SEGURIDAD_2026.md](ARQUITECTURA_SEGURIDAD_2026.md)

---

### Management API (Supabase)
**Definición:** API REST de Supabase para operaciones administrativas (crear tablas, ejecutar SQL, gestionar usuarios, etc).

**URL:** `https://api.supabase.com/v1/projects/{project_ref}/...`

**Autenticación:** Token de acceso personal (`.supabase/access_token`)

**Endpoints usados en PQNC:**
- `POST /database/query` - Ejecutar SQL arbitrario
- `GET /database/tables` - Listar tablas
- `POST /auth/users` - Crear usuarios

**Ejemplo:**
```bash
curl -X POST https://api.supabase.com/v1/projects/glsmifhkoaifvaegsozd/database/query \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{"query": "SELECT * FROM prospectos LIMIT 10"}'
```

**Ver:** [MCP_REST_SETUP.md](MCP_REST_SETUP.md)

---

## Conceptos de Desarrollo

### Migración System_UI → PQNC_AI
**Definición:** Proceso de unificar dos bases de datos en una (13 de Enero 2025).

**Resultado:**
- 37 tablas migradas
- 125+ usuarios migrados
- 19 funciones RPC
- 4 triggers
- 5 vistas

**Estado:** ✅ COMPLETADA

**Ver:** [MIGRACION_SYSTEM_UI_A_PQNC_AI_COMPLETA.md](MIGRACION_SYSTEM_UI_A_PQNC_AI_COMPLETA.md)

---

### Pentesting
**Definición:** Pruebas de penetración para identificar vulnerabilidades de seguridad.

**Reportes:**
- 2026-01-18: Pentesting Final
- 2026-01-17: Pentesting Profundo
- 2026-01-16: Pentesting Inicial

**Hallazgos críticos resueltos:**
- `service_role_key` en bundle → Eliminado
- `auth_user_profiles` exponía `password_hash` → Vista eliminada
- Clientes Admin en código → Eliminados

**Ver:** [PENTESTING_FINAL_2026-01-18.md](PENTESTING_FINAL_2026-01-18.md)

---

### Clientes de Supabase
**Definición:** Instancias de `@supabase/supabase-js` configuradas para conectarse a proyectos específicos.

**Clientes activos:**
- `analysisSupabase` (src/config/analysisSupabase.ts) - Principal, para todo
- `supabaseSystemUI` (src/config/supabaseSystemUI.ts) - Auth, usuarios (redirigido a PQNC_AI)

**Clientes obsoletos/prohibidos:**
- `pqncSupabase` - Proyecto prohibido (hmmfuhqgvsehkizlfzga)
- `*Admin` - Eliminados por seguridad

---

## Módulos del Sistema

### Live Monitor
**Definición:** Módulo para monitorear llamadas de ventas en tiempo real.

**Características:**
- Vista Kanban de llamadas activas
- Análisis IA en tiempo real
- Audio streaming (experimental)
- Métricas de calidad

**Archivos:** `src/components/analysis/LiveMonitor.tsx`

---

### Live Chat
**Definición:** Módulo para atención de conversaciones WhatsApp.

**Características:**
- Conversaciones en tiempo real
- Sistema de labels
- Pausar/reanudar bot
- Plantillas de respuesta rápida
- Envío de imágenes

**Archivos:** `src/components/chat/LiveChatCanvas.tsx`

---

### Prospectos
**Definición:** Módulo para gestión de leads y clientes potenciales.

**Características:**
- Vista Kanban por etapas
- Asignación manual/automática
- Integración con Dynamics CRM
- **Importación manual desde Dynamics** (nuevo 2026-01-27)
- Timeline de actividad

**Archivos:** 
- `src/components/prospectos/ProspectosManager.tsx`
- `src/components/prospectos/ManualImportTab.tsx` (nuevo)

**Ver:** [README_IMPORTACION_MANUAL.md](README_IMPORTACION_MANUAL.md)

---

### Importación Manual
**Definición:** Funcionalidad para buscar prospectos directamente en Dynamics CRM por número de teléfono.

**Implementación:** 27 de Enero 2026

**Características:**
- Búsqueda directa por teléfono (10 dígitos)
- Verificación automática de duplicados
- Advertencia visual si ya existe en BD local
- Visualización en 4 secciones (Personal, Ubicación, CRM, Datos)

**Edge Function:** `dynamics-lead-proxy`

**Acceso:** Admin, Admin Operativo, Coordinador Calidad

**Ver:** [README_IMPORTACION_MANUAL.md](README_IMPORTACION_MANUAL.md)

---

### Dynamics CRM Manager
**Definición:** Módulo administrativo para comparar y sincronizar prospectos con Dynamics CRM.

**Diferencia con Importación Manual:**
- **Dynamics CRM Manager:** Busca en local → compara con Dynamics
- **Importación Manual:** Busca directamente en Dynamics → verifica duplicados

**Características:**
- Comparación de datos local vs Dynamics
- Detección de discrepancias
- Reasignación de ejecutivos
- Sincronización de coordinaciones

**Ver:** [README_DYNAMICS_CRM.md](README_DYNAMICS_CRM.md)

---

### Permisos y Roles
**Definición:** Sistema de autorización granular basado en grupos de permisos.

**Arquitectura:**
- `auth_roles` - Roles base (admin, supervisor, etc.)
- `permissions` - Permisos atómicos (ver_prospectos, editar_usuarios, etc.)
- `permission_groups` - Agrupaciones de permisos
- `auth_user_permissions` - Permisos directos a usuarios
- `user_permission_groups` - Grupos asignados a usuarios

**Ver:** [PERMISSIONS_SYSTEM_README.md](PERMISSIONS_SYSTEM_README.md)

---

### Coordinaciones
**Definición:** Agrupaciones geográficas o funcionales de prospectos (ej: Monterrey, Guadalajara).

**Tabla principal:** `coordinaciones`

**Relación:** `auth_user_coordinaciones` (usuarios asignados a coordinaciones)

**Uso:** Filtrado de prospectos por región, asignaciones automáticas.

---

## Ver También

- [Índice de Documentación](INDEX.md) - Punto de entrada a toda la documentación
- [Arquitectura BD Unificada](NUEVA_ARQUITECTURA_BD_UNIFICADA.md) - Arquitectura actual
- [Seguridad](ARQUITECTURA_SEGURIDAD_2026.md) - Políticas de seguridad
- [Catálogo MCP](MCP_CATALOG.md) - Herramientas disponibles

---

**Mantenimiento:** Este glosario debe actualizarse cuando se agreguen nuevos términos técnicos al proyecto.
