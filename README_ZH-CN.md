# Net Probe MQTT

基于 Node.js 的网络延时探测工具。使用系统 `ping` 命令测量多个目标主机的网络延时，并将结果发布到 MQTT Broker，支持 Home Assistant MQTT Discovery 自动集成。

## 功能特性

- ⚡ **实时探测**: 每 10 秒测量一次网络延时。
- 📡 **MQTT 集成**: 将结果发布到指定的 MQTT 主题。
- 🏠 **Home Assistant 支持**: 自动发现功能，无需手动配置传感器。
- 🐳 **Docker 就绪**: 基于 Alpine 的轻量级镜像，以非 root 用户运行，安全可靠。
- 🔧 **高度可配**: 支持通过环境变量配置探测目标、MQTT 连接及 TLS 选项。

## 快速开始

### Docker (推荐)

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
      PROBE_TARGETS: '[{"host":"github.com","id":"github","name":"GitHub 延时"}]'
```

### 本地开发

1. **安装依赖**:
   ```bash
   npm install
   ```

2. **配置环境变量**:
   ```bash
   export MQTT_HOST=localhost
   ```

3. **运行**:
   ```bash
   npm start
   ```

## 配置说明

所有配置均通过环境变量进行。

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `MQTT_HOST` | ✅ | - | MQTT Broker 地址 |
| `MQTT_PORT` | ❌ | `1883` | MQTT 端口 |
| `MQTT_USERNAME` | ❌ | - | MQTT 用户名 |
| `MQTT_PASSWORD` | ❌ | - | MQTT 密码 |
| `MQTT_TLS` | ❌ | `false` | 是否启用 TLS (`true`/`false`) |
| `PROBE_TARGETS` | ❌ | (见下文) | JSON 格式的探测目标列表 |

### 探测目标配置 (`PROBE_TARGETS`)

该变量需要一个 JSON 字符串数组。每个目标对象包含：
- `host`: 目标主机名或 IP 地址。
- `id`: 唯一的英文 ID，用于 MQTT Topic。
- `name`: Home Assistant 中显示的名称（支持中文）。

**默认配置:**
```json
[
  {"host":"223.5.5.5", "id":"dns", "name":"DNS延时"},
  {"host":"baidu.com", "id":"china", "name":"国内站点连通性"},
  {"host":"github.com", "id":"github", "name":"国际直连连通性"},
  {"host":"x.com", "id":"global", "name":"国际站点连通性"}
]
```

## MQTT Topic

### 状态发布
单位为毫秒 (`ms`)。如果超时或失败，返回 `-1`。

- Topic 格式: `net-probe/<id>`
- 示例: `net-probe/github` -> `65.4`

### Home Assistant Discovery
传感器自动注册Topic。

- Topic: `homeassistant/sensor/net_probe_<id>/config`

## 许可协议

GPL-3.0
