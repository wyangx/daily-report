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
  
  // 去重：先按 link 去重（保留最新），再按 title+source 去重
  const seenLinks = new Map();
  const seenTitleSource = new Set();
  const uniqueNews = [];

  for (const news of allNews) {
    const linkKey = news.link?.trim();
    if (linkKey) {
      if (seenLinks.has(linkKey)) continue;
      seenLinks.set(linkKey, true);
    }

    const titleKey = `${news.title?.trim()}|${news.source}`;
    if (seenTitleSource.has(titleKey)) continue;
    seenTitleSource.add(titleKey);

    uniqueNews.push(news);
  }

  // 按发布时间排序，最新的在前
  uniqueNews.sort((a, b) => b.pubDate - a.pubDate);
  
  const removed = allNews.length - uniqueNews.length;
  if (removed > 0) {
    console.log(`去重: 移除 ${removed} 条重复新闻`);
  }
  console.log(`共抓取到 ${uniqueNews.length} 条新闻`);
  return uniqueNews;
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
