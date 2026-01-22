# Auditoría de Números Telefónicos DID - Ejecutivos PQNC AI

**Fecha:** 22 de Enero 2026  
**Consulta realizada en:** `auth.users` (Supabase nativo)  
**Método:** API REST con Access Token

---

## 📋 Asignación Esperada de DIDs

| Email | Skill | DID Esperado |
|-------|-------|--------------|
| fernandamondragon@vidavacations.com | PQNC_AI_1 | +16232533325 |
| angelicaguzman@vidavacations.com | PQNC_AI_2 | +16232533579 |
| vanessaperez@vidavacations.com | PQNC_AI_3 | +16232533580 |
| elizabethhernandez@vidavacations.com | PQNC_AI_4 | +16232533583 |
| taydevera@vidavacations.com | PQNC_AI_5 | +16232533584 |
| irvingaquino@vidavacations.com | PQNC_AI_6 | +16232536849 |
| mayragonzalezs@vidavacations.com | PQNC_AI_7 | +16232536853 |
| isselrico@vidavacations.com | PQNC_AI_8 | +16232536854 |
| keniamartineza@vidavacations.com | PQNC_AI_9 | +16232536875 |
| robertoraya@vidavacations.com | PQNC_AI_10 | +16232536877 |
| manuelgomezp@vidavacations.com | PQNC_AI_11 | +16232536880 |
| jessicagutierrez@vidavacations.com | PQNC_AI_12 | +16232536882 |

---

## ⚠️ DISCREPANCIAS ENCONTRADAS

### 1. Usuarios SIN teléfono asignado

| Email | Nombre | DID Esperado | Estado Actual |
|-------|--------|--------------|---------------|
| angelicaguzman@vidavacations.com | Angélica Guzmán Velasco | +16232533579 | ❌ **NULL** |
| vanessaperez@vidavacations.com | Vanessa Valentina Pérez Moreno | +16232533580 | ❌ **NULL** |

### 2. Usuarios con teléfono INCORRECTO

| Email | Nombre | DID Esperado | DID Actual | Problema |
|-------|--------|--------------|------------|----------|
| fernandamondragon@vidavacations.com | María Fernanda Mondragón López | +16232533325 | `fernandamondragon@vidavacations.com` | ⚠️ Email en lugar de teléfono |

### 3. Usuarios con teléfono CORRECTO ✅

| Email | Nombre | DID | Estado |
|-------|--------|-----|--------|
| elizabethhernandez@vidavacations.com | Elizabeth Hernández Ramírez | +16232533583 | ✅ CORRECTO |
| taydevera@vidavacations.com | Vera Delgado Tayde Veronica | +16232533584 | ✅ CORRECTO |
| irvingaquino@vidavacations.com | Aquino Perez Irving Javier | +16232536849 | ✅ CORRECTO |
| mayragonzalezs@vidavacations.com | Gonzalez Serrano Mayra Soledad Jazmin | +16232536853 | ✅ CORRECTO |
| isselrico@vidavacations.com | Issel Rico | +16232536854 | ✅ CORRECTO |
| keniamartineza@vidavacations.com | Martinez Arvizu Kenia Magalli | +16232536875 | ✅ CORRECTO |
| robertoraya@vidavacations.com | Raya Salas Roberto Alejandro | +16232536877 | ✅ CORRECTO |
| manuelgomezp@vidavacations.com | Gomez Pompa Manuel | +16232536880 | ✅ CORRECTO |
| jessicagutierrez@vidavacations.com | Gutierrez Arredondo Jessica | +16232536882 | ✅ CORRECTO |

---

## 🚨 DIDs Asignados a OTROS Usuarios (Conflictos)

### DID +16232533579 (PQNC_AI_2)
**Esperado para:** angelicaguzman@vidavacations.com  
**Actualmente usado por:**
- ❌ `ejecutivo@grupovidanta.com` (Panfilo Mestas)
- ❌ `invitado@grupovidanta.com` (Usuario Invitado)

### DID +16232533583 (PQNC_AI_4)
**Esperado para:** elizabethhernandez@vidavacations.com ✅ (ya lo tiene)  
**También usado por:**
- ⚠️ `paolamaldonado@vidavacations.com` (Maldonado Rodriguez Barbara Paola) - **CONFLICTO**

### DID +16232536880 (PQNC_AI_11)
**Esperado para:** manuelgomezp@vidavacations.com ✅ (ya lo tiene)  
**También usado por:**
- ⚠️ `coordinador@grupovidanta.com` (Juan Escutia) - **CONFLICTO**

---

## 📊 Resumen de Discrepancias

