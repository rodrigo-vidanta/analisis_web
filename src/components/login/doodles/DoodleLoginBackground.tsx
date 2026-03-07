/**
 * DoodleLoginBackground
 *
 * Fondo interactivo con 3 doodles SVG que reaccionan al usuario:
 * - Ojos siguen el mouse
 * - Se emocionan al enfocar email
 * - Se tapan los ojos al enfocar password
 * - Desaprobacion al fallar login
 * - Confusion al hacer backspace en email
 * - Indiferentes si el mouse esta en los bordes
 */
import React, { useMemo } from 'react';
import type { DoodleInteraction, DoodleExpression, DoodleConfig } from './types';
import Doodle from './Doodle';

const DOODLES: DoodleConfig[] = [
  {
    id: 'blue',
    color: '#4A6A9B',
    darkColor: '#364F75',
    cheekColor: '#C98A95',
    xPercent: 15,
    fromTop: false,
    scale: 1.2,
    flipX: false,
  },
  {
    id: 'purple',
    color: '#7A6B9A',
    darkColor: '#5C4F78',
    cheekColor: '#C99AAA',
    xPercent: 92,
    fromTop: false,
    scale: 1.0,
    flipX: true,
  },
  {
    id: 'teal',
    color: '#4A8A7E',
    darkColor: '#366B62',
    cheekColor: '#C9A088',
    xPercent: 85,
    fromTop: true,
    scale: 0.95,
    flipX: false,
  },
];

/** Determinar expresion basada en interaccion */
const getExpression = (interaction: DoodleInteraction): DoodleExpression => {
  if (interaction.hasError) return 'disapproval';
  if (interaction.isTypingError) return 'confused';
  if (interaction.activeField === 'password') return 'shy';
  if (interaction.activeField === 'email') return 'excited';

  // Distancia del mouse al centro del viewport
  const distFromCenter = Math.sqrt(
    (interaction.mouseX - 0.5) ** 2 + (interaction.mouseY - 0.5) ** 2
  );
  if (distFromCenter > 0.45) return 'bored';
  if (distFromCenter < 0.2) return 'excited';
  return 'idle';
};

interface Props {
  interaction: DoodleInteraction;
}

export const DoodleLoginBackground: React.FC<Props> = ({ interaction }) => {
  const expression = useMemo(() => getExpression(interaction), [interaction]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Gradiente de fondo sutil para el area de los doodles */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.2) 100%)',
        }}
      />

      {DOODLES.map((config) => {
        // Escala responsiva basada en viewport
        const baseScale = typeof window !== 'undefined'
          ? Math.min(1.2, Math.max(0.6, window.innerWidth / 1200))
          : 1;
        const scale = config.scale * baseScale;

        // Contenedor mas grande para doodles visibles
        const doodleW = 220;
        const doodleH = 380;

        // Posicionamiento
        const style: React.CSSProperties = {
          position: 'absolute',
          left: `${config.xPercent}%`,
          transform: `translateX(-50%) scale(${scale})${config.flipX ? ' scaleX(-1)' : ''}`,
          transformOrigin: 'center bottom',
          width: `${doodleW}px`,
          height: `${doodleH}px`,
        };

        if (config.fromTop) {
          // Doodle colgante: rotado 180deg, asoma desde arriba
          style.top = '-160px';
          style.transformOrigin = 'center top';
          style.transform = `translateX(-50%) scale(${scale}) rotate(180deg)${config.flipX ? ' scaleX(-1)' : ''}`;
        } else {
          // Doodle asomando desde abajo
          style.bottom = '-100px';
        }

        return (
          <div key={config.id} style={style}>
            <svg
              viewBox="0 0 160 280"
              width={doodleW}
              height={doodleH}
            >
              <Doodle
                config={config}
                expression={expression}
                mouseX={interaction.mouseX}
                mouseY={interaction.mouseY}
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
};
