# Handover: Sistema de Switch Global de Notificaciones Toast (Sileo)

**Fecha:** 2026-03-07
**Tipo:** Feature
**Estado:** Completado - listo para testing

---

## Resumen

Se implemento un sistema de switch global de notificaciones toast que permite alternar entre **React Hot Toast** (actual) y **Sileo** (nuevo, physics-based) desde las preferencias de administracion. El cambio aplica a los 529+ toast calls en 61+ archivos sin necesidad de modificar ninguno de ellos.

## Problema / Necesidad

- El usuario queria evaluar Sileo como reemplazo de React Hot Toast
- Necesitaba un mecanismo de rollback instantaneo sin deploy
- Cambiar 61+ archivos directamente era riesgoso e innecesario

## Solucion: Toast Interceptor Pattern

### Mecanismo Core

En lugar de reemplazar imports en 61 archivos, se usa **monkey-patching del objeto `toast`** exportado por `react-hot-toast`. Todos los modulos que importan `toast` comparten la misma referencia al objeto JavaScript, por lo que al reemplazar sus metodos (`.success()`, `.error()`, `.loading()`, `.dismiss()`), el cambio se propaga globalmente sin tocar imports.

```
Flujo: toast.success("msg") → interceptor verifica provider activo → sileo.success({title: "msg"}) O originalSuccess("msg")
```

### Archivos Creados

| Archivo | Proposito |
|---------|-----------|
| `src/lib/toastInterceptor.ts` | Interceptor que redirige calls de react-hot-toast a sileo |

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/App.tsx` | Import SileoToaster + sileo/styles.css, monta ambos Toasters |
| `src/hooks/useSystemConfig.ts` | Carga `notification_style` de BD, aplica provider al arrancar |
| `src/components/admin/SystemPreferences.tsx` | Nuevo tab "Notificaciones" con selector visual + botones de prueba |

### Cambios en Base de Datos

| Cambio | Detalle |
|--------|---------|
| Nuevo config key | `notification_style` en tabla `system_config` con valor `{"provider": "react-hot-toast"}` |
| Vista actualizada | `system_config_public` ahora incluye `notification_style` en su WHERE clause |
| Migracion | `add_notification_style_to_public_view` - recrea vista con nuevo key + re-aplica SECURITY DEFINER + GRANT anon/authenticated |

### Dependencia Instalada

- `sileo` v0.1.5 (MIT) - 1 runtime dep: `motion` (ya teníamos Framer Motion)
- Peer deps: React >=18 (tenemos 19)

## Arquitectura del Interceptor

```typescript
// src/lib/toastInterceptor.ts
// Guarda referencias originales al cargar el modulo
const originalSuccess = toast.success.bind(toast);
const originalError = toast.error.bind(toast);

// applyToastProvider('sileo') → reemplaza metodos
// applyToastProvider('react-hot-toast') → restaura originales

// Flujo:
// 1. useSystemConfig carga config de BD
// 2. Llama applyToastProvider(config.provider)
// 3. Todos los toast.success/error en 61 archivos redirigen automaticamente
```

## UI en SystemPreferences

- Nuevo tab **"Notificaciones"** (icono Bell) junto a Branding, Temas, Animaciones
- Dos opciones clickeables estilo selector (mismo patron que Animaciones de Login):
  - **React Hot Toast**: "Minimalista y confiable" - badge "Activo" cuando seleccionado
  - **Sileo**: "Physics-based con gooey SVG morphing" - badge "Nuevo" + "Activo"
- **4 botones de prueba** en footer: Success, Error, Warning, Info
- Al cambiar provider: preview automatico con el nuevo motor (toast de confirmacion)
- Persistencia via `update_system_config` RPC + `systemConfigEvents.notifyUpdate()`

## Notas Tecnicas Importantes

1. **Ambos Toasters montados simultaneamente** en App.tsx - react-hot-toast siempre renderiza su Toaster pero no recibe calls cuando sileo esta activo (y viceversa)
2. **El monkey-patch funciona** porque `toast` de react-hot-toast es un objeto (funcion con propiedades). Reemplazar `.success` en el objeto se refleja en todos los modulos que importaron la misma referencia
3. **`toast.dismiss()` con sileo** se convierte en noop ya que sileo no tiene equivalente exacto
4. **CSS de sileo**: el import correcto es `sileo/styles.css` (NO `sileo/dist/styles.css`) - los exports del package.json mapean `./styles.css` → `./dist/styles.css`
5. **Vista `system_config_public`**: al hacer `CREATE OR REPLACE VIEW`, se resetea `security_invoker`. Se re-aplico `ALTER VIEW SET (security_invoker = false)` + GRANTs

## Testing

- [x] TypeScript compila sin errores (`npx tsc --noEmit --skipLibCheck`)
- [x] Build de produccion exitoso (`npm run build`)
- [ ] Testing manual en browser: verificar que sileo muestra toasts correctamente
- [ ] Testing manual: verificar que al volver a react-hot-toast se restauran los originales
- [ ] Verificar que botones de prueba en SystemPreferences funcionan con ambos providers
- [ ] Verificar que el cambio persiste tras reload (config se carga de BD)

## Rollback

### Inmediato (sin deploy)
Click en "React Hot Toast" en Administracion > Preferencias > Notificaciones

### Completo (remover sileo)
1. Revertir cambios en `App.tsx` (quitar SileoToaster + import CSS)
2. Revertir cambios en `useSystemConfig.ts` (quitar notification_style)
3. Revertir cambios en `SystemPreferences.tsx` (quitar tab Notificaciones)
4. Eliminar `src/lib/toastInterceptor.ts`
5. `npm uninstall sileo`
6. Eliminar config key de BD: `DELETE FROM system_config WHERE config_key = 'notification_style'`
7. Revertir vista: quitar `'notification_style'` del WHERE de `system_config_public`
