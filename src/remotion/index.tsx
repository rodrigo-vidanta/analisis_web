/**
 * Remotion render entry point for MP4 export.
 * Usage: npx remotion render src/remotion/index.tsx VoiceCallsExport --output out/voice-calls.mp4
 */
import React from 'react';
import { registerRoot, Composition, Audio, staticFile } from 'remotion';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';

// ============================================
// CONSTANTS (synced with VoiceCallsIntroTutorial.tsx)
// ============================================

const FPS = 30;
const TOTAL_FRAMES = 1740;
const COMP_W = 1060;
const COMP_H = 650;

const SCENES = {
  INTRO:       { from: 0,    dur: 93 },
  WHATSAPP:    { from: 93,   dur: 266 },
  AI:          { from: 359,  dur: 228 },
  SOFTPHONE:   { from: 587,  dur: 295 },
  TRANSFER:    { from: 882,  dur: 297 },
  OUTRO:       { from: 1179, dur: 320 },
  POSTCREDITS: { from: 1499, dur: 241 },
};

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

  const titleScale = spring({ frame: frame - 5, fps, config: { damping: 10, mass: 0.5 } });
  const titleOp = fadeIn(frame, 0, 12);
  const whatsappOp = fadeIn(frame, 12, 12);
  const subtitleOp = fadeIn(frame, 30, 12);
  const glowScale = interpolate(frame, [0, 40], [0.2, 2], { extrapolateRight: 'clamp' });
  const glowOp = interpolate(frame, [0, 10, 50, 80], [0, 0.7, 0.5, 0.2], { extrapolateRight: 'clamp' });

  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const dist = interpolate(frame, [5, 40], [0, 150 + i * 8], { extrapolateRight: 'clamp' });
    const op = interpolate(frame, [5, 20, 55, 80], [0, 0.8, 0.4, 0], { extrapolateRight: 'clamp' });
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, op, size: 3 + (i % 3) };
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, #25D36650, transparent 70%)',
        transform: `scale(${glowScale})`, opacity: glowOp, filter: 'blur(40px)',
      }} />
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', width: p.size, height: p.size, borderRadius: '50%',
          background: i % 2 === 0 ? '#25D366' : '#8b5cf6',
          transform: `translate(${p.x}px, ${p.y}px)`, opacity: p.op,
        }} />
      ))}
      <div style={{
        opacity: titleOp, transform: `scale(${titleScale})`,
        fontSize: 28, fontWeight: 700, color: '#94a3b8',
        letterSpacing: '0.18em', textTransform: 'uppercase',
        textAlign: 'center', lineHeight: 1,
        textShadow: '0 2px 12px rgba(0,0,0,0.5)',
      }}>
        Llamadas
      </div>
      <div style={{
        opacity: whatsappOp, transform: `scale(${titleScale})`,
        fontSize: 62, fontWeight: 900, color: '#25D366',
        letterSpacing: '-0.03em', lineHeight: 1, textAlign: 'center',
        marginTop: 8,
        textShadow: '0 0 60px #25D36640, 0 4px 20px rgba(0,0,0,0.5)',
      }}>
        WhatsApp
      </div>
      <div style={{
        opacity: subtitleOp, marginTop: 28,
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
  const msg1Op = fadeIn(frame, 25, 18);
  const msg2Op = fadeIn(frame, 70, 18);
  const cursorOp = fadeIn(frame, 120, 10);
  const cursorX = interpolate(frame, [120, 140], [60, 0], { extrapolateRight: 'clamp' });
  const cursorY = interpolate(frame, [120, 140], [40, 0], { extrapolateRight: 'clamp' });
  const clickRipple = frame > 145 ? fadeIn(frame, 145, 8) : 0;
  const clickScale = frame > 145 ? interpolate(frame, [145, 153], [0, 3], { extrapolateRight: 'clamp' }) : 0;
  const callPulse = frame > 100 ? 1 + Math.sin((frame - 100) * 0.2) * 0.12 : 1;
  const callGlow = frame > 100 ? 8 + Math.sin((frame - 100) * 0.2) * 8 : 0;
  const callingOp = fadeIn(frame, 155, 12);
  const labelOp = fadeIn(frame, 100, 15);

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        opacity: phoneOp, transform: `translateY(${phoneY}px)`,
        width: 230, height: 400, borderRadius: 30,
        border: '2.5px solid #374151', background: '#0f172a',
        overflow: 'hidden', position: 'relative',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 100, height: 24, borderRadius: '0 0 16px 16px', background: '#0f172a', zIndex: 10,
        }} />
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
          <div style={{
            position: 'relative',
            width: 30, height: 30, borderRadius: 15,
            background: frame > 145 ? '#22c55e' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${callPulse})`,
            boxShadow: `0 0 ${callGlow}px #22c55e80`,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={frame > 145 ? 'white' : '#a7f3d0'} strokeWidth="2.5" strokeLinecap="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </svg>
            <div style={{
              position: 'absolute', opacity: cursorOp,
              transform: `translate(${cursorX}px, ${cursorY}px)`, zIndex: 20,
              right: -15, bottom: -15,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="#1e293b" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{
              position: 'absolute', inset: -5, borderRadius: '50%',
              border: '2px solid #22c55e', opacity: 1 - clickRipple,
              transform: `scale(${clickScale})`,
            }} />
          </div>
        </div>
        <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            opacity: msg1Op,
            transform: `translateY(${interpolate(msg1Op, [0, 1], [8, 0])}px)`,
            background: '#1e3a2f', borderRadius: '2px 10px 10px 10px',
            padding: '8px 12px', maxWidth: '82%', alignSelf: 'flex-start',
          }}>
            <div style={{ color: '#e2e8f0', fontSize: 11, lineHeight: 1.4 }}>
              Hola, les puedo llamar para que me expliquen mejor?
            </div>
            <div style={{ color: '#6ee7b7', fontSize: 9, textAlign: 'right', marginTop: 3 }}>10:30</div>
          </div>
          <div style={{
            opacity: msg2Op,
            transform: `translateY(${interpolate(msg2Op, [0, 1], [8, 0])}px)`,
            background: '#005c4b', borderRadius: '10px 2px 10px 10px',
            padding: '8px 12px', maxWidth: '78%', alignSelf: 'flex-end',
          }}>
            <div style={{ color: 'white', fontSize: 11, lineHeight: 1.4 }}>
              Claro! Puede llamarnos directo por WhatsApp
            </div>
            <div style={{ color: '#a7f3d0', fontSize: 9, textAlign: 'right', marginTop: 3 }}>10:31</div>
          </div>
        </div>
        {frame > 150 && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.92)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', opacity: callingOp, zIndex: 5,
          }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 32,
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 30px #22c55e40',
                position: 'relative', zIndex: 2,
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                </svg>
              </div>
              {[0, 1, 2].map(i => {
                const ringOp = interpolate(
                  (frame - 160 + i * 10) % 30, [0, 15, 30], [0.6, 0.2, 0], { extrapolateRight: 'clamp' }
                );
                const ringScale = interpolate(
                  (frame - 160 + i * 10) % 30, [0, 30], [1, 2.5], { extrapolateRight: 'clamp' }
                );
                return frame > 160 ? (
                  <div key={i} style={{
                    position: 'absolute', width: 64, height: 64,
                    borderRadius: '50%', border: '2px solid #22c55e',
                    opacity: ringOp, transform: `scale(${ringScale})`,
                    zIndex: 1,
                  }} />
                ) : null;
              })}
            </div>
            <div style={{ color: 'white', fontSize: 15, fontWeight: 600, marginTop: 14 }}>
              Llamando...
            </div>
            <div style={{ color: '#22c55e', fontSize: 12, marginTop: 6 }}>
              +52 322 487 0413
            </div>
          </div>
        )}
      </div>
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
  const labelOp = fadeIn(frame, 150, 15);

  const bars = Array.from({ length: 9 }, (_, i) => {
    const h = frame > 15 ? 8 + Math.abs(Math.sin(frame * 0.25 + i * 0.7)) * 28 : 8;
    return h;
  });

  const convMessages = [
    { text: 'Hola, quiero informacion sobre los certificados vacacionales...', isAI: false, start: 40 },
    { text: 'Con gusto te ayudo. Dejame verificar tu informacion y te conecto con tu ejecutivo.', isAI: true, start: 80 },
    { text: 'Transfiriendo con tu ejecutivo asignado...', isAI: true, start: 120 },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        opacity: avatarOp, transform: `scale(${avatarScale})`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 36,
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px #7c3aed40, 0 8px 32px rgba(0,0,0,0.4)',
          border: '3px solid #a855f730',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
          </svg>
        </div>
        <div style={{
          marginTop: 8, fontSize: 12, fontWeight: 700,
          color: '#c4b5fd', letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Natalia IA
        </div>
      </div>
      <div style={{
        display: 'flex', gap: 5, alignItems: 'center',
        marginTop: 14, opacity: waveOp, height: 36,
      }}>
        {bars.map((h, i) => (
          <div key={i} style={{
            width: 4, height: h, borderRadius: 3,
            background: 'linear-gradient(180deg, #a855f7, #7c3aed)',
          }} />
        ))}
      </div>
      <div style={{
        marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8,
        width: 380, maxWidth: '90%',
      }}>
        {convMessages.map((msg, i) => {
          const msgOp = fadeIn(frame, msg.start, 18);
          const msgY = interpolate(msgOp, [0, 1], [10, 0]);
          return (
            <div key={i} style={{
              opacity: msgOp,
              transform: `translateY(${msgY}px)`,
              alignSelf: msg.isAI ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              background: msg.isAI ? '#1e1b4b' : '#1a2e1a',
              border: msg.isAI ? '1px solid #4c1d9530' : '1px solid #16a34a30',
              borderRadius: msg.isAI ? '10px 2px 10px 10px' : '2px 10px 10px 10px',
              padding: '8px 14px',
            }}>
              <div style={{
                fontSize: 9, fontWeight: 700, marginBottom: 3,
                color: msg.isAI ? '#a78bfa' : '#6ee7b7',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {msg.isAI ? 'Natalia IA' : 'Prospecto'}
              </div>
              <div style={{
                color: msg.isAI ? '#e9d5ff' : '#d1fae5',
                fontSize: 12, lineHeight: 1.4, fontWeight: 500,
              }}>
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>
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
// SCENE 4: SOFTPHONE
// ============================================

const SoftphoneScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const panelX = spring({ frame: frame - 5, fps, from: 400, to: 0, config: { damping: 14 } });
  const panelOp = fadeIn(frame, 0, 15);
  const infoOp = fadeIn(frame, 25, 15);
  const acceptPulse = frame > 55 && frame < 130 ? 1 + Math.sin((frame - 55) * 0.25) * 0.08 : 1;
  const acceptGlow = frame > 55 && frame < 130 ? 6 + Math.sin((frame - 55) * 0.25) * 6 : 0;
  const isAccepted = frame > 135;
  const connectedOp = fadeIn(frame, 140, 15);
  const timerSeconds = isAccepted ? Math.floor((frame - 140) / 30) : 0;
  const labelOp = fadeIn(frame, 180, 15);

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        opacity: panelOp, transform: `translateX(${panelX}px)`,
        width: 300, borderRadius: 20,
        background: 'linear-gradient(180deg, #111827, #0f172a)',
        border: '1.5px solid #1f2937',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
        overflow: 'hidden',
      }}>
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
        <div style={{
          padding: '12px 20px 20px',
          display: 'flex', justifyContent: 'center', gap: 16,
        }}>
          {!isAccepted ? (
            <>
              <div style={{
                width: 48, height: 48, borderRadius: 24,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M10.68 13.31a16 16 0 006.06-6.06l-1.27-1.27a2 2 0 01-.45-2.11c.339-.907.573-1.85.7-2.81A2 2 0 0117.73 0H20.8a2 2 0 012 1.82A19.79 19.79 0 0119.73 10.5a19.5 19.5 0 01-6 6A19.79 19.79 0 015 19.57a2 2 0 01-1.82-2V14.5a2 2 0 011.72-2c.96-.127 1.903-.361 2.81-.7a2 2 0 012.11.45z" transform="rotate(135 12 12)" />
                </svg>
              </div>
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
  const avatarOps = people.map((_, i) => fadeIn(frame, 8 + i * 25, 18));
  const avatarScales = people.map((_, i) =>
    spring({ frame: frame - (8 + i * 25), fps, config: { damping: 12 } })
  );

  const beam1 = interpolate(frame, [100, 135], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const beam2 = interpolate(frame, [165, 200], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const active1 = frame > 135 && frame < 165;
  const active2 = frame > 200;
  const labelOp = fadeIn(frame, 210, 15);
  const dim0 = frame > 135 ? 0.35 : 1;
  const dim1 = frame > 200 ? 0.35 : 1;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
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
        {beam1 > 0.9 && (
          <div style={{
            position: 'absolute', top: 22, left: 72 + (spacing - 80) / 2 - 6,
            fontSize: 14, color: '#06b6d4', opacity: fadeIn(frame, 135, 10),
          }}>
            →
          </div>
        )}
        {beam2 > 0.9 && (
          <div style={{
            position: 'absolute', top: 22, left: 72 + spacing + (spacing - 80) / 2 - 6,
            fontSize: 14, color: '#06b6d4', opacity: fadeIn(frame, 200, 10),
          }}>
            →
          </div>
        )}
      </div>
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
    { icon: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418', title: 'Contesta desde tu navegador', desc: 'Sin apps ni telefonos adicionales. Solo necesitas tu navegador web', color: '#06b6d4' },
    { icon: 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5', title: 'Transfiere con un click', desc: 'Pasa la llamada a tu supervisor o companero al instante', color: '#8b5cf6' },
    { icon: 'M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z', title: 'Grabacion automatica', desc: 'Cada llamada se graba automaticamente para tu respaldo', color: '#f59e0b' },
  ];

  const titleOp = fadeIn(frame, 260, 18);
  const titleScale = spring({ frame: frame - 262, fps, config: { damping: 10, mass: 0.5 } });
  const titleGlow = interpolate(frame, [268, 285, 300, 315], [0, 1, 1, 0.7], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 16, marginTop: -40 }}>
        {features.map((f, i) => {
          const cardStarts = [20, 100, 145];
          const cardStart = cardStarts[i] ?? 20;
          const cardOp = fadeIn(frame, cardStart, 18);
          const cardY = spring({ frame: frame - cardStart, fps, from: 40, to: 0, config: { damping: 14 } });

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

  const comingOp = fadeIn(frame, 30, 18);
  const titleScale = spring({ frame: frame - 55, fps, config: { damping: 10, mass: 0.5 } });
  const titleOp = fadeIn(frame, 50, 18);
  const glowPulse = frame > 70 ? 0.5 + Math.sin((frame - 70) * 0.08) * 0.3 : 0;
  const rocketY = frame > 65 ? interpolate(frame, [65, 90], [30, 0], { extrapolateRight: 'clamp' }) : 30;
  const rocketOp = fadeIn(frame, 65, 15);

  return (
    <AbsoluteFill style={{
      justifyContent: 'center', alignItems: 'center',
      background: 'rgba(5,5,16,0.88)',
    }}>
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, #f59e0b15, transparent 70%)',
        filter: 'blur(50px)', opacity: glowPulse,
      }} />
      <div style={{
        opacity: comingOp, fontSize: 15, color: '#6b7280',
        letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600,
        marginBottom: 16,
      }}>
        Proximamente...
      </div>
      <div style={{
        opacity: titleOp, transform: `scale(${titleScale})`,
        fontSize: 44, fontWeight: 900, color: 'white',
        letterSpacing: '-0.03em', textAlign: 'center',
        textShadow: '0 0 50px #f59e0b30, 0 4px 20px rgba(0,0,0,0.5)',
      }}>
        LLAMADAS OUTBOUND
      </div>
      <div style={{
        opacity: rocketOp, marginTop: 24,
        transform: `translateY(${rocketY}px)`,
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      </div>
      <div style={{
        opacity: fadeIn(frame, 80, 20),
        fontSize: 13, color: '#9ca3af', marginTop: 20,
        letterSpacing: '0.05em', fontWeight: 500,
      }}>
        Llama a tus prospectos directamente desde la plataforma
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// COMPOSITION WITH EMBEDDED AUDIO (for MP4 export)
// ============================================

const VoiceCallsExportComposition: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: '#050510', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <ParallaxBackground />

      {/* Audio tracks embedded in composition for MP4 export */}
      <Audio src={staticFile('sounds/voice-calls-intro.mp3')} volume={0.15} />
      <Audio src={staticFile('sounds/vo-narration.mp3')} volume={0.85} />

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
// REMOTION ROOT
// ============================================

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VoiceCallsExport"
        component={VoiceCallsExportComposition}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={COMP_W}
        height={COMP_H}
      />
    </>
  );
};

registerRoot(RemotionRoot);
