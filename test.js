import { fetchAllNews } from './src/rss/fetcher.js';
import { formatNewsList } from './src/rss/parser.js';

async function test() {
  console.log('测试 RSS 抓取功能...\n');
  
  try {
    const news = await fetchAllNews();
    console.log(`成功抓取 ${news.length} 条新闻\n`);
    
    const formatted = formatNewsList(news);
    
    console.log('前 5 条新闻:');
    console.log('='.repeat(60));
    
    formatted.slice(0, 5).forEach((item, i) => {
      console.log(`\n${i + 1}. ${item.title}`);
      console.log(`   来源: ${item.source} | 分类: ${item.category}`);
      console.log(`   时间: ${item.formattedDate}`);
      console.log(`   链接: ${item.link}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('\n测试完成!');
  } catch (error) {
    console.error('测试失败:', error);
  }
}

test();
