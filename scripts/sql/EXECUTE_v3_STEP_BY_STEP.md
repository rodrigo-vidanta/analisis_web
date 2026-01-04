# 📋 GUÍA DE EJECUCIÓN SEGURA - get_conversations_ordered v3

## ⚠️ IMPORTANTE: LEER COMPLETO ANTES DE EJECUTAR

**Base de datos:** Analysis DB (glsmifhkoaifvaegsozd.supabase.co)  
**Tiempo estimado:** 5-10 minutos  
**Riesgo:** BAJO (tenemos rollback completo)  
**Impacto:** Live Chat dejará de funcionar por 1-2 minutos durante la actualización

---

## ✅ PRE-REQUISITOS

Antes de empezar, verificar:

- [ ] Tienes acceso a Supabase Dashboard
- [ ] Estás en la base de datos CORRECTA (glsmifhkoaifvaegsozd)
- [ ] Tienes los archivos abiertos:
  - `scripts/sql/update_get_conversations_ordered_v3_pagination.sql` (NUEVO)
  - `scripts/sql/BACKUP_get_conversations_ordered_v2.sql` (ROLLBACK)
- [ ] Hay backup del código en Git (commit d4636ec)
- [ ] NO hay usuarios críticos usando Live Chat en este momento

---

## 📊 PASO 1: VERIFICAR ESTADO ACTUAL

### **1.1 Abrir Supabase Dashboard**
```
URL: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd
Login con tus credenciales
```

### **1.2 Ir a SQL Editor**
```
Menú lateral izquierdo → SQL Editor
Click en "New query"
```

### **1.3 Verificar función actual**
```sql
-- Copiar y ejecutar esto:
SELECT 
  p.proname AS nombre_funcion,
  p.pronargs AS numero_parametros,
  pg_get_function_identity_arguments(p.oid) AS parametros
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('get_conversations_ordered', 'is_valid_whatsapp_name', 'get_conversations_count')
ORDER BY p.proname;
```

**Resultado esperado ACTUAL (v2):**
```
nombre_funcion              | numero_parametros | parametros
----------------------------|-------------------|------------
get_conversations_ordered   | 0                 | (vacío)
is_valid_whatsapp_name      | 1                 | name_text text
```

**Nota:** `get_conversations_count` NO debe existir aún

---

## 💾 PASO 2: HACER BACKUP (CRÍTICO)

### **2.1 Obtener definición completa actual**
```sql
-- Copiar y ejecutar:
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'get_conversations_ordered' 
  AND pronamespace = 'public'::regnamespace;
```

### **2.2 Guardar resultado**
- Copiar TODO el texto del resultado
- Pegarlo en un archivo temporal (Notepad, TextEdit, etc.)
- Nombrarlo: `backup_manual_v2_[FECHA].sql`
- **NO cerrar este archivo hasta que verifiques que v3 funciona**

### **2.3 Verificar que tienes el backup del repositorio**
```sql
-- También puedes usar el archivo que ya creé:
scripts/sql/BACKUP_get_conversations_ordered_v2.sql

-- Este archivo YA está listo para restaurar si es necesario
```

---

## 🚀 PASO 3: EJECUTAR ACTUALIZACIÓN A V3

### **3.1 Abrir archivo v3**
```
Abrir: scripts/sql/update_get_conversations_ordered_v3_pagination.sql
```

### **3.2 Revisar que el contenido es correcto**
Verificar que contiene:
- [ ] `DROP FUNCTION IF EXISTS get_conversations_ordered(integer, integer);`
- [ ] `DROP FUNCTION IF EXISTS get_conversations_ordered();`
- [ ] `CREATE OR REPLACE FUNCTION is_valid_whatsapp_name...`
- [ ] `CREATE OR REPLACE FUNCTION get_conversations_ordered(p_limit INTEGER, p_offset INTEGER)...`
- [ ] `CREATE OR REPLACE FUNCTION get_conversations_count()...`
- [ ] `GRANT EXECUTE ON FUNCTION...`
- [ ] Total: ~180 líneas

### **3.3 Copiar TODO el contenido**
```
Ctrl+A (Cmd+A en Mac) → Copiar
```

### **3.4 Pegar en SQL Editor de Supabase**
```
SQL Editor → New query → Pegar
```

### **3.5 EJECUTAR**
```
Click en botón "Run" (esquina inferior derecha)
O presionar: Ctrl+Enter (Cmd+Enter en Mac)
```

### **3.6 Verificar que NO hay errores**
**Resultado esperado:**
```
Success. No rows returned

O

Algún mensaje de confirmación sin palabra "ERROR"
```

**Si hay ERROR:**
- ❌ NO continuar
- ❌ Ejecutar ROLLBACK (Paso 5)
- ❌ Reportar el error

---

## ✅ PASO 4: VERIFICACIÓN POST-ACTUALIZACIÓN

### **4.1 Verificar que se crearon las 3 funciones**
```sql
-- Ejecutar:
SELECT 
  p.proname AS nombre_funcion,
  p.pronargs AS numero_parametros,
  pg_get_function_identity_arguments(p.oid) AS parametros
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('get_conversations_ordered', 'is_valid_whatsapp_name', 'get_conversations_count')
ORDER BY p.proname;
```

