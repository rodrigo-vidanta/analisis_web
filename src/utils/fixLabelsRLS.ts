/**
 * Utility para fix RLS de etiquetas WhatsApp
 * Ejecutar desde consola del navegador:
 * import('./utils/fixLabelsRLS').then(m => m.fixLabelsRLS())
 */

import { supabaseSystemUIAdmin } from '../config/supabaseSystemUI';

export async function fixLabelsRLS() {
  if (!supabaseSystemUIAdmin) {
    console.error('❌ supabaseSystemUIAdmin no está configurado');
    return;
  }

  console.log('🔧 Aplicando fix de RLS para etiquetas WhatsApp...\n');

  try {
    // Deshabilitar RLS temporalmente para limpiar
    console.log('1️⃣ Deshabilitando RLS...');
    await supabaseSystemUIAdmin.rpc('exec_raw_sql', { 
      sql: 'ALTER TABLE whatsapp_labels_custom DISABLE ROW LEVEL SECURITY' 
    });

    // Eliminar políticas viejas
    console.log('2️⃣ Eliminando políticas viejas...');
    const policiesTo Drop = [
      'custom_select_policy',
      'custom_insert_policy', 
      'custom_update_policy',
      'custom_delete_policy',
      'whatsapp_labels_custom_select',
      'whatsapp_labels_custom_insert',
      'whatsapp_labels_custom_update',
      'whatsapp_labels_custom_delete',
      '"Usuarios pueden ver sus etiquetas custom"',
      '"Usuarios pueden crear etiquetas custom"',
      '"Usuarios pueden actualizar sus etiquetas custom"',
      '"Usuarios pueden eliminar sus etiquetas custom"',
    ];

    for (const policyName of policiesToDrop) {
      try {
        await supabaseSystemUIAdmin.rpc('exec_raw_sql', {
          sql: `DROP POLICY IF EXISTS ${policyName} ON whatsapp_labels_custom`
        });
      } catch (e) {
        // Ignorar si no existe
      }
    }

    // Crear políticas nuevas
    console.log('3️⃣ Creando políticas nuevas...');
    
    await supabaseSystemUIAdmin.rpc('exec_raw_sql', {
      sql: `CREATE POLICY labels_custom_select_final ON whatsapp_labels_custom FOR SELECT USING (auth.uid() = user_id)`
    });
    console.log('   ✓ SELECT policy');

    await supabaseSystemUIAdmin.rpc('exec_raw_sql', {
      sql: `CREATE POLICY labels_custom_insert_final ON whatsapp_labels_custom FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)`
    });
    console.log('   ✓ INSERT policy');

    await supabaseSystemUIAdmin.rpc('exec_raw_sql', {
      sql: `CREATE POLICY labels_custom_update_final ON whatsapp_labels_custom FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`
    });
    console.log('   ✓ UPDATE policy');

    await supabaseSystemUIAdmin.rpc('exec_raw_sql', {
      sql: `CREATE POLICY labels_custom_delete_final ON whatsapp_labels_custom FOR DELETE USING (auth.uid() = user_id)`
    });
    console.log('   ✓ DELETE policy');

    // Habilitar RLS
    console.log('4️⃣ Habilitando RLS...');
    await supabaseSystemUIAdmin.rpc('exec_raw_sql', {
      sql: 'ALTER TABLE whatsapp_labels_custom ENABLE ROW LEVEL SECURITY'
    });

    console.log('\n✅ POLÍTICAS RLS APLICADAS CORRECTAMENTE\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Auto-ejecutar si se importa desde consola
if (typeof window !== 'undefined') {
  (window as any).fixLabelsRLS = fixLabelsRLS;
  console.log('💡 Ejecuta en consola: fixLabelsRLS()');
}

