import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { marked } from 'marked';
import { config } from '../config.js';
import { createFsReportStore } from '../report/store.js';
import {
  formatDisplayDate,
  parseLocalDateKey,
} from '../report/date-policy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const reportStore = createFsReportStore(config.paths.news);

// 静态文件服务
app.use(express.static(config.paths.public));

// 读取HTML模板
function loadTemplate(name) {
  const templatePath = join(__dirname, 'templates', `${name}.html`);
  return readFileSync(templatePath, 'utf-8');
}

// 清理并转换Markdown内容
function renderMarkdown(content) {
  if (!content) return '';
  
  let cleanContent = content.trim();
  
  if (cleanContent.startsWith('{')) {
    cleanContent = cleanContent.substring(1);
  }
  
  cleanContent = cleanContent.replace(/^###\s+\d+\.\s+标题\s*$/gm, '');
  cleanContent = cleanContent.replace(/^####\s+\*\*\d+\.\s+标题\*\*\s*$/gm, '');
  cleanContent = cleanContent.replace(/^####\s+标题[:：]?\s*$/gm, '');
  cleanContent = cleanContent.replace(/\n{3,}/g, '\n\n').trim();
  
  return marked(cleanContent);
}

// 渲染日报页面
function renderReportPage(report, res) {
  const template = loadTemplate('index');
  
  if (!report) {
    const now = new Date();
    const dateStr = formatDisplayDate(now);
    
    const html = template
      .replace(/\{\{title\}\}/g, '每日新闻日报')
      .replace('{{date}}', dateStr)
      .replace('{{isoDate}}', now.toISOString())
      .replace('{{updateTime}}', '暂无数据')
      .replace('{{newsCount}}', '0')
      .replace('{{content}}', '<div class="empty"><h2>暂无日报数据</h2><p>系统将在每天早上8点自动生成日报</p></div>')
      .replace(/\{\{#each sources\}\}[\s\S]*?\{\{\/each\}\}/, '');
    
    return res.send(html);
  }
  
  const contentHtml = renderMarkdown(report.content);
  
  const sources = report.newsList 
    ? [...new Set(report.newsList.map(n => n.source))] 
    : [];
  
  const sourcesHtml = sources.map(s => 
    `<li><a href="#source-${s}" class="source-link">${s}</a></li>`
  ).join('');
  
  const title = extractTitle(report.content) || `每日新闻日报 - ${report.date}`;
  const eachRegex = /\{\{#each sources\}\}[\s\S]*?\{\{\/each\}\}/;
  
  const html = template
    .replace(/\{\{title\}\}/g, title)
    .replace('{{date}}', report.date)
    .replace('{{isoDate}}', new Date().toISOString())
    .replace('{{updateTime}}', report.updateTime)
    .replace('{{newsCount}}', String(report.newsCount || sources.length))
    .replace('{{{content}}}', contentHtml)
    .replace(eachRegex, sourcesHtml);
  
  res.send(html);
}

// 首页路由
app.get('/', (req, res) => {
  const report = reportStore.getLatest();
  renderReportPage(report, res);
});

// 往期日报列表路由
app.get('/archives', (req, res) => {
  const template = loadTemplate('archives');
  const archives = reportStore.listArchives();

  const reportsHtml = archives.map((entry) => {
    const displayDate = formatDisplayDate(parseLocalDateKey(entry.dateKey));
    const preview = extractTitle(entry.content) || '点击查看详细内容';
    return `
    <a href="/archives/${entry.dateKey}" class="archive-card">
      <div class="archive-date">${displayDate}</div>
      <div class="archive-meta">${entry.newsCount} 条新闻</div>
      <div class="archive-preview">${preview}</div>
    </a>
  `;
  }).join('');
  
  const now = new Date();
  const dateStr = formatDisplayDate(now);
  
  const html = template
    .replace(/\{\{#each reports\}\}[\s\S]*?\{\{\/each\}\}/, reportsHtml)
    .replace(/\{\{#if noReports\}\}[\s\S]*?\{\{\/if\}\}/, archives.length === 0 ? '<div class="empty-state"><p>暂无往期日报</p></div>' : '')
    .replace('{{isoDate}}', now.toISOString())
    .replace('{{date}}', dateStr);
  
  res.send(html);
});

// 往期日报详情路由
app.get('/archives/:date', (req, res) => {
  const { date } = req.params;
  const report = reportStore.getByDate(date);
  
  if (!report) {
    return res.status(404).send('日报不存在');
  }
  
  renderReportPage(report, res);
});

// 从Markdown内容中提取标题
function extractTitle(content) {
  if (!content) return null;
  
  content = content.replace(/^\s*\{/, '').trim();
  
  const titleSectionMatch = content.match(/^###\s+\d+\.\s+标题\s*\n\*\*(.+?)\*\*/m);
  if (titleSectionMatch) return titleSectionMatch[1].trim().substring(0, 80);
  
  const h3TitleMatch = content.match(/^###\s+\*\*(.+?)\*\*/m);
  if (h3TitleMatch) return h3TitleMatch[1].trim().substring(0, 80);
  
  const h3SimpleMatch = content.match(/^###\s+(.+)$/m);
  if (h3SimpleMatch) return h3SimpleMatch[1].trim().substring(0, 80);
  
  const h4TitleSectionMatch = content.match(/####\s+\*\*\d+\.\s+标题\*\*\s*\n\*\*(.+?)\*\*/);
  if (h4TitleSectionMatch) return h4TitleSectionMatch[1].trim().substring(0, 80);
  
  const boldTitleMatch = content.match(/\*\*标题[:：]?\*\*\s*\n\*\*(.+?)\*\*/);
  if (boldTitleMatch) return boldTitleMatch[1].trim().substring(0, 80);
  
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim().substring(0, 80);
  
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('{')) {
      const boldMatch = trimmed.match(/^\*\*(.+?)\*\*/);
      if (boldMatch) {
        const text = boldMatch[1].trim();
        if (!text.match(/^\d+\.\s*标题$/)) {
          return text.substring(0, 80);
        }
      }
    }
  }
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('{') && !trimmed.startsWith('*')) {
      return trimmed.substring(0, 80);
    }
  }
  
  return null;
}

// API路由 - 获取最新日报JSON
app.get('/api/report', (req, res) => {
  const report = reportStore.getLatest();
  
  if (!report) {
    return res.json({ success: false, message: '暂无日报数据' });
  }
  
  res.json({ success: true, data: report });
});

// API路由 - 获取新闻列表
app.get('/api/news', (req, res) => {
  const report = reportStore.getLatest();
  
  if (!report || !report.newsList) {
    return res.json({ success: false, message: '暂无新闻数据' });
  }
  
  res.json({ success: true, data: report.newsList });
});

// 启动服务器
export function startServer() {
  const port = config.server.port;
  
  app.listen(port, () => {
    console.log(`服务器已启动: http://localhost:${port}`);
  });
  
  return app;
}

export default app;
