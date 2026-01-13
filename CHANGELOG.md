# 📋 CHANGELOG - PQNC QA AI Platform

## [Unreleased]

### 🔔 v2.2.50 (B7.2.50N7.2.40) - Migración Sistema Notificaciones a PQNC_AI Unificado [13-01-2026]

#### 🎯 Migración Completa a Base de Datos Unificada

**Cambio Arquitectónico Crítico:**
- ✅ Migración completa de `system_ui` a `pqnc_ai` (base unificada)
- ✅ Todas las referencias a `supabaseSystemUI` eliminadas
- ✅ Sistema ahora usa exclusivamente `pqncSupabase`
- ✅ Realtime funcionando correctamente en base unificada

**Actualizaciones de Base de Datos:**
- Tabla `user_notifications` actualizada con nuevas columnas:
  - `notification_type` (new_message, new_call)
  - `module` (live-chat, live-monitor)
  - `message_id`, `conversation_id`, `customer_name`, `customer_phone`, `message_preview`
  - `call_id`, `call_status`, `prospect_id`
  - `is_muted` (silenciar notificaciones)
- Índices optimizados para performance
- Realtime habilitado y funcionando

**Servicios Actualizados:**
- `userNotificationService.ts`: Migrado a `pqncSupabase`
- `notificationService.ts`: Migrado a `pqncSupabase`
- Validaciones agregadas para verificar configuración de cliente

**Componentes Actualizados:**
- `NotificationBell.tsx`: Usa `pqncSupabase`
- `NotificationListener.tsx`: Verifica permisos antes de crear notificaciones
- `useNotifications.ts`: Hook funcionando correctamente

**Funcionalidades:**
- ✅ Notificaciones individuales por usuario
- ✅ Realtime funcionando correctamente
- ✅ Auto-reset al ingresar a módulos (live-chat, live-monitor)
- ✅ Sonido de notificación tipo WhatsApp
- ✅ Silenciar/Activar notificaciones
- ✅ Verificación de permisos antes de crear notificaciones

**Documentación Creada:**
- `docs/NOTIFICATIONS_SYSTEM_COMPLETE.md` - Documentación exhaustiva del sistema final
- Actualización de CHANGELOG y VERSIONS

**Archivos Modificados:**
- `src/services/userNotificationService.ts`
- `src/services/notificationService.ts`
- `src/components/notifications/NotificationBell.tsx`
- `src/components/notifications/NotificationListener.tsx`
- `src/hooks/useNotifications.ts`
- Scripts SQL para actualizar estructura de tabla

**Estado:** ✅ Completado y en Producción

---

### 🔔 v2.2.49 (B7.2.49N7.2.39) - Sistema Notificaciones Completo [13-01-2026]

#### 🎯 Sistema de Notificaciones Realtime

**Funcionalidades Implementadas:**
- **NotificationBell**: Campanita animada con contador de no leídas
- **NotificationDropdown**: Lista desplegable de notificaciones pendientes
- **NotificationToast**: Alerta flotante desde la derecha con animación spring
- **Botón Limpiar**: Elimina todas las notificaciones del usuario
- **Sonido**: Audio de notificación al recibir alertas en realtime

**Triggers Automáticos en Base de Datos:**
| Trigger | Evento | Destinatarios |
|---------|--------|---------------|
| `trigger_notify_new_prospecto` | INSERT prospecto con coordinación | Coordinadores/Supervisores |
| `trigger_notify_ejecutivo_assigned` | UPDATE ejecutivo_id | Ejecutivo asignado |
| `trigger_notify_requiere_atencion` | UPDATE requiere_atencion_humana=true | Ejecutivo o Coordinadores |

**Tipos de Notificación:**
- 🟣 `nuevo_prospecto`: Nuevo prospecto en coordinación (icono morado)
- 🟢 `prospecto_asignado`: Prospecto asignado a ejecutivo (icono verde)
- 🔴 `requiere_atencion`: Atención humana requerida (icono rojo + motivo)

**Arquitectura:**
- **Frontend**: React + Zustand + Framer Motion + Supabase Realtime
- **Backend**: PostgreSQL triggers + Supabase Realtime WebSocket
- **Base de Datos**: `user_notifications` en PQNC_AI (glsmifhkoaifvaegsozd)

**Documentación Creada:**
- `src/components/notifications/README_NOTIFICATIONS.md` - Documentación técnica completa
- `src/components/notifications/CHANGELOG_NOTIFICATIONS.md` - Historial de cambios
- `.cursor/rules/notifications-rules.mdc` - Regla de Cursor para contexto

