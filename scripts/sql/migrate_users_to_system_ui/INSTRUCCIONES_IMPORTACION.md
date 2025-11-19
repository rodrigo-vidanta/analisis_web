# 📋 INSTRUCCIONES PARA IMPORTAR DATOS A SYSTEM_UI

## ✅ Datos Exportados Correctamente

Has exportado exitosamente:
- ✅ **5 roles** (admin, developer, evaluator, productor, vendedor)
- ✅ **6 usuarios** (con todas sus credenciales y datos)
- ✅ **37 permisos** (todos los permisos del sistema)
- ✅ **40 relaciones roles-permisos** (asignaciones de permisos a roles)
- ✅ **5 permisos específicos de usuarios** (permisos personalizados)
- ✅ **2 sesiones activas** (opcional, no crítico)
- ✅ **5 avatares** (imágenes de perfil)
- ✅ **6 límites de tokens AI** (de ai_token_limits)

## 🚀 Opción 1: Importación Directa con SQL (Rápida)

He creado el script `05_import_direct_data.sql` con todos tus datos ya incluidos.

**Pasos:**

1. Abre el SQL Editor de Supabase para System_UI
2. Ejecuta el script completo: `05_import_direct_data.sql`
3. Verifica que no haya errores

**Ventajas:**
- ✅ Rápido y directo
- ✅ Todos los datos ya están incluidos
- ✅ Maneja conflictos automáticamente (ON CONFLICT)

## 🔄 Opción 2: Usar Script Node.js (Recomendado para futuras migraciones)

Si prefieres usar el script automatizado:

```bash
# Configurar variables de entorno
export VITE_PQNC_SUPABASE_SERVICE_KEY="tu-service-key-pqnc"
export VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY="tu-service-key-system-ui"

# Ejecutar migración
cd scripts/sql/migrate_users_to_system_ui
node 04_migration_script_node.js
```

**Ventajas:**
- ✅ Crea backups automáticos
- ✅ Maneja errores mejor
- ✅ Útil para futuras migraciones

## ⚠️ Notas Importantes

### Roles Nuevos vs Existentes

El script maneja automáticamente:
- Si un rol ya existe (por nombre), se actualiza
- Si un usuario ya existe (por email), se actualiza
- Los permisos se fusionan sin duplicados

### Roles de Coordinación

Los roles `coordinador` y `ejecutivo` que creamos anteriormente **NO** se eliminarán. El script solo agrega/actualiza los roles exportados.

### Verificación Post-Migración

Después de ejecutar el script, verifica:

```sql
-- Verificar roles
SELECT COUNT(*) FROM auth_roles;
-- Debe mostrar al menos 7 (5 exportados + 2 de coordinación)

-- Verificar usuarios
SELECT COUNT(*) FROM auth_users;
-- Debe mostrar al menos 6 usuarios

-- Verificar permisos
SELECT COUNT(*) FROM auth_permissions;
-- Debe mostrar 37 permisos

-- Verificar que los usuarios tienen sus roles asignados
SELECT u.email, r.name as role_name 
FROM auth_users u 
LEFT JOIN auth_roles r ON u.role_id = r.id;
```

## 🔍 Solución de Problemas

### Error: "duplicate key value violates unique constraint"
- ✅ Normal, el script usa `ON CONFLICT` para manejar duplicados
- Los datos existentes se actualizarán, no se duplicarán

### Error: "foreign key constraint"
- Verifica que los roles existan antes de importar usuarios
- El script está en el orden correcto (roles → usuarios → permisos)

### Los usuarios no pueden iniciar sesión
- Verifica que los `password_hash` se migraron correctamente
- Los hashes de bcrypt deben mantenerse exactamente iguales

## 📊 Próximos Pasos Después de la Migración

1. ✅ Verificar que todos los usuarios pueden iniciar sesión
2. ✅ Verificar que los permisos funcionan correctamente
3. ✅ Actualizar el código para usar System_UI en lugar de pqncSupabase
4. ✅ Probar la funcionalidad de coordinaciones con usuarios reales

