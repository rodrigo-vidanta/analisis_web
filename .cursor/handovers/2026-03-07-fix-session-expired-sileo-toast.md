# Handover: Fix notificacion sesion expirada no usaba Sileo

**Fecha:** 2026-03-07
**Tipo:** Bugfix
**Estado:** Completado

---

## Problema

La notificacion "Tu sesion ha expirado. Por favor, inicia sesion nuevamente." siempre mostraba el diseño de react-hot-toast, ignorando el provider Sileo aunque estuviera activo.

## Causa Raiz

En `src/contexts/AuthContext.tsx`, `handleForceLogout` usaba `toast()` (la funcion base de react-hot-toast) en lugar de `toast.error()`.

El interceptor (`src/lib/toastInterceptor.ts`) solo hace monkey-patch de:
- `toast.success`
- `toast.error`
- `toast.loading`
- `toast.dismiss`

**La funcion base `toast()` nunca fue interceptada**, por lo que la llamada iba directo a react-hot-toast sin pasar por el interceptor.

Adicionalmente, tenia estilos hardcodeados (`background: '#1f2937'`, `color: '#fff'`) que forzaban la apariencia vieja.

## Solucion

### Archivo modificado

| Archivo | Cambio |
|---------|--------|
| `src/contexts/AuthContext.tsx` | `toast(reason, {...})` → `toast.error(reason, {...})` + eliminar estilos hardcodeados |

### Cambio especifico (linea ~264)

**Antes:**
```typescript
toast(reason, {
  duration: 5000,
  icon: '🔐',
  style: {
    background: '#1f2937',
    color: '#fff',
  }
});
```

**Despues:**
```typescript
toast.error(reason, {
  duration: 5000,
  icon: '🔐',
});
```

## Impacto

- Cuando Sileo esta activo: la notificacion de sesion expirada ahora se muestra con el diseño Sileo
- Cuando react-hot-toast esta activo: funciona igual que antes (el interceptor restaura los metodos originales)
- Se eliminaron estilos hardcodeados para respetar el theming del provider activo

## Nota

Si en el futuro se encuentran mas notificaciones que usan `toast()` base en lugar de `toast.success/error/loading`, tendran el mismo problema. Alternativa: agregar monkey-patch de la funcion base `toast()` en el interceptor.
