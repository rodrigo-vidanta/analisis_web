# Handover: Fix Image Gallery Infinite Scroll

**Fecha:** 2026-02-09
**Estado:** Completado (sin commit/deploy)

## Problema

En el modulo de WhatsApp, al abrir el selector de imagenes (boton adjuntar), la galeria se quedaba atascada en "Cargando mas imagenes... (40 de 303)" sin cargar el resto de thumbnails. No habia errores en consola.

## Causa Raiz

El scroll infinito en `ImageGrid.tsx` dependia exclusivamente del evento `onScroll` del contenedor. En pantallas grandes (xl: 8 columnas), las primeras 40 imagenes (5 filas de ~120px) no desbordaban el contenedor del modal (`max-h-[90vh]`), por lo que:

1. No habia scrollbar
2. El evento `onScroll` nunca se disparaba
3. `setVisibleCount` nunca se incrementaba mas alla del batch inicial de 40
4. El indicador "Cargando mas imagenes..." era visible pero inerte

## Solucion

### Archivo modificado: `src/components/chat/media-selector/ImageGrid.tsx`

**Cambio 1 - Auto-carga cuando contenido no llena viewport (lineas 33-48):**
- Se agrego `useRef` al contenedor del grid (`scrollContainerRef`)
- Se agrego `useEffect` que despues de cada render verifica si `scrollHeight <= clientHeight + 200`
- Si hay espacio libre y quedan imagenes por mostrar, dispara automaticamente `onScroll` con el elemento real del DOM
- El efecto se re-ejecuta con cada cambio de `visibleCount`, creando un loop que carga lotes de 40 hasta que el contenido desborda o se muestran todas

**Cambio 2 - Scrollbar invisible (linea 64):**
- Se reemplazo `scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent` por `scrollbar-none`
- El scroll sigue funcionando con rueda/trackpad, solo se oculta la barra visual

## Archivos Relevantes (no modificados, solo referencia)

| Archivo | Rol |
|---------|-----|
| `src/components/chat/media-selector/useImageCatalog.ts` | Hook principal - `handleScroll` (L417-427), `visibleCount` state (L117), `IMAGES_PER_BATCH=40` |
| `src/components/chat/media-selector/ImageGalleryTab.tsx` | Tab que conecta hook con ImageGrid |
| `src/components/chat/media-selector/MediaSelectorModal.tsx` | Modal contenedor (`max-h-[90vh]`) |
| `src/components/chat/media-selector/constants.ts` | `IMAGES_PER_BATCH=40`, `MAX_IMAGES=4` |
| `src/components/chat/media-selector/ImageCard.tsx` | Card individual con thumbnail estatico de `/public/thumbnails/` |

## Pendiente

- [ ] Commit y deploy del fix
