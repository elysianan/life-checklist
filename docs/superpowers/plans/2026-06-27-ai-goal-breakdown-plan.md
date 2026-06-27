# AI 目标拆解实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在人生已完成清单 v6.4.0 中实现「AI 目标拆解」功能：用户在进度页输入宏大目标 + 期限，系统生成本地/AI 3 阶段路线图，预览编辑后一键生成专属清单并接入打卡闭环。

**Architecture:** 延续 v6.2/v6.3 的「本地规则引擎 + 可选大模型」混合 AI 策略。新增 `js/goalBreakdown.js` 纯逻辑引擎（归类、本地模板库、prompt 构建、统一入口、落地），新增 `js/goalBreakdownUI.js` 负责全屏 modal 渲染与交互，扩展 `js/aiService.js` 支持结构化 JSON 输出。UI 与引擎边界清晰，引擎不依赖 DOM，便于单元测试。

**Tech Stack:** HTML5 / Tailwind CSS / 原生 JavaScript / LocalStorage / Node.js `vm` 模块（单测）

## Global Constraints

- 每个任务完成后必须运行对应测试并提交，提交信息使用中文
- 无 AI Key 时功能 100% 可用（本地模板库 + 通用四步法兜底）
- AI 超时/失败/返回非法 JSON 时自动降级本地，toast 提示，不中断流程
- 引擎必须是纯逻辑，不直接操作 DOM；UI 刷新由 `goalBreakdownUI.js` 负责
- 落地任务 id 必须唯一，使用 `task_${stamp}_${phaseIndex}_${taskIndex}` 格式
- 任务 text 前缀统一为 `阶段N·`
- 未命中关键词时 category 必须为 `'自定义'`
- 每个阶段 2-4 个任务，固定 3 个阶段
- 默认期限未选时使用「1 年」
- `callRealAPIWithPrompt` 默认值保持 `max_tokens: 80` 以兼容旧调用

---

## File Structure

| 文件 | 操作 | 职责 |
|------|------|------|
| `js/goalBreakdown.js` | 新建 | 目标拆解引擎：归类、本地模板库、prompt 构建、统一入口、落地为清单 |
| `js/goalBreakdownUI.js` | 新建 | 全屏 modal 渲染与交互：输入态 / loading 态 / 路线图预览态 / 删除任务 / 换一版 / 生成清单 |
| `js/aiService.js` | 修改 | `callRealAPIWithPrompt` 支持 options；新增 `_parseRoadmapJSON` 和 `generateGoalRoadmap` |
| `js/app.js` | 修改 | `initApp()` 中初始化 `GoalBreakdownUIManager` |
| `index.html` | 修改 | 进度页加入口卡片；在 `aiService.js` 之后引入两个新脚本 |
| `css/style.css` | 修改 | 入口卡片、全屏 modal、阶段卡片、期限 chips、来源标识样式 |
| `test/goal-breakdown-test.cjs` | 新建 | 单元测试，覆盖引擎纯函数和 AI 降级 |
| `README.md` / `CHANGELOG.md` | 修改 | 更新到 v6.4.0 |

---

### Task 1: 扩展 `callRealAPIWithPrompt` 支持 options

**Files:**
- Modify: `js/aiService.js:157-188`

**Interfaces:**
- Consumes: 现有调用者传入 `(prompt, config)`，新调用者可以传入 `(prompt, config, options)`
- Produces: `callRealAPIWithPrompt(prompt, config, options = {})` 的 `options.maxTokens` 和 `options.temperature` 会覆盖默认值

- [ ] **Step 1: 修改 `callRealAPIWithPrompt` 签名和 body**

将函数签名改为：

```js
async callRealAPIWithPrompt(prompt, config, options = {}) {
```

在 `body` 中把硬编码的 `temperature` 和 `max_tokens` 改为从 `options` 读取：

```js
body: JSON.stringify({
  model: config.model,
  messages: [
    { role: 'system', content: '你是一位温暖、真诚的人生记录助手。' },
    { role: 'user', content: prompt }
  ],
  temperature: options.temperature ?? 0.8,
  max_tokens: options.maxTokens ?? 80
}),
```

- [ ] **Step 2: 验证旧调用不受影响**

`generateRecommendationReason` 调用 `this.callRealAPIWithPrompt(prompt, cfg)` 未传 `options`，应继续走 `max_tokens: 80`。

- [ ] **Step 3: 运行已有测试**

```bash
node test/recommendations-test.cjs
```

Expected: `结果: 7 通过 / 0 失败`。

- [ ] **Step 4: 提交**

```bash
git add js/aiService.js
git commit -m "feat(aiService): callRealAPIWithPrompt 支持 options.maxTokens/temperature"
```

---

### Task 2: 创建目标拆解引擎（归类 + 本地模板库 + prompt）

**Files:**
- Create: `js/goalBreakdown.js`

**Interfaces:**
- Consumes: 无外部依赖（纯函数）
- Produces: `GoalBreakdownEngine.classifyGoal(goalText)`，`GoalBreakdownEngine.buildLocalRoadmap(goalText, duration)`，`GoalBreakdownEngine.buildPrompt(goalText, duration)`

- [ ] **Step 1: 创建 `js/goalBreakdown.js` 并写入引擎骨架 + 归类 + 本地模板库 + prompt**

