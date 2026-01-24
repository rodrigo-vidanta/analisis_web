#!/usr/bin/env node
/**
 * Script para obtener session token de forma segura
 * Uso: node scripts/get-session-token.js
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔐 Obtener Session Token para MCP Seguro\n');
console.log('Este token permite que Cursor acceda a Supabase de forma segura.');
console.log('El token expira cuando cierras sesión o después de 30 días.\n');

console.log('Opciones para obtener tu session token:\n');
console.log('1️⃣  Desde la App (Recomendado):');
console.log('   - Loguéate en https://ai.vidavacations.com');
console.log('   - Abre DevTools (F12) → Console');
console.log('   - Ejecuta: localStorage.getItem("session_token")');
console.log('   - Copia el token\n');

console.log('2️⃣  Desde Supabase Dashboard:');
console.log('   - Ve a: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd');
console.log('   - Table Editor → auth_sessions');
console.log('   - Busca tu user_id y copia el session_token\n');

rl.question('Pega tu session token aquí: ', (token) => {
  token = token.trim();

  if (!token) {
    console.error('\n❌ Token vacío. Abortando.');
    process.exit(1);
  }

  // Validar formato básico (UUID o JWT)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
  const isJWT = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token);

  if (!isUUID && !isJWT) {
    console.warn('\n⚠️  El token no parece tener un formato válido (UUID o JWT).');
    rl.question('¿Continuar de todas formas? (s/n): ', (answer) => {
      if (answer.toLowerCase() !== 's') {
        console.log('Abortado.');
        process.exit(0);
      }
      saveToken(token);
      rl.close();
    });
  } else {
    saveToken(token);
    rl.close();
  }
});

function saveToken(token) {
  const cursorDir = path.join(process.cwd(), '.cursor');
  const tokenPath = path.join(cursorDir, 'session_token');

  // Crear directorio .cursor si no existe
  if (!fs.existsSync(cursorDir)) {
    fs.mkdirSync(cursorDir, { recursive: true });
  }

  // Guardar token
  fs.writeFileSync(tokenPath, token, { mode: 0o600 });

  // Verificar que esté en .gitignore
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  let gitignoreContent = '';

  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  }

  if (!gitignoreContent.includes('.cursor/session_token')) {
    fs.appendFileSync(gitignorePath, '\n# MCP Session Token\n.cursor/session_token\n');
    console.log('\n✅ Agregado .cursor/session_token a .gitignore');
  }

  console.log('\n✅ Token guardado en:', tokenPath);
  console.log('✅ Permisos: 600 (solo tu usuario puede leer)');
  console.log('\n📝 Próximos pasos:');
  console.log('1. Configura el MCP en ~/.cursor/mcp.json (ver docs/MCP_SECURE_PROXY_SETUP.md)');
  console.log('2. Reinicia Cursor');
  console.log('3. Prueba con: mcp_MCPSecureProxy_debug_connection()');
  console.log('\n⚠️  IMPORTANTE: Este token expira cuando cierras sesión.');
  console.log('Si el MCP deja de funcionar, obtén un nuevo token con este script.\n');
}
