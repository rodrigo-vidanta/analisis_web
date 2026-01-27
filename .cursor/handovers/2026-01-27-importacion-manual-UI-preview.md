# 🎨 Preview UI - Advertencia de Prospecto Duplicado

**Fecha:** 27 de Enero 2026
**Componente:** ManualImportTab

---

## 📸 Vista Previa de la Advertencia

Cuando un prospecto ya existe en la base de datos, se muestra:

### Panel de Advertencia (Amber)

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  ⚠️ Este prospecto ya existe en la base de datos       │
│                                                              │
│  Nombre: Darig Samuel Rosales Robledo                       │
│  Asignado a: Vanessa Valentina Perez Moreno                 │
│  Coordinación: Telemarketing                                │
│  ─────────────────────────────────────────────────────────  │
│  ℹ️  Los datos de Dynamics CRM se muestran a continuación  │
│     solo como referencia.                                   │
└─────────────────────────────────────────────────────────────┘
```

### Colores y Estilos

**Panel Principal:**
- Background: `bg-amber-50 dark:bg-amber-900/20`
- Border: `border-2 border-amber-300 dark:border-amber-700`
- Shadow: `shadow-lg`

**Icono:**
- Tamaño: 48x48px (`w-12 h-12`)
- Gradiente: `from-amber-500 to-orange-500`
- Icono: `AlertTriangle` (24px, blanco)

**Texto:**
- Título: `text-lg font-bold text-amber-900 dark:text-amber-200`
- Labels: `font-semibold text-amber-800 dark:text-amber-300`
- Valores: `text-amber-800 dark:text-amber-300`
- Nota inferior: `text-xs text-amber-700 dark:text-amber-400`

---

## 🔄 Flujo de Interacción

### Paso 1: Buscar Teléfono
```
Input: 3333243333
[Buscar en Dynamics]
```

### Paso 2: Loader
```
⏳ Buscando...
```

### Paso 3a: Si NO existe (Prospecto Nuevo)
```
✅ Lead encontrado en Dynamics CRM
[Muestra datos en 4 secciones]
```

### Paso 3b: Si YA existe (Prospecto Duplicado)
```
❌ Toast: "Este prospecto ya existe en la base de datos"

[Panel Amber con advertencia]
   ⚠️ Este prospecto ya existe
   Nombre: ...
   Asignado a: ...
   Coordinación: ...
   ───────────────────
   ℹ️ Datos de Dynamics como referencia

[Datos de Dynamics en 4 secciones]
```

---

## 📐 Layout Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 📥 Importación Manual                                        │
│ Busca prospectos en Dynamics CRM por número de teléfono     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─ Buscar por Teléfono ──────────────────────────────────┐ │
│ │ 📱 [3333243333________________]                         │ │
│ │ [Buscar en Dynamics] [Limpiar]                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─ ⚠️ ADVERTENCIA ──────────────────────────────────────┐ │
│ │ ⚠️  Este prospecto ya existe en la base de datos       │ │
│ │                                                          │ │
│ │ Nombre: Darig Samuel Rosales Robledo                    │ │
│ │ Asignado a: Vanessa Valentina Perez Moreno              │ │
│ │ Coordinación: Telemarketing                             │ │
│ │ ──────────────────────────────────────────────────────  │ │
│ │ ℹ️  Datos de Dynamics como referencia                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─ ✅ Lead Encontrado ────────────────────────────────────┐ │
│ │ Información de Dynamics CRM                             │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Información Personal                                     │ │
│ │ ┌─────────────────┬─────────────────┐                  │ │
│ │ │ 👤 Nombre       │ ✉️ Email        │                  │ │
│ │ │ Darig Samuel... │ darig.soporte...│                  │ │
│ │ └─────────────────┴─────────────────┘                  │ │
│ │                                                          │ │
│ │ Ubicación                                                │ │
│ │ ┌─────────────────┬─────────────────┐                  │ │
│ │ │ 📍 País         │ 📍 Estado       │                  │ │
│ │ │ MEXICO          │ —               │                  │ │
│ │ └─────────────────┴─────────────────┘                  │ │
│ │                                                          │ │
│ │ Asignación en CRM                                        │ │
│ │ ┌─────────────────┬─────────────────┐                  │ │
│ │ │ 🏢 Coordinación │ 👥 Propietario  │                  │ │
│ │ │ Telemarketing   │ Vanessa Vale... │                  │ │
│ │ └─────────────────┴─────────────────┘                  │ │
│ │                                                          │ │
│ │ Datos CRM                                                │ │
│ │ ┌──────┬────────────┬─────────────┐                    │ │
│ │ │ ID   │ Calific... │ Últ. Llam...│                    │ │
│ │ │ 919a │ —          │ Sin registro│                    │ │
│ │ └──────┴────────────┴─────────────┘                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎭 Animaciones

### Advertencia
```typescript
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -20 }}
transition={{ duration: 0.3 }}
```

### Entrada Secuencial
1. **Advertencia:** aparece primero (0.3s)
2. **Datos del Lead:** aparece después (0.3s)

### Mode
```typescript
<AnimatePresence mode="wait">
  {/* Solo un elemento a la vez */}
</AnimatePresence>
```

---

## 📝 Texto de Ejemplo

### Si el prospecto existe:
```
Toast: "❌ Este prospecto ya existe en la base de datos"

Panel:
⚠️ Este prospecto ya existe en la base de datos

Nombre: Darig Samuel Rosales Robledo
Asignado a: Vanessa Valentina Perez Moreno
Coordinación: Telemarketing

────────────────────────────────────────────

ℹ️ Los datos de Dynamics CRM se muestran a 
  continuación solo como referencia.
```

### Si el prospecto NO existe:
```
Toast: "✅ Lead encontrado en Dynamics CRM"

[No aparece advertencia]
[Solo muestra datos de Dynamics]
```

---

## 🧩 Componentes Reutilizables

### InfoField (usado en los datos de Dynamics)
```typescript
<InfoField
  icon={<User size={18} />}
  label="Nombre Completo"
  value={leadData.Nombre}
/>
```

**Variantes:**
- Normal: valor como texto
- Badge: valor en badge azul (`badge={true}`)
- Mono: valor en fuente monospace (`mono={true}`)

---

**Última actualización:** 27 de Enero 2026
