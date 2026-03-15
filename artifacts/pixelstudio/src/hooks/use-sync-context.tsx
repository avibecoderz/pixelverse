/**
 * use-sync-context.tsx — Global sync state for PixelStudio
 *
 * Provides:
 *   isOnline      — live network status
 *   pendingCount  — number of operations waiting to be synced
 *   syncStatus    — "idle" | "syncing" | "done" | "error"
 *   lastError     — error message from the last failed sync attempt
 *   triggerSync() — manually kick off a sync pass
 *
 * Auto-sync behaviour:
 *   When the browser fires the "online" event (i.e. connectivity restored),
 *   we wait 800 ms to let the network stabilise, then trigger sync automatically.
 *
 * Usage:
 *   // In App.tsx — wrap once at the root:
 *   <SyncProvider><App /></SyncProvider>
 *
 *   // In any component:
 *   const { isOnline, pendingCount, syncStatus, triggerSync } = useSyncContext();
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  getPendingEntries,
  patchSyncEntry,
  clearDoneEntries,
  countByStatus,
} from "@/lib/offline-db";
import { createClient } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncStatus = "idle" | "syncing" | "done" | "error";

interface SyncContextValue {
  isOnline:    boolean;
  pendingCount: number;
  syncStatus:  SyncStatus;
  lastError:   string | null;
  triggerSync: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SyncContext = createContext<SyncContextValue>({
  isOnline:    true,
  pendingCount: 0,
  syncStatus:  "idle",
  lastError:   null,
  triggerSync: async () => {},
  refreshPendingCount: async () => {},
});

export function useSyncContext(): SyncContextValue {
  return useContext(SyncContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const qc             = useQueryClient();
  const [isOnline,      setIsOnline]      = useState(navigator.onLine);
  const [pendingCount,  setPendingCount]  = useState(0);
  const [syncStatus,    setSyncStatus]    = useState<SyncStatus>("idle");
  const [lastError,     setLastError]     = useState<string | null>(null);
  const syncLock = useRef(false); // prevent concurrent sync runs
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Count helper ────────────────────────────────────────────────────────────
  const refreshPendingCount = useCallback(async () => {
    const n = await countByStatus("pending");
    setPendingCount(n);
  }, []);

  // ── Sync logic ───────────────────────────────────────────────────────────────
  const triggerSync = useCallback(async () => {
    if (syncLock.current || !navigator.onLine) return;
    syncLock.current = true;
    setSyncStatus("syncing");
    setLastError(null);

    try {
      const pending = await getPendingEntries();
      if (pending.length === 0) {
        setSyncStatus("idle");
        syncLock.current = false;
        return;
      }

      let anyFailed = false;

      for (const entry of pending) {
        await patchSyncEntry(entry.id, { status: "syncing" });

        try {
          if (entry.type === "createClient") {
            const p = entry.payload as {
              clientName:  string;
              phone:       string;
              price:       number;
              photoFormat: "SOFTCOPY" | "HARDCOPY" | "BOTH";
              notes:       string;
            };
            await createClient({
              clientName:  p.clientName,
              phone:       p.phone,
              price:       p.price,
              photoFormat: p.photoFormat,
              notes:       p.notes,
            });
          }

          await patchSyncEntry(entry.id, {
            status:   "done",
            syncedAt: Date.now(),
          });
        } catch (err: unknown) {
          anyFailed = true;
          const msg = err instanceof Error ? err.message : "Unknown error";
          // Mark failed but keep as "pending" so it retries next time
          await patchSyncEntry(entry.id, { status: "pending", error: msg });
        }
      }

      // Refresh server data so the client list reflects synced records
      await qc.invalidateQueries({ queryKey: ["clients"] });
      // Clean up successfully synced entries
      await clearDoneEntries();
      await refreshPendingCount();

      if (anyFailed) {
        const failedMsg = "Some records couldn't sync. Will retry when online.";
        setSyncStatus("error");
        setLastError(failedMsg);
      } else {
        setSyncStatus("done");
        // Auto-reset "done" back to "idle" after 3 s
        if (doneTimer.current) clearTimeout(doneTimer.current);
        doneTimer.current = setTimeout(() => setSyncStatus("idle"), 3000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      setSyncStatus("error");
      setLastError(msg);
    } finally {
      syncLock.current = false;
    }
  }, [qc, refreshPendingCount]);

  // ── Online / offline listeners ───────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Wait 800 ms for the network to stabilise before syncing
      setTimeout(() => triggerSync(), 800);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus("idle"); // Clear any in-progress indicator
    };

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);

    // Seed the pending count on mount
    refreshPendingCount();

    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (doneTimer.current) clearTimeout(doneTimer.current);
    };
  }, [triggerSync, refreshPendingCount]);

  return (
    <SyncContext.Provider value={{
      isOnline,
      pendingCount,
      syncStatus,
      lastError,
      triggerSync,
      refreshPendingCount,
    }}>
      {children}
    </SyncContext.Provider>
  );
}
