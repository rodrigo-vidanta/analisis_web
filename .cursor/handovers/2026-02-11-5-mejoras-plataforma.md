# Handover: 5 Mejoras y Correcciones en la Plataforma

**Fecha:** 2026-02-11
**Sesión:** Continuación de sesión anterior (contexto extendido)
**Estado:** Todas las tareas completadas, pendiente deploy

---

## Resumen Ejecutivo

5 mejoras implementadas en la plataforma PQNC QA AI (ai.vidavacations.com):
1. Formato WhatsApp en mensajes del chat
2. Estadísticas de plantillas de reactivación (fix + RPC server-side)
3. Rol Marketing con grupo de permisos "copy"
4. Métricas de ventas en Dashboard con clasificación IA vs Asistida
5. Iniciales del remitente correcto en mensajes WhatsApp

---

## Tarea 1: Formato WhatsApp en Mensajes

### Problema
Los mensajes en el módulo WhatsApp se renderizaban como texto plano, sin interpretar `*bold*`, `_italic_`, `~strikethrough~`, `` ```monospace``` ``.

### Solución
- El formateador ya existía en `src/utils/whatsappTextFormatter.tsx`
- Se integró `renderWhatsAppFormattedText()` en todos los puntos de renderizado de mensajes en `LiveChatCanvas.tsx`

### Archivos modificados
- `src/components/chat/LiveChatCanvas.tsx` - Importar y usar `renderWhatsAppFormattedText`

---

## Tarea 2: Estadísticas de Plantillas de Reactivación

### Problema
El contador de envíos y porcentajes en el modal de reactivación no se actualizaban. El usuario veía datos estáticos (ej: reenganche_suave mostraba 364 envíos / 12.1% cuando la BD tenía 957 envíos / 16.2%).

### Root Cause
Supabase PostgREST tiene un **límite default de 1000 filas** por query. La tabla `whatsapp_template_sends` tenía 4,460+ registros. La query sin `.range()` solo retornaba los primeros 1,000, truncando datos de plantillas más recientes.

### Solución
Creación de RPC server-side `get_template_response_rates()` que agrega los datos en el servidor (retorna ~20 filas en lugar de 4,460+), eliminando completamente el problema del límite de filas.

### Migración BD
```sql
-- Migración: create_template_response_rates_rpc
CREATE OR REPLACE FUNCTION get_template_response_rates()
RETURNS TABLE (
  template_id uuid, total_sent bigint, total_replied bigint, reply_rate numeric
)
-- Agrega server-side, no tiene límite de filas
```

### Rating por estrellas (basado en % respuesta, NO número de envíos)
- >= 20% → 5 estrellas
- >= 15% → 4 estrellas
- >= 10% → 3 estrellas
- >= 5% → 2 estrellas
- > 0% → 1 estrella

### Archivos modificados
- `src/services/whatsappTemplatesService.ts` - `getTemplateResponseRates()` reescrito para usar RPC
- BD: función `get_template_response_rates()`

---

## Tarea 3: Rol Marketing con Grupo "Copy"

### Problema
No existía un rol Marketing ni un grupo de permisos para equipo de copy/campañas.

### Solución

**BD (migración):**
- Rol `marketing` en `auth_roles`
- Grupo `marketing_copy` en `permission_groups` (base_role: marketing, priority: 45)
- 7 permisos en `group_permissions`: campaigns.view/create/edit/export + support.view/create

**Frontend:**
- `permissionModules.ts`: 'marketing' en RoleBase, módulos `campaigns` y `support` en MODULE_CATALOG
- `useEffectivePermissions.ts`: `MARKETING_GROUPS = ['marketing_copy']`, flag `isMarketing`
- `UserManagementV2/types.ts`: 'marketing' en RoleName, entrada en ROLE_HIERARCHY
- `MainApp.tsx`: `(isAdmin || isMarketing)` para acceso a campaigns
- `Sidebar.tsx`: menú campaigns visible para marketing

### Acceso del rol Marketing
- Campañas: view, create, edit, export (NO delete - solo admin)
- Centro de Soporte: view, create

---

## Tarea 4: Métricas de Ventas en Dashboard (Clasificación IA)

### Problema
El widget "Ventas de Certificados" mostraba 125 ventas totales, pero 72 eran falsos positivos (solo plantilla enviada sin interacción). Las ventas no estaban clasificadas ni asignadas correctamente a coordinaciones.

### Reglas de Clasificación
| Tipo | Criterio |
|------|----------|
| **Venta IA** | Cliente inició conversación + AI respondió 3+ veces |
| **Venta Asistida** | (Cliente inició + AI 1-2 veces) O (Plantilla + cliente y vendedor respondieron) |
| **No contar** | Solo plantilla enviada, sin respuestas de nadie |

### Solución

**RPC `get_sales_conversation_stats(text[])`:**
- Analiza mensajes por prospecto: first_sender_role, ai_count, vendedor_count, prospecto_count, plantilla_count
- **Incluye `coordinacion_nombre`** (JOIN prospectos → coordinaciones) para resolver prospectos sin coordinación en crm_data

