import { describe, it, expect, vi } from 'vitest';
import { createDailyReportPipeline } from './pipeline.js';
import { createMemoryReportStore } from './store.js';

const fixedNow = new Date(2026, 6, 14, 15, 30, 0);

function createLogger() {
  return {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function createNews(overrides = {}) {
  return {
    title: '新闻甲',
    link: 'https://example.com/a',
    summary: '摘要',
    pubDate: new Date(2026, 6, 14, 9, 0, 0),
    source: '来源',
    category: '分类',
    ...overrides,
  };
}

function createPipeline(overrides = {}) {
  const reportStore = overrides.reportStore || createMemoryReportStore();
  const logger = overrides.logger || createLogger();
  const formatNewsList = overrides.formatNewsList || vi.fn((newsList) =>
    newsList.map((news) => ({
      ...news,
      formattedDate: '2026-07-14 09:00',
    }))
  );
  const summarizeNews = overrides.summarizeNews || vi.fn(() => '日报正文');
  const fetchNews = overrides.fetchNews || vi.fn(() => [createNews()]);

  const pipeline = createDailyReportPipeline({
    fetchNews,
    formatNewsList,
    summarizeNews,
    reportStore,
    getNow: overrides.getNow || (() => fixedNow),
    logger,
  });

  return {
    pipeline,
    reportStore,
    logger,
    formatNewsList,
    summarizeNews,
    fetchNews,
  };
}

describe('createDailyReportPipeline', () => {
  it('生成日报并保存到今天的 dateKey', async () => {
    const { pipeline, reportStore, formatNewsList, summarizeNews } = createPipeline();

    const report = await pipeline.generateDailyReport();

    expect(formatNewsList).toHaveBeenCalledWith([createNews()]);
    expect(summarizeNews).toHaveBeenCalledWith(report.newsList);
    const storedReport = JSON.parse(JSON.stringify(report));
    expect(reportStore.getLatest()).toEqual(storedReport);
    expect(reportStore.getByDate('2026-07-14')).toEqual(storedReport);
    expect(report.newsCount).toBe(1);
    expect(report.content).toBe('日报正文');
  });

  it('抓不到新闻时返回 null 且不保存', async () => {
    const { pipeline, reportStore, summarizeNews } = createPipeline({
      fetchNews: vi.fn(() => []),
    });

    const report = await pipeline.generateDailyReport();

    expect(report).toBeNull();
    expect(reportStore.getLatest()).toBeNull();
    expect(summarizeNews).not.toHaveBeenCalled();
  });

  it('时间窗为空时回退到全部新闻', async () => {
    const oldNews = createNews({
      title: '旧新闻',
      pubDate: new Date(2026, 5, 1, 9, 0, 0),
    });
    const { pipeline, formatNewsList } = createPipeline({
      fetchNews: vi.fn(() => [oldNews]),
    });

    await pipeline.generateDailyReport();

    expect(formatNewsList).toHaveBeenCalledWith([oldNews]);
  });

  it('过滤昨天日报里已出现的标题', async () => {
    const reportStore = createMemoryReportStore();
    reportStore.save('2026-07-13', {
      newsList: [{ title: '新闻甲' }],
    });

    const newNews = createNews({ title: '新闻乙' });
    const { pipeline, formatNewsList } = createPipeline({
      reportStore,
      fetchNews: vi.fn(() => [createNews(), newNews]),
    });

    await pipeline.generateDailyReport();

    expect(formatNewsList).toHaveBeenCalledWith([newNews]);
  });

  it('去重后为空时回退到去重前新闻', async () => {
    const reportStore = createMemoryReportStore();
    const duplicateNews = createNews();
    reportStore.save('2026-07-13', {
      newsList: [{ title: duplicateNews.title }],
    });

    const { pipeline, formatNewsList } = createPipeline({
      reportStore,
      fetchNews: vi.fn(() => [duplicateNews]),
    });

    await pipeline.generateDailyReport();

    expect(formatNewsList).toHaveBeenCalledWith([duplicateNews]);
  });

  it('任意错误都会记录并返回 null', async () => {
    const logger = createLogger();
    const { pipeline, reportStore } = createPipeline({
      fetchNews: vi.fn(() => {
        throw new Error('boom');
      }),
      logger,
    });

    const report = await pipeline.generateDailyReport();

    expect(report).toBeNull();
    expect(reportStore.getLatest()).toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });
});
