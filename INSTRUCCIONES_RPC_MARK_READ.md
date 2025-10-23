# 🔧 SOLUCIÓN FINAL: RPC para Marcar Mensajes como Leídos

## 🚨 PROBLEMA IDENTIFICADO

**Row Level Security (RLS)** está bloqueando el UPDATE de la columna `leido` cuando se usa el `anon` key del frontend.

### Evidencia:
```
🔑 [MARK READ DEBUG] IDs a actualizar: (4 mensajes)
✅ [MARK READ] 0 mensajes del PROSPECTO marcados como leídos en BD  ❌
```

- Con `service_role` key: ✅ 4 mensajes actualizados
- Con `anon` key (frontend): ❌ 0 mensajes actualizados

---

## ✅ SOLUCIÓN

Crear una **función RPC con `SECURITY DEFINER`** que bypasea RLS solo para esta operación específica.

---

## 🚀 INSTRUCCIONES DE EJECUCIÓN

### 1. Abre el SQL Editor de Supabase
```
https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new
```

### 2. Copia y pega el siguiente script:

```sql
-- ============================================
-- RPC: mark_messages_as_read
-- Fecha: 2025-10-23
-- Motivo: Marcar mensajes del Prospecto como leídos (bypass RLS)
-- ============================================

CREATE OR REPLACE FUNCTION mark_messages_as_read(
  p_prospecto_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_message_ids UUID[];
  v_updated_count INTEGER;
BEGIN
  -- 1. Obtener IDs de mensajes del Prospecto que NO están leídos
  SELECT ARRAY_AGG(id)
  INTO v_message_ids
  FROM mensajes_whatsapp
  WHERE prospecto_id = p_prospecto_id
    AND rol = 'Prospecto'
    AND (leido IS NULL OR leido = FALSE);
  
  -- 2. Si no hay mensajes por marcar, retornar 0
  IF v_message_ids IS NULL OR ARRAY_LENGTH(v_message_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'messages_marked', 0,
      'message_ids', '[]'::jsonb
    );
  END IF;
  
  -- 3. Actualizar los mensajes
  UPDATE mensajes_whatsapp
  SET leido = TRUE
  WHERE id = ANY(v_message_ids);
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- 4. Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'messages_marked', v_updated_count,
    'message_ids', to_jsonb(v_message_ids)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'messages_marked', 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTARIO
-- ============================================
COMMENT ON FUNCTION mark_messages_as_read IS 
'Marca mensajes del Prospecto como leídos. 
SECURITY DEFINER permite bypass de RLS para esta operación específica.';
```

### 3. Ejecuta el script (`Ctrl + Enter`)

Deberías ver:
```
✅ Success. No rows returned
```

---

## 🧪 VERIFICACIÓN

Ejecuta esta query para probar la función:

```sql
SELECT * FROM mark_messages_as_read('06d27f92-2d7e-4093-b103-7b169b9484e8');
```

**Resultado esperado:**
```json
{
  "success": true,
  "messages_marked": 4,
  "message_ids": ["...", "...", "...", "..."]
}
```

---

## 📝 CAMBIOS EN EL CÓDIGO

El frontend ahora usa este RPC en lugar de UPDATE directo:

**ANTES (bloqueado por RLS):**
```typescript
await analysisSupabase
  .from('mensajes_whatsapp')
  .update({ leido: true })
  .in('id', messageIds);  // ❌ RLS bloquea esto
```

**AHORA (bypass RLS con SECURITY DEFINER):**
```typescript
await analysisSupabase
  .rpc('mark_messages_as_read', { 
    p_prospecto_id: prospectoId 
  });  // ✅ Funciona
```

---

## 🎯 RESULTADO FINAL

Después de ejecutar el script:

1. **Recarga Live Chat** con `F5`
2. **Abre "maximo decimo meridio"**
3. **Observa los logs:**
   ```
   🔄 [MARK READ] Marcando conversación...
   ✅ [MARK READ] 4 mensajes del PROSPECTO marcados como leídos en BD
   ```
4. **Recarga la página**
5. **Verifica:**
   - ✅ El contador debe estar en **0**
   - ✅ Al recargar, debe mantenerse en **0**

---

## 🔒 SEGURIDAD

- **`SECURITY DEFINER`**: La función se ejecuta con los privilegios del creador (owner de la BD), bypasseando RLS
- **Scope limitado**: Solo marca como leídos los mensajes del **Prospecto** (rol = 'Prospecto')
- **Parámetro validado**: Solo acepta un `prospecto_id` UUID
- **Error handling**: Retorna error si algo falla

---

🚀 **¡Ejecuta el script y prueba!**

