import { useRef } from "react";
import { Upload } from "lucide-react";

type Props = {
  onFiles: (files: File[]) => void;
};

export function ImageUploader({ onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (valid.length > 0) onFiles(valid);
  };

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-soft backdrop-blur"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        <Upload className="h-4 w-4" />
        Upload Images
      </button>
      <p className="mt-2 text-xs text-slate-500">Drag and drop images here, or pick files.</p>
    </div>
  );
}
