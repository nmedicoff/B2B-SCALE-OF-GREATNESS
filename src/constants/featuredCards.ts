/** Default title for the second Damaging-column seed card (matches `Picture 2.png`). */
export const PICTURE_TWO_DEFAULT_TITLE = "Brand: Palo Alto Networks";

/** Earlier placeholder title (still matched for layout + migration from saved boards). */
export const PICTURE_TWO_LEGACY_TITLE = "Brand: (add brand)";

/** Back-of-card copy only (Brief / Approach). Front fields use structured props. */
export const PICTURE_TWO_DESCRIPTION =
  "Brief: How do we tell event attendees that we shine a light on illicit cyberactivity?\n\n" +
  "Approach: By dressing women up as lamps";

export const PICTURE_TWO_CAMPAIGN_FIELDS = {
  brand: "Palo Alto Networks",
  campaign: "CyberRisk Stunt",
  date: "2024",
  category: "Technology"
} as const;

/** Default title for the third Damaging-column seed card (matches `Picture 3.png`). */
export const PICTURE_THREE_DEFAULT_TITLE = "Brand: (add brand)";

export const PICTURE_THREE_DESCRIPTION =
  "Brief: (what were you trying to achieve?)\n\n" +
  "Approach: (how did you execute it?)";

export const PICTURE_THREE_PLACEHOLDER_FIELDS = {
  brand: "(Add brand)",
  campaign: "(Add campaign name)",
  date: "",
  category: ""
} as const;

/** 2. Invisible column — Pictures 4–6 share title + placeholder body until you edit. */
export const INVISIBLE_COLUMN_DEFAULT_TITLE = "Brand: (add brand)";

export const INVISIBLE_COLUMN_PLACEHOLDER_DESCRIPTION = PICTURE_THREE_DESCRIPTION;
