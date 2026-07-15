import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from 'fs';
import { join } from 'path';

/**
 * 文件系统报告存储
 * @param {string} newsDir - 报告目录路径
 */
export function createFsReportStore(newsDir) {
  function ensureDir() {
    if (!existsSync(newsDir)) {
      mkdirSync(newsDir, { recursive: true });
    }
  }

  function getArchivePath(dateKey) {
    return join(newsDir, `report-${dateKey}.json`);
  }

  function getLatestPath() {
    return join(newsDir, 'latest.json');
  }

  function readJson(filePath) {
    if (!existsSync(filePath)) {
      return null;
    }
    try {
      return JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (error) {
      console.error(`读取报告失败 (${filePath}):`, error.message);
      return null;
    }
  }

  return {
    save(dateKey, report) {
      ensureDir();
      const payload = JSON.stringify(report, null, 2);
      writeFileSync(getLatestPath(), payload);
      writeFileSync(getArchivePath(dateKey), payload);
    },

    getLatest() {
      return readJson(getLatestPath());
    },

    getByDate(dateKey) {
      return readJson(getArchivePath(dateKey));
    },

    listArchives() {
      if (!existsSync(newsDir)) {
        return [];
      }

      try {
        const files = readdirSync(newsDir)
          .filter((file) => file.startsWith('report-') && file.endsWith('.json'))
          .sort()
          .reverse();

        return files.map((file) => {
          const dateKey = file.replace('report-', '').replace('.json', '');
          const report = readJson(join(newsDir, file));
          if (!report) {
            return { dateKey, newsCount: 0, content: '' };
          }
          return {
            dateKey,
            newsCount: report.newsCount || 0,
            content: report.content || '',
          };
        });
      } catch (error) {
        console.error('读取往期日报列表失败:', error.message);
        return [];
      }
    },
  };
}

/**
 * 内存报告存储（测试用）
 */
export function createMemoryReportStore() {
  let latest = null;
  const archives = new Map();

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  return {
    save(dateKey, report) {
      // 模拟文件系统存储的 JSON 序列化语义
      const copy = cloneJson(report);
      latest = copy;
      archives.set(dateKey, cloneJson(report));
    },

    getLatest() {
      return latest === null ? null : cloneJson(latest);
    },

    getByDate(dateKey) {
      if (!archives.has(dateKey)) {
        return null;
      }
      return cloneJson(archives.get(dateKey));
    },

    listArchives() {
      return [...archives.keys()]
        .sort()
        .reverse()
        .map((dateKey) => {
          const report = archives.get(dateKey);
          return {
            dateKey,
            newsCount: report?.newsCount || 0,
            content: report?.content || '',
          };
        });
    },
  };
}
