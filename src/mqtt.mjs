import mqtt from 'mqtt';

const DEVICE_INFO = {
  identifiers: ['net_probe_mqtt'],
  name: '网络探测',
  manufacturer: 'Github:skyboooox',
  model: 'Net Probe MQTT'
};

function buildUrl({ host, port, tls }) {
  const protocol = tls ? 'mqtts' : 'mqtt';
  return `${protocol}://${host}:${port}`;
}

function buildOptions({ username, password }) {
  const options = {
    clientId: 'net-probe-mqtt'
  };

  if (username) {
    options.username = username;
  }
  if (password) {
    options.password = password;
  }

  return options;
}

function publishMessage(client, topic, payload, options = {}) {
  return new Promise((resolve, reject) => {
    client.publish(topic, payload, options, (error) => {
      if (error) {
        console.error(`MQTT publish failed for ${topic}:`, error.message);
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export function connectMqtt(config) {
  const url = buildUrl(config);
  const options = buildOptions(config);
  const client = mqtt.connect(url, options);

  console.log(`MQTT connecting to ${url}`);
  const waitTimer = setTimeout(() => {
    if (!client.connected) {
      console.warn('MQTT connection timeout after 30000ms, still waiting for broker...');
    }
  }, 30000);

  client.on('reconnect', () => {
    console.log('MQTT reconnecting...');
  });
  client.on('offline', () => {
    console.log('MQTT offline');
  });
  client.on('close', () => {
    console.log('MQTT connection closed');
  });
  client.on('error', (error) => {
    console.error('MQTT error:', error.message);
  });

  return new Promise((resolve) => {
    client.on('connect', () => {
      clearTimeout(waitTimer);
      console.log('MQTT connected');
      resolve(client);
    });
  });
}

export async function publishDiscovery(client, targets, iconById = {}) {
  const tasks = targets.map((target) => {
    const icon = iconById[target.id] ?? 'mdi:network-ping';
    const payload = {
      name: target.name,
      unique_id: `net_probe_${target.id}`,
      state_topic: `net-probe/${target.id}`,
      unit_of_measurement: 'ms',
      device_class: 'duration',
      icon,
      device: DEVICE_INFO
    };

    const topic = `homeassistant/sensor/net_probe_${target.id}/config`;
    return {
      topic,
      promise: publishMessage(client, topic, JSON.stringify(payload), {
        qos: 1,
        retain: true
      })
    };
  });

  const results = await Promise.allSettled(tasks.map((task) => task.promise));
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`Discovery publish failed for ${tasks[index].topic}:`, result.reason?.message ?? result.reason);
    }
  });
}

export async function publishLatency(client, results) {
  const entries = Object.entries(results);
  const tasks = entries.map(([id, latency]) => {
    const topic = `net-probe/${id}`;
    return {
      topic,
      promise: publishMessage(client, topic, String(latency))
    };
  });

  const outcomes = await Promise.allSettled(tasks.map((task) => task.promise));
  outcomes.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`Latency publish failed for ${tasks[index].topic}:`, result.reason?.message ?? result.reason);
    }
  });
}

export function disconnectMqtt(client) {
  return new Promise((resolve) => {
    client.end(false, {}, () => resolve());
  });
}
