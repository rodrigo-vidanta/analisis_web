# 🔍 DIAGNÓSTICO COMPLETO: Migración de ejecutivo_id

**FECHA:** 21 de Enero, 2026  
**ESTADO:** Análisis Completado  
**ACCESO:** RESTRINGIDO (BACKEND / DEVOPS / TECH LEADS)  
**PROYECTO:** glsmifhkoaifvaegsozd (PQNC_AI)

---

## 📊 RESUMEN EJECUTIVO

### ✅ HALLAZGO CRÍTICO POSITIVO

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ¡BUENAS NOTICIAS!                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  107 usuarios migrados tienen legacy_id                                      │
│  107 usuarios tienen legacy_id == id (100% coinciden)                       │
│                                                                              │
│  ESTO SIGNIFICA:                                                             │
│  Los IDs en auth.users.id SON los mismos que los ejecutivo_id               │
│  originales. NO hay discrepancia entre legacy y nuevo.                       │
│                                                                              │
│  IMPACTO: La migración de IDs ya está COMPLETA para usuarios existentes.    │
│  Solo necesitas asegurar que los 37 usuarios NUEVOS se manejen igual.       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. DIAGNÓSTICO DE BASE DE DATOS

### 1.1 Tablas con columna `ejecutivo_id`

| Tabla | Tipo | Registros Totales | Con ejecutivo_id | Sin ejecutivo_id |
|-------|------|------------------|------------------|------------------|
| `prospectos` | BASE TABLE | 2,376 | 1,092 | 1,284 |
| `llamadas_ventas` | BASE TABLE | 1,185 | 1,163 | 22 |
| `prospect_assignments` | BASE TABLE | 402 | 365 | 37 |
| `assignment_logs` | BASE TABLE | 554 | 476 | 78 |
| `acciones_log` | BASE TABLE | 689 | 0 | 689 |
| `uchat_conversations` | BASE TABLE | 0 | 0 | 0 |
| `coordinacion_statistics` | BASE TABLE | - | - | - |
| `live_monitor_view` | VIEW | - | - | - |
| `llamadas_activas_con_prospecto` | VIEW | - | - | - |
| `prospectos_con_ejecutivo_y_coordinacion` | VIEW | - | - | - |
| `vw_ejecutivos_metricas_base` | VIEW | - | - | - |

### 1.2 Foreign Keys en `ejecutivo_id`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚠️ NINGUNA TABLA TIENE FK EN ejecutivo_id                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  IMPACTO: No hay restricciones de integridad referencial.                   │
│  RIESGO: Pueden existir ejecutivo_id huérfanos (usuarios eliminados).       │
│  OPORTUNIDAD: Añadir FKs a auth.users.id sería limpio y sin conflictos.    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Ejecutivo_id Huérfanos - ANÁLISIS DETALLADO

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚠️ PROBLEMA IDENTIFICADO: 3 usuarios RE-CREADOS con IDs nuevos            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Estos usuarios EXISTÍAN en el sistema legacy con un ID,                    │
│  pero fueron ELIMINADOS y RE-CREADOS en auth.users con un ID NUEVO.        │
│                                                                              │
│  Los prospectos/llamadas AÚN tienen el ID VIEJO que ya no existe.           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Usuario | ID Viejo (huérfano) | ID Nuevo (auth.users) | Prospectos | Llamadas |
|---------|---------------------|----------------------|------------|----------|
| **Issel Rico** | `4587ab8a-f55d-4f4e-9ec2-a7272f3a025b` | `2a0a5e21-b773-413d-ae8c-c44fd3451001` | 1 | 2 |
| **Nancy García** | `5d77355f-552b-4a1b-98f1-53e6bc0a12b7` | `084ee6fd-27fb-41e7-a16b-f9f717714eab` | 1 | 6 |
| **Sergio Cervantes** | `d6e8fa6c-273c-4aaf-b544-a383318f5041` | `f272dc5e-2e69-4a9c-b37f-4b4be9f4a645` | 1 | 4 |

**CAUSA RAÍZ:** Estos usuarios NO tienen `legacy_id` en su metadata porque fueron creados NUEVOS (no migrados).

### 1.4 Alcance del Problema

