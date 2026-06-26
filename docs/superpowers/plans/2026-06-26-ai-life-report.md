# AI 人生报告 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为「人生已完成清单」新增 AI 人生报告——基于用户完成记录按时间段生成个性化总结,默认本地规则引擎、可选接入真实大模型。

**Architecture:** 纯加法。新增 `aiService.js`(文案生成层:规则引擎 + 真实 API + 降级)与 `report.js`(数据聚合 + 报告页渲染),扩展 `settings.js`(AI 配置)、`profile.js`/`statistics.js`(入口),复用现有视图切换、modal/toast、html2canvas 截图。

**Tech Stack:** 原生 JavaScript(对象字面量 Manager 模式)+ Tailwind CSS + LocalStorage + fetch。无构建、无 npm、无测试框架。

## Global Constraints

- **纯前端,无构建工具**:所有代码为浏览器直接运行的原生 JS,不得引入 npm 依赖或构建步骤。
- **Manager 模式**:新模块用 `const XxxManager = { ... }` 对象字面量,与现有模块一致。
- **代码注释一律用中文**,风格与现有文件一致。
- **LocalStorage key 前缀**:`life_checklist_`。
- **不破坏现有功能**:首页/进度/大全/人生轴/统计/我的 六大模块行为不变。
- **测试方式**:纯函数(聚合、规则引擎)用 `test/report-test.html` 在浏览器中断言;UI/集成用文中给出的「手动验证」步骤在浏览器打开 `index.html` 验证。
- **Git**:本项目当前非 git 仓库。建议执行本计划前先在 `life-checklist/` 执行 `git init`,以便逐任务提交;若不使用 git,各任务末尾的 commit 步骤可跳过(改为手动备份)。
- **API 格式**:真实 API 调用统一用 OpenAI 兼容的 `POST {baseURL}/chat/completions`,Bearer 鉴权;预置 Kimi / DeepSeek / 智谱 GLM 三家。
- **新脚本加载顺序**:在 `index.html` 中,`aiService.js` 与 `report.js` 必须在 `app.js` **之前**引入。

---

### Task 1: 数据聚合层 `ReportManager.aggregateReportData`

把 LocalStorage 原始数据按时间段聚合成结构化 `reportData`。纯函数,优先实现并自测。

**Files:**
- Create: `js/report.js`
- Create: `test/report-test.html`

**Interfaces:**
- Consumes: `StorageManager.getLists()`、`getTimeline()`、`getStreakData()`、`getUnlockedAchievements()`、`getBirthDate()`、`calculateLifeProgress()`;全局 `DEFAULT_LISTS`、`DEFAULT_LIFE_EXPECTANCY`。
- Produces:
  - `ReportManager.aggregateReportData(period)` → `reportData` 对象,`period ∈ {'month','year','all'}`
  - `reportData` 形状:
    ```js
    {
      period, periodLabel, totalCompleted,
      byCategory: [{ title, emoji, count }],   // 按 list 分组,count 降序
      topCategory: { title, emoji, count } | null,
      streak: { current, longest },
      totalAchievements,
      lifeProgress: { age, daysLived, percent },
      highlights: [{ title, emoji, photo }],   // 最多 3 条,含照片的时段内事件
      mostActiveDay: { label, count } | null,
      hasData: boolean
    }
    ```

- [ ] **Step 1: 写失败测试**

