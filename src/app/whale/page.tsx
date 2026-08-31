'use client';

import { useEffect, useState } from 'react';
import { VideoBackground } from '@/components/cinematic/VideoBackground';
import { media } from '@/lib/paths';
import { PageHero } from '@/components/cinematic/PageHero';
import { SoundArchive } from '@/components/lab/SoundArchive';
import { TrainingPanel } from '@/components/lab/TrainingPanel';
import { RecognitionPanel } from '@/components/lab/RecognitionPanel';
import { loadManifest, type LabelMeta } from '@/lib/audio/dataset';
import { useTrainer } from '@/lib/ml/useTrainer';

export default function WhalePage() {
  const [labels, setLabels] = useState<LabelMeta[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const { state, train, reset } = useTrainer();

  useEffect(() => {
    loadManifest()
      .then((m) => setLabels(m.whales))
      .catch((e: unknown) => setLoadErr(e instanceof Error ? e.message : 'Failed to load the dataset'));
  }, []);

  return (
    <main className="relative min-h-screen">
      <VideoBackground
        srcA={media("/media/whale-a.mp4")}
        poster={media("/media/poster-whale.jpg")}
        tone="ocean"
        dim={0.6}
        mode="once"
      />

      <PageHero
        kicker="Chapter I · Deep Ocean Voiceprint"
        title="Whale Song Recognition"
        latin="HUMPBACK WHALE · MEGAPTERA NOVAEANGLIAE"
        desc="A humpback's song can travel hundreds of kilometers, and individuals in the same feeding ground share melodies that keep evolving. We feed real whale recordings released by NOAA and the National Park Service through a digital signal processing pipeline — Fourier transforms, mel filter banks, log spectra — and hand them to a convolutional neural network that learns the acoustic identity woven into each whale's voice."
        accent="cyan"
      />

      <div className="section-rule my-10" />

      {loadErr && (
        <div className="mx-auto max-w-6xl px-6">
          <div className="glass-panel p-6 text-sm text-[#ff9a9a]">Failed to load the dataset: {loadErr}. Please refresh and try again.</div>
        </div>
      )}

      {labels && <SoundArchive labels={labels} accent="cyan" kicker="Sound Archive · Voiceprints" title="Three whales, three songs" />}

      {labels && (
        <section className="mx-auto max-w-6xl px-6 py-6">
          <TrainingPanel
            state={state}
            accent="cyan"
            onTrain={() => void train(labels, 28)}
            onReset={reset}
            trainLabel="Train the voiceprint classifier"
          />
        </section>
      )}

      {labels && (
        <section className="mx-auto max-w-6xl px-6 py-6 pb-24">
          <RecognitionPanel model={state.result?.model ?? null} labels={labels} accent="cyan" />
        </section>
      )}
    </main>
  );
}
