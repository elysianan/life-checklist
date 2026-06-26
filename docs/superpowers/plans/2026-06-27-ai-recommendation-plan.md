# AI 智能推荐清单 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为「人生已完成清单」增加 AI 智能推荐清单功能：在「清单大全」顶部展示 3 张横向推荐卡片，支持换一批/不感兴趣；在「我的人生进度」空状态时显示引导；推荐由本地规则引擎生成，AI 可选润色推荐理由。

**Architecture:** 新增独立的 `js/recommendations.js` 纯函数推荐引擎（数据聚合 → 规则打分 → 缓存管理 → 理由生成），扩展 `js/aiService.js` 提供推荐理由润色，UI 层由 `templates.js` 和 `app.js` 调用引擎并渲染。保持与 AI 人生报告一致的「混合 AI + 优雅降级」策略。

**Tech Stack:** HTML5, Tailwind CSS, 原生 JavaScript (ES6), LocalStorage, Node.js `vm` + `assert` 单元测试。

## Global Constraints

- 必须保持现有代码风格：模块化对象（如 `RecommendationEngine`）、中文注释、驼峰命名。
- 所有新增 JS 文件必须在 `index.html` 中按依赖顺序加载：`data.js` → `storage.js` → `settings.js` → `aiService.js` → `recommendations.js` → `templates.js` → `app.js`。
- 推荐功能必须零配置可用；AI 仅用于润色推荐理由，不替代推荐逻辑。
- 所有 LocalStorage Key 必须经 `StorageManager.KEYS` 统一管理（新增 `RECOMMENDATIONS_CACHE`）。
- 核心推荐逻辑必须是纯函数，可独立测试；UI 层只负责调用和渲染。
- 每次完成任务后必须提交一次 Git commit；每次 commit 信息前缀：`feat:` / `test:` / `docs:` / `style:` / `refactor:`。
- 单测运行命令：`node test/recommendations-test.cjs`，预期输出 `✅` 且无 `❌`。

---

## File Structure

| 文件 | 动作 | 职责 |
|------|------|------|
| `js/recommendations.js` | 新建 | 推荐引擎：数据聚合、规则打分、理由生成、缓存、不感兴趣、刷新 |
| `test/recommendations-test.cjs` | 新建 | 推荐引擎单元测试（7 个断言场景） |
| `js/aiService.js` | 修改 | 新增 `generateRecommendationReason()` 函数 |
| `index.html` | 修改 | 新增 `#recommendations-container`；调整 script 加载顺序 |
| `css/style.css` | 修改 | 推荐区域、卡片、横向滚动、按钮样式 |
| `js/templates.js` | 修改 | 渲染「为你推荐」区域；绑定换一批/不感兴趣/查看详情事件 |
| `js/app.js` | 修改 | `renderListCards()` 空状态时显示推荐引导 |
| `js/storage.js` | 修改 | 新增 `RECOMMENDATIONS_CACHE` Key 及辅助方法 |
| `README.md` | 修改 | 功能特性补充 AI 智能推荐清单 |
| `CHANGELOG.md` | 修改 | 新增 v6.3.0 变更日志 |

---

### Task 1: 推荐引擎核心 `js/recommendations.js`

**Files:**
- Create: `js/recommendations.js`
- Test: `test/recommendations-test.cjs`

**Interfaces:**
- Consumes: `StorageManager`（用户数据、缓存读写）、`TEMPLATE_LIBRARY`（候选模板）、`AIService.generateRecommendationReason()`（可选润色）
- Produces:
  - `RecommendationEngine.getRecommendations(options)` → `Promise<{items: RecommendationItem[], refreshCount: number, canRefresh: boolean}>`
  - `RecommendationEngine.dismissRecommendation(templateId)` → 无返回值，更新缓存
  - `RecommendationEngine.refreshRecommendations(options)` → `Promise<{items, refreshCount, canRefresh}>`
  - `RecommendationEngine.getEmptyStateRecommendations()` → `RecommendationItem[]`
  - `RecommendationEngine._aggregateUserContext()` → `UserContext`（测试用）
  - `RecommendationEngine._scoreTemplates(ctx)` → `ScoredTemplate[]`（测试用）
  - `RecommendationEngine._buildReason(template, ctx)` → `string`（测试用）