创建 `test/report-test.html`(在浏览器打开即运行,结果显示在页面与控制台):

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>报告模块测试</title>
  <style>body{font-family:sans-serif;padding:20px}.pass{color:#34c759}.fail{color:#ff3b30}</style>
</head>
<body>
  <h1>report.js / aiService.js 单元测试</h1>
  <div id="results"></div>

  <!-- 被测依赖 -->
  <script src="../js/data.js"></script>
  <script src="../js/storage.js"></script>
  <script src="../js/settings.js"></script>
  <script src="../js/aiService.js"></script>
  <script src="../js/report.js"></script>

  <script>
    // 极简断言器（中文输出）
    const out = document.getElementById('results');
    let passed = 0, failed = 0;
    function assert(name, cond) {
      const ok = !!cond;
      ok ? passed++ : failed++;
      const p = document.createElement('p');
      p.className = ok ? 'pass' : 'fail';
      p.textContent = (ok ? '✅ ' : '❌ ') + name;
      out.appendChild(p);
      if (!ok) console.error('断言失败:', name);
    }

    // 准备 mock 数据：直接写入 localStorage
    function seedMockData() {
      localStorage.clear();
      const today = new Date();
      const iso = (d) => d.toISOString().split('T')[0]; // YYYY-MM-DD
      const lists = [
        { id:'travel', emoji:'🌍', title:'环游世界', description:'', color:'#007AFF', category:'旅行',
          tasks:[
            { id:'a', text:'看极光', completed:true, completedDate: iso(today), note:'', priority:'medium' },
            { id:'b', text:'去巴黎', completed:true, completedDate: iso(today), note:'', priority:'medium' },
            { id:'c', text:'潜水', completed:false, completedDate:'', note:'', priority:'medium' }
          ]
        },
        { id:'skills', emoji:'🎯', title:'技能解锁', description:'', color:'#FF9500', category:'成长',
          tasks:[
            { id:'d', text:'学吉他', completed:true, completedDate: iso(today), note:'', priority:'medium' }
          ]
        }
      ];
      StorageManager.setLists(lists);
      StorageManager.setStreakData({ currentStreak:5, longestStreak:9, lastCheckDate: today.toDateString(), todayChecked:true });
      StorageManager.setBirthDate('1998-01-01');
    }

    // ---- Task 1 测试 ----
    seedMockData();
    const r = ReportManager.aggregateReportData('all');
    assert('aggregateReportData 返回对象', r && typeof r === 'object');
    assert('全部时段完成数为 3', r.totalCompleted === 3);
    assert('hasData 为 true', r.hasData === true);
    assert('最活跃分类是旅行(2件)', r.topCategory && r.topCategory.title === '环游世界' && r.topCategory.count === 2);
    assert('byCategory 按 count 降序', r.byCategory[0].count >= r.byCategory[1].count);
    assert('streak 透传正确', r.streak.current === 5 && r.streak.longest === 9);
    assert('lifeProgress 含年龄', typeof r.lifeProgress.age === 'number' && r.lifeProgress.age > 0);

    const rMonth = ReportManager.aggregateReportData('month');
    assert('本月完成数为 3(mock 全是今天)', rMonth.totalCompleted === 3);

    document.title = `测试 ${passed} 通过 / ${failed} 失败`;
  </script>
</body>
</html>
```

- [ ] **Step 2: 在浏览器打开确认失败**

打开 `test/report-test.html`。
Expected: 报错 `ReportManager is not defined`(report.js 尚未实现)。

- [ ] **Step 3: 实现 `js/report.js`(本任务只放聚合纯函数 + 工具)**

```js
/**
 * AI 人生报告模块
 * 负责：数据聚合、报告页渲染、时间段切换、分享
 */
const ReportManager = {
  currentPeriod: 'month', // 当前选中时间段

  /**
   * 把原始数据按时间段聚合成结构化 reportData（纯函数）
   * @param {'month'|'year'|'all'} period
   */
  aggregateReportData(period) {
    const lists = StorageManager.getLists() || DEFAULT_LISTS;
    const range = this._getPeriodRange(period);

    // 1) 遍历所有已完成且在时间段内的任务，按清单分组
    const categoryMap = {};   // title -> { title, emoji, count }
    const dayMap = {};        // 'M-D' -> count
    let totalCompleted = 0;

    lists.forEach(list => {
      list.tasks.forEach(task => {
        if (!task.completed || !task.completedDate) return;
        const done = new Date(task.completedDate + 'T00:00:00');
        if (!this._inRange(done, range)) return;

        totalCompleted++;

        if (!categoryMap[list.title]) {
          categoryMap[list.title] = { title: list.title, emoji: list.emoji, count: 0 };
        }
        categoryMap[list.title].count++;

        const dayKey = (done.getMonth() + 1) + '-' + done.getDate();
        dayMap[dayKey] = (dayMap[dayKey] || 0) + 1;
      });
    });

    const byCategory = Object.values(categoryMap).sort((a, b) => b.count - a.count);
    const topCategory = byCategory.length > 0 ? byCategory[0] : null;

    // 2) 最活跃的一天
    let mostActiveDay = null;
    Object.keys(dayMap).forEach(k => {
      if (!mostActiveDay || dayMap[k] > mostActiveDay.count) {
        mostActiveDay = { label: k, count: dayMap[k] };
      }
    });

    // 3) 累计数据（无时间戳，作为“截至目前”展示）
    const streakData = StorageManager.getStreakData();
    const totalAchievements = StorageManager.getUnlockedAchievements().length;

    // 4) 人生进度
    const lifeProgress = this._calcLifeProgress();

    // 5) 高光时刻：时段内含照片的时间线事件，最多 3 条
    const highlights = StorageManager.getTimeline()
      .filter(e => e.photo && this._inRange(new Date(e.date), range))
      .slice(0, 3)
      .map(e => ({ title: e.title, emoji: e.emoji, photo: e.photo }));

    return {
      period,
      periodLabel: this._getPeriodLabel(period),
      totalCompleted,
      byCategory,
      topCategory,
      streak: { current: streakData.currentStreak, longest: streakData.longestStreak },
      totalAchievements,
      lifeProgress,
      highlights,
      mostActiveDay,
      hasData: totalCompleted > 0
    };
  },

  /** 计算时间段的起止时间 */
  _getPeriodRange(period) {
    const now = new Date();
    if (period === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: now };
    }
    if (period === 'year') {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end: now };
    }
    return { start: new Date(2000, 0, 1), end: now }; // all
  },

  _inRange(date, range) {
    return date >= range.start && date <= range.end;
  },

  _getPeriodLabel(period) {
    const now = new Date();
    if (period === 'month') return `${now.getFullYear()} 年 ${now.getMonth() + 1} 月`;
    if (period === 'year') return `${now.getFullYear()} 年`;
    return '全部时光';
  },

  /** 人生进度：年龄、已活天数、百分比 */
  _calcLifeProgress() {
    const birthStr = StorageManager.getBirthDate();
    if (!birthStr) return { age: 0, daysLived: 0, percent: 0 };
    const birth = new Date(birthStr);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    const daysLived = Math.floor((now - birth) / 86400000);
    const percent = Math.round(StorageManager.calculateLifeProgress(birthStr));
    return { age, daysLived, percent };
  }
};
```

- [ ] **Step 4: 在浏览器打开确认通过**

刷新 `test/report-test.html`。
Expected: Task 1 的 8 条断言全部 ✅,标题显示「测试 8 通过 / 0 失败」。
（注:`aiService.js` 尚未创建会导致 `<script src>` 404,但不影响 Task 1 断言;Task 2 会补上。若浏览器因 404 阻断,可临时注释该行,Task 2 后恢复。）

- [ ] **Step 5: 提交(可选)**

```bash
git add js/report.js test/report-test.html
git commit -m "feat: 新增报告数据聚合层 aggregateReportData + 单测"
```

---

### Task 2: 本地规则引擎 `AIService.callRuleEngine`

无需任何配置即可生成 4 段中文文案,作为默认与兜底。

**Files:**
- Create: `js/aiService.js`
- Modify: `test/report-test.html`(追加断言)

**Interfaces:**
- Consumes: `reportData`(Task 1 产出)。
- Produces:
  - `AIService.callRuleEngine(reportData)` → `{ source:'rule', paragraphs: string[4] }`
  - 4 段顺序:开场总结、亮点、坚持鼓励、下一步建议。

- [ ] **Step 1: 追加失败测试**

在 `test/report-test.html` 的 `</script>` 前、`document.title` 行之前追加:

```js
    // ---- Task 2 测试 ----
    const narrative = AIService.callRuleEngine(r);
    assert('callRuleEngine 返回 source=rule', narrative.source === 'rule');
    assert('生成 4 段文案', Array.isArray(narrative.paragraphs) && narrative.paragraphs.length === 4);
    assert('每段非空字符串', narrative.paragraphs.every(p => typeof p === 'string' && p.length > 0));
    assert('文案包含完成数字', narrative.paragraphs[0].includes('3'));
```

- [ ] **Step 2: 在浏览器打开确认失败**

打开 `test/report-test.html`。
Expected: `AIService is not defined`。

- [ ] **Step 3: 实现 `js/aiService.js`(本任务只放规则引擎)**

```js
/**
 * AI 文案生成服务
 * 混合策略：默认规则引擎，可选真实大模型 API，失败自动降级
 */
