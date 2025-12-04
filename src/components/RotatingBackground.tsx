/**
 * Componente RotatingBackground
 * 
 * Aplica rotación lenta y suave SOLO al fondo (tech-gradient) con aceleración GPU.
 * El contenido NO gira.
 * Optimizado para rendimiento.
 */

import { useEffect, useRef } from 'react';

export const RotatingBackground: React.FC = () => {
  const rotationRef = useRef<number>(0);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    const backgroundElement = document.getElementById('login-background');
    if (!backgroundElement) return;

    // Crear estilo dinámico para rotar solo el ::before
    const style = document.createElement('style');
    style.id = 'rotating-background-style';
    styleRef.current = style;
    document.head.appendChild(style);

    // Función de animación con aceleración GPU
    const animate = () => {
      rotationRef.current += 0.0064; // Rotación 20% más lenta (0.0064 grados por frame)
      
      // Aplicar rotación solo al ::before usando CSS custom property
      backgroundElement.style.setProperty('--rotation', `${rotationRef.current}deg`);
      style.textContent = `
        #login-background::before {
          transform: rotate3d(0, 0, 1, var(--rotation, 0deg)) !important;
        }
      `;
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (styleRef.current && document.head.contains(styleRef.current)) {
        document.head.removeChild(styleRef.current);
      }
    };
  }, []);

  return null; // Componente sin renderizado visual
};

