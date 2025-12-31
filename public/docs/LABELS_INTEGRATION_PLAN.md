# Plan de Integración de Badges en Otros Módulos

## ✅ Completado

- ✅ LiveChatCanvas - Badges funcionando con gestión completa
- ✅ Componente reutilizable `ProspectoLabelBadges.tsx` creado

---

## 📋 Pendiente de Integración

### 1. Widget de Conversaciones (Dashboard)

**Archivo**: `src/components/dashboard/widgets/ConversacionesWidget.tsx`  
**Líneas**: ~3000  
**Complejidad**: Alta

**Cambios necesarios**:
```typescript
// 1. Imports
import { ProspectoLabelBadges } from '../../shared/ProspectoLabelBadges';
import { whatsappLabelsService } from '../../../services/whatsappLabelsService';

// 2. Estado
const [prospectoLabels, setProspectoLabels] = useState<Record<string, ConversationLabel[]>>({});

// 3. Cargar al final de loadConversations()
const prospectoIds = sortedConversations.map(c => c.prospect_id).filter(Boolean);
whatsappLabelsService.getBatchProspectosLabels(prospectoIds)
  .then(setProspectoLabels)
  .catch(console.error);

// 4. Renderizar en cada card (buscar línea ~2250)
{conv.prospect_id && prospectoLabels[conv.prospect_id] && (
  <ProspectoLabelBadges 
    labels={prospectoLabels[conv.prospect_id]} 
    size="sm"
  />
)}
```

**Ubicación**: Después de mostrar etapa, antes de contador de mensajes

---

### 2. Prospectos Kanban

**Archivo**: `src/components/prospectos/ProspectosKanban.tsx`  
**Líneas**: ~800  
**Complejidad**: Media

**Cambios necesarios**:
```typescript
// 1. Props interface
interface ProspectosKanbanProps {
  prospectos: Prospecto[];
  prospectoLabels: Record<string, ConversationLabel[]>; // ← Nuevo
  // ... resto de props
}

// 2. Renderizar en cada card de prospecto
{prospecto.id && prospectoLabels[prospecto.id] && (
  <ProspectoLabelBadges 
    labels={prospectoLabels[prospecto.id]} 
    size="sm"
    showShadow={true} // En Kanban sí mostrar shadow
  />
)}
```

**Ubicación**: Dentro de cada card de prospecto, después del nombre

---

### 3. Prospectos DataGrid

**Archivo**: `src/components/prospectos/ProspectosManager.tsx`  
**Líneas**: ~2000  
**Complejidad**: Alta

**Cambios necesarios**:
```typescript
// 1. Estado en ProspectosManager
const [prospectoLabels, setProspectoLabels] = useState<Record<string, ConversationLabel[]>>({});

// 2. Cargar al final de loadProspectos()
const prospectoIds = prospectos.map(p => p.id);
whatsappLabelsService.getBatchProspectosLabels(prospectoIds)
  .then(setProspectoLabels)
  .catch(console.error);

// 3. Pasar como prop a ProspectosKanban
<ProspectosKanban
  prospectos={filteredAndSortedProspectos}
  prospectoLabels={prospectoLabels} // ← Nuevo
  // ... resto de props
/>

// 4. En DataGrid, agregar columna de etiquetas
<td className="px-3 py-2">
  {prospectoLabels[prospecto.id] && (
    <ProspectoLabelBadges 
      labels={prospectoLabels[prospecto.id]} 
      size="sm"
    />
  )}
</td>
```

**Ubicación DataGrid**: Nueva columna después de "Etapa"

---

## ⏱️ Estimación

- Widget: 15 minutos
- Kanban: 20 minutos  
- DataGrid: 25 minutos

**Total**: ~1 hora

---

## 🎯 Resultado Esperado

**En todos los módulos**:
- ✅ Badges visibles con colores
- ✅ Sin opciones de edición
- ✅ Blur de fondo si `shadow_cell` activo (solo en Kanban)
- ✅ Carga en paralelo sin delays

---

**Estado**: Listo para implementar  
**Fecha**: 30 Diciembre 2025

