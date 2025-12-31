# 🏷️ Sistema de Etiquetas WhatsApp - Guía Rápida

## ⚡ Quick Start

### 1. Ejecutar Script SQL (OBLIGATORIO)

```bash
# En SQL Editor de Supabase - SYSTEM_UI (zbylezfyagwrxoecioup)
scripts/sql/fix_whatsapp_labels_rls.sql
```

**⚠️ IMPORTANTE**: Ejecuta `fix_whatsapp_labels_rls.sql` para corregir las políticas RLS.

---

## ✅ Lo que ya está implementado

### Backend
- ✅ 3 tablas en SYSTEM_UI
- ✅ 5 funciones RPC
- ✅ 3 triggers de validación
- ✅ 6 etiquetas predefinidas

### Frontend
- ✅ Servicio TypeScript completo
- ✅ Modal de gestión con diseño premium
- ✅ Badges en cards de conversación
- ✅ Blur de fondo con shadow_cell
- ✅ **Panel de filtros incluyentes/excluyentes** ⭐ NUEVO

---

## 🎯 Funcionalidades Completas

### 1. Gestión de Etiquetas

**Predefinidas (6)**:
- Nuevo Lead (Azul)
- En Seguimiento (Amarillo)
- Reservación Concretada (Verde)
- No Interesado (Rojo)
- Pendiente de Pago (Morado)
- Reagendar (Naranja)

**Personalizadas**:
- Hasta 6 por usuario
- 12 colores disponibles
- Reutilizables

### 2. En Conversaciones

- Máximo 3 etiquetas por conversación
- No contradictorias (Reservación ❌ No Interesado)
- Sombrear celda (blur visual)

### 3. Filtros Avanzados ⭐ NUEVO

**Filtros Inclusivos** (debe tener):
- Selecciona hasta 3 etiquetas
- Muestra SOLO conversaciones con TODAS las etiquetas
- Badge verde con contador

**Filtros Exclusivos** (no debe tener):
- Selecciona hasta 3 etiquetas
- OCULTA conversaciones con CUALQUIERA de las etiquetas
- Badge rojo con contador

**Combinables**:
- Puedes usar ambos tipos simultáneamente
- Ejemplo: Incluir "En Seguimiento" + Excluir "No Interesado"

---

## 🎨 UI Implementada

### Card de Conversación

```
┌─────────────────────────────────────────┐
│ 🔵 BLUR AZUL (si shadow_cell activo)   │
│ [Avatar] Samuel Rosales          [🔔 2]│
│          +52 999 123 4567              │
│          Nueva Oportunidad              │
│                                         │
│ [🔵 Nuevo Lead] [🟡 En Seguim.] [🏷️] │ ← Etiquetas
│                                         │
│ 15 msj • MVL • Samuel  hace 5 min      │
└─────────────────────────────────────────┘
```

### Panel de Filtros

```
┌──────────────────────────────────────┐
│ 🏷️ Filtrar por etiquetas       [>] │
├──────────────────────────────────────┤
│ INCLUIR (debe tener)            [2]  │
│ [✓ Nuevo Lead] [✓ En Seguim.]       │
│ [ Reservación ] [ No Interesado ]    │
│                                       │
│ EXCLUIR (no debe tener)         [1]  │
│ [ Nuevo Lead ] [✓ No Interesado ]    │
│ [ Reservación ] [ En Seguimiento ]   │
│                                       │
│ [Limpiar todos los filtros]          │
└──────────────────────────────────────┘
```

---

## 🐛 Fix de Errores

### Error 406 (Not Acceptable) - SOLUCIONADO

**Problema**:
```
GET .../whatsapp_labels_preset?select=business_rule&id=eq... 406
```

**Causa**: Políticas RLS usaban `auth.role()` en lugar de `auth.uid()`

**Solución**: Ejecutar `scripts/sql/fix_whatsapp_labels_rls.sql`

---

## 📊 Lógica de Filtros

### Filtros Inclusivos (AND)

```typescript
// Ejemplo: Incluir "Nuevo Lead" + "En Seguimiento"
// Resultado: Solo conversaciones que tengan AMBAS etiquetas
```

### Filtros Exclusivos (NOT)

```typescript
// Ejemplo: Excluir "No Interesado"
// Resultado: Todas las conversaciones EXCEPTO las que tengan esa etiqueta
```

### Combinados

```typescript
// Ejemplo: 
//   Incluir: ["En Seguimiento", "Pendiente de Pago"]
//   Excluir: ["No Interesado"]
// 
// Resultado: Conversaciones que tengan AMBAS etiquetas inclusivas
//            PERO que NO tengan "No Interesado"
```

---

## 🧪 Testing Sugerido

### 1. Crear y Aplicar Etiquetas
- [ ] Abrir conversación
- [ ] Click en "+ Agregar etiqueta"
- [ ] Agregar "Nuevo Lead" y "En Seguimiento"
- [ ] Verificar badges en card

### 2. Sombrear Celda
- [ ] En modal, activar checkbox "Sombrear celda" en "Nuevo Lead"
- [ ] Verificar blur azul traslúcido en fondo del card
- [ ] Activar shadow en otra etiqueta
- [ ] Verificar que la primera se desactiva automáticamente

### 3. Filtros Inclusivos
- [ ] Abrir panel de filtros
- [ ] En "Incluir", seleccionar "Nuevo Lead" y "En Seguimiento"
- [ ] Verificar que solo aparecen conversaciones con AMBAS etiquetas

### 4. Filtros Exclusivos
- [ ] En "Excluir", seleccionar "No Interesado"
- [ ] Verificar que desaparecen todas las conversaciones con esa etiqueta

### 5. Filtros Combinados
- [ ] Incluir: "En Seguimiento"
- [ ] Excluir: "No Interesado"
- [ ] Verificar que aparecen solo conversaciones en seguimiento que NO sean "No Interesado"

### 6. Límites y Validaciones
- [ ] Crear 6 etiquetas personalizadas
- [ ] Intentar crear la 7ma (debe fallar)
- [ ] Agregar 3 etiquetas a conversación
- [ ] Intentar agregar 4ta (debe fallar)
- [ ] Intentar combinar "Reservación" + "No Interesado" (debe fallar)

---

## 📦 Archivos del Sistema

### SQL
- `scripts/sql/add_whatsapp_labels_system.sql` - Creación inicial ✅ Ejecutado
- `scripts/sql/fix_whatsapp_labels_rls.sql` - Fix RLS ⚠️ **EJECUTAR AHORA**

### TypeScript
- `src/services/whatsappLabelsService.ts` - Servicio
- `src/components/chat/WhatsAppLabelsModal.tsx` - Modal
- `src/components/chat/LiveChatCanvas.tsx` - Integración + Filtros

### Docs
- `src/components/chat/WHATSAPP_LABELS_README.md` - Guía técnica
- `src/components/chat/CHANGELOG_LIVECHAT.md` - Changelog
- `docs/WHATSAPP_LABELS_SUMMARY.md` - Resumen ejecutivo
- `docs/WHATSAPP_LABELS_QUICKSTART.md` - Este archivo

---

**Versión**: v6.1.0  
**Fecha**: 29 Diciembre 2025  
**Estado**: ✅ LISTO PARA PRODUCCIÓN

