"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileItem, UploadTask, NavTab, ViewMode, SortOption } from "../types/media";
import { GATEWAY_URL } from "../lib/utils";
import AdminHeader from "../components/AdminHeader";
import AdminSidebar from "../components/AdminSidebar";
import MediaGrid from "../components/MediaGrid";
import MediaTable from "../components/MediaTable";
import PreviewModal from "../components/PreviewModal";
import UploadCenter from "../components/UploadCenter";

function MediaAdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as NavTab | null;

  const [files, setFiles] = useState<FileItem[]>([]);
  const [queue, setQueue] = useState<UploadTask[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Admin UI State synced with URL route query parameter (?tab=...)
  const [currentNav, setCurrentNavState] = useState<NavTab>(tabParam || "all");

  const switchTab = (tab: NavTab) => {
    setCurrentNavState(tab);
    if (tab === "all") {
      router.push("/");
    } else {
      router.push(`/?tab=${tab}`);
    }
  };

  useEffect(() => {
    if (tabParam && ["all", "images", "videos", "documents", "others", "upload"].includes(tabParam)) {
      setCurrentNavState(tabParam);
    } else if (!tabParam) {
      setCurrentNavState("all");
    }
  }, [tabParam]);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "size_desc" | "name_asc"
  >("newest");
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<UploadTask[]>([]);
  queueRef.current = queue;

  // Fetch files from server API with local fallback
  const fetchFiles = async () => {
    try {
      const res = await fetch(`${GATEWAY_URL}/api/v1/files`);
      if (res.ok) {
        const data = await res.json();
        const serverFiles: FileItem[] = data.files || [];
        setFiles(serverFiles);
        try {
          localStorage.setItem("media_service_files", JSON.stringify(serverFiles));
        } catch {}
        return;
      }
    } catch (err) {
      console.warn("Could not fetch files from API, using cached fallback:", err);
    }

    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("media_service_files");
        if (stored) {
          setFiles(JSON.parse(stored));
        }
      }
    } catch {}
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
    switchTab("upload"); // Automatically switch to Upload Center when files are added
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

  // Helper to generate 10 dummy test files in browser memory
  const handleGenerate10TestFiles = () => {
    const dummyFiles: File[] = [];
    for (let i = 1; i <= 10; i++) {
      const sizeMb = 10 + (i % 5) * 3;
      const chunk = new Uint8Array(1024 * 1024);
      for (let j = 0; j < 1024; j++) chunk[j] = (i * 17 + j) % 256;
      const chunks: Uint8Array[] = [];
      for (let c = 0; c < sizeMb; c++) chunks.push(chunk);

      const blob = new Blob(chunks as unknown as BlobPart[], {
        type: "application/octet-stream",
      });
      const testFile = new File([blob], `test_file_${i}_${sizeMb}MB.bin`, {
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

  const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB per chunk

  // Direct single-stream upload for smaller files (<= 20MB)
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
            if (timeDiff >= 0.1 || event.loaded === event.total) {
              const bytesDiff = event.loaded - (task.lastLoaded || 0);
              const instantSpeed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
              smoothed =
                smoothed === 0 ? instantSpeed : smoothed * 0.7 + instantSpeed * 0.3;
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
            setQueue((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? {
                      ...t,
                      status: "completed",
                      progress: 100,
                      speedBytesPerSec: 0,
                      etaSec: 0,
                    }
                  : t
              )
            );
            await fetchFiles();
            resolve();
          } else {
            let msg = `HTTP ${xhr.status}`;
            try {
              const err = JSON.parse(xhr.responseText);
              if (err.message || err.error) msg = err.message || err.error;
            } catch {}
            setQueue((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? {
                      ...t,
                      status: "error",
                      errorMessage: msg,
                      speedBytesPerSec: 0,
                    }
                  : t
              )
            );
            resolve();
          }
        };

        xhr.onerror = () => {
          setQueue((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    status: "error",
                    errorMessage: "Network error",
                    speedBytesPerSec: 0,
                  }
                : t
            )
          );
          resolve();
        };

        xhr.onabort = () => {
          setQueue((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? { ...t, status: "canceled", speedBytesPerSec: 0 }
                : t
            )
          );
          resolve();
        };

        xhr.send(formData);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setQueue((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: "error", errorMessage: msg, speedBytesPerSec: 0 }
              : t
          )
        );
        resolve();
      }
    });
  };

  // Resumable chunked upload for large files (> 20MB)
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
                  if (timeDiff >= 0.1 || currentTotalLoaded === totalSize) {
                    const bytesDiff =
                      currentTotalLoaded - (task.lastLoaded || start);
                    const instantSpeed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
                    if (instantSpeed > 0) {
                      smoothed =
                        smoothed === 0
                          ? instantSpeed
                          : smoothed * 0.75 + instantSpeed * 0.25;
                      task.smoothedSpeed = smoothed;
                      task.lastTime = now;
                      task.lastLoaded = currentTotalLoaded;
                    }
                  }

                  const remaining = Math.max(0, totalSize - currentTotalLoaded);
                  const eta = smoothed > 0 ? Math.ceil(remaining / smoothed) : 0;
                  const progress = Math.min(
                    99,
                    Math.round((currentTotalLoaded / totalSize) * 100)
                  );

                  const isLastChunkMerging =
                    chunkIndex === totalChunks - 1 && event.loaded >= event.total;
                  const chunkLabel = isLastChunkMerging
                    ? `Stitching on server...`
                    : `Chunk ${chunkIndex + 1}/${totalChunks}`;

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
                            chunkInfo: chunkLabel,
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
                res({
                  ok: false,
                  status: 0,
                  data: "Network error during chunk upload",
                });
              };

              xhr.onabort = () => {
                isAborted = true;
                res({ ok: false, status: 0, aborted: true });
              };

              task.lastTime = performance.now();
              task.lastLoaded = start;
              xhr.open("POST", `${GATEWAY_URL}/api/v1/upload-chunk`);

              const formData = new FormData();
              formData.append("uploadId", uploadId);
              formData.append("chunkIndex", chunkIndex.toString());
              formData.append("totalChunks", totalChunks.toString());
              formData.append("originalName", task.file.name);
              formData.append(
                "mimeType",
                task.file.type || "application/octet-stream"
              );
              formData.append("totalSize", totalSize.toString());
              formData.append("chunk", chunkBlob, task.file.name);

              xhr.send(formData);
            });

            if (result.aborted) {
              isAborted = true;
              fetch(`${GATEWAY_URL}/api/v1/upload-chunk/${uploadId}`, {
                method: "DELETE",
              }).catch(() => {});
              setQueue((prev) =>
                prev.map((t) =>
                  t.id === task.id
                    ? {
                        ...t,
                        status: "canceled",
                        speedBytesPerSec: 0,
                        chunkInfo: undefined,
                      }
                    : t
                )
              );
              resolve();
              return;
            }

            if (result.ok) {
              chunkSuccess = true;
              if (chunkIndex === totalChunks - 1 && result.data) {
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
                await fetchFiles();
                resolve();
                return;
              }
              break;
            } else {
              lastErrorMsg =
                typeof result.data === "string"
                  ? result.data
                  : `HTTP ${result.status}`;
            }
          } catch (err: unknown) {
            lastErrorMsg =
              err instanceof Error ? err.message : "Chunk upload error";
          }
        }

        if (!chunkSuccess && !isAborted) {
          fetch(`${GATEWAY_URL}/api/v1/upload-chunk/${uploadId}`, {
            method: "DELETE",
          }).catch(() => {});
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

  const uploadSingleTask = async (task: UploadTask): Promise<void> => {
    if (task.file.size > CHUNK_SIZE) {
      return uploadChunkedTask(task);
    }
    return uploadDirectTask(task);
  };

  const handleUploadAllSimultaneously = async () => {
    const pendingTasks = queue.filter(
      (t) =>
        t.status === "pending" ||
        t.status === "error" ||
        t.status === "canceled"
    );
    if (!pendingTasks.length) return;

    setIsUploading(true);
    setBatchNotice(
      `Uploading ${pendingTasks.length} files simultaneously in parallel...`
    );

    await Promise.all(pendingTasks.map((task) => uploadSingleTask(task)));

    setIsUploading(false);
    setBatchNotice("All parallel uploads finished!");
    await fetchFiles();
  };

  const handleCancelTask = (id: string) => {
    const item = queue.find((t) => t.id === id);
    if (item && item.xhr) {
      item.xhr.abort();
    }
  };

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
    if (!confirm(`Are you sure you want to delete "${file.original_name}"?`))
      return;
    try {
      const raw = file.relative_path || file.url.replace(/^\/files\/?/, "");
      const pathParam = raw.replace(/^\/+/, "");
      await fetch(`${GATEWAY_URL}/api/v1/files/${pathParam}`, {
        method: "DELETE",
      });
      await fetchFiles();
      if (previewFile?.file_id === file.file_id) {
        setPreviewFile(null);
      }
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };

  const handleDeleteAll = async () => {
    if (!files.length) return;
    if (
      !confirm(
        `Are you sure you want to delete ALL ${files.length} stored files from the media server? This cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeletingAll(true);
    setBatchNotice(`Deleting ${files.length} files from server...`);
    try {
      const filesToDelete = [...files];
      await Promise.allSettled(
        filesToDelete.map((file) => {
          const raw = file.relative_path || file.url.replace(/^\/files\/?/, "");
          const pathParam = raw.replace(/^\/+/, "");
          return fetch(`${GATEWAY_URL}/api/v1/files/${pathParam}`, {
            method: "DELETE",
          });
        })
      );
      setFiles([]);
      try {
        localStorage.removeItem("media_service_files");
      } catch {}
      await fetchFiles();
      setPreviewFile(null);
      setBatchNotice("All stored files removed successfully from media server.");
    } catch (err) {
      console.error("Failed to delete all files:", err);
      setBatchNotice("Error occurred while deleting files.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const copyFileUrl = (file: FileItem) => {
    const fullUrl = `${GATEWAY_URL}${file.url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(file.file_id);
    setTimeout(() => setCopiedId(null), 2000);
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

  // Category counts
  const imagesCount = files.filter((f) => f.category === "images").length;
  const videosCount = files.filter((f) => f.category === "videos").length;
  const documentsCount = files.filter((f) => f.category === "documents").length;
  const othersCount = files.filter(
    (f) => !["images", "videos", "documents"].includes(f.category || "")
  ).length;

  // Queue aggregation
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

  // Filtered & Sorted Files
  const filteredFiles = files
    .filter((f) => {
      const matchesSearch = f.original_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (currentNav === "all" || currentNav === "upload") return matchesSearch;
      if (currentNav === "images") return matchesSearch && f.category === "images";
      if (currentNav === "videos") return matchesSearch && f.category === "videos";
      if (currentNav === "documents")
        return matchesSearch && f.category === "documents";
      if (currentNav === "others")
        return (
          matchesSearch &&
          !["images", "videos", "documents"].includes(f.category || "")
        );
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "size_desc") {
        return b.size_bytes - a.size_bytes;
      }
      if (sortBy === "name_asc") {
        return a.original_name.localeCompare(b.original_name);
      }
      return 0;
    });

  const totalStorageUsed = files.reduce((acc, f) => acc + f.size_bytes, 0);

  return (
    <div className="min-h-screen bg-black bg-dot-grid text-white flex flex-col md:flex-row font-mono">
      {/* 1. Left System Sidebar */}
      <AdminSidebar
        isOpen={isSidebarOpen}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        currentNav={currentNav}
        totalFilesCount={files.length}
        imagesCount={imagesCount}
        videosCount={videosCount}
        documentsCount={documentsCount}
        othersCount={othersCount}
        queueCount={queue.length}
        totalStorageUsed={totalStorageUsed}
        onSwitchTab={switchTab}
        onSyncNow={fetchFiles}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* 2. Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <AdminHeader
          currentNav={currentNav}
          totalFilesCount={files.length}
          activeTabFilesCount={filteredFiles.length}
          queueCount={queue.length}
          imagesCount={imagesCount}
          videosCount={videosCount}
          documentsCount={documentsCount}
          othersCount={othersCount}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onSwitchTab={switchTab}
          onDeleteAll={handleDeleteAll}
          isDeletingAll={isDeletingAll}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Notice Banner */}
        {batchNotice && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-black border border-white/30 text-white text-xs flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <span className="font-bold">[INFO]</span>
              <span>{batchNotice}</span>
            </div>
            <button
              onClick={() => setBatchNotice(null)}
              className="text-white/50 hover:text-white cursor-pointer"
            >
              [X]
            </button>
          </div>
        )}

        {/* Content View */}
        <div className="flex-1 p-6">
          {currentNav === "upload" ? (
            <UploadCenter
              queue={queue}
              isUploading={isUploading}
              completedCount={completedCount}
              totalLoaded={totalLoaded}
              totalBytes={totalBytes}
              aggregateSpeedBytesPerSec={aggregateSpeedBytesPerSec}
              overallProgress={overallProgress}
              onAddFiles={addFilesToQueue}
              onUploadAll={handleUploadAllSimultaneously}
              onCancelAll={handleCancelAll}
              onCancelTask={handleCancelTask}
              onRemoveQueueItem={removeQueueItem}
              onClearQueue={clearQueue}
              onGenerateTestFiles={handleGenerate10TestFiles}
              onBackToLibrary={() => switchTab("all")}
            />
          ) : (
            <div>
              {filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-white/20 rounded-2xl bg-black font-mono">
                  <span className="text-3xl text-white/40 mb-3">[EMPTY]</span>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    No files found in {currentNav.toUpperCase()}
                  </h4>
                  <p className="text-xs text-white/50 mt-1 max-w-sm">
                    {searchQuery
                      ? "No files match your query filter. Try clearing the search."
                      : "No stored media in this category. Upload files to get started."}
                  </p>
                  <button
                    onClick={() => switchTab("upload")}
                    className="mt-5 px-4 py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-white/90 transition-colors cursor-pointer uppercase"
                  >
                    + Go to Upload
                  </button>
                </div>
              ) : viewMode === "grid" ? (
                <MediaGrid
                  files={filteredFiles}
                  copiedId={copiedId}
                  onPreview={(f) => setPreviewFile(f)}
                  onCopyUrl={copyFileUrl}
                  onDelete={handleDelete}
                />
              ) : (
                <MediaTable
                  files={filteredFiles}
                  copiedId={copiedId}
                  onPreview={(f) => setPreviewFile(f)}
                  onCopyUrl={copyFileUrl}
                  onDelete={handleDelete}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. High-Resolution Preview Modal */}
      <PreviewModal
        previewFile={previewFile}
        copiedId={copiedId}
        onClose={() => setPreviewFile(null)}
        onCopyUrl={copyFileUrl}
        onDelete={handleDelete}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center text-sm">
          [LOADING_ADMIN_CONSOLE...]
        </div>
      }
    >
      <MediaAdminDashboard />
    </Suspense>
  );
}
