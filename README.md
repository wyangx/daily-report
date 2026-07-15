# 每日新闻日报系统

基于 Node.js (ESM) 的自动新闻日报系统，从 RSS 源获取新闻，使用 AI 总结生成每日报告。

## 功能特性

- 📰 自动从多个 RSS 源抓取新闻
- 🤖 使用 AI API 智能总结新闻（支持 OpenAI 兼容接口）
- 🕐 每天定时自动生成日报
- 🌐 Web 界面展示，支持响应式设计
- 📱 新闻可点击跳转原文
- 📅 支持查看往期日报

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入你的配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# AI API 配置（可选；未配置时使用备用列表格式）
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=your_api_key_here
AI_MODEL=gpt-3.5-turbo

# 服务器配置
PORT=4000

# 定时任务配置 (每天早上8点执行)
CRON_SCHEDULE=0 8 * * *
```

### 3. 配置 RSS 源

编辑 `config/rss-sources.json`，添加你的 RSS 源：

```json
{
  "sources": [
    {
      "name": "Hacker News",
      "url": "https://hnrss.org/frontpage",
      "category": "科技"
    }
  ]
}
```

### 4. 启动系统

```bash
# 生产模式
npm start

# 开发模式（自动重启）
npm run dev
```

访问 http://localhost:4000 查看日报

## 项目结构

```
daily-report/
├── package.json
├── ecosystem.config.cjs  # PM2 配置文件
├── .env.example          # 环境变量示例
├── .env                  # 环境变量配置
├── src/
│   ├── index.js          # 主入口
│   ├── config.js         # 配置管理
│   ├── scheduler.js      # 定时任务触发
│   ├── rss/
│   │   ├── fetcher.js    # RSS 抓取
│   │   └── parser.js     # 数据解析
│   ├── ai/
│   │   ├── openai-adapter.js # OpenAI 兼容接口适配
│   │   └── summarizer.js     # 新闻总结、清洗和备用总结
│   ├── report/
│   │   ├── date-policy.js # 报告日期键和展示日期策略
│   │   ├── pipeline.js    # 日报生成流水线
│   │   └── store.js       # 日报读写存储
│   └── web/
│       ├── server.js     # Web 服务器
│       └── templates/    # HTML 模板
├── config/
│   └── rss-sources.json  # RSS 源配置
├── public/               # 静态资源
│   ├── css/
│   └── js/
├── data/
│   └── news/             # 日报数据存储
└── logs/                 # PM2 日志目录
```

## 页面路由

- `GET /` - 最新日报
- `GET /archives` - 往期日报列表
- `GET /archives/:date` - 指定日期日报（如 `/archives/2026-06-05`）
- `GET /api/report` - 获取最新日报 JSON
- `GET /api/news` - 获取新闻列表

## 部署指南

### 方式一：PM2 进程管理（推荐）

#### 安装 PM2

```bash
npm install -g pm2
```

#### 常用命令

```bash
# 启动服务
npm run pm2:start

# 查看状态
npm run pm2:status

# 查看日志
npm run pm2:logs

# 重启服务
npm run pm2:restart

# 停止服务
npm run pm2:stop

# 删除服务
npm run pm2:delete
```

代码更新后，PM2 中已运行的 Node 进程不会自动加载新代码，需要重启：

```bash
npm run pm2:restart
```

#### 设置开机自启

```bash
pm2 startup
npm run pm2:start
pm2 save
```

## 定时任务

系统使用 `node-cron` 进行定时任务调度，默认每天早上 8 点执行。

可通过修改 `.env` 中的 `CRON_SCHEDULE` 自定义执行时间：

- `0 8 * * *` - 每天 8:00
- `0 */6 * * *` - 每 6 小时
- `0 9 * * 1-5` - 工作日 9:00

## 测试

```bash
npm test
```

测试覆盖 AI 总结、OpenAI 兼容接口适配、日报流水线、报告存储和日期策略。

## 注意事项

- 如果未配置 AI API Key，系统会使用简单的列表格式生成日报
- RSS 源需要可公开访问
- 日报数据保存在 `data/news/` 目录
- 报告归档文件使用本地日历日命名：`report-YYYY-MM-DD.json`
- PM2 日志保存在 `logs/` 目录
