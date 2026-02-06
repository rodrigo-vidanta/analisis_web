# Auditoría de Permisos - PQNC QA AI Platform

**REF:** HANDOVER-2026-02-06-AUDITORIA-PERMISOS  
**Fecha:** 2026-02-06  
**Estado:** AUDITORÍA COMPLETADA — 12 vulnerabilidades identificadas, remediación pendiente

---

## 📋 Resumen Ejecutivo

Se realizó una auditoría profunda del sistema de permisos de la plataforma, revisando todos los módulos operativos, sidebars, widgets, modales y servicios. El objetivo fue verificar que los 4 roles operativos (Ejecutivo, Supervisor, Coordinador, Coordinador Calidad) no puedan ver datos de coordinaciones ajenas.

**Resultado:** Se encontraron **12 vulnerabilidades** donde queries a la base de datos no aplican filtros de permisos, permitiendo potencialmente fuga de datos entre coordinaciones. La infraestructura base (auth nativa, permissionsService, ProtectedRoute) es sólida, pero hay puntos donde no se invoca.

---

## 📊 Roles Auditados

| Rol | Acceso esperado | Filtro principal |
|-----|-----------------|------------------|
| **Ejecutivo** | Solo sus prospectos + backups asignados | `ejecutivo_id = userId` + `coordinacion_id` |
| **Supervisor** | Todos los de su coordinación | `coordinacion_id IN (sus coordinaciones)` |
| **Coordinador** | Todos los de su coordinación | `coordinacion_id IN (sus coordinaciones)` |
| **Coordinador Calidad** | Todas las coordinaciones | Sin filtro (acceso completo) |
| Admin / Admin Operativo | Todo | Sin filtro |

---

## 🏗️ Arquitectura de Permisos Verificada

### Infraestructura (CORRECTA)

| Componente | Estado | Detalles |
|------------|--------|---------|
| Auth nativa Supabase | ✅ | Login con `supabase.auth.signInWithPassword()` |
| `user_profiles_v2` | ✅ | VIEW sobre `auth.users` (no tabla custom) |
| `permissionsService.ts` | ✅ | `applyProspectFilters()`, `applyCallFilters()`, `applyConversationFilters()` |
| `AuthContext.tsx` | ✅ | `hasPermission()`, `canAccessModule()`, `ProtectedRoute` |
| `useEffectivePermissions` | ✅ | Considera rol base + grupos de permisos |
| `useNinjaAwarePermissions` | ✅ | Considera modo ninja (suplantación) |
| `Sidebar.tsx` | ✅ | Usa `canAccessModule()` para mostrar/ocultar módulos |
| `MainApp.tsx` | ✅ | `ProtectedRoute` en rutas principales |
| Tabla `auth_users` custom | ✅ | NO se usa para login/session (migración completa) |

### Servicios de filtrado

| Función | Ubicación | Estado |
|---------|-----------|--------|
| `getCoordinacionesFilter(userId)` | `permissionsService.ts` | ✅ Retorna array de coordinaciones o null (admin) |
| `getEjecutivoFilter(userId)` | `permissionsService.ts` | ✅ Retorna userId si es ejecutivo, null si no |
| `isCoordinadorCalidad(userId)` | `permissionsService.ts` | ✅ Verifica código 'CALIDAD' en coordinaciones |
| `applyProspectFilters(query, userId)` | `permissionsService.ts` | ✅ Aplica filtros a queries de prospectos |
| `applyCallFilters(query, userId)` | `permissionsService.ts` | ✅ Aplica filtros a queries de llamadas |
| `applyConversationFilters(query, userId)` | `permissionsService.ts` | ✅ Aplica filtros a queries de conversaciones |
| `canUserAccessProspect(userId, prospectId)` | `permissionsService.ts` | ✅ Verifica acceso individual |

---

## 🔴 Vulnerabilidades Encontradas

### SEVERIDAD ALTA (7 vulnerabilidades)

#### 1. `ProspectDetailSidebar.tsx` → `loadProspectData()`
- **Problema:** Carga prospecto por ID sin validar permisos
- **Línea:** ~173
- **Impacto:** Un usuario con el `prospectoId` puede ver detalle completo de cualquier prospecto de cualquier coordinación
- **Corrección:** Agregar `canUserAccessProspect()` antes de cargar

#### 2. `ProspectDetailSidebar.tsx` → `loadCallHistory()`
- **Problema:** Carga historial de llamadas sin validar permisos
- **Línea:** ~235
- **Impacto:** Expone historial de llamadas de cualquier prospecto
- **Corrección:** Validar acceso al prospecto antes de cargar llamadas

