import { describe, it, expect } from 'vitest';
import {
  formatDateTime,
  formatDisplayDate,
  parseLocalDateKey,
  toLocalDateKey,
} from './date-policy.js';

describe('date policy', () => {
  it('toLocalDateKey 使用本地日历日', () => {
    expect(toLocalDateKey(new Date(2026, 6, 4, 1, 2, 3))).toBe('2026-07-04');
  });

  it('parseLocalDateKey 按本地时间解析 YYYY-MM-DD', () => {
    const date = parseLocalDateKey('2026-07-04');

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(4);
    expect(date.getHours()).toBe(0);
  });

  it('parseLocalDateKey 拒绝无效格式', () => {
    expect(() => parseLocalDateKey('2026/07/04')).toThrow('无效日期键');
  });

  it('formatDisplayDate 输出中文展示日期', () => {
    const result = formatDisplayDate(new Date(2026, 6, 4));
    expect(result).toContain('2026年7月4日');
  });

  it('formatDateTime 输出本地日期时间', () => {
    const result = formatDateTime(new Date(2026, 6, 4, 9, 8, 7));
    expect(result).toContain('2026');
  });
});
