/**
 * ============================================
 * SCRIPT: Sincronizar is_operativo de todos los usuarios
 * ============================================
 * 
 * Este script establece is_operativo = false para TODOS los usuarios.
 * Los usuarios que estén realmente conectados lo cambiarán a true
 * en su próximo refresh o cuando hagan alguna acción.
 * 
 * Ejecutar: npx tsx scripts/sync-is-operativo.ts
 */

import { supabaseSystemUI } from '../src/config/supabaseSystemUI';

async function syncIsOperativo() {
  console.log('🔄 Iniciando sincronización de is_operativo...\n');
  
  try {
    // 1. Obtener TODOS los usuarios
    const { data: users, error: usersError } = await supabaseSystemUI
      .from('user_profiles_v2')
      .select('id, email, full_name, is_operativo');
    
    if (usersError) {
      throw new Error(`Error obteniendo usuarios: ${usersError.message}`);
    }
    
    if (!users || users.length === 0) {
      console.log('⚠️  No se encontraron usuarios');
      return;
    }
    
    console.log(`📊 Total de usuarios encontrados: ${users.length}\n`);
    
    // 2. Actualizar todos a is_operativo = false
    let successCount = 0;
    let errorCount = 0;
    let alreadyOfflineCount = 0;
    
    for (const user of users) {
      try {
        // Si ya está en false, no hacer nada
        if (user.is_operativo === false) {
          alreadyOfflineCount++;
          continue;
        }
        
        // Actualizar usando RPC
        const { error: updateError } = await supabaseSystemUI.rpc('update_user_metadata', {
          p_user_id: user.id,
          p_updates: { is_operativo: false }
        });
        
        if (updateError) {
          console.error(`❌ Error actualizando ${user.email}:`, updateError.message);
          errorCount++;
        } else {
          console.log(`✅ ${user.email} → is_operativo = false`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Excepción con ${user.email}:`, err);
        errorCount++;
      }
    }
    
    // 3. Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE SINCRONIZACIÓN');
    console.log('='.repeat(60));
    console.log(`Total usuarios:           ${users.length}`);
    console.log(`Actualizados a offline:   ${successCount}`);
    console.log(`Ya estaban offline:       ${alreadyOfflineCount}`);
    console.log(`Errores:                  ${errorCount}`);
    console.log('='.repeat(60));
    
    if (errorCount === 0) {
      console.log('\n✅ Sincronización completada exitosamente!');
    } else {
      console.log(`\n⚠️  Sincronización completada con ${errorCount} errores`);
    }
    
  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

// Ejecutar
syncIsOperativo().then(() => {
  console.log('\n✨ Script finalizado');
  process.exit(0);
});
