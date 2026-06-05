import { config } from './config.js';
import { startServer } from './web/server.js';
import { startScheduler, generateDailyReport } from './scheduler.js';

// 主函数
async function main() {
  console.log('=================================');
  console.log('  每日新闻日报系统');
  console.log('=================================');
  console.log('');
  
  // 检查配置
  if (!config.ai.apiKey) {
    console.warn('⚠️  警告: 未配置 AI_API_KEY，将使用备用总结方式');
    console.warn('   请在 .env 文件中设置 AI_API_KEY');
    console.warn('');
  }
  
  // 显示配置信息
  console.log('配置信息:');
  console.log(`  - AI模型: ${config.ai.model}`);
  console.log(`  - 服务端口: ${config.server.port}`);
  console.log(`  - 定时计划: ${config.cron.schedule}`);
  console.log(`  - RSS源数量: ${config.rssSources.length}`);
  console.log('');
  
  // 启动Web服务器
  startServer();
  
  // 启动定时任务
  startScheduler();
  
  // 启动时立即生成一次日报
  console.log('正在生成今日日报...');
  await generateDailyReport();
  
  console.log('');
  console.log('✅ 系统已启动，访问 http://localhost:' + config.server.port + ' 查看日报');
}

// 启动应用
main().catch(error => {
  console.error('启动失败:', error);
  process.exit(1);
});
