import React, { useState, useRef, useEffect } from 'react';
import { type FeedbackData } from '../../services/feedbackService';

// ============================================
// INTERFACES Y TIPOS
// ============================================

interface FeedbackTooltipProps {
  feedback: FeedbackData;
  children: React.ReactElement;
  maxPreviewLength?: number;
}

interface TooltipPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const FeedbackTooltip: React.FC<FeedbackTooltipProps> = ({
  feedback,
  children,
  maxPreviewLength = 250
}) => {
  // Estados del tooltip
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({ top: 0, left: 0, placement: 'top' });
  
  // Referencias
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // ============================================
  // FUNCIONES DE UTILIDAD
  // ============================================
  
  const generatePreview = (text: string): string => {
    if (text.length <= maxPreviewLength) return text;
    
    // Cortar en la palabra más cercana para evitar cortes abruptos
    const truncated = text.substring(0, maxPreviewLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > maxPreviewLength * 0.8) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  };
  
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const calculateOptimalPosition = (): TooltipPosition => {
    if (!triggerRef.current || !tooltipRef.current) {
      return { top: 0, left: 0, placement: 'top' };
    }
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    // Posición inicial preferida (arriba)
    let top = triggerRect.top - tooltipRect.height - 12;
    let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
    let placement: TooltipPosition['placement'] = 'top';
    
    // Si no cabe arriba, ponerlo abajo
    if (top < 10) {
      top = triggerRect.bottom + 12;
      placement = 'bottom';
    }
    
    // Ajustar horizontalmente si se sale del viewport
    if (left < 10) {
      left = 10;
    } else if (left + tooltipRect.width > viewport.width - 10) {
      left = viewport.width - tooltipRect.width - 10;
    }
    
    // Si aún no cabe, usar posición lateral
    if (top + tooltipRect.height > viewport.height - 10 && placement === 'bottom') {
      top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
      left = triggerRect.right + 12;
      placement = 'right';
      
      // Si tampoco cabe a la derecha, intentar a la izquierda
      if (left + tooltipRect.width > viewport.width - 10) {
        left = triggerRect.left - tooltipRect.width - 12;
        placement = 'left';
      }
    }
    
    return { top, left, placement };
  };
  
  // ============================================
  // HANDLERS DE EVENTOS
  // ============================================
  
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      
      // Calcular posición después de que el tooltip sea visible
      setTimeout(() => {
        const newPosition = calculateOptimalPosition();
        setPosition(newPosition);
      }, 10);
    }, 300); // Delay de 300ms para evitar tooltips accidentales
  };
  
  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 150); // Delay pequeño para permitir mover el mouse al tooltip
  };
  
  const handleTooltipMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
  
  const handleTooltipMouseLeave = () => {
    setIsVisible(false);
  };
  
  // ============================================
  // EFECTOS
  // ============================================
  
  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Manejar scroll y resize para ocultar tooltip
  useEffect(() => {
    const handleScrollOrResize = () => {
      setIsVisible(false);
    };
    
    if (isVisible) {
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isVisible]);
  
  // ============================================
  // DATOS PARA EL TOOLTIP
  // ============================================
  
  const previewText = generatePreview(feedback.feedback_text);
  const creatorName = feedback.created_by?.name || 'Usuario Desconocido';
  const createdDate = feedback.created_at ? formatDate(feedback.created_at) : 'Fecha desconocida';
  const updatedDate = feedback.updated_at && feedback.updated_by ? formatDate(feedback.updated_at) : null;
  const updaterName = feedback.updated_by?.name;
  
  // ============================================
  // ESTILOS DINÁMICOS
  // ============================================
  
  const getArrowStyles = () => {
    const arrowSize = 8;
    
    switch (position.placement) {
      case 'top':
        return {
          position: 'absolute' as const,
          bottom: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          borderTop: `${arrowSize}px solid rgba(15, 23, 42, 0.95)`
        };
      case 'bottom':
        return {
          position: 'absolute' as const,
          top: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid rgba(15, 23, 42, 0.95)`
        };
      case 'left':
        return {
          position: 'absolute' as const,
          right: -arrowSize,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 0,
          height: 0,
          borderTop: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid transparent`,
          borderLeft: `${arrowSize}px solid rgba(15, 23, 42, 0.95)`
        };
      case 'right':
        return {
          position: 'absolute' as const,
          left: -arrowSize,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 0,
          height: 0,
          borderTop: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid rgba(15, 23, 42, 0.95)`
        };
    }
  };
  
  // ============================================
  // RENDER
  // ============================================
  
  return (
    <>
      {/* Trigger Element */}
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      
      {/* Tooltip */}
      {isVisible && (
        <div
          ref={tooltipRef}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          className="fixed z-[60] max-w-sm"
          style={{
            top: position.top,
            left: position.left,
          }}
        >
          {/* Contenedor principal con glassmorphism */}
          <div className="bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-sm text-white rounded-xl shadow-2xl border border-gray-700/50 p-4 animate-in fade-in-0 zoom-in-95 duration-200">
            
            {/* Header del tooltip */}
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-600/30">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-xs font-medium text-green-400 uppercase tracking-wide">
                Retroalimentación
              </span>
            </div>
            
            {/* Preview del texto */}
            <div className="mb-3">
              <p className="text-sm text-gray-100 leading-relaxed">
                {previewText}
              </p>
            </div>
            
            {/* Metadata */}
            <div className="space-y-1 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span><strong>Creada por:</strong> {creatorName}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{createdDate}</span>
              </div>
              
              {updatedDate && updaterName && (
                <div className="flex items-center gap-2 pt-1 border-t border-gray-600/30">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span><strong>Editada por:</strong> {updaterName} • {updatedDate}</span>
                </div>
              )}
              
              {/* Estadísticas */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-600/30">
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {feedback.view_count || 0} vistas
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                    {feedback.helpful_votes || 0} útiles
                  </span>
                </div>
                
                <span className="text-blue-400 font-medium">
                  Click para ver completa
                </span>
              </div>
            </div>
            
            {/* Arrow del tooltip */}
            <div style={getArrowStyles()}></div>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackTooltip;
