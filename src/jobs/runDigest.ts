// Runs the weekly digest once and exits: `npm run digest`.
// Uses DATA_FILE if set, otherwise fresh demo data.
import { configFromEnv } from '../config';
import { systemClock } from '../lib/clock';
import { randomIds } from '../lib/ids';
import { consoleLogger } from '../lib/logger';
import { consoleNotifier } from '../notifications/notifier';
import { seed } from '../seed';
import { JsonFileStore } from '../store/jsonFileStore';
import { MemoryStore } from '../store/memoryStore';
import { runDigest } from './digest';

const config = configFromEnv();
const store = config.dataFile ? JsonFileStore.open(config.dataFile) : new MemoryStore();
if (store.isEmpty()) seed(store, systemClock, randomIds);

await runDigest({ store, clock: systemClock, notifier: consoleNotifier, logger: consoleLogger });
