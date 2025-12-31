# Sistema de Etiquetas para WhatsApp

## 📋 Descripción

Sistema completo de etiquetas estilo WhatsApp Business para clasificar y organizar conversaciones con prospectos.

## 🎯 Características Principales

### 1. Etiquetas Predefinidas (6)

Etiquetas del sistema listas para usar:

| Etiqueta | Color | Regla | Descripción |
|----------|-------|-------|-------------|
| **Nuevo Lead** | Azul (#3B82F6) | neutral | Prospecto nuevo sin gestionar |
| **En Seguimiento** | Amarillo (#F59E0B) | neutral | Prospecto en proceso de seguimiento |
| **Reservación Concretada** | Verde (#10B981) | positive | Cliente ha concretado una reservación |
| **No Interesado** | Rojo (#EF4444) | negative | Cliente no está interesado |
| **Pendiente de Pago** | Morado (#8B5CF6) | neutral | Cliente pendiente de realizar pago |
| **Reagendar** | Naranja (#F97316) | neutral | Necesita reagendar cita o llamada |

### 2. Etiquetas Personalizadas

- Cada usuario puede crear hasta **6 etiquetas personalizadas**
- Selección de **12 colores predefinidos** (diferentes a las etiquetas del sistema)
- Reutilizables en múltiples conversaciones
- Gestionables (crear, editar, eliminar)

### 3. Gestión en Conversaciones

- **Máximo 3 etiquetas por conversación**
- Validación automática de etiquetas contradictorias
- Opción **"Sombrear celda"** para destacar visualmente
- Badges visuales en cada card de conversación

### 4. Sombreado de Celda

- Solo 1 etiqueta puede tener `shadow_cell` activo
- Aplica un blur traslúcido del color de la etiqueta al fondo del card
- Identifica visualmente conversaciones prioritarias

## 🗄️ Arquitectura de Base de Datos

### Tablas (en SYSTEM_UI - zbylezfyagwrxoecioup)

#### `whatsapp_labels_preset`
```sql
id UUID PRIMARY KEY
name VARCHAR(100) UNIQUE
color VARCHAR(7) -- Hexadecimal
icon VARCHAR(50) -- Lucide icon name
description TEXT
business_rule VARCHAR(50) -- 'positive', 'negative', 'neutral'
is_active BOOLEAN
display_order INTEGER
```

#### `whatsapp_labels_custom`
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth_users(id)
name VARCHAR(100)
color VARCHAR(7)
description TEXT
is_active BOOLEAN
UNIQUE(user_id, name) -- Nombres únicos por usuario
```

#### `whatsapp_conversation_labels`
```sql
id UUID PRIMARY KEY
prospecto_id UUID -- Referencia a prospectos en PQNC_AI
label_id UUID -- ID de etiqueta (preset o custom)
label_type VARCHAR(10) -- 'preset' o 'custom'
shadow_cell BOOLEAN
added_by UUID REFERENCES auth_users(id)
UNIQUE(prospecto_id, label_id, label_type)
```

### Funciones RPC

- `get_available_labels_for_user(p_user_id)` - Obtiene etiquetas disponibles
- `get_prospecto_labels(p_prospecto_id)` - Obtiene etiquetas de un prospecto
- `add_label_to_prospecto(...)` - Agrega etiqueta con validaciones
- `remove_label_from_prospecto(...)` - Remueve etiqueta

### Triggers de Validación

- ✅ Máximo 6 etiquetas personalizadas por usuario
- ✅ Máximo 3 etiquetas por conversación
- ✅ No permite etiquetas contradictorias (positive vs negative)
- ✅ Auto-actualización de `updated_at`

## 💻 Implementación Frontend

### Servicio TypeScript

**Archivo**: `src/services/whatsappLabelsService.ts`

```typescript
// Obtener etiquetas disponibles
const labels = await whatsappLabelsService.getAvailableLabels(userId);

// Obtener etiquetas de un prospecto
const prospectoLabels = await whatsappLabelsService.getProspectoLabels(prospectoId);

// Crear etiqueta personalizada
const newLabel = await whatsappLabelsService.createCustomLabel(
  userId, 
  'Mi Etiqueta', 
  '#EC4899'
);

// Agregar etiqueta a prospecto
await whatsappLabelsService.addLabelToProspecto(
  prospectoId, 
  labelId, 
  'preset', 
  false, // shadow_cell
  userId
);

// Cargar etiquetas en batch (optimizado)
const labelsMap = await whatsappLabelsService.getBatchProspectosLabels(prospectoIds);
```

### Componente Modal

**Archivo**: `src/components/chat/WhatsAppLabelsModal.tsx`

```typescript
<WhatsAppLabelsModal
  isOpen={labelsModalOpen}
  onClose={() => setLabelsModalOpen(false)}
  prospectoId={prospectoId}
  prospectoName={prospectoName}
  onLabelsUpdate={() => {
    // Callback para actualizar la UI
  }}
/>
```

### Integración en LiveChatCanvas

#### Estados Agregados:
```typescript
const [prospectoLabels, setProspectoLabels] = useState<Record<string, ConversationLabel[]>>({});
const [labelsModalOpen, setLabelsModalOpen] = useState(false);
const [selectedProspectoForLabels, setSelectedProspectoForLabels] = useState<{
  id: string;
  name: string;
} | null>(null);
```

#### Carga de Etiquetas:
```typescript
// Se cargan automáticamente al cargar conversaciones
useEffect(() => {
  if (conversations.length > 0) {
    const prospectoIds = conversations.map(c => c.prospecto_id).filter(Boolean);
    loadProspectosLabels(prospectoIds);
  }
}, [conversations, loadProspectosLabels]);
```

#### ConversationItem:
- ✅ Muestra badges de etiquetas
- ✅ Botón "Agregar etiqueta" o icono Tag para gestionar
- ✅ Blur de fondo si `shadow_cell` está activo
- ✅ Badges con color dinámico

## 🎨 Diseño UI/UX

### Badges de Etiquetas

```tsx
<span
  className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border"
  style={{
    backgroundColor: `${label.color}15`,
    borderColor: `${label.color}40`,
    color: label.color,
  }}
>
  <div className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: label.color }} />
  {label.name}
</span>
```

### Blur de Fondo (Shadow Cell)

```tsx
{shadowLabel && (
  <div
    className="absolute inset-0 pointer-events-none"
    style={{
      background: `linear-gradient(135deg, ${shadowLabel.color}10 0%, ${shadowLabel.color}05 100%)`,
      backdropFilter: 'blur(2px)',
      WebkitBackdropFilter: 'blur(2px)',
    }}
  />
)}
```

### Modal de Gestión

- **Diseño**: Siguiendo `GUÍA DE DISEÑO DE MODALES`
- **Animaciones**: Framer Motion con delays escalonados
- **Secciones**:
  1. Etiquetas del Sistema (gradiente azul-morado)
  2. Mis Etiquetas (gradiente morado-rosa)
- **Formulario de creación**: Selector de color visual en grid 6x2
- **Validaciones**: Feedback en tiempo real con toasts

## 🔧 Validaciones

### En Base de Datos (Triggers)

1. ✅ Máximo 6 etiquetas personalizadas por usuario
2. ✅ Máximo 3 etiquetas por conversación
3. ✅ No etiquetas contradictorias (positive + negative)
4. ✅ Solo 1 shadow_cell activo por conversación

### En Cliente (TypeScript)

```typescript
// Validar antes de agregar
const validation = await whatsappLabelsService.canAddLabel(
  prospectoId, 
  labelId, 
  labelType
);

if (!validation.canAdd) {
  toast.error(validation.reason);
  return;
}
```

## 📊 Casos de Uso

### 1. Clasificar Prospectos

- **Nuevo Lead**: Prospectos recién llegados
- **En Seguimiento**: Prospectos activos en proceso
- **Reservación Concretada**: Éxitos confirmados
- **No Interesado**: Descartados

### 2. Gestión de Seguimiento

- **Pendiente de Pago**: Requiere recordatorio de pago
- **Reagendar**: Necesita nueva fecha de contacto

### 3. Etiquetas Personalizadas

- VIP - Para clientes prioritarios
- Urgente - Requiere atención inmediata
- Corporativo - Clientes empresariales
- Grupos Grandes - Reservaciones de grupos
- Etc.

### 4. Sombreado Visual

- Activar en conversaciones que requieren seguimiento urgente
- Destacar clientes VIP
- Marcar conversaciones con problemas

## 🔄 Flujo de Trabajo

1. Usuario abre conversación en LiveChat
2. Click en "Agregar etiqueta" o icono Tag
3. Se abre modal con etiquetas disponibles
4. Selecciona etiquetas (máximo 3)
5. Opcionalmente activa "Sombrear celda" en una
6. Las etiquetas aparecen como badges en el card
7. El blur de fondo se aplica si hay shadow activo

## ⚡ Optimizaciones

- **Batch Loading**: Carga etiquetas de múltiples prospectos en paralelo
- **Memoización**: `React.memo` en ConversationItem
- **Lazy Loading**: Solo carga etiquetas de conversaciones visibles
- **Cache Local**: Los labels no cambian frecuentemente

## 🧪 Testing

### Casos de Prueba

1. ✅ Crear etiqueta personalizada (máx 6)
2. ✅ Agregar 3 etiquetas a conversación
3. ✅ Intentar agregar 4ta etiqueta (debe fallar)
4. ✅ Combinar "Reservación" + "No Interesado" (debe fallar)
5. ✅ Activar shadow_cell (verificar blur visual)
6. ✅ Eliminar etiqueta personalizada (se remueve de todas las conversaciones)
7. ✅ Filtrar por etiquetas (pendiente implementación)

## 📝 Notas Técnicas

### Cross-Database Queries

El sistema hace queries cross-database:
- **Etiquetas**: SYSTEM_UI (zbylezfyagwrxoecioup)
- **Prospectos**: PQNC_AI (glsmifhkoaifvaegsozd)

Se usa `prospecto_id` como clave de relación (sin FOREIGN KEY por limitación cross-database).

### Catálogo de Colores

Los 12 colores personalizados se eligieron para no chocar con:
- Colores de etiquetas predefinidas
- Colores de coordinaciones (morado)
- Colores de ejecutivos (azul)
- Colores de estado del sistema

---

**Versión**: 1.0.0  
**Fecha**: 29 Diciembre 2025  
**Autor**: Team PQNC

