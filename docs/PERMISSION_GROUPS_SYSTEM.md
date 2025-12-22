# 🔐 Sistema de Grupos de Permisos - PQNC QA AI Platform

## 📋 Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Esquema de Base de Datos](#esquema-de-base-de-datos)
4. [Roles y Grupos Predefinidos](#roles-y-grupos-predefinidos)
5. [Catálogo de Permisos por Módulo](#catálogo-de-permisos-por-módulo)
6. [Interfaz de Usuario](#interfaz-de-usuario)
7. [Servicios y APIs](#servicios-y-apis)
8. [Guía de Implementación](#guía-de-implementación)
9. [Migración y Compatibilidad](#migración-y-compatibilidad)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Resumen Ejecutivo

### Objetivo
Implementar un sistema de permisos basado en **grupos**, similar a Active Directory, que permita:
- Gestionar permisos de forma centralizada
- Crear grupos personalizados con conjuntos de permisos
- Asignar múltiples grupos a usuarios
- Mantener retrocompatibilidad con el sistema de roles existente

### Fecha de Implementación
**Diciembre 2024**

### Estado
✅ **Implementado y en Producción**

---

## 🏗️ Arquitectura del Sistema

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │ UserManagementV2│  │GroupManagement  │  │ PermissionsModal│      │
│  │    (Usuarios)   │  │    Panel        │  │   (Permisos)    │      │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘      │
│           │                    │                    │                │
│           └────────────────────┼────────────────────┘                │
│                                │                                      │
│                    ┌───────────▼───────────┐                         │
│                    │    groupsService.ts   │                         │
│                    │  (Servicio Principal) │                         │
│                    └───────────┬───────────┘                         │
│                                │                                      │
└────────────────────────────────┼──────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     Supabase REST API   │
                    │    (System_UI Database) │
                    └────────────┬────────────┘
                                 │
┌────────────────────────────────┼──────────────────────────────────────┐
│                        DATABASE (PostgreSQL)                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │
│  │ permission_groups│  │ group_permissions│  │user_permission_  │    │
│  │   (Grupos)       │◄─┤   (Permisos)     │  │    groups        │    │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘    │
│           │                                          │                │
│           │         ┌──────────────────┐            │                │
│           └────────►│ group_audit_log  │◄───────────┘                │
│                     │  (Auditoría)     │                              │
│                     └──────────────────┘                              │
│                                                                        │
│  ╔══════════════════════════════════════════════════════════════════╗ │
│  ║ TABLAS EXISTENTES (No modificadas)                               ║ │
│  ╠══════════════════════════════════════════════════════════════════╣ │
│  ║ auth_users │ auth_roles │ auth_permissions │ coordinaciones      ║ │
│  ╚══════════════════════════════════════════════════════════════════╝ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Flujo de Verificación de Permisos

```
Usuario solicita acción
        │
        ▼
┌───────────────────┐
│ Verificar Rol Base│ ──► Permisos del rol (auth_role_permissions)
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Verificar Grupos  │ ──► Permisos de grupos asignados
│    Asignados      │     (user_permission_groups → group_permissions)
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Verificar Permisos│ ──► Permisos individuales del usuario
│   Individuales    │     (auth_user_permissions)
└────────┬──────────┘
         │
         ▼
   Permiso Final = Rol Base ∪ Grupos ∪ Individual
```

---

## 🗄️ Esquema de Base de Datos

### Tabla: `permission_groups`
Almacena la definición de los grupos de permisos.

```sql
CREATE TABLE permission_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,        -- Identificador único (ej: 'system_admin')
  display_name VARCHAR(255) NOT NULL,        -- Nombre visible (ej: 'Administradores')
  description TEXT,                          -- Descripción del grupo
  color VARCHAR(100),                        -- Color Tailwind (ej: 'from-red-500 to-rose-600')
  icon VARCHAR(50),                          -- Icono Lucide (ej: 'Shield')
  base_role VARCHAR(50),                     -- Rol base asociado (opcional)
  priority INTEGER DEFAULT 50,               -- Prioridad (1-100, menor = más importante)
  is_system BOOLEAN DEFAULT false,           -- Si es grupo del sistema (no editable)
  is_active BOOLEAN DEFAULT true,            -- Si está activo
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,                           -- Usuario que lo creó
  updated_by UUID                            -- Usuario que lo actualizó
);
```

### Tabla: `group_permissions`
Define los permisos específicos de cada grupo.

```sql
CREATE TABLE group_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
  module VARCHAR(100) NOT NULL,              -- Módulo (ej: 'prospectos', 'live-chat')
  action VARCHAR(100) NOT NULL,              -- Acción (ej: 'view', 'create', 'delete')
  is_granted BOOLEAN DEFAULT true,           -- Si el permiso está concedido
  scope_restriction VARCHAR(50),             -- Restricción de alcance ('all', 'coordination', 'self')
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, module, action)
);
```

### Tabla: `user_permission_groups`
Asigna usuarios a grupos.

```sql
CREATE TABLE user_permission_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,          -- Si es el grupo primario del usuario
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID,                          -- Quién lo asignó
  notes TEXT,                                -- Notas sobre la asignación
  UNIQUE(user_id, group_id)
);
```

### Tabla: `group_audit_log`
Registro de auditoría de cambios en grupos.

```sql
CREATE TABLE group_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(50) NOT NULL,          -- 'created', 'updated', 'deleted', 'assignment', 'permission_change'
  group_id UUID,
  user_id UUID,                              -- Usuario afectado (para asignaciones)
  performed_by UUID,                         -- Usuario que realizó la acción
  changes JSONB,                             -- Detalles del cambio
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 👥 Roles y Grupos Predefinidos

### Grupos del Sistema (is_system = true)

| Grupo | Display Name | Base Role | Prioridad | Color |
|-------|--------------|-----------|-----------|-------|
| `system_admin` | Administradores | admin | 10 | `from-red-500 to-rose-600` |
| `system_admin_operativo` | Administradores Operativos | administrador_operativo | 20 | `from-purple-500 to-violet-600` |
| `system_coordinador` | Coordinadores | coordinador | 30 | `from-blue-500 to-indigo-600` |
| `system_supervisor` | Supervisores | supervisor | 35 | `from-cyan-500 to-teal-600` |
| `system_ejecutivo` | Ejecutivos | ejecutivo | 40 | `from-emerald-500 to-teal-600` |
| `system_evaluador` | Evaluadores | evaluador | 40 | `from-amber-500 to-orange-600` |
| `system_developer` | Desarrolladores | developer | 25 | `from-gray-600 to-slate-700` |
| `system_direccion` | Dirección | direccion | 15 | `from-indigo-500 to-purple-600` |

### Jerarquía de Roles

```
Nivel 1: admin (Acceso completo)
    │
Nivel 2: administrador_operativo, developer (Gestión operativa/técnica)
    │
Nivel 3: coordinador, supervisor (Coordinación de equipos)
    │
Nivel 4: ejecutivo, evaluador (Operación directa)
```

### Nuevo Rol: Supervisor

El rol **Supervisor** fue agregado con las siguientes características:
- **Nivel de jerarquía:** 3 (igual a Coordinador)
- **Permisos:** Idénticos a Coordinador
- **Coordinaciones:** Puede tener múltiples coordinaciones asignadas
- **Icono:** `UserCheck`
- **Color:** `from-cyan-500 to-teal-600`

### Permisos del Administrador Operativo

El rol **Administrador Operativo** tiene permisos específicos y restringidos:

#### Roles que puede asignar:
- ✅ `coordinador`
- ✅ `supervisor`
- ✅ `ejecutivo`
- ❌ `admin`
- ❌ `administrador_operativo`
- ❌ `developer`
- ❌ `evaluador`

#### Grupos que puede ver y asignar:
- ✅ `administrador_operativo`
- ✅ `coordinador`
- ✅ `supervisor`
- ✅ `ejecutivo`
- ✅ `evaluador`
- ✅ `calidad`
- ❌ `admin` / `system_admin`
- ❌ `full_admin`
- ❌ `developer`

#### Usuarios que puede ver:
- ✅ Coordinadores
- ✅ Supervisores
- ✅ Ejecutivos
- ❌ Administradores
- ❌ Otros Administradores Operativos
- ❌ Developers

#### Módulos y funciones:
- ✅ Ver todos los filtros en gestión de usuarios
- ✅ Crear y editar usuarios (solo roles permitidos)
- ✅ Ver e interactuar con módulo de Coordinaciones
- ✅ Asignar grupos de permisos (solo grupos permitidos)
- ✅ Ver grupos de su nivel o inferior

---

## 📚 Catálogo de Permisos por Módulo

### Dashboard Operativo (`operative-dashboard`)
| Acción | Descripción |
|--------|-------------|
| `view` | Ver el dashboard operativo |

### Prospectos (`prospectos`)
| Acción | Descripción |
|--------|-------------|
| `view` | Ver lista de prospectos |
| `view_details` | Ver detalles de prospecto |
| `create` | Crear nuevos prospectos |
| `edit` | Editar prospectos |
| `delete` | Eliminar prospectos |
| `assign` | Asignar prospectos a ejecutivos |
| `bulk_assign` | Asignación masiva |
| `export` | Exportar datos |
| `change_stage` | Cambiar etapa del prospecto |
| `view_history` | Ver historial |

### Live Chat (`live-chat`)
| Acción | Descripción |
|--------|-------------|
| `view` | Ver conversaciones |
| `send_messages` | Enviar mensajes |
| `send_images` | Enviar imágenes |
| `send_voice` | Enviar notas de voz |
| `schedule_call` | Programar llamadas |
| `use_paraphrase` | Usar parafraseo IA |
| `view_analytics` | Ver analíticas |
| `assign_conversation` | Asignar conversaciones |

### Live Monitor (`live-monitor`)
| Acción | Descripción |
|--------|-------------|
| `view` | Ver monitor en vivo |
| `listen_live` | Escuchar llamadas en vivo |
| `view_transcription` | Ver transcripción |
| `send_whisper` | Enviar susurros |
| `take_over` | Tomar control de llamada |
| `view_metrics` | Ver métricas |
| `export_report` | Exportar reportes |

### Análisis IA (`analisis`)
| Acción | Descripción |
|--------|-------------|
| `view` | Ver módulo de análisis |
| `view_natalia` | Ver análisis Natalia |
| `view_pqnc` | Ver análisis PQNC |
| `view_details` | Ver detalles de análisis |
| `play_audio` | Reproducir audio |
| `download_audio` | Descargar audio |
| `export_analysis` | Exportar análisis |
| `view_agent_performance` | Ver rendimiento de agentes |
| `reclassify_calls` | Reclasificar llamadas |

### Llamadas Programadas (`scheduled-calls`)
| Acción | Descripción |
|--------|-------------|
| `view` | Ver llamadas programadas |
| `create` | Crear llamadas |
| `edit` | Editar llamadas |
| `delete` | Eliminar llamadas |

### Administración (`admin`)
| Acción | Descripción |
|--------|-------------|
| `view` | Ver módulo admin |
| `manage_users` | Gestionar usuarios |
| `manage_roles` | Gestionar roles |
| `manage_groups` | Gestionar grupos de permisos |
| `view_logs` | Ver logs del sistema |
| `manage_config` | Gestionar configuración |
| `manage_aws` | Gestionar infraestructura AWS |

### Restricciones de Alcance (`scope_restriction`)

| Valor | Descripción |
|-------|-------------|
| `all` | Acceso a todos los registros (sin restricción) |
| `coordination` | Solo registros de su(s) coordinación(es) |
| `self` | Solo registros propios |

---

## 🖥️ Interfaz de Usuario

### Ubicación en la Aplicación

```
Administración
  └── Usuarios
        ├── Lista de Usuarios
        ├── Editar Usuario (incluye asignación de grupos)
        ├── Crear Usuario (incluye asignación de grupos)
        └── Grupos de Permisos (panel embebido)
              ├── Lista de Grupos
              ├── Crear Grupo
              ├── Editar Grupo
              └── Gestionar Usuarios del Grupo
```

### Componentes Principales

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| `UserManagementV2` | `src/components/admin/UserManagementV2/index.tsx` | Gestión principal de usuarios |
| `GroupManagementPanel` | `src/components/admin/UserManagementV2/components/GroupManagementPanel.tsx` | Panel de gestión de grupos |
| `UserEditPanel` | `src/components/admin/UserManagementV2/components/UserEditPanel.tsx` | Edición de usuario con grupos |
| `UserCreateModal` | `src/components/admin/UserManagementV2/components/UserCreateModal.tsx` | Creación de usuario con grupos |
| `TreeViewSidebar` | `src/components/admin/UserManagementV2/components/TreeViewSidebar.tsx` | Sidebar con árbol de roles y grupos |
| `PermissionsModal` | `src/components/admin/UserManagementV2/components/PermissionsModal.tsx` | Modal de permisos individuales |

### Características de UI

1. **Árbol de Navegación (TreeViewSidebar)**
   - Muestra roles con usuarios agrupados
   - Sección separada para "Grupos de Permisos"
   - Contador de usuarios por grupo
   - Botón de configuración para abrir gestión de grupos

2. **Panel de Gestión de Grupos (GroupManagementPanel)**
   - Estilo Active Directory
   - Lista de grupos a la izquierda
   - Panel de detalle/edición a la derecha
   - Selector de permisos por módulo con "Seleccionar todos"

3. **Edición de Usuario (UserEditPanel)**
   - Sección "Grupos de Permisos" con checkboxes
   - Indicador "Recomendado" si el grupo coincide con el rol base
   - Badge "Sistema" para grupos del sistema
   - Cambios inmediatos con feedback visual

---

## 🔧 Servicios y APIs

### groupsService.ts

Ubicación: `src/services/groupsService.ts`

#### Métodos Principales

```typescript
// Obtener todos los grupos
getGroups(activeOnly?: boolean): Promise<PermissionGroup[]>

// Obtener un grupo específico
getGroup(groupId: string): Promise<PermissionGroup | null>

// Crear un nuevo grupo
createGroup(group: Omit<PermissionGroup, 'id' | 'created_at' | 'updated_at'>): Promise<PermissionGroup>

// Actualizar un grupo
updateGroup(groupId: string, updates: Partial<PermissionGroup>): Promise<PermissionGroup>

// Eliminar un grupo
deleteGroup(groupId: string): Promise<boolean>

// Obtener permisos de un grupo
getGroupPermissions(groupId: string): Promise<GroupPermission[]>

// Establecer permisos de un grupo
setGroupPermissions(groupId: string, permissions: GroupPermission[]): Promise<boolean>

// Asignar usuario a grupo
assignUserToGroup(userId: string, groupId: string, assignedBy?: string): Promise<boolean>

// Remover usuario de grupo
removeUserFromGroup(userId: string, groupId: string, removedBy?: string): Promise<boolean>

// Obtener grupos de un usuario
getUserGroups(userId: string): Promise<UserGroupAssignment[]>

// Obtener usuarios de un grupo
getGroupUsers(groupId: string): Promise<UserGroupAssignment[]>
```

#### Tipos TypeScript

```typescript
interface PermissionGroup {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  base_role: string | null;
  priority: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

interface GroupPermission {
  id?: string;
  group_id: string;
  module: string;
  action: string;
  is_granted: boolean;
  scope_restriction: 'all' | 'coordination' | 'self' | null;
  created_at?: string;
}

interface UserGroupAssignment {
  id: string;
  user_id: string;
  group_id: string;
  is_primary: boolean;
  assigned_at: string;
  assigned_by: string | null;
  notes: string | null;
  group?: PermissionGroup;
}
```

---

## 📖 Guía de Implementación

### Crear un Nuevo Grupo

1. Ir a **Administración > Usuarios**
2. En el sidebar, hacer clic en el icono ⚙️ junto a "Grupos de Permisos"
3. Clic en **"+ Nuevo Grupo"**
4. Completar:
   - **Nombre interno:** Identificador único (ej: `ventas_premium`)
   - **Nombre visible:** Lo que verán los usuarios (ej: `Ventas Premium`)
   - **Descripción:** Explicación del propósito del grupo
   - **Color:** Seleccionar de la paleta
   - **Rol base:** Si aplica, seleccionar el rol asociado
   - **Prioridad:** 1-100 (menor = más importante)
5. Seleccionar permisos por módulo
6. Clic en **Guardar**

### Asignar Grupo a Usuario

**Método 1: Desde edición de usuario**
1. Ir a **Administración > Usuarios**
2. Seleccionar usuario a editar
3. En la sección "Grupos de Permisos", marcar los grupos deseados
4. Los cambios se guardan automáticamente

**Método 2: Desde gestión de grupos**
1. Ir a **Administración > Usuarios > Grupos de Permisos**
2. Seleccionar el grupo
3. Ir a la pestaña "Usuarios"
4. Agregar o quitar usuarios

### Verificar Permisos de Usuario

```typescript
import { groupsService } from '@/services/groupsService';

// Obtener grupos del usuario
const userGroups = await groupsService.getUserGroups(userId);

// Para cada grupo, obtener sus permisos
for (const assignment of userGroups) {
  const permissions = await groupsService.getGroupPermissions(assignment.group_id);
  console.log(`Grupo: ${assignment.group?.display_name}`, permissions);
}
```

---

## 🔄 Migración y Compatibilidad

### Compatibilidad con Sistema Anterior

El nuevo sistema de grupos **coexiste** con el sistema anterior:

| Sistema | Tabla | Estado |
|---------|-------|--------|
| Roles base | `auth_roles` | ✅ Activo |
| Permisos de rol | `auth_role_permissions` | ✅ Activo |
| Permisos individuales | `auth_user_permissions` | ✅ Activo |
| **Grupos de permisos** | `permission_groups` | ✅ **Nuevo** |

### Orden de Precedencia de Permisos

```
1. Permisos individuales del usuario (auth_user_permissions)
2. Permisos de grupos asignados (group_permissions)
3. Permisos del rol base (auth_role_permissions)
```

### Script de Creación de Tablas

Ubicación: `scripts/sql/create_permission_groups.sql`

Este script:
- Crea las 4 tablas nuevas
- Inserta los grupos del sistema
- Configura los permisos por defecto para cada grupo
- Es idempotente (seguro ejecutar múltiples veces)

---

## 🔍 Troubleshooting

### Problema: Usuario aparece en múltiples grupos incorrectamente

**Causa:** El filtro usaba un fallback que mostraba usuarios por `base_role` si no había asignaciones.

**Solución:** Actualizado el filtro para usar solo asignaciones directas en `user_permission_groups`.

### Problema: Icono de rol no aparece

**Causa:** El icono del rol no está en el `ICON_MAP`.

**Solución:** Agregar el icono al mapa en `TreeViewSidebar.tsx`:
```typescript
const ICON_MAP = {
  Shield,
  Settings,
  Users,
  Briefcase,
  ClipboardCheck,
  Code,
  Building2,
  User,
  UserCheck  // Agregado para Supervisor
};
```

### Problema: Cambios de grupo no se guardan

**Causa:** Error en la base de datos o permisos RLS.

**Verificación:**
```sql
-- Verificar asignaciones de un usuario
SELECT * FROM user_permission_groups WHERE user_id = 'uuid-del-usuario';
```

### Problema: Error "value too long for type character varying"

**Causa:** Campo `color` muy pequeño para clases Tailwind.

**Solución:** El campo `color` debe ser `VARCHAR(100)` mínimo:
```sql
ALTER TABLE permission_groups ALTER COLUMN color TYPE VARCHAR(100);
```

---

## 📝 Archivos Modificados en esta Implementación

### Nuevos Archivos
- `src/services/groupsService.ts` - Servicio de grupos
- `src/config/permissionModules.ts` - Catálogo de permisos
- `src/components/admin/UserManagementV2/components/GroupManagementPanel.tsx` - Panel de grupos
- `scripts/sql/create_permission_groups.sql` - Script SQL para tablas
- `scripts/sql/create_supervisor_role.sql` - Script para rol Supervisor
- `docs/PERMISSION_GROUPS_SYSTEM.md` - Esta documentación

### Archivos Modificados
- `src/components/admin/UserManagementV2/index.tsx` - Integración de grupos
- `src/components/admin/UserManagementV2/hooks/useUserManagement.ts` - Carga de grupos
- `src/components/admin/UserManagementV2/components/TreeViewSidebar.tsx` - Sidebar con grupos
- `src/components/admin/UserManagementV2/components/UserEditPanel.tsx` - Edición con grupos
- `src/components/admin/UserManagementV2/components/UserCreateModal.tsx` - Creación con grupos
- `src/components/admin/UserManagementV2/components/PermissionsModal.tsx` - Tab de grupos
- `src/components/admin/UserManagementV2/types.ts` - Tipos actualizados
- `src/components/dashboard/OperativeDashboard.tsx` - Permisos de widgets

---

## 🎣 Hook useEffectivePermissions

### Descripción
Hook React que proporciona permisos efectivos considerando tanto el rol base del usuario como los grupos asignados. **Debe usarse en lugar de verificar directamente `user?.role_name === 'admin'`**.

### Uso Básico

```tsx
import { useEffectivePermissions } from '../hooks/useEffectivePermissions';

const MyComponent = () => {
  const { isAdmin, isAdminOperativo, isCoordinador, hasGroup } = useEffectivePermissions();
  
  if (isAdmin) {
    // El usuario tiene permisos de admin (por rol O por grupo)
  }
  
  if (hasGroup('full_admin')) {
    // El usuario tiene el grupo específico 'full_admin'
  }
  
  return <div>...</div>;
};
```

### Propiedades Retornadas

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isAdmin` | boolean | True si es admin (rol o grupo) |
| `isAdminOperativo` | boolean | True si es admin operativo (rol o grupo) y NO es admin |
| `isCoordinador` | boolean | True si es coordinador (rol o grupo) |
| `isSupervisor` | boolean | True si es supervisor (rol o grupo) |
| `isEjecutivo` | boolean | True si es ejecutivo |
| `isEvaluador` | boolean | True si es evaluador |
| `isDeveloper` | boolean | True si es developer |
| `baseRole` | string | Rol base del usuario |
| `userGroups` | PermissionGroup[] | Grupos asignados |
| `userGroupNames` | string[] | Nombres de grupos |
| `loading` | boolean | Estado de carga |
| `hasGroup(name)` | function | Verifica si tiene un grupo específico |
| `hasAnyGroup(names)` | function | Verifica si tiene alguno de los grupos |
| `refresh()` | function | Recarga los permisos |

### Componentes Actualizados

Los siguientes componentes ya usan `useEffectivePermissions`:

**Navegación y Layout:**
- `Header.tsx`
- `Sidebar.tsx`
- `MainApp.tsx`
- `LinearSidebar.tsx`

**Administración:**
- `AdminDashboardTabs.tsx`
- `UserManagement.tsx`
- `UserManagementV2/hooks/useUserManagement.ts`
- `CoordinacionesManager.tsx`
- `LogServerManager.tsx`

**Chat y Comunicaciones:**
- `LiveChatCanvas.tsx`
- `LiveChatModule.tsx`
- `CallDetailModalSidebar.tsx`

**Prospectos y Asignaciones:**
- `ProspectosManager.tsx`
- `AssignmentContextMenu.tsx`
- `BulkAssignmentModal.tsx`
- `AssignmentBadge.tsx`

**Análisis y Dashboard:**
- `AnalysisDashboard.tsx`
- `ConversacionesWidget.tsx`
- `useAnalysisPermissions.ts`

**Campañas y Timeline:**
- `CampaignsDashboardTabs.tsx`
- `Timeline.tsx`

**Utilidades:**
- `TokenUsageIndicator.tsx`

### Migración

**Antes (NO usar):**
```tsx
const isAdmin = user?.role_name === 'admin';
```

**Después (CORRECTO):**
```tsx
const { isAdmin } = useEffectivePermissions();
```

---

## 🔄 Permisos Efectivos (Rol Base + Grupos)

### Cómo Funcionan los Permisos Extendidos

El sistema ahora soporta **permisos efectivos** que combinan:
1. **Rol Base del Usuario** (ej: `administrador_operativo`)
2. **Grupos Asignados** (ej: `system_admin`)

Esto significa que un usuario con rol base `administrador_operativo` puede tener permisos de `admin` si tiene asignado el grupo `system_admin`.

### Ejemplo Práctico

```
Usuario: Giobani Ortega
Rol Base: administrador_operativo
Grupos: [system_admin_operativo, system_admin]

Permisos Efectivos:
- Por rol base: Ver solo coordinadores y ejecutivos
- Por grupo system_admin: Ver TODOS los usuarios

Resultado: El usuario puede ver todos los usuarios (se aplica el permiso más alto)
```

### Lógica de Determinación

```typescript
// En useUserManagement.ts
const hasAdminGroup = groups.some(g => 
  ['system_admin', 'full_admin'].includes(g.name) && 
  currentUserGroups.includes(g.id)
);

// Permisos efectivos: rol base O grupos asignados
const isAdmin = currentUser?.role_name === 'admin' || hasAdminGroup;
const isAdminOperativo = (currentUser?.role_name === 'administrador_operativo' || 
  hasAdminOperativoGroup) && !isAdmin;
const isCoordinador = currentUser?.role_name === 'coordinador' && 
  !isAdmin && !isAdminOperativo;
```

### Grupos que Extienden Permisos

| Grupo | Extiende a |
|-------|------------|
| `system_admin` | Permisos de Administrador completo |
| `full_admin` | Permisos de Administrador completo |
| `system_admin_operativo` | Permisos de Admin Operativo |

---

## 📅 Historial de Cambios

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 22 Dic 2024 | 1.0.0 | Implementación inicial del sistema de grupos |
| 22 Dic 2024 | 1.0.1 | Agregado rol Supervisor con 42 permisos |
| 22 Dic 2024 | 1.0.2 | Corregido icono de Supervisor (UserCheck) |
| 22 Dic 2024 | 1.0.3 | Eliminado fallback por rol en filtro de grupos |
| 22 Dic 2024 | 1.0.4 | Implementado sistema de permisos efectivos (rol + grupos) |
| 22 Dic 2024 | 1.0.5 | Creado hook `useEffectivePermissions` para uso global |
| 22 Dic 2024 | 1.0.6 | Actualizado Header, Sidebar, MainApp, AdminDashboardTabs, LiveChatCanvas, ProspectosManager |
| 22 Dic 2024 | 1.0.7 | Permisos específicos de Admin Operativo: roles y grupos asignables |

---

## 👤 Autor

**Equipo de Desarrollo PQNC**  
Grupo Vidanta - Clever Ideas AI Platform

---

*Última actualización: 22 de Diciembre 2024*

