# 📋 PLAN DE IMPLEMENTACIÓN - SISTEMA DE ROLES Y PERMISOS

**Fecha:** 2025-01-24  
**Versión:** 1.0.0  
**Base de datos objetivo:** System_UI (zbylezfyagwrxoecioup.supabase.co)  
**Estado:** 🚧 En Planificación

---

## 🎯 OBJETIVO GENERAL

Implementar un sistema completo de roles y permisos basado en coordinaciones y ejecutivos, con asignación automática de prospectos y control granular de acceso a módulos.

---

## 📊 ESTRUCTURA DE COORDINACIONES

### Coordinaciones Definidas (5)
1. **VEN** - Coordinación VEN
2. **I360** - Coordinación I360
3. **MVP** - Coordinación MVP
4. **COBACA** - Coordinación COBACA
5. **BOOM** - Coordinación BOOM

---

## 👥 ESTRUCTURA DE USUARIOS

### Roles del Sistema
- **coordinador**: Coordinador de una coordinación específica
- **ejecutivo**: Ejecutivo/vendedor asignado a una coordinación

### Usuarios de Prueba a Crear

#### Coordinadores (5 usuarios)
- `coordinador_ven@grupovidanta.com` - Coordinador VEN
- `coordinador_i360@grupovidanta.com` - Coordinador I360
- `coordinador_mvp@grupovidanta.com` - Coordinador MVP
- `coordinador_cobaca@grupovidanta.com` - Coordinador COBACA
- `coordinador_boom@grupovidanta.com` - Coordinador BOOM

**Contraseña:** `Admin$2025`

#### Ejecutivos (10 usuarios - 2 por coordinación)
- `ejecutivo1_ven@grupovidanta.com` - Ejecutivo 1 VEN
- `ejecutivo2_ven@grupovidanta.com` - Ejecutivo 2 VEN
- `ejecutivo1_i360@grupovidanta.com` - Ejecutivo 1 I360
- `ejecutivo2_i360@grupovidanta.com` - Ejecutivo 2 I360
- `ejecutivo1_mvp@grupovidanta.com` - Ejecutivo 1 MVP
- `ejecutivo2_mvp@grupovidanta.com` - Ejecutivo 2 MVP
- `ejecutivo1_cobaca@grupovidanta.com` - Ejecutivo 1 COBACA
- `ejecutivo2_cobaca@grupovidanta.com` - Ejecutivo 2 COBACA
- `ejecutivo1_boom@grupovidanta.com` - Ejecutivo 1 BOOM
- `ejecutivo2_boom@grupovidanta.com` - Ejecutivo 2 BOOM

**Contraseña:** `Admin$2025`

---

## 🗄️ ESQUEMA DE BASE DE DATOS (System_UI)

### Tablas Nuevas a Crear

