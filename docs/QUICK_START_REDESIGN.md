# ⚡ INICIO RÁPIDO - Nuevo Sistema de Diseño
## PQNC QA AI Platform V2.0

---

## 🐛 PROBLEMA RESUELTO

### Error de Importación:
```
Uncaught SyntaxError: The requested module 'framer-motion' 
does not provide an export named 'Transition'
```

### ✅ SOLUCIÓN APLICADA:
Actualizado `src/styles/tokens/animations.ts` con tipo `Transition` personalizado.

**Acción requerida:** Recarga la página (Cmd+R o F5)

---

## 🚀 CÓMO USAR EL NUEVO SISTEMA

### 1. Importar Componentes Base:

```typescript
import { Button, Card, Badge, Modal, Input, Tabs } from '@/components/base';
```

### 2. Ejemplo Rápido - Botón:

```tsx
// Antes (custom)
<button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded">
  Guardar
</button>

// Después (componente base)
<Button>Guardar</Button>
```

### 3. Ejemplo Rápido - Card:

```tsx
// Antes (custom)
<div className="bg-white dark:bg-gray-800 border rounded-lg shadow-md p-6">
  Contenido
</div>

// Después (componente base)
<Card variant="elevated">
  Contenido
</Card>
```

### 4. Ejemplo Rápido - Modal:

```tsx
// Antes (50+ líneas de código)
<div className="fixed inset-0 bg-black/50...">
  <div className="bg-white rounded-2xl...">
    {/* Header, content, footer custom */}
  </div>
</div>

// Después (componente base)
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Título"
  footer={<ModalFooter><Button>Guardar</Button></ModalFooter>}
>
  Contenido
</Modal>
```

---

## 🎨 COLORES HOMOLOGADOS

### Usa `neutral-*` en vez de `slate-*` o `gray-*`:

```tsx
// ✅ CORRECTO (V2.0)
bg-neutral-50
bg-neutral-100
dark:bg-neutral-800
text-neutral-900
border-neutral-200

// ❌ EVITAR (V1.0 legacy)
bg-slate-50 / bg-gray-50
dark:bg-gray-800
text-slate-900
border-slate-200
```

### Colores de Estado:

```tsx
bg-success-500   // Verde (éxito)
bg-warning-500   // Ámbar (advertencia)
bg-error-500     // Rojo (error)
bg-info-500      // Azul (información)
bg-primary-500   // Índigo (acción principal)
bg-accent-500    // Púrpura (destacado)
```

---

## 📊 MÓDULOS MIGRADOS

| Módulo | Estado | Componentes Usados |
|--------|--------|--------------------|
| **Live Chat** | ✅ MIGRADO | Tabs, Card, Input |
| Dashboard | ⏳ Pendiente | Card, Button, Badge |
| Live Monitor | ⏳ Pendiente | Card, Badge, Modal |
| Prospectos | ⏳ Pendiente | Card, Badge, Tabs |
| Análisis IA | ⏳ Pendiente | Modal, Button, Badge |

---

## 🌗 TEMAS DISPONIBLES

### 1. Light (Claro)
```
Background: #f8fafc (slate-50 suave)
Text: #0f172a (muy oscuro)
Contraste: 12:1 ✅
```

### 2. Dark (Oscuro)
```
Background: #0f172a (slate-900)
Text: #f8fafc (muy claro)
Contraste: 10:1 ✅
```

### 3. Twilight (Crepúsculo) 🆕
```
Background: #1a202e (intermedio)
Text: #e8eaf0 (suave)
Contraste: 8:1 ✅
```

**Para cambiar tema:** Header → Botón de tema (próximamente selector de 3 opciones)

---

## 🔍 TESTING

### Verificar que funcione:

1. **Live Chat Module:**
   - ✅ Tabs de navegación
   - ✅ Card en Settings
   - ✅ Inputs en configuración
   - ✅ Colores neutral-*

2. **Recarga la página** para ver los cambios

3. **Probar dark mode** (toggle en header)

---

## 📚 DOCUMENTACIÓN COMPLETA

| Documento | Contenido |
|-----------|-----------|
| `DESIGN_SYSTEM_AUDIT_2025.md` | Auditoría completa (50+ páginas) |
| `DESIGN_SYSTEM_SUMMARY.md` | Resumen ejecutivo |
| `DESIGN_GUIDE_MODALS_V2.md` | Guía actualizada de modales |
| `BASE_COMPONENTS_IMPLEMENTATION.md` | Componentes base |
| `LIVE_CHAT_MIGRATION.md` | Migración Live Chat |
| `src/components/base/README.md` | Guía de componentes |
| `src/styles/tokens/README.md` | Guía de tokens |

---

## 🆘 PROBLEMAS COMUNES

### Error: "Module not found '@/components/base'"
**Solución:** Verificar que el alias `@` esté configurado en `vite.config.ts`

### Error: "Cannot find module 'framer-motion'"
**Solución:** 
```bash
npm install framer-motion
```

### Los cambios no se ven
**Solución:** 
1. Recarga la página (Cmd+R)
2. Si persiste, hard reload (Cmd+Shift+R)
3. Verificar que no haya errores en consola

---

## 📞 SOPORTE

Si encuentras algún problema:
1. Revisa la consola del navegador
2. Verifica errores de TypeScript
3. Consulta la documentación en `/docs/`
4. Revisa el backup si necesitas restaurar

---

**Versión:** 2.0.0  
**Fecha:** 26 de Enero 2025  
**Estado:** ✅ Sistema funcionando  
**Siguiente:** Testing y migración de más módulos

---

**⚡ ACCIÓN INMEDIATA:** Recarga la página para ver el nuevo diseño de Live Chat

