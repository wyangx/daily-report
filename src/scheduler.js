import cron from 'node-cron';
import { config } from './config.js';
import { fetchAllNews } from './rss/fetcher.js';
import { formatNewsList } from './rss/parser.js';
import { createNewsSummarizer } from './ai/summarizer.js';
import { createOpenAiCompatibleAdapter } from './ai/openai-adapter.js';
import { createFsReportStore } from './report/store.js';
import { createDailyReportPipeline } from './report/pipeline.js';

const getNow = () => new Date();
const reportStore = createFsReportStore(config.paths.news);
const aiAdapter = createOpenAiCompatibleAdapter(config.ai);
const newsSummarizer = createNewsSummarizer({
  aiAdapter,
  getNow,
  logger: console,
});
const dailyReportPipeline = createDailyReportPipeline({
  fetchNews: fetchAllNews,
  formatNewsList,
  summarizeNews: newsSummarizer.summarizeNews,
  reportStore,
  getNow,
  logger: console,
});

/**
 * 生成日报数据
 */
export async function generateDailyReport() {
  return dailyReportPipeline.generateDailyReport();
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
