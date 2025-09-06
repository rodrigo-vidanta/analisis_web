import React from 'react';

interface SimpleLightSpeedProps {
  isVisible: boolean;
}

const SimpleLightSpeed: React.FC<SimpleLightSpeedProps> = ({ isVisible }) => {
  console.log('🚀 SimpleLightSpeed - isVisible:', isVisible);

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'black',
        zIndex: 99999, // Z-index muy alto para estar por encima de la pantalla de carga
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '2rem',
        fontWeight: 'bold'
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚀</div>
        <div>Viajando a velocidad luz...</div>
        <div style={{ fontSize: '1rem', marginTop: '1rem', opacity: 0.7 }}>
          Esta es una prueba simple
        </div>
      </div>
    </div>
  );
};

export default SimpleLightSpeed;
