#!/bin/bash
# ============================================
# Script: Verificar Estado de is_operativo
# ============================================
# Uso: ./scripts/check-is-operativo.sh

echo "=== Verificación de is_operativo ==="
echo ""

# Ruta del proyecto
cd "$(dirname "$0")/.." || exit 1

echo "1️⃣ Usuarios con is_operativo = true:"
npx tsx << 'EOF'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SYSTEM_UI_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SYSTEM_UI_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  const { data, error } = await supabase
    .from('user_profiles_v2')
    .select('email, full_name, role_name, is_operativo')
    .eq('is_operativo', true);

  if (error) {
    console.error('❌ Error:', error.message);
  } else if (data && data.length > 0) {
    console.table(data);
  } else {
    console.log('   (Ningún usuario conectado)');
  }
})();
EOF

echo ""
echo "2️⃣ Sesiones activas en active_sessions:"
npx tsx << 'EOF'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SYSTEM_UI_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SYSTEM_UI_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  const { data, error } = await supabase
    .from('active_sessions')
    .select('user_id, session_id, last_activity, expires_at')
    .gte('expires_at', new Date().toISOString());

  if (error) {
    console.error('❌ Error:', error.message);
  } else if (data && data.length > 0) {
    console.table(data);
  } else {
    console.log('   (Ninguna sesión activa)');
  }
})();
EOF

echo ""
echo "3️⃣ Inconsistencias (is_operativo = true pero sin sesión activa):"
npx tsx << 'EOF'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SYSTEM_UI_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SYSTEM_UI_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  // Obtener usuarios con is_operativo = true
  const { data: users } = await supabase
    .from('user_profiles_v2')
    .select('id, email, full_name, is_operativo')
    .eq('is_operativo', true);

  if (!users || users.length === 0) {
    console.log('   (Sin inconsistencias)');
    return;
  }

  // Obtener sesiones activas
  const { data: sessions } = await supabase
    .from('active_sessions')
    .select('user_id')
    .gte('expires_at', new Date().toISOString());

  const sessionUserIds = new Set(sessions?.map(s => s.user_id) || []);

  // Filtrar usuarios sin sesión
  const inconsistencies = users.filter(u => !sessionUserIds.has(u.id));

  if (inconsistencies.length > 0) {
    console.table(inconsistencies);
    console.log(`\n⚠️  ${inconsistencies.length} usuario(s) con is_operativo=true pero sin sesión activa`);
  } else {
    console.log('   ✅ Sin inconsistencias');
  }
})();
EOF

echo ""
echo "=== Fin de verificación ==="
