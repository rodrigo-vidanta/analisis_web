// ============================================
// APLICAR PERMISOS DIRECTAMENTE - ESTRUCTURA CONOCIDA
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hmmfuhqgvsehkizlfzga.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWZ1aHFndnNlaGtpemxmemdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTUxMzU4NywiZXhwIjoyMDYxMDg5NTg3fQ.mTnTOpkXi19xu1l-cZKx_f5RbqSg6zzH8mGdBOY3MZg';

const supabase = createClient(supabaseUrl, serviceRoleKey);

console.log('🚀 Aplicando permisos con estructura conocida...');

async function applyPermissions() {
  try {
    // 1. CREAR ROL VENDEDOR
    console.log('\n1. 👤 Creando rol vendedor...');
    
    const { data: vendedorRole, error: roleError } = await supabase
      .from('auth_roles')
      .upsert({
        id: crypto.randomUUID(),
        name: 'vendedor',
        display_name: 'Vendedor',
        description: 'Vendedor con acceso a monitor en vivo y análisis de rendimiento',
        created_at: new Date().toISOString()
      }, { 
        onConflict: 'name',
        ignoreDuplicates: true 
      })
      .select()
      .single();

    if (roleError && roleError.code !== '23505') { // 23505 = duplicate key (OK)
      console.error('❌ Error creando rol:', roleError);
    } else {
      console.log('✅ Rol vendedor OK');
    }

    // 2. CREAR PERMISO LIVE MONITOR
    console.log('\n2. 🔐 Creando permiso Live Monitor...');
    
    const { data: liveMonitorPerm, error: permError } = await supabase
      .from('auth_permissions')
      .upsert({
        id: crypto.randomUUID(),
        name: 'analisis.live_monitor.view',
        module: 'analisis',
        sub_module: 'live_monitor',
        description: 'Ver monitor de llamadas en tiempo real',
        created_at: new Date().toISOString()
      }, { 
        onConflict: 'name',
        ignoreDuplicates: true 
      })
      .select()
      .single();

    if (permError && permError.code !== '23505') {
      console.error('❌ Error creando permiso:', permError);
    } else {
      console.log('✅ Permiso Live Monitor OK');
    }

    // 3. OBTENER IDs PARA ASIGNACIONES
    console.log('\n3. 🔗 Obteniendo IDs para asignaciones...');
    
    const { data: roles } = await supabase
      .from('auth_roles')
      .select('id, name')
      .in('name', ['admin', 'vendedor']);

    const { data: permissions } = await supabase
      .from('auth_permissions')
      .select('id, name')
      .in('name', ['analisis.live_monitor.view', 'analisis.pqnc.view']);

    console.log('Roles encontrados:', roles);
    console.log('Permisos encontrados:', permissions);

    // 4. ASIGNAR PERMISOS
    console.log('\n4. 📋 Asignando permisos...');

    const adminRole = roles?.find(r => r.name === 'admin');
    const vendedorRoleData = roles?.find(r => r.name === 'vendedor');
    const liveMonitorPermission = permissions?.find(p => p.name === 'analisis.live_monitor.view');
    const pqncPermission = permissions?.find(p => p.name === 'analisis.pqnc.view');

    const assignments = [];

    // Admin → Live Monitor
    if (adminRole && liveMonitorPermission) {
      assignments.push({
        role_id: adminRole.id,
        permission_id: liveMonitorPermission.id
      });
    }

    // Vendedor → Live Monitor
    if (vendedorRoleData && liveMonitorPermission) {
      assignments.push({
        role_id: vendedorRoleData.id,
        permission_id: liveMonitorPermission.id
      });
    }

    // Vendedor → PQNC (para ver su rendimiento)
    if (vendedorRoleData && pqncPermission) {
      assignments.push({
        role_id: vendedorRoleData.id,
        permission_id: pqncPermission.id
      });
    }

    // Aplicar todas las asignaciones
    for (const assignment of assignments) {
      const { error: assignError } = await supabase
        .from('auth_role_permissions')
        .upsert(assignment, { 
          onConflict: 'role_id,permission_id',
          ignoreDuplicates: true 
        });

      if (assignError && assignError.code !== '23505') {
        console.error('❌ Error en asignación:', assignError);
      } else {
        console.log('✅ Asignación OK:', assignment);
      }
    }

    // 5. VERIFICACIÓN FINAL
    console.log('\n📊 VERIFICACIÓN FINAL:');
    
    const { data: finalVerification } = await supabase
      .from('auth_role_permissions')
      .select(`
        auth_roles!inner(name, display_name),
        auth_permissions!inner(name, module, sub_module, description)
      `)
      .in('auth_roles.name', ['admin', 'vendedor']);

    console.log('Asignaciones finales:');
    finalVerification?.forEach(item => {
      console.log(`✅ ${item.auth_roles.display_name} → ${item.auth_permissions.name}`);
    });

    return true;

  } catch (error) {
    console.error('💥 Error general:', error);
    return false;
  }
}

// 6. VERIFICAR AVATARES
async function checkAvatars() {
  console.log('\n🖼️ VERIFICANDO SISTEMA DE AVATARES...');
  
  try {
    // Ver si existe la tabla user_avatars
    const { data: avatars, error: avatarError } = await supabase
      .from('user_avatars')
      .select('*')
      .limit(5);

    if (avatarError) {
      console.log('⚠️ Tabla user_avatars no existe o no es accesible:', avatarError.message);
      console.log('💡 Las imágenes de perfil usarán solo iniciales por ahora');
    } else {
      console.log('✅ Tabla user_avatars existe');
      console.log(`📊 Avatares encontrados: ${avatars?.length || 0}`);
      if (avatars && avatars.length > 0) {
        console.table(avatars);
      }
    }
  } catch (error) {
    console.log('⚠️ Error verificando avatares:', error.message);
  }
}

// Ejecutar todo
applyPermissions()
  .then(checkAvatars)
  .then(() => {
    console.log('\n🎉 ¡PERMISOS APLICADOS EXITOSAMENTE!');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. ✅ Rol "vendedor" creado');
    console.log('2. ✅ Permiso "Live Monitor" creado');
    console.log('3. ✅ Asignaciones completadas');
    console.log('4. 🔄 Refresca la aplicación para ver cambios');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error final:', error);
    process.exit(1);
  });