| Tabla | Registros Huérfanos | % del Total |
|-------|---------------------|-------------|
| `prospectos` | 3 | 0.27% (3/1,092) |
| `llamadas_ventas` | 12 | 1.03% (12/1,163) |
| `prospect_assignments` | 0 | 0% |
| `assignment_logs` | 0 | 0% |

**IMPACTO:** Bajo (15 registros en total), pero rompe la integridad referencial.

### 1.5 Solución Requerida - Reasignar IDs Huérfanos

```sql
-- Reasignar prospectos y llamadas de IDs viejos a IDs nuevos

-- 1. Issel Rico
UPDATE prospectos SET ejecutivo_id = '2a0a5e21-b773-413d-ae8c-c44fd3451001'
WHERE ejecutivo_id = '4587ab8a-f55d-4f4e-9ec2-a7272f3a025b';

UPDATE llamadas_ventas SET ejecutivo_id = '2a0a5e21-b773-413d-ae8c-c44fd3451001'
WHERE ejecutivo_id = '4587ab8a-f55d-4f4e-9ec2-a7272f3a025b';

-- 2. Nancy García
UPDATE prospectos SET ejecutivo_id = '084ee6fd-27fb-41e7-a16b-f9f717714eab'
WHERE ejecutivo_id = '5d77355f-552b-4a1b-98f1-53e6bc0a12b7';

UPDATE llamadas_ventas SET ejecutivo_id = '084ee6fd-27fb-41e7-a16b-f9f717714eab'
WHERE ejecutivo_id = '5d77355f-552b-4a1b-98f1-53e6bc0a12b7';

-- 3. Sergio Cervantes
UPDATE prospectos SET ejecutivo_id = 'f272dc5e-2e69-4a9c-b37f-4b4be9f4a645'
WHERE ejecutivo_id = 'd6e8fa6c-273c-4aaf-b544-a383318f5041';

UPDATE llamadas_ventas SET ejecutivo_id = 'f272dc5e-2e69-4a9c-b37f-4b4be9f4a645'
WHERE ejecutivo_id = 'd6e8fa6c-273c-4aaf-b544-a383318f5041';
```

### 1.6 Estadísticas de Usuarios

```
Total usuarios:        144
Con legacy_id:         107 (usuarios migrados desde tabla legacy)
Sin legacy_id:          37 (usuarios creados NUEVOS en auth.users)
legacy_id == id:       107 (100% de los migrados)

⚠️ ATENCIÓN: Los 37 usuarios SIN legacy_id fueron creados DESPUÉS de la migración.
Si estos usuarios existían antes (como Issel, Nancy, Sergio), significa que
fueron ELIMINADOS y RE-CREADOS, perdiendo el vínculo con sus datos históricos.
```

---

## 2. DIAGNÓSTICO DE FRONTEND (UI)

### 2.1 Archivos que usan `ejecutivo_id`

| Archivo | Líneas | Uso |
|---------|--------|-----|
| `src/services/dynamicsReasignacionService.ts` | 13 | Reasignación de prospectos |
| `src/services/coordinacionService.ts` | 5 | Asignación a coordinaciones |
| `src/services/prospectsService.ts` | 7 | Obtención de ejecutivo asignado |
| `src/services/notificationListenerService.ts` | 6 | Notificaciones por asignación |
| `src/services/backupService.ts` | 5 | Sistema de respaldo |
| `src/services/uchatService.ts` | 1 | Filtro de conversaciones |
| `src/components/prospectos/BulkReassignmentTab.tsx` | - | UI de reasignación masiva |
| `src/components/analysis/AnalysisIAComplete.tsx` | - | Panel de análisis |
| `src/components/chat/LiveChatCanvas.tsx` | - | Chat en vivo |
| + 28 archivos más | - | Diversos usos |

**Total:** 37 archivos usan `ejecutivo_id`.

### 2.2 Fuente de Datos para `ejecutivo_id` en Frontend

```typescript
// El frontend obtiene ejecutivos desde:
// 1. prospectos.ejecutivo_id (directo de la tabla)
// 2. user_profiles_v2.id (para datos del ejecutivo)
// 3. coordinacionService.getEjecutivoById(ejecutivo_id)

// IMPORTANTE: El campo ejecutivo_id en prospectos es un UUID que
// DEBE coincidir con auth.users.id (o user_profiles_v2.id)
```