```js
/**
 * AI 目标拆解引擎
 * 纯逻辑，不依赖 DOM
 */
const GoalBreakdownEngine = {
  // 关键词 → 类型/分类/emoji/模板
  GOAL_TYPES: {
    reading: {
      keywords: ['读书', '看书', '阅读', '书'],
      category: '阅读',
      emoji: '📚',
      build: (goalText, duration) => ({
        phases: [
          { title: '打基础', tasks: ['列出15本目标书单', '每天固定30分钟阅读'] },
          { title: '推进提速', tasks: ['每月读完规定数量', '写读书笔记或书评'] },
          { title: '冲刺收尾', tasks: ['补齐未读书目', '做年度阅读复盘'] }
        ]
      })
    },
    fitness: {
      keywords: ['健身', '减肥', '跑步', '运动', '马拉松'],
      category: '挑战',
      emoji: '💪',
      build: (goalText, duration) => ({
        phases: [
          { title: '建立习惯', tasks: ['制定每周运动计划', '找到固定运动时间'] },
          { title: '稳步提升', tasks: ['逐步增加运动量', '记录身体数据变化'] },
          { title: '挑战目标', tasks: ['完成阶段性测试', '复盘并制定下一阶段计划'] }
        ]
      })
    },
    language: {
      keywords: ['英语', '外语', '口语', '日语', '雅思', '托福', '韩语', '法语', '德语'],
      category: '成长',
      emoji: '🗣️',
      build: (goalText, duration) => ({
        phases: [
          { title: '基础积累', tasks: ['每天背单词或短语', '学习核心语法'] },
          { title: '输入输出', tasks: ['每天听力输入30分钟', '每周开口练习3次'] },
          { title: '实战冲刺', tasks: ['模拟真实场景对话', '做阶段性测试或考试'] }
        ]
      })
    },
    skill: {
      keywords: ['学', '技能', '吉他', '编程', '画画', '乐器', '摄影', '游泳', '烹饪', '烘焙'],
      category: '成长',
      emoji: '🎯',
      build: (goalText, duration) => ({
        phases: [
          { title: '入门打基础', tasks: ['准备学习资料或工具', '每天练习基础动作'] },
          { title: '专项提升', tasks: ['完成一个小作品', '针对弱项刻意练习'] },
          { title: '成果输出', tasks: ['完成一个完整作品', '复盘学习路径'] }
        ]
      })
    },
    travel: {
      keywords: ['旅行', '环游', '去', '打卡', '城市'],
      category: '旅行',
      emoji: '✈️',
      build: (goalText, duration) => ({
        phases: [
          { title: '规划准备', tasks: ['确定目的地清单', '制定预算和出行时间'] },
          { title: '分批执行', tasks: ['完成第一批出行', '记录旅行见闻'] },
          { title: '收官复盘', tasks: ['完成剩余目标地', '整理旅行回忆'] }
        ]
      })
    },
    food: {
      keywords: ['美食', '做饭', '烘焙', '料理', '做菜'],
      category: '美食',
      emoji: '🍜',
      build: (goalText, duration) => ({
        phases: [
          { title: '工具与基础', tasks: ['准备必要厨具或食材', '学习5道基础菜'] },
          { title: '扩展菜单', tasks: ['每周尝试新菜品', '记录成功食谱'] },
          { title: '形成风格', tasks: ['做一桌完整家宴', '整理个人食谱集'] }
        ]
      })
    },
    finance: {
      keywords: ['存钱', '理财', '投资', '攒钱', '储蓄'],
      category: '人生',
      emoji: '💰',
      build: (goalText, duration) => ({
        phases: [
          { title: '理清现状', tasks: ['梳理收入与支出', '设定具体金额目标'] },
          { title: '执行计划', tasks: ['每月固定储蓄', '学习基础理财知识'] },
          { title: '复盘调整', tasks: ['检查目标进度', '优化资产配置'] }
        ]
      })
    }
  },

  // 通用四步法兜底
  _buildGenericRoadmap(goalText, duration) {
    return {
      phases: [
        { title: '明确与准备', tasks: ['把目标写清楚', '了解需要什么资源', '列出第一步行动'] },
        { title: '分阶段执行', tasks: ['拆成可每周推进的小任务', '定期记录进展', '保持节奏不掉队'] },
        { title: '复盘与冲刺', tasks: ['检查整体进度', '调整方法', '完成收尾并庆祝'] }
      ]
    };
  },

  /**
   * 关键词匹配目标类型（纯函数）
   * @returns {{type:string,category:string,emoji:string}|null}
   */
  classifyGoal(goalText) {
    const text = goalText.toLowerCase();
    for (const [type, config] of Object.entries(this.GOAL_TYPES)) {
      if (config.keywords.some(k => text.includes(k))) {
        return { type, category: config.category, emoji: config.emoji };
      }
    }
    return null;
  },

  /**
   * 根据期限生成阶段时间标签
   */
  _buildTimeLabels(duration) {
    if (duration === '3个月') return ['第1个月', '第2个月', '第3个月'];
    if (duration === '6个月') return ['第1-2个月', '第3-4个月', '第5-6个月'];
    if (duration === '1年') return ['第1-3个月', '第4-8个月', '第9-12个月'];
    return ['', '', ''];
  },

  /**
   * 本地模板库生成路线图（纯函数，零依赖）
   * @returns {{source:'rule',goal:string,duration:string,category:string,emoji:string,phases:Array,degraded:boolean}}
   */
  buildLocalRoadmap(goalText, duration) {
    const classified = this.classifyGoal(goalText);
    const timeLabels = this._buildTimeLabels(duration);
    const sourcePlan = classified
      ? this.GOAL_TYPES[classified.type].build(goalText, duration)
      : this._buildGenericRoadmap(goalText, duration);

    const phases = sourcePlan.phases.map((p, i) => ({
      title: p.title,
      timeLabel: timeLabels[i] || '',
      tasks: p.tasks.slice(0, 4)
    }));

    return {
      source: 'rule',
      goal: goalText,
      duration,
      category: classified ? classified.category : '自定义',
      emoji: classified ? classified.emoji : '🎯',
      phases,
      degraded: false
    };
  },

  /**
   * 构建给大模型的 prompt（要求只返回 JSON）
   */
  buildPrompt(goalText, duration) {
    return [
      '你是一位温暖、务实的人生目标规划师。请将用户的目标拆解成 3 个阶段的执行路线图。',
      '要求：',
      '1. 只返回纯 JSON，不要任何解释、不要 markdown 代码块；',
      '2. JSON 格式：{ "goal": "用户目标", "duration": "期限", "category": "分类", "phases": [{ "title": "阶段标题", "timeLabel": "时间段", "tasks": ["任务1", "任务2"] }] }；',
      '3. category 只能从「旅行、阅读、成长、美食、影视、音乐、挑战、人生、情感、体验、自定义」中选择一个最贴近的；',
      '4. 每阶段 2-4 个任务，任务用动宾短语，具体可执行；',
      '5. timeLabel 按期限填写，如「第1-3个月」「第4-8个月」「第9-12个月」。',
      '',
      `用户目标：${goalText}`,
      `期限：${duration}`
    ].join('\n');
  }

  // 后续 Task 4 补充 generateRoadmap
  // 后续 Task 5 补充 createListFromRoadmap
};
```

