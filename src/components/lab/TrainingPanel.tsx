'use client';

import { useEffect, useRef } from 'react';
import type { TrainerState } from '@/lib/ml/useTrainer';

interface TrainingPanelProps {
  state: TrainerState;
  accent: 'cyan' | 'gold';
  onTrain: () => void;
  onReset: () => void;
  trainLabel?: string;
}

const ACCENT = {
  cyan: { line: '#38e1ff', fill: 'rgba(56,225,255,0.12)', soft: 'rgba(56,225,255,0.15)', text: '#aef0ff' },
  gold: { line: '#f5c97b', fill: 'rgba(245,201,123,0.12)', soft: 'rgba(245,201,123,0.15)', text: '#fde4b0' },
};

export function TrainingPanel({ state, accent, onTrain, onReset, trainLabel = 'Start training' }: TrainingPanelProps) {
  const curveRef = useRef<HTMLCanvasElement>(null);
  const a = ACCENT[accent];
  const busy = state.phase === 'loading' || state.phase === 'training';

  useEffect(() => {
    const canvas = curveRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = (canvas.width = canvas.clientWidth * dpr);
    const h = (canvas.height = 180 * dpr);
    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const hist = state.history;
    if (hist.length < 2) return;
    const epochs = state.totalEpochs;

    const drawLine = (
      get: (p: { loss: number; acc: number }) => number,
      color: string,
      max: number,
      fillColor?: string,
    ) => {
      ctx.beginPath();
      hist.forEach((p, i) => {
        const x = (i / Math.max(1, epochs - 1)) * w;
        const v = Math.min(1, get(p) / max);
        const y = h - v * h * 0.92 - h * 0.04;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 * dpr;
      ctx.lineJoin = 'round';
      ctx.stroke();
      if (fillColor) {
        ctx.lineTo(((hist.length - 1) / Math.max(1, epochs - 1)) * w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
    };

    drawLine((p) => p.acc, a.line, 1, a.fill);
    drawLine((p) => p.loss, 'rgba(255,120,120,1)', 3);

    // Endpoint dot
    const last = hist[hist.length - 1];
    const lx = ((hist.length - 1) / Math.max(1, epochs - 1)) * w;
    const ly = h - Math.min(1, last.acc) * h * 0.92 - h * 0.04;
    ctx.beginPath();
    ctx.arc(lx, ly, 4 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = a.line;
    ctx.fill();
  }, [state.history, state.totalEpochs, a.line]);

  const result = state.result;

  return (
    <div className="glass-panel p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker mb-2">Training Lab</p>
          <h3 className="font-display text-2xl font-semibold md:text-3xl">Training Lab</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
            All in your browser: decode the recordings → extract 40×64 log-mel spectrogram
            segments → train a three-layer convolutional neural network (Conv2D 16/32/64) in
            real time. Every computation happens on your device; no audio ever leaves it.
          </p>
        </div>
        <div className="flex gap-3">
          {state.phase === 'done' && (
            <button className="btn-ghost" onClick={onReset}>
              Reset
            </button>
          )}
          <button
            className={`btn-ghost ${accent === 'cyan' ? 'btn-glow-cyan' : 'btn-glow-gold'}`}
            onClick={onTrain}
            disabled={busy}
          >
            {busy ? 'Training…' : state.phase === 'done' ? 'Retrain' : trainLabel}
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs" style={{ color: 'var(--ink-dim)' }}>
          <span className="font-grotesk tracking-wide">{state.statusText}</span>
          {state.phase === 'loading' && <span className="font-grotesk tabular-nums">{Math.round(state.progress * 100)}%</span>}
          {state.phase === 'training' && (
            <span className="font-grotesk tabular-nums">
              epoch {state.epoch}/{state.totalEpochs} · loss {state.loss.toFixed(3)} · acc {(state.acc * 100).toFixed(1)}%
            </span>
          )}
        </div>
        <div className="bar-track h-1.5">
          <div
            className="bar-fill"
            style={{
              width: `${state.phase === 'training' || state.phase === 'done' ? 100 : state.progress * 100}%`,
              background: `linear-gradient(90deg, ${a.line}55, ${a.line})`,
              transition: state.phase === 'training' ? 'none' : 'width 0.6s ease',
            }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Loss / accuracy curves */}
        <div className="lg:col-span-3">
          <div className="mb-2 flex items-center gap-5 text-[11px] font-grotesk" style={{ color: 'var(--ink-dim)' }}>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: a.line }} />
              ACCURACY
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'rgb(255,120,120)' }} />
              LOSS
            </span>
          </div>
          <div className="spectro-frame p-2">
            <canvas ref={curveRef} style={{ width: '100%', height: 180, display: 'block' }} />
          </div>
        </div>

        {/* Result stats */}
        <div className="lg:col-span-2">
          {result ? (
            <div className="rise-in space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Segments" value={`${state.totalSegments}`} sub={`${state.totalClips} recordings`} accent={a.text} />
                <Stat label="Epochs" value={`${result.history.length}`} sub="epochs" accent={a.text} />
                <Stat label="Train accuracy" value={`${(result.trainAcc * 100).toFixed(1)}%`} sub="train acc" accent={a.text} />
                <Stat label="Per-recording accuracy" value={`${(result.valAcc * 100).toFixed(1)}%`} sub="per-recording" accent={a.text} highlight />
              </div>
              <ConfusionMatrix result={result} accent={accent} />
            </div>
          ) : (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed text-center" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
              <div className="font-grotesk text-xs tracking-[0.2em]" style={{ color: 'var(--ink-dim)' }}>
                MODEL STANDBY
              </div>
              <p className="max-w-[220px] text-xs leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
                Hit train and the live curve, accuracy and confusion matrix will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent, highlight }: { label: string; value: string; sub: string; accent: string; highlight?: boolean }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: highlight ? `${accent}55` : 'rgba(255,255,255,0.12)',
        background: highlight ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
      }}
    >
      <div className="text-[11px]" style={{ color: 'var(--ink-dim)' }}>{label}</div>
      <div className="font-grotesk mt-1 text-2xl font-medium tabular-nums" style={{ color: highlight ? accent : 'var(--ink)' }}>
        {value}
      </div>
      <div className="mt-0.5 font-grotesk text-[10px] tracking-wide" style={{ color: 'var(--ink-dim)' }}>{sub}</div>
    </div>
  );
}

