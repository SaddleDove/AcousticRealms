'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { computeSpectrogram, decodeAudio, type DecodedAudio, type SpectrogramData } from '@/lib/audio/dsp';
import { dbToT, thermalColor } from '@/lib/audio/colormap';

interface SpectrogramPlayerProps {
  src: string;
  accent?: 'cyan' | 'gold';
  height?: number;
  onDecoded?: (audio: DecodedAudio, spec: SpectrogramData) => void;
}

export function SpectrogramPlayer({ src, accent = 'cyan', height = 150, onDecoded }: SpectrogramPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const specRef = useRef<SpectrogramData | null>(null);
  const decodedRef = useRef<DecodedAudio | null>(null);
  const rafRef = useRef<number>(0);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const draw = useCallback(
    (playRatio: number) => {
      const canvas = canvasRef.current;
      const spec = specRef.current;
      if (!canvas || !spec) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;

      // Spectrogram: x = time (left→right), y = frequency (low→high), compressed to the dominant band under 12 kHz
      const maxBin = Math.min(spec.freqBins - 1, Math.floor(spec.freqBins * 0.55));
      const img = ctx.createImageData(w, h);
      const cursorX = Math.floor(playRatio * w);
      for (let x = 0; x < w; x++) {
        const fi = Math.floor((x / w) * spec.frames);
        for (let y = 0; y < h; y++) {
          const bi = Math.floor(((h - 1 - y) / h) * maxBin);
          const db = spec.db[fi]?.[bi] ?? -100;
          const t = dbToT(db);
          const [r, g, b] = thermalColor(t);
          const idx = (y * w + x) * 4;
          img.data[idx] = r;
          img.data[idx + 1] = g;
          img.data[idx + 2] = b;
          img.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);

      // Playback cursor
      if (playRatio > 0) {
        const grad = ctx.createLinearGradient(cursorX - 40, 0, cursorX, 0);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(1, accent === 'cyan' ? 'rgba(120,230,255,0.35)' : 'rgba(255,220,150,0.35)');
        ctx.fillStyle = grad;
        ctx.fillRect(cursorX - 40, 0, 40, h);
        ctx.fillStyle = accent === 'cyan' ? 'rgba(180,240,255,0.9)' : 'rgba(255,232,180,0.9)';
        ctx.fillRect(cursorX, 0, 1.5, h);
      }
    },
    [accent],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    decodeAudio(src)
      .then((decoded) => {
        if (cancelled) return;
        decodedRef.current = decoded;
        const spec = computeSpectrogram(decoded.channel, decoded.sampleRate);
        specRef.current = spec;
        setDuration(decoded.duration);
        setLoading(false);
        draw(0);
        onDecoded?.(decoded, spec);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : 'Audio decode failed');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = height * dpr;
      draw(progress);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw, height, loading]);

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.duration) {
      const ratio = audio.currentTime / audio.duration;
      setProgress(ratio);
      draw(ratio);
    }
    if (!audio.paused) rafRef.current = requestAnimationFrame(tick);
  }, [draw]);

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.crossOrigin = 'anonymous';
      audioRef.current.addEventListener('ended', () => {
        setPlaying(false);
        setProgress(0);
        draw(0);
      });
    }
    const audio = audioRef.current;
    if (playing) {
      audio.pause();
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
    } else {
      void audio.play();
      setPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      audioRef.current?.pause();
    };
  }, []);

  const accentColor = accent === 'cyan' ? '#38e1ff' : '#f5c97b';

  return (
    <div className="spectro-frame" style={{ boxShadow: playing ? `0 0 28px -6px ${accentColor}66` : undefined }}>
      <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <button
          onClick={toggle}
          disabled={loading || !!err}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all"
          style={{
            borderColor: `${accentColor}66`,
            color: accentColor,
            background: `${accentColor}14`,
          }}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5.5v13a1 1 0 0 0 1.52.86l10.5-6.5a1 1 0 0 0 0-1.72L9.52 4.64A1 1 0 0 0 8 5.5Z" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="bar-track h-1.5">
            <div
              className="bar-fill"
              style={{ width: `${progress * 100}%`, background: `linear-gradient(90deg, ${accentColor}55, ${accentColor})` }}
            />
          </div>
        </div>
        <span className="font-grotesk text-[11px] tabular-nums" style={{ color: 'rgba(244,247,246,0.6)' }}>
          {loading ? 'Analyzing…' : err ? 'Decode failed' : `${duration.toFixed(1)}s`}
        </span>
      </div>
      <canvas ref={canvasRef} style={{ width: '100%', height, display: 'block' }} />
    </div>
  );
}
