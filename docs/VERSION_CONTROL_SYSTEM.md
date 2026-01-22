# Sistema de Control de Versiones Forzado

**Fecha de creación:** 22 de Enero 2026  
**Versión:** 1.0.0

---

## 📋 Descripción

Sistema que fuerza a los usuarios a actualizar la aplicación cuando hay una nueva versión disponible. Utiliza realtime subscriptions de Supabase para detectar cambios inmediatos.

---

## 🏗️ Arquitectura

### Componentes

1. **`useVersionCheck` Hook** (`src/hooks/useVersionCheck.ts`)
   - Consulta versión requerida desde `system_config`
   - Compara con versión actual del build (`VITE_APP_VERSION`)
   - Suscripción realtime a cambios en `system_config`
   - Fallback a polling (30s) si realtime falla

2. **`ForceUpdateModal` Component** (`src/components/shared/ForceUpdateModal.tsx`)
   - Modal pantalla completa (z-index: 9999)
   - No se puede cerrar hasta actualizar
   - Diseño moderno con animaciones
   - Botón de reload prominente

3. **Script de Actualización** (`scripts/update-app-version.ts`)
   - Actualiza `system_config` con nueva versión requerida
   - Se ejecuta después de deploy a AWS

---

## 🔧 Configuración en Base de Datos

### Tabla: `system_config`

```sql
INSERT INTO system_config (config_key, config_value, description)
VALUES (
  'app_version',
  '{"version": "2.5.40", "force_update": true}'::jsonb,
  'Versión requerida de la aplicación. Los usuarios con versiones anteriores serán forzados a actualizar.'
);
```

**Estructura de `config_value`:**
```typescript
{
  version: string;        // Versión requerida (ej: "2.5.40")
  force_update: boolean;  // Si true, fuerza actualización
}
```

---

## 📝 Flujo de Uso

### 1. Deploy Normal

```bash
# 1. Actualizar código y versiones
npm version patch  # o minor, major

# 2. Deploy a AWS
./update-frontend.sh

# 3. Actualizar versión requerida en BD
tsx scripts/update-app-version.ts $(node -p "require('./package.json').version")
```

### 2. Deploy con "documenta y actualiza"

El workflow automático incluye el paso 6.5 que actualiza la versión en BD después del deploy.

---

## 🎯 Comportamiento

### En el Cliente

1. **Al cargar la app:**
   - Hook `useVersionCheck` consulta versión requerida
   - Compara con versión actual (`VITE_APP_VERSION`)
   - Si no coinciden → muestra `ForceUpdateModal`

2. **Durante la sesión:**
   - Suscripción realtime detecta cambios en `system_config`
   - Si se actualiza la versión requerida → modal aparece inmediatamente
   - Fallback a polling cada 30s si realtime falla

3. **Modal de actualización:**
   - Pantalla completa (no se puede cerrar)
   - Muestra versión actual vs requerida
   - Botón "Actualizar Ahora" → `window.location.reload()`
   - Después de reload, si versiones coinciden → modal desaparece

---

## ⚙️ Variables de Entorno

### Frontend (Build Time)

```bash
VITE_APP_VERSION=2.5.40  # Definido en vite.config.ts desde package.json
```

### Script de Actualización

```bash
VITE_ANALYSIS_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_ANALYSIS_SUPABASE_SERVICE_KEY=eyJ...service_role...
```

---

## 🔍 Debugging

### Ver versión actual del build

```javascript
console.log(import.meta.env.VITE_APP_VERSION);
```

### Ver versión requerida en BD

```sql
SELECT config_value FROM system_config WHERE config_key = 'app_version';
```

### Logs del hook

El hook imprime logs en consola:
- `[VersionCheck] Suscrito a cambios de versión (realtime)`
- `[VersionCheck] Cambio detectado en versión requerida`
- `[VersionCheck] Error en canal realtime, usando polling como fallback`

---

## ⚠️ Consideraciones

1. **Realtime vs Polling:**
   - **Realtime:** Más eficiente, cambios inmediatos, requiere configuración en Supabase
   - **Polling:** Fallback automático cada 30s si realtime falla

2. **Versión del Build:**
   - Se obtiene de `package.json` via `vite.config.ts`
   - Se define como `VITE_APP_VERSION` en tiempo de build
   - **No cambia** hasta hacer nuevo build

3. **Cache del Navegador:**
   - El modal fuerza `window.location.reload()` que puede usar cache
   - Para forzar reload sin cache: `window.location.reload(true)` (deprecated)
   - Alternativa: agregar timestamp a assets en build

4. **Timing:**
   - Actualizar versión en BD **después** de que el deploy AWS esté completo
   - Si se actualiza antes, usuarios con nueva versión verán modal incorrectamente

---

## 📚 Ver También

- [Workflow de Deploy](.cursor/rules/deploy-workflow.mdc) - Paso 6.5
- [Hook useVersionCheck](src/hooks/useVersionCheck.ts)
- [Componente ForceUpdateModal](src/components/shared/ForceUpdateModal.tsx)
- [Script de Actualización](scripts/update-app-version.ts)

---

**Última actualización:** 22 de Enero 2026
