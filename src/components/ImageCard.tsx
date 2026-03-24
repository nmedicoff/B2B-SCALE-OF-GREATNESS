import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from "react";
import { Trash2 } from "lucide-react";
import pictureThree from "../../input/Picture 3.png";
import type { CampaignFieldKey } from "../store/useBoardStore";
import type { BoardImage } from "../types/board";
import {
  COLUMN_ACCENT_FALLBACK_RGB,
  columnAccentBackMainStyle,
  columnAccentFieldsSectionStyle,
  columnAccentFooterStyle,
  columnAccentImageWellStyle,
  columnAccentInnerPanelStyle,
  columnAccentShellStyle,
  getDominantColorCached
} from "../utils/dominantColor";
import {
  buildBriefApproachDescription,
  parseBriefAndApproach
} from "../utils/parseCampaignDescription";

type CardDims = {
  shell: string;
  imageWrap: string;
  imgClass: string;
};

function baseShellClass(d: CardDims) {
  return `flex w-full flex-col overflow-hidden rounded-2xl border ${d.shell}`;
}

type ColumnChrome = {
  shell: CSSProperties;
  imageWell: CSSProperties;
  fieldsSection: CSSProperties;
  innerPanel: CSSProperties;
  footer: CSSProperties;
  backMain: CSSProperties;
};

function chromeFromAccentRgb(rgb: string, prominentBackground: boolean): ColumnChrome {
  return {
    shell: columnAccentShellStyle(rgb, prominentBackground),
    imageWell: columnAccentImageWellStyle(rgb, prominentBackground),
    fieldsSection: columnAccentFieldsSectionStyle(rgb, prominentBackground),
    innerPanel: columnAccentInnerPanelStyle(rgb, prominentBackground),
    footer: columnAccentFooterStyle(rgb, prominentBackground),
    backMain: columnAccentBackMainStyle(rgb, prominentBackground)
  };
}

function useColumnChrome(headerSrc: string | undefined, prominentBackground: boolean): ColumnChrome {
  const [rgb, setRgb] = useState(COLUMN_ACCENT_FALLBACK_RGB);
  useEffect(() => {
    if (!headerSrc) return;
    let cancelled = false;
    getDominantColorCached(headerSrc).then((c) => {
      if (!cancelled) setRgb(c);
    });
    return () => {
      cancelled = true;
    };
  }, [headerSrc]);
  return useMemo(
    () => chromeFromAccentRgb(rgb, prominentBackground),
    [rgb, prominentBackground]
  );
}

const textFieldClass =
  "box-border w-full resize-y overflow-y-auto rounded-md border border-slate-200 bg-white py-1 pl-1.5 pr-1.5 text-[9px] leading-[1.35] text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200 disabled:cursor-default disabled:bg-slate-100 disabled:text-slate-500";

/** Grows with content so all text stays visible (capped height, then scrolls inside). */
function AutoGrowTextarea({
  id,
  value,
  disabled,
  placeholder,
  onChange,
  minHeightPx,
  maxHeightPx,
  className
}: {
  id: string;
  value: string;
  disabled: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  minHeightPx: number;
  maxHeightPx: number;
  className: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const sh = el.scrollHeight;
    const h = Math.min(Math.max(sh, minHeightPx), maxHeightPx);
    el.style.height = `${h}px`;
  }, [value, minHeightPx, maxHeightPx]);

  return (
    <textarea
      ref={ref}
      id={id}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      className={className}
      autoComplete="off"
    />
  );
}

function LabeledGrowField({
  id,
  label,
  value,
  disabled,
  placeholder,
  onChange,
  maxHeightPx
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  maxHeightPx: number;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-0.5 block text-[8px] font-semibold uppercase tracking-wide text-slate-500"
      >
        {label}
      </label>
      <AutoGrowTextarea
        id={id}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={onChange}
        minHeightPx={32}
        maxHeightPx={maxHeightPx}
        className={`${textFieldClass} min-h-[2rem]`}
      />
    </div>
  );
}

