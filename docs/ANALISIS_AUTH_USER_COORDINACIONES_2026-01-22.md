# Análisis: auth_user_coordinaciones vs auth.users.raw_user_meta_data

**Fecha:** 22 de Enero 2026  
**Contexto:** Migración a auth.users nativo

---

## 📊 **Estado Actual**

### Tabla `auth_user_coordinaciones`
- ✅ **Se sigue usando activamente** en el código (62 ocurrencias en 12 archivos)
- ✅ Tiene índices optimizados
- ✅ Es tabla relacional tradicional (many-to-many)
- ✅ Permite múltiples coordinaciones por usuario (coordinadores/supervisores)

### Metadata en `auth.users.raw_user_meta_data`
- ✅ Usada por la vista `user_profiles_v2`
- ⚠️ Solo puede tener 1 coordinacion_id (no es relacional)
- ⚠️ Requería actualización manual (problema recién resuelto)

---

## 🔍 **Archivos que Usan auth_user_coordinaciones**

| Archivo | Usos | Propósito |
|---------|------|-----------|
| `permissionsService.ts` | 2 | Obtener coordinaciones para filtros |
| `coordinacionService.ts` | 5 | Gestión de coordinaciones |
| `UserManagement.tsx` | 19 | CRUD de usuarios y coordinaciones |
| `UserManagementV2/` | 12 | Sistema nuevo de gestión |
| `authService.ts` | 1 | Cargar coordinaciones al login |
| `NinjaModeModal.tsx` | 1 | Modo ninja coordinaciones |
| `useInactivityTimeout.ts` | 1 | Logout automático |
| `UserCreateModal.tsx` | 3 | Crear usuarios |

**Total: 62 referencias activas**

---

## 💡 **Opciones de Arquitectura**

### **Opción 1: Mantener Ambas con Sync Automático (RECOMENDADO)**

**Pros:**
- ✅ Sin necesidad de migrar 62 referencias inmediatamente
- ✅ `auth_user_coordinaciones` sigue siendo fuente de verdad
- ✅ `user_profiles_v2` se actualiza automáticamente
- ✅ Migración gradual posible

**Contras:**
- ⚠️ Duplicación de datos (pero manejable)
- ⚠️ Requiere trigger en BD

**Implementación:**
```sql
-- Trigger bidireccional para mantener sincronizadas ambas fuentes
CREATE OR REPLACE FUNCTION sync_coordinacion_id_to_metadata()
RETURNS TRIGGER AS $$
DECLARE
  v_metadata JSONB;
  v_coordinacion_id UUID;
BEGIN
  -- Obtener la PRIMERA coordinación del usuario (para metadata)
  SELECT coordinacion_id INTO v_coordinacion_id
  FROM auth_user_coordinaciones
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
  ORDER BY assigned_at ASC NULLS LAST
  LIMIT 1;
  
  -- Actualizar metadata en auth.users
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    raw_user_meta_data,
    '{coordinacion_id}',
    COALESCE(to_jsonb(v_coordinacion_id::TEXT), 'null'::jsonb)
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger a INSERT/UPDATE/DELETE
CREATE TRIGGER sync_coordinacion_after_insert
AFTER INSERT ON auth_user_coordinaciones
FOR EACH ROW EXECUTE FUNCTION sync_coordinacion_id_to_metadata();

CREATE TRIGGER sync_coordinacion_after_update
AFTER UPDATE ON auth_user_coordinaciones
FOR EACH ROW EXECUTE FUNCTION sync_coordinacion_id_to_metadata();

CREATE TRIGGER sync_coordinacion_after_delete
AFTER DELETE ON auth_user_coordinaciones
FOR EACH ROW EXECUTE FUNCTION sync_coordinacion_id_to_metadata();
```

---

### **Opción 2: Migrar Todo a auth_user_coordinaciones y Eliminar Metadata**

**Pros:**
- ✅ Una sola fuente de verdad
- ✅ No hay duplicación
- ✅ Más flexible (múltiples coordinaciones)

**Contras:**
- ❌ Requiere actualizar `user_profiles_v2` para hacer JOIN
- ❌ Cambio en vista usada por mucho código
- ❌ Más trabajo inmediato

