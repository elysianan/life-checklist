# UI 清理与主题修复 实现计划（v6.7.0）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 保持苹果极简基调，建立统一色板并把主题改成标记驱动，一举修复"主题切换无效"与"配色脏"，同时补全人生轴样式、加年份滚轮、删音效、收紧"我的"页。

**Architecture:** 在 `css/style.css` 顶部建立一套语义化 CSS 变量（浅色 `:root` + 深色 `html.dark` 各一套值），组件只引用变量；Tailwind 改 `darkMode:'class'`，`settings.js` 的 `applyTheme` 计算"是否深色"后切 `html.dark` 标记，auto 模式读系统。逻辑改动走 TDD（vm sandbox 测试），CSS/UI 改动走浏览器浅深双色截图验证。

**Tech Stack:** 原生 HTML/CSS/JS + Tailwind CDN；测试用 Node `vm` sandbox（`.cjs`）；视觉验证用 Playwright（Chromium）截图。

## Global Constraints

- 不写向后兼容/降级/polyfill 代码（用户全局约束）。
- 保持苹果极简设计语言，不另起新风格。
- 不改动清单/任务/AI/成就等核心业务逻辑。
- 代码注释用中文。
- 人生轴事件数据结构保持 `{ id, year, text }` 不变。
- 主题存储键 `life_checklist_theme`，值 `auto` | `light` | `dark`。
- 色板令牌值（浅色 / 深色）：
  - `--bg`: `#f5f5f7` / `#000000`
  - `--surface`: `#ffffff` / `#1c1c1e`
  - `--surface-2`: `#f0f0f3` / `#2c2c2e`
  - `--text`: `#1d1d1f` / `#f5f5f7`
  - `--text-2`: `#6e6e73` / `#aeaeb2`
  - `--text-3`: `#a1a1a6` / `#6e6e73`
  - `--border`: `#e5e5ea` / `#38383a`
  - `--accent`: `#007aff` / `#0a84ff`
  - `--accent-weak`: `rgba(0,122,255,0.1)` / `rgba(10,132,255,0.18)`
  - `--danger`: `#ff3b30` / `#ff453a`
  - `--success`: `#34c759` / `#30d158`
  - `--shadow`: `0 1px 3px rgba(0,0,0,0.08)` / `0 1px 3px rgba(0,0,0,0.4)`
  - `--shadow-lg`: `0 8px 24px rgba(0,0,0,0.12)` / `0 8px 24px rgba(0,0,0,0.5)`
  - `--radius`: `1rem`（两套相同）

---

## Task 1: 删除音效模块

**Files:**
- Delete: `js/sounds.js`
- Modify: `index.html`（移除 `<script src="js/sounds.js"></script>`，第 630 行）
- Modify: `js/app.js`（移除第 93 行 `SoundManager.init();`、第 834-836 行 play 调用）
- Modify: `js/achievements.js`（移除第 52 行 `SoundManager.playAchievement();`）
- Modify: `js/settings.js`（移除 `SOUND` key、`getSoundEnabled`、`setSoundEnabled`、`init` 中 `SoundManager.enabled` 行）
- Modify: `js/profile.js`（移除音效设置项、`toggleSound`、`handleSettingAction` 的 `toggleSound` 分支）

**Interfaces:**
- Consumes: 无
- Produces: 移除全局 `SoundManager`；`SettingsManager` 不再有 `getSoundEnabled/setSoundEnabled`。

- [ ] **Step 1: 删除文件与引用**

删除 `js/sounds.js`。在 `index.html` 删除该行：
```html
  <script src="js/sounds.js"></script>
```

- [ ] **Step 2: 清理 app.js**

`js/app.js` 第 93 行删除 `SoundManager.init();`。

第 834-836 行原为：
```js
    SoundManager.playComplete();
  } else {
    SoundManager.playUncheck();
```
改为（保留 if/else 结构，去掉音效调用）：
```js
    // 完成打卡
  } else {
    // 取消打卡
```
（若该 if/else 体内无其他语句导致语法问题，则保留原有其余逻辑，仅删去两行 `SoundManager.*` 调用。实改时按上下文确认 if/else 仍有其它语句。）

- [ ] **Step 3: 清理 achievements.js**

`js/achievements.js` 第 52 行删除 `SoundManager.playAchievement();`。

