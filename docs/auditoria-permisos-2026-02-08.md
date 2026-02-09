# AUDITORÍA COMPLETA DE PERMISOS - PQNC QA AI Platform

> **Fecha:** 2026-02-08 | **Versión:** v2.8.0 | **Estado:** Solo documentación (sin cambios aplicados)
> **Propósito:** Validar que los permisos implementados coincidan con la especificación de negocio

---

## 1. ROLES DEL SISTEMA

### 1.1 Roles Operativos
| Rol | Descripción | Alcance de Datos |
|-----|-------------|------------------|
| **ejecutivo** | Atención directa al prospecto vía WhatsApp + IA | Solo sus prospectos asignados |
| **supervisor** | Monitoreo de ejecutivos, reasignaciones | Prospectos de su coordinación |
| **coordinador** | Gestión de coordinación, distribución, monitoreo | Prospectos de su coordinación |

### 1.2 Roles Administrativos
| Rol | Descripción | Alcance de Datos |
|-----|-------------|------------------|
| **Administrador** (admin) | Acceso total a toda la plataforma | Todos los prospectos |
| **administrador_operativo** | Gestión operativa: reasignaciones, perfiles, horarios | Todos los prospectos |
| **coordinador_calidad** | Coordinador de coordinación de Calidad, auditoría | Todos los prospectos |

### 1.3 Otros Roles (detectados en código)
| Rol | Notas |
|-----|-------|
| **evaluador** | Permisos condicionales según BD |
| **developer** | Acceso a Admin + módulos técnicos |
| **productor** | Acceso muy limitado |
| **direccion** | Timeline específico, aislado |

### 1.4 Implementación Técnica
- **Rol base:** user_profiles_v2.role_name
- **Grupos de permisos:** Tablas permission_groups + user_group_assignments (estilo Active Directory)
- **Roles de grupo:** system_admin, full_admin, system_admin_operativo, system_coordinador, system_supervisor
- **Coordinador de Calidad:** Se identifica como coordinador con coordinacion.codigo = 'CALIDAD'

**Archivos clave:**
- src/services/permissionsService.ts - Servicio principal de permisos
- src/hooks/useEffectivePermissions.ts - Hook que calcula rol efectivo (base + grupos)
- src/services/authService.ts - Función canAccessModule() (líneas 519-574)
- src/contexts/AuthContext.tsx - Wrapper de autenticación

---

## 2. ARQUITECTURA DE PERMISOS

### 2.1 Capas de Protección
```
Capa 1: Sidebar.tsx - Visibilidad de navegación (oculta items del menú según rol)
Capa 2: MainApp.tsx - ProtectedRoute (bloquea renderización de componentes)
Capa 3: Componentes internos - Filtrado de datos (permissionsService.applyProspectFilters)
Capa 4: Supabase RLS - Políticas de base de datos (última línea de defensa)
```

### 2.2 Patrón de Seguridad
- **Fail-closed:** En caso de error, se niega acceso (no se otorga)
- **Caché:** 30s para permisos, 60s para permisos efectivos
- **Deduplicación:** Requests in-flight para evitar race conditions
- **Ninja Mode:** Suplantación de identidad solo para admins

---

## 3. MATRIZ DE ACCESO POR MÓDULO (Especificación/Implementación)

| Módulo | Admin | Admin Op | Coord Calidad | Coordinador | Supervisor | Ejecutivo |
|--------|-------|----------|---------------|-------------|------------|-----------|
| **Inicio** | OK/OK | NO/⚠️SÍ | OK/OK | OK/OK | OK/OK | OK/OK |
| **Llamadas PQNC** | OK/OK | NO/NO | OK/OK | NO/⚠️SÍ | NO/NO | NO/⚠️SÍ |
| **Llamadas IA** | OK/OK | OK/OK | OK/OK | OK/OK | OK/OK | OK/OK |
| **WhatsApp** | OK/OK | OK/OK | OK/OK | OK/OK | OK/OK | OK/OK |
| **Prospectos** | OK/OK | OK/OK | OK/OK | OK/OK | OK/OK | OK/OK |
| **Programación** | OK/OK | OK/OK | OK/OK | OK/OK | OK/OK | OK/OK |
| **Modelos LLM** | OK/OK | NO/⚠️? | NO/⚠️? | NO/⚠️? | NO/⚠️? | NO/⚠️? |
| **Campañas** | OK/OK | NO/NO | NO/NO | NO/NO | NO/NO | NO/NO |
| **Dashboard** | OK/OK | NO/NO | OK/OK | NO/NO | NO/NO | NO/NO |
| **Administración** | OK/OK | OK/OK | OK/⚠️ | NO/NO | NO/NO | NO/NO |