#### 3. `ProspectDetailSidebar.tsx` → `loadWhatsAppConversations()`
- **Problema:** Consulta `uchat_conversations` sin filtros de permisos
- **Línea:** ~272
- **Impacto:** Expone conversaciones WhatsApp de cualquier prospecto
- **Corrección:** Validar acceso al prospecto antes de cargar conversaciones

#### 4. `LiveChatCanvas.tsx` → `loadConversationsFromMessages()`
- **Problema:** Carga TODAS las conversaciones sin filtros (consulta todos los `prospecto_id` distintos en `mensajes_whatsapp`)
- **Línea:** ~3420
- **Impacto:** Expone todas las conversaciones de la plataforma
- **Corrección:** Aplicar `applyConversationFilters()` o filtrar por coordinación/ejecutivo

#### 5. `ImportWizardModal.tsx` → `searchLocalProspect()`
- **Problema:** Busca prospectos por teléfono sin filtros de permisos
- **Línea:** ~380
- **Impacto:** Puede encontrar y ver datos de prospectos de cualquier coordinación
- **Corrección:** Aplicar `applyProspectFilters()` o verificar acceso post-búsqueda

#### 6. `QuickImportModal.tsx` → `searchLocalProspect()`
- **Problema:** Busca prospectos por teléfono sin filtros de permisos
- **Línea:** ~119
- **Impacto:** Puede encontrar prospectos de cualquier coordinación
- **Corrección:** Aplicar `applyProspectFilters()` o verificar acceso post-búsqueda

#### 7. `prospectsService.ts` → `searchProspectByPhoneVariation()`
- **Problema:** Busca por teléfono exacto sin filtros
- **Línea:** ~197
- **Impacto:** Encuentra prospectos de cualquier coordinación por teléfono
- **Corrección:** Aplicar filtros si hay `userId` disponible

### SEVERIDAD MEDIA (3 vulnerabilidades)

#### 8. `CallDetailModalSidebar.tsx` → `loadCallDetail()`
- **Problema:** Carga detalle de llamada sin validar permisos (valida prospecto pero permite ver la llamada)
- **Línea:** ~138
- **Impacto:** Puede ver análisis de llamada de otra coordinación
- **Corrección:** Validar acceso antes de cargar `call_analysis_summary` y `llamadas_ventas`

#### 9. `AnalysisIAComplete.tsx` → `loadMetrics()`
- **Problema:** Calcula métricas (duración promedio, tasa de éxito) sobre TODAS las llamadas sin filtros
- **Línea:** ~1290
- **Impacto:** Métricas globales visibles para cualquier rol
- **Corrección:** Aplicar `applyCallFilters()` antes de calcular

#### 10. `LiveChatCanvas.tsx` → Inconsistencia fix 2026-02-04 vs Realtime
- **Problema:** Fix omite verificación de coordinación para ejecutivos en carga inicial, pero realtime SÍ la verifica
- **Líneas:** ~4202 (carga) vs ~2142 (realtime)
- **Impacto:** Comportamiento inconsistente: ejecutivo ve conversaciones en carga pero no recibe mensajes nuevos en realtime
- **Corrección:** Unificar lógica (aplicar misma regla en ambos)

### SEVERIDAD BAJA (2 vulnerabilidades)

#### 11. `DynamicsCRMManager.tsx` → `searchProspectos()`
- **Problema:** Búsqueda de prospectos sin filtros de permisos
- **Línea:** ~249
- **Impacto:** Bajo (módulo admin con acceso restringido), pero no filtra por coordinación
- **Corrección:** Aplicar filtros según rol del usuario

#### 12. `LiveChatCanvas.tsx` → Queries directas a `mensajes_whatsapp`
- **Problema:** Múltiples queries por `prospecto_id` sin verificar acceso previo
- **Líneas:** ~1608, ~2334, ~3061, ~5065, ~5508
- **Impacto:** Si el usuario tiene un `prospecto_id`, puede cargar mensajes
- **Corrección:** Verificar `canUserAccessProspect()` antes de queries por ID

---

## ✅ Módulos Correctamente Protegidos

