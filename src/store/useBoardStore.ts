import { create } from "zustand";
import type { BoardImage, BoardSnapshot, Point } from "../types/board";
import { migrateLegacyDescription } from "../utils/parseCampaignDescription";
import { calculateRankLayout, layoutSpreadNoOverlap } from "../utils/layout";

export type CampaignFieldKey = "brand" | "campaign" | "date" | "category";

const STORAGE_KEY = "freeform-image-ranking-board";

type BoardState = {
  images: BoardImage[];
  rankMin: number;
  rankMax: number;
  addImages: (files: File[]) => void;
  setImageRank: (id: string, rank: number) => void;
  setImageTitle: (id: string, title: string) => void;
  setImageDescription: (id: string, description: string) => void;
  setImageCampaignField: (id: string, field: CampaignFieldKey, value: string) => void;
  setImagePosition: (id: string, point: Point) => void;
  removeImage: (id: string) => void;
  snapToRankLayout: () => void;
  resetLayout: () => void;
  reorderByRank: () => void;
  spreadImagesOut: () => void;
  save: () => void;
  load: () => void;
};

function clamp(num: number, min: number, max: number) {
  return Math.min(max, Math.max(min, num));
}

let positionSaveTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePositionPersist(get: () => { save: () => void }) {
  if (positionSaveTimer) clearTimeout(positionSaveTimer);
  positionSaveTimer = setTimeout(() => {
    positionSaveTimer = null;
    get().save();
  }, 400);
}

/** If a debounced position save was scheduled, run it now (avoids losing drags before other writes). */
function flushPositionPersist(get: () => { save: () => void }) {
  if (!positionSaveTimer) return;
  clearTimeout(positionSaveTimer);
  positionSaveTimer = null;
  get().save();
}

function createImageFromFile(file: File): Promise<BoardImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : "";
      if (!src) {
        reject(new Error("File could not be read"));
        return;
      }
      resolve({
        id: crypto.randomUUID(),
        src,
        title: file.name.replace(/\.[^/.]+$/, ""),
        description: "",
        rank: 5,
        position: { x: 0, y: 0 },
        createdAt: Date.now()
      });
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unknown file read error"));
    reader.readAsDataURL(file);
  });
}

function inferRankFromFilename(fileName: string, minRank: number, maxRank: number): number | null {
  // Assign "Picture N.*" files directly to rank N (clamped to current scale).
  const match = fileName.match(/^picture\s+(\d+)/i);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  return clamp(Math.round(n), minRank, maxRank);
}

function isCategoryPictureTitle(title: string): boolean {
  const match = title.match(/^Picture\s+(\d+)$/i);
  if (!match) return false;
  const n = Number(match[1]);
  return Number.isFinite(n) && n >= 1 && n <= 21;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  images: [],
  rankMin: 1,
  rankMax: 7,

  addImages: (files) => {
    void Promise.all(files.map((f) => createImageFromFile(f))).then((newImages) => {
      flushPositionPersist(get);
      set((state) => {
        const rankedNewImages = newImages.map((img, i) => {
          const inferred = inferRankFromFilename(files[i]?.name ?? "", state.rankMin, state.rankMax);
          return inferred ? { ...img, rank: inferred } : img;
        });
        const merged = [...state.images, ...rankedNewImages];
        const layout = calculateRankLayout(merged, state.rankMin, state.rankMax);
        return {
          images: merged.map((img) => ({ ...img, position: layout[img.id] ?? img.position }))
        };
      });
      get().save();
    });
  },

  setImageRank: (id, rank) => {
    flushPositionPersist(get);
    set((state) => {
      const next = state.images.map((img) =>
        img.id === id
          ? { ...img, rank: clamp(rank, state.rankMin, state.rankMax) }
          : img
      );
      const layout = calculateRankLayout(next, state.rankMin, state.rankMax);
      return {
        images: next.map((img) => ({ ...img, position: layout[img.id] ?? img.position }))
      };
    });
    get().save();
  },

  setImageTitle: (id, title) => {
    flushPositionPersist(get);
    set((state) => ({
      images: state.images.map((img) => (img.id === id ? { ...img, title } : img))
    }));
    get().save();
  },

  setImageDescription: (id, description) => {
    flushPositionPersist(get);
    set((state) => ({
      images: state.images.map((img) => (img.id === id ? { ...img, description } : img))
    }));
    get().save();
  },

  setImageCampaignField: (id, field, value) => {
    flushPositionPersist(get);
    const v = value.trim();
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, [field]: v || undefined } : img
      )
    }));
    get().save();
  },

  setImagePosition: (id, point) => {
    set((state) => ({
      images: state.images.map((img) => (img.id === id ? { ...img, position: point } : img))
    }));
    schedulePositionPersist(get);
  },

  removeImage: (id) => {
    flushPositionPersist(get);
    set((state) => ({
      images: state.images.filter((img) => img.id !== id)
    }));
    get().save();
  },

  snapToRankLayout: () => {
    flushPositionPersist(get);
    set((state) => {
      const layout = calculateRankLayout(state.images, state.rankMin, state.rankMax);
      return {
        images: state.images.map((img) => ({ ...img, position: layout[img.id] ?? img.position }))
      };
    });
    get().save();
  },

  resetLayout: () => {
    set((state) => ({
      images: state.images.map((img) => ({
        ...img,
        rank: 5
      }))
    }));
    get().snapToRankLayout();
  },

  reorderByRank: () => {
    set((state) => ({
      images: [...state.images].sort((a, b) => b.rank - a.rank || a.createdAt - b.createdAt)
    }));
  },

  spreadImagesOut: () => {
    flushPositionPersist(get);
    set((state) => {
      const layout = layoutSpreadNoOverlap(state.images);
      return {
        images: state.images.map((img) => ({
          ...img,
          position: layout[img.id] ?? img.position
        }))
      };
    });
    get().save();
  },

  save: () => {
    if (positionSaveTimer) {
      clearTimeout(positionSaveTimer);
      positionSaveTimer = null;
    }
    const { images, rankMin, rankMax } = get();
    const payload: BoardSnapshot = {
      images,
      rankScale: { min: rankMin, max: rankMax }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  },

  load: () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as BoardSnapshot;
      if (!Array.isArray(parsed.images)) return;
      const rankMin = 1;
      const rankMax = 7;
      const filtered = parsed.images.filter(
        (img) => !isCategoryPictureTitle(img.title ?? "") && clamp(img.rank ?? 5, rankMin, rankMax) !== 5
      );
      set({
        images: filtered.map((img) => {
          const base = {
            ...img,
            description: typeof img.description === "string" ? img.description : "",
            rank: clamp(img.rank ?? 5, rankMin, rankMax)
          };
          const m = migrateLegacyDescription(base as BoardImage);
          return {
            ...base,
            brand: m.brand,
            campaign: m.campaign,
            date: m.date,
            category: m.category,
            description: m.description
          };
        }),
        rankMin,
        rankMax
      });
    } catch {
      // Ignore invalid payload and continue with defaults.
    }
  }
}));
