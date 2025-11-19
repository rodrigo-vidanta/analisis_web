# 📋 GUÍA DE MIGRACIÓN DE USUARIOS Y ROLES

## 🎯 Objetivo

Migrar todos los usuarios, roles y permisos de **pqncSupabase** (hmmfuhqgvsehkizlfzga.supabase.co) a **System_UI** (zbylezfyagwrxoecioup.supabase.co) para centralizar la gestión de usuarios y permitir que todos los roles (incluyendo coordinador y ejecutivo) estén disponibles.

---

## 📊 Estructura de Archivos

```
scripts/sql/migrate_users_to_system_ui/
├── 01_create_tables_system_ui.sql      # Crear estructura de tablas en System_UI
├── 02_export_users_from_pqnc.sql       # Script SQL para exportar datos
├── 03_import_to_system_ui.sql          # Script SQL para importar datos (plantilla)
├── 04_migration_script_node.js          # Script Node.js automatizado
└── README_MIGRATION.md                  # Esta guía
```

---

## 🔧 Pasos de Migración

### **Paso 1: Crear Estructura en System_UI**

Ejecutar el script `01_create_tables_system_ui.sql` en System_UI:

```bash
# Conectarse a System_UI y ejecutar:
psql -h zbylezfyagwrxoecioup.supabase.co -U postgres -d postgres -f 01_create_tables_system_ui.sql
```

O desde el SQL Editor de Supabase:
1. Ir a System_UI en Supabase Dashboard
2. Abrir SQL Editor
3. Copiar y pegar el contenido de `01_create_tables_system_ui.sql`
4. Ejecutar

**Este script crea:**
- ✅ `auth_roles` (con campos necesarios)
- ✅ `auth_users` (con campos de coordinaciones)
- ✅ `auth_permissions`
- ✅ `auth_role_permissions`
- ✅ `auth_user_permissions`
- ✅ `auth_sessions`
- ✅ `user_avatars`
- ✅ `api_tokens`
- ✅ Vista `auth_user_profiles` (para compatibilidad)

---

### **Paso 2: Exportar Datos de pqncSupabase**

#### **Opción A: Usar Script Node.js (Recomendado)**

```bash
# Instalar dependencias si es necesario
npm install @supabase/supabase-js

# Configurar variables de entorno
export VITE_PQNC_SUPABASE_SERVICE_KEY="tu-service-key-pqnc"
export VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY="tu-service-key-system-ui"

# Ejecutar script
node scripts/sql/migrate_users_to_system_ui/04_migration_script_node.js
```

#### **Opción B: Exportar Manualmente**

1. Conectarse a pqncSupabase
2. Ejecutar `02_export_users_from_pqnc.sql`
3. Guardar los resultados en archivos JSON o CSV
4. Usar esos datos para llenar `03_import_to_system_ui.sql`

---

### **Paso 3: Importar Datos a System_UI**

#### **Opción A: Script Node.js (Automático)**

El script `04_migration_script_node.js` hace todo automáticamente:
- Exporta de pqncSupabase
- Importa a System_UI
- Maneja conflictos (upsert)
- Crea backups

#### **Opción B: Importar Manualmente**

1. Llenar `03_import_to_system_ui.sql` con los datos exportados
2. Ejecutar en System_UI

---

## ⚠️ Consideraciones Importantes

### **1. IDs de Usuarios**
- Los IDs se mantienen iguales para preservar relaciones
- Si hay conflictos, se usa `ON CONFLICT` para actualizar

### **2. Roles Existentes**
- Los roles de coordinador y ejecutivo ya existen en System_UI
- Se usarán `ON CONFLICT (name)` para evitar duplicados
- Se actualizarán los roles existentes si es necesario

### **3. Coordinaciones**
- Los usuarios migrados NO tendrán coordinación asignada por defecto
- Solo coordinadores y ejecutivos necesitan coordinación
- Se puede asignar después de la migración

### **4. Contraseñas**
- Los hashes de contraseña se migran tal cual
- Los usuarios podrán iniciar sesión normalmente

### **5. Sesiones Activas**
- Las sesiones activas NO se migran (se invalidan)
- Los usuarios deberán iniciar sesión nuevamente

---

## 🔍 Verificación Post-Migración

### **Verificar Roles Migrados**

```sql
SELECT name, display_name, is_active, COUNT(*) OVER() as total
FROM auth_roles
ORDER BY name;
```

### **Verificar Usuarios Migrados**

```sql
SELECT 
  u.email,
  u.full_name,
  r.name as role_name,
  u.is_active,
  u.created_at
FROM auth_users u
LEFT JOIN auth_roles r ON u.role_id = r.id
ORDER BY u.created_at DESC;
```

### **Verificar Permisos**

```sql
SELECT 
  module,
  COUNT(*) as permissions_count
FROM auth_permissions
GROUP BY module
ORDER BY module;
```

---

## 🐛 Solución de Problemas

### **Error: "relation already exists"**
- Las tablas ya existen en System_UI
- El script usa `CREATE TABLE IF NOT EXISTS`, así que es seguro ejecutarlo

### **Error: "duplicate key value"**
- Hay conflictos de IDs o emails
- El script usa `ON CONFLICT` para manejar esto automáticamente

### **Error: "foreign key constraint"**
- Los roles deben importarse antes que los usuarios
- El script Node.js lo hace en el orden correcto

### **Usuarios sin roles**
- Verificar que los `role_id` en usuarios existan en `auth_roles`
- Actualizar manualmente si es necesario

---

## 📝 Checklist de Migración

- [ ] Ejecutar `01_create_tables_system_ui.sql` en System_UI
- [ ] Verificar que las tablas se crearon correctamente
- [ ] Exportar datos de pqncSupabase (usar script Node.js o manual)
- [ ] Verificar que el backup se guardó correctamente
- [ ] Importar datos a System_UI
- [ ] Verificar conteos de roles, usuarios y permisos
- [ ] Probar login con usuarios migrados
- [ ] Actualizar código para usar System_UI en lugar de pqncSupabase
- [ ] Probar creación de usuarios con roles coordinador/ejecutivo

---

## 🔄 Actualizar Código

Después de la migración, actualizar:

1. **`src/components/admin/UserManagement.tsx`**
   - Cambiar `pqncSupabase` por `supabaseSystemUIAdmin` para usuarios y roles

2. **`src/services/authService.ts`**
   - Actualizar para usar System_UI

3. **`src/contexts/AuthContext.tsx`**
   - Actualizar para usar System_UI

---

## 📞 Soporte

Si encuentras problemas durante la migración:
1. Revisar los logs del script Node.js
2. Verificar los backups en `backups/`
3. Consultar los scripts SQL individuales
4. Verificar permisos de las service keys

---

**Última actualización:** 2025-01-24  
**Versión:** 1.0.0

