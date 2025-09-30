import { createClient } from '@supabase/supabase-js';

// Credenciales PQNC (donde están las tablas de AI)
const supabaseUrl = 'https://hmmfuhqgvsehkizlfzga.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWZ1aHFndnNlaGtpemxmemdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTUxMzU4NywiZXhwIjoyMDYxMDg5NTg3fQ.mTnTOpkXi19xu1l-cZKx_f5RbqSg6zzH8mGdBOY3MZg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  try {
    console.log('🔍 Conectando a la base de datos...');
    
    // 1. Listar todas las tablas que empiecen con 'ai_'
    console.log('\n📋 TABLAS AI EXISTENTES:');
    const { data: tables, error: tablesError } = await supabase
      .rpc('exec_sql', { 
        sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'ai_%' ORDER BY table_name;`
      });
    
    if (tablesError) {
      console.error('❌ Error consultando tablas:', tablesError);
      
      // Método alternativo: intentar consultar tablas directamente
      console.log('\n🔄 Intentando método alternativo...');
      const testTables = ['ai_audio_generations', 'ai_sound_effects', 'ai_user_preferences', 'ai_token_limits'];
      
      for (const tableName of testTables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (error) {
            console.log(`❌ ${tableName}: NO EXISTE (${error.code})`);
          } else {
            console.log(`✅ ${tableName}: EXISTE (${data?.length || 0} registros de muestra)`);
          }
        } catch (e) {
          console.log(`❌ ${tableName}: ERROR (${e.message})`);
        }
      }
    } else {
      console.log('✅ Tablas AI encontradas:', tables);
    }
    
    // 2. Si ai_audio_generations existe, verificar su estructura
    console.log('\n📊 VERIFICANDO ai_audio_generations:');
    try {
      const { data: structure, error: structError } = await supabase
        .rpc('exec_sql', { 
          sql: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'ai_audio_generations' ORDER BY ordinal_position;`
        });
      
      if (structError) {
        console.log('❌ ai_audio_generations no existe o no se puede consultar');
        
        // Intentar consulta directa
        const { data: testData, error: testError } = await supabase
          .from('ai_audio_generations')
          .select('*')
          .limit(1);
        
        if (testError) {
          console.log('❌ Confirmado: ai_audio_generations NO EXISTE');
          console.log('Error:', testError.code, testError.message);
        } else {
          console.log('✅ ai_audio_generations EXISTE pero RPC falló');
        }
      } else {
        console.log('✅ Estructura de ai_audio_generations:', structure);
      }
    } catch (e) {
      console.log('❌ Error verificando estructura:', e.message);
    }
    
    // 3. Verificar qué tablas relacionadas con audio/AI existen
    console.log('\n🎵 VERIFICANDO TABLAS RELACIONADAS:');
    const relatedTables = [
      'audio_generations', 
      'sound_effects', 
      'user_preferences',
      'token_limits',
      'ai_models',
      'voice_generations'
    ];
    
    for (const tableName of relatedTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${tableName}: NO EXISTE`);
        } else {
          console.log(`✅ ${tableName}: EXISTE`);
        }
      } catch (e) {
        console.log(`❌ ${tableName}: ERROR`);
      }
    }
    
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

checkTables();
