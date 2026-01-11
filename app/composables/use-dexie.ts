import type { NostrEvent, MetaEntry, PendingSync } from "~/db/db";
import { db } from "~/db/db";

export function useDexie() {
  const events = ref<NostrEvent[]>([]);
  const meta = ref<MetaEntry[]>([]);
  const pending = ref<PendingSync[]>([]);

  // Load events by kind
  async function loadEvents(kind: number) {
    events.value = await db.events.where("kind").equals(kind).toArray();
  }

  // Add encrypted event
  async function addEvent(event: NostrEvent) {
    await db.events.put(event);
  }

  // Load meta by type
  async function loadMeta(type: "category" | "unit" | "term") {
    meta.value = await db.meta.where("type").equals(type).toArray();
  }

  // Add meta entry
  async function addMeta(entry: MetaEntry) {
    await db.meta.put(entry);
  }

  // Load pending sync queue
  async function loadPending() {
    pending.value = await db.pendingSync
      .where("status")
      .equals("pending")
      .toArray();
  }

  // Add to pending sync
  async function queueSync(event: NostrEvent) {
    await db.pendingSync.add({ event, status: "pending" });
  }

  return {
    events,
    meta,
    pending,
    loadEvents,
    addEvent,
    loadMeta,
    addMeta,
    loadPending,
    queueSync,
  };
}
