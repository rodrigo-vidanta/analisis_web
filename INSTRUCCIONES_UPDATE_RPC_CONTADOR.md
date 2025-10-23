# 🔧 INSTRUCCIÓN CRÍTICA: Actualizar RPC para Contador de Mensajes No Leídos

## 📋 PROBLEMA IDENTIFICADO

El contador de mensajes no leídos se enciende en todas las conversaciones al recargar la página porque el RPC `get_conversations_ordered` está contando **TODOS** los mensajes como no leídos, sin filtrar por rol.

## ✅ SOLUCIÓN

La función RPC debe contar **SOLO** los mensajes del **Prospecto** (cliente) que no han sido leídos.

---

## 🚀 PASOS PARA EJECUTAR

### 1. Abre el SQL Editor de Supabase
```
https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new
```

### 2. Copia y pega el siguiente script SQL:

```sql
-- ============================================
-- ACTUALIZACIÓN CRÍTICA: get_conversations_ordered
-- Fecha: 2025-10-23
-- Motivo: Corregir contador de mensajes no leídos
-- ============================================

-- Primero eliminar la función existente
DROP FUNCTION IF EXISTS get_conversations_ordered();

-- Ahora crear la función corregida
CREATE OR REPLACE FUNCTION get_conversations_ordered()
RETURNS TABLE (
  prospecto_id UUID,
  nombre_contacto TEXT,
  numero_telefono TEXT,
  estado_prospecto TEXT,
  id_uchat TEXT,
  ultimo_mensaje TEXT,
  fecha_ultimo_mensaje TIMESTAMPTZ,
  mensajes_totales BIGINT,
  mensajes_no_leidos BIGINT,
  fecha_creacion_prospecto TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS prospecto_id,
    p.nombre_completo AS nombre_contacto,
    p.whatsapp AS numero_telefono,
    p.etapa AS estado_prospecto,
    p.id_uchat AS id_uchat,
    MAX(m.mensaje) AS ultimo_mensaje,
    MAX(m.fecha_hora) AS fecha_ultimo_mensaje,
    COUNT(m.id) AS mensajes_totales,
    -- ✅ CORREGIDO: Solo contar mensajes NO leídos del PROSPECTO (rol = 'Prospecto')
    COUNT(m.id) FILTER (
      WHERE (m.leido IS FALSE OR m.leido IS NULL) 
      AND m.rol = 'Prospecto'
    ) AS mensajes_no_leidos,
    p.created_at AS fecha_creacion_prospecto
  FROM prospectos p
  LEFT JOIN mensajes_whatsapp m ON m.prospecto_id = p.id
  WHERE p.whatsapp IS NOT NULL  -- Solo prospectos con WhatsApp
  GROUP BY p.id, p.nombre_completo, p.whatsapp, p.etapa, p.id_uchat, p.created_at
  ORDER BY fecha_ultimo_mensaje DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;
```

### 3. Haz clic en "Run" o presiona `Ctrl + Enter`

### 4. Deberías ver el mensaje:
```
✅ Success. No rows returned
```

---

## 🧪 VERIFICACIÓN

Ejecuta esta query para verificar que funciona correctamente:

```sql
SELECT 
  prospecto_id,
  nombre_contacto,
  mensajes_totales,
  mensajes_no_leidos
FROM get_conversations_ordered() 
LIMIT 5;
```

**Resultado esperado:**
- Los contadores de `mensajes_no_leidos` deben ser **solo de mensajes del Prospecto**.
- Los mensajes de `AI` y `Vendedor` **NO** deben contar como no leídos.

---

## 📊 LÓGICA DEL CONTADOR

### ✅ SE CUENTA COMO NO LEÍDO:
- Mensaje con `rol = 'Prospecto'`
- Y `leido IS FALSE` o `leido IS NULL`

### ❌ NO SE CUENTA COMO NO LEÍDO:
- Mensajes con `rol = 'AI'` (bot)
- Mensajes con `rol = 'Vendedor'` (agente humano)
- Mensajes con `leido = true`

---

## 🎯 IMPACTO ESPERADO

Después de ejecutar este script:

1. ✅ Al recargar Live Chat, los contadores serán **correctos**
2. ✅ Solo mostrarán mensajes del cliente pendientes de leer
3. ✅ Al abrir una conversación, el contador se pondrá en 0
4. ✅ Los mensajes del bot/vendedor nunca incrementarán el contador

---

## ⚠️ IMPORTANTE

Este script es **SEGURO** de ejecutar porque:
- Solo modifica la función RPC
- No altera datos en las tablas
- No afecta mensajes existentes
- Es reversible

---

## 📝 NOTAS TÉCNICAS

**Columna `rol` en `mensajes_whatsapp`:**
- `'Prospecto'` = Mensaje del cliente
- `'AI'` = Mensaje del bot
- `'Vendedor'` = Mensaje del agente humano

**Columna `leido` en `mensajes_whatsapp`:**
- `true` = Ya fue leído
- `false` o `null` = Pendiente de leer

---

🚀 **Una vez ejecutado, recarga Live Chat y el problema estará resuelto.**

