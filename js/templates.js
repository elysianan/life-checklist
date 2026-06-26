/**
 * 清单大全模块
 */

const TemplateManager = {
  /**
   * 渲染清单大全页面
   */
  renderTemplateLibrary() {
    const container = document.getElementById('template-library-container');
    if (!container) return;

    // 更新统计
    const addedCount = StorageManager.getAddedTemplates().length;
    document.getElementById('template-added-count').textContent = addedCount;
    document.getElementById('template-total-count').textContent = TEMPLATE_LIBRARY.length;

    // 获取分类
    const categories = this.getCategories();

    container.innerHTML = '';

    // 渲染每个分类
    categories.forEach(category => {
      const section = document.createElement('div');
      section.className = 'template-category';

      const templates = TEMPLATE_LIBRARY.filter(t => t.category === category);

      section.innerHTML = `
        <h3 class="template-category-title">${category}</h3>
        <div class="template-grid">
          ${templates.map(template => this.createTemplateCard(template)).join('')}
        </div>
      `;

      container.appendChild(section);
    });

    // 添加分类导航
    this.renderCategoryNav(categories);
  },

  /**
   * 获取所有分类
   */
  getCategories() {
    const categories = [...new Set(TEMPLATE_LIBRARY.map(t => t.category))];
    return categories;
  },

  /**
   * 渲染分类导航
   */
  renderCategoryNav(categories) {
    const nav = document.getElementById('template-category-nav');
    if (!nav) return;

    nav.innerHTML = `
      <div class="category-chip active" data-category="all">全部</div>
      ${categories.map(cat => `<div class="category-chip" data-category="${cat}">${cat}</div>`).join('')}
    `;

    // 绑定分类点击事件
    nav.querySelectorAll('.category-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        nav.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.filterTemplates(chip.dataset.category);
      });
    });
  },

  /**
   * 筛选模板
   */
  filterTemplates(category) {
    const container = document.getElementById('template-library-container');
    container.innerHTML = '';

    let templates = TEMPLATE_LIBRARY;
    if (category !== 'all') {
      templates = TEMPLATE_LIBRARY.filter(t => t.category === category);
    }

    // 按分类分组显示
    const categories = [...new Set(templates.map(t => t.category))];

    categories.forEach(cat => {
      const section = document.createElement('div');
      section.className = 'template-category';

      const catTemplates = templates.filter(t => t.category === cat);

      section.innerHTML = `
        <h3 class="template-category-title">${cat}</h3>
        <div class="template-grid">
          ${catTemplates.map(template => this.createTemplateCard(template)).join('')}
        </div>
      `;

      container.appendChild(section);
    });
  },

  /**
   * 创建模板卡片 HTML
   */
  createTemplateCard(template) {
    const isAdded = StorageManager.isTemplateAdded(template.id);

    return `
      <div class="template-card ${isAdded ? 'added' : ''}">
        <div class="template-card-emoji" style="background: ${template.color}15">
          ${template.emoji}
        </div>
        <div class="template-card-content">
          <h4 class="template-card-title">${template.title}</h4>
          <p class="template-card-desc">${template.description}</p>
          <div class="template-card-meta">
            <span class="template-card-count">${template.taskCount} 项</span>
            <span class="template-card-category">${template.category}</span>
          </div>
        </div>
        <button class="template-add-btn ${isAdded ? 'added' : ''}"
                onclick="TemplateManager.addTemplateToMyLists('${template.id}', this)"
                ${isAdded ? 'disabled' : ''}>
          ${isAdded ? '✓ 已添加' : '+ 添加'}
        </button>
      </div>
    `;
  },

  /**
   * 添加模板到我的人生进度
   */
  addTemplateToMyLists(templateId, button) {
    if (StorageManager.isTemplateAdded(templateId)) return;

    const template = TEMPLATE_LIBRARY.find(t => t.id === templateId);
    if (!template) return;

    const lists = StorageManager.getLists() || [];

    // 创建新的清单
    const newList = {
      id: template.id,
      emoji: template.emoji,
      title: template.title,
      description: template.description,
      color: template.color,
      category: template.category,
      isTemplate: true,
      tasks: template.tasks.map((task, index) => ({
        id: `${template.id}_task_${index}`,
        text: typeof task === 'string' ? task : task.text,
        completed: false,
        completedDate: '',
        note: '',
        priority: 'medium'
      }))
    };

    lists.push(newList);
    StorageManager.setLists(lists);
    StorageManager.addTemplate(templateId);

    AppState.lists = lists;

    // 更新按钮状态
    button.textContent = '✓ 已添加';
    button.classList.add('added');
    button.disabled = true;

    // 更新统计
    const addedCount = StorageManager.getAddedTemplates().length;
    document.getElementById('template-added-count').textContent = addedCount;

    // 显示提示
    this.showToast(`已添加「${template.title}」到人生进度 ✅`);

    // 检查成就
    const newAchievements = StorageManager.checkAchievements();
    if (newAchievements.length > 0) {
      setTimeout(() => {
        AchievementManager.showMultipleUnlock(newAchievements);
      }, 500);
    }
  },

  /**
   * 显示提示
   */
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'share-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
};
