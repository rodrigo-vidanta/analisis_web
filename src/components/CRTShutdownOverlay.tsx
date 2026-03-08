import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface CRTShutdownOverlayProps {
  isActive: boolean;
  onAnimationEnd: () => void;
  children: ReactNode;
}

/**
 * Wrapper que aplica animacion CRT turn-off al contenido real.
 *
 * Fases:
 * 1. isActive=true, animating: clase crt-shutdown comprime el contenido (0.55s)
 * 2. Animacion termina: clase removida, contenido oculto con opacity:0
 *    (LoginScreen renderiza limpia detras de pantalla negra)
 * 3. isActive=false: pantalla negra hace fade-out, revela LoginScreen
 */
const CRTShutdownOverlay: React.FC<CRTShutdownOverlayProps> = ({
  isActive,
  onAnimationEnd,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showBlackScreen, setShowBlackScreen] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);

  useEffect(() => {
    if (isActive) {
      setShowBlackScreen(true);
      setFadeOut(false);
      setAnimationDone(false);
    } else if (showBlackScreen) {
      // isActive paso a false: LoginScreen ya renderizada.
      // Quitar restos de animacion y hacer fade-out.
      setAnimationDone(false);
      setFadeOut(true);
      const t = setTimeout(() => {
        setShowBlackScreen(false);
        setFadeOut(false);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnimationEnd = useCallback(
    (e: React.AnimationEvent) => {
      if (e.target === containerRef.current) {
        // Animacion CRT termino: quitar clase (scale/brightness residual)
        // y ocultar contenido limpiamente con opacity:0.
        setAnimationDone(true);
        onAnimationEnd();
      }
    },
    [onAnimationEnd]
  );

  // Estado del wrapper segun fase
  const showAnimation = isActive && !animationDone;

  return (
    <div className="relative w-full h-full">
      {showBlackScreen && (
        <div
          className="fixed inset-0 z-[99] bg-black"
          style={{
            opacity: fadeOut ? 0 : 1,
            transition: 'opacity 0.35s ease-out',
          }}
        />
      )}

      <div
        ref={containerRef}
        className={showAnimation ? 'crt-shutdown' : undefined}
        style={
          showAnimation
            ? { position: 'relative', zIndex: 100 }
            : isActive && animationDone
              ? { opacity: 0 }
              : undefined
        }
        onAnimationEnd={showAnimation ? handleAnimationEnd : undefined}
      >
        {children}
      </div>
    </div>
  );
};

export default CRTShutdownOverlay;
