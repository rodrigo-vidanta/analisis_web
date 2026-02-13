---
name: comunicado
description: Crear y publicar comunicados para usuarios de la plataforma. Soporta comunicados simples (texto) e interactivos (tutoriales animados con componente React).
argument-hint: ["descripcion del comunicado"]
---

# Comunicado - PQNC QA AI Platform

## REGLA: NUNCA insertar comunicado en BD sin autorizacion explicita del usuario

## Invocacion

- `/comunicado` - Crear un nuevo comunicado (pregunta detalles)
- `/comunicado "mensaje sobre nueva funcionalidad"` - Crear con descripcion inicial

## Informacion requerida

Antes de crear, el agente DEBE tener respuesta a todo lo siguiente. Si el usuario no lo especifico, **preguntar usando AskUserQuestion**:

1. **Tipo de comunicado**: simple (texto) o interactivo (tutorial animado con componente React)
2. **Tipo/categoria**: info | feature | tutorial | mantenimiento | urgente
3. **Audiencia**: todos | coordinacion (cuales?) | roles (cuales?) | usuarios (cuales?)
4. **Prioridad**: 0-10 (default 5, urgente=10)
5. **Contenido**: titulo, subtitulo, body, bullets (para simples)

## Flujo: Comunicado Simple

Los comunicados simples se insertan directamente en BD sin necesidad de deploy.

### 1. Recopilar informacion
Preguntar lo que falte de la lista de arriba.

### 2. Insertar en BD
Usar Supabase Management API:
```bash
source ~/.zshrc 2>/dev/null

SQL=$(cat <<'ENDSQL'
INSERT INTO comunicados (
  titulo, subtitulo, contenido, tipo, prioridad,
  is_interactive, target_type, target_ids,
  estado, published_at, created_by
)
VALUES (
  'TITULO',
  'SUBTITULO o NULL',
  '{"body": "texto", "bullets": ["punto1", "punto2"], "icon": "NombreIcono"}'::jsonb,
  'TIPO',
  PRIORIDAD,
  false,
  'TARGET_TYPE',
  '{ID1,ID2}' o '{}',
  'activo',
  NOW(),
  'e8ced62c-3fd0-4328-b61a-a59ebea2e877'
)
RETURNING id, titulo, estado;
ENDSQL
)

curl -s -X POST "https://api.supabase.com/v1/projects/glsmifhkoaifvaegsozd/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "$SQL" '{query: $q}')"
```

### 3. Confirmar al usuario
Reportar ID, titulo, audiencia, y que aparecera via Realtime.

## Flujo: Comunicado Interactivo (Tutorial Animado)

Los interactivos requieren un componente React nuevo + deploy + insert en BD.

### 1. Recopilar informacion
Ademas de la info base, necesita:
- **component_key**: identificador unico kebab-case (ej: `utility-template-tutorial`)
- **Contenido del tutorial**: pasos, animaciones, que mostrar

### 2. Crear componente React
Crear en `src/components/comunicados/tutorials/NombreComponente.tsx`

**Patron obligatorio** (seguir `UtilityTemplateTutorial.tsx`):
- Props: `{ onComplete: () => void }`
- Export default (para React.lazy)
- Pasos con AnimatePresence mode="wait"
- Auto-advance con setTimeout (excepto ultimo paso)
- Dots de navegacion interactivos
- Boton "Entendido" en ultimo paso que llama `onComplete`
- Componentes reutilizables: AnimatedCursor, TypewriterText
- Framer Motion para todas las animaciones
- Tailwind dark mode

### 3. Registrar en overlay
Editar `src/components/comunicados/ComunicadoOverlay.tsx`:
```typescript
const INTERACTIVE_REGISTRY = {
  'component-key': lazy(() => import('./tutorials/NuevoComponente')),
  // ... existentes
};
```

### 4. Registrar en tipos
Editar `src/types/comunicados.ts`, agregar al array `INTERACTIVE_COMUNICADOS`:
```typescript
{
  component_key: 'component-key',
  label: 'Nombre visible',
  description: 'Descripcion para admin',
}
```

### 5. Build + Deploy
```bash
npm run build  # verificar sin errores
```
Luego usar `/deploy` para subir.

### 6. Insertar en BD
Mismo proceso que comunicado simple pero con:
- `is_interactive = true`
- `component_key = 'el-key-registrado'`
- `contenido = '{}'` (el contenido esta en el componente)

### 7. Confirmar
Reportar que el tutorial esta activo y aparecera a los usuarios.

## Iconos disponibles para comunicados simples

Info, Sparkles, GraduationCap, Wrench, AlertTriangle, Bell, Shield, Zap,
Star, Heart, MessageSquare, Calendar, Clock, CheckCircle, XCircle,
Users, Settings, Globe, Megaphone, TrendingUp

## Iconos por defecto segun tipo

| Tipo | Icono |
|------|-------|
| info | Info |
| feature | Sparkles |
| tutorial | GraduationCap |
| mantenimiento | Wrench |
| urgente | AlertTriangle |

## Targeting: como obtener IDs

- **Coordinaciones**: consultar tabla `coordinaciones` para obtener IDs
- **Roles**: usar valores exactos: `admin`, `administrador_operativo`, `coordinador`, `supervisor`, `ejecutivo`
- **Usuarios**: consultar `user_profiles_v2` para obtener UUIDs

```sql
-- Coordinaciones
SELECT id, codigo, nombre FROM coordinaciones WHERE archivado = false;

-- Usuarios por nombre
SELECT id, nombre, email FROM user_profiles_v2 WHERE nombre ILIKE '%busqueda%';
```

## Admin user ID para created_by

`e8ced62c-3fd0-4328-b61a-a59ebea2e877` (samuelrosales@grupovidanta.com)

## Archivos clave

| Archivo | Proposito |
|---------|-----------|
| `src/types/comunicados.ts` | Tipos, presets, colores, registry interactivos |
| `src/services/comunicadosService.ts` | CRUD, targeting, Realtime |
| `src/stores/comunicadosStore.ts` | Estado Zustand (pending, current, readIds) |
| `src/components/comunicados/ComunicadoOverlay.tsx` | Overlay + registry de lazy components |
| `src/components/comunicados/ComunicadoCard.tsx` | Card presentacional para simples |
| `src/components/comunicados/tutorials/` | Directorio de tutoriales interactivos |
| `src/components/admin/ComunicadosManager.tsx` | Panel admin |
| `sql/comunicados-schema.sql` | Schema de referencia |

## Seguridad

- Tablas con RLS: solo admin puede INSERT/UPDATE/DELETE
- `anon` tiene REVOKE ALL en ambas tablas
- RPC `mark_comunicado_read` es SECURITY DEFINER con validacion `auth.uid()`
- Realtime habilitado para `comunicados`
- Store tiene `readIds` Set para prevenir loop de Realtime al marcar como leido

## Notas

- Los comunicados simples NO requieren deploy (solo INSERT en BD)
- Los interactivos SI requieren deploy (nuevo componente React)
- `estado: 'activo'` + `published_at: NOW()` = aparece inmediatamente
- `estado: 'borrador'` = solo visible en panel admin
- El overlay tiene z-[60] (arriba de contenido, abajo de ForceUpdateModal z-[70])
