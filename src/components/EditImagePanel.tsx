import type { BoardImage } from "../types/board";

type Props = {
  image: BoardImage | null;
  onClose: () => void;
  onRankChange: (id: string, rank: number) => void;
  onTitleChange: (id: string, title: string) => void;
  onDelete: (id: string) => void;
};

export function EditImagePanel({ image, onClose, onRankChange, onTitleChange, onDelete }: Props) {
  if (!image) return null;
  return (
    <aside className="absolute right-5 top-20 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Edit image</h3>
        <button className="text-sm text-slate-500 hover:text-slate-800" onClick={onClose}>
          Close
        </button>
      </div>
      <label className="mb-2 block text-xs font-medium text-slate-600">Title</label>
      <input
        value={image.title}
        onChange={(e) => onTitleChange(image.id, e.target.value)}
        className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <label className="mb-2 block text-xs font-medium text-slate-600">Rank</label>
      <input
        type="range"
        min={1}
        max={10}
        value={image.rank}
        onChange={(e) => onRankChange(image.id, Number(e.target.value))}
        className="mb-2 w-full"
      />
      <input
        type="number"
        min={1}
        max={10}
        value={image.rank}
        onChange={(e) => onRankChange(image.id, Number(e.target.value))}
        className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <button
        onClick={() => onDelete(image.id)}
        className="w-full rounded-lg bg-rose-500 px-3 py-2 text-sm font-medium text-white hover:bg-rose-600"
      >
        Delete image
      </button>
    </aside>
  );
}
