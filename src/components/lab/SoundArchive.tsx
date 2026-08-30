'use client';

import type { LabelMeta } from '@/lib/audio/dataset';
import { SpectrogramPlayer } from './SpectrogramPlayer';

interface SoundArchiveProps {
  labels: LabelMeta[];
  accent: 'cyan' | 'gold';
  kicker: string;
  title: string;
}

export function SoundArchive({ labels, accent, kicker, title }: SoundArchiveProps) {
  const accentColor = accent === 'cyan' ? '#38e1ff' : '#f5c97b';
  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <p className="kicker mb-2" style={{ color: accentColor }}>{kicker}</p>
      <h2 className="font-display mb-3 text-2xl font-semibold md:text-3xl">{title}</h2>
      <p className="mb-8 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
        Hit play and the browser runs a short-time Fourier transform (STFT) on the recording in
        real time, drawing the log-energy spectrogram — time on the horizontal axis, frequency on
        the vertical, brightness as energy. Every song has its own texture.
      </p>
      <div className="grid gap-6">
        {labels.map((label, i) => (
          <div key={label.id} className="glass-panel rise-in p-6 md:p-7" style={{ animationDelay: `${i * 90}ms` }}>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-semibold md:text-2xl">{label.label}</h3>
                {label.sub && (
                  <p className="mt-1 font-grotesk text-xs tracking-[0.14em]" style={{ color: accentColor }}>
                    {label.sub}
                  </p>
                )}
                {label.latin && (
                  <p className="mt-0.5 font-grotesk text-xs italic" style={{ color: 'var(--ink-dim)' }}>
                    {label.latin}
                  </p>
                )}
              </div>
              <span
                className="rounded-full border px-3 py-1 font-grotesk text-[11px] tracking-wider"
                style={{ borderColor: `${accentColor}44`, color: accentColor, background: `${accentColor}10` }}
              >
                {label.clips.length} recordings
              </span>
            </div>
            {label.desc && (
              <p className="mb-5 max-w-3xl text-xs leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
                {label.desc}
              </p>
            )}
            <div className="grid gap-4">
              {label.clips.map((clip) => (
                <div key={clip.file}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="truncate text-xs" style={{ color: 'rgba(244,247,246,0.75)' }}>
                      {clip.title}
                    </span>
                    {clip.recordist && (
                      <span className="shrink-0 font-grotesk text-[10px]" style={{ color: 'rgba(244,247,246,0.4)' }}>
                        rec. {clip.recordist}
                      </span>
                    )}
                  </div>
                  <SpectrogramPlayer src={clip.file} accent={accent} height={120} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