---

- [ ] **Step 1.1: 写第一个失败测试（数据聚合）**

在 `test/recommendations-test.cjs` 中创建测试文件骨架，并写入第一个断言：给定用户数据，`_aggregateUserContext()` 应返回正确的 `completedByCategory`。

```js
/**
 * Recommendations 模块单元测试
 * 用法：node test/recommendations-test.cjs
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const store = {};
const sandbox = {
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  },
  console, Date, Math, JSON, Object, Array, parseInt, parseFloat, isNaN,
  setTimeout, clearTimeout, AbortController: global.AbortController, fetch: global.fetch,
  __done: (p, f) => { console.log(`\n结果: ${p} 通过 / ${f} 失败`); if (f > 0) process.exitCode = 1; }
};

const root = path.join(__dirname, '..');
const files = ['js/data.js', 'js/storage.js', 'js/settings.js', 'js/aiService.js', 'js/recommendations.js']
  .filter(f => fs.existsSync(path.join(root, f)));
let code = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');

const today = new Date();
const T = today.toISOString().split('T')[0];
const SEED_LISTS = [
  { id: 'travel', emoji: '🌍', title: '环游世界', description: '', color: '#007AFF', category: '旅行',
    tasks: [
      { id: 'a', text: '看极光', completed: true, completedDate: T, note: '', priority: 'medium' },
      { id: 'b', text: '去巴黎', completed: true, completedDate: T, note: '', priority: 'medium' },
      { id: 'c', text: '潜水', completed: false, completedDate: '', note: '', priority: 'medium' }
    ] },
  { id: 'skills', emoji: '🎯', title: '技能解锁', description: '', color: '#FF9500', category: '成长',
    tasks: [
      { id: 'd', text: '学吉他', completed: true, completedDate: T, note: '', priority: 'medium' }
    ] }
];

code += `
;(async function(){
  let passed=0, failed=0;
  const assert=(n,c)=>{ c?passed++:failed++; console.log((c?'✅':'❌')+' '+n); };
  localStorage.clear();
  StorageManager.setLists(${JSON.stringify(SEED_LISTS)});
  StorageManager.setAddedTemplates([]);
  StorageManager.setStreakData({currentStreak:5,longestStreak:9,lastCheckDate:new Date().toDateString(),todayChecked:true});

  // ---- Task 1：数据聚合 ----
  const ctx = RecommendationEngine._aggregateUserContext();
  assert('_aggregateUserContext 返回对象', ctx && typeof ctx==='object');
  assert('旅行分类完成数为 2', ctx.completedByCategory['旅行']===2);
  assert('成长分类完成数为 1', ctx.completedByCategory['成长']===1);
  assert('总完成数为 3', ctx.totalCompleted===3);

  __done(passed, failed);
})();
`;

vm.runInNewContext(code, sandbox, { filename: 'recommendations-test-bundle.js' });
```

- [ ] **Step 1.2: 运行测试，确认失败**

Run:
```bash
node test/recommendations-test.cjs
```
Expected: FAIL with `RecommendationEngine is not defined`

- [ ] **Step 1.3: 实现 `js/recommendations.js` 的数据聚合与缓存骨架**

创建 `js/recommendations.js`：

```js
/**
 * AI 智能推荐清单引擎
 * 纯函数推荐逻辑 + LocalStorage 缓存管理
 */
const RecommendationEngine = {
  KEYS: {
    CACHE: 'life_checklist_recommendations_cache'
  },

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
   * 聚合用户上下文（纯函数，除读取 Storage 外无副作 用）
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

    // 计算人生阶段
    let lifeStage = '未知';
    if (birthDate) {
      const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
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
    const data = localStorage.getItem(this.KEYS.CACHE);
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
      localStorage.setItem(this.KEYS.CACHE, JSON.stringify(cache));
    } catch (e) {
      console.warn('写入推荐缓存失败:', e);
    }
  },

  /**
   * 获取今天的日期字符串 YYYY-MM-DD
   */
  _todayStr() {
    return new Date().toISOString().split('T')[0];
  }
};
```

