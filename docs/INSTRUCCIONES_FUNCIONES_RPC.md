# 📋 INSTRUCCIONES PARA CREAR FUNCIONES RPC EN SYSTEM_UI

## ⚠️ IMPORTANTE

Para que la creación de usuarios funcione correctamente, necesitas ejecutar el script de funciones RPC en System_UI.

## 📝 Scripts a Ejecutar (en orden)

### 1. Funciones de Autenticación
**Archivo:** `scripts/sql/migrate_users_to_system_ui/06_create_auth_functions_system_ui.sql`

**Estado:** ✅ Ya ejecutado

**Contiene:**
- `verify_password()` - Verifica contraseñas bcrypt
- `authenticate_user()` - Autentica usuarios

---

### 2. Funciones de Gestión de Usuarios
**Archivo:** `scripts/sql/migrate_users_to_system_ui/07_create_user_management_functions.sql`

**Estado:** ⚠️ **PENDIENTE DE EJECUTAR**

**Contiene:**
- `create_user_with_role()` - Crea usuario con rol
- `change_user_password()` - Cambia contraseña de usuario
- `upload_user_avatar()` - Sube/actualiza avatar de usuario
- `delete_user_complete()` - Elimina usuario y todas sus relaciones
- `configure_evaluator_analysis_permissions()` - Configura permisos de evaluador

---

## 🚀 Cómo Ejecutar

1. Abre Supabase Dashboard
2. Ve a System_UI (zbylezfyagwrxoecioup.supabase.co)
3. Ve a SQL Editor
4. Copia y pega el contenido de `07_create_user_management_functions.sql`
5. Ejecuta el script

---

## ✅ Verificación

Después de ejecutar, puedes verificar que las funciones existen con:

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_type = 'FUNCTION'
  AND routine_name IN (
    'create_user_with_role',
    'change_user_password',
    'upload_user_avatar',
    'delete_user_complete',
    'configure_evaluator_analysis_permissions'
  );
```

Deberías ver las 5 funciones listadas.

---

## 🔧 Dependencias

Estas funciones requieren:
- ✅ Extensión `pgcrypto` (para hash de contraseñas)
- ✅ Tablas: `auth_users`, `auth_roles`, `auth_user_permissions`, `user_avatars`, `auth_sessions`

Todas estas ya están creadas según los scripts anteriores.

---

## ⚠️ Nota sobre Avatares

La tabla `user_avatars` permite múltiples avatares por usuario. La función `upload_user_avatar` elimina todos los avatares existentes antes de insertar uno nuevo, manteniendo solo el más reciente.