function CardFrontInner({
  dims,
  chrome,
  image,
  imageTitle,
  layout,
  brand,
  campaign,
  date,
  category,
  imageId,
  onCampaignFieldChange
}: {
  dims: CardDims;
  chrome: ColumnChrome;
  image: BoardImage;
  imageTitle: string;
  layout: "ghost" | "face";
  brand: string;
  campaign: string;
  date: string;
  category: string;
  imageId: string;
  onCampaignFieldChange: (id: string, field: CampaignFieldKey, value: string) => void;
}) {
  const stretch = layout === "face" ? "h-full min-h-0 flex flex-col" : "";
  const disabled = layout === "ghost";

  return (
    <div className={`${baseShellClass(dims)} ${stretch}`} style={chrome.shell}>
      <div
        className={`flex shrink-0 items-center justify-center ${dims.imageWrap}`}
        style={chrome.imageWell}
      >
        <img
          src={image.src}
          alt={imageTitle}
          className={`h-auto w-auto object-contain ${dims.imgClass}`}
          draggable={false}
        />
      </div>
      <div
        className={
          layout === "face"
            ? "min-h-0 flex-1 overflow-y-auto px-2.5 pb-2 pt-2"
            : "min-h-0 shrink-0 px-2.5 pb-2 pt-2"
        }
        style={chrome.fieldsSection}
      >
        <div
          className="space-y-2 rounded-lg border px-2.5 py-2 shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.6)]"
          style={chrome.innerPanel}
        >
          <LabeledGrowField
            id={`${imageId}-brand`}
            label="Brand"
            value={brand}
            disabled={disabled}
            placeholder="Brand"
            maxHeightPx={400}
            onChange={(v) => onCampaignFieldChange(imageId, "brand", v)}
          />
          <LabeledGrowField
            id={`${imageId}-campaign`}
            label="Campaign"
            value={campaign}
            disabled={disabled}
            placeholder="Campaign"
            maxHeightPx={720}
            onChange={(v) => onCampaignFieldChange(imageId, "campaign", v)}
          />
          <LabeledGrowField
            id={`${imageId}-date`}
            label="Date"
            value={date}
            disabled={disabled}
            placeholder="Year or date"
            maxHeightPx={200}
            onChange={(v) => onCampaignFieldChange(imageId, "date", v)}
          />
          <LabeledGrowField
            id={`${imageId}-industry`}
            label="Industry"
            value={category}
            disabled={disabled}
            placeholder="Industry"
            maxHeightPx={400}
            onChange={(v) => onCampaignFieldChange(imageId, "category", v)}
          />
        </div>
      </div>
      <p
        className="pointer-events-none shrink-0 px-2 py-1 text-center text-[8px] leading-tight"
        style={chrome.footer}
      >
        Hover for brief & approach
      </p>
    </div>
  );
}

const backTextareaClass =
  "w-full resize-y overflow-y-auto rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[9px] leading-[1.35] text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200 disabled:cursor-default disabled:bg-slate-100 disabled:text-slate-500";

function CardBackInner({
  dims,
  chrome,
  layout,
  brief,
  approach,
  imageId,
  onBriefChange,
  onApproachChange
}: {
  dims: CardDims;
  chrome: ColumnChrome;
  layout: "ghost" | "face";
  brief: string;
  approach: string;
  imageId: string;
  onBriefChange: (id: string, value: string) => void;
  onApproachChange: (id: string, value: string) => void;
}) {
  const stretch = layout === "face" ? "h-full min-h-0 flex flex-col" : "";
  const disabled = layout === "ghost";

  return (
    <div className={`${baseShellClass(dims)} ${stretch}`} style={chrome.shell}>
      <div
        className={`shrink-0 px-3 pb-2 pt-2.5 ${layout === "face" ? "min-h-0 flex-1 overflow-y-auto" : ""}`}
        style={chrome.backMain}
      >
        <div className="space-y-2">
          <div>
            <label
              htmlFor={`${imageId}-brief`}
              className="mb-0.5 block text-[8px] font-semibold uppercase tracking-wide text-slate-500"
            >
              Brief
            </label>
            <AutoGrowTextarea
              id={`${imageId}-brief`}
              value={brief}
              disabled={disabled}
              placeholder="Brief"
              onChange={(v) => onBriefChange(imageId, v)}
              minHeightPx={72}
              maxHeightPx={560}
              className={`${backTextareaClass} min-h-[4.5rem]`}
            />
          </div>
          <div>
            <label
              htmlFor={`${imageId}-approach`}
              className="mb-0.5 block text-[8px] font-semibold uppercase tracking-wide text-slate-500"
            >
              Approach
            </label>
            <AutoGrowTextarea
              id={`${imageId}-approach`}
              value={approach}
              disabled={disabled}
              placeholder="Approach"
              onChange={(v) => onApproachChange(imageId, v)}
              minHeightPx={72}
              maxHeightPx={560}
              className={`${backTextareaClass} min-h-[4.5rem]`}
            />
          </div>
        </div>
      </div>
      <p
        className="pointer-events-none shrink-0 px-2 py-1 text-center text-[8px] leading-tight"
        style={chrome.footer}
      >
        Hover to see image
      </p>
    </div>
  );
}

type Props = {
  image: BoardImage;
  columnHeaderSrc?: string;
  /** Column 1 (1. Damaging): strong background tint from header dominant colour. */
  prominentColumnBackground?: boolean;
  onDelete: (id: string) => void;
  onDescriptionChange: (id: string, description: string) => void;
  onCampaignFieldChange: (id: string, field: CampaignFieldKey, value: string) => void;
};

const faceBase =
  "absolute inset-0 flex h-full w-full flex-col [backface-visibility:hidden]";

