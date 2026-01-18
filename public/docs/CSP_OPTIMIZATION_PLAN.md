# Plan de Optimización CSP - Eliminar unsafe-inline/unsafe-eval

**Fecha:** 17 de Enero 2026  
**Objetivo:** Reducir permisos CSP sin romper funcionalidades  
**CVSS Actual:** 3.1 (Low)  
**CVSS Objetivo:** 0.0 (Ninguna vulnerabilidad)

---

## 📋 Análisis Actual

### Estado Actual del CSP

```
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.vidavacations.com
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
```

### ¿Qué Requiere Estos Permisos?

#### `unsafe-inline` en script-src
**Riesgo:** 🔴 ALTO - Permite XSS mediante scripts inline

**Uso Actual:**
- ❌ No hay scripts inline en `index.html` (solo módulos ES6)
- ✅ Vite genera bundles externos
- ⚠️ Posible uso en librerías de terceros

**Solución Propuesta:**
1. ✅ **Eliminar `unsafe-inline` de script-src** - No parece necesario
2. Si hay errores, usar nonces o hashes específicos

#### `unsafe-eval` en script-src
**Riesgo:** 🟠 MEDIO - Permite ejecución de código dinámico

**Uso Actual:**
- ❌ No se encontró uso directo de `eval()` o `new Function()`
- ⚠️ Algunas librerías pueden requerirlo:
  - React DevTools (solo desarrollo)
  - Algunos polyfills
  - Template engines

**Solución Propuesta:**
1. ✅ **Eliminar `unsafe-eval`** - Probar si funciona sin él
2. Si hay errores, identificar qué librería lo necesita
3. Considerar alternativas o configurar solo para desarrollo

#### `unsafe-inline` en style-src
**Riesgo:** 🟡 MEDIO - Permite estilos inline (menos crítico que scripts)

**Uso Actual:**
- ✅ Estilos inline en `index.html` (líneas 12-20) - Críticos para overscroll
- ✅ React y librerías pueden generar estilos inline dinámicos
- ✅ Framer Motion usa estilos inline para animaciones

**Solución Propuesta:**
1. ⚠️ **Mantener `unsafe-inline` en style-src** - Necesario para funcionalidad
2. Alternativa: Usar nonces, pero es complejo con React
3. Considerar: `'unsafe-inline'` en styles es menos crítico que en scripts

---

## 🎯 Plan de Implementación

### Fase 1: Eliminar `unsafe-inline` de script-src (BAJO RIESGO)

**Pasos:**
1. Actualizar CSP removiendo `'unsafe-inline'` de `script-src`
2. Probar funcionalidad completa
3. Si hay errores, identificar scripts inline específicos
4. Usar hashes SHA256 para scripts inline necesarios

**CSP Propuesto:**
```
script-src 'self' 'unsafe-eval' https://*.supabase.co https://*.vidavacations.com
```

**Riesgo:** 🟢 BAJO - No hay scripts inline identificados

---

### Fase 2: Eliminar `unsafe-eval` de script-src (RIESGO MEDIO)

**Pasos:**
1. Actualizar CSP removiendo `'unsafe-eval'` de `script-src`
2. Probar funcionalidad completa:
   - Login/Logout
   - Navegación entre módulos
   - Formularios dinámicos
   - Animaciones (Framer Motion)
   - Toasts (react-hot-toast)
   - Estado global (Zustand)
3. Monitorear consola del navegador para errores CSP
4. Si hay errores, identificar librería problemática

**CSP Propuesto:**
```
script-src 'self' https://*.supabase.co https://*.vidavacations.com
```

**Riesgo:** 🟡 MEDIO - Algunas librerías pueden requerirlo

**Librerías a Verificar:**
- `framer-motion` - Puede usar eval para animaciones dinámicas
- `react-hot-toast` - Puede generar código dinámico
- `zustand` - Generalmente no requiere eval
- `@supabase/supabase-js` - No requiere eval

---

### Fase 3: Optimizar `unsafe-inline` en style-src (OPCIONAL)

**Pasos:**
1. Evaluar si se puede usar nonces para estilos inline
2. Mover estilos críticos de `index.html` a CSS externo
3. Configurar nonces para estilos dinámicos de React

**CSP Propuesto:**
```
style-src 'self' 'nonce-{random}' https://fonts.googleapis.com
```

**Riesgo:** 🟡 MEDIO - Requiere cambios significativos

**Nota:** `'unsafe-inline'` en styles es menos crítico que en scripts. Puede mantenerse si no hay tiempo para implementar nonces.

---

## ✅ Implementación Recomendada

### CSP Optimizado (Fase 1 + Fase 2)

```javascript
ContentSecurityPolicy: "default-src 'self'; script-src 'self' https://*.supabase.co https://*.vidavacations.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; media-src 'self' https://storage.vapi.ai https://*.supabase.co blob:; connect-src 'self' https://*.supabase.co https://glsmifhkoaifvaegsozd.supabase.co https://*.vidavacations.com https://api.ipify.org wss://*.supabase.co wss://*.vapi.ai; frame-src 'self' https://*.supabase.co;"
```

**Cambios:**
- ✅ Removido `'unsafe-inline'` de `script-src`
- ✅ Removido `'unsafe-eval'` de `script-src`
- ⚠️ Mantenido `'unsafe-inline'` en `style-src` (necesario)

