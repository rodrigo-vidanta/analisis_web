# Handover: Login Doodles Interactivos + Sileo Toast Theming

**Fecha:** 2026-03-07
**Scope:** Animaciones login, notificaciones toast
**Estado:** Completo, pendiente deploy

---

## 1. Doodles Interactivos en Login Screen

### Qué se hizo
Se creó un sistema de 3 personajes SVG animados ("doodles") que decoran la pantalla de login y reaccionan a las acciones del usuario en tiempo real.

### Archivos creados
- `src/components/login/doodles/types.ts` — Tipos TypeScript (DoodleInteraction, DoodleExpression, DoodleConfig)
- `src/components/login/doodles/Doodle.tsx` — Componente SVG individual del personaje
- `src/components/login/doodles/DoodleLoginBackground.tsx` — Orquestador: posiciona 3 doodles y mapea interacción → expresión

### Archivos modificados
- `src/components/LoginScreen.tsx` — Integración: estado de interacción, mouse tracking (RAF), detección de backspace, sincronización de errores, renderizado condicional
- `src/hooks/useSystemConfig.ts` — Extendido `LoginAnimationType` para incluir `'doodles'`

### Arquitectura

```
LoginScreen.tsx
  ├── doodleState: DoodleInteraction (activeField, hasError, isTypingError, mouseX, mouseY)
  ├── handleMouseMove → RAF throttled → actualiza mouseX/mouseY
  ├── handleEmailKeyDown → detecta Backspace → isTypingError (auto-reset 1200ms)
  ├── useEffect(error) → hasError (auto-reset 3000ms)
  ├── onFocus/onBlur en inputs → activeField
  └── <DoodleLoginBackground interaction={doodleState} />
        ├── getExpression(interaction) → DoodleExpression
        └── 3x <Doodle config expression mouseX mouseY />
              ├── Eye tracking (pupilas siguen mouse)
              ├── Eyelids (clipPath animado)
              ├── Closed eye arcs (media luna con delay)
              ├── Eyebrows (disapproval, confused)
              ├── Cheeks (excited)
              └── Mouth paths (6 expresiones, opacity transitions)
```

### Expresiones y triggers

| Expresión | Trigger | Visual |
|-----------|---------|--------|
| `idle` | Sin interacción, mouse en zona media | Ojos abiertos, sonrisa suave |
| `excited` | Focus en email / mouse cerca del centro | Pupilas grandes, boca abierta, mejillas, bounce |
| `shy` | Focus en password | Párpados cerrados + arcos media luna (delay 0.35s) |
| `disapproval` | Error de login | Cejas levantadas, boca invertida, inclinación lateral |
| `confused` | Backspace en email | Cejas asimétricas, boca ondulada |
| `bored` | Mouse en bordes del viewport | Párpados entrecerrados, boca recta |

### 3 Doodles configurados

| ID | Color | Posición | Escala | Notas |
|----|-------|----------|--------|-------|
| blue | `#4A6A9B` | 15% izq, abajo | 1.2 | Más grande, asoma desde abajo |
| purple | `#7A6B9A` | 92% der, abajo | 1.0 | Espejado (flipX), asoma desde abajo |
| teal | `#4A8A7E` | 85% der, arriba | 0.95 | Colgante (rotate 180°), asoma desde arriba |

### Decisiones de diseño
- **Sin brazos**: Removidos por simplicidad visual. El cierre de ojos usa párpados extendidos (height 42px) + arcos de media luna
- **Fondo plano inferior**: Body rect extendido a height="350" (viewBox=280) para que el redondeo inferior quede fuera del área visible
- **Colores tenues**: Paleta apagada (#4A6A9B, #7A6B9A, #4A8A7E) para no competir con el formulario de login
- **Arcos ojos cerrados**: Aparecen con delay de 0.35s (después de que el párpado cierra en 0.4s), desaparecen instantáneamente al abrir
- **Responsive**: Escala basada en `window.innerWidth / 1200`, clampeada entre 0.6x y 1.2x
- **No intrusivo**: `pointerEvents: 'none'`, `overflow: 'hidden'`, no causa scroll

### Cómo activar
En `system_config` tabla, el `config_key = 'login_animation_type'` acepta `'doodles'` como valor. El `LoginScreen.tsx` renderiza `<DoodleLoginBackground>` solo cuando `loginAnimationType === 'doodles'`.

---

## 2. Sileo Toast Theming (Dark/Light)

### Problema
Las notificaciones Sileo se veían siempre blancas independientemente del tema activo. El `theme="dark"` estaba hardcodeado, y `THEME_FILLS.dark = '#f2f2f2'` producía blobs casi blancos.

### Solución

#### App.tsx — ThemedSileoToaster
```tsx
const ThemedSileoToaster = memo(function ThemedSileoToaster() {
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);
  return <SileoToaster position="top-center" theme={isDark ? 'dark' : 'light'} />;
});
```
- Usa `MutationObserver` en `<html>` para detectar cambios de clase `.dark` reactivamente
- Pasa `theme` dinámico a `<SileoToaster>`

#### toastInterceptor.ts — Fill dinámico
```typescript
const getThemedFill = (): string =>
  document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff';
```
- Cada llamada interceptada pasa `fill: getThemedFill()` a sileo
- Dark: slate-800 (`#1e293b`), Light: blanco (`#ffffff`)

#### index.css — Sombras temáticas
```css
[data-sileo-viewport] { z-index: 100 !important; }
[data-sileo-toast][data-ready="true"] {
  filter: drop-shadow(0 4px 16px rgba(0,0,0,0.10)) drop-shadow(0 1px 4px rgba(0,0,0,0.06));
}
.dark [data-sileo-toast][data-ready="true"] {
  filter: drop-shadow(0 4px 20px rgba(0,0,0,0.50)) drop-shadow(0 0 12px rgba(99,102,241,0.12));
}
```

### Archivos modificados
- `src/App.tsx` — `ThemedSileoToaster` componente + reemplazo de `<SileoToaster>` hardcodeado
- `src/lib/toastInterceptor.ts` — `getThemedFill()` + fill en cada método interceptado
- `src/index.css` — CSS overrides para z-index y sombras temáticas

### Cómo funciona el sistema completo de toast
1. `SystemPreferences.tsx` permite al usuario elegir entre `react-hot-toast` y `sileo`
2. `useSystemConfig.ts` lee/guarda la preferencia en `system_config` tabla
3. `applyToastProvider()` en `toastInterceptor.ts` monkey-patchea los métodos de `toast`
4. Ambos `<Toaster>` (react-hot-toast) y `<ThemedSileoToaster>` (sileo) están montados en App.tsx
5. Solo el provider activo produce notificaciones visibles

---

## Pendiente
- Deploy a producción
- Posible ajuste fino de colores/posiciones según feedback visual en producción
