import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BoardImage } from "../types/board";

type Props = {
  images: BoardImage[];
  onRankChange: (id: string, rank: number) => void;
  onReorderRanks: (orderedIds: string[]) => void;
};

type RowProps = {
  image: BoardImage;
  onRankChange: (id: string, rank: number) => void;
};

function SortableRow({ image, onRankChange }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: image.id });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
      className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <button
          className="cursor-grab rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600"
          {...attributes}
          {...listeners}
        >
          Drag
        </button>
        <span className="truncate text-xs text-slate-600">{image.title || "Untitled image"}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={1}
          max={10}
          value={image.rank}
          onChange={(e) => onRankChange(image.id, Number(e.target.value))}
          className="w-full"
        />
        <input
          type="number"
          min={1}
          max={10}
          value={image.rank}
          onChange={(e) => onRankChange(image.id, Number(e.target.value))}
          className="w-14 rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
      </div>
    </li>
  );
}

export function RankControls({ images, onRankChange, onReorderRanks }: Props) {
  const sensors = useSensors(useSensor(PointerSensor));
  const sorted = [...images].sort((a, b) => b.rank - a.rank || a.createdAt - b.createdAt);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex((i) => i.id === active.id);
    const newIndex = sorted.findIndex((i) => i.id === over.id);
    const moved = arrayMove(sorted, oldIndex, newIndex);
    onReorderRanks(moved.map((m) => m.id));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-soft backdrop-blur">
      <p className="mb-3 text-sm font-semibold text-slate-800">Ranking list</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sorted.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="max-h-[38vh] space-y-2 overflow-y-auto pr-1">
            {sorted.map((img) => (
              <SortableRow key={img.id} image={img} onRankChange={onRankChange} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