### 2.3 ¿Se usa `legacy_id` en el frontend?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ✅ NO SE USA legacy_id EN EL FRONTEND                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Búsqueda: grep "legacy_id" src/ → 0 resultados                             │
│                                                                              │
│  IMPACTO: El frontend NO depende de legacy_id.                              │
│  El frontend usa directamente los IDs de las tablas.                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Análisis Detallado del Flujo de `ejecutivo_id` en Frontend

#### 2.4.1 Fuente de los IDs de Ejecutivos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ✅ EL FRONTEND YA USA user_profiles_v2.id CORRECTAMENTE                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FLUJO DE REASIGNACIÓN:                                                      │
│                                                                              │
│  1. coordinacionService.getEjecutivosByCoordinacion(coordId)                │
│     └─► Consulta user_profiles_v2                                            │
│     └─► Retorna ejecutivos con .id = auth.users.id                          │
│                                                                              │
│  2. UI muestra <option key={e.id} value={e.id}>                             │
│     └─► El value ES el user_profiles_v2.id                                   │
│                                                                              │
│  3. setTargetEjecutivoId(e.target.value)                                    │
│     └─► Guarda el ID de user_profiles_v2                                     │
│                                                                              │
│  4. dynamicsReasignacionService.reasignarProspecto({                        │
│       nuevo_ejecutivo_id: targetEjecutivoId  ← ES user_profiles_v2.id      │
│     })                                                                       │
│                                                                              │
│  5. UPDATE prospectos SET ejecutivo_id = nuevo_ejecutivo_id                 │
│     └─► Guarda user_profiles_v2.id = auth.users.id                          │
│                                                                              │
│  CONCLUSIÓN: El flujo es CORRECTO. No requiere cambios.                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 2.4.2 Servicios Analizados

| Servicio | Fuente de ejecutivo_id | Estado |
|----------|------------------------|--------|
| `coordinacionService.getEjecutivosByCoordinacion()` | `user_profiles_v2.id` | ✅ Correcto |
| `coordinacionService.getCoordinadoresByCoordinacion()` | `user_profiles_v2.id` | ✅ Correcto |
| `coordinacionService.getEjecutivoById()` | `user_profiles_v2.id` | ✅ Correcto |
| `coordinacionService.getAllEjecutivos()` | `user_profiles_v2.id` | ✅ Correcto |
| `prospectsService` (filtros) | `prospectos.ejecutivo_id` | ✅ Correcto |
| `dynamicsReasignacionService` | Recibe ID de UI | ✅ Correcto |
| `backupService` | `user_profiles_v2.id` | ✅ Correcto |

#### 2.4.3 Componentes Analizados

| Componente | Uso de ejecutivo_id | Estado |
|------------|---------------------|--------|
| `BulkReassignmentTab.tsx` | Selecciona de `user_profiles_v2`, guarda en `prospectos` | ✅ Correcto |
| `AnalysisIAComplete.tsx` | Lee `prospectos.ejecutivo_id`, consulta `getEjecutivoById()` | ✅ Correcto |
| `ConversacionesWidget.tsx` | Filtra por `prospectos.ejecutivo_id` | ✅ Correcto |
| `LiveChatCanvas.tsx` | Filtra por `prospectos.ejecutivo_id` | ✅ Correcto |
| `ProspectosManager.tsx` | Dropdown usa `ejecutivo.id` de `user_profiles_v2` | ✅ Correcto |

#### 2.4.4 Diagrama del Flujo Completo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUJO FRONTEND → BASE DE DATOS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [UI: Dropdown de Ejecutivos]                                                │
│           │                                                                  │
│           ▼                                                                  │
│  coordinacionService.getEjecutivosByCoordinacion(coordId)                   │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  SELECT id, full_name, ...                                          │    │
│  │  FROM user_profiles_v2  ◄──────── FUENTE DE IDs                    │    │
│  │  WHERE coordinacion_id = coordId                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│           │                                                                  │
│           ▼                                                                  │
│  [UI: Usuario selecciona ejecutivo]                                          │
│  <option value={ejecutivo.id}>  ◄──── user_profiles_v2.id                   │
│           │                                                                  │
│           ▼                                                                  │
│  setTargetEjecutivoId(e.target.value)  ◄──── Guarda user_profiles_v2.id     │
│           │                                                                  │
│           ▼                                                                  │
│  dynamicsReasignacionService.reasignarProspecto({                           │
│    nuevo_ejecutivo_id: targetEjecutivoId  ◄──── user_profiles_v2.id         │
│  })                                                                          │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  UPDATE prospectos                                                  │    │
│  │  SET ejecutivo_id = nuevo_ejecutivo_id  ◄──── user_profiles_v2.id  │    │
│  │  WHERE id = prospecto_id                                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│           │                                                                  │
│           ▼                                                                  │
│  prospectos.ejecutivo_id = auth.users.id = user_profiles_v2.id              │
│                                                                              │
│  ✅ TODO EL FLUJO USA EL MISMO ID: auth.users.id                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 2.4.5 Verificación de Consultas de Lectura

