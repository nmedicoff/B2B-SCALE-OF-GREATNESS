import { create } from "zustand";
import type { BoardImage, BoardSnapshot, Point } from "../types/board";
import { calculateRankLayout, layoutNewUploads, layoutSpreadNoOverlap } from "../utils/layout";

const STORAGE_KEY = "freeform-image-ranking-board";

type BoardState = {
  images: BoardImage[];
  rankMin: number;
  rankMax: number;
  addImages: (files: File[]) => void;
  setImageRank: (id: string, rank: number) => void;
  setImageTitle: (id: string, title: string) => void;
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
        rank: 5,
        position: { x: 0, y: 0 },
        createdAt: Date.now()
      });
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unknown file read error"));
    reader.readAsDataURL(file);
  });
}

export const useBoardStore = create<BoardState>((set, get) => ({
  images: [],
  rankMin: 1,
  rankMax: 7,

  addImages: (files) => {
    void Promise.all(files.map((f) => createImageFromFile(f))).then((newImages) => {
      flushPositionPersist(get);
      set((state) => {
        const uploadLayout = layoutNewUploads(newImages.map((img) => img.id));
        const merged = [...state.images, ...newImages];
        return {
          images: merged.map((img) => {
            const p = uploadLayout[img.id];
            return p ? { ...img, position: p } : img;
          })
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
      set({
        images: parsed.images.map((img) => ({
          ...img,
          rank: clamp(img.rank ?? 5, rankMin, rankMax)
        })),
        rankMin,
        rankMax
      });
    } catch {
      // Ignore invalid payload and continue with defaults.
    }
  }
}));