- [ ] **Step 2: 提交**

```bash
git add js/goalBreakdown.js
git commit -m "feat(goalBreakdown): 目标归类、本地模板库与 prompt 构建"
```

---

### Task 3: 新增 AI 目标路线图生成与 JSON 容错解析

**Files:**
- Modify: `js/aiService.js`（在 `generateRecommendationReason` 之后追加）

**Interfaces:**
- Consumes: `GoalBreakdownEngine.buildPrompt(goalText, duration)` 返回的 prompt 字符串
- Produces: `AIService.generateGoalRoadmap(goalText, duration)` 返回 `{ source:'api', goal, duration, category, emoji, phases:[...], degraded:false }`；`AIService._parseRoadmapJSON(text)` 返回 roadmap 或抛错

- [ ] **Step 1: 在 `aiService.js` 末尾追加 `_parseRoadmapJSON` 和 `generateGoalRoadmap`**

```js
/**
 * 解析大模型返回的路线图 JSON，失败抛错
 */
_parseRoadmapJSON(text) {
  if (!text) throw new Error('空响应');
  let clean = text.trim();
  // 去掉可能的 markdown 代码块
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  const parsed = JSON.parse(clean);

  if (!Array.isArray(parsed.phases) || parsed.phases.length === 0) {
    throw new Error('phases 格式错误');
  }
  parsed.phases.forEach((p, i) => {
    if (!p.title || !Array.isArray(p.tasks) || p.tasks.length === 0) {
      throw new Error(`阶段 ${i + 1} 格式错误`);
    }
  });

  // 规整 category 到白名单
  const validCategories = ['旅行', '阅读', '成长', '美食', '影视', '音乐', '挑战', '人生', '情感', '体验', '自定义'];
  if (!validCategories.includes(parsed.category)) {
    parsed.category = '自定义';
  }

  return parsed;
},

/**
 * 调用大模型生成目标路线图
 * @returns {Promise<{source:'api', goal:string, duration:string, category:string, emoji:string, phases:Array, degraded:boolean}>}
 */
async generateGoalRoadmap(goalText, duration) {
  const cfg = SettingsManager.getAIConfig();
  const prompt = GoalBreakdownEngine.buildPrompt(goalText, duration);
  const text = await this.callRealAPIWithPrompt(prompt, cfg, { maxTokens: 800, temperature: 0.7 });
  const roadmap = this._parseRoadmapJSON(text);
  roadmap.source = 'api';
  roadmap.goal = roadmap.goal || goalText;
  roadmap.duration = roadmap.duration || duration;
  roadmap.degraded = false;
  return roadmap;
}
```

- [ ] **Step 2: 运行已有测试**

```bash
node test/recommendations-test.cjs
```

Expected: `结果: 7 通过 / 0 失败`。

- [ ] **Step 3: 提交**

```bash
git add js/aiService.js
git commit -m "feat(aiService): 新增 generateGoalRoadmap 与 _parseRoadmapJSON"
```

---

### Task 4: 实现统一入口（含 AI 降级）

**Files:**
- Modify: `js/goalBreakdown.js`

**Interfaces:**
- Consumes: `SettingsManager.getAIConfig()`，`AIService.generateGoalRoadmap()`，`GoalBreakdownEngine.buildLocalRoadmap()`
- Produces: `GoalBreakdownEngine.generateRoadmap(goalText, duration)` 返回 Promise<roadmap>

- [ ] **Step 1: 在 `GoalBreakdownEngine` 中追加 `generateRoadmap`**

把对象末尾的注释替换为实际方法：

```js
  // 后续 Task 4 补充 generateRoadmap
  // 后续 Task 5 补充 createListFromRoadmap
};
```

改为：

