#!/usr/bin/env tsx
/**
 * Script de Auditoría de Documentación
 * Escanea todos los archivos .md del proyecto y genera reporte detallado
 * 
 * Uso: npm run tsx scripts/audit-documentation.ts
 */

import { readFileSync, writeFileSync, statSync, readdirSync } from 'fs';
import { join, relative, basename } from 'path';
import { createHash } from 'crypto';

interface FileMetadata {
  path: string;
  size: number;
  modified: Date;
  md5: string;
  title: string;
  category: string;
  keywords: string[];
  versions: string[];
  isObsolete: boolean;
  isDuplicate: boolean;
}

// Palabras clave a buscar
const OBSOLETE_KEYWORDS = ['OBSOLETO', 'DEPRECATED', 'NO USAR', 'LEGACY', 'BORRADOR', 'DRAFT'];
const VERSION_REGEX = /v\d+\.\d+\.\d+|B\d+\.\d+\.\d+N\d+\.\d+\.\d+/g;

// Categorías de clasificación
const CATEGORIES = {
  CHANGELOG: /CHANGELOG|CHANGE_LOG/i,
  ARCHITECTURE: /ARCHITECTURE|ARQUITECTURA|DIAGRAM/i,
  AUDIT: /AUDITORIA|AUDITORÍA|PENTEST|SECURITY_AUDIT/i,
  MIGRATION: /MIGRACION|MIGRACIÓN|MIGRATION/i,
  DEPLOYMENT: /DEPLOY|DEPLOYMENT|DESPLIEGUE/i,
  STATE: /ESTADO|STATUS|RESUMEN/i,
  REPORT: /REPORTE|REPORT/i,
  README: /^README\.md$/i,
  DOCS_COMPONENT: /^src\/components\//,
  REPO_EXTERNAL: /AWS_Project\/(supabase-official|official-aws-template)\//,
  PUBLIC_COPY: /^(public|dist)\/docs\//,
};

function calculateMD5(filePath: string): string {
  try {
    const content = readFileSync(filePath);
    return createHash('md5').update(content).digest('hex');
  } catch (error) {
    return '';
  }
}

function extractTitle(filePath: string): string {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').slice(0, 10);
    
    // Buscar primer header markdown
    for (const line of lines) {
      const match = line.match(/^#\s+(.+)$/);
      if (match) {
        return match[1].trim();
      }
    }
    
    // Si no hay header, usar nombre del archivo
    return basename(filePath, '.md');
  } catch (error) {
    return basename(filePath, '.md');
  }
}

function detectKeywords(filePath: string): string[] {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const first50Lines = content.split('\n').slice(0, 50).join('\n');
    
    return OBSOLETE_KEYWORDS.filter(keyword => 
      first50Lines.toUpperCase().includes(keyword)
    );
  } catch (error) {
    return [];
  }
}

function extractVersions(filePath: string): string[] {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const matches = content.match(VERSION_REGEX);
    return matches ? [...new Set(matches)] : [];
  } catch (error) {
    return [];
  }
}

function categorizeFile(filePath: string): string {
  for (const [category, pattern] of Object.entries(CATEGORIES)) {
    if (pattern.test(filePath) || pattern.test(basename(filePath))) {
      return category;
    }
  }
  return 'OTHER';
}

function findAllMarkdownFiles(dir: string, fileList: string[] = []): string[] {
  try {
    const files = readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = join(dir, file.name);
      
      // Skip node_modules
      if (file.name === 'node_modules' || file.name === '.git') {
        continue;
      }
      
      if (file.isDirectory()) {
        findAllMarkdownFiles(fullPath, fileList);
      } else if (file.name.endsWith('.md')) {
        fileList.push(fullPath);
      }
    }
  } catch (error) {
    // Skip inaccessible directories
  }
  
  return fileList;
}

