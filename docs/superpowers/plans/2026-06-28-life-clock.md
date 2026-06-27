# 余生闹钟（Life Clock）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把首页「人生倒计时」改造成独立「余生」tab 的「余生闹钟」页（表盘 + 实时年龄 + 余生美好事），首页改为入口卡片。

**Architecture:** 纯逻辑（`LifeClockEngine`）与渲染（`LifeClockUI`）分离，便于 Node 单测；页面照现有 `#xxx-view` + `showXxxPage()` 模式新增 `#lifeclock-view`；日期选择器与分享分别独立模块/复用现有能力。

**Tech Stack:** 原生 JavaScript、SVG（表盘）、CSS scroll-snap（滚轮）、html2canvas（现有 CDN 动态加载，保存图片）、Node + vm（测试）。

## Global Constraints

- 纯前端，**不引入任何新框架或本地依赖**；保存图片沿用现有 `ShareManager` 的 html2canvas CDN 动态加载。
- 所有 UI 文案与代码注释使用**中文**。
- 默认**预期寿命 100**、**退休年龄 60**，仅用于计算，页面不显示这两个数字。
- 年龄显示精确到**小数点后 8 位**。
- 单元测试用 `node test/life-clock-test.cjs`，照 `test/goal-breakdown-test.cjs` 的 vm sandbox 模式（读取源码拼接执行，不用 `module.exports`）。
- `lifeClock.js` 顶层只定义对象，**不在顶层访问 `document`/`window`/`requestAnimationFrame`**，否则 Node 测试会报错。
- 底部 tab 文案「余生」，页面标题「余生闹钟」。
- **不改动**连续打卡的底层逻辑与成就徽章，仅首页不再显示。

---

## 文件结构

**新增：**
- `js/lifeClock.js` — `LifeClockEngine`（纯计算：年龄、余生事件）+ `LifeClockUI`（渲染：表盘、年龄 tick、网格、页面控制）。
- `js/datePicker.js` — `DatePickerManager`（三列滚轮日期选择器，弹出/确定/取消）。
- `test/life-clock-test.cjs` — 单元测试。

**修改：**
- `js/data.js` — `DEFAULT_LIFE_EXPECTANCY` 80→100；新增 `DEFAULT_RETIRE_AGE`、`LIFE_EVENTS`。
- `js/storage.js` — `KEYS` 加 `LIFE_EXPECTANCY`/`RETIRE_AGE` + 存取方法。
- `index.html` — 底部导航加「余生」tab；新增 `#lifeclock-view`；首页移除人生进度模块/快速统计/连续打卡，加入口卡片。
- `js/app.js` — 新增 `showLifeClockPage()`；导航 `case 'lifeclock'`；首页入口卡片渲染+跳转；移除旧倒计时逻辑。
- `js/settings.js` — `KEYS` 加预期寿命/退休，或复用 storage（本计划放 storage.js，settings 仅提供 UI 调用）。
- `js/profile.js` — 「我的-设置」新增预期寿命/退休年龄入口。
- `js/share.js` — 新增余生闹钟分享/保存。
- `css/style.css` — 余生闹钟页、滚轮、首页入口卡片样式；废弃旧 `.circular-progress-large` 等。

---

## Task 1: 数据层（默认值 + 余生事件配置 + 寿命/退休存取）

**Files:**
- Modify: `js/data.js`（`DEFAULT_LIFE_EXPECTANCY` 约 262 行；文件尾部追加 `DEFAULT_RETIRE_AGE`、`LIFE_EVENTS`）
- Modify: `js/storage.js`（`KEYS` 约 6-17 行；`getBirthDate` 附近追加存取方法）
- Test: `test/life-clock-test.cjs`（新建）

**Interfaces:**
- Produces:
  - 全局常量 `DEFAULT_LIFE_EXPECTANCY = 100`、`DEFAULT_RETIRE_AGE = 60`、`LIFE_EVENTS`（数组）。
  - `StorageManager.getLifeExpectancy(): number`、`setLifeExpectancy(years)`、`getRetireAge(): number`、`setRetireAge(age)`。

- [ ] **Step 1: 新建测试文件并写数据层失败测试**

创建 `test/life-clock-test.cjs`：

```js
/**
 * LifeClock 模块单元测试
 * 用法：node test/life-clock-test.cjs
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
  console, Date, Math, JSON, Object, Array, parseInt, parseFloat, isNaN, Number,
  __done: (p, f) => { console.log(`\n结果: ${p} 通过 / ${f} 失败`); if (f > 0) process.exitCode = 1; }
};

const root = path.join(__dirname, '..');
const files = ['js/data.js', 'js/storage.js', 'js/lifeClock.js']
  .filter(f => fs.existsSync(path.join(root, f)));
let code = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');

code += `
;(function(){
  let passed=0, failed=0;
  const assert=(n,c)=>{ c?passed++:failed++; console.log((c?'✅':'❌')+' '+n); };
  localStorage.clear();

  // ---- 默认值 ----
  assert('默认寿命为 100', DEFAULT_LIFE_EXPECTANCY === 100);
  assert('默认退休年龄为 60', DEFAULT_RETIRE_AGE === 60);

  // ---- 寿命/退休存取 ----
  assert('未设置时寿命回退默认 100', StorageManager.getLifeExpectancy() === 100);
  assert('未设置时退休回退默认 60', StorageManager.getRetireAge() === 60);
  StorageManager.setLifeExpectancy(90);
  StorageManager.setRetireAge(55);
  assert('设置后寿命为 90', StorageManager.getLifeExpectancy() === 90);
  assert('设置后退休为 55', StorageManager.getRetireAge() === 55);
  StorageManager.setLifeExpectancy(0);
  assert('非法寿命(0)回退默认 100', StorageManager.getLifeExpectancy() === 100);

  // ---- LIFE_EVENTS 配置 ----
  assert('LIFE_EVENTS 至少 4 项', Array.isArray(LIFE_EVENTS) && LIFE_EVENTS.length >= 4);
  assert('每项有 emoji 和 calc', LIFE_EVENTS.every(e => typeof e.emoji === 'string' && typeof e.calc === 'function'));

  __done(passed, failed);
})();
`;

vm.createContext(sandbox);
vm.runInContext(code, sandbox);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node test/life-clock-test.cjs`
Expected: FAIL —— 报 `DEFAULT_RETIRE_AGE is not defined` 或 `getLifeExpectancy is not a function`。

