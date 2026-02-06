# Auditoría de Seguridad y Correcciones Aplicadas

**REF:** HANDOVER-2026-02-06-AUDITORIA-SEGURIDAD  
**Fecha:** 2026-02-06  
**Estado:** COMPLETADO - Correcciones aplicadas, compilación verificada

---

## 📋 Resumen Ejecutivo

Sesión de diagnóstico y corrección que abordó 3 problemas iniciales y derivó en una auditoría completa del codebase con correcciones categorizadas por prioridad.

### Problemas Diagnosticados y Resueltos

1. **`net::ERR_INSUFFICIENT_RESOURCES`** al cargar módulo WhatsApp → Implementado Promise Coalescing en `permissionsService.ts`
2. **`multi-db-proxy 400 Bad Request`** + `statement timeout` → Corregido forwarding de `count`/`head` en `pqncSecureClient.ts`, `logMonitorSecureClient.ts` y la Edge Function
3. **Auditoría completa** → ~15 correcciones aplicadas (P0-P2)

---

## 🔧 Cambios Aplicados (esta sesión de correcciones)

### P0 - CRÍTICO (Seguridad)

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `src/components/analysis/README_LIVEMONITOR.md` | Eliminadas 3 instancias de anon key JWT real, reemplazadas por referencia a `.env` |
| 2 | `src/components/chat/README.md` | Eliminadas 3 claves (anon + **service_role key** de SystemUI viejo), reemplazadas por referencia a `.env` |
| 3 | `src/services/prospectsService.ts` | Eliminado import muerto `analysisSupabaseAdmin` y comentario TODO obsoleto |
| 4 | `scripts/sql/create_coordinaciones_functions.sql` | Función `get_user_permissions` actualizada para usar `user_profiles_v2` en vez de `auth_users` (alinea script local con producción) |

### P1 - ALTO (Código confuso / Funcionalidad)

| # | Archivo | Cambio |
|---|---------|--------|
| 5 | `src/components/admin/AvatarUpload.tsx` | Eliminado alias `pqncSupabaseAdmin`, usa `supabaseSystemUI` directamente |
| 6 | `src/components/admin/UserManagement.tsx` | Eliminado alias `pqncSupabaseAdmin`, usa `supabaseSystemUI.storage` directamente |
| 7 | `src/components/admin/UserManagementV2/.../UserCreateModal.tsx` | Eliminado import duplicado con alias `pqncSupabaseAdmin` (no se usaba) |
| 8 | `src/services/pqncSecureClient.ts` | Eliminado import de `pqncSupabaseAdmin`/`pqncSupabase` (ambos sin uso). Eliminado método muerto `executeLocal()` (~50 líneas). Simplificado `execute()` a siempre usar Edge Function |
| 9 | `supabase/functions/secure-query/index.ts` | `ALLOWED_TABLES`: reemplazado `auth_users` → `user_profiles_v2` |
| 10 | `src/components/ai-models/README.md` | Corregida referencia a SupaClever (`rnhejbuubpbnojalljso`) → PQNC_AI |
| 11 | `src/components/chat/LiveChatCanvas.tsx` | Reducido polling de búsqueda de 600ms a 2000ms |
| 12 | `src/config/README.md` | Ejemplos actualizados: `auth_users` → `user_profiles_v2`. Sección SupaClever marcada como eliminada |

### P2 - MEDIO (Errores silenciosos)

| # | Archivo | Cambio |
|---|---------|--------|
| 13 | `src/services/assignmentService.ts` | **BUG FIX:** 4 catch blocks usaban `catch {` sin capturar error pero referenciaban `error instanceof Error` → siempre devolvían "Error desconocido". Corregido a `catch (error)` + `console.error` |
| 14 | `src/services/assignmentService.ts` | Agregado `console.warn` a 4 catch blocks adicionales de sincronización y logging |
| 15 | `src/services/prospectsService.ts` | Agregado `console.warn` a catch silencioso en filtro de coordinaciones |
| 16 | `src/services/liveMonitorService.ts` | Agregado `console.warn` a `autoFixFailedCalls().catch()` |
| 17 | `src/services/userNotificationService.ts` | Agregado `console.warn` a catch de verificación de mute status |
| 18 | `src/services/dynamicsReasignacionService.ts` | Agregado `console.warn` a 3 catch blocks de obtención de datos auxiliares |