- [ ] **Step 4: 清理 settings.js**

删除 `KEYS` 中 `SOUND: 'life_checklist_sound',` 一行；删除 `getSoundEnabled()` 与 `setSoundEnabled()` 两个方法；`init()` 中删除 `SoundManager.enabled = this.getSoundEnabled();` 一行。

- [ ] **Step 5: 清理 profile.js**

`renderSettingsList()` 中删除变量 `const soundEnabled = ...` 与设置数组里的音效项：
```js
      { icon: '🔊', label: `音效 ${soundEnabled ? '开启' : '关闭'}`, action: 'toggleSound' },
```
删除 `handleSettingAction` 中：
```js
      case 'toggleSound':
        this.toggleSound();
        break;
```
删除整个 `toggleSound()` 方法。

- [ ] **Step 6: 回归测试（逻辑）**

Run: `node test/timeline-test.cjs`
Expected: 全部 ✅（删音效不应影响时间轴逻辑测试）

- [ ] **Step 7: 浏览器冒烟验证**

用浏览器打开 `index.html`，打开控制台，确认**无** `SoundManager is not defined` 报错；点击一个任务打卡、进入"我的"页确认设置项不再有音效。

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: 移除音效模块及全部调用(v6.7.0)"
```

---

## Task 2: 建立设计令牌 + 修复主题切换（TDD）

**Files:**
- Create: `test/settings-test.cjs`
- Modify: `css/style.css`（顶部新增令牌块；`body` 背景/文字改用令牌）
- Modify: `index.html`（Tailwind `darkMode: 'media'` → `'class'`）
- Modify: `js/settings.js`（重写 `applyTheme`）

**Interfaces:**
- Consumes: 无
- Produces: `SettingsManager.applyTheme(theme)` —— `theme ∈ {'dark','light','auto'}`，副作用为 `document.documentElement.classList` 含/不含 `'dark'`；CSS 变量 `--bg/--surface/--text/...` 全局可用。

- [ ] **Step 1: 写失败测试**

Create `test/settings-test.cjs`：
```js
/**
 * 设置模块·主题切换单元测试
 * 用法：node test/settings-test.cjs
 * 覆盖"主题切换无效"回归：applyTheme 必须正确切换 html.dark 标记
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const store = {};
function makeClassList() {
  const set = new Set();
  return {
    add: c => set.add(c),
    remove: c => set.delete(c),
    toggle: (c, force) => {
      if (force === undefined) { set.has(c) ? set.delete(c) : set.add(c); }
      else { force ? set.add(c) : set.delete(c); }
      return set.has(c);
    },
    contains: c => set.has(c)
  };
}

let systemDark = false; // 模拟系统是否深色
const sandbox = {
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  },
  console, Date, JSON, Object, Array, Number, String, Boolean,
  document: { documentElement: { classList: makeClassList(), style: {} } },
  window: {
    matchMedia: () => ({ matches: systemDark, addEventListener: () => {} })
  },
  __setSystemDark: v => { systemDark = v; },
  __done: (p, f) => { console.log(`\n结果: ${p} 通过 / ${f} 失败`); if (f > 0) process.exitCode = 1; }
};

const root = path.join(__dirname, '..');
let code = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');
code += `
;(function(){
  let passed=0, failed=0;
  const assert=(n,c)=>{ c?passed++:failed++; console.log((c?'✅':'❌')+' '+n); };
  const html = document.documentElement;

  // 深色：必须加 dark 标记
  SettingsManager.applyTheme('dark');
  assert('dark 主题 → html.dark 存在', html.classList.contains('dark') === true);

  // 浅色：必须移除 dark 标记
  SettingsManager.applyTheme('light');
  assert('light 主题 → html.dark 不存在', html.classList.contains('dark') === false);

  // auto + 系统深色 → 加标记
  __setSystemDark(true);
  SettingsManager.applyTheme('auto');
  assert('auto + 系统深色 → html.dark 存在', html.classList.contains('dark') === true);

  // auto + 系统浅色 → 移除标记
  __setSystemDark(false);
  SettingsManager.applyTheme('auto');
  assert('auto + 系统浅色 → html.dark 不存在', html.classList.contains('dark') === false);

  __done(passed, failed);
})();
`;
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node test/settings-test.cjs`
Expected: FAIL —— 旧 `applyTheme` 在 `auto` 分支只移除 dark class，"auto + 系统深色 → html.dark 存在"断言失败。

- [ ] **Step 3: 重写 applyTheme**

`js/settings.js` 的 `applyTheme` 整体替换为：
```js
  applyTheme(theme) {
    const html = document.documentElement;
    let dark;
    if (theme === 'dark') dark = true;
    else if (theme === 'light') dark = false;
    else dark = window.matchMedia('(prefers-color-scheme: dark)').matches; // auto 跟随系统
    html.classList.toggle('dark', dark);
    html.style.colorScheme = dark ? 'dark' : 'light';
  },
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node test/settings-test.cjs`
Expected: PASS —— 4 条断言全 ✅。

- [ ] **Step 5: 切 Tailwind 为 class 模式**

`index.html` 第 17 行：
```js
      darkMode: 'media',
```
改为：
```js
      darkMode: 'class',
```

- [ ] **Step 6: 注入令牌 + body 令牌化**

在 `css/style.css` 最顶部（注释块之后、`* { box-sizing }` 之前）插入：
```css
/* ==================== 设计令牌（统一色板）==================== */
:root {
  --bg: #f5f5f7;
  --surface: #ffffff;
  --surface-2: #f0f0f3;
  --text: #1d1d1f;
  --text-2: #6e6e73;
  --text-3: #a1a1a6;
  --border: #e5e5ea;
  --accent: #007aff;
  --accent-weak: rgba(0, 122, 255, 0.1);
  --danger: #ff3b30;
  --success: #34c759;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
  --radius: 1rem;
}
html.dark {
  --bg: #000000;
  --surface: #1c1c1e;
  --surface-2: #2c2c2e;
  --text: #f5f5f7;
  --text-2: #aeaeb2;
  --text-3: #6e6e73;
  --border: #38383a;
  --accent: #0a84ff;
  --accent-weak: rgba(10, 132, 255, 0.18);
  --danger: #ff453a;
  --success: #30d158;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
}
```

将 `body` 的 `background: #f5f5f7;` 改为 `background: var(--bg);`，并新增 `color: var(--text);`。删除紧随其后的 `@media (prefers-color-scheme: dark) { body { background:#000; color:#f5f5f7 } }` 块（其作用已由令牌覆盖）。