- [ ] **Step 3: 修改 `js/data.js`**

把约 262 行的 `const DEFAULT_LIFE_EXPECTANCY = 80;` 改为：

```js
// 默认寿命假设（岁）—— 用 100 让余生数字更乐观
const DEFAULT_LIFE_EXPECTANCY = 100;

// 默认退休年龄（岁）
const DEFAULT_RETIRE_AGE = 60;

// 余生事件配置：calc 返回展示文案（string 或 {emoji,text}）；可增删
const LIFE_EVENTS = [
  { key: 'worldcup', emoji: '🏆', calc: (ry) => `观看 ${Math.floor(ry / 4)} 届世界杯` },
  { key: 'summer',   emoji: '🍦', calc: (ry) => `享受 ${Math.floor(ry)} 个夏天` },
  { key: 'retire',   emoji: '🧍', calc: (ry, ctx) =>
      ctx.ageYears >= ctx.retireAge
        ? { emoji: '🌴', text: `已自由 ${Math.floor(ctx.ageYears - ctx.retireAge)} 年` }
        : `还有 ${ctx.retireAge - Math.floor(ctx.ageYears)} 年退休` },
  { key: 'weekend',  emoji: '🛌', calc: (ry) => `度过 ${Math.floor(ry * 52)} 个周末` }
];
```

- [ ] **Step 4: 修改 `js/storage.js`**

在 `KEYS` 对象（约 16 行 `RECOMMENDATIONS_CACHE` 后）追加两个 key（注意上一行补逗号）：

```js
    RECOMMENDATIONS_CACHE: 'life_checklist_recommendations_cache',
    LIFE_EXPECTANCY: 'life_checklist_life_expectancy',
    RETIRE_AGE: 'life_checklist_retire_age'
```

在 `setBirthDate`（约 25 行）之后追加：

```js
  getLifeExpectancy() {
    const v = parseInt(localStorage.getItem(this.KEYS.LIFE_EXPECTANCY), 10);
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_LIFE_EXPECTANCY;
  },

  setLifeExpectancy(years) {
    localStorage.setItem(this.KEYS.LIFE_EXPECTANCY, String(years));
  },

  getRetireAge() {
    const v = parseInt(localStorage.getItem(this.KEYS.RETIRE_AGE), 10);
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_RETIRE_AGE;
  },

  setRetireAge(age) {
    localStorage.setItem(this.KEYS.RETIRE_AGE, String(age));
  },
```

- [ ] **Step 5: 运行测试确认通过**

Run: `node test/life-clock-test.cjs`
Expected: PASS —— 全部 ✅（注意此时 `js/lifeClock.js` 还不存在，files 过滤会跳过它，测试只覆盖数据层）。

- [ ] **Step 6: 提交**

```bash
git add js/data.js js/storage.js test/life-clock-test.cjs
git commit -m "feat: 余生闹钟数据层（默认值/事件配置/寿命退休存取）"
```

---

## Task 2: 余生计算引擎 `LifeClockEngine`

**Files:**
- Create: `js/lifeClock.js`
- Test: `test/life-clock-test.cjs`（追加断言）

**Interfaces:**
- Consumes: `LIFE_EVENTS`、`DEFAULT_LIFE_EXPECTANCY`、`DEFAULT_RETIRE_AGE`（来自 Task 1）。
- Produces:
  - `LifeClockEngine.calcAge(birthDateStr, nowMs): number` —— 返回精确年龄（年，浮点）。
  - `LifeClockEngine.calcEvents(ctx): Array<{emoji, text}>`，`ctx = { birthDate, now(ms), lifeExpectancy, retireAge, events? }`。

- [ ] **Step 1: 在测试文件追加引擎失败测试**

在 `test/life-clock-test.cjs` 的 `__done(passed, failed);` 之前插入：

