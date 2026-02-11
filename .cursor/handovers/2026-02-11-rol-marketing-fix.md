# Handover: Rol Marketing - Implementación y Fix de Permisos

**Fecha:** 2026-02-11
**Estado:** Completado y desplegado (deploy silencioso, sin bump de versión)

---

## Resumen

Implementación del rol **Marketing** con grupo de permisos **marketing_copy** para el equipo de copy/campañas. El rol otorga acceso exclusivo a **Campañas** y **Centro de Soporte** (tickets).

---

## Problema Original

No existía un rol para el equipo de marketing. Se necesitaba:
- Acceso al módulo de Campañas (plantillas, audiencias, campañas, bases de datos, secuencias)
- Acceso al Centro de Soporte (crear tickets, ver mis tickets)
- **Sin acceso** a: Dashboard, WhatsApp, Prospectos, Llamadas, Modelos LLM, Administración

## Issues Encontrados Durante Implementación

### 1. Módulos visibles en sidebar que no deberían
**Causa raíz:** El usuario de prueba (Ghisselle Avila) tenía el grupo `system_admin` asignado en BD además de `marketing_copy`. Esto hacía que `useEffectivePermissions.isAdmin = true`.

**Fix:** Remover grupo `system_admin` de la tabla `user_permission_groups` para ese usuario. No es un bug de código sino un dato incorrecto en BD.

### 2. "Acceso Denegado" al entrar a Campañas
**Causa raíz:** `CampaignsDashboardTabs.tsx` tenía su propio guard `if (!isAdmin)` que solo permitía admin, INDEPENDIENTE del guard en `MainApp.tsx` que sí incluía `isMarketing`.

**Fix:** `CampaignsDashboardTabs.tsx:14-18` - Cambiar `!isAdmin` → `!isAdmin && !isMarketing`

### 3. Botón de Centro de Soporte no visible
**Causa raíz:** `SupportButton.tsx:168-170` tenía una lista hardcodeada de roles permitidos (`canSeeSupport`) que NO incluía `'marketing'`.

**Fix:** Agregar `'marketing'` al array de roles en `canSeeSupport`.

---

## Archivos Modificados

| Archivo | Cambio | Versión |
|---------|--------|---------|
| `src/components/campaigns/CampaignsDashboardTabs.tsx` | `!isAdmin` → `!isAdmin && !isMarketing` | Fix post-v2.12.1 |
| `src/components/support/SupportButton.tsx` | Agregar `'marketing'` a `canSeeSupport` | Fix post-v2.12.1 |
| `src/services/authService.ts` | Cases explícitos para `campaigns` y `support` | v2.12.1 |
| `src/hooks/useNinjaAwarePermissions.ts` | `ROLE_DEFAULT_PERMISSIONS.marketing` | v2.12.1 |
| `src/contexts/AuthContext.tsx` | `getFirstAvailableModule` → `'campaigns'` para marketing | v2.12.1 |
| `src/hooks/useEffectivePermissions.ts` | `MARKETING_GROUPS`, `isMarketing` flag | v2.12.0 |
| `src/config/permissionModules.ts` | `'marketing'` en `RoleBase`, módulos `campaigns` y `support` | v2.12.0 |
| `src/components/admin/UserManagementV2/types.ts` | `'marketing'` en `RoleName`, `ROLE_HIERARCHY` | v2.12.0 |
| `src/components/MainApp.tsx` | `(isAdmin \|\| isMarketing)` en case 'campaigns' | v2.12.0 |
| `src/components/Sidebar.tsx` | `effectiveRoleName === 'marketing'` para Campañas | v2.12.0 |

## Migraciones BD Aplicadas

| Migración | Descripción |
|-----------|-------------|
| `create_marketing_role_and_copy_group` | Rol `marketing` en `auth_roles` + grupo `marketing_copy` en `permission_groups` + 7 permisos en `group_permissions` |

## Datos BD Corregidos

