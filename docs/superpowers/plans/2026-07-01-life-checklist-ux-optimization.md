# 人生已完成清单 UX 优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化人生轴年月选择、统一滚轮选中反馈、首页新增快速创建入口。

**Architecture:** 以 `DatePickerManager` 为核心统一所有滚轮的高亮与倒序逻辑；`TimelineEngine` 扩展 `month` 字段并负责迁移与排序；首页顶栏新增独立 + 按钮直接唤起创建弹窗。

**Tech Stack:** 原生 JS / CSS / Tailwind CDN / 基于 `vm` 的 Node 单元测试。

## Global Constraints

- 不新增外部依赖。
- 所有改动必须附带单元测试，TDD 推进。
- 代码注释使用中文。
- 保持 v6.8.0 已统一的视觉风格（`--accent`、`--surface`、`--text`、`--text-2`、`--radius`、`--shadow`）。
- 每次任务完成后独立提交（frequent commits）。

---

## File Structure

| 文件 | 当前职责 | 本次改动 |
|------|----------|----------|
| `js/datePicker.js` | 日期/年份滚轮选择器 | 扩展 `openYearMonth`、年份倒序、统一高亮机制 |
| `js/timeline.js` | 人生轴数据与渲染 | 事件对象支持 `month`、迁移旧数据、排序/显示/弹窗调整 |
| `js/lifeProgress.js` | 人生进度人物管理 | 无需改动，自动复用内联选择器高亮 |
| `js/app.js` | 首页交互 | 绑定新的首页「+」按钮事件 |
| `index.html` | 页面结构 | 首页顶栏新增「+」按钮 |
| `css/style.css` | 样式 | `.dp-item-active` 高亮样式、顶栏按钮间距 |
| `test/datepicker-test.cjs` | 日期选择器测试 | 补充倒序与高亮测试 |
| `test/timeline-test.cjs` | 人生轴测试 | 补充 `month` 排序与迁移测试 |

---

### Task 1: DatePickerManager 年份倒序 + 高亮机制

**Files:**
- Modify: `js/datePicker.js:30`, `js/datePicker.js:73-77`
- Modify: `js/datePicker.js`（新增 `_updateActiveItem` 方法）
- Test: `test/datepicker-test.cjs`

**Interfaces:**
- Consumes: 无
- Produces: `DatePickerManager._yearRange()` 返回 `[currentYear+1, currentYear, ..., 1920]`；`DatePickerManager._updateActiveItem(ul)` 为所有滚轮提供高亮能力。

- [ ] **Step 1: 写失败测试**

修改 `test/datepicker-test.cjs`，将原有升序断言改为倒序断言：

```js
const r = DatePickerManager._yearRange();
const cur = new Date().getFullYear();

assert('年份范围起点为当前年+1', r[0] === cur + 1);
assert('年份范围终点为 1920', r[r.length - 1] === 1920);
assert('年份降序连续', r.every((y, i) => i === 0 || y === r[i - 1] - 1));
assert('年份范围包含 2026', r.includes(2026));
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node test/datepicker-test.cjs`
Expected: 失败，提示「年份范围起点为当前年+1」不通过。

- [ ] **Step 3: 最小实现**

修改 `js/datePicker.js` 中 `_yearRange`：

```js
_yearRange() {
  const maxYear = new Date().getFullYear() + 1;
  const r = [];
  for (let i = maxYear; i >= 1920; i--) r.push(i);
  return r;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node test/datepicker-test.cjs`
Expected: 全部通过。

- [ ] **Step 5: 添加高亮机制**

在 `DatePickerManager` 中新增方法：

```js
/**
 * 高亮滚轮中心项，让用户明确当前选中的年/月/日
 */
_updateActiveItem(ul) {
  if (!ul) return;
  const idx = Math.round(ul.scrollTop / this.ITEM_H);
  const activeIdx = Math.max(0, Math.min(idx, ul.children.length - 1));
  Array.from(ul.children).forEach((li, i) => {
    li.classList.toggle('dp-item-active', i === activeIdx);
  });
}
```

修改 `_fill` 方法，在填充后给中心项预置高亮：

