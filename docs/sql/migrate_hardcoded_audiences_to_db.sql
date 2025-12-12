-- ============================================
-- MIGRACIÓN: Audiencias Hardcodeadas a Base de Datos
-- ============================================
-- Este script reasigna las plantillas que tienen audiencias hardcodeadas
-- (etapa-0, etapa-1, etapa-2, etapa-3, etapa-4) a las nuevas audiencias en BD
-- ============================================

-- Mapeo de IDs hardcodeados a nuevos IDs de BD
-- etapa-0 → Interesado (6b89d37b-3319-499b-bbf4-b44e33c7b038)
-- etapa-1 → Atendió llamada (88648315-6903-493c-85de-19844face527)
-- etapa-2 → En seguimiento (6af3fb99-7f27-48e9-80d5-83d04c15655b)
-- etapa-3 → Nuevo (1059c0d0-364f-47a4-b9f2-097c1d4d9d33)
-- etapa-4 → Activo PQNC (85ebd1aa-528c-47b4-a1bd-32f9ed7e8b34)

-- Función para actualizar las plantillas
DO $$
DECLARE
  template_record RECORD;
  updated_mappings JSONB;
  audience_ids_array JSONB;
  has_changes BOOLEAN;
BEGIN
  -- Iterar sobre todas las plantillas
  FOR template_record IN 
    SELECT id, name, variable_mappings 
    FROM whatsapp_templates
    WHERE variable_mappings IS NOT NULL
  LOOP
    has_changes := false;
    updated_mappings := template_record.variable_mappings;
    
    -- Si variable_mappings es un objeto con audience_ids
    IF jsonb_typeof(updated_mappings) = 'object' AND updated_mappings ? 'audience_ids' THEN
      audience_ids_array := updated_mappings->'audience_ids';
      
      -- Reemplazar IDs hardcodeados
      IF audience_ids_array ? '0' OR audience_ids_array::text LIKE '%etapa-0%' THEN
        audience_ids_array := jsonb_set(
          jsonb_set(
            audience_ids_array,
            '{0}',
            '"6b89d37b-3319-499b-bbf4-b44e33c7b038"'
          ),
          '{etapa-0}',
          'null',
          true
        );
        has_changes := true;
      END IF;
      
      -- Reemplazar etapa-0 directamente si existe como string
      IF audience_ids_array::text LIKE '%"etapa-0"%' THEN
        audience_ids_array := jsonb_set(
          audience_ids_array,
          '{}',
          (SELECT jsonb_agg(
            CASE 
              WHEN value::text = '"etapa-0"' THEN '"6b89d37b-3319-499b-bbf4-b44e33c7b038"'
              ELSE value
            END
          ) FROM jsonb_array_elements(audience_ids_array))
        );
        has_changes := true;
      END IF;
      
      -- Reemplazar etapa-1
      IF audience_ids_array::text LIKE '%"etapa-1"%' THEN
        audience_ids_array := jsonb_set(
          audience_ids_array,
          '{}',
          (SELECT jsonb_agg(
            CASE 
              WHEN value::text = '"etapa-1"' THEN '"88648315-6903-493c-85de-19844face527"'
              ELSE value
            END
          ) FROM jsonb_array_elements(audience_ids_array))
        );
        has_changes := true;
      END IF;
      
      -- Reemplazar etapa-2
      IF audience_ids_array::text LIKE '%"etapa-2"%' THEN
        audience_ids_array := jsonb_set(
          audience_ids_array,
          '{}',
          (SELECT jsonb_agg(
            CASE 
              WHEN value::text = '"etapa-2"' THEN '"6af3fb99-7f27-48e9-80d5-83d04c15655b"'
              ELSE value
            END
          ) FROM jsonb_array_elements(audience_ids_array))
        );
        has_changes := true;
      END IF;
      
      -- Reemplazar etapa-3
      IF audience_ids_array::text LIKE '%"etapa-3"%' THEN
        audience_ids_array := jsonb_set(
          audience_ids_array,
          '{}',
          (SELECT jsonb_agg(
            CASE 
              WHEN value::text = '"etapa-3"' THEN '"1059c0d0-364f-47a4-b9f2-097c1d4d9d33"'
              ELSE value
            END
          ) FROM jsonb_array_elements(audience_ids_array))
        );
        has_changes := true;
      END IF;
      
      -- Reemplazar etapa-4
      IF audience_ids_array::text LIKE '%"etapa-4"%' THEN
        audience_ids_array := jsonb_set(
          audience_ids_array,
          '{}',
          (SELECT jsonb_agg(
            CASE 
              WHEN value::text = '"etapa-4"' THEN '"85ebd1aa-528c-47b4-a1bd-32f9ed7e8b34"'
              ELSE value
            END
          ) FROM jsonb_array_elements(audience_ids_array))
        );
        has_changes := true;
      END IF;
      
      -- Actualizar si hubo cambios
      IF has_changes THEN
        updated_mappings := jsonb_set(updated_mappings, '{audience_ids}', audience_ids_array);
        
        UPDATE whatsapp_templates
        SET variable_mappings = updated_mappings,
            updated_at = NOW()
        WHERE id = template_record.id;
        
        RAISE NOTICE 'Actualizada plantilla: % (ID: %)', template_record.name, template_record.id;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Verificar resultados (debería devolver 0 filas si la migración fue exitosa)
SELECT 
  id,
  name,
  variable_mappings->'audience_ids' as audience_ids
FROM whatsapp_templates
WHERE variable_mappings IS NOT NULL
  AND (
    (variable_mappings->'audience_ids')::text LIKE '%etapa-%'
    OR variable_mappings::text LIKE '%etapa-%'
  );