const AIService = {
  /**
   * 本地规则引擎：根据 reportData 生成 4 段中文文案（纯函数）
   * @returns {{source:'rule', paragraphs:string[]}}
   */
  callRuleEngine(reportData) {
    const d = reportData;
    const pick = (arr, seed) => arr[seed % arr.length]; // 用数据做种子，稳定又多样

    // 第 1 段：开场总结
    const openings = [
      `在${d.periodLabel}里，你完成了 ${d.totalCompleted} 件事，每一件都是生活的勋章。`,
      `回顾${d.periodLabel}，你郑重地完成了 ${d.totalCompleted} 个目标，了不起。`,
      `${d.periodLabel}的你，把 ${d.totalCompleted} 个想法变成了现实。`
    ];
    const p1 = pick(openings, d.totalCompleted);

    // 第 2 段：亮点（最活跃分类 / 高光）
    let p2;
    if (d.topCategory) {
      p2 = `其中「${d.topCategory.emoji} ${d.topCategory.title}」最为活跃，完成了 ${d.topCategory.count} 件——看得出这是你当下热爱的方向。`;
      if (d.mostActiveDay) {
        p2 += ` ${d.mostActiveDay.label} 那天你尤其投入，一口气完成了 ${d.mostActiveDay.count} 件事。`;
      }
    } else {
      p2 = '新的篇章正等待被书写，去完成第一个属于这个阶段的目标吧。';
    }

    // 第 3 段：坚持鼓励（打卡）
    const streakLines = [
      `你已连续打卡 ${d.streak.current} 天，最高纪录 ${d.streak.longest} 天，坚持本身就是一种天赋。`,
      `当前连续打卡 ${d.streak.current} 天（历史最高 ${d.streak.longest} 天），habits 正在塑造更好的你。`
    ];
    const p3 = d.streak.longest > 0
      ? pick(streakLines, d.streak.longest)
      : '从今天开始连续打卡，让坚持成为习惯吧。';

    // 第 4 段：下一步建议
    const suggestions = [
      '下一步，不妨给自己定一个稍有挑战的小目标,跳一跳够得着的那种。',
      '接下来,试着把一个搁置已久的愿望提上日程吧——未来的你会感谢现在的行动。',
      '继续保持节奏,挑一件让你心动已久的事,把它加入清单。'
    ];
    const p4 = pick(suggestions, d.totalCompleted + d.streak.longest);

    return { source: 'rule', paragraphs: [p1, p2, p3, p4] };
  }
};
```

- [ ] **Step 4: 在浏览器打开确认通过**

刷新 `test/report-test.html`。
Expected: 标题显示「测试 12 通过 / 0 失败」。

- [ ] **Step 5: 提交(可选)**

```bash
git add js/aiService.js test/report-test.html
git commit -m "feat: 新增本地规则引擎 callRuleEngine + 单测"
```

---

### Task 3: AI 配置存储(扩展 `settings.js`)

存储用户填写的厂商、API Key、模型、启用开关。

**Files:**
- Modify: `js/settings.js`(在 `SettingsManager` 内新增方法)

**Interfaces:**
- Produces:
  - `SettingsManager.getAIConfig()` → `{ provider, baseURL, apiKey, model, enabled }`
  - `SettingsManager.setAIConfig(partial)` → 合并保存
  - `SettingsManager.AI_PROVIDERS` → 预置厂商表

- [ ] **Step 1: 追加失败测试**

在 `test/report-test.html` Task 2 断言后追加:

```js
    // ---- Task 3 测试 ----
    SettingsManager.setAIConfig({ provider:'deepseek', apiKey:'sk-test', enabled:true });
    const cfg = SettingsManager.getAIConfig();
    assert('AI 配置已保存 provider', cfg.provider === 'deepseek');
    assert('AI 配置带 baseURL', cfg.baseURL.includes('deepseek'));
    assert('AI 配置 enabled', cfg.enabled === true);
    SettingsManager.setAIConfig({ enabled:false, apiKey:'' }); // 清理，避免影响后续
```

- [ ] **Step 2: 确认失败**

打开测试页。Expected: `setAIConfig is not a function`。

- [ ] **Step 3: 在 `js/settings.js` 的 `KEYS` 中加一行,并在 `SettingsManager` 内追加方法**

在 `KEYS` 对象内追加:
```js
    AI_CONFIG: 'life_checklist_ai_config'
