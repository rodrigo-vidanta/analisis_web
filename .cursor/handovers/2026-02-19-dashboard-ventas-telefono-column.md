# Dashboard Ventas - Columna Teléfono con Click-to-Copy

**Fecha:** 2026-02-19
**Alcance:** DashboardModule > CRMSalesWidget > DetailModal

## Cambio

Se agregó la columna **Teléfono** al grid de ventas por coordinación (DetailModal) con funcionalidad de click-to-copy al clipboard.

## Archivos modificados

### BD - Migración aplicada
- **RPC `get_ventas_atribucion`**: Se agregó `telefono text` al RETURNS TABLE y `COALESCE(p.telefono_principal, p.whatsapp, '')::text AS telefono` al SELECT final. Usa `telefono_principal` con fallback a `whatsapp`.

### Frontend - `src/components/dashboard/DashboardModule.tsx`
1. **Interface `SaleDetail`** (línea ~148): Nuevo campo `telefono?: string`
2. **Import lucide-react**: Agregados `Copy` y `Check`
3. **Estado `copiedPhone`**: `useState<string | null>(null)` para feedback visual
4. **Row type en `loadCRMData`** (línea ~3854): Agregado `telefono: string` al cast del RPC
5. **Mapping** (línea ~3872): `telefono: row.telefono || undefined`
6. **Header tabla**: Nueva columna "Teléfono" entre "Cliente" y "Fecha"
7. **Body tabla**: Celda con botón click-to-copy:
   - Font mono para el número
   - Icono `Copy` aparece en hover (`opacity-0 group-hover:opacity-100`)
   - Al copiar: icono cambia a `Check` verde por 2 segundos
   - Sin teléfono muestra `-`
8. **Modal width**: `max-w-4xl` → `max-w-5xl` para acomodar columna extra

## Fix: Parpadeo al copiar

**Problema:** Al hacer clic en copiar, el modal completo parpadeaba (re-render flash).
**Causa raíz:** `DetailModal` estaba definido como arrow function inline dentro de `CRMSalesWidget` y renderizado como `<DetailModal />`. Cada `setCopiedPhone` re-renderizaba el padre, creando una nueva referencia de componente, causando que React desmontara/remontara todo el modal.
**Solución:** Cambiar `<DetailModal />` → `{DetailModal()}`. Al invocarlo como función en vez de componente, React trata el resultado como JSX inline del padre y solo hace reconciliación del DOM sin desmontar/remontar.

## Notas
- La migración es backward-compatible (campo adicional en el RPC, no rompe consumers existentes)
- El `navigator.clipboard.writeText` requiere HTTPS (ya en producción con CloudFront)