| Módulo | Componente | Estado |
|--------|-----------|--------|
| Dashboard - Prospectos Nuevos | `ProspectosNuevosWidget` | ✅ Usa `prospectsService` con filtros |
| Dashboard - Conversaciones | `ConversacionesWidget` | ✅ Aplica `ejecutivoFilter` + `coordinacionesFilter` |
| Dashboard - Llamadas Activas | `LlamadasActivasWidget` | ✅ Usa `canUserSeeCall()` en realtime |
| Dashboard - Llamadas Programadas | `LlamadasProgramadasWidget` | ✅ Usa `scheduledCallsService` con filtros |
| Prospectos lista principal | `ProspectosManager` | ✅ Usa `applyProspectFilters()` |
| Programación de Llamadas | `ScheduledCallsManager` | ✅ `scheduledCallsService.getScheduledCalls()` filtra |
| LiveMonitor (Llamadas IA) | `LiveMonitorKanban` | ✅ `liveMonitorService.getActiveCalls()` filtra |
| LiveChatCanvas filtrado principal | `LiveChatCanvas` | ✅ Filtra uchat + whatsapp por rol |
| LiveChatAnalytics | `LiveChatAnalytics` | ✅ Aplica filtros antes de queries |
| Importación validación Dynamics | `ImportWizardModal` | ✅ `validateDynamicsLeadPermissions()` compara coordinación |
| Sidebar navegación | `Sidebar` | ✅ Usa `canAccessModule()` |
| Rutas protegidas | `MainApp` → `ProtectedRoute` | ✅ Guards en rutas principales |

---

## 🗺️ Mapa Visual de Riesgos

```
Módulo Prospectos
├── Lista principal .................. ✅ PROTEGIDO
├── ProspectDetailSidebar ............ ❌ SIN VALIDACIÓN (vuln #1, #2, #3)
├── Importar (ImportWizard) .......... ❌ Búsqueda sin filtros (vuln #5)
├── Importar (QuickImport) ........... ❌ Búsqueda sin filtros (vuln #6)
└── DynamicsCRM ...................... ⚠️ Búsqueda sin filtros (vuln #11)

Módulo WhatsApp
├── LiveChatCanvas filtrado .......... ✅ PROTEGIDO
├── LiveChatCanvas mensajes .......... ⚠️ Queries por ID sin verificar (vuln #12)
├── loadConversationsFromMessages .... ❌ SIN FILTROS (vuln #4)
├── LiveChatAnalytics ................ ✅ PROTEGIDO
└── Realtime ......................... ⚠️ Inconsistente con fix (vuln #10)

Módulo Llamadas IA / Análisis
├── LiveMonitorKanban ................ ✅ PROTEGIDO
├── AnalysisIAComplete calls ......... ✅ PROTEGIDO
├── AnalysisIAComplete metrics ....... ❌ SIN FILTROS (vuln #9)
└── CallDetailModalSidebar ........... ⚠️ Parcial (vuln #8)

Dashboard Inicio
├── Prospectos Nuevos ................ ✅ PROTEGIDO
├── Conversaciones ................... ✅ PROTEGIDO
├── Llamadas Activas ................. ✅ PROTEGIDO
└── Llamadas Programadas ............. ✅ PROTEGIDO

Servicios
├── prospectsService.searchProspects .. ✅ PROTEGIDO
├── prospectsService.findByPhone ..... ⚠️ Parcial (vuln #7)
├── scheduledCallsService ............ ✅ PROTEGIDO
└── liveMonitorService ............... ✅ PROTEGIDO
```

---

## 🔧 Plan de Remediación

### Prioridad 1 — Alta (bloquean fuga de datos)

| # | Archivo | Acción | Complejidad |
|---|---------|--------|-------------|
| 1-3 | `ProspectDetailSidebar.tsx` | Agregar `canUserAccessProspect()` al inicio de `loadProspectData()`, y condicionar `loadCallHistory()` y `loadWhatsAppConversations()` al resultado | Baja |
| 4 | `LiveChatCanvas.tsx` | Aplicar filtros en `loadConversationsFromMessages()` usando `getCoordinacionesFilter()` + `getEjecutivoFilter()` | Media |
| 5-6 | `ImportWizardModal.tsx` + `QuickImportModal.tsx` | Agregar verificación post-búsqueda con `canUserAccessProspect()` o aplicar filtros en query | Baja |

### Prioridad 2 — Media

| # | Archivo | Acción | Complejidad |
|---|---------|--------|-------------|
| 7 | `prospectsService.ts` | Aplicar filtros en `searchProspectByPhoneVariation()` si hay userId | Baja |
| 8 | `CallDetailModalSidebar.tsx` | Validar acceso al prospecto ANTES de cargar llamada | Baja |
| 9 | `AnalysisIAComplete.tsx` | Aplicar filtros de permisos en `loadMetrics()` | Media |