```js
  /**
   * 统一入口：有 Key 调 AI，失败或无 Key 降级本地
   */
  async generateRoadmap(goalText, duration) {
    const cfg = SettingsManager.getAIConfig();
    if (!cfg.enabled || !cfg.apiKey) {
      return this.buildLocalRoadmap(goalText, duration);
    }
    try {
      const roadmap = await AIService.generateGoalRoadmap(goalText, duration);
      return roadmap;
    } catch (e) {
      console.warn('AI 目标拆解失败，降级本地引擎:', e.message);
      const local = this.buildLocalRoadmap(goalText, duration);
      local.degraded = true;
      return local;
    }
  }

  // 后续 Task 5 补充 createListFromRoadmap
};
```

注意：`generateRoadmap` 现在是倒数第二个属性，末尾加逗号；`createListFromRoadmap` 的注释保留作为下一任务占位。

- [ ] **Step 2: 提交**

```bash
git add js/goalBreakdown.js
git commit -m "feat(goalBreakdown): AI 降级统一入口 generateRoadmap"
```

---

### Task 5: 实现路线图落地为专属清单

**Files:**
- Modify: `js/goalBreakdown.js`

**Interfaces:**
- Consumes: `StorageManager.getLists()` / `setLists()`，`AppState.lists`
- Produces: `GoalBreakdownEngine.createListFromRoadmap(roadmap)` 返回 `newList`

- [ ] **Step 1: 在 `GoalBreakdownEngine` 中追加 `createListFromRoadmap`**

把对象末尾改为：

```js
  /**
   * 将路线图落地为专属清单（写入 Storage，返回新清单；不刷新 UI）
   */
  createListFromRoadmap(roadmap) {
    const lists = StorageManager.getLists() || [];
    const stamp = Date.now();
    const colorMap = {
      '旅行': '#34C759',
      '阅读': '#AF52DE',
      '成长': '#FF9500',
      '美食': '#FF9500',
      '影视': '#5856D6',
      '音乐': '#5AC8FA',
      '挑战': '#FF3B30',
      '人生': '#FF9500',
      '情感': '#FF2D55',
      '体验': '#FF2D55',
      '自定义': '#5E5CE6'
    };

    const newList = {
      id: 'goal_' + stamp,
      emoji: roadmap.emoji || '🎯',
      title: roadmap.goal,
      description: (roadmap.duration || '自定义期限') + ' · AI 目标路线图',
      color: colorMap[roadmap.category] || '#5E5CE6',
      category: roadmap.category || '自定义',
      isCustom: true,
      fromGoal: true,
      tasks: roadmap.phases.flatMap((p, pi) =>
        p.tasks.map((t, ti) => ({
          id: `task_${stamp}_${pi}_${ti}`,
          text: `阶段${pi + 1}·${t}`,
          completed: false,
          completedDate: '',
          note: '',
          priority: 'medium'
        }))
      )
    };

    lists.push(newList);
    StorageManager.setLists(lists);
    AppState.lists = lists;
    return newList;
  }
};
```

- [ ] **Step 2: 提交**

```bash
git add js/goalBreakdown.js
git commit -m "feat(goalBreakdown): 路线图落地为专属清单"
```

---

### Task 6: 编写并跑通单元测试

**Files:**
- Create: `test/goal-breakdown-test.cjs`

**Interfaces:**
- Consumes: `GoalBreakdownEngine` 全部公共方法，`AIService._parseRoadmapJSON`
- Produces: 测试脚本可独立运行，输出通过/失败数量

- [ ] **Step 1: 创建测试文件**