- [ ] **Step 7: 准备截图脚本**

安装 Playwright 并准备脚本（一次性）：
```bash
npm init -y
npm i -D playwright
npx playwright install chromium
```
Create `test-screenshots/shoot.cjs`：
```js
/**
 * 浅色/深色双主题截图：node test-screenshots/shoot.cjs <viewKey> <themeBtnClicks?>
 * 简化版——逐页手动维护下面的 shots 列表。
 */
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const url = 'file://' + path.join(__dirname, '..', 'index.html').replace(/\\/g, '/');
  const browser = await chromium.launch();
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 400, height: 850 } });
    const page = await ctx.newPage();
    await page.goto(url);
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(__dirname, `home-${scheme}.png`), fullPage: true });
    await ctx.close();
  }
  await browser.close();
  console.log('截图完成');
})();
```

- [ ] **Step 8: 截图验证主题立即生效**

Run: `node test-screenshots/shoot.cjs`
亲自查看 `test-screenshots/home-light.png` 与 `home-dark.png`：浅色为浅灰底深字、深色为黑底浅字，证明 `.dark` 标记已驱动整页背景。

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: 建立统一色板+主题改标记驱动,修复主题切换无效(v6.7.0)"
```

---

## Task 3: 配色统一去脏（分区块令牌化）

**Files:**
- Modify: `css/style.css`（全量：硬编码颜色 → 令牌，删除 `@media (prefers-color-scheme: dark)` 块）

**Interfaces:**
- Consumes: Task 2 的令牌变量
- Produces: 全站配色统一、深浅色由令牌自动切换、无残留 `@media (prefers-color-scheme: dark)` 块。

**替换规则（全区块统一遵守）：**
- `#fff`/`#ffffff`/`white`（作面）→ `var(--surface)`
- `#f5f5f7`/`#f0f0f3`（作底）→ `var(--bg)` 或 `var(--surface-2)`（按层级）
- `#1d1d1f`/`#000`（作主文字）→ `var(--text)`
- `#86868b`/`#6e6e73`（作次文字）→ `var(--text-2)`
- `#007aff`（强调）→ `var(--accent)`
- `#ff3b30`（危险）→ `var(--danger)`；`#34c759`（成功）→ `var(--success)`
- 边框/分隔线灰 → `var(--border)`
- box-shadow → `var(--shadow)` / `var(--shadow-lg)`
- 每替换一处颜色，若其存在配对的 `@media (prefers-color-scheme: dark)` 覆盖块，**删除该覆盖块**（颜色已由令牌在 `html.dark` 下切换）。
- 渐变：保留"清单卡彩色头部""成就/统计/个人中心品牌头部"等承载品牌/信息的渐变；纯装饰的杂乱多色渐变改为 `var(--surface)` 纯色面 + `var(--shadow)`。