```

在 `SettingsManager` 对象内(如 `sortLists` 之后)追加:
```js
  // 预置大模型厂商（OpenAI 兼容）
  AI_PROVIDERS: {
    kimi:     { label: 'Kimi (Moonshot)', baseURL: 'https://api.moonshot.cn/v1',          model: 'moonshot-v1-8k' },
    deepseek: { label: 'DeepSeek',         baseURL: 'https://api.deepseek.com/v1',          model: 'deepseek-chat' },
    glm:      { label: '智谱 GLM',         baseURL: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' }
  },

  getAIConfig() {
    const raw = localStorage.getItem(this.KEYS.AI_CONFIG);
    const defaults = { provider: 'kimi', apiKey: '', model: '', enabled: false };
    let saved = {};
    if (raw) { try { saved = JSON.parse(raw); } catch (e) { saved = {}; } }
    const cfg = { ...defaults, ...saved };
    const provider = this.AI_PROVIDERS[cfg.provider] ? cfg.provider : 'kimi';
    cfg.baseURL = this.AI_PROVIDERS[provider].baseURL;
    if (!cfg.model) cfg.model = this.AI_PROVIDERS[provider].model;
    return cfg;
  },

  setAIConfig(partial) {
    const merged = { ...this.getAIConfig(), ...partial };
    // 只持久化用户可改字段（baseURL 由 provider 派生，不存）
    const toSave = { provider: merged.provider, apiKey: merged.apiKey, model: merged.model, enabled: merged.enabled };
    localStorage.setItem(this.KEYS.AI_CONFIG, JSON.stringify(toSave));
    return this.getAIConfig();
  },
```

- [ ] **Step 4: 确认通过**

刷新测试页。Expected: 「测试 15 通过 / 0 失败」。

- [ ] **Step 5: 提交(可选)**

```bash
git add js/settings.js test/report-test.html
git commit -m "feat: settings 新增 AI 配置存储 getAIConfig/setAIConfig"
```

---

### Task 4: 真实 API 调用 + 混合入口(扩展 `aiService.js`)

新增真实大模型调用(超时 + 降级)与统一入口 `generateNarrative`。

**Files:**
- Modify: `js/aiService.js`

**Interfaces:**
- Consumes: `SettingsManager.getAIConfig()`、`callRuleEngine`(Task 2)。
- Produces:
  - `AIService.generateNarrative(reportData)` → `Promise<{source:'rule'|'api', paragraphs?:string[], text?:string, degraded?:boolean}>`
  - `AIService.buildPrompt(reportData)` → string
  - `AIService.callRealAPI(reportData, config)` → `Promise<{source:'api', text:string}>`(失败抛错)
  - `AIService.testConnection(config)` → `Promise<{ok:boolean, message:string}>`

- [ ] **Step 1: 追加测试(验证无 Key 时走规则引擎)**

在 `test/report-test.html` 末尾追加(注意是异步):

```js
    // ---- Task 4 测试（异步）----
    (async () => {
      SettingsManager.setAIConfig({ enabled:false, apiKey:'' });
      const n = await AIService.generateNarrative(r);
      assert('未启用时降级为规则引擎', n.source === 'rule');
      assert('buildPrompt 含完成数', AIService.buildPrompt(r).includes(String(r.totalCompleted)));
      document.title = `测试 ${passed} 通过 / ${failed} 失败`;
    })();
```

- [ ] **Step 2: 确认失败**

打开测试页。Expected: `generateNarrative is not a function`。

- [ ] **Step 3: 在 `js/aiService.js` 的 `AIService` 内追加方法**

```js
  /**
   * 统一入口：有有效配置则调真实 API，否则/失败则降级规则引擎
   */
  async generateNarrative(reportData) {
    const cfg = SettingsManager.getAIConfig();
    if (cfg.enabled && cfg.apiKey) {
      try {
        const apiResult = await this.callRealAPI(reportData, cfg);
        return apiResult; // { source:'api', text }
      } catch (e) {
        console.warn('真实 API 调用失败，降级规则引擎:', e.message);
        const fallback = this.callRuleEngine(reportData);
        fallback.degraded = true; // 标记降级，UI 可提示
        return fallback;
      }
    }
    return this.callRuleEngine(reportData);
  },

  /**
   * 把 reportData 组织成给大模型的中文 prompt
   */
  buildPrompt(reportData) {
    const d = reportData;
    const cats = d.byCategory.map(c => `${c.title}(${c.count}件)`).join('、') || '暂无';
    return [
      '你是一位温暖、真诚的人生记录助手。请根据以下用户数据，写一段 150-250 字的中文「人生阶段报告」。',
      '要求：口吻温暖个性化、有具体数据支撑、给出一个具体的下一步建议；不要用 markdown 标题，分 2-3 个自然段。',
      '',
      `统计时段：${d.periodLabel}`,
      `完成事项总数：${d.totalCompleted}`,
      `分类分布：${cats}`,
      `最活跃方向：${d.topCategory ? d.topCategory.title : '无'}`,
      `连续打卡：当前 ${d.streak.current} 天 / 最高 ${d.streak.longest} 天`,
      `已解锁成就：${d.totalAchievements} 个`,
      `人生进度：${d.lifeProgress.age} 岁，已度过 ${d.lifeProgress.daysLived} 天`
    ].join('\n');
  },

  /**
   * 调用真实大模型（OpenAI 兼容），15s 超时
   * @returns {Promise<{source:'api', text:string}>}
   */
  async callRealAPI(reportData, config) {
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
            { role: 'user', content: this.buildPrompt(reportData) }
          ],
          temperature: 0.8
        }),
        signal: controller.signal
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      const text = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content.trim()
        : '';
      if (!text) throw new Error('空响应');
      return { source: 'api', text };
    } finally {
      clearTimeout(timer);
    }
  },

  /**
   * 测试连接：用最小请求验证 Key 是否可用
   */
  async testConnection(config) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const resp = await fetch(`${config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model, messages: [{ role:'user', content:'你好' }], max_tokens: 5 }),
        signal: controller.signal
      });
      if (resp.ok) return { ok: true, message: '连接成功 ✅' };
      if (resp.status === 401) return { ok: false, message: 'API Key 无效（401）' };
      return { ok: false, message: '连接失败：HTTP ' + resp.status };
    } catch (e) {
      return { ok: false, message: e.name === 'AbortError' ? '连接超时' : ('网络错误：' + e.message) };
    } finally {
      clearTimeout(timer);
    }
  },
```

- [ ] **Step 4: 确认通过**

刷新测试页。Expected: 「测试 17 通过 / 0 失败」。

- [ ] **Step 5: 提交(可选)**

```bash
git add js/aiService.js test/report-test.html
git commit -m "feat: 新增真实 API 调用、混合入口 generateNarrative 与连接测试"
```

---

### Task 5: 报告页 DOM 结构 + 样式

新增 `#report-view` 视图与样式,并引入新脚本。本任务只搭结构,渲染逻辑在 Task 6。

**Files:**
- Modify: `index.html`(新增 report-view、引入脚本)
- Modify: `css/style.css`(报告页样式)

**Interfaces:**
- Produces: DOM 节点 `#report-view`、`#report-period-tabs`、`#report-card`、`#report-loading`、按钮 `#report-back-btn`/`#report-regenerate-btn`/`#report-save-btn`/`#report-copy-btn`。

- [ ] **Step 1: 在 `index.html` 引入新脚本**

在 `<script src="js/templates.js"></script>` 之前(即 `app.js` 之前任意位置,但要在 storage/settings 之后)加入两行:
```html
  <script src="js/aiService.js"></script>
  <script src="js/report.js"></script>
```

- [ ] **Step 2: 在 `index.html` 新增报告视图**

在 `<!-- ==================== 个人中心视图 ==================== -->` 区块的 `</div>` 之后(主容器 `</div>` 之前)插入:

```html
    <!-- ==================== AI 人生报告视图 ==================== -->
    <div id="report-view" class="hidden">
      <!-- 返回按钮 -->
      <div class="pt-6 pb-4">
        <button id="report-back-btn" class="flex items-center gap-2 text-apple-blue font-medium">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          返回
        </button>
      </div>

      <!-- 头部 + 时段切换 -->
      <header class="mb-4">
        <h1 class="text-3xl font-bold text-apple-dark dark:text-white mb-3">✨ AI 人生报告</h1>
        <div class="report-period-tabs" id="report-period-tabs">
          <button class="report-tab active" data-period="month">本月</button>
          <button class="report-tab" data-period="year">本年</button>
          <button class="report-tab" data-period="all">全部</button>
        </div>
      </header>

      <!-- 加载态 -->
      <div id="report-loading" class="report-loading hidden">
        <div class="report-spinner"></div>
        <p>AI 正在为你撰写人生报告…</p>
      </div>

      <!-- 报告卡片（可截图区域） -->
      <section>
        <div id="report-card" class="report-card"></div>
      </section>

      <!-- 操作按钮 -->
      <div class="report-actions" id="report-actions">
        <button id="report-regenerate-btn" class="report-action-btn">🔄 重新生成</button>
        <button id="report-save-btn" class="report-action-btn">💾 保存图片</button>
        <button id="report-copy-btn" class="report-action-btn">📋 复制文字</button>
      </div>
    </div>
```

- [ ] **Step 3: 在 `css/style.css` 末尾追加报告页样式**

```css
/* ==================== AI 人生报告 ==================== */
.report-period-tabs { display: flex; gap: 8px; }
.report-tab {
  flex: 1; padding: 8px 0; border: none; border-radius: 12px;
  background: #f0f0f5; color: #86868b; font-size: 14px; font-weight: 600; cursor: pointer;
  transition: all .2s;
}
.report-tab.active { background: #007aff; color: #fff; }
.dark .report-tab { background: #1c1c1e; color: #98989d; }
.dark .report-tab.active { background: #0a84ff; color: #fff; }

.report-loading { text-align: center; padding: 40px 0; color: #86868b; }
.report-spinner {
  width: 36px; height: 36px; margin: 0 auto 12px;
  border: 3px solid #e5e5ea; border-top-color: #007aff; border-radius: 50%;
  animation: report-spin .8s linear infinite;
}
@keyframes report-spin { to { transform: rotate(360deg); } }

.report-card {
  background: linear-gradient(160deg, #ffffff, #f5f5f7);
  border-radius: 24px; padding: 24px; box-shadow: 0 8px 30px rgba(0,0,0,.06);
}
.dark .report-card { background: linear-gradient(160deg, #1c1c1e, #000); }

.report-card-title { font-size: 20px; font-weight: 700; margin-bottom: 4px; color: #1d1d1f; }
.dark .report-card-title { color: #fff; }
.report-card-period { font-size: 13px; color: #86868b; margin-bottom: 16px; }

.report-narrative { font-size: 15px; line-height: 1.8; color: #1d1d1f; margin-bottom: 20px; }
.dark .report-narrative { color: #f5f5f7; }
.report-narrative p { margin-bottom: 10px; }

.report-metrics { display: flex; gap: 8px; margin-bottom: 20px; }
.report-metric { flex: 1; background: rgba(0,122,255,.08); border-radius: 14px; padding: 12px; text-align: center; }
.report-metric-value { font-size: 22px; font-weight: 700; color: #007aff; }
.report-metric-label { font-size: 12px; color: #86868b; margin-top: 2px; }

.report-section-title { font-size: 14px; font-weight: 600; color: #1d1d1f; margin: 16px 0 8px; }
.dark .report-section-title { color: #fff; }

.report-cat-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.report-cat-name { font-size: 13px; width: 96px; color: #1d1d1f; }
.dark .report-cat-name { color: #f5f5f7; }
.report-cat-bar-bg { flex: 1; height: 8px; background: #e5e5ea; border-radius: 4px; overflow: hidden; }
.report-cat-bar { height: 100%; background: #34c759; border-radius: 4px; }
.report-cat-count { font-size: 12px; color: #86868b; width: 32px; text-align: right; }

.report-highlights { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
.report-highlight { flex: 0 0 auto; width: 96px; text-align: center; }
.report-highlight img { width: 96px; height: 96px; object-fit: cover; border-radius: 12px; }
.report-highlight span { display: block; font-size: 11px; color: #86868b; margin-top: 4px; }

.report-card-footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,.06);
  display: flex; justify-content: space-between; font-size: 12px; color: #86868b; }

.report-empty { text-align: center; padding: 40px 0; color: #86868b; }
.report-empty .empty-emoji { font-size: 48px; display: block; margin-bottom: 12px; }

.report-actions { display: flex; gap: 8px; margin-top: 16px; }
.report-action-btn {
  flex: 1; padding: 12px 0; border: none; border-radius: 14px;
  background: #fff; color: #007aff; font-size: 14px; font-weight: 600; cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,.05);
}
.dark .report-action-btn { background: #1c1c1e; color: #0a84ff; }

/* 我的页 / 统计页 报告入口 */
.report-entry-card {
  display: flex; align-items: center; gap: 12px; width: 100%;
  background: linear-gradient(135deg, #007aff, #5856d6); color: #fff;
  border: none; border-radius: 18px; padding: 16px; margin-bottom: 16px; cursor: pointer;
  box-shadow: 0 6px 20px rgba(88,86,214,.25);
}
.report-entry-card .entry-emoji { font-size: 28px; }
.report-entry-card .entry-text { text-align: left; flex: 1; }
.report-entry-card .entry-title { font-size: 16px; font-weight: 700; }
.report-entry-card .entry-sub { font-size: 12px; opacity: .9; }
```

- [ ] **Step 4: 手动验证**

在浏览器打开 `index.html`,控制台执行:
```js
document.getElementById('report-view').classList.remove('hidden');
```
Expected: 看到「✨ AI 人生报告」标题、本月/本年/全部三个 tab、三个操作按钮(卡片区暂为空,正常)。验证后刷新还原。

- [ ] **Step 5: 提交(可选)**

```bash
git add index.html css/style.css
git commit -m "feat: 新增报告页 DOM 结构与样式，引入新脚本"
```

---

### Task 6: 报告渲染与交互(扩展 `report.js` + 接线 `app.js`)

实现打开报告页、渲染、时段切换、重新生成、保存图片、复制。

**Files:**
- Modify: `js/report.js`(新增渲染与交互方法)
- Modify: `js/app.js`(新增 `showReportPage`,并在各 `showXxxPage` 隐藏 report-view)

**Interfaces:**
- Consumes: `aggregateReportData`(Task 1)、`AIService.generateNarrative`(Task 4)、`ShareManager.captureCard`/`showToast`(现有)。
- Produces:
  - `ReportManager.open()` — 打开报告页并生成本月报告
  - `ReportManager.renderReport()` — 异步聚合 + 生成 + 渲染
  - `window.showReportPage()` — 视图切换(供 app.js / 入口调用)

- [ ] **Step 1: 在 `js/report.js` 的 `ReportManager` 内追加渲染与交互方法**

```js
  /** 打开报告页（默认本月） */
  open() {
    this.currentPeriod = 'month';
    showReportPage();
    this._bindEventsOnce();
    this._syncTabs();
    this.renderReport();
  },

  /** 绑定一次性事件 */
  _bindEventsOnce() {
    if (this._bound) return;
    this._bound = true;

    document.getElementById('report-back-btn').addEventListener('click', () => showProfilePage());
    document.getElementById('report-regenerate-btn').addEventListener('click', () => this.renderReport());
    document.getElementById('report-save-btn').addEventListener('click', () => this._saveImage());
    document.getElementById('report-copy-btn').addEventListener('click', () => this._copyText());

    document.querySelectorAll('#report-period-tabs .report-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentPeriod = tab.dataset.period;
        this._syncTabs();
        this.renderReport();
      });
    });
  },

  _syncTabs() {
    document.querySelectorAll('#report-period-tabs .report-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.period === this.currentPeriod);
    });
  },

  /** 聚合 + 生成文案 + 渲染（异步） */
  async renderReport() {
    const card = document.getElementById('report-card');
    const loading = document.getElementById('report-loading');
    const data = this.aggregateReportData(this.currentPeriod);

    // 空数据引导
    if (!data.hasData) {
      card.innerHTML = `
        <div class="report-empty">
          <span class="empty-emoji">🌱</span>
          <p>这个时段还没有完成记录<br>去完成第一个目标，开启你的人生报告吧</p>
        </div>`;
      this._lastText = '';
      return;
    }

    loading.classList.remove('hidden');
    card.innerHTML = '';

    let narrative;
    try {
      narrative = await AIService.generateNarrative(data);
    } catch (e) {
      narrative = AIService.callRuleEngine(data);
    }
    loading.classList.add('hidden');

    if (narrative.degraded) {
      ShareManager.showToast('AI 服务暂不可用，已使用本地报告');
    }

    card.innerHTML = this._buildCardHTML(data, narrative);
    this._lastText = this._plainText(data, narrative);
  },

  /** 拼装报告卡片 HTML */
  _buildCardHTML(d, narrative) {
    // 文案：API 返回整段 text；规则引擎返回 paragraphs[]
    const paras = narrative.source === 'api'
      ? narrative.text.split('\n').filter(s => s.trim())
      : narrative.paragraphs;
    const narrativeHTML = paras.map(p => `<p>${p}</p>`).join('');

    const maxCat = d.byCategory.length ? d.byCategory[0].count : 1;
    const catHTML = d.byCategory.map(c => `
      <div class="report-cat-row">
        <span class="report-cat-name">${c.emoji} ${c.title}</span>
        <span class="report-cat-bar-bg"><span class="report-cat-bar" style="width:${Math.round(c.count / maxCat * 100)}%"></span></span>
        <span class="report-cat-count">${c.count}</span>
      </div>`).join('');

    const highlightsHTML = d.highlights.length ? `
      <div class="report-section-title">📸 高光时刻</div>
      <div class="report-highlights">
        ${d.highlights.map(h => `<div class="report-highlight"><img src="${h.photo}" alt=""><span>${h.title}</span></div>`).join('')}
      </div>` : '';

    return `
      <div class="report-card-title">${d.lifeProgress.age > 0 ? d.lifeProgress.age + ' 岁 · ' : ''}我的人生报告</div>
      <div class="report-card-period">📅 ${d.periodLabel}</div>
      <div class="report-narrative">${narrativeHTML}</div>
      <div class="report-metrics">
        <div class="report-metric"><div class="report-metric-value">${d.totalCompleted}</div><div class="report-metric-label">完成事项</div></div>
        <div class="report-metric"><div class="report-metric-value">${d.streak.current}</div><div class="report-metric-label">连续打卡</div></div>
        <div class="report-metric"><div class="report-metric-value">${d.lifeProgress.percent}%</div><div class="report-metric-label">人生进度</div></div>
      </div>
      <div class="report-section-title">🏆 分类洞察</div>
      ${catHTML}
      ${highlightsHTML}
      <div class="report-card-footer">
        <span>✨ 人生已完成清单</span>
        <span>${this._todayStr()}</span>
      </div>`;
  },

  _todayStr() {
    const n = new Date();
    return `${n.getFullYear()}-${n.getMonth() + 1}-${n.getDate()}`;
  },

  /** 生成可复制的纯文本 */
  _plainText(d, narrative) {
    const body = narrative.source === 'api' ? narrative.text : narrative.paragraphs.join('\n');
    return `✨ 我的人生报告 · ${d.periodLabel}\n\n${body}\n\n完成 ${d.totalCompleted} 件事 · 连续打卡 ${d.streak.current} 天 · 人生进度 ${d.lifeProgress.percent}%\n\n#人生已完成清单`;
  },

  /** 保存为图片：复用 ShareManager 的 html2canvas 截图 */
  _saveImage() {
    const card = document.getElementById('report-card');
    if (!card || !card.innerHTML.trim()) return;
    if (!window.html2canvas) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.onload = () => this._capture(card);
      document.head.appendChild(s);
    } else {
      this._capture(card);
    }
  },

  _capture(el) {
    html2canvas(el, { backgroundColor: '#ffffff', scale: 2, useCORS: true }).then(canvas => {
      const link = document.createElement('a');
      link.download = '人生报告_' + new Date().toISOString().slice(0, 10) + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      ShareManager.showToast('图片已保存 ✅');
    });
  },

  _copyText() {
    if (!this._lastText) return;
    navigator.clipboard.writeText(this._lastText)
      .then(() => ShareManager.showToast('已复制到剪贴板 ✅'))
      .catch(() => ShareManager.showToast('复制失败，请手动选择'));
  },
