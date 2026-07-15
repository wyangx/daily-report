import { config } from '../config.js';
import { createOpenAiCompatibleAdapter } from './openai-adapter.js';

const SUMMARY_SYSTEM_PROMPT = `你是一位资深科技媒体主编，擅长从海量新闻中提炼核心洞察，撰写深度分析型日报。

你的写作风格：
- 标题要精准概括当日最重要的趋势或事件
- 核心要点不是简单摘要，而是深度分析：解释"为什么重要"、"意味着什么"、"接下来关注什么"
- 用简洁有力的语言，避免冗余
- 按领域分类时，要将相关新闻串联成叙事，而非简单罗列
- 引用新闻编号 [#N] 方便溯源`;

function createSilentLogger() {
  return {
    log() {},
    warn() {},
    error() {},
  };
}

/**
 * 构建新闻总结提示词
 */
export function buildSummaryPrompt(newsList) {
  const newsText = newsList.map((news, index) => {
    return `[#${index + 1}] ${news.title}
来源：${news.source} | 分类：${news.category}
时间：${news.formattedDate}
链接：${news.link}
摘要：${news.summary || '无摘要'}`;
  }).join('\n\n');
  
  return `请将以下新闻整理成一篇深度分析型日报。

## 输出格式要求

### 1. 标题
用一句话概括今日最重要的趋势或事件，要有洞察力，不要简单罗列关键词。

### 2. 核心要点（5条）
选出最重要的5条新闻，每条格式：
- **编号+标题** [如：1️⃣ SpaceX启动IPO：估值与市场潜力成为焦点]
- **深度分析**（3-5句话）：不是简单摘要，而是分析：
  - 这件事为什么重要？
  - 意味着什么趋势？
  - 接下来应该关注什么？
- **引用** [#N] 格式的新闻编号

### 3. 详细分析
按领域分类（如：资本市场、科技产业、互联网、公司商业、宏观政策等），每个领域：
- 一段综合分析，将该领域的相关新闻串联成叙事
- 引用相关新闻编号 [#N]
- 不要简单罗列，要有逻辑串联

### 4. 新闻编号列表
最后列出所有筛选后的新闻，格式：
序号. 分数（1-10） [来源] 标题

## 筛选标准
- 只保留重要、有影响力、值得关注的新闻
- 过滤琐碎公告、重复新闻、缺乏实质内容的新闻
- 优先保留：重大政策、技术革新、重要财报、大额融资、市场重大变动

## 今日新闻（共${newsList.length}条）

${newsText}

请生成日报：`;
}

function cleanSummaryContent(content) {
  let summary = content.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '');
  summary = summary.trim();

  if (summary.startsWith('{') && summary.endsWith('}')) {
    try {
      const parsed = JSON.parse(summary);
      if (parsed.content) summary = parsed.content;
      else if (parsed.text) summary = parsed.text;
      else if (parsed.message) summary = parsed.message;
    } catch {
      summary = summary
        .replace(/^\{[\s\S]*?"?content"?\s*:\s*"?/, '')
        .replace(/"?[\s]*\}$/, '');
    }
  }

  return summary.replace(/^[\s{"]+/, '').replace(/[\s}"]+$/, '');
}

function looksLikeAiError(summary) {
  const errorPatterns = [
    'request was rejected',
    'high risk',
    'error',
    'failed',
    'denied',
  ];

  return errorPatterns.some((pattern) =>
    summary.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * 创建新闻总结 module
 */
export function createNewsSummarizer({
  aiAdapter,
  getNow = () => new Date(),
  logger = createSilentLogger(),
}) {
  async function summarizeNews(newsList) {
    if (!newsList || newsList.length === 0) {
      return '今日暂无新闻。';
    }

    logger.log(`开始使用AI总结 ${newsList.length} 条新闻...`);

    try {
      const prompt = buildSummaryPrompt(newsList);
      let summary = await aiAdapter.complete(prompt);
      summary = cleanSummaryContent(summary);

      if (summary.length < 100) {
        logger.warn('AI返回的内容太短，使用备用总结');
        return generateFallbackSummary(newsList, getNow);
      }

      if (looksLikeAiError(summary) && summary.length < 500) {
        logger.warn('AI返回的内容包含错误信息，使用备用总结');
        return generateFallbackSummary(newsList, getNow);
      }

      summary = convertReferencesToLinks(summary, newsList);

      logger.log('AI总结完成');
      return summary.trim();
    } catch (error) {
      logger.error('AI总结失败:', error.message);
      return generateFallbackSummary(newsList, getNow);
    }
  }

  return { summarizeNews };
}

/**
 * 将 [#N] 引用转换为可点击的链接
 */
export function convertReferencesToLinks(content, newsList) {
  // 处理多个引用在一起的情况，如 [#1, #5] 或 [#1,#2,#3]
  return content.replace(/\[#([\d,\s#]+)\]/g, (match, numsStr) => {
    const nums = numsStr.match(/\d+/g);
    if (!nums) return match;
    
    const links = nums.map((num) => {
      const index = parseInt(num) - 1;
      if (index >= 0 && index < newsList.length) {
        const news = newsList[index];
        return `[<sup>#${num}</sup>](${news.link})`;
      }
      return `#${num}`;
    });
    
    return links.join(' ');
  });
}

/**
 * 生成备用总结（当AI不可用时）
 */
export function generateFallbackSummary(newsList, getNow = () => new Date()) {
  const date = getNow().toLocaleDateString('zh-CN');
  
  let markdown = `# 每日新闻日报\n\n`;
  markdown += `**日期**: ${date} | **新闻数量**: ${newsList.length} 条\n\n`;
  markdown += `---\n\n`;
  
  const groups = {};
  for (const news of newsList) {
    const category = news.category || '未分类';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(news);
  }
  
  for (const [category, items] of Object.entries(groups)) {
    markdown += `## ${category}\n\n`;
    
    for (const item of items) {
      markdown += `### ${item.title}\n`;
      markdown += `> **来源**: ${item.source} | **时间**: ${item.formattedDate}\n\n`;
      if (item.summary) {
        markdown += `${item.summary}\n\n`;
      }
      markdown += `[阅读原文](${item.link})\n\n`;
      markdown += `---\n\n`;
    }
  }
  
  return markdown;
}

const defaultAiAdapter = createOpenAiCompatibleAdapter({
  ...config.ai,
  systemPrompt: SUMMARY_SYSTEM_PROMPT,
});

const defaultSummarizer = createNewsSummarizer({
  aiAdapter: defaultAiAdapter,
  logger: console,
});

/**
 * 使用AI总结新闻（生产兼容入口）
 */
export async function summarizeNews(newsList) {
  return defaultSummarizer.summarizeNews(newsList);
}
