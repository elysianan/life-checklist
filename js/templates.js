/**
 * 清单大全模块
 */

const TemplateManager = {
  /**
   * 渲染「为你推荐」区域
   */
  async renderRecommendations() {
    const container = document.getElementById('recommendations-container');
    if (!container) return;

    try {
      const { items, refreshCount, canRefresh } = await RecommendationEngine.getRecommendations({ limit: 3 });

      if (!items || items.length === 0) {
        container.classList.add('hidden');
        return;
      }

      container.classList.remove('hidden');

      container.innerHTML = `
        <div class="recommendations-header">
          <h3>🎯 为你推荐</h3>
          <button class="refresh-btn" id="refresh-recommendations" ${canRefresh ? '' : 'disabled'}>
            换一批 ↻
          </button>
        </div>
        <div class="recommendations-scroll">
          ${items.map(item => this.createRecommendationCard(item)).join('')}
        </div>
      `;

      // 绑定卡片点击
      container.querySelectorAll('.recommendation-card').forEach(card => {
        const templateId = card.dataset.templateId;
        card.addEventListener('click', (e) => {
          if (e.target.closest('.recommendation-card-dismiss')) return;
          this.showTemplatePreview(templateId);
        });
      });

      // 绑定不感兴趣
      container.querySelectorAll('.recommendation-card-dismiss').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const templateId = btn.dataset.templateId;
          RecommendationEngine.dismissRecommendation(templateId);
          const card = btn.closest('.recommendation-card');
          card.style.opacity = '0';
          card.style.transform = 'scale(0.9)';
          setTimeout(() => this.renderRecommendations(), 250);
        });
      });

      // 绑定换一批
      const refreshBtn = document.getElementById('refresh-recommendations');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          refreshBtn.disabled = true;
          refreshBtn.textContent = '生成中...';
          await RecommendationEngine.refreshRecommendations({ limit: 3 });
          await this.renderRecommendations();
        });
      }
    } catch (e) {
      console.error('渲染推荐区域失败:', e);
      container.classList.add('hidden');
    }
  },

  /**
   * 创建推荐卡片 HTML
   */
  createRecommendationCard(item) {
    return `
      <div class="recommendation-card" data-template-id="${item.templateId}">
        <div class="recommendation-card-header">
          <div class="recommendation-card-meta">
            <span class="recommendation-card-emoji">${item.emoji}</span>
            <span class="recommendation-card-category">${item.category}</span>
          </div>
          <button class="recommendation-card-dismiss" data-template-id="${item.templateId}">×</button>
        </div>
        <h4 class="recommendation-card-title">${item.title}</h4>
        <p class="recommendation-card-reason">${item.reason}</p>
        <div class="recommendation-card-action">查看详情 →</div>
      </div>
    `;
  },

  /**
   * 显示模板预览（复用添加按钮逻辑，但不自动添加）
   */
  showTemplatePreview(templateId) {
    const template = TEMPLATE_LIBRARY.find(t => t.id === templateId);
    if (!template) return;

    const isAdded = StorageManager.isTemplateAdded(templateId);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 360px; max-height: 80vh; overflow-y: auto;">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style="background: ${template.color}15">
            ${template.emoji}
          </div>
          <div>
            <h3 class="text-lg font-bold">${template.title}</h3>
            <p class="text-sm text-apple-gray">${template.category} · ${template.taskCount} 项</p>
          </div>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">${template.description}</p>
        <div class="space-y-2 mb-4">
          ${template.tasks.slice(0, 5).map(task => `
            <div class="text-sm py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              ${typeof task === 'string' ? task : task.text}
            </div>
          `).join('')}
          ${template.tasks.length > 5 ? `<div class="text-center text-xs text-apple-gray">还有 ${template.tasks.length - 5} 项...</div>` : ''}
        </div>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel">关闭</button>
          <button class="modal-btn modal-btn-confirm" id="preview-add-template" ${isAdded ? 'disabled' : ''}>
            ${isAdded ? '已添加' : '添加到人生进度'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const addBtn = document.getElementById('preview-add-template');
    if (addBtn && !isAdded) {
      addBtn.addEventListener('click', () => {
        this.addTemplateToMyLists(templateId, addBtn);
      });
    }

    const closeBtn = overlay.querySelector('.modal-btn-cancel');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        overlay.remove();
      });
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  },

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

    // 渲染为你推荐
    this.renderRecommendations();

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