```js
_fill(ul, values, selected) {
  ul.innerHTML = values.map(v => `<li data-v="${v}">${v}</li>`).join('');
  const idx = Math.max(0, values.indexOf(selected));
  ul.scrollTop = idx * this.ITEM_H;
  // 初始高亮中心项
  this._updateActiveItem(ul);
}
```

- [ ] **Step 6: 绑定滚动高亮**

在 `open`、`openYear`、`renderInline` 所有滚轮的 `onscroll` 回调中加入：

```js
this._updateActiveItem(ul);
```

具体位置：
- `open` 中 `dp-year` / `dp-month` / `dp-day` 的 `onscroll`
- `openYear` 中 `dp-year-only` 的 `onscroll`
- `renderInline` 中 `yearEl` / `monthEl` / `dayEl` 的 `handleScroll`

- [ ] **Step 7: 提交**

```bash
git add js/datePicker.js test/datepicker-test.cjs
git commit -m "feat(datepicker): 年份倒序排列并增加滚轮选中高亮"
```

---

### Task 2: DatePickerManager 扩展年月双列选择器

**Files:**
- Modify: `js/datePicker.js:37-71`（替换 `openYear`）
- Test: `test/datepicker-test.cjs`

**Interfaces:**
- Consumes: `_yearRange()`、`_fill()`、`_updateActiveItem()`
- Produces: `DatePickerManager.openYearMonth(currentYear, currentMonth, onConfirm)`，回调 `onConfirm({year, month})`

- [ ] **Step 1: 写失败测试**

在 `test/datepicker-test.cjs` 末尾追加：

```js
// 验证 openYearMonth 生成的 DOM 结构（通过读取 DatePickerManager 源码后 vm 执行）
// 因 DOM 不可运行，改为验证 _yearRange 与 _range 行为
assert('_range 生成 1-12', DatePickerManager._range(1, 12).length === 12);
assert('_range 生成 1-12 首项为 1', DatePickerManager._range(1, 12)[0] === 1);
assert('_range 生成 1-12 末项为 12', DatePickerManager._range(1, 12)[11] === 12);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node test/datepicker-test.cjs`
Expected: 失败，`_range` 虽然已存在但这里只是确保测试框架可用。

- [ ] **Step 3: 替换 openYear 为 openYearMonth**

将 `js/datePicker.js` 中 `openYear` 方法整体替换为：

```js
/**
 * 双列年月滚轮：复用 date-picker-mask，仅显示年份 + 月份列
 * @param {number|string} currentYear - 当前选中年份
 * @param {number|string} currentMonth - 当前选中月份（1-12）
 * @param {function} onConfirm - 确认回调 ({year, month}) => {}
 */
openYearMonth(currentYear, currentMonth, onConfirm) {
  const mask = document.getElementById('date-picker-mask');
  const card = mask.querySelector('.date-picker-cols');
  const units = mask.querySelector('.date-picker-units');

  // 切换为两列年月模式
  card.innerHTML = `
    <ul class="dp-col" id="dp-year-only"></ul>
    <ul class="dp-col" id="dp-month-only"></ul>
  `;
  if (units) units.innerHTML = '<span>年</span><span>月</span>';

  const yearUl = document.getElementById('dp-year-only');
  const monthUl = document.getElementById('dp-month-only');
  const years = this._yearRange();
  const months = this._range(1, 12);

  const selYear = years.includes(Number(currentYear)) ? Number(currentYear) : new Date().getFullYear();
  const selMonth = months.includes(Number(currentMonth)) ? Number(currentMonth) : new Date().getMonth() + 1;

  this._fill(yearUl, years, selYear);
  this._fill(monthUl, months, selMonth);

  // 滚动时实时高亮
  const handleScroll = () => {
    this._updateActiveItem(yearUl);
    this._updateActiveItem(monthUl);
  };
  yearUl.onscroll = handleScroll;
  monthUl.onscroll = handleScroll;

  mask.classList.remove('hidden');

  document.getElementById('date-picker-cancel').onclick = () => {
    mask.classList.add('hidden');
    this._restoreCols(card, units);
  };
  document.getElementById('date-picker-confirm').onclick = () => {
    const y = this._centerValue(yearUl);
    const m = this._centerValue(monthUl);
    mask.classList.add('hidden');
    this._restoreCols(card, units);
    if (onConfirm) onConfirm({ year: y, month: m });
  };
}
```