- [ ] **Step 1.4: 运行测试，确认通过**

Run:
```bash
node test/recommendations-test.cjs
```
Expected: PASS all 4 assertions

- [ ] **Step 1.5: 写失败测试（规则打分与过滤）**

在 `test/recommendations-test.cjs` 中 `_aggregateUserContext` 断言后增加：

```js
  // ---- Task 2：规则打分 ----
  const scored = RecommendationEngine._scoreTemplates(ctx);
  assert('_scoreTemplates 返回数组', Array.isArray(scored) && scored.length > 0);
  assert('已添加模板被过滤', !scored.some(s => s.template.id === 'travel'));
  assert('Top 1 是旅行相关模板', scored[0].template.category === '旅行' || this.RELATED_CATEGORIES['旅行'].includes(scored[0].template.category));
```

注意：`test/recommendations-test.cjs` 中的 `this.RELATED_CATEGORIES` 要改成 `RecommendationEngine.RELATED_CATEGORIES`。完整断言：

```js
  assert('Top 1 是旅行相关模板',
    scored[0].template.category === '旅行' ||
    RecommendationEngine.RELATED_CATEGORIES['旅行'].includes(scored[0].template.category));
```

- [ ] **Step 1.6: 实现 `_scoreTemplates` 规则打分**

在 `js/recommendations.js` 中 `_setCache` 之后添加：

```js
  /**
   * 对模板库打分并排序
   */
  _scoreTemplates(ctx) {
    const cache = this._getCache();
    const lastCategories = (cache && cache.date === this._todayStr() && cache.items)
      ? cache.items.map(item => {
          const t = TEMPLATE_LIBRARY.find(x => x.id === item.templateId);
          return t ? t.category : null;
        }).filter(Boolean)
      : [];

    const candidates = TEMPLATE_LIBRARY.filter(t => !ctx.addedTemplates.includes(t.id));

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
```

- [ ] **Step 1.7: 运行测试，确认通过**

Run:
```bash
node test/recommendations-test.cjs
```
Expected: PASS 7 assertions

- [ ] **Step 1.8: 写失败测试（推荐理由生成）**

在测试中增加：

```js
  // ---- Task 3：推荐理由 ----
  const reason = RecommendationEngine._buildReason(scored[0].template, ctx);
  assert('_buildReason 返回非空字符串', typeof reason === 'string' && reason.length > 0);
  assert('理由包含分类名', reason.includes(scored[0].template.category) || reason.includes('最近'));
```

- [ ] **Step 1.9: 实现 `_buildReason` 推荐理由模板**

在 `js/recommendations.js` 中添加：

```js
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
```

- [ ] **Step 1.10: 运行测试，确认通过**

Run:
```bash
node test/recommendations-test.cjs
```
Expected: PASS 9 assertions

- [ ] **Step 1.11: 写失败测试（Top-level 推荐生成）**

在测试中增加：

```js
  // ---- Task 4：完整推荐生成 ----
  const recs = await RecommendationEngine.getRecommendations({ limit: 3 });
  assert('getRecommendations 返回 items 数组', Array.isArray(recs.items) && recs.items.length === 3);
  assert('每项含 templateId、reason、source', recs.items.every(i => i.templateId && i.reason && i.source));
  assert('缓存已写入', localStorage.getItem('life_checklist_recommendations_cache') !== null);
```

- [ ] **Step 1.12: 实现 `getRecommendations` / `refreshRecommendations` / `dismissRecommendation` / `getEmptyStateRecommendations`**

在 `js/recommendations.js` 中添加：

```js
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
        .filter(x => x.template && !ctx.addedTemplates.includes(x.template.id))
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
```