Cuando el frontend **lee** un ejecutivo asignado:

```typescript
// En prospectsService.ts línea 354-356:
if (data.ejecutivo_id) {
  ejecutivoInfo = await coordinacionService.getEjecutivoById(data.ejecutivo_id);
}

// getEjecutivoById consulta user_profiles_v2 WHERE id = ejecutivo_id
// Esto funciona porque:
// - prospectos.ejecutivo_id = auth.users.id (confirmado)
// - user_profiles_v2.id = auth.users.id (por definición de la vista)
```

**Resultado:** ✅ Las lecturas funcionan correctamente.

---

## 3. DIAGNÓSTICO DE FUNCIONES Y TRIGGERS

### 3.1 Triggers Relevantes

| Trigger | Tabla | Función | Impacto |
|---------|-------|---------|---------|
| `trigger_notify_prospecto_changes` | prospectos | `fn_notify_prospecto_changes()` | ⚠️ Usa ejecutivo_id |
| `trigger_auto_assign_call` | llamadas_ventas | `auto_assign_call_to_coordinacion()` | ⚠️ Usa ejecutivo_id |
| `trigger_auto_assign_new_prospect` | prospectos | `auto_assign_new_prospect()` | ⚠️ Usa ejecutivo_id |
| `trigger_auto_assign_prospect_with_crm` | prospectos | `auto_assign_prospect_with_crm()` | ⚠️ Usa ejecutivo_id |

### 3.2 Funciones RPC que usan `auth_users` o `ejecutivo_id`

| Función | Estado | Acción Requerida |
|---------|--------|------------------|
| `fn_notify_prospecto_changes` | ✅ Ya usa `user_profiles_v2` | Ninguna |
| `auto_assign_call_to_coordinacion` | ⚠️ Revisar | Verificar si usa auth_users |
| `auto_assign_prospect_with_crm` | ⚠️ Revisar | Verificar si usa auth_users |
| `can_user_access_prospect` | ✅ Ya migrada | Ninguna |
| `get_ejecutivos_metricas` | ✅ Ya migrada | Ninguna |
| `update_prospecto_ejecutivo` | ⚠️ Revisar | Verificar queries |
| `create_user_with_role` | 🔴 DEPRECADA | No usar |
| `update_user_metadata` | 🔴 DEPRECADA | No usar |
| `migrate_user_to_supabase_auth` | 🔴 Solo migración | No tocar |

---

## 4. VISTA `user_profiles_v2` - ANÁLISIS

### 4.1 Columnas Actuales (29 columnas)

```sql
id                    -- UUID de auth.users (ESTE ES EL ejecutivo_id correcto)
email                 -- Email del usuario
full_name             -- Nombre completo
first_name            -- Primer nombre
last_name             -- Apellidos
phone                 -- Teléfono
organization          -- Organización (PQNC)
role_id               -- ID del rol
role_name             -- Nombre del rol
role_display_name     -- Nombre visible del rol
coordinacion_id       -- ID de coordinación asignada
is_active             -- Cuenta activa
is_operativo          -- Puede recibir asignaciones
is_coordinator        -- Es coordinador
is_ejecutivo          -- Es ejecutivo
inbound               -- Recibe mensajes inbound
has_backup            -- Tiene backup asignado
backup_id             -- ID del backup
telefono_original     -- Teléfono original
id_colaborador        -- ID de colaborador
id_dynamics           -- ID en Microsoft Dynamics CRM
must_change_password  -- Debe cambiar contraseña
email_verified        -- Email verificado
failed_login_attempts -- Intentos fallidos
locked_until          -- Bloqueado hasta
legacy_id             -- ID legado (IGUAL a id en 100% de casos)
created_at            -- Fecha creación
updated_at            -- Fecha actualización
last_login            -- Último acceso
```

