import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  summarizeNews,
  convertReferencesToLinks,
  generateFallbackSummary,
  buildSummaryPrompt,
} from './summarizer.js';

// Mock config
vi.mock('../config.js', () => ({
  config: {
    ai: {
      baseUrl: 'http://localhost:3000',
      apiKey: 'test-key',
      model: 'test-model',
    },
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('convertReferencesToLinks', () => {
  const newsList = [
    { link: 'https://example.com/1', title: '新闻1' },
    { link: 'https://example.com/2', title: '新闻2' },
    { link: 'https://example.com/3', title: '新闻3' },
  ];

  it('转换单个引用', () => {
    const result = convertReferencesToLinks('参考 [#1]', newsList);
    expect(result).toBe('参考 [<sup>#1</sup>](https://example.com/1)');
  });

  it('转换多个引用', () => {
    const result = convertReferencesToLinks('参考 [#1, #2]', newsList);
    expect(result).toBe(
      '参考 [<sup>#1</sup>](https://example.com/1) [<sup>#2</sup>](https://example.com/2)'
    );
  });

  it('转换逗号分隔的多个引用', () => {
    const result = convertReferencesToLinks('[#1,#2,#3]', newsList);
    expect(result).toBe(
      '[<sup>#1</sup>](https://example.com/1) [<sup>#2</sup>](https://example.com/2) [<sup>#3</sup>](https://example.com/3)'
    );
  });

  it('处理无效的引用编号', () => {
    const result = convertReferencesToLinks('参考 [#99]', newsList);
    expect(result).toBe('参考 #99');
  });

  it('处理无引用的内容', () => {
    const result = convertReferencesToLinks('没有引用的内容', newsList);
    expect(result).toBe('没有引用的内容');
  });

  it('处理空内容', () => {
    const result = convertReferencesToLinks('', newsList);
    expect(result).toBe('');
  });
});

describe('generateFallbackSummary', () => {
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
      category: '科技',
      formattedDate: '2026-06-09',
      link: 'https://example.com/2',
      summary: '测试摘要2',
    },
    {
      title: '测试新闻3',
      source: '测试来源',
      category: '财经',
      formattedDate: '2026-06-09',
      link: 'https://example.com/3',
      summary: '',
    },
  ];

  it('生成包含日期和新闻数量的标题', () => {
    const result = generateFallbackSummary(newsList);
    expect(result).toContain('每日新闻日报');
    expect(result).toContain('3 条');
  });

  it('按分类分组新闻', () => {
    const result = generateFallbackSummary(newsList);
    expect(result).toContain('## 科技');
    expect(result).toContain('## 财经');
  });

  it('包含新闻标题', () => {
    const result = generateFallbackSummary(newsList);
    expect(result).toContain('### 测试新闻1');
    expect(result).toContain('### 测试新闻2');
    expect(result).toContain('### 测试新闻3');
  });

  it('包含来源和时间', () => {
    const result = generateFallbackSummary(newsList);
    expect(result).toContain('**来源**: 测试来源');
    expect(result).toContain('**时间**: 2026-06-09');
  });

  it('包含摘要（如果有）', () => {
    const result = generateFallbackSummary(newsList);
    expect(result).toContain('测试摘要1');
    expect(result).toContain('测试摘要2');
  });

  it('包含阅读原文链接', () => {
    const result = generateFallbackSummary(newsList);
    expect(result).toContain('[阅读原文](https://example.com/1)');
    expect(result).toContain('[阅读原文](https://example.com/2)');
  });

  it('处理空摘要', () => {
    const result = generateFallbackSummary(newsList);
    // 新闻3没有摘要，但应该包含其他内容
    expect(result).toContain('### 测试新闻3');
  });

  it('处理空新闻列表', () => {
    const result = generateFallbackSummary([]);
    expect(result).toContain('0 条');
  });
});

describe('buildSummaryPrompt', () => {
  const newsList = [
    {
      title: '测试新闻',
      source: '测试来源',
      category: '科技',
      formattedDate: '2026-06-09',
      link: 'https://example.com/1',
      summary: '测试摘要',
    },
  ];

  it('包含新闻数量', () => {
    const result = buildSummaryPrompt(newsList);
    expect(result).toContain('共1条');
  });

  it('包含新闻详情', () => {
    const result = buildSummaryPrompt(newsList);
    expect(result).toContain('[#1] 测试新闻');
    expect(result).toContain('来源：测试来源');
    expect(result).toContain('分类：科技');
    expect(result).toContain('时间：2026-06-09');
    expect(result).toContain('链接：https://example.com/1');
    expect(result).toContain('摘要：测试摘要');
  });

  it('处理无摘要的新闻', () => {
    const newsWithoutSummary = [{ ...newsList[0], summary: undefined }];
    const result = buildSummaryPrompt(newsWithoutSummary);
    expect(result).toContain('摘要：无摘要');
  });

  it('包含输出格式要求', () => {
    const result = buildSummaryPrompt(newsList);
    expect(result).toContain('输出格式要求');
    expect(result).toContain('核心要点');
    expect(result).toContain('详细分析');
  });
});

describe('summarizeNews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('空列表返回提示', async () => {
    const result = await summarizeNews([]);
    expect(result).toBe('今日暂无新闻。');
  });

  it('null 列表返回提示', async () => {
    const result = await summarizeNews(null);
    expect(result).toBe('今日暂无新闻。');
  });

  it('AI 返回正常内容时进行处理', async () => {
    const newsList = [
      {
        title: '测试新闻',
        source: '测试来源',
        category: '科技',
        formattedDate: '2026-06-09',
        link: 'https://example.com/1',
        summary: '测试摘要',
      },
    ];

    const aiResponse = '# 今日日报\n\n这是AI生成的日报内容，包含足够的字符数以通过验证。'.repeat(10);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: aiResponse } }],
      }),
    });

    const result = await summarizeNews(newsList);
    expect(result).toContain('今日日报');
    expect(result).not.toBe('今日暂无新闻。');
  });

  it('清理 system-reminder 标签', async () => {
    const newsList = [
      {
        title: '测试新闻',
        source: '测试来源',
        category: '科技',
        formattedDate: '2026-06-09',
        link: 'https://example.com/1',
        summary: '测试摘要',
      },
    ];

    const aiResponse = '<system-reminder>内部消息</system-reminder>真正的日报内容，需要足够长以通过验证。'.repeat(10);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: aiResponse } }],
      }),
    });

    const result = await summarizeNews(newsList);
    expect(result).not.toContain('system-reminder');
    expect(result).toContain('真正的日报内容');
  });

  it('清理 JSON 格式包装', async () => {
    const newsList = [
      {
        title: '测试新闻',
        source: '测试来源',
        category: '科技',
        formattedDate: '2026-06-09',
        link: 'https://example.com/1',
        summary: '测试摘要',
      },
    ];

    const content = '这是AI生成的日报内容，包含足够的字符数以通过验证。'.repeat(10);
    const aiResponse = JSON.stringify({ content });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: aiResponse } }],
      }),
    });

    const result = await summarizeNews(newsList);
    expect(result).toContain('这是AI生成的日报内容');
  });

  it('AI 返回内容太短时使用备用总结', async () => {
    const newsList = [
      {
        title: '测试新闻',
        source: '测试来源',
        category: '科技',
        formattedDate: '2026-06-09',
        link: 'https://example.com/1',
        summary: '测试摘要',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '太短' } }],
      }),
    });

    const result = await summarizeNews(newsList);
    expect(result).toContain('每日新闻日报');
    expect(result).toContain('测试新闻');
  });

  it('AI 返回错误信息时使用备用总结', async () => {
    const newsList = [
      {
        title: '测试新闻',
        source: '测试来源',
        category: '科技',
        formattedDate: '2026-06-09',
        link: 'https://example.com/1',
        summary: '测试摘要',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Error: request was rejected' } }],
      }),
    });

    const result = await summarizeNews(newsList);
    expect(result).toContain('每日新闻日报');
  });

  it('AI API 请求失败时使用备用总结', async () => {
    const newsList = [
      {
        title: '测试新闻',
        source: '测试来源',
        category: '科技',
        formattedDate: '2026-06-09',
        link: 'https://example.com/1',
        summary: '测试摘要',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const result = await summarizeNews(newsList);
    expect(result).toContain('每日新闻日报');
  });

  it('网络错误时使用备用总结', async () => {
    const newsList = [
      {
        title: '测试新闻',
        source: '测试来源',
        category: '科技',
        formattedDate: '2026-06-09',
        link: 'https://example.com/1',
        summary: '测试摘要',
      },
    ];

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await summarizeNews(newsList);
    expect(result).toContain('每日新闻日报');
  });

  it('将 [#N] 引用转换为链接', async () => {
    const newsList = [
      {
        title: '测试新闻',
        source: '测试来源',
        category: '科技',
        formattedDate: '2026-06-09',
        link: 'https://example.com/1',
        summary: '测试摘要',
      },
    ];

    const aiResponse = '参考 [#1] 的内容。'.repeat(20);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: aiResponse } }],
      }),
    });

    const result = await summarizeNews(newsList);
    expect(result).toContain('[<sup>#1</sup>](https://example.com/1)');
  });
});