function ConfusionMatrix({ result, accent }: { result: NonNullable<TrainerState['result']>; accent: 'cyan' | 'gold' }) {
  const n = result.labels.length;
  const short = (s: string) => {
    const cleaned = s.replace(/[（(].*?[)）]/g, '').trim();
    // Take the first segment before separators, first two words max
    const parts = cleaned.split(/[·•]/).map((p) => p.trim()).filter(Boolean);
    return parts.length > 1 ? parts[0].slice(0, 6) : cleaned.slice(0, 6);
  };
  const cell = accent === 'cyan' ? '56,225,255' : '245,201,123';
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)' }}>
      <div className="mb-3 text-[11px]" style={{ color: 'var(--ink-dim)' }}>
        CONFUSION MATRIX
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr>
              <th />
              {result.labels.map((l, i) => (
                <th key={i} className="pb-1 font-grotesk text-[10px] font-normal" style={{ color: 'var(--ink-dim)' }}>
                  {short(l)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.confusion.map((row, i) => (
              <tr key={i}>
                <td className="pr-2 text-right font-grotesk text-[10px]" style={{ color: 'var(--ink-dim)' }}>
                  {short(result.labels[i])}
                </td>
                {row.map((v, j) => (
                  <td key={j} className="p-0.5">
                    <div
                      className="flex h-8 min-w-8 items-center justify-center rounded-md font-grotesk text-[11px] tabular-nums"
                      style={{
                        background: v > 0 ? `rgba(${cell},${i === j ? 0.55 : 0.22})` : 'rgba(255,255,255,0.04)',
                        color: v > 0 ? '#fff' : 'rgba(255,255,255,0.25)',
                      }}
                    >
                      {v}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px]" style={{ color: 'var(--ink-dim)' }}>
        {n} classes × majority vote per recording · diagonal = correct
      </p>
    </div>
  );
}
