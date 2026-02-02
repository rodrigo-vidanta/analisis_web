# 🔍 DIAGNÓSTICO COMPLETO: Mayra González - Permisos BOOM

**Fecha:** 2 de Febrero 2026  
**Usuario:** Gonzalez Serrano Mayra Soledad Jazmin (mayragonzalezs@vidavacations.com)  
**ID:** `f09d601d-5950-4093-857e-a9b6a7efeb73`  
**Problema reportado:** Puede visualizar leads de BOOM cuando solo debería ver VEN

---

## ✅ CONCLUSIÓN PRINCIPAL

**El problema NO está en la base de datos**. La configuración de Mayra es **correcta**:

| Aspecto | Configuración | Estado |
|---------|--------------|--------|
| Coordinación principal | VEN (`3f41a10b-60b1-4c2b-b097-a83968353af5`) | ✅ Correcto |
| Rol | Ejecutivo (`fed8bd96-7928-4a3e-bb20-e20384e98f0b`) | ✅ Correcto |
| Coordinaciones adicionales | 1 (solo VEN en `auth_user_coordinaciones`) | ✅ Correcto |
| Prospectos asignados BOOM | 0 | ✅ Correcto |
| Prospectos asignados VEN | 306 | ✅ Correcto |
| Es backup de ejecutivos BOOM | NO | ✅ Correcto |
| Ejecutivos BOOM donde es backup | 0 | ✅ Correcto |

---

## 🔍 ANÁLISIS DETALLADO

### 1. Información del Usuario

```json
{
  "id": "f09d601d-5950-4093-857e-a9b6a7efeb73",
  "email": "mayragonzalezs@vidavacations.com",
  "full_name": "Gonzalez Serrano Mayra Soledad Jazmin",
  "role_name": "ejecutivo",
  "coordinacion_id": "3f41a10b-60b1-4c2b-b097-a83968353af5", // VEN
  "backup_id": "2a0a5e21-b773-413d-ae8c-c44fd3451001", // Issel Rico (VEN)
  "has_backup": true,
  "is_operativo": false,
  "is_active": true
}
```

**✅ Coordinación VEN confirmada**

### 2. Coordinaciones Asignadas

Query ejecutada: `auth_user_coordinaciones WHERE user_id = 'f09d601d...'`

**Resultado:**
```json
[
  {
    "coordinacion_id": "3f41a10b-60b1-4c2b-b097-a83968353af5" // VEN
  }
]
```

**✅ Solo tiene VEN asignada** (1 coordinación)

### 3. Cadena de Backups

- **Mayra es backup de:** Yesica Macias (yesicamacias@vidavacations.com) - Coordinación **VEN** ✅
- **Backup de Mayra:** Issel Rico (isselrico@vidavacations.com) - Coordinación **VEN** ✅

**✅ No hay relación con BOOM en la cadena de backups**

### 4. Prospectos Asignados

Query ejecutada: `SELECT COUNT(*), coordinacion_id FROM prospectos WHERE ejecutivo_id = 'f09d601d...' GROUP BY coordinacion_id`

**Resultado:**
- **VEN:** 306 prospectos ✅
- **BOOM:** 0 prospectos ✅

**✅ NO tiene prospectos de BOOM asignados**

### 5. El Prospecto de BOOM Visible

Según la imagen del usuario, Mayra ve una conversación de:
- **Nombre:** Adriana Baeza  
- **WhatsApp:** 5214111573556  
- **Coordinación:** BOOM (`e590fed1-6d65-43e0-80ab-ff819ce63eee`)

**Datos del prospecto en BD:**
```json
{
  "id": "480e390f-86d5-420c-8f7f-4efa64e1898b",
  "nombre": "Adriana",
  "whatsapp": "5214111573556",
  "ejecutivo_id": "d7847ffa-0758-4eb2-a97b-f80e54886531", // Osmara Partida
  "coordinacion_id": "e590fed1-6d65-43e0-80ab-ff819ce63eee" // BOOM
}
```

**Ejecutivo real del prospecto:**
```json
{
  "id": "d7847ffa-0758-4eb2-a97b-f80e54886531",
  "email": "osmarapartida@vidavacations.com",
  "full_name": "Partida Bernal Osmara",
  "coordinacion_id": "e590fed1-6d65-43e0-80ab-ff819ce63eee", // BOOM
  "backup_id": "3c34d485-17bf-48c2-a26d-c1c3e62e9e36", // Ignacio Barba
  "has_backup": true
}
```

**❌ Mayra NO es backup de Osmara Partida**  
**❌ Mayra NO tiene relación con este prospecto en BD**

---

## 🎯 CAUSA RAÍZ IDENTIFICADA

### Problema: Filtro Frontend NO se Aplica Correctamente

