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

export default function BirdPage() {
  const [labels, setLabels] = useState<LabelMeta[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const { state, train, reset } = useTrainer();

  useEffect(() => {
    loadManifest()
      .then((m) => setLabels(m.birds))
      .catch((e: unknown) => setLoadErr(e instanceof Error ? e.message : 'Failed to load the dataset'));
  }, []);

  return (
    <main className="relative min-h-screen">
      <VideoBackground
        srcA={media("/media/bird-a.mp4")}
        srcB={media("/media/bird-b.mp4")}
        poster={media("/media/poster-bird.jpg")}
        tone="forest"
        dim={0.55}
      />

      <PageHero
        kicker="Chapter II · Misty Forest Species"
        title="Birdsong Classification"
        latin="BIRDSONG CLASSIFICATION · MEL-SPECTROGRAM CNN"
        desc="Birdsong is a highly structured sequence of frequencies — on a spectrogram a nightingale is a stream of flowing ripples, a cuckoo two confident downstrokes. The recordings here all come from the public Freesound database (CC0 / CC-BY licensed); the browser generates mel spectrograms in real time and trains a convolutional neural network. Once training finishes, open your microphone, record a snippet of birdsong, and the model will tell you who it most likely is."
        accent="gold"
      />

      <div className="section-rule my-10" />

      {loadErr && (
        <div className="mx-auto max-w-6xl px-6">
          <div className="glass-panel p-6 text-sm text-[#ff9a9a]">Failed to load the dataset: {loadErr}. Please refresh and try again.</div>
        </div>
      )}

      {labels && <SoundArchive labels={labels} accent="gold" kicker="Sound Archive · Species Library" title="Five songbirds, five signatures" />}

      {labels && (
        <section className="mx-auto max-w-6xl px-6 py-6">
          <TrainingPanel
            state={state}
            accent="gold"
            onTrain={() => void train(labels, 28)}
            onReset={reset}
            trainLabel="Train the birdsong CNN"
          />
        </section>
      )}

      {labels && (
        <section className="mx-auto max-w-6xl px-6 py-6 pb-24">
          <RecognitionPanel model={state.result?.model ?? null} labels={labels} accent="gold" enableMic />
        </section>
      )}
    </main>
  );
}
