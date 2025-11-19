# 📋 INSTRUCCIONES PARA EXPORTAR DATOS DE PQNC_QA

## ⚠️ IMPORTANTE

El script `02_export_users_from_pqnc.sql` tiene **MÚLTIPLES CONSULTAS SEPARADAS**. Debes ejecutar **CADA UNA** por separado, no todas a la vez.

## 📝 Orden de Ejecución

### **1. Exportar ROLES** (Primero)
```sql
SELECT 
  id,
  name,
  display_name,
  description,
  created_at
FROM auth_roles
ORDER BY name;
```
**Guardar resultado como:** `roles_export.json` o `roles_export.csv`

---

### **2. Exportar USUARIOS** (Segundo - MUY IMPORTANTE)
```sql
SELECT 
  id,
  email,
  password_hash,
  full_name,
  first_name,
  last_name,
  phone,
  department,
  position,
  organization,
  role_id,
  is_active,
  email_verified,
  last_login,
  failed_login_attempts,
  locked_until,
  created_at,
  updated_at
FROM auth_users
ORDER BY created_at;
```
**Guardar resultado como:** `users_export.json` o `users_export.csv`

---

### **3. Exportar PERMISOS** (Tercero)
```sql
SELECT 
  id,
  name as permission_name,
  module,
  sub_module,
  description,
  created_at
FROM auth_permissions
ORDER BY module, name;
```
**Guardar resultado como:** `permissions_export.json` o `permissions_export.csv`

---

### **4. Exportar RELACIÓN ROLES-PERMISOS** (Cuarto)
```sql
SELECT 
  id,
  role_id,
  permission_id,
  created_at
FROM auth_role_permissions
ORDER BY role_id, permission_id;
```
**Guardar resultado como:** `role_permissions_export.json` o `role_permissions_export.csv`

---

### **5. Exportar PERMISOS DE USUARIOS** (Quinto)
```sql
SELECT 
  usp.id,
  usp.user_id,
  ap.name as permission_name,
  ap.module,
  ap.sub_module,
  usp.created_at as granted_at,
  usp.created_by as granted_by
FROM user_specific_permissions usp
LEFT JOIN auth_permissions ap ON usp.permission_id = ap.id
WHERE usp.granted = true
ORDER BY usp.user_id, ap.module;
```
**Guardar resultado como:** `user_permissions_export.json` o `user_permissions_export.csv`

---

### **6. Exportar SESIONES ACTIVAS** (Opcional)
```sql
SELECT 
  id,
  user_id,
  session_token,
  expires_at,
  ip_address,
  user_agent,
  created_at,
  last_activity
FROM auth_sessions
WHERE expires_at > NOW()
ORDER BY created_at DESC;
```
**Guardar resultado como:** `sessions_export.json` o `sessions_export.csv`

---

### **7. Exportar AVATARES** (Ya ejecutado ✅)
```sql
SELECT 
  id,
  user_id,
  avatar_url,
  original_filename as filename,
  file_size,
  mime_type,
  uploaded_at
FROM user_avatars
ORDER BY user_id, uploaded_at DESC;
```
**Ya tienes:** 5 registros exportados ✅

---

## 🚀 Alternativa: Usar Script Node.js (Recomendado)

En lugar de ejecutar cada consulta manualmente, puedes usar el script automatizado:

```bash
# Configurar variables de entorno
export VITE_PQNC_SUPABASE_SERVICE_KEY="tu-service-key-pqnc"
export VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY="tu-service-key-system-ui"

# Ejecutar migración completa
node scripts/sql/migrate_users_to_system_ui/04_migration_script_node.js
```

Este script:
- ✅ Exporta TODOS los datos automáticamente
- ✅ Transforma las columnas correctamente
- ✅ Crea backups antes de migrar
- ✅ Importa todo a System_UI automáticamente
- ✅ Maneja errores y conflictos

---

## 📊 Verificación

Después de exportar, verifica que tienes:
- [ ] Roles exportados
- [ ] Usuarios exportados (MUY IMPORTANTE)
- [ ] Permisos exportados
- [ ] Relaciones roles-permisos exportadas
- [ ] Permisos de usuarios exportados
- [ ] Avatares exportados ✅ (ya hecho)

---

## ⚠️ Problemas Comunes

### "No veo usuarios exportados"
- Asegúrate de ejecutar la **CONSULTA 2** (Exportar USUARIOS)
- No ejecutes solo la consulta de avatares
- Verifica que la tabla `auth_users` tenga datos

### "Error en permisos"
- Verifica que ejecutaste primero la CONSULTA 3 (permisos)
- La CONSULTA 5 necesita que existan permisos para hacer el JOIN

