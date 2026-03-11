/**
 * ============================================
 * COMUNICADO INTERACTIVO: LLAMADAS VOICE
 * ============================================
 *
 * Presentacion animada estilo Apple keynote del sistema
 * de llamadas Voice con Twilio SDK. Usa Remotion Player
 * para animaciones de alta calidad con parallax.
 *
 * Escenas: Intro → WhatsApp → IA → Softphone → Transfer → Outro → Post-credits
 * Audio: /sounds/voice-calls-intro.mp3
 * Duracion: ~30 segundos
 * Visualizacion obligatoria (sin skip)
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  Audio,
} from 'remotion';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, CheckCircle } from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const FPS = 30;
const TOTAL_FRAMES = 900; // 30s
const COMP_W = 780;
const COMP_H = 480;

const SCENES = {
  INTRO:       { from: 0,   dur: 80 },
  WHATSAPP:    { from: 80,  dur: 125 },
  AI:          { from: 205, dur: 115 },
  SOFTPHONE:   { from: 320, dur: 145 },
  TRANSFER:    { from: 465, dur: 155 },
  OUTRO:       { from: 620, dur: 140 },
  POSTCREDITS: { from: 760, dur: 140 },
};

// ============================================
// HELPERS
// ============================================

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

const fadeIn = (frame: number, start: number, dur = 15) =>
  clamp((frame - start) / dur, 0, 1);

// ============================================
// BACKGROUND WITH PARALLAX
// ============================================

const ParallaxBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const orbs = [
    { x: '12%', y: 380, size: 280, color: '#06b6d4', speed: 0.45, blur: 65 },
    { x: '55%', y: 420, size: 220, color: '#8b5cf6', speed: 0.28, blur: 55 },
    { x: '82%', y: 330, size: 200, color: '#10b981', speed: 0.38, blur: 50 },
    { x: '35%', y: 480, size: 170, color: '#f59e0b', speed: 0.18, blur: 45 },
    { x: '70%', y: 500, size: 140, color: '#ec4899', speed: 0.32, blur: 40 },
  ];

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {orbs.map((o, i) => (
        <div key={i} style={{
          position: 'absolute', left: o.x,
          top: o.y - frame * o.speed,
          width: o.size, height: o.size, borderRadius: '50%',
          background: `radial-gradient(circle, ${o.color}22, transparent 70%)`,
          filter: `blur(${o.blur}px)`, transform: 'translateX(-50%)',
        }} />
      ))}
      {/* Subtle grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        transform: `translateY(${-frame * 0.15}px)`,
      }} />
    </AbsoluteFill>
  );
};

// ============================================
// SCENE 1: INTRO
// ============================================

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame: frame - 8, fps, config: { damping: 10, mass: 0.5 } });
  const titleOp = fadeIn(frame, 0, 18);
  const subtitleOp = fadeIn(frame, 38, 18);
  const glowScale = interpolate(frame, [0, 50], [0.2, 2], { extrapolateRight: 'clamp' });
  const glowOp = interpolate(frame, [0, 15, 55, 80], [0, 0.7, 0.5, 0.2], { extrapolateRight: 'clamp' });

  // Particles burst
  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const dist = interpolate(frame, [10, 50], [0, 150 + i * 8], { extrapolateRight: 'clamp' });
    const op = interpolate(frame, [10, 30, 60, 80], [0, 0.8, 0.4, 0], { extrapolateRight: 'clamp' });
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, op, size: 3 + (i % 3) };
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      {/* Central glow */}
      <div style={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, #06b6d450, transparent 70%)',
        transform: `scale(${glowScale})`, opacity: glowOp, filter: 'blur(40px)',
      }} />

      {/* Particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', width: p.size, height: p.size, borderRadius: '50%',
          background: i % 2 === 0 ? '#06b6d4' : '#8b5cf6',
          transform: `translate(${p.x}px, ${p.y}px)`, opacity: p.op,
        }} />
      ))}

      {/* Title */}
      <div style={{
        opacity: titleOp, transform: `scale(${titleScale})`,
        fontSize: 58, fontWeight: 900, color: 'white',
        letterSpacing: '-0.04em', lineHeight: 1, textAlign: 'center',
        textShadow: '0 0 60px #06b6d450, 0 4px 20px rgba(0,0,0,0.5)',
      }}>
        LLAMADAS VOICE
      </div>

      {/* Subtitle */}
      <div style={{
        opacity: subtitleOp, marginTop: 22,
        fontSize: 14, color: '#94a3b8', letterSpacing: '0.18em',
        textTransform: 'uppercase', fontWeight: 600,
      }}>
        WhatsApp &nbsp;→&nbsp; IA &nbsp;→&nbsp; Ejecutivo &nbsp;→&nbsp; Equipo
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// SCENE 2: WHATSAPP CALL
// ============================================

const WhatsAppScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneY = spring({ frame, fps, from: 250, to: 0, config: { damping: 13 } });
  const phoneOp = fadeIn(frame, 0, 15);
  const callPulse = frame > 40 ? 1 + Math.sin((frame - 40) * 0.2) * 0.12 : 1;
  const callGlow = frame > 40 ? 8 + Math.sin((frame - 40) * 0.2) * 8 : 0;
  const callingOp = fadeIn(frame, 70, 12);
  const labelOp = fadeIn(frame, 90, 15);

  // Cursor animation
  const cursorOp = fadeIn(frame, 45, 10);
  const cursorX = interpolate(frame, [45, 62], [60, 0], { extrapolateRight: 'clamp' });
  const cursorY = interpolate(frame, [45, 62], [40, 0], { extrapolateRight: 'clamp' });
  const clickRipple = frame > 64 ? fadeIn(frame, 64, 8) : 0;
  const clickScale = frame > 64 ? interpolate(frame, [64, 72], [0, 3], { extrapolateRight: 'clamp' }) : 0;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      {/* Phone mockup */}
      <div style={{
        opacity: phoneOp, transform: `translateY(${phoneY}px)`,
        width: 230, height: 400, borderRadius: 30,
        border: '2.5px solid #374151', background: '#0f172a',
        overflow: 'hidden', position: 'relative',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
      }}>
        {/* Notch */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 100, height: 24, borderRadius: '0 0 16px 16px', background: '#0f172a', zIndex: 10,
        }} />

        {/* WhatsApp header */}
        <div style={{
          background: 'linear-gradient(135deg, #075e54, #128c7e)',
          padding: '32px 14px 10px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ fontSize: 12, color: '#d1fae5' }}>←</div>
          <div style={{
            width: 34, height: 34, borderRadius: 17,
            background: 'linear-gradient(135deg, #10b981, #34d399)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: 'white', fontWeight: 700,
          }}>JP</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>Juan Perez</div>
            <div style={{ color: '#a7f3d0', fontSize: 10 }}>en linea</div>
          </div>
          {/* Phone icon */}
          <div style={{
            position: 'relative',
            width: 30, height: 30, borderRadius: 15,
            background: frame > 64 ? '#22c55e' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${callPulse})`,
            boxShadow: `0 0 ${callGlow}px #22c55e80`,
            transition: 'background 0.2s',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={frame > 64 ? 'white' : '#a7f3d0'} strokeWidth="2.5" strokeLinecap="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </svg>
            {/* Cursor */}
            <div style={{
              position: 'absolute', opacity: cursorOp,
              transform: `translate(${cursorX}px, ${cursorY}px)`, zIndex: 20,
              right: -15, bottom: -15,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="#1e293b" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            {/* Click ripple */}
            <div style={{
              position: 'absolute', inset: -5, borderRadius: '50%',
              border: '2px solid #22c55e', opacity: 1 - clickRipple,
              transform: `scale(${clickScale})`,
            }} />
          </div>
        </div>

        {/* Chat messages */}
        <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            background: '#1e3a2f', borderRadius: '2px 10px 10px 10px',
            padding: '8px 12px', maxWidth: '82%', alignSelf: 'flex-start',
          }}>
            <div style={{ color: '#e2e8f0', fontSize: 11, lineHeight: 1.4 }}>
              Hola, vi el anuncio de Vidanta y estoy interesado...
            </div>
            <div style={{ color: '#6ee7b7', fontSize: 9, textAlign: 'right', marginTop: 3 }}>10:30</div>
          </div>
          <div style={{
            background: '#005c4b', borderRadius: '10px 2px 10px 10px',
            padding: '8px 12px', maxWidth: '78%', alignSelf: 'flex-end',
          }}>
            <div style={{ color: 'white', fontSize: 11, lineHeight: 1.4 }}>
              Con gusto le ayudo. Le puedo llamar?
            </div>
            <div style={{ color: '#a7f3d0', fontSize: 9, textAlign: 'right', marginTop: 3 }}>10:31</div>
          </div>
        </div>

        {/* Calling overlay */}
        {frame > 68 && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.92)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', opacity: callingOp, zIndex: 5,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 32,
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px #22c55e40',
              animation: frame > 75 ? undefined : undefined,
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
            </div>
            <div style={{ color: 'white', fontSize: 15, fontWeight: 600, marginTop: 14 }}>
              Llamando...
            </div>
            <div style={{ color: '#22c55e', fontSize: 12, marginTop: 6 }}>
              +52 322 487 0413
            </div>
            {/* Ring animation */}
            {[0, 1, 2].map(i => {
              const ringOp = interpolate(
                (frame - 76 + i * 10) % 30, [0, 15, 30], [0.6, 0.2, 0], { extrapolateRight: 'clamp' }
              );
              const ringScale = interpolate(
                (frame - 76 + i * 10) % 30, [0, 30], [1, 2.5], { extrapolateRight: 'clamp' }
              );
              return frame > 76 ? (
                <div key={i} style={{
                  position: 'absolute', top: '42%', width: 70, height: 70,
                  borderRadius: '50%', border: '2px solid #22c55e',
                  opacity: ringOp, transform: `scale(${ringScale})`,
                }} />
              ) : null;
            })}
          </div>
        )}
      </div>

      {/* Label */}
      <div style={{
        position: 'absolute', bottom: 36, opacity: labelOp,
        color: '#e2e8f0', fontSize: 19, fontWeight: 700, textAlign: 'center',
        textShadow: '0 2px 12px rgba(0,0,0,0.6)',
      }}>
        El prospecto llama por WhatsApp
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// SCENE 3: AI PROCESSES & TRANSFERS
// ============================================

const AIScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const avatarScale = spring({ frame: frame - 5, fps, config: { damping: 12 } });
  const avatarOp = fadeIn(frame, 0, 15);
  const waveOp = fadeIn(frame, 15, 12);
  const speechOp = fadeIn(frame, 45, 15);
  const beamProgress = interpolate(frame, [70, 100], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const labelOp = fadeIn(frame, 85, 15);

  // Waveform bars
  const bars = Array.from({ length: 9 }, (_, i) => {
    const h = frame > 15 ? 8 + Math.abs(Math.sin(frame * 0.25 + i * 0.7)) * 28 : 8;
    return h;
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      {/* AI Avatar */}
      <div style={{
        opacity: avatarOp, transform: `scale(${avatarScale})`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 40,
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px #7c3aed40, 0 8px 32px rgba(0,0,0,0.4)',
          border: '3px solid #a855f730',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
          </svg>
        </div>
        <div style={{
          marginTop: 10, fontSize: 13, fontWeight: 700,
          color: '#c4b5fd', letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Natalia IA
        </div>
      </div>

      {/* Waveform */}
      <div style={{
        display: 'flex', gap: 5, alignItems: 'center',
        marginTop: 20, opacity: waveOp, height: 40,
      }}>
        {bars.map((h, i) => (
          <div key={i} style={{
            width: 4.5, height: h, borderRadius: 3,
            background: `linear-gradient(180deg, #a855f7, #7c3aed)`,
          }} />
        ))}
      </div>

      {/* Speech bubble */}
      <div style={{
        opacity: speechOp, marginTop: 20,
        background: '#1e1b4b', border: '1px solid #4c1d9550',
        borderRadius: 12, padding: '10px 18px',
        maxWidth: 320, textAlign: 'center',
      }}>
        <div style={{ color: '#e9d5ff', fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>
          &ldquo;Entendido, transfiriendo a tu ejecutivo...&rdquo;
        </div>
      </div>

      {/* Transfer beam */}
      <div style={{
        position: 'absolute', top: '45%', left: '52%',
        width: 300, height: 4, overflow: 'hidden',
        opacity: beamProgress > 0 ? 1 : 0,
      }}>
        <div style={{
          width: `${beamProgress * 100}%`, height: '100%',
          background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
          borderRadius: 2, boxShadow: '0 0 12px #06b6d460',
        }} />
      </div>

      {/* Label */}
      <div style={{
        position: 'absolute', bottom: 36, opacity: labelOp,
        color: '#e2e8f0', fontSize: 19, fontWeight: 700,
        textShadow: '0 2px 12px rgba(0,0,0,0.6)',
      }}>
        La IA procesa y transfiere al ejecutivo
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// SCENE 4: SOFTPHONE APPEARS
// ============================================

const SoftphoneScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const panelX = spring({ frame: frame - 5, fps, from: 400, to: 0, config: { damping: 14 } });
  const panelOp = fadeIn(frame, 0, 15);
  const infoOp = fadeIn(frame, 20, 12);
  const acceptPulse = frame > 40 && frame < 75 ? 1 + Math.sin((frame - 40) * 0.25) * 0.08 : 1;
  const acceptGlow = frame > 40 && frame < 75 ? 6 + Math.sin((frame - 40) * 0.25) * 6 : 0;
  const isAccepted = frame > 78;
  const connectedOp = fadeIn(frame, 80, 12);
  const timerSeconds = isAccepted ? Math.floor((frame - 80) / 30) : 0;
  const labelOp = fadeIn(frame, 100, 15);

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      {/* Softphone panel */}
      <div style={{
        opacity: panelOp, transform: `translateX(${panelX}px)`,
        width: 300, borderRadius: 20,
        background: 'linear-gradient(180deg, #111827, #0f172a)',
        border: '1.5px solid #1f2937',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px 12px',
          background: isAccepted ? 'linear-gradient(135deg, #065f4620, #0f172a)' : 'linear-gradient(135deg, #06b6d415, #0f172a)',
          borderBottom: '1px solid #1f2937',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 10, color: isAccepted ? '#10b981' : '#06b6d4',
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: isAccepted ? '#10b981' : '#06b6d4',
              boxShadow: isAccepted ? '0 0 6px #10b981' : '0 0 6px #06b6d4',
            }} />
            {isAccepted ? 'Conectado' : 'Llamada entrante'}
          </div>
        </div>

        {/* Caller info */}
        <div style={{ padding: '20px', opacity: infoOp, textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 28, margin: '0 auto',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: 'white', fontWeight: 700,
            boxShadow: isAccepted ? '0 0 20px #10b98140' : 'none',
          }}>
            JP
          </div>
          <div style={{ color: 'white', fontSize: 16, fontWeight: 700, marginTop: 12 }}>
            Juan Perez
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6,
            padding: '3px 10px', borderRadius: 10,
            background: '#10b98115', border: '1px solid #10b98130',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: '#10b981' }} />
            <span style={{ color: '#6ee7b7', fontSize: 11, fontWeight: 600 }}>WhatsApp</span>
          </div>
          {isAccepted && (
            <div style={{
              color: '#94a3b8', fontSize: 22, fontWeight: 300, marginTop: 12,
              fontFamily: 'monospace', opacity: connectedOp,
            }}>
              00:{String(timerSeconds).padStart(2, '0')}
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{
          padding: '12px 20px 20px',
          display: 'flex', justifyContent: 'center', gap: 16,
        }}>
          {!isAccepted ? (
            <>
              {/* Decline */}
              <div style={{
                width: 48, height: 48, borderRadius: 24,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M10.68 13.31a16 16 0 006.06-6.06l-1.27-1.27a2 2 0 01-.45-2.11c.339-.907.573-1.85.7-2.81A2 2 0 0117.73 0H20.8a2 2 0 012 1.82A19.79 19.79 0 0119.73 10.5a19.5 19.5 0 01-6 6A19.79 19.79 0 015 19.57a2 2 0 01-1.82-2V14.5a2 2 0 011.72-2c.96-.127 1.903-.361 2.81-.7a2 2 0 012.11.45z" transform="rotate(135 12 12)" />
                </svg>
              </div>
              {/* Accept */}
              <div style={{
                width: 48, height: 48, borderRadius: 24,
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: `scale(${acceptPulse})`,
                boxShadow: `0 0 ${acceptGlow}px #22c55e60`,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                </svg>
              </div>
            </>
          ) : (
            <>
              {/* Active call controls */}
              {[
                { icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0-11V3', label: 'Mute', bg: '#374151' },
                { icon: 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5', label: 'Transfer', bg: '#0e7490' },
                { icon: 'M10.68 13.31a16 16 0 006.06-6.06', label: 'Colgar', bg: '#dc2626' },
              ].map((ctrl, i) => (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  opacity: connectedOp,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 20,
                    background: ctrl.bg, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    border: i === 1 ? '2px solid #06b6d440' : 'none',
                    boxShadow: i === 1 ? '0 0 12px #06b6d430' : 'none',
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                      <path d={ctrl.icon} />
                    </svg>
                  </div>
                  <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 500 }}>{ctrl.label}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Label */}
      <div style={{
        position: 'absolute', bottom: 36, opacity: labelOp,
        color: '#e2e8f0', fontSize: 19, fontWeight: 700,
        textShadow: '0 2px 12px rgba(0,0,0,0.6)',
      }}>
        Contestas desde tu navegador
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// SCENE 5: TEAM TRANSFER
// ============================================

const TransferScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const people = [
    { name: 'Carlos R.', role: 'Ejecutivo', color: '#3b82f6', initials: 'CR' },
    { name: 'Maria L.', role: 'Supervisor', color: '#f59e0b', initials: 'ML' },
    { name: 'Pedro G.', role: 'Ejecutivo', color: '#3b82f6', initials: 'PG' },
  ];

  const spacing = 200;
  const startX = (COMP_W - spacing * 2) / 2;

  // Staggered avatar appearance
  const avatarOps = people.map((_, i) =>
    fadeIn(frame, 5 + i * 15, 15)
  );
  const avatarScales = people.map((_, i) =>
    spring({ frame: frame - (5 + i * 15), fps, config: { damping: 12 } })
  );

  // Transfer beams
  const beam1 = interpolate(frame, [60, 85], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const beam2 = interpolate(frame, [100, 125], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Active person glow
  const active1 = frame > 85 && frame < 100;
  const active2 = frame > 125;

  // Label
  const labelOp = fadeIn(frame, 110, 15);

  // Dim source after transfer
  const dim0 = frame > 85 ? 0.35 : 1;
  const dim1 = frame > 125 ? 0.35 : 1;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      {/* Transfer chain visualization */}
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center',
        gap: spacing - 80, marginTop: -30,
      }}>
        {people.map((p, i) => {
          const isGlowing = (i === 1 && active1) || (i === 2 && active2);
          const dimLevel = i === 0 ? dim0 : i === 1 ? dim1 : 1;

          return (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              opacity: avatarOps[i] * dimLevel,
              transform: `scale(${avatarScales[i]})`,
              position: 'relative', zIndex: 2,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 32,
                background: `linear-gradient(135deg, ${p.color}, ${p.color}cc)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, color: 'white', fontWeight: 700,
                boxShadow: isGlowing
                  ? `0 0 30px ${p.color}50, 0 0 60px ${p.color}20`
                  : '0 8px 24px rgba(0,0,0,0.3)',
                border: isGlowing ? `3px solid ${p.color}80` : '3px solid transparent',
              }}>
                {p.initials}
              </div>
              <div style={{ color: 'white', fontSize: 13, fontWeight: 600, marginTop: 10 }}>
                {p.name}
              </div>
              <div style={{
                fontSize: 10, fontWeight: 600, marginTop: 4,
                padding: '2px 8px', borderRadius: 6,
                background: `${p.color}20`, color: p.color,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {p.role}
              </div>
            </div>
          );
        })}

        {/* Beam 1: A → B */}
        <div style={{
          position: 'absolute', top: 30, left: 72, zIndex: 1,
          width: spacing - 80, height: 4, overflow: 'hidden',
        }}>
          <div style={{
            width: `${beam1 * 100}%`, height: '100%',
            background: 'linear-gradient(90deg, #3b82f6, #06b6d4, #f59e0b)',
            borderRadius: 2, boxShadow: '0 0 10px #06b6d450',
          }} />
        </div>

        {/* Beam 2: B → C */}
        <div style={{
          position: 'absolute', top: 30, left: 72 + spacing, zIndex: 1,
          width: spacing - 80, height: 4, overflow: 'hidden',
        }}>
          <div style={{
            width: `${beam2 * 100}%`, height: '100%',
            background: 'linear-gradient(90deg, #f59e0b, #06b6d4, #3b82f6)',
            borderRadius: 2, boxShadow: '0 0 10px #06b6d450',
          }} />
        </div>

        {/* Arrow indicators */}
        {beam1 > 0.9 && (
          <div style={{
            position: 'absolute', top: 22, left: 72 + (spacing - 80) / 2 - 6,
            fontSize: 14, color: '#06b6d4', opacity: fadeIn(frame, 85, 10),
          }}>
            →
          </div>
        )}
        {beam2 > 0.9 && (
          <div style={{
            position: 'absolute', top: 22, left: 72 + spacing + (spacing - 80) / 2 - 6,
            fontSize: 14, color: '#06b6d4', opacity: fadeIn(frame, 125, 10),
          }}>
            →
          </div>
        )}
      </div>

      {/* Label */}
      <div style={{
        position: 'absolute', bottom: 36, opacity: labelOp,
        color: '#e2e8f0', fontSize: 19, fontWeight: 700,
        textShadow: '0 2px 12px rgba(0,0,0,0.6)', textAlign: 'center',
        maxWidth: 500, lineHeight: 1.4,
      }}>
        Transfiere entre miembros de tu coordinacion
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// SCENE 6: OUTRO - FEATURES
// ============================================

const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0-11V3', title: 'Grabacion Dual', desc: 'Ejecutivo y prospecto en canales separados', color: '#06b6d4' },
    { icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z', title: 'Permisos por Rol', desc: 'Cada rol ve solo su coordinacion', color: '#8b5cf6' },
    { icon: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z', title: 'Admin sin Limites', desc: 'Transfiere a cualquier usuario online', color: '#f59e0b' },
  ];

  const titleOp = fadeIn(frame, 80, 18);
  const titleScale = spring({ frame: frame - 82, fps, config: { damping: 10, mass: 0.5 } });
  const titleGlow = interpolate(frame, [90, 110, 130, 140], [0, 1, 1, 0.6], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      {/* Feature cards */}
      <div style={{
        display: 'flex', gap: 16, marginTop: -40,
      }}>
        {features.map((f, i) => {
          const cardOp = fadeIn(frame, 5 + i * 18, 15);
          const cardY = spring({ frame: frame - (5 + i * 18), fps, from: 40, to: 0, config: { damping: 14 } });

          return (
            <div key={i} style={{
              opacity: cardOp, transform: `translateY(${cardY}px)`,
              width: 195, padding: '20px 16px',
              background: 'linear-gradient(180deg, #111827, #0f172a)',
              border: `1px solid ${f.color}25`,
              borderRadius: 16, textAlign: 'center',
              boxShadow: `0 12px 40px rgba(0,0,0,0.3), 0 0 20px ${f.color}10`,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14, margin: '0 auto',
                background: `${f.color}15`, border: `1px solid ${f.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon} />
                </svg>
              </div>
              <div style={{ color: 'white', fontSize: 14, fontWeight: 700, marginTop: 12 }}>
                {f.title}
              </div>
              <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 6, lineHeight: 1.4 }}>
                {f.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* "DISPONIBLE AHORA" */}
      <div style={{
        position: 'absolute', bottom: 50, opacity: titleOp,
        transform: `scale(${titleScale})`, textAlign: 'center',
      }}>
        <div style={{
          fontSize: 28, fontWeight: 900, color: 'white',
          letterSpacing: '-0.02em',
          textShadow: `0 0 ${40 * titleGlow}px #06b6d450, 0 0 ${80 * titleGlow}px #06b6d420`,
        }}>
          DISPONIBLE AHORA
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// SCENE 7: POST-CREDITS
// ============================================

const PostCreditsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const comingOp = fadeIn(frame, 25, 18);
  const titleScale = spring({ frame: frame - 50, fps, config: { damping: 10, mass: 0.5 } });
  const titleOp = fadeIn(frame, 45, 18);
  const glowPulse = frame > 60 ? 0.5 + Math.sin((frame - 60) * 0.08) * 0.3 : 0;
  const rocketY = frame > 55 ? interpolate(frame, [55, 80], [30, 0], { extrapolateRight: 'clamp' }) : 30;
  const rocketOp = fadeIn(frame, 55, 15);

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', background: '#030308' }}>
      {/* Subtle glow */}
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, #f59e0b15, transparent 70%)',
        filter: 'blur(50px)', opacity: glowPulse,
      }} />

      {/* "Proximamente..." */}
      <div style={{
        opacity: comingOp, fontSize: 15, color: '#6b7280',
        letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600,
        marginBottom: 16,
      }}>
        Proximamente...
      </div>

      {/* Title */}
      <div style={{
        opacity: titleOp, transform: `scale(${titleScale})`,
        fontSize: 44, fontWeight: 900, color: 'white',
        letterSpacing: '-0.03em', textAlign: 'center',
        textShadow: '0 0 50px #f59e0b30, 0 4px 20px rgba(0,0,0,0.5)',
      }}>
        LLAMADAS OUTBOUND
      </div>

      {/* Rocket */}
      <div style={{
        opacity: rocketOp, marginTop: 24,
        transform: `translateY(${rocketY}px)`,
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      </div>

      {/* Subtitle */}
      <div style={{
        opacity: fadeIn(frame, 70, 20),
        fontSize: 13, color: '#9ca3af', marginTop: 20,
        letterSpacing: '0.05em', fontWeight: 500,
      }}>
        Llama a tus prospectos directamente desde la plataforma
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// MAIN COMPOSITION
// ============================================

const VoiceCallsComposition: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: '#050510', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Audio src="/sounds/voice-calls-intro.mp3" volume={0.25} />
      <ParallaxBackground />

      <Sequence from={SCENES.INTRO.from} durationInFrames={SCENES.INTRO.dur}>
        <IntroScene />
      </Sequence>

      <Sequence from={SCENES.WHATSAPP.from} durationInFrames={SCENES.WHATSAPP.dur}>
        <WhatsAppScene />
      </Sequence>

      <Sequence from={SCENES.AI.from} durationInFrames={SCENES.AI.dur}>
        <AIScene />
      </Sequence>

      <Sequence from={SCENES.SOFTPHONE.from} durationInFrames={SCENES.SOFTPHONE.dur}>
        <SoftphoneScene />
      </Sequence>

      <Sequence from={SCENES.TRANSFER.from} durationInFrames={SCENES.TRANSFER.dur}>
        <TransferScene />
      </Sequence>

      <Sequence from={SCENES.OUTRO.from} durationInFrames={SCENES.OUTRO.dur}>
        <OutroScene />
      </Sequence>

      <Sequence from={SCENES.POSTCREDITS.from} durationInFrames={SCENES.POSTCREDITS.dur}>
        <PostCreditsScene />
      </Sequence>
    </AbsoluteFill>
  );
};

// ============================================
// TUTORIAL WRAPPER (Player + controls)
// ============================================

interface VoiceCallsIntroTutorialProps {
  onComplete: () => void;
}

const VoiceCallsIntroTutorial: React.FC<VoiceCallsIntroTutorialProps> = ({ onComplete }) => {
  const playerRef = useRef<PlayerRef>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [needsClick, setNeedsClick] = useState(false);

  // Track playback progress
  useEffect(() => {
    let raf: number;
    const update = () => {
      if (playerRef.current) {
        const currentFrame = playerRef.current.getCurrentFrame();
        setProgress(currentFrame / TOTAL_FRAMES);
        if (currentFrame > 2) setHasStarted(true);
        if (currentFrame >= TOTAL_FRAMES - 3 && !isFinished) {
          setIsFinished(true);
        }
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [isFinished]);

  // Detect if autoplay was blocked
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasStarted) setNeedsClick(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [hasStarted]);

  const handleStart = useCallback(() => {
    playerRef.current?.play();
    setNeedsClick(false);
    setHasStarted(true);
  }, []);

  const handleRepeat = useCallback(() => {
    setIsFinished(false);
    setProgress(0);
    playerRef.current?.seekTo(0);
    playerRef.current?.play();
  }, []);

  return (
    <div className="space-y-0 -mx-6 -mt-6 -mb-6">
      {/* Player container */}
      <div className="relative overflow-hidden rounded-t-2xl bg-[#050510]">
        <Player
          ref={playerRef}
          component={VoiceCallsComposition}
          durationInFrames={TOTAL_FRAMES}
          compositionWidth={COMP_W}
          compositionHeight={COMP_H}
          fps={FPS}
          controls={false}
          autoPlay
          clickToPlay={false}
          style={{
            width: '100%',
            aspectRatio: `${COMP_W}/${COMP_H}`,
          }}
        />

        {/* Autoplay blocked: show play button */}
        <AnimatePresence>
          {needsClick && !hasStarted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/60 cursor-pointer"
              onClick={handleStart}
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-20 h-20 rounded-full bg-cyan-500/20 border-2 border-cyan-500/50 flex items-center justify-center"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#06b6d4">
                  <polygon points="6,3 20,12 6,21" />
                </svg>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800/80">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-[width] duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Controls footer */}
      <div className="bg-gray-950 border-t border-gray-800 px-6 py-4 rounded-b-2xl">
        <AnimatePresence mode="wait">
          {isFinished ? (
            <motion.div
              key="finished"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <p className="text-sm text-gray-400">
                Presentacion finalizada
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRepeat}
                  className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300 text-sm font-medium flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Repetir
                </button>
                <button
                  onClick={onComplete}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 transition-colors text-white text-sm font-medium flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Finalizar
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-xs text-gray-500 font-medium">
                  {Math.round(progress * 100)}%
                </span>
              </div>
              <p className="text-xs text-gray-600">
                Visualizacion obligatoria
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VoiceCallsIntroTutorial;
