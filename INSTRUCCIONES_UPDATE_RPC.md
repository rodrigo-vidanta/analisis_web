# ============================================
# INSTRUCCIONES: Actualizar RPC get_conversations_ordered
# ============================================

## 📋 **PROBLEMA**
La función `get_conversations_ordered()` no está devolviendo el campo `id_uchat`, 
lo cual es **crítico** para enviar mensajes desde Live Chat.

## ✅ **SOLUCIÓN**

### Paso 1: Abrir Supabase Dashboard
1. Ve a: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd
2. Inicia sesión
3. Ve a: **SQL Editor** (icono de base de datos en el menú lateral)

### Paso 2: Ejecutar este SQL

Copia y pega el siguiente código en el editor SQL y haz clic en "Run":

```sql
CREATE OR REPLACE FUNCTION get_conversations_ordered()
RETURNS TABLE (
  prospecto_id UUID,
  nombre_contacto TEXT,
  numero_telefono TEXT,
  estado_prospecto TEXT,
  id_uchat TEXT,  -- ✅ AGREGADO: Necesario para enviar mensajes
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
    p.id_uchat AS id_uchat,  -- ✅ AGREGADO
    MAX(m.mensaje) AS ultimo_mensaje,
    MAX(m.fecha_hora) AS fecha_ultimo_mensaje,
    COUNT(m.id) AS mensajes_totales,
    COUNT(m.id) FILTER (WHERE m.leido IS FALSE OR m.leido IS NULL) AS mensajes_no_leidos,
    p.created_at AS fecha_creacion_prospecto
  FROM prospectos p
  LEFT JOIN mensajes_whatsapp m ON m.prospecto_id = p.id
  WHERE p.whatsapp IS NOT NULL  -- Solo prospectos con WhatsApp
  GROUP BY p.id, p.nombre_completo, p.whatsapp, p.etapa, p.id_uchat, p.created_at
  ORDER BY fecha_ultimo_mensaje DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;
```

### Paso 3: Verificar

Después de ejecutar el SQL, ejecuta esta query para verificar:

```sql
SELECT * FROM get_conversations_ordered() LIMIT 3;
```

Deberías ver el campo `id_uchat` en los resultados.

### Paso 4: Recargar Live Chat

Una vez ejecutado, recarga la página de Live Chat y prueba enviar un mensaje.

## 🎯 **RESULTADO ESPERADO**
- ✅ El campo `id_uchat` aparecerá en la metadata de cada conversación
- ✅ Podrás enviar mensajes desde Live Chat
- ✅ Los mensajes llegarán a WhatsApp vía UChat