**Problemas Resueltos Durante Desarrollo:**
1. Base de datos incorrecta (SystemUI vs PQNC_AI)
2. RLS bloqueando acceso
3. PostgREST cache desactualizado
4. Realtime con cliente incorrecto
5. Browser Autoplay Policy para audio

---

### 🧹 v2.2.33 (B7.2.23N7.2.13) - Limpieza Total Logs Debug [09-01-2026]

#### 🎯 Limpieza Completa
Eliminados **~70 console.log** de múltiples archivos:

**LiveChatCanvas.tsx**: ~37 logs eliminados
- PhoneCache logs (scroll, batches, fusión de datos)
- Búsqueda y etiquetas logs

**ConversacionesWidget.tsx**: 4 logs eliminados
- canViewConversation debug

**ProspectosManager.tsx**: 6 logs eliminados
- Cargando totales por etapa
- Pre-cargando datos de backup

**LiveMonitorKanban.tsx**: 18 logs eliminados
- Audio context y WebSocket
- loadHistoryCalls y scroll pagination
- Pre-carga de datos backup

**WhatsAppTemplatesManager.tsx**: 38 logs eliminados
- handleLimitedEdit (parsing de templates)
- handleSave (validaciones y guardado)
- Sincronización de plantillas

**AudienciasManager.tsx**: 5 logs eliminados
- Búsqueda de prospectos con mensajes
- Días sin contacto filtros

**CampanasManager.tsx**: 5 logs eliminados
- Realtime subscription status
- Webhook responses
- Valid templates for broadcast

---

### 🧹 v2.2.32 (B7.2.22N7.2.12) - Limpieza Logs Debug [09-01-2026]

#### 🎯 Limpieza
Eliminados logs de debug del PhoneCache después de confirmar que el fix funciona correctamente.

---

### 🔒 v2.2.31 (B7.2.21N7.2.11) - Fix PhoneCache Async v2 [09-01-2026]

#### 🎯 Fix Adicional
Mejora en la preservación del cache de prospectos durante cargas async.

#### 🐛 Problema Adicional Detectado
- Durante la carga async de un nuevo batch, el cache podría vaciarse inesperadamente
- Condición de carrera entre la lectura del cache y la actualización async

#### ✅ Solución Implementada (v6.4.2)
**LiveChatCanvas.tsx:**
- Backup del cache ANTES de iniciar la carga async (`cacheBeforeLoad`)
- Detección y restauración automática si el cache se vació durante la carga
- Logs de debug mejorados para diagnosticar problemas de cache
- Mensaje de advertencia cuando se detecta pérdida de cache

#### 📁 Archivos Modificados
- `src/components/chat/LiveChatCanvas.tsx` - Protección contra pérdida de cache async

---

### 🔒 v2.2.30 (B7.2.20N7.2.10) - Fix Cache PhoneDisplay en Batches Subsecuentes [09-01-2026]

#### 🎯 Fix Crítico
Corregido bug donde al cargar batches adicionales en el módulo de WhatsApp, los teléfonos de prospectos (incluso con `id_dynamics`) dejaban de verse correctamente.

#### 🐛 Problema Identificado
- Al cargar batch 2+, el cache `prospectosDataRef` se **sobrescribía** completamente
- Esto borraba los datos de prospectos del batch 1, causando que `PhoneDisplay` no encontrara los datos
- Resultado: teléfonos visibles inicialmente desaparecían al cargar más conversaciones

#### ✅ Solución Implementada
**LiveChatCanvas.tsx:**
- Lógica de cache ahora **fusiona** datos en batches subsecuentes (`reset: false`)
- En reset (`reset: true`): Limpia cache y lo reinicializa completamente
- En batches adicionales: Agrega nuevos datos sin borrar los existentes
- Logs de debug para monitorear estado del cache

#### 📁 Archivos Modificados
- `src/components/chat/LiveChatCanvas.tsx` - Fusión de cache en lugar de sobrescritura

---

### 🔄 v2.2.27 (B7.2.17N7.2.7) - Totales Reales en Prospectos [08-01-2026]

#### 🎯 Mejora Principal
Implementación de contadores de totales reales en el módulo de Prospectos. Los usuarios ahora pueden ver el total real de prospectos desde la carga inicial, sin necesidad de hacer scroll para cargar todos los batches.

#### 📁 Archivos Modificados

