# Net Probe MQTT - 实施任务清单

## 阶段 1: 项目初始化

- [ ] 更新 `package.json`
  - 添加依赖: `mqtt`
  - 将 `type` 改为 `module` (ESM)
  - 添加 `start` 脚本

---

## 阶段 2: 核心模块开发

### 配置模块 `src/config.mjs`

- [ ] 读取环境变量
  - `MQTT_HOST` (必填)
  - `MQTT_PORT` (默认 1883)
  - `MQTT_USERNAME` (可选)
  - `MQTT_PASSWORD` (可选)
  - `MQTT_TLS` (默认 false)
  - `PROBE_TARGETS` (可选，JSON 格式，有默认值)
- [ ] 解析 `PROBE_TARGETS` JSON
  - 格式: `[{"host":"...","id":"...","name":"..."}]`
  - `host`: 探测目标
  - `id`: 英文 ID，用于 Topic
  - `name`: 中文名称，用于 HA 显示
- [ ] 验证必填变量存在
- [ ] 导出配置对象

### 探测模块 `src/prober.mjs`

- [ ] 实现 `ping` 函数
  - 使用 `child_process.exec` 调用系统 ping
  - 命令: `ping -c 1 -W 2 <target>`
  - 解析输出获取延时 (ms)
  - 超时/失败返回 `-1`
- [ ] 实现 `probeAll` 函数
  - 遍历所有目标
  - 返回 `{ id: latency }` 对象

### MQTT 模块 `src/mqtt.mjs`

- [ ] 实现 `connect` 函数
  - 根据配置连接 MQTT Broker
  - 处理 TLS 选项
  - 处理可选认证
- [ ] 实现 `publishDiscovery` 函数
  - 为每个目标发布 HA Discovery 配置
  - Topic 使用英文 id: `homeassistant/sensor/net_probe_<id>/config`
  - 传感器名称使用中文 name
- [ ] 实现 `publishLatency` 函数
  - Topic: `net-probe/<id>` (如 `net-probe/dns`)
  - Payload: 延时数值或 `-1`

---

## 阶段 3: 主入口 `main.mjs`

- [ ] 加载配置（包括探测目标）
- [ ] 连接 MQTT
- [ ] 发布 HA Discovery 配置
- [ ] 启动主循环 (10秒间隔)
  - 执行探测
  - 发布结果
- [ ] 处理进程退出信号 (SIGTERM, SIGINT)
  - 断开 MQTT 连接
  - 优雅退出

---

## 阶段 4: Docker 容器化

- [ ] 创建 `Dockerfile`
  - 基础镜像: `node:20-alpine`
  - 安装 `iputils` (ping 命令)
  - 创建非 root 用户 `appuser`
  - 复制源码并安装依赖
  - 使用 `USER appuser` 运行
- [ ] 创建 `.dockerignore`
  - 排除 `node_modules`, `.git`, `*.md` 等
- [ ] 创建 `docker-compose.yml` (可选)
  - 便于本地测试
  - 包含环境变量示例

---

## 阶段 5: 多平台构建

- [ ] 配置 Docker Buildx
- [ ] 构建多平台镜像
  - `linux/amd64`
  - `linux/arm64`
- [ ] 推送到 Docker Registry (可选)

---

## 阶段 6: 文档与测试

- [ ] 更新 `README.md`
  - 项目说明
  - 快速开始
  - 环境变量说明
  - Docker 运行示例
- [ ] 本地测试
  - Docker 构建成功
  - 容器启动正常
  - MQTT 消息发布正确
  - HA Discovery 工作正常

---

## 技术参考

### Ping 输出解析

Linux ping 成功输出示例:
```
PING github.com (20.205.243.166): 56 data bytes
64 bytes from 20.205.243.166: seq=0 ttl=113 time=156.789 ms

--- github.com ping statistics ---
1 packets transmitted, 1 packets received, 0% packet loss
round-trip min/avg/max = 156.789/156.789/156.789 ms
```

正则提取延时: `time=(\d+\.?\d*) ms`

### MQTT.js 连接示例

```javascript
import mqtt from 'mqtt';

const options = {
  clientId: 'net-probe-mqtt',
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD
};

const client = mqtt.connect(`mqtt://${host}:${port}`, options);
```

### Home Assistant Discovery 完整示例

```javascript
// target = { host: 'github.com', id: 'github', name: '国际直连连通性' }

const discoveryPayload = {
  name: target.name,           // 中文名称用于 HA 显示
  unique_id: `net_probe_${target.id}`,
  state_topic: `net-probe/${target.id}`,  // 英文 id 用于 topic
  unit_of_measurement: "ms",
  device_class: "duration",
  icon: "mdi:network-ping",
  device: {
    identifiers: ["net_probe_mqtt"],
    name: "网络探测",
    manufacturer: "Custom",
    model: "Net Probe MQTT"
  }
};

client.publish(
  `homeassistant/sensor/net_probe_${target.id}/config`,
  JSON.stringify(discoveryPayload),
  { qos: 1, retain: true }
);
```