#### 1. `coordinaciones`
```sql
id UUID PRIMARY KEY
codigo VARCHAR(10) UNIQUE NOT NULL -- VEN, I360, MVP, COBACA, BOOM
nombre VARCHAR(255) NOT NULL
descripcion TEXT
is_active BOOLEAN DEFAULT true
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### 2. `auth_roles` (si no existe)
```sql
id UUID PRIMARY KEY
name VARCHAR(50) UNIQUE NOT NULL -- coordinador, ejecutivo
display_name VARCHAR(100) NOT NULL
description TEXT
permissions JSONB DEFAULT '{}'
is_active BOOLEAN DEFAULT true
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### 3. `auth_users` (si no existe)
```sql
id UUID PRIMARY KEY
email VARCHAR(255) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
full_name VARCHAR(255)
first_name VARCHAR(100)
last_name VARCHAR(100)
phone VARCHAR(50)
role_id UUID REFERENCES auth_roles(id)
coordinacion_id UUID REFERENCES coordinaciones(id)
is_active BOOLEAN DEFAULT true
email_verified BOOLEAN DEFAULT false
last_login TIMESTAMP WITH TIME ZONE
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### 4. `prospect_assignments` (Asignaciones de prospectos)
```sql
id UUID PRIMARY KEY
prospect_id UUID NOT NULL -- ID del prospecto en base de análisis
coordinacion_id UUID REFERENCES coordinaciones(id)
ejecutivo_id UUID REFERENCES auth_users(id) -- NULL hasta que tenga ID CRM
assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
assigned_by UUID REFERENCES auth_users(id) -- NULL si es automático
assignment_type VARCHAR(50) DEFAULT 'automatic' -- automatic, manual
assignment_reason TEXT
unassigned_at TIMESTAMP WITH TIME ZONE
is_active BOOLEAN DEFAULT true
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### 5. `assignment_logs` (Auditoría de asignaciones)
```sql
id UUID PRIMARY KEY
prospect_id UUID NOT NULL
coordinacion_id UUID REFERENCES coordinaciones(id)
ejecutivo_id UUID REFERENCES auth_users(id)
action VARCHAR(50) NOT NULL -- assigned, reassigned, unassigned
assigned_by UUID REFERENCES auth_users(id)
reason TEXT
metadata JSONB DEFAULT '{}'
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### 6. `coordinacion_statistics` (Estadísticas diarias)
```sql
id UUID PRIMARY KEY
coordinacion_id UUID REFERENCES coordinaciones(id)
ejecutivo_id UUID REFERENCES auth_users(id) -- NULL para estadísticas de coordinación
stat_date DATE NOT NULL -- Fecha del día (0:00)
prospects_assigned_count INTEGER DEFAULT 0
calls_assigned_count INTEGER DEFAULT 0
conversations_assigned_count INTEGER DEFAULT 0
last_assignment_time TIMESTAMP WITH TIME ZONE
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
UNIQUE(coordinacion_id, ejecutivo_id, stat_date)
```

#### 7. `permissions` (Permisos granulares)
```sql
id UUID PRIMARY KEY
role_id UUID REFERENCES auth_roles(id)
module VARCHAR(50) NOT NULL -- prospectos, livechat, livemonitor
permission_type VARCHAR(50) NOT NULL -- view, create, update, delete, assign
is_granted BOOLEAN DEFAULT true
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

---

## 🔄 MODIFICACIONES A TABLAS EXISTENTES

### Base de Análisis (glsmifhkoaifvaegsozd.supabase.co)

#### Tabla `prospectos`
```sql
-- Agregar campos (si no existen)
ALTER TABLE prospectos 
ADD COLUMN IF NOT EXISTS coordinacion_id UUID,
ADD COLUMN IF NOT EXISTS ejecutivo_id UUID,
ADD COLUMN IF NOT EXISTS assignment_date TIMESTAMP WITH TIME ZONE;

-- id_dynamics ya existe (es el ID de CRM)
```

#### Tabla `llamadas_ventas`
```sql
-- Agregar campos
ALTER TABLE llamadas_ventas
ADD COLUMN IF NOT EXISTS coordinacion_id UUID,
ADD COLUMN IF NOT EXISTS ejecutivo_id UUID;
```

### System_UI (zbylezfyagwrxoecioup.supabase.co)

#### Tabla `uchat_conversations`
```sql
-- Agregar campos
ALTER TABLE uchat_conversations
ADD COLUMN IF NOT EXISTS coordinacion_id UUID REFERENCES coordinaciones(id),
ADD COLUMN IF NOT EXISTS ejecutivo_id UUID REFERENCES auth_users(id);
```

---

## ⚙️ FUNCIONES RPC A CREAR

### 1. `assign_prospect_to_coordinacion(prospect_id UUID)`
Asigna un prospecto a la coordinación con menos asignaciones en las últimas 24 horas.

### 2. `assign_prospect_to_ejecutivo(prospect_id UUID, coordinacion_id UUID)`
Asigna un prospecto a un ejecutivo de la coordinación según carga de trabajo.

### 3. `get_coordinacion_assignment_count(coordinacion_id UUID, start_date TIMESTAMP)`
Obtiene el número de prospectos asignados a una coordinación desde una fecha.

