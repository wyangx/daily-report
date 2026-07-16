/**
 * 规范化报告 Markdown，屏蔽历史 AI 输出残留
 */
export function normalizeReportMarkdown(content) {
  if (!content) return '';

  let markdown = content.trim();

  if (markdown.startsWith('{')) {
    markdown = markdown.substring(1);
  }

  markdown = markdown.replace(/^###\s+\d+\.\s+标题\s*$/gm, '');
  markdown = markdown.replace(/^####\s+\*\*\d+\.\s+标题\*\*\s*$/gm, '');
  markdown = markdown.replace(/^####\s+标题[:：]?\s*$/gm, '');
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

  return markdown;
}

function formatTitle(title) {
  return title.trim().substring(0, 80);
}

/**
 * 从报告内容中提取展示标题
 */
export function extractReportTitle(content) {
  if (!content) return null;

  const markdown = content.replace(/^\s*\{/, '').trim();

  const titleSectionMatch = markdown.match(/^###\s+\d+\.\s+标题\s*\n\*\*(.+?)\*\*/m);
  if (titleSectionMatch) return formatTitle(titleSectionMatch[1]);

  const h3TitleMatch = markdown.match(/^###\s+\*\*(.+?)\*\*/m);
  if (h3TitleMatch) return formatTitle(h3TitleMatch[1]);

  const h3SimpleMatch = markdown.match(/^###\s+(.+)$/m);
  if (h3SimpleMatch) return formatTitle(h3SimpleMatch[1]);

  const h4TitleSectionMatch = markdown.match(/####\s+\*\*\d+\.\s+标题\*\*\s*\n\*\*(.+?)\*\*/);
  if (h4TitleSectionMatch) return formatTitle(h4TitleSectionMatch[1]);

  const boldTitleMatch = markdown.match(/\*\*标题[:：]?\*\*\s*\n\*\*(.+?)\*\*/);
  if (boldTitleMatch) return formatTitle(boldTitleMatch[1]);

  const h1Match = markdown.match(/^#\s+(.+)$/m);
  if (h1Match) return formatTitle(h1Match[1]);

  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('{')) {
      const boldMatch = trimmed.match(/^\*\*(.+?)\*\*/);
      if (boldMatch) {
        const text = boldMatch[1].trim();
        if (!text.match(/^\d+\.\s*标题$/)) {
          return formatTitle(text);
        }
      }
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('{') && !trimmed.startsWith('*')) {
      return formatTitle(trimmed);
    }
  }

  return null;
}