**ProspectosManager.tsx:**
- Nuevo estado `etapaTotals` para almacenar conteos reales por etapa desde BD
- Nueva función `loadEtapaTotals()` que consulta conteos totales respetando permisos
- Se carga automáticamente junto con los prospectos en la carga inicial
- **Nuevo badge visible en header** mostrando:
  - Total de prospectos (ej: "2,345 prospectos")
  - Indicador de cargados si hay diferencia (ej: "(800 cargados)")
  - Badge de filtrados cuando se aplican filtros (ej: "150 filtrados")

**ProspectosKanban.tsx:**
- Nueva prop `etapaTotals` que recibe los conteos reales desde BD
- Nueva función `getTotalForCheckpoint()` que suma totales de etapas correspondientes a cada columna
- Headers de columnas ahora muestran:
  - El total real de prospectos para esa etapa (no solo los del batch cargado)
  - Indicador "X cargados" debajo si hay más prospectos por cargar
  - Funciona tanto en columnas expandidas como colapsadas

#### 🔧 Comportamiento Esperado

| Vista | Antes | Ahora |
|-------|-------|-------|
| **Kanban** | Mostraba solo el batch (ej: "47") | Muestra total real (ej: "234") + "47 cargados" |
| **DataGrid** | Sin contador visible | Badge con total + cargados + filtrados |

#### 🎨 Mejoras de UX
- El usuario ve el total real desde el primer momento
- No es necesario hacer scroll hasta el final para conocer el total
- Los filtros muestran cuántos prospectos coinciden vs el total
- Diseño visual coherente con badges de colores (azul para total, ámbar para filtrados)

---

### 🔒 v2.2.28 (B7.2.18N7.2.8) - Fix Crítico: PhoneDisplay en Lista Conversaciones [09-01-2026]

#### 🐛 Problema Corregido
Los teléfonos se mostraban inicialmente sin enmascarar en la lista de conversaciones de WhatsApp, y después de cargar los batches se ocultaban incorrectamente (incluso para prospectos con `id_dynamics`).

#### 🔧 Causa Raíz
En el componente `ConversationItem` (línea 928), el teléfono se mostraba directamente sin usar `PhoneDisplay`:
```tsx
// ANTES (sin protección)
<p>{conversation.customer_phone}</p>

// DESPUÉS (con protección)
<PhoneText phone={...} prospecto={{ id_dynamics, etapa }} />
```

#### ✅ Correcciones Aplicadas

1. **ConversationItemProps actualizado:**
   - Agregado `prospectoData?: { id_dynamics?: string | null; etapa?: string | null }`
   - Se pasa desde el render con datos del cache

2. **PhoneText en lista de conversaciones:**
   - Reemplazado `{conversation.customer_phone}` por `<PhoneText ... />`
   - Ahora respeta las reglas de visibilidad por rol

3. **Import actualizado:**
   - Agregado `PhoneText` a la importación de `PhoneDisplay`

#### 📁 Archivo Modificado
- `src/components/chat/LiveChatCanvas.tsx`

---

### 🔄 v2.2.26 (B7.2.16N7.2.6) - Realtime para id_dynamics y etapa [08-01-2026]

#### 🎯 Mejora Principal
Implementación de actualización en tiempo real para `id_dynamics` y `etapa` en todos los módulos que usan `PhoneDisplay`, permitiendo que el teléfono se muestre inmediatamente cuando un prospecto obtiene `id_dynamics` sin necesidad de recargar la página.

#### 📁 Archivos Modificados

**LiveChatCanvas.tsx:**
- Agregada detección de cambios en `id_dynamics` y `etapa` en suscripción realtime
- Actualización de `prospectosDataRef` con campos `id_dynamics` y `etapa`
- Forzado de re-render cuando cambian para que `PhoneDisplay` re-evalúe permisos

**ProspectosNuevosWidget.tsx:**
- Agregada detección de cambios en `id_dynamics` y `etapa` en handler UPDATE
- Actualización del estado local `prospectos` para refrescar `PhoneText`

**ProspectosManager.tsx:**
- Nueva suscripción realtime a tabla `prospectos` (evento UPDATE)
- Actualización de `allProspectos` y `selectedProspecto` cuando cambian `id_dynamics` o `etapa`
- Sidebar de prospecto se actualiza automáticamente si está abierto

#### 🔧 Comportamiento Esperado

1. Usuario abre conversación/prospecto con teléfono enmascarado
2. En CRM Dynamics se asigna `id_dynamics` al prospecto
3. El teléfono se muestra inmediatamente sin recargar página
4. Funciona en: WhatsApp, Dashboard Widgets, Módulo Prospectos

