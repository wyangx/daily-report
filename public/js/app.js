// 每日新闻日报 - 前端交互

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initBackToTop();
  initSmoothScroll();
  initActiveSourceTracking();
});

// 主题切换
function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  const dropdown = document.getElementById('theme-dropdown');
  const options = document.querySelectorAll('.theme-option');
  
  if (!toggleBtn || !dropdown) return;
  
  // 获取当前主题
  const currentTheme = localStorage.getItem('theme') || 'system';
  applyTheme(currentTheme);
  updateActiveOption(currentTheme);
  
  // 切换下拉菜单
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });
  
  // 点击选项
  options.forEach(option => {
    option.addEventListener('click', () => {
      const theme = option.dataset.theme;
      localStorage.setItem('theme', theme);
      applyTheme(theme);
      updateActiveOption(theme);
      dropdown.classList.remove('open');
    });
  });
  
  // 点击外部关闭下拉菜单
  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
  });
  
  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const savedTheme = localStorage.getItem('theme') || 'system';
    if (savedTheme === 'system') {
      applyTheme('system');
    }
  });
}

// 应用主题
function applyTheme(theme) {
  const html = document.documentElement;
  
  if (theme === 'system') {
    // 跟随系统：移除 data-theme 属性，让 CSS media query 生效
    html.removeAttribute('data-theme');
  } else {
    // 手动设置的主题
    html.setAttribute('data-theme', theme);
  }
}

// 更新选中状态
function updateActiveOption(theme) {
  const options = document.querySelectorAll('.theme-option');
  options.forEach(option => {
    option.classList.toggle('active', option.dataset.theme === theme);
  });
}

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
