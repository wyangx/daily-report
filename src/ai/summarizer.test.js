import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  summarizeNews,
  createNewsSummarizer,
  convertReferencesToLinks,
  generateFallbackSummary,
  buildSummaryPrompt,
} from './summarizer.js';

function createLogger() {
  return {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function createAiAdapter(content) {
  return {
    complete: vi.fn(async () => content),
  };
}

const newsList = [
  {
    title: '测试新闻1',
    source: '测试来源',
    category: '科技',
    formattedDate: '2026-06-09',
    link: 'https://example.com/1',
    summary: '测试摘要1',
  },
  {
    title: '测试新闻2',
    source: '测试来源',
    category: '财经',
    formattedDate: '2026-06-09',
    link: 'https://example.com/2',
    summary: '',
  },
];

describe('convertReferencesToLinks', () => {
  const references = [
    { link: 'https://example.com/1', title: '新闻1' },
    { link: 'https://example.com/2', title: '新闻2' },
    { link: 'https://example.com/3', title: '新闻3' },
  ];

  it('转换单个引用', () => {
    const result = convertReferencesToLinks('参考 [#1]', references);
    expect(result).toBe('参考 [<sup>#1</sup>](https://example.com/1)');
  });

  it('转换多个引用', () => {
    const result = convertReferencesToLinks('参考 [#1, #2]', references);
    expect(result).toBe(
      '参考 [<sup>#1</sup>](https://example.com/1) [<sup>#2</sup>](https://example.com/2)'
    );
  });

  it('转换逗号分隔的多个引用', () => {
    const result = convertReferencesToLinks('[#1,#2,#3]', references);
    expect(result).toBe(
      '[<sup>#1</sup>](https://example.com/1) [<sup>#2</sup>](https://example.com/2) [<sup>#3</sup>](https://example.com/3)'
    );
  });

  it('处理无效的引用编号', () => {
    const result = convertReferencesToLinks('参考 [#99]', references);
    expect(result).toBe('参考 #99');
  });
});

describe('generateFallbackSummary', () => {
  it('生成包含日期和新闻数量的标题', () => {
    const result = generateFallbackSummary(newsList, () => new Date(2026, 5, 9));
    expect(result).toContain('每日新闻日报');
    expect(result).toContain('2 条');
  });

  it('按分类分组新闻', () => {
    const result = generateFallbackSummary(newsList);
    expect(result).toContain('## 科技');
    expect(result).toContain('## 财经');
  });

  it('包含新闻标题、来源、摘要和阅读原文', () => {
    const result = generateFallbackSummary(newsList);
    expect(result).toContain('### 测试新闻1');
    expect(result).toContain('**来源**: 测试来源');
    expect(result).toContain('测试摘要1');
    expect(result).toContain('[阅读原文](https://example.com/1)');
  });

  it('处理空新闻列表', () => {
    const result = generateFallbackSummary([]);
    expect(result).toContain('0 条');
  });
});

describe('buildSummaryPrompt', () => {
  it('包含新闻数量', () => {
    const result = buildSummaryPrompt([newsList[0]]);
    expect(result).toContain('共1条');
  });

  it('包含新闻详情', () => {
    const result = buildSummaryPrompt([newsList[0]]);
    expect(result).toContain('[#1] 测试新闻1');
    expect(result).toContain('来源：测试来源');
    expect(result).toContain('分类：科技');
    expect(result).toContain('时间：2026-06-09');
    expect(result).toContain('链接：https://example.com/1');
    expect(result).toContain('摘要：测试摘要1');
  });

  it('处理无摘要的新闻', () => {
    const result = buildSummaryPrompt([{ ...newsList[0], summary: undefined }]);
    expect(result).toContain('摘要：无摘要');
  });
});

describe('createNewsSummarizer', () => {
  let logger;

  beforeEach(() => {
    logger = createLogger();
  });

  it('空列表返回提示且不调用 adapter', async () => {
    const aiAdapter = createAiAdapter('不会调用');
    const summarizer = createNewsSummarizer({ aiAdapter, logger });

    const result = await summarizer.summarizeNews([]);

    expect(result).toBe('今日暂无新闻。');
    expect(aiAdapter.complete).not.toHaveBeenCalled();
  });

  it('null 列表返回提示且不调用 adapter', async () => {
    const aiAdapter = createAiAdapter('不会调用');
    const summarizer = createNewsSummarizer({ aiAdapter, logger });

    const result = await summarizer.summarizeNews(null);

    expect(result).toBe('今日暂无新闻。');
    expect(aiAdapter.complete).not.toHaveBeenCalled();
  });

  it('AI 返回正常内容时清洗并转换引用', async () => {
    const aiResponse = '# 今日日报\n\n参考 [#1] 的内容，包含足够字符数以通过验证。'.repeat(10);
    const aiAdapter = createAiAdapter(aiResponse);
    const summarizer = createNewsSummarizer({ aiAdapter, logger });

    const result = await summarizer.summarizeNews(newsList);

    expect(result).toContain('今日日报');
    expect(result).toContain('[<sup>#1</sup>](https://example.com/1)');
    expect(aiAdapter.complete).toHaveBeenCalledWith(expect.stringContaining('测试新闻1'));
  });

  it('清理 system-reminder 标签', async () => {
    const aiResponse = '<system-reminder>内部消息</system-reminder>真正的日报内容，需要足够长以通过验证。'.repeat(10);
    const summarizer = createNewsSummarizer({ aiAdapter: createAiAdapter(aiResponse), logger });

    const result = await summarizer.summarizeNews(newsList);

    expect(result).not.toContain('system-reminder');
    expect(result).toContain('真正的日报内容');
  });

  it('清理 JSON 格式包装', async () => {
    const content = '这是AI生成的日报内容，包含足够的字符数以通过验证。'.repeat(10);
    const summarizer = createNewsSummarizer({
      aiAdapter: createAiAdapter(JSON.stringify({ content })),
      logger,
    });

    const result = await summarizer.summarizeNews(newsList);

    expect(result).toContain('这是AI生成的日报内容');
  });

  it('AI 返回内容太短时使用备用总结', async () => {
    const summarizer = createNewsSummarizer({
      aiAdapter: createAiAdapter('太短'),
      getNow: () => new Date(2026, 5, 9),
      logger,
    });

    const result = await summarizer.summarizeNews(newsList);

    expect(result).toContain('每日新闻日报');
    expect(result).toContain('测试新闻1');
  });

  it('AI 返回错误信息时使用备用总结', async () => {
    const summarizer = createNewsSummarizer({
      aiAdapter: createAiAdapter('Error: request was rejected'),
      logger,
    });

    const result = await summarizer.summarizeNews(newsList);

    expect(result).toContain('每日新闻日报');
  });

  it('adapter 抛错时使用备用总结', async () => {
    const aiAdapter = {
      complete: vi.fn(async () => {
        throw new Error('Network error');
      }),
    };
    const summarizer = createNewsSummarizer({ aiAdapter, logger });

    const result = await summarizer.summarizeNews(newsList);

    expect(result).toContain('每日新闻日报');
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('summarizeNews 兼容入口', () => {
  it('空列表返回提示', async () => {
    await expect(summarizeNews([])).resolves.toBe('今日暂无新闻。');
  });
});
