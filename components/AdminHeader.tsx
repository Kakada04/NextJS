"use client";

import React from "react";
import { NavTab, ViewMode, SortOption } from "../types/media";

interface AdminHeaderProps {
  currentNav: NavTab;
  totalFilesCount: number;
  activeTabFilesCount: number;
  queueCount: number;
  imagesCount: number;
  videosCount: number;
  documentsCount: number;
  othersCount: number;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  sortBy: SortOption;
  setSortBy: (val: SortOption) => void;
  viewMode: ViewMode;
  setViewMode: (val: ViewMode) => void;
  onSwitchTab: (tab: NavTab) => void;
  onDeleteAll: () => void;
  isDeletingAll: boolean;
}

export default function AdminHeader({
  currentNav,
  totalFilesCount,
  activeTabFilesCount,
  queueCount,
  imagesCount,
  videosCount,
  documentsCount,
  othersCount,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  onSwitchTab,
  onDeleteAll,
  isDeletingAll,
}: AdminHeaderProps) {
  const navTabs: { id: NavTab; label: string; count: number }[] = [
    { id: "all", label: "ALL", count: totalFilesCount },
    { id: "images", label: "IMAGES", count: imagesCount },
    { id: "videos", label: "VIDEOS", count: videosCount },
    { id: "documents", label: "DOCS", count: documentsCount },
    { id: "others", label: "OTHERS", count: othersCount },
    { id: "upload", label: "UPLOAD", count: queueCount },
  ];

  return (
    <header className="border-b border-white/20 bg-black sticky top-0 z-20 flex flex-col">
      {/* Top Header Row */}
      <div className="px-6 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/10">
        {/* Brand & Active Status */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded border border-white flex items-center justify-center font-mono font-black text-xs bg-white text-black">
              M
            </span>
            <span className="text-sm font-bold tracking-widest text-white uppercase font-mono">
              MEDIAFILE.ADMIN
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/60 border border-white/20 px-2 py-0.5 rounded">
            <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
            ONLINE
          </div>
        </div>

        {/* Search, Sort, View Toggle & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <input
              type="text"
              placeholder="[FILTER_NAME]..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (currentNav === "upload") {
                  onSwitchTab("all");
                }
              }}
              className="bg-black border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white w-44 sm:w-56 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1.5 text-white/50 hover:text-white text-xs font-mono"
              >
                X
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-black border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white cursor-pointer font-mono"
          >
            <option value="newest">SORT: NEWEST</option>
            <option value="oldest">SORT: OLDEST</option>
            <option value="size_desc">SORT: SIZE DESC</option>
            <option value="name_asc">SORT: NAME ASC</option>
          </select>

          {/* View Toggle (Grid vs List) */}
          <div className="flex items-center border border-white/20 rounded-lg p-0.5 bg-black font-mono text-xs">
            <button
              onClick={() => {
                setViewMode("grid");
                if (currentNav === "upload") onSwitchTab("all");
              }}
              className={`px-2 py-1 rounded text-xs transition-colors motion-smooth cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white text-black font-bold"
                  : "text-white/60 hover:text-white"
              }`}
              title="Grid View"
            >
              [GRID]
            </button>
            <button
              onClick={() => {
                setViewMode("list");
                if (currentNav === "upload") onSwitchTab("all");
              }}
              className={`px-2 py-1 rounded text-xs transition-colors motion-smooth cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-black font-bold"
                  : "text-white/60 hover:text-white"
              }`}
              title="Table List View"
            >
              [LIST]
            </button>
          </div>

          {/* Upload Shortcut Button with Pink Accent */}
          <button
            onClick={() => onSwitchTab("upload")}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-colors motion-smooth cursor-pointer ${
              currentNav === "upload"
                ? "bg-pink-500 text-white border border-pink-400 font-bold"
                : "bg-pink-600/20 text-pink-400 border border-pink-500/40 hover:bg-pink-600 hover:text-white"
            }`}
          >
            + UPLOAD
          </button>

          {/* Delete All Button */}
          {totalFilesCount > 0 && (
            <button
              onClick={onDeleteAll}
              disabled={isDeletingAll}
              className="py-1.5 px-2.5 rounded-lg border border-white/30 hover:bg-white hover:text-black text-white text-xs font-mono flex items-center gap-1.5 transition-colors motion-smooth cursor-pointer disabled:opacity-40"
              title="Delete all stored files"
            >
              {isDeletingAll ? "[DELETING...]" : "[DELETE ALL]"}
            </button>
          )}
        </div>
      </div>

      {/* Category Tab Menu Bar (Moved From Sidebar to Header) */}
      <div className="px-6 py-2 bg-black flex items-center gap-1.5 overflow-x-auto select-none border-t border-white/5">
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest mr-2 shrink-0">
          TABS:
        </span>
        {navTabs.map((tab) => {
          const isActive = currentNav === tab.id;
          const isUpload = tab.id === "upload";

          return (
            <button
              key={tab.id}
              onClick={() => onSwitchTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors motion-smooth cursor-pointer shrink-0 ${
                isActive
                  ? isUpload
                    ? "bg-pink-500 text-white font-bold border border-pink-400"
                    : "bg-white text-black font-bold border border-white"
                  : isUpload
                  ? "text-pink-400 border border-pink-500/40 bg-pink-950/20 hover:bg-pink-900/40 hover:text-pink-300"
                  : "text-white/60 hover:text-white border border-white/20 hover:border-white/40 bg-black"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1 rounded motion-smooth ${
                  isActive
                    ? isUpload
                      ? "bg-black text-pink-300 font-mono"
                      : "bg-black text-white font-mono"
                    : isUpload
                    ? "bg-pink-500/20 text-pink-300"
                    : "bg-white/10 text-white/70"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