### 4.2 Campo `legacy_id` - ¿Eliminarlo?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ANÁLISIS: ¿Podemos eliminar legacy_id de la vista?                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PRO:                                                                        │
│  - No se usa en frontend (confirmado)                                        │
│  - Es redundante (id == legacy_id en 100% de casos)                          │
│  - Simplifica la arquitectura                                                │
│                                                                              │
│  CONTRA:                                                                     │
│  - Algunos workflows N8N podrían usarlo                                      │
│  - Es metadata de auditoría (cuándo se migró)                                │
│                                                                              │
│  RECOMENDACIÓN: Mantenerlo por ahora, pero marcarlo como DEPRECATED.        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. PLAN DE ACCIÓN RECOMENDADO

### 5.1 Acciones Inmediatas (Sin riesgo)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ✅ NINGUNA MIGRACIÓN MASIVA ES NECESARIA                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Dado que legacy_id == id en 100% de los casos, los ejecutivo_id           │
│  en prospectos/llamadas YA apuntan correctamente a auth.users.id            │
│                                                                              │
│  CONFIRMADO: El ejecutivo_id en tablas = auth.users.id                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**1. Limpiar prospectos huérfanos (3 registros):**
```sql
-- Opción A: Reasignar a NULL (sin ejecutivo)
UPDATE prospectos SET ejecutivo_id = NULL 
WHERE ejecutivo_id IN (
  '4587ab8a-f55d-4f4e-9ec2-a7272f3a025b',
  '5d77355f-552b-4a1b-98f1-53e6bc0a12b7',
  'd6e8fa6c-273c-4aaf-b544-a383318f5041'
);

-- Opción B: Ver qué prospectos son
SELECT id, nombre_completo, whatsapp, ejecutivo_id 
FROM prospectos 
WHERE ejecutivo_id IN (...);
```

**2. Añadir FKs para integridad (opcional pero recomendado):**
```sql
-- Añadir FK a prospectos
ALTER TABLE prospectos
ADD CONSTRAINT fk_prospectos_ejecutivo 
FOREIGN KEY (ejecutivo_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Añadir FK a llamadas_ventas
ALTER TABLE llamadas_ventas
ADD CONSTRAINT fk_llamadas_ejecutivo 
FOREIGN KEY (ejecutivo_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Añadir FK a prospect_assignments
ALTER TABLE prospect_assignments
ADD CONSTRAINT fk_assignments_ejecutivo 
FOREIGN KEY (ejecutivo_id) REFERENCES auth.users(id) ON DELETE SET NULL;
```

### 5.2 Para Nuevos Usuarios

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  REGLA PARA USUARIOS NUEVOS                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Cuando se crea un usuario nuevo:                                            │
│  1. Se crea en auth.users con un UUID generado automáticamente              │
│  2. Este UUID es su auth.users.id                                            │
│  3. Este MISMO UUID se usa como ejecutivo_id en prospectos/llamadas         │
│  4. NO es necesario guardar legacy_id para usuarios nuevos                  │
│                                                                              │
│  FLUJO:                                                                      │
│  auth-admin-proxy → createUser → auth.users.id = NUEVO_UUID                 │
│  Asignar prospecto → prospectos.ejecutivo_id = NUEVO_UUID                   │
│  Consultar ejecutivo → user_profiles_v2 WHERE id = NUEVO_UUID               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Para Backend Externo

```typescript
// REGLA SIMPLE PARA TU BACKEND:
// ejecutivo_id = auth.users.id = user_profiles_v2.id

// Consulta de ejecutivo:
const { data } = await supabase
  .from('user_profiles_v2')
  .select('*')
  .eq('id', ejecutivo_id)  // El ejecutivo_id ES el id de la vista
  .single();

// NO necesitas buscar en dos tablas.
// NO necesitas usar legacy_id.
// UNA sola consulta, UN solo ID.
```

---

## 6. IMPACTO DE LA RESTRUCTURACIÓN

### 6.1 Si NO haces nada (Estado actual)

