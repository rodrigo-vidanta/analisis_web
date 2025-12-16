# 📋 Instrucciones para Implementar el Nuevo Sistema de Permisos

## ⚠️ IMPORTANTE: Ejecutar en System_UI

El script SQL debe ejecutarse en la base de datos **System_UI** (`zbylezfyagwrxoecioup.supabase.co`), NO en la base de análisis.

## 📝 Pasos para Ejecutar

### 1. Acceder a Supabase Dashboard
1. Ir a https://supabase.com/dashboard
2. Seleccionar el proyecto **System_UI** (zbylezfyagwrxoecioup)
3. Ir a **SQL Editor**

### 2. Ejecutar el Script
1. Abrir el archivo `scripts/sql/create_new_permissions_system.sql`
2. Copiar todo el contenido
3. Pegar en el SQL Editor de Supabase
4. Ejecutar el script completo

### 3. Verificar Creación
Ejecutar estas consultas para verificar:

```sql
-- Verificar tabla de logs
SELECT * FROM auth_login_logs LIMIT 1;

-- Verificar nuevos roles
SELECT * FROM auth_roles WHERE name IN ('administrador_operativo', 'coordinador', 'ejecutivo');

-- Verificar tabla de coordinaciones
SELECT * FROM coordinaciones LIMIT 1;

-- Verificar tabla de logs de asignación
SELECT * FROM prospect_assignment_logs LIMIT 1;
```

## 🔄 Después de Ejecutar el SQL

1. **Reiniciar el servidor de desarrollo** para que cargue los cambios
2. **Verificar que los nuevos roles aparecen** en el modal de creación de usuarios
3. **Probar creación de usuarios** con los nuevos roles

## 📊 Estructura de Roles Nuevos

### Administrador Operativo
- Acceso a: Live Monitor (todos), Live Chat (solo lectura), Prospectos (ver todos, cambiar coordinación), Llamadas Programadas (ver todas), Mis Tareas, Administración (gestión usuarios y coordinaciones)
- NO tiene acceso a: AI Models, Log Server, AWS Manager, Análisis IA, PQNC Humans

### Coordinador
- Acceso a: Análisis IA (su coordinación), Live Monitor (su coordinación), Live Chat (su coordinación, puede enviar mensajes), Prospectos (su coordinación, puede reasignar), Llamadas Programadas (su coordinación), Mis Tareas, Administración (solo gestión ejecutivos de su coordinación)
- NO tiene acceso a: PQNC Humans, AI Models, Log Server, AWS Manager

### Ejecutivo
- Acceso a: Análisis IA (sus prospectos), Live Monitor (sus prospectos), Live Chat (sus prospectos), Prospectos (sus prospectos), Llamadas Programadas (sus prospectos), Mis Tareas
- NO tiene acceso a: PQNC Humans, AI Models, Log Server, AWS Manager, Administración

## 🔐 Logs de Sesión

Todos los logins se registrarán automáticamente en `auth_login_logs` con:
- IP address
- User agent
- Device type
- Browser info
- Login status (success/failed)
- Suspicious activity detection

## 📝 Logs de Cambios de Asignación

Todos los cambios de asignación de prospectos se registrarán en `prospect_assignment_logs` con:
- Prospecto afectado
- Coordinación/Ejecutivo anterior y nuevo
- Razón documentada del cambio
- Usuario que hizo el cambio
- Timestamp