```

- [ ] **Step 2: 在 `js/app.js` 末尾(`DOMContentLoaded` 行之前)新增视图切换函数**

```js
/**
 * 显示 AI 人生报告页
 */
function showReportPage() {
  AppState.currentView = 'report';

  document.getElementById('home-view').classList.add('hidden');
  document.getElementById('lists-view').classList.add('hidden');
  document.getElementById('templates-view').classList.add('hidden');
  document.getElementById('timeline-view').classList.add('hidden');
  document.getElementById('detail-view').classList.add('hidden');
  document.getElementById('achievements-view').classList.add('hidden');
  document.getElementById('statistics-view').classList.add('hidden');
  document.getElementById('profile-view').classList.add('hidden');
  document.getElementById('report-view').classList.remove('hidden');
}
```

- [ ] **Step 3: 在 `js/app.js` 其余 8 个 `showXxxPage` 函数中各加一行隐藏 report-view**

在 `showHomePage`、`showListsPage`、`showListDetail`、`showTemplatesPage`、`showTimelinePage`、`showAchievementsPage`、`showStatisticsPage`、`showProfilePage` 每个函数体内,与其它 `classList.add('hidden')` 并列处追加:
```js
  document.getElementById('report-view').classList.add('hidden');
```
(跟随现有「逐个列出」的写法,保证从报告页切走时它被隐藏。)

- [ ] **Step 4: 手动验证**

打开 `index.html`,控制台执行:
```js
ReportManager.open();
```
Expected:
- 切到报告页,显示本月报告(或空数据引导)
- 点「本年/全部」tab,内容随之变化
- 点「保存图片」下载 PNG;点「复制文字」提示已复制
- 点「返回」回到「我的」页
- 点底部导航各项,报告页正确隐藏

- [ ] **Step 5: 提交(可选)**

```bash
git add js/report.js js/app.js
git commit -m "feat: 报告页渲染、时段切换、保存图片与复制；接入视图切换"
```

---

### Task 7: 入口接线 + AI 设置弹窗(`statistics.js` + `profile.js`)

在「统计」页与「我的」页加报告入口,并在「我的」设置里加 AI 助手配置弹窗。

**Files:**
- Modify: `js/statistics.js`(顶部入口按钮)
- Modify: `js/profile.js`(入口卡片 + 设置项 + AI 设置弹窗)

**Interfaces:**
- Consumes: `ReportManager.open()`、`SettingsManager.getAIConfig/setAIConfig/AI_PROVIDERS`、`AIService.testConnection`。

- [ ] **Step 1: 「统计」页顶部加报告入口 — 修改 `js/statistics.js` 的 `renderStatisticsPage`**

把 `renderStatisticsPage` 改为先注入入口按钮:
```js
  renderStatisticsPage() {
    const stats = StorageManager.getOverallStats();

    this._renderReportEntry(); // 新增：报告入口
    this.updateOverviewCards(stats);
    this.renderCompletionChart();
    this.renderCategoryChart();
    this.renderWeeklyChart();
    this.renderRankingList();
  },

  /** 在统计页头部下方插入「生成 AI 人生报告」入口（只插一次） */
  _renderReportEntry() {
    const header = document.querySelector('#statistics-view .stats-page-header');
    if (!header || document.getElementById('stats-report-entry')) return;
    const btn = document.createElement('button');
    btn.id = 'stats-report-entry';
    btn.className = 'report-entry-card';
    btn.innerHTML = `
      <span class="entry-emoji">✨</span>
      <span class="entry-text">
        <span class="entry-title">生成 AI 人生报告</span>
        <span class="entry-sub">让 AI 为你总结这段时光</span>
      </span>`;
    btn.addEventListener('click', () => ReportManager.open());
    header.insertAdjacentElement('afterend', btn);
  },