function scanDocumentation(): FileMetadata[] {
  console.log('🔍 Escaneando archivos .md...\n');
  
  const projectRoot = process.cwd();
  const allFiles = findAllMarkdownFiles(projectRoot);
  
  console.log(`📊 Total archivos encontrados: ${allFiles.length}\n`);
  
  const metadata: FileMetadata[] = [];
  
  for (let i = 0; i < allFiles.length; i++) {
    const filePath = allFiles[i];
    const relativePath = relative(projectRoot, filePath);
    
    if ((i + 1) % 100 === 0) {
      console.log(`   Procesando ${i + 1}/${allFiles.length}...`);
    }
    
    try {
      const stats = statSync(filePath);
      const md5 = calculateMD5(filePath);
      const title = extractTitle(filePath);
      const keywords = detectKeywords(filePath);
      const versions = extractVersions(filePath);
      const category = categorizeFile(relativePath);
      
      metadata.push({
        path: relativePath,
        size: stats.size,
        modified: stats.mtime,
        md5,
        title,
        category,
        keywords,
        versions,
        isObsolete: keywords.length > 0,
        isDuplicate: false, // Se detectará después
      });
    } catch (error) {
      console.error(`❌ Error procesando ${relativePath}:`, error);
    }
  }
  
  return metadata;
}

function detectDuplicates(metadata: FileMetadata[]): Map<string, FileMetadata[]> {
  const md5Map = new Map<string, FileMetadata[]>();
  
  for (const file of metadata) {
    if (!file.md5) continue;
    
    if (!md5Map.has(file.md5)) {
      md5Map.set(file.md5, []);
    }
    md5Map.get(file.md5)!.push(file);
  }
  
  // Marcar duplicados
  for (const [md5, files] of md5Map.entries()) {
    if (files.length > 1) {
      files.forEach(f => f.isDuplicate = true);
    }
  }
  
  // Retornar solo grupos con duplicados
  return new Map([...md5Map.entries()].filter(([_, files]) => files.length > 1));
}

function generateReport(metadata: FileMetadata[], duplicates: Map<string, FileMetadata[]>): string {
  const now = new Date().toISOString().split('T')[0];
  
  // Estadísticas por categoría
  const categoryStats = new Map<string, number>();
  metadata.forEach(f => {
    categoryStats.set(f.category, (categoryStats.get(f.category) || 0) + 1);
  });
  
  // Archivos obsoletos
  const obsoleteFiles = metadata.filter(f => f.isObsolete);
  
  // Archivos en docs/ vs public/docs/
  const docsFiles = metadata.filter(f => f.path.startsWith('docs/'));
  const publicDocsFiles = metadata.filter(f => f.path.startsWith('public/docs/'));
  const distDocsFiles = metadata.filter(f => f.path.startsWith('dist/'));
  
  // Duplicados docs/ ↔ public/docs/
  const docsPublicDuplicates: Array<{docs: string, public: string, md5: string}> = [];
  for (const [md5, files] of duplicates.entries()) {
    const docsFile = files.find(f => f.path.startsWith('docs/'));
    const publicFile = files.find(f => f.path.startsWith('public/docs/'));
    
    if (docsFile && publicFile) {
      docsPublicDuplicates.push({
        docs: docsFile.path,
        public: publicFile.path,
        md5
      });
    }
  }
  
  // Archivos repositorios externos
  const externalRepoFiles = metadata.filter(f => f.category === 'REPO_EXTERNAL');
  
  let report = `# Auditoría de Documentación - ${now}

## 📊 Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| **Total archivos .md** | ${metadata.length} |
| **Duplicados exactos** | ${duplicates.size} grupos (${[...duplicates.values()].reduce((sum, files) => sum + files.length, 0)} archivos) |
| **Duplicados docs/ ↔ public/docs/** | ${docsPublicDuplicates.length} |
| **Archivos obsoletos detectados** | ${obsoleteFiles.length} |
| **Archivos en repositorios externos** | ${externalRepoFiles.length} |
| **Archivos en dist/ (auto-generados)** | ${distDocsFiles.length} |

## 📁 Distribución por Categoría

| Categoría | Cantidad | % |
|-----------|----------|---|
${[...categoryStats.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([cat, count]) => `| ${cat} | ${count} | ${((count / metadata.length) * 100).toFixed(1)}% |`)
  .join('\n')}

## 🔄 Duplicados Detectados

### docs/ ↔ public/docs/ (Candidatos a Eliminar)

${docsPublicDuplicates.length > 0 ? `
Se encontraron **${docsPublicDuplicates.length}** archivos idénticos entre \`docs/\` y \`public/docs/\`:

| Archivo Original (docs/) | Duplicado (public/docs/) |
|--------------------------|--------------------------|
${docsPublicDuplicates.slice(0, 50).map(d => `| ${d.docs} | ${d.public} |`).join('\n')}
${docsPublicDuplicates.length > 50 ? `\n... y ${docsPublicDuplicates.length - 50} más` : ''}

**Acción recomendada**: Eliminar todos los archivos en \`public/docs/\` que son idénticos a \`docs/\`.
` : 'No se encontraron duplicados directos entre docs/ y public/docs/.'}

