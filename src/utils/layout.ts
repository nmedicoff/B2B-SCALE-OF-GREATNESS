import type { BoardImage, Point } from "../types/board";

/** Center of the 3600×3600 board — layouts anchor here. */
const BOARD_CENTER = { x: 1800, y: 1700 };

/** Card + floating stars; keep in sync with `BoardCanvas` / `ImageCard`. */
const BOARD_TILE_W = 190;
const BOARD_TILE_H = 236;
const TILE_GAP_Y = 28;
/** Horizontal gap between rank columns (1★ left … 7★ right). */
const RANK_COLUMN_GAP = 40;

function clamp(num: number, min: number, max: number) {
  return Math.min(max, Math.max(min, num));
}

const STEP_Y = BOARD_TILE_H + TILE_GAP_Y;
const RANK_COL_STEP = BOARD_TILE_W + RANK_COLUMN_GAP;

/** Matches `ImageCard` width + small gap for upload grid placement. */
const UPLOAD_GRID_STEP_X = 200;
/** Vertical step ≥ card + floating star strip so new rows do not overlap. */
const UPLOAD_GRID_STEP_Y = 248;
const UPLOAD_GRID_COLS = 4;

/**
 * Snap-to-rank layout: one column per star rating, left → right from lowest to highest rank
 * (e.g. 1★ on the left, 7★ on the right). Multiple images in the same rank stack top → bottom
 * with fixed spacing so tiles never overlap.
 */
export function calculateRankLayout(
  images: BoardImage[],
  minRank: number,
  maxRank: number
): Record<string, Point> {
  const result: Record<string, Point> = {};
  if (images.length === 0) return result;

  const byRank: Record<number, BoardImage[]> = {};
  for (const img of images) {
    const r = clamp(img.rank, minRank, maxRank);
    if (!byRank[r]) byRank[r] = [];
    byRank[r].push(img);
  }

  for (const key of Object.keys(byRank)) {
    byRank[Number(key)].sort((a, b) => a.createdAt - b.createdAt);
  }

  const nCols = maxRank - minRank + 1;

  let maxColHeight = 0;
  for (let rank = minRank; rank <= maxRank; rank += 1) {
    const group = byRank[rank];
    const k = group?.length ?? 0;
    const h = k > 0 ? (k - 1) * STEP_Y + BOARD_TILE_H : 0;
    maxColHeight = Math.max(maxColHeight, h);
  }

  const totalWidth = nCols * BOARD_TILE_W + Math.max(0, nCols - 1) * RANK_COLUMN_GAP;
  const startX = BOARD_CENTER.x - totalWidth / 2;
  const baseY = BOARD_CENTER.y - maxColHeight / 2;

  for (let rank = minRank; rank <= maxRank; rank += 1) {
    const group = byRank[rank];
    if (!group?.length) continue;
    const colIdx = rank - minRank;
    const x = startX + colIdx * RANK_COL_STEP;
    group.forEach((img, rowIdx) => {
      result[img.id] = { x, y: baseY + rowIdx * STEP_Y };
    });
  }

  return result;
}

/** Positions for newly added images only; keeps them grouped and visible near the board center. */
export function layoutNewUploads(newIds: string[]): Record<string, Point> {
  const result: Record<string, Point> = {};
  const n = newIds.length;
  if (n === 0) return result;

  const cols = Math.min(UPLOAD_GRID_COLS, n);
  const rows = Math.ceil(n / cols);
  const gridW = cols * UPLOAD_GRID_STEP_X;
  const gridH = rows * UPLOAD_GRID_STEP_Y;
  const originX = BOARD_CENTER.x - gridW / 2;
  const originY = BOARD_CENTER.y - gridH / 2;

  newIds.forEach((id, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    result[id] = {
      x: originX + col * UPLOAD_GRID_STEP_X,
      y: originY + row * UPLOAD_GRID_STEP_Y
    };
  });

  return result;
}

const SPREAD_GAP = 32;

/**
 * Non-overlapping grid centered on the board, ordered by rank (highest first) then upload time.
 */
export function layoutSpreadNoOverlap(images: BoardImage[]): Record<string, Point> {
  const result: Record<string, Point> = {};
  const n = images.length;
  if (n === 0) return result;

  const stepX = BOARD_TILE_W + SPREAD_GAP;
  const stepY = BOARD_TILE_H + SPREAD_GAP;
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  const rows = Math.ceil(n / cols);

  const sorted = [...images].sort((a, b) => b.rank - a.rank || a.createdAt - b.createdAt);

  const gridW = (cols - 1) * stepX + BOARD_TILE_W;
  const gridH = (rows - 1) * stepY + BOARD_TILE_H;
  const startX = BOARD_CENTER.x - gridW / 2;
  const startY = BOARD_CENTER.y - gridH / 2;

  sorted.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    result[img.id] = {
      x: startX + col * stepX,
      y: startY + row * stepY
    };
  });

  return result;
}
