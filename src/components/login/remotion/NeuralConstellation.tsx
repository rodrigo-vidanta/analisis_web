/**
 * Neural Constellation - Remotion Login Animation
 *
 * Animacion de fondo para login: red neuronal con nodos flotantes,
 * conexiones dinamicas y pulsos de energia. Representa la IA y
 * las conexiones de datos del sistema QA.
 */
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';

// Tipos
interface Node {
  id: number;
  baseX: number;
  baseY: number;
  radius: number;
  brightness: number;
  phase: number;
  orbitRadius: number;
  orbitSpeed: number;
  pulseSpeed: number;
}

interface PulseRing {
  nodeIndex: number;
  startFrame: number;
  duration: number;
}

// Generar nodos deterministicos con seed
const generateNodes = (count: number, width: number, height: number): Node[] => {
  const nodes: Node[] = [];
  const seed = 42;
  const seededRandom = (i: number) => {
    const x = Math.sin(seed + i * 127.1) * 43758.5453;
    return x - Math.floor(x);
  };

  for (let i = 0; i < count; i++) {
    nodes.push({
      id: i,
      baseX: seededRandom(i * 3) * width,
      baseY: seededRandom(i * 3 + 1) * height,
      radius: seededRandom(i * 3 + 2) * 2.5 + 1,
      brightness: seededRandom(i * 7) * 0.6 + 0.4,
      phase: seededRandom(i * 11) * Math.PI * 2,
      orbitRadius: seededRandom(i * 13) * 30 + 10,
      orbitSpeed: (seededRandom(i * 17) * 0.4 + 0.1) * (seededRandom(i * 19) > 0.5 ? 1 : -1),
      pulseSpeed: seededRandom(i * 23) * 0.02 + 0.005,
    });
  }
  return nodes;
};

// Generar pulsos deterministicos
const generatePulses = (nodeCount: number, totalFrames: number): PulseRing[] => {
  const pulses: PulseRing[] = [];
  const seed = 137;
  const seededRandom = (i: number) => {
    const x = Math.sin(seed + i * 91.7) * 12345.6789;
    return x - Math.floor(x);
  };

  for (let i = 0; i < 12; i++) {
    pulses.push({
      nodeIndex: Math.floor(seededRandom(i * 5) * nodeCount),
      startFrame: Math.floor(seededRandom(i * 5 + 1) * totalFrames),
      duration: Math.floor(seededRandom(i * 5 + 2) * 90 + 60),
    });
  }
  return pulses;
};

// Obtener posicion del nodo en el frame actual
const getNodePosition = (node: Node, frame: number, fps: number) => {
  const time = frame / fps;
  const x = node.baseX + Math.cos(time * node.orbitSpeed + node.phase) * node.orbitRadius;
  const y = node.baseY + Math.sin(time * node.orbitSpeed * 0.7 + node.phase) * node.orbitRadius * 0.6;
  return { x, y };
};

// Distancia entre dos puntos
const distance = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

// Colores del tema PQNC
const COLORS = {
  blue: { r: 59, g: 130, b: 246 },
  purple: { r: 139, g: 92, b: 246 },
  cyan: { r: 6, g: 182, b: 212 },
  indigo: { r: 99, g: 102, b: 241 },
};

const COLOR_ARRAY = [COLORS.blue, COLORS.purple, COLORS.cyan, COLORS.indigo];

