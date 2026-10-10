import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { MemoryStore } from './memoryStore';
import type { Snapshot } from './store';

// Keeps everything in memory and writes a full snapshot to disk after every
// change. Fine for one process and a few thousand records (ADR-002).
export class JsonFileStore extends MemoryStore {
  private constructor(
    private readonly path: string,
    snapshot?: Snapshot,
  ) {
    super(snapshot);
  }

  static open(path: string): JsonFileStore {
    if (!existsSync(path)) return new JsonFileStore(path);
    const snapshot = JSON.parse(readFileSync(path, 'utf8')) as Snapshot;
    return new JsonFileStore(path, snapshot);
  }

  protected override changed(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    // Write to a temp file and rename, so a crash mid-write can't leave a
    // half-written snapshot behind.
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.snapshot(), null, 2));
    renameSync(tmp, this.path);
  }
}