```js
  // ---- LifeClockEngine.calcAge ----
  const now2026 = new Date('2026-01-01T00:00:00Z').getTime();
  const age = LifeClockEngine.calcAge('2000-01-01T00:00:00Z', now2026);
  assert('2000 年生人在 2026 年约 26 岁', Math.abs(age - 26) < 0.05);

  // ---- LifeClockEngine.calcEvents（寿命100/退休60，age≈26）----
  const events = LifeClockEngine.calcEvents({
    birthDate: '2000-01-01T00:00:00Z', now: now2026, lifeExpectancy: 100, retireAge: 60
  });
  assert('返回 4 件事', events.length === 4);
  assert('世界杯：余年74÷4=18', events[0].text === '观看 18 届世界杯');
  assert('夏天：余年74', events[1].text === '享受 74 个夏天');
  assert('退休：60-26=34 年', events[2].text === '还有 34 年退休');
  assert('周末：余年74×52=3848', events[3].text === '度过 3848 个周末');

  // ---- 边界：退休已过 ----
  const retired = LifeClockEngine.calcEvents({
    birthDate: '1960-01-01T00:00:00Z', now: now2026, lifeExpectancy: 100, retireAge: 60
  });
  assert('退休已过显示已自由', retired[2].emoji === '🌴' && /^已自由 \d+ 年$/.test(retired[2].text));

  // ---- 边界：余年<=0 兜底 ----
  const overrun = LifeClockEngine.calcEvents({
    birthDate: '1900-01-01T00:00:00Z', now: now2026, lifeExpectancy: 100, retireAge: 60
  });
  assert('余年<=0 显示赚到兜底', overrun.length === 1 && overrun[0].text === '每一天都是赚到');
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node test/life-clock-test.cjs`
Expected: FAIL —— `LifeClockEngine is not defined`。

- [ ] **Step 3: 创建 `js/lifeClock.js`（先写引擎部分）**

```js
/**
 * 余生闹钟 —— 计算引擎（纯逻辑，顶层不碰 DOM）
 */
const LifeClockEngine = {
  // 一年的毫秒数（按 365.25 天）
  MS_PER_YEAR: 365.25 * 24 * 60 * 60 * 1000,

  // 精确年龄（浮点年）。nowMs 为时间戳（毫秒）
  calcAge(birthDateStr, nowMs) {
    const birth = new Date(birthDateStr).getTime();
    return (nowMs - birth) / this.MS_PER_YEAR;
  },

  // 余生事件列表，每项 {emoji, text}
  calcEvents(ctx) {
    const ageYears = this.calcAge(ctx.birthDate, ctx.now);
    const remainingYears = Math.max(0, ctx.lifeExpectancy - ageYears);
    if (remainingYears <= 0) {
      return [{ emoji: '🎁', text: '每一天都是赚到' }];
    }
    const fullCtx = { ...ctx, ageYears, remainingYears };
    const events = ctx.events || LIFE_EVENTS;
    return events.map(ev => {
      const r = ev.calc(remainingYears, fullCtx);
      return typeof r === 'string' ? { emoji: ev.emoji, text: r } : r;
    });
  }
};
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node test/life-clock-test.cjs`
Expected: PASS —— 全部 ✅。

- [ ] **Step 5: 提交**

```bash
git add js/lifeClock.js test/life-clock-test.cjs
git commit -m "feat: 余生闹钟计算引擎（年龄/余生事件/边界）"
```

---

## Task 3: 余生闹钟页面骨架（HTML view + 导航 tab + 基础样式）

**Files:**
- Modify: `index.html`（底部导航约 607-627 行；首页 section 之后新增 view）
- Modify: `css/style.css`（追加余生闹钟页样式）

**Interfaces:**
- Produces: DOM 节点 `#lifeclock-view`，内含 `#life-clock-svg`、`#life-age-value`、`#life-events-grid`、`#life-birth-trigger`、`#life-share-btn`、`#life-save-btn`、`#life-retire-setting`；导航项 `data-view="lifeclock"`。

- [ ] **Step 1: 底部导航新增「余生」tab**

在 `index.html` 底部导航 `<nav class="bottom-nav">` 中，首页项之后、进度项之前插入：

```html
    <div class="nav-item" data-view="lifeclock">
      <span class="nav-icon">⏰</span>
      <span class="nav-label">余生</span>
    </div>
```

- [ ] **Step 2: 新增余生闹钟 view**

在 `index.html` 首页视图 `<div id="home-view">...</div>` 结束后，新增（与其它 view 同级）：

```html
    <!-- ==================== 余生闹钟视图 ==================== -->
    <div id="lifeclock-view" class="hidden">
      <header class="lifeclock-header">
        <button id="lifeclock-back-btn" class="back-btn">◀ 返回</button>
        <h1 class="lifeclock-title">余生闹钟</h1>
        <span class="lifeclock-header-spacer"></span>
      </header>

      <div class="lifeclock-card" id="lifeclock-card">
        <p class="life-birth-hint hidden" id="life-birth-hint">👆 点这里设为你的生日</p>

        <div class="life-clock-wrap" id="life-birth-trigger">
          <svg id="life-clock-svg" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="92" class="life-clock-face"/>
            <line id="life-hand-hour"   x1="100" y1="100" x2="100" y2="55"  class="life-hand-hour"/>
            <line id="life-hand-minute" x1="100" y1="100" x2="100" y2="38"  class="life-hand-minute"/>
            <line id="life-hand-second" x1="100" y1="100" x2="100" y2="30"  class="life-hand-second"/>
            <circle cx="100" cy="100" r="5" class="life-clock-center"/>
          </svg>
        </div>

        <p class="life-age-line">
          你 <span id="life-age-value">0.00000000</span> 岁了
        </p>

        <p class="life-events-caption">余生还可以</p>
        <div class="life-events-grid" id="life-events-grid"></div>
      </div>

      <div class="lifeclock-actions">
        <button id="life-share-btn" class="life-action-btn">⬆ 分享</button>
        <button id="life-save-btn" class="life-action-btn">保存</button>
      </div>
      <button id="life-retire-setting" class="life-retire-link">设置退休年龄</button>
    </div>
```

- [ ] **Step 3: 追加基础样式到 `css/style.css`**

