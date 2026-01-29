# Net Probe MQTT - 编码任务提示词

## 项目背景

你需要完成一个 Node.js 网络延时探测工具的编码工作。该工具通过系统 `ping` 命令探测多个目标主机的网络延时，并将结果发布到 MQTT broker，支持 Home Assistant MQTT Discovery 自动集成。

## 项目位置

`/Users/skybox/Documents/GitHub/net-probe-mqtt`

## 必读文档

开始编码前，请务必阅读以下文档：

1. **Agent.md** - 系统架构文档，包含：
   - 技术栈选型
   - MQTT Topic 设计
   - Docker 配置要点
   - 模块结构

2. **TODO.md** - 实施任务清单，包含：
   - 分阶段任务列表
   - 代码示例
   - Ping 输出解析正则

## 核心需求

### 探测配置
- 探测频率：10 秒一次
- 超时时间：2 秒
- 每轮包数：1 包
- Ping 命令：`ping -c 1 -W 2 <target>`

### PROBE_TARGETS 格式
```json
[
  {"host":"223.5.5.5", "id":"dns", "name":"DNS延时"},
  {"host":"baidu.com", "id":"china", "name":"国内站点连通性"},
  {"host":"github.com", "id":"github", "name":"国际直连连通性"},
  {"host":"x.com", "id":"global", "name":"国际站点连通性"}
]
```
- `host`: 实际 ping 的目标
- `id`: 英文 ID，用于 MQTT Topic
- `name`: 中文名称，用于 HA 传感器显示

### MQTT Topic 设计
- 状态发布：`net-probe/<id>` → 延时(ms) 或 -1(失败)
- Discovery：`homeassistant/sensor/net_probe_<id>/config`

### 环境变量
| 变量 | 必填 | 默认值 |
|------|------|--------|
| MQTT_HOST | ✅ | - |
| MQTT_PORT | ❌ | 1883 |
| MQTT_USERNAME | ❌ | - |
| MQTT_PASSWORD | ❌ | - |
| MQTT_TLS | ❌ | false |
| PROBE_TARGETS | ❌ | 见上方默认配置 |

## 编码要求

### 模块结构
```
main.mjs              # 入口文件
src/
├── config.mjs        # 配置加载与验证
├── prober.mjs        # Ping 探测逻辑
└── mqtt.mjs          # MQTT 连接与发布
```

### Docker 要求
- 基础镜像：`node:20-alpine`
- 安装 `iputils` 包（提供 ping 命令）
- 创建非 root 用户 `appuser` 运行
- 支持多平台：`linux/amd64`, `linux/arm64`

### 代码风格
- 使用 ESM 模块语法 (import/export)
- 入口文件为 `main.mjs`
- 使用 async/await 处理异步

## 完成标准

1. 所有模块代码完成
2. Dockerfile 可成功构建
3. 容器启动后能正确：
   - 发布 HA Discovery 配置
   - 每 10 秒探测并发布延时数据
   - 失败时发布 -1
4. 代码有适当的错误处理和日志输出

## 注意事项

- Alpine Linux 默认不启用系统级 DNS 缓存，无需额外处理
- MQTT 密码通过环境变量传入，不要硬编码
- Ping 输出解析正则：`time=(\d+\.?\d*) ms`
- mqtt.js 默认具有自动重连功能

---

完成编码后，请通知用户进行代码审查。
