# 🔍 DEBUG - Módulo de Gestión de Ejecutivos

## ✅ Cambios Realizados

### 1. AdminDashboardTabs.tsx
- ✅ Agregado soporte temporal para admin (visible para testing)
- ✅ Agregados logs de depuración
- ✅ Verificación mejorada de permisos

### 2. EjecutivosManager.tsx
- ✅ Agregado soporte temporal para admin
- ✅ Agregados logs de depuración
- ✅ Manejo mejorado de coordinaciones para admin

### 3. coordinacionService.ts
- ✅ Corregido filtro `is_ejecutivo` en `getEjecutivosByCoordinacion`

## 🔍 Cómo Verificar

1. **Abrir la consola del navegador** (F12)
2. **Ir a Administración** en la aplicación
3. **Buscar en la consola:**
   - `🔍 Verificación de coordinador:` - Muestra si el usuario es coordinador
   - `⚠️ Admin detectado` - Si eres admin, verás este mensaje
   - `📋 Permisos obtenidos:` - Muestra los permisos del usuario

## 🎯 Comportamiento Actual

### Para Administradores:
- ✅ El módulo "Gestión de Ejecutivos" es visible
- ✅ Puede ver ejecutivos de la primera coordinación activa
- ⚠️ **TEMPORAL**: Esto es solo para testing

### Para Coordinadores:
- ✅ El módulo "Gestión de Ejecutivos" es visible
- ✅ Solo puede ver ejecutivos de su coordinación asignada
- ✅ Puede crear, editar y gestionar ejecutivos

### Para Ejecutivos:
- ❌ El módulo NO es visible (correcto)

## 🐛 Si No Aparece el Módulo

1. **Verifica en la consola:**
   - ¿Aparece el log `🔍 Verificación de coordinador:`?
   - ¿Qué valor tiene `isCoordinador`?
   - ¿Cuál es el `role` del usuario?

2. **Verifica en la base de datos:**
   ```sql
   -- Verificar si el usuario tiene rol de coordinador
   SELECT 
     u.id,
     u.email,
     u.is_coordinator,
     u.coordinacion_id,
     r.name as role_name
   FROM auth_users u
   LEFT JOIN auth_roles r ON u.role_id = r.id
   WHERE u.email = 'tu_email@ejemplo.com';
   ```

3. **Verificar función RPC:**
   ```sql
   -- Probar función get_user_permissions
   SELECT * FROM get_user_permissions('tu_user_id');
   ```

## 📝 Próximos Pasos

1. **Si eres admin:** El módulo debería aparecer ahora
2. **Si eres coordinador:** Verifica que tengas `is_coordinator = true` y `coordinacion_id` asignado
3. **Si necesitas crear un coordinador de prueba:**
   - Usa uno de los usuarios creados con el script SQL
   - O actualiza un usuario existente para que sea coordinador

## 🔧 Comandos SQL Útiles

```sql
-- Hacer un usuario coordinador de prueba
UPDATE auth_users
SET 
  is_coordinator = true,
  coordinacion_id = (SELECT id FROM coordinaciones WHERE codigo = 'VEN' LIMIT 1)
WHERE email = 'tu_email@ejemplo.com';

-- Verificar coordinaciones disponibles
SELECT id, codigo, nombre FROM coordinaciones WHERE is_active = true;
```

