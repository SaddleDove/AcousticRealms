'use client';

import { useEffect, useRef, useState } from 'react';

interface MicRecorderProps {
  accent: 'cyan' | 'gold';
  onRecorded: (blob: Blob) => void;
  disabled?: boolean;
}

/** Microphone recorder: live level bars + recording timer, returns the Blob (webm/ogg depending on browser) */
export function MicRecorder({ accent, onRecorded, disabled }: MicRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopMeter = () => {
    cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => () => stopMeter(), []);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);

      const meter = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
        rafRef.current = requestAnimationFrame(meter);
      };
      meter();

      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const type = mr.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        stopMeter();
        setRecording(false);
        setLevel(0);
        onRecorded(blob);
      };
      mr.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microphone unavailable');
      stopMeter();
    }
  };

  const stop = () => {
    mediaRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const accentColor = accent === 'cyan' ? '#38e1ff' : '#f5c97b';

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)' }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={recording ? stop : start}
            disabled={disabled}
            className="relative flex h-12 w-12 items-center justify-center rounded-full border transition-all disabled:opacity-40"
            style={{
              borderColor: recording ? 'rgba(255,120,120,0.7)' : `${accentColor}66`,
              background: recording ? 'rgba(255,90,90,0.18)' : `${accentColor}14`,
              boxShadow: recording ? '0 0 24px -4px rgba(255,90,90,0.6)' : undefined,
            }}
            aria-label={recording ? 'Stop recording' : 'Start recording'}
          >
            {recording ? (
              <span className="h-4 w-4 rounded-sm bg-[#ff8a8a]" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            )}
          </button>
          <div>
            <div className="text-sm font-medium">{recording ? 'Listening…' : 'Live microphone'}</div>
            <div className="font-grotesk text-[11px]" style={{ color: 'var(--ink-dim)' }}>
              {recording ? `REC ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` : 'Record 3–10s of sound'}
            </div>
          </div>
        </div>
        {recording && (
          <div className="flex items-end gap-1" style={{ height: 36 }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="w-1 rounded-full"
                style={{
                  height: `${20 + Math.abs(Math.sin(i * 1.7 + seconds * 6)) * level * 80}%`,
                  background: accentColor,
                  opacity: 0.4 + level * 0.6,
                  transition: 'height 0.12s ease',
                }}
              />
            ))}
          </div>
        )}
      </div>
      {error && <p className="mt-3 text-xs text-[#ff9a9a]">Microphone unavailable: {error} (you can use a sample above or upload audio instead)</p>}
    </div>
  );
}