---

## 4. SUB-MÓDULOS DE ADMINISTRACIÓN

| Sub-módulo | Admin | Admin Op (Spec/Impl) | Coord Calidad (Spec/Impl) |
|------------|-------|----------------------|---------------------------|
| Usuarios | OK | OK/OK | NO/NO |
| Preferencias | OK | NO/NO | NO/NO |
| Base de Datos | OK | NO/NO | NO/NO |
| Tokens AI | OK | NO/NO | NO/NO |
| Credenciales | OK | NO/NO | NO/NO |
| Coordinaciones | OK | SÍ/⚠️BLOQUEADO | SÍ/⚠️NO |
| Horarios | OK | OK/OK | SÍ/⚠️NO |
| Logs | OK | NO/NO | NO/NO |
| AWS | OK | NO/NO | NO/NO |
| Documentación | OK | NO/NO | NO/NO |
| Dynamics CRM | OK | OK/OK | OK/OK |

---

## 5. FEATURES ESPECIALES

| Feature | Admin | Admin Op | Coord Calidad | Coordinador | Supervisor | Ejecutivo |
|---------|-------|----------|---------------|-------------|------------|-----------|
| Centro de Soporte (Spec) | SÍ | SÍ | SÍ | SÍ | SÍ | SÍ |
| Centro de Soporte (Impl) | OK | OK | ⚠️? | OK | OK | OK |
| Admin Center (Spec) | SÍ | SÍ | SÍ | NO | NO | NO |
| Admin Center (Impl) | OK | OK | ⚠️PARCIAL | NO | NO | NO |
| Modo Ninja (Spec) | SÍ | NO | NO | NO | NO | NO |
| Modo Ninja (Impl) | OK | OK | OK | OK | OK | OK |
| Mis Tareas (Spec) | SÍ | NO | NO | NO | NO | NO |
| Mis Tareas (Impl) | ⚠️NO EXISTE | - | - | - | - | - |

---

## 6. FILTRADO DE DATOS POR COORDINACIÓN

| Rol | Filtrado | Estado |
|-----|----------|--------|
| Admin | Sin filtros (todos) | OK Correcto |
| Admin Operativo | Sin filtros (todos) | OK Correcto |
| Coordinador Calidad | Sin filtros (todos) | OK Correcto |
| Coordinador | Solo su(s) coordinación(es) | OK Correcto |
| Supervisor | Solo su(s) coordinación(es) | OK Correcto |
| Ejecutivo | Solo sus asignados + backups | OK Correcto |

- **Función principal:** permissionsService.applyProspectFilters() (línea 970)
- **Aplicado en:** 44+ ubicaciones consistentes
- **Seguridad:** Fail-closed (error = sin acceso)
- **Estado: ROBUSTO**

---

## 7. RESTRICCIÓN DE TELÉFONO EN ETAPAS TEMPRANAS

| Rol | Puede Ver Siempre | Condición |
|-----|-------------------|-----------|
| Admin | SÍ | Siempre |
| Coordinador Calidad | SÍ | Siempre |
| Admin Operativo | NO | id_dynamics existe O etapa in ['Activo PQNC', 'Es miembro'] |
| Coordinador | NO | id_dynamics existe O etapa in ['Activo PQNC', 'Es miembro'] |
| Supervisor | NO | id_dynamics existe O etapa in ['Activo PQNC', 'Es miembro'] |
| Ejecutivo | NO | id_dynamics existe O etapa in ['Activo PQNC', 'Es miembro'] |

- **Hook:** src/hooks/usePhoneVisibility.ts
- **Display:** src/components/shared/PhoneDisplay.tsx (enmascara con ••••••••••)
- **Estado: IMPLEMENTADO Y CENTRALIZADO**

---

## 8. RESTRICCIÓN DE PROGRAMACIÓN DE LLAMADAS

**Implementación actual (src/utils/prospectRestrictions.ts):**
- RESTRICTED_STAGES = ['importado_manual'] -- SOLO ESTA ETAPA

