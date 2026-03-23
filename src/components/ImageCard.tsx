import { memo } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Star, Trash2 } from "lucide-react";
import type { BoardImage, Point } from "../types/board";

const DRAG_THRESHOLD_PX = 6;

type Props = {
  image: BoardImage;
  zoom: number;
  rankMin: number;
  rankMax: number;
  onDrag: (id: string, pos: Point) => void;
  onRankChange: (id: string, rank: number) => void;
  onDelete: (id: string) => void;
};

function ImageCardInner({ image, zoom, rankMin, rankMax, onDrag, onRankChange, onDelete }: Props) {
  const startBodyPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const initial = image.position;
    let dragged = false;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragged) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        dragged = true;
      }
      onDrag(image.id, {
        x: initial.x + dx / zoom,
        y: initial.y + dy / zoom
      });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  const stars = Array.from({ length: rankMax - rankMin + 1 }, (_, i) => rankMin + i);

  return (
    <div
      className="group absolute w-[190px]"
      style={{
        transform: `translate(${image.position.x}px, ${image.position.y}px)`,
        willChange: "transform",
        zIndex: 1
      }}
    >
      <div
        className="relative z-20 mb-0.5 flex justify-center"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-center gap-px"
          role="group"
          aria-label={`Rating for ${image.title || "image"}`}
        >
          {stars.map((n) => {
            const active = n <= image.rank;
            return (
              <button
                key={n}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRankChange(image.id, n);
                }}
                aria-label={`Rate ${n} of ${rankMax}`}
                aria-pressed={active}
                className="rounded p-px outline-none transition-transform duration-150 hover:scale-110 focus-visible:ring-2 focus-visible:ring-sky-400/90 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                <Star
                  className={
                    active
                      ? "h-[18px] w-[18px] fill-white text-white [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.92))_drop-shadow(0_0_5px_rgba(0,0,0,0.5))]"
                      : "h-[18px] w-[18px] fill-slate-500/55 text-slate-500 [filter:drop-shadow(0_0_1px_rgba(255,255,255,0.95))_drop-shadow(0_1px_3px_rgba(0,0,0,0.8))]"
                  }
                  strokeWidth={active ? 0 : 1.1}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div
        onPointerDown={startBodyPointer}
        className="relative cursor-grab overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft active:cursor-grabbing"
      >
        <button
          type="button"
          aria-label={`Remove ${image.title || "image"}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(image.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-1.5 top-1.5 z-10 rounded-md bg-black/55 p-1.5 text-white opacity-0 shadow-md transition-opacity duration-150 hover:bg-black/70 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:ring-2 focus-visible:ring-white/80"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
        <img src={image.src} alt={image.title || "Uploaded"} className="h-[130px] w-full object-cover" draggable={false} />
        <div className="p-2">
          <p className="truncate text-sm font-medium text-slate-900">{image.title || "Untitled image"}</p>
        </div>
      </div>
    </div>
  );
}

function propsEqual(prev: Props, next: Props) {
  return (
    prev.image === next.image &&
    prev.zoom === next.zoom &&
    prev.rankMin === next.rankMin &&
    prev.rankMax === next.rankMax &&
    prev.onDrag === next.onDrag &&
    prev.onRankChange === next.onRankChange &&
    prev.onDelete === next.onDelete
  );
}

export const ImageCard = memo(ImageCardInner, propsEqual);
