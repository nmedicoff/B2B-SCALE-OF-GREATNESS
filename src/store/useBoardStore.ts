import { create } from "zustand";
import type { BoardImage, BoardSnapshot, Point } from "../types/board";
import { calculateRankLayout } from "../utils/layout";

const STORAGE_KEY = "freeform-image-ranking-board";

type BoardState = {
  images: BoardImage[];
  rankMin: number;
  rankMax: number;
  selectedImageId: string | null;
  addImages: (files: File[]) => void;
  setImageRank: (id: string, rank: number) => void;
  setImageTitle: (id: string, title: string) => void;
  setImagePosition: (id: string, point: Point) => void;
  removeImage: (id: string) => void;
  selectImage: (id: string | null) => void;
  snapToRankLayout: () => void;
  resetLayout: () => void;
  reorderByRank: () => void;
  reorderRankList: (orderedIds: string[]) => void;
  save: () => void;
  load: () => void;
};

function clamp(num: number, min: number, max: number) {
  return Math.min(max, Math.max(min, num));
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
  rankMax: 10,
  selectedImageId: null,

  addImages: (files) => {
    void Promise.all(files.map((f) => createImageFromFile(f))).then((newImages) => {
      set((state) => {
        const merged = [...state.images, ...newImages];
        const layout = calculateRankLayout(merged, state.rankMin, state.rankMax);
        return {
          images: merged.map((img) => ({
            ...img,
            position: layout[img.id] ?? img.position
          }))
        };
      });
      get().save();
    });
  },

  setImageRank: (id, rank) => {
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
    set((state) => ({
      images: state.images.map((img) => (img.id === id ? { ...img, title } : img))
    }));
    get().save();
  },

  setImagePosition: (id, point) => {
    set((state) => ({
      images: state.images.map((img) => (img.id === id ? { ...img, position: point } : img))
    }));
    get().save();
  },

  removeImage: (id) => {
    set((state) => ({
      images: state.images.filter((img) => img.id !== id),
      selectedImageId: state.selectedImageId === id ? null : state.selectedImageId
    }));
    get().save();
  },

  selectImage: (id) => set({ selectedImageId: id }),

  snapToRankLayout: () => {
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

  reorderRankList: (orderedIds) => {
    set((state) => {
      const step = (state.rankMax - state.rankMin) / Math.max(1, orderedIds.length - 1);
      const next = state.images.map((img) => {
        const idx = orderedIds.indexOf(img.id);
        if (idx === -1) return img;
        const computed = Math.round(state.rankMax - step * idx);
        return { ...img, rank: clamp(computed, state.rankMin, state.rankMax) };
      });
      const layout = calculateRankLayout(next, state.rankMin, state.rankMax);
      return {
        images: next.map((img) => ({ ...img, position: layout[img.id] ?? img.position }))
      };
    });
    get().save();
  },

  save: () => {
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
      set({
        images: parsed.images,
        rankMin: parsed.rankScale?.min ?? 1,
        rankMax: parsed.rankScale?.max ?? 10
      });
    } catch {
      // Ignore invalid payload and continue with defaults.
    }
  }
}));