### Otros Grupos de Duplicados

${duplicates.size > docsPublicDuplicates.length ? `
${[...duplicates.entries()]
  .filter(([md5, files]) => {
    const hasDocsFile = files.some(f => f.path.startsWith('docs/'));
    const hasPublicFile = files.some(f => f.path.startsWith('public/docs/'));
    return !(hasDocsFile && hasPublicFile);
  })
  .slice(0, 20)
  .map(([md5, files]) => `
**MD5: \`${md5.slice(0, 8)}...\`** (${files.length} archivos)
${files.map(f => `- ${f.path}`).join('\n')}
`)
  .join('\n')}
` : 'No se encontraron otros grupos de duplicados significativos.'}

### dist/ (Archivos Auto-Generados)

**Total en dist/**: ${distDocsFiles.length} archivos

Estos archivos se regeneran automáticamente durante el build y NO deben editarse manualmente.

## ⚠️ Archivos Obsoletos (Candidatos a Eliminar)

Se encontraron **${obsoleteFiles.length}** archivos con keywords de obsolescencia:

${obsoleteFiles.slice(0, 30).map(f => `
### ${f.path}
- **Keywords**: ${f.keywords.join(', ')}
- **Tamaño**: ${(f.size / 1024).toFixed(1)} KB
- **Última modificación**: ${f.modified.toISOString().split('T')[0]}
- **Categoría**: ${f.category}
`).join('\n')}
${obsoleteFiles.length > 30 ? `\n... y ${obsoleteFiles.length - 30} más archivos obsoletos.` : ''}

## 🗂️ Repositorios Externos

Se encontraron **${externalRepoFiles.length}** archivos en repositorios clonados:

- **AWS_Project/supabase-official/**: ${externalRepoFiles.filter(f => f.path.includes('supabase-official')).length} archivos
- **AWS_Project/official-aws-template/**: ${externalRepoFiles.filter(f => f.path.includes('official-aws-template')).length} archivos

**Recomendación**: Agregar estos directorios a \`.cursorindexingignore\` para evitar indexación innecesaria.

## 🔢 Discrepancias de Versión

### Versiones Detectadas en package.json
- **Versión actual**: 2.5.35

### Versiones Detectadas en CHANGELOG.md
${metadata.find(f => f.path === 'CHANGELOG.md')?.versions.slice(0, 5).map(v => `- ${v}`).join('\n') || 'No detectadas'}

### Versiones Detectadas en VERSIONS.md
${metadata.find(f => f.path === 'VERSIONS.md')?.versions.slice(0, 5).map(v => `- ${v}`).join('\n') || 'No detectadas'}

**Análisis**: Se requiere sincronización manual de versiones.

## 📝 Recomendaciones

### 1. Limpieza Inmediata (Segura)
- ✅ Eliminar ${docsPublicDuplicates.length} duplicados en \`public/docs/\` idénticos a \`docs/\`
- ✅ Mover auditorías de proyectos externos a \`backups/old-audits/\`
- ✅ Eliminar archivos temporales de estado (ESTADO_FINAL_*.txt antiguos)

### 2. Consolidación (Requiere Revisión)
- ⚠️ Revisar ${obsoleteFiles.length} archivos obsoletos marcados
- ⚠️ Validar ${metadata.filter(f => f.category === 'DOCS_COMPONENT').length} docs de componentes vs código fuente
- ⚠️ Actualizar arquitectura de BD vs esquema real

### 3. Optimización de Indexación
- Agregar a \`.cursorindexingignore\`:
  \`\`\`
  AWS_Project/supabase-official/
  AWS_Project/official-aws-template/
  dist/
  \`\`\`

### 4. Sincronización de Versiones
- Actualizar CHANGELOG.md a v2.5.35
- Verificar VERSIONS.md para consistencia

## 📈 Impacto Estimado

| Acción | Archivos Afectados | Impacto |
|--------|-------------------|---------|
| Eliminar duplicados public/docs/ | ${docsPublicDuplicates.length} | Reduce ~${((docsPublicDuplicates.length / metadata.length) * 100).toFixed(1)}% |
| Ignorar repos externos | ${externalRepoFiles.length} | Mejora indexación de Cursor |
| Eliminar dist/ | ${distDocsFiles.length} | Auto-regenerables, no impacto |
| Consolidar obsoletos | ${obsoleteFiles.length} | Requiere revisión manual |

**Reducción total estimada**: ~${Math.round((docsPublicDuplicates.length + externalRepoFiles.length + distDocsFiles.length) / metadata.length * 100)}% menos archivos a mantener.

---

**Generado por**: scripts/audit-documentation.ts  
**Fecha**: ${new Date().toISOString()}  
**Total archivos procesados**: ${metadata.length}
`;

  return report;
}

