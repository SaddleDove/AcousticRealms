import { ChapterCard } from '@/components/cinematic/ChapterCard';
import { media } from '@/lib/paths';

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      {/* Ambient background: deep ocean → misty forest vertical gradient */}
      <div
        className="fixed inset-0 -z-10"
        aria-hidden
        style={{
          background:
            'radial-gradient(90% 60% at 20% 10%, rgba(18,80,120,0.55), transparent 60%),' +
            'radial-gradient(90% 60% at 82% 85%, rgba(26,70,45,0.6), transparent 60%),' +
            'linear-gradient(175deg, #041b2e 0%, #03141f 45%, #06140d 100%)',
        }}
      />
      {/* Floating particles */}
      <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        {Array.from({ length: 30 }).map((_, i) => (
          <span
            key={i}
            className="particle"
            style={
              {
                left: `${(i * 37) % 100}%`,
                bottom: '-4vh',
                width: 1.5 + ((i * 7) % 3),
                height: 1.5 + ((i * 7) % 3),
                background: i % 2 ? 'rgba(170,235,255,0.8)' : 'rgba(255,228,170,0.7)',
                boxShadow: `0 0 8px ${i % 2 ? 'rgba(56,225,255,0.6)' : 'rgba(245,201,123,0.5)'}`,
                animationDuration: `${16 + ((i * 13) % 20)}s`,
                animationDelay: `${-((i * 11) % 30)}s`,
                '--p-drift': `${((i * 29) % 80) - 40}px`,
                '--p-opacity': 0.35,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-16 md:pt-24">
        {/* Masthead */}
        <header className="rise-in text-center">
          <p className="kicker mb-5">Acoustic Realms · Bioacoustics AI Lab</p>
          <h1 className="font-display text-5xl font-semibold leading-[1.15] tracking-wide md:text-7xl">
            Acoustic Realms
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-loose md:text-lg" style={{ color: 'var(--ink-dim)' }}>
            Deep in the ocean, a humpback&apos;s song crosses hundreds of miles;
            in the misty forest, birdsong is a species&apos; signature.
            <br className="hidden md:block" />
            Here, <span className="font-grotesk text-[#aef0ff]">DSP spectral analysis</span> and
            <span className="font-grotesk text-[#fde4b0]"> convolutional neural networks</span>
            train these sounds into recognizable models — running entirely in your browser.
          </p>
        </header>

        <div className="section-rule my-14" />

        {/* Two chapters */}
        <section className="grid gap-6 lg:grid-cols-2">
          <ChapterCard
            href="/whale"
            poster={media("/media/poster-whale.jpg")}
            kicker="Chapter I · Deep Ocean"
            title="Whale Song Recognition"
            subtitle="HUMPBACK WHALE VOICEPRINT"
            desc="The humpback's song is the most complex acoustic structure in the animal kingdom. Based on real recordings released by NOAA and the NPS, we extract mel-spectral features and train a classifier to tell individual whales apart by their voiceprint."
            accent="cyan"
            tags={['DSP Spectra', 'Mel Filterbank', 'CNN Classifier', 'Public Datasets']}
            delay={120}
          />
          <ChapterCard
            href="/bird"
            poster={media("/media/poster-bird.jpg")}
            kicker="Chapter II · Misty Forest"
            title="Birdsong Classification"
            subtitle="BIRDSONG SPECIES CNN"
            desc="Real field recordings from the public Freesound database (CC0 / CC-BY). Spectrograms are generated and a CNN is trained in the browser; then open your microphone, record a bird, and let the model name it on the spot."
            accent="gold"
            tags={['Live Spectrogram', 'Conv2D Net', 'Mic Inference', '5 Species']}
            delay={240}
          />
        </section>

        {/* Technical footnote */}
        <footer className="rise-in mt-16 text-center" style={{ animationDelay: '400ms' }}>
          <div className="mx-auto mb-5 h-px w-40" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />
          <p className="mx-auto max-w-3xl text-xs leading-relaxed" style={{ color: 'rgba(244,247,246,0.45)' }}>
            Audio sources: NOAA/PMEL Acoustics Program, Glacier Bay National Park, Ocean Mammal Institute,
            and Freesound.org community recordists (CC0 / CC-BY). Deep learning runs locally in your browser
            via TensorFlow.js — no audio is ever uploaded. Ambient scenes are AI-generated cinematic clips.
          </p>
        </footer>
      </div>
    </main>
  );
}
