/**
 * ============================================
 * LOGO DEFAULT (Normal)
 * ============================================
 * 
 * Logo PQNC estándar sin animaciones especiales
 */

import React from 'react';

interface DefaultLogoProps {
  onClick?: () => void;
  isCollapsed?: boolean;
}

export const DefaultLogo: React.FC<DefaultLogoProps> = ({ onClick, isCollapsed = false }) => {
  if (isCollapsed) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className="hover:opacity-90 transition-opacity cursor-pointer"
      style={{ marginTop: '2px', marginLeft: '8px' }}
      title="PQNC QA AI Platform"
    >
      {/* Logo de texto estándar - SIN IMAGEN */}
      <div 
        className="text-2xl font-bold tracking-wider"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          height: '46px',
          display: 'flex',
          alignItems: 'center',
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.1em',
        }}
      >
        PQNC
      </div>
    </button>
  );
};

export default DefaultLogo;

