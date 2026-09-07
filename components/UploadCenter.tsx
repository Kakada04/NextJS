"use client";

import React, { useRef, useState } from "react";
import { UploadTask } from "../types/media";
import { formatBytes } from "../lib/utils";

interface UploadCenterProps {
  queue: UploadTask[];
  isUploading: boolean;
  completedCount: number;
  totalLoaded: number;
  totalBytes: number;
  aggregateSpeedBytesPerSec: number;
  overallProgress: number;
  onAddFiles: (files: File[]) => void;
  onUploadAll: () => void;
  onCancelAll: () => void;
  onCancelTask: (id: string) => void;
  onRemoveQueueItem: (id: string) => void;
  onClearQueue: () => void;
  onGenerateTestFiles: () => void;
  onBackToLibrary: () => void;
}

export default function UploadCenter({
  queue,
  isUploading,
  completedCount,
  totalLoaded,
  totalBytes,
  aggregateSpeedBytesPerSec,
  overallProgress,
  onAddFiles,
  onUploadAll,
  onCancelAll,
  onCancelTask,
  onRemoveQueueItem,
  onClearQueue,
  onGenerateTestFiles,
  onBackToLibrary,
}: UploadCenterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onAddFiles(Array.from(e.target.files));
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      onAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-5">
      {/* Dropzone Card */}
      <div className="bg-black border border-white/20 rounded-2xl p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              [UPLOAD_ENGINE]
            </h3>
            <p className="text-xs text-white/50 font-mono mt-0.5">
              Direct Go Media Gateway • 20MB Chunk Slicing for Big Files
            </p>
          </div>
          <button
            onClick={onBackToLibrary}
            className="text-xs font-mono text-white/70 hover:text-white border border-white/20 px-2.5 py-1 rounded transition-colors cursor-pointer"
          >
            ← LIBRARY
          </button>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors motion-smooth ${
            isDragOver ? "border-white bg-white/5" : "border-white/20 hover:border-white/50 bg-black"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            disabled={isUploading}
            onChange={handleFileChange}
          />
          <span className="text-2xl font-mono text-white mb-2 motion-smooth">[+]</span>
          <p className="text-sm font-bold text-white font-mono uppercase">
            Drop files here or click to browse
          </p>
          <p className="text-xs font-mono text-white/50 mt-1">
            Any media type (ISO, MP4, PNG, PDF, ZIP) up to 10GB
          </p>
        </div>

        {/* Dropzone Actions */}
        <div className="flex items-center gap-2.5 mt-4">
          <button
            type="button"
            onClick={onGenerateTestFiles}
            disabled={isUploading}
            className="flex-1 py-2 px-3 rounded-lg border border-white/30 text-white hover:bg-white hover:text-black text-xs font-mono font-bold transition-colors motion-smooth cursor-pointer disabled:opacity-40"
          >
            [GENERATE 10 TEST FILES (10-25MB)]
          </button>

          {queue.length > 0 && !isUploading && (
            <button
              type="button"
              onClick={onClearQueue}
              className="py-2 px-4 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white text-xs font-mono transition-colors motion-smooth cursor-pointer"
            >
              [CLEAR]
            </button>
          )}
        </div>

        {/* Master Upload Trigger & Status */}
        {queue.length > 0 && (
          <div className="mt-4 flex flex-col gap-2.5">
            {isUploading ? (
              <div className="flex items-center gap-2.5">
                <div className="flex-1 py-3 px-4 rounded-lg font-mono text-xs text-pink-400 border border-pink-500/40 bg-pink-950/20 flex items-center justify-center gap-2">
                  <span className="font-bold animate-pulse">[UPLOADING]</span>
                  <span>
                    ({completedCount}/{queue.length} streams finished)
                  </span>
                </div>
                <button
                  onClick={onCancelAll}
                  className="px-4 py-3 rounded-lg border border-pink-500/40 text-pink-400 hover:bg-pink-600 hover:text-white text-xs font-mono font-bold transition-colors motion-smooth cursor-pointer"
                >
                  [CANCEL ALL]
                </button>
              </div>
            ) : completedCount === queue.length && queue.length > 0 ? (
              /* All Uploads Completed Successfully */
              <div className="flex flex-col sm:flex-row items-center gap-2.5 animate-cinematic-fade">
                <div className="flex-1 w-full py-3 px-4 rounded-lg font-mono text-xs text-emerald-400 border border-emerald-500/40 bg-emerald-950/20 flex items-center justify-center gap-2">
                  <span className="font-bold">[SUCCESS]</span>
                  <span>All {queue.length} file(s) uploaded successfully!</span>
                </div>
                <button
                  onClick={onBackToLibrary}
                  className="w-full sm:w-auto py-3 px-5 rounded-lg font-bold font-mono text-xs text-black bg-white hover:bg-white/90 transition-colors motion-smooth cursor-pointer uppercase tracking-wider"
                >
                  VIEW IN LIBRARY →
                </button>
                <button
                  onClick={onClearQueue}
                  className="w-full sm:w-auto py-3 px-4 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white text-xs font-mono transition-colors motion-smooth cursor-pointer"
                >
                  [DONE / CLEAR]
                </button>
              </div>
            ) : completedCount > 0 && completedCount + queue.filter((t) => t.status === "error" || t.status === "canceled").length === queue.length ? (
              /* Partial Completion / Failures */
              <div className="flex flex-col sm:flex-row items-center gap-2.5 animate-cinematic-fade">
                <div className="flex-1 w-full py-3 px-4 rounded-lg font-mono text-xs text-amber-400 border border-amber-500/40 bg-amber-950/20 flex items-center justify-center gap-2">
                  <span className="font-bold">[PARTIAL]</span>
                  <span>
                    {completedCount}/{queue.length} uploaded ({queue.filter((t) => t.status === "error").length} failed)
                  </span>
                </div>
                <button
                  onClick={onUploadAll}
                  className="w-full sm:w-auto py-3 px-4 rounded-lg font-bold font-mono text-xs text-white bg-pink-600 hover:bg-pink-500 transition-colors motion-smooth cursor-pointer uppercase border border-pink-400"
                >
                  RETRY REMAINING
                </button>
                <button
                  onClick={onBackToLibrary}
                  className="w-full sm:w-auto py-3 px-4 rounded-lg font-bold font-mono text-xs text-black bg-white hover:bg-white/90 transition-colors motion-smooth cursor-pointer uppercase"
                >
                  GO TO LIBRARY →
                </button>
              </div>
            ) : (
              /* Default Pending Upload State */
              <button
                onClick={onUploadAll}
                className="w-full py-3 px-4 rounded-lg font-bold font-mono text-sm text-white bg-pink-600 hover:bg-pink-500 transition-colors motion-smooth cursor-pointer uppercase tracking-wider border border-pink-400"
              >
                Start Uploading {queue.length} Files Simultaneously
              </button>
            )}
          </div>
        )}
      </div>

      {/* Speedometer Widget */}
      {(isUploading || aggregateSpeedBytesPerSec > 0 || completedCount > 0) && (
        <div className="bg-black border border-pink-500/30 p-5 rounded-2xl flex flex-col gap-3 font-mono animate-cinematic-fade">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-pink-400">[SPEEDOMETER]</span>
            <span className="font-bold text-pink-400 text-sm">{overallProgress}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div className="h-2 bg-pink-500 motion-smooth" style={{ width: `${overallProgress}%` }}></div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
            <div className="bg-black p-2 rounded border border-white/10">
              <span className="block text-[10px] text-white/50 uppercase">Total Speed</span>
              <span className="font-bold text-white text-sm">
                {(aggregateSpeedBytesPerSec / (1024 * 1024)).toFixed(2)} MB/s
              </span>
            </div>
            <div className="bg-black p-2 rounded border border-white/10">
              <span className="block text-[10px] text-white/50 uppercase">Transferred</span>
              <span className="font-bold text-white text-xs">
                {formatBytes(totalLoaded)} / {formatBytes(totalBytes)}
              </span>
            </div>
            <div className="bg-black p-2 rounded border border-white/10">
              <span className="block text-[10px] text-white/50 uppercase">Completed</span>
              <span className="font-bold text-white text-sm">
                {completedCount} / {queue.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Stream Queue Cards */}
      {queue.length > 0 && (
        <div className="flex flex-col gap-2 font-mono">
          <span className="text-xs text-white/60 uppercase tracking-wider px-1">
            Streams in Queue ({queue.length}):
          </span>
          {queue.map((task, idx) => (
            <div key={task.id} className="bg-black border border-white/20 rounded-xl p-3 flex flex-col gap-2 animate-cinematic-fade motion-smooth">
              <div className="flex items-center justify-between text-xs gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-white/40 text-[10px]">#{idx + 1}</span>
                  <span className="font-medium text-white truncate max-w-[200px] sm:max-w-md">{task.file.name}</span>
                  <span className="text-white/40 text-[11px]">({formatBytes(task.total)})</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {task.status === "uploading" && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {task.chunkInfo && <span className="text-pink-300">[{task.chunkInfo}]</span>}
                      <span className="text-pink-400 font-bold">
                        {(task.speedBytesPerSec / (1024 * 1024)).toFixed(1)} MB/s
                      </span>
                    </div>
                  )}
                  {task.status === "completed" && <span className="text-white font-bold text-[10px]">[DONE]</span>}
                  {task.status === "pending" && <span className="text-white/50 text-[10px]">[WAITING]</span>}
                  {task.status === "error" && <span className="text-red-400 font-bold text-[10px]">[ERROR]</span>}
                  {task.status === "uploading" ? (
                    <button onClick={() => onCancelTask(task.id)} className="text-pink-400 hover:text-white text-xs cursor-pointer">[X]</button>
                  ) : !isUploading ? (
                    <button onClick={() => onRemoveQueueItem(task.id)} className="text-white/50 hover:text-white text-xs cursor-pointer">[X]</button>
                  ) : null}
                </div>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                <div
                  className={`h-1 transition-all duration-150 ${
                    task.status === "uploading" ? "bg-pink-500" : "bg-white"
                  }`}
                  style={{ width: `${task.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