```css
/* ===== 余生闹钟页 ===== */
#lifeclock-view { padding: 0 16px 96px; }
.lifeclock-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 0;
}
.lifeclock-title { font-size: 18px; font-weight: 600; color: #1d1d1f; }
.lifeclock-header-spacer { width: 48px; }
.lifeclock-card {
  background: #f5f5f0; border-radius: 24px; padding: 28px 20px;
  display: flex; flex-direction: column; align-items: center;
}
.life-birth-hint { font-size: 13px; color: #9b9b9b; margin-bottom: 10px; }
.life-clock-wrap { width: 200px; height: 200px; cursor: pointer; }
.life-clock-face { fill: none; stroke: #1d1d1f; stroke-width: 3; }
.life-hand-hour   { stroke: #1d1d1f; stroke-width: 4; stroke-linecap: round; }
.life-hand-minute { stroke: #1d1d1f; stroke-width: 3; stroke-linecap: round; }
.life-hand-second { stroke: #ff3b30; stroke-width: 1.5; stroke-linecap: round; }
.life-clock-center { fill: #ff3b30; }
.life-age-line { margin-top: 22px; font-size: 16px; color: #9b9b9b; }
#life-age-value { font-size: 30px; font-weight: 700; color: #1d1d1f; letter-spacing: 0.5px; }
.life-events-caption { margin: 24px 0 14px; font-size: 13px; color: #9b9b9b; }
.life-events-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px; width: 100%;
}
.life-event-item { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #1d1d1f; }
.life-event-item .life-event-emoji { font-size: 18px; }
.lifeclock-actions { display: flex; gap: 14px; margin-top: 22px; }
.life-action-btn {
  flex: 1; padding: 12px 0; border: none; border-radius: 14px;
  background: #ececec; color: #1d1d1f; font-size: 15px;
}
.life-retire-link {
  display: block; margin: 18px auto 0; background: none; border: none;
  color: #b0b0b0; font-size: 13px;
}
.dark .lifeclock-card { background: #1a1a1a; }
.dark .lifeclock-title, .dark #life-age-value, .dark .life-event-item { color: #fff; }
.dark .life-clock-face, .dark .life-hand-hour, .dark .life-hand-minute { stroke: #fff; }
.dark .life-action-btn { background: #2a2a2a; color: #fff; }
```

- [ ] **Step 4: 浏览器验证**

打开 `index.html`，临时把 `#lifeclock-view` 的 `hidden` 类去掉查看：表盘圆环 + 三指针 + 红心、「你 0.00000000 岁了」、空网格、分享/保存按钮、设置退休链接均按布局显示。验证后恢复 `hidden`。

- [ ] **Step 5: 提交**

```bash
git add index.html css/style.css
git commit -m "feat: 余生闹钟页面骨架与基础样式"
```

---

## Task 4: 渲染与页面切换（`LifeClockUI` + `showLifeClockPage`）

**Files:**
- Modify: `js/lifeClock.js`（追加 `LifeClockUI`）
- Modify: `js/app.js`（新增 `showLifeClockPage`、导航 case、返回按钮绑定）
- Modify: `index.html`（确认 `js/lifeClock.js`、`js/datePicker.js` 已通过 `<script>` 引入）

**Interfaces:**
- Consumes: `LifeClockEngine`、`StorageManager.getBirthDate/getLifeExpectancy/getRetireAge`。
- Produces:
  - `LifeClockUI.getEffectiveBirthDate(): string`（真实生日或会话随机演示生日）。
  - `LifeClockUI.show()`：渲染并启动 tick；`LifeClockUI.stopTick()`：停止。
  - `LifeClockUI.renderEvents()`、`renderClockHands(date)`、`renderAge()`。
  - 全局函数 `showLifeClockPage()`。

- [ ] **Step 1: 确认脚本引入**

在 `index.html` 引入 `js/app.js` 的 `<script>` 之前，确认/添加：

```html
  <script src="js/lifeClock.js"></script>
  <script src="js/datePicker.js"></script>
```

（`datePicker.js` 在 Task 5 创建；此处先加引用，Task 5 前它是空文件——先 `git` 不追踪空文件也可，建议 Task 5 再加该行。本任务只需 `lifeClock.js` 行。）

- [ ] **Step 2: 在 `js/lifeClock.js` 追加 `LifeClockUI`**

