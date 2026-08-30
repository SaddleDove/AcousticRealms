'use client';

import { useRef, useState } from 'react';
import type { Sequential } from '@tensorflow/tfjs';
import { decodeAudio, extractSegments } from '@/lib/audio/dsp';
import { predictSegments } from '@/lib/ml/cnn';
import type { LabelMeta } from '@/lib/audio/dataset';
import { MicRecorder } from './MicRecorder';
import { SpectrogramPlayer } from './SpectrogramPlayer';

interface RecognitionPanelProps {
  model: Sequential | null;
  labels: LabelMeta[];
  accent: 'cyan' | 'gold';
  enableMic?: boolean;
}

interface Prediction {
  probs: number[];
  topIdx: number;
}

export function RecognitionPanel({ model, labels, accent, enableMic = false }: RecognitionPanelProps) {
  const [selected, setSelected] = useState<{ file: string; title: string } | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [nonce, setNonce] = useState(0);
  const uploadRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const accentColor = accent === 'cyan' ? '#38e1ff' : '#f5c97b';

  const runPrediction = async (source: string | ArrayBuffer | Blob, title: string) => {
    if (!model) return;
    setBusy(true);
    setPrediction(null);

    // Build an object URL for the spectrogram player to replay uploaded/mic blobs
    let playerSrc = '';
    if (typeof source === 'string') {
      playerSrc = source;
    } else {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const blob = source instanceof Blob ? source : new Blob([source], { type: 'audio/wav' });
      blobUrlRef.current = URL.createObjectURL(blob);
      playerSrc = blobUrlRef.current;
    }
    setSelected({ file: playerSrc, title });
    setNonce((n) => n + 1);

    const decodeSrc: string | ArrayBuffer = source instanceof Blob ? await source.arrayBuffer() : source;
    try {
      setPhase('Decoding audio…');
      const audio = await decodeAudio(decodeSrc);
      setPhase('Extracting mel spectrograms…');
      const segs = extractSegments(audio.channel, audio.sampleRate, 3);
      setPhase('CNN inference…');
      await new Promise((r) => setTimeout(r, 60));
      const probs = await predictSegments(model, segs);
      const topIdx = probs.indexOf(Math.max(...probs));
      setPrediction({ probs, topIdx });
      setPhase('');
    } catch (e) {
      setPhase(e instanceof Error ? `Recognition failed: ${e.message}` : 'Recognition failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-panel p-6 md:p-8">
      <p className="kicker mb-2">Identification Console</p>
      <h3 className="font-display text-2xl font-semibold md:text-3xl">Identification Console</h3>

      {!model ? (
        <div className="mt-6 rounded-2xl border border-dashed p-8 text-center text-sm" style={{ borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ink-dim)' }}>
          Train the model in the Training Lab above first — recognition unlocks once training finishes.
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Input selection */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs" style={{ color: 'var(--ink-dim)' }}>Pick a recording from the library</p>
              <select
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                style={{
                  borderColor: 'rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--ink)',
                }}
                value={selected?.file ?? ''}
                onChange={(e) => {
                  const clip = labels.flatMap((l) => l.clips.map((c) => ({ ...c, label: l.label }))).find((c) => c.file === e.target.value);
                  if (clip) void runPrediction(clip.file, `${clip.label} · ${clip.title}`);
                }}
              >
                <option value="" style={{ color: '#111' }}>Choose a recording…</option>
                {labels.map((l) =>
                  l.clips.map((c) => (
                    <option key={c.file} value={c.file} style={{ color: '#111' }}>
                      {l.label} — {c.title.slice(0, 34)}
                    </option>
                  )),
                )}
              </select>
            </div>
            <div>
              <p className="mb-2 text-xs" style={{ color: 'var(--ink-dim)' }}>or upload your own audio (wav / mp3 / ogg / m4a / webm)</p>
              <input
                ref={uploadRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void f.arrayBuffer().then((buf) => runPrediction(buf, f.name));
                }}
              />
              <button className="btn-ghost w-full" onClick={() => uploadRef.current?.click()}>
                Upload audio file
              </button>
            </div>
          </div>

          {enableMic && (
            <MicRecorder
              accent={accent}
              disabled={busy}
              onRecorded={(blob) => void blob.arrayBuffer().then((buf) => runPrediction(buf, 'Live microphone recording'))}
            />
          )}

          {busy && (
            <div className="flex items-center gap-3 text-sm" style={{ color: accentColor }}>
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: accentColor }} />
              {phase}
            </div>
          )}

          {/* Spectrogram */}
          {selected?.file && !busy && (
            <SpectrogramPlayer key={`${nonce}-${selected.file}`} src={selected.file} accent={accent} height={130} />
          )}

          {/* Result */}
          {prediction && (
            <div className="rise-in space-y-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-sm" style={{ color: 'var(--ink-dim)' }}>Model says</span>
                <span className="font-display text-3xl font-semibold" style={{ color: accentColor, textShadow: `0 0 24px ${accentColor}55` }}>
                  {labels[prediction.topIdx].label}
                </span>
                <span className="font-grotesk text-sm tabular-nums" style={{ color: 'var(--ink-dim)' }}>
                  {(prediction.probs[prediction.topIdx] * 100).toFixed(1)}%
                </span>
              </div>
              <div className="space-y-2.5">
                {labels.map((l, i) => (
                  <div key={l.id} className="flex items-center gap-3">
                    <div className="w-36 shrink-0 truncate text-xs md:w-44" style={{ color: i === prediction.topIdx ? 'var(--ink)' : 'var(--ink-dim)' }}>
                      {l.label}
                    </div>
                    <div className="bar-track h-2 flex-1">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${prediction.probs[i] * 100}%`,
                          background: i === prediction.topIdx
                            ? `linear-gradient(90deg, ${accentColor}66, ${accentColor})`
                            : 'rgba(255,255,255,0.25)',
                        }}
                      />
                    </div>
                    <div className="w-14 text-right font-grotesk text-[11px] tabular-nums" style={{ color: 'var(--ink-dim)' }}>
                      {(prediction.probs[i] * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
