import { openDB, type IDBPDatabase } from "idb";
import {
  stores,
  emptySnapshot,
  schemas,
  type Snapshot,
  type StoreName,
  type Entities,
} from "./schema";
let connection: Promise<IDBPDatabase> | undefined;
const listeners = new Set<() => void>();
const channel =
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("nexora-data")
    : null;
channel?.addEventListener("message", () => listeners.forEach((fn) => fn()));
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function changed() {
  listeners.forEach((fn) => fn());
  channel?.postMessage("changed");
}
export function getDB() {
  return (connection ??= openDB("nexora-workspace", 1, {
    upgrade(db) {
      for (const name of stores) {
        const store = db.createObjectStore(name, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
        if (name === "orders") store.createIndex("customerId", "customerId");
      }
    },
    blocking() {
      connection?.then((db) => db.close());
      connection = undefined;
    },
    terminated() {
      connection = undefined;
    },
  }).catch((error) => {
    connection = undefined;
    throw error;
  }));
}
export async function readSnapshot(): Promise<Snapshot> {
  const db = await getDB();
  const tx = db.transaction(stores, "readonly");
  const results = await Promise.all(
    stores.map((s) => tx.objectStore(s).getAll()),
  );
  await tx.done;
  return Object.fromEntries(stores.map((s, i) => [s, results[i]])) as Snapshot;
}
/** Serialized by IndexedDB across tabs. A failed recipe commits nothing. */
export async function atomic<T>(recipe: (draft: Snapshot) => T): Promise<T> {
  const db = await getDB();
  const tx = db.transaction(stores, "readwrite");
  try {
    const arrays = await Promise.all(
      stores.map((s) => tx.objectStore(s).getAll()),
    );
    const original = Object.fromEntries(
      stores.map((s, i) => [s, arrays[i]]),
    ) as Snapshot;
    const draft = structuredClone(original);
    const result = recipe(draft);
    for (const name of stores)
      for (const item of draft[name]) schemas[name].parse(item);
    const writes: Promise<unknown>[] = [];
    for (const name of stores) {
      const before = new Map(
        original[name].map((v) => [v.id, JSON.stringify(v)]),
      );
      const after = new Set(draft[name].map((v) => v.id));
      for (const item of draft[name]) {
        if (before.get(item.id) !== JSON.stringify(item)) {
          writes.push(tx.objectStore(name).put(item));
        }
      }
      for (const id of before.keys())
        if (!after.has(id)) writes.push(tx.objectStore(name).delete(id));
    }
    await Promise.all(writes);
    await tx.done;
    if (writes.length) changed();
    return result;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* Already aborted. */
    }
    await tx.done.catch(() => {});
    throw error;
  }
}
export const repository = <K extends StoreName>(store: K) => ({
  getAll: async (): Promise<Entities[K][]> => (await getDB()).getAll(store),
  getById: async (id: string): Promise<Entities[K] | undefined> =>
    (await getDB()).get(store, id),
  create: async (value: Entities[K]) =>
    atomic((d) => {
      const list = d[store] as Entities[K][];
      if (list.some((v) => v.id === value.id))
        throw new Error("This record already exists.");
      list.push(schemas[store].parse(value) as Entities[K]);
      return value;
    }),
  update: async (id: string, patch: Partial<Entities[K]>) =>
    atomic((d) => {
      const list = d[store] as Entities[K][];
      const index = list.findIndex((v) => v.id === id);
      if (index < 0) throw new Error("This record was not found.");
      const value = schemas[store].parse({
        ...list[index],
        ...patch,
        id,
        updatedAt: new Date().toISOString(),
      }) as Entities[K];
      list[index] = value;
      return value;
    }),
  delete: async (id: string) =>
    atomic((d) => {
      (d[store] as Entities[K][]) = (d[store] as Entities[K][]).filter(
        (v) => v.id !== id,
      );
    }),
});
export const repositories = Object.fromEntries(
  stores.map((s) => [s, repository(s)]),
) as { [K in StoreName]: ReturnType<typeof repository<K>> };
export async function replaceSnapshot(snapshot: Snapshot) {
  await atomic((d) => {
    for (const key of stores) (d[key] as unknown[]) = snapshot[key];
  });
}
export { emptySnapshot };
