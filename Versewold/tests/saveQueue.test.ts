import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSaveQueue } from '../src/services/saveQueue.ts';

test('edits during a pending save are written afterward, with no parallel writes', async () => {
  let draft = 'first';
  const writes: string[] = [];
  let release!: () => void;
  const firstWrite = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queue = createSaveQueue(
    () => draft,
    async (value) => {
      writes.push(value);
      if (writes.length === 1) await firstWrite;
    },
  );
  queue.markDirty();
  const saving = queue.flush();
  draft = 'second';
  queue.markDirty();
  assert.equal(queue.flush(), saving);
  release();
  await saving;
  assert.deepEqual(writes, ['first', 'second']);
  assert.equal(queue.dirty, false);
});

test('failure retains dirty status and permits a later retry', async () => {
  let failing = true;
  const queue = createSaveQueue(
    () => 'draft',
    async () => {
      if (failing) throw new Error('disk full');
    },
  );
  queue.markDirty();
  await assert.rejects(queue.flush(), /disk full/);
  assert.equal(queue.dirty, true);
  failing = false;
  await queue.flush();
  assert.equal(queue.dirty, false);
});
