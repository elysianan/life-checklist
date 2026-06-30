# UI 清理与主题修复设计文档（v6.7.0）

> 日期：2026-06-30
> 主题：统一配色、修复主题切换、补全人生轴、加年份滚轮、删音效、收紧"我的"页

## 一、背景与目标

用户反馈五个体验问题，深入排查后发现其中多个是**真实 bug**而非单纯审美问题：

| 用户反馈 | 排查结论（根因） |
| --- | --- |
| 人生轴单列/双侧没区别 | v6.6.0 重写了 `timeline.js` 渲染（`.timeline-single-*` / `.timeline-double-*`），但 **CSS 里这些新类的样式完全缺失**，两种布局都渲染成无样式裸 div；且两个按钮都调用 `toggleLayout()`（反转）而非分别指定布局 |
| 主题切换浅色/深色没反应 | 全项目深色样式 = Tailwind `darkMode:'media'` + CSS 60+ 处 `@media (prefers-color-scheme: dark)`，**两者都只认系统设置**；而 `settings.js` 切换的是 `.dark` class，CSS 仅 2 行响应该 class，机制完全脱节 |
| 整体配色"脏" | 无统一设计令牌，颜色值（`#f5f5f7`/`#86868b`/`#007aff`/各种渐变）散落 3800 行 CSS，深浅色各写一遍，杂乱 |
| 设置太繁杂、音效没必要 | "我的"页内容偏长需滚动；音效为独立模块 |
| 年份手输体验差 | 添加事件用 `<input type="number">` 手输年份 |

**目标**：保持现有苹果极简基调，用"统一色板 + 标记驱动主题"一举解决主题失效与配色脏，并补全人生轴、加年份滚轮、删音效、收紧"我的"页。

**非目标**：不更换整体设计语言（仍是苹果极简）；不改动清单/任务/AI/成就等核心业务逻辑；不写向后兼容代码。

## 二、设计原则

1. **保持苹果极简基调**：白/浅灰底 + 蓝色点缀，深色对应黑/深灰；只统一与清理，不另起新风格。
2. **单一色源**：所有颜色来自一套语义化 CSS 变量（design tokens），浅色与深色各一套值，组件只引用变量。
3. **标记驱动主题**：`html.dark` 决定深色，`auto` 由 JS 读系统后加/移该标记；Tailwind 同步改为 `darkMode:'class'`。
4. **逻辑与样式分离**：JS 只管行为与数据，视觉全部交给令牌化的 CSS。

## 三、任务拆分与详细设计

执行顺序：① → ② → ③ → ④ → ⑤ → ⑥。

### ① 删音效

- 删除 `js/sounds.js`，`index.html` 移除其 `<script>` 引用。
- `js/app.js`：移除 `SoundManager.init()` 与 `playComplete()` / `playUncheck()` 调用。
- `js/achievements.js`：移除 `playAchievement()` 调用。
- `js/settings.js`：移除 `SOUND` key、`getSoundEnabled()` / `setSoundEnabled()`、`init()` 中 `SoundManager.enabled` 行。
- `js/profile.js`：移除设置项数组中的音效项、`toggleSound()`、`handleSettingAction` 的 `toggleSound` 分支。

调用点共 6 文件 9 处，已全部定位，无散落隐藏调用。

### ② 建立设计令牌 + 修复主题系统（地基）

**令牌定义**（`css/style.css` 顶部）：

```css
:root {
  --bg: #f5f5f7;            /* 页面底色 */
  --surface: #ffffff;      /* 卡片/面 */
  --surface-2: #f0f0f3;    /* 次级面/分隔区 */
  --text: #1d1d1f;         /* 主文字 */
  --text-2: #6e6e73;       /* 次文字 */
  --text-3: #a1a1a6;       /* 占位/弱文字 */
  --border: #e5e5ea;       /* 边框/分隔线 */
  --accent: #007aff;       /* 强调蓝 */
  --accent-weak: rgba(0,122,255,0.1);
  --danger: #ff3b30;
  --success: #34c759;
  --shadow: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
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
  --accent-weak: rgba(10,132,255,0.18);
  --danger: #ff453a;
  --success: #30d158;
  --shadow: 0 1px 3px rgba(0,0,0,0.4);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.5);
}
```

**Tailwind 配置**（`index.html`）：`darkMode: 'media'` → `darkMode: 'class'`。改后 `index.html` 中现有的 `dark:bg-gray-900` 等类将响应 `html.dark` 标记，与色板统一。

**主题应用逻辑**（`js/settings.js` 的 `applyTheme`）改为计算"是否深色"后切 class：

```js
applyTheme(theme) {
  const html = document.documentElement;
  let dark;
  if (theme === 'dark') dark = true;
  else if (theme === 'light') dark = false;
  else dark = window.matchMedia('(prefers-color-scheme: dark)').matches; // auto
  html.classList.toggle('dark', dark);
  html.style.colorScheme = dark ? 'dark' : 'light';
}
```

`init()` 中已有的 `matchMedia change` 监听在 auto 模式下重新 `applyTheme('auto')`，逻辑保留。

