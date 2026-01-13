# Problemas Resueltos Durante Migración Frontend

**Fecha:** 13 de Enero 2025  
**Contexto:** Migración de System_UI a PQNC_AI

---

## Problema 1: Tablas `system_config` y `app_themes` no existían en PQNC_AI

### Error en Consola

```
GET https://hmmfuhqgvsehkizlfzga.supabase.co/rest/v1/system_config?select=*&config_key=eq.selected_logo 406 (Not Acceptable)
```

### Causa Raíz

Las tablas `system_config` y `app_themes` NO fueron migradas de `system_ui` porque **nunca existieron en `system_ui`**. Estas tablas solo existían en la documentación pero no estaban implementadas.

### Archivos Afectados

- `src/hooks/useSystemConfig.ts` — consulta `system_config`
- `src/hooks/useTheme.ts` — consulta `system_config` y `app_themes`
- `src/components/admin/SystemPreferences.tsx` — gestiona configuración

### Solución Implementada

**Script:** [`scripts/migration/20_create_system_config_tables.sql`](../scripts/migration/20_create_system_config_tables.sql)

1. Crear tabla `system_config`:
   - Campos: `id`, `config_key`, `config_value` (JSONB), `description`, `is_active`, timestamps
   - Índices en `config_key` e `is_active`
   - Trigger para `updated_at`

2. Crear tabla `app_themes`:
   - Campos: `id`, `theme_name`, `display_name`, `description`, `theme_config` (JSONB), `is_active`, timestamps
   - Índices en `theme_name` e `is_active`

3. Insertar datos por defecto:
   - `app_branding`: Configuración de marca (nombre, logo, favicon)
   - `app_theme`: Tema activo (default)
   - `selected_logo`: Logo seleccionado (default)

4. Insertar temas:
   - `corporativo`: Tema corporativo con colores de marca
   - `linear`: Tema minimalista

5. Crear función RPC `update_system_config(p_config_key, p_new_value)`

### Resultado

- ✅ 3 registros en `system_config`
- ✅ 2 registros en `app_themes`
- ✅ Función RPC creada
- ✅ Error 406 resuelto

---

## Problema 2: Archivos usando `pqncSupabase` en lugar de `analysisSupabase`

### Causa Raíz

Algunos archivos usaban `pqncSupabase` que apunta a `hmmfuhqgvsehkizlfzga` (BD antigua según reglas del proyecto). Deben usar `analysisSupabase` que apunta a `glsmifhkoaifvaegsozd` (PQNC_AI unificado).

### Archivos Corregidos

1. `src/hooks/useSystemConfig.ts`
   - ANTES: `import { pqncSupabase as supabase }`
   - DESPUÉS: `import { analysisSupabase as supabase }`

2. `src/hooks/useTheme.ts`
   - ANTES: `import { pqncSupabase as supabase }`
   - DESPUÉS: `import { analysisSupabase as supabase }`

3. `src/components/admin/SystemPreferences.tsx`
   - ANTES: `import { pqncSupabase as supabase }`
   - DESPUÉS: `import { analysisSupabase as supabase }`

### Resultado

- ✅ Todos los archivos usan la BD correcta (PQNC_AI)

---

## Problema 3: Botón anidado dentro de botón en SystemPreferences

### Error en Consola

```html
<button> cannot contain a nested <button>.
This will cause a hydration error.
```

### Causa Raíz

En `SystemPreferences.tsx`, el componente `DefaultLogo` renderizaba un `<button>` que estaba dentro de otro `<motion.button>` del logo selector.

### Ubicación

- Archivo: `src/components/logos/DefaultLogo.tsx`
- Líneas: 20-30 (aproximadamente)

### Solución Implementada

Cambiar el elemento raíz de `<button>` a `<div>` en `DefaultLogo`:

```tsx
// ANTES
<button onClick={onClick} className="..." title="...">
  <svg>...</svg>
</button>

// DESPUÉS
<div onClick={onClick} className="..." title="...">
  <svg>...</svg>
</div>
```

### Resultado

- ✅ Error de HTML anidado resuelto
- ✅ Funcionalidad onClick preservada
- ✅ Estilos preservados

---

## Problema 4: Warning de `@import` en CSS

### Error en Consola

```
[postcss] @import must precede all other statements (besides @charset or empty @layer)
```

### Causa Raíz

En el archivo CSS principal, hay un `@import` que no está al inicio del archivo.

### Estado

⚠️ NO CRÍTICO — No afecta funcionalidad, solo es un warning de orden de imports CSS.

### Solución Sugerida (Opcional)

Mover la línea:
```css
@import './styles/theme-system.css';
```

Al inicio del archivo CSS, antes de cualquier otra regla.

---

## Resumen de Cambios

### Base de Datos

- ✅ Creadas tablas `system_config` y `app_themes` en PQNC_AI
- ✅ Insertados 3 registros de configuración
- ✅ Insertados 2 temas
- ✅ Creada función RPC `update_system_config`

### Código

- ✅ 3 archivos corregidos para usar `analysisSupabase`
- ✅ 1 archivo corregido para evitar botón anidado
- ✅ 2 archivos de configuración actualizados (supabaseSystemUI.ts, credentialsService.ts)

### Estado Final

- Servidor corriendo en `localhost:5173`
- Esperando actualización manual de `.env.local`
- NO desplegado a producción

---

**Última actualización:** 13 de Enero 2025
