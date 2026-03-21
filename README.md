# Image Ranking Freeform Board

A modern React + TypeScript + Tailwind web app for creating and managing a visual image-ranking board, inspired by Apple Freeform.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Zustand (state management)
- dnd-kit (drag-to-reorder rank list)

## Features

- Upload images (drag/drop or file picker)
- Assign numeric ranks (slider + number input)
- Drag images freely on a large pannable/zoomable board
- Automatic rank-based vertical layout with deterministic "organic" jitter
- Snap all images back to rank layout
- Edit title/rank in side panel
- Local storage persistence

## Run

1. Install Node.js (LTS, recommended v20+)
2. Install dependencies
   - `npm install`
3. Start dev server
   - `npm run dev`
4. Build
   - `npm run build`

## Project Structure

- `src/components/ImageUploader.tsx` - drag/drop and file picker upload
- `src/components/BoardCanvas.tsx` - large freeform board with pan/zoom
- `src/components/ImageCard.tsx` - draggable image card
- `src/components/RankControls.tsx` - ranking UI + drag-to-reorder list
- `src/components/EditImagePanel.tsx` - modal-like side editor for title/rank
- `src/store/useBoardStore.ts` - app state and actions
- `src/utils/layout.ts` - rank-to-position layout algorithm
- `src/types/board.ts` - core data models

## Layout Algorithm (rank -> y)

Core logic lives in `src/utils/layout.ts`:

- Ranks are normalized (`minRank` -> 0, `maxRank` -> 1), then inverted so high rank appears near top.
- Each rank maps to a vertical "band" (`baseY`).
- Images in same rank are spread into horizontal lanes for readability.
- A deterministic hash-based jitter adds subtle variation:
  - Keeps layout visually natural (not rigid)
  - Remains stable across rerenders for the same image/rank

This gives a dynamic but predictable distribution: higher ranks float upward, lower ranks settle lower, while avoiding perfect alignment.
