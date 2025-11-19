/**
 * ============================================
 * SCRIPT DE MIGRACIÓN AUTOMÁTICA
 * ============================================
 * 
 * Este script Node.js automatiza la migración de usuarios y roles
 * de pqncSupabase a System_UI
 * 
 * Uso: node 04_migration_script_node.js
 * ============================================
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de bases de datos
const PQNC_SUPABASE_URL = process.env.VITE_PQNC_SUPABASE_URL || 'https://hmmfuhqgvsehkizlfzga.supabase.co';
const PQNC_SUPABASE_SERVICE_KEY = process.env.VITE_PQNC_SUPABASE_SERVICE_KEY;

const SYSTEM_UI_SUPABASE_URL = process.env.VITE_SYSTEM_UI_SUPABASE_URL || 'https://zbylezfyagwrxoecioup.supabase.co';
const SYSTEM_UI_SUPABASE_SERVICE_KEY = process.env.VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY;

// Clientes Supabase
const pqncClient = createClient(PQNC_SUPABASE_URL, PQNC_SUPABASE_SERVICE_KEY);
const systemUIClient = createClient(SYSTEM_UI_SUPABASE_URL, SYSTEM_UI_SUPABASE_SERVICE_KEY);

// Directorio para backups
const BACKUP_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Exportar datos de pqncSupabase
 */
