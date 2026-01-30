# Restricciones Temporales UI - Prospectos "Importado Manual"

**Fecha de implementación:** 29 de Enero 2026  
**Estado:** ✅ ACTIVO  
**Afecta a:** Ejecutivos, Supervisores, Coordinadores

---

## 📋 Resumen

Se implementaron restricciones temporales de UI para prospectos en etapa **"Importado Manual"** (código: `IMPORTADO_MANUAL`).

### Restricciones Aplicadas

| Módulo | Restricción | Afectados |
|---|---|---|
| **WhatsApp** | ❌ Icono de iniciar llamada | Ejecutivos, Supervisores, Coordinadores |
| **WhatsApp** | ❌ Botón de pausar bot | Ejecutivos, Supervisores, Coordinadores |
| **WhatsApp** | ❌ Botón de requiere atención | Ejecutivos, Supervisores, Coordinadores |
| **Widget Últimas Conversaciones** | ❌ Botón de pausar bot | Ejecutivos, Supervisores, Coordinadores |
| **Widget Últimas Conversaciones** | ❌ Botón de requiere atención | Ejecutivos, Supervisores, Coordinadores |
| **Sidebar de Prospecto (todas las vistas)** | ❌ Programar llamadas | Ejecutivos, Supervisores, Coordinadores |

---

## 🔧 Implementación Técnica

### Archivo Principal
```
src/utils/prospectRestrictions.ts
```

Este helper centralizado contiene:
- `isProspectRestricted()` - Verifica si el prospecto está restringido
- `canStartCall()` - Verifica si se puede iniciar llamada
- `canPauseBot()` - Verifica si se puede pausar bot
- `canToggleAttentionRequired()` - Verifica si se puede toggle atención
- `canScheduleCall()` - Verifica si se puede programar llamada
- `getRestrictionMessage()` - Mensaje explicativo para el usuario

### Componentes Modificados

1. **LiveChatCanvas.tsx** (Módulo WhatsApp)
   - Oculta botón de iniciar llamada
   - Oculta botón de pausar bot
   - Oculta botón de requiere atención

2. **ConversacionesWidget.tsx** (Widget Inicio)
   - Oculta botón de pausar bot
   - Oculta botón de requiere atención

3. **ScheduledCallsSection.tsx** (Sidebar compartido)
   - Deshabilita botón de programar llamada
   - Muestra tooltip explicativo

4. **Todos los Sidebars de Prospecto**:
   - `ProspectDetailSidebar.tsx` (WhatsApp)
   - `ProspectoSidebar.tsx` (Prospectos)
   - `ProspectoSidebar.tsx` (Llamadas Programadas)
   - `LiveMonitor.tsx` (Live Monitor)
   - `AnalysisIAComplete.tsx` (Análisis IA)

---

## 🔓 Cómo Liberar las Restricciones

### Opción 1: Desactivar TODAS las restricciones (temporal)

Editar `src/utils/prospectRestrictions.ts`:

```typescript
// Línea 28: Vaciar el array de etapas restringidas
const RESTRICTED_STAGES: string[] = [
  // 'IMPORTADO_MANUAL', // ✅ COMENTAR ESTA LÍNEA
];
```

**Resultado:** Todas las restricciones se levantan inmediatamente.

---

### Opción 2: Agregar Excepciones por Rol

Si quieres que solo ciertos roles tengan restricciones, modifica las funciones en `prospectRestrictions.ts`:

```typescript
// Ejemplo: Solo restringir a Ejecutivos
export const canStartCall = (
  etapaId?: string | null,
  etapaLegacy?: string | null,
  userRole?: string // Agregar parámetro
): boolean => {
  if (userRole === 'ejecutivo') {
    return !isProspectRestricted(etapaId, etapaLegacy);
  }
  return true; // Supervisores y Coordinadores sin restricción
};
```

Luego actualizar los componentes para pasar el rol del usuario.

