/** Parser for stored campaign description (Brief & Approach only, or legacy combined blocks). */

const BACK_ORDER = ["brief", "approach"] as const;

type Section = { key: string; label: string; body: string };

function normalizeLabelKey(label: string): string {
  return label.toLowerCase().trim();
}

function parseLabeledChunks(raw: string): Map<string, Section> {
  const byKey = new Map<string, Section>();
  const chunks = raw.trim().split(/\n\s*\n+/).filter(Boolean);
  for (const chunk of chunks) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const first = lines[0];
    const colon = first.indexOf(":");
    if (colon > 0) {
      const label = first.slice(0, colon).trim();
      const firstRest = first.slice(colon + 1).trim();
      const body = [firstRest, ...lines.slice(1)].filter(Boolean).join(" ");
      const key = normalizeLabelKey(label);
      byKey.set(key, { key, label, body });
    }
  }
  return byKey;
}

/** Extract Brief / Approach bodies for split editors (back of card). */
export function parseBriefAndApproach(text: string): { brief: string; approach: string } {
  const byKey = parseLabeledChunks(text ?? "");
  return {
    brief: byKey.get("brief")?.body ?? "",
    approach: byKey.get("approach")?.body ?? ""
  };
}

/** Serialize Brief + Approach for stored `description`. */
export function buildBriefApproachDescription(brief: string, approach: string): string {
  const b = brief.trim();
  const a = approach.trim();
  const parts: string[] = [];
  if (b) parts.push(`Brief: ${b}`);
  if (a) parts.push(`Approach: ${a}`);
  return parts.join("\n\n");
}

export function parseBackSections(text: string): Section[] {
  const raw = text.trim();
  if (!raw) return [];

  const byKey = parseLabeledChunks(raw);
  const FRONT_KEYS = new Set(["brand", "campaign", "date", "category"]);
  const backOrdered = BACK_ORDER.map((k) => byKey.get(k)).filter((s): s is Section => s != null);
  const remaining: Section[] = [];
  for (const [, sec] of byKey) {
    if (!FRONT_KEYS.has(sec.key) && !BACK_ORDER.includes(sec.key as (typeof BACK_ORDER)[number])) {
      remaining.push(sec);
    }
  }
  return [...backOrdered, ...remaining];
}

/** Legacy combined text → structured fields + Brief/Approach-only description. Idempotent when already migrated. */
export function migrateLegacyDescription(img: {
  description?: string;
  brand?: string;
  campaign?: string;
  date?: string;
  category?: string;
  industry?: string;
}): {
  brand?: string;
  campaign?: string;
  date?: string;
  category?: string;
  description: string;
} {
  const raw = img.description ?? "";
  const byKey = parseLabeledChunks(raw);

  const brand = byKey.get("brand")?.body ?? img.brand;
  const campaign = byKey.get("campaign")?.body ?? img.campaign;
  const date = byKey.get("date")?.body ?? img.date;
  const category = byKey.get("category")?.body ?? img.category ?? img.industry;

  const brief = byKey.get("brief");
  const approach = byKey.get("approach");
  const parts: string[] = [];
  if (brief?.body) parts.push(`Brief: ${brief.body}`);
  if (approach?.body) parts.push(`Approach: ${approach.body}`);
  const description = parts.join("\n\n");

  return {
    brand: brand?.trim() || undefined,
    campaign: campaign?.trim() || undefined,
    date: date?.trim() || undefined,
    category: category?.trim() || undefined,
    description
  };
}