```

- [ ] **Step 2: 「我的」页加报告入口卡片 — 修改 `js/profile.js` 的 `renderProfilePage`**

在 `renderProfilePage` 的 `this.renderSettingsList();` 之后追加一行:
```js
    this.renderReportEntry();
```
并在 `ProfileManager` 内新增方法:
```js
  /** 在设置区上方插入报告入口卡片（只插一次） */
  renderReportEntry() {
    const section = document.querySelector('#profile-view .profile-section');
    if (!section || document.getElementById('profile-report-entry')) return;
    const btn = document.createElement('button');
    btn.id = 'profile-report-entry';
    btn.className = 'report-entry-card';
    btn.innerHTML = `
      <span class="entry-emoji">✨</span>
      <span class="entry-text">
        <span class="entry-title">AI 人生报告</span>
        <span class="entry-sub">一键生成你的阶段总结</span>
      </span>`;
    btn.addEventListener('click', () => ReportManager.open());
    section.insertAdjacentElement('beforebegin', btn);
  },
```

- [ ] **Step 3: 设置项加「AI 助手设置」 — 修改 `js/profile.js`**

在 `renderSettingsList` 的 `settings` 数组中,`about` 之前插入一项:
```js
      { icon: '🤖', label: 'AI 助手设置', action: 'aiSettings' },
