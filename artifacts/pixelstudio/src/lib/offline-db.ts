/**
 * offline-db.ts — IndexedDB wrapper for PixelStudio offline support
 *
 * Database : "pixelstudio_offline"  version 1
 * Store    : "sync_queue"
 *   keyPath  : "id"
 *   indexes  : status, createdAt
 *
 * Each SyncEntry represents one pending write operation (e.g. createClient)
 * that could not be sent to the server while offline.  The sync engine
 * replays these entries when connectivity is restored.
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncOperation = "createClient";

export interface SyncEntry {
  /** Local temporary ID — e.g. "local_1710000000000" */
  id:         string;
  type:       SyncOperation;
  /** API-ready payload (backend field names / UPPERCASE enums). */
  payload:    Record<string, unknown>;
  /** A snapshot of the AppClient shown in the UI while the entry is pending. */
  localData:  Record<string, unknown>;
  status:     "pending" | "syncing" | "done" | "failed";
  error?:     string;
  createdAt:  number; // unix ms
  syncedAt?:  number; // unix ms — set on success
}

interface PixelStudioDB extends DBSchema {
  sync_queue: {
    key:     string;
    value:   SyncEntry;
    indexes: { status: SyncEntry["status"]; createdAt: number };
  };
}

// ─── Singleton connection ─────────────────────────────────────────────────────

let _db: IDBPDatabase<PixelStudioDB> | null = null;

async function getDb(): Promise<IDBPDatabase<PixelStudioDB>> {
  if (_db) return _db;
  _db = await openDB<PixelStudioDB>("pixelstudio_offline", 1, {
    upgrade(db) {
      const store = db.createObjectStore("sync_queue", { keyPath: "id" });
      store.createIndex("status",    "status");
      store.createIndex("createdAt", "createdAt");
    },
  });
  return _db;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Add or overwrite a sync queue entry. */
export async function putSyncEntry(entry: SyncEntry): Promise<void> {
  const db = await getDb();
  await db.put("sync_queue", entry);
}

/** Return all entries whose status is "pending", oldest first. */
export async function getPendingEntries(): Promise<SyncEntry[]> {
  const db  = await getDb();
  const all = await db.getAllFromIndex("sync_queue", "status", "pending");
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

/** Patch a subset of fields on an existing entry. No-ops if id not found. */
export async function patchSyncEntry(
  id:      string,
  updates: Partial<SyncEntry>,
): Promise<void> {
  const db       = await getDb();
  const existing = await db.get("sync_queue", id);
  if (!existing) return;
  await db.put("sync_queue", { ...existing, ...updates });
}

/** Return every entry regardless of status. */
export async function getAllSyncEntries(): Promise<SyncEntry[]> {
  const db = await getDb();
  return db.getAll("sync_queue");
}

/** Delete entries that have been successfully synced to the server. */
export async function clearDoneEntries(): Promise<void> {
  const db   = await getDb();
  const done = await db.getAllFromIndex("sync_queue", "status", "done");
  const tx   = db.transaction("sync_queue", "readwrite");
  await Promise.all(done.map(e => tx.store.delete(e.id)));
  await tx.done;
}

/** Count entries by status. */
export async function countByStatus(
  status: SyncEntry["status"],
): Promise<number> {
  const db = await getDb();
  return db.countFromIndex("sync_queue", "status", status);
}
