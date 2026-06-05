import cron from 'node-cron';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from './config.js';
import { fetchAllNews } from './rss/fetcher.js';
import { formatNewsList } from './rss/parser.js';
import { summarizeNews } from './ai/summarizer.js';

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
    
    const filteredNews = rawNews.filter(news => {
      const pubDate = new Date(news.pubDate);
      return pubDate >= yesterdayStart && pubDate <= now;
    });
    
    console.log(`日期过滤: ${rawNews.length} 条 → ${filteredNews.length} 条 (昨天至今)`);
    
    if (filteredNews.length === 0) {
      console.warn('过滤后没有新闻，使用全部新闻');
    }
    
    const newsToProcess = filteredNews.length > 0 ? filteredNews : rawNews;
    
    // 3. 格式化新闻
    const newsList = formatNewsList(newsToProcess);
    
    // 4. 使用AI总结
    const summary = await summarizeNews(newsList);
    
    // 5. 准备报告数据
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
    
    // 6. 保存报告
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