```js
/**
 * GoalBreakdown 模块单元测试
 * 用法：node test/goal-breakdown-test.cjs
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
const files = ['js/data.js', 'js/storage.js', 'js/settings.js', 'js/aiService.js', 'js/goalBreakdown.js']
  .filter(f => fs.existsSync(path.join(root, f)));
let code = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');

code += `
;(async function(){
  let passed=0, failed=0;
  const assert=(n,c)=>{ c?passed++:failed++; console.log((c?'✅':'❌')+' '+n); };
  localStorage.clear();

  // ---- classifyGoal ----
  assert('「一年读完50本书」归为阅读', GoalBreakdownEngine.classifyGoal('一年读完50本书').category === '阅读');
  assert('「学游泳」归为成长', GoalBreakdownEngine.classifyGoal('我想学游泳').category === '成长');
  assert('「随便写点啥」无匹配', GoalBreakdownEngine.classifyGoal('随便写点啥') === null);

  // ---- buildLocalRoadmap ----
  const readingRoadmap = GoalBreakdownEngine.buildLocalRoadmap('一年读完50本书', '1年');
  assert('阅读类返回3阶段', readingRoadmap.phases.length === 3);
  assert('每阶段任务非空', readingRoadmap.phases.every(p => p.tasks.length >= 2 && p.tasks.length <= 4));
  assert('来源为 rule', readingRoadmap.source === 'rule');
  assert('阅读类 emoji 为 📚', readingRoadmap.emoji === '📚');

  const customRoadmap = GoalBreakdownEngine.buildLocalRoadmap('成为太阳系最靓的仔', '1年');
  assert('未命中关键词 category 为自定义', customRoadmap.category === '自定义');
  assert('未命中关键词 emoji 为 🎯', customRoadmap.emoji === '🎯');

  // ---- timeLabel 推算 ----
  assert('1年时间标签正确',
    readingRoadmap.phases[0].timeLabel === '第1-3个月' &&
    readingRoadmap.phases[1].timeLabel === '第4-8个月' &&
    readingRoadmap.phases[2].timeLabel === '第9-12个月');

  const threeMonth = GoalBreakdownEngine.buildLocalRoadmap('三个月练出腹肌', '3个月');
  assert('3个月时间标签正确',
    threeMonth.phases[0].timeLabel === '第1个月' &&
    threeMonth.phases[1].timeLabel === '第2个月' &&
    threeMonth.phases[2].timeLabel === '第3个月');

  // ---- createListFromRoadmap ----
  StorageManager.initializeData();
  const beforeLists = StorageManager.getLists().length;
  const newList = GoalBreakdownEngine.createListFromRoadmap(readingRoadmap);
  const afterLists = StorageManager.getLists().length;
  assert('清单数量 +1', afterLists === beforeLists + 1);
  assert('清单标题为原目标', newList.title === '一年读完50本书');
  assert('任务 id 全部唯一', new Set(newList.tasks.map(t => t.id)).size === newList.tasks.length);
  assert('任务 text 带阶段前缀', newList.tasks.every(t => /^阶段[123]·/.test(t.text)));
  assert('清单 category 合法', ['旅行','阅读','成长','美食','影视','音乐','挑战','人生','情感','体验','自定义'].includes(newList.category));

  // ---- AI 降级 ----
  const noKeyRoadmap = await GoalBreakdownEngine.generateRoadmap('成为插画师', '1年');
  assert('未配置 Key 时返回 rule', noKeyRoadmap.source === 'rule');

  // ---- _parseRoadmapJSON ----
  const validJSON = JSON.stringify({
    goal: '测试', duration: '1年', category: '阅读', emoji: '📚',
    phases: [
      { title: '阶段一', timeLabel: '第1-3个月', tasks: ['任务1'] }
    ]
  });
  const parsed = AIService._parseRoadmapJSON(validJSON);
  assert('合法 JSON 解析成功', parsed.goal === '测试');

  let threw = false;
  try { AIService._parseRoadmapJSON('{"goal":"坏数据"}'); } catch (e) { threw = true; }
  assert('缺 phases 抛错', threw);

  let unknownCat = AIService._parseRoadmapJSON(JSON.stringify({
    goal: '测试', duration: '1年', category: '外星人分类', emoji: '😂',
    phases: [{ title: '阶段一', timeLabel: '', tasks: ['任务1'] }]
  }));
  assert('未知 category 规整为自定义', unknownCat.category === '自定义');

  __done(passed, failed);
})();
`;

vm.runInNewContext(code, sandbox, { filename: 'goal-breakdown-test-bundle.js' });
```

- [ ] **Step 2: 运行测试并修复失败项**

```bash
node test/goal-breakdown-test.cjs
```

Expected: `结果: 18 通过 / 0 失败`（数量随断言增减）。

- [ ] **Step 3: 提交**

```bash
git add test/goal-breakdown-test.cjs
git commit -m "test: 新增 goal-breakdown 单元测试"
```

---

### Task 7: 在 `index.html` 添加入口卡片与脚本引用

**Files:**
- Modify: `index.html`

**Interfaces:**
- Produces: 进度页出现 `#goal-breakdown-entry` 卡片；`js/goalBreakdown.js` 和 `js/goalBreakdownUI.js` 在 `aiService.js` 之后、`app.js` 之前加载

- [ ] **Step 1: 在进度页「清单统计概览」之前加入口卡片**

在 `index.html` 中找到：

```html
      <!-- 清单统计概览 -->
      <section class="mb-4">
```

在其前面插入：

```html
      <!-- AI 目标拆解入口 -->
      <section class="mb-4">
        <div id="goal-breakdown-entry" class="goal-entry-card">
          <div class="goal-entry-icon">🎯</div>
          <div class="goal-entry-content">
            <h3 class="goal-entry-title">有个大目标？让 AI 帮你拆解</h3>
            <p class="goal-entry-desc">输入目标 + 期限，生成可执行的 3 阶段路线图</p>
          </div>
          <div class="goal-entry-arrow">→</div>
        </div>
      </section>
```

- [ ] **Step 2: 在脚本区引入两个新文件**

在 `js/recommendations.js` 之后、`js/templates.js` 之前插入：

```html
  <script src="js/goalBreakdown.js"></script>
  <script src="js/goalBreakdownUI.js"></script>
```

- [ ] **Step 3: 提交**

```bash
git add index.html
git commit -m "feat(index): 添加 AI 目标拆解入口卡片与脚本引用"
```

---

### Task 8: 实现全屏 modal UI 与交互

**Files:**
- Create: `js/goalBreakdownUI.js`
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `GoalBreakdownEngine.generateRoadmap()`，`GoalBreakdownEngine.createListFromRoadmap()`，全局函数 `renderListCards()`、`updateListsOverview()`、`updateOverallStats()`、`showListsPage()`，`CustomManager.showToast()`
- Produces: `GoalBreakdownUIManager.open()`，`GoalBreakdownUIManager.close()`；DOM 元素 `#goal-breakdown-modal`

- [ ] **Step 1: 创建 `js/goalBreakdownUI.js`**