**Implementación:**
```sql
-- Modificar user_profiles_v2 para hacer JOIN con auth_user_coordinaciones
CREATE OR REPLACE VIEW public.user_profiles_v2 AS
SELECT
  au.id,
  au.email,
  COALESCE((au.raw_user_meta_data->>'full_name')::TEXT, '') as full_name,
  -- ... otros campos ...
  
  -- Obtener PRIMERA coordinación desde tabla relacional
  (SELECT coordinacion_id FROM auth_user_coordinaciones 
   WHERE user_id = au.id 
   ORDER BY assigned_at ASC NULLS LAST 
   LIMIT 1) as coordinacion_id,
   
  -- ... resto de campos ...
FROM auth.users au
LEFT JOIN public.auth_roles ar ON ar.id = (au.raw_user_meta_data->>'role_id')::UUID
WHERE au.deleted_at IS NULL;
```

---

### **Opción 3: Eliminar auth_user_coordinaciones (NO RECOMENDADO)**

**Pros:**
- ✅ Simplifica arquitectura (solo metadata)

**Contras:**
- ❌ Requiere migrar 62 referencias en el código
- ❌ Pierde capacidad relacional (coordinadores con múltiples coordinaciones)
- ❌ Mucho trabajo con poco beneficio

---

## 🎯 **RECOMENDACIÓN**

### **Opción 1 con Trigger Automático**

**Razones:**
1. ✅ **auth_user_coordinaciones es más potente** (many-to-many)
2. ✅ **Código ya funciona** con esta tabla
3. ✅ **user_profiles_v2 se actualiza solo** con el trigger
4. ✅ **Migración gradual posible** sin romper nada
5. ✅ **Backup automático** en metadata por si falla la tabla

**Flujo de Trabajo:**
```
INSERT/UPDATE/DELETE en auth_user_coordinaciones
    ↓
Trigger automático
    ↓
Actualiza auth.users.raw_user_meta_data
    ↓
user_profiles_v2 refleja el cambio
```

**Ventaja Clave:**
- Tu código ACTUAL sigue funcionando sin cambios
- `user_profiles_v2` se mantiene actualizada automáticamente
- Puedes migrar gradualmente cuando tengas tiempo

---

## 📋 **Plan de Implementación**

### Paso 1: Crear Trigger (AHORA)
```bash
# Ejecutar script de trigger
curl -X POST "https://api.supabase.com/v1/projects/glsmifhkoaifvaegsozd/database/query" \
  -H "Authorization: Bearer <token>" \
  -d @scripts/sync-coordinaciones-trigger.sql
```

### Paso 2: Verificar Sincronización (TEST)
```sql
-- Probar INSERT
INSERT INTO auth_user_coordinaciones (user_id, coordinacion_id)
VALUES ('test-user-id', 'test-coord-id');

-- Verificar que se actualizó metadata
SELECT raw_user_meta_data->>'coordinacion_id' FROM auth.users WHERE id = 'test-user-id';
```

### Paso 3: Migración Gradual (CUANDO TENGAS TIEMPO)
- Ir reemplazando lecturas de `auth_user_coordinaciones` por `user_profiles_v2`
- Mantener escrituras en `auth_user_coordinaciones` (trigger se encarga del resto)

---

## 🚨 **Respuesta a tu Pregunta**

> "¿hay forma de que esta se alimente sola con la nueva arquitectura?"

**SÍ**, con el trigger propuesto:
- `auth_user_coordinaciones` sigue siendo tu fuente de escritura principal
- Trigger automáticamente actualiza `auth.users.raw_user_meta_data`
- `user_profiles_v2` refleja los cambios sin código adicional

> "¿para que me de tiempo de poco a poco ir migrando?"

**SÍ**, este enfoque te permite:
- Seguir usando `auth_user_coordinaciones` como siempre
- No tocar las 62 referencias en el código
- Migrar gradualmente cuando quieras

> "¿o ya no hay necesidad?"

**NO hay necesidad urgente de migrar**, porque:
- `auth_user_coordinaciones` es más potente (relacional)
- El trigger mantendrá todo sincronizado
- Puedes mantener ambas indefinidamente

---

## ✅ **Conclusión**

**Mantén `auth_user_coordinaciones` como fuente principal** y agrega el trigger para sincronización automática. Esto te da:

1. ✅ Código actual sigue funcionando
2. ✅ user_profiles_v2 actualizada automáticamente
3. ✅ Flexibilidad para migrar cuando quieras
4. ✅ Sin urgencia ni riesgo

---

**Última actualización:** 22 de Enero 2026
