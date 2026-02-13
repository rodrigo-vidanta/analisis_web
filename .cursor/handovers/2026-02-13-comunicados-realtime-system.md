# Handover: Sistema de Comunicados en Tiempo Real

**Fecha:** 2026-02-13
**Version:** v2.15.0 → v2.15.1 (hotfix Realtime loop)
**Estado:** En produccion, primer comunicado activo

---

## Que se hizo

Se implemento un sistema completo de comunicados en tiempo real que permite al admin enviar avisos, tutoriales y anuncios a los usuarios de la plataforma. Los comunicados aparecen como overlay fullscreen y requieren confirmacion de lectura.

### Componentes creados

| Archivo | Proposito |
|---------|-----------|
| `sql/comunicados-schema.sql` | Schema SQL de referencia |
| `src/types/comunicados.ts` | Tipos, enums, presets, colores, registry interactivos |
| `src/services/comunicadosService.ts` | CRUD, targeting por coordinacion/roles/usuarios, Realtime subscription |
| `src/stores/comunicadosStore.ts` | Zustand store: pending, current, overlay visibility, readIds |
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
| `CLAUDE.md` | Regla: usar `/comunicado` cuando pidan avisos/comunicados |

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
comunicadosStore.addComunicado: check targeting local + check readIds
    ↓
Si aplica al usuario: agrega a pendingComunicados → showNext
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

## Bug fix: Loop de Realtime (v2.15.1)

**Problema:** Al marcar como leido, la RPC hace `UPDATE comunicados SET read_count = ...`, lo que dispara Realtime. El callback re-agregaba el comunicado porque ya habia sido removido de pending.

**Solucion:** Se agrego `readIds: Set<string>` al store. Cuando el usuario marca como leido, el ID se registra en el Set ANTES de llamar al servicio. `addComunicado` verifica contra readIds y lo ignora.

---

## Comunicado activo

- **ID:** `1d51cb66-4da4-4e08-ade4-b27b61e39eea`
- **Titulo:** Nueva plantilla: Seguimiento de Contacto
- **Tipo:** tutorial interactivo (4 pasos animados)
- **component_key:** `utility-template-tutorial`
- **Target:** todos los usuarios
- **Prioridad:** 10

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

- Los comunicados simples NO requieren deploy (solo SQL)
- Los interactivos SI requieren deploy (nuevo componente + registro en overlay)
- El panel admin esta en AdminDashboardTabs → tab "Comunicados" (solo admin)
- Para agregar nuevos tutoriales interactivos: crear en `tutorials/`, registrar en `ComunicadoOverlay.tsx` INTERACTIVE_REGISTRY y en `comunicados.ts` INTERACTIVE_COMUNICADOS
- El overlay esta en z-[60], debajo de ForceUpdateModal (z-[70])
- Targeting se filtra en service layer (no en SQL) porque usa coordinacion_id y role_name del user