- [ ] **Step 1: 首页区块**

令牌化 `.home-list-card`、`.home-list-card-body`、`.home-list-card-preview`、`.quote-card`、`.lists-overview*`、`.home-life-entry*` 等首页相关类，删除其配对的深色 media 块（含第 53、86、175-176 等）。

Run: `node test-screenshots/shoot.cjs` → 查看 home 浅/深截图，确认观感干净、深色正常。

- [ ] **Step 2: 清单页 / 详情页区块**

令牌化清单卡、模板库、`.detail-*`（详情头、标签网格、底部操作栏）、`.task-tag*` 等，删配对 media 块。

在 `shoot.cjs` 的 shots 中临时增加：进入清单页与详情页后截图（通过 `page.click('[data-view="templates"]')` 等导航）。亲自查看浅/深观感。

- [ ] **Step 3: 统计 / 成就 / 我的 区块**

令牌化 `.stats-*`、`.chart-card`、`.achievement-*`、`.profile-*`、`.setting-*` 等，删配对 media 块。审视这三页头部渐变：保留品牌渐变，统一其余为令牌纯色。

截图三页浅/深，亲自查看。

- [ ] **Step 4: 弹窗 / 导航 / 其它区块**

令牌化 `.modal-*`、`.bottom-nav`、`.nav-item`、`.share-*`、`.report-*`、`.date-picker-*`、`.goal-*` 等，删配对 media 块。

- [ ] **Step 5: 扫尾确认无残留**

Run: `grep -c "prefers-color-scheme" css/style.css`
Expected: `0`（所有深色 media 块已被令牌取代）。若仍有残留，逐个令牌化并删除。

- [ ] **Step 6: 全页回归截图**

逐页（首页/清单/详情/人生轴/统计/成就/我的/弹窗）浅色+深色截图，亲自核对配色统一、无脏色、深色无"白底黑字漏切"。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "style: 全站配色令牌化去脏,删除重复深色media块(v6.7.0)"
```

---

## Task 4: 人生轴补全样式 + 修按钮逻辑

**Files:**
- Modify: `css/style.css`（新增 `.timeline-single-*` / `.timeline-double-*` / 布局按钮 `.active` 态）
- Modify: `js/timeline.js`（新增 `setLayout(layout)`）
- Modify: `js/app.js`（第 130-131 行按钮绑定改为分别 setLayout）

**Interfaces:**
- Consumes: Task 2 令牌；`StorageManager.getTimelineLayout()`（默认 `'single'`）、`setTimelineLayout(layout)`
- Produces: `TimelineManager.setLayout(layout)` —— `layout ∈ {'single','double'}`，持久化并重渲染。

- [ ] **Step 1: 新增 setLayout，按钮改为指定布局**

`js/timeline.js` 在 `toggleLayout` 旁新增（保留 `toggleLayout` 不再被引用则一并删除）：
```js
  setLayout(layout) {
    if (layout !== 'single' && layout !== 'double') return;
    StorageManager.setTimelineLayout(layout);
    this.renderTimelinePage();
  },
```
删除 `toggleLayout`（无其它引用）。

`js/app.js` 第 130-131 行：
```js
  if (tlLayoutSingle) tlLayoutSingle.addEventListener('click', () => TimelineManager.toggleLayout());
  if (tlLayoutDouble) tlLayoutDouble.addEventListener('click', () => TimelineManager.toggleLayout());
```
改为：
```js
  if (tlLayoutSingle) tlLayoutSingle.addEventListener('click', () => TimelineManager.setLayout('single'));
  if (tlLayoutDouble) tlLayoutDouble.addEventListener('click', () => TimelineManager.setLayout('double'));
