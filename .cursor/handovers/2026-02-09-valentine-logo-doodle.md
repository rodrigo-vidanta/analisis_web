# HANDOVER-2026-02-09-VALENTINE-LOGO

**Fecha**: 2026-02-09 | **Versión**: v2.8.3 (sin deploy) | **Build**: tsc + vite ok

## Contexto

Nuevo logo de temporada "San Valentín" para el sistema de doodles (estilo Google Doodles) en la sección Administración > Preferencias > Logos Personalizados. 5to logo del catálogo.

## Delta

| Bloque | Descripción |
|--------|-------------|
| 1 | Nuevo componente `ValentineLogo` con heartbeat sutil en loop (scale 1→1.035→1, ciclo 3.2s) |
| 2 | Resplandor rosado pulsante detrás del logo (radial-gradient, blur 16px, 200x80px centrado) |
| 3 | Al hacer clic: 18 corazones traslúcidos SVG (90-240px) suben desde el fondo de pantalla como globos |
| 4 | Corazones con movimiento oscilatorio horizontal, rotación leve y desvanecimiento progresivo al subir |
| 5 | Audio romántico (12.1s, vol 0.5) reproducido al hacer clic |
| 6 | Registrado en `LogoCatalog` como tipo `'valentine'` con sugerencia automática en febrero |

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `src/components/logos/ValentineLogo.tsx` | Componente principal (223 líneas) |
| `public/assets/logo_pqnc-valentine.png` | Imagen del logo (136 KB, reemplazada con PQNC-feb2.png) |
| `public/assets/valentine-audio.mp3` | Audio romántico Elevenlabs (291 KB, 12.1s) |

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/components/logos/LogoCatalog.tsx` | `LogoType` += `'valentine'`, entrada en `LOGO_CATALOG`, `getSuggestedLogo()` retorna `'valentine'` en febrero (month === 1) |
| `src/components/logos/index.ts` | Export de `ValentineLogo` |

## Decisiones Técnicas

- **Heartbeat de 1 pulso**: Se probó con 4 keyframes (`[1, 1.03, 1, 0.98, 1]`) pero generaba efecto de doble salto antinatural. Se simplificó a `[1, 1.035, 1]` con ciclo de 3.2s.
- **Resplandor con dimensiones explícitas**: Usar `inset-0` no funcionaba porque el contenedor es solo 46px de alto. Se usó div absoluto de 200x80px centrado con margin negativo para que el glow sea visible.
- **Corazones grandes (90-240px)**: Se iteró 3 veces el tamaño: 12-32px → 36-96px → 90-240px. El tamaño final da presencia visual sin saturar.
- **Corazones como SVG inline**: Se usa un `HeartShape` SVG con path en vez de emoji para control total de color y tamaño.
- **Oscilación tipo globo**: Cada corazón tiene `oscillationAmplitude` (15-40px) y `oscillationSpeed` (1.5-3s) independientes, con `repeat` calculado para cubrir toda la duración de subida.
- **z-index 9999 en FloatingHearts**: Contenedor `fixed inset-0` para que los corazones suban por toda la pantalla, no solo el sidebar.
- **Temporada febrero completo**: `getSuggestedLogo()` retorna `'valentine'` para todo febrero (`month === 1`), `availableFrom/Until`: Feb 1-28 2026.

## Trampas y Gotchas

- Los corazones usan `window.innerHeight` en el array de animate — si la ventana cambia de tamaño durante la animación, los valores no se recalculan (es un one-shot).
- `useMemo` en `generateHearts()` con `[]` deps: los corazones se generan una vez por montaje. Si el usuario hace clic múltiples veces, el `setShowHearts(true)` desmonta y remonta con nuevas posiciones random.
- El `timeoutRef` se limpia antes de cada nuevo clic para evitar que un timeout anterior cierre la animación prematuramente.
- Audio se inicializa lazy (primer clic) para evitar errores de autoplay del navegador.

## Patrón de Logo (referencia para futuros doodles)

```
interface LogoProps { onClick?: () => void; isCollapsed?: boolean; }
Altura estándar: 46px | Margin: top 2px, left 8px
Audio: useRef lazy init, volume 0.5-0.6, .catch(() => {})
Registro: LogoType union + LOGO_CATALOG entry + getSuggestedLogo() + index.ts export
Assets: public/assets/logo_pqnc-{name}.png + {name}-audio.mp3
```