| Categoría | Cantidad | Usuarios Afectados |
|-----------|----------|-------------------|
| Sin teléfono (NULL) | 2 | angelicaguzman, vanessaperez |
| Teléfono incorrecto | 1 | fernandamondragon (tiene email en lugar de DID) |
| Teléfonos correctos | 9 | 9 usuarios con DID correcto |
| DIDs duplicados | 3 | +16232533579 (2 usuarios), +16232533583 (1 usuario), +16232536880 (1 usuario) |

---

## 🔧 Acciones Requeridas

### Actualizaciones Necesarias

1. **fernandamondragon@vidavacations.com**
   - Cambiar de: `fernandamondragon@vidavacations.com`
   - A: `+16232533325`

2. **angelicaguzman@vidavacations.com**
   - Cambiar de: `NULL`
   - A: `+16232533579`
   - ⚠️ **ANTES:** Remover DID de `ejecutivo@grupovidanta.com` y `invitado@grupovidanta.com`

3. **vanessaperez@vidavacations.com**
   - Cambiar de: `NULL`
   - A: `+16232533580`

### Conflictos a Resolver

1. **ejecutivo@grupovidanta.com** - Remover `+16232533579`
2. **invitado@grupovidanta.com** - Remover `+16232533579`
3. **paolamaldonado@vidavacations.com** - Remover `+16232533583` (¿asignar otro DID?)
4. **coordinador@grupovidanta.com** - Remover `+16232536880` (¿asignar otro DID?)

---

## 📝 Query SQL Ejecutado

```sql
-- Consultar usuarios objetivo
SELECT 
  id, 
  email, 
  raw_user_meta_data->>'phone' as phone, 
  raw_user_meta_data->>'full_name' as full_name 
FROM auth.users 
WHERE email IN (
  'fernandamondragon@vidavacations.com',
  'angelicaguzman@vidavacations.com',
  'vanessaperez@vidavacations.com',
  'elizabethhernandez@vidavacations.com',
  'taydevera@vidavacations.com',
  'irvingaquino@vidavacations.com',
  'mayragonzalezs@vidavacations.com',
  'isselrico@vidavacations.com',
  'keniamartineza@vidavacations.com',
  'robertoraya@vidavacations.com',
  'manuelgomezp@vidavacations.com',
  'jessicagutierrez@vidavacations.com'
) 
ORDER BY email;

-- Buscar conflictos
SELECT 
  email, 
  raw_user_meta_data->>'phone' as phone, 
  raw_user_meta_data->>'full_name' as full_name 
FROM auth.users 
WHERE raw_user_meta_data->>'phone' IN (
  '+16232533325', '+16232533579', '+16232533580', 
  '+16232533583', '+16232533584', '+16232536849', 
  '+16232536853', '+16232536854', '+16232536875', 
  '+16232536877', '+16232536880', '+16232536882'
) 
AND email NOT IN (
  'fernandamondragon@vidavacations.com',
  'angelicaguzman@vidavacations.com',
  'vanessaperez@vidavacations.com',
  'elizabethhernandez@vidavacations.com',
  'taydevera@vidavacations.com',
  'irvingaquino@vidavacations.com',
  'mayragonzalezs@vidavacations.com',
  'isselrico@vidavacations.com',
  'keniamartineza@vidavacations.com',
  'robertoraya@vidavacations.com',
  'manuelgomezp@vidavacations.com',
  'jessicagutierrez@vidavacations.com'
) 
ORDER BY phone;
```

---

## 🔐 UUIDs de Usuarios (Para Actualizaciones)

| Email | UUID |
|-------|------|
| fernandamondragon@vidavacations.com | `9e81ada2-028d-426a-ad10-8a814080a3df` |
| angelicaguzman@vidavacations.com | `e86a85eb-b291-476d-8cd4-08b1391e5a7a` |
| vanessaperez@vidavacations.com | `90303228-29d4-4938-8245-4c5275bc881d` |
| elizabethhernandez@vidavacations.com | `226d0071-a391-4c86-8f83-d4e9fc58bdc1` |
| taydevera@vidavacations.com | `f0e5c696-70f9-47a7-ac2d-9589a78df93c` |
| irvingaquino@vidavacations.com | `2513037a-6739-46ff-93a6-c995e7324309` |
| mayragonzalezs@vidavacations.com | `f09d601d-5950-4093-857e-a9b6a7efeb73` |
| isselrico@vidavacations.com | `2a0a5e21-b773-413d-ae8c-c44fd3451001` |
| keniamartineza@vidavacations.com | `2e3b74b9-1377-4f7d-8ed2-400f54b1869a` |
| robertoraya@vidavacations.com | `2f245ac5-75e4-4365-811a-21baaf50b429` |
| manuelgomezp@vidavacations.com | `bccbed9d-b1dd-4c00-9cb8-83f88019367e` |
| jessicagutierrez@vidavacations.com | `55b7236e-3d0b-43c2-9ab6-6c5f04a29679` |

