# Handover: Fix Visualizacion Estado de Bloqueo WhatsApp

**Fecha:** 7 Marzo 2026
**Tipo:** Bugfix
**Estado:** Completado

## Problema

El campo `bloqueado_whatsapp` de la tabla `prospectos` no se reflejaba en la UI del modulo WhatsApp. Prospectos que habian bloqueado nuestro numero seguian mostrando "Reactivar con Plantilla" en lugar de un mensaje de contacto bloqueado.

## Root Cause (cadena de 3 bugs)

### Bug 1: RPC `get_dashboard_conversations` no incluia `bloqueado_whatsapp`
- Las 2 sobrecargas (6 y 7 params) no tenian el campo en RETURNS TABLE ni en SELECT
- `buildProspectosDataMap()` recibia `undefined` → lo convertia a `false`

### Bug 2: RPC `search_dashboard_conversations` tampoco lo incluia
- **Este fue el bug mas dificil de encontrar**
- La busqueda server-side (useEffect en `searchInServer`) usaba este RPC
- Al buscar un prospecto, `buildProspectosDataMap` creaba una nueva entrada con `bloqueado_whatsapp: false`
- Esta entrada **SOBREESCRIBIA** la correcta del batch load
- Deteccion: analisis de orden de keys en `Object.keys()` revelo que la entry venia de `buildProspectosDataMap`, no de `loadProspectosInBatches`

### Bug 3: `optimizedConversationsService.ts` no tenia el campo
- Interface `DashboardConversation` no incluia `bloqueado_whatsapp`
- `buildProspectosDataMap()` no mapeaba el campo

## Flujo de datos completo (ya corregido)

```
BD (prospectos.bloqueado_whatsapp)
  → RPC get_dashboard_conversations (RETURNS TABLE ... bloqueado_whatsapp boolean)
  → RPC search_dashboard_conversations (RETURNS TABLE ... bloqueado_whatsapp boolean)
  → optimizedConversationsService.buildProspectosDataMap()
  → prospectosDataRef.current.get(id).bloqueado_whatsapp
  → UI: panel rojo "Contacto bloqueado" | badge en header
```

Path legacy (batch query):
```
BD → analysisSupabase.from('prospectos').select('...bloqueado_whatsapp...')
  → loadProspectosInBatches → resultMap.set(id, { bloqueado_whatsapp: true })
  → prospectosDataRef
```

## Cambios Realizados

### Migraciones Supabase (3 RPCs actualizados)

1. **`get_dashboard_conversations` (2 sobrecargas)** - DROP + recreate
   - Agregado `bloqueado_whatsapp boolean` a RETURNS TABLE
   - Agregado `COALESCE(p.bloqueado_whatsapp, false) as bloqueado_whatsapp` a SELECT
   - `NOTIFY pgrst, 'reload schema'`

2. **`search_dashboard_conversations`** - DROP + recreate
   - Mismo cambio: `bloqueado_whatsapp boolean` en RETURNS TABLE + SELECT
   - `NOTIFY pgrst, 'reload schema'`

### Archivos Frontend

| Archivo | Cambio |
|---------|--------|
| `src/services/optimizedConversationsService.ts` | `bloqueado_whatsapp: boolean` en `DashboardConversation` interface + `buildProspectosDataMap()` |
| `src/components/chat/LiveChatCanvas.tsx` | Panel bloqueado (linea ~9731), auto-unblock on message (linea ~1779), types en `loadProspectosInBatches` (lineas 4327-4356), batch SELECT (linea 4364) |

### UI Agregada

1. **Panel "Contacto bloqueado"** (reemplaza "Reactivar con Plantilla"):
   - Fondo rojo gradiente con icono ShieldAlert
   - Texto: "Este prospecto ha bloqueado nuestro numero de WhatsApp"
   - Se muestra cuando `prospectosDataRef.current.get(id).bloqueado_whatsapp === true`

2. **Auto-unblock**: Cuando un prospecto envia mensaje (rol='Prospecto'), se limpia `bloqueado_whatsapp` en cache y BD

3. **Realtime**: Handler existente para `prospectos` UPDATE ya manejaba `bloqueado_whatsapp` changes

## Leccion Aprendida

- `prospectosDataRef` tiene **multiples fuentes de datos** que pueden sobreescribirse mutuamente
- El batch load (`loadProspectosInBatches`) carga datos correctos de la tabla `prospectos`
- Pero `searchInServer` → `buildProspectosDataMap` usa datos del RPC `search_dashboard_conversations` que NO tenia el campo
- **Clave de debugging**: El orden de `Object.keys()` en JS respeta orden de insercion. Comparar el orden de keys en el cache vs el codigo fuente revelo que la entry fue creada por `buildProspectosDataMap`, no por el batch function
- **Regla**: Al agregar un campo a `prospectos` que debe fluir al frontend WhatsApp, actualizar TODOS los RPCs: `get_dashboard_conversations` (2 overloads) + `search_dashboard_conversations`

## Stats

- **116 prospectos bloqueados** (108 uChat, 8 Twilio)