```js
/**
 * 余生闹钟 —— 渲染与页面控制（依赖 DOM，方法内访问）
 */
const LifeClockUI = {
  _timer: null,
  DEMO_KEY: 'life_checklist_demo_birth',

  // 真实生日，否则取/生成会话级随机演示生日
  getEffectiveBirthDate() {
    const real = StorageManager.getBirthDate();
    if (real) return real;
    let demo = sessionStorage.getItem(this.DEMO_KEY);
    if (!demo) {
      const year = 1980 + Math.floor(Math.random() * 26);   // 1980~2005
      const month = 1 + Math.floor(Math.random() * 12);
      const day = 1 + Math.floor(Math.random() * 28);
      demo = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      sessionStorage.setItem(this.DEMO_KEY, demo);
    }
    return demo;
  },

  isDemo() { return !StorageManager.getBirthDate(); },

  show() {
    document.getElementById('life-birth-hint').classList.toggle('hidden', !this.isDemo());
    this.renderEvents();
    this.renderAge();
    this.startTick();
  },

  renderAge() {
    const birth = this.getEffectiveBirthDate();
    const age = LifeClockEngine.calcAge(birth, Date.now());
    const el = document.getElementById('life-age-value');
    if (el) el.textContent = age.toFixed(8);
  },

  renderClockHands(now) {
    const s = now.getSeconds() + now.getMilliseconds() / 1000;
    const m = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + m / 60;
    const set = (id, deg) => {
      const el = document.getElementById(id);
      if (el) el.setAttribute('transform', `rotate(${deg} 100 100)`);
    };
    set('life-hand-hour', h * 30);
    set('life-hand-minute', m * 6);
    set('life-hand-second', s * 6);
  },

  renderEvents() {
    const birth = this.getEffectiveBirthDate();
    const events = LifeClockEngine.calcEvents({
      birthDate: birth,
      now: Date.now(),
      lifeExpectancy: StorageManager.getLifeExpectancy(),
      retireAge: StorageManager.getRetireAge()
    });
    const grid = document.getElementById('life-events-grid');
    if (!grid) return;
    grid.innerHTML = events.map(e =>
      `<div class="life-event-item"><span class="life-event-emoji">${e.emoji}</span><span>${e.text}</span></div>`
    ).join('');
  },

  startTick() {
    this.stopTick();
    const tick = () => {
      this.renderClockHands(new Date());
      this.renderAge();
      this._timer = requestAnimationFrame(tick);
    };
    this._timer = requestAnimationFrame(tick);
  },

  stopTick() {
    if (this._timer) { cancelAnimationFrame(this._timer); this._timer = null; }
  }
};

// 页面切走时暂停，回来恢复（仅在余生页激活时 tick）
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) LifeClockUI.stopTick();
    else if (AppState && AppState.currentView === 'lifeclock') LifeClockUI.startTick();
  });
}
```

- [ ] **Step 3: 在 `js/app.js` 新增页面切换**

照 `showStatisticsPage()` 模式新增（把所有 view 加 hidden、目标去 hidden）：

```js
/**
 * 显示余生闹钟页面
 */
function showLifeClockPage() {
  AppState.currentView = 'lifeclock';

  document.getElementById('home-view').classList.add('hidden');
  document.getElementById('report-view').classList.add('hidden');
  document.getElementById('lists-view').classList.add('hidden');
  document.getElementById('templates-view').classList.add('hidden');
  document.getElementById('timeline-view').classList.add('hidden');
  document.getElementById('detail-view').classList.add('hidden');
  document.getElementById('achievements-view').classList.add('hidden');
  document.getElementById('statistics-view').classList.add('hidden');
  document.getElementById('profile-view').classList.add('hidden');
  document.getElementById('lifeclock-view').classList.remove('hidden');

  LifeClockUI.show();
  updateNavigation('lifeclock');
}
```

在其它 `showXxxPage` 中（home/lists/templates/timeline/statistics/profile/report/detail/achievements）各补一行隐藏余生页，避免残留：

```js
  document.getElementById('lifeclock-view').classList.add('hidden');
```

并在离开余生页时停止 tick：在 `showHomePage` 等函数开头（或上面这行后）加 `LifeClockUI.stopTick();`（`LifeClockUI` 已全局）。

- [ ] **Step 4: 绑定导航与返回按钮**

在 `bindEvents()` 的 `nav-item` switch（约 54-61 行）新增分支：

```js
        case 'lifeclock': showLifeClockPage(); break;
```

在 `bindEvents()` 内新增返回按钮绑定：

```js
  document.getElementById('lifeclock-back-btn').addEventListener('click', showHomePage);
```

- [ ] **Step 5: 浏览器验证**

打开 app → 底部点「⏰余生」→ 进入余生闹钟页：表盘指针走动（红秒针转动）、年龄末位飞速跳动、网格显示 4 件余生事、顶部出现演示生日提示。点「返回」回首页，确认年龄 tick 停止（无报错）。

- [ ] **Step 6: 提交**

```bash
git add js/lifeClock.js js/app.js index.html
git commit -m "feat: 余生闹钟渲染、表盘走动、年龄跳动与页面切换"
```

---

## Task 5: 滑动日期选择器（`DatePickerManager`）

**Files:**
- Create: `js/datePicker.js`
- Modify: `index.html`（引入 `js/datePicker.js`；选择器 DOM 容器）
- Modify: `css/style.css`（滚轮样式）
- Modify: `js/lifeClock.js`（生日触发器接入选择器）

**Interfaces:**
- Produces: `DatePickerManager.open(currentDateStr, onConfirm)` —— 弹出三列滚轮，确定时回调 `onConfirm('YYYY-MM-DD')`。
- Consumes: `LifeClockUI`（确定后 `StorageManager.setBirthDate` + 重渲染）。

- [ ] **Step 1: 在 `index.html` 引入脚本并加容器**

确认 `<script src="js/datePicker.js"></script>` 已在 `app.js` 之前。在 `</body>` 前加遮罩容器：

```html
  <div id="date-picker-mask" class="date-picker-mask hidden">
    <div class="date-picker-card">
      <div class="date-picker-bar">
        <button id="date-picker-cancel" class="dp-btn">取消</button>
        <button id="date-picker-confirm" class="dp-btn dp-confirm">确定</button>
      </div>
      <div class="date-picker-cols">
        <ul class="dp-col" id="dp-year"></ul>
        <ul class="dp-col" id="dp-month"></ul>
        <ul class="dp-col" id="dp-day"></ul>
      </div>
      <div class="date-picker-units"><span>年</span><span>月</span><span>日</span></div>
    </div>
  </div>
```

- [ ] **Step 2: 创建 `js/datePicker.js`**

