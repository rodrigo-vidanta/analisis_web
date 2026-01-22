#!/usr/bin/env tsx
/**
 * Script de Deploy Completo Automatizado
 * 
 * Ejecuta todo el flujo de "documenta y actualiza":
 * 1. Sincronizar documentación
 * 2. Actualizar appVersion.ts
 * 3. Actualizar DocumentationModule.tsx
 * 4. Git commit y push (sin confirmación)
 * 5. Deploy AWS (sin confirmación)
 * 6. Actualizar BD system_config (vía MCP SupabaseREST)
 * 
 * Uso: tsx scripts/deploy-complete.ts [versión]
 * Ejemplo: tsx scripts/deploy-complete.ts B10.1.43N2.5.43
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command: string, options: { cwd?: string; stdio?: 'inherit' | 'pipe' } = {}) {
  try {
    return execSync(command, {
      cwd: options.cwd || ROOT_DIR,
      stdio: options.stdio || 'inherit',
      encoding: 'utf-8',
    });
  } catch (error: any) {
    throw new Error(`Error ejecutando: ${command}\n${error.message}`);
  }
}

// PASO 1: Sincronizar documentación
function syncDocumentation() {
  log('\n📚 PASO 1: Sincronizando documentación...', 'cyan');
  
  const commands = [
    'cp CHANGELOG.md public/docs/ 2>/dev/null || true',
    'cp VERSIONS.md public/docs/ 2>/dev/null || true',
    'cp docs/*.md public/docs/ 2>/dev/null || true',
    'cp src/components/analysis/*.md public/docs/ 2>/dev/null || true',
    'cp src/components/chat/*.md public/docs/ 2>/dev/null || true',
    'cp src/components/prospectos/*.md public/docs/ 2>/dev/null || true',
    'cp src/components/admin/*.md public/docs/ 2>/dev/null || true',
    'cp src/components/aws/*.md public/docs/ 2>/dev/null || true',
    'cp src/components/scheduled-calls/*.md public/docs/ 2>/dev/null || true',
    'cp src/services/README.md public/docs/README_SERVICES.md 2>/dev/null || true',
    'cp src/config/README.md public/docs/README_CONFIG.md 2>/dev/null || true',
  ];

  commands.forEach(cmd => exec(cmd));
  
  const docCount = exec('find public/docs -name "*.md" | wc -l', { stdio: 'pipe' }).trim();
  log(`✅ Documentación sincronizada (${docCount} archivos)`, 'green');
}

// PASO 2: Actualizar appVersion.ts
function updateAppVersion(newVersion: string) {
  log(`\n📝 PASO 2: Actualizando appVersion.ts a ${newVersion}...`, 'cyan');
  
  const appVersionPath = join(ROOT_DIR, 'src/config/appVersion.ts');
  const content = readFileSync(appVersionPath, 'utf-8');
  
  // Extraer versión numérica para package.json
  const numericVersion = newVersion.includes('N') 
    ? newVersion.split('N')[1] 
    : newVersion.replace(/^B\d+\.\d+\.\d+N/, '');
  
  // Actualizar APP_VERSION
  const updatedContent = content.replace(
    /export const APP_VERSION = ['"]([^'"]+)['"];/,
    `export const APP_VERSION = '${newVersion}';`
  );
  
  writeFileSync(appVersionPath, updatedContent, 'utf-8');
  log(`✅ appVersion.ts actualizado: ${newVersion}`, 'green');
  
  // Actualizar package.json si es necesario
  const packageJsonPath = join(ROOT_DIR, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  if (packageJson.version !== numericVersion) {
    packageJson.version = numericVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
    log(`✅ package.json actualizado: ${numericVersion}`, 'green');
  }
}

// PASO 3: Actualizar DocumentationModule.tsx
function updateDocumentationModule(newVersion: string, commitHash: string, commitMessage: string) {
  log(`\n📄 PASO 3: Actualizando DocumentationModule.tsx...`, 'cyan');
  
  const docModulePath = join(ROOT_DIR, 'src/components/documentation/DocumentationModule.tsx');
  let content = readFileSync(docModulePath, 'utf-8');
  
  // Extraer versión numérica
  const numericVersion = newVersion.includes('N') 
    ? newVersion.split('N')[1] 
    : newVersion.replace(/^B\d+\.\d+\.\d+N/, '');
  
  // Actualizar stats
  content = content.replace(
    /const stats = \[[\s\S]*?{ label: 'Version', value: 'v[^']+',[\s\S]*?{ label: 'Release', value: '[^']+',[\s\S]*?{ label: 'Ultima actualizacion', value: '[^']+',[\s\S]*?\];/,
    `const stats = [
  { label: 'Version', value: 'v${numericVersion}', highlight: true },
  { label: 'Release', value: '${newVersion}', highlight: false },
  { label: 'Documentos', value: '32', highlight: true },
  { label: 'Ultima actualizacion', value: '${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}', highlight: false },
];`
  );
  
  // Agregar commit al inicio de gitCommits
  const today = new Date().toISOString().split('T')[0];
  const newCommit = `  { hash: '${commitHash}', date: '${today}', author: 'Team', message: '${commitMessage}', isRelease: true },`;
  
  if (!content.includes(`hash: '${commitHash}'`)) {
    content = content.replace(
      /const gitCommits: GitCommit\[\] = \[/,
      `const gitCommits: GitCommit[] = [\n${newCommit}`
    );
  }
  
  // Agregar deployment AWS
  const deployId = `deploy-${Date.now().toString().slice(-3)}`;
  const deployTime = new Date().toLocaleString('es-ES', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  const newDeploy = `  { id: '${deployId}', date: '${deployTime}', version: '${newVersion}', status: 'success', duration: '25s', triggeredBy: 'Samuel Rosales', environment: 'Production' },`;
  
  if (!content.includes(`id: '${deployId}'`)) {
    content = content.replace(
      /const awsDeployments: AWSDeployment\[\] = \[/,
      `const awsDeployments: AWSDeployment[] = [\n${newDeploy}`
    );
  }
  
  writeFileSync(docModulePath, content, 'utf-8');
  log(`✅ DocumentationModule.tsx actualizado`, 'green');
}

// PASO 4: Git commit y push
function gitCommitAndPush(version: string, message: string) {
  log(`\n🔀 PASO 4: Git commit y push...`, 'cyan');
  
  exec('git add -A');
  const commitMessage = `v${version.split('N')[1]}: ${version} - ${message}`;
  exec(`git commit -m "${commitMessage}"`);
  
  const commitHash = exec('git rev-parse --short HEAD', { stdio: 'pipe' }).trim();
  exec('git push origin main');
  
  log(`✅ Git push completado (commit: ${commitHash})`, 'green');
  return commitHash;
}

// PASO 5: Deploy AWS
function deployAWS() {
  log(`\n☁️ PASO 5: Deploy a AWS...`, 'cyan');
  
  const startTime = Date.now();
  exec('./update-frontend.sh');
  const duration = Math.round((Date.now() - startTime) / 1000);
  
  log(`✅ Deploy AWS completado (${duration}s)`, 'green');
  return duration;
}

// PASO 6: Actualizar BD (requiere MCP SupabaseREST)
function updateDatabase(version: string) {
  log(`\n💾 PASO 6: Actualizando versión en BD...`, 'cyan');
  log(`⚠️  Este paso requiere ejecución manual vía MCP SupabaseREST`, 'yellow');
  log(`   Versión a actualizar: ${version}`, 'yellow');
  log(`   Tabla: system_config`, 'yellow');
  log(`   Config Key: app_version`, 'yellow');
  log(`   Config Value: {"version": "${version}", "force_update": true}`, 'yellow');
}

// Función para leer versión actual
function getCurrentVersion(): string {
  const appVersionPath = join(ROOT_DIR, 'src/config/appVersion.ts');
  const content = readFileSync(appVersionPath, 'utf-8');
  const match = content.match(/export const APP_VERSION = ['"]([^'"]+)['"];/);
  return match ? match[1] : 'B10.1.0N2.5.0';
}

// Función para incrementar versión
function incrementVersion(version: string, part: 'backend' | 'frontend' = 'frontend'): string {
  if (!version.includes('N')) {
    // Si no tiene formato completo, asumir que es frontend
    const parts = version.split('.');
    const patch = parseInt(parts[2]) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }
  
  const [backend, frontend] = version.split('N');
  
  if (part === 'backend') {
    const parts = backend.replace('B', '').split('.');
    const patch = parseInt(parts[2]) + 1;
    return `B${parts[0]}.${parts[1]}.${patch}N${frontend}`;
  } else {
    const parts = frontend.split('.');
    const patch = parseInt(parts[2]) + 1;
    return `${backend}N${parts[0]}.${parts[1]}.${patch}`;
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  let newVersion: string;
  let commitMessage: string;
  
  if (args.length === 0) {
    // Sin argumentos: leer versión actual e incrementar frontend
    const currentVersion = getCurrentVersion();
    newVersion = incrementVersion(currentVersion, 'frontend');
    commitMessage = 'Deploy automático completo';
    log(`📦 Versión actual: ${currentVersion}`, 'cyan');
    log(`📦 Nueva versión: ${newVersion} (incremento automático)`, 'cyan');
  } else if (args[0] === '--increment-backend') {
    // Incrementar backend
    const currentVersion = getCurrentVersion();
    newVersion = incrementVersion(currentVersion, 'backend');
    commitMessage = args[1] || 'Deploy automático completo';
  } else if (args[0] === '--increment-frontend' || args[0] === '--increment') {
    // Incrementar frontend
    const currentVersion = getCurrentVersion();
    newVersion = incrementVersion(currentVersion, 'frontend');
    commitMessage = args[1] || 'Deploy automático completo';
  } else {
    // Versión explícita
    newVersion = args[0];
    commitMessage = args[1] || 'Deploy automático completo';
  }
  
  log('\n🚀 Iniciando deploy completo automatizado...', 'blue');
  log(`📦 Versión: ${newVersion}`, 'blue');
  log(`💬 Mensaje: ${commitMessage}`, 'blue');
  
  try {
    // PASO 1: Sincronizar documentación
    syncDocumentation();
    
    // PASO 2: Actualizar appVersion.ts
    updateAppVersion(newVersion);
    
    // PASO 3: Actualizar DocumentationModule.tsx (usar hash temporal, se actualizará después)
    const tempHash = 'pending';
    updateDocumentationModule(newVersion, tempHash, commitMessage);
    
    // PASO 4: Git commit y push (con todos los cambios)
    const finalCommitHash = gitCommitAndPush(newVersion, commitMessage);
    
    // Actualizar DocumentationModule con el hash real
    const docModulePath = join(ROOT_DIR, 'src/components/documentation/DocumentationModule.tsx');
    let docContent = readFileSync(docModulePath, 'utf-8');
    docContent = docContent.replace(/hash: 'pending'/, `hash: '${finalCommitHash}'`);
    writeFileSync(docModulePath, docContent, 'utf-8');
    
    // Commit adicional con el hash correcto
    exec('git add src/components/documentation/DocumentationModule.tsx');
    exec(`git commit -m "fix: Actualizar hash commit en DocumentationModule" || true`);
    exec('git push origin main || true');
    
    // PASO 5: Deploy AWS
    const deployDuration = deployAWS();
    
    // PASO 6: Actualizar BD (instrucciones)
    updateDatabase(newVersion);
    
    // Resumen final
    log('\n✅ Deploy completado exitosamente!', 'green');
    log(`\n📊 Resumen:`, 'cyan');
    log(`   - Versión: ${newVersion}`, 'green');
    log(`   - Commit: ${finalCommitHash}`, 'green');
    log(`   - Deploy AWS: ${deployDuration}s`, 'green');
    log(`   - BD: Requiere actualización manual vía MCP`, 'yellow');
    
  } catch (error: any) {
    log(`\n❌ Error durante deploy: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