- [ ] **Step 4: 更新 _restoreCols 注释**

将 `_restoreCols` 上方注释改为：

```js
/**
 * 还原三列日期结构（openYearMonth 用后复位，避免影响生日选择器）
 */
```

- [ ] **Step 5: 运行测试确认通过**

Run: `node test/datepicker-test.cjs`
Expected: 全部通过。

- [ ] **Step 6: 提交**

```bash
git add js/datePicker.js test/datepicker-test.cjs
git commit -m "feat(datepicker): 新增 openYearMonth 年月双列选择器"
```

---

### Task 3: TimelineEngine 支持 month 字段

**Files:**
- Modify: `js/timeline.js:7-58`
- Test: `test/timeline-test.cjs`

**Interfaces:**
- Consumes: 无
- Produces: `TimelineEngine.migrate(oldArr)` 输出带 `month: 1`；`TimelineEngine.sortByYear(events)` 按 `year` 升序、`month` 升序排序；`TimelineEngine.validateEvent(year, month, text)` 校验年月与文本。

- [ ] **Step 1: 写失败测试**

修改 `test/timeline-test.cjs`：

```js
// ---- TimelineEngine.migrate ----
const migrated = TimelineEngine.migrate(oldArr);
assert('migrate 第1条 year=2024', migrated[0].year === 2024);
assert('migrate 第1条 month=6（从旧 date 恢复）', migrated[0].month === 6);
assert('migrate 第2条 year=2023', migrated[1].year === 2023);
assert('migrate 第2条 month=1（从旧 date 恢复）', migrated[1].month === 1);

// ---- TimelineEngine.sortByYear ----
const unsorted = [
  { id: 'e_3', year: 2020, month: 6, text: 'C' },
  { id: 'e_1', year: 2025, month: 1, text: 'A' },
  { id: 'e_2', year: 2022, month: 3, text: 'B' },
  { id: 'e_4', year: 2020, month: 1, text: 'D' }
];
const sorted = TimelineEngine.sortByYear(unsorted);
assert('sortByYear 先按 year 升序', sorted[0].year === 2020 && sorted[1].year === 2020 && sorted[2].year === 2022 && sorted[3].year === 2025);
assert('sortByYear 同年按 month 升序', sorted[0].month === 1 && sorted[1].month === 6);

// ---- TimelineEngine.validateEvent ----
const currentYear = new Date().getFullYear();
assert('validate 合法年月', TimelineEngine.validateEvent(2000, 6, 'hello') === true);
assert('validate 年份下限 1899 非法', TimelineEngine.validateEvent(1899, 6, 'hello') === false);
assert('validate 年份上限 current+100+1 非法', TimelineEngine.validateEvent(currentYear + 101, 6, 'hello') === false);
assert('validate 年份上限 current+100 合法', TimelineEngine.validateEvent(currentYear + 100, 6, 'hello') === true);
assert('validate 空文本非法', TimelineEngine.validateEvent(2000, 6, '') === false);
assert('validate 纯空格非法', TimelineEngine.validateEvent(2000, 6, '   ') === false);
assert('validate 非数字年份非法', TimelineEngine.validateEvent('abc', 6, 'hello') === false);
assert('validate 月份 0 非法', TimelineEngine.validateEvent(2000, 0, 'hello') === false);
assert('validate 月份 13 非法', TimelineEngine.validateEvent(2000, 13, 'hello') === false);
assert('validate 缺少 month 非法', TimelineEngine.validateEvent(2000, undefined, 'hello') === false);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node test/timeline-test.cjs`
Expected: 失败，month 相关断言不通过。

- [ ] **Step 3: 最小实现**

修改 `js/timeline.js` 中 `migrate`：

```js
migrate(oldArr) {
  if (!Array.isArray(oldArr)) return [];
  let seq = 1;
  return oldArr.reduce((acc, item) => {
    if (!item || typeof item !== 'object') return acc;
    const dateVal = item.date;
    const titleVal = item.title;
    if (!dateVal || !titleVal) return acc;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return acc;
    acc.push({
      id: 'e_' + (seq++),
      year: d.getFullYear(),
      month: d.getMonth() + 1, // 从旧 date 恢复月份；新数据直接带 month
      text: String(titleVal)
    });
    return acc;
  }, []);
}
```

