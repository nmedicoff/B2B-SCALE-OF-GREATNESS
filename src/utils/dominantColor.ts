import type { CSSProperties } from "react";

/** Slate-400 — used before extraction completes or on failure. */
export const COLUMN_ACCENT_FALLBACK_RGB = "rgb(148, 163, 184)";

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function sampleDominantRgb(img: HTMLImageElement): string {
  const canvas = document.createElement("canvas");
  const target = 56;
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (!w || !h) return COLUMN_ACCENT_FALLBACK_RGB;
  const scale = Math.min(1, target / Math.max(w, h));
  w = Math.max(1, Math.round(w * scale));
  h = Math.max(1, Math.round(h * scale));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return COLUMN_ACCENT_FALLBACK_RGB;
  ctx.drawImage(img, 0, 0, w, h);
  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, w, h);
  } catch {
    return COLUMN_ACCENT_FALLBACK_RGB;
  }

  const quant = 28;
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let n = 0;

  for (let i = 0; i < data.data.length; i += 4) {
    const a = data.data[i + 3];
    if (a < 40) continue;
    const r = data.data[i];
    const g = data.data[i + 1];
    const b = data.data[i + 2];
    sumR += r;
    sumG += g;
    sumB += b;
    n++;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 22 || lum > 248) continue;
    const br = Math.round(r / quant) * quant;
    const bg = Math.round(g / quant) * quant;
    const bb = Math.round(b / quant) * quant;
    const key = `${br},${bg},${bb}`;
    const cur = buckets.get(key);
    if (cur) cur.count++;
    else buckets.set(key, { count: 1, r: br, g: bg, b: bb });
  }

  if (buckets.size > 0) {
    let best = buckets.values().next().value!;
    for (const v of buckets.values()) {
      if (v.count > best.count) best = v;
    }
    return `rgb(${best.r}, ${best.g}, ${best.b})`;
  }
  if (n > 0) {
    return `rgb(${Math.round(sumR / n)}, ${Math.round(sumG / n)}, ${Math.round(sumB / n)})`;
  }
  return COLUMN_ACCENT_FALLBACK_RGB;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

export async function getDominantColorFromImageUrl(src: string): Promise<string> {
  try {
    const img = await loadImage(src);
    return sampleDominantRgb(img);
  } catch {
    return COLUMN_ACCENT_FALLBACK_RGB;
  }
}

/** One canvas sample per URL; concurrent callers share the same promise. */
export function getDominantColorCached(src: string): Promise<string> {
  const hit = cache.get(src);
  if (hit) return Promise.resolve(hit);
  let p = inflight.get(src);
  if (!p) {
    p = getDominantColorFromImageUrl(src).then((c) => {
      cache.set(src, c);
      inflight.delete(src);
      return c;
    });
    inflight.set(src, p);
  }
  return p;
}

/**
 * `prominentBackground` — stronger tint for cards under the 1. Damaging header (column 1):
 * sampled dominant colour from that asset reads clearly as the card background.
 */
export function columnAccentShellStyle(rgb: string, prominentBackground = false): CSSProperties {
  if (prominentBackground) {
    const top = `color-mix(in srgb, ${rgb} 38%, white)`;
    const mid = `color-mix(in srgb, ${rgb} 28%, white)`;
    const bot = `color-mix(in srgb, ${rgb} 18%, white)`;
    return {
      borderColor: `color-mix(in srgb, ${rgb} 52%, rgb(203 213 225))`,
      background: `linear-gradient(180deg, ${top} 0%, ${mid} 42%, ${bot} 100%)`,
      boxShadow: [
        `0 2px 8px color-mix(in srgb, ${rgb} 22%, rgb(0 0 0 / 0.08))`,
        `0 12px 40px -8px color-mix(in srgb, ${rgb} 30%, rgb(0 0 0 / 0.32))`
      ].join(", ")
    };
  }
  return {
    borderColor: `color-mix(in srgb, ${rgb} 42%, rgb(203 213 225))`,
    background: `linear-gradient(165deg, color-mix(in srgb, ${rgb} 10%, white) 0%, white 52%, color-mix(in srgb, ${rgb} 4%, white) 100%)`,
    boxShadow: [
      `0 2px 8px color-mix(in srgb, ${rgb} 16%, rgb(0 0 0 / 0.07))`,
      `0 12px 40px -8px color-mix(in srgb, ${rgb} 24%, rgb(0 0 0 / 0.3))`
    ].join(", ")
  };
}

export function columnAccentImageWellStyle(rgb: string, prominentBackground = false): CSSProperties {
  if (prominentBackground) {
    return {
      backgroundColor: `color-mix(in srgb, ${rgb} 32%, rgb(252 252 252))`
    };
  }
  return {
    backgroundColor: `color-mix(in srgb, ${rgb} 14%, rgb(248 250 252))`
  };
}

export function columnAccentFieldsSectionStyle(rgb: string, prominentBackground = false): CSSProperties {
  if (prominentBackground) {
    return {
      backgroundColor: `color-mix(in srgb, ${rgb} 22%, white)`
    };
  }
  return {
    backgroundColor: `color-mix(in srgb, ${rgb} 5%, white)`
  };
}

export function columnAccentInnerPanelStyle(rgb: string, prominentBackground = false): CSSProperties {
  if (prominentBackground) {
    return {
      backgroundColor: `color-mix(in srgb, ${rgb} 16%, white)`,
      borderColor: `color-mix(in srgb, ${rgb} 32%, rgb(226 232 240))`
    };
  }
  return {
    backgroundColor: `color-mix(in srgb, ${rgb} 8%, rgb(248 250 252))`,
    borderColor: `color-mix(in srgb, ${rgb} 22%, rgb(226 232 240))`
  };
}

export function columnAccentFooterStyle(rgb: string, prominentBackground = false): CSSProperties {
  if (prominentBackground) {
    return {
      borderTop: `1px solid color-mix(in srgb, ${rgb} 22%, rgb(241 245 249))`,
      backgroundColor: `color-mix(in srgb, ${rgb} 14%, rgb(248 250 252))`,
      color: `color-mix(in srgb, ${rgb} 38%, rgb(71 85 105))`
    };
  }
  return {
    borderTop: `1px solid color-mix(in srgb, ${rgb} 14%, rgb(241 245 249))`,
    backgroundColor: `color-mix(in srgb, ${rgb} 7%, rgb(248 250 252))`,
    color: `color-mix(in srgb, ${rgb} 32%, rgb(100 116 139))`
  };
}

export function columnAccentBackMainStyle(rgb: string, prominentBackground = false): CSSProperties {
  if (prominentBackground) {
    return {
      backgroundColor: `color-mix(in srgb, ${rgb} 24%, white)`,
      borderTop: `1px solid color-mix(in srgb, ${rgb} 28%, rgb(226 232 240))`
    };
  }
  return {
    backgroundColor: `color-mix(in srgb, ${rgb} 5%, white)`,
    borderTop: `1px solid color-mix(in srgb, ${rgb} 18%, rgb(226 232 240))`
  };
}
