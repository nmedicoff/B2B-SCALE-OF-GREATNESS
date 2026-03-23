import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Focus } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useBoardStore } from "../store/useBoardStore";
import { ImageCard } from "./ImageCard";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.2;
/** Allow zooming out further when framing all cards so wide boards still fit. */
const FIT_MIN_ZOOM = 0.06;
/** Match `ImageCard` footprint for bounds (star strip + card body). */
const CARD_W = 190;
const CARD_STACK_H = 236;

function clamp(num: number, min: number, max: number) {
  return Math.min(max, Math.max(min, num));
}

const DEFAULT_PAN = { x: 180, y: 140 };
const DEFAULT_ZOOM = 1;

export function BoardCanvas() {
  const { images, rankMin, rankMax, setImagePosition, setImageRank, removeImage } = useBoardStore(
    useShallow((s) => ({
      images: s.images,
      rankMin: s.rankMin,
      rankMax: s.rankMax,
      setImagePosition: s.setImagePosition,
      setImageRank: s.setImageRank,
      removeImage: s.removeImage
    }))
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState(DEFAULT_PAN);
  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const prevImageCountRef = useRef(images.length);

  useEffect(() => {
    if (images.length > prevImageCountRef.current) {
      setPan(DEFAULT_PAN);
      setZoom(DEFAULT_ZOOM);
    }
    prevImageCountRef.current = images.length;
  }, [images.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const wheelAccum = { x: 0, y: 0 };
    let wheelRaf = 0;

    const flushWheelPan = () => {
      wheelRaf = 0;
      const dx = wheelAccum.x;
      const dy = wheelAccum.y;
      wheelAccum.x = 0;
      wheelAccum.y = 0;
      if (dx === 0 && dy === 0) return;
      setPan((p) => ({ x: p.x - dx, y: p.y - dy }));
    };

    const normalizeDelta = (e: WheelEvent) => {
      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
        dx *= 16;
        dy *= 16;
      } else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
        dx *= el.clientWidth;
        dy *= el.clientHeight;
      }
      return { dx, dy };
    };

    const onWheel = (e: WheelEvent) => {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        setZoom((z) => clamp(z - e.deltaY * 0.0015, MIN_ZOOM, MAX_ZOOM));
        return;
      }
      e.preventDefault();
      const { dx, dy } = normalizeDelta(e);
      wheelAccum.x += dx;
      wheelAccum.y += dy;
      if (!wheelRaf) {
        wheelRaf = requestAnimationFrame(flushWheelPan);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(wheelRaf);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  const boardStyle = useMemo(
    () => ({
      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
      transformOrigin: "0 0"
    }),
    [pan.x, pan.y, zoom]
  );

  const fitImagesToView = useCallback(() => {
    const el = containerRef.current;
    if (!el || images.length === 0) return;

    const W = el.clientWidth;
    const H = el.clientHeight;
    const padding = 40;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const img of images) {
      minX = Math.min(minX, img.position.x);
      minY = Math.min(minY, img.position.y);
      maxX = Math.max(maxX, img.position.x + CARD_W);
      maxY = Math.max(maxY, img.position.y + CARD_STACK_H);
    }

    const cw = Math.max(maxX - minX, 1);
    const ch = Math.max(maxY - minY, 1);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const zoomX = (W - 2 * padding) / cw;
    const zoomY = (H - 2 * padding) / ch;
    const nextZoom = clamp(Math.min(zoomX, zoomY), FIT_MIN_ZOOM, MAX_ZOOM);

    setPan({ x: 1800 - nextZoom * cx, y: 1800 - nextZoom * cy });
    setZoom(nextZoom);
  }, [images]);

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
      onKeyDown={(e) => {
        if (e.code === "Space") setSpaceHeld(true);
      }}
      onKeyUp={(e) => {
        if (e.code === "Space") setSpaceHeld(false);
      }}
      tabIndex={0}
    >
      <div className="absolute left-4 top-4 z-50 flex max-w-[min(100%-2rem,20rem)] flex-col gap-2 rounded-xl bg-white/90 p-2 text-xs text-slate-600 shadow sm:max-w-none sm:flex-row sm:items-center sm:gap-3 sm:px-3 sm:py-2">
        <span className="shrink-0">
          Pan: two-finger scroll · Zoom: {(zoom * 100).toFixed(0)}% (ctrl/cmd + wheel or pinch)
        </span>
        <button
          type="button"
          disabled={images.length === 0}
          onClick={(e) => {
            e.stopPropagation();
            fitImagesToView();
          }}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
        >
          <Focus className="h-3.5 w-3.5" aria-hidden />
          Fit images to view
        </button>
      </div>
      <div className="absolute left-1/2 top-1/2 h-[3600px] w-[3600px] -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-full w-full" style={boardStyle}>
          {images.map((img) => (
            <ImageCard
              key={img.id}
              image={img}
              zoom={zoom}
              rankMin={rankMin}
              rankMax={rankMax}
              onDrag={setImagePosition}
              onRankChange={setImageRank}
              onDelete={removeImage}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