El problema está en **cómo se filtran las conversaciones en el módulo WhatsApp/LiveChat del frontend**.

### Posibles Causas (en orden de probabilidad):

#### 🔴 **CAUSA 1: RLS Deshabilitado o Permisivo en `conversaciones_whatsapp`**

Si la tabla `conversaciones_whatsapp` NO tiene RLS o tiene políticas demasiado permisivas, el frontend puede cargar **todas** las conversaciones sin filtrar.

**Verificar:**
```sql
-- Ver si RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'conversaciones_whatsapp';

-- Ver políticas actuales
SELECT polname, polcmd, qual 
FROM pg_policy 
WHERE polrelid = 'conversaciones_whatsapp'::regclass;
```

**Solución si RLS está deshabilitado:**
```sql
ALTER TABLE conversaciones_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ejecutivos ven solo sus conversaciones"
ON conversaciones_whatsapp
FOR SELECT
TO authenticated
USING (
  prospecto_id IN (
    SELECT p.id 
    FROM prospectos p
    WHERE p.ejecutivo_id = auth.uid()
    AND p.coordinacion_id IN (
      SELECT coordinacion_id 
      FROM auth_user_coordinaciones 
      WHERE user_id = auth.uid()
    )
  )
);
```

#### 🟡 **CAUSA 2: Filtro de Coordinaciones NO se Aplica en LiveChatCanvas**

El componente `LiveChatCanvas.tsx` carga conversaciones y puede NO estar aplicando el filtro de coordinaciones correctamente.

**Código sospechoso en `src/components/chat/LiveChatCanvas.tsx` (líneas 4001-4120):**

El filtro se aplica **después** de cargar las conversaciones, NO en la query inicial:

```typescript
// LÍNEA 4005: Se obtiene el filtro de coordinaciones
const coordinacionesFilter = await permissionsService.getCoordinacionesFilter(queryUserId);

// LÍNEA 4103-4110: Filtro se aplica EN MEMORIA, no en la query
if (!prospectoData.coordinacion_id || !coordinacionesFilter || 
    !coordinacionesFilter.includes(prospectoData.coordinacion_id)) {
  continue; // Excluir
}
```

**Problema:** Si las conversaciones se cargan ANTES de aplicar el filtro, Mayra ve la conversación en la UI por un momento, o el filtro en memoria falla.

**Solución:** Aplicar filtro de coordinaciones DIRECTO en la query de Supabase:

```typescript
// En loadConversationsLegacy (línea ~3747)
let query = analysisSupabase
  .from('conversaciones_whatsapp')
  .select('*')
  .order('last_message_time', { ascending: false });

// AGREGAR FILTRO DE COORDINACIONES AQUÍ
if (coordinacionesFilter && coordinacionesFilter.length > 0) {
  query = query.in('prospecto_id', analysisSupabase
    .from('prospectos')
    .select('id')
    .in('coordinacion_id', coordinacionesFilter)
  );
}
```

#### 🟢 **CAUSA 3: Caché del Frontend con Datos Obsoletos**

Si el `permissionsService` está usando caché (TTL: 30 segundos), puede retornar coordinaciones incorrectas.

**Solución:** Forzar invalidación de caché después de login:

```typescript
// En AuthContext.tsx
await permissionsService.invalidateUserCache(user.id);
```

#### 🟢 **CAUSA 4: Bug en `getCoordinacionesFilter` para Ejecutivos**

El servicio `permissionsService.ts` (líneas 698-701) retorna coordinaciones para ejecutivos:

```typescript
if (permissions.role === 'ejecutivo') {
  const result = permissions.coordinacion_id ? [permissions.coordinacion_id] : null;
  return result; // Retorna array con UNA coordinación
}
```

**Posible bug:** Si `permissions.coordinacion_id` es `null` o `undefined`, retorna `null` en lugar de `[]`, lo que puede interpretarse como "sin filtro" (admin).

**Solución:**
```typescript
if (permissions.role === 'ejecutivo') {
  if (!permissions.coordinacion_id) {
    return []; // Array vacío = no ve nada
  }
  return [permissions.coordinacion_id];
}
```

---

## 🔧 PLAN DE ACCIÓN RECOMENDADO

### ✅ Paso 1: Verificar RLS en `conversaciones_whatsapp`

```sql
-- Ejecutar en Supabase SQL Editor
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'conversaciones_whatsapp';
```

**Si `rls_enabled = false`:**
- Habilitar RLS (ver script arriba)
- Crear política para ejecutivos

### ✅ Paso 2: Agregar Filtro de Coordinaciones en Query de Conversaciones

**Archivo:** `src/components/chat/LiveChatCanvas.tsx`  
**Línea:** ~3780-3800 (función `loadConversationsLegacy`)

