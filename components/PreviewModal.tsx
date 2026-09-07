"use client";

import React from "react";
import { FileItem } from "../types/media";
import { GATEWAY_URL, formatBytes } from "../lib/utils";

interface PreviewModalProps {
  previewFile: FileItem | null;
  copiedId: string | null;
  onClose: () => void;
  onCopyUrl: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
}

export default function PreviewModal({
  previewFile,
  copiedId,
  onClose,
  onCopyUrl,
  onDelete,
}: PreviewModalProps) {
  if (!previewFile) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 sm:p-6 motion-smooth"
      onClick={onClose}
    >
      <div
        className="bg-black border border-white/20 rounded-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-cinematic-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/20 flex items-center justify-between">
          <div className="min-w-0 pr-3">
            <h3 className="text-sm font-bold text-white truncate">
              {previewFile.original_name}
            </h3>
            <p className="text-[11px] text-white/50 font-mono mt-0.5">
              ID: {previewFile.file_id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg border border-white/20 bg-black hover:bg-white hover:text-black text-white flex items-center justify-center transition-colors cursor-pointer text-xs font-mono"
          >
            [X]
          </button>
        </div>

        {/* Media Canvas */}
        <div className="flex-1 bg-black flex items-center justify-center p-4 overflow-hidden min-h-[260px] max-h-[460px]">
          {previewFile.mime_type?.startsWith("image/") ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`${GATEWAY_URL}${previewFile.url}`}
              alt={previewFile.original_name}
              className="max-h-full max-w-full object-contain rounded-lg border border-white/10"
            />
          ) : previewFile.mime_type?.startsWith("video/") ? (
            <video
              src={`${GATEWAY_URL}${previewFile.url}`}
              controls
              autoPlay
              className="max-h-full max-w-full rounded-lg border border-white/10"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-white/60 py-12 text-center">
              <div className="text-xs font-mono border border-white/20 px-3 py-1.5 rounded">
                [{previewFile.category?.toUpperCase() || "FILE"}]
              </div>
              <p className="text-sm text-white font-medium mt-2">
                Preview not available for this format
              </p>
              <p className="text-xs text-white/40">
                Use the download button below to inspect locally.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer / Metadata */}
        <div className="p-4 sm:p-5 border-t border-white/20 bg-black flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs text-white/70">
            <span>
              <strong className="text-white">Size:</strong> {formatBytes(previewFile.size_bytes)}
            </span>
            <span>|</span>
            <span>
              <strong className="text-white">Category:</strong> {previewFile.category}
            </span>
            <span>|</span>
            <span>
              <strong className="text-white">Type:</strong> {previewFile.mime_type}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onCopyUrl(previewFile)}
              className="py-2 px-3 rounded-lg border border-white/20 bg-black text-white hover:bg-white hover:text-black text-xs font-mono transition-colors motion-smooth cursor-pointer"
            >
              {copiedId === previewFile.file_id ? "[COPIED]" : "[COPY LINK]"}
            </button>

            <a
              href={`${GATEWAY_URL}${previewFile.url}`}
              download={previewFile.original_name}
              className="py-2 px-4 rounded-lg bg-white text-black hover:bg-white/90 text-xs font-bold transition-colors motion-smooth cursor-pointer"
            >
              Download
            </a>

            <button
              onClick={() => onDelete(previewFile)}
              className="py-2 px-3 rounded-lg border border-white/30 text-white hover:bg-white hover:text-black text-xs font-mono transition-colors motion-smooth cursor-pointer"
              title="Delete file"
            >
              [DELETE]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