### 4. `get_ejecutivo_assignment_count(ejecutivo_id UUID, start_date TIMESTAMP)`
Obtiene el número de prospectos asignados a un ejecutivo desde una fecha.

### 5. `check_and_assign_prospect_with_crm(prospect_id UUID)`
Verifica si un prospecto tiene ID CRM y lo asigna automáticamente a un ejecutivo.

### 6. `get_user_permissions(user_id UUID)`
Obtiene todos los permisos de un usuario según su rol y coordinación.

### 7. `can_user_access_prospect(user_id UUID, prospect_id UUID)`
Verifica si un usuario puede acceder a un prospecto específico.

---

## 🔐 PERMISOS POR ROL

### Coordinador
- ✅ Ver todas las conversaciones de su coordinación
- ✅ Ver todas las llamadas de Live Monitor de su coordinación
- ✅ Asignar prospectos a ejecutivos de su coordinación
- ✅ Ver estadísticas de su coordinación
- ✅ Gestionar ejecutivos (crear, editar, desactivar)
- ✅ Ver módulos: Prospectos, Live Chat, Live Monitor
- ❌ No puede ver otras coordinaciones

### Ejecutivo
- ✅ Ver solo sus prospectos asignados
- ✅ Ver solo sus conversaciones asignadas
- ✅ Ver solo sus llamadas asignadas en Live Monitor
- ✅ Ver módulos: Prospectos, Live Chat, Live Monitor
- ❌ No puede asignar prospectos
- ❌ No puede ver otros ejecutivos

---

## 🤖 LÓGICA DE ASIGNACIÓN AUTOMÁTICA

### Asignación a Coordinación (Nuevos Prospectos)

**Trigger:** Cuando se crea un nuevo prospecto o llega una nueva llamada/mensaje

**Algoritmo:**
1. Obtener fecha de inicio del día actual (0:00)
2. Contar prospectos asignados por coordinación desde las 0:00
3. Seleccionar coordinación con menor número de asignaciones
4. Si hay empate, usar round-robin (basado en última asignación)
5. Asignar prospecto a coordinación seleccionada
6. Registrar en `prospect_assignments` y `assignment_logs`
7. Actualizar `coordinacion_statistics`

### Asignación a Ejecutivo (Prospectos con ID CRM)

**Trigger:** Cuando un prospecto obtiene `id_dynamics` (ID CRM)

**Algoritmo:**
1. Obtener `coordinacion_id` del prospecto
2. Obtener fecha de inicio del día actual (0:00)
3. Contar prospectos asignados por ejecutivo de esa coordinación desde las 0:00
4. Seleccionar ejecutivo con menor número de asignaciones
5. Si hay empate, usar round-robin
6. Asignar prospecto a ejecutivo seleccionado
7. Actualizar `prospect_assignments` y `assignment_logs`
8. Actualizar `coordinacion_statistics`

---

## 📱 MÓDULOS A MODIFICAR

### 1. Live Monitor (`src/components/analysis/LiveMonitor.tsx`)
- Filtrar llamadas según rol del usuario
- Coordinador: Ver todas las llamadas de su coordinación
- Ejecutivo: Ver solo sus llamadas asignadas

### 2. Live Chat (`src/components/chat/LiveChatCanvas.tsx`)
- Filtrar conversaciones según rol del usuario
- Coordinador: Ver todas las conversaciones de su coordinación
- Ejecutivo: Ver solo sus conversaciones asignadas

### 3. Prospectos (`src/components/prospectos/ProspectosManager.tsx`)
- Filtrar prospectos según rol del usuario
- Coordinador: Ver todos los prospectos de su coordinación
- Ejecutivo: Ver solo sus prospectos asignados
- Agregar columna de coordinación y ejecutivo asignado

### 4. Gestión de Ejecutivos (NUEVO - `src/components/admin/EjecutivosManager.tsx`)
- Solo visible para coordinadores
- CRUD completo de ejecutivos
- Estadísticas por ejecutivo
- Asignación manual de prospectos