async function exportFromPQNC() {
  console.log('📤 Exportando datos de pqncSupabase...');
  
  const exportData = {
    roles: [],
    users: [],
    permissions: [],
    rolePermissions: [],
    userPermissions: [],
    avatars: [],
    tokens: [],
    timestamp: new Date().toISOString()
  };

  try {
    // Exportar roles
    const { data: roles, error: rolesError } = await pqncClient
      .from('auth_roles')
      .select('*')
      .order('name');
    
    if (rolesError) throw rolesError;
    exportData.roles = roles || [];
    console.log(`✅ Roles exportados: ${exportData.roles.length}`);

    // Exportar usuarios
    const { data: users, error: usersError } = await pqncClient
      .from('auth_users')
      .select('*')
      .order('created_at');
    
    if (usersError) throw usersError;
    exportData.users = users || [];
    console.log(`✅ Usuarios exportados: ${exportData.users.length}`);

    // Exportar permisos (en pqnc_qa tiene 'name' no 'permission_name')
    const { data: permissions, error: permsError } = await pqncClient
      .from('auth_permissions')
      .select('*')
      .order('module', { ascending: true });
    
    if (permsError) throw permsError;
    // Transformar 'name' a 'permission_name' para compatibilidad con System_UI
    exportData.permissions = (permissions || []).map(p => ({
      ...p,
      permission_name: p.name || p.permission_name, // Usar name si existe, sino permission_name
      id: p.id,
      module: p.module,
      sub_module: p.sub_module,
      description: p.description,
      created_at: p.created_at
    }));
    console.log(`✅ Permisos exportados: ${exportData.permissions.length}`);

    // Exportar relación roles-permisos
    const { data: rolePerms, error: rolePermsError } = await pqncClient
      .from('auth_role_permissions')
      .select('*')
      .order('role_id');
    
    if (!rolePermsError) {
      exportData.rolePermissions = rolePerms || [];
      console.log(`✅ Relaciones roles-permisos exportadas: ${exportData.rolePermissions.length}`);
    }

    // Exportar permisos de usuarios (en pqnc_qa es user_specific_permissions, no auth_user_permissions)
    // Necesitamos hacer JOIN con auth_permissions para obtener el nombre del permiso
    const { data: userSpecificPerms, error: userPermsError } = await pqncClient
      .from('user_specific_permissions')
      .select(`
        id,
        user_id,
        permission_id,
        granted,
        created_at,
        created_by,
        auth_permissions (
          name,
          module,
          sub_module
        )
      `)
      .eq('granted', true)
      .order('user_id');
    
    if (!userPermsError && userSpecificPerms) {
      // Transformar a formato compatible con System_UI
      exportData.userPermissions = userSpecificPerms.map(usp => {
        const perm = Array.isArray(usp.auth_permissions) 
          ? usp.auth_permissions[0] 
          : usp.auth_permissions;
        
        return {
          id: usp.id,
          user_id: usp.user_id,
          permission_name: perm?.name || '',
          module: perm?.module || '',
          sub_module: perm?.sub_module || null,
          granted_at: usp.created_at,
          granted_by: usp.created_by
        };
      }).filter(up => up.permission_name); // Filtrar los que tienen nombre de permiso válido
      
      console.log(`✅ Permisos de usuarios exportados: ${exportData.userPermissions.length}`);
    }

    // Exportar avatares (en pqnc_qa tiene 'original_filename' no 'filename')
    const { data: avatars, error: avatarsError } = await pqncClient
      .from('user_avatars')
      .select('*')
      .order('user_id');
    
    if (!avatarsError && avatars) {
      // Transformar original_filename a filename para compatibilidad
      exportData.avatars = (avatars || []).map(avatar => ({
        id: avatar.id,
        user_id: avatar.user_id,
        avatar_url: avatar.avatar_url,
        filename: avatar.original_filename || avatar.filename, // Usar original_filename si existe
        file_size: avatar.file_size,
        mime_type: avatar.mime_type,
        uploaded_at: avatar.uploaded_at
      }));
      console.log(`✅ Avatares exportados: ${exportData.avatars.length}`);
    }

    // Exportar tokens API (en pqnc_qa NO existe api_tokens)
    // Existe ai_token_limits pero es para otro propósito
    // Por ahora no exportamos tokens API
    console.log('ℹ️  api_tokens no existe en pqnc_qa, se omite');
    exportData.tokens = [];

    // Guardar backup
    const backupFile = path.join(BACKUP_DIR, `backup_${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(exportData, null, 2));
    console.log(`💾 Backup guardado en: ${backupFile}`);

    return exportData;
  } catch (error) {
    console.error('❌ Error exportando datos:', error);
    throw error;
  }
}

/**
 * Importar datos a System_UI
 */
async function importToSystemUI(exportData) {
  console.log('📥 Importando datos a System_UI...');

  try {
    // 1. Importar roles (pqnc_qa no tiene is_active, se agrega como true)
    if (exportData.roles.length > 0) {
      console.log(`📋 Importando ${exportData.roles.length} roles...`);
      for (const role of exportData.roles) {
        const { error } = await systemUIClient
          .from('auth_roles')
          .upsert({
            id: role.id,
            name: role.name,
            display_name: role.display_name,
            description: role.description,
            is_active: role.is_active !== undefined ? role.is_active : true, // Default true si no existe
            created_at: role.created_at
          }, {
            onConflict: 'name'
          });
        
        if (error) {
          console.error(`⚠️ Error importando rol ${role.name}:`, error.message);
        }
      }
      console.log('✅ Roles importados');
    }

    // 2. Importar usuarios (incluyendo failed_login_attempts y locked_until)
    if (exportData.users.length > 0) {
      console.log(`👥 Importando ${exportData.users.length} usuarios...`);
      for (const user of exportData.users) {
        const { error } = await systemUIClient
          .from('auth_users')
          .upsert({
            id: user.id,
            email: user.email,
            password_hash: user.password_hash,
            full_name: user.full_name,
            first_name: user.first_name,
            last_name: user.last_name,
            phone: user.phone,
            department: user.department,
            position: user.position,
            organization: user.organization || 'Grupo Vidanta',
            role_id: user.role_id,
            is_active: user.is_active !== undefined ? user.is_active : true,
            email_verified: user.email_verified !== undefined ? user.email_verified : false,
            last_login: user.last_login,
            failed_login_attempts: user.failed_login_attempts || 0,
            locked_until: user.locked_until,
            created_at: user.created_at,
            updated_at: user.updated_at || new Date().toISOString()
          }, {
            onConflict: 'email'
          });
        
        if (error) {
          console.error(`⚠️ Error importando usuario ${user.email}:`, error.message);
        }
      }
      console.log('✅ Usuarios importados');
    }

    // 3. Importar permisos
    if (exportData.permissions.length > 0) {
      console.log(`🔐 Importando ${exportData.permissions.length} permisos...`);
      for (const perm of exportData.permissions) {
        const { error } = await systemUIClient
          .from('auth_permissions')
          .upsert({
            id: perm.id,
            permission_name: perm.permission_name,
            module: perm.module,
            sub_module: perm.sub_module,
            description: perm.description,
            created_at: perm.created_at
          }, {
            onConflict: 'permission_name'
          });
        
        if (error) {
          console.error(`⚠️ Error importando permiso ${perm.permission_name}:`, error.message);
        }
      }
      console.log('✅ Permisos importados');
    }

    // 4. Importar relación roles-permisos
    if (exportData.rolePermissions.length > 0) {
      console.log(`🔗 Importando ${exportData.rolePermissions.length} relaciones roles-permisos...`);
      for (const rp of exportData.rolePermissions) {
        const { error } = await systemUIClient
          .from('auth_role_permissions')
          .upsert({
            id: rp.id,
            role_id: rp.role_id,
            permission_id: rp.permission_id,
            created_at: rp.created_at
          }, {
            onConflict: 'role_id,permission_id'
          });
        
        if (error) {
          console.error(`⚠️ Error importando relación rol-permiso:`, error.message);
        }
      }
      console.log('✅ Relaciones roles-permisos importadas');
    }

    // 5. Importar permisos de usuarios
    if (exportData.userPermissions.length > 0) {
      console.log(`👤 Importando ${exportData.userPermissions.length} permisos de usuarios...`);
      for (const up of exportData.userPermissions) {
        const { error } = await systemUIClient
          .from('auth_user_permissions')
          .upsert({
            id: up.id,
            user_id: up.user_id,
            permission_name: up.permission_name,
            module: up.module,
            sub_module: up.sub_module,
            granted_at: up.granted_at,
            granted_by: up.granted_by
          });
        
        if (error) {
          console.error(`⚠️ Error importando permiso de usuario:`, error.message);
        }
      }
      console.log('✅ Permisos de usuarios importados');
    }

    // 6. Importar avatares (ya transformados con filename desde original_filename)
    if (exportData.avatars.length > 0) {
      console.log(`🖼️ Importando ${exportData.avatars.length} avatares...`);
      for (const avatar of exportData.avatars) {
        const { error } = await systemUIClient
          .from('user_avatars')
          .upsert({
            id: avatar.id,
            user_id: avatar.user_id,
            avatar_url: avatar.avatar_url,
            filename: avatar.filename, // Ya transformado desde original_filename
            file_size: avatar.file_size,
            mime_type: avatar.mime_type,
            uploaded_at: avatar.uploaded_at
          }, {
            onConflict: 'user_id' // En System_UI puede haber UNIQUE en user_id
          });
        
        if (error) {
          console.error(`⚠️ Error importando avatar para usuario ${avatar.user_id}:`, error.message);
        }
      }
      console.log('✅ Avatares importados');
    }

    // 7. Importar tokens API
    if (exportData.tokens.length > 0) {
      console.log(`🎫 Importando ${exportData.tokens.length} tokens API...`);
      for (const token of exportData.tokens) {
        const { error } = await systemUIClient
          .from('api_tokens')
          .upsert({
            id: token.id,
            user_id: token.user_id,
            token_name: token.token_name,
            token_hash: token.token_hash,
            monthly_limit: token.monthly_limit,
            current_usage: token.current_usage,
            last_used: token.last_used,
            expires_at: token.expires_at,
            is_active: token.is_active,
            created_at: token.created_at
          }, {
            onConflict: 'token_hash'
          });
        
        if (error) {
          console.error(`⚠️ Error importando token:`, error.message);
        }
      }
      console.log('✅ Tokens API importados');
    }

    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error importando datos:', error);
    throw error;
  }
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('🚀 Iniciando migración de usuarios y roles...\n');
    
    // Exportar datos
    const exportData = await exportFromPQNC();
    
    // Importar datos
    await importToSystemUI(exportData);
    
    console.log('\n✅ Migración completada exitosamente');
  } catch (error) {
    console.error('\n❌ Error en la migración:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { exportFromPQNC, importToSystemUI };

