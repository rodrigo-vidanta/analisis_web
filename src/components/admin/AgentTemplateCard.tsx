import React, { useState, useEffect } from 'react';
import { type AgentTemplate } from '../../config/supabase';

interface AgentTemplateCardProps {
  template: AgentTemplate;
  onClick: () => void;
  onDelete?: (templateId: string) => void;
  onEdit?: (templateId: string) => void;
}

// Array de gradientes muy oscuros y pronunciados
const AGENT_AVATARS = [
  'linear-gradient(135deg, #2D1B69 0%, #4C1D95 30%, #7C3AED 70%, #C084FC 100%)', // Morado ultra oscuro
  'linear-gradient(135deg, #7C2D12 0%, #C2410C 30%, #EA580C 70%, #FB923C 100%)', // Naranja ultra oscuro
  'linear-gradient(135deg, #042F2E 0%, #0D9488 30%, #14B8A6 70%, #2DD4BF 100%)', // Turquesa ultra oscuro
  'linear-gradient(135deg, #450A0A 0%, #991B1B 30%, #DC2626 70%, #F87171 100%)', // Rojo ultra oscuro
  'linear-gradient(135deg, #1F2937 0%, #374151 30%, #6B7280 70%, #D1D5DB 100%)', // Gris ultra oscuro
  'linear-gradient(135deg, #78350F 0%, #D97706 30%, #F59E0B 70%, #FDE047 100%)', // Amarillo ultra oscuro
];

const AgentTemplateCard: React.FC<AgentTemplateCardProps> = ({ template, onClick, onDelete, onEdit }) => {
  const [deleteState, setDeleteState] = useState<'idle' | 'warning' | 'ready'>('idle');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (deleteState === 'warning' && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setDeleteState('ready');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [deleteState, countdown]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🗑️ Delete button clicked, state:', deleteState);
    
    if (deleteState === 'idle') {
      console.log('⏰ Starting delete countdown for:', template.name);
      setDeleteState('warning');
      setCountdown(30);
    } else if (deleteState === 'ready') {
      console.log('💥 Executing delete for:', template.name);
      onDelete?.(template.id);
      setDeleteState('idle');
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteState('idle');
    setCountdown(0);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('✏️ Edit button clicked for:', template.name);
    onEdit?.(template.id);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isButtonClick = target.closest('button') || target.tagName === 'BUTTON' || target.closest('[role="button"]');
    
    console.log('📇 Card clicked:', {
      deleteState,
      target: target.tagName,
      isButtonClick,
      targetClasses: target.className
    });
    
    // No hacer nada si estamos en modo de eliminación o si el clic viene de un botón
    if (deleteState !== 'idle' || isButtonClick) {
      console.log('❌ Click blocked:', { deleteState, isButtonClick });
      return;
    }
    
    console.log('✅ Opening agent editor for:', template.name);
    onClick();
  };

  // Función para obtener avatar consistente basado en ID
  const getAgentAvatar = (templateId: string) => {
    const hash = templateId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const index = Math.abs(hash) % AGENT_AVATARS.length;
    const selectedGradient = AGENT_AVATARS[index];
    console.log('🎨 Gradiente aplicado para', template.name, ':', selectedGradient);
    return selectedGradient;
  };

  const getAgentEmoji = (categoryName: string, agentType: string) => {
    if (agentType === 'outbound') {
      if (categoryName?.toLowerCase().includes('ventas')) return '💼';
      if (categoryName?.toLowerCase().includes('cobranza')) return '💰';
      return '📞';
    }
    // Inbound
    if (categoryName?.toLowerCase().includes('ventas')) return '🛍️';
    if (categoryName?.toLowerCase().includes('soporte')) return '🔧';
    if (categoryName?.toLowerCase().includes('cobranza')) return '💳';
    return '🎧';
  };
  
  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'Principiante';
      case 'intermediate':
        return 'Intermedio';
      case 'advanced':
        return 'Avanzado';
      default:
        return difficulty;
    }
  };



  return (
    <div 
      onClick={handleCardClick}
      className={`bg-white rounded-xl shadow-sm border cursor-pointer transition-all duration-200 transform relative group overflow-hidden ${
        deleteState === 'idle' 
          ? 'border-gray-200 hover:shadow-lg hover:-translate-y-1' 
          : deleteState === 'warning'
          ? 'border-orange-300 bg-orange-50'
          : 'border-red-300 bg-red-50'
      }`}
    >
      {/* Header con avatar y info */}
      <div className="relative">
        {/* Background gradient oscuro y marcado */}
        <div 
          className="h-20 w-full transition-all duration-200 ease-out overflow-hidden"
          style={{ backgroundImage: getAgentAvatar(template.id) }}
        />
        
        {/* Avatar circular con emoji */}
        <div className="absolute -bottom-5 left-4 z-20">
          <div className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-white">
            <span className="text-lg leading-none flex items-center justify-center">
              {getAgentEmoji(template.category?.name || '', template.agent_type || 'inbound')}
            </span>
          </div>
        </div>
        
        {/* Badges en esquina superior derecha */}
        <div className="absolute top-3 right-3 flex items-center space-x-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            template.agent_type === 'outbound' 
              ? 'bg-white/90 text-gray-700' 
              : 'bg-white/90 text-gray-700'
          }`}>
            {template.agent_type === 'outbound' ? 'OUT' : 'IN'}
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/90 text-gray-700">
            {getDifficultyText(template.difficulty)}
          </span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 pt-7 relative">
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 text-base group-hover:text-blue-600 transition-colors line-clamp-1">
            {template.name}
          </h3>
          <p className="text-sm text-gray-500">
            {template.category?.name || 'Sin categoría'}
          </p>
        </div>
        
        {/* Descripción */}
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {template.description || 'Plantilla de agente conversacional'}
        </p>

        {/* Keywords */}
        {template.keywords && template.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.keywords.slice(0, 2).map((keyword, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
              >
                {keyword}
              </span>
            ))}
            {template.keywords.length > 2 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-md">
                +{template.keywords.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Stats y tiempo */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{template.estimated_time || '30 min'}</span>
          </div>
          
          {template.usage_count > 0 && (
            <span>{template.usage_count} uso{template.usage_count !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Delete Button */}
      {onDelete && (
        <div className="absolute top-2 left-2 z-20" onClick={(e) => e.stopPropagation()}>
          {deleteState === 'idle' ? (
            <button
              onClick={handleDeleteClick}
              className="w-6 h-6 rounded-full bg-black bg-opacity-20 hover:bg-red-500 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
              title="Eliminar agente"
            >
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          ) : deleteState === 'warning' ? (
            <div className="flex items-center space-x-1 bg-orange-500 px-2 py-1 rounded-full">
              <span className="text-xs text-white font-medium">
                {countdown}s
              </span>
              <button
                onClick={handleCancelDelete}
                className="text-white hover:text-orange-200"
                title="Cancelar"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={handleDeleteClick}
              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-full text-xs font-medium transition-colors"
              title="Confirmar eliminación"
            >
              ¡Eliminar!
            </button>
          )}
        </div>
      )}

      {/* Edit Button */}
      {onEdit && (
        <div className="absolute bottom-2 right-2 z-20" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleEditClick}
            className="w-8 h-8 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 border border-gray-200"
            title="Editar agente"
          >
            <svg className="w-4 h-4 text-gray-600 hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default AgentTemplateCard;