| Cambio | Descripción |
|--------|-------------|
| `DELETE user_permission_groups` | Removido grupo `system_admin` de Ghisselle Avila (solo conserva `marketing_copy`) |

---

## Arquitectura del Rol Marketing

### Capa 1: Base de Datos
```
auth_roles:         marketing (id: 9f259a52...)
permission_groups:  marketing_copy (base_role: marketing, priority: 45)
group_permissions:  campaigns.view, campaigns.create, campaigns.edit, campaigns.export
                    support.view, support.create
                    (campaigns.delete = solo admin)
```

### Capa 2: Frontend - Control de Acceso (7 puntos de verificación)

| # | Archivo | Verificación | Qué controla |
|---|---------|-------------|---------------|
| 1 | `authService.ts` | `case 'campaigns': ['admin','marketing']` | API de permisos por módulo |
| 2 | `useNinjaAwarePermissions.ts` | `ROLE_DEFAULT_PERMISSIONS.marketing` | Permisos en modo ninja |
| 3 | `useEffectivePermissions.ts` | `isMarketing = baseRole === 'marketing'` | Flag global de permisos |
| 4 | `AuthContext.tsx` | `getFirstAvailableModule → 'campaigns'` | Redirect inicial post-login |
| 5 | `Sidebar.tsx` | `effectiveRoleName === 'marketing'` | Visibilidad menú lateral |
| 6 | `MainApp.tsx` | `isAdmin \|\| isMarketing` | Guard de renderizado de módulo |
| 7 | `CampaignsDashboardTabs.tsx` | `!isAdmin && !isMarketing` | Guard interno del componente |

### Capa 3: Componentes con Restricción de Rol

| Componente | Restricción | Marketing? |
|-----------|-------------|------------|
| `SupportButton.tsx` | `canSeeSupport` array de roles | ✅ Incluido |
| `TemplateSuggestionsTab.tsx` | Botones aprobar/rechazar = solo admin | ❌ Correcto (solo ve, no aprueba) |

---

## Cómo Crear un Nuevo Usuario Marketing

### Pasos
1. **Admin → Gestión de Usuarios → Crear Usuario**
2. Seleccionar rol: **Marketing**
3. Completar datos (email, nombre, etc.)
4. **No requiere** asignar grupo `marketing_copy` manualmente - el acceso se controla por `role_name = 'marketing'`
5. El grupo `marketing_copy` es opcional (para permisos granulares del sistema de grupos)

### Lo que el usuario Marketing puede hacer
- ✅ Ver, crear, editar y exportar campañas
- ✅ Gestionar plantillas WhatsApp (dentro de campañas)
- ✅ Gestionar audiencias, bases de datos, secuencias
- ✅ Crear tickets de soporte (botón salvavidas en header)
- ✅ Ver sus tickets existentes

### Lo que NO puede hacer
- ❌ Acceder a Dashboard, WhatsApp, Prospectos, Llamadas
- ❌ Ver Modelos LLM, Administración, Programación
- ❌ Aprobar/rechazar sugerencias de plantillas (solo admin)
- ❌ Eliminar campañas (solo admin)
- ❌ Ver iconos de CRM, Logs, Admin en el header
- ❌ Activar modo ninja

---

## Lección Aprendida

**SIEMPRE verificar TODOS los guards de permisos en la cadena completa:**
1. Sidebar (visibilidad del menú)
2. MainApp (guard de renderizado)
3. Componente interno (guard propio del componente)
4. Componentes hijos (restricciones de acciones)
5. Header (iconos y botones)

Un módulo puede tener **múltiples guards redundantes** en diferentes niveles. Agregar un rol nuevo requiere verificar TODOS, no solo el más externo.

---

## Estado de Deploy

- Build: PASA sin errores TypeScript
- Deploy: Silencioso (S3 sync + CloudFront invalidation)
- Versión: Sigue en B10.1.44N2.12.1 (sin bump)
- BD: Migraciones ya aplicadas, dato de grupo corregido
- Pendiente: Commit de los fixes para persistir en git
