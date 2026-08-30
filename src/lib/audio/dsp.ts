/**
 * Real digital signal processing module:
 * - radix-2 Cooley–Tukey FFT
 * - audio decoding / resampling (Web Audio OfflineAudioContext)
 * - mel filterbank, log-mel spectrogram, MFCC
 * - linear spectrum for visualization
 */

export const TARGET_SR = 22050;
export const FFT_SIZE = 1024;
export const HOP_SIZE = 512;
export const N_MELS = 40;

export interface DecodedAudio {
  channel: Float32Array; // mono
  sampleRate: number;
  duration: number;
}

/** Decode any audio URL/ArrayBuffer, resampled to mono at TARGET_SR */
let sharedCtx: AudioContext | null = null;

export async function decodeAudio(source: string | ArrayBuffer): Promise<DecodedAudio> {
  const AC: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) throw new Error('Web Audio API is not supported in this browser');
  const Offline = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!Offline) throw new Error('OfflineAudioContext is not supported in this browser');

  const buf = typeof source === 'string' ? await (await fetch(source)).arrayBuffer() : source;

  // reuse one decode context to avoid browser limits on AudioContext count
  if (!sharedCtx) sharedCtx = new AC();
  if (sharedCtx.state === 'suspended') await sharedCtx.resume().catch(() => undefined);
  const decoded = await sharedCtx.decodeAudioData(buf.slice(0));
  const rawSr = decoded.sampleRate;
  const chCount = decoded.numberOfChannels;

  const offline = new Offline(1, Math.ceil((decoded.length / rawSr) * TARGET_SR), TARGET_SR);
  const src = offline.createBufferSource();
  // mix multi-channel down to mono
  const mono = offline.createBuffer(1, decoded.length, rawSr);
  const mix = mono.getChannelData(0);
  for (let i = 0; i < decoded.length; i++) {
    let s = 0;
    for (let c = 0; c < chCount; c++) s += decoded.getChannelData(c)[i];
    mix[i] = s / chCount;
  }
  src.buffer = mono;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  const channel = rendered.getChannelData(0);
  return { channel, sampleRate: TARGET_SR, duration: channel.length / TARGET_SR };
}

/* ---------------- FFT (radix-2, in-place) ---------------- */

const bitRevCache = new Map<number, Uint16Array>();

function bitReversal(n: number): Uint16Array {
  const cached = bitRevCache.get(n);
  if (cached) return cached;
  const rev = new Uint16Array(n);
  const bits = Math.log2(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) r = (r << 1) | ((i >> b) & 1);
    rev[i] = r;
  }
  bitRevCache.set(n, rev);
  return rev;
}

export interface FFTResult {
  real: Float32Array;
  imag: Float32Array;
}

/** FFT of a real signal of length 2^n; returns the one-sided spectrum of length n/2+1 */
export function fftMagnitude(frame: Float32Array): Float32Array {
  const n = frame.length;
  const rev = bitReversal(n);
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    real[i] = frame[rev[i]];
  }
  for (let size = 2; size <= n; size *= 2) {
    const half = size / 2;
    const angle = (-2 * Math.PI) / size;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let start = 0; start < n; start += size) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < half; k++) {
        const aRe = real[start + k];
        const aIm = imag[start + k];
        const bRe = real[start + k + half] * curRe - imag[start + k + half] * curIm;
        const bIm = real[start + k + half] * curIm + imag[start + k + half] * curRe;
        real[start + k] = aRe + bRe;
        imag[start + k] = aIm + bIm;
        real[start + k + half] = aRe - bRe;
        imag[start + k + half] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
  const mag = new Float32Array(n / 2 + 1);
  for (let i = 0; i <= n / 2; i++) mag[i] = Math.hypot(real[i], imag[i]) / n;
  return mag;
}

/* ---------------- Window functions ---------------- */

const hannCache = new Map<number, Float32Array>();

export function hannWindow(size: number): Float32Array {
  const cached = hannCache.get(size);
  if (cached) return cached;
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  hannCache.set(size, w);
  return w;
}

/* ---------------- STFT & spectra ---------------- */

export interface SpectrogramData {
  /** frames × bins of energy (in dB) */
  db: Float32Array[];
  freqBins: number;
  frames: number;
  frameRate: number; // frames per second
  maxFreq: number;
}

/** Linear power spectrum (dB), used for spectrogram drawing */
export function computeSpectrogram(channel: Float32Array, sr = TARGET_SR, fftSize = FFT_SIZE, hop = HOP_SIZE): SpectrogramData {
  const win = hannWindow(fftSize);
  const frames: Float32Array[] = [];
  for (let start = 0; start + fftSize <= channel.length; start += hop) {
    const frame = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) frame[i] = channel[start + i] * win[i];
    const mag = fftMagnitude(frame);
    const db = new Float32Array(mag.length);
    for (let i = 0; i < mag.length; i++) {
      db[i] = 20 * Math.log10(mag[i] * mag[i] + 1e-10);
    }
    frames.push(db);
  }
  return {
    db: frames,
    freqBins: fftSize / 2 + 1,
    frames: frames.length,
    frameRate: sr / hop,
    maxFreq: sr / 2,
  };
}

/* ---------------- Mel filterbank ---------------- */

function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}
function melToHz(mel: number): number {
  return 700 * (10 ** (mel / 2595) - 1);
}

export interface MelFilterbank {
  filters: Float32Array[]; // nMels × freqBins
  nMels: number;
}

