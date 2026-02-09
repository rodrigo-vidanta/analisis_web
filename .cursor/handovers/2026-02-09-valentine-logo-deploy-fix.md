# HANDOVER-2026-02-09-VALENTINE-LOGO-DEPLOY-FIX

**Fecha**: 2026-02-09 | **Versión**: v2.10.0 (B10.1.44N2.10.0) | **Build**: deployed

## Contexto

Sesion con dos bloques: (1) Crear logo de San Valentin para el sistema de doodles, (2) Corregir bug en deploy-v2.ts que fallaba con comillas en commit messages y mejorar manejo de fallos parciales en el skill de deploy.

## Delta

| Bloque | Descripción |
|--------|-------------|
| 1 | Nuevo `ValentineLogo.tsx`: heartbeat sutil (scale 1→1.035→1, 3.2s), resplandor rosado pulsante (200x80px, blur 16px) |
| 2 | Al clic: 18 corazones SVG traslucidos (90-240px) suben como globos con oscilacion horizontal y desvanecimiento |
| 3 | Audio romantico 12.1s (Elevenlabs) al hacer clic |
| 4 | Registrado en LogoCatalog como tipo `valentine`, sugerencia automatica en febrero |
| 5 | Desactivada navegacion al home al clic en logo (Sidebar.tsx: removido `onClick={handleLogoClick}`) |
| 6 | Fix `deploy-v2.ts` linea 600: commit message usaba comillas dobles que rompian con caracteres como `"San Valentín"` |
| 7 | `generateAutoMessage` ahora sanitiza comillas y caracteres especiales de contextos de handovers |
| 8 | Skill `/deploy` actualizado con protocolo de recuperacion de 7 pasos para fallos parciales del script |
| 9 | Release notes actualizadas manualmente en BD (el script no las habia generado correctamente) |

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `src/components/logos/ValentineLogo.tsx` | Componente logo San Valentin (223 lineas) |
| `public/assets/logo_pqnc-valentine.png` | Imagen logo (136 KB, PQNC-feb2.png) |
| `public/assets/valentine-audio.mp3` | Audio romantico (291 KB, 12.1s) |

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/components/logos/LogoCatalog.tsx` | `LogoType` += `valentine`, entrada catalogo, `getSuggestedLogo()` febrero |
| `src/components/logos/index.ts` | Export `ValentineLogo` |
| `src/components/Sidebar.tsx` | Removido `onClick={handleLogoClick}` del logo |
| `scripts/deploy-v2.ts` | Sanitizacion comillas en `gitCommitPush` y `generateAutoMessage` |
| `.claude/skills/deploy/SKILL.md` | Protocolo recuperacion fallos parciales (7 pasos) |

## Decisiones Técnicas

- **Heartbeat 1 pulso**: `[1, 1.035, 1]` a 3.2s. Se probaron 4 keyframes pero generaba doble salto.
- **Resplandor con dimensiones explicitas**: `inset-0` no funcionaba (contenedor 46px). Se uso div 200x80px centrado.
- **Corazones 90-240px**: 3 iteraciones de tamaño (12-32 → 36-96 → 90-240px).
- **Deploy fix con comillas simples**: `git commit -m '${msg.replace(/'/g, "'\\''")}'` — escape POSIX correcto.
- **Sanitizacion doble**: En `gitCommitPush` (comillas dobles → simples) y en `generateAutoMessage` (quitar comillas tipograficas de handovers).

## Trampas y Gotchas

- El deploy-v2.ts fallo en paso 4/6 (git commit) pero ya habia modificado CHANGELOG.md, package.json y appVersion.ts en paso 3/6. Estos archivos quedaron staged. Al recuperar manualmente hay que verificar que el contenido auto-generado es correcto.
- Las release_notes en BD fueron actualizadas manualmente porque el script no completo la generacion del JSON. Siempre verificar BD post-deploy.
- `handleLogoClick` sigue definido en Sidebar.tsx (linea 592) pero ya no se pasa como prop. No se elimino la funcion para no tocar mas codigo del necesario.
- Los corazones usan `window.innerHeight` capturado al montar — no se recalcula si cambia el viewport.

## Deploy

- **v2.10.0** deployed: Git → AWS → BD
- Commit principal: `fe27ffd` (logo + modal reactivacion + VAPI setup)
- Commit fix: `a4ead7d` (sanitizacion deploy script + skill)
- BD: `app_version` con release_notes completas (Features + Mejoras)
