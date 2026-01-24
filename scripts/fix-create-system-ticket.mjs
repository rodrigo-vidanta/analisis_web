#!/usr/bin/env node
/**
 * Script para eliminar funciones duplicadas y crear versión correcta
 * de create_system_ticket con soporte para p_log_id
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Cargar .env.production
config({ path: '.env.production' });

const supabaseUrl = process.env.VITE_ANALYSIS_SUPABASE_URL;
const supabaseKey = process.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Iniciando fix de create_system_ticket...\n');

// Paso 1: Eliminar funciones duplicadas
console.log('📝 Paso 1: Eliminando funciones duplicadas...');

const dropSQL = `
DROP FUNCTION IF EXISTS create_system_ticket(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT);
DROP FUNCTION IF EXISTS create_system_ticket(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT, UUID);
`;

try {
  // Ejecutar DROP vía RPC (si existe una función exec_sql)
  console.log('   Intentando ejecutar DROP...');
  
  // Como no podemos usar exec_sql, lo hacemos manualmente con múltiples llamadas
  console.log('   ⚠️ No se puede ejecutar DROP automáticamente');
  console.log('   📋 Debes ejecutar manualmente en Supabase SQL Editor:\n');
  console.log(dropSQL);
  console.log('\n   Presiona Enter cuando hayas ejecutado el DROP...');
  
  // Esperar input del usuario
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  console.log('✅ DROP ejecutado (manual)\n');
} catch (error) {
  console.error('❌ Error en DROP:', error.message);
}

// Paso 2: Crear función nueva
console.log('📝 Paso 2: Creando función nueva con p_log_id...');

const createSQL = `
CREATE OR REPLACE FUNCTION create_system_ticket(
  p_type TEXT,
  p_title TEXT,
  p_description TEXT,
  p_category TEXT,
  p_subcategory TEXT,
  p_priority TEXT,
  p_form_data JSONB,
  p_assigned_to UUID DEFAULT NULL,
  p_assigned_to_role TEXT DEFAULT NULL,
  p_log_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_system_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_ticket_id UUID;
  v_ticket_number VARCHAR(20);
  v_status TEXT;
  v_result JSONB;
BEGIN
  v_ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  IF p_assigned_to IS NOT NULL OR p_assigned_to_role IS NOT NULL THEN
    v_status := 'en_progreso';
  ELSE
    v_status := 'abierto';
  END IF;
  
  INSERT INTO support_tickets (
    ticket_number, type, title, description, category, subcategory, priority, status,
    reporter_id, reporter_name, reporter_email, reporter_role,
    assigned_to, assigned_to_role, assigned_at, assigned_by, form_data, log_id
  ) VALUES (
    v_ticket_number, p_type, p_title, p_description, p_category, p_subcategory, p_priority, v_status,
    v_system_user_id, 'Sistema Automático', 'system@internal', 'system',
    p_assigned_to, p_assigned_to_role,
    CASE WHEN p_assigned_to IS NOT NULL OR p_assigned_to_role IS NOT NULL THEN NOW() ELSE NULL END,
    v_system_user_id, p_form_data, p_log_id
  )
  RETURNING id INTO v_ticket_id;
  
  SELECT jsonb_build_object(
    'id', t.id, 'ticket_number', t.ticket_number, 'type', t.type,
    'title', t.title, 'description', t.description, 'category', t.category,
    'subcategory', t.subcategory, 'priority', t.priority, 'status', t.status,
    'reporter_id', t.reporter_id, 'reporter_name', t.reporter_name,
    'reporter_email', t.reporter_email, 'reporter_role', t.reporter_role,
    'assigned_to', t.assigned_to, 'assigned_to_role', t.assigned_to_role,
    'assigned_at', t.assigned_at, 'assigned_by', t.assigned_by,
    'form_data', t.form_data, 'log_id', t.log_id,
    'created_at', t.created_at, 'updated_at', t.updated_at
  ) INTO v_result
  FROM support_tickets t
  WHERE t.id = v_ticket_id;
  
  RETURN v_result;
END;
$$;
`;

console.log('   📋 Debes ejecutar manualmente en Supabase SQL Editor:\n');
console.log(createSQL);
console.log('\n   Presiona Enter cuando hayas ejecutado el CREATE...');

await new Promise(resolve => {
  process.stdin.once('data', resolve);
});

console.log('✅ CREATE ejecutado (manual)\n');

// Paso 3: Verificar
console.log('📝 Paso 3: Verificando función...');

const { data: functions, error } = await supabase
  .rpc('create_system_ticket', {
    p_type: 'test_system',
    p_title: 'Test de verificación',
    p_description: 'Verificando función create_system_ticket',
    p_category: 'otros',
    p_subcategory: 'test',
    p_priority: 'baja',
    p_form_data: { test: true },
    p_log_id: '00000000-0000-0000-0000-000000000001'
  });

if (error) {
  console.error('❌ Error al verificar:', error);
  console.log('\n⚠️ La función puede no estar correctamente creada');
} else {
  console.log('✅ Función verificada correctamente');
  console.log('   Ticket de prueba creado:', functions.ticket_number);
  
  // Eliminar ticket de prueba
  const { error: deleteError } = await supabase
    .from('support_tickets')
    .delete()
    .eq('id', functions.id);
    
  if (!deleteError) {
    console.log('   Ticket de prueba eliminado');
  }
}

console.log('\n✅ Fix completado');
