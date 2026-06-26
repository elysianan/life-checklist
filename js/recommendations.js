/**
 * AI 智能推荐清单引擎
 * 纯函数推荐逻辑 + LocalStorage 缓存管理
 */
const RecommendationEngine = {
  // 相关分类映射：用于扩展推荐广度
  RELATED_CATEGORIES: {
    '旅行': ['人生', '挑战', '美食'],
    '影视': ['人生', '体验'],
    '音乐': ['人生', '体验'],
    '阅读': ['成长', '人生'],
    '美食': ['旅行', '人生'],
    '情感': ['人生', '体验'],
    '挑战': ['旅行', '人生'],
    '人生': ['旅行', '体验', '挑战', '阅读']
  },

  // 默认推荐（兜底）
  DEFAULT_RECOMMENDATIONS: ['bucket_list', 'china_cities', 'books_100'],

  /**
   * 聚合用户上下文（纯函数，除读取 Storage 外无副作用）
   */
  _aggregateUserContext() {
    const lists = StorageManager.getLists() || [];
    const addedTemplates = StorageManager.getAddedTemplates() || [];
    const streakData = StorageManager.getStreakData() || StorageManager.getDefaultStreakData();
    const birthDate = StorageManager.getBirthDate();

    const completedByCategory = {};
    let totalCompleted = 0;
    const activeCategories = new Set();

    lists.forEach(list => {
      if (!list || !list.category) return;
      activeCategories.add(list.category);
      list.tasks.forEach(task => {
        if (task && task.completed) {
          completedByCategory[list.category] = (completedByCategory[list.category] || 0) + 1;
          totalCompleted++;
        }
      });
    });

    // 计算人生阶段（精确年龄：考虑今年生日是否已过）
    let lifeStage = '未知';
    if (birthDate) {
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      const dayDiff = today.getDate() - birth.getDate();
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
      }
      if (age < 25) lifeStage = '探索期';
      else if (age < 35) lifeStage = '成长期';
      else if (age < 50) lifeStage = '收获期';
      else lifeStage = '享受期';
    }

    return {
      completedByCategory,
      totalCompleted,
      activeCategories: Array.from(activeCategories),
      addedTemplates,
      streak: {
        current: streakData.currentStreak || 0,
        longest: streakData.longestStreak || 0
      },
      lifeStage,
      birthDate
    };
  },

  /**
   * 读取缓存
   */
  _getCache() {
    const data = localStorage.getItem(StorageManager.KEYS.RECOMMENDATIONS_CACHE);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('解析推荐缓存失败:', e);
        return null;
      }
    }
    return null;
  },

  /**
   * 写入缓存
   */
  _setCache(cache) {
    try {
      localStorage.setItem(StorageManager.KEYS.RECOMMENDATIONS_CACHE, JSON.stringify(cache));
    } catch (e) {
      console.warn('写入推荐缓存失败:', e);
    }
  },

  /**
   * 获取今天的日期字符串 YYYY-MM-DD
   */
  _todayStr() {
    return new Date().toISOString().split('T')[0];
  },

  /**
   * 对模板库打分并排序
   */
  _scoreTemplates(ctx) {
    const cache = this._getCache();
    const disliked = (cache && cache.disliked) || [];
    const lastCategories = (cache && cache.date === this._todayStr() && cache.items)
      ? Array.from(new Set(cache.items.map(item => {
          const t = TEMPLATE_LIBRARY.find(x => x.id === item.templateId);
          return t ? t.category : null;
        }).filter(Boolean)))
      : [];

    const candidates = TEMPLATE_LIBRARY.filter(t => !ctx.addedTemplates.includes(t.id) && !disliked.includes(t.id));

    const scored = candidates.map(template => {
      let score = 0;
      const sameCategoryCount = ctx.completedByCategory[template.category] || 0;
      score += sameCategoryCount * 2;

      const related = this.RELATED_CATEGORIES[template.category] || [];
      let relatedCount = 0;
      related.forEach(cat => {
        relatedCount += ctx.completedByCategory[cat] || 0;
      });
      score += relatedCount * 1;

      if (ctx.activeCategories.includes(template.category)) {
        score += 1.5;
      }

      if (template.category === '挑战' && ctx.streak.longest >= 7) {
        score += 1;
      }

      if (lastCategories.includes(template.category)) {
        score *= 0.6;
      }

      return { template, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored;
  },

  /**
   * 根据用户上下文生成推荐理由（本地规则）
   */
  _buildReason(template, ctx) {
    const category = template.category;
    const title = template.title;

    // 找出用户完成最多的分类
    let topCategory = '';
    let topCount = 0;
    Object.entries(ctx.completedByCategory).forEach(([cat, count]) => {
      if (count > topCount) {
        topCount = count;
        topCategory = cat;
      }
    });

    if (topCategory && category === topCategory) {
      return `「${topCategory}」是你最近最投入的方向，这份清单也许能给你新灵感。`;
    }

    if (ctx.streak.longest >= 7 && category === '挑战') {
      return '坚持打卡的你，值得一份新的挑战。';
    }

    const related = this.RELATED_CATEGORIES[category] || [];
    const matchedRelated = related.find(cat => ctx.completedByCategory[cat] > 0);
    if (matchedRelated) {
      return `既然你喜欢${matchedRelated}，不妨试试这份${category}清单。`;
    }

    if (ctx.totalCompleted <= 3) {
      return '人生清单很长，从这一份开始探索吧。';
    }

    if (ctx.lifeStage !== '未知') {
      return `适合${ctx.lifeStage}阶段的一份${category}清单。`;
    }

    return `一份精选的「${title}」，加入你的人生进度吧。`;
  },

  /**
   * 获取推荐清单（主入口）
   */
  async getRecommendations(options = {}) {
    const limit = options.limit || 3;
    const forceRefresh = options.forceRefresh || false;

    if (!forceRefresh) {
      const cache = this._getCache();
      if (cache && cache.date === this._todayStr() && cache.items && cache.items.length > 0) {
        return {
          items: cache.items,
          refreshCount: cache.refreshCount || 0,
          canRefresh: (cache.refreshCount || 0) < 3
        };
      }
    }

    const ctx = this._aggregateUserContext();
    const scored = this._scoreTemplates(ctx);

    let selected = scored.slice(0, limit);
    if (selected.length === 0) {
      selected = this.DEFAULT_RECOMMENDATIONS
        .map(id => ({ template: TEMPLATE_LIBRARY.find(t => t.id === id) }))
        .filter(x => x.template && !ctx.addedTemplates.includes(x.template.id) && !((this._getCache() || {}).disliked || []).includes(x.template.id))
        .slice(0, limit);
    }

    const items = [];
    for (const { template } of selected) {
      const baseReason = this._buildReason(template, ctx);
      let reason = baseReason;
      let source = 'rule';

      if (typeof AIService !== 'undefined' && AIService.generateRecommendationReason) {
        try {
          const polished = await AIService.generateRecommendationReason(baseReason, template, ctx);
          if (polished && polished.text) {
            reason = polished.text;
            source = polished.source || 'api';
          }
        } catch (e) {
          console.warn('AI 润色推荐理由失败:', e);
        }
      }

      items.push({
        templateId: template.id,
        title: template.title,
        emoji: template.emoji,
        category: template.category,
        color: template.color,
        taskCount: template.taskCount,
        reason,
        source
      });
    }

    const cache = this._getCache() || {};
    const refreshCount = forceRefresh ? ((cache.refreshCount || 0) + 1) : (cache.refreshCount || 0);
    this._setCache({
      date: this._todayStr(),
      items,
      refreshCount,
      disliked: cache.disliked || []
    });

    return {
      items,
      refreshCount,
      canRefresh: refreshCount < 3
    };
  },

  /**
   * 换一批
   */
  async refreshRecommendations(options = {}) {
    const cache = this._getCache();
    const currentCount = (cache && cache.refreshCount) || 0;
    if (currentCount >= 3) {
      return { items: [], refreshCount: currentCount, canRefresh: false };
    }
    return this.getRecommendations({ ...options, forceRefresh: true });
  },

  /**
   * 不感兴趣
   */
  dismissRecommendation(templateId) {
    const cache = this._getCache();
    if (!cache) return;

    cache.items = cache.items.filter(item => item.templateId !== templateId);
    cache.disliked = cache.disliked || [];
    if (!cache.disliked.includes(templateId)) {
      cache.disliked.push(templateId);
    }
    this._setCache(cache);
  },

  /**
   * 空状态引导用的轻量推荐（2 个固定热门）
   */
  getEmptyStateRecommendations() {
    return ['bucket_list', 'china_cities']
      .map(id => TEMPLATE_LIBRARY.find(t => t.id === id))
      .filter(Boolean)
      .map(t => ({ templateId: t.id, title: t.title, emoji: t.emoji, category: t.category }));
  }
};
