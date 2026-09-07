"use client";

import React, { useState, useRef, useEffect } from "react";
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
  onOpenMobileMenu?: () => void;
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
  onOpenMobileMenu,
}: AdminHeaderProps) {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSortOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const sortOptions: { id: SortOption; label: string; tag: string }[] = [
    { id: "newest", label: "NEWEST FIRST", tag: "NEWEST" },
    { id: "oldest", label: "OLDEST FIRST", tag: "OLDEST" },
    { id: "size_desc", label: "SIZE: LARGE TO SMALL", tag: "SIZE DESC" },
    { id: "name_asc", label: "NAME: A TO Z", tag: "NAME ASC" },
  ];

  const currentSortObj = sortOptions.find((s) => s.id === sortBy) || sortOptions[0];

  const categoryLabels: Record<NavTab, string> = {
    all: "ALL FILES",
    images: "IMAGES",
    videos: "VIDEOS",
    documents: "DOCS",
    others: "OTHERS",
    upload: "UPLOAD QUEUE",
  };

  return (
    <header className="border-b border-white/20 bg-black sticky top-0 z-20 flex flex-col font-mono">
      {/* Top Header Row */}
      <div className="px-6 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Brand, Online Status & Active Filter Indicator */}
        <div className="flex items-center justify-between lg:justify-start gap-3 w-full lg:w-auto shrink-0 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded border border-white flex items-center justify-center font-black text-xs bg-white text-black">
                M
              </span>
              <span className="text-sm font-bold tracking-widest text-white uppercase">
                MEDIAFILE.ADMIN
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-white/60 border border-white/20 px-2 py-0.5 rounded">
              <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
              ONLINE
            </div>
          </div>

          {/* Mobile Menu Button (Positioned on the far Right) */}
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="md:hidden h-7 w-7 rounded border border-white/30 hover:border-white text-white text-xs font-bold flex items-center justify-center motion-smooth cursor-pointer bg-white/5 hover:bg-white hover:text-black ml-auto"
              title="Open Navigation Menu"
            >
              ≡
            </button>
          )}

          {/* Active Category Filter Tag (selected from Left Sidebar) */}
          <div className="flex items-center gap-1.5 text-xs w-full sm:w-auto mt-1 lg:mt-0">
            <span className="text-white/40 text-[10px]">CATEGORY:</span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors motion-smooth ${
                currentNav === "upload"
                  ? "bg-pink-500/20 text-pink-300 border-pink-500/40"
                  : "bg-white/10 text-white border-white/20"
              }`}
            >
              {categoryLabels[currentNav]} ({activeTabFilesCount})
            </span>
            {currentNav !== "all" && (
              <button
                onClick={() => onSwitchTab("all")}
                className="text-white/50 hover:text-white px-1.5 py-0.5 rounded border border-white/20 hover:border-white text-[10px] motion-smooth cursor-pointer"
                title="Reset filter to ALL FILES"
              >
                RESET [×]
              </button>
            )}
          </div>
        </div>

        {/* Right: Search, Custom Sort Dropdown, View Toggle & Actions (2 Rows on Mobile, 1 Row on Desktop) */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 w-full lg:w-auto">
          {/* Row 1 on mobile: Search Input + Custom Sort Dropdown */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 lg:flex-none">
              <input
                type="text"
                placeholder="[SEARCH_NAME]..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (currentNav === "upload") {
                    onSwitchTab("all");
                  }
                }}
                className="bg-black border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white w-full lg:w-52"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1.5 text-white/50 hover:text-white text-xs cursor-pointer"
                >
                  X
                </button>
              )}
            </div>

            {/* Custom Sort Dropdown */}
            <div className="relative shrink-0" ref={sortRef}>
              <button
                type="button"
                onClick={() => {
                  setIsSortOpen((prev) => !prev);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors motion-smooth cursor-pointer select-none ${
                  isSortOpen
                    ? "border-white bg-white/10 text-white"
                    : "border-white/20 bg-black text-white hover:border-white/50"
                }`}
              >
                <span className="text-white/40 text-[10px] uppercase tracking-wider">SORT:</span>
                <span className="font-bold tracking-wide">{currentSortObj.tag}</span>
                <span
                  className={`text-[8px] text-white/60 transition-transform motion-smooth ${
                    isSortOpen ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </button>

              {/* Dropdown Popover */}
              {isSortOpen && (
                <div className="absolute right-0 mt-1.5 w-56 bg-black border border-white/30 rounded-lg py-1.5 z-50 animate-cinematic-modal select-none">
                  <div className="px-3 py-1 text-[10px] text-white/40 border-b border-white/10 uppercase tracking-wider">
                    // SORT ORDER
                  </div>
                  <div className="py-1">
                    {sortOptions.map((opt) => {
                      const isActive = sortBy === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setSortBy(opt.id);
                            setIsSortOpen(false);
                          }}
                          className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors motion-smooth cursor-pointer ${
                            isActive
                              ? "bg-white text-black font-bold"
                              : "text-white/80 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] opacity-70">
                              {isActive ? "●" : "○"}
                            </span>
                            <span>{opt.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 2 on mobile: Grid/List View Toggle + Actions (Upload & Delete All) */}
          <div className="flex items-center justify-between lg:justify-start gap-2 w-full lg:w-auto">
            {/* View Toggle (Grid vs List) */}
            <div className="flex items-center border border-white/20 rounded-lg p-0.5 bg-black text-xs shrink-0">
              <button
                onClick={() => {
                  setViewMode("grid");
                  if (currentNav === "upload") onSwitchTab("all");
                }}
                className={`px-2.5 py-1 rounded text-xs transition-colors motion-smooth cursor-pointer ${
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
                className={`px-2.5 py-1 rounded text-xs transition-colors motion-smooth cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white text-black font-bold"
                    : "text-white/60 hover:text-white"
                }`}
                title="Table List View"
              >
                [LIST]
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Upload Shortcut Button with Pink Accent */}
              <button
                onClick={() => onSwitchTab("upload")}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors motion-smooth cursor-pointer ${
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
                  className="py-1.5 px-2.5 rounded-lg border border-white/30 hover:bg-white hover:text-black text-white text-xs flex items-center gap-1.5 transition-colors motion-smooth cursor-pointer disabled:opacity-40"
                  title="Delete all stored files"
                >
                  {isDeletingAll ? "[DELETING...]" : "[DELETE ALL]"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

