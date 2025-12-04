/**
 * Componente AnimatedGradientBackground
 * 
 * Gradientes radiales animados con aceleración GPU y partículas sutiles.
 * Efecto discreto y no saturado.
 */

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  life: number;
}

export const AnimatedGradientBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const gradientRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current || !gradientRef.current) return;

    const container = containerRef.current;
    const gradientElement = gradientRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0';
    canvas.style.opacity = '0.7'; // Más visible pero discreto
    
    container.appendChild(canvas);

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();

    // Crear partículas iniciales (más pequeñas con glow sutil)
    const createParticle = (): Particle => ({
      x: Math.random() * window.innerWidth,
      y: window.innerHeight + Math.random() * 100, // Empiezan desde abajo
      size: Math.random() * 1.5 + 0.6, // Más pequeñas (0.6-2.1px)
      speed: Math.random() * 0.4 + 0.2, // Más lentas (0.2-0.6px/frame)
      opacity: Math.random() * 0.5 + 0.3, // Más visibles (0.3-0.8)
      life: 0,
    });

    // Inicializar partículas (más partículas para efecto más visible)
    for (let i = 0; i < 20; i++) {
      particlesRef.current.push(createParticle());
    }

    // Función de animación
    const animate = () => {
      timeRef.current += 0.01;

      // Animar gradientes radiales en círculos tipo yin-yang con aceleración GPU
      // Movimiento circular suave y lento
      const radius = 60; // Radio del movimiento circular
      const speed1 = 0.15; // Velocidad muy lenta para gradiente 1
      const speed2 = 0.12; // Velocidad muy lenta para gradiente 2 (contrario)
      const speed3 = 0.18; // Velocidad muy lenta para gradiente 3
      
      // Movimiento circular tipo yin-yang (opuestos)
      const angle1 = timeRef.current * speed1;
      const angle2 = timeRef.current * speed2 + Math.PI; // Opuesto (180°)
      const angle3 = timeRef.current * speed3 + Math.PI / 2; // 90° diferente
      
      const x1 = Math.cos(angle1) * radius;
      const y1 = Math.sin(angle1) * radius;
      const x2 = Math.cos(angle2) * radius;
      const y2 = Math.sin(angle2) * radius;
      const x3 = Math.cos(angle3) * radius;
      const y3 = Math.sin(angle3) * radius;
      
      // Aplicar posiciones con aceleración GPU
      gradientElement.style.background = `
        radial-gradient(circle at ${50 + x1}% ${50 + y1}%, rgba(120, 119, 198, 0.2) 0%, transparent 50%),
        radial-gradient(circle at ${50 + x2}% ${50 + y2}%, rgba(255, 119, 198, 0.1) 0%, transparent 50%),
        radial-gradient(circle at ${50 + x3}% ${50 + y3}%, rgba(120, 219, 255, 0.08) 0%, transparent 50%)
      `;
      gradientElement.style.transform = `translate3d(0, 0, 0)`; // Aceleración GPU

      // Limpiar canvas para partículas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Actualizar y dibujar partículas
      const midScreen = canvas.height / 2;
      
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        
        // Mover partícula hacia arriba
        p.y -= p.speed;
        p.life += p.speed;
        
        // Desvanecer cuando llegan a la mitad de la pantalla
        const distanceToMid = Math.abs(p.y - midScreen);
        const fadeStart = midScreen * 0.3; // Empiezan a desvanecerse antes
        let currentOpacity = p.opacity;
        
        if (distanceToMid < fadeStart) {
          // Desvanecer progresivamente
          currentOpacity = p.opacity * (distanceToMid / fadeStart);
        }
        
        // Dibujar partícula con glow menos marcado
        ctx.save();
        ctx.globalAlpha = currentOpacity;
        
        // Glow exterior más sutil
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 1.5);
        gradient.addColorStop(0, 'rgba(148, 163, 184, 0.5)');
        gradient.addColorStop(0.6, 'rgba(148, 163, 184, 0.2)');
        gradient.addColorStop(1, 'rgba(148, 163, 184, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Punto central más discreto
        ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();

        // Eliminar si está fuera de la pantalla o muy desvanecida
        if (p.y < -10 || currentOpacity < 0.05) {
          particlesRef.current.splice(i, 1);
        }
      }

      // Añadir nuevas partículas continuamente para mantener el efecto
      if (particlesRef.current.length < 20 && Math.random() < 0.5) {
        particlesRef.current.push(createParticle());
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="animated-gradient-container">
      {/* Gradientes radiales animados */}
      <div
        ref={gradientRef}
        className="animated-gradient-background"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          willChange: 'background, transform',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
    </div>
  );
};