export function buildMelFilterbank(nMels: number, fftSize: number, sr: number, fMin = 40, fMax = sr / 2): MelFilterbank {
  const bins = fftSize / 2 + 1;
  const melMin = hzToMel(fMin);
  const melMax = hzToMel(fMax);
  const points: number[] = [];
  for (let m = 0; m < nMels + 2; m++) {
    const hz = melToHz(melMin + ((melMax - melMin) * m) / (nMels + 1));
    points.push(Math.floor(((fftSize + 1) * hz) / sr));
  }
  const filters: Float32Array[] = [];
  for (let m = 1; m <= nMels; m++) {
    const f = new Float32Array(bins);
    const left = points[m - 1];
    const center = points[m];
    const right = points[m + 1];
    for (let k = left; k < center; k++) f[k] = (k - left) / Math.max(1, center - left);
    for (let k = center; k < right; k++) f[k] = (right - k) / Math.max(1, right - center);
    filters.push(f);
  }
  return { filters, nMels: nMels };
}

/** Log-mel spectrogram: frames × nMels */
export function computeLogMel(
  channel: Float32Array,
  sr = TARGET_SR,
  fftSize = FFT_SIZE,
  hop = HOP_SIZE,
  nMels = N_MELS,
): { mel: Float32Array[]; frameRate: number } {
  const win = hannWindow(fftSize);
  const fb = buildMelFilterbank(nMels, fftSize, sr);
  const melFrames: Float32Array[] = [];
  for (let start = 0; start + fftSize <= channel.length; start += hop) {
    const frame = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) frame[i] = channel[start + i] * win[i];
    const mag = fftMagnitude(frame);
    const power = new Float32Array(mag.length);
    for (let i = 0; i < mag.length; i++) power[i] = mag[i] * mag[i];
    const mel = new Float32Array(nMels);
    for (let m = 0; m < nMels; m++) {
      let e = 0;
      const f = fb.filters[m];
      for (let k = 0; k < power.length; k++) e += power[k] * f[k];
      mel[m] = Math.log(e + 1e-10);
    }
    melFrames.push(mel);
  }
  return { mel: melFrames, frameRate: sr / hop };
}

/* ---------------- Feature matrix (CNN input) ---------------- */

export const SPEC_TIME = 64;
export const SPEC_MELS = 40;

/** Slice long audio into fixed-length segments; each returns a SPEC_MELS × SPEC_TIME log-mel matrix */
export function extractSegments(
  channel: Float32Array,
  sr = TARGET_SR,
  segSeconds = 3,
): Float32Array[] {
  const { mel } = computeLogMel(channel, sr);
  if (mel.length === 0) return [];
  const framesPerSeg = Math.round((segSeconds * sr) / HOP_SIZE);
  const segments: Float32Array[] = [];

  const take = (startFrame: number): Float32Array | null => {
    if (startFrame + framesPerSeg > mel.length) return null;
    const mat = new Float32Array(SPEC_MELS * SPEC_TIME);
    for (let t = 0; t < SPEC_TIME; t++) {
      const srcT = startFrame + Math.floor((t * framesPerSeg) / SPEC_TIME);
      const src = mel[Math.min(srcT, mel.length - 1)];
      for (let m = 0; m < SPEC_MELS; m++) mat[t * SPEC_MELS + m] = src[m];
    }
    return mat;
  };

  // evenly sample up to maxSegs segments
  const maxSegs = 6;
  const totalSegs = Math.max(1, Math.floor(mel.length / framesPerSeg));
  const stride = Math.max(1, Math.floor(totalSegs / maxSegs));
  for (let s = 0; s < totalSegs; s += stride) {
    const mat = take(s * framesPerSeg);
    if (mat) segments.push(mat);
    if (segments.length >= maxSegs) break;
  }
  // fallback: zero-pad when the audio is shorter than 3s
  if (segments.length === 0) {
    const mat = new Float32Array(SPEC_MELS * SPEC_TIME);
    for (let t = 0; t < SPEC_TIME && t < mel.length; t++) {
      for (let m = 0; m < SPEC_MELS; m++) mat[t * SPEC_MELS + m] = mel[t][m];
    }
    segments.push(mat);
  }
  return segments;
}

/** Global long-term statistics (MFCC mean/variance + spectral features), for similarity analysis */
export function extractGlobalFeatures(channel: Float32Array, sr = TARGET_SR): Float32Array {
  const { mel } = computeLogMel(channel, sr);
  if (mel.length === 0) return new Float32Array(26);
  // DCT-II, keep the first 13 MFCC coefficients
  const nCoeffs = 13;
  const mfccFrames: number[][] = [];
  for (const frame of mel) {
    const coeffs: number[] = [];
    for (let k = 0; k < nCoeffs; k++) {
      let sum = 0;
      for (let m = 0; m < N_MELS; m++) {
        sum += frame[m] * Math.cos((Math.PI * k * (m + 0.5)) / N_MELS);
      }
      coeffs.push(sum);
    }
    mfccFrames.push(coeffs);
  }
  const feat = new Float32Array(nCoeffs * 2);
  for (let k = 0; k < nCoeffs; k++) {
    let mean = 0;
    for (const f of mfccFrames) mean += f[k];
    mean /= mfccFrames.length;
    let varSum = 0;
    for (const f of mfccFrames) varSum += (f[k] - mean) ** 2;
    feat[k] = mean;
    feat[nCoeffs + k] = Math.sqrt(varSum / mfccFrames.length);
  }
  return feat;
}
