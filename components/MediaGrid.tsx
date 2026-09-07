"use client";

import React from "react";
import { FileItem } from "../types/media";
import { GATEWAY_URL, formatBytes } from "../lib/utils";

interface MediaGridProps {
  files: FileItem[];
  copiedId: string | null;
  onPreview: (file: FileItem) => void;
  onCopyUrl: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
}

export default function MediaGrid({
  files,
  copiedId,
  onPreview,
  onCopyUrl,
  onDelete,
}: MediaGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {files.map((file) => {
        const isImage = file.mime_type?.startsWith("image/");
        const isVideo = file.mime_type?.startsWith("video/");

        return (
          <div
            key={file.id}
            className="group bg-black border border-white/20 hover:border-white rounded-xl overflow-hidden flex flex-col motion-smooth animate-cinematic-fade hover:-translate-y-0.5"
          >
            {/* Thumbnail Canvas */}
            <div
              onClick={() => onPreview(file)}
              className="h-36 w-full bg-black border-b border-white/10 relative overflow-hidden flex items-center justify-center cursor-pointer select-none"
            >
              {isImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`${GATEWAY_URL}${file.thumbnail_url || file.url}`}
                  alt={file.original_name}
                  className="h-full w-full object-cover motion-smooth group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : isVideo ? (
                <div className="flex flex-col items-center gap-1.5 text-white">
                  <div className="h-9 w-9 rounded border border-white/30 flex items-center justify-center font-mono text-xs font-bold">
                    ▶
                  </div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-white/60">
                    VIDEO
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-white/60">
                  <span className="font-mono text-xs border border-white/20 px-2 py-1 rounded text-white">
                    [{file.category?.toUpperCase() || "FILE"}]
                  </span>
                </div>
              )}

              {/* Inspect Overlay */}
              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-[11px] font-mono text-white px-2 py-1 rounded border border-white bg-black">
                  [INSPECT]
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="p-3 flex flex-col flex-1 justify-between gap-2.5 bg-black">
              <div>
                <p
                  onClick={() => onPreview(file)}
                  className="text-xs font-medium text-white truncate hover:underline cursor-pointer"
                  title={file.original_name}
                >
                  {file.original_name}
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono text-white/50 mt-1">
                  <span>{formatBytes(file.size_bytes)}</span>
                  <span className="uppercase border border-white/20 px-1 py-0.5 rounded text-white/80">
                    {file.category || "other"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                <button
                  onClick={() => onCopyUrl(file)}
                  className="px-1.5 py-0.5 rounded border border-white/20 text-white/70 hover:text-black hover:bg-white transition-colors motion-smooth cursor-pointer text-[10px]"
                  title="Copy Direct Link"
                >
                  {copiedId === file.file_id ? "[COPIED]" : "[COPY]"}
                </button>

                <a
                  href={`${GATEWAY_URL}${file.url}`}
                  download={file.original_name}
                  className="px-1.5 py-0.5 rounded border border-white/20 text-white/70 hover:text-black hover:bg-white transition-colors motion-smooth cursor-pointer text-[10px]"
                  title="Download"
                >
                  [GET]
                </a>

                <button
                  onClick={() => onDelete(file)}
                  className="px-1.5 py-0.5 rounded border border-white/20 text-white/70 hover:text-black hover:bg-white transition-colors motion-smooth cursor-pointer text-[10px]"
                  title="Delete file"
                >
                  [DEL]
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