---

## 🛠️ SERVICIOS A CREAR/MODIFICAR

### Nuevos Servicios

#### `src/services/coordinacionService.ts`
- Gestión de coordinaciones
- Asignación automática de prospectos
- Estadísticas de coordinaciones

#### `src/services/assignmentService.ts`
- Lógica de asignación automática
- Round-robin
- Cálculo de carga de trabajo

#### `src/services/permissionsService.ts`
- Verificación de permisos
- Filtrado de datos según rol
- Validación de acceso a módulos

### Servicios a Modificar

#### `src/services/liveMonitorService.ts`
- Agregar filtros por coordinación/ejecutivo
- Validar permisos antes de mostrar datos

#### `src/services/uchatService.ts`
- Agregar filtros por coordinación/ejecutivo
- Validar permisos antes de mostrar conversaciones

#### `src/services/prospectsService.ts`
- Agregar filtros por coordinación/ejecutivo
- Validar permisos antes de mostrar prospectos

---

## 🔄 TRIGGERS Y FUNCIONES AUTOMÁTICAS

### Trigger en `prospectos` (Base de Análisis)
```sql
-- Trigger que detecta cuando se crea un nuevo prospecto
-- y lo asigna automáticamente a una coordinación
```

### Trigger en `prospectos.id_dynamics` (Base de Análisis)
```sql
-- Trigger que detecta cuando un prospecto obtiene ID CRM
-- y lo asigna automáticamente a un ejecutivo
```

### Trigger en `llamadas_ventas` (Base de Análisis)
```sql
-- Trigger que detecta nuevas llamadas
-- y asigna según el prospecto asociado
```

### Trigger en `uchat_conversations` (System_UI)
```sql
-- Trigger que detecta nuevas conversaciones
-- y asigna según el prospecto asociado
```

---

## 📊 INTERFAZ DE USUARIO

### Componentes Nuevos

#### `EjecutivosManager.tsx`
- Lista de ejecutivos de la coordinación
- Formulario para crear/editar ejecutivos
- Estadísticas por ejecutivo
- Asignación manual de prospectos
- Desactivar/activar ejecutivos

#### `CoordinacionDashboard.tsx`
- Vista de coordinadores con estadísticas
- Métricas de asignaciones
- Gráficos de carga de trabajo

### Componentes a Modificar

#### `LiveMonitor.tsx`
- Agregar filtro por coordinación (solo coordinadores)
- Mostrar coordinación asignada en cada llamada
- Mostrar ejecutivo asignado si existe

#### `LiveChatCanvas.tsx`
- Agregar filtro por coordinación (solo coordinadores)
- Mostrar coordinación asignada en cada conversación
- Mostrar ejecutivo asignado si existe

#### `ProspectosManager.tsx`
- Agregar columna de coordinación
- Agregar columna de ejecutivo
- Filtros por coordinación/ejecutivo
- Botón de asignación manual (solo coordinadores)

---

## 🧪 PLAN DE PRUEBAS

### Pruebas Unitarias
1. ✅ Asignación automática a coordinación (round-robin)
2. ✅ Asignación automática a ejecutivo (round-robin)
3. ✅ Cálculo de carga de trabajo (24 horas desde 0:00)
4. ✅ Validación de permisos por rol

### Pruebas de Integración
1. ✅ Crear nuevo prospecto → Asignación automática
2. ✅ Agregar ID CRM → Asignación a ejecutivo
3. ✅ Nueva llamada → Asignación según prospecto
4. ✅ Nueva conversación → Asignación según prospecto

### Pruebas de Permisos
1. ✅ Coordinador ve solo su coordinación
2. ✅ Ejecutivo ve solo sus asignaciones
3. ✅ Coordinador puede asignar prospectos
4. ✅ Ejecutivo NO puede asignar prospectos

---

## 📝 ORDEN DE IMPLEMENTACIÓN