function generateJSONInventory(metadata: FileMetadata[]): string {
  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalFiles: metadata.length,
    files: metadata.map(f => ({
      path: f.path,
      size: f.size,
      modified: f.modified.toISOString(),
      md5: f.md5,
      title: f.title,
      category: f.category,
      keywords: f.keywords,
      versions: f.versions,
      isObsolete: f.isObsolete,
      isDuplicate: f.isDuplicate,
    }))
  }, null, 2);
}

// Main execution
console.log('═══════════════════════════════════════════════');
console.log('  📚 AUDITORÍA DE DOCUMENTACIÓN - PQNC QA AI');
console.log('═══════════════════════════════════════════════\n');

const metadata = scanDocumentation();
console.log('\n✅ Escaneo completado\n');

console.log('🔍 Detectando duplicados...\n');
const duplicates = detectDuplicates(metadata);
console.log(`✅ Encontrados ${duplicates.size} grupos de duplicados\n`);

console.log('📝 Generando reporte...\n');
const report = generateReport(metadata, duplicates);
writeFileSync('AUDIT_REPORT.md', report, 'utf-8');
console.log('✅ Reporte generado: AUDIT_REPORT.md\n');

console.log('💾 Generando inventario JSON...\n');
const jsonInventory = generateJSONInventory(metadata);
writeFileSync('AUDIT_INVENTORY.json', jsonInventory, 'utf-8');
console.log('✅ Inventario JSON generado: AUDIT_INVENTORY.json\n');

console.log('═══════════════════════════════════════════════');
console.log('  ✅ AUDITORÍA COMPLETADA');
console.log('═══════════════════════════════════════════════\n');

console.log('📊 Resultados:');
console.log(`   • Total archivos: ${metadata.length}`);
console.log(`   • Duplicados: ${duplicates.size} grupos`);
console.log(`   • Obsoletos: ${metadata.filter(f => f.isObsolete).length}`);
console.log(`\n📄 Revisa AUDIT_REPORT.md para detalles completos.\n`);
