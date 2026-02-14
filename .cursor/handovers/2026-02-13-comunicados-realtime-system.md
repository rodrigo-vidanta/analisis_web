# Handover: Sistema de Comunicados en Tiempo Real

**Fecha:** 2026-02-13
**Version:** v2.15.0 → v2.15.2
**Estado:** En produccion, primer comunicado activo

---

## Que se hizo

Se implemento un sistema completo de comunicados en tiempo real que permite al admin enviar avisos, tutoriales y anuncios a los usuarios de la plataforma. Los comunicados aparecen como overlay fullscreen y requieren confirmacion de lectura individual por usuario.

### Componentes creados

| Archivo | Proposito |
|---------|-----------|
| `sql/comunicados-schema.sql` | Schema SQL de referencia |
| `src/types/comunicados.ts` | Tipos, enums, presets, colores, registry interactivos |
| `src/services/comunicadosService.ts` | CRUD, targeting, Realtime subscription, `getReadIds()` |
| `src/stores/comunicadosStore.ts` | Zustand store: pending, current, overlay, readIds persistentes |
| `src/components/comunicados/ComunicadoOverlay.tsx` | Overlay z-[60] con registry de componentes lazy |
| `src/components/comunicados/ComunicadoCard.tsx` | Card presentacional (icon, badge, body, bullets, markdown basico) |
| `src/components/comunicados/tutorials/UtilityTemplateTutorial.tsx` | Tutorial animado 4 pasos sobre plantilla utility |
| `src/components/admin/ComunicadosManager.tsx` | Panel admin: lista, editor, preview, targeting, icon picker |
| `.claude/skills/comunicado/SKILL.md` | Skill para crear comunicados desde CLI |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/admin/AdminDashboardTabs.tsx` | Tab "Comunicados" (solo admin) con Megaphone icon |
| `src/components/MainApp.tsx` | useEffect para cargar pendientes + Realtime, overlay en 3 layouts |
| `CLAUDE.md` | Regla: usar `/comunicado` cuando pidan avisos/comunicados/tutoriales |

---

## Base de datos

### Tabla `comunicados`
- `id`, `titulo`, `subtitulo`, `contenido` (JSONB), `tipo`, `prioridad` (0-10)
- `is_interactive`, `component_key` (para tutoriales animados)
- `target_type` (todos/coordinacion/usuarios/roles) + `target_ids` (text[])
- `estado` (borrador/activo/archivado), `published_at`, `expires_at`
- `created_by`, `read_count`, `target_count`

### Tabla `comunicado_reads`
- PK compuesta: (`comunicado_id`, `user_id`) + `read_at`
- FK a comunicados con CASCADE delete

### RLS
- **SELECT**: authenticated ve activos + sus propios borradores
- **INSERT/UPDATE/DELETE**: solo admin (`role_name = 'admin'` via user_profiles_v2)
- **comunicado_reads INSERT**: solo `user_id = auth.uid()`
- **comunicado_reads SELECT**: propias lecturas + admin ve todo
- **REVOKE ALL de anon**: ambas tablas + RPC

### RPC `mark_comunicado_read(p_comunicado_id, p_user_id)`
- SECURITY DEFINER con validacion interna de `auth.uid()`
- INSERT ON CONFLICT DO NOTHING en comunicado_reads
- UPDATE read_count via COUNT

### Realtime
- `comunicados` esta en `supabase_realtime` publication

---

## Arquitectura del flujo

```
Admin crea comunicado (ComunicadosManager o /comunicado skill)
    ↓
INSERT en tabla comunicados (estado='activo', published_at=NOW())
    ↓
Supabase Realtime dispara evento a todos los clientes conectados
    ↓
MainApp.tsx: callback de subscribeToNewComunicados
    ↓
comunicadosStore.addComunicado: check readIds (BD + local) → check targeting
    ↓
Si aplica al usuario y no lo ha leido: agrega a pendingComunicados → showNext
    ↓
ComunicadoOverlay se muestra (z-[60])
    ↓
Si is_interactive: lazy load del componente desde INTERACTIVE_REGISTRY
Si simple: renderizar ComunicadoCard
    ↓
Usuario hace clic en "Entendido"
    ↓
markCurrentAsRead: agrega a readIds → remueve de pending → RPC mark_comunicado_read
    ↓
showNext (siguiente comunicado) o cierra overlay
```

---

## Bugs corregidos

### v2.15.1 - Loop de Realtime al marcar como leido

**Problema:** La RPC `mark_comunicado_read` hace `UPDATE comunicados SET read_count = ...`, lo que dispara Realtime. `addComunicado` re-agregaba el comunicado porque ya habia sido removido de pending.

**Solucion:** Se agrego `readIds: Set<string>` al store. Al marcar como leido, el ID se registra en el Set ANTES de llamar al servicio. `addComunicado` verifica contra readIds y lo ignora.

### v2.15.2 - Comunicados reaparecen tras token refresh

**Problema:** Cuando el token JWT se refrescaba, `isAuthenticated` parpadeaba a `false`, ejecutando `clearComunicados()` que vaciaba `readIds`. Luego `loadPending` filtraba correctamente desde BD, pero el nuevo Realtime subscription recibia UPDATE events (de otros usuarios leyendo) y `addComunicado` los re-agregaba porque `readIds` estaba vacio.

**Solucion (2 cambios):**
1. **`loadPending` ahora popula `readIds` desde BD** - Hace `Promise.all` de `getComunicadosPendientes` + `getReadIds(userId)`. Los IDs de BD se mergean con los locales. Asi Realtime siempre tiene la lista completa de leidos.
2. **No se limpia `readIds` en parpadeos de auth** - Se elimino `clearComunicados()` del branch `!isAuthenticated` en MainApp. Ahora simplemente hace early return. Los readIds persisten durante toda la sesion.

---

## Comunicados activos

| ID | Titulo | Tipo | Target |
|----|--------|------|--------|
| `1d51cb66-...` | Nueva plantilla: Seguimiento de Contacto | tutorial interactivo | todos |
| `67a1bc89-...` | (creado desde panel admin) | - | - |

---

## Skill `/comunicado`

Registrada en `.claude/skills/comunicado/SKILL.md`. Soporta:
- **Simples:** solo INSERT en BD, no requiere deploy
- **Interactivos:** crear componente React + registrar en overlay + deploy + INSERT

Preguntas automaticas si no se especifican:
1. Tipo (simple vs interactivo)
2. Categoria (info/feature/tutorial/mantenimiento/urgente)
3. Audiencia (todos/coordinacion/roles/usuarios)
4. Prioridad
5. Contenido

Admin user ID para created_by: `e8ced62c-3fd0-4328-b61a-a59ebea2e877`

---

## Notas para futuras sesiones

- Los comunicados simples NO requieren deploy (solo SQL INSERT)
- Los interactivos SI requieren deploy (nuevo componente React + registro en overlay)
- El panel admin esta en AdminDashboardTabs → tab "Comunicados" (solo admin)
- Para agregar nuevos tutoriales interactivos: crear en `tutorials/`, registrar en `ComunicadoOverlay.tsx` INTERACTIVE_REGISTRY y en `comunicados.ts` INTERACTIVE_COMUNICADOS
- El overlay esta en z-[60], debajo de ForceUpdateModal (z-[70])
- Targeting se filtra en service layer (no en SQL) porque usa coordinacion_id y role_name del user
- `readIds` se popula desde BD en cada `loadPending` y se mergea con los locales - NUNCA se limpia excepto en logout
- Cada vez que un usuario lee un comunicado, `read_count` se actualiza via RPC, lo que dispara Realtime - pero `readIds` lo bloquea
