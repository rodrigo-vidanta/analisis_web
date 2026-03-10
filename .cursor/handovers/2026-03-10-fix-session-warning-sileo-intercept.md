# Fix: Advertencia de sesión no pasaba por interceptor Sileo

**Fecha:** 2026-03-10
**Tipo:** Bugfix
**Archivos modificados:** `src/hooks/useTokenExpiryMonitor.ts`

## Problema

La advertencia "Tu sesión está por expirar. Guarda tu trabajo." no se mostraba con Sileo cuando el usuario tenía Sileo como provider de notificaciones activo. Siempre aparecía con react-hot-toast sin importar la configuración.

## Causa raíz

El sistema de interceptación de toasts (`src/lib/toastInterceptor.ts`) hace monkey-patch de los métodos de `react-hot-toast` para redirigir a Sileo:
- `toast.success()` → interceptado
- `toast.error()` → interceptado
- `toast.loading()` → interceptado
- `toast.dismiss()` → interceptado
- **`toast()` (función base)** → **NO interceptado**

En `useTokenExpiryMonitor.ts:118`, la advertencia de sesión usaba `toast()` directamente (la función base), que no pasa por el interceptor y siempre va a react-hot-toast.

## Solución

Cambio mínimo en `src/hooks/useTokenExpiryMonitor.ts` línea 118:

```diff
- toast('Tu sesión está por expirar. Guarda tu trabajo.', {
+ toast.error('Tu sesión está por expirar. Guarda tu trabajo.', {
    duration: 10000,
    icon: '⚠️',
    style: { background: '#fef3c7', color: '#92400e' }
  });
```

Ahora la llamada usa `toast.error()` que sí está interceptado por `toastInterceptor.ts` y se muestra con Sileo cuando es el provider activo.

## Nota sobre el interceptor

El `toastInterceptor.ts` no intercepta la función base `toast()` porque no es un método del objeto sino la función exportada directamente. Si aparecen más casos similares, considerar:
1. Buscar otros usos de `toast()` directo: `grep -n "toast(" src/ --include="*.ts" --include="*.tsx"` y verificar que no sean `.success`/`.error`/`.loading`
2. O bien interceptar la función base en el módulo (requiere un approach diferente al monkey-patching actual)
