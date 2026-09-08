"use client";

import React, { useState, useEffect, useRef } from "react";
import { GATEWAY_URL } from "../lib/utils";

export interface ApiLogItem {
  id: string;
  timestamp: string;
  method: "GET" | "POST" | "DELETE";
  endpoint: string;
  status: number | "PENDING";
  durationMs?: number;
  details?: string;
  type: "info" | "success" | "warn" | "error";
}

// Global log listener for real-time interception
type LogListener = (item: ApiLogItem) => void;
const listeners: Set<LogListener> = new Set();

export function addApiLog(item: Omit<ApiLogItem, "id" | "timestamp">) {
  const logItem: ApiLogItem = {
    ...item,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toLocaleTimeString(),
  };

  // Also print nicely in the browser Developer Console
  const badgeColor =
    item.status === "PENDING"
      ? "#eab308"
      : typeof item.status === "number" && item.status < 400
      ? "#22c55e"
      : "#ef4444";

  console.log(
    `%c[ASP.NET Core]%c ${item.method} ${item.endpoint} %c[${item.status}]%c ${item.durationMs ? `${item.durationMs}ms` : ""}`,
    "background: #7c3aed; color: white; padding: 2px 5px; border-radius: 3px; font-weight: bold;",
    "color: white; font-weight: bold;",
    `background: ${badgeColor}; color: black; padding: 2px 4px; border-radius: 2px; font-weight: bold;`,
    "color: #9ca3af;",
    item.details || ""
  );

  listeners.forEach((listener) => listener(logItem));
}

export default function ApiLogDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<ApiLogItem[]>([]);
  const [filter, setFilter] = useState<"ALL" | "GET" | "POST" | "DELETE">("ALL");
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleNewLog = (newLog: ApiLogItem) => {
      setLogs((prev) => [newLog, ...prev.slice(0, 99)]); // keep last 100 entries
    };

    listeners.add(handleNewLog);
    return () => {
      listeners.delete(handleNewLog);
    };
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filter === "ALL") return true;
    return log.method === filter;
  });

  return (
    <div className="fixed bottom-4 right-4 z-40 font-mono select-none">
      {/* Drawer Panel */}
      {isOpen && (
        <div className="mb-2 w-[340px] sm:w-[500px] max-h-[460px] bg-black/95 border border-white/30 rounded-xl shadow-2xl flex flex-col backdrop-blur-md overflow-hidden text-xs">
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-white/5 border-b border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold text-white tracking-wider">ASP.NET Core Live Logs</span>
              <span className="text-[10px] text-white/50 bg-white/10 px-1.5 py-0.5 rounded">
                net10.0
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLogs([])}
                className="text-white/40 hover:text-white text-[10px] uppercase px-1.5 py-0.5 rounded border border-white/10 hover:border-white/40 cursor-pointer"
                title="Clear logs"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/60 hover:text-white px-1 font-bold cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Target Host Info */}
          <div className="px-3.5 py-1.5 bg-white/[0.02] border-b border-white/10 text-[10px] text-white/60 flex items-center justify-between">
            <span>Target Gateway:</span>
            <code className="text-pink-400 bg-white/5 px-1 py-0.5 rounded">{GATEWAY_URL}</code>
          </div>

          {/* Filter Bar */}
          <div className="px-3 py-1.5 border-b border-white/10 flex items-center gap-1.5 text-[10px]">
            <span className="text-white/40">FILTER:</span>
            {(["ALL", "GET", "POST", "DELETE"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  filter === f
                    ? "bg-white text-black font-bold"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
            <span className="ml-auto text-white/40 text-[10px]">
              {filteredLogs.length} events
            </span>
          </div>

          {/* Log List */}
          <div
            ref={logContainerRef}
            className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[300px]"
          >
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-white/30 text-[11px]">
                No API activity recorded yet.
                <br />
                Perform an upload, list, or delete to see live ASP.NET Core interactions.
              </div>
            ) : (
              filteredLogs.map((item) => {
                const methodColor =
                  item.method === "GET"
                    ? "text-sky-400 border-sky-400/40 bg-sky-400/10"
                    : item.method === "POST"
                    ? "text-emerald-400 border-emerald-400/40 bg-emerald-400/10"
                    : "text-rose-400 border-rose-400/40 bg-rose-400/10";

                const statusColor =
                  item.status === "PENDING"
                    ? "text-amber-400 bg-amber-400/10"
                    : typeof item.status === "number" && item.status < 400
                    ? "text-emerald-400 bg-emerald-400/10"
                    : "text-rose-400 bg-rose-400/10";

                return (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all font-mono text-[11px]"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${methodColor}`}
                        >
                          {item.method}
                        </span>
                        <span className="text-white font-medium truncate max-w-[240px]">
                          {item.endpoint}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.durationMs !== undefined && (
                          <span className="text-[10px] text-white/40">
                            {item.durationMs}ms
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${statusColor}`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>

                    {item.details && (
                      <p className="text-[10px] text-white/60 break-all pl-1 border-l-2 border-white/20 mt-1">
                        {item.details}
                      </p>
                    )}

                    <div className="text-[9px] text-white/30 text-right mt-1">
                      {item.timestamp}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Floating Launcher Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-2 bg-black border border-white/30 hover:border-white text-white rounded-full shadow-lg hover:shadow-white/10 transition-all cursor-pointer text-xs"
        title="Toggle ASP.NET Core Live Request Logs"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="font-bold tracking-wide">ASP.NET LOGS</span>
        {logs.length > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[10px] font-black">
            {logs.length}
          </span>
        )}
      </button>
    </div>
  );
}