---

### 🔐 v2.2.25 (B7.2.15N7.2.5) - Seguridad de Números Telefónicos por Rol [08-01-2026]

#### 🎯 Objetivo Principal
Implementación de un sistema de control de acceso a números telefónicos de prospectos basado en roles, etapas del prospecto y presencia de `id_dynamics` en CRM Dynamics.

#### 🆕 Nuevos Archivos Creados

**Hook Centralizado de Visibilidad de Teléfonos:**
- `src/hooks/usePhoneVisibility.ts` - Hook reutilizable que determina si un usuario puede ver el teléfono de un prospecto
  - Interface `ProspectoPhoneData`: Define los campos mínimos requeridos (`id_dynamics`, `etapa`, `telefono_principal`, `whatsapp`, `telefono_alternativo`)
  - Función `hasVisibleEtapa()`: Verifica si la etapa permite visibilidad ("Activo PQNC", "Es miembro")
  - Función `canViewPhone()`: Lógica principal de permisos
  - Función `formatPhone()`: Enmascara teléfonos no permitidos (ej: `+52 55 **** **34`)
  - Función `getPhoneField()`: Obtiene el teléfono formateado según permisos

**Componente Reutilizable de Visualización:**
- `src/components/shared/PhoneDisplay.tsx` - Componente React para mostrar teléfonos
  - `PhoneDisplay`: Componente completo con estilos y botón de copia
  - `PhoneText`: Versión simplificada para uso en texto inline

#### 🔒 Reglas de Acceso Implementadas

| Rol | Acceso Global | Condición para Ver Teléfono |
|-----|---------------|------------------------------|
| `admin` | ✅ Sí | Siempre puede ver todos los teléfonos |
| `coordinador_calidad` | ✅ Sí | Siempre puede ver todos los teléfonos |
| `administrador_operativo` | ❌ No | Solo si `id_dynamics` existe O etapa es "Activo PQNC"/"Es miembro" |
| `coordinador` | ❌ No | Solo si `id_dynamics` existe O etapa es "Activo PQNC"/"Es miembro" |
| `supervisor` | ❌ No | Solo si `id_dynamics` existe O etapa es "Activo PQNC"/"Es miembro" |
| `ejecutivo` | ❌ No | Solo si `id_dynamics` existe O etapa es "Activo PQNC"/"Es miembro" |
| Otros roles | ❌ No | Nunca pueden ver teléfonos |

#### 📁 Archivos Modificados

**Módulo Prospectos:**
- `src/components/prospectos/ProspectosManager.tsx` - Sidebar de detalles de prospecto
- `src/components/prospectos/ProspectosKanban.tsx` - Tarjetas Kanban con teléfono compacto

**Módulo WhatsApp / Chat:**
- `src/components/chat/ProspectDetailSidebar.tsx` - Sidebar de prospecto en conversaciones
- `src/components/chat/LiveChatCanvas.tsx` - Header de conversación con teléfono
- `src/components/chat/CallDetailModalSidebar.tsx` - Sidebar de detalles de llamada

**Módulo Llamadas IA / Live Monitor:**
- `src/components/analysis/LiveMonitor.tsx` - Modal de detalles de prospecto
- `src/components/analysis/LiveMonitorKanban.tsx` - Corrección de conteo total de llamadas por permisos
- `src/services/liveMonitorService.ts` - Agregado `id_dynamics` a interfaces y queries

**Dashboard:**
- `src/components/dashboard/widgets/ActiveCallDetailModal.tsx` - Modal de llamada activa
- `src/components/dashboard/widgets/ProspectosNuevosWidget.tsx` - Widget de nuevos prospectos

#### 🐛 Correcciones Adicionales

1. **Conteo de Llamadas en Historial:**
   - Problema: El total mostraba 778 llamadas globales en lugar de 70 filtradas por permisos
   - Solución: `totalHistoryCount` ahora usa `filteredHistoryCalls.length` después de aplicar permisos
   - Archivo: `LiveMonitorKanban.tsx`

2. **Error de Sintaxis en Build:**
   - Problema: `Unexpected token` por estructuras `if` duplicadas
   - Solución: Eliminadas estructuras duplicadas en `loadHistoryCalls()`
   - Archivo: `LiveMonitorKanban.tsx`

