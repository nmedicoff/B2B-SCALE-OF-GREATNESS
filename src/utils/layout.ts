import type { BoardImage, Point } from "../types/board";

const LANES = 6;
const LANE_WIDTH = 240;
const TOP_PADDING = 140;
const BOTTOM_PADDING = 260;
const VERTICAL_SPACING = 110;
const JITTER_X = 34;
const JITTER_Y = 14;

function hashToUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h +=
      (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return ((h >>> 0) % 1000) / 1000;
}

function clamp(num: number, min: number, max: number) {
  return Math.min(max, Math.max(min, num));
}

export function rankToY(
  rank: number,
  minRank: number,
  maxRank: number,
  totalRows: number
) {
  const clampedRank = clamp(rank, minRank, maxRank);
  const normalized =
    (clampedRank - minRank) / Math.max(1, maxRank - minRank);
  const inverted = 1 - normalized;
  return TOP_PADDING + inverted * (totalRows * VERTICAL_SPACING + BOTTOM_PADDING);
}

export function calculateRankLayout(
  images: BoardImage[],
  minRank: number,
  maxRank: number
): Record<string, Point> {
  const result: Record<string, Point> = {};
  const sorted = [...images].sort((a, b) => b.rank - a.rank || a.createdAt - b.createdAt);
  const byRank: Record<number, BoardImage[]> = {};

  for (const img of sorted) {
    if (!byRank[img.rank]) byRank[img.rank] = [];
    byRank[img.rank].push(img);
  }

  // Key idea: rank maps to a vertical "band" and each band distributes
  // items across horizontal lanes with deterministic jitter so the layout
  // feels organic but remains stable between rerenders.
  const totalRows = Math.max(8, images.length);
  const boardCenterX = (LANES * LANE_WIDTH) / 2;

  Object.entries(byRank).forEach(([rankKey, group]) => {
    const rank = Number(rankKey);
    const baseY = rankToY(rank, minRank, maxRank, totalRows);

    group.forEach((img, idx) => {
      const lane = idx % LANES;
      const rowOffset = Math.floor(idx / LANES);
      const seed = `${img.id}:${rank}:${idx}`;
      const randomX = (hashToUnit(seed) - 0.5) * JITTER_X * 2;
      const randomY = (hashToUnit(`${seed}:y`) - 0.5) * JITTER_Y * 2;

      const x = boardCenterX + (lane - (LANES - 1) / 2) * LANE_WIDTH + randomX;
      const y = baseY + rowOffset * 90 + randomY;

      result[img.id] = { x, y };
    });
  });

  return result;
}
