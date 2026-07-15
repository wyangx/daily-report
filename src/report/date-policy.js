/**
 * 本地日历日 YYYY-MM-DD（不用 UTC，避免凌晨错日）
 */
export function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 以本地时区解析 YYYY-MM-DD，避免 Date 字符串构造按 UTC 解析
 */
export function parseLocalDateKey(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    throw new Error(`无效日期键: ${dateKey}`);
  }

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function formatDisplayDate(date) {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

export function formatDateTime(date) {
  return date.toLocaleString('zh-CN');
}