**INC-12: Programación en etapas tempranas NO restringida**
- Spec: Coordinadores/supervisores NO pueden programar en etapas tempranas
- Impl: Solo importado_manual está restringido, Primer contacto y En seguimiento NO
- Severidad: MEDIA

---

## 9. HALLAZGOS E INCONSISTENCIAS - RESUMEN

### SEVERIDAD ALTA (2)

| # | Hallazgo | Ubicación |
|---|----------|-----------|
| INC-04 | Modelos LLM sin protección de ruta - acceso por URL posible | MainApp.tsx:410-411 |
| INC-05 | Dashboard sin protección de ruta - renderiza sin canAccessModule | MainApp.tsx:532-534 |

### SEVERIDAD MEDIA (7)

| # | Hallazgo | Ubicación |
|---|----------|-----------|
| INC-01 | Admin Operativo accede a Inicio (spec dice NO) | Sidebar.tsx:684 |
| INC-02 | Coordinador accede a Llamadas PQNC (spec dice NO) | useAnalysisPermissions.ts:134-141 |
| INC-03 | Ejecutivo accede a Llamadas PQNC (spec dice NO) | useAnalysisPermissions.ts |
| INC-06 | Admin Op: Coordinaciones muestra pestaña pero bloquea internamente | AdminDashboardTabs + CoordinacionesManager |
| INC-07 | Coord Calidad sin acceso a Coordinaciones (spec dice SÍ) | AdminDashboardTabs |
| INC-08 | Coord Calidad sin acceso a Horarios (spec dice SÍ) | AdminDashboardTabs |
| INC-12 | Programación no restringida en etapas tempranas | prospectRestrictions.ts |

### SEVERIDAD BAJA (3)

| # | Hallazgo | Ubicación |
|---|----------|-----------|
| INC-09 | Coord Calidad: acceso parcial a Admin Center | AdminDashboardTabs.tsx:85-86 |
| INC-10 | Centro de Soporte: verificar coord_calidad en lista | SupportButton.tsx:168-170 |
| INC-11 | "Mis Tareas" no implementado como módulo | N/A |

### FUNCIONANDO CORRECTAMENTE
- Filtrado de datos por coordinación/ejecutivo (44+ ubicaciones)
- Restricción de teléfono en etapas tempranas (centralizado)
- Modo Ninja (solo admin)
- Campañas (solo admin)
- Preferencias, BD, Tokens, Credenciales, Logs, AWS, Documentación (solo admin)
- Usuarios (admin + admin_op)
- Dynamics CRM (admin + admin_op + coord_calidad)
- Fail-closed en todo el sistema
- RLS en todas las tablas de BD

---

## 10. RECOMENDACIONES

### 10.1 Inmediatas (Alta)
1. Proteger ruta Dashboard en MainApp.tsx con canAccessModule('dashboard')
2. Proteger ruta Modelos LLM en MainApp.tsx con ProtectedRoute

### 10.2 Alineación (Media)
3. Definir spec: Coordinador + PQNC Humans (useAnalysisPermissions.ts:137)
4. Definir spec: Admin Op + Inicio (Sidebar.tsx:684)
5. Alinear Coordinaciones para Admin Op (CoordinacionesManager bloquea no-admins)
6. Agregar Coord Calidad a Coordinaciones y Horarios (AdminDashboardTabs)
7. Agregar etapas tempranas a RESTRICTED_STAGES (prospectRestrictions.ts)

### 10.3 Mejoras Arquitectónicas
8. Crear matriz centralizada de permisos en un solo archivo
9. Unificar ProtectedRoute para TODOS los módulos
10. Auditar RLS en BD con SQL
11. Tests de permisos automatizados por rol

---

## ARCHIVOS CLAVE PARA FIXES

| Archivo | INC Relacionadas |
|---------|------------------|
| src/components/MainApp.tsx | INC-04, INC-05 |
| src/components/Sidebar.tsx | INC-01 |
| src/hooks/useAnalysisPermissions.ts | INC-02, INC-03 |
| src/components/admin/AdminDashboardTabs.tsx | INC-06, INC-07, INC-08, INC-09 |
| src/components/admin/CoordinacionesManager.tsx | INC-06 |
| src/utils/prospectRestrictions.ts | INC-12 |
| src/components/support/SupportButton.tsx | INC-10 |

---

> NOTA: Este documento es solo auditoría. NO se han aplicado cambios al código.
> Antes de implementar fixes, confirmar decisiones de negocio marcadas como "Definir spec".
