# Handover: Login Animations — Doodles Interactivos + Fix Remotion Responsivo

**Fecha:** 2026-03-07
**Sesion:** Mejora visual de pantalla de login
**Estado:** Completado, sin deploy

---

## Resumen

Se realizaron dos mejoras en las animaciones de la pantalla de login:

1. **Fix Remotion responsivo**: La animacion Neural Constellation no se ajustaba a pantallas con aspect ratio distinto a 16:9 (dejaba barras negras). Se corrigio con calculo tipo `object-fit: cover`.
2. **Doodles Interactivos**: Nueva animacion de login con 3 personajes SVG que reaccionan interactivamente a las acciones del usuario en el formulario.

---

## Cambios Realizados

### 1. Fix RemotionLoginBackground (responsividad)

**Archivo:** `src/components/login/remotion/RemotionLoginBackground.tsx`

**Problema:** El `Player` de Remotion usaba `width: 100%, height: 100%` que mantenia el aspect ratio 16:9 fijo, dejando espacios vacios en pantallas no-16:9.

**Solucion:**
- Listener de `resize` en window para detectar cambios de viewport
- Calculo dinamico de dimensiones tipo `object-fit: cover` (siempre cubre 100% del viewport)
- Centrado con `translate(-50%, -50%)` para recorte simetrico
- `overflow: hidden` en contenedor para ocultar excedente

**Detalle tecnico:**
```typescript
const viewportAspect = viewport.w / viewport.h;
const width = viewportAspect > COMP_ASPECT ? viewport.w : viewport.h * COMP_ASPECT;
const height = viewportAspect > COMP_ASPECT ? viewport.w / COMP_ASPECT : viewport.h;
```

### 2. Doodles Interactivos (nueva animacion)

**Archivos creados:**
- `src/components/login/doodles/types.ts` — tipos: `DoodleInteraction`, `DoodleExpression`, `DoodleConfig`
- `src/components/login/doodles/Doodle.tsx` — componente SVG individual con ojos, boca, parpados, cejas, mejillas
- `src/components/login/doodles/DoodleLoginBackground.tsx` — layout con 3 doodles posicionados + logica de expresion

**Archivos modificados:**
- `src/hooks/useSystemConfig.ts` — `LoginAnimationType` ahora incluye `'doodles'`
- `src/components/LoginScreen.tsx` — estado de interaccion + handlers de mouse/focus/keydown/error
- `src/components/admin/SystemPreferences.tsx` — opcion "Doodles Interactivos" en selector de animacion

---

## Arquitectura de Doodles

### Flujo de datos

```
LoginScreen (estado + handlers)
  |
  |-- onMouseMove → mouseX/mouseY normalizados (0-1) via rAF
  |-- onFocus email → activeField: 'email'
  |-- onFocus password → activeField: 'password'
  |-- onBlur → activeField: 'none'
  |-- onKeyDown email (Backspace/Delete) → isTypingError: true (1.2s timeout)
  |-- useEffect(error) → hasError: true (3s timeout)
  |
  v
DoodleLoginBackground (calcula expresion global)
  |
  |-- getExpression(interaction) → DoodleExpression
  |-- Prioridad: hasError > isTypingError > password > email > distancia mouse
  |
  v
Doodle x3 (SVG individual)
  |-- Pupilas siguen mouse (offset normalizado con maxOffset=7)
  |-- Parpados animados (CSS transition 0.4s)
  |-- Bocas por opacity (todas renderizadas, solo una visible)
  |-- Ojos cerrados con media luna (shy, con delay 0.35s)
  |-- Cejas condicionales (disapproval, confused)
  |-- Mejillas sonrojadas (excited)
  |-- Body bounce/shake (excited/disapproval)
```

### 3 personajes

| ID | Color | Posicion | Escala | Detalles |
|----|-------|----------|--------|----------|
| blue | `#4A6A9B` | Inferior izq (15%) | 1.2 | Normal |
| purple | `#7A6B9A` | Inferior der (92%) | 1.0 | Espejado (flipX) |
| teal | `#4A8A7E` | Superior der (85%) | 0.95 | Colgante (rotate 180deg) |

### 6 expresiones