function ImageCardInner({
  image,
  columnHeaderSrc,
  prominentColumnBackground = false,
  onDelete,
  onDescriptionChange,
  onCampaignFieldChange
}: Props) {
  const isPictureThreeAsset = image.src === pictureThree;
  const chrome = useColumnChrome(columnHeaderSrc, prominentColumnBackground);

  const [frontFocused, setFrontFocused] = useState(false);
  const [backFocused, setBackFocused] = useState(false);

  const description = image.description ?? "";
  const { brief, approach } = useMemo(() => parseBriefAndApproach(description), [description]);

  const brand = image.brand ?? "";
  const campaign = image.campaign ?? "";
  const date = image.date ?? "";
  const category = image.category ?? "";

  const handleBriefChange = useCallback(
    (id: string, value: string) => {
      onDescriptionChange(id, buildBriefApproachDescription(value, approach));
    },
    [onDescriptionChange, approach]
  );

  const handleApproachChange = useCallback(
    (id: string, value: string) => {
      onDescriptionChange(id, buildBriefApproachDescription(brief, value));
    },
    [onDescriptionChange, brief]
  );

  const suppressHover = frontFocused || backFocused;
  const hoverFlipClass = suppressHover ? "" : "group-hover/card:[transform:rotateY(180deg)]";

  let flipStyle: CSSProperties | undefined;
  if (frontFocused) flipStyle = { transform: "rotateY(0deg)" };
  else if (backFocused) flipStyle = { transform: "rotateY(180deg)" };

  const dims: CardDims = useMemo(() => {
    const imgClass = isPictureThreeAsset
      ? "max-h-full max-w-full origin-center scale-[1.22] rounded-t-xl"
      : "max-h-full max-w-full scale-[1.14] rounded-t-xl";
    return {
      shell: "w-full min-w-0",
      imageWrap: "aspect-[16/9] w-full min-w-0",
      imgClass
    };
  }, [isPictureThreeAsset]);

  const ghostLay = "col-start-1 row-start-1 w-full";

  return (
    <div className="group/card relative inline-grid w-full min-w-0 justify-items-stretch">
      <button
        type="button"
        aria-label={`Remove ${image.title || "image"}`}
        onClick={() => onDelete(image.id)}
        className="absolute right-1.5 top-1.5 z-20 rounded-md bg-black/55 p-1.5 text-white opacity-0 shadow-md transition-opacity duration-150 hover:bg-black/70 group-hover/card:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:ring-2 focus-visible:ring-white/80"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>

      <div className={`${ghostLay} pointer-events-none -z-10 select-none opacity-0`} aria-hidden>
        <CardFrontInner
          dims={dims}
          chrome={chrome}
          image={image}
          imageTitle={image.title || "Uploaded"}
          layout="ghost"
          brand={brand}
          campaign={campaign}
          date={date}
          category={category}
          imageId={image.id}
          onCampaignFieldChange={onCampaignFieldChange}
        />
      </div>
      <div className={`${ghostLay} pointer-events-none -z-10 select-none opacity-0`} aria-hidden>
        <CardBackInner
          dims={dims}
          chrome={chrome}
          layout="ghost"
          brief={brief}
          approach={approach}
          imageId={image.id}
          onBriefChange={handleBriefChange}
          onApproachChange={handleApproachChange}
        />
      </div>

      <div className={`${ghostLay} min-h-0 [perspective:1400px]`}>
        <div
          className={`relative min-h-0 h-full w-full transition-transform duration-500 ease-out [transform-style:preserve-3d] ${hoverFlipClass}`}
          style={flipStyle}
        >
          <div
            className={`${faceBase}`}
            onFocusCapture={() => setFrontFocused(true)}
            onBlurCapture={(e) => {
              const next = e.relatedTarget;
              if (next instanceof Node && e.currentTarget.contains(next)) return;
              setFrontFocused(false);
            }}
          >
            <CardFrontInner
              dims={dims}
              chrome={chrome}
              image={image}
              imageTitle={image.title || "Uploaded"}
              layout="face"
              brand={brand}
              campaign={campaign}
              date={date}
              category={category}
              imageId={image.id}
              onCampaignFieldChange={onCampaignFieldChange}
            />
          </div>
          <div
            className={`${faceBase} [transform:rotateY(180deg)]`}
            onFocusCapture={() => setBackFocused(true)}
            onBlurCapture={(e) => {
              const next = e.relatedTarget;
              if (next instanceof Node && e.currentTarget.contains(next)) return;
              setBackFocused(false);
            }}
          >
            <CardBackInner
              dims={dims}
              chrome={chrome}
              layout="face"
              brief={brief}
              approach={approach}
              imageId={image.id}
              onBriefChange={handleBriefChange}
              onApproachChange={handleApproachChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function propsEqual(prev: Props, next: Props) {
  return (
    prev.image === next.image &&
    prev.columnHeaderSrc === next.columnHeaderSrc &&
    prev.prominentColumnBackground === next.prominentColumnBackground &&
    prev.onDelete === next.onDelete &&
    prev.onDescriptionChange === next.onDescriptionChange &&
    prev.onCampaignFieldChange === next.onCampaignFieldChange
  );
}

export const ImageCard = memo(ImageCardInner, propsEqual);