```
在 `handleSettingAction` 的 `switch` 中新增:
```js
      case 'aiSettings':
        this.showAISettings();
        break;
```

- [ ] **Step 4: 新增 AI 设置弹窗 — 在 `ProfileManager` 内新增 `showAISettings`**

```js
  /** AI 助手设置弹窗：选厂商 / 填 Key / 选模型 / 测试连接 */
  showAISettings() {
    const cfg = SettingsManager.getAIConfig();
    const providers = SettingsManager.AI_PROVIDERS;
    const options = Object.keys(providers)
      .map(k => `<option value="${k}" ${k === cfg.provider ? 'selected' : ''}>${providers[k].label}</option>`)
      .join('');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <h3>🤖 AI 助手设置</h3>
        <p class="modal-desc">填入大模型 API Key 后，报告将由真实 AI 生成；不填则使用本地规则引擎。Key 仅保存在本地浏览器。</p>
        <div class="ai-form">
          <label class="ai-form-label">厂商</label>
          <select id="ai-provider" class="ai-form-input">${options}</select>

          <label class="ai-form-label">API Key</label>
          <input id="ai-apikey" type="password" class="ai-form-input" placeholder="sk-..." value="${cfg.apiKey || ''}">

          <label class="ai-form-label">模型</label>
          <input id="ai-model" class="ai-form-input" placeholder="模型名" value="${cfg.model || ''}">

          <label class="ai-form-toggle">
            <input id="ai-enabled" type="checkbox" ${cfg.enabled ? 'checked' : ''}>
            <span>启用真实 AI 生成</span>
          </label>

          <div id="ai-test-result" class="ai-test-result"></div>
        </div>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" id="ai-test-btn">测试连接</button>
          <button class="modal-btn modal-btn-confirm" id="ai-save-btn">保存</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const providerSel = overlay.querySelector('#ai-provider');
    const modelInput = overlay.querySelector('#ai-model');
    // 切换厂商时，模型框填默认模型
    providerSel.addEventListener('change', () => {
      modelInput.value = providers[providerSel.value].model;
    });

    const collect = () => ({
      provider: providerSel.value,
      apiKey: overlay.querySelector('#ai-apikey').value.trim(),
      model: modelInput.value.trim() || providers[providerSel.value].model,
      enabled: overlay.querySelector('#ai-enabled').checked,
      baseURL: providers[providerSel.value].baseURL
    });

    overlay.querySelector('#ai-test-btn').addEventListener('click', async () => {
      const result = overlay.querySelector('#ai-test-result');
      const c = collect();
      if (!c.apiKey) { result.textContent = '请先填入 API Key'; result.className = 'ai-test-result fail'; return; }
      result.textContent = '测试中…'; result.className = 'ai-test-result';
      const res = await AIService.testConnection(c);
      result.textContent = res.message;
      result.className = 'ai-test-result ' + (res.ok ? 'ok' : 'fail');
    });

    overlay.querySelector('#ai-save-btn').addEventListener('click', () => {
      SettingsManager.setAIConfig(collect());
      overlay.remove();
      this.showToast('AI 设置已保存 ✅');
    });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  },
