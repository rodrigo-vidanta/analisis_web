// Script para inspeccionar system_ui y buscar procesos que ejecuten UPDATEs recurrentes
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zbylezfyagwrxoecioup.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNjI3MSwiZXhwIjoyMDc0OTEyMjcxfQ.2Btqq8cGSmr4OMKUae8zsHLxQMfs2JJ1ZFgmZYQPFQY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectSystemUI() {
  console.log('🔍 Inspeccionando SYSTEM_UI para procesos que ejecuten UPDATEs recurrentes...\n');

  // 1. Verificar tablas relacionadas con mensajes
  console.log('1. Verificando tablas relacionadas con mensajes...');
  const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND (tablename LIKE '%mensaje%' OR tablename LIKE '%whatsapp%' OR tablename LIKE '%leido%')
      ORDER BY tablename;
    `
  });
  console.log('Tablas encontradas:', tables || tablesError);

  // 2. Verificar funciones que actualicen mensajes_whatsapp
  console.log('\n2. Verificando funciones que actualicen mensajes_whatsapp...');
  const { data: functions, error: functionsError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT proname, prosrc
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND (
          p.prosrc ILIKE '%mensajes_whatsapp%'
          OR p.prosrc ILIKE '%UPDATE%mensajes%'
          OR p.prosrc ILIKE '%SET%leido%'
        )
      ORDER BY p.proname;
    `
  });
  console.log('Funciones encontradas:', functions || functionsError);

  // 3. Verificar triggers
  console.log('\n3. Verificando triggers...');
  const { data: triggers, error: triggersError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT t.tgname, c.relname as table_name, p.proname, pg_get_triggerdef(t.oid) as definition
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE c.relname LIKE '%mensaje%' 
        OR c.relname LIKE '%whatsapp%'
        OR c.relname LIKE '%conversacion%'
        OR p.prosrc ILIKE '%mensajes_whatsapp%'
      ORDER BY c.relname, t.tgname;
    `
  });
  console.log('Triggers encontrados:', triggers || triggersError);
}

inspectSystemUI().catch(console.error);