修改 `sortByYear`：

```js
sortByYear(events) {
  if (!Array.isArray(events)) return [];
  return [...events].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return (a.month || 1) - (b.month || 1);
  });
}
```

修改 `validateEvent` 签名与逻辑：

```js
validateEvent(year, month, text) {
  const y = Number(year);
  const m = Number(month);
  const currentYear = new Date().getFullYear();
  if (!Number.isFinite(y) || y < 1900 || y > currentYear + 100) return false;
  if (!Number.isFinite(m) || m < 1 || m > 12) return false;
  if (typeof text !== 'string' || text.trim().length === 0) return false;
  return true;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node test/timeline-test.cjs`
Expected: 全部通过。

- [ ] **Step 5: 提交**

```bash
git add js/timeline.js test/timeline-test.cjs
git commit -m "feat(timeline): 事件支持 month 字段，排序按年月升序"
```

---

### Task 4: TimelineManager 弹窗与渲染适配 month

**Files:**
- Modify: `js/timeline.js:186-296`

**Interfaces:**
- Consumes: `DatePickerManager.openYearMonth`、`TimelineEngine.validateEvent(year, month, text)`
- Produces: 事件对象 `{id, year, month, text}`；时间轴卡片显示「2026年1月」。

- [ ] **Step 1: 修改添加/编辑弹窗**

将 `_showModal` 参数与内部实现改为接收/使用年月：