**Resultado esperado v3:**
```
nombre_funcion              | numero_parametros | parametros
----------------------------|-------------------|---------------------------
get_conversations_count     | 0                 | (vacío)
get_conversations_ordered   | 2                 | p_limit integer, p_offset integer
is_valid_whatsapp_name      | 1                 | name_text text
```

✅ **DEBE mostrar 3 funciones**  
✅ **get_conversations_ordered DEBE tener 2 parámetros**  
✅ **get_conversations_count DEBE existir**

---

### **4.2 Probar conteo total**
```sql
-- Debe devolver un número (ejemplo: 1523, 2456, etc.)
SELECT get_conversations_count() AS total_conversaciones;
```

**Resultado esperado:**
```
total_conversaciones
--------------------
1523
```

---

### **4.3 Probar paginación**
```sql
-- Primera página (5 conversaciones)
SELECT prospecto_id, nombre_contacto, mensajes_totales, mensajes_no_leidos
FROM get_conversations_ordered(5, 0)
ORDER BY fecha_ultimo_mensaje DESC;

-- Segunda página (siguientes 5)
SELECT prospecto_id, nombre_contacto, mensajes_totales, mensajes_no_leidos
FROM get_conversations_ordered(5, 5)
ORDER BY fecha_ultimo_mensaje DESC;
```

**Resultado esperado:**
- Primera consulta: 5 conversaciones más recientes
- Segunda consulta: 5 conversaciones siguientes (diferentes a las primeras)

---

### **4.4 Verificar permisos**
```sql
-- Debe mostrar las 3 funciones con permisos
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name IN ('get_conversations_ordered', 'get_conversations_count', 'is_valid_whatsapp_name')
  AND routine_schema = 'public'
ORDER BY routine_name, grantee;
```

**Debe incluir:**
- authenticated → EXECUTE
- anon → EXECUTE

---

## 🧪 PASO 5: PROBAR EN LA APLICACIÓN

### **5.1 Abrir Live Chat en la app**
```
http://localhost:5173 → Login → Live Chat
```

### **5.2 Verificar en consola del navegador**
Buscar estos logs:
```
✅ ESPERADO:
📊 Total de conversaciones en BD: 1523
📥 Cargando batch 1 de conversaciones (reset: true)
📊 Reset: 200 cargadas de 1523 totales. HasMore: true

❌ ERROR (ejecutar rollback):
Error: function get_conversations_ordered(integer, integer) does not exist
Error loading conversations
```

### **5.3 Probar infinite scroll**
- Hacer scroll hasta el 75% de la lista
- Verificar que aparece: "🔄 Cargando más conversaciones..."
- Verificar que se cargan más conversaciones

### **5.4 Probar realtime**
- Enviar un mensaje de prueba
- Verificar que la conversación se mueve al tope
- Verificar que el contador de no leídos se actualiza

---

## 🔄 ROLLBACK (Si algo falló)

### **Ejecutar INMEDIATAMENTE:**

1. **Abrir SQL Editor en Supabase**

2. **Copiar y ejecutar:**
   ```
   Archivo: scripts/sql/BACKUP_get_conversations_ordered_v2.sql
   Copiar TODO → Pegar en SQL Editor → Run
   ```

3. **Verificar rollback:**
   ```sql
   -- Debe mostrar 0 parámetros (v2 restaurada)
   SELECT proname, pronargs 
   FROM pg_proc 
   WHERE proname = 'get_conversations_ordered';
   ```

4. **Revertir código:**
   ```bash
   git revert d4636ec
   git push origin main
   ./update-frontend.sh
   ```

---

## 📊 CHECKLIST COMPLETO

### **Antes de ejecutar:**
- [ ] Backup de función actual guardado
- [ ] Archivo ROLLBACK_PLAN_v3_pagination.md leído
- [ ] BACKUP_get_conversations_ordered_v2.sql listo
- [ ] Base de datos correcta confirmada (glsmifhkoaifvaegsozd)
- [ ] Momento de bajo tráfico seleccionado

### **Durante ejecución:**
- [ ] SQL v3 copiado completo (180 líneas)
- [ ] SQL ejecutado sin errores
- [ ] 3 funciones creadas confirmadas
- [ ] Permisos GRANT aplicados

### **Después de ejecutar:**
- [ ] get_conversations_count() funciona
- [ ] get_conversations_ordered(5, 0) devuelve 5 filas
- [ ] get_conversations_ordered(5, 5) devuelve otras 5 filas
- [ ] Live Chat carga conversaciones en la app
- [ ] Infinite scroll funciona
- [ ] Realtime funciona
- [ ] Etiquetas funcionan

---

## 🎯 TIEMPO TOTAL ESTIMADO

- Lectura de esta guía: 5 min
- Backup y verificación: 2 min
- Ejecución SQL: 1 min
- Verificación en BD: 2 min
- Prueba en app: 3 min

**Total: ~15 minutos** (siendo cuidadoso)

---

**RECUERDA:** Si tienes CUALQUIER duda, ejecuta primero el rollback y pregunta.

**Mejor prevenir que lamentar** 🛡️

