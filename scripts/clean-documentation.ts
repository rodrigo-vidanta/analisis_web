#!/usr/bin/env tsx
/**
 * Script de Limpieza de Documentación
 * Elimina duplicados y archivos obsoletos de forma segura
 * 
 * Uso: 
 *   npm run tsx scripts/clean-documentation.ts --dry-run   (simular)
 *   npm run tsx scripts/clean-documentation.ts --execute   (ejecutar)
 */

import { readFileSync, unlinkSync, mkdirSync, renameSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';

interface AuditInventory {
  generatedAt: string;
  totalFiles: number;
  files: Array<{
    path: string;
    size: number;
    modified: string;
    md5: string;
    title: string;
    category: string;
    keywords: string[];
    versions: string[];
    isObsolete: boolean;
    isDuplicate: boolean;
  }>;
}

const DRY_RUN = process.argv.includes('--dry-run');
const EXECUTE = process.argv.includes('--execute');

if (!DRY_RUN && !EXECUTE) {
  console.error('❌ Error: Debes especificar --dry-run o --execute');
  process.exit(1);
}

// Archivos críticos que NUNCA se deben eliminar
const CRITICAL_FILES = [
  'ARCHITECTURE.md',
  'CONVENTIONS.md',
  'CHANGELOG.md',
  'README.md',
  'README_NEW.md',
  'VERSIONS.md',
  'package.json',
];

// Directorios que NUNCA se deben eliminar
const PROTECTED_DIRS = [
  'src/',
  '.cursor/',
  'node_modules/',
  '.git/',
];

function isProtected(filePath: string): boolean {
  // Verificar si es archivo crítico
  if (CRITICAL_FILES.includes(basename(filePath))) {
    return true;
  }
  
  // Verificar si está en directorio protegido
  for (const dir of PROTECTED_DIRS) {
    if (filePath.startsWith(dir)) {
      return true;
    }
  }
  
  return false;
}

function safeDelete(filePath: string): boolean {
  if (isProtected(filePath)) {
    console.log(`   ⚠️  PROTEGIDO: ${filePath} (no se eliminará)`);
    return false;
  }
  
  if (DRY_RUN) {
    console.log(`   🔍 [DRY-RUN] Eliminaría: ${filePath}`);
    return true;
  }
  
  try {
    unlinkSync(filePath);
    console.log(`   ✅ Eliminado: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error eliminando ${filePath}:`, error);
    return false;
  }
}

function safeMove(source: string, destination: string): boolean {
  if (isProtected(source)) {
    console.log(`   ⚠️  PROTEGIDO: ${source} (no se moverá)`);
    return false;
  }
  
  if (DRY_RUN) {
    console.log(`   🔍 [DRY-RUN] Movería: ${source} → ${destination}`);
    return true;
  }
  
  try {
    const destDir = dirname(destination);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }
    renameSync(source, destination);
    console.log(`   ✅ Movido: ${source} → ${destination}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error moviendo ${source}:`, error);
    return false;
  }
}