| Aspecto | Estado |
|---------|--------|
| Usuarios migrados | ✅ Funcionan correctamente |
| Usuarios nuevos | ✅ Funcionarán correctamente |
| Frontend | ✅ Sin cambios necesarios |
| Backend externo | ⚠️ Debe usar `user_profiles_v2.id` como ejecutivo_id |
| N8N Workflows | ⚠️ Deben consultar `user_profiles_v2` en vez de `auth_users` |
| FKs | ⚠️ No hay integridad referencial |

### 6.2 Si añades FKs (Recomendado)

| Aspecto | Impacto |
|---------|---------|
| Tiempo de implementación | 5 minutos |
| Riesgo | Bajo (solo 3 registros huérfanos) |
| Beneficio | Integridad referencial garantizada |
| Downtime | Ninguno |

### 6.3 Si eliminas `legacy_id` de la vista

| Aspecto | Impacto |
|---------|---------|
| Frontend | ✅ Sin impacto (no lo usa) |
| Backend | ⚠️ Verificar si algún servicio lo consume |
| N8N | ⚠️ Verificar workflows |
| Auditoría | 🔴 Se pierde rastro de migración |

**Recomendación:** NO eliminar por ahora, solo documentar como DEPRECATED.

---

## 7. DIAGRAMA FINAL DE ARQUITECTURA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA ACTUAL (CORRECTA)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  auth.users                          prospectos                              │
│  ┌────────────────────────┐          ┌────────────────────────┐             │
│  │ id: ABC-123 ───────────┼─────────►│ ejecutivo_id: ABC-123  │             │
│  │ email: user@test.com   │          │ nombre_completo: ...   │             │
│  │ raw_user_meta_data:    │          │ coordinacion_id: ...   │             │
│  │   └─ full_name: "..."  │          └────────────────────────┘             │
│  │   └─ role_id: "..."    │                                                  │
│  │   └─ is_operativo:true │          llamadas_ventas                        │
│  │   └─ inbound: false    │          ┌────────────────────────┐             │
│  │   └─ legacy_id:ABC-123 │─ ─ ─ ─ ─►│ ejecutivo_id: ABC-123  │             │
│  └────────────────────────┘          │ prospecto_id: ...      │             │
│            │                         └────────────────────────┘             │
│            │                                                                 │
│            ▼                                                                 │
│  user_profiles_v2 (VISTA)                                                    │
│  ┌────────────────────────┐                                                 │
│  │ id: ABC-123 ◄──────────┼────── ESTE ES EL ejecutivo_id                   │
│  │ full_name: "..."       │        que debes consultar                       │
│  │ is_operativo: true     │                                                  │
│  │ inbound: false         │                                                  │
│  │ legacy_id: ABC-123     │ ← DEPRECATED (igual a id)                        │
│  └────────────────────────┘                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. CONCLUSIONES

### ✅ Lo que YA funciona (99% de los datos):

1. **1,089 de 1,092 prospectos** tienen ejecutivo_id válido (99.7%)
2. **1,151 de 1,163 llamadas** tienen ejecutivo_id válido (98.97%)
3. **El frontend ya usa `user_profiles_v2.id`:** Todos los servicios consultan la vista correcta
4. **Los 107 usuarios migrados** tienen `legacy_id == id` (100% coinciden)
5. **Los triggers ya están migrados:** `fn_notify_prospecto_changes` usa `user_profiles_v2`

### ⚠️ PROBLEMA ENCONTRADO (CRÍTICO):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  3 USUARIOS FUERON RE-CREADOS CON IDs NUEVOS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Usuario         │ ID Viejo (huérfano)           │ ID Nuevo (actual)        │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Issel Rico      │ 4587ab8a-f55d-4f4e-9ec2-...   │ 2a0a5e21-b773-413d-...   │
│  Nancy García    │ 5d77355f-552b-4a1b-98f1-...   │ 084ee6fd-27fb-41e7-...   │
│  Sergio Cervantes│ d6e8fa6c-273c-4aaf-b544-...   │ f272dc5e-2e69-4a9c-...   │
│                                                                              │
│  REGISTROS AFECTADOS:                                                        │
│  - 3 prospectos con ejecutivo_id viejo                                       │
│  - 12 llamadas con ejecutivo_id viejo                                        │
│                                                                              │
│  CAUSA: Estos usuarios fueron ELIMINADOS y RE-CREADOS después de la         │
│  migración, obteniendo IDs nuevos. Sus datos históricos quedaron            │
│  vinculados al ID viejo que ya no existe.                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 🔴 ACCIÓN REQUERIDA (INMEDIATA):

