/**
 * RemotionLoginBackground
 *
 * Wrapper que renderiza la composicion NeuralConstellation
 * usando @remotion/player como fondo animado del login.
 * Loop infinito, sin controles, responsivo con object-fit: cover.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { Player } from '@remotion/player';
import { NeuralConstellation } from './NeuralConstellation';

const FPS = 30;
const DURATION_SECONDS = 20;
const COMP_WIDTH = 1920;
const COMP_HEIGHT = 1080;
const COMP_ASPECT = COMP_WIDTH / COMP_HEIGHT;

export const RemotionLoginBackground: React.FC = () => {
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Calcular dimensiones tipo "cover": siempre cubrir todo el viewport
  const playerStyle = useMemo(() => {
    const viewportAspect = viewport.w / viewport.h;
    const width = viewportAspect > COMP_ASPECT ? viewport.w : viewport.h * COMP_ASPECT;
    const height = viewportAspect > COMP_ASPECT ? viewport.w / COMP_ASPECT : viewport.h;

    return {
      width: `${width}px`,
      height: `${height}px`,
      position: 'absolute' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }, [viewport]);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
      <Player
        component={NeuralConstellation}
        compositionWidth={COMP_WIDTH}
        compositionHeight={COMP_HEIGHT}
        durationInFrames={FPS * DURATION_SECONDS}
        fps={FPS}
        loop
        autoPlay
        controls={false}
        showVolumeControls={false}
        clickToPlay={false}
        style={playerStyle}
        inputProps={{}}
      />
    </div>
  );
};