```js
/**
 * 手机端三列滚轮日期选择器（纯原生 scroll-snap）
 */
const DatePickerManager = {
  _onConfirm: null,
  ITEM_H: 36,

  open(currentDateStr, onConfirm) {
    this._onConfirm = onConfirm;
    const d = currentDateStr ? new Date(currentDateStr) : new Date(2000, 0, 1);
    const now = new Date();
    const maxYear = now.getFullYear();

    this._fill('dp-year', this._range(1920, maxYear), d.getFullYear());
    this._fill('dp-month', this._range(1, 12), d.getMonth() + 1);
    this._fillDays(d.getFullYear(), d.getMonth() + 1, d.getDate());

    document.getElementById('dp-year').onscroll = () => this._onYearMonthChange();
    document.getElementById('dp-month').onscroll = () => this._onYearMonthChange();

    document.getElementById('date-picker-mask').classList.remove('hidden');
    document.getElementById('date-picker-cancel').onclick = () => this.close();
    document.getElementById('date-picker-confirm').onclick = () => this._confirm();
  },

  close() { document.getElementById('date-picker-mask').classList.add('hidden'); },

  _range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; },

  _fill(colId, values, selected) {
    const ul = document.getElementById(colId);
    ul.innerHTML = values.map(v => `<li data-v="${v}">${v}</li>`).join('');
    const idx = Math.max(0, values.indexOf(selected));
    ul.scrollTop = idx * this.ITEM_H;
  },

  _fillDays(year, month, selectedDay) {
    const days = new Date(year, month, 0).getDate();   // 当月天数
    const sel = Math.min(selectedDay || 1, days);
    this._fill('dp-day', this._range(1, days), sel);
  },

  _centerValue(colId) {
    const ul = document.getElementById(colId);
    const idx = Math.round(ul.scrollTop / this.ITEM_H);
    const li = ul.children[Math.min(idx, ul.children.length - 1)];
    return li ? parseInt(li.dataset.v, 10) : null;
  },

  _onYearMonthChange() {
    clearTimeout(this._t);
    this._t = setTimeout(() => {
      const y = this._centerValue('dp-year');
      const m = this._centerValue('dp-month');
      const curDay = this._centerValue('dp-day') || 1;
      this._fillDays(y, m, curDay);
    }, 80);
  },

  _confirm() {
    const y = this._centerValue('dp-year');
    const m = this._centerValue('dp-month');
    let day = this._centerValue('dp-day');
    const maxDay = new Date(y, m, 0).getDate();
    day = Math.min(day, maxDay);
    // 不超过今天
    let picked = new Date(y, m - 1, day);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (picked > today) picked = today;
    const str = `${picked.getFullYear()}-${String(picked.getMonth() + 1).padStart(2, '0')}-${String(picked.getDate()).padStart(2, '0')}`;
    this.close();
    if (this._onConfirm) this._onConfirm(str);
  }
};
```

- [ ] **Step 3: 滚轮样式追加到 `css/style.css`**

```css
/* ===== 日期滚轮选择器 ===== */
.date-picker-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,.35);
  display: flex; align-items: flex-end; z-index: 1000;
}
.date-picker-card { width: 100%; background: #fff; border-radius: 20px 20px 0 0; padding-bottom: 12px; }
.date-picker-bar { display: flex; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #eee; }
.dp-btn { background: none; border: none; font-size: 16px; color: #8e8e93; }
.dp-confirm { color: #007aff; font-weight: 600; }
.date-picker-cols { display: flex; height: 180px; position: relative; }
.dp-col {
  flex: 1; overflow-y: scroll; scroll-snap-type: y mandatory;
  text-align: center; margin: 0; padding: 72px 0; list-style: none;
  scrollbar-width: none;
}
.dp-col::-webkit-scrollbar { display: none; }
.dp-col li { height: 36px; line-height: 36px; scroll-snap-align: center; font-size: 18px; color: #1d1d1f; }
.date-picker-units { display: flex; }
.date-picker-units span { flex: 1; text-align: center; font-size: 13px; color: #9b9b9b; }
.dark .date-picker-card { background: #1c1c1e; }
.dark .dp-col li { color: #fff; }
```

- [ ] **Step 4: 生日触发器接入（修改 `js/lifeClock.js` 的 `LifeClockUI`）**

在 `LifeClockUI.show()` 末尾绑定触发器（确保只绑一次，用 onclick 覆盖）：

```js
    const trigger = document.getElementById('life-birth-trigger');
    if (trigger) {
      trigger.onclick = () => {
        DatePickerManager.open(this.getEffectiveBirthDate(), (dateStr) => {
          StorageManager.setBirthDate(dateStr);
          this.show();   // 重渲染（演示提示消失、年龄/余生更新）
        });
      };
    }
```

- [ ] **Step 5: 浏览器验证**

进入余生页 → 点表盘/年龄区 → 底部弹出三列滚轮 → 滑动选年/月/日（改年月时日数随大小月变化）→ 点「确定」→ 年龄与余生按所选生日更新、演示提示消失；点「取消」不改动。

- [ ] **Step 6: 提交**

```bash
git add js/datePicker.js index.html css/style.css js/lifeClock.js
git commit -m "feat: 手机端滑动日期选择器并接入生日设置"
```

---

## Task 6: 退休年龄与预期寿命设置

**Files:**
- Modify: `js/lifeClock.js`（退休设置触发）
- Modify: `index.html`（「我的-设置」新增寿命/退休项）
- Modify: `js/profile.js`（绑定设置交互）

