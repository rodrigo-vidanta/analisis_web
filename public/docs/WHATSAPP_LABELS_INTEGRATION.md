

# Integración Sistema de Etiquetas WhatsApp

## ✅ Completado

- [x] Script SQL ejecutado en SYSTEM_UI
- [x] Servicio `whatsappLabelsService.ts` creado
- [x] Modal `WhatsAppLabelsModal.tsx` creado

## 📝 Pasos para Integrar en LiveChatCanvas

### 1. Imports Adicionales (inicio del archivo)

```typescript
import { WhatsAppLabelsModal } from './WhatsAppLabelsModal';
import { whatsappLabelsService, type ConversationLabel } from '../../services/whatsappLabelsService';
import { Tag } from 'lucide-react';
```

### 2. Estados Adicionales (en el componente LiveChatCanvas, línea ~950)

```typescript
// Estados para gestión de etiquetas
const [labelsModalOpen, setLabelsModalOpen] = useState(false);
const [selectedProspectoForLabels, setSelectedProspectoForLabels] = useState<{
  id: string;
  name: string;
} | null>(null);
const [prospectoLabels, setProspectoLabels] = useState<Record<string, ConversationLabel[]>>({});
```

### 3. Cargar Etiquetas en Batch (después de loadConversations, línea ~3400)

```typescript
// Función para cargar etiquetas de prospectos en batch
const loadProspectosLabels = useCallback(async (prospectoIds: string[]) => {
  if (prospectoIds.length === 0) return;
  
  try {
    const labelsMap = await whatsappLabelsService.getBatchProspectosLabels(prospectoIds);
    setProspectoLabels(labelsMap);
  } catch (error) {
    console.error('Error cargando etiquetas de prospectos:', error);
  }
}, []);

// Llamar después de cargar conversaciones
useEffect(() => {
  if (conversations.length > 0) {
    const prospectoIds = conversations.map(c => c.prospecto_id).filter(Boolean);
    loadProspectosLabels(prospectoIds);
  }
}, [conversations, loadProspectosLabels]);
```

### 4. Handlers para Etiquetas (línea ~3500)

```typescript
const handleOpenLabelsModal = (prospecto: { id: string; name: string }, e?: React.MouseEvent) => {
  if (e) e.stopPropagation();
  setSelectedProspectoForLabels(prospecto);
  setLabelsModalOpen(true);
};

const handleLabelsUpdate = () => {
  // Recargar etiquetas del prospecto modificado
  if (selectedProspectoForLabels) {
    whatsappLabelsService.getProspectoLabels(selectedProspectoForLabels.id)
      .then(labels => {
        setProspectoLabels(prev => ({
          ...prev,
          [selectedProspectoForLabels.id]: labels,
        }));
      })
      .catch(error => {
        console.error('Error recargando etiquetas:', error);
      });
  }
};
```

### 5. Modificar ConversationItemProps (línea ~826)

```typescript
interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  hasActiveCall: boolean;
  isBotPaused: boolean;
  requiereAtencion: boolean;
  unreadCount: number;
  userRole: string | undefined;
  userId?: string;
  // NUEVO
  labels: ConversationLabel[];
  onLabelsClick: (e: React.MouseEvent) => void;
  // Existentes
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onCallClick: () => void;
  getStatusIndicator: (status: string) => React.ReactNode;
  formatTimeAgo: (date: string | undefined) => string;
}
```

### 6. Actualizar ConversationItem (línea ~842)

```typescript
const ConversationItem = React.memo<ConversationItemProps>(({ 
  conversation,
  isSelected,
  hasActiveCall,
  isBotPaused,
  requiereAtencion,
  unreadCount,
  userRole,
  userId,
  labels, // NUEVO
  onLabelsClick, // NUEVO
  onSelect,
  onContextMenu,
  onCallClick,
  getStatusIndicator,
  formatTimeAgo
}) => {
  // Determinar si hay shadow_cell activo
  const shadowLabel = labels.find(l => l.shadow_cell);
  
  return (
    <div
      className={`relative p-4 border-b border-slate-50 dark:border-gray-700 cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500 shadow-sm'
          : 'hover:bg-slate-25 dark:hover:bg-gray-700/50'
      }`}
      onClick={onSelect}
      onContextMenu={onContextMenu}
    >
      {/* Blur de fondo si hay shadow_cell */}
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
      
      {/* Contenido del card (relativo al blur) */}
      <div className="relative z-10">
        <div className="flex items-start space-x-3">
          <ConversationAvatar
            hasActiveCall={hasActiveCall}
            isBotPaused={isBotPaused}
            customerName={conversation.customer_name}
            onCallClick={onCallClick}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {conversation.customer_name}
                </h3>
                {userId && conversation.metadata?.ejecutivo_id && (
                  <BackupBadgeWrapper
                    currentUserId={userId}
                    prospectoEjecutivoId={conversation.metadata.ejecutivo_id}
                    variant="compact"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <RequiereAtencionListFlag 
                  prospectId={conversation.prospecto_id || conversation.id}
                  requiereAtencionHumana={requiereAtencion} 
                />
                {unreadCount > 0 && (
                  <div className="bg-green-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {Math.min(unreadCount, 99)}
                  </div>
                )}
                {getStatusIndicator(conversation.status || '')}
              </div>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">{conversation.customer_phone}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">{conversation.metadata?.etapa}</p>
            
            {/* NUEVO: Etiquetas */}
            {labels.length > 0 && (
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {labels.map(label => (
                  <span
                    key={label.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border"
                    style={{
                      backgroundColor: `${label.color}15`,
                      borderColor: `${label.color}40`,
                      color: label.color,
                    }}
                    title={label.description || label.name}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full mr-1"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </span>
                ))}
                {/* Botón para gestionar etiquetas */}
                <button
                  onClick={onLabelsClick}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  title="Gestionar etiquetas"
                >
                  <Tag className="w-3 h-3" />
                </button>
              </div>
            )}
            
            {/* Si no hay etiquetas, mostrar solo el botón */}
            {labels.length === 0 && (
              <button
                onClick={onLabelsClick}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors mb-2"
                title="Agregar etiqueta"
              >
                <Tag className="w-3 h-3" />
                <span>Agregar etiqueta</span>
              </button>
            )}
            
            {/* Resto del contenido existente... */}
            <div className="flex items-center justify-between text-xs text-slate-400 dark:text-gray-500">
              <div className="flex items-center gap-2">
                <span>{Number(conversation.message_count ?? 0)} msj</span>
                {/* ... coordinacion y ejecutivo ... */}
              </div>
              <span>{formatTimeAgo(conversation.last_message_at || conversation.updated_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
```

