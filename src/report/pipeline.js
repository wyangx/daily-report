/**
 * 本地日历日 YYYY-MM-DD（不用 UTC，避免凌晨错日）
 */
export function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createSilentLogger() {
  return {
    log() {},
    warn() {},
    error() {},
  };
}

/**
 * 创建日报生成流水线
 */
export function createDailyReportPipeline({
  fetchNews,
  formatNewsList,
  summarizeNews,
  reportStore,
  getNow = () => new Date(),
  logger = createSilentLogger(),
}) {
  async function generateDailyReport() {
    logger.log('开始生成日报...');

    try {
      const rawNews = await fetchNews();

      if (rawNews.length === 0) {
        logger.warn('没有获取到新闻，跳过生成');
        return null;
      }

      const now = getNow();
      const yesterdayStart = new Date(now);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      yesterdayStart.setHours(0, 0, 0, 0);

      const dateFilteredNews = rawNews.filter((news) => {
        const pubDate = new Date(news.pubDate);
        return pubDate >= yesterdayStart && pubDate <= now;
      });

      logger.log(`日期过滤: ${rawNews.length} 条 → ${dateFilteredNews.length} 条 (昨天至今)`);

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = toLocalDateKey(yesterday);
      const yesterdayReport = reportStore.getByDate(yesterdayKey);
      const yesterdayTitles = new Set(
        yesterdayReport?.newsList?.map((news) => news.title) || []
      );

      if (yesterdayReport) {
        logger.log(`读取到昨天日报 ${yesterdayTitles.size} 条标题`);
      } else {
        logger.log(`没有找到昨天的日报: report-${yesterdayKey}.json`);
      }

      const newsToFilter = dateFilteredNews.length > 0 ? dateFilteredNews : rawNews;
      const uniqueNews = newsToFilter.filter((news) => !yesterdayTitles.has(news.title));

      logger.log(`去重过滤: ${newsToFilter.length} 条 → ${uniqueNews.length} 条 (去除与昨天重复)`);

      if (uniqueNews.length === 0) {
        logger.warn('去重后没有新闻，使用全部新闻');
      }

      const finalNews = uniqueNews.length > 0 ? uniqueNews : newsToFilter;
      const newsList = formatNewsList(finalNews);
      const summary = await summarizeNews(newsList);

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
        newsList,
      };

      const dateKey = toLocalDateKey(now);
      reportStore.save(dateKey, report);
      logger.log(`报告已保存: latest.json + report-${dateKey}.json`);
      logger.log('日报生成完成');

      return report;
    } catch (error) {
      logger.error('生成日报失败:', error);
      return null;
    }
  }

  return { generateDailyReport };
}