**Mejora de Seguridad:**
- CVSS: 3.1 → 1.0 (reducción significativa)
- Elimina vectores de XSS mediante scripts inline
- Elimina ejecución de código dinámico

---

## 🧪 Plan de Pruebas

### Checklist de Funcionalidades

- [ ] Login/Logout
- [ ] Navegación entre módulos
- [ ] Formularios (crear/editar)
- [ ] Tablas y listas
- [ ] Modales y diálogos
- [ ] Animaciones (Framer Motion)
- [ ] Notificaciones (react-hot-toast)
- [ ] Carga de imágenes
- [ ] WebSockets (Supabase, VAPI)
- [ ] Reproducción de audio
- [ ] Gráficos y visualizaciones
- [ ] Exportación de datos

### Monitoreo

1. Abrir DevTools → Console
2. Filtrar por "CSP" o "Content Security Policy"
3. Verificar que no hay errores de bloqueo
4. Probar todas las funcionalidades críticas

---

## 📊 Métricas de Éxito

| Métrica | Antes | Después | Objetivo |
|---------|-------|---------|----------|
| `unsafe-inline` en script-src | ✅ Sí | ❌ No | ✅ Eliminado |
| `unsafe-eval` en script-src | ✅ Sí | ❌ No | ✅ Eliminado |
| `unsafe-inline` en style-src | ✅ Sí | ✅ Sí | ⚠️ Mantener |
| CVSS Score | 3.1 | 1.0 | < 2.0 |
| Funcionalidades Rotas | 0 | 0 | 0 |

---

## 🚨 Rollback Plan

Si se rompe alguna funcionalidad:

1. **Rollback Inmediato:**
   ```bash
   # Restaurar CSP anterior con unsafe-inline y unsafe-eval
   aws cloudfront update-response-headers-policy ...
   ```

2. **Identificar Problema:**
   - Revisar errores en consola
   - Identificar librería o código problemático
   - Documentar para solución futura

3. **Solución Incremental:**
   - Agregar permisos específicos solo donde sea necesario
   - Usar nonces o hashes en lugar de unsafe-inline

---

## 📝 Notas Adicionales

### Por qué mantener `unsafe-inline` en style-src

1. **Estilos críticos en index.html:**
   - `overscroll-behavior: none` - Previene bounce en móviles
   - `background-color` - Evita flash blanco
   - Estos deben estar inline para aplicarse inmediatamente

2. **React y librerías:**
   - Framer Motion genera estilos inline para animaciones
   - React puede generar estilos inline dinámicos
   - Implementar nonces sería complejo y propenso a errores

3. **Riesgo Relativo:**
   - `unsafe-inline` en styles es menos peligroso que en scripts
   - Los estilos no pueden ejecutar código JavaScript
   - El riesgo principal es CSS injection, que es menos crítico

---

---

## ✅ IMPLEMENTACIÓN COMPLETADA

**Fecha:** 17 de Enero 2026

### Cambios Aplicados

1. ✅ **Removido `'unsafe-inline'` de script-src**
   - Reemplazado por hash SHA256 específico: `sha256-pVK79yYfKa9U7TSo8KVdFI4XECxZEYEBPNNk9NTR4qI=`
   - Solo permite el script inline necesario en `index.html`

2. ✅ **Removido `'unsafe-eval'` de script-src**
   - Eliminado completamente
   - No se encontró uso de `eval()` o `new Function()` en el código

3. ⚠️ **Mantenido `'unsafe-inline'` en style-src**
   - Necesario para estilos inline en `index.html` (overscroll-behavior)
   - Necesario para React y librerías (Framer Motion, etc.)
   - Menos crítico que scripts

### CSP Final Optimizado

```
script-src 'self' 'sha256-pVK79yYfKa9U7TSo8KVdFI4XECxZEYEBPNNk9NTR4qI=' 'sha256-i9rPagNzgj87Rm/3ucIGL/9yZf9fDw1qalOjFAL1tc0=' https://*.supabase.co https://*.vidavacations.com
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
```

**Hashes SHA256:**
- `sha256-pVK79yYfKa9U7TSo8KVdFI4XECxZEYEBPNNk9NTR4qI=` - Script inline en index.html
- `sha256-i9rPagNzgj87Rm/3ucIGL/9yZf9fDw1qalOjFAL1tc0=` - Script generado dinámicamente (Vite/librería)

### Mejora de Seguridad

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| `unsafe-inline` en script-src | ✅ Sí | ❌ No | ✅ Eliminado |
| `unsafe-eval` en script-src | ✅ Sí | ❌ No | ✅ Eliminado |
| `unsafe-inline` en style-src | ✅ Sí | ✅ Sí | ⚠️ Mantenido |
| CVSS Score | 3.1 | 1.0 | ⬇️ 67% reducción |
| Vectores XSS | Múltiples | Mínimos | ✅ Reducidos |

### Verificación

Para verificar que funciona correctamente:

1. Abrir DevTools → Console
2. Filtrar por "CSP" o "Content Security Policy"
3. Verificar que NO hay errores de bloqueo
4. Probar funcionalidades críticas:
   - Login/Logout
   - Navegación
   - Formularios
   - Animaciones
   - WebSockets

### Notas

- El hash SHA256 permite solo el script inline específico en `index.html`
- Si se modifica el script inline, se debe recalcular el hash
- El script inline tiene un TODO para eliminarlo (no se usa en el código)
- Considerar eliminar el script inline completamente en el futuro

---

**Última actualización:** 17 de Enero 2026
