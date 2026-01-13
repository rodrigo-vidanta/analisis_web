// Script para migrar group_permissions desde system_ui a pqnc_ai
// Ejecutar este script para migrar todos los 345 registros en lotes

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SYSTEM_UI_SUPABASE_URL = process.env.VITE_SYSTEM_UI_SUPABASE_URL || '';
const SYSTEM_UI_SERVICE_KEY = process.env.VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY || '';
const PQNC_AI_SUPABASE_URL = process.env.VITE_PQNC_AI_SUPABASE_URL || '';
const PQNC_AI_SERVICE_KEY = process.env.VITE_PQNC_AI_SUPABASE_SERVICE_KEY || '';

const supabaseSystemUI = createClient(SYSTEM_UI_SUPABASE_URL, SYSTEM_UI_SERVICE_KEY);
const supabasePqncAI = createClient(PQNC_AI_SUPABASE_URL, PQNC_AI_SERVICE_KEY);

async function migrateGroupPermissions() {
    console.log('Starting migration of group_permissions...');

    const { data: allPermissions, error } = await supabaseSystemUI
        .from('group_permissions')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching from system_ui:', error);
        return;
    }

    if (!allPermissions || allPermissions.length === 0) {
        console.log('No records to migrate.');
        return;
    }

    console.log(`Fetched ${allPermissions.length} records. Preparing for insertion into pqnc_ai.`);

    // Verificar que los group_ids existen en pqnc_ai
    const { data: existingGroups } = await supabasePqncAI
        .from('permission_groups')
        .select('id');

    const existingGroupIds = new Set(existingGroups?.map(g => g.id) || []);

    const recordsToInsert = allPermissions
        .filter(perm => existingGroupIds.has(perm.group_id))
        .map(perm => ({
            id: perm.id,
            group_id: perm.group_id,
            module: perm.module,
            action: perm.action,
            is_granted: perm.is_granted,
            scope_restriction: perm.scope_restriction,
            custom_rules: perm.custom_rules,
            created_at: perm.created_at,
        }));

    console.log(`Prepared ${recordsToInsert.length} records for insertion (filtered by existing groups).`);

    // Insertar en lotes de 100
    const batchSize = 100;
    let totalMigrated = 0;

    for (let i = 0; i < recordsToInsert.length; i += batchSize) {
        const batch = recordsToInsert.slice(i, i + batchSize);
        console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`);

        const { error: insertError } = await supabasePqncAI
            .from('group_permissions')
            .upsert(batch, { onConflict: 'group_id,module,action' });

        if (insertError) {
            console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError);
        } else {
            totalMigrated += batch.length;
            console.log(`Successfully migrated batch ${Math.floor(i / batchSize) + 1}. Total migrated: ${totalMigrated}`);
        }
    }

    console.log(`Migration of group_permissions completed. Total records migrated: ${totalMigrated}`);
}

migrateGroupPermissions().catch(console.error);
