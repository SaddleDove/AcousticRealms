import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Acoustic Realms · An AI Lab for Whale Song & Birdsong',
    template: '%s · Acoustic Realms',
  },
  description:
    'Listen to the individual voiceprints of humpback whales and the species songs of misty-forest birds through DSP spectral analysis and convolutional neural networks. Feature extraction, model training and recognition all run in your browser on real public recordings.',
  keywords: ['whale song recognition', 'birdsong classification', 'mel spectrogram', 'CNN', 'bioacoustics', 'TensorFlow.js', 'humpback whale', 'Freesound'],
  authors: [{ name: 'Acoustic Realms Lab' }],
  openGraph: {
    title: 'Acoustic Realms',
    description: 'Whale song voiceprint ID × birdsong species classification — a browser-based bioacoustics AI lab',
    locale: 'en_US',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" style={{ background: '#03141f' }}>
        {children}
      </body>
    </html>
  );
}