```

- [ ] **Step 2: 新增人生轴样式**

在 `css/style.css` 末尾（或人生轴区）新增（用令牌）：
```css
/* ==================== 人生轴·单列 ==================== */
.timeline-single-wrap { position: relative; padding: 0.5rem 0; }
.timeline-single-row { display: flex; gap: 0.75rem; align-items: stretch; }
.timeline-single-left {
  position: relative; flex: 0 0 56px;
  display: flex; flex-direction: column; align-items: center;
}
.timeline-single-year { font-size: 0.875rem; font-weight: 700; color: var(--accent); padding-top: 0.9rem; }
.timeline-single-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--accent); margin-top: 0.35rem; z-index: 1;
  box-shadow: 0 0 0 3px var(--accent-weak);
}
.timeline-single-line { flex: 1; width: 2px; background: var(--border); margin-top: 0.2rem; }
.timeline-single-row:last-child .timeline-single-line { display: none; }
.timeline-single-card {
  flex: 1; background: var(--surface); border-radius: var(--radius);
  padding: 0.85rem 1rem; margin-bottom: 0.85rem;
  box-shadow: var(--shadow); cursor: pointer; transition: transform 0.15s ease;
}
.timeline-single-card:active { transform: scale(0.985); }
.timeline-single-text { margin: 0; color: var(--text); font-size: 0.9375rem; line-height: 1.5; }

/* ==================== 人生轴·双侧 ==================== */
.timeline-double-wrap { position: relative; padding: 0.5rem 0; }
.timeline-double-axis {
  position: absolute; left: 50%; top: 0; bottom: 0; width: 2px;
  background: var(--border); transform: translateX(-50%);
}
.timeline-double-row { display: flex; align-items: center; margin-bottom: 1rem; position: relative; }
.timeline-double-side { flex: 1; display: flex; }
.timeline-double-side.left { justify-content: flex-end; padding-right: 1.25rem; }
.timeline-double-side.right { justify-content: flex-start; padding-left: 1.25rem; }
.timeline-double-center { flex: 0 0 0; position: relative; }
.timeline-double-dot {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: 12px; height: 12px; border-radius: 50%;
  background: var(--accent); box-shadow: 0 0 0 3px var(--accent-weak); z-index: 1;
}
.timeline-double-card {
  max-width: 100%; background: var(--surface); border-radius: var(--radius);
  padding: 0.75rem 0.9rem; box-shadow: var(--shadow); cursor: pointer;
}
.timeline-double-year { display: block; font-size: 0.8125rem; font-weight: 700; color: var(--accent); margin-bottom: 0.25rem; }
.timeline-double-text { margin: 0; color: var(--text); font-size: 0.875rem; line-height: 1.45; }

/* ==================== 布局切换按钮·选中态 ==================== */
#timeline-layout-single, #timeline-layout-double {
  background: var(--surface-2); color: var(--text-2);
}
#timeline-layout-single.active, #timeline-layout-double.active {
  background: var(--accent); color: #fff;
}
```

- [ ] **Step 3: 截图验证单列/双侧差异**

在 `shoot.cjs` 中导航到人生轴页（`page.click('[data-view="timeline"]')`），先注入 2~3 条事件到 localStorage 再截图；分别点击"单列""双侧"按钮各截一张。
亲自查看：单列=左年份右卡片纵向流；双侧=左右交替+中轴线；选中按钮蓝底白字。两者**明显不同**。

- [ ] **Step 4: 逻辑回归**

Run: `node test/timeline-test.cjs`
Expected: 全部 ✅（引擎逻辑未动）。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: 补全人生轴单列/双侧样式+按钮改指定布局(v6.7.0)"
```

---

## Task 5: 人生轴年份滚轮选择器

**Files:**
- Modify: `js/datePicker.js`（新增 `openYear(currentYear, onConfirm)` 与内部 `_yearRange`）
- Modify: `index.html`（年份滚轮复用 `date-picker-mask`，新增单列容器或复用 `dp-year`）
- Modify: `js/timeline.js`（`_showModal` 年份输入改为只读展示框 + 点击弹滚轮）
- Modify: `test/timeline-test.cjs`（补 `_yearRange` 纯逻辑测试）

