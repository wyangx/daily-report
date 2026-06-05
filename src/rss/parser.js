/**
 * 清洗和格式化新闻数据
 */

/**
 * 截断文本到指定长度
 */
function truncateText(text, maxLength = 500) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * 清洗HTML标签
 */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * 格式化单条新闻
 */
export function formatNewsItem(news) {
  return {
    title: news.title?.trim() || '无标题',
    link: news.link || '',
    summary: truncateText(stripHtml(news.summary), 300),
    pubDate: news.pubDate,
    source: news.source || '未知来源',
    category: news.category || '未分类',
    formattedDate: formatDate(news.pubDate),
  };
}

/**
 * 格式化日期
 */
export function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 按来源分组新闻
 */
export function groupNewsBySource(newsList) {
  const groups = {};
  
  for (const news of newsList) {
    const source = news.source || '未知来源';
    if (!groups[source]) {
      groups[source] = [];
    }
    groups[source].push(news);
  }
  
  return groups;
}

/**
 * 按分类分组新闻
 */
export function groupNewsByCategory(newsList) {
  const groups = {};
  
  for (const news of newsList) {
    const category = news.category || '未分类';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(news);
  }
  
  return groups;
}

/**
 * 批量格式化新闻
 */
export function formatNewsList(newsList) {
  return newsList.map(formatNewsItem);
}
