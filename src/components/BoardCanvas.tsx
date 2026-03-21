import { useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { BoardImage } from "../types/board";
import { ImageCard } from "./ImageCard";

type Props = {
  images: BoardImage[];
  onMoveImage: (id: string, pos: { x: number; y: number }) => void;
  onSelectImage: (id: string) => void;
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.2;

function clamp(num: number, min: number, max: number) {
  return Math.min(max, Math.max(min, num));
}

export function BoardCanvas({ images, onMoveImage, onSelectImage }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 180, y: 140 });
  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);

  const boardStyle = useMemo(
    () => ({
      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
      transformOrigin: "0 0"
    }),
    [pan.x, pan.y, zoom]
  );

  const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!spaceHeld && event.button !== 1) return;
    event.preventDefault();
    setIsPanning(true);
    const startX = event.clientX;
    const startY = event.clientY;
    const startPanPos = pan;

    const onMove = (ev: PointerEvent) => {
      setPan({
        x: startPanPos.x + (ev.clientX - startX),
        y: startPanPos.y + (ev.clientY - startY)
      });
    };

    const onUp = () => {
      setIsPanning(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  return (
    <div
      ref={containerRef}
      className={`freeform-grid relative h-[calc(100vh-220px)] overflow-hidden rounded-2xl border border-slate-200 ${
        isPanning ? "cursor-grabbing" : "cursor-default"
      }`}
      onPointerDown={startPan}
      onWheel={(e) => {
        if (!e.metaKey && !e.ctrlKey) return;
        e.preventDefault();
        setZoom((z) => clamp(z - e.deltaY * 0.0015, MIN_ZOOM, MAX_ZOOM));
      }}
      onKeyDown={(e) => {
        if (e.code === "Space") setSpaceHeld(true);
      }}
      onKeyUp={(e) => {
        if (e.code === "Space") setSpaceHeld(false);
      }}
      tabIndex={0}
    >
      <div className="absolute left-4 top-4 z-50 rounded-xl bg-white/90 px-3 py-2 text-xs text-slate-600 shadow">
        Zoom: {(zoom * 100).toFixed(0)}% (pinch trackpad or ctrl/cmd + wheel)
      </div>
      <div className="absolute left-1/2 top-1/2 h-[3600px] w-[3600px] -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-full w-full transition-transform duration-300" style={boardStyle}>
          {images.map((img) => (
            <ImageCard
              key={img.id}
              image={img}
              zoom={zoom}
              onDrag={onMoveImage}
              onClick={onSelectImage}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
