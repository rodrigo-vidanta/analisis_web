import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hmmfuhqgvsehkizlfzga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWZ1aHFndnNlaGtpemxmemdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTUxMzU4NywiZXhwIjoyMDYxMDg5NTg3fQ.mTnTOpkXi19xu1l-cZKx_f5RbqSg6zzH8mGdBOY3MZg'
);

async function debugSoundEffects() {
  try {
    console.log('🔍 Debuggeando ai_sound_effects...');
    
    // 1. Verificar si podemos hacer SELECT básico
    console.log('\n📋 TEST SELECT BÁSICO:');
    const { data: basicSelect, error: basicError } = await supabase
      .from('ai_sound_effects')
      .select('*')
      .limit(5);
    
    if (basicError) {
      console.error('❌ Error en SELECT básico:', basicError);
    } else {
      console.log('✅ SELECT básico funciona. Registros:', basicSelect?.length || 0);
    }
    
    // 2. Probar INSERT simple
    console.log('\n💾 TEST INSERT:');
    const testRecord = {
      user_id: 'e8ced62c-3fd0-4328-b61a-a59ebea2e877',
      prompt_text: 'test sound effect',
      duration_seconds: 5,
      prompt_influence: 0.3,
      cost_credits: 10,
      status: 'completed'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('ai_sound_effects')
      .insert([testRecord])
      .select('id')
      .single();
    
    if (insertError) {
      console.error('❌ Error en INSERT:', insertError);
      console.log('Código:', insertError.code);
      console.log('Mensaje:', insertError.message);
      console.log('Detalles:', insertError.details);
    } else {
      console.log('✅ INSERT exitoso. ID:', insertData?.id);
      
      // Limpiar el registro de prueba
      await supabase
        .from('ai_sound_effects')
        .delete()
        .eq('id', insertData.id);
      console.log('🧹 Registro de prueba eliminado');
    }
    
    // 3. Verificar constraints y triggers
    console.log('\n🔧 VERIFICANDO CONSTRAINTS:');
    try {
      const { data: constraints } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name, constraint_type')
        .eq('table_name', 'ai_sound_effects');
      
      console.log('📋 Constraints encontrados:', constraints);
    } catch (e) {
      console.log('⚠️ No se pudieron consultar constraints');
    }
    
    // 4. Verificar registros existentes
    console.log('\n📊 REGISTROS EXISTENTES:');
    const { data: allRecords, error: allError } = await supabase
      .from('ai_sound_effects')
      .select('id, user_id, prompt_text, created_at')
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.error('❌ Error consultando registros:', allError);
    } else {
      console.log('📋 Total registros:', allRecords?.length || 0);
      if (allRecords && allRecords.length > 0) {
        console.log('📄 Registros:', allRecords.map(r => ({
          id: r.id.substring(0, 8),
          user_id: r.user_id.substring(0, 8),
          prompt: r.prompt_text?.substring(0, 20) + '...',
          date: r.created_at
        })));
      }
    }
    
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

debugSoundEffects();