- [ ] **Step 1.13: 运行测试，确认通过**

Run:
```bash
node test/recommendations-test.cjs
```
Expected: PASS 12 assertions

- [ ] **Step 1.14: 提交**

```bash
git add js/recommendations.js test/recommendations-test.cjs
git commit -m "feat: 新增 AI 智能推荐清单引擎与单元测试"
```

---

### Task 2: 扩展 `js/aiService.js` 推荐理由润色

**Files:**
- Modify: `js/aiService.js`
- Test: `test/recommendations-test.cjs`（复用同一测试文件，追加断言）

**Interfaces:**
- Consumes: `SettingsManager.getAIConfig()`, existing `callRealAPIWithPrompt()` helper (to be added)
- Produces: `AIService.generateRecommendationReason(baseReason, template, userContext)` → `{source: 'rule'|'api', text: string, degraded?: boolean}`

---

- [ ] **Step 2.1: 写失败测试（AI 润色降级）**

在 `test/recommendations-test.cjs` 末尾、调用 `__done` 之前增加：

```js
  // ---- Task 5：AI 推荐理由润色降级 ----
  const polished = await AIService.generateRecommendationReason('测试理由', { title: '测试', category: '旅行' }, ctx);
  assert('未配置 AI 时返回 rule', polished.source === 'rule');
  assert('未配置 AI 时返回原理由', polished.text === '测试理由');
```

- [ ] **Step 2.2: 运行测试，确认失败**

Run:
```bash
node test/recommendations-test.cjs
```
Expected: FAIL with `AIService.generateRecommendationReason is not a function`

- [ ] **Step 2.3: 实现 `generateRecommendationReason` 和通用 prompt 调用**

在 `js/aiService.js` 中 `testConnection` 方法之后、闭合 `};` 之前添加：

```js
  /**
   * 调用真实大模型处理自定义 prompt（OpenAI 兼容）
   * 15 秒超时
   */
  async callRealAPIWithPrompt(prompt, config) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const resp = await fetch(`${config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: '你是一位温暖、真诚的人生记录助手。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 80
        }),
        signal: controller.signal
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      const text = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content.trim()
        : '';
      if (!text) throw new Error('空响应');
      return text;
    } finally {
      clearTimeout(timer);
    }
  },

  /**
   * 润色推荐理由
   * @returns {{source:'rule'|'api', text:string, degraded?:boolean}}
   */
  async generateRecommendationReason(baseReason, template, userContext) {
    const cfg = SettingsManager.getAIConfig();
    if (!cfg.enabled || !cfg.apiKey) {
      return { source: 'rule', text: baseReason };
    }

    const prompt = [
      '你是一位温暖的人生记录助手。请把下面这条推荐理由改得更自然、更有温度，25-35 字以内，不要改变原意，不要加标题。',
      `推荐理由：「${baseReason}」`,
      `推荐清单：${template.title}（${template.category}）`
    ].join('\n');

    try {
      const text = await this.callRealAPIWithPrompt(prompt, cfg);
      return { source: 'api', text };
    } catch (e) {
      console.warn('AI 润色推荐理由失败，降级规则引擎:', e.message);
      return { source: 'rule', text: baseReason, degraded: true };
    }
  }
```

注意：这会在 `AIService` 对象内添加两个方法，确保在 `};` 之前插入。

- [ ] **Step 2.4: 运行测试，确认通过**

Run:
```bash
node test/recommendations-test.cjs
```
Expected: PASS 14 assertions

- [ ] **Step 2.5: 提交**

```bash
git add js/aiService.js test/recommendations-test.cjs
git commit -m "feat: AI 服务新增推荐理由润色，未配置时自动降级"
```

---

### Task 3: 调整 `index.html` 加载顺序与容器

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: N/A
- Produces: DOM 元素 `#recommendations-container`；script 按正确顺序加载

---

- [ ] **Step 3.1: 在清单大全页添加推荐容器**

在 `index.html` 中，找到：