```js
/**
 * AI 目标拆解 UI 层
 * 负责全屏 modal 的渲染与交互
 */
const GoalBreakdownUIManager = {
  modal: null,
  currentRoadmap: null,

  init() {
    this.createModalElement();
    this.bindEntry();
  },

  createModalElement() {
    const existing = document.getElementById('goal-breakdown-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'goal-breakdown-modal';
    modal.className = 'goal-modal-overlay hidden';
    modal.innerHTML = `
      <div class="goal-modal-content">
        <!-- 输入态 -->
        <div id="goal-input-state" class="goal-state">
          <div class="goal-modal-header">
            <button id="goal-close-btn" class="goal-close-btn">×</button>
            <h2 class="goal-modal-title">🎯 AI 目标拆解</h2>
          </div>
          <div class="goal-form">
            <label class="goal-label">你的目标是什么？</label>
            <input id="goal-input-text" type="text" class="goal-input" placeholder="例如：一年读完 50 本书" maxlength="100">
            <label class="goal-label">期限</label>
            <div class="goal-duration-chips">
              <button class="goal-duration-chip" data-duration="3个月">3 个月</button>
              <button class="goal-duration-chip active" data-duration="6个月">6 个月</button>
              <button class="goal-duration-chip" data-duration="1年">1 年</button>
              <button class="goal-duration-chip" data-duration="自定义">自定义</button>
            </div>
            <input id="goal-custom-duration" type="text" class="goal-input hidden" placeholder="例如：8 个月">
            <button id="goal-start-btn" class="goal-primary-btn" disabled>开始拆解 ✨</button>
          </div>
        </div>

        <!-- Loading 态 -->
        <div id="goal-loading-state" class="goal-state hidden">
          <div class="goal-spinner"></div>
          <p>AI 正在为你规划路线图…</p>
        </div>

        <!-- 预览态 -->
        <div id="goal-preview-state" class="goal-state hidden">
          <div class="goal-modal-header">
            <button id="goal-back-btn" class="goal-close-btn">←</button>
            <h2 id="goal-preview-title" class="goal-modal-title"></h2>
            <span id="goal-source-badge" class="goal-source-badge"></span>
          </div>
          <div id="goal-phases-container" class="goal-phases-container"></div>
          <div class="goal-preview-actions">
            <button id="goal-refresh-btn" class="goal-secondary-btn">🔄 换一种拆法</button>
            <button id="goal-create-btn" class="goal-primary-btn">生成专属清单</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;
    this.bindModalEvents();
  },

  bindEntry() {
    const entry = document.getElementById('goal-breakdown-entry');
    if (entry) {
      entry.addEventListener('click', () => this.open());
    }
  },

  bindModalEvents() {
    const textInput = document.getElementById('goal-input-text');
    const startBtn = document.getElementById('goal-start-btn');
    const closeBtn = document.getElementById('goal-close-btn');
    const backBtn = document.getElementById('goal-back-btn');
    const refreshBtn = document.getElementById('goal-refresh-btn');
    const createBtn = document.getElementById('goal-create-btn');
    const chips = document.querySelectorAll('.goal-duration-chip');
    const customInput = document.getElementById('goal-custom-duration');

    textInput.addEventListener('input', () => {
      startBtn.disabled = textInput.value.trim().length === 0;
    });

    closeBtn.addEventListener('click', () => this.close());
    backBtn.addEventListener('click', () => this.showInputState());

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const isCustom = chip.dataset.duration === '自定义';
        customInput.classList.toggle('hidden', !isCustom);
        if (isCustom) customInput.focus();
      });
    });

    startBtn.addEventListener('click', () => this.handleStart());
    refreshBtn.addEventListener('click', () => this.handleStart());
    createBtn.addEventListener('click', () => this.handleCreate());

    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });
  },

  getSelectedDuration() {
    const activeChip = document.querySelector('.goal-duration-chip.active');
    if (activeChip.dataset.duration === '自定义') {
      return document.getElementById('goal-custom-duration').value.trim() || '自定义期限';
    }
    return activeChip.dataset.duration;
  },

  open() {
    this.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    this.showInputState();
    setTimeout(() => document.getElementById('goal-input-text').focus(), 100);
  },

  close() {
    this.modal.classList.add('hidden');
    document.body.style.overflow = '';
    this.currentRoadmap = null;
  },

  showState(stateId) {
    ['goal-input-state', 'goal-loading-state', 'goal-preview-state'].forEach(id => {
      document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(stateId).classList.remove('hidden');
  },

  showInputState() {
    this.showState('goal-input-state');
  },

  showLoadingState() {
    this.showState('goal-loading-state');
  },

  async handleStart() {
    const text = document.getElementById('goal-input-text').value.trim();
    if (!text) return;

    const duration = this.getSelectedDuration();
    this.showLoadingState();

    const roadmap = await GoalBreakdownEngine.generateRoadmap(text, duration);
    this.currentRoadmap = roadmap;
    this.renderRoadmap(roadmap);
  },

  renderRoadmap(roadmap) {
    document.getElementById('goal-preview-title').textContent = `${roadmap.emoji} ${roadmap.goal}`;
    const badge = document.getElementById('goal-source-badge');
    badge.textContent = roadmap.source === 'api' ? '✨ AI 生成' : '📋 智能模板';
    badge.className = 'goal-source-badge ' + (roadmap.source === 'api' ? 'api' : 'rule');

    const container = document.getElementById('goal-phases-container');
    container.innerHTML = '';

    roadmap.phases.forEach((phase, pi) => {
      const phaseEl = document.createElement('div');
      phaseEl.className = 'goal-phase';
      phaseEl.innerHTML = `
        <div class="goal-phase-header">
          <span class="goal-phase-flag">🚩</span>
          <span class="goal-phase-title">阶段 ${pi + 1} · ${phase.title}</span>
          ${phase.timeLabel ? `<span class="goal-phase-time">${phase.timeLabel}</span>` : ''}
        </div>
        <ul class="goal-task-list">
          ${phase.tasks.map((task, ti) => `
            <li class="goal-task-item" data-phase="${pi}" data-task="${ti}">
              <span class="goal-task-text">${task}</span>
              <button class="goal-task-delete" title="删除">×</button>
            </li>
          `).join('')}
        </ul>
      `;
      container.appendChild(phaseEl);
    });

    container.querySelectorAll('.goal-task-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.target.closest('.goal-task-item');
        const pi = parseInt(item.dataset.phase);
        const ti = parseInt(item.dataset.task);
        this.currentRoadmap.phases[pi].tasks.splice(ti, 1);
        // 删除后如果某阶段无任务，移除该阶段
        this.currentRoadmap.phases = this.currentRoadmap.phases.filter(p => p.tasks.length > 0);
        this.renderRoadmap(this.currentRoadmap);
      });
    });

    this.showState('goal-preview-state');
  },

  handleCreate() {
    if (!this.currentRoadmap) return;
    const newList = GoalBreakdownEngine.createListFromRoadmap(this.currentRoadmap);
    this.close();

    // 刷新进度页
    if (typeof renderListCards === 'function') renderListCards();
    if (typeof updateListsOverview === 'function') updateListsOverview();
    if (typeof updateOverallStats === 'function') updateOverallStats();

    // toast 提示
    if (typeof CustomManager !== 'undefined' && typeof CustomManager.showToast === 'function') {
      CustomManager.showToast('清单已生成 ✅');
    }

    // 如果当前不在进度页，跳转过去
    if (AppState.currentView !== 'lists' && typeof showListsPage === 'function') {
      showListsPage();
    }
  }
};
```

- [ ] **Step 2: 在 `app.js` 的 `initApp` 中初始化 UI**

在 `js/app.js` 的 `initApp` 函数末尾添加：

```js
  // 初始化 AI 目标拆解 UI
  if (typeof GoalBreakdownUIManager !== 'undefined') {
    GoalBreakdownUIManager.init();
  }