### Fase 1: Base de Datos (System_UI)
1. ✅ Crear tabla `coordinaciones`
2. ✅ Crear tabla `auth_roles` (si no existe)
3. ✅ Crear tabla `auth_users` (si no existe)
4. ✅ Crear tabla `prospect_assignments`
5. ✅ Crear tabla `assignment_logs`
6. ✅ Crear tabla `coordinacion_statistics`
7. ✅ Crear tabla `permissions`
8. ✅ Crear usuarios de prueba (coordinadores y ejecutivos)
9. ✅ Insertar coordinaciones (VEN, I360, MVP, COBACA, BOOM)

### Fase 2: Funciones RPC
1. ✅ `assign_prospect_to_coordinacion`
2. ✅ `assign_prospect_to_ejecutivo`
3. ✅ `get_coordinacion_assignment_count`
4. ✅ `get_ejecutivo_assignment_count`
5. ✅ `check_and_assign_prospect_with_crm`
6. ✅ `get_user_permissions`
7. ✅ `can_user_access_prospect`

### Fase 3: Modificaciones a Tablas Existentes
1. ✅ Agregar campos a `prospectos` (base de análisis)
2. ✅ Agregar campos a `llamadas_ventas` (base de análisis)
3. ✅ Agregar campos a `uchat_conversations` (System_UI)

### Fase 4: Servicios
1. ✅ Crear `coordinacionService.ts`
2. ✅ Crear `assignmentService.ts`
3. ✅ Crear `permissionsService.ts`
4. ✅ Modificar `liveMonitorService.ts`
5. ✅ Modificar `uchatService.ts`
6. ✅ Modificar `prospectsService.ts`

### Fase 5: Componentes UI
1. ✅ Crear `EjecutivosManager.tsx`
2. ✅ Modificar `LiveMonitor.tsx`
3. ✅ Modificar `LiveChatCanvas.tsx`
4. ✅ Modificar `ProspectosManager.tsx`

### Fase 6: Triggers y Automatización
1. ✅ Trigger para nuevos prospectos
2. ✅ Trigger para ID CRM
3. ✅ Trigger para nuevas llamadas
4. ✅ Trigger para nuevas conversaciones

### Fase 7: Testing y Ajustes
1. ✅ Pruebas unitarias
2. ✅ Pruebas de integración
3. ✅ Pruebas de permisos
4. ✅ Ajustes finales

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### Migración de Datos
- Los prospectos existentes NO se asignarán automáticamente
- Solo los nuevos prospectos se asignarán automáticamente
- Se puede crear un script de migración manual si es necesario

### Compatibilidad con Sistema Actual
- Los usuarios existentes (admin, developer, evaluator) NO se verán afectados
- El sistema actual de permisos seguirá funcionando
- Los nuevos roles son adicionales, no reemplazan los existentes

### Performance
- Las consultas de asignación deben estar indexadas
- Las estadísticas se calculan en tiempo real (considerar cache si es necesario)
- Los triggers deben ser eficientes para no afectar el rendimiento

### Seguridad
- RLS (Row Level Security) debe estar habilitado en todas las tablas
- Las funciones RPC deben validar permisos
- Los servicios deben validar permisos antes de mostrar datos

---

## 📚 DOCUMENTACIÓN ADICIONAL

### Archivos a Crear
- `docs/ROLES_PERMISOS_README.md` - Documentación técnica completa
- `docs/COORDINACIONES_FLUJO.md` - Flujo de asignación detallado
- `scripts/sql/create_coordinaciones_system.sql` - Script SQL completo

### Archivos a Actualizar
- `CHANGELOG.md` - Registrar cambios
- `README.md` - Actualizar con nueva funcionalidad

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Fase 1: Base de Datos
- [ ] Fase 2: Funciones RPC
- [ ] Fase 3: Modificaciones a Tablas
- [ ] Fase 4: Servicios
- [ ] Fase 5: Componentes UI
- [ ] Fase 6: Triggers
- [ ] Fase 7: Testing

---

**Estado:** 🚧 Listo para implementación  
**Próximo paso:** Crear script SQL completo para Fase 1

