import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { FILTER_INDUSTRY_OPTIONS } from "../constants/industries";
import type { BoardImage } from "../types/board";
import { SPECTRUM_LABELS, SPECTRUM_SCALE } from "../constants/spectrum";
import { useBoardStore } from "../store/useBoardStore";
import { ImageCard } from "./ImageCard";
import { getDominantColorCached } from "../utils/dominantColor";
import damagingHeader from "../../input/VISUAL CARDS/1. Damaging .png";
import invisibleHeader from "../../input/VISUAL CARDS/2. Invisible .png";
import noticedHeader from "../../input/VISUAL CARDS/3. Noticed.png";
import provocativeHeader from "../../input/VISUAL CARDS/4. Provocative.png";
import invitingHeader from "../../input/VISUAL CARDS/5. Inviting.png";
import enduringHeader from "../../input/VISUAL CARDS/6. Enduring.png";
import transformativeHeader from "../../input/VISUAL CARDS/7. Transformative.png";

const inputImageModules = import.meta.glob("../input/**/*.{png,jpg,jpeg,webp,gif}", {
  eager: true,
  query: "?url",
  import: "default"
}) as Record<string, string>;

function buildHeaderVisualMap(): Record<number, string> {
  const result: Record<number, string> = {};
  for (const [path, src] of Object.entries(inputImageModules)) {
    if (!path.includes("/VISUAL CARDS/")) continue;
    const name = path.split("/").pop() ?? "";
    const match = name.match(/^\s*([1-7])\s*\.\s*/);
    if (!match) continue;
    const rank = Number(match[1]);
    result[rank] = src;
  }
  return result;
}

const headerVisualByRank = buildHeaderVisualMap();
headerVisualByRank[1] = damagingHeader;
headerVisualByRank[2] = invisibleHeader;
headerVisualByRank[3] = noticedHeader;
headerVisualByRank[4] = provocativeHeader;
headerVisualByRank[5] = invitingHeader;
headerVisualByRank[6] = enduringHeader;
headerVisualByRank[7] = transformativeHeader;

type FilterDimension = "industry" | "date" | "brand";

const selectClass =
  "min-w-0 max-w-[min(100%,220px)] cursor-pointer rounded-lg border border-slate-300 bg-white py-1.5 pl-2 pr-8 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:max-w-xs";