**Frontend (DashboardModule.tsx):**
- Tipos nuevos: `SaleType`, `SalesClassification`
- `loadCRMData()`:
  - Llama RPC para clasificar cada venta
  - `coordFallbackMap` se llena desde el RPC (campo `coordinacion_nombre`)
  - Solo acumula ventas contabilizables (venta_ia + venta_asistida) en byCoordinacion, byPeriod, categorías
  - Normaliza "COB ACA" → "COB Acapulco"
- Cards: muestran contabilizables, no totales brutos
- **Vista colapsada**: gráfica de barras horizontal compacta (barras stacked violeta/cyan por coordinación)
- **Vista expandida**: gráfica Recharts con barras agrupadas (violeta=IA, cyan=Asistida), leyenda, tooltip
- Modal detalle: solo muestra ventas contabilizables con badge de tipo (IA/Asistida)
- Resumen: 5 columnas (Contabilizables, Ventas IA, Asistidas, Monto, Ticket Promedio)

### Bug fix: Coordinaciones NULL en crm_data
- **Problema**: 18 registros en `crm_data` tenían `coordinacion = NULL`, aparecían como "Venta Asistida por IA"
- **Root cause**: `crm_data.coordinacion` no siempre se llena al importar datos CRM
- **Fix**: El RPC `get_sales_conversation_stats` ahora hace JOIN con `prospectos → coordinaciones` y retorna `coordinacion_nombre`
- **Resultado**: 18 prospectos correctamente asignados (5 MVP, 8 VEN, 3 APEX, 1 CALIDAD)

### Migraciones BD
1. `create_sales_conversation_stats_rpc` - Versión inicial (uuid[])
2. `fix_sales_conversation_stats_rpc_text_ids` - Fix: acepta text[], cast interno a uuid
3. `add_coordinacion_to_sales_stats_rpc` - Agrega coordinacion_nombre al resultado

---

## Tarea 5: Iniciales del Remitente Correcto

### Problema
Al enviar mensajes o plantillas, se mostraban las iniciales del propietario del prospecto en lugar del usuario que realmente envió el mensaje.

### Solución
- Verificado que `senderNamesMap[msg.id_sender]` es correcto
- Fix en mensajes realtime: cuando llega mensaje por Realtime con `rol = 'Vendedor'`, resolver nombre via `id_sender`
- Verificado que `triggered_by_user` se guarda correctamente al enviar plantillas

### Archivos modificados
- `src/components/chat/LiveChatCanvas.tsx`

---

## Migraciones BD Aplicadas (en orden)

| # | Nombre | Descripción |
|---|--------|-------------|
| 1 | `create_marketing_role_and_copy_group` | Rol marketing + grupo marketing_copy + 7 permisos |
| 2 | `create_sales_conversation_stats_rpc` | RPC clasificación ventas (uuid[]) |
| 3 | `fix_sales_conversation_stats_rpc_text_ids` | Fix: acepta text[], drop uuid[] |
| 4 | `create_template_response_rates_rpc` | RPC stats plantillas server-side |
| 5 | `add_coordinacion_to_sales_stats_rpc` | Agrega coordinacion_nombre al RPC ventas |

---

## Archivos Modificados (resumen)

| Archivo | Cambios |
|---------|---------|
| `src/components/chat/LiveChatCanvas.tsx` | Formato WhatsApp + fix iniciales remitente |
| `src/components/dashboard/DashboardModule.tsx` | Clasificación ventas, gráfica coordinaciones, vista compacta con barras |
| `src/services/whatsappTemplatesService.ts` | getTemplateResponseRates → RPC |
| `src/config/permissionModules.ts` | Rol marketing, módulos campaigns + support |
| `src/hooks/useEffectivePermissions.ts` | MARKETING_GROUPS, isMarketing |
| `src/components/admin/UserManagementV2/types.ts` | Marketing en RoleName + ROLE_HIERARCHY |
| `src/components/MainApp.tsx` | isMarketing acceso a campaigns |
| `src/components/Sidebar.tsx` | Menú campaigns para marketing |

---

## Estado de Deploy

- Build: PASA sin errores TypeScript
- **NO desplegado a producción** - pendiente autorización
- Todos los cambios de BD ya están aplicados (RPCs + migraciones)

---

## Notas Técnicas

1. **Supabase 1000-row limit**: Cualquier query que pueda retornar >1000 filas necesita `.range()` o mejor, un RPC server-side
2. **crm_data.coordinacion NULL**: No confiar en este campo - siempre usar fallback a `prospectos.coordinacion_id → coordinaciones.nombre`
3. **crm_data.prospecto_id es TEXT, prospectos.id es UUID**: El RPC hace el cast internamente con `unnest(p_prospecto_ids)::uuid`
4. **`CREATE OR REPLACE FUNCTION` no puede cambiar return type**: Usar `DROP FUNCTION` primero si cambia la firma