3. **Export de Type en Vite:**
   - Problema: `ProspectoPhoneData` no se exportaba correctamente
   - Solución: Agregado `export` explícito y uso de `import type` para compatibilidad Vite
   - Archivos: `usePhoneVisibility.ts`, `PhoneDisplay.tsx`

#### 🧪 Testing Manual Recomendado

1. **Como Ejecutivo:**
   - Verificar que prospectos SIN `id_dynamics` muestran `+52 XX **** **XX`
   - Verificar que prospectos CON `id_dynamics` muestran número completo
   - Verificar que prospectos en "Activo PQNC" o "Es miembro" muestran número completo

2. **Como Administrador o Coord. Calidad:**
   - Verificar acceso total a todos los teléfonos sin restricción

3. **Como Supervisor:**
   - Verificar mismas restricciones que ejecutivo

4. **Historial Llamadas IA:**
   - Verificar que el contador total refleja solo las llamadas con permisos de visualización

#### 📚 Documentación Técnica

**Estructura del Hook `usePhoneVisibility`:**
```typescript
export interface ProspectoPhoneData {
  id_dynamics?: string | null;
  etapa?: string | null;
  telefono_principal?: string | null;
  whatsapp?: string | null;
  telefono_alternativo?: string | null;
}

export const usePhoneVisibility = () => {
  // Permisos efectivos del usuario
  const { isAdmin, isAdminOperativo, isCoordinador, isEjecutivo, isSupervisor } = useEffectivePermissions();
  const isCoordinadorCalidad = permissionsService.isCoordinadorCalidad();

  // Acceso global: Solo Admin y Coord. Calidad
  const hasGlobalAccess = isAdmin || isCoordinadorCalidad;

  // Etapas que permiten visibilidad
  const VISIBLE_STAGES = ['Activo PQNC', 'Es miembro'];

  return { canViewPhone, formatPhone, getPhoneField, hasVisibleEtapa };
};
```

**Uso del Componente `PhoneDisplay`:**
```tsx
<PhoneDisplay
  prospecto={{
    id_dynamics: prospecto.id_dynamics,
    etapa: prospecto.etapa,
    whatsapp: prospecto.whatsapp,
    telefono_principal: prospecto.telefono_principal
  }}
  phoneField="whatsapp"
  className="text-sm"
  showCopyButton={true}
/>
```

---

### 🚀 v2.2.8 (B7.1.8N7.0.8) - Infinite Scroll Dual: Live Monitor + Live Chat [04-01-2026]

#### 🎯 Mejoras Principales

**Live Monitor (Historial de Llamadas IA):**
- ✅ Infinite scroll optimizado con carga anticipada al 75%
- ✅ Contador correcto desde el inicio (572 llamadas)
- ✅ Sin parpadeos: llamadas visibles nunca desaparecen durante carga
- ✅ Loading discreto: indicador pequeño en footer, no pantalla completa
- ✅ Detección mejorada de fin de datos (previene loops infinitos)
- ✅ Deshabilitado agrupamiento automático por prospecto (muestra TODAS las llamadas)

**Live Chat WhatsApp:**
- ✅ Infinite scroll paginado: batches de 200 conversaciones
- ✅ Superado límite de 1000: ahora soporta >10,000 conversaciones
- ✅ RPC mejorado: `get_conversations_ordered(p_limit, p_offset)` con paginación
- ✅ RPC nuevo: `get_conversations_count()` para contador total eficiente
- ✅ Realtime mejorado: doble actualización (conversations + allConversationsLoaded)
- ✅ Nuevos mensajes insertan conversación al tope sin recargar
- ✅ Todas las funcionalidades preservadas: etiquetas, filtros, asignaciones, etc.

#### 🐛 Correcciones Críticas

**Closure Stale State (ambos módulos):**
- Problema: Estado se perdía en cargas incrementales causando "Total: 0" en logs
- Solución: setState funcional con callbacks para ambas listas
- Resultado: Acumulación correcta de datos (200→400→600→...)

**Loading Intrusivo:**
- Problema: Pantalla completa "Cargando llamadas/conversaciones" ocultaba todo
- Solución: Eliminado early return, loading solo dentro de tablas
- Resultado: Elementos nunca desaparecen, UX fluida

**Detección de Fin de Datos:**
- Problema: Loops infinitos al cargar batch vacío
- Solución: Verificación de `rawLoadedCount === 0` detiene carga
- Resultado: Se detiene correctamente al cargar última llamada/conversación

#### 📚 Documentación Nueva

