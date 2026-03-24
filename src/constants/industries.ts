/** Options for the board "Filter by" control and per-card industry assignment. */
export const FILTER_INDUSTRY_OPTIONS = [
  "Energy",
  "Technology",
  "Professional Services",
  "Financial Services",
  "Healthcare & Life Sciences",
  "Manufacturing & Industrial",
  "Construction & Real Estate",
  "Logistics & Supply Chain",
  "Media & Communications",
  "Retail & Consumer Goods",
  "Agriculture & Food Production",
  "Education & Training",
  "Government & Public Sector",
  "Travel & Hospitality",
  "Legal Services"
] as const;

export type IndustryOption = (typeof FILTER_INDUSTRY_OPTIONS)[number];