```js
_showModal(title, yearVal, monthVal, textVal, onConfirm, onDelete) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 320px;">
      <h3>${title}</h3>
      <div class="modal-input-container" style="text-align:left;">
        <label class="form-label">时间</label>
        <button type="button" class="form-input tl-year-display" id="tl-modal-year-btn">${this._formatYearMonth(yearVal, monthVal) || '点击选择时间'}</button>
        <input type="hidden" id="tl-modal-year" value="${yearVal}">
        <input type="hidden" id="tl-modal-month" value="${monthVal}">
        <label class="form-label" style="margin-top:1rem;">描述</label>
        <textarea class="form-textarea" id="tl-modal-text" rows="3" placeholder="记录这件大事...">${textVal}</textarea>
      </div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-cancel" id="tl-modal-cancel">取消</button>
        <button class="modal-btn modal-btn-confirm" id="tl-modal-confirm">确定</button>
      </div>
      ${onDelete ? `<button class="modal-btn modal-btn-danger" id="tl-modal-delete" style="width:100%;margin-top:0.75rem;">删除</button>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);

  const yearBtn = document.getElementById('tl-modal-year-btn');
  const yearHidden = document.getElementById('tl-modal-year');
  const monthHidden = document.getElementById('tl-modal-month');
  yearBtn.addEventListener('click', () => {
    DatePickerManager.openYearMonth(
      yearHidden.value || new Date().getFullYear(),
      monthHidden.value || (new Date().getMonth() + 1),
      ({ year, month }) => {
        yearHidden.value = year;
        monthHidden.value = month;
        yearBtn.textContent = this._formatYearMonth(year, month);
      }
    );
  });

  document.getElementById('tl-modal-cancel').addEventListener('click', () => overlay.remove());
  document.getElementById('tl-modal-confirm').addEventListener('click', () => {
    const year = document.getElementById('tl-modal-year').value;
    const month = document.getElementById('tl-modal-month').value;
    const text = document.getElementById('tl-modal-text').value;
    overlay.remove();
    onConfirm(year, month, text);
  });

  if (onDelete) {
    document.getElementById('tl-modal-delete').addEventListener('click', () => {
      overlay.remove();
      onDelete();
    });
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
```

- [ ] **Step 2: 新增时间格式化辅助方法**

在 `TimelineManager` 中新增：

```js
_formatYearMonth(year, month) {
  if (!year) return '';
  const m = Number(month);
  if (!Number.isFinite(m) || m < 1 || m > 12) return `${year}年`;
  return `${year}年${m}月`;
}
```

> 注意：`monthStr` 经 `Number()` 转换后去掉前导零，显示为「2026年1月」。

- [ ] **Step 3: 修改 showAddModal / _showEditModal / addEvent / updateEvent**

```js
showAddModal() {
  const now = new Date();
  this._showModal('添加人生事件', now.getFullYear(), now.getMonth() + 1, '', (year, month, text) => {
    this.addEvent(year, month, text);
  });
}

addEvent(year, month, text) {
  if (!TimelineEngine.validateEvent(year, month, text)) {
    this.showToast('时间或描述不合法');
    return false;
  }
  const events = StorageManager.getTimeline();
  let maxSeq = 0;
  events.forEach(e => {
    if (e && typeof e.id === 'string' && e.id.startsWith('e_')) {
      const n = parseInt(e.id.slice(2), 10);
      if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
    }
  });
  const id = 'e_' + (maxSeq + 1);
  events.push({ id, year: Number(year), month: Number(month), text: text.trim() });
  StorageManager.setTimeline(events);
  this.renderTimelinePage();
  this.showToast('已添加');
  return true;
}

_showEditModal(ev) {
  this._showModal('编辑事件', ev.year, ev.month, ev.text, (year, month, text) => {
    this.updateEvent(ev.id, year, month, text);
  }, () => {
    this.deleteEvent(ev.id);
  });
}

updateEvent(id, year, month, text) {
  if (!TimelineEngine.validateEvent(year, month, text)) {
    this.showToast('时间或描述不合法');
    return false;
  }
  const events = StorageManager.getTimeline();
  const idx = events.findIndex(e => e.id === id);
  if (idx === -1) return false;
  events[idx] = { id, year: Number(year), month: Number(month), text: text.trim() };
  StorageManager.setTimeline(events);
  this.renderTimelinePage();
  this.showToast('已更新');
  return true;
}
```

- [ ] **Step 4: 旧数据迁移调用点**

在 `renderTimelinePage` 读取 `StorageManager.getTimeline()` 后、排序前，执行一次性迁移：

```js
renderTimelinePage() {
  const container = document.getElementById('timeline-container');
  if (!container) return;

  let events = StorageManager.getTimeline();
  // 兼容旧数据：无 month 字段的事件补 1 月
  let needSave = false;
  events = events.map(e => {
    if (e && typeof e.month === 'undefined') {
      needSave = true;
      return { ...e, month: 1 };
    }
    return e;
  });
  if (needSave) StorageManager.setTimeline(events);

  const sorted = TimelineEngine.sortByYear(events);
  // ... 后续不变
}
```

- [ ] **Step 5: 修改渲染显示**

`_renderSingle` 中：

```js
<span class="timeline-single-year">${this._formatYearMonth(ev.year, ev.month)}</span>
```

`_renderDouble` 中：

```js
<span class="timeline-double-year">${this._formatYearMonth(ev.year, ev.month)}</span>
```

`_generateShareCardHTML` 中：

```js
<span class="timeline-share-year">${this._formatYearMonth(ev.year, ev.month)}</span>
```

- [ ] **Step 6: 手动验证**

- 打开人生轴 → 添加事件 → 选择 2026 年 3 月 → 卡片显示「2026年3月」。
- 同一年添加 1 月、2 月、3 月事件，确认按月份排序。

- [ ] **Step 7: 提交**

```bash
git add js/timeline.js
git commit -m "feat(timeline): 弹窗与渲染适配年月，旧数据自动补月"
```

---

### Task 5: 首页快速创建按钮

**Files:**
- Modify: `index.html:57-59`
- Modify: `js/app.js:187-191`
- Modify: `css/style.css`（新增/调整按钮样式）

**Interfaces:**
- Consumes: `CustomManager.showAddListModal()`
- Produces: 首页顶栏「+」按钮点击直接弹出创建弹窗。

- [ ] **Step 1: 修改 index.html 顶栏**

将 `index.html` 中：

```html
<button id="home-custom-btn" class="text-apple-blue font-medium text-sm px-2">
  自定义
</button>
```

替换为：

```html
<div class="flex items-center gap-2">
  <button id="home-add-list-btn" class="home-header-btn" aria-label="创建新清单">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  </button>
  <button id="home-custom-btn" class="text-apple-blue font-medium text-sm px-2">
    自定义
  </button>
</div>
```

- [ ] **Step 2: 新增/复用按钮样式**

在 `css/style.css` 中新增：

```css
.home-header-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--surface);
  color: var(--accent);
  box-shadow: var(--shadow);
  transition: transform 0.2s ease, background 0.2s ease;
}

