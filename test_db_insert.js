// Script para probar inserción directa en Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hmmfuhqgvsehkizlfzga.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWZ1aHFndnNlaGtpemxmemdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTUxMzU4NywiZXhwIjoyMDYxMDg5NTg3fQ.mTnTOpkXi19xu1l-cZKx_f5RbqSg6zzH8mGdBOY3MZg';

const supabase = createClient(supabaseUrl, serviceKey);

async function testInsert() {
  try {
    console.log('🔍 Obteniendo usuarios...');
    
    // Obtener un user_id real
    const { data: users, error: usersError } = await supabase
      .from('auth_users')
      .select('id, email')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Error obteniendo usuarios:', usersError);
      return;
    }
    
    if (!users || users.length === 0) {
      console.error('❌ No hay usuarios en la BD');
      return;
    }
    
    const realUserId = users[0].id;
    console.log('👤 Usuario encontrado:', users[0].email, 'ID:', realUserId);
    
    // Probar inserción con user_id real
    console.log('🧪 Probando inserción...');
    const testRecord = {
      user_id: realUserId,
      generation_type: 'text_to_speech',
      original_text: 'Prueba de inserción RLS',
      voice_id: 'test_voice',
      voice_name: 'Test Voice',
      model_id: 'eleven_v3',
      voice_settings: { stability: 0.5, similarity_boost: 0.5 },
      character_count: 22,
      status: 'completed'
    };
    
    const { data, error } = await supabase
      .from('ai_audio_generations')
      .insert([testRecord])
      .select('id');
    
    if (error) {
      console.error('❌ Error en inserción:', error);
    } else {
      console.log('✅ Inserción exitosa:', data);
      
      // Limpiar el registro de prueba
      await supabase
        .from('ai_audio_generations')
        .delete()
        .eq('id', data[0].id);
      console.log('🧹 Registro de prueba eliminado');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testInsert();