**Reasignar los 15 registros huérfanos a los IDs nuevos:**

```sql
-- 1. Issel Rico (1 prospecto, 2 llamadas)
UPDATE prospectos SET ejecutivo_id = '2a0a5e21-b773-413d-ae8c-c44fd3451001'
WHERE ejecutivo_id = '4587ab8a-f55d-4f4e-9ec2-a7272f3a025b';
UPDATE llamadas_ventas SET ejecutivo_id = '2a0a5e21-b773-413d-ae8c-c44fd3451001'
WHERE ejecutivo_id = '4587ab8a-f55d-4f4e-9ec2-a7272f3a025b';

-- 2. Nancy García (1 prospecto, 6 llamadas)
UPDATE prospectos SET ejecutivo_id = '084ee6fd-27fb-41e7-a16b-f9f717714eab'
WHERE ejecutivo_id = '5d77355f-552b-4a1b-98f1-53e6bc0a12b7';
UPDATE llamadas_ventas SET ejecutivo_id = '084ee6fd-27fb-41e7-a16b-f9f717714eab'
WHERE ejecutivo_id = '5d77355f-552b-4a1b-98f1-53e6bc0a12b7';

-- 3. Sergio Cervantes (1 prospecto, 4 llamadas)
UPDATE prospectos SET ejecutivo_id = 'f272dc5e-2e69-4a9c-b37f-4b4be9f4a645'
WHERE ejecutivo_id = 'd6e8fa6c-273c-4aaf-b544-a383318f5041';
UPDATE llamadas_ventas SET ejecutivo_id = 'f272dc5e-2e69-4a9c-b37f-4b4be9f4a645'
WHERE ejecutivo_id = 'd6e8fa6c-273c-4aaf-b544-a383318f5041';
```

### ✅ ANÁLISIS FRONTEND COMPLETADO:

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Servicios de coordinación | ✅ Correcto | Usan `user_profiles_v2` |
| Componentes de reasignación | ✅ Correcto | IDs vienen de `user_profiles_v2` |
| Filtros de prospectos | ✅ Correcto | Usan `prospectos.ejecutivo_id` |
| Consultas de ejecutivo | ✅ Correcto | `getEjecutivoById()` usa `user_profiles_v2` |
| Uso de `legacy_id` | ✅ No se usa | 0 referencias en código |

**VEREDICTO FRONTEND: NO REQUIERE AJUSTES (una vez corregidos los IDs huérfanos en BD).**

### ⚠️ RECOMENDACIONES ADICIONALES:

1. **Añadir FKs:** Para prevenir futuros huérfanos con `ON DELETE SET NULL`
2. **Política de recreación:** NUNCA eliminar y recrear usuarios; siempre EDITAR
3. **Tu backend externo:** Consultar `user_profiles_v2` con `id = ejecutivo_id`
4. **N8N:** Actualizar queries que aún usen `auth_users` a `user_profiles_v2`

### 🔴 Lo que NO debes hacer:

1. **NO crear campo ejecutivo_id en metadata:** El `id` nativo ES el ejecutivo_id
2. **NO usar legacy_id:** Es redundante (solo para auditoría)
3. **NO eliminar y recrear usuarios:** Esto rompe vínculos históricos

---

## 9. COMANDOS DE REFERENCIA

### Consultar ejecutivo por ID
```sql
SELECT * FROM user_profiles_v2 WHERE id = 'ejecutivo_id_aqui';
```

### Verificar integridad
```sql
SELECT COUNT(*) as huerfanos
FROM prospectos p 
LEFT JOIN auth.users au ON au.id = p.ejecutivo_id 
WHERE p.ejecutivo_id IS NOT NULL AND au.id IS NULL;
```

### Limpiar huérfanos
```sql
UPDATE prospectos SET ejecutivo_id = NULL 
WHERE ejecutivo_id NOT IN (SELECT id FROM auth.users);
```

---

**Documento generado automáticamente por diagnóstico de sistema**  
**Fecha:** 21 de Enero, 2026  
**Versión:** 1.0.0
