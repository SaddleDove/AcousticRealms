/**
 * Base path for static hosting (e.g. GitHub Pages at /AcousticRealms).
 * Single source of truth: set NEXT_PUBLIC_BASE_PATH at build time (also read by
 * next.config.ts). Empty string when running locally at the domain root.
 */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** Prefix an absolute asset path (e.g. '/media/x.mp4') with the base path. */
export const media = (p: string): string => BASE + p;