---

**Próximo paso:** ✅ **COMPLETADO** - Actualizaciones ejecutadas exitosamente

---

## ✅ ACTUALIZACIONES COMPLETADAS

**Fecha de actualización:** 22 de Enero 2026  
**Método:** Supabase Management API con Access Token  
**Estado:** ✅ TODAS LAS ACTUALIZACIONES EXITOSAS

### Actualizaciones Realizadas

1. ✅ **fernandamondragon@vidavacations.com**
   - ANTES: `fernandamondragon@vidavacations.com` (email en lugar de teléfono)
   - AHORA: `+16232533325`
   - Estado: **CORREGIDO**

2. ✅ **angelicaguzman@vidavacations.com**
   - ANTES: `NULL`
   - AHORA: `+16232533579`
   - Estado: **CORREGIDO**

3. ✅ **vanessaperez@vidavacations.com**
   - ANTES: `NULL`
   - AHORA: `+16232533580`
   - Estado: **CORREGIDO**

### Verificación Final (12 usuarios)

| Email | DID Asignado | Estado |
|-------|--------------|--------|
| fernandamondragon@vidavacations.com | +16232533325 | ✅ CORRECTO |
| angelicaguzman@vidavacations.com | +16232533579 | ✅ CORRECTO |
| vanessaperez@vidavacations.com | +16232533580 | ✅ CORRECTO |
| elizabethhernandez@vidavacations.com | +16232533583 | ✅ CORRECTO |
| taydevera@vidavacations.com | +16232533584 | ✅ CORRECTO |
| irvingaquino@vidavacations.com | +16232536849 | ✅ CORRECTO |
| mayragonzalezs@vidavacations.com | +16232536853 | ✅ CORRECTO |
| isselrico@vidavacations.com | +16232536854 | ✅ CORRECTO |
| keniamartineza@vidavacations.com | +16232536875 | ✅ CORRECTO |
| robertoraya@vidavacations.com | +16232536877 | ✅ CORRECTO |
| manuelgomezp@vidavacations.com | +16232536880 | ✅ CORRECTO |
| jessicagutierrez@vidavacations.com | +16232536882 | ✅ CORRECTO |

**✅ 12 de 12 usuarios con DIDs correctos (100%)**

---

## ⚠️ DIDs DUPLICADOS - ✅ RESUELTOS

Los siguientes usuarios **NO objetivo** tenían DIDs duplicados y fueron **ACTUALIZADOS**:

### 1. DID +16232533579 (PQNC_AI_2)
- ✅ **CORRECTO:** angelicaguzman@vidavacations.com
- ✅ **RESUELTO:** ejecutivo@grupovidanta.com (Panfilo Mestas) → **TELÉFONO REMOVIDO**
- ✅ **RESUELTO:** invitado@grupovidanta.com (Usuario Invitado) → **TELÉFONO REMOVIDO**

### 2. DID +16232533583 (PQNC_AI_4)
- ✅ **CORRECTO:** elizabethhernandez@vidavacations.com
- ✅ **RESUELTO:** paolamaldonado@vidavacations.com → **TELÉFONO REMOVIDO**

### 3. DID +16232536880 (PQNC_AI_11)
- ✅ **CORRECTO:** manuelgomezp@vidavacations.com
- ✅ **RESUELTO:** coordinador@grupovidanta.com (Juan Escutia) → **TELÉFONO REMOVIDO**

**✅ TODOS LOS CONFLICTOS RESUELTOS - NO HAY DUPLICADOS**

---

## 🗑️ USUARIOS CON TELÉFONOS REMOVIDOS

Los siguientes 4 usuarios tuvieron sus teléfonos removidos para eliminar conflictos:

| Email | DID Anterior | Estado Actual | Acción |
|-------|-------------|---------------|--------|
| coordinador@grupovidanta.com | +16232536880 | NULL | ✅ Removido |
| ejecutivo@grupovidanta.com | +16232533579 | NULL | ✅ Removido |
| invitado@grupovidanta.com | +16232533579 | NULL | ✅ Removido |
| paolamaldonado@vidavacations.com | +16232533583 | NULL | ✅ Removido |

**Nota:** Estos usuarios necesitarán que se les asigne un nuevo DID si requieren recibir llamadas.

---

## 📝 Comandos SQL Ejecutados

### Actualizaciones Realizadas

