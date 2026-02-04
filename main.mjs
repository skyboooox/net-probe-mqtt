import 'dotenv/config';
import { readFileSync } from 'fs';
import { loadConfig } from './src/config.mjs';
import { probeAll } from './src/prober.mjs';
import { connectMqtt, disconnectMqtt, publishDiscovery, publishLatency } from './src/mqtt.mjs';

const ICON_OK = 'mdi:check-network';
const ICON_FAIL = 'mdi:close-network-outline';

function loadVersion() {
  try {
    const pkgUrl = new URL('./package.json', import.meta.url);
    const pkg = JSON.parse(readFileSync(pkgUrl, 'utf-8'));
    return pkg.version ?? 'unknown';
  } catch (error) {
    console.warn('Failed to read package version:', error?.message ?? error);
    return 'unknown';
  }
}

function iconForLatency(latency) {
  return latency >= 0 ? ICON_OK : ICON_FAIL;
}

function normalizeResults(targets, results) {
  const normalized = {};
  targets.forEach((target) => {
    const value = results?.[target.id];
    normalized[target.id] = typeof value === 'number' ? value : -1;
  });
  return normalized;
}

async function run() {
  console.log(`Net Probe MQTT v${loadVersion()}`);
  const config = loadConfig();
  console.log('Configuration loaded');
  console.log(`MQTT host=${config.mqtt.host} port=${config.mqtt.port} tls=${config.mqtt.tls}`);
  console.log(`MQTT username set=${Boolean(config.mqtt.username)}`);
  console.log(`Probe interval=${config.intervalMs}ms targets=${config.targets.length}`);
  config.targets.forEach((target) => {
    console.log(`Target ${target.id}: ${target.host} (${target.name})`);
  });

  const client = await connectMqtt(config.mqtt);

  const iconStateById = new Map();
  let initialResults;
  try {
    initialResults = await probeAll(config.targets);
  } catch (error) {
    console.error('Initial probe failed:', error?.message ?? error);
    initialResults = {};
  }

  const normalizedInitial = normalizeResults(config.targets, initialResults);
  const initialIcons = {};
  config.targets.forEach((target) => {
    const icon = iconForLatency(normalizedInitial[target.id]);
    initialIcons[target.id] = icon;
    iconStateById.set(target.id, icon);
  });

  try {
    await publishDiscovery(client, config.targets, initialIcons);
    console.log('Home Assistant discovery published');
  } catch (error) {
    console.error('Home Assistant discovery publish failed:', error?.message ?? error);
  }

  let running = false;
  let timer;

  const runProbe = async () => {
    if (running) {
      console.warn('Previous probe still running, skipping this cycle');
      return;
    }
    running = true;

    try {
      console.log(`Probe cycle started at ${new Date().toISOString()}`);
      const rawResults = await probeAll(config.targets);
      const results = normalizeResults(config.targets, rawResults);
      await publishLatency(client, results);
      console.log(`Probe results published: ${JSON.stringify(results)}`);

      const updateTargets = [];
      const iconById = {};
      config.targets.forEach((target) => {
        const icon = iconForLatency(results[target.id]);
        if (iconStateById.get(target.id) !== icon) {
          iconStateById.set(target.id, icon);
          iconById[target.id] = icon;
          updateTargets.push(target);
        }
      });

      if (updateTargets.length > 0) {
        await publishDiscovery(client, updateTargets, iconById);
        console.log(`Discovery icon updated for ${updateTargets.map((t) => t.id).join(', ')}`);
      }
    } catch (error) {
      console.error('Probe loop error:', error?.message ?? error);
    } finally {
      running = false;
    }
  };

  await publishLatency(client, normalizedInitial);
  console.log(`Initial probe results published: ${JSON.stringify(normalizedInitial)}`);

  timer = setInterval(runProbe, config.intervalMs);
  console.log('Probe scheduler started');

  const shutdown = async (signal) => {
    console.log(`Received ${signal}, shutting down...`);
    clearInterval(timer);
    await disconnectMqtt(client);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error?.message ?? error);
  process.exit(1);
});

run().catch((error) => {
  console.error('Fatal error:', error?.message ?? error);
  process.exit(1);
});
