"use client";

import React, { useState, useEffect, useRef } from "react";

interface FileItem {
  id: number | string;
  file_id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  thumbnail_url: string | null;
  created_at: string;
  category?: string;
  relative_path?: string;
}

interface UploadTask {
  id: string;
  file: File;
  status: "pending" | "uploading" | "completed" | "error" | "canceled";
  progress: number;
  speedBytesPerSec: number;
  loaded: number;
  total: number;
  etaSec: number;
  errorMessage?: string;
  xhr?: XMLHttpRequest;
  lastTime?: number;
  lastLoaded?: number;
  smoothedSpeed?: number;
  chunkInfo?: string;
}

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "https://intention-conditions-avon-relief.trycloudflare.com";

export default function Home() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [queue, setQueue] = useState<UploadTask[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<UploadTask[]>([]);
  queueRef.current = queue;

  const fetchFiles = () => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("media_service_files");
        if (stored) {
          setFiles(JSON.parse(stored));
        }
      }
    } catch (err) {
      console.warn("Could not load files from localStorage:", err);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchFiles();
  }, []);

  const addFilesToQueue = (newFiles: File[]) => {
    if (!newFiles.length) return;
    const tasks: UploadTask[] = newFiles.map((f, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      status: "pending",
      progress: 0,
      speedBytesPerSec: 0,
      loaded: 0,
      total: f.size,
      etaSec: 0,
    }));
    setQueue((prev) => [...prev, ...tasks]);
    setBatchNotice(`Added ${tasks.length} file(s) to upload queue`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFilesToQueue(Array.from(e.target.files));
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  // Helper to generate 10 dummy test files in browser memory (varying 10MB - 25MB each)
  const handleGenerate10TestFiles = () => {
    const dummyFiles: File[] = [];
    for (let i = 1; i <= 10; i++) {
      const sizeMb = 10 + (i % 5) * 3;
      const chunk = new Uint8Array(1024 * 1024);
      for (let j = 0; j < 1024; j++) chunk[j] = (i * 17 + j) % 256;
      const chunks: Uint8Array[] = [];
      for (let c = 0; c < sizeMb; c++) chunks.push(chunk);

      const blob = new Blob(chunks as unknown as BlobPart[], { type: "application/octet-stream" });
      const testFile = new File([blob], `test_concurrent_${i}_${sizeMb}MB.bin`, {
        type: "application/octet-stream",
      });
      dummyFiles.push(testFile);
    }
    addFilesToQueue(dummyFiles);
  };

  const clearQueue = () => {
    if (isUploading) return;
    setQueue([]);
    setBatchNotice(null);
  };

  const removeQueueItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB per chunk to bypass Cloudflare 100MB payload limit

  // Direct single-stream upload for smaller files (<= 10MB)
  const uploadDirectTask = async (task: UploadTask): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const formData = new FormData();
        formData.append("file", task.file);

        const xhr = new XMLHttpRequest();
        task.xhr = xhr;
        task.lastTime = performance.now();
        task.lastLoaded = 0;
        task.smoothedSpeed = 0;

        setQueue((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: "uploading", xhr } : t))
        );

        xhr.open("POST", `${GATEWAY_URL}/api/v1/upload`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const now = performance.now();
            const timeDiff = (now - (task.lastTime || now)) / 1000;

            let smoothed = task.smoothedSpeed || 0;
            if (timeDiff >= 0.15 || event.loaded === event.total) {
              const bytesDiff = event.loaded - (task.lastLoaded || 0);
              const instantSpeed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
              smoothed = smoothed === 0 ? instantSpeed : smoothed * 0.7 + instantSpeed * 0.3;
              task.smoothedSpeed = smoothed;
              task.lastTime = now;
              task.lastLoaded = event.loaded;
            }

            const remaining = Math.max(0, event.total - event.loaded);
            const eta = smoothed > 0 ? Math.ceil(remaining / smoothed) : 0;
            const progress = Math.round((event.loaded / event.total) * 100);

            setQueue((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? {
                      ...t,
                      progress,
                      loaded: event.loaded,
                      total: event.total,
                      speedBytesPerSec: smoothed,
                      etaSec: eta,
                    }
                  : t
              )
            );
          }
        };

        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const mediaData = JSON.parse(xhr.responseText);
              const newFile: FileItem = {
                id: mediaData.file_id,
                file_id: mediaData.file_id,
                original_name: mediaData.original_name || task.file.name,
                mime_type: mediaData.mime_type || task.file.type,
                size_bytes: mediaData.size_bytes || task.file.size,
                url: mediaData.url,
                thumbnail_url: mediaData.thumbnail_url || null,
                created_at: new Date().toISOString(),
                category: mediaData.category,
                relative_path: mediaData.relative_path,
              };

              // Immediately add to files list and persist in localStorage
              setFiles((prev) => {
                const updated = [newFile, ...prev];
                try {
                  localStorage.setItem("media_service_files", JSON.stringify(updated));
                } catch {}
                return updated;
              });
            } catch (err) {
              console.warn("Response parsing warning:", err);
            }

            setQueue((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? { ...t, status: "completed", progress: 100, speedBytesPerSec: 0, etaSec: 0 }
                  : t
              )
            );
            resolve();
          } else {
            let msg = `HTTP ${xhr.status}`;
            try {
              const err = JSON.parse(xhr.responseText);
              if (err.message || err.error) msg = err.message || err.error;
            } catch {}
            setQueue((prev) =>
              prev.map((t) =>
                t.id === task.id ? { ...t, status: "error", errorMessage: msg, speedBytesPerSec: 0 } : t
              )
            );
            resolve();
          }
        };

        xhr.onerror = () => {
          setQueue((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? { ...t, status: "error", errorMessage: "Network error", speedBytesPerSec: 0 }
                : t
            )
          );
          resolve();
        };

        xhr.onabort = () => {
          setQueue((prev) =>
            prev.map((t) =>
              t.id === task.id ? { ...t, status: "canceled", speedBytesPerSec: 0 } : t
            )
          );
          resolve();
        };

        xhr.send(formData);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setQueue((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, status: "error", errorMessage: msg, speedBytesPerSec: 0 } : t
          )
        );
        resolve();
      }
    });
  };

  // Resumable chunked upload for large files (> 10MB)
  const uploadChunkedTask = async (task: UploadTask): Promise<void> => {
    return new Promise(async (resolve) => {
      const uploadId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const totalSize = task.file.size;
      const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

      let isAborted = false;
      task.lastTime = performance.now();
      task.lastLoaded = 0;
      task.smoothedSpeed = 0;

      setQueue((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: "uploading",
                progress: 0,
                loaded: 0,
                total: totalSize,
                chunkInfo: `Chunk 1/${totalChunks}`,
              }
            : t
        )
      );

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        if (isAborted) break;

        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(totalSize, start + CHUNK_SIZE);
        const chunkBlob = task.file.slice(start, end);

        let chunkSuccess = false;
        let lastErrorMsg = "";

        // Retry up to 3 times per chunk on network hiccup
        for (let attempt = 0; attempt < 3; attempt++) {
          if (isAborted) break;

          try {
            const result = await new Promise<{
              ok: boolean;
              data?: any;
              status: number;
              aborted?: boolean;
            }>((res) => {
              const xhr = new XMLHttpRequest();
              task.xhr = xhr;

              xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                  const currentTotalLoaded = Math.min(totalSize, start + event.loaded);
                  const now = performance.now();
                  const timeDiff = (now - (task.lastTime || now)) / 1000;

                  let smoothed = task.smoothedSpeed || 0;
                  if (timeDiff >= 0.15 || currentTotalLoaded === totalSize) {
                    const bytesDiff = currentTotalLoaded - (task.lastLoaded || 0);
                    const instantSpeed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
                    smoothed = smoothed === 0 ? instantSpeed : smoothed * 0.7 + instantSpeed * 0.3;
                    task.smoothedSpeed = smoothed;
                    task.lastTime = now;
                    task.lastLoaded = currentTotalLoaded;
                  }

                  const remaining = Math.max(0, totalSize - currentTotalLoaded);
                  const eta = smoothed > 0 ? Math.ceil(remaining / smoothed) : 0;
                  const progress = Math.min(99, Math.round((currentTotalLoaded / totalSize) * 100));

                  setQueue((prev) =>
                    prev.map((t) =>
                      t.id === task.id
                        ? {
                            ...t,
                            status: "uploading",
                            progress,
                            loaded: currentTotalLoaded,
                            total: totalSize,
                            speedBytesPerSec: smoothed,
                            etaSec: eta,
                            chunkInfo: `Chunk ${chunkIndex + 1}/${totalChunks}`,
                          }
                        : t
                    )
                  );
                }
              };

              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  try {
                    const json = JSON.parse(xhr.responseText);
                    res({ ok: true, data: json, status: xhr.status });
                  } catch {
                    res({ ok: true, status: xhr.status });
                  }
                } else {
                  let msg = `HTTP ${xhr.status}`;
                  try {
                    const err = JSON.parse(xhr.responseText);
                    if (err.message || err.error) msg = err.message || err.error;
                  } catch {}
                  res({ ok: false, status: xhr.status, data: msg });
                }
              };

              xhr.onerror = () => {
                res({ ok: false, status: 0, data: "Network error during chunk upload" });
              };

              xhr.onabort = () => {
                isAborted = true;
                res({ ok: false, status: 0, aborted: true });
              };

              xhr.open("POST", `${GATEWAY_URL}/api/v1/upload-chunk`);

              const formData = new FormData();
              // Append fields before chunk file for streaming multipart parser
              formData.append("uploadId", uploadId);
              formData.append("chunkIndex", chunkIndex.toString());
              formData.append("totalChunks", totalChunks.toString());
              formData.append("originalName", task.file.name);
              formData.append("mimeType", task.file.type || "application/octet-stream");
              formData.append("totalSize", totalSize.toString());
              formData.append("chunk", chunkBlob, task.file.name);

              xhr.send(formData);
            });

            if (result.aborted) {
              isAborted = true;
              fetch(`${GATEWAY_URL}/api/v1/upload-chunk/${uploadId}`, { method: "DELETE" }).catch(() => {});
              setQueue((prev) =>
                prev.map((t) =>
                  t.id === task.id ? { ...t, status: "canceled", speedBytesPerSec: 0, chunkInfo: undefined } : t
                )
              );
              resolve();
              return;
            }

            if (result.ok) {
              chunkSuccess = true;
              if (chunkIndex === totalChunks - 1 && result.data) {
                // Final chunk merged successfully!
                const mediaData = result.data;
                const newFile: FileItem = {
                  id: mediaData.file_id,
                  file_id: mediaData.file_id,
                  original_name: mediaData.original_name || task.file.name,
                  mime_type: mediaData.mime_type || task.file.type,
                  size_bytes: mediaData.size_bytes || task.file.size,
                  url: mediaData.url,
                  thumbnail_url: mediaData.thumbnail_url || null,
                  created_at: new Date().toISOString(),
                  category: mediaData.category,
                  relative_path: mediaData.relative_path,
                };

                setFiles((prev) => {
                  const updated = [newFile, ...prev];
                  try {
                    localStorage.setItem("media_service_files", JSON.stringify(updated));
                  } catch {}
                  return updated;
                });

                setQueue((prev) =>
                  prev.map((t) =>
                    t.id === task.id
                      ? {
                          ...t,
                          status: "completed",
                          progress: 100,
                          loaded: totalSize,
                          speedBytesPerSec: 0,
                          etaSec: 0,
                          chunkInfo: `Done (${totalChunks} chunks)`,
                        }
                      : t
                  )
                );
                resolve();
                return;
              }
              break; // Proceed to next chunk
            } else {
              lastErrorMsg = typeof result.data === "string" ? result.data : `HTTP ${result.status}`;
            }
          } catch (err: unknown) {
            lastErrorMsg = err instanceof Error ? err.message : "Chunk upload error";
          }
        }

        if (!chunkSuccess && !isAborted) {
          fetch(`${GATEWAY_URL}/api/v1/upload-chunk/${uploadId}`, { method: "DELETE" }).catch(() => {});
          setQueue((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    status: "error",
                    errorMessage: `Chunk ${chunkIndex + 1}/${totalChunks} failed: ${lastErrorMsg}`,
                    speedBytesPerSec: 0,
                  }
                : t
            )
          );
          resolve();
          return;
        }
      }
    });
  };

  // Upload worker: dispatches to chunked upload if file > 10MB
  const uploadSingleTask = async (task: UploadTask): Promise<void> => {
    if (task.file.size > CHUNK_SIZE) {
      return uploadChunkedTask(task);
    }
    return uploadDirectTask(task);
  };

  // Upload all pending tasks concurrently
  const handleUploadAllSimultaneously = async () => {
    const pendingTasks = queue.filter(
      (t) => t.status === "pending" || t.status === "error" || t.status === "canceled"
    );
    if (!pendingTasks.length) return;

    setIsUploading(true);
    setBatchNotice(`Uploading ${pendingTasks.length} files simultaneously in parallel...`);

    // Run all tasks simultaneously with Promise.all
    await Promise.all(pendingTasks.map((task) => uploadSingleTask(task)));

    setIsUploading(false);
    setBatchNotice("All parallel uploads finished!");
  };

  // Cancel individual task
  const handleCancelTask = (id: string) => {
    const item = queue.find((t) => t.id === id);
    if (item && item.xhr) {
      item.xhr.abort();
    }
  };

  // Cancel all active uploads
  const handleCancelAll = () => {
    queue.forEach((item) => {
      if (item.status === "uploading" && item.xhr) {
        item.xhr.abort();
      }
    });
    setIsUploading(false);
    setBatchNotice("All uploads canceled");
  };

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`Are you sure you want to delete "${file.original_name}"?`)) return;
    try {
      // 1. Delete from Standalone MediaService
      const pathParam = file.relative_path || file.url.replace(/^\/files\//, "");
      await fetch(`${GATEWAY_URL}/api/v1/files/${pathParam}`, { method: "DELETE" });

      // 2. Remove from local list and update localStorage
      setFiles((prev) => {
        const updated = prev.filter((f) => f.file_id !== file.file_id && f.id !== file.id);
        try {
          localStorage.setItem("media_service_files", JSON.stringify(updated));
        } catch {}
        return updated;
      });
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    if (!isMounted) return "";
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  // Aggregate stats across all tasks
  const activeTasks = queue.filter((t) => t.status === "uploading");
  const completedCount = queue.filter((t) => t.status === "completed").length;
  const totalLoaded = queue.reduce((acc, t) => acc + (t.loaded || 0), 0);
  const totalBytes = queue.reduce((acc, t) => acc + t.total, 0);
  const aggregateSpeedBytesPerSec = activeTasks.reduce(
    (acc, t) => acc + (t.speedBytesPerSec || 0),
    0
  );
  const overallProgress =
    totalBytes > 0 ? Math.round((totalLoaded / totalBytes) * 100) : 0;

  const filteredFiles = files.filter((f) =>
    f.original_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
            NG
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-wide">
              Media Gateway Portal
            </h1>
            <p className="text-xs text-slate-400">
              Nginx API Gateway • Concurrent Multi-Stream Direct to Go
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Cloudflare Tunnel (Active)
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Standalone Go Service
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT SIDE: Concurrent Multi-Upload Queue */}
        <section className="lg:col-span-6 flex flex-col gap-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 44 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Concurrent Multi-File Upload
              </h2>
              {queue.length > 0 && (
                <span className="text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-2.5 py-0.5 rounded-full font-semibold">
                  {queue.length} files in queue
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Select multiple files or click the quick generator button to test concurrent multi-file uploading.
            </p>

            {/* Drag & Drop Multi-file Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => {
                if (!isUploading) fileInputRef.current?.click();
              }}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all duration-200 ${
                isUploading
                  ? "cursor-default border-slate-800 bg-slate-950/40"
                  : isDragOver
                  ? "cursor-pointer border-indigo-500 bg-indigo-500/10"
                  : "cursor-pointer border-slate-700 hover:border-slate-600 bg-slate-800/40 hover:bg-slate-800/60"
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

              <div className="h-10 w-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-200">
                Drag & drop files here, or <span className="text-indigo-400 font-semibold">browse multiple</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Select 10 files at once (any format or size)
              </p>
            </div>

            {/* Quick Actions Toolbar */}
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={handleGenerate10TestFiles}
                disabled={isUploading}
                className="flex-1 py-2 px-3 rounded-lg border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <span className="text-amber-400">⚡</span>
                Generate 10 Test Files (10–25MB each)
              </button>

              {queue.length > 0 && !isUploading && (
                <button
                  type="button"
                  onClick={clearQueue}
                  className="py-2 px-3 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors cursor-pointer"
                >
                  Clear Queue
                </button>
              )}
            </div>

            {/* Master Action: Upload All Simultaneously */}
            {queue.length > 0 && (
              <div className="mt-4 flex items-center gap-2.5">
                {!isUploading ? (
                  <button
                    onClick={handleUploadAllSimultaneously}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Upload {queue.length} Files Simultaneously
                  </button>
                ) : (
                  <>
                    <div className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-indigo-600/80 border border-indigo-500/30 flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Concurrent Upload in Progress ({completedCount}/{queue.length})
                    </div>
                    <button
                      onClick={handleCancelAll}
                      className="px-4 py-3 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-sm font-semibold transition-colors cursor-pointer"
                    >
                      Cancel All
                    </button>
                  </>
                )}
              </div>
            )}

            {/* AGGREGATE LIVE SPEEDOMETER DASHBOARD */}
            {(isUploading || aggregateSpeedBytesPerSec > 0 || completedCount > 0) && (
              <div className="mt-4 bg-slate-950/80 border border-indigo-500/30 p-4 rounded-xl flex flex-col gap-3 shadow-inner">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-indigo-300 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Live Multi-Stream Aggregate Speed
                  </span>
                  <span className="font-mono font-bold text-indigo-300 text-sm">
                    {overallProgress}%
                  </span>
                </div>

                {/* Overall Combined Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all duration-150 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400"
                    style={{ width: `${overallProgress}%` }}
                  ></div>
                </div>

                {/* Aggregate Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Total Speed
                    </span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {(aggregateSpeedBytesPerSec / (1024 * 1024)).toFixed(2)} MB/s
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      {((aggregateSpeedBytesPerSec * 8) / (1000 * 1000)).toFixed(1)} Mbps
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Total Transferred
                    </span>
                    <span className="font-mono font-semibold text-slate-200 text-xs">
                      {formatBytes(totalLoaded)}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      of {formatBytes(totalBytes)}
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Files Completed
                    </span>
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      {completedCount} / {queue.length}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {activeTasks.length} active streams
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* QUEUE LIST: Individual File Streams */}
            {queue.length > 0 && (
              <div className="mt-5 flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                <span className="text-xs font-semibold text-slate-400 px-1">
                  Individual Streams ({queue.length}):
                </span>

                {queue.map((task, idx) => (
                  <div
                    key={task.id}
                    className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="h-5 w-5 rounded bg-slate-800 text-slate-400 text-[10px] flex items-center justify-center font-mono shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-white truncate max-w-[180px] sm:max-w-[240px]" title={task.file.name}>
                          {task.file.name}
                        </span>
                        <span className="text-slate-500 text-[11px] shrink-0">
                          ({formatBytes(task.total)})
                        </span>
                      </div>

                      {/* Status / Speed Indicator */}
                      <div className="flex items-center gap-2 shrink-0">
                        {task.status === "uploading" && (
                          <div className="flex items-center gap-1.5">
                            {task.chunkInfo && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                {task.chunkInfo}
                              </span>
                            )}
                            <span className="font-mono text-emerald-400 font-semibold text-[11px]">
                              {(task.speedBytesPerSec / (1024 * 1024)).toFixed(1)} MB/s
                            </span>
                          </div>
                        )}

                        {task.status === "completed" && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                            ✓ Done {task.chunkInfo ? `(${task.chunkInfo})` : ""}
                          </span>
                        )}

                        {task.status === "pending" && (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                            Waiting
                          </span>
                        )}

                        {task.status === "error" && (
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px]">
                            Error
                          </span>
                        )}

                        {task.status === "uploading" ? (
                          <button
                            onClick={() => handleCancelTask(task.id)}
                            className="text-slate-500 hover:text-rose-400 text-xs px-1 cursor-pointer"
                            title="Cancel this stream"
                          >
                            ✕
                          </button>
                        ) : !isUploading ? (
                          <button
                            onClick={() => removeQueueItem(task.id)}
                            className="text-slate-500 hover:text-rose-400 text-xs px-1 cursor-pointer"
                            title="Remove"
                          >
                            ✕
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Individual Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-150 ${
                          task.status === "completed"
                            ? "bg-emerald-500"
                            : task.status === "error"
                            ? "bg-rose-500"
                            : "bg-indigo-500"
                        }`}
                        style={{ width: `${task.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Notice Message */}
            {batchNotice && (
              <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs flex items-center gap-2">
                <span className="text-indigo-400">ℹ️</span>
                <span>{batchNotice}</span>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT SIDE: Stored Files & Downloads */}
        <section className="lg:col-span-6 flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Files Stored ({files.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Managed by SQLite • Stored in Go Media Gateway
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search file name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={fetchFiles}
                  title="Refresh list"
                  className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Files List */}
            {filteredFiles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-800 rounded-xl">
                <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-400">No files found</p>
                <p className="text-xs text-slate-500 mt-1">
                  {searchQuery ? "No files match your search" : "Upload files using the concurrent panel on the left"}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[600px] pr-1">
                {filteredFiles.map((file) => {
                  const isImage = file.mime_type?.startsWith("image/");
                  return (
                    <div
                      key={file.id}
                      className="group bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-xl p-3.5 flex items-center justify-between gap-4 transition-all"
                    >
                      {/* Left: Thumbnail / File Icon & Details */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-12 w-12 rounded-lg bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                          {isImage ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={`${GATEWAY_URL}${file.thumbnail_url || file.url}`}
                              alt={file.original_name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>

                        <div className="min-w-0 flex flex-col">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors" title={file.original_name}>
                              {file.original_name}
                            </p>
                            {file.category && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                {file.category}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            <span>{formatBytes(file.size_bytes)}</span>
                            <span>•</span>
                            <span className="truncate max-w-[200px]" title={file.url}>{file.url}</span>
                            <span>•</span>
                            <span className="hidden sm:inline" suppressHydrationWarning>
                              {formatDate(file.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Download & View Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`${GATEWAY_URL}${file.url}`}
                          download={file.original_name}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                          title="Download directly from Go Media Gateway"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </a>

                        <a
                          href={`${GATEWAY_URL}${file.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700/60 text-xs transition-colors cursor-pointer"
                          title="Open directly on Media Server"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>

                        <button
                          onClick={() => handleDelete(file)}
                          className="p-1.5 rounded-lg border border-slate-700/60 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 text-xs transition-colors cursor-pointer"
                          title="Delete file record"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