```html
      <!-- 分类导航 -->
      <div class="template-category-nav" id="template-category-nav">
        <!-- 分类将通过 JavaScript 动态生成 -->
      </div>

      <!-- 模板列表 -->
      <section id="template-library-container">
```

修改为：

```html
      <!-- 分类导航 -->
      <div class="template-category-nav" id="template-category-nav">
        <!-- 分类将通过 JavaScript 动态生成 -->
      </div>

      <!-- AI 为你推荐 -->
      <section id="recommendations-container" class="recommendations-section hidden">
        <!-- 推荐卡片将通过 JavaScript 动态生成 -->
      </section>

      <!-- 模板列表 -->
      <section id="template-library-container">
```

- [ ] **Step 3.2: 调整 script 加载顺序**

找到：

```html
  <script src="js/templates.js"></script>
  <script src="js/timeline.js"></script>
  <script src="js/statistics.js"></script>
  <script src="js/aiService.js"></script>
  <script src="js/report.js"></script>
  <script src="js/app.js"></script>
```

修改为：

```html
  <script src="js/aiService.js"></script>
  <script src="js/recommendations.js"></script>
  <script src="js/templates.js"></script>
  <script src="js/timeline.js"></script>
  <script src="js/statistics.js"></script>
  <script src="js/report.js"></script>
  <script src="js/app.js"></script>
```

- [ ] **Step 3.3: 验证修改**

Run:
```bash
grep -n "recommendations-container" index.html
grep -n "recommendations.js" index.html
```

Expected: 两行输出均显示匹配。

- [ ] **Step 3.4: 提交**

```bash
git add index.html
git commit -m "feat: 清单大全页新增推荐容器并调整脚本加载顺序"
```

---

### Task 4: 添加推荐区域 CSS 样式

**Files:**
- Modify: `css/style.css`

**Interfaces:**
- Consumes: HTML class names `.recommendations-section`, `.recommendations-header`, `.recommendations-scroll`, `.recommendation-card`, `.recommendation-card-dismiss`, `.recommendation-card-reason`, `.recommendation-card-action`, `.empty-recommendations`
- Produces: 响应式样式，包含深色模式

---

- [ ] **Step 4.1: 在 `css/style.css` 末尾追加推荐样式**

```css
/* ==================== AI 为你推荐 ==================== */

.recommendations-section {
  margin-bottom: 1.5rem;
}

.recommendations-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.recommendations-header h3 {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0;
}

.recommendations-header .refresh-btn {
  font-size: 0.8125rem;
  color: #007aff;
  background: transparent;
  border: none;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: opacity 0.2s;
}

.recommendations-header .refresh-btn:disabled {
  color: #86868b;
  cursor: not-allowed;
  opacity: 0.6;
}

.recommendations-scroll {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}

.recommendations-scroll::-webkit-scrollbar {
  display: none;
}

.recommendation-card {
  flex: 0 0 260px;
  background: linear-gradient(135deg, #ffffff, #f5f5f7);
  border-radius: 1rem;
  padding: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.04);
  scroll-snap-align: start;
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 160px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.recommendation-card:active {
  transform: scale(0.98);
}

.recommendation-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.recommendation-card-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.recommendation-card-emoji {
  font-size: 1.25rem;
}

.recommendation-card-category {
  font-size: 0.75rem;
  color: #86868b;
  background: rgba(0, 0, 0, 0.04);
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
}

.recommendation-card-dismiss {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  color: #86868b;
  font-size: 0.875rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  transition: opacity 0.2s, background 0.2s;
}

.recommendation-card-dismiss:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1);
}

.recommendation-card-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.recommendation-card-reason {
  font-size: 0.8125rem;
  color: #555;
  line-height: 1.5;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.recommendation-card-action {
  margin-top: 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #007aff;
  text-align: center;
  padding: 0.5rem;
  border-radius: 0.5rem;
  background: rgba(0, 122, 255, 0.08);
}

.recommendation-card-empty {
  flex: 0 0 260px;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #86868b;
  font-size: 0.875rem;
}

/* 空状态引导 */
.empty-recommendations {
  text-align: center;
  padding: 1.5rem 1rem;
  background: #ffffff;
  border-radius: 1rem;
  margin-top: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.empty-recommendations p {
  color: #555;
  font-size: 0.9375rem;
  margin: 0 0 0.75rem 0;
}

.empty-recommendations .primary-btn {
  background: #007aff;
  color: #fff;
  border: none;
  padding: 0.625rem 1.25rem;
  border-radius: 999px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .recommendations-header h3 {
    color: #f5f5f7;
  }

  .recommendation-card {
    background: linear-gradient(135deg, #1c1c1e, #2c2c2e);
    border-color: rgba(255, 255, 255, 0.06);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  }

  .recommendation-card-title {
    color: #f5f5f7;
  }

  .recommendation-card-reason {
    color: #b0b0b5;
  }

  .recommendation-card-category {
    color: #b0b0b5;
    background: rgba(255, 255, 255, 0.08);
  }

  .recommendation-card-dismiss {
    background: rgba(255, 255, 255, 0.08);
    color: #b0b0b5;
  }

  .recommendation-card-dismiss:hover {
    background: rgba(255, 255, 255, 0.14);
  }

  .empty-recommendations {
    background: #1c1c1e;
  }

  .empty-recommendations p {
    color: #b0b0b5;
  }
}
```

