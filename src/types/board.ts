export type Point = {
  x: number;
  y: number;
};

export type BoardImage = {
  id: string;
  src: string;
  title: string;
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