```

- [ ] **Step 3: 提交**

```bash
git add js/goalBreakdownUI.js js/app.js
git commit -m "feat(goalBreakdownUI): 全屏 modal 输入/loading/预览态与交互"
```

---

### Task 9: 添加 CSS 样式

**Files:**
- Modify: `css/style.css`

**Interfaces:**
- Produces: `.goal-entry-card`、`.goal-modal-overlay`、`.goal-modal-content`、`.goal-phase`、`.goal-duration-chip`、`.goal-source-badge` 等样式

- [ ] **Step 1: 在 `css/style.css` 末尾追加样式**

```css
/* ==================== AI 目标拆解 ==================== */

.goal-entry-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #5E5CE6 0%, #BF5AF2 100%);
  border-radius: 16px;
  color: white;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 4px 12px rgba(94, 92, 230, 0.25);
}

.goal-entry-card:active {
  transform: scale(0.98);
}

.goal-entry-icon {
  font-size: 32px;
  line-height: 1;
}

.goal-entry-content {
  flex: 1;
}

.goal-entry-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.goal-entry-desc {
  font-size: 13px;
  opacity: 0.9;
}

.goal-entry-arrow {
  font-size: 20px;
  opacity: 0.8;
}

.goal-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: #f5f5f7;
  overflow-y: auto;
}

.goal-modal-overlay.hidden {
  display: none;
}

.goal-modal-content {
  min-height: 100vh;
  padding: 20px;
  max-width: 640px;
  margin: 0 auto;
}

.goal-modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  position: relative;
}

.goal-close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.goal-modal-title {
  flex: 1;
  font-size: 20px;
  font-weight: 700;
  text-align: center;
}

.goal-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #1c1c1e;
}

.goal-input {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 16px;
  margin-bottom: 20px;
  background: white;
}

.goal-duration-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.goal-duration-chip {
  padding: 10px 16px;
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.goal-duration-chip.active {
  background: #5E5CE6;
  color: white;
  border-color: #5E5CE6;
}

.goal-primary-btn {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  background: #5E5CE6;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.goal-primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.goal-secondary-btn {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid #5E5CE6;
  background: white;
  color: #5E5CE6;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

#goal-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
}

.goal-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(94, 92, 230, 0.2);
  border-top-color: #5E5CE6;
  border-radius: 50%;
  animation: goal-spin 1s linear infinite;
}

@keyframes goal-spin {
  to { transform: rotate(360deg); }
}

.goal-source-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.goal-source-badge.api {
  background: #E0D8FF;
  color: #5E5CE6;
}

.goal-source-badge.rule {
  background: #E5E5EA;
  color: #636366;
}

.goal-phases-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.goal-phase {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.goal-phase-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.goal-phase-flag {
  font-size: 18px;
}

.goal-phase-title {
  flex: 1;
  font-size: 16px;
  font-weight: 700;
}

.goal-phase-time {
  font-size: 12px;
  color: #8E8E93;
}

.goal-task-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.goal-task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 10px;
  background: #F2F2F7;
  margin-bottom: 8px;
}

.goal-task-delete {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 59, 48, 0.1);
  color: #FF3B30;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.goal-preview-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 40px;
}