**Interfaces:**
- Consumes: `StorageManager.setRetireAge/getRetireAge/setLifeExpectancy/getLifeExpectancy`、`DatePickerManager` 风格的简单数值选择（此处用 `prompt` 或 stepper）。
- Produces: 设置后调用 `LifeClockUI.renderEvents()` 重算。

- [ ] **Step 1: 余生页「设置退休年龄」接入（修改 `LifeClockUI.show()` 末尾）**

```js
    const retireBtn = document.getElementById('life-retire-setting');
    if (retireBtn) {
      retireBtn.onclick = () => {
        const cur = StorageManager.getRetireAge();
        const input = prompt('设置退休年龄（40~80）', String(cur));
        if (input === null) return;
        const v = parseInt(input, 10);
        if (Number.isFinite(v) && v >= 40 && v <= 80) {
          StorageManager.setRetireAge(v);
          this.renderEvents();
        }
      };
    }
```

> 说明：MVP 用原生 `prompt` 快速可用；视觉打磨阶段可替换为滚轮/stepper。预期寿命同理放「我的-设置」。

- [ ] **Step 2: 「我的-设置」新增预期寿命项（修改 `index.html`）**

在 `#profile-view` 的设置列表中（参照现有「AI 助手设置」项的结构）新增一行：

```html
      <div class="setting-item" id="setting-life-expectancy">
        <span class="setting-label">预期寿命</span>
        <span class="setting-value" id="life-expectancy-value">100 岁</span>
      </div>
```

- [ ] **Step 3: 绑定预期寿命设置（修改 `js/profile.js`）**

在个人中心渲染/绑定处加入（找到渲染设置项的函数，追加）：

```js
  const lifeExpItem = document.getElementById('setting-life-expectancy');
  if (lifeExpItem) {
    const valEl = document.getElementById('life-expectancy-value');
    if (valEl) valEl.textContent = StorageManager.getLifeExpectancy() + ' 岁';
    lifeExpItem.onclick = () => {
      const cur = StorageManager.getLifeExpectancy();
      const input = prompt('设置预期寿命（60~120）', String(cur));
      if (input === null) return;
      const v = parseInt(input, 10);
      if (Number.isFinite(v) && v >= 60 && v <= 120) {
        StorageManager.setLifeExpectancy(v);
        if (valEl) valEl.textContent = v + ' 岁';
      }
    };
  }
```

- [ ] **Step 4: 浏览器验证**

余生页点「设置退休年龄」→ 输入 55 → 退休那条余生更新；「我的-设置」点「预期寿命」→ 输入 90 → 再进余生页，各余生数字相应变小。非法输入（如 30/200）被忽略。

- [ ] **Step 5: 提交**

```bash
git add js/lifeClock.js index.html js/profile.js
git commit -m "feat: 退休年龄与预期寿命设置入口"
```

---

## Task 7: 分享与保存图片

**Files:**
- Modify: `js/share.js`（新增余生闹钟分享/保存）
- Modify: `js/lifeClock.js`（绑定分享/保存按钮）

**Interfaces:**
- Consumes: 现有 `ShareManager.downloadShareImage()` 的 html2canvas 加载模式。
- Produces: `ShareManager.shareLifeClock()`、`ShareManager.saveLifeClockImage()`（截图 `#lifeclock-card`）。

- [ ] **Step 1: 在 `js/share.js` 新增方法**

参照现有 `downloadShareImage()`（约 116-140 行）的 html2canvas 动态加载写法，新增：

```js
  // 截图余生闹钟卡片为 PNG 并下载
  saveLifeClockImage() {
    const element = document.getElementById('lifeclock-card');
    if (!element) return;
    const run = () => {
      html2canvas(element, { backgroundColor: '#f5f5f0', scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = '余生闹钟_' + new Date().toISOString().slice(0, 10) + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    };
    if (!window.html2canvas) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      script.onload = run;
      script.onerror = () => (typeof showToast === 'function' ? showToast('图片生成失败，请重试') : null);
      document.head.appendChild(script);
    } else {
      run();
    }
  },

  // 分享：优先系统分享，降级为保存图片
  shareLifeClock() {
    const age = document.getElementById('life-age-value');
    const text = age ? `你 ${age.textContent} 岁了，余生还可以体验很多美好 ✨` : '余生闹钟';
    if (navigator.share) {
      navigator.share({ title: '余生闹钟', text }).catch(() => {});
    } else {
      this.saveLifeClockImage();
    }
  },
```

- [ ] **Step 2: 绑定按钮（修改 `LifeClockUI.show()` 末尾）**

```js
    const shareBtn = document.getElementById('life-share-btn');
    const saveBtn = document.getElementById('life-save-btn');
    if (shareBtn) shareBtn.onclick = () => ShareManager.shareLifeClock();
    if (saveBtn) saveBtn.onclick = () => ShareManager.saveLifeClockImage();
```

- [ ] **Step 3: 浏览器验证**

余生页点「保存」→ 浏览器下载一张余生闹钟 PNG（含表盘、年龄、余生网格）；点「分享」→ 支持系统分享的环境弹出分享面板，否则触发保存。

- [ ] **Step 4: 提交**

```bash
git add js/share.js js/lifeClock.js
git commit -m "feat: 余生闹钟分享与保存图片"
```

---

## Task 8: 首页改造（移除旧模块 + 入口卡片 + 清理）