**效果**：循环切换交互不变，但浅色/深色/跟随系统三档**立即整屏生效**。

### ③ 配色统一去脏（分区块，逐块验证）

- 逐区块把硬编码颜色替换为 `var(--token)`，**同时删除**对应的 `@media (prefers-color-scheme: dark)` 块（颜色已由令牌在 `.dark` 下自动切换）。
- 24 处渐变逐一审视：保留清单卡彩色头部、成就/统计/个人中心品牌头部等**承载信息或品牌**的渐变；去掉纯装饰的杂乱多色渐变，改为纯色面 + 统一阴影。
- 统一圆角（`--radius`）、阴影（`--shadow` / `--shadow-lg`）、灰阶。
- 分区顺序：首页 → 清单/详情 → 统计/成就/我的 → 弹窗/导航/其它。每改完一区，浏览器在浅色 + 深色下截图核对。

### ④ 人生轴补全样式 + 修按钮

**补 CSS**（用令牌）：

- 单列 `.timeline-single-*`：左列年份 + 圆点 + 贯穿竖线，右侧事件卡片；卡片用 `--surface` / `--shadow`，年份用 `--accent`。
- 双侧 `.timeline-double-*`：中轴竖线 + 圆点，卡片左右交替排列；与单列形成**明显视觉差异**。
- 布局切换按钮 `.active` 高亮态：选中用 `--accent` 底 + 白字，未选用 `--surface-2` + `--text-2`。

**修按钮逻辑**（`js/timeline.js`）：

- 新增 `setLayout(layout)`，按钮分别调用 `setLayout('single')` / `setLayout('double')`，明确切到对应布局（不再反转）。
- `app.js` 中两个按钮的事件绑定相应调整。

### ⑤ 人生轴年份滚轮选择器

- 新增轻量"年份滚轮"：单列 `scroll-snap`，范围 1920 ~ 当前年 + 1，复用 `datePicker.js` 的 `_fill` / `_centerValue` / `ITEM_H` 基建。
- 实现方式：在 `js/datePicker.js` 内扩展一个 `openYear(currentYear, onConfirm)` 方法，并在 `index.html` 复用既有 `date-picker-mask` 遮罩（仅显示年份单列）。不新增独立文件。
- `js/timeline.js` 的添加/编辑弹窗：年份从 `<input type="number">` 改为**只读展示框 + 点击弹出滚轮**，选中后回填年份并参与原有 `validateEvent` 校验。

### ⑥ "我的"页布局收紧

- 删音效项后设置剩 6 项（主题 / 出生日期 / 导出 / 重置 / AI / 关于 + 预期寿命）。
- 用令牌重排统计卡与设置列表，收紧上下间距，减少滚动；不改功能，仅排版与视觉。

## 四、数据与接口变化

- **数据结构**：无变化。人生轴事件仍为 `{ id, year, text }`；主题仍存 `life_checklist_theme`（auto/light/dark）。
- **移除**：`life_checklist_sound` 存储项不再写入（旧值残留无害，不做迁移，符合"不写兼容代码"）。
- **新增**：年份滚轮为纯 UI，无新存储。

## 五、验证策略

- **逻辑测试**：`test/timeline-test.cjs` 补充"按钮分别切换布局"用例；年份校验沿用既有 `validateEvent` 测试。运行全部 `.cjs` 确保无回归。
- **视觉验证**：改色板/配色/人生轴后，**亲自用浏览器**对主要页面（首页、清单、详情、人生轴单列+双侧、统计、成就、我的、各弹窗）在**浅色与深色**两种主题下逐一截图核对。严禁仅凭子代理文字报告判定完成（吸取既往子代理造假教训）。

## 六、风险与应对

| 风险 | 应对 |
| --- | --- |
| CSS 大改易漏色/漏删 media 块 | 分区块改动 + 每区浅深双色截图验证 |
| 改 Tailwind `darkMode` 后 `dark:` 类整体行为变化 | 全页回归，重点检查首页/导航/详情等高频页 |
| 删音效遗漏调用导致报错 | 已定位全部 9 处调用，改后跑页面确认无 `SoundManager is not defined` |
| 人生轴新样式与旧迁移数据兼容 | 渲染只依赖 `{year,text}`，与样式解耦，迁移逻辑不动 |

## 七、涉及文件清单

- `index.html`：Tailwind config、移除 sounds 引用、（可能）调整少量 `dark:` 类
- `css/style.css`：令牌、配色去脏、删 media 块、人生轴样式、我的页收紧（主要工作量）
- `js/settings.js`：`applyTheme` 改造、移除 sound 相关
- `js/profile.js`：移除音效项、我的页排版相关
- `js/timeline.js`：`setLayout`、年份滚轮接入
- `js/datePicker.js`：扩展年份滚轮 `openYear()`
- `js/sounds.js`：删除
- `js/app.js`、`js/achievements.js`：移除 SoundManager 调用
- `test/timeline-test.cjs`：补按钮布局用例
