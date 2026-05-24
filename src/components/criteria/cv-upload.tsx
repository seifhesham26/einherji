"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Sparkles, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExtractFromCv } from "@/hooks/criteria/useExtractFromCv";
import type { ExtractedCvData } from "@/lib/cv-parser";

interface CvUploadProps {
  onExtracted: (data: ExtractedCvData) => void;
}

export default function CvUpload({ onExtracted }: CvUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const extractFromCv = useExtractFromCv();

  function handleFile(selected: File | null) {
    if (!selected || selected.type !== "application/pdf") return;
    setFile(selected);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files[0] ?? null);
  }

  async function handleExtract() {
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const data = await extractFromCv.mutateAsync({ pdfBase64: base64 });
    onExtracted(data);
    setFile(null);
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => !file && fileInputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer
          ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}
          ${file ? "cursor-default" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        {file ? (
          <div className="flex items-center gap-3 w-full max-w-xs">
            <FileText className="h-8 w-8 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(0)} KB · PDF
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-full bg-muted p-3">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Drop your CV here</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                or click to browse — PDF only
              </p>
            </div>
          </>
        )}
      </div>

      {/* Extract button */}
      {file && (
        <Button
          type="button"
          onClick={handleExtract}
          disabled={extractFromCv.isPending}
          className="w-full gap-2"
        >
          {extractFromCv.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Extracting from CV…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Extract & fill profile
            </>
          )}
        </Button>
      )}

      {extractFromCv.isError && (
        <p className="text-xs text-destructive">
          Failed to extract CV data. Please try again or fill in manually.
        </p>
      )}
    </div>
  );
}
