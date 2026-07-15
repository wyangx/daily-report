import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  existsSync,
  readFileSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createFsReportStore, createMemoryReportStore } from './store.js';

const sampleReport = {
  date: '2026年7月14日星期二',
  updateTime: '2026/7/14 15:00:00',
  newsCount: 2,
  content: '# 今日标题\n\n正文',
  newsList: [
    { title: '新闻甲', link: 'https://a.example' },
    { title: '新闻乙', link: 'https://b.example' },
  ],
};

function assertStoreContract(createStore) {
  describe('store contract', () => {
    let store;

    beforeEach(() => {
      store = createStore();
    });

    it('空库返回 null / 空列表', () => {
      expect(store.getLatest()).toBeNull();
      expect(store.getByDate('2026-07-14')).toBeNull();
      expect(store.listArchives()).toEqual([]);
    });

    it('save 后 getLatest 与 getByDate 可读回', () => {
      store.save('2026-07-14', sampleReport);

      expect(store.getLatest()).toEqual(sampleReport);
      expect(store.getByDate('2026-07-14')).toEqual(sampleReport);
    });

    it('listArchives 按 dateKey 倒序，含 newsCount 与 content', () => {
      store.save('2026-07-13', {
        ...sampleReport,
        newsCount: 1,
        content: '昨天',
      });
      store.save('2026-07-14', sampleReport);

      expect(store.listArchives()).toEqual([
        { dateKey: '2026-07-14', newsCount: 2, content: sampleReport.content },
        { dateKey: '2026-07-13', newsCount: 1, content: '昨天' },
      ]);
    });

    it('不校验 schema，原样 round-trip 任意字段', () => {
      const weird = { foo: 1, nested: { bar: 'x' } };
      store.save('2026-01-01', weird);
      expect(store.getByDate('2026-01-01')).toEqual(weird);
    });

    it('getLatest 随最后一次 save 更新', () => {
      store.save('2026-07-13', { newsCount: 1, content: 'a' });
      store.save('2026-07-14', { newsCount: 3, content: 'b' });
      expect(store.getLatest()).toEqual({ newsCount: 3, content: 'b' });
    });
  });
}

describe('createMemoryReportStore', () => {
  assertStoreContract(() => createMemoryReportStore());

  it('返回值与内部存储隔离', () => {
    const store = createMemoryReportStore();
    store.save('2026-07-14', sampleReport);
    const got = store.getLatest();
    got.content = '被改了';
    expect(store.getLatest().content).toBe(sampleReport.content);
  });
});

describe('createFsReportStore', () => {
  let dir;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'report-store-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  assertStoreContract(() => createFsReportStore(dir));

  it('双写 latest.json 与 report-dateKey.json', () => {
    const store = createFsReportStore(dir);
    store.save('2026-07-14', sampleReport);

    const latestPath = join(dir, 'latest.json');
    const archivePath = join(dir, 'report-2026-07-14.json');
    expect(existsSync(latestPath)).toBe(true);
    expect(existsSync(archivePath)).toBe(true);
    expect(JSON.parse(readFileSync(latestPath, 'utf-8'))).toEqual(sampleReport);
    expect(JSON.parse(readFileSync(archivePath, 'utf-8'))).toEqual(sampleReport);
  });

  it('坏 JSON 归档降级为 newsCount 0 与空 content', () => {
    writeFileSync(join(dir, 'report-2026-07-10.json'), '{not-json', 'utf-8');
    const store = createFsReportStore(dir);
    expect(store.listArchives()).toEqual([
      { dateKey: '2026-07-10', newsCount: 0, content: '' },
    ]);
  });
});