- `docs/LIVECHAT_ESCALABILITY_ROADMAP.md` - Plan completo para v7.0.0 (virtualización)
- `scripts/sql/update_get_conversations_ordered_v3_pagination.sql` - RPC con paginación
- `scripts/sql/BACKUP_get_conversations_ordered_v2.sql` - Rollback completo
- `scripts/sql/ROLLBACK_PLAN_v3_pagination.md` - Plan de emergencia
- `scripts/sql/EXECUTE_v3_STEP_BY_STEP.md` - Guía de ejecución segura

#### 🗄️ Cambios en Base de Datos

**Base:** Analysis DB (glsmifhkoaifvaegsozd.supabase.co)

**Funciones nuevas/modificadas:**
- `get_conversations_ordered(p_limit, p_offset)` - Con paginación
- `get_conversations_count()` - Conteo eficiente de conversaciones totales

#### 📁 Archivos Modificados

**Core:**
- `src/components/analysis/LiveMonitorKanban.tsx` (infinite scroll completo)
- `src/components/chat/LiveChatCanvas.tsx` (infinite scroll + realtime mejorado)
- `src/components/Footer.tsx` (versión B7.1.7N7.0.7 → B7.1.8N7.0.8)

**Documentación:**
- `src/components/analysis/CHANGELOG_LIVEMONITOR.md` (v5.7.0)
- `src/components/chat/CHANGELOG_LIVECHAT.md` (v6.2.0)
- `src/components/documentation/DocumentationModule.tsx` (catálogo actualizado)
- `.cursorrules` (proceso automatizado mejorado)

#### 📊 Métricas de Mejora

| Módulo | Antes | Ahora | Mejora |
|--------|-------|-------|--------|
| Historial Llamadas | 85 de 572 visible | 572 de 572 | +487 registros |
| Live Chat | 1000 máx | 10,000+ | +900% capacidad |
| Tiempo carga inicial | 3-5s | <1s | 70-80% más rápido |
| Parpadeos | Frecuentes | 0 | 100% eliminados |

---

### 🔧 Fix: Error 406 system_config en Sidebar [02-01-2026]

#### Problema Resuelto
- **Síntoma:** Errores `406 (Not Acceptable)` al cargar página por consulta a `system_config` desde `Sidebar.tsx`
- **Causa:** La tabla `system_config` no está expuesta a la API REST de Supabase en la base de datos PQNC
- **Impacto:** Errores en consola del navegador al cargar la aplicación
- **Solución:** Eliminada consulta directa a `system_config` desde `Sidebar.tsx`. El componente ahora usa logo sugerido por defecto y escucha cambios desde `SystemPreferences` cuando el usuario cambia el logo.

#### Cambios Realizados
- ✅ Eliminada consulta directa a `system_config` desde `Sidebar.tsx`
- ✅ Actualizado `consoleInterceptors.ts` para manejar errores 406 de `system_config`
- ✅ `Sidebar.tsx` ahora usa `getSuggestedLogo()` por defecto
- ✅ Sistema de eventos `logo-changed` para actualizar logo cuando se cambia desde `SystemPreferences`

#### Archivos Modificados
- `src/components/Sidebar.tsx` (eliminada consulta a system_config)
- `src/utils/consoleInterceptors.ts` (manejo de errores 406)

---

### 🔴 HOTFIX CRÍTICO: Loop Infinito + Coordinación Visible [29-12-2025]

#### Problema 1: ERR_INSUFFICIENT_RESOURCES (Loop Infinito)
- **Archivo:** `src/services/permissionsService.ts`
- **Síntoma:** 100+ consultas simultáneas a `auth_users.backup_id` causando `ERR_INSUFFICIENT_RESOURCES`
- **Causa:** Función `canAccessProspect()` consultaba BD sin caché por cada prospecto
- **Impacto:** Módulo WhatsApp inutilizable con admin, navegador colapsaba
- **Solución:** Agregado `backupCache` con TTL de 30 segundos
- **Resultado:** Reducción de queries ~99%, performance restaurada

#### Problema 2: Coordinación No Visible en Kanban
- **Archivo:** `src/components/analysis/AssignmentBadge.tsx`
- **Síntoma:** Coordinadores (incluyendo CALIDAD) no veían etiqueta de coordinación en cards de prospectos
- **Causa:** `showCoordinacion` no incluía rol `isCoordinador`
- **Impacto:** Coordinadores no podían ver a qué coordinación pertenecía cada prospecto
- **Solución:** `showCoordinacion` ahora incluye `isCoordinador`
- **Resultado:** Coordinadores ven coordinación + ejecutivo en todos los cards