function loadInventory(): AuditInventory {
  try {
    const content = readFileSync('AUDIT_INVENTORY.json', 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Error: No se encontró AUDIT_INVENTORY.json');
    console.error('   Ejecuta primero: npm run tsx scripts/audit-documentation.ts');
    process.exit(1);
  }
}

function cleanDocsPublicDuplicates(inventory: AuditInventory): number {
  console.log('\n🔄 Limpieza 1: Eliminando duplicados docs/ ↔ public/docs/\n');
  
  // Agrupar archivos por MD5
  const md5Map = new Map<string, typeof inventory.files>();
  for (const file of inventory.files) {
    if (!file.md5) continue;
    if (!md5Map.has(file.md5)) {
      md5Map.set(file.md5, []);
    }
    md5Map.get(file.md5)!.push(file);
  }
  
  let deleted = 0;
  
  // Eliminar duplicados public/docs/ si existe el original en docs/
  for (const [md5, files] of md5Map.entries()) {
    if (files.length < 2) continue;
    
    const docsFile = files.find(f => f.path.startsWith('docs/'));
    const publicFile = files.find(f => f.path.startsWith('public/docs/'));
    
    if (docsFile && publicFile) {
      if (safeDelete(publicFile.path)) {
        deleted++;
      }
    }
  }
  
  console.log(`\n✅ Duplicados docs/↔public/docs/: ${deleted} archivos ${DRY_RUN ? 'se eliminarían' : 'eliminados'}\n`);
  return deleted;
}

function cleanDistDuplicates(inventory: AuditInventory): number {
  console.log('\n🔄 Limpieza 2: Eliminando duplicados en dist/\n');
  
  const distFiles = inventory.files.filter(f => f.path.startsWith('dist/'));
  let deleted = 0;
  
  for (const file of distFiles) {
    if (safeDelete(file.path)) {
      deleted++;
    }
  }
  
  console.log(`\n✅ Archivos dist/: ${deleted} archivos ${DRY_RUN ? 'se eliminarían' : 'eliminados'}\n`);
  return deleted;
}

function cleanObsoleteFiles(inventory: AuditInventory): number {
  console.log('\n🔄 Limpieza 3: Eliminando archivos obsoletos marcados\n');
  
  const obsoleteFiles = inventory.files.filter(f => 
    f.isObsolete && 
    f.keywords.some(k => ['OBSOLETO', 'DEPRECATED', 'NO USAR'].includes(k))
  );
  
  let deleted = 0;
  
  for (const file of obsoleteFiles) {
    // Solo eliminar si es realmente obsoleto (no en src/ ni archivos recientes)
    const fileDate = new Date(file.modified);
    const cutoffDate = new Date('2025-12-01');
    
    if (fileDate < cutoffDate || file.path.includes('TEMPORAL') || file.path.includes('BORRADOR')) {
      if (safeDelete(file.path)) {
        deleted++;
      }
    } else {
      console.log(`   ⚠️  RECIENTE: ${file.path} (revisar manualmente)`);
    }
  }
  
  console.log(`\n✅ Archivos obsoletos: ${deleted} archivos ${DRY_RUN ? 'se eliminarían' : 'eliminados'}\n`);
  return deleted;
}

function consolidateOldAudits(inventory: AuditInventory): number {
  console.log('\n🔄 Limpieza 4: Consolidando auditorías antiguas\n');
  
  const backupDir = 'backups/old-audits';
  if (!DRY_RUN && !existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }
  
  const oldAudits = inventory.files.filter(f => 
    (f.path.includes('AUDITORIA_') && (f.path.includes('JUNGALA') || f.path.includes('VIDAVACATIONS'))) ||
    (f.path.includes('REPORTE_') && f.path.includes('_2025_'))
  );
  
  let moved = 0;
  
  for (const file of oldAudits) {
    const destPath = join(backupDir, basename(file.path));
    if (safeMove(file.path, destPath)) {
      moved++;
    }
  }
  
  console.log(`\n✅ Auditorías antiguas: ${moved} archivos ${DRY_RUN ? 'se moverían' : 'movidos'} a backups/\n`);
  return moved;
}

function cleanTemporalStateFiles(inventory: AuditInventory): number {
  console.log('\n🔄 Limpieza 5: Eliminando archivos de estado temporal\n');
  
  const cutoffDate = new Date('2026-01-20');
  const temporalFiles = inventory.files.filter(f => {
    const fileDate = new Date(f.modified);
    return fileDate < cutoffDate && (
      f.path.match(/^ESTADO_FINAL_.*\.txt$/) ||
      f.path === 'RESUMEN_COMPLETO_PARA_COMMIT.md' ||
      f.path === 'COMMIT_MESSAGE.txt' ||
      f.path.includes('TAREA_COMPLETADA') ||
      f.path.includes('TODO_')
    );
  });
  
  let deleted = 0;
  
  for (const file of temporalFiles) {
    if (safeDelete(file.path)) {
      deleted++;
    }
  }
  
  console.log(`\n✅ Archivos temporales: ${deleted} archivos ${DRY_RUN ? 'se eliminarían' : 'eliminados'}\n`);
  return deleted;
}

function cleanRootDuplicates(inventory: AuditInventory): number {
  console.log('\n🔄 Limpieza 6: Eliminando duplicados en raíz que existen en docs/\n');
  
  const rootFiles = inventory.files.filter(f => 
    !f.path.includes('/') && 
    f.path.endsWith('.md') && 
    !CRITICAL_FILES.includes(basename(f.path))
  );
  
  let deleted = 0;
  
  for (const rootFile of rootFiles) {
    // Verificar si existe versión en docs/ o public/docs/
    const nameOnly = basename(rootFile.path);
    const existsInDocs = inventory.files.some(f => 
      f.path === `docs/${nameOnly}` || f.path === `public/docs/${nameOnly}`
    );
    
    if (existsInDocs && rootFile.md5) {
      // Verificar si es duplicado exacto
      const docsVersion = inventory.files.find(f => 
        (f.path === `docs/${nameOnly}` || f.path === `public/docs/${nameOnly}`) &&
        f.md5 === rootFile.md5
      );
      
      if (docsVersion) {
        if (safeDelete(rootFile.path)) {
          deleted++;
        }
      }
    }
  }
  
  console.log(`\n✅ Duplicados raíz: ${deleted} archivos ${DRY_RUN ? 'se eliminarían' : 'eliminados'}\n`);
  return deleted;
}

function generateCleanupReport(stats: Record<string, number>): void {
  const totalCleaned = Object.values(stats).reduce((sum, n) => sum + n, 0);
  
  const report = `# Reporte de Limpieza de Documentación - ${new Date().toISOString().split('T')[0]}

## Modo: ${DRY_RUN ? '🔍 DRY-RUN (Simulación)' : '✅ EJECUCIÓN REAL'}

## Resumen de Limpieza

| Operación | Archivos ${DRY_RUN ? 'que se eliminarían' : 'eliminados'} |
|-----------|----------|
| Duplicados docs/ ↔ public/docs/ | ${stats.docsPublic} |
| Archivos en dist/ | ${stats.dist} |
| Archivos obsoletos | ${stats.obsolete} |
| Auditorías antiguas (movidas) | ${stats.audits} |
| Archivos temporales | ${stats.temporal} |
| Duplicados raíz | ${stats.rootDupes} |
| **TOTAL** | **${totalCleaned}** |

## Próximos Pasos

${DRY_RUN ? `
### Para ejecutar la limpieza real:

\`\`\`bash
npm run tsx scripts/clean-documentation.ts --execute
\`\`\`

### Revisar archivos protegidos

Los siguientes archivos NUNCA se eliminarán automáticamente:
- ARCHITECTURE.md, CONVENTIONS.md, CHANGELOG.md, README.md
- Archivos en src/ (código fuente)
- Archivos en .cursor/ (configuración)
` : `
### Limpieza completada

- ✅ ${totalCleaned} archivos eliminados o movidos
- ✅ Archivos críticos protegidos
- ✅ Backup de auditorías antiguas en backups/old-audits/

### Verificar cambios

\`\`\`bash
git status
git diff --stat
\`\`\`

### Si necesitas revertir

\`\`\`bash
git restore .
git clean -fd  # Solo si ya hiciste commit antes de limpiar
\`\`\`
`}

---

**Generado por**: scripts/clean-documentation.ts  
**Fecha**: ${new Date().toISOString()}
`;

  const filename = DRY_RUN ? 'CLEANUP_REPORT_DRY_RUN.md' : 'CLEANUP_REPORT.md';
  
  if (!DRY_RUN) {
    writeFileSync(filename, report, 'utf-8');
    console.log(`\n📄 Reporte generado: ${filename}\n`);
  } else {
    console.log(report);
  }
}

// Main execution
console.log('═══════════════════════════════════════════════');
console.log(`  🧹 LIMPIEZA DE DOCUMENTACIÓN - ${DRY_RUN ? 'DRY-RUN' : 'EJECUCIÓN'}`);
console.log('═══════════════════════════════════════════════\n');

console.log('📂 Cargando inventario de auditoría...\n');
const inventory = loadInventory();
console.log(`✅ Inventario cargado: ${inventory.totalFiles} archivos\n`);

if (DRY_RUN) {
  console.log('⚠️  MODO DRY-RUN: No se eliminarán archivos realmente\n');
} else {
  console.log('⚠️  MODO EJECUCIÓN: Los archivos se eliminarán PERMANENTEMENTE\n');
  console.log('   Presiona Ctrl+C en los próximos 3 segundos para cancelar...\n');
  
  // Pausa de 3 segundos para permitir cancelación
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  await sleep(3000);
  
  console.log('   Continuando con limpieza...\n');
}

const stats = {
  docsPublic: cleanDocsPublicDuplicates(inventory),
  dist: cleanDistDuplicates(inventory),
  obsolete: cleanObsoleteFiles(inventory),
  audits: consolidateOldAudits(inventory),
  temporal: cleanTemporalStateFiles(inventory),
  rootDupes: cleanRootDuplicates(inventory),
};

console.log('═══════════════════════════════════════════════');
console.log(`  ${DRY_RUN ? '🔍 SIMULACIÓN COMPLETADA' : '✅ LIMPIEZA COMPLETADA'}`);
console.log('═══════════════════════════════════════════════\n');

const totalCleaned = Object.values(stats).reduce((sum, n) => sum + n, 0);
console.log(`📊 Total archivos ${DRY_RUN ? 'que se eliminarían' : 'eliminados'}: ${totalCleaned}\n`);

generateCleanupReport(stats);
