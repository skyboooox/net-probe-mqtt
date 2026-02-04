const DEFAULT_TARGETS = [
  { host: '223.5.5.5', id: 'dns', name: 'DNS延时' },
  { host: 'baidu.com', id: 'china', name: '国内站点连通性' },
  { host: 'github.com', id: 'github', name: '国际直连连通性' },
  { host: 'x.com', id: 'global', name: '国际站点连通性' }
];

const DEFAULT_MQTT_PORT = 1883;
const DEFAULT_MQTT_TLS = false;
const PROBE_INTERVAL_MS = 10_000;

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
}

function parsePort(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid MQTT_PORT: ${value}`);
  }

  return parsed;
}

function parseTargets(value) {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_TARGETS;
  }

  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid PROBE_TARGETS JSON: ${error.message}`);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('PROBE_TARGETS must be a non-empty array');
  }

  const ids = new Set();
  parsed.forEach((target, index) => {
    if (!target || typeof target !== 'object') {
      throw new Error(`PROBE_TARGETS[${index}] must be an object`);
    }
    const { host, id, name } = target;
    if (!host || typeof host !== 'string') {
      throw new Error(`PROBE_TARGETS[${index}].host must be a string`);
    }
    if (!id || typeof id !== 'string') {
      throw new Error(`PROBE_TARGETS[${index}].id must be a string`);
    }
    if (!name || typeof name !== 'string') {
      throw new Error(`PROBE_TARGETS[${index}].name must be a string`);
    }
    if (ids.has(id)) {
      throw new Error(`Duplicate target id detected: ${id}`);
    }
    ids.add(id);
  });

  return parsed;
}

export function loadConfig(env = process.env) {
  const mqttHost = env.MQTT_HOST;
  if (!mqttHost || typeof mqttHost !== 'string') {
    throw new Error('MQTT_HOST is required');
  }

  const mqttPort = parsePort(env.MQTT_PORT, DEFAULT_MQTT_PORT);
  const mqttTls = parseBoolean(env.MQTT_TLS, DEFAULT_MQTT_TLS);
  const targets = parseTargets(env.PROBE_TARGETS);

  return {
    mqtt: {
      host: mqttHost,
      port: mqttPort,
      tls: mqttTls,
      username: env.MQTT_USERNAME || undefined,
      password: env.MQTT_PASSWORD || undefined
    },
    targets,
    intervalMs: PROBE_INTERVAL_MS
  };
}
