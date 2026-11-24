/** Serialize disk writes and keep saving if edits arrive during an in-flight save.
 * The saved revision advances only after success. A failed write remains dirty.
 */
export function createSaveQueue<T>(snapshot: () => T, write: (value: T) => Promise<void>) {
  let revision = 0;
  let savedRevision = 0;
  let active: Promise<void> | undefined;
  return {
    markDirty() {
      revision += 1;
    },
    get dirty() {
      return revision !== savedRevision;
    },
    flush(): Promise<void> {
      if (active) return active;
      active = (async () => {
        while (revision !== savedRevision) {
          const target = revision;
          await write(snapshot());
          savedRevision = target;
        }
      })().finally(() => {
        active = undefined;
      });
      return active;
    },
  };
}