- [ ] **Step 4.2: 验证样式文件无语法错误**

Run:
```bash
node -e "require('fs').readFileSync('css/style.css','utf8').includes('.recommendations-section') && console.log('OK')"
```

Expected: `OK`

- [ ] **Step 4.3: 提交**

```bash
git add css/style.css
git commit -m "style: 新增 AI 推荐卡片与空状态引导样式"
```

---

### Task 5: `js/templates.js` 渲染「为你推荐」区域

**Files:**
- Modify: `js/templates.js`

**Interfaces:**
- Consumes: `RecommendationEngine.getRecommendations()`, `RecommendationEngine.refreshRecommendations()`, `RecommendationEngine.dismissRecommendation()`
- Produces: UI rendering functions `TemplateManager.renderRecommendations()`

---

- [ ] **Step 5.1: 在 `TemplateManager` 中新增推荐渲染方法**

在 `js/templates.js` 的 `TemplateManager` 对象内、`renderTemplateLibrary` 之前添加：

```js
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
```

- [ ] **Step 5.2: 在 `renderTemplateLibrary` 中调用推荐渲染**

在 `renderTemplateLibrary` 方法末尾、`// 添加分类导航` 之前插入：

```js
    // 渲染为你推荐
    this.renderRecommendations();
```

修改后 `renderTemplateLibrary` 末尾如下：

```js
    // 渲染为你推荐
    this.renderRecommendations();

    // 添加分类导航
    this.renderCategoryNav(categories);
```

- [ ] **Step 5.3: 实现/复用清单预览方法**

如果 `js/templates.js` 中已有 `showTemplatePreview`，则复用；否则新增：

```js
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
          <button class="modal-btn modal-btn-cancel" onclick="this.closest('.modal-overlay').remove()">关闭</button>
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

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  },
```

- [ ] **Step 5.4: 运行单元测试确保未破坏现有功能**

Run:
```bash
node test/recommendations-test.cjs
node test/report-test.cjs
```

Expected: 两个测试均通过。

- [ ] **Step 5.5: 浏览器手动验证**

启动本地服务器（如 `start.bat` 或 Live Server），打开「清单大全」页面，确认：
- 顶部出现「🎯 为你推荐」区域
- 有 3 张横向卡片
- 点击卡片弹出预览
- 点击「×」卡片消失
- 点击「换一批」重新生成

- [ ] **Step 5.6: 提交**

```bash
git add js/templates.js
git commit -m "feat: 清单大全页渲染 AI 为你推荐区域"
```

---

### Task 6: `js/app.js` 空状态推荐引导

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `RecommendationEngine.getEmptyStateRecommendations()`
- Produces: `renderListCards()` 在清单为空时显示引导