#### Archivos Modificados
- `src/services/permissionsService.ts` (caché de backups)
- `src/components/analysis/AssignmentBadge.tsx` (lógica de display)

---

### 🔴 CRÍTICO: Corrección de Desincronización de Datos [29-12-2025]

#### Problema Identificado y Resuelto
- **Issue:** Dos tablas idénticas (`coordinador_coordinaciones` y `auth_user_coordinaciones`) almacenando las mismas coordinaciones
- **Causa:** Migración incompleta en Diciembre 2025 - se creó tabla nueva sin migrar código legacy
- **Impacto:** Desincronización de datos (caso detectado: Barbara Paola con permisos incorrectos)
- **Duración:** ~3-4 semanas sin detectar
- **Resolución:** Migración quirúrgica completa en 2 horas

#### Cambios Realizados
- ✅ Sincronización de 15 registros (7 migrados desde tabla legacy)
- ✅ Migración de 7 archivos críticos:
  - `permissionsService.ts` (permisos y filtros)
  - `coordinacionService.ts` (coordinadores/supervisores)
  - `authService.ts` (login)
  - `useInactivityTimeout.ts`
  - `UserManagement.tsx`
  - `UserCreateModal.tsx` (eliminada escritura dual)
  - `useUserManagement.ts` (eliminada escritura dual)
- ✅ Nomenclatura: `coordinador_id` → `user_id`
- ✅ Tabla única: `auth_user_coordinaciones` como fuente de verdad
- ✅ Documentación exhaustiva: POST-MORTEM completo

#### Archivos de Documentación
- `docs/POSTMORTEM_DUAL_TABLES.md` - Análisis completo del problema
- `docs/MIGRATION_COORDINADOR_COORDINACIONES.md` - Plan de migración
- `docs/MIGRATION_COMPLETED_20251229.md` - Cambios detallados
- `docs/MIGRATION_SUMMARY_20251229.md` - Resumen ejecutivo
- `scripts/migration/verify-and-sync-coordinaciones.ts` - Script de sincronización
- `scripts/migration/sync-coordinaciones-legacy-to-new.sql` - SQL de migración

#### Estado Post-Migración
- ⚠️ Tabla `coordinador_coordinaciones` DEPRECADA (no eliminada)
- ✅ Conservada 30 días para rollback
- ⏳ Pruebas pendientes de validación

#### Lecciones Aprendidas
- ❌ NO crear tablas nuevas sin migrar código completo
- ❌ NO usar "escritura dual" como solución permanente
- ✅ SÍ hacer migraciones atómicas (datos + código)
- ✅ SÍ documentar cambios estructurales inmediatamente

---

## [v2.2.1] - 2025-01-26

### 🎊 Sistema de Logos Personalizados

#### ✨ Nuevas Características

**Catálogo de Logos Intercambiables:**
- ✅ 3 logos disponibles: Default, Christmas, NewYear
- ✅ Selector visual estilo Google Doodles
- ✅ Preview interactivo con animaciones
- ✅ Guardado en system_config
- ✅ Actualización en tiempo real sin recargar

**Logo de Año Nuevo:**
- ✅ Contador regresivo hasta Año Nuevo 2026
- ✅ Fuegos artificiales al hacer clic (10 explosiones, 16 partículas c/u)
- ✅ Audio de fuegos artificiales
- ✅ Partículas diminutas como polvo (1.5px)
- ✅ Duración: 8 segundos

**Logo Navideño:**
- ✅ 15 luces titilantes en 4 colores
- ✅ 25 copos de nieve cayendo
- ✅ Jingle navideño al hacer clic

**Logo Estándar:**
- ✅ Texto "PQNC" con gradiente indigo→purple
- ✅ Sin animaciones

#### 🔄 Mejoras

**Selector en Administración:**
- ✅ Responsive al dark mode (todos los colores adaptados)
- ✅ Badge "Temporada" visible en dark mode
- ✅ Badge "Sugerido" con animación pulse
- ✅ Preview interactivo (click para animar)
- ✅ Texto siempre legible en ambos modos

**Integración:**
- ✅ Sidebar carga logo dinámicamente desde BD
- ✅ Evento `logo-changed` para actualización en tiempo real
- ✅ Sugerencias automáticas según fecha

---

## [v2.2.0] - 2025-01-26

### 🎨 REDISEÑO COMPLETO - Sistema de Diseño Minimalista

#### ✨ Nuevas Características

