"use client";

import { useRef, useState } from "react";
import { Folder } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onAttach: (name: string, fileCount: number) => void;
  onAddOther: () => void;
}

export default function DropZone({ onAttach, onAddOther }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const items = Array.from(e.dataTransfer.items);
    const name = items[0]?.getAsFile()?.name ?? "Dropped files";
    onAttach(name, e.dataTransfer.files.length || 1);
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const dirName = files[0].webkitRelativePath.split("/")[0] || files[0].name;
    onAttach(dirName, files.length);
    e.target.value = "";
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "rounded-[10px] p-7 text-center transition-all duration-[120ms]",
        "border-[1.5px] border-dashed",
        dragOver ? "border-navy bg-navy-soft" : "border-rule-strong bg-surface-2",
      )}
    >
      <div className="inline-grid place-items-center size-12 rounded-[10px] bg-surface border border-rule text-navy mb-3">
        <Folder className="size-[22px]" />
      </div>
      <div className="text-[15px] font-medium">Drop a folder of client documents</div>
      <div className="text-small mt-1">
        PDF, DOCX, TXT, EML. Scanned PDFs are OCR&apos;d on-device. Nothing leaves this machine.
      </div>
      <div className="flex items-center justify-center gap-3 mt-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-3 py-1.5 rounded-md border border-rule-strong bg-surface text-sm text-ink
                     hover:bg-surface-2 transition-colors duration-[120ms]"
        >
          Choose folder…
        </button>
        <span className="text-small">or</span>
        <button
          type="button"
          onClick={onAddOther}
          className="px-3 py-1.5 rounded-md text-sm text-ink-2
                     hover:text-ink hover:bg-[rgba(20,18,12,0.04)] transition-colors duration-[120ms]"
        >
          Add another source type
        </button>
      </div>
      {/* Hidden directory picker — webkitdirectory is non-standard but widely supported */}
      <input
        ref={inputRef}
        type="file"
        multiple
        // @ts-expect-error webkitdirectory is non-standard
        webkitdirectory=""
        className="hidden"
        onChange={handleFiles}
      />
    </div>
  );
}