---

- [ ] **Step 6.1: 修改 `renderListCards` 处理空状态**

找到 `function renderListCards()`：

```js
function renderListCards() {
  const container = document.getElementById('list-cards-container');
  container.innerHTML = '';

  const sortedLists = SettingsManager.sortLists([...AppState.lists]);

  sortedLists.forEach((list, index) => {
    const progress = StorageManager.calculateListProgress(list);
    const card = createListCard(list, progress);
    container.appendChild(card);
    AnimationManager.animateCardEntrance(card, index * 100);
  });
}
```

修改为：

```js
function renderListCards() {
  const container = document.getElementById('list-cards-container');
  container.innerHTML = '';

  const sortedLists = SettingsManager.sortLists([...AppState.lists]);

  if (sortedLists.length === 0) {
    const recs = RecommendationEngine.getEmptyStateRecommendations();
    const recNames = recs.map(r => `「${r.title}」`).join('、');
    container.innerHTML = `
      <div class="empty-recommendations">
        <p>人生清单很长，从 ${recNames} 开始探索吧。</p>
        <button class="primary-btn" onclick="showTemplatesPage()">去发现更多清单</button>
      </div>
    `;
    return;
  }

  sortedLists.forEach((list, index) => {
    const progress = StorageManager.calculateListProgress(list);
    const card = createListCard(list, progress);
    container.appendChild(card);
    AnimationManager.animateCardEntrance(card, index * 100);
  });
}
```

- [ ] **Step 6.2: 确认 `showTemplatesPage()` 存在**

Run:
```bash
grep -n "function showTemplatesPage" js/app.js
```

Expected: 输出函数定义行号。如不存在，则在 `app.js` 中添加：

```js
function showTemplatesPage() {
  AppState.currentView = 'templates';
  document.getElementById('home-view').classList.add('hidden');
  document.getElementById('lists-view').classList.add('hidden');
  document.getElementById('templates-view').classList.remove('hidden');
  document.getElementById('timeline-view').classList.add('hidden');
  document.getElementById('achievements-view').classList.add('hidden');
  document.getElementById('statistics-view').classList.add('hidden');
  document.getElementById('profile-view').classList.add('hidden');
  document.getElementById('report-view').classList.add('hidden');
  TemplateManager.renderTemplateLibrary();
}
```

- [ ] **Step 6.3: 运行测试**

Run:
```bash
node test/recommendations-test.cjs
node test/report-test.cjs
```

Expected: 两个测试均通过。

- [ ] **Step 6.4: 浏览器手动验证**

清空 LocalStorage 或手动将清单数据置空，刷新页面进入「进度」Tab，确认：
- 显示空状态引导卡片
- 文字包含「人生遗愿清单」和「中国城市打卡」
- 点击按钮跳转「清单大全」

- [ ] **Step 6.5: 提交**

```bash
git add js/app.js
git commit -m "feat: 人生进度空状态新增推荐引导"
```

---

### Task 7: `js/storage.js` 新增缓存 Key 常量

**Files:**
- Modify: `js/storage.js`

**Interfaces:**
- Produces: `StorageManager.KEYS.RECOMMENDATIONS_CACHE`

---

- [ ] **Step 7.1: 在 KEYS 中新增 RECOMMENDATIONS_CACHE**

找到：

```js
  KEYS: {
    BIRTH_DATE: 'life_checklist_birth_date',
    LISTS_DATA: 'life_checklist_lists_data',
    TIMELINE: 'life_checklist_timeline',
    ACHIEVEMENTS: 'life_checklist_achievements',
    TODAY_COMPLETED: 'life_checklist_today_completed',
    TODAY_DATE: 'life_checklist_today_date',
    ADDED_TEMPLATES: 'life_checklist_added_templates',
    STREAK_DATA: 'life_checklist_streak_data',
    LAST_VISIT: 'life_checklist_last_visit'
  },
```

修改为：