---

## ⚠️ Pendientes (NO aplicados en esta sesión)

### Requiere Redeploy de Edge Functions

| Edge Function | Cambio pendiente | Notas |
|---------------|------------------|-------|
| `secure-query` | `ALLOWED_TABLES` actualizado localmente | Necesita `supabase functions deploy secure-query` |

### P1 - Pendientes de otras sesiones

| # | Descripción | Archivos |
|---|-------------|----------|
| 1 | Migrar `secure-query` de session_token a JWT nativo | `supabase/functions/secure-query/index.ts` |
| 2 | Corregir header incorrecto `livechat_auth` → `2025_livechat_auth` | `tools-proxy`, `transfer-request-proxy` |

### P2 - Catch vacíos restantes

Se identificaron ~90 catch vacíos en total. Se corrigieron los 15 más críticos (servicios). Quedan ~75 en componentes (la mayoría son JSON.parse fallbacks, localStorage, y UI no-crítica).

### P3 - Baja prioridad

| # | Descripción |
|---|-------------|
| 1 | Eliminar SupaClever MCP de `.cursor/cursor-settings.json` (contiene service_role key de proyecto ajeno) |
| 2 | Limpiar referencia `rnhejbuubpbnojalljso` en `ENV_VARIABLES_REQUIRED.md` y `SECURITY_REMEDIATION_PLAN_2025-12-23.md` |
| 3 | Archivo `mcp-supaclever-server.js` ya no se usa - candidato a eliminación |

---

## 🔍 Diagnósticos Previos (misma conversación)

### Fix 1: ERR_INSUFFICIENT_RESOURCES

**Archivo:** `src/services/permissionsService.ts`  
**Problema:** Race condition en cache de permisos → 40-60+ llamadas RPC simultáneas  
**Solución:** Promise Coalescing con Maps `inflightPermissions` e `inflightCalidad`  
**Estado:** ✅ Aplicado en sesión anterior

### Fix 2: multi-db-proxy 400 + statement timeout

**Archivos:** `pqncSecureClient.ts`, `logMonitorSecureClient.ts`, `supabase/functions/multi-db-proxy/index.ts`  
**Problema:** Parámetros `count: 'exact'` y `head: true` no se forwardeaban al proxy  
**Solución:** Incluir `count` y `head` en el body del request y procesarlos en la Edge Function  
**Estado:** ✅ Aplicado y desplegado (`multi-db-proxy` redeployeado)

---

## 📊 Verificación

```
✅ TypeScript compilation: 0 errores
✅ Linter: 0 errores en archivos modificados
✅ Import analysisSupabaseAdmin: 0 instancias en .ts/.tsx
✅ Alias pqncSupabaseAdmin: 0 instancias en .ts/.tsx
✅ Claves JWT en READMEs: Eliminadas
```

---

## 📁 Archivos Modificados (lista completa)

```
src/services/prospectsService.ts
src/services/pqncSecureClient.ts
src/services/assignmentService.ts
src/services/liveMonitorService.ts
src/services/userNotificationService.ts
src/services/dynamicsReasignacionService.ts
src/components/admin/AvatarUpload.tsx
src/components/admin/UserManagement.tsx
src/components/admin/UserManagementV2/components/UserCreateModal.tsx
src/components/chat/LiveChatCanvas.tsx
src/components/analysis/README_LIVEMONITOR.md
src/components/chat/README.md
src/components/ai-models/README.md
src/config/README.md
supabase/functions/secure-query/index.ts
scripts/sql/create_coordinaciones_functions.sql
```

---

## 📚 Documentación Relacionada

- [Auditoría Completa 2026-02-06](../../docs/AUDITORIA_COMPLETA_2026-02-06.md) - Hallazgos detallados
- [Análisis Edge Functions 404](2026-02-06-analisis-edge-functions-404.md) - Edge Functions con deploy corrupto
- [Security Rules](.cursor/rules/security-rules.mdc) - Reglas de seguridad vigentes
- [Arquitectura BD Unificada](.cursor/rules/arquitectura-bd-unificada.mdc) - Arquitectura actual

---

**Última actualización:** 2026-02-06
