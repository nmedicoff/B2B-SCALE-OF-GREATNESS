import type { PointerEvent as ReactPointerEvent } from "react";
import type { BoardImage, Point } from "../types/board";

type Props = {
  image: BoardImage;
  zoom: number;
  onDrag: (id: string, pos: Point) => void;
  onClick: (id: string) => void;
};

export function ImageCard({ image, zoom, onDrag, onClick }: Props) {
  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const initial = image.position;

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;
      onDrag(image.id, { x: initial.x + dx, y: initial.y + dy });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={startDrag}
      onClick={() => onClick(image.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick(image.id);
      }}
      className="group absolute w-[190px] cursor-grab overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft transition-all duration-300 active:cursor-grabbing"
      style={{
        transform: `translate(${image.position.x}px, ${image.position.y}px)`,
        willChange: "transform"
      }}
    >
      <img src={image.src} alt={image.title || "Uploaded"} className="h-[130px] w-full object-cover" />
      <div className="p-2">
        <p className="truncate text-sm font-medium text-slate-900">{image.title || "Untitled image"}</p>
        <p className="text-xs text-slate-500">Rank: {image.rank}</p>
      </div>
    </div>
  );
}
