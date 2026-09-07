"use client";

import React from "react";
import { FileItem } from "../types/media";
import { GATEWAY_URL, formatBytes, formatDate } from "../lib/utils";

interface MediaTableProps {
  files: FileItem[];
  copiedId: string | null;
  onPreview: (file: FileItem) => void;
  onCopyUrl: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
}

export default function MediaTable({
  files,
  copiedId,
  onPreview,
  onCopyUrl,
  onDelete,
}: MediaTableProps) {
  return (
    <div className="border border-white/20 rounded-xl overflow-hidden bg-black">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-black text-white/50 uppercase tracking-wider font-mono border-b border-white/20 text-[11px]">
            <tr>
              <th className="py-3 px-4 w-12">Preview</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Size</th>
              <th className="py-3 px-4">Date Uploaded</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {files.map((file) => {
              const isImage = file.mime_type?.startsWith("image/");
              return (
                <tr key={file.id} className="hover:bg-white/5 transition-colors motion-smooth animate-cinematic-fade">
                  <td className="py-2.5 px-4">
                    <div
                      onClick={() => onPreview(file)}
                      className="h-9 w-9 rounded bg-black overflow-hidden flex items-center justify-center cursor-pointer border border-white/20 motion-smooth hover:border-white"
                    >
                      {isImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={`${GATEWAY_URL}${file.thumbnail_url || file.url}`}
                          alt={file.original_name}
                          className="h-full w-full object-cover motion-smooth hover:scale-110"
                        />
                      ) : (
                        <span className="text-[10px] font-mono text-white/60">
                          [{file.category?.[0]?.toUpperCase() || "F"}]
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 font-medium text-white max-w-xs truncate">
                    <span
                      onClick={() => onPreview(file)}
                      className="cursor-pointer hover:underline"
                    >
                      {file.original_name}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase border border-white/20 text-white/80">
                      {file.category || "other"}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-white/80">
                    {formatBytes(file.size_bytes)}
                  </td>
                  <td className="py-2.5 px-4 text-white/50 text-[11px]">
                    {formatDate(file.created_at)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-xs">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onCopyUrl(file)}
                        className="px-2 py-1 rounded border border-white/20 text-white/70 hover:text-black hover:bg-white transition-colors motion-smooth cursor-pointer text-[10px]"
                        title="Copy Direct Link"
                      >
                        {copiedId === file.file_id ? "[COPIED]" : "[COPY]"}
                      </button>

                      <a
                        href={`${GATEWAY_URL}${file.url}`}
                        download={file.original_name}
                        className="px-2 py-1 rounded border border-white/20 text-white/70 hover:text-black hover:bg-white transition-colors motion-smooth cursor-pointer text-[10px]"
                        title="Download"
                      >
                        [GET]
                      </a>

                      <button
                        onClick={() => onDelete(file)}
                        className="px-2 py-1 rounded border border-white/20 text-white/70 hover:text-black hover:bg-white transition-colors motion-smooth cursor-pointer text-[10px]"
                        title="Delete file"
                      >
                        [DEL]
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
