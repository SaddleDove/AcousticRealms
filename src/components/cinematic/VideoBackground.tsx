'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoBackgroundProps {
  /** Primary clip. In 'once' mode it plays to the end, fades to black, holds, then replays. */
  srcA: string;
  /** Secondary clip for crossfade looping (ignored in 'once' mode). */
  srcB?: string;
  poster: string;
  /** Theme tint used for the vignette and particles. */
  tone?: 'ocean' | 'forest';
  /** Top/bottom gradient dim strength. */
  dim?: number;
  /**
   * 'loop' (default): A/B clips crossfade into a seamless loop.
   * 'once': play A once, fade to a black breath, then replay from the top.
   */
  mode?: 'loop' | 'once';
}

interface Particle {
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  opacity: number;
}

/** How long the black breath holds between replays in 'once' mode. */
const HOLD_MS = 1200;

export function VideoBackground({ srcA, srcB, poster, tone = 'ocean', dim = 0.55, mode = 'loop' }: VideoBackgroundProps) {
  const [loaded, setLoaded] = useState(false);
  const [held, setHeld] = useState(false);
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: 26 }, () => ({
      left: Math.random() * 100,
      size: 1.5 + Math.random() * 3,
      duration: 14 + Math.random() * 22,
      delay: -Math.random() * 30,
      drift: (Math.random() - 0.5) * 80,
      opacity: 0.15 + Math.random() * 0.4,
    })),
  );
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up the hold timer on unmount.
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  const once = mode === 'once';

  const handleAEnded = () => {
    if (!once) return;
    // Fade to a black breath, then replay from the top.
    setHeld(true);
    holdTimerRef.current = setTimeout(() => {
      const video = videoARef.current;
      if (!video) return;
      video.currentTime = 0;
      setHeld(false);
      void video.play();
    }, HOLD_MS);
  };

  const glow = tone === 'ocean' ? 'rgba(56,225,255,0.5)' : 'rgba(245,201,123,0.5)';
  const particleColor = tone === 'ocean' ? '170,235,255' : '255,228,170';

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* Animated poster layer (Ken Burns slow push) shown only until the video is ready. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={poster}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          opacity: loaded ? 0 : 1,
          transition: 'opacity 1.6s ease',
          // Ken Burns drift only while the video has never loaded.
          animation: loaded ? undefined : 'kenBurns 26s ease-in-out infinite alternate',
        }}
      />
      {/* Mist drift layers only while the poster is visible */}
      {!loaded && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background:
                tone === 'ocean'
                  ? 'radial-gradient(50% 40% at 30% 20%, rgba(120,200,255,0.10), transparent 70%)'
                  : 'radial-gradient(50% 40% at 65% 25%, rgba(255,225,160,0.12), transparent 70%)',
              animation: 'mistDrift 18s ease-in-out infinite alternate',
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-1/2"
            style={{
              background:
                tone === 'ocean'
                  ? 'linear-gradient(0deg, rgba(40,120,160,0.14), transparent)'
                  : 'linear-gradient(0deg, rgba(180,190,140,0.12), transparent)',
              animation: 'mistDrift 24s ease-in-out infinite alternate-reverse',
            }}
          />
        </>
      )}
      <video
        className="video-layer-a absolute inset-0 h-full w-full object-cover"
        src={srcA}
        autoPlay
        muted
        playsInline
        preload="auto"
        poster={poster}
        loop={!once}
        onCanPlay={() => setLoaded(true)}
        onEnded={handleAEnded}
        onError={() => {
          if (videoARef.current) videoARef.current.style.display = 'none';
        }}
        ref={videoARef}
        style={{ opacity: once && held ? 0 : 1, transition: 'opacity 0.5s ease' }}
      />
      {srcB && !once && (
        <video
          className="video-layer-b absolute inset-0 h-full w-full object-cover"
          src={srcB}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onError={() => {
            if (videoBRef.current) videoBRef.current.style.display = 'none';
          }}
          ref={videoBRef}
        />
      )}

      {/* Tone vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            tone === 'ocean'
              ? 'linear-gradient(180deg, rgba(3,14,26,0.35) 0%, rgba(3,14,26,0.12) 35%, rgba(3,14,26,0.65) 100%)'
              : 'linear-gradient(180deg, rgba(6,18,12,0.32) 0%, rgba(6,18,12,0.1) 35%, rgba(6,18,12,0.62) 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 50% 42%, transparent 40%, rgba(0,0,0,${dim * 0.55}) 100%)`,
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0">
        {particles.map((p, i) => (
          <span
            key={i}
            className="particle"
            style={
              {
                left: `${p.left}%`,
                bottom: '-4vh',
                width: p.size,
                height: p.size,
                background: `rgba(${particleColor},0.9)`,
                boxShadow: `0 0 ${p.size * 3}px ${glow}`,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                '--p-drift': `${p.drift}px`,
                '--p-opacity': p.opacity,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Black breath layer (topmost): visible only between replays in 'once' mode */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: once && held ? 1 : 0, transition: 'opacity 0.5s ease' }}
      />
    </div>
  );
}
