#!/usr/bin/env tsx
/**
 * Deploy v2 - Semantic Versioning Automatizado
 *
 * Auto-detecta tipo de cambio desde conventional commits.
 * Mantiene formato dual B{backend}N{frontend}.
 * Output JSON para integracion con Claude Code.
 *
 * Uso:
 *   tsx scripts/deploy-v2.ts                    # Auto-detect
 *   tsx scripts/deploy-v2.ts --patch "mensaje"  # Forzar patch
 *   tsx scripts/deploy-v2.ts --minor "mensaje"  # Forzar minor
 *   tsx scripts/deploy-v2.ts --major "mensaje"  # Forzar major
 *   tsx scripts/deploy-v2.ts --dry-run          # Preview sin ejecutar
 *   tsx scripts/deploy-v2.ts --json             # Output JSON (para Claude Code)
 *   tsx scripts/deploy-v2.ts --skip-aws         # Omitir deploy AWS
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// ============================================
// TYPES
// ============================================

type BumpType = 'none' | 'patch' | 'minor' | 'major';

interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
}

interface DualVersion {
  backend: SemanticVersion;
  frontend: SemanticVersion;
}

interface CommitInfo {
  hash: string;
  message: string;
  files: string[];
  type: string;
  scope: string;
  breaking: boolean;
  description: string;
}

interface HandoverInfo {
  filename: string;
  ref: string;
  date: string;
  context: string;
  delta: string[];
  migrations: string[];
}

interface DeployOptions {
  forceBump?: BumpType;
  message?: string;
  dryRun: boolean;
  jsonOutput: boolean;
  skipAws: boolean;
}

interface DeployResult {
  success: boolean;
  version: {
    previous: string;
    new: string;
    frontendBump: BumpType;
    backendBump: BumpType;
  };
  git: {
    commitHash: string;
    branch: string;
    commitMessage: string;
    commitCount: number;
  };
  aws: {
    deployed: boolean;
    duration: number;
  };
  changelog: {
    entriesAdded: number;
    categories: Record<string, number>;
  };
  database: {
    table: string;
    key: string;
    value: string;
    sqlQuery: string;
  };
  commits: Array<{ hash: string; type: string; description: string }>;
  handovers: HandoverInfo[];
  timestamp: string;
  dryRun: boolean;
}

// ============================================
// LOGGING (stderr para no contaminar JSON stdout)
// ============================================

function log(message: string, color: string = '\x1b[0m') {
  process.stderr.write(`${color}${message}\x1b[0m\n`);
}

const LOG = {
  info: (msg: string) => log(msg, '\x1b[36m'),
  success: (msg: string) => log(msg, '\x1b[32m'),
  warn: (msg: string) => log(msg, '\x1b[33m'),
  error: (msg: string) => log(msg, '\x1b[31m'),
  step: (msg: string) => log(msg, '\x1b[34m'),
};

// ============================================
// SHELL EXECUTION
// ============================================

function exec(command: string, opts: { silent?: boolean } = {}): string {
  try {
    const result = execSync(command, {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: opts.silent ? 'pipe' : ['pipe', 'pipe', 'pipe'],
    });
    return (result || '').trim();
  } catch (err: unknown) {
    const error = err as { message?: string; stderr?: string };
    throw new Error(`Comando fallido: ${command}\n${error.stderr || error.message || 'Unknown error'}`);
  }
}

function execSafe(command: string): string {
  try {
    return exec(command, { silent: true });
  } catch {
    return '';
  }
}

// ============================================
// VERSION PARSING
// ============================================

function parseSemanticVersion(raw: string): SemanticVersion {
  const parts = raw.split('.');
  return {
    major: parseInt(parts[0] || '0', 10),
    minor: parseInt(parts[1] || '0', 10),
    patch: parseInt(parts[2] || '0', 10),
  };
}

function parseDualVersion(raw: string): DualVersion {
  const match = raw.match(/^B([\d.]+)N([\d.]+)$/);
  if (!match) throw new Error(`Version invalida: ${raw}. Formato esperado: B10.1.44N2.5.93`);
  return {
    backend: parseSemanticVersion(match[1]),
    frontend: parseSemanticVersion(match[2]),
  };
}

function serializeVersion(v: SemanticVersion): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

function serializeDualVersion(v: DualVersion): string {
  return `B${serializeVersion(v.backend)}N${serializeVersion(v.frontend)}`;
}

function bumpVersion(v: SemanticVersion, type: BumpType): SemanticVersion {
  switch (type) {
    case 'major': return { major: v.major + 1, minor: 0, patch: 0 };
    case 'minor': return { ...v, minor: v.minor + 1, patch: 0 };
    case 'patch': return { ...v, patch: v.patch + 1 };
    default: return { ...v };
  }
}

// ============================================
// CURRENT VERSION
// ============================================

function getCurrentVersion(): string {
  const content = readFileSync(join(ROOT_DIR, 'src/config/appVersion.ts'), 'utf-8');
  const match = content.match(/export const APP_VERSION = ['"]([^'"]+)['"];/);
  if (!match) throw new Error('No se encontro APP_VERSION en appVersion.ts');
  return match[1];
}

// ============================================
// HANDOVER READING
// ============================================

function getLastDeployDate(): string {
  // Fecha del ultimo commit de release
  const result = execSafe('git log --all -100 --format="%aI %s"');
  for (const line of result.split('\n')) {
    if (/v\d+\.\d+\.\d+: B\d+\.\d+\.\d+N\d+\.\d+\.\d+/.test(line)) {
      return line.split('T')[0]; // YYYY-MM-DD
    }
  }
  // Fallback: 7 dias atras
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

function getRecentHandovers(): HandoverInfo[] {
  const handoverDir = join(ROOT_DIR, '.cursor/handovers');
  if (!existsSync(handoverDir)) return [];

  const lastDeployDate = getLastDeployDate();
  const handovers: HandoverInfo[] = [];

  const files = readdirSync(handoverDir)
    .filter(f => f.endsWith('.md'))
    .filter(f => {
      // Solo handovers mas nuevos que el ultimo deploy
      // Formato: YYYY-MM-DD-descripcion.md
      const dateMatch = f.match(/^(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) return false;
      return dateMatch[1] >= lastDeployDate;
    })
    // Excluir handovers de deploy anteriores
    .filter(f => !f.includes('-deploy-v'))
    .sort();

  for (const file of files) {
    try {
      const content = readFileSync(join(handoverDir, file), 'utf-8');
      const handover = parseHandover(file, content);
      if (handover) handovers.push(handover);
    } catch {
      // Skip archivos que no se puedan leer
    }
  }

  return handovers;
}

function parseHandover(filename: string, content: string): HandoverInfo | null {
  // Extraer REF (primera linea que empiece con # HANDOVER-)
  const refMatch = content.match(/^#\s*(HANDOVER-[\w-]+)/m);
  const ref = refMatch ? refMatch[1] : filename.replace('.md', '');

  // Extraer fecha
  const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch ? dateMatch[1] : '';

  // Extraer Contexto (seccion ## Contexto)
  const contextMatch = content.match(/## Contexto\n\n([^\n]+)/);
  const context = contextMatch ? contextMatch[1].trim() : '';

  if (!context) return null; // Skip handovers sin contexto util

  // Extraer Delta (filas de tabla | Bloque | Descripcion |)
  const delta: string[] = [];
  const deltaSection = content.match(/## Delta\n\n[\s\S]*?\n((?:\|[^|]+\|[^|]+\|\n)+)/);
  if (deltaSection) {
    for (const line of deltaSection[1].split('\n')) {
      const rowMatch = line.match(/\|\s*\d+\s*\|\s*(.+?)\s*\|/);
      if (rowMatch) delta.push(rowMatch[1].trim());
    }
  }

  // Extraer Migraciones SQL
  const migrations: string[] = [];
  const migSection = content.match(/## Migraciones SQL\n\n[\s\S]*?\n((?:\|[^|]+\|[^|]+\|[^|]+\|\n)+)/);
  if (migSection) {
    for (const line of migSection[1].split('\n')) {
      const rowMatch = line.match(/\|\s*[\w-]*\s*\|\s*(\w+)\s*\|\s*(.+?)\s*\|/);
      if (rowMatch) migrations.push(`${rowMatch[1]}: ${rowMatch[2]}`);
    }
  }

  return { filename, ref, date, context, delta, migrations };
}

// ============================================
// COMMIT ANALYSIS
// ============================================

function getLastDeployHash(): string {
  // Buscar ultimo commit de release (patron: vX.X.X: BX.X.XNX.X.X)
  const result = execSafe('git log --oneline --all -100 --format="%H %s"');
  const lines = result.split('\n');
  for (const line of lines) {
    if (/v\d+\.\d+\.\d+: B\d+\.\d+\.\d+N\d+\.\d+\.\d+/.test(line)) {
      return line.split(' ')[0].substring(0, 7);
    }
  }
  // Fallback: 20 commits atras
  return execSafe('git rev-parse --short HEAD~20') || 'HEAD~20';
}

function getCommitsSinceLastDeploy(): CommitInfo[] {
  const lastDeployHash = getLastDeployHash();
  const SEP = '|||';
  const FORMAT = `%h${SEP}%s`;

  const raw = execSafe(`git log ${lastDeployHash}..HEAD --format="${FORMAT}"`);
  if (!raw) return [];

  const commits: CommitInfo[] = [];

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const [hash, message] = line.split(SEP);
    if (!hash || !message) continue;

    // Skip deploy commits y hash fixes
    if (message.includes('Actualizar hash commit') || /^v\d+\.\d+\.\d+: B/.test(message)) continue;

    // Parse conventional commit
    const parsed = parseConventionalCommit(message);

    // Obtener archivos cambiados
    const files = execSafe(`git diff-tree --no-commit-id --name-only -r ${hash}`).split('\n').filter(Boolean);

    commits.push({
      hash,
      message,
      files,
      ...parsed,
    });
  }

  return commits;
}

function parseConventionalCommit(message: string): { type: string; scope: string; breaking: boolean; description: string } {
  // Patrones: feat(scope): desc | fix!: desc | BREAKING CHANGE: desc
  const match = message.match(/^(\w+)(?:\(([^)]+)\))?(!)?\s*:\s*(.+)$/);

  if (match) {
    return {
      type: match[1].toLowerCase(),
      scope: match[2] || '',
      breaking: match[3] === '!' || message.includes('BREAKING CHANGE'),
      description: match[4].trim(),
    };
  }

  // No es conventional commit -> tratar como patch
  return {
    type: 'chore',
    scope: '',
    breaking: false,
    description: message.trim(),
  };
}

function hasBackendChanges(files: string[]): boolean {
  const backendPatterns = [
    'supabase/functions/',
    'scripts/sql/',
    'migrations/',
    'supabase/migrations/',
  ];
  return files.some(f => backendPatterns.some(p => f.startsWith(p)));
}

function detectBumpType(commits: CommitInfo[]): { frontend: BumpType; backend: BumpType } {
  let frontendBump: BumpType = 'none';
  let backendBump: BumpType = 'none';

  const bumpPriority: Record<BumpType, number> = { none: 0, patch: 1, minor: 2, major: 3 };

  const typeToBump: Record<string, BumpType> = {
    fix: 'patch',
    style: 'patch',
    refactor: 'patch',
    chore: 'patch',
    docs: 'patch',
    test: 'patch',
    debug: 'patch',
    ci: 'patch',
    build: 'patch',
    feat: 'minor',
    perf: 'minor',
  };

  for (const commit of commits) {
    const commitBump = commit.breaking ? 'major' : (typeToBump[commit.type] || 'patch');

    // Frontend siempre recibe el bump
    if (bumpPriority[commitBump] > bumpPriority[frontendBump]) {
      frontendBump = commitBump;
    }

    // Backend solo si hay cambios en archivos de backend
    if (hasBackendChanges(commit.files)) {
      const backendScope = ['db', 'rpc', 'edge', 'supabase', 'sql', 'migration'].includes(commit.scope);
      if (backendScope || hasBackendChanges(commit.files)) {
        if (bumpPriority[commitBump] > bumpPriority[backendBump]) {
          backendBump = commitBump;
        }
      }
    }
  }

  // Si no hay commits, al menos patch
  if (frontendBump === 'none' && commits.length > 0) frontendBump = 'patch';
  if (frontendBump === 'none') frontendBump = 'patch'; // Default si se invoca sin commits

  return { frontend: frontendBump, backend: backendBump };
}

// ============================================
// FILE UPDATES
// ============================================

function updateAppVersionFile(newVersion: string): void {
  const path = join(ROOT_DIR, 'src/config/appVersion.ts');
  let content = readFileSync(path, 'utf-8');

  const today = new Date().toISOString().split('T')[0];
  content = content.replace(
    /\* Actualizado: .+/,
    `* Actualizado: ${today}`
  );
  content = content.replace(
    /export const APP_VERSION = ['"][^'"]+['"];/,
    `export const APP_VERSION = '${newVersion}';`
  );

  writeFileSync(path, content, 'utf-8');
}

function updatePackageJson(frontendVersion: string): void {
  const path = join(ROOT_DIR, 'package.json');
  const pkg = JSON.parse(readFileSync(path, 'utf-8'));
  if (pkg.version !== frontendVersion) {
    pkg.version = frontendVersion;
    writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  }
}

function updateDocumentationModule(version: string, hash: string, message: string): void {
  const path = join(ROOT_DIR, 'src/components/documentation/DocumentationModule.tsx');
  let content = readFileSync(path, 'utf-8');

  const numericVersion = version.split('N')[1];
  const today = new Date().toISOString().split('T')[0];
  const todayFormatted = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const deployTime = new Date().toLocaleString('es-ES', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  });

  // Actualizar stats
  content = content.replace(
    /const stats = \[\n\s+\{ label: 'Version', value: '[^']+', highlight: true \},\n\s+\{ label: 'Release', value: '[^']+', highlight: false \},\n\s+\{ label: 'Documentos', value: '[^']+', highlight: true \},\n\s+\{ label: 'Ultima actualizacion', value: '[^']+', highlight: false \},\n\];/,
    `const stats = [\n  { label: 'Version', value: 'v${numericVersion}', highlight: true },\n  { label: 'Release', value: '${version}', highlight: false },\n  { label: 'Documentos', value: '32', highlight: true },\n  { label: 'Ultima actualizacion', value: '${todayFormatted}', highlight: false },\n];`
  );

  // Agregar commit al gitCommits
  const shortMsg = message.length > 80 ? message.substring(0, 77) + '...' : message;
  const commitEntry = `  { hash: '${hash}', date: '${today}', author: 'Team', message: 'v${numericVersion}: ${version} - ${shortMsg}', isRelease: true },`;

  if (!content.includes(`hash: '${hash}'`)) {
    content = content.replace(
      /const gitCommits: GitCommit\[\] = \[/,
      `const gitCommits: GitCommit[] = [\n${commitEntry}`
    );
  }

  // Agregar deployment
  const deployId = `deploy-${Date.now().toString().slice(-3)}`;
  const deployEntry = `  { id: '${deployId}', date: '${deployTime}', version: '${version}', status: 'success', duration: '25s', triggeredBy: 'Samuel Rosales', environment: 'Production' },`;

  content = content.replace(
    /const awsDeployments: AWSDeployment\[\] = \[/,
    `const awsDeployments: AWSDeployment[] = [\n${deployEntry}`
  );

  writeFileSync(path, content, 'utf-8');
}

function generateReleaseNotes(commits: CommitInfo[], handovers: HandoverInfo[]): Array<{ type: string; items: string[] }> {
  const grouped: Record<string, string[]> = {};
  for (const c of commits) {
    const cat = c.type === 'feat' ? 'Features'
      : c.type === 'fix' ? 'Bug Fixes'
      : c.type === 'perf' ? 'Performance'
      : c.type === 'refactor' ? 'Refactoring'
      : 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(c.description);
  }

  // Extraer items relevantes de handovers como highlights
  for (const h of handovers) {
    for (const d of h.delta) {
      // Solo incluir deltas cortos y significativos (no detalles tecnicos largos)
      if (d.length <= 120 && !grouped['Features']?.includes(d) && !grouped['Bug Fixes']?.includes(d)) {
        const cat = d.toLowerCase().startsWith('fix') ? 'Bug Fixes' : 'Mejoras';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(d);
      }
    }
  }

  // Orden de prioridad para mostrar
  const order = ['Features', 'Bug Fixes', 'Mejoras', 'Performance', 'Refactoring', 'Other'];
  return order
    .filter(type => grouped[type] && grouped[type].length > 0)
    .map(type => ({ type, items: grouped[type] }));
}

function updateChangelog(version: string, commits: CommitInfo[], message: string, handovers: HandoverInfo[]): void {
  const path = join(ROOT_DIR, 'CHANGELOG.md');
  const numericVersion = version.split('N')[1];
  const today = new Date().toISOString().split('T')[0];

  // Agrupar commits por tipo
  const categories: Record<string, string[]> = {};
  for (const c of commits) {
    const cat = c.type === 'feat' ? 'Features'
      : c.type === 'fix' ? 'Bug Fixes'
      : c.type === 'perf' ? 'Performance'
      : c.type === 'refactor' ? 'Refactoring'
      : c.type === 'style' ? 'Styles'
      : c.type === 'docs' ? 'Documentation'
      : 'Other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(`- ${c.description} (\`${c.hash}\`)`);
  }

  // Generar entry
  let entry = `## [v${numericVersion}] - ${today}\n\n`;
  entry += `**${version}** - ${message}\n\n`;

  // Incluir contexto de handovers
  if (handovers.length > 0) {
    entry += `### Sesiones de trabajo\n`;
    for (const h of handovers) {
      entry += `- **${h.ref}**: ${h.context}\n`;
      for (const d of h.delta) {
        entry += `  - ${d}\n`;
      }
    }
    entry += `\n`;

    // Migraciones de handovers
    const allMigrations = handovers.flatMap(h => h.migrations);
    if (allMigrations.length > 0) {
      entry += `### Migraciones SQL\n`;
      for (const m of allMigrations) {
        entry += `- ${m}\n`;
      }
      entry += `\n`;
    }
  }

  for (const [cat, items] of Object.entries(categories)) {
    entry += `### ${cat}\n${items.join('\n')}\n\n`;
  }

  entry += `---\n\n`;

  // Prepend al CHANGELOG
  if (existsSync(path)) {
    const existing = readFileSync(path, 'utf-8');
    writeFileSync(path, entry + existing, 'utf-8');
  } else {
    writeFileSync(path, `# Changelog\n\n${entry}`, 'utf-8');
  }
}

function syncDocumentation(): void {
  const commands = [
    'cp CHANGELOG.md public/docs/ 2>/dev/null || true',
    'cp VERSIONS.md public/docs/ 2>/dev/null || true',
    'cp docs/*.md public/docs/ 2>/dev/null || true',
  ];
  commands.forEach(cmd => execSafe(cmd));
}

// ============================================
// DEPLOY STEPS
// ============================================

function gitCommitPush(version: string, message: string): string {
  const numericVersion = version.split('N')[1];
  const commitMsg = `v${numericVersion}: ${version} - ${message}`;

  // Stage todo excepto DocumentationModule (lo agregaremos despues del amend)
  exec('git add -A', { silent: true });

  // Primer commit
  exec(`git commit -m "${commitMsg}"`, { silent: true });

  // Leer hash real
  const hash = exec('git rev-parse --short HEAD', { silent: true });

  // Actualizar DocumentationModule con el hash correcto
  updateDocumentationModule(version, hash, message);

  // Amend el commit con DocumentationModule actualizado
  exec('git add src/components/documentation/DocumentationModule.tsx', { silent: true });
  exec('git commit --amend --no-edit', { silent: true });

  // Push
  exec('git push origin HEAD', { silent: true });

  return hash;
}

function deployAWS(): number {
  const start = Date.now();
  exec('./update-frontend.sh');
  return Math.round((Date.now() - start) / 1000);
}

// ============================================
// CLI PARSING
// ============================================

function parseArgs(): DeployOptions {
  const args = process.argv.slice(2);
  const options: DeployOptions = {
    dryRun: false,
    jsonOutput: false,
    skipAws: false,
  };

  let messageArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--dry-run': options.dryRun = true; break;
      case '--json': options.jsonOutput = true; break;
      case '--skip-aws': options.skipAws = true; break;
      case '--patch': options.forceBump = 'patch'; break;
      case '--minor': options.forceBump = 'minor'; break;
      case '--major': options.forceBump = 'major'; break;
      default:
        if (!arg.startsWith('--')) messageArgs.push(arg);
        break;
    }
  }

  if (messageArgs.length > 0) {
    options.message = messageArgs.join(' ');
  }

  return options;
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  const options = parseArgs();

  LOG.step('\n========================================');
  LOG.step('  DEPLOY v2 - Semantic Versioning');
  LOG.step('========================================\n');

  // 1. Leer version actual
  const currentVersionStr = getCurrentVersion();
  const currentVersion = parseDualVersion(currentVersionStr);
  LOG.info(`Version actual: ${currentVersionStr}`);

  // 2. Analizar commits + handovers
  LOG.step('\n[1/6] Analizando commits y handovers...');
  const commits = getCommitsSinceLastDeploy();
  const handovers = getRecentHandovers();
  LOG.info(`  Commits encontrados: ${commits.length}`);
  LOG.info(`  Handovers recientes: ${handovers.length}`);

  if (commits.length === 0) {
    LOG.warn('  No hay commits nuevos desde el ultimo deploy');
  }

  for (const c of commits) {
    LOG.info(`  ${c.type}${c.scope ? `(${c.scope})` : ''}: ${c.description} [${c.hash}]`);
  }

  for (const h of handovers) {
    LOG.info(`  [handover] ${h.ref}: ${h.context.substring(0, 80)}`);
  }

  // 3. Determinar bump type
  LOG.step('\n[2/6] Calculando version...');
  const detectedBump = detectBumpType(commits);

  const frontendBump: BumpType = options.forceBump || detectedBump.frontend;
  const backendBump: BumpType = detectedBump.backend;

  LOG.info(`  Frontend bump: ${frontendBump}${options.forceBump ? ' (forzado)' : ' (auto-detectado)'}`);
  LOG.info(`  Backend bump: ${backendBump}${backendBump === 'none' ? ' (sin cambios BD)' : ' (auto-detectado)'}`);

  // 4. Calcular nueva version
  const newVersion: DualVersion = {
    backend: bumpVersion(currentVersion.backend, backendBump),
    frontend: bumpVersion(currentVersion.frontend, frontendBump),
  };
  const newVersionStr = serializeDualVersion(newVersion);
  const numericVersion = serializeVersion(newVersion.frontend);

  LOG.success(`  ${currentVersionStr} -> ${newVersionStr}`);

  // 5. Generar mensaje
  const message = options.message || generateAutoMessage(commits, frontendBump, handovers);
  LOG.info(`  Mensaje: ${message}`);

  // Conteo por categorias
  const categories: Record<string, number> = {};
  for (const c of commits) {
    categories[c.type] = (categories[c.type] || 0) + 1;
  }

  // Generar release notes para BD
  const releaseNotes = generateReleaseNotes(commits, handovers);

  // DRY RUN: solo mostrar resultado
  if (options.dryRun) {
    LOG.warn('\n  ** DRY RUN - No se ejecutaran cambios **\n');

    const configValue = { version: newVersionStr, force_update: true, release_notes: releaseNotes };
    const newHistoryEntry = { version: newVersionStr, release_notes: releaseNotes, message: message.replace(/'/g, "''"), deployed_at: new Date().toISOString() };
    const versionHistorySql = `UPDATE system_config SET config_value = (SELECT jsonb_path_query_array(('${JSON.stringify([newHistoryEntry])}'::jsonb || config_value)::jsonb, '$[0 to 4]') FROM system_config WHERE config_key = 'version_history'), updated_at = NOW() WHERE config_key = 'version_history';`;
    const result: DeployResult = {
      success: true,
      version: { previous: currentVersionStr, new: newVersionStr, frontendBump, backendBump },
      git: { commitHash: 'dry-run', branch: execSafe('git branch --show-current'), commitMessage: `v${numericVersion}: ${newVersionStr} - ${message}`, commitCount: commits.length },
      aws: { deployed: false, duration: 0 },
      changelog: { entriesAdded: commits.length, categories },
      database: {
        table: 'system_config',
        key: 'app_version',
        value: JSON.stringify(configValue),
        sqlQuery: `UPDATE system_config SET config_value = '${JSON.stringify(configValue)}'::jsonb, updated_at = NOW() WHERE config_key = 'app_version'; ${versionHistorySql}`,
      },
      commits: commits.map(c => ({ hash: c.hash, type: c.type, description: c.description })),
      handovers,
      timestamp: new Date().toISOString(),
      dryRun: true,
    };

    if (options.jsonOutput) {
      process.stdout.write(JSON.stringify(result, null, 2));
    } else {
      LOG.step('\nResultado (preview):');
      LOG.info(`  Version: ${currentVersionStr} -> ${newVersionStr}`);
      LOG.info(`  Frontend: ${frontendBump} | Backend: ${backendBump}`);
      LOG.info(`  Commits: ${commits.length}`);
      LOG.info(`  Handovers: ${handovers.length}`);
      LOG.info(`  Mensaje: ${message}`);
      if (handovers.length > 0) {
        LOG.info(`\n  Contexto de sesiones:`);
        for (const h of handovers) LOG.info(`    - ${h.ref}: ${h.context.substring(0, 60)}`);
      }
      LOG.info(`\n  SQL para BD:`);
      LOG.info(`  ${result.database.sqlQuery}`);
    }
    return;
  }

  // EJECUCION REAL
  LOG.step('\n[3/6] Actualizando archivos...');
  syncDocumentation();
  updateAppVersionFile(newVersionStr);
  updatePackageJson(numericVersion);
  updateChangelog(newVersionStr, commits, message, handovers);
  LOG.success('  Archivos actualizados');

  LOG.step('\n[4/6] Git commit + push...');
  const commitHash = gitCommitPush(newVersionStr, message);
  LOG.success(`  Commit: ${commitHash}`);

  let awsDuration = 0;
  if (!options.skipAws) {
    LOG.step('\n[5/6] Deploy AWS...');
    awsDuration = deployAWS();
    LOG.success(`  AWS deploy: ${awsDuration}s`);
  } else {
    LOG.warn('\n[5/6] AWS deploy omitido (--skip-aws)');
  }

  LOG.step('\n[6/6] Generando resultado...');

  const configValueReal = { version: newVersionStr, force_update: true, release_notes: releaseNotes };
  const newHistoryEntryReal = { version: newVersionStr, release_notes: releaseNotes, message: message.replace(/'/g, "''"), deployed_at: new Date().toISOString() };
  const versionHistorySqlReal = `UPDATE system_config SET config_value = (SELECT jsonb_path_query_array(('${JSON.stringify([newHistoryEntryReal])}'::jsonb || config_value)::jsonb, '$[0 to 4]') FROM system_config WHERE config_key = 'version_history'), updated_at = NOW() WHERE config_key = 'version_history';`;
  const result: DeployResult = {
    success: true,
    version: { previous: currentVersionStr, new: newVersionStr, frontendBump, backendBump },
    git: { commitHash, branch: execSafe('git branch --show-current'), commitMessage: `v${numericVersion}: ${newVersionStr} - ${message}`, commitCount: commits.length },
    aws: { deployed: !options.skipAws, duration: awsDuration },
    changelog: { entriesAdded: commits.length, categories },
    database: {
      table: 'system_config',
      key: 'app_version',
      value: JSON.stringify(configValueReal),
      sqlQuery: `UPDATE system_config SET config_value = '${JSON.stringify(configValueReal)}'::jsonb, updated_at = NOW() WHERE config_key = 'app_version'; ${versionHistorySqlReal}`,
    },
    commits: commits.map(c => ({ hash: c.hash, type: c.type, description: c.description })),
    handovers,
    timestamp: new Date().toISOString(),
    dryRun: false,
  };

  if (options.jsonOutput) {
    process.stdout.write(JSON.stringify(result, null, 2));
  } else {
    LOG.step('\n========================================');
    LOG.success(`  DEPLOY COMPLETADO: ${newVersionStr}`);
    LOG.step('========================================');
    LOG.info(`  Version: ${currentVersionStr} -> ${newVersionStr}`);
    LOG.info(`  Commit: ${commitHash}`);
    LOG.info(`  AWS: ${options.skipAws ? 'omitido' : `${awsDuration}s`}`);
    LOG.info(`  Commits incluidos: ${commits.length}`);
    LOG.info(`  Handovers incluidos: ${handovers.length}`);
    LOG.warn(`\n  BD: Ejecutar via MCP Supabase:`);
    LOG.warn(`  ${result.database.sqlQuery}`);
  }
}

function generateAutoMessage(commits: CommitInfo[], bump: BumpType, handovers: HandoverInfo[]): string {
  const parts: string[] = [];

  // Resumen de commits
  const feats = commits.filter(c => c.type === 'feat');
  const fixes = commits.filter(c => c.type === 'fix');
  const others = commits.filter(c => !['feat', 'fix'].includes(c.type));

  if (feats.length > 0) parts.push(`${feats.length} feature${feats.length > 1 ? 's' : ''}`);
  if (fixes.length > 0) parts.push(`${fixes.length} fix${fixes.length > 1 ? 'es' : ''}`);
  if (others.length > 0) parts.push(`${others.length} mejora${others.length > 1 ? 's' : ''}`);

  // Contexto de handovers (resumen breve)
  if (handovers.length > 0) {
    const handoverContexts = handovers.map(h => {
      // Tomar primera oracion significativa del contexto
      const short = h.context.split('.')[0].substring(0, 50);
      return short;
    });
    parts.push(handoverContexts.join(' + '));
  }

  return parts.join(' + ') || 'Deploy automatico';
}

main().catch((err: unknown) => {
  const error = err as Error;
  LOG.error(`\nError fatal: ${error.message}`);
  process.exit(1);
});
