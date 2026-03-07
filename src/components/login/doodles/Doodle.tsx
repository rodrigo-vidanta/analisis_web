import React, { useMemo } from 'react';
import type { DoodleConfig, DoodleExpression } from './types';

interface DoodleProps {
  config: DoodleConfig;
  expression: DoodleExpression;
  mouseX: number; // 0-1 normalizado
  mouseY: number;
}

/** Offset de pupila basado en posicion del mouse */
const getPupilOffset = (
  mouseX: number,
  mouseY: number,
  maxOffset: number
): { dx: number; dy: number } => {
  // Mouse normalizado 0-1, centro en 0.5
  const dx = (mouseX - 0.5) * 2; // -1 a 1
  const dy = (mouseY - 0.5) * 2;
  return {
    dx: dx * maxOffset,
    dy: dy * maxOffset * 0.7, // menos movimiento vertical
  };
};

/** Altura del parpado segun expresion */
const getEyelidHeight = (expr: DoodleExpression): number => {
  switch (expr) {
    case 'bored': return 12;
    case 'shy': return 42; // Cubre ojos completamente sin brazos
    default: return 0;
  }
};

/** Paths de boca por expresion */
const MOUTH_PATHS: Record<DoodleExpression, { d: string; fill: boolean }> = {
  idle: { d: 'M 62 138 Q 80 150, 98 138', fill: false },
  excited: { d: 'M 57 134 Q 80 162, 103 134 Z', fill: true },
  shy: { d: 'M 68 140 Q 74 144, 80 140 Q 86 136, 92 140', fill: false },
  disapproval: { d: 'M 62 148 Q 80 134, 98 148', fill: false },
  confused: { d: 'M 62 140 Q 71 148, 80 138 Q 89 130, 98 140', fill: false },
  bored: { d: 'M 65 140 L 95 140', fill: false },
};

const TRANSITION = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

const Doodle: React.FC<DoodleProps> = ({ config, expression, mouseX, mouseY }) => {
  const pupil = useMemo(() => getPupilOffset(mouseX, mouseY, 7), [mouseX, mouseY]);
  const eyelidH = getEyelidHeight(expression);
  const showCheeks = expression === 'excited';

  // IDs unicos para clip-paths (evitar colisiones entre doodles)
  const clipL = `eye-clip-l-${config.id}`;
  const clipR = `eye-clip-r-${config.id}`;

  // Shy: ocultar pupilas debajo de parpados cerrados
  const pupilVisible = expression !== 'shy';

  // Bounce sutil para excited
  const bodyTransform = expression === 'excited'
    ? 'translateY(-6px)'
    : expression === 'disapproval'
      ? 'translateX(3px)'
      : 'translateY(0)';

  return (
    <g style={{ transition: TRANSITION, transform: bodyTransform }}>
      {/* Cuerpo - pill shape, height extendida para ocultar redondeo inferior */}
      <rect x="18" y="30" width="124" height="350" rx="55" ry="55" fill={config.color} />
      {/* Borde sutil */}
      <rect
        x="18" y="30" width="124" height="350" rx="55" ry="55"
        fill="none" stroke={config.darkColor} strokeWidth="2" opacity="0.3"
      />

      {/* Clip paths para parpados */}
      <defs>
        <clipPath id={clipL}>
          <ellipse cx="57" cy="100" rx="19" ry="21" />
        </clipPath>
        <clipPath id={clipR}>
          <ellipse cx="103" cy="100" rx="19" ry="21" />
        </clipPath>
      </defs>

      {/* Ojos - blancos */}
      <ellipse cx="57" cy="100" rx="18" ry="20" fill="white" />
      <ellipse cx="103" cy="100" rx="18" ry="20" fill="white" />

      {/* Pupilas */}
      {pupilVisible && (
        <>
          <circle
            cx={57 + pupil.dx}
            cy={100 + pupil.dy}
            r={expression === 'excited' ? 10 : 8}
            fill="#1e1e3f"
            style={{ transition: 'r 0.3s ease' }}
          />
          <circle
            cx={103 + pupil.dx}
            cy={100 + pupil.dy}
            r={expression === 'excited' ? 10 : 8}
            fill="#1e1e3f"
            style={{ transition: 'r 0.3s ease' }}
          />
          {/* Brillos */}
          <circle cx={57 + pupil.dx + 3} cy={100 + pupil.dy - 3} r="3" fill="white" />
          <circle cx={103 + pupil.dx + 3} cy={100 + pupil.dy - 3} r="3" fill="white" />
        </>
      )}

      {/* Parpados (overlay sobre ojos) */}
      <rect
        x="38" y="79"
        width="38" height={eyelidH}
        fill={config.color}
        clipPath={`url(#${clipL})`}
        style={{ transition: TRANSITION }}
      />
      <rect
        x="84" y="79"
        width="38" height={eyelidH}
        fill={config.color}
        clipPath={`url(#${clipR})`}
        style={{ transition: TRANSITION }}
      />

      {/* Ojos cerrados - media luna hacia abajo (delay para que aparezca después del cierre) */}
      <path
        d="M 45 102 Q 57 112, 69 102"
        fill="none"
        stroke={config.darkColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity={expression === 'shy' ? 1 : 0}
        style={{ transition: expression === 'shy' ? 'opacity 0.15s ease 0.35s' : 'opacity 0.15s ease' }}
      />
      <path
        d="M 91 102 Q 103 112, 115 102"
        fill="none"
        stroke={config.darkColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity={expression === 'shy' ? 1 : 0}
        style={{ transition: expression === 'shy' ? 'opacity 0.15s ease 0.35s' : 'opacity 0.15s ease' }}
      />

      {/* Cejas */}
      {expression === 'disapproval' && (
        <>
          <line x1="42" y1="78" x2="60" y2="73" stroke={config.darkColor} strokeWidth="3" strokeLinecap="round" />
          <line x1="100" y1="73" x2="118" y2="78" stroke={config.darkColor} strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {expression === 'confused' && (
        <>
          <line x1="42" y1="78" x2="58" y2="75" stroke={config.darkColor} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="100" y1="72" x2="118" y2="80" stroke={config.darkColor} strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {/* Mejillas sonrojadas */}
      {showCheeks && (
        <>
          <ellipse cx="40" cy="125" rx="10" ry="7" fill={config.cheekColor} opacity="0.5" />
          <ellipse cx="120" cy="125" rx="10" ry="7" fill={config.cheekColor} opacity="0.5" />
        </>
      )}

      {/* Boca - todas las expresiones renderizadas, opacity controla cual se ve */}
      {(Object.keys(MOUTH_PATHS) as DoodleExpression[]).map((expr) => {
        const mouth = MOUTH_PATHS[expr];
        return (
          <path
            key={expr}
            d={mouth.d}
            fill={mouth.fill ? '#1e1e3f' : 'none'}
            stroke={mouth.fill ? 'none' : '#1e1e3f'}
            strokeWidth={mouth.fill ? 0 : 2.5}
            strokeLinecap="round"
            opacity={expression === expr ? 1 : 0}
            style={{ transition: 'opacity 0.3s ease' }}
          />
        );
      })}
    </g>
  );
};

export default Doodle;
