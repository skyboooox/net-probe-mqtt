# Net Probe MQTT

A network latency probing tool based on Node.js. It measures network latency to multiple target hosts using the system `ping` command and publishes the results to an MQTT broker. Includes automatic integration with Home Assistant via MQTT Discovery.

## Features

- ⚡ **Real-time Probing**: Measures latency every 10 seconds.
- 📡 **MQTT Integration**: Publishes results to MQTT topics.
- 🏠 **Home Assistant Support**: Automatic discovery for seamless integration.
- 🐳 **Docker Ready**: Lightweight Alpine-based image running as a non-root user.
- 🔧 **Configurable**: Targets, MQTT settings, and TLS support via environment variables.

## Quick Start

### Docker (Recommended)

```bash
docker run -d \
  --name net-probe-mqtt \
  --restart unless-stopped \
  -e MQTT_HOST=192.168.1.100 \
  -e MQTT_USERNAME=your_user \
  -e MQTT_PASSWORD=your_password \
  skyboooox/net-probe-mqtt
```

### Docker Compose

```yaml
version: '3.8'
services:
  net-probe-mqtt:
    image: skyboooox/net-probe-mqtt
    restart: unless-stopped
    environment:
      MQTT_HOST: "192.168.1.100"
      PROBE_TARGETS: '[{"host":"github.com","id":"github","name":"GitHub Latency"}]'
```

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   export MQTT_HOST=localhost
   ```

3. **Run**:
   ```bash
   npm start
   ```

## Configuration

All configuration is done via environment variables.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MQTT_HOST` | ✅ | - | MQTT Broker address |
| `MQTT_PORT` | ❌ | `1883` | MQTT Port |
| `MQTT_USERNAME` | ❌ | - | MQTT Username |
| `MQTT_PASSWORD` | ❌ | - | MQTT Password |
| `MQTT_TLS` | ❌ | `false` | Enable TLS (`true`/`false`) |
| `PROBE_TARGETS` | ❌ | (See below) | JSON list of targets to probe |

### Probe Targets Configuration

The `PROBE_TARGETS` variable expects a JSON string array. Each object requires:
- `host`: Target hostname or IP.
- `id`: Unique English identifier for the MQTT topic.
- `name`: Display name for Home Assistant.

**Default Configuration:**
```json
[
  {"host":"223.5.5.5", "id":"dns", "name":"DNS延时"},
  {"host":"baidu.com", "id":"china", "name":"国内站点连通性"},
  {"host":"github.com", "id":"github", "name":"国际直连连通性"},
  {"host":"x.com", "id":"global", "name":"国际站点连通性"}
]
```

## MQTT Topics

### State Updates
Reports latency in milliseconds (`ms`). Returns `-1` on timeout or failure.

- Topic format: `net-probe/<id>`
- Example: `net-probe/github` -> `65.4`

### Home Assistant Discovery
Automatic sensor registration.

- Topic: `homeassistant/sensor/net_probe_<id>/config`

## License

GPL-3.0
