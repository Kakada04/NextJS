"use client";

import React from "react";
import { formatBytes } from "../lib/utils";

interface AdminSidebarProps {
  isOpen: boolean;
  totalStorageUsed: number;
  totalFilesCount: number;
  onSyncNow: () => void;
  onToggle: () => void;
}

export default function AdminSidebar({
  isOpen,
  totalStorageUsed,
  totalFilesCount,
  onSyncNow,
  onToggle,
}: AdminSidebarProps) {
  return (
    <aside
      className={`${
        isOpen ? "w-full md:w-64" : "hidden md:flex md:w-16"
      } bg-black border-r border-white/20 flex flex-col shrink-0 motion-smooth z-30 font-mono`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-white/20 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded border border-white flex items-center justify-center font-bold text-xs bg-white text-black shrink-0">
            FS
          </div>
          {isOpen && (
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-white tracking-widest uppercase truncate">
                SYS.STORAGE
              </h2>
              <span className="text-[10px] text-white/50">AWS EBS nvme</span>
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

      {/* Storage Information & Actions */}
      <div className="flex-1 p-4 flex flex-col gap-4">
        {isOpen ? (
          <>
            <div className="p-3.5 rounded-xl border border-white/20 bg-black flex flex-col gap-2">
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
              <div className="flex items-center justify-between text-[10px] text-white/40 mt-1">
                <span>8.0 GB NVME</span>
                <span>{totalFilesCount} FILES</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-white/20 bg-black flex flex-col gap-2 text-xs">
              <span className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
                STATUS
              </span>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Backend:</span>
                <span className="text-white font-bold">Go (Gin)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Daemon:</span>
                <span className="text-white font-bold">Systemd</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Tunnel:</span>
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
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <span className="text-[10px] text-white/50">
              DISK
            </span>
            <button
              onClick={onSyncNow}
              className="h-8 w-8 rounded border border-white/20 hover:border-white text-white flex items-center justify-center text-xs motion-smooth cursor-pointer"
              title="Sync files"
            >
              R
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