function uniqueSorted(values: Iterable<string>): string[] {
  const set = new Set<string>();
  for (const v of values) {
    const t = v.trim();
    if (t) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function imageMatchesFilter(
  img: BoardImage,
  dimension: FilterDimension,
  value: string | "all"
): boolean {
  if (value === "all") return true;
  if (dimension === "industry") return (img.category ?? "").trim() === value;
  if (dimension === "date") return (img.date ?? "").trim() === value;
  return (img.brand ?? "").trim() === value;
}

export function BoardCanvas() {
  const [filterDimension, setFilterDimension] = useState<FilterDimension>("industry");
  const [filterValue, setFilterValue] = useState<string | "all">("all");

  useEffect(() => {
    void getDominantColorCached(damagingHeader);
  }, []);

  const { images, rankMin, rankMax, removeImage, setImageDescription, setImageCampaignField } =
    useBoardStore(
      useShallow((s) => ({
        images: s.images,
        rankMin: s.rankMin,
        rankMax: s.rankMax,
        removeImage: s.removeImage,
        setImageDescription: s.setImageDescription,
        setImageCampaignField: s.setImageCampaignField
      }))
    );

  const rankMap: Record<number, typeof images> = {};
  for (const n of SPECTRUM_SCALE) rankMap[n] = [];
  for (const img of images) {
    const rank = Math.max(rankMin, Math.min(rankMax, img.rank));
    if (!rankMap[rank]) rankMap[rank] = [];
    rankMap[rank].push(img);
  }
  for (const n of SPECTRUM_SCALE) {
    rankMap[n].sort((a, b) => a.createdAt - b.createdAt);
  }

  const dateOptions = useMemo(
    () => uniqueSorted(images.map((img) => img.date ?? "")),
    [images]
  );
  const brandOptions = useMemo(
    () => uniqueSorted(images.map((img) => img.brand ?? "")),
    [images]
  );

  const visibleInRank = (rank: number) => {
    const list = rankMap[rank];
    return list.filter((img) => imageMatchesFilter(img, filterDimension, filterValue));
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <h2 className="text-sm font-semibold text-slate-900">7 Point Scale</h2>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-2 gap-y-1.5 sm:flex-initial">
          <span className="shrink-0 text-sm text-slate-600">Filter by</span>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <label htmlFor="board-filter-dimension" className="sr-only">
              Filter field
            </label>
            <select
              id="board-filter-dimension"
              value={filterDimension}
              onChange={(e) => {
                setFilterDimension(e.target.value as FilterDimension);
                setFilterValue("all");
              }}
              className={selectClass}
            >
              <option value="industry">Industry</option>
              <option value="date">Date</option>
              <option value="brand">Brand</option>
            </select>
            {filterDimension === "industry" ? (
              <>
                <span className="text-slate-300" aria-hidden>
                  /
                </span>
                <label htmlFor="board-filter-industry-value" className="sr-only">
                  Industry category
                </label>
                <select
                  id="board-filter-industry-value"
                  value={filterValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilterValue(v === "all" ? "all" : v);
                  }}
                  className={selectClass}
                >
                  <option value="all">All industries</option>
                  {FILTER_INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            {filterDimension === "date" ? (
              <>
                <span className="text-slate-300" aria-hidden>
                  /
                </span>
                <label htmlFor="board-filter-date-value" className="sr-only">
                  Date
                </label>
                <select
                  id="board-filter-date-value"
                  value={filterValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilterValue(v === "all" ? "all" : v);
                  }}
                  className={selectClass}
                >
                  <option value="all">All dates</option>
                  {dateOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            {filterDimension === "brand" ? (
              <>
                <span className="text-slate-300" aria-hidden>
                  /
                </span>
                <label htmlFor="board-filter-brand-value" className="sr-only">
                  Brand
                </label>
                <select
                  id="board-filter-brand-value"
                  value={filterValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilterValue(v === "all" ? "all" : v);
                  }}
                  className={selectClass}
                >
                  <option value="all">All brands</option>
                  {brandOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[1200px] grid-cols-7 gap-4">
          {SPECTRUM_SCALE.map((n) => {
            const shown = visibleInRank(n);
            return (
              <div key={n} className="rounded-xl border border-slate-200 bg-slate-50/70">
                <div className="sticky top-0 z-10 rounded-t-xl border-b border-slate-200 bg-slate-100 px-3 py-2">
                  {headerVisualByRank[n] ? (
                    <div className="mb-2 h-32 w-full overflow-hidden rounded-md">
                      <img
                        src={headerVisualByRank[n]}
                        alt={`${n}. ${SPECTRUM_LABELS[n]}`}
                        className="h-full w-full scale-[1.12] rounded-md border-2 border-black object-cover object-center"
                      />
                    </div>
                  ) : null}
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                    {n}. {SPECTRUM_LABELS[n]}
                  </p>
                </div>
                <div className="flex min-h-[420px] flex-col items-stretch gap-3 p-3">
                  {shown.length === 0 ? (
                    <div className="mt-6 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-400">
                      No images
                    </div>
                  ) : (
                    shown.map((img) => (
                      <ImageCard
                        key={img.id}
                        image={img}
                        columnHeaderSrc={headerVisualByRank[n]}
                        prominentColumnBackground={n === 1}
                        onDelete={removeImage}
                        onDescriptionChange={setImageDescription}
                        onCampaignFieldChange={setImageCampaignField}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