export const NeuralConstellation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const NODE_COUNT = 35;
  const CONNECTION_DISTANCE = Math.min(width, height) * 0.22;

  const nodes = generateNodes(NODE_COUNT, width, height);
  const pulses = generatePulses(NODE_COUNT, durationInFrames);

  // Calcular posiciones actuales
  const positions = nodes.map(n => getNodePosition(n, frame, fps));

  // Fade in global
  const globalOpacity = interpolate(frame, [0, fps * 2], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent', opacity: globalOpacity }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          {/* Gradientes para conexiones */}
          {positions.map((pos, i) =>
            positions.slice(i + 1).map((pos2, j) => {
              const actualJ = i + 1 + j;
              const dist = distance(pos.x, pos.y, pos2.x, pos2.y);
              if (dist > CONNECTION_DISTANCE) return null;

              const colorA = COLOR_ARRAY[i % COLOR_ARRAY.length];
              const colorB = COLOR_ARRAY[actualJ % COLOR_ARRAY.length];

              return (
                <linearGradient
                  key={`grad-${i}-${actualJ}`}
                  id={`conn-${i}-${actualJ}`}
                  x1={pos.x}
                  y1={pos.y}
                  x2={pos2.x}
                  y2={pos2.y}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor={`rgb(${colorA.r},${colorA.g},${colorA.b})`} />
                  <stop offset="100%" stopColor={`rgb(${colorB.r},${colorB.g},${colorB.b})`} />
                </linearGradient>
              );
            })
          )}

          {/* Glow filter para nodos */}
          <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Glow mas suave para conexiones */}
          <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Conexiones entre nodos cercanos */}
        {positions.map((pos, i) =>
          positions.slice(i + 1).map((pos2, j) => {
            const actualJ = i + 1 + j;
            const dist = distance(pos.x, pos.y, pos2.x, pos2.y);
            if (dist > CONNECTION_DISTANCE) return null;

            const lineOpacity = interpolate(
              dist,
              [0, CONNECTION_DISTANCE],
              [0.35, 0],
              { extrapolateRight: 'clamp' }
            );

            // Pulso sutil en las lineas
            const pulse = Math.sin(frame * 0.03 + i * 0.5) * 0.1 + 0.9;

            return (
              <line
                key={`line-${i}-${actualJ}`}
                x1={pos.x}
                y1={pos.y}
                x2={pos2.x}
                y2={pos2.y}
                stroke={`url(#conn-${i}-${actualJ})`}
                strokeWidth={interpolate(dist, [0, CONNECTION_DISTANCE], [1.5, 0.3], {
                  extrapolateRight: 'clamp',
                })}
                opacity={lineOpacity * pulse}
                filter="url(#line-glow)"
              />
            );
          })
        )}

        {/* Nodos principales */}
        {nodes.map((node, i) => {
          const pos = positions[i];
          const color = COLOR_ARRAY[i % COLOR_ARRAY.length];
          const time = frame / fps;

          // Pulso individual de brillo
          const nodePulse = Math.sin(time * node.pulseSpeed * 60 + node.phase) * 0.3 + 0.7;
          const nodeOpacity = node.brightness * nodePulse;

          // Escala sutil
          const nodeScale = 1 + Math.sin(time * 0.5 + node.phase) * 0.15;
          const r = node.radius * nodeScale;

          return (
            <g key={`node-${i}`}>
              {/* Halo exterior */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r * 3}
                fill={`rgba(${color.r},${color.g},${color.b},${nodeOpacity * 0.08})`}
              />
              {/* Glow medio */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r * 1.8}
                fill={`rgba(${color.r},${color.g},${color.b},${nodeOpacity * 0.15})`}
              />
              {/* Nucleo */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r}
                fill={`rgba(${color.r},${color.g},${color.b},${nodeOpacity * 0.9})`}
                filter="url(#node-glow)"
              />
              {/* Punto central brillante */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r * 0.4}
                fill={`rgba(255,255,255,${nodeOpacity * 0.7})`}
              />
            </g>
          );
        })}

        {/* Anillos de pulso (ondas que emanan de nodos aleatorios) */}
        {pulses.map((pulse, i) => {
          const loopedFrame = frame % durationInFrames;
          const relativeFrame = loopedFrame - pulse.startFrame;
          if (relativeFrame < 0 || relativeFrame > pulse.duration) return null;

          const progress = relativeFrame / pulse.duration;
          const node = nodes[pulse.nodeIndex];
          const pos = getNodePosition(node, frame, fps);
          const color = COLOR_ARRAY[pulse.nodeIndex % COLOR_ARRAY.length];

          const ringRadius = interpolate(progress, [0, 1], [0, 80], {
            easing: Easing.out(Easing.quad),
          });

          const ringOpacity = interpolate(progress, [0, 0.2, 1], [0, 0.25, 0], {
            extrapolateRight: 'clamp',
          });

          return (
            <circle
              key={`pulse-${i}`}
              cx={pos.x}
              cy={pos.y}
              r={ringRadius}
              fill="none"
              stroke={`rgba(${color.r},${color.g},${color.b},${ringOpacity})`}
              strokeWidth={1.5}
            />
          );
        })}

        {/* Particulas de datos viajando por conexiones */}
        {positions.map((pos, i) => {
          // Solo algunas conexiones tienen particulas
          if (i % 5 !== 0) return null;
          const targetIdx = (i + 3) % positions.length;
          const target = positions[targetIdx];
          const dist = distance(pos.x, pos.y, target.x, target.y);
          if (dist > CONNECTION_DISTANCE * 1.2) return null;

          const time = frame / fps;
          const t = ((time * 0.3 + i * 0.1) % 1);
          const px = pos.x + (target.x - pos.x) * t;
          const py = pos.y + (target.y - pos.y) * t;
          const color = COLOR_ARRAY[i % COLOR_ARRAY.length];

          const particleOpacity = interpolate(t, [0, 0.1, 0.9, 1], [0, 0.8, 0.8, 0], {
            extrapolateRight: 'clamp',
            extrapolateLeft: 'clamp',
          });

          return (
            <circle
              key={`particle-${i}`}
              cx={px}
              cy={py}
              r={2}
              fill={`rgba(${color.r},${color.g},${color.b},${particleOpacity})`}
              filter="url(#node-glow)"
            />
          );
        })}
      </svg>

      {/* Gradiente de borde vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