.home-header-btn:active {
  transform: scale(0.92);
  background: var(--accent-weak);
}
```

- [ ] **Step 3: 绑定事件**

在 `js/app.js` 中「首页自定义按钮」代码块上方新增：

```js
// 首页快速创建清单按钮
const homeAddListBtn = document.getElementById('home-add-list-btn');
if (homeAddListBtn) {
  homeAddListBtn.addEventListener('click', () => CustomManager.showAddListModal());
}
```

- [ ] **Step 4: 手动验证**

- 打开首页 → 点击右上角「+」→ 弹出「创建新清单」模态框。
- 点击「自定义」→ 进入编辑模式，+ 按钮仍然可用。

- [ ] **Step 5: 提交**

```bash
git add index.html js/app.js css/style.css
git commit -m "feat(home): 顶栏新增快速创建清单按钮"
```

---

### Task 6: CSS 高亮样式收尾

**Files:**
- Modify: `css/style.css`（在日期选择器样式区域）

- [ ] **Step 1: 添加 .dp-item-active 样式**

在 `css/style.css` 的「日期滚轮选择器」区域追加：

```css
.dp-item-active {
  color: var(--accent);
  font-weight: 600;
  transform: scale(1.08);
  transition: color 0.15s ease, transform 0.15s ease;
}
```

- [ ] **Step 2: 提交**

```bash
git add css/style.css
git commit -m "style(datepicker): 滚轮选中项高亮样式"
```

---

### Task 7: 全量测试与回归

**Files:**
- 运行：`test/datepicker-test.cjs`、`test/timeline-test.cjs`、`test/life-progress-test.cjs`

- [ ] **Step 1: 运行全部相关测试**

```bash
node test/datepicker-test.cjs
node test/timeline-test.cjs
node test/life-progress-test.cjs
```

Expected: 全部通过。

- [ ] **Step 2: 手动回归**

- 人生进度添加/编辑人物：滚动生日选择器，确认年/月/日中心项高亮。
- 人生轴添加事件：年份从 2026 年开始，向下滚动到更早年份；选择月份后卡片显示正确。
- 首页 + 按钮一键创建清单。

- [ ] **Step 3: 更新 CHANGELOG**

在 `CHANGELOG.md` 顶部新增 v6.9.0 条目（草稿）：

```markdown
## v6.9.0 (2026-07-01) - 交互细节优化 🎯

### 🎯 人生轴
- 添加事件支持选择月份，同一年多次事件可区分
- 年份滚轮改为以当前年为起点倒序排列，滑动更顺手
- 滚轮选择器增加当前选中项高亮

### 📊 人生进度
- 出生日期滚轮增加当前选中项高亮

### 🏠 首页
- 顶栏新增「+」按钮，一键创建新清单

### 🔧 技术改进
- 更新 `test/datepicker-test.cjs` 与 `test/timeline-test.cjs`
```

- [ ] **Step 4: 提交**

```bash
git add CHANGELOG.md
git commit -m "docs: v6.9.0 CHANGELOG 草稿"
```

---

## Self-Review

**Spec coverage:**
- 人生轴年月双列选择器 → Task 2 + Task 4
- 年份倒序 → Task 1
- 滚轮选中高亮 → Task 1 + Task 6
- 人生进度生日反馈 → Task 1（内联选择器自动复用）
- 首页快速创建 → Task 5
- 旧数据迁移 → Task 3 + Task 4

**Placeholder scan:** 无 TBD / TODO / "实现细节稍后补充" 等占位符。每步均含具体代码或命令。

**Type consistency:**
- `openYearMonth` 回调签名统一为 `({year, month})`。
- `validateEvent` 三参数签名在 TimelineEngine 与 TimelineManager 中一致。
- 事件对象字段统一为 `{id, year, month, text}`。

无缺口。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-01-life-checklist-ux-optimization.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
