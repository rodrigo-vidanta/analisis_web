# Actualización Masiva de Usuarios Vidanta

**Fecha:** 22 de Enero 2026  
**Método:** REST API de Supabase  
**Estado:** ✅ Completado

---

## 📋 Resumen

Se actualizaron 9 usuarios de Vidanta con sus teléfonos, coordinaciones y roles correctos usando la REST API de Supabase Management API.

---

## 👥 Usuarios Actualizados

| Email | Teléfono | Coordinación | Rol |
|-------|----------|--------------|-----|
| paolamaldonado@vidavacations.com | +16232533583 | VEN | Coordinador |
| taydevera@vidavacations.com | +16232533584 | MVP | Ejecutivo |
| irvingaquino@vidavacations.com | +16232536849 | MVP | Supervisor |
| mayragonzalezs@vidavacations.com | +16232536853 | VEN | Ejecutivo |
| isselrico@vidavacations.com | +16232536854 | VEN | Supervisor |
| keniamartineza@vidavacations.com | +16232536875 | APEX | Ejecutivo |
| robertoraya@vidavacations.com | +16232536877 | APEX | Supervisor |
| manuelgomezp@vidavacations.com | +16232536880 | COB ACA | Supervisor |
| jessicagutierrez@vidavacations.com | +16232536882 | COB ACA | Ejecutivo |

---

## 🔧 Método de Ejecución

### Access Token
- Ubicación: `.supabase/access_token`
- Proyecto: PQNC_AI (`glsmifhkoaifvaegsozd`)

### Scripts Creados

1. **`scripts/update_vidanta_users.sql`**
   - Script SQL completo con función auxiliar
   - Actualizaciones individuales por usuario
   - Query de verificación final

2. **`scripts/execute_update_vidanta_users.mjs`**
   - Script Node.js para ejecutar vía REST API
   - Manejo de errores
   - Logging detallado

### Ejecución

```bash
# Ejecutar vía REST API usando curl
ACCESS_TOKEN=$(cat .supabase/access_token | tr -d '\n')
curl -X POST "https://api.supabase.com/v1/projects/glsmifhkoaifvaegsozd/database/query" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$(cat scripts/update_vidanta_users.sql | sed 's/"/\\"/g' | tr '\n' ' ')\"}"
```

---

## ✅ Verificación

Todos los usuarios fueron verificados después de la actualización:

```sql
SELECT 
  email,
  raw_user_meta_data->>'phone' as phone,
  raw_user_meta_data->>'coordinacion_id' as coordinacion_id,
  raw_user_meta_data->>'role_id' as role_id
FROM auth.users
WHERE LOWER(email) IN (...)
ORDER BY email;
```

**Resultado:** ✅ Todos los usuarios tienen los datos correctos.

---

## 📝 Mapeos Utilizados

### Coordinaciones
- VEN: `3f41a10b-60b1-4c2b-b097-a83968353af5`
- MVP: `4c1ece41-bb6b-49a1-b52b-f5236f54d60a`
- APEX: `f33742b9-46cf-4716-bf7a-ce129a82bad2`
- COB ACA: `0008460b-a730-4f0b-ac1b-5aaa5c40f5b0`

### Roles
- Coordinador: `c2984ef8-d8bc-489d-9758-41be8f7fd2bb`
- Ejecutivo: `fed8bd96-7928-4a3e-bb20-e20384e98f0b`
- Supervisor: `6b9aba23-0f1c-416c-add6-7c0424f21116`

---

## 🔒 Seguridad

- ✅ Access Token almacenado en `.supabase/access_token` (NO en Git)
- ✅ Scripts SQL con validaciones y manejo de errores
- ✅ Verificación post-actualización para confirmar cambios

---

**Última actualización:** 22 de Enero 2026