**Files:**
- Modify: `index.html`（首页 section 替换）
- Modify: `js/app.js`（入口卡片渲染 + 清理旧倒计时逻辑 + 移除首页连续打卡）

**Interfaces:**
- Consumes: `LifeClockUI.getEffectiveBirthDate`、`LifeClockEngine.calcAge`、`showLifeClockPage`。
- Produces: 首页 `#home-life-entry` 入口卡片，点击跳转余生页。

- [ ] **Step 1: 替换首页人生进度模块（修改 `index.html`）**

删除首页「人生进度条模块（环形）」整个 `<section>`（约 83-140 行）与「快速统计」`<section>`（约 151-170 行），在原位置替换为入口卡片：

```html
      <!-- 余生闹钟入口卡片 -->
      <section class="mb-6">
        <div class="home-life-entry" id="home-life-entry">
          <div>
            <p class="home-life-entry-title">你 <span id="home-life-age">--</span> 岁了</p>
            <p class="home-life-entry-sub">看看余生还能体验多少美好 →</p>
          </div>
          <span class="home-life-entry-arrow">⏰</span>
        </div>
      </section>
```

如首页标题区存在连续打卡显示节点（如 `#streak-display` 或 `updateStreakDisplay` 操作的元素），将其 HTML 移除。

- [ ] **Step 2: 入口卡片样式（追加 `css/style.css`）**

```css
.home-life-entry {
  display: flex; align-items: center; justify-content: space-between;
  background: #f5f5f0; border-radius: 20px; padding: 18px 20px; cursor: pointer;
}
.home-life-entry-title { font-size: 18px; font-weight: 600; color: #1d1d1f; }
#home-life-age { color: #ff3b30; }
.home-life-entry-sub { font-size: 13px; color: #9b9b9b; margin-top: 4px; }
.home-life-entry-arrow { font-size: 24px; }
.dark .home-life-entry { background: #1a1a1a; }
.dark .home-life-entry-title { color: #fff; }
```

- [ ] **Step 3: 首页逻辑改造（修改 `js/app.js`）**

把 `renderHomePage()` 中对已删除节点的调用清理掉，改为渲染入口卡片。`renderHomePage` 中：
- 删除 `updateLifeProgress()` 调用（及其中对 `life-progress-*`、`days-lived`、`days-left` 的操作）。
- 删除/跳过 `updateStreakDisplay()` 在首页的调用（函数本身保留供成就用，仅首页不调用）。
- 新增入口卡片渲染与点击：

```js
  // 渲染余生入口卡片
  const ageEl = document.getElementById('home-life-age');
  if (ageEl) {
    const birth = LifeClockUI.getEffectiveBirthDate();
    ageEl.textContent = LifeClockEngine.calcAge(birth, Date.now()).toFixed(2);
  }
  const entry = document.getElementById('home-life-entry');
  if (entry) entry.onclick = showLifeClockPage;
```

同时移除 `bindEvents()` 中对已删除的 `#birth-date` 的监听（约 41-42 行 `birthDateInput.addEventListener`），以及不再需要的 `updateQuickStats`/`updateLifeProgress` 函数定义（若无其它调用方）。

- [ ] **Step 4: 浏览器验证**

首页不再有圆环/出生日期框/已活·剩余天数/连续打卡；出现入口卡片「你 26.56 岁了 / 看看余生还能体验多少美好 →」；点击跳转余生页。控制台无 `Cannot read properties of null` 报错（确认所有被删节点的引用都已清理）。

- [ ] **Step 5: 运行单元测试回归**

Run: `node test/life-clock-test.cjs`
Expected: PASS —— 数据层与引擎测试仍全绿。

- [ ] **Step 6: 提交**

```bash
git add index.html css/style.css js/app.js
git commit -m "feat: 首页改为余生入口卡片并清理旧倒计时逻辑"
```

---

## 自审记录

**Spec 覆盖检查：**
- 形态（独立 tab + 全屏页）→ Task 3/4 ✅
- 表盘 iOS 风格 + 走动 → Task 3（结构/样式）+ Task 4（指针角度）✅
- 年龄 8 位跳动 + 后台暂停 → Task 4（`toFixed(8)` + visibilitychange）✅
- 余生 2×2 网格 + 公式 + 边界 → Task 1（配置）+ Task 2（计算/测试）+ Task 4（渲染）✅
- 寿命 100/退休 60 + 可调 → Task 1（默认/存取）+ Task 6（设置 UI）✅
- 滑动选择器 + 随机演示 + 不选未来 → Task 5（选择器/`picked>today` 限制）+ Task 4（演示生日）✅
- 分享/保存复用 html2canvas → Task 7 ✅
- 首页入口卡片 + 移除旧模块/打卡 → Task 8 ✅
- 单元测试覆盖 → Task 1/2 ✅

**占位符扫描：** 无 TBD/TODO；每个代码步骤含完整代码。`prompt` 作为退休/寿命输入是有意的 MVP 选择并已注明。

**类型一致性：** `calcAge(birthDateStr, nowMs)`、`calcEvents(ctx)`、`getEffectiveBirthDate()`、`showLifeClockPage()`、`StorageManager.getLifeExpectancy/getRetireAge` 在各任务间签名一致。

**已知衔接点（实现者注意）：**
- Task 4 Step 1 引入 `datePicker.js` 的 `<script>`，但该文件 Task 5 才创建——实现顺序须按 1→8；若严格 TDD 可在 Task 5 再加该 `<script>` 行。
- `showToast` 若项目未提供则分享失败处静默；实现时确认现有是否有等价 toast。