```sql
-- 1. Fernanda Mondragón (corregir email → DID)
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data, 
  '{phone}', 
  '"+16232533325"', 
  true
) 
WHERE id = '9e81ada2-028d-426a-ad10-8a814080a3df' 
RETURNING email, raw_user_meta_data->>'phone' as phone;

-- 2. Angélica Guzmán (NULL → DID)
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data, 
  '{phone}', 
  '"+16232533579"', 
  true
) 
WHERE id = 'e86a85eb-b291-476d-8cd4-08b1391e5a7a' 
RETURNING email, raw_user_meta_data->>'phone' as phone;

-- 3. Vanessa Pérez (NULL → DID)
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data, 
  '{phone}', 
  '"+16232533580"', 
  true
) 
WHERE id = '90303228-29d4-4938-8245-4c5275bc881d' 
RETURNING email, raw_user_meta_data->>'phone' as phone;
```

### Resolución de Conflictos

```sql
-- 4. Remover teléfono de coordinador@grupovidanta.com
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data - 'phone' 
WHERE id = 'c0026bee-029c-45c7-a6c4-3ca38aad96e4' 
RETURNING email, raw_user_meta_data->>'phone' as phone;

-- 5. Remover teléfono de ejecutivo@grupovidanta.com
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data - 'phone' 
WHERE id = '4e8271b3-5a03-46cb-a6e1-29020f3e4ef8' 
RETURNING email, raw_user_meta_data->>'phone' as phone;

-- 6. Remover teléfono de invitado@grupovidanta.com
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data - 'phone' 
WHERE id = '7f534574-e454-4c70-8ff6-5249414a546c' 
RETURNING email, raw_user_meta_data->>'phone' as phone;

-- 7. Remover teléfono de paolamaldonado@vidavacations.com
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data - 'phone' 
WHERE id = '8313be22-91b7-4c8b-a5c2-bc81caf1ab06' 
RETURNING email, raw_user_meta_data->>'phone' as phone;
```

### Verificación Final

```sql
SELECT 
  email, 
  raw_user_meta_data->>'phone' as phone, 
  raw_user_meta_data->>'full_name' as full_name 
FROM auth.users 
WHERE email IN (
  'fernandamondragon@vidavacations.com',
  'angelicaguzman@vidavacations.com',
  'vanessaperez@vidavacations.com',
  'elizabethhernandez@vidavacations.com',
  'taydevera@vidavacations.com',
  'irvingaquino@vidavacations.com',
  'mayragonzalezs@vidavacations.com',
  'isselrico@vidavacations.com',
  'keniamartineza@vidavacations.com',
  'robertoraya@vidavacations.com',
  'manuelgomezp@vidavacations.com',
  'jessicagutierrez@vidavacations.com'
) 
ORDER BY email;
```

---

## 📊 Resumen Final

| Métrica | Valor |
|---------|-------|
| Usuarios auditados | 12 ejecutivos PQNC AI |
| DIDs incorrectos encontrados | 3 |
| DIDs corregidos | 3 |
| DIDs ya correctos | 9 |
| **Estado final ejecutivos** | **✅ 12/12 CORRECTO** |
| DIDs duplicados encontrados | 4 usuarios externos |
| Conflictos resueltos | 4 teléfonos removidos |
| **Estado final duplicados** | **✅ 0 DUPLICADOS** |

---

## 🎯 Próximas Acciones Recomendadas

1. ~~**Resolver DIDs duplicados**~~ ✅ **COMPLETADO**
   - ✅ Removido teléfono de `ejecutivo@grupovidanta.com`
   - ✅ Removido teléfono de `invitado@grupovidanta.com`
   - ✅ Removido teléfono de `paolamaldonado@vidavacations.com`
   - ✅ Removido teléfono de `coordinador@grupovidanta.com`

2. **Validar en producción:**
   - [ ] Verificar que los 12 ejecutivos puedan recibir llamadas
   - [ ] Confirmar que los skills PQNC_AI_1 a PQNC_AI_12 están configurados
   - [ ] Probar flujo completo de llamadas entrantes

3. **Asignar nuevos DIDs (opcional):**
   - [ ] Si `paolamaldonado@vidavacations.com` necesita recibir llamadas, asignar nuevo DID
   - [ ] Si `coordinador@grupovidanta.com` necesita recibir llamadas, asignar nuevo DID
   - [ ] Si `ejecutivo@grupovidanta.com` necesita recibir llamadas, asignar nuevo DID
   - [ ] Si `invitado@grupovidanta.com` necesita recibir llamadas, asignar nuevo DID

4. **Documentar:**
   - [ ] Actualizar documentación de DIDs en Wiki/Confluence
   - [ ] Notificar al equipo de los cambios realizados

---

**Última actualización:** 22 de Enero 2026 - Actualizaciones completadas, conflictos resueltos, NO hay duplicados
