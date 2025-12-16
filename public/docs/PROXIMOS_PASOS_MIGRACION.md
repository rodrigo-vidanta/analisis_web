# 📋 PRÓXIMOS PASOS DESPUÉS DE LA MIGRACIÓN

## ✅ Completado

1. ✅ Estructura de tablas creada en System_UI
2. ✅ Datos migrados (roles, usuarios, permisos, avatares)
3. ✅ Vista `auth_user_profiles` creada (en `01_create_tables_system_ui.sql`)

## 🔧 Pendiente - Ejecutar en System_UI

### 1. Crear Funciones RPC de Autenticación

**Archivo:** `scripts/sql/migrate_users_to_system_ui/06_create_auth_functions_system_ui.sql`

**Ejecutar en:** System_UI (zbylezfyagwrxoecioup.supabase.co)

**Contiene:**
- `verify_password()` - Verifica contraseñas bcrypt
- `authenticate_user()` - Autentica usuarios con email/password

**⚠️ IMPORTANTE:** Esta función es crítica para el login. Sin ella, los usuarios no podrán iniciar sesión.

---

## 🔄 Actualizar Código Frontend

### Archivos a Actualizar (en orden de prioridad):

#### 1. **`src/services/authService.ts`** (CRÍTICO)
- Cambiar `import { pqncSupabase as supabase }` → `import { supabaseSystemUI as supabase }`
- Verificar que todas las consultas funcionen con System_UI

#### 2. **`src/contexts/AuthContext.tsx`**
- Cambiar `import { pqncSupabase as supabase }` → `import { supabaseSystemUI as supabase }`
- Solo si usa directamente pqncSupabase (puede que solo use authService)

#### 3. **`src/components/admin/UserManagement.tsx`** (CRÍTICO)
- Cambiar todas las consultas de `pqncSupabase` a `supabaseSystemUIAdmin`
- Actualizar consultas a `auth_user_profiles` (ya existe en System_UI)
- Verificar que `loadRoles()` use System_UI

#### 4. **`src/hooks/useUserProfile.ts`**
- Cambiar `supabase` (que viene de pqncSupabase) a `supabaseSystemUI`

#### 5. **Otros archivos** (verificar si necesitan cambios):
- `src/components/admin/AvatarUpload.tsx`
- `src/hooks/useAnalysisPermissions.ts`
- `src/services/feedbackService.ts`
- `src/services/bookmarkService.ts`

---

## 🧪 Testing Requerido

Después de actualizar el código:

1. ✅ **Login**: Probar que los usuarios pueden iniciar sesión
2. ✅ **Permisos**: Verificar que los permisos se cargan correctamente
3. ✅ **User Management**: Probar crear/editar usuarios
4. ✅ **Roles**: Verificar que todos los roles se muestran correctamente
5. ✅ **Avatares**: Verificar que los avatares se cargan correctamente

---

## ⚠️ Notas Importantes

1. **Sesiones Existentes**: Los usuarios con sesiones activas en pqncSupabase necesitarán iniciar sesión nuevamente
2. **Vista auth_user_profiles**: Ya existe en System_UI, pero puede necesitar ajustes según las columnas reales
3. **Funciones RPC**: Deben crearse ANTES de actualizar el código frontend
4. **Compatibilidad**: Durante la transición, mantener ambos sistemas funcionando si es posible

---

## 🚀 Orden de Ejecución Recomendado

1. **Ejecutar** `06_create_auth_functions_system_ui.sql` en System_UI
2. **Actualizar** `authService.ts` para usar System_UI
3. **Probar** login con un usuario migrado
4. **Actualizar** `UserManagement.tsx` para usar System_UI
5. **Probar** gestión de usuarios
6. **Actualizar** otros archivos según necesidad
7. **Testing completo** de todas las funcionalidades