```js
  KEYS: {
    BIRTH_DATE: 'life_checklist_birth_date',
    LISTS_DATA: 'life_checklist_lists_data',
    TIMELINE: 'life_checklist_timeline',
    ACHIEVEMENTS: 'life_checklist_achievements',
    TODAY_COMPLETED: 'life_checklist_today_completed',
    TODAY_DATE: 'life_checklist_today_date',
    ADDED_TEMPLATES: 'life_checklist_added_templates',
    STREAK_DATA: 'life_checklist_streak_data',
    LAST_VISIT: 'life_checklist_last_visit',
    RECOMMENDATIONS_CACHE: 'life_checklist_recommendations_cache'
  },
```

- [ ] **Step 7.2: 新增 setAddedTemplates 辅助方法**

在 `addTemplate` 方法之后添加：

```js
  setAddedTemplates(templateIds) {
    localStorage.setItem(this.KEYS.ADDED_TEMPLATES, JSON.stringify(templateIds || []));
  },
```

- [ ] **Step 7.3: 运行测试**

Run:
```bash
node test/recommendations-test.cjs
```

Expected: PASS

- [ ] **Step 7.4: 提交**

```bash
git add js/storage.js
git commit -m "refactor: StorageManager 新增推荐缓存 Key 与 setAddedTemplates 方法"
```

---

### Task 8: 更新文档

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`

---

- [ ] **Step 8.1: 更新 `CHANGELOG.md`**

在文件最顶部 `# 更新日志` 之后、现有 v6.2.0 条目之前插入：

```markdown
## v6.3.0 (2026-06-27) - AI 智能推荐清单 🎯

### ✨ AI 智能推荐清单
- ✅ 「清单大全」顶部新增「为你推荐」横向卡片，基于用户完成数据智能推荐
- ✅ 本地规则引擎生成推荐，零配置可用
- ✅ 推荐理由支持 AI 大模型润色（Kimi / DeepSeek / 智谱 GLM），失败自动降级
- ✅ 支持「换一批」刷新（每日 3 次）和「不感兴趣」反馈
- ✅ 「我的人生进度」空状态时显示推荐引导

### 🔧 技术改进
- ✅ 新增 `js/recommendations.js` 推荐引擎
- ✅ 扩展 `js/aiService.js` 推荐理由润色能力
- ✅ 新增 `test/recommendations-test.cjs` 单元测试
- ✅ 推荐结果本地缓存，减少重复计算

---

```

- [ ] **Step 8.2: 更新 `README.md` 功能特性**

在 `README.md` 的「### 清单大全」小节中，追加一行：

```markdown
- AI 智能推荐：基于你的完成记录推荐可能感兴趣的清单
```

在「项目结构」中追加：

```markdown
│   ├── recommendations.js # AI 智能推荐引擎
```

- [ ] **Step 8.3: 提交**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: 更新 v6.3.0 变更日志与 README"
```

---

## Self-Review

### Spec Coverage

| 设计文档章节 | 对应 Task |
|-------------|----------|
| 功能范围（In Scope） | Task 1, 5, 6 |
| 推荐算法（本地规则） | Task 1 |
| AI 润色推荐理由 | Task 2 |
| 数据流与缓存 | Task 1, 7 |
| UI 设计 | Task 3, 4, 5 |
| 交互设计（换一批/不感兴趣） | Task 1, 5 |
| 空状态引导 | Task 6 |
| 错误处理 | Task 1, 2, 5 |
| 测试计划 | Task 1, 2 |
| 文档更新 | Task 8 |

无遗漏。

### Placeholder Scan

已检查，无 TBD/TODO/"后续补充"/"适当处理" 等占位内容。所有代码块完整，所有命令带预期输出。

### Type Consistency

- `getRecommendations` 返回结构在所有调用处一致：`{ items, refreshCount, canRefresh }`
- `dismissRecommendation` 签名一致：`templateId`
- `_buildReason` 返回 `string`
- `generateRecommendationReason` 返回 `{source, text, degraded?}`

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-27-ai-recommendation-plan.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
