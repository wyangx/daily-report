import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// 加载环境变量
import dotenv from 'dotenv';
dotenv.config({ path: join(ROOT_DIR, '.env') });

// 读取RSS源配置
function loadRssSources() {
  try {
    const configPath = join(ROOT_DIR, 'config', 'rss-sources.json');
    const configData = readFileSync(configPath, 'utf-8');
    return JSON.parse(configData).sources;
  } catch (error) {
    console.error('读取RSS源配置失败:', error.message);
    return [];
  }
}

export const config = {
  // AI API配置
  ai: {
    baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-3.5-turbo',
  },
  
  // 服务器配置
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
  
  // 定时任务配置
  cron: {
    schedule: process.env.CRON_SCHEDULE || '0 8 * * *',
  },
  
  // RSS源
  rssSources: loadRssSources(),
  
  // 路径配置
  paths: {
    root: ROOT_DIR,
    data: join(ROOT_DIR, 'data'),
    news: join(ROOT_DIR, 'data', 'news'),
    public: join(ROOT_DIR, 'public'),
  },
};