### Prioridad 3 — Baja

| # | Archivo | Acción | Complejidad |
|---|---------|--------|-------------|
| 10 | `LiveChatCanvas.tsx` | Unificar lógica fix 2026-02-04 entre carga y realtime | Baja |
| 11 | `DynamicsCRMManager.tsx` | Aplicar filtros según rol (ya es módulo admin) | Baja |
| 12 | `LiveChatCanvas.tsx` | Agregar `canUserAccessProspect()` antes de queries por `prospecto_id` | Media |

---

## 🔍 Verificación de Migración auth.users

| Aspecto | Estado | Detalles |
|---------|--------|---------|
| Login | ✅ Migrado | `supabase.auth.signInWithPassword()` |
| Sesiones | ✅ Migrado | `supabase.auth.getSession()` |
| Logout | ✅ Migrado | `supabase.auth.signOut()` |
| Carga de usuario | ✅ Migrado | VIEW `user_profiles_v2` sobre `auth.users` |
| Permisos | ✅ Migrado | `permissionsService` usa `user_profiles_v2` y RPCs |
| Escrituras | ✅ Migrado | Edge Function `auth-admin-proxy` |
| Tabla `auth_users` custom | ✅ No se usa | Migración completada a `auth.users` nativa |
| Inconsistencias | ⚠️ Menor | Comentarios obsoletos en `supabaseSystemUI.ts` y `README.md` |

---

## 📁 Archivos Afectados

### Requieren corrección (por prioridad)

```
src/components/chat/ProspectDetailSidebar.tsx     # P1 — vulns 1,2,3
src/components/chat/LiveChatCanvas.tsx             # P1 — vulns 4,10,12
src/components/chat/ImportWizardModal.tsx           # P1 — vuln 5
src/components/chat/QuickImportModal.tsx            # P1 — vuln 6
src/services/prospectsService.ts                    # P2 — vuln 7
src/components/chat/CallDetailModalSidebar.tsx      # P2 — vuln 8
src/components/analysis/AnalysisIAComplete.tsx      # P2 — vuln 9
src/components/admin/DynamicsCRMManager.tsx         # P3 — vuln 11
```

### Correctos (no requieren cambios)

```
src/services/permissionsService.ts                  # ✅ Base sólida
src/services/authService.ts                         # ✅ Auth nativa
src/contexts/AuthContext.tsx                         # ✅ Guards correctos
src/components/MainApp.tsx                          # ✅ ProtectedRoute
src/components/Sidebar.tsx                          # ✅ canAccessModule
src/components/prospectos/ProspectosManager.tsx      # ✅ applyProspectFilters
src/components/dashboard/widgets/*.tsx               # ✅ Filtros aplicados
src/components/scheduled-calls/ScheduledCallsManager.tsx  # ✅ Filtros
src/components/analysis/LiveMonitorKanban.tsx        # ✅ Filtros
src/components/chat/LiveChatAnalytics.tsx            # ✅ Filtros
src/services/liveMonitorService.ts                  # ✅ Filtros
src/services/scheduledCallsService.ts               # ✅ Filtros
```

---

## ⚠️ Nota sobre el Fix 2026-02-04

El fix en `LiveChatCanvas.tsx` que omite verificación de coordinación para ejecutivos tiene lógica válida:

> "Un ejecutivo puede tener prospectos de diferentes coordinaciones asignados explícitamente. La asignación de `ejecutivo_id` es la fuente de verdad, NO la coordinación."

Sin embargo, esta misma lógica NO se aplica en:
- Handler de realtime de `LiveChatCanvas` (sí verifica coordinación)
- `ConversacionesWidget` (sí verifica coordinación)

**Decisión requerida:** ¿`ejecutivo_id` es la fuente de verdad universal, o solo en WhatsApp?  
Si es universal → aplicar en todos los filtros de ejecutivo  
Si es solo WhatsApp → documentar la excepción

---

## 🏁 Próximos Pasos

1. **Decidir** si se implementan las correcciones en esta sesión o en sesión dedicada
2. **Prioridad 1** puede resolverse en ~1-2 horas (son validaciones simples)
3. **Testing** manual: probar con cuenta de Ejecutivo que un `prospectoId` de otra coordinación no cargue datos
4. **Deploy** con los fixes incluidos

---

**Auditoría realizada por:** AI Assistant  
**Fecha:** 2026-02-06  
**Versión de la plataforma auditada:** v2.5.89+
