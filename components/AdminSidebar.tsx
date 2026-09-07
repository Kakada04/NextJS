"use client";

import React from "react";
import { NavTab } from "../types/media";
import { formatBytes } from "../lib/utils";

interface AdminSidebarProps {
  isOpen: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  currentNav: NavTab;
  totalFilesCount: number;
  imagesCount: number;
  videosCount: number;
  documentsCount: number;
  othersCount: number;
  queueCount: number;
  totalStorageUsed: number;
  onSwitchTab: (tab: NavTab) => void;
  onSyncNow: () => void;
  onToggle: () => void;
}

export default function AdminSidebar({
  isOpen,
  isMobileOpen = false,
  onCloseMobile,
  currentNav,
  totalFilesCount,
  imagesCount,
  videosCount,
  documentsCount,
  othersCount,
  queueCount,
  totalStorageUsed,
  onSwitchTab,
  onSyncNow,
  onToggle,
}: AdminSidebarProps) {
  const navTabs: { id: NavTab; label: string; tag: string; count: number }[] = [
    { id: "all", label: "ALL FILES", tag: "ALL", count: totalFilesCount },
    { id: "images", label: "IMAGES", tag: "IMG", count: imagesCount },
    { id: "videos", label: "VIDEOS", tag: "VID", count: videosCount },
    { id: "documents", label: "DOCUMENTS", tag: "DOC", count: documentsCount },
    { id: "others", label: "OTHERS", tag: "ETC", count: othersCount },
    { id: "upload", label: "UPLOAD QUEUE", tag: "UPL", count: queueCount },
  ];

  return (
    <>
      {/* 1. Desktop Sidebar (Hidden on mobile < md) */}
      <aside
        className={`hidden md:flex ${
          isOpen ? "md:w-64" : "md:w-16"
        } bg-black border-r border-white/20 flex-col shrink-0 motion-smooth z-30 font-mono`}
      >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-white/20 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded border border-white flex items-center justify-center font-bold text-xs bg-white text-black shrink-0">
            M
          </div>
          {isOpen && (
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-white tracking-widest uppercase truncate">
                MEDIA.ADMIN
              </h2>
              <span className="text-[10px] text-white/50">Storage Control</span>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="text-white/60 hover:text-white p-1 rounded border border-white/20 hover:border-white text-xs hidden md:block cursor-pointer"
          title="Toggle sidebar"
        >
          {isOpen ? "[<]" : "[>]"}
        </button>
      </div>

      {/* Navigation & Storage Info */}
      <div className="flex-1 p-3 flex flex-col gap-4 overflow-y-auto">
        {isOpen ? (
          <>
            {/* Category Filter Navigation */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold px-2 py-1">
                // CATEGORY FILTER
              </span>
              {navTabs.map((tab) => {
                const isActive = currentNav === tab.id;
                const isUpload = tab.id === "upload";

                return (
                  <button
                    key={tab.id}
                    onClick={() => onSwitchTab(tab.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-colors motion-smooth cursor-pointer ${
                      isActive
                        ? isUpload
                          ? "bg-pink-500 text-white font-bold border border-pink-400"
                          : "bg-white text-black font-bold border border-white"
                        : isUpload
                        ? "text-pink-400 border border-pink-500/30 bg-pink-950/20 hover:bg-pink-950/40 hover:text-pink-300 hover:border-pink-500/60"
                        : "text-white/70 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] opacity-60">
                        {isActive ? "●" : "○"}
                      </span>
                      <span>{tab.label}</span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isActive
                          ? isUpload
                            ? "bg-black text-pink-300 font-mono"
                            : "bg-black text-white font-mono"
                          : isUpload
                          ? "bg-pink-500/20 text-pink-300"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Storage Info Card */}
            <div className="p-3 rounded-xl border border-white/20 bg-black flex flex-col gap-2 mt-auto">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">DISK USED:</span>
                <span className="text-white font-bold">
                  {formatBytes(totalStorageUsed)}
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-white h-1.5 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((totalStorageUsed / (8 * 1024 * 1024 * 1024)) * 100)
                    )}%`,
                  }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-white/40 mt-0.5">
                <span>8.0 GB NVME</span>
                <span>{totalFilesCount} FILES</span>
              </div>
            </div>

            {/* Server Status */}
            <div className="p-3 rounded-xl border border-white/20 bg-black flex flex-col gap-1.5 text-xs">
              <span className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
                SYSTEM
              </span>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/60">Backend:</span>
                <span className="text-white font-bold">Go Standalone</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/60">Daemon:</span>
                <span className="text-white font-bold">Systemd</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/60">Tunnel:</span>
                <span className="text-white font-bold">Cloudflare</span>
              </div>
            </div>

            <button
              onClick={onSyncNow}
              className="py-2 px-3 rounded-lg border border-white/30 text-white hover:bg-white hover:text-black text-xs font-bold transition-colors motion-smooth cursor-pointer text-center"
            >
              [REFRESH FILES]
            </button>
          </>
        ) : (
          /* Collapsed Mini Sidebar */
          <div className="flex flex-col items-center gap-2 py-2">
            {navTabs.map((tab) => {
              const isActive = currentNav === tab.id;
              const isUpload = tab.id === "upload";

              return (
                <button
                  key={tab.id}
                  onClick={() => onSwitchTab(tab.id)}
                  className={`h-9 w-9 rounded-lg flex items-center justify-center text-[10px] font-bold motion-smooth cursor-pointer ${
                    isActive
                      ? isUpload
                        ? "bg-pink-500 text-white border border-pink-400"
                        : "bg-white text-black border border-white"
                      : isUpload
                      ? "text-pink-400 border border-pink-500/30 bg-pink-950/20 hover:bg-pink-900/40"
                      : "text-white/70 hover:text-white hover:bg-white/10 border border-white/20"
                  }`}
                  title={`${tab.label} (${tab.count})`}
                >
                  {tab.tag}
                </button>
              );
            })}

            <div className="w-6 border-t border-white/20 my-2"></div>

            <button
              onClick={onSyncNow}
              className="h-9 w-9 rounded-lg border border-white/20 hover:border-white text-white flex items-center justify-center text-[11px] font-bold motion-smooth cursor-pointer"
              title="Refresh files"
            >
              ↻
            </button>
          </div>
        )}
      </div>
    </aside>

    {/* 2. Mobile Menu Modal (Visible only on mobile when isMobileOpen is true) */}
    {isMobileOpen && (
      <div className="fixed inset-0 z-50 md:hidden flex">
        {/* Backdrop overlay */}
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/85 backdrop-blur-xs transition-opacity motion-smooth animate-cinematic-fade cursor-pointer"
        />

        {/* Modal Drawer Panel (Smooth 24fps slide in from left) */}
        <div className="relative w-4/5 max-w-xs bg-black bg-dot-grid border-r border-white/20 h-full flex flex-col z-50 p-4 animate-cinematic-slide-left font-mono text-white overflow-y-auto">
          {/* Modal Header */}
          <div className="pb-3 border-b border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded border border-white flex items-center justify-center font-black text-xs bg-white text-black shrink-0">
                M
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-widest uppercase">
                  MEDIA.ADMIN
                </h3>
                <span className="text-[10px] text-white/50">Mobile Navigation</span>
              </div>
            </div>
            <button
              onClick={onCloseMobile}
              className="h-8 w-8 rounded border border-white/30 hover:border-white text-white flex items-center justify-center text-xs motion-smooth cursor-pointer"
              title="Close menu"
            >
              ✕
            </button>
          </div>

          {/* Category Filter Navigation */}
          <div className="py-4 flex flex-col gap-1.5">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold px-2">
              // CATEGORY FILTER
            </span>
            {navTabs.map((tab) => {
              const isActive = currentNav === tab.id;
              const isUpload = tab.id === "upload";

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onSwitchTab(tab.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-colors motion-smooth cursor-pointer ${
                    isActive
                      ? isUpload
                        ? "bg-pink-500 text-white font-bold border border-pink-400"
                        : "bg-white text-black font-bold border border-white"
                      : isUpload
                      ? "text-pink-400 border border-pink-500/30 bg-pink-950/20 hover:bg-pink-950/40"
                      : "text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] opacity-70">
                      {isActive ? "●" : "○"}
                    </span>
                    <span className="font-bold">{tab.label}</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      isActive
                        ? isUpload
                          ? "bg-black text-pink-300"
                          : "bg-black text-white"
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

          {/* Storage and System Info */}
          <div className="mt-auto pt-4 flex flex-col gap-3 border-t border-white/10">
            <div className="p-3 rounded-xl border border-white/20 bg-black flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">DISK USED:</span>
                <span className="text-white font-bold">
                  {formatBytes(totalStorageUsed)}
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-white h-1.5 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((totalStorageUsed / (8 * 1024 * 1024 * 1024)) * 100)
                    )}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-white/40">
                <span>8.0 GB NVME</span>
                <span>{totalFilesCount} FILES</span>
              </div>
            </div>

            <button
              onClick={() => {
                onSyncNow();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full py-2.5 px-3 rounded-lg border border-white/30 text-white hover:bg-white hover:text-black text-xs font-bold transition-colors motion-smooth cursor-pointer text-center"
            >
              [REFRESH FILES]
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}

