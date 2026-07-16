import { describe, it, expect } from 'vitest';
import { extractReportTitle, normalizeReportMarkdown } from './content.js';

describe('normalizeReportMarkdown', () => {
  it('空内容返回空字符串', () => {
    expect(normalizeReportMarkdown('')).toBe('');
    expect(normalizeReportMarkdown(null)).toBe('');
  });

  it('清理开头残留大括号', () => {
    expect(normalizeReportMarkdown('{# 标题')).toBe('# 标题');
  });

  it('清理 AI 模板标题残留行', () => {
    const content = `### 1. 标题

正文

#### **2. 标题**

更多正文

#### 标题：

结尾`;

    expect(normalizeReportMarkdown(content)).toBe('正文\n\n更多正文\n\n结尾');
  });

  it('压缩多余空行', () => {
    expect(normalizeReportMarkdown('# 标题\n\n\n\n正文')).toBe('# 标题\n\n正文');
  });
});

describe('extractReportTitle', () => {
  it('空内容返回 null', () => {
    expect(extractReportTitle('')).toBeNull();
    expect(extractReportTitle(null)).toBeNull();
  });

  it('从 H1 提取标题', () => {
    expect(extractReportTitle('# 每日新闻日报\n\n正文')).toBe('每日新闻日报');
  });

  it('保持旧规则：从模板标题行提取标题占位', () => {
    expect(extractReportTitle('### 1. 标题\n\n正文')).toBe('1. 标题');
  });

  it('从 H3 粗体标题提取标题', () => {
    expect(extractReportTitle('### **资本市场升温**\n\n正文')).toBe('资本市场升温');
  });

  it('从标题字段提取标题', () => {
    const content = '**标题：**\n**AI 投资继续升温**\n\n正文';
    expect(extractReportTitle(content)).toBe('AI 投资继续升温');
  });

  it('忽略模板占位标题', () => {
    const content = '**1. 标题**\n\n真正的第一句话';
    expect(extractReportTitle(content)).toBe('真正的第一句话');
  });

  it('兜底取第一段普通文本', () => {
    expect(extractReportTitle('\n\n这是第一段正文\n第二段')).toBe('这是第一段正文');
  });

  it('限制标题长度', () => {
    const longTitle = `# ${'很长'.repeat(60)}`;
    expect(extractReportTitle(longTitle)).toHaveLength(80);
  });
});