**Interfaces:**
- Consumes: `DatePickerManager._fill`、`_centerValue`、`ITEM_H`、`_range`
- Produces: `DatePickerManager.openYear(currentYear, onConfirm)` —— 弹出单列年份滚轮，确认回调 `onConfirm(year:number)`；`DatePickerManager._yearRange()` 返回 `[1920 … 当前年+1]`。

- [ ] **Step 1: 写 _yearRange 失败测试**

在 `test/timeline-test.cjs` 的断言区（`__done` 之前）追加。但该测试 sandbox 未加载 `datePicker.js` 且 `document=undefined`，故改为对**纯函数**测试：在 `js/datePicker.js` 中 `_yearRange` 不依赖 DOM。新增独立测试 `test/datepicker-test.cjs`：
```js
/** 年份滚轮范围·纯逻辑测试：node test/datepicker-test.cjs */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const sandbox = {
  console, Date, Math, Array, Number,
  document: { getElementById: () => null }, // 占位，_yearRange 不触达
  __done: (p, f) => { console.log(`\n结果: ${p} 通过 / ${f} 失败`); if (f > 0) process.exitCode = 1; }
};
let code = fs.readFileSync(path.join(__dirname, '..', 'js/datePicker.js'), 'utf8');
code += `
;(function(){
  let passed=0, failed=0;
  const assert=(n,c)=>{ c?passed++:failed++; console.log((c?'✅':'❌')+' '+n); };
  const r = DatePickerManager._yearRange();
  const cur = new Date().getFullYear();
  assert('年份范围起点 1920', r[0] === 1920);
  assert('年份范围终点 当前年+1', r[r.length-1] === cur + 1);
  assert('年份升序连续', r.every((y,i)=> i===0 || y === r[i-1]+1));
  __done(passed, failed);
})();
`;
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node test/datepicker-test.cjs`
Expected: FAIL —— `_yearRange is not a function`。

- [ ] **Step 3: 实现 openYear + _yearRange**

`js/datePicker.js` 在对象内新增：
```js
  _yearRange() { return this._range(1920, new Date().getFullYear() + 1); },

  // 单列年份滚轮：复用 date-picker-mask，仅显示年份列
  openYear(currentYear, onConfirm) {
    const mask = document.getElementById('date-picker-mask');
    const card = mask.querySelector('.date-picker-cols');
    const units = mask.querySelector('.date-picker-units');
    // 切换为单列年份模式
    card.innerHTML = '<ul class="dp-col" id="dp-year-only"></ul>';
    if (units) units.innerHTML = '<span>年</span>';
    const ul = document.getElementById('dp-year-only');
    const years = this._yearRange();
    const sel = years.includes(Number(currentYear)) ? Number(currentYear) : 2000;
    this._fill(ul, years, sel);
    mask.classList.remove('hidden');
    document.getElementById('date-picker-cancel').onclick = () => mask.classList.add('hidden');
    document.getElementById('date-picker-confirm').onclick = () => {
      const y = this._centerValue(ul);
      mask.classList.add('hidden');
      this._restoreCols(card, units); // 还原三列，避免影响生日选择器
      if (onConfirm) onConfirm(y);
    };
  },

  // 还原三列日期结构（openYear 用后复位）
  _restoreCols(card, units) {
    card.innerHTML = '<ul class="dp-col" id="dp-year"></ul><ul class="dp-col" id="dp-month"></ul><ul class="dp-col" id="dp-day"></ul>';
    if (units) units.innerHTML = '<span>年</span><span>月</span><span>日</span>';
  },
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node test/datepicker-test.cjs`
Expected: PASS —— 3 条 ✅。

- [ ] **Step 5: 时间轴弹窗接入滚轮**

`js/timeline.js` 的 `_showModal` 中，年份 `<input type="number">` 改为只读展示 + 隐藏值：
```html
          <label class="form-label">年份</label>
          <button type="button" class="form-input tl-year-display" id="tl-modal-year-btn">${yearVal || '点击选择年份'}</button>
          <input type="hidden" id="tl-modal-year" value="${yearVal}">
```
在 `document.body.appendChild(overlay);` 之后绑定：
```js
    const yearBtn = document.getElementById('tl-modal-year-btn');
    const yearHidden = document.getElementById('tl-modal-year');
    yearBtn.addEventListener('click', () => {
      DatePickerManager.openYear(yearHidden.value || new Date().getFullYear(), (y) => {
        yearHidden.value = y;
        yearBtn.textContent = y;
      });
    });
```
确认 `confirm` 仍读取 `document.getElementById('tl-modal-year').value`（隐藏域），无需改动。

