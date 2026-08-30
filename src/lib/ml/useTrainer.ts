'use client';

import { useCallback, useState } from 'react';
import { decodeAudio, extractSegments, type DecodedAudio } from '@/lib/audio/dsp';
import { trainCNN, type DataPoint, type TrainResult } from '@/lib/ml/cnn';
import type { LabelMeta } from '@/lib/audio/dataset';

export type TrainerPhase = 'idle' | 'loading' | 'training' | 'done' | 'error';

export interface TrainerState {
  phase: TrainerPhase;
  progress: number; // 0..1 data-processing stage
  statusText: string;
  epoch: number;
  totalEpochs: number;
  loss: number;
  acc: number;
  history: { epoch: number; loss: number; acc: number }[];
  result: TrainResult | null;
  totalClips: number;
  totalSegments: number;
}

const INITIAL: TrainerState = {
  phase: 'idle',
  progress: 0,
  statusText: 'Ready to start',
  epoch: 0,
  totalEpochs: 25,
  loss: 0,
  acc: 0,
  history: [],
  result: null,
  totalClips: 0,
  totalSegments: 0,
};

/**
 * Training pipeline: download & decode all recordings → extract log-mel segments → train the CNN
 */
export function useTrainer() {
  const [state, setState] = useState<TrainerState>(INITIAL);

  const reset = useCallback(() => setState(INITIAL), []);

  const train = useCallback(async (labels: LabelMeta[], epochs = 25) => {
    setState({ ...INITIAL, phase: 'loading', statusText: 'Downloading public dataset recordings…', totalEpochs: epochs });
    try {
      const data: DataPoint[] = [];
      const decodedCache = new Map<string, DecodedAudio>();
      const total = labels.reduce((n, l) => n + l.clips.length, 0);
      let done = 0;

      for (let li = 0; li < labels.length; li++) {
        const label = labels[li];
        for (const clip of label.clips) {
          let audio = decodedCache.get(clip.file);
          if (!audio) {
            audio = await decodeAudio(clip.file);
            decodedCache.set(clip.file, audio);
          }
          const segments = extractSegments(audio.channel, audio.sampleRate, 3);
          for (const seg of segments) data.push({ seg, labelIdx: li });
          done++;
          setState((s) => ({
            ...s,
            progress: done / total,
            statusText: `Extracting DSP features ${done}/${total} · ${label.label}`,
            totalSegments: data.length,
          }));
          // yield to the main thread to keep the UI responsive
          await new Promise((r) => setTimeout(r, 10));
        }
      }

      if (data.length < labels.length * 3) {
        throw new Error('Too few valid samples; please check the dataset');
      }

      setState((s) => ({
        ...s,
        phase: 'training',
        progress: 1,
        statusText: 'Training the CNN…',
        totalClips: total,
        totalSegments: data.length,
      }));

      const labelNames = labels.map((l) => l.label);
      const result = await trainCNN(data, labels.length, labelNames, {
        onEpoch: (epoch, loss, acc) => {
          setState((s) => ({
            ...s,
            epoch,
            loss,
            acc,
            history: [...s.history, { epoch, loss, acc }],
            statusText: `Training · epoch ${epoch}/${epochs}`,
          }));
        },
      }, epochs);

      setState((s) => ({
        ...s,
        phase: 'done',
        statusText: 'Training complete',
        result,
      }));
      return result;
    } catch (e) {
      setState((s) => ({
        ...s,
        phase: 'error',
        statusText: e instanceof Error ? e.message : 'Training failed',
      }));
      return null;
    }
  }, []);

  return { state, train, reset };
}
