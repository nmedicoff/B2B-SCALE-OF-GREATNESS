import { useEffect } from "react";
import { LayoutGrid, RefreshCcw, Sparkles, SortDesc } from "lucide-react";
import { BoardCanvas } from "./components/BoardCanvas";
import { ImageUploader } from "./components/ImageUploader";
import { useShallow } from "zustand/react/shallow";
import { useBoardStore } from "./store/useBoardStore";

export default function App() {
  const imageCount = useBoardStore((s) => s.images.length);
  const { addImages, snapToRankLayout, resetLayout, reorderByRank, spreadImagesOut, load } =
    useBoardStore(
      useShallow((s) => ({
        addImages: s.addImages,
        snapToRankLayout: s.snapToRankLayout,
        resetLayout: s.resetLayout,
        reorderByRank: s.reorderByRank,
        spreadImagesOut: s.spreadImagesOut,
        load: s.load
      }))
    );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const persist = () => {
      useBoardStore.getState().save();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") persist();
    };
    window.addEventListener("beforeunload", persist);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", persist);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-5">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Image Ranking Board</h1>
              <p className="text-sm text-slate-500">
                Freeform-style board with automatic rank-based layout.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={reorderByRank}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <SortDesc className="h-4 w-4" />
                Sort By Rank
              </button>
              <button
                type="button"
                onClick={spreadImagesOut}
                disabled={imageCount === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
              >
                <LayoutGrid className="h-4 w-4" />
                Spread out (no overlap)
              </button>
              <button
                onClick={snapToRankLayout}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
              >
                <Sparkles className="h-4 w-4" />
                Snap To Rank Layout
              </button>
              <button
                onClick={resetLayout}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset Layout
              </button>
            </div>
          </div>
          <ImageUploader onFiles={addImages} />
        </header>

        <BoardCanvas />
      </div>
    </main>
  );
}