### 7. Actualizar el map de conversations (línea ~5551)

```typescript
{filteredConversations.map((conversation) => {
  const prospectId = conversation.prospecto_id || conversation.id;
  const prospectoData = prospectId ? prospectosDataRef.current.get(prospectId) : null;
  const uchatId = conversation.conversation_id || conversation.metadata?.id_uchat || conversation.id_uchat;
  const pauseStatus = uchatId ? botPauseStatus[uchatId] : null;
  
  return (
    <ConversationItem
      key={conversation.id}
      conversation={conversation}
      isSelected={selectedConversation?.id === conversation.id}
      hasActiveCall={prospectsWithActiveCalls.has(conversation.prospecto_id)}
      isBotPaused={!!(pauseStatus?.isPaused && (
        pauseStatus.pausedUntil === null || 
        pauseStatus.pausedUntil > new Date()
      ))}
      requiereAtencion={prospectoData?.requiere_atencion_humana || false}
      unreadCount={Number(conversation.unread_count ?? unreadCounts[conversation.id] ?? conversation.mensajes_no_leidos ?? 0)}
      userRole={user?.role_name}
      userId={user?.id}
      // NUEVO
      labels={prospectoLabels[conversation.prospecto_id] || []}
      onLabelsClick={(e) => handleOpenLabelsModal({
        id: conversation.prospecto_id,
        name: conversation.customer_name || 'Conversación'
      }, e)}
      // Existentes
      onSelect={() => {
        isManualSelectionRef.current = true;
        selectedConversationRef.current = conversation.prospecto_id;
        setSelectedConversation(conversation);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (isCoordinador || isAdmin || isAdminOperativo || isCoordinadorCalidad) {
          const ejecutivoId = conversation.metadata?.ejecutivo_id || prospectoData?.ejecutivo_id;
          const coordinacionId = conversation.metadata?.coordinacion_id || prospectoData?.coordinacion_id;
          
          setAssignmentContextMenu({
            prospectId,
            coordinacionId,
            ejecutivoId,
            prospectData: prospectoData ? {
              id_dynamics: prospectoData.id_dynamics,
              nombre_completo: prospectoData.nombre_completo,
              nombre_whatsapp: prospectoData.nombre_whatsapp,
              email: prospectoData.email,
              whatsapp: prospectoData.whatsapp,
            } : undefined,
            position: { x: e.clientX, y: e.clientY }
          });
        }
      }}
      onCallClick={() => setAppMode('live-monitor')}
      getStatusIndicator={getStatusIndicator}
      formatTimeAgo={formatTimeAgo}
    />
  );
})}
```

### 8. Agregar el Modal (antes del último </div> del return principal, línea ~6950)

```typescript
{/* Modal de gestión de etiquetas */}
{labelsModalOpen && selectedProspectoForLabels && (
  <WhatsAppLabelsModal
    isOpen={labelsModalOpen}
    onClose={() => {
      setLabelsModalOpen(false);
      setSelectedProspectoForLabels(null);
    }}
    prospectoId={selectedProspectoForLabels.id}
    prospectoName={selectedProspectoForLabels.name}
    onLabelsUpdate={handleLabelsUpdate}
  />
)}
```

## 🎨 Resultado

- ✅ Badges de etiquetas en cada card de conversación
- ✅ Blur de fondo cuando `shadow_cell` está activo
- ✅ Botón para gestionar etiquetas
- ✅ Modal completo con creación, edición y eliminación
- ✅ Validaciones automáticas (máximo 3 por conversación, no contradictorias)
- ✅ 6 etiquetas predefinidas + hasta 6 personalizadas por usuario

## 📦 Archivos Modificados

- `src/components/chat/LiveChatCanvas.tsx` - Integración completa
- (Los demás archivos ya fueron creados)

## ✨ Funcionalidades

1. **Etiquetas Predefinidas**: 6 etiquetas del sistema listas para usar
2. **Etiquetas Personalizadas**: Cada usuario puede crear hasta 6
3. **Sombrear Celda**: Destaca visualmente conversaciones importantes
4. **Validaciones**: Máximo 3 por conversación, no contradictorias
5. **Batch Loading**: Carga eficiente de etiquetas en paralelo

---

**Versión**: 1.0.0  
**Fecha**: 29 Diciembre 2025