---

### Opción 3: Aplicar Restricciones a Otra Etapa

Agregar el código de la nueva etapa al array:

```typescript
const RESTRICTED_STAGES: string[] = [
  'IMPORTADO_MANUAL',
  'NUEVA_ETAPA_CODIGO', // ✅ AGREGAR AQUÍ
];
```

---

## 📊 Testing

### Probar Restricciones Activas

1. Ir al módulo de Prospectos
2. Filtrar por etapa "Importado Manual"
3. Abrir un prospecto con esa etapa
4. Verificar que NO se muestre el botón "Programar Llamada" en el sidebar

5. Ir al módulo de WhatsApp
6. Seleccionar una conversación con etapa "Importado Manual"
7. Verificar que NO se muestren:
   - Botón de iniciar llamada
   - Botón de pausar bot
   - Botón de requiere atención

8. Ir al módulo de Inicio
9. En el widget "Últimas Conversaciones", seleccionar un prospecto con etapa "Importado Manual"
10. Verificar que NO se muestren:
    - Botón de pausar bot
    - Botón de requiere atención

### Probar Restricciones Desactivadas

1. Comentar el código de etapa en `RESTRICTED_STAGES`
2. Refrescar la app
3. Verificar que TODOS los botones vuelvan a aparecer

---

## 🛠️ Troubleshooting

### Los botones siguen ocultos después de liberar restricciones

**Solución:**
- Verificar que el código esté comentado/eliminado correctamente
- Hacer hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Verificar que la cache del navegador esté limpia

### Algunos botones aparecen, otros no

**Causa:** Probablemente hay prospectos sin `etapa_id` (solo tienen el campo legacy `etapa`).

**Solución:** El código ya maneja este caso con fallback automático. Si persiste:
1. Verificar en BD que el prospecto tenga `etapa_id` poblado
2. Si no, ejecutar migración de datos (contactar a backend)

### Los mensajes de tooltip no aparecen

**Causa:** El botón está completamente oculto (no solo deshabilitado).

**Detalle:** Por diseño, los botones de "Pausar Bot" y "Requiere Atención" se ocultan completamente. Solo el botón de "Programar Llamada" se deshabilita con tooltip.

---

## 📝 Notas Técnicas

### Arquitectura de Etapas

El sistema usa 2 campos para etapas:
- `etapa_id` (UUID FK) - **Preferido**, nueva arquitectura
- `etapa` (string legacy) - **Fallback**, compatibilidad

Las funciones de restricción verifican ambos campos automáticamente.

### Service de Etapas

Las funciones usan `etapasService` para resolver etapas:
- `getById(etapaId)` - Por UUID
- `getByNombreLegacy(etapa)` - Por nombre (fallback)

El servicio tiene cache en memoria y se carga al inicio de la app.

### Códigos de Etapa

Los códigos son constantes definidas en la tabla `etapas`:
- Formato: UPPERCASE_SNAKE_CASE
- Ejemplo: `IMPORTADO_MANUAL`, `DISCOVERY`, `VALIDANDO_MEMBRESIA`

---

## 📚 Referencias

- **Helper de restricciones:** `src/utils/prospectRestrictions.ts`
- **Service de etapas:** `src/services/etapasService.ts`
- **Tipos de etapas:** `src/types/etapas.ts`
- **Tabla de etapas:** `prospectos_qa.etapas` (PostgreSQL)

---

## ✅ Checklist de Reversión

- [ ] Comentar código de etapa en `RESTRICTED_STAGES`
- [ ] Hacer commit con mensaje claro
- [ ] Deploy a staging para verificar
- [ ] Notificar al equipo de QA
- [ ] Deploy a producción
- [ ] Verificar en producción que botones aparecen
- [ ] Cerrar ticket/issue relacionado

---

**Última actualización:** 29 de Enero 2026  
**Autor:** Agent (Cursor AI)
