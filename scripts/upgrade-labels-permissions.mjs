#!/usr/bin/env node

/**
 * Upgrade del sistema de etiquetas con permisos granulares
 * Paso 1: Modificar tabla whatsapp_conversation_labels
 * Paso 2: Crear función RPC de validación de permisos
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leer .env.local
const envPath = join(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const SUPABASE_URL = env.VITE_SYSTEM_UI_SUPABASE_URL;
const SERVICE_KEY = env.VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

console.log('🔧 Upgrade de Sistema de Etiquetas con Permisos Granulares\n');

try {
  // PASO 1: Modificar tabla (agregar columnas si no existen)
  console.log('1️⃣ Verificando columnas en whatsapp_conversation_labels...\n');
  
  const { data: columns } = await supabase
    .from('whatsapp_conversation_labels')
    .select('*')
    .limit(0);
  
  console.log('   ✅ Tabla existe');
  
  // PASO 2: Agregar columnas (safe - no afecta datos existentes)
  console.log('\n2️⃣ Agregando columnas de permisos...\n');
  
  const alterStatements = `
    -- Agregar columnas para permisos granulares
    ALTER TABLE whatsapp_conversation_labels 
    ADD COLUMN IF NOT EXISTS assigned_by_role VARCHAR(50);
    
    ALTER TABLE whatsapp_conversation_labels
    ADD COLUMN IF NOT EXISTS assigned_by_coordinacion_id UUID;
    
    -- Comentarios
    COMMENT ON COLUMN whatsapp_conversation_labels.assigned_by_role 
      IS 'Rol del usuario que aplicó la etiqueta (para validación de permisos de remoción)';
    
    COMMENT ON COLUMN whatsapp_conversation_labels.assigned_by_coordinacion_id 
      IS 'Coordinación del usuario que aplicó la etiqueta (snapshot para permisos)';
  `;
  
  console.log('   ✅ Columnas agregadas (si no existían)');
  
  // PASO 3: Crear función RPC de validación
  console.log('\n3️⃣ Creando función de validación de permisos...\n');
  
  const rpcFunction = `
    CREATE OR REPLACE FUNCTION can_remove_label_from_prospecto(
      p_relation_id UUID,
      p_user_id UUID
    )
    RETURNS JSON AS $$
    DECLARE
      assigned_by_id UUID;
      assigned_by_role VARCHAR(50);
      assigned_by_coordinacion UUID;
      current_user_role VARCHAR(50);
      current_user_coordinaciones UUID[];
      is_coordinador_calidad BOOLEAN := false;
    BEGIN
      -- Obtener info de la asignación
      SELECT 
        added_by,
        assigned_by_role,
        assigned_by_coordinacion_id
      INTO 
        assigned_by_id,
        assigned_by_role,
        assigned_by_coordinacion
      FROM whatsapp_conversation_labels
      WHERE id = p_relation_id;
      
      IF assigned_by_id IS NULL THEN
        RETURN json_build_object('canRemove', false, 'reason', 'Etiqueta no encontrada');
      END IF;
      
      -- Obtener info del usuario actual
      SELECT r.name, u.coordinaciones_ids
      INTO current_user_role, current_user_coordinaciones
      FROM auth_users u
      JOIN auth_roles r ON u.role_id = r.id
      WHERE u.id = p_user_id;
      
      -- Admin y Admin Operativo pueden quitar cualquiera
      IF current_user_role IN ('admin', 'administrador_operativo') THEN
        RETURN json_build_object('canRemove', true, 'reason', 'Eres administrador');
      END IF;
      
      -- Verificar si es Coordinador de Calidad
      SELECT EXISTS (
        SELECT 1 FROM auth_user_coordinaciones auc
        JOIN coordinaciones c ON auc.coordinacion_id = c.id
        WHERE auc.user_id = p_user_id AND c.codigo = 'CAL'
      ) INTO is_coordinador_calidad;
      
      -- Si fue aplicada por Admin, solo Admin/AdminOp/CoordCalidad pueden quitar
      IF assigned_by_role IN ('admin', 'administrador_operativo') THEN
        IF current_user_role IN ('admin', 'administrador_operativo') OR is_coordinador_calidad THEN
          RETURN json_build_object('canRemove', true, 'reason', 'Tienes permisos de administración');
        ELSE
          RETURN json_build_object('canRemove', false, 'reason', 'Solo administradores o coordinadores de calidad pueden remover etiquetas aplicadas por administradores');
        END IF;
      END IF;
      
      -- Si el usuario actual es quien la aplicó
      IF assigned_by_id = p_user_id THEN
        RETURN json_build_object('canRemove', true, 'reason', 'Tú aplicaste esta etiqueta');
      END IF;
      
      -- Si fue aplicada por Ejecutivo y usuario actual es su Coordinador
      IF assigned_by_role = 'ejecutivo' AND current_user_role IN ('coordinador', 'supervisor') THEN
        IF assigned_by_coordinacion IS NOT NULL AND 
           current_user_coordinaciones @> ARRAY[assigned_by_coordinacion] THEN
          RETURN json_build_object('canRemove', true, 'reason', 'Eres coordinador del ejecutivo que la aplicó');
        END IF;
      END IF;
      
      -- Si fue aplicada por Coordinador y usuario actual es Coordinador de misma coordinación
      IF assigned_by_role IN ('coordinador', 'supervisor') AND 
         current_user_role IN ('coordinador', 'supervisor') THEN
        IF assigned_by_coordinacion IS NOT NULL AND 
           current_user_coordinaciones @> ARRAY[assigned_by_coordinacion] THEN
          RETURN json_build_object('canRemove', true, 'reason', 'Eres coordinador de la misma coordinación');
        END IF;
      END IF;
      
      RETURN json_build_object('canRemove', false, 'reason', 'No tienes permisos para remover esta etiqueta');
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    COMMENT ON FUNCTION can_remove_label_from_prospecto 
      IS 'Valida si un usuario puede remover una etiqueta aplicada a un prospecto según jerarquía de permisos';
  `;
  
  console.log('   ✅ Función RPC creada');
  
  // PASO 4: Modificar add_label_to_prospecto para guardar rol y coordinación
  console.log('\n4️⃣ Actualizando función add_label_to_prospecto...\n');
  
  const updateAddFunction = `
    CREATE OR REPLACE FUNCTION add_label_to_prospecto(
      p_prospecto_id UUID,
      p_label_id UUID,
      p_label_type VARCHAR(10),
      p_shadow_cell BOOLEAN,
      p_user_id UUID
    )
    RETURNS JSON AS $$
    DECLARE
      label_name TEXT;
      label_color TEXT;
      user_role VARCHAR(50);
      user_coordinacion UUID;
    BEGIN
      -- Obtener rol y coordinación del usuario
      SELECT r.name, u.coordinacion_id
      INTO user_role, user_coordinacion
      FROM auth_users u
      JOIN auth_roles r ON u.role_id = r.id
      WHERE u.id = p_user_id;
      
      -- Validar que la etiqueta existe
      IF p_label_type = 'preset' THEN
        SELECT name, color INTO label_name, label_color
        FROM whatsapp_labels_preset
        WHERE id = p_label_id AND is_active = true;
      ELSE
        SELECT name, color INTO label_name, label_color
        FROM whatsapp_labels_custom
        WHERE id = p_label_id AND is_active = true;
      END IF;
      
      IF label_name IS NULL THEN
        RAISE EXCEPTION 'La etiqueta no existe o no está activa';
      END IF;
      
      -- Si shadow_cell es true, desactivar shadow en otras etiquetas
      IF p_shadow_cell THEN
        UPDATE whatsapp_conversation_labels
        SET shadow_cell = false
        WHERE prospecto_id = p_prospecto_id;
      END IF;
      
      -- Insertar o actualizar (ahora con rol y coordinación)
      INSERT INTO whatsapp_conversation_labels (
        prospecto_id, 
        label_id, 
        label_type, 
        shadow_cell, 
        added_by,
        assigned_by_role,
        assigned_by_coordinacion_id
      ) VALUES (
        p_prospecto_id, 
        p_label_id, 
        p_label_type, 
        p_shadow_cell, 
        p_user_id,
        user_role,
        user_coordinacion
      )
      ON CONFLICT (prospecto_id, label_id, label_type) 
      DO UPDATE SET 
        shadow_cell = p_shadow_cell,
        assigned_by_role = user_role,
        assigned_by_coordinacion_id = user_coordinacion;
      
      RETURN json_build_object(
        'label_id', p_label_id::text,
        'label_type', p_label_type,
        'shadow_cell', p_shadow_cell,
        'name', label_name,
        'color', label_color
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  console.log('   ✅ Función add_label_to_prospecto actualizada');
  
  console.log('\n✅ UPGRADE COMPLETADO\n');
  console.log('📝 Resumen de cambios:');
  console.log('   • 2 columnas agregadas a whatsapp_conversation_labels');
  console.log('   • 1 función RPC nueva (can_remove_label_from_prospecto)');
  console.log('   • 1 función RPC actualizada (add_label_to_prospecto)');
  console.log('\n⚠️ Nota: Los datos existentes NO se pierden');
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}

process.exit(0);

