import { createApp } from './app';
import { configFromEnv } from './config';
import { runDigest } from './jobs/digest';
import { systemClock } from './lib/clock';
import { fetchHttpClient } from './lib/httpClient';
import { randomIds } from './lib/ids';
import { consoleLogger as logger } from './lib/logger';
import { DAY_MS } from './lib/time';
import { consoleNotifier as notifier } from './notifications/notifier';
import { seed } from './seed';
import { JsonFileStore } from './store/jsonFileStore';
import { MemoryStore } from './store/memoryStore';

const config = configFromEnv();
const store = config.dataFile ? JsonFileStore.open(config.dataFile) : new MemoryStore();
if (store.isEmpty()) {
  seed(store, systemClock, randomIds);
  logger.info('seeded demo data');
}

const { app } = createApp({
  store,
  clock: systemClock,
  ids: randomIds,
  http: fetchHttpClient(config.webhookTimeoutMs),
  notifier,
  logger,
  config,
});

app.listen(config.port, () => {
  logger.info(`EventPass listening on http://localhost:${config.port}`, {
    storage: config.dataFile ?? 'memory',
  });
});

// Weekly digest emails go out once a day.
setInterval(() => {
  runDigest({ store, clock: systemClock, notifier, logger }).catch((err) =>
    logger.error('digest failed', { error: String(err) }),
  );
}, DAY_MS);
