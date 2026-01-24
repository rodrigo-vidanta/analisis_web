# 🚀 Guía Rápida: Ejecutar Migración en Supabase

**Tiempo estimado:** 5 minutos  
**Riesgo:** Bajo (backup automático incluido)

---

## 📋 Paso a Paso

### 1️⃣ Abrir SQL Editor

**URL directa:**
```
https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new
```

O navegar:
1. Ir a https://supabase.com/dashboard
2. Seleccionar proyecto `PQNC_AI` (glsmifhkoaifvaegsozd)
3. Click en **"SQL Editor"** en menú lateral
4. Click en **"New query"**

---

### 2️⃣ Copiar Migración

**Opción A: Terminal**
```bash
cd /Users/darigsamuelrosalesrobledo/Documents/pqnc-qa-ai-platform
cat migrations/20260124_drop_redundant_columns_conversaciones.sql | pbcopy
```

**Opción B: Editor**
1. Abrir archivo `migrations/20260124_drop_redundant_columns_conversaciones.sql`
2. Seleccionar todo (`Cmd+A`)
3. Copiar (`Cmd+C`)

---

### 3️⃣ Ejecutar en Supabase

1. Pegar en SQL Editor (`Cmd+V`)
2. Click en botón **"Run"** (esquina superior derecha)
   - O presionar `Ctrl+Enter` / `Cmd+Enter`
3. Esperar a que termine (≈30 segundos)
4. Verificar mensaje de éxito: ✅ "Success. No rows returned"

---

### 4️⃣ Verificar Ejecución

Ejecutar estas 3 queries para confirmar:

#### Query 1: Verificar que columnas fueron eliminadas
```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'conversaciones_whatsapp'
  AND column_name IN ('numero_telefono', 'nombre_contacto');
```
**✅ Esperado:** 0 filas (columnas ya no existen)

#### Query 2: Verificar que vista fue creada
```sql
SELECT COUNT(*) as total_con_datos
FROM conversaciones_whatsapp_con_prospecto
WHERE numero_telefono IS NOT NULL;
```
**✅ Esperado:** ~4,818 conversaciones

#### Query 3: Verificar caso específico (prospecto original)
```sql
SELECT 
  c.id,
  c.prospecto_id,
  p.whatsapp,
  p.nombre_completo,
  p.nombre_whatsapp
FROM conversaciones_whatsapp c
LEFT JOIN prospectos p ON c.prospecto_id = p.id
WHERE p.whatsapp = '5215522490483';
```
**✅ Esperado:** 
```
prospecto_id: e7b2d1a7-d92a-40aa-953e-1252c5fdeb5b
whatsapp: 5215522490483
nombre_completo: Rosario
```

---

### 5️⃣ Probar en Frontend

1. Ir a módulo de **WhatsApp** (Live Chat)
2. En el buscador, escribir: `Rosario`
3. **✅ Esperado:** Debe aparecer la conversación
4. Buscar por teléfono: `5215522490483`
5. **✅ Esperado:** Debe aparecer la conversación

---

## 🆘 Solución de Problemas

### Error: "permission denied for table conversaciones_whatsapp"
**Causa:** No estás usando el rol correcto  
**Solución:** Asegúrate de estar autenticado como `postgres` o `service_role`

### Error: "column does not exist"
**Causa:** Las columnas ya fueron eliminadas antes  
**Solución:** ✅ Esto es correcto, continuar con verificaciones

### Error: "relation already exists"
**Causa:** La vista ya fue creada antes  
**Solución:** 
```sql
-- Eliminar y recrear vista
DROP VIEW IF EXISTS conversaciones_whatsapp_con_prospecto;
-- Luego ejecutar de nuevo la parte de CREATE VIEW
```

---

## 📊 ¿Qué Hace Esta Migración?

### Backup Automático
```sql
CREATE TABLE conversaciones_whatsapp_backup_pre_drop_columns_20260124 AS
SELECT * FROM conversaciones_whatsapp;
```
✅ Crea respaldo completo de la tabla

### Eliminar Columnas
```sql
ALTER TABLE conversaciones_whatsapp 
DROP COLUMN IF EXISTS numero_telefono;

ALTER TABLE conversaciones_whatsapp 
DROP COLUMN IF EXISTS nombre_contacto;
```
❌ Elimina las columnas redundantes (siempre NULL)

### Vista de Compatibilidad
```sql
CREATE VIEW conversaciones_whatsapp_con_prospecto AS
SELECT 
  c.*,
  p.whatsapp as numero_telefono,
  COALESCE(p.nombre_whatsapp, p.nombre_completo) as nombre_contacto
FROM conversaciones_whatsapp c
LEFT JOIN prospectos p ON c.prospecto_id = p.id;
```
✅ Crea vista para código legacy (si existe)

---

## 🔄 Rollback (Solo si es necesario)

**⚠️ NO RECOMENDADO** - Los datos seguirían siendo NULL

Si realmente necesitas revertir:

```sql
-- Restaurar columnas
ALTER TABLE conversaciones_whatsapp 
ADD COLUMN numero_telefono TEXT,
ADD COLUMN nombre_contacto TEXT;

-- Los valores serán NULL (como antes)
-- NO hay forma de "recuperar" datos que nunca existieron
```

---

## ✅ Checklist Final

Antes de cerrar:

- [ ] Migración ejecutada sin errores
- [ ] Query 1 retorna 0 filas (columnas eliminadas)
- [ ] Query 2 retorna ~4,818 (vista funciona)
- [ ] Query 3 encuentra prospecto e7b2d1a7... (caso original)
- [ ] Búsqueda en frontend por nombre funciona
- [ ] Búsqueda en frontend por teléfono funciona

---

## 🎉 ¡Listo!

Si todos los checks pasaron:
- ✅ Migración exitosa
- ✅ Problema de búsqueda resuelto
- ✅ Arquitectura mejorada (Single Source of Truth)

---

**Tiempo real de ejecución:** ≈2 minutos  
**Dificultad:** 🟢 Baja  
**Reversible:** ⚠️ Sí (pero no recomendado)

---

## 📞 Contacto

Si algo sale mal:
1. Revisar logs de SQL Editor
2. Verificar que el proyecto es `glsmifhkoaifvaegsozd`
3. Consultar `RESUMEN_EJECUCION_DROP_COLUMNS.md` para detalles técnicos

---

**Última actualización:** 24 de Enero 2026