新增展示框样式（`css/style.css`，用令牌）：
```css
.tl-year-display { text-align: left; color: var(--text); cursor: pointer; }
.tl-year-display:empty::before { content: '点击选择年份'; color: var(--text-3); }
```

- [ ] **Step 6: 截图/交互验证**

`shoot.cjs` 导航到人生轴 → 点击右下"+" → 截图弹窗；点击年份框 → 截图滚轮。亲自查看：年份框点击弹出单列滚轮，选中后回填；保存后事件正常显示。再手动验证"设置生日"滚轮仍为年月日三列（复位生效）。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: 人生轴年份改滚轮选择器(v6.7.0)"
```

---

## Task 6: "我的"页布局收紧

**Files:**
- Modify: `css/style.css`（`.profile-*`、`.setting-*` 间距收紧）

**Interfaces:**
- Consumes: Task 2 令牌；Task 3 已令牌化的 profile 样式
- Produces: 更紧凑的"我的"页（设置 6 项，减少滚动）。

- [ ] **Step 1: 收紧间距**

调整 `.profile-header`（上下 padding 缩小）、`.profile-stats`（gap 缩小）、`.profile-section`（margin-bottom 缩小）、`.setting-item`（padding 0.875rem→0.75rem），统一用 `var(--surface)` / `var(--border)`。具体数值实改时按截图微调，目标：iPhone 视口（400×850）下"我的"页主体内容尽量一屏可见。

- [ ] **Step 2: 截图验证**

`shoot.cjs` 导航到"我的"页，浅/深各截一张全页图。亲自查看：内容紧凑、无音效项、配色统一。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "style: 收紧'我的'页布局(v6.7.0)"
```

---

## Task 7: 收尾（CHANGELOG + 全量回归 + 推送）

**Files:**
- Modify: `CHANGELOG.md`、`README.md`（版本号 → v6.7.0，关于弹窗版本号同步）
- Modify: `js/profile.js`（`showAbout` 里 `v5.0.0` → 当前版本，顺手修正）

- [ ] **Step 1: 更新 CHANGELOG/README/关于版本**

`CHANGELOG.md` 顶部新增 v6.7.0 条目（删音效、统一色板、修主题、补人生轴、年份滚轮、我的页收紧）。`README.md` 版本号同步。`js/profile.js` `showAbout` 的 `v5.0.0` 改为 `v6.7.0`。

- [ ] **Step 2: 全量逻辑测试**

Run: `node test/timeline-test.cjs && node test/settings-test.cjs && node test/datepicker-test.cjs && node test/life-progress-test.cjs && node test/life-clock-test.cjs && node test/goal-breakdown-test.cjs && node test/recommendations-test.cjs && node test/report-test.cjs`
Expected: 全部 ✅，无 `process.exitCode=1`。

- [ ] **Step 3: 全页浅/深双主题终检**

逐页截图终检（首页/清单/详情/人生轴单列+双侧/统计/成就/我的/弹窗），亲自核对。

- [ ] **Step 4: Commit + 推送 Gitee**

```bash
git add -A
git commit -m "chore: v6.7.0 收尾(CHANGELOG/README/版本号)"
git push
```

---

## Self-Review 记录

- **Spec 覆盖**：① 删音效→Task1；② 色板+主题→Task2；③ 配色去脏→Task3；④ 人生轴样式+按钮→Task4；⑤ 年份滚轮→Task5；⑥ 我的页收紧→Task6；收尾→Task7。全覆盖。
- **Placeholder 扫描**：Task1 Step2 对 if/else 体保留有"按上下文确认"说明（实改依赖具体行，已标注核对点）；其余步骤均含完整代码/命令。
- **类型一致**：`setLayout`、`openYear`、`_yearRange`、`applyTheme` 命名在定义与引用处一致；令牌变量名贯穿统一。
- **测试可跑性**：`settings-test.cjs` / `datepicker-test.cjs` mock 了 `document`/`window.matchMedia`，被测函数不触达未 mock 的 DOM。
