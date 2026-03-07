# Handover: Instalacion Plugin claude-mem

**Fecha:** 2026-03-07
**Tipo:** Infraestructura / Tooling
**Estado:** Completado

## Resumen

Se instalo el plugin **claude-mem** (v10.5.2) de [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) como memoria persistente global para Claude Code. Captura automaticamente todo lo que Claude hace en cada sesion, lo comprime con IA y lo inyecta como contexto en sesiones futuras.

## Que se hizo

1. **Marketplace agregado**: `claude plugin marketplace add thedotmack/claude-mem`
2. **Plugin instalado**: `claude plugin install claude-mem` (scope: `user` = global)
3. **Verificacion**: BD creada, worker PID activo, settings generados

## Arquitectura del Plugin

### Hooks (5 lifecycle events)

| Hook | Trigger | Funcion |
|------|---------|---------|
| `Setup` | Instalacion | Ejecuta `setup.sh` |
| `SessionStart` | startup/clear/compact | Smart install + worker start + context inject |
| `UserPromptSubmit` | Cada prompt | Session init |
| `PostToolUse` | Cada tool call | Captura observacion |
| `Stop` | Fin de sesion | Summarize + session-complete |

### Componentes

- **Worker Service**: HTTP API en `localhost:37777` (Bun runtime)
- **SQLite DB**: `~/.claude-mem/claude-mem.db` (sesiones + observaciones)
- **Chroma Vector DB**: Busqueda semantica + keyword (local, puerto 8000)
- **Web Viewer**: `http://localhost:37777` para explorar memoria

### Busqueda en 3 capas (token-efficient)

1. **Layer 1 (Index)**: `search` → resultados compactos con IDs (~50-100 tokens)
2. **Layer 2 (Context)**: `timeline` → contexto cronologico
3. **Layer 3 (Details)**: `get_observations` → contenido completo filtrado

## Configuracion

**Archivo**: `~/.claude-mem/settings.json`

| Setting | Valor |
|---------|-------|
| Modelo compresion | `claude-sonnet-4-5` |
| Auth | CLI (usa credenciales de Claude Code) |
| Puerto worker | 37777 |
| Observaciones max | 50 |
| Log level | INFO |
| Chroma | Enabled (local) |
| Observation types | bugfix, feature, refactor, discovery, decision, change |
| Concepts | how-it-works, why-it-exists, what-changed, problem-solution, gotcha, pattern, trade-off |

### Tools excluidos de captura
`ListMcpResourcesTool, SlashCommand, Skill, TodoWrite, AskUserQuestion`

## Archivos y rutas

| Que | Donde |
|-----|-------|
| Plugin cache | `~/.claude/plugins/cache/thedotmack/claude-mem/10.5.2/` |
| Marketplace | `~/.claude/plugins/marketplaces/thedotmack/` |
| Plugins instalados | `~/.claude/plugins/installed_plugins.json` |
| Datos + BD | `~/.claude-mem/` |
| Settings | `~/.claude-mem/settings.json` |
| Logs | `~/.claude-mem/logs/` |
| Worker PID | `~/.claude-mem/worker.pid` |
| Hooks | `~/.claude/plugins/cache/thedotmack/claude-mem/10.5.2/hooks/hooks.json` |

## Relacion con memoria existente

claude-mem **coexiste** con el sistema de auto-memory nativo de Claude Code (`~/.claude/projects/.../memory/MEMORY.md`):

- **MEMORY.md**: Manual, curado, siempre cargado en contexto. Bueno para reglas y patrones estables.
- **claude-mem**: Automatico, granular, busqueda semantica. Bueno para historial detallado de cambios y decisiones.

No se modifico ni reemplazo MEMORY.md. Ambos sistemas operan en paralelo.

## Requisitos del sistema

- Node.js 18+ (instalado: v24.6.0)
- Bun (auto-instalado por el plugin)
- uv Python (auto-instalado por el plugin)
- SQLite 3 (bundled)

## Notas importantes

- **Scope `user`**: Aplica a TODAS las sesiones y proyectos globalmente
- **No requiere config por proyecto**: Funciona out-of-the-box tras reiniciar Claude Code
- **Privacidad**: Soporta tags `<private>` para excluir contenido sensible
- **Costo**: Usa claude-sonnet-4-5 para comprimir observaciones (consumo de tokens adicional)
- **Licencia**: AGPL-3.0 (ragtime/ tiene PolyForm Noncommercial separada)
