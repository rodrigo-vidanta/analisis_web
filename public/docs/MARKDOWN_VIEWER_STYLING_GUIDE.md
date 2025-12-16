# Guia de Estilos para Visor de Markdown

**Fecha**: 2025-12-15  
**Version**: 1.0  
**Archivo**: `src/components/documentation/DocumentationModule.tsx`

---

## Problema Original

El visor de Markdown en el modulo de Documentacion presentaba problemas de contraste en modo oscuro:

- Texto casi ilegible (colores muy tenues)
- Bloques de codigo sin diferenciacion visual
- Headings sin suficiente contraste
- Estilos que no respetaban el cambio entre light/dark mode

---

## Solucion Implementada

### Selector CSS Correcto

**NO usar** clases `prose-*` directamente ya que tienen baja especificidad en dark mode.

**SI usar** selectores `[&_elemento]` con variantes `dark:` explicitas:

```tsx
<article className="prose prose-sm max-w-none
  [&_h1]:text-gray-900 dark:[&_h1]:text-white
  [&_p]:text-gray-700 dark:[&_p]:text-gray-300
  ...
">
```

### Tabla de Colores por Elemento

| Elemento | Light Mode | Dark Mode |
|----------|-----------|-----------|
| H1, H2, H3, H4 | `text-gray-900/800` | `text-white` |
| Parrafos (p) | `text-gray-700` | `text-gray-300` |
| Strong | `text-gray-900` | `text-white` |
| Links (a) | `text-blue-600` | `text-blue-400` |
| Code inline | `text-cyan-600 bg-gray-100` | `text-cyan-400 bg-gray-800` |
| Pre (bloques) | `bg-gray-900 border-gray-300` | `bg-gray-900 border-gray-700` |
| Pre > code | `text-cyan-300` | `text-cyan-300` |
| Listas (ul/ol/li) | `text-gray-700` | `text-gray-300` |
| Tablas th | `bg-gray-100 text-gray-900` | `bg-gray-800 text-white` |
| Tablas td | `text-gray-700 border-gray-200` | `text-gray-300 border-gray-700` |
| Blockquote | `bg-blue-50 text-gray-700` | `bg-blue-900/30 text-gray-300` |
| HR | `border-gray-200` | `border-gray-700` |

---

## Codigo de Referencia

```tsx
<article className="prose prose-sm max-w-none
  [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-gray-900 dark:[&_h1]:text-white [&_h1]:border-b [&_h1]:border-gray-200 dark:[&_h1]:border-gray-700 [&_h1]:pb-3 [&_h1]:mb-4
  [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-800 dark:[&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-3
  [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-800 dark:[&_h3]:text-white [&_h3]:mt-6 [&_h3]:mb-2
  [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-gray-800 dark:[&_h4]:text-white
  [&_p]:text-gray-700 dark:[&_p]:text-gray-300 [&_p]:leading-relaxed
  [&_strong]:text-gray-900 dark:[&_strong]:text-white [&_strong]:font-semibold
  [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:no-underline hover:[&_a]:underline
  [&_code]:text-cyan-600 dark:[&_code]:text-cyan-400 [&_code]:bg-gray-100 dark:[&_code]:bg-gray-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
  [&_pre]:bg-gray-900 [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-gray-300 dark:[&_pre]:border-gray-700 [&_pre]:p-4 [&_pre]:overflow-x-auto
  [&_pre_code]:bg-transparent [&_pre_code]:text-cyan-300 [&_pre_code]:p-0
  [&_ul]:text-gray-700 dark:[&_ul]:text-gray-300 [&_ol]:text-gray-700 dark:[&_ol]:text-gray-300 [&_li]:text-gray-700 dark:[&_li]:text-gray-300
  [&_th]:bg-gray-100 dark:[&_th]:bg-gray-800 [&_th]:text-gray-900 dark:[&_th]:text-white [&_th]:px-3 [&_th]:py-2
  [&_td]:text-gray-700 dark:[&_td]:text-gray-300 [&_td]:px-3 [&_td]:py-2 [&_td]:border-t [&_td]:border-gray-200 dark:[&_td]:border-gray-700
  [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:bg-blue-50 dark:[&_blockquote]:bg-blue-900/30 [&_blockquote]:text-gray-700 dark:[&_blockquote]:text-gray-300 [&_blockquote]:py-2 [&_blockquote]:px-4 [&_blockquote]:rounded-r
  [&_hr]:border-gray-200 dark:[&_hr]:border-gray-700
">
  <ReactMarkdown>{content}</ReactMarkdown>
</article>
```

---

## Filtrado de Emojis

Para mantener consistencia visual, los emojis se filtran del contenido Markdown:

```typescript
const removeEmojis = (text: string): string => {
  return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|.../gu, '');
};

// Uso
const cleanText = removeEmojis(rawMarkdown);
```

---

## Errores Comunes

### Error 1: Usar solo `prose-*` sin `dark:`

```tsx
// MAL - No funciona en dark mode
prose-headings:text-gray-100

// BIEN - Funciona en ambos modos
[&_h1]:text-gray-900 dark:[&_h1]:text-white
```

### Error 2: Usar `dark:prose-invert` esperando que resuelva todo

```tsx
// MAL - prose-invert tiene colores genericos
<div className="prose dark:prose-invert">

// BIEN - Colores especificos por elemento
<article className="prose prose-sm max-w-none
  [&_h1]:text-gray-900 dark:[&_h1]:text-white
  ...
">
```

### Error 3: Olvidar el selector `[&_pre_code]`

```tsx
// MAL - El code dentro de pre hereda estilos incorrectos
[&_code]:bg-gray-100

// BIEN - Resetear estilos dentro de pre
[&_code]:bg-gray-100 dark:[&_code]:bg-gray-800
[&_pre_code]:bg-transparent [&_pre_code]:text-cyan-300
```

---

## Checklist de Implementacion

- [ ] Usar `<article>` en lugar de `<div>` para semantica
- [ ] Incluir `prose prose-sm max-w-none` como base
- [ ] Definir colores para TODOS los elementos con variantes `dark:`
- [ ] Usar selectores `[&_elemento]` para mayor especificidad
- [ ] Resetear `[&_pre_code]` para evitar herencia de estilos
- [ ] Implementar `removeEmojis()` si se requiere consistencia
- [ ] Probar en ambos modos (light/dark) antes de desplegar

---

## Historial de Cambios

| Fecha | Version | Descripcion |
|-------|---------|-------------|
| 2025-12-15 | 1.0 | Documentacion inicial del troubleshooting |


