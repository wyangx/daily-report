import cron from 'node-cron';
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { config } from './config.js';
import { fetchAllNews } from './rss/fetcher.js';
import { formatNewsList } from './rss/parser.js';
import { summarizeNews } from './ai/summarizer.js';

/**
 * 获取昨天日报的标题集合
 */
function getYesterdayTitles() {
  const newsDir = config.paths.news;
  
  // 计算昨天的日期
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  // 读取昨天的日报文件
  const yesterdayPath = join(newsDir, `report-${yesterdayStr}.json`);
  
  if (!existsSync(yesterdayPath)) {
    console.log(`没有找到昨天的日报: ${yesterdayPath}`);
    return new Set();
  }
  
  try {
    const data = readFileSync(yesterdayPath, 'utf-8');
    const report = JSON.parse(data);
    const titles = new Set(report.newsList.map(n => n.title));
    console.log(`读取到昨天日报 ${titles.size} 条标题`);
    return titles;
  } catch (error) {
    console.error('读取昨天日报失败:', error.message);
    return new Set();
  }
}

/**
 * 生成日报数据
 */
export async function generateDailyReport() {
  console.log('开始生成日报...');
  
  try {
    // 1. 获取新闻
    const rawNews = await fetchAllNews();
    
    if (rawNews.length === 0) {
      console.warn('没有获取到新闻，跳过生成');
      return null;
    }
    
    // 2. 过滤日期：只保留昨天0点到现在的新闻
    const now = new Date();
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    
    const dateFilteredNews = rawNews.filter(news => {
      const pubDate = new Date(news.pubDate);
      return pubDate >= yesterdayStart && pubDate <= now;
    });
    
    console.log(`日期过滤: ${rawNews.length} 条 → ${dateFilteredNews.length} 条 (昨天至今)`);
    
    // 3. 去重：过滤掉昨天日报中已经包含的新闻
    const yesterdayTitles = getYesterdayTitles();
    const newsToFilter = dateFilteredNews.length > 0 ? dateFilteredNews : rawNews;
    const uniqueNews = newsToFilter.filter(news => !yesterdayTitles.has(news.title));
    
    console.log(`去重过滤: ${newsToFilter.length} 条 → ${uniqueNews.length} 条 (去除与昨天重复)`);
    
    // 如果去重后没有新闻，使用去重前的
    if (uniqueNews.length === 0) {
      console.warn('去重后没有新闻，使用全部新闻');
    }
    
    const finalNews = uniqueNews.length > 0 ? uniqueNews : newsToFilter;
    
    // 4. 格式化新闻
    const newsList = formatNewsList(finalNews);
    
    // 5. 使用AI总结
    const summary = await summarizeNews(newsList);
    
    // 6. 准备报告数据
    const dateStr = now.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
    
    const report = {
      date: dateStr,
      updateTime: now.toLocaleString('zh-CN'),
      newsCount: newsList.length,
      content: summary,
      newsList: newsList,
    };
    
    // 7. 保存报告
    saveReport(report);
    
    console.log('日报生成完成');
    return report;
  } catch (error) {
    console.error('生成日报失败:', error);
    return null;
  }
}

/**
 * 保存报告到文件
 */
function saveReport(report) {
  const newsDir = config.paths.news;
  
  // 确保目录存在
  if (!existsSync(newsDir)) {
    mkdirSync(newsDir, { recursive: true });
  }
  
  // 保存最新报告
  const latestPath = join(newsDir, 'latest.json');
  writeFileSync(latestPath, JSON.stringify(report, null, 2));
  
  // 保存带日期的备份
  const dateStr = new Date().toISOString().split('T')[0];
  const backupPath = join(newsDir, `report-${dateStr}.json`);
  writeFileSync(backupPath, JSON.stringify(report, null, 2));
  
  console.log(`报告已保存: ${latestPath}`);
}

/**
 * 启动定时任务
 */
export function startScheduler() {
  const schedule = config.cron.schedule;
  
  console.log(`定时任务已启动，计划: ${schedule}`);
  
  cron.schedule(schedule, async () => {
    console.log('定时任务触发，开始生成日报...');
    await generateDailyReport();
  });
  
  return cron;
}