| Expresion | Trigger | Visual |
|-----------|---------|--------|
| `idle` | Default | Sonrisa suave, ojos siguen mouse |
| `excited` | Focus email, mouse centro (<0.2) | Ojos grandes, boca abierta, mejillas rojas, bounce |
| `shy` | Focus password | Parpados cerrados, media luna, boca nerviosa |
| `disapproval` | Error de login (3s) | Cejas fruncidas, boca invertida, shake |
| `confused` | Backspace en email (1.2s) | Cejas asimetricas, boca ondulada |
| `bored` | Mouse en bordes (>0.45) | Ojos semi-cerrados, boca plana |

### Optimizacion de rendimiento

- Mouse tracking usa `requestAnimationFrame` para batching (no un setState por cada mousemove)
- Posiciones de mouse guardadas en `useRef`, actualizadas a state solo en rAF
- Lazy loading via `React.lazy()` + `Suspense` (solo carga cuando `loginAnimation === 'doodles'`)
- SVG puro sin dependencias externas (no Remotion, no canvas)
- CSS transitions para animaciones suaves sin re-render de JS
- Escala responsiva: `Math.min(1.2, Math.max(0.6, window.innerWidth / 1200))`

### SVG del Doodle (anatomia)

Cada doodle usa viewBox `0 0 160 280`:
- **Cuerpo:** `<rect>` pill shape con rx/ry=55, height extendida (350) para ocultar redondeo inferior
- **Ojos:** Ellipses blancas (rx=18, ry=20) con circulos de pupila (r=8/10)
- **Pupilas:** Offset calculado desde mouse normalizado, con brillos blancos
- **Parpados:** `<rect>` sobre ojos con `clipPath` de ellipse, height animada por CSS transition
- **Boca:** 6 paths SVG renderizados simultaneamente, opacity controla visibilidad
- **Cejas:** Lines condicionales para disapproval/confused
- **Mejillas:** Ellipses con opacity 0.5 para excited
- **Ojos cerrados:** Media luna SVG con delay de aparicion (shy)

---

## Configuracion BD

Para activar doodles:
```sql
SELECT update_system_config('login_animation', '{"animation_type": "doodles"}'::jsonb);
```

Para volver a classic:
```sql
SELECT update_system_config('login_animation', '{"animation_type": "classic"}'::jsonb);
```

O desde UI: **Preferencias del Sistema > Animacion de Login > Doodles Interactivos**

---

## LoginAnimationType (3 opciones)

| Tipo | Descripcion | Tecnologia |
|------|-------------|------------|
| `classic` | Gradiente rotativo + fondo animado CSS | CSS puro |
| `neural-constellation` | Red neuronal con nodos y conexiones | Remotion Player |
| `doodles` | Personajes interactivos que reaccionan al formulario | React + SVG puro |

---

## Archivos clave

| Archivo | Lineas | Funcion |
|---------|--------|---------|
| `src/components/login/doodles/types.ts` | ~28 | Tipos compartidos |
| `src/components/login/doodles/Doodle.tsx` | ~185 | SVG del personaje individual |
| `src/components/login/doodles/DoodleLoginBackground.tsx` | ~140 | Layout + logica de expresion |
| `src/components/LoginScreen.tsx:33-76` | ~44 | Estado de interaccion + handlers |
| `src/components/LoginScreen.tsx:164-182` | ~18 | Renderizado condicional (3 backgrounds) |
| `src/hooks/useSystemConfig.ts:39` | 1 | Tipo LoginAnimationType |
| `src/components/admin/SystemPreferences.tsx:925-970` | ~45 | Opcion en selector UI |
| `src/components/login/remotion/RemotionLoginBackground.tsx` | ~61 | Fix responsivo de Remotion |

---

## Estado

- Build exitoso (vite build 18.3s)
- Sin deploy (requiere autorizacion)
- Los 3 tipos de animacion funcionan independientemente
- Lazy loading asegura que solo se carga el JS del tipo seleccionado
- Modificaciones del usuario post-creacion ya incorporadas (colores mas oscuros, sin brazos, parpados cubriendo completamente, body extendido, ojos cerrados con media luna y delay)

---

## Posibles mejoras futuras

- Animacion idle autonoma (breathing/floating sutil con CSS keyframes)
- Mas expresiones: celebracion al login exitoso, sorpresa al primer caracter
- Interaccion con el boton de submit (hover = nerviosismo)
- Personalizar colores de doodles desde SystemPreferences
- Touch support para mobile (onTouchMove en lugar de onMouseMove)
