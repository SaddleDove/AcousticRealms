/**
 * Browser-side TensorFlow.js CNN classifier:
 * input: 40(mel) × 64(time) × 1 log-mel spectrogram segments
 * 2 Conv2D layers + MaxPool + Dense, with live training callbacks
 */
import type { Sequential, Tensor } from '@tensorflow/tfjs';

export interface TrainCallbacks {
  onEpoch?: (epoch: number, loss: number, acc: number) => void;
  onBatch?: (batch: number, totalBatches: number) => void;
}

export interface TrainResult {
  model: Sequential;
  history: { epoch: number; loss: number; acc: number }[];
  trainAcc: number;
  valAcc: number;
  confusion: number[][];
  labels: string[];
}

/** z-score normalize a single spectrogram segment */
export function normalizeSegment(seg: Float32Array): Float32Array {
  let mean = 0;
  for (let i = 0; i < seg.length; i++) mean += seg[i];
  mean /= seg.length;
  let std = 0;
  for (let i = 0; i < seg.length; i++) std += (seg[i] - mean) ** 2;
  std = Math.sqrt(std / seg.length) + 1e-6;
  const out = new Float32Array(seg.length);
  for (let i = 0; i < seg.length; i++) out[i] = (seg[i] - mean) / std;
  return out;
}

function buildModel(tf: typeof import('@tensorflow/tfjs'), numClasses: number): Sequential {
  const model = tf.sequential();
  const IMG_H = 40;
  const IMG_W = 64;
  model.add(
    tf.layers.conv2d({
      inputShape: [IMG_H, IMG_W, 1],
      filters: 16,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same',
      kernelInitializer: 'heNormal',
    }),
  );
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
  model.add(
    tf.layers.conv2d({ filters: 32, kernelSize: 3, activation: 'relu', padding: 'same', kernelInitializer: 'heNormal' }),
  );
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
  model.add(
    tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: 'relu', padding: 'same', kernelInitializer: 'heNormal' }),
  );
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: 64, activation: 'relu', kernelInitializer: 'heNormal' }));
  model.add(tf.layers.dropout({ rate: 0.25 }));
  model.add(tf.layers.dense({ units: numClasses, activation: 'softmax' }));
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });
  return model;
}

export interface DataPoint {
  seg: Float32Array;
  labelIdx: number;
}

/** Train. labels = class names; data = all samples (80/20 train/validation split internally) */
export async function trainCNN(
  data: DataPoint[],
  numClasses: number,
  labels: string[],
  callbacks: TrainCallbacks = {},
  epochs = 25,
): Promise<TrainResult> {
  const tf = await import('@tensorflow/tfjs');
  tf.util.shuffle(data);
  const split = Math.floor(data.length * 0.8);
  const train = data.slice(0, split);
  const val = data.slice(split);

  const toTensor = (pts: DataPoint[]): { xs: Tensor; ys: Tensor } => {
    const flat: number[] = [];
    for (const p of pts) flat.push(...Array.from(normalizeSegment(p.seg)));
    const xs = tf.tensor4d(flat, [pts.length, 40, 64, 1]);
    const ys = tf.oneHot(pts.map((p) => p.labelIdx), numClasses);
    return { xs, ys };
  };

  const { xs: xTrain, ys: yTrain } = toTensor(train);
  const { xs: xVal, ys: yVal } = val.length > 0 ? toTensor(val) : { xs: xTrain, ys: yTrain };

  const model = buildModel(tf, numClasses);
  const history: { epoch: number; loss: number; acc: number }[] = [];

  const totalBatches = Math.ceil(train.length / 16);
  await model.fit(xTrain, yTrain, {
    epochs,
    batchSize: 16,
    validationData: [xVal, yVal],
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        const loss = Number(logs?.loss ?? 0);
        const acc = Number(logs?.acc ?? 0);
        history.push({ epoch: epoch + 1, loss, acc });
        callbacks.onEpoch?.(epoch + 1, loss, acc);
      },
      onBatchEnd: (batch) => {
        callbacks.onBatch?.(batch + 1, totalBatches);
      },
    },
  });

  // confusion matrix: average segment predictions over all samples
  const confusion = Array.from({ length: numClasses }, () => new Array<number>(numClasses).fill(0));
  // group by labelIdx and average predictions, simulating one recording per individual/species
  const grouped = new Map<number, DataPoint[]>();
  for (const p of data) {
    const arr = grouped.get(p.labelIdx) ?? [];
    arr.push(p);
    grouped.set(p.labelIdx, arr);
  }
  let correct = 0;
  let total = 0;
  for (const [labelIdx, pts] of grouped) {
    const probs = await predictSegments(model, pts.map((p) => p.seg));
    const pred = probs.indexOf(Math.max(...probs));
    confusion[labelIdx][pred]++;
    if (pred === labelIdx) correct++;
    total++;
  }

  const trainPred = model.predict(xTrain) as Tensor;
  const trainAcc = (await trainPred.array() as number[][]).reduce(
    (acc, row, i) => acc + (row.indexOf(Math.max(...row)) === train[i].labelIdx ? 1 : 0),
    0,
  ) / Math.max(1, train.length);
  trainPred.dispose();
  xTrain.dispose();
  yTrain.dispose();
  xVal.dispose();
  yVal.dispose();

  return {
    model,
    history,
    trainAcc,
    valAcc: total > 0 ? correct / total : 0,
    confusion,
    labels,
  };
}

/** Predict over multiple segments of one recording, returning mean class probabilities */
export async function predictSegments(model: Sequential, segments: Float32Array[]): Promise<number[]> {
  const tf = await import('@tensorflow/tfjs');
  if (segments.length === 0) return [];
  const flat: number[] = [];
  for (const s of segments) flat.push(...Array.from(normalizeSegment(s)));
  const input = tf.tensor4d(flat, [segments.length, 40, 64, 1]);
  const pred = model.predict(input) as Tensor;
  const arr = (await pred.array()) as number[][];
  pred.dispose();
  input.dispose();
  const numClasses = arr[0].length;
  const avg = new Array<number>(numClasses).fill(0);
  for (const row of arr) for (let i = 0; i < numClasses; i++) avg[i] += row[i];
  for (let i = 0; i < numClasses; i++) avg[i] /= arr.length;
  return avg;
}
