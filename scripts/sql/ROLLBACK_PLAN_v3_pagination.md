# 🔄 PLAN DE ROLLBACK - get_conversations_ordered v3

## ⚠️ SI ALGO SALE MAL

### **SÍNTOMAS DE PROBLEMA**

- ❌ Live Chat no carga conversaciones
- ❌ Error en consola: "function get_conversations_ordered() does not exist"
- ❌ Error: "function get_conversations_ordered(integer, integer) does not exist"
- ❌ Conversaciones se cargan pero no se pueden enviar mensajes
- ❌ Infinite scroll no funciona

---

## 🚨 ROLLBACK INMEDIATO

### **Paso 1: Restaurar función v2 (SIN paginación)**

**Archivo:** `scripts/sql/BACKUP_get_conversations_ordered_v2.sql`

**Ejecutar en:** Analysis DB (glsmifhkoaifvaegsozd.supabase.co)

**Tiempo:** < 1 minuto

**Efecto:**
- Vuelve a la versión sin paginación
- Límite de 1000 conversaciones restaurado
- Todo funciona como antes

---

### **Paso 2: Revertir código en Git**

```bash
# Opción A: Revertir último commit
git revert d4636ec

# Opción B: Reset hard (SOLO SI NO HAS HECHO PUSH)
git reset --hard HEAD~1

# Opción C: Checkout a commit anterior
git checkout 7dcc9f3
```

---

### **Paso 3: Rebuild y redeploy**

```bash
# Rebuild con código anterior
npm run build

# Deploy versión anterior
./update-frontend.sh
```

---

## 🔍 VERIFICACIÓN POST-ROLLBACK

### **En Supabase SQL Editor:**
```sql
-- Verificar que la función v2 está activa
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname = 'get_conversations_ordered';

-- Debe devolver:
-- proname: get_conversations_ordered
-- pronargs: 0  (sin parámetros = v2)
```

### **En la aplicación:**
1. Abrir Live Chat
2. Verificar que carga conversaciones (máximo 1000)
3. Verificar que realtime funciona
4. Verificar que etiquetas funcionan

---

## 📊 COMPARACIÓN DE VERSIONES

| Aspecto | v2 (Backup) | v3 (Nueva) |
|---------|-------------|------------|
| Parámetros | 0 | 2 (p_limit, p_offset) |
| Paginación | ❌ | ✅ |
| Límite | 1000 (Supabase) | Infinito |
| Función count | ❌ | ✅ get_conversations_count() |
| Compatibilidad | Total | Requiere código actualizado |

---

## 🛠️ SI EL PROBLEMA ES PARCIAL

### **Problema: "function does not exist with 2 parameters"**

**Causa:** La función v3 no se creó correctamente

**Solución rápida:**
```sql
-- Crear versión compatible que acepta ambos formatos
CREATE OR REPLACE FUNCTION get_conversations_ordered()
RETURNS TABLE (...) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM get_conversations_ordered(1000, 0);
END;
$$;
```

---

### **Problema: "get_conversations_count does not exist"**

**Causa:** La segunda función no se creó

**Solución:**
```sql
-- Crear función de conteo simple
CREATE OR REPLACE FUNCTION get_conversations_count()
RETURNS bigint
AS $$
  SELECT COUNT(DISTINCT prospecto_id)::bigint 
  FROM mensajes_whatsapp 
  WHERE prospecto_id IS NOT NULL;
$$ LANGUAGE sql STABLE;
```

---

## 📞 CONTACTO DE EMERGENCIA

Si hay problemas críticos en producción:

1. **Rollback inmediato** (ejecutar backup v2)
2. **Notificar al equipo**
3. **Revisar logs de Supabase** (Dashboard → Logs)
4. **Verificar permisos** (GRANTs en las funciones)

---

## ✅ CHECKLIST DE ROLLBACK

- [ ] Backup v2 ejecutado en Supabase
- [ ] Función get_conversations_ordered() sin parámetros confirmada
- [ ] Live Chat carga conversaciones normalmente
- [ ] Realtime funciona
- [ ] Código anterior re-deployed
- [ ] CloudFront cache invalidado
- [ ] Usuarios notificados (si aplica)

---

**Última actualización:** Enero 2025  
**Responsable:** Team PQNC  
**Archivo de backup:** `scripts/sql/BACKUP_get_conversations_ordered_v2.sql`

