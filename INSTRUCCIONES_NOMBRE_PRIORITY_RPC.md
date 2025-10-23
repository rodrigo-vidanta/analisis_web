# 📝 INSTRUCCIONES: Actualizar RPC para Prioridad de Nombres

## 🎯 Objetivo:
Actualizar la función RPC `get_conversations_ordered()` para que priorice mostrar el nombre real del cliente (`nombre`) sobre el nombre de WhatsApp (`nombre_whatsapp`).

---

## 📋 Pasos:

### **1. Abrir Supabase SQL Editor**
1. Ve a: https://supabase.com/dashboard/project/zbylezfyagwrxoecioup
2. Click en **"SQL Editor"** en el menú lateral

### **2. Ejecutar el Script SQL**
1. Copia TODO el contenido del archivo: `scripts/sql/update_get_conversations_ordered_nombre_priority.sql`
2. Pega en el editor SQL de Supabase
3. Click en **"Run"** (o presiona Ctrl+Enter / Cmd+Enter)

### **3. Verificar la Actualización**
Deberías ver un mensaje como:
```
Success. No rows returned.
DROP FUNCTION
CREATE FUNCTION
GRANT
GRANT
```

---

## ✅ **¿Qué hace este cambio?**

### **ANTES:**
```sql
nombre_contacto = nombre_whatsapp OR whatsapp
```
- Siempre mostraba el nombre de WhatsApp primero
- Si el cliente decía su nombre real, no se actualizaba en la lista

### **DESPUÉS:**
```sql
nombre_contacto = nombre > nombre_whatsapp > whatsapp
```
- **1ra Prioridad:** Campo `nombre` (nombre real del cliente)
- **2da Prioridad:** Campo `nombre_whatsapp` (nombre de WhatsApp)
- **3ra Prioridad:** Campo `whatsapp` (número de teléfono)

---

## 🔄 **¿Cómo se Actualiza en Tiempo Real?**

### **Cambios en Frontend (ya implementados):**
1. **Suscripción a tabla `prospectos`:**
   - Detecta cuando se actualiza `nombre` o `nombre_whatsapp`
   - Actualiza automáticamente la lista de conversaciones
   - Sin necesidad de recargar la página

2. **Lógica de Priorización:**
```typescript
const newName = prospecto.nombre?.trim() || 
                prospecto.nombre_whatsapp?.trim() || 
                prospecto.whatsapp;
```

---

## 🧪 **Cómo Probar:**

### **Escenario 1: Cliente dice su nombre en la conversación**
1. Cliente WhatsApp: `"Hola, mi nombre es Juan Pérez"`
2. n8n/webhook actualiza `prospectos.nombre = 'Juan Pérez'`
3. **✅ Resultado:** Lista de conversaciones se actualiza automáticamente mostrando "Juan Pérez"

### **Escenario 2: Cliente solo tiene nombre de WhatsApp**
1. Cliente WhatsApp sin nombre real
2. `prospectos.nombre = NULL`
3. `prospectos.nombre_whatsapp = 'Juanito'`
4. **✅ Resultado:** Lista muestra "Juanito"

### **Escenario 3: Cliente nuevo sin nombre**
1. Cliente WhatsApp nuevo
2. `prospectos.nombre = NULL`
3. `prospectos.nombre_whatsapp = NULL`
4. **✅ Resultado:** Lista muestra el número de teléfono "+5213331234567"

---

## ⚠️ **Notas Importantes:**

1. **SECURITY DEFINER:**
   - La función RPC bypasea RLS (Row Level Security)
   - Permite acceso de lectura para usuarios autenticados y anónimos

2. **Performance:**
   - La función usa `INNER JOIN` eficiente
   - Ordenamiento por `fecha_ultimo_mensaje DESC`
   - No impacta negativamente el rendimiento

3. **Compatibilidad:**
   - No rompe funcionalidad existente
   - Mismo formato de salida
   - Solo cambia la prioridad del nombre mostrado

---

## 🐛 **Troubleshooting:**

### **Error: "function already exists"**
- **Causa:** El `DROP FUNCTION` no funcionó
- **Solución:** Ejecuta primero solo:
  ```sql
  DROP FUNCTION IF EXISTS get_conversations_ordered();
  ```
- Luego ejecuta el resto del script

### **Error: "permission denied"**
- **Causa:** Usuario sin permisos de admin
- **Solución:** Asegúrate de estar usando el usuario `postgres` en Supabase

### **Los nombres no se actualizan**
- **Causa:** Realtime no está conectado
- **Solución:** 
  1. Recarga la página
  2. Verifica en consola: `🔌 [REALTIME V3] Canal creado y suscrito`
  3. Verifica que hay el mensaje: `🔔 SUSCRIPCIÓN 2: Cambios en tabla PROSPECTOS`

---

## ✅ **Confirmar que Funciona:**

1. Ejecuta el SQL en Supabase
2. Recarga la plataforma (Ctrl+F5 / Cmd+Shift+R)
3. Abre Live Chat
4. **Verifica en consola:**
   ```
   ✅ Conversaciones cargadas desde RPC: X
   🔔 SUSCRIPCIÓN 2: Cambios en tabla PROSPECTOS
   ```
5. Actualiza manualmente un `nombre` en tabla `prospectos`
6. **✅ Confirma:** La lista se actualiza sin recargar

---

**¿Listo para ejecutar?** 🚀

