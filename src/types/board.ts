export type Point = {
  x: number;
  y: number;
};

export type BoardImage = {
  id: string;
  src: string;
  title: string;
  description?: string;
  /** Front-of-card campaign fields (dropdowns). */
  brand?: string;
  campaign?: string;
  date?: string;
  /** Free text; board “Filter by” matches this string to industry options. */
  category?: string;
  rank: number;
  position: Point;
  createdAt: number;
};

export type BoardSnapshot = {
  images: BoardImage[];
  rankScale: {
    min: number;
    max: number;
  };
};
