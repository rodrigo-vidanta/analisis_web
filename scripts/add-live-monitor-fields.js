// ============================================
// AGREGAR CAMPOS PARA LIVE MONITOR A TABLA PROSPECTOS
// ============================================

import { createClient } from '@supabase/supabase-js';

const analysisSupabaseUrl = 'https://glsmifhkoaifvaegsozd.supabase.co';
const analysisSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E';

const supabase = createClient(analysisSupabaseUrl, analysisSupabaseKey);

console.log('🔧 Agregando campos para Live Monitor...');

async function addLiveMonitorFields() {
  try {
    // AGREGAR CAMPOS PARA SISTEMA DE TRANSFERENCIA Y FEEDBACK
    console.log('\n📊 Agregando campos para Live Monitor...');
    
    const alterTableSQL = `
      -- Campos para sistema de transferencia
      ALTER TABLE prospectos 
      ADD COLUMN IF NOT EXISTS status_transferencia VARCHAR(20) DEFAULT 'pendiente',
      ADD COLUMN IF NOT EXISTS agente_asignado VARCHAR(100),
      ADD COLUMN IF NOT EXISTS fecha_transferencia TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS checkpoint_transferencia VARCHAR(50),
      ADD COLUMN IF NOT EXISTS temperatura_prospecto VARCHAR(20) DEFAULT 'tibio',
      
      -- Campos para feedback de agente humano
      ADD COLUMN IF NOT EXISTS feedback_agente TEXT,
      ADD COLUMN IF NOT EXISTS resultado_transferencia VARCHAR(30),
      ADD COLUMN IF NOT EXISTS comentarios_ia TEXT,
      ADD COLUMN IF NOT EXISTS duracion_llamada_ia INTEGER,
      ADD COLUMN IF NOT EXISTS prioridad_seguimiento VARCHAR(20) DEFAULT 'media',
      
      -- Campos adicionales de control
      ADD COLUMN IF NOT EXISTS fecha_feedback TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS agente_feedback_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS llamada_activa BOOLEAN DEFAULT FALSE;
    `;

    // Ejecutar ALTER TABLE usando RPC
    try {
      await supabase.rpc('exec_sql', { query: alterTableSQL });
      console.log('✅ Campos agregados exitosamente');
    } catch (err) {
      console.log('⚠️ Algunos campos pueden ya existir:', err.message);
    }

    // CREAR TABLA PARA COLA DE AGENTES
    console.log('\n👥 Creando tabla de cola de agentes...');
    
    const createAgentQueueSQL = `
      CREATE TABLE IF NOT EXISTS agent_queue (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        agent_name VARCHAR(100) NOT NULL,
        agent_email VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        total_calls_handled INTEGER DEFAULT 0,
        last_call_time TIMESTAMP WITH TIME ZONE,
        current_position INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    try {
      await supabase.rpc('exec_sql', { query: createAgentQueueSQL });
      console.log('✅ Tabla agent_queue creada');
    } catch (err) {
      console.log('⚠️ Tabla agent_queue puede ya existir:', err.message);
    }

    // INSERTAR AGENTES DE PRUEBA
    console.log('\n👤 Insertando agentes de prueba...');
    
    const agentesDemo = [
      { agent_name: 'Carlos Mendoza', agent_email: 'carlos.mendoza@grupovidanta.com' },
      { agent_name: 'Ana Gutiérrez', agent_email: 'ana.gutierrez@grupovidanta.com' },
      { agent_name: 'Roberto Silva', agent_email: 'roberto.silva@grupovidanta.com' },
      { agent_name: 'María López', agent_email: 'maria.lopez@grupovidanta.com' },
      { agent_name: 'Diego Ramírez', agent_email: 'diego.ramirez@grupovidanta.com' }
    ];

    const { error: insertError } = await supabase
      .from('agent_queue')
      .upsert(agentesDemo, { onConflict: 'agent_email' });

    if (insertError) {
      console.error('❌ Error insertando agentes:', insertError);
    } else {
      console.log('✅ Agentes demo insertados');
    }

    // VERIFICAR CAMPOS AGREGADOS
    console.log('\n🔍 Verificando estructura actualizada...');
    
    const { data: updatedSample, error: verifyError } = await supabase
      .from('prospectos')
      .select('id, etapa, status_transferencia, agente_asignado, temperatura_prospecto')
      .limit(3);

    if (verifyError) {
      console.error('❌ Error verificando:', verifyError);
    } else {
      console.log('✅ Estructura actualizada:');
      console.table(updatedSample);
    }

    // VER AGENTES EN COLA
    const { data: agents, error: agentsError } = await supabase
      .from('agent_queue')
      .select('*')
      .eq('is_active', true)
      .order('current_position', { ascending: true });

    if (agentsError) {
      console.error('❌ Error obteniendo agentes:', agentsError);
    } else {
      console.log('👥 Agentes en cola:');
      console.table(agents);
    }

    return true;

  } catch (error) {
    console.error('💥 Error agregando campos:', error);
    return false;
  }
}

// Ejecutar
addLiveMonitorFields()
  .then(success => {
    if (success) {
      console.log('\n🎉 ¡CAMPOS PARA LIVE MONITOR AGREGADOS!');
      console.log('\n📋 ESTRUCTURA LISTA PARA:');
      console.log('✅ Sistema de transferencia de llamadas');
      console.log('✅ Cola de agentes con sorteo');
      console.log('✅ Feedback de agentes humanos');
      console.log('✅ Tracking de checkpoints');
      console.log('✅ Gestión de temperatura de prospectos');
      console.log('\n🚀 Ahora se puede crear la interfaz Live Monitor');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