@media (prefers-color-scheme: dark) {
  .goal-modal-overlay {
    background: #000;
  }
  .goal-input,
  .goal-duration-chip,
  .goal-phase,
  .goal-secondary-btn {
    background: #1C1C1E;
    color: white;
    border-color: rgba(255, 255, 255, 0.1);
  }
  .goal-task-item {
    background: #2C2C2E;
  }
  .goal-label,
  .goal-modal-title {
    color: white;
  }
}
```

- [ ] **Step 2: 验证样式文件无语法错误**

用浏览器打开 `index.html` 检查控制台无 CSS 报错即可。

- [ ] **Step 3: 提交**

```bash
git add css/style.css
git commit -m "style: AI 目标拆解入口卡片与全屏 modal 样式"
```

---

### Task 10: 联调与端到端验证

**Files:**
- 无新增文件，验证已有修改

**Interfaces:**
- 验证入口 → modal → 输入 → 生成 → 预览 → 生成清单 → 进度页刷新整条链路

- [ ] **Step 1: 运行所有测试**

```bash
node test/goal-breakdown-test.cjs
node test/recommendations-test.cjs
node test/report-test.cjs
```

Expected: 三个脚本均 `0 失败`。

- [ ] **Step 2: 浏览器端到端验证（无 AI Key）**

1. 用 VS Code Live Server 或双击 `index.html` 打开
2. 进入「进度」Tab，点击顶部紫色卡片「有个大目标？让 AI 帮你拆解」
3. 输入「一年读完 50 本书」，选择「1 年」，点击「开始拆解 ✨」
4. 期望：出现 3 阶段路线图，来源标识为「📋 智能模板」
5. 点击某条任务后的「×」删除，点击「生成专属清单」
6. 期望：modal 关闭，进度页出现「📚 一年读完 50 本书」清单，任务带「阶段N·」前缀
7. 勾选一条任务，期望：今日完成数 +1，人生轴出现记录

- [ ] **Step 3: 浏览器端到端验证（有 AI Key，可选）**

1. 在「我的」页配置 Kimi API Key
2. 输入模糊目标「我想成为插画师」，点击拆解
3. 期望：来源标识为「✨ AI 生成」，返回 3 阶段路线图
4. 断开网络或输入错误 Key，期望：toast「AI 暂不可用，已用本地拆解」，流程不中断

- [ ] **Step 4: 提交**

```bash
git commit --allow-empty -m "chore: AI 目标拆解联调通过"
```

---

### Task 11: 更新文档与版本号

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Produces: README 中列出 v6.4.0 功能；CHANGELOG 新增 v6.4.0 条目

- [ ] **Step 1: 修改 `CHANGELOG.md`**

在文件最顶部（`# 更新日志` 之后）插入：

```markdown
## v6.4.0 (2026-06-27) - AI 目标拆解 🎯

### ✨ AI 目标拆解（目标路线图）
- ✅ 进度页新增「AI 目标拆解」入口卡片
- ✅ 输入目标 + 期限，生成 3 阶段可执行路线图
- ✅ 本地规则引擎兜底，无 AI Key 也能用
- ✅ 配置 AI Key 后调用大模型，拆解更精准个性化
- ✅ AI 超时/失败/返回非法 JSON 时自动降级本地，流程不中断
- ✅ 预览态可删除单条任务，支持「换一种拆法」重新生成
- ✅ 一键生成专属清单，自动接入打卡闭环

### 🔧 技术改进
- 新增 `js/goalBreakdown.js` 目标拆解引擎（纯逻辑，不依赖 DOM）
- 新增 `js/goalBreakdownUI.js` 全屏 modal 渲染与交互
- 扩展 `js/aiService.js` 支持结构化 JSON 输出与 options.maxTokens
- 新增 `test/goal-breakdown-test.cjs` 单元测试

---
```

- [ ] **Step 2: 修改 `README.md`**

在「## ✨ 功能特性」的「### 我的人生进度」部分追加一条：

```markdown
- AI 目标拆解：输入宏大目标，自动生成 3 阶段路线图并生成专属清单
```

在「## 📁 项目结构」的 `js/` 列表中追加：

```markdown
|   ├── goalBreakdown.js   # AI 目标拆解引擎
|   └── goalBreakdownUI.js # AI 目标拆解 UI
```

- [ ] **Step 3: 提交**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: 更新 v6.4.0 AI 目标拆解文档"
```

---

## Self-Review

**1. Spec coverage:**

| 设计文档章节 | 实现任务 |
|---|---|
| 4.1 模块划分 | Task 1-3, 7-9 |
| 5. 交互流程 | Task 8 |
| 6.1 路线图数据结构 | Task 2 |
| 6.2 核心方法 | Task 2-5 |
| 6.3 智能归类 | Task 2, Task 6 测试 |
| 7. 本地模板库 | Task 2 |
| 8. AI 集成 | Task 1, 3 |
| 9. 落地为清单 | Task 5 |
| 10. 错误处理 | Task 3, 4, 8 |
| 11. 测试计划 | Task 6 |
| 12. UI/CSS 要点 | Task 7-9 |
| 13. 实现顺序 | 本计划任务顺序 |

**2. Placeholder scan:**

- 无 TBD/TODO/"implement later"
- 所有代码步骤均含完整代码
- 所有命令均含预期输出
- 文件路径均为绝对项目路径

**3. Type consistency:**

- `callRealAPIWithPrompt(prompt, config, options = {})` 与调用处一致
- `_parseRoadmapJSON` 返回形状与 `generateGoalRoadmap` 消费一致
- `GoalBreakdownEngine.createListFromRoadmap` 返回 `newList`，由 `GoalBreakdownUIManager.handleCreate` 消费
- 任务 id 格式 `task_${stamp}_${pi}_${ti}` 全计划一致
- category 白名单与 `data.js` 中分类一致

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-27-ai-goal-breakdown-plan.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