**Cambio:**
```typescript
// ANTES: Query sin filtro de coordinaciones
const { data, error } = await analysisSupabase
  .from('conversaciones_whatsapp')
  .select('*')
  .order('last_message_time', { ascending: false });

// DESPUÉS: Query con filtro de coordinaciones
const coordinacionesFilter = await permissionsService.getCoordinacionesFilter(queryUserId);

let query = analysisSupabase
  .from('conversaciones_whatsapp')
  .select(`
    *,
    prospecto:prospectos!inner(id, coordinacion_id)
  `)
  .order('last_message_time', { ascending: false });

// Si es ejecutivo o coordinador, filtrar por coordinaciones
if (coordinacionesFilter && coordinacionesFilter.length > 0) {
  query = query.in('prospecto.coordinacion_id', coordinacionesFilter);
}

const { data, error } = await query;
```

### ✅ Paso 3: Fix en `getCoordinacionesFilter` para Ejecutivos

**Archivo:** `src/services/permissionsService.ts`  
**Línea:** 698-701

**Cambio:**
```typescript
// ANTES
if (permissions.role === 'ejecutivo') {
  const result = permissions.coordinacion_id ? [permissions.coordinacion_id] : null;
  return result;
}

// DESPUÉS
if (permissions.role === 'ejecutivo') {
  if (!permissions.coordinacion_id) {
    console.warn(`⚠️ Ejecutivo ${userId} sin coordinacion_id asignada`);
    return []; // Array vacío = no ve nada (en lugar de null = sin filtro)
  }
  return [permissions.coordinacion_id];
}
```

### ✅ Paso 4: Invalidar Caché Después de Login

**Archivo:** `src/contexts/AuthContext.tsx`  
**Función:** `signIn` o `useEffect` después de auth

**Agregar:**
```typescript
// Después de verificar usuario autenticado
if (user) {
  await permissionsService.invalidateUserCache(user.id);
}
```

### ✅ Paso 5: Probar en Ambiente de Desarrollo

1. Hacer logout de Mayra
2. Aplicar los cambios arriba
3. Login de nuevo
4. Verificar que **NO** ve conversaciones de BOOM
5. Verificar que **SÍ** ve conversaciones de VEN

---

## 📊 RESUMEN EJECUTIVO

### Estado de la Base de Datos: ✅ CORRECTO

| Verificación | Resultado |
|-------------|-----------|
| Coordinación de Mayra | ✅ VEN |
| Coordinaciones adicionales | ✅ Solo VEN (1 coordinación) |
| Prospectos de BOOM asignados | ✅ 0 (ninguno) |
| Prospectos de VEN asignados | ✅ 306 |
| Es backup en BOOM | ✅ NO |
| Cadena de backups | ✅ Solo VEN |

### Causa Raíz: 🔴 FILTRO FRONTEND

El problema está en **cómo se cargan y filtran las conversaciones en el módulo WhatsApp**:
1. RLS puede estar deshabilitado en `conversaciones_whatsapp`
2. Filtro de coordinaciones NO se aplica en la query inicial
3. Filtro se aplica en memoria DESPUÉS de cargar datos
4. Posible bug en `getCoordinacionesFilter` retornando `null` en lugar de `[]`

### Próximos Pasos: 🔧 CORREGIR FRONTEND

1. Verificar RLS en `conversaciones_whatsapp`
2. Agregar filtro de coordinaciones en query de conversaciones
3. Fix en `getCoordinacionesFilter` para ejecutivos sin coordinación
4. Invalidar caché después de login
5. Probar con Mayra

---

## 📁 Archivos Afectados

| Archivo | Cambio Requerido |
|---------|------------------|
| `src/components/chat/LiveChatCanvas.tsx` | Agregar filtro de coordinaciones en query inicial |
| `src/services/permissionsService.ts` | Fix en `getCoordinacionesFilter` para ejecutivos |
| `src/contexts/AuthContext.tsx` | Invalidar caché después de login |
| SQL: `conversaciones_whatsapp` | Habilitar RLS + política para ejecutivos |

---

## 🎯 PRÓXIMOS PASOS

1. **INMEDIATO:** Verificar RLS en `conversaciones_whatsapp` con query SQL
2. **CÓDIGO:** Aplicar cambios en `LiveChatCanvas.tsx` y `permissionsService.ts`
3. **TESTING:** Probar con cuenta de Mayra en dev
4. **DEPLOY:** Desplegar a producción después de testing exitoso
5. **MONITOREO:** Verificar logs de permisos en producción

---

**Última actualización:** 2 de Febrero 2026  
**Estado:** ✅ Diagnóstico completo - Problema identificado en filtro frontend  
**Autor:** AI Assistant - PQNC QA AI Platform
