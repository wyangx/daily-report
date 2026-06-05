// 每日新闻日报 - 前端交互

document.addEventListener('DOMContentLoaded', () => {
  initBackToTop();
  initSmoothScroll();
  initActiveSourceTracking();
});

// 返回顶部按钮
function initBackToTop() {
  const button = document.querySelector('.back-to-top');
  if (!button) return;
  
  let isVisible = false;
  
  const toggleVisibility = () => {
    const shouldShow = window.scrollY > 400;
    if (shouldShow !== isVisible) {
      isVisible = shouldShow;
      button.hidden = !shouldShow;
    }
  };
  
  window.addEventListener('scroll', toggleVisibility, { passive: true });
  
  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// 平滑滚动到锚点
function initSmoothScroll() {
  document.querySelectorAll('.source-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const target = document.getElementById(targetId) || 
                     document.querySelector(`[id*="${targetId}"]`);
      
      if (target) {
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

// 高亮当前阅读的来源
function initActiveSourceTracking() {
  const sourceLinks = document.querySelectorAll('.source-link');
  if (sourceLinks.length === 0) return;
  
  // 简单的IntersectionObserver实现
  const headings = document.querySelectorAll('h2, h3');
  
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            sourceLinks.forEach(link => {
              link.classList.toggle('active', 
                link.getAttribute('href') === `#${id}`
              );
            });
          }
        });
      },
      { rootMargin: '-80px 0px -80% 0px' }
    );
    
    headings.forEach(heading => {
      if (heading.id) observer.observe(heading);
    });
  }
}