```

- [ ] **Step 5: 追加弹窗表单样式 — 在 `css/style.css` 末尾**

```css
/* AI 设置表单 */
.ai-form { display: flex; flex-direction: column; gap: 6px; text-align: left; margin: 8px 0; }
.ai-form-label { font-size: 13px; color: #86868b; margin-top: 6px; }
.ai-form-input { padding: 10px 12px; border: 1px solid #e5e5ea; border-radius: 10px; font-size: 14px; background: #fff; color: #1d1d1f; }
.dark .ai-form-input { background: #1c1c1e; border-color: #38383a; color: #fff; }
.ai-form-toggle { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 14px; color: #1d1d1f; }
.dark .ai-form-toggle { color: #fff; }
.ai-test-result { font-size: 13px; min-height: 18px; margin-top: 6px; }
.ai-test-result.ok { color: #34c759; }
.ai-test-result.fail { color: #ff3b30; }
```

- [ ] **Step 6: 手动验证**

打开 `index.html` →「我的」页:
- 设置区上方出现「✨ AI 人生报告」卡片,点击进入报告页
- 设置列表出现「🤖 AI 助手设置」,点击弹出表单;切换厂商模型框自动更新;填错 Key 点测试连接显示失败信息;保存后 toast 提示
- 「统计」页顶部出现报告入口按钮,点击进入报告页

- [ ] **Step 7: 提交(可选)**

```bash
git add js/statistics.js js/profile.js css/style.css
git commit -m "feat: 统计页/我的页报告入口 + AI 助手设置弹窗"
```

---

### Task 8: 边界与降级 + 演示用 mock 数据

完善空态/新用户体验,并提供一键填充示例数据便于录屏演示。

**Files:**
- Modify: `js/report.js`(新增开发用 mock 填充函数)

**Interfaces:**
- Produces: `ReportManager.fillDemoData()` — 控制台调用,写入示例数据并刷新。

- [ ] **Step 1: 在 `ReportManager` 内新增演示数据函数**

```js
  /**
   * 【开发/演示用】一键填充示例数据，便于录屏展示报告效果。
   * 控制台执行 ReportManager.fillDemoData() 后页面会刷新。
   */
  fillDemoData() {
    const today = new Date();
    const iso = (offsetDays) => {
      const d = new Date(today.getTime() - offsetDays * 86400000);
      return d.toISOString().split('T')[0];
    };
    const lists = [
      { id:'travel', emoji:'🌍', title:'环游世界', description:'探索星球的每个角落', color:'#007AFF', category:'旅行',
        tasks:[
          { id:'t1', text:'看一次极光', completed:true, completedDate: iso(2), note:'', priority:'medium' },
          { id:'t2', text:'去一次巴黎', completed:true, completedDate: iso(5), note:'', priority:'medium' },
          { id:'t3', text:'坐一次热气球', completed:true, completedDate: iso(2), note:'', priority:'medium' },
          { id:'t4', text:'潜水看珊瑚', completed:false, completedDate:'', note:'', priority:'medium' }
        ]},
      { id:'skills', emoji:'🎯', title:'技能解锁', description:'掌握想学的技能', color:'#FF9500', category:'成长',
        tasks:[
          { id:'s1', text:'学会弹吉他', completed:true, completedDate: iso(8), note:'', priority:'medium' },
          { id:'s2', text:'学会游泳', completed:true, completedDate: iso(12), note:'', priority:'medium' }
        ]},
      { id:'life', emoji:'❤️', title:'人生体验', description:'值得铭记的时刻', color:'#FF2D55', category:'体验',
        tasks:[
          { id:'l1', text:'看一次日出', completed:true, completedDate: iso(1), note:'', priority:'medium' }
        ]}
    ];
    StorageManager.setLists(lists);
    StorageManager.setStreakData({ currentStreak: 6, longestStreak: 14, lastCheckDate: today.toDateString(), todayChecked: true });
    if (!StorageManager.getBirthDate()) StorageManager.setBirthDate('1996-05-20');
    StorageManager.checkAchievements();
    window.location.reload();
  },
```

- [ ] **Step 2: 手动验证空态**

打开 `index.html`,控制台 `localStorage.clear(); location.reload();`,然后 `ReportManager.open()`。
Expected: 报告页显示「🌱 这个时段还没有完成记录…」引导,无报错。

- [ ] **Step 3: 手动验证演示数据**

控制台执行 `ReportManager.fillDemoData()`(页面刷新)→ 进入报告页。
Expected: 本月报告有完整文案、3 个指标、分类洞察条形;切换「全部」时完成数更多(含 8/12 天前的项)。

- [ ] **Step 4: 提交(可选)**

```bash
git add js/report.js
git commit -m "feat: 报告空态引导 + 演示用一键填充数据"
```

---

### Task 9: 文档收尾

更新对外文档,并完成整体手动回归。

**Files:**
- Modify: `README.md`、`CHANGELOG.md`

- [ ] **Step 1: 更新 `CHANGELOG.md`** — 在文件顶部 `# 更新日志` 之后插入:

```markdown
## v6.2.0 (2026-06-26) - AI 人生报告 🤖

### ✨ AI 人生报告（标准版）
- ✅ 按「本月 / 本年 / 全部」聚合完成记录，生成个性化阶段总结
- ✅ 混合 AI 策略：默认本地规则引擎（零配置），可选接入大模型 API
- ✅ 支持 Kimi / DeepSeek / 智谱 GLM（OpenAI 兼容），含连接测试
- ✅ 报告含数据概览、分类洞察、高光时刻、AI 寄语与下一步建议
- ✅ 一键保存为图片 / 复制文字（复用 html2canvas）
- ✅ 真实 API 超时/失败自动降级规则引擎
- ✅ 统计页、我的页双入口

### 🔧 技术改进
- ✅ 新增 aiService.js（文案生成层）、report.js（聚合 + 渲染）
- ✅ settings.js 扩展 AI 配置存储
- ✅ 新增 test/report-test.html 单元测试
```

- [ ] **Step 2: 更新 `README.md`** — 在「✨ 功能特性」的「### 其他」列表中追加一行,并在项目结构的 `js/` 列表补充两个新文件:

功能特性「其他」追加:
```markdown
- AI 人生报告（本地规则引擎 + 可选大模型）
```
项目结构 `js/` 补充:
```markdown
│   ├── aiService.js     # AI 文案生成层
│   ├── report.js        # AI 人生报告
```

- [ ] **Step 3: 整体手动回归测试清单**

打开 `index.html` 逐项确认(全部应通过):
- [ ] 首页/进度/大全/人生轴/我的 五个底部导航正常切换,行为未变
- [ ] 完成一个任务,人生轴/统计/连续打卡仍正常
- [ ] 我的页报告卡片入口 → 报告页;统计页入口 → 报告页
- [ ] 报告页三个时段切换数据正确
- [ ] 未配置 Key:报告由规则引擎生成,4 段通顺
- [ ] 配置无效 Key 且启用:能降级并 toast 提示
- [ ] 保存图片、复制文字可用
- [ ] 空数据/新用户:友好引导,无报错
- [ ] `test/report-test.html` 全绿
- [ ] 深色模式下报告页与弹窗显示正常

- [ ] **Step 4: 提交(可选)**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: 更新 README 与 CHANGELOG,记录 AI 人生报告 v6.2.0"
```

---

## 自查记录(Self-Review)

- **Spec 覆盖**:设计文档 7 节均有对应任务 — 架构(T1/T2/T4)、数据流(T1/T4/T6)、聚合层(T1)、AI 混合(T2/T4)、UI(T5/T6/T7)、错误降级(T4/T6/T8)、测试(T1-T4/T9)。✅
- **占位符扫描**:无 TBD/TODO,所有代码步骤含完整实现。✅
- **类型一致**:`reportData` 字段在 T1 定义,T2/T4/T6 使用一致;`generateNarrative` 返回 `{source,paragraphs|text,degraded}` 在 T4 定义、T6 消费一致;`getAIConfig` 字段在 T3 定义、T4/T7 使用一致。✅
- **接口连贯**:`ReportManager.open` → `renderReport` → `aggregateReportData`/`AIService.generateNarrative` → `_buildCardHTML` 链路闭合;`showReportPage` 在 T6 定义并被 T5 DOM、T7 入口复用。✅