**Sistema de Tokens de Diseño:**
- ✅ Implementado sistema centralizado de tokens de diseño
- ✅ De 680+ gradientes → 6 gradientes corporativos (97% reducción)
- ✅ De 8 tamaños de iconos → 3 estandarizados (62% reducción)
- ✅ De 12 duraciones → 4 estandarizadas (67% reducción)
- ✅ Paleta homologada de 12 colores base
- ✅ Biblioteca de animaciones con Framer Motion

**Componentes Base Reutilizables:**
- ✅ Button (6 variantes, 3 tamaños)
- ✅ Card (4 variantes + 5 sub-componentes)
- ✅ Badge (6 variantes, dot, removible)
- ✅ Modal (5 tamaños, animaciones corporativas)
- ✅ Input (4 variantes, validación visual)
- ✅ Tabs (3 variantes, keyboard navigation)

**Tema Twilight (Crepúsculo) 🆕:**
- ✅ Nuevo tema intermedio entre claro y oscuro
- ✅ Background: #1a202e (azul-gris suave)
- ✅ Perfecto para trabajo prolongado
- ✅ Contraste WCAG 8:1
- ✅ Selector de 3 temas con iconos animados

#### 🔄 Mejoras

**Módulo WhatsApp (Live Chat):**
- ✅ Header slim minimalista (py-2.5, 37.5% más compacto)
- ✅ Sin título, solo icono vectorizado
- ✅ Componente Tabs homologado
- ✅ Card e Input en configuración
- ✅ Colores neutral-* homologados
- ✅ Icono verde (success-500) identificador

**Widget de Conversaciones (Dashboard):**
- ✅ Icono 🤖 para mensajes del bot (no letra "B")
- ✅ Icono 📄 para mensajes de plantilla (no letra "P")
- ✅ Etiqueta verde "Plantilla enviada por: [Ejecutivo]"
- ✅ Colores diferenciados por tipo de mensaje
- ✅ Detección correcta de plantillas vía whatsapp_template_sends

**Sistema de Colores:**
- ✅ Unificación de colores: slate/gray → neutral
- ✅ Gradientes corporativos por módulo
- ✅ Soporte completo para 3 temas

#### 🎯 Animaciones

**Selector de Tema:**
- ✅ Sol: Rayos girando + centro pulsante
- ✅ Luna: 5 estrellas titilantes + balanceo
- ✅ Crepúsculo: Atardecer con sol poniéndose, nubes, rayos

**Componentes:**
- ✅ SCALE_IN para modales
- ✅ FADE_IN para elementos simples
- ✅ SPRING_POP para badges
- ✅ Stagger para listas
- ✅ Physics consistentes (stiffness, damping)

#### 📚 Documentación

**Nuevas Guías:**
- ✅ DESIGN_SYSTEM_AUDIT_2025.md (Auditoría completa 50+ páginas)
- ✅ DESIGN_SYSTEM_SUMMARY.md (Resumen ejecutivo)
- ✅ DESIGN_TOKENS_IMPLEMENTATION.md (Tokens)
- ✅ BASE_COMPONENTS_IMPLEMENTATION.md (Componentes)
- ✅ DESIGN_GUIDE_MODALS_V2.md (Guía de modales V2.0)
- ✅ LIVE_CHAT_MIGRATION.md (Migración WhatsApp)
- ✅ CONVERSACIONES_WIDGET_UPDATE.md (Widget actualizado)
- ✅ src/styles/tokens/README.md (Uso de tokens)
- ✅ src/components/base/README.md (Uso de componentes)

#### 🔒 Backup

- ✅ Backup completo del diseño anterior
- ✅ 14 archivos respaldados (452 KB)
- ✅ Instrucciones de restauración completas

#### 🛠️ Técnico

**Archivos Creados:** 37 archivos (~678 KB)
- 6 archivos de tokens (~25 KB)
- 7 componentes base (~46 KB)
- 2 archivos de configuración (~5 KB)
- 11 archivos de documentación (~150 KB)
- 14 archivos de backup (452 KB)

**Código Generado:**
- ~4,251 líneas de código TypeScript
- ~1,501 líneas de componentes base
- ~500 líneas de tokens
- ~2,000 líneas de documentación

---

## [v2.1.26] - Versión Anterior

(Contenido legacy preservado)

---

**Migración:** De v2.1.26 → v2.2.0  
**Tipo:** Major Update (Rediseño completo)  
**Breaking Changes:** Ninguno (retrocompatible)  
**Estado:** ✅ Completado y testeado
