/**
 * Script para crear coordinación CALIDAD, 4 coordinadores y reasignar prospectos
 * Base de datos: 
 * - System_UI (zbylezfyagwrxoecioup.supabase.co) - Usuarios y coordinaciones
 * - PQNC_AI (hmmfuhqgvsehkizlfzga.supabase.co) - Prospectos
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbylezfyagwrxoecioup.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNjI3MSwiZXhwIjoyMDc0OTEyMjcxfQ.2Btqq8cGSmr4OMKUae8zsHLxQMfs2JJ1ZFgmZYQPFQY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Usuarios a crear
const usuarios = [
  {
    email: 'angelicaguzman@vidavacations.com',
    password: 'P1ay4.Vta',
    first_name: 'Angélica',
    last_name: 'Guzmán Velasco',
    id_colaborador: '035149',
    id_dynamics: '035149'
  },
  {
    email: 'fernandamondragon@vidavacations.com',
    password: 'VidaVacations.01',
    first_name: 'María Fernanda',
    last_name: 'Mondragón López',
    id_colaborador: '027564',
    id_dynamics: '027564'
  },
  {
    email: 'Vanessaperez@vidavacations.com',
    password: 'Santurron9081*',
    first_name: 'Vanessa Valentina',
    last_name: 'Pérez Moreno',
    id_colaborador: '034646',
    id_dynamics: '034646'
  },
  {
    email: 'Elizabethhernandez@vidavacations.com',
    password: 'Nuevovallarta2409',
    first_name: 'Elizabeth',
    last_name: 'Hernández Ramírez',
    id_colaborador: '034458',
    id_dynamics: '034458'
  }
];

async function main() {
  try {
    console.log('🚀 Iniciando proceso de creación...\n');

    // 1. Obtener o crear coordinación CALIDAD
    console.log('1️⃣ Creando/verificando coordinación CALIDAD...');
    const { data: coordinacion, error: coordError } = await supabase
      .from('coordinaciones')
      .upsert({
        codigo: 'CALIDAD',
        nombre: 'CALIDAD',
        descripcion: 'Coordinación de Calidad',
        is_active: true
      }, {
        onConflict: 'codigo',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (coordError) {
      console.error('❌ Error creando coordinación:', coordError);
      throw coordError;
    }

    console.log('✅ Coordinación CALIDAD creada/actualizada:', coordinacion.id);
    const calidadCoordinacionId = coordinacion.id;

    // 2. Obtener ID del rol coordinador
    console.log('\n2️⃣ Obteniendo rol coordinador...');
    const { data: roles, error: roleError } = await supabase
      .from('auth_roles')
      .select('id')
      .eq('name', 'coordinador')
      .single();

    if (roleError || !roles) {
      console.error('❌ Error obteniendo rol coordinador:', roleError);
      throw new Error('Rol coordinador no encontrado');
    }

    const coordinadorRoleId = roles.id;
    console.log('✅ Rol coordinador encontrado:', coordinadorRoleId);

    // 3. Crear usuarios coordinadores
    console.log('\n3️⃣ Creando usuarios coordinadores...');
    const usuariosCreados = [];

    for (const usuario of usuarios) {
      try {
        // Verificar si el usuario ya existe
        const { data: existingUser } = await supabase
          .from('auth_users')
          .select('id')
          .eq('email', usuario.email)
          .single();

        let userId;

        if (existingUser) {
          console.log(`   ⚠️  Usuario ya existe: ${usuario.email}`);
          userId = existingUser.id;

          // Actualizar usuario existente
          const { error: updateError } = await supabase
            .from('auth_users')
            .update({
              first_name: usuario.first_name,
              last_name: usuario.last_name,
              id_colaborador: usuario.id_colaborador,
              id_dynamics: usuario.id_dynamics,
              is_coordinator: true,
              is_ejecutivo: false,
              role_id: coordinadorRoleId
            })
            .eq('id', userId);

          if (updateError) {
            console.error(`   ❌ Error actualizando usuario ${usuario.email}:`, updateError);
            continue;
          }
        } else {
          // Crear nuevo usuario usando función RPC
          const { data: newUser, error: createError } = await supabase.rpc('create_user_with_role', {
            user_email: usuario.email,
            user_password: usuario.password,
            user_first_name: usuario.first_name,
            user_last_name: usuario.last_name,
            user_role_id: coordinadorRoleId,
            user_phone: usuario.id_colaborador,
            user_department: null,
            user_position: null,
            user_is_active: true
          });

          if (createError || !newUser || !newUser[0]) {
            console.error(`   ❌ Error creando usuario ${usuario.email}:`, createError);
            continue;
          }

          userId = newUser[0].user_id;
          console.log(`   ✅ Usuario creado: ${usuario.email} (ID: ${userId})`);

          // Actualizar campos adicionales
          const { error: updateError } = await supabase
            .from('auth_users')
            .update({
              id_colaborador: usuario.id_colaborador,
              id_dynamics: usuario.id_dynamics,
              is_coordinator: true,
              is_ejecutivo: false
            })
            .eq('id', userId);

          if (updateError) {
            console.error(`   ⚠️  Error actualizando campos adicionales:`, updateError);
          }
        }

        // Asignar coordinación
        const { error: assignError } = await supabase
          .from('coordinador_coordinaciones')
          .upsert({
            coordinador_id: userId,
            coordinacion_id: calidadCoordinacionId
          }, {
            onConflict: 'coordinador_id,coordinacion_id',
            ignoreDuplicates: false
          });

        if (assignError) {
          console.error(`   ❌ Error asignando coordinación a ${usuario.email}:`, assignError);
        } else {
          console.log(`   ✅ Coordinación asignada a ${usuario.email}`);
          usuariosCreados.push({ ...usuario, id: userId });
        }
      } catch (err) {
        console.error(`   ❌ Error procesando usuario ${usuario.email}:`, err);
      }
    }

    // 4. Reasignar todos los prospectos a CALIDAD
    console.log('\n4️⃣ Reasignando prospectos a CALIDAD...');
    
    // Cliente de PQNC_AI (glsmifhkoaifvaegsozd.supabase.co)
    // Base de datos: PQNC_AI, Tabla: prospectos
    const pqncAiUrl = 'https://glsmifhkoaifvaegsozd.supabase.co';
    // Intentar con anon key primero (la que está en analysisSupabase.ts)
    const pqncAiAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E';
    const pqncAiSupabase = createClient(pqncAiUrl, pqncAiAnonKey);

    // Obtener ejecutivos de CALIDAD desde System_UI
    console.log('   🔍 Obteniendo ejecutivos de CALIDAD...');
    const { data: ejecutivosCalidad, error: ejecutivosError } = await supabase
      .from('auth_users')
      .select('id')
      .eq('is_ejecutivo', true)
      .eq('coordinacion_id', calidadCoordinacionId)
      .eq('is_active', true);

    if (ejecutivosError) {
      console.error('⚠️  Error obteniendo ejecutivos de CALIDAD:', ejecutivosError);
    } else {
      const ejecutivosCalidadIds = ejecutivosCalidad?.map(e => e.id) || [];
      console.log(`   ✅ Ejecutivos de CALIDAD encontrados: ${ejecutivosCalidadIds.length}`);
    }

    // Obtener prospectos de PQNC_AI (glsmifhkoaifvaegsozd.supabase.co)
    console.log('   🔍 Buscando prospectos en PQNC_AI...');
    const { data: prospectos, error: prospectosError, count } = await pqncAiSupabase
      .from('prospectos')
      .select('id, coordinacion_id, ejecutivo_id', { count: 'exact' })
      .or(`coordinacion_id.is.null,coordinacion_id.neq.${calidadCoordinacionId}`);

    if (prospectosError) {
      console.error('❌ Error obteniendo prospectos:', prospectosError);
      console.error('   Detalles:', JSON.stringify(prospectosError, null, 2));
    } else {
      const totalProspectos = count || 0;
      console.log(`   ✅ Prospectos encontrados en PQNC_AI`);
      console.log(`   📊 Total prospectos a reasignar: ${totalProspectos}`);

      // Obtener IDs de ejecutivos de CALIDAD para validación
      const ejecutivosCalidadIds = ejecutivosCalidad?.map(e => e.id) || [];
      
      if (totalProspectos > 0) {
        // Separar prospectos: los que tienen ejecutivo de otra coordinación vs los demás
        const prospectosConEjecutivoInvalido = prospectos?.filter(p => 
          p.ejecutivo_id && !ejecutivosCalidadIds.includes(p.ejecutivo_id)
        ) || [];
        
        const prospectosSinEjecutivoOValido = prospectos?.filter(p => 
          !p.ejecutivo_id || ejecutivosCalidadIds.includes(p.ejecutivo_id)
        ) || [];

        console.log(`   📋 Prospectos con ejecutivo inválido: ${prospectosConEjecutivoInvalido.length}`);
        console.log(`   📋 Prospectos sin ejecutivo o con ejecutivo válido: ${prospectosSinEjecutivoOValido.length}`);

        // Actualizar prospectos: primero los que tienen ejecutivo inválido (quitar ejecutivo_id)
        if (prospectosConEjecutivoInvalido.length > 0) {
          const prospectosIdsInvalidos = prospectosConEjecutivoInvalido.map(p => p.id);
          const { error: updateInvalidosError } = await pqncAiSupabase
            .from('prospectos')
            .update({ 
              coordinacion_id: calidadCoordinacionId,
              ejecutivo_id: null  // Quitar ejecutivo si no pertenece a CALIDAD
            })
            .in('id', prospectosIdsInvalidos);

          if (updateInvalidosError) {
            console.error('❌ Error reasignando prospectos con ejecutivo inválido:', updateInvalidosError);
          } else {
            console.log(`   ✅ ${prospectosConEjecutivoInvalido.length} prospectos reasignados a CALIDAD (ejecutivo removido)`);
          }
        }

        // Actualizar prospectos sin ejecutivo o con ejecutivo válido (solo cambiar coordinacion_id)
        if (prospectosSinEjecutivoOValido.length > 0) {
          const prospectosIdsValidos = prospectosSinEjecutivoOValido.map(p => p.id);
          const { error: updateValidosError } = await pqncAiSupabase
            .from('prospectos')
            .update({ coordinacion_id: calidadCoordinacionId })
            .in('id', prospectosIdsValidos);

          if (updateValidosError) {
            console.error('❌ Error reasignando prospectos válidos:', updateValidosError);
          } else {
            console.log(`   ✅ ${prospectosSinEjecutivoOValido.length} prospectos reasignados a CALIDAD`);
          }
        }

        // También actualizar asignaciones en System_UI si existen
        if (prospectos && prospectos.length > 0) {
          const prospectIds = prospectos.map(p => p.id);
          
          // Desactivar asignaciones anteriores
          await supabase
            .from('prospect_assignments')
            .update({ is_active: false, unassigned_at: new Date().toISOString() })
            .in('prospect_id', prospectIds)
            .eq('is_active', true);

          // Crear nuevas asignaciones para CALIDAD
          const nuevasAsignaciones = prospectIds.map(prospectId => ({
            prospect_id: prospectId,
            coordinacion_id: calidadCoordinacionId,
            assignment_type: 'manual',
            assignment_reason: 'Reasignación masiva a CALIDAD',
            is_active: true
          }));

          const { error: assignError } = await supabase
            .from('prospect_assignments')
            .upsert(nuevasAsignaciones, {
              onConflict: 'prospect_id,coordinacion_id',
              ignoreDuplicates: false
            });

          if (assignError) {
            console.error('⚠️  Error actualizando asignaciones en System_UI:', assignError);
          } else {
            console.log(`   ✅ Asignaciones actualizadas en System_UI`);
          }
        }
      }

      // Limpiar ejecutivos inválidos de prospectos que YA están en CALIDAD (siempre ejecutar)
      console.log('   🔍 Limpiando ejecutivos inválidos de prospectos en CALIDAD...');
      const { data: prospectosEnCalidadConEjecutivo } = await pqncAiSupabase
        .from('prospectos')
        .select('id, ejecutivo_id')
        .eq('coordinacion_id', calidadCoordinacionId)
        .not('ejecutivo_id', 'is', null);

      if (prospectosEnCalidadConEjecutivo && prospectosEnCalidadConEjecutivo.length > 0) {
        const prospectosInvalidosEnCalidad = prospectosEnCalidadConEjecutivo.filter(p => 
          p.ejecutivo_id && !ejecutivosCalidadIds.includes(p.ejecutivo_id)
        );

        if (prospectosInvalidosEnCalidad.length > 0) {
          console.log(`   📋 Encontrados ${prospectosInvalidosEnCalidad.length} prospectos en CALIDAD con ejecutivo inválido`);
          const idsInvalidosEnCalidad = prospectosInvalidosEnCalidad.map(p => p.id);
          const { error: updateError } = await pqncAiSupabase
            .from('prospectos')
            .update({ ejecutivo_id: null })
            .in('id', idsInvalidosEnCalidad);

          if (updateError) {
            console.error('⚠️  Error removiendo ejecutivos inválidos de prospectos en CALIDAD:', updateError);
          } else {
            console.log(`   ✅ ${prospectosInvalidosEnCalidad.length} prospectos en CALIDAD limpiados (ejecutivo inválido removido)`);
          }
        } else {
          console.log('   ✅ Todos los ejecutivos asignados son válidos para CALIDAD');
        }
      } else {
        console.log('   ℹ️  No hay prospectos en CALIDAD con ejecutivo asignado');
      }
    }

    // 5. Verificar resultados
    console.log('\n5️⃣ Verificando resultados...');
    const { data: coordinadores } = await supabase
      .from('auth_users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        id_colaborador,
        coordinador_coordinaciones (
          coordinacion_id,
          coordinaciones (
            codigo,
            nombre
          )
        )
      `)
      .eq('is_coordinator', true)
      .eq('coordinador_coordinaciones.coordinacion_id', calidadCoordinacionId);

    console.log('\n📋 Coordinadores asignados a CALIDAD:');
    coordinadores?.forEach(u => {
      const coord = u.coordinador_coordinaciones?.[0]?.coordinaciones;
      console.log(`   - ${u.first_name} ${u.last_name} (${u.email}) - ${coord?.codigo}`);
    });

    // Contar prospectos en CALIDAD desde PQNC_AI
    const { count: totalProspectos } = await pqncAiSupabase
      .from('prospectos')
      .select('*', { count: 'exact', head: true })
      .eq('coordinacion_id', calidadCoordinacionId);

    console.log(`\n📊 Total prospectos en CALIDAD: ${totalProspectos || 0}`);

    console.log('\n✅ Proceso completado exitosamente!');
  } catch (error) {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  }
}

main();

