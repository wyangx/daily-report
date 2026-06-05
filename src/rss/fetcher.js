import Parser from 'rss-parser';
import { config } from '../config.js';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'DailyReport/1.0',
  },
});

/**
 * 从单个RSS源获取新闻
 */
async function fetchFromSource(source) {
  try {
    console.log(`正在抓取: ${source.name}`);
    const feed = await parser.parseURL(source.url);
    
    return feed.items.map(item => ({
      title: item.title || '无标题',
      link: item.link || '',
      summary: item.contentSnippet || item.content || item.summary || '',
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      source: source.name,
      category: source.category || '未分类',
    }));
  } catch (error) {
    console.error(`抓取 ${source.name} 失败:`, error.message);
    return [];
  }
}

/**
 * 获取所有RSS源的新闻
 */
export async function fetchAllNews() {
  const sources = config.rssSources;
  
  if (!sources || sources.length === 0) {
    console.warn('没有配置RSS源');
    return [];
  }
  
  console.log(`开始抓取 ${sources.length} 个RSS源...`);
  
  const results = await Promise.allSettled(
    sources.map(source => fetchFromSource(source))
  );
  
  const allNews = results
    .filter(result => result.status === 'fulfilled')
    .flatMap(result => result.value);
  
  // 按发布时间排序，最新的在前
  allNews.sort((a, b) => b.pubDate - a.pubDate);
  
  console.log(`共抓取到 ${allNews.length} 条新闻`);
  return allNews;
}

/**
 * 获取指定时间范围内的新闻
 * @param {Date} startTime - 开始时间
 * @param {Date} endTime - 结束时间
 */
export async function fetchNewsByTimeRange(startTime, endTime) {
  const allNews = await fetchAllNews();
  
  return allNews.filter(news => {
    const pubDate = new Date(news.pubDate);
    return pubDate >= startTime && pubDate <= endTime;
  });
}
