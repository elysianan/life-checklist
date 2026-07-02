# 人生已完成清单 v6.10.0 体验优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复用户反馈的 13 条交互与功能问题，覆盖「我的」页、首页、人生清单、任务详情、人生轴、分享与图片生成。

**Architecture:** 在现有 HTML + Tailwind CSS + 原生 JS 架构上做局部修复，不引入新依赖；按模块拆分任务，每个任务独立可测、可提交。

**Tech Stack:** 原生 JavaScript / CSS / Tailwind CDN / html2canvas CDN / 基于 `vm` 的 Node 单元测试。

## Global Constraints

- 不新增外部依赖。
- 所有数据层改动必须附带单元测试，TDD 推进。
- 代码注释使用中文。
- 保持 v6.9.0 已统一的视觉风格（`--accent`、`--surface`、`--text`、`--text-2`、`--radius`、`--shadow`）。
- 每次任务完成后独立提交（frequent commits）。
- 不写向后兼容代码；旧数据只做一次性迁移。

---

## File Structure

| 文件 | 当前职责 | 本次改动 |
|---|---|---|
| `index.html` | 页面结构 | 删除我的页箭头；删除首页「总任务」统计列；确认 html2canvas 已引入 |
| `css/style.css` | 全局样式 | 删除角标左侧外边定位；任务详情弹窗滚动；图片/lightbox 样式；人生轴双侧布局；我的页成就点击反馈 |
| `js/storage.js` | 本地存储 | 新增自定义格言存取；新增人生轴 v6.10.0 迁移标记 |
| `js/profile.js` | 我的页渲染 | 最近成就点击跳转成就墙；空成就 toast |
| `js/app.js` | 首页交互、清单详情 | 自定义格言弹窗；首页统计两列；清单标签 toggle 修复；自定义模式拖动修复 |
| `js/taskDetail.js` | 任务详情弹窗 | 照片上限 10MB；弹窗内容滚动；大图 lightbox |
| `js/datePicker.js` | 日期滚轮选择器 | 人生轴选择器扩展为年月日三列（复用 `open()`） |
| `js/timeline.js` | 人生轴数据与渲染 | 事件对象支持 `day`；迁移旧数据；排序/显示/弹窗调整；双侧布局交错修复 |
| `js/share.js` | 分享与截图 | 修复清单详情图片生成；补全余生闹钟分享（保存/复制/系统分享） |
| `js/lifeClock.js` | 余生闹钟 | 分享按钮绑定新的分享弹窗 |
| `test/timeline-test.cjs` | 人生轴测试 | 补充 `day` 字段排序、迁移、日期校验测试 |
| `test/datepicker-test.cjs` | 日期选择器测试 | 补充三列日期选择相关测试 |
| `test/share-test.cjs` | 新增 | 分享文案生成与 html2canvas 降级逻辑测试 |

---

### Task 1: 「我的」页 — 删除箭头 + 成就点击跳转

**Files:**
- Modify: `index.html`
- Modify: `js/profile.js`
- Modify: `css/style.css`

**Interfaces:**
- Consumes: `StorageManager.getUnlockedAchievements()`, `showView('achievements')`, `ProfileManager.showToast()`
- Produces: 我的页无功能箭头删除；最近成就预览点击可跳转成就墙。

- [ ] **Step 1: 删除「人生探索者」右侧箭头**

在 `index.html` 中找到：

```html
<div class="profile-user-arrow">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
</div>
```

直接删除该 `div`。

- [ ] **Step 2: 清理箭头相关 CSS**

在 `css/style.css` 中搜索 `.profile-user-arrow`，若存在则删除整个规则。

- [ ] **Step 3: 为最近成就预览绑定点击事件**

修改 `js/profile.js` 的 `renderAchievementPreview` 方法，在渲染完成后给容器绑定点击事件：

```js
renderAchievementPreview() {
  const container = document.getElementById('profile-achievements-preview');
  if (!container) return;

  const unlockedIds = StorageManager.getUnlockedAchievements();
  const recentAchievements = ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id)).slice(0, 4);

  container.innerHTML = '';

  if (recentAchievements.length === 0) {
    container.innerHTML = `
      <div class="empty-achievements">
        <span class="empty-emoji">🔒</span>
        <p>完成任务解锁成就</p>
      </div>
    `;
  } else {
    recentAchievements.forEach(achievement => {
      const badge = document.createElement('div');
      badge.className = 'achievement-preview-badge';
      badge.innerHTML = `<span class="preview-emoji">${achievement.emoji}</span>`;
      badge.title = achievement.title;
      container.appendChild(badge);
    });
  }

  // 点击最近成就跳转成就墙
  container.style.cursor = 'pointer';
  container.onclick = () => {
    const unlocked = StorageManager.getUnlockedAchievements();
    if (unlocked.length === 0) {
      this.showToast('还没有解锁成就，去完成几个任务吧');
    } else {
      showView('achievements');
    }
  };
}
```

- [ ] **Step 4: 添加点击反馈样式**

在 `css/style.css` 中添加：

```css
#profile-achievements-preview:active {
  transform: scale(0.98);
  opacity: 0.9;
}
```

- [ ] **Step 5: 浏览器验证**

- 打开「我的」页，确认「人生探索者」右侧箭头已消失。
- 已解锁成就时点击最近成就，跳转成就墙。
- 未解锁成就时点击，toast 提示「还没有解锁成就，去完成几个任务吧」。

- [ ] **Step 6: 提交**

```bash
git add index.html css/style.css js/profile.js
git commit -m "feat(profile): 删除无功能箭头，最近成就点击跳转成就墙"
```

---

### Task 2: 首页 — 今日格言自定义编辑

**Files:**
- Modify: `js/storage.js`
- Modify: `js/app.js`
- Modify: `css/style.css`

**Interfaces:**
- Consumes: `StorageManager.getCustomQuote()` / `setCustomQuote()` / `clearCustomQuote()`
- Produces: 点击首页格言卡片可编辑/保存/恢复默认。

- [ ] **Step 1: 写失败测试**

创建/修改 `test/storage-test.cjs`（若不存在则新建），测试自定义格言存取：

```js
// test/storage-test.cjs 末尾追加
assert('自定义格言默认空', StorageManager.getCustomQuote() === null);
StorageManager.setCustomQuote({ text: '测试格言', author: '测试作者' });
const q = StorageManager.getCustomQuote();
assert('自定义格言可保存', q && q.text === '测试格言' && q.author === '测试作者');
StorageManager.clearCustomQuote();
assert('自定义格言可清空', StorageManager.getCustomQuote() === null);
```

运行：

```bash
node test/storage-test.cjs
```

Expected: 失败，提示 `getCustomQuote` 未定义。

- [ ] **Step 2: 在 StorageManager 中添加自定义格言方法**

在 `js/storage.js` 的 `KEYS` 中新增：

```js
CUSTOM_QUOTE: 'life_checklist_custom_quote'
```

在 `StorageManager` 中添加：

```js
getCustomQuote() {
  const data = localStorage.getItem(this.KEYS.CUSTOM_QUOTE);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
},

setCustomQuote(quote) {
  localStorage.setItem(this.KEYS.CUSTOM_QUOTE, JSON.stringify(quote));
},

clearCustomQuote() {
  localStorage.removeItem(this.KEYS.CUSTOM_QUOTE);
}
```

- [ ] **Step 3: 运行测试确认通过**

```bash
node test/storage-test.cjs
```

Expected: 全部通过。

- [ ] **Step 4: 修改首页格言渲染逻辑**

在 `js/app.js` 中修改 `updateDailyQuote`：

```js
function updateDailyQuote() {
  const quoteElement = document.getElementById('daily-quote');
  const authorElement = document.querySelector('.quote-author');

  const custom = StorageManager.getCustomQuote();
  let quote;
  if (custom && custom.text && custom.text.trim()) {
    quote = custom;
  } else {
    const today = new Date();
    const dayIndex = today.getDate() % QUOTES.length;
    quote = QUOTES[dayIndex];
  }

  if (quoteElement) quoteElement.textContent = quote.text;
  if (authorElement) authorElement.textContent = '— ' + (quote.author || '佚名');
}
```

- [ ] **Step 5: 绑定格言卡片点击事件并创建编辑弹窗**

在 `js/app.js` 的 `bindEvents` 函数末尾添加：

```js
// 首页格言卡片点击编辑
const quoteCard = document.querySelector('.quote-card');
if (quoteCard) {
  quoteCard.style.cursor = 'pointer';
  quoteCard.addEventListener('click', () => showQuoteEditModal());
}
```

在 `js/app.js` 中添加新函数：

```js
function showQuoteEditModal() {
  const custom = StorageManager.getCustomQuote();
  const defaultText = custom ? custom.text : '';
  const defaultAuthor = custom ? custom.author : '';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 320px;">
      <h3>编辑今日格言</h3>
      <div class="modal-input-container" style="text-align:left;">
        <label class="form-label">格言</label>
        <textarea id="quote-text" class="form-textarea" rows="3" placeholder="输入你想看到的格言...">${defaultText}</textarea>
        <label class="form-label" style="margin-top:1rem;">作者</label>
        <input type="text" id="quote-author" class="form-input" placeholder="作者（可选）" value="${defaultAuthor}">
      </div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-cancel" id="quote-cancel">取消</button>
        <button class="modal-btn modal-btn-danger" id="quote-reset">恢复默认</button>
        <button class="modal-btn modal-btn-confirm" id="quote-save">保存</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('quote-cancel').addEventListener('click', () => overlay.remove());
  document.getElementById('quote-reset').addEventListener('click', () => {
    StorageManager.clearCustomQuote();
    updateDailyQuote();
    overlay.remove();
    showToast('已恢复默认格言');
  });
  document.getElementById('quote-save').addEventListener('click', () => {
    const text = document.getElementById('quote-text').value.trim();
    if (!text) {
      showToast('格言内容不能为空');
      return;
    }
    const author = document.getElementById('quote-author').value.trim();
    StorageManager.setCustomQuote({ text, author });
    updateDailyQuote();
    overlay.remove();
    showToast('格言已保存 ✅');
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
```

注意：`showToast` 在 `js/app.js` 中可能未定义。若未定义，使用 `ProfileManager.showToast` 或新增一个轻量 `showToast`：

```js
function showToast(message) {
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
```

- [ ] **Step 6: 添加格言卡片点击反馈样式**

在 `css/style.css` 中添加：

```css
.quote-card {
  cursor: pointer;
  transition: transform 0.15s ease;
}
.quote-card:active {
  transform: scale(0.98);
}
```

- [ ] **Step 7: 浏览器验证**

- 点击首页格言卡片，弹出编辑框。
- 修改内容保存后，首页格言立即更新。
- 点击「恢复默认」后，格言恢复为随机池内容。
- 空内容保存时提示不能为空。

- [ ] **Step 8: 提交**

```bash
git add js/storage.js js/app.js css/style.css test/storage-test.cjs
git commit -m "feat(home): 今日格言支持自定义编辑"
```

---

### Task 3: 首页 — 删除「总任务」统计

**Files:**
- Modify: `index.html`
- Modify: `js/app.js`

**Interfaces:**
- Consumes: 无
- Produces: 首页清单统计只显示「总清单」和「已完成」两列。

- [ ] **Step 1: 修改 index.html 结构**

找到 `#home-view` 中的 `.lists-overview`：

```html
<div class="lists-overview">
  <div class="lists-overview-item">
    <span class="lists-overview-value" id="lists-total">0</span>
    <span class="lists-overview-label">总清单</span>
  </div>
  <div class="lists-overview-divider"></div>
  <div class="lists-overview-item">
    <span class="lists-overview-value" id="lists-completed">0</span>
    <span class="lists-overview-label">已完成</span>
  </div>
  <div class="lists-overview-divider"></div>
  <div class="lists-overview-item">
    <span class="lists-overview-value" id="lists-tasks">0</span>
    <span class="lists-overview-label">总任务</span>
  </div>
</div>
```

删除「总任务」列及中间多余分隔线，改为：

```html
<div class="lists-overview">
  <div class="lists-overview-item">
    <span class="lists-overview-value" id="lists-total">0</span>
    <span class="lists-overview-label">总清单</span>
  </div>
  <div class="lists-overview-divider"></div>
  <div class="lists-overview-item">
    <span class="lists-overview-value" id="lists-completed">0</span>
    <span class="lists-overview-label">已完成</span>
  </div>
</div>
```

- [ ] **Step 2: 清理废弃的 lists-view 统计**

`#lists-view` 中也有同名 `.lists-overview`，由于该视图已隐藏不用，可直接删除整个 `#lists-view` 内的统计 section 或仅删除其「总任务」列。推荐仅删除「总任务」列保持最小改动。

- [ ] **Step 3: 修改 updateListsOverview**

在 `js/app.js` 中修改 `updateListsOverview`：

```js
function updateListsOverview() {
  const lists = AppState.lists;
  const totalLists = lists.length;
  const completedLists = lists.filter(l => {
    const progress = StorageManager.calculateListProgress(l);
    return progress.percentage === 100;
  }).length;

  const elTotal = document.getElementById('lists-total');
  const elCompleted = document.getElementById('lists-completed');
  const elCount = document.getElementById('lists-count');
  if (elTotal) elTotal.textContent = totalLists;
  if (elCompleted) elCompleted.textContent = completedLists;
  if (elCount) elCount.textContent = `共 ${totalLists} 个清单`;
}
```

- [ ] **Step 4: 调整两列样式**

在 `css/style.css` 中添加或修改：

```css
.lists-overview-item {
  flex: 1;
  text-align: center;
}
```

确保 `.lists-overview` 使用 `display: flex; justify-content: space-around;` 或类似布局。

- [ ] **Step 5: 浏览器验证**

- 首页统计只显示「总清单」和「已完成」。
- 添加/完成清单后两列数字同步更新。

- [ ] **Step 6: 提交**

```bash
git add index.html js/app.js css/style.css
git commit -m "feat(home): 首页统计删除总任务，只保留总清单和已完成"
```

---

### Task 4: 清单详情 — 短按 toggle 可取消

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `StorageManager.updateTaskStatus()`, `applyTaskToggleEffects()`
- Produces: 清单详情页任务标签短按可在完成/未完成间切换。

- [ ] **Step 1: 分析当前 bug**

当前 `bindTagTapLongPress` 的闭包变量 `currentCompleted` 在标签创建时固定，toggle 后虽然 DOM 样式更新，但闭包中的值未更新，导致第二次短按仍然使用旧状态。

- [ ] **Step 2: 修复 toggle 逻辑**

在 `js/app.js` 中修改 `bindTagTapLongPress` 的 `onEnd`：

```js
function onEnd() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  // 若长按未触发，视为轻点打卡/取消
  if (!longPressFired) {
    // 从当前 DOM 或数据读取最新状态，避免闭包变量过期
    const list = AppState.lists.find(l => l.id === listId);
    const task = list ? list.tasks.find(t => t.id === taskId) : null;
    const currentlyCompleted = task ? task.completed : false;
    const newCompleted = !currentlyCompleted;
    applyTaskToggleEffects(listId, taskId, newCompleted, tag);
  }
}
```

- [ ] **Step 3: 浏览器验证**

- 进入清单详情，短按未完成任务 → 完成（变色 + 百分比上升）。
- 再次短按同一任务 → 取消完成（颜色恢复 + 百分比下降）。
- 长按仍然打开任务详情弹窗。

- [ ] **Step 4: 提交**

```bash
git add js/app.js
git commit -m "fix(detail): 任务标签短按支持完成/取消切换"
```

---

### Task 5: 自定义模式 — 修复拖动排序

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `DragSortManager` 事件绑定
- Produces: 自定义编辑模式下长按可拖动已创建清单。

- [ ] **Step 1: 解除自定义模式对拖动的禁用**

在 `js/app.js` 的 `DragSortManager` 中：

```js
_onTouchStart(e) {
  // 自定义模式下允许拖动；点击删除角标时不触发
  const card = e.target.closest('.home-list-card');
  if (!card || e.target.closest('.home-list-card-delete')) return;
  const touch = e.touches[0];
  this._startDrag(card, touch.clientX, touch.clientY);
}

_onMouseDown(e) {
  const card = e.target.closest('.home-list-card');
  if (!card || e.target.closest('.home-list-card-delete')) return;
  this._startDrag(card, e.clientX, e.clientY);
}
```

删除或修改原有的 `if (AppState.isEditing) return;` 检查。

- [ ] **Step 2: 浏览器验证**

- 点击首页右上角「自定义」进入编辑模式。
- 长按某清单卡片 ≈500ms，卡片浮起，可拖动换位。
- 松手后顺序持久化，退出编辑模式后顺序不变。
- 点击删除角标可删除清单，不误触发拖动。

- [ ] **Step 3: 提交**

```bash
git add js/app.js
git commit -m "fix(home): 自定义模式下支持长按拖动排序"
```

---

### Task 6: 自定义模式 — 修复删除角标遮挡

**Files:**
- Modify: `css/style.css`
- Modify: `js/app.js`（如需要）

**Interfaces:**
- Consumes: 无
- Produces: 删除角标位于卡片左侧外边，不遮挡右上角内容。

- [ ] **Step 1: 调整删除角标位置**

在 `css/style.css` 中修改 `.home-list-card-delete`：

```css
.home-list-card-delete {
  display: none;
  position: absolute;
  top: 50%;
  left: -10px;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--danger);
  color: white;
  border: 2px solid var(--surface);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  z-index: 2;
  box-shadow: 0 2px 6px rgba(255, 59, 48, 0.4);
}
```

- [ ] **Step 2: 为卡片左侧留出空间**

修改 `.home-list-card` 或 `.home-list-card-inner` 的左边距，确保左侧角标不超出可视区域。在 `css/style.css` 中：

```css
.home-list-card {
  margin-left: 12px; /* 为左侧删除角标留出空间 */
}
```

- [ ] **Step 3: 浏览器验证**

- 进入自定义模式，删除角标显示在卡片左侧中央。
- 角标不与右上角百分比/小圆点重叠。
- 深色模式下边框颜色正确。

- [ ] **Step 4: 提交**

```bash
git add css/style.css
git commit -m "style(home): 自定义模式删除角标移至左侧外边，避免遮挡"
```

---

### Task 7: 任务详情 — 照片上限 + 滚动 + Lightbox

**Files:**
- Modify: `js/taskDetail.js`
- Modify: `css/style.css`

**Interfaces:**
- Consumes: `FileReader`, `localStorage`
- Produces: 单张照片上限 10MB；弹窗内容可滚动；底部按钮固定；点击照片可全屏查看。

- [ ] **Step 1: 放宽照片上限**

在 `js/taskDetail.js` 中修改 `handlePhotoUpload`：

```js
handlePhotoUpload(event, listId, taskId) {
  const file = event.target.files[0];
  if (!file) return;

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    this.showToast('照片大小不能超过 10MB');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const photoData = e.target.result;
    this.saveTaskPhoto(listId, taskId, photoData);
  };
  reader.readAsDataURL(file);
}
```

- [ ] **Step 2: 让弹窗内容可滚动、底部按钮固定**

在 `css/style.css` 中添加/修改：

```css
.task-detail-modal {
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.task-detail-modal > *:not(.task-detail-actions) {
  overflow-y: auto;
}

.task-detail-actions {
  flex-shrink: 0;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  background: var(--surface);
}
```

- [ ] **Step 3: 限制弹窗内图片高度并添加点击放大**

修改 `js/taskDetail.js` 中照片预览部分：

```html
<div class="task-photo-preview">
  <img src="${task.photo}" alt="完成照片" onclick="TaskDetailManager.openPhotoLightbox('${task.photo}')">
  <button class="task-photo-remove" onclick="TaskDetailManager.removePhoto('${listId}', '${taskId}')">✕</button>
</div>
```

在 `TaskDetailManager` 中添加：

```js
openPhotoLightbox(photoSrc) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay photo-lightbox-overlay';
  overlay.innerHTML = `
    <div class="photo-lightbox-content">
      <img src="${photoSrc}" alt="完成照片">
      <button class="photo-lightbox-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
```

- [ ] **Step 4: 添加 lightbox 样式**

在 `css/style.css` 中添加：

```css
.task-photo-preview img {
  max-height: 240px;
  width: 100%;
  object-fit: cover;
  border-radius: 12px;
  cursor: zoom-in;
}

.photo-lightbox-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
}

.photo-lightbox-content {
  position: relative;
  max-width: 95vw;
  max-height: 90vh;
  overflow: auto;
}

.photo-lightbox-content img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
}

.photo-lightbox-close {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  font-size: 18px;
  cursor: pointer;
}
```

- [ ] **Step 5: 浏览器验证**

- 上传 10MB 以内照片成功。
- 上传 10MB 以上照片提示「照片大小不能超过 10MB」。
- 添加大尺寸照片后，任务详情弹窗可上下滚动，底部「删除任务」「保存」按钮始终可见。
- 点击照片打开全屏 lightbox，可关闭。

- [ ] **Step 6: 提交**

```bash
git add js/taskDetail.js css/style.css
git commit -m "feat(task-detail): 照片上限提到 10MB，弹窗可滚动，支持大图 lightbox"
```

---

### Task 8: 人生轴 — day 字段数据层与测试

**Files:**
- Modify: `js/timeline.js`
- Modify: `js/storage.js`
- Modify: `test/timeline-test.cjs`

**Interfaces:**
- Consumes: `localStorage`
- Produces: `TimelineEngine` 支持 `day` 字段；`validateEvent` 升级为 `validateDate`；新增 v6.10.0 迁移标记。

- [ ] **Step 1: 写失败测试**

修改 `test/timeline-test.cjs`，在现有断言后追加：

```js
// ---- day 字段迁移 ----
const oldMonthOnly = [
  { id: 'e_1', year: 2024, month: 6, text: 'A' },
  { id: 'e_2', year: 2023, month: 1, text: 'B' }
];
const withDay = oldMonthOnly.map(e => ({ ...e, day: 1 }));
// 测试运行时通过 TimelineManager 渲染触发迁移，这里直接测试 sortByYear
const daySorted = TimelineEngine.sortByYear([
  { id: 'e_1', year: 2024, month: 6, day: 15, text: 'A' },
  { id: 'e_2', year: 2024, month: 6, day: 1, text: 'B' },
  { id: 'e_3', year: 2024, month: 5, day: 20, text: 'C' }
]);
assert('sortByYear 同年同月按 day 升序', daySorted[0].day === 20 && daySorted[1].day === 1 && daySorted[2].day === 15);

// ---- validateDate ----
assert('validateDate 合法年月日', TimelineEngine.validateDate(2000, 6, 15, 'hello') === true);
assert('validateDate 闰年 2-29 合法', TimelineEngine.validateDate(2024, 2, 29, 'hello') === true);
assert('validateDate 非闰年 2-29 非法', TimelineEngine.validateDate(2023, 2, 29, 'hello') === false);
assert('validateDate 4-31 非法', TimelineEngine.validateDate(2023, 4, 31, 'hello') === false);
assert('validateDate 月份 0 非法', TimelineEngine.validateDate(2000, 0, 15, 'hello') === false);
assert('validateDate 日期 0 非法', TimelineEngine.validateDate(2000, 6, 0, 'hello') === false);
assert('validateDate 缺少 day 非法', TimelineEngine.validateDate(2000, 6, undefined, 'hello') === false);
```

运行：

```bash
node test/timeline-test.cjs
```

Expected: 失败，`validateDate` 和 `sortByYear` 的 day 排序不通过。

- [ ] **Step 2: 扩展 TimelineEngine**

在 `js/timeline.js` 中修改 `sortByYear`：

```js
sortByYear(events) {
  if (!Array.isArray(events)) return [];
  return [...events].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if ((a.month || 1) !== (b.month || 1)) return (a.month || 1) - (b.month || 1);
    return (a.day || 1) - (b.day || 1);
  });
}
```

新增/替换 `validateEvent` 为 `validateDate`：

```js
validateDate(year, month, day, text) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const currentYear = new Date().getFullYear();
  if (!Number.isFinite(y) || y < 1900 || y > currentYear + 100) return false;
  if (!Number.isFinite(m) || m < 1 || m > 12) return false;
  if (!Number.isFinite(d) || d < 1 || d > 31) return false;
  // 校验真实日期（含闰年、大小月）
  const testDate = new Date(y, m - 1, d);
  if (testDate.getFullYear() !== y || testDate.getMonth() !== m - 1 || testDate.getDate() !== d) return false;
  if (typeof text !== 'string' || text.trim().length === 0) return false;
  return true;
}
```

保留 `validateEvent` 作为别名（避免破坏旧调用点，后续任务再替换）：

```js
validateEvent(year, month, text) {
  return this.validateDate(year, month, 1, text);
}
```

- [ ] **Step 3: 运行测试确认通过**

```bash
node test/timeline-test.cjs
```

Expected: 全部通过。

- [ ] **Step 4: 添加 v6.10.0 迁移标记**

在 `js/storage.js` 的 `KEYS` 中新增：

```js
TIMELINE_DAY_MIGRATED: 'life_checklist_timeline_day_migrated'
```

添加方法：

```js
isTimelineDayMigrated() {
  return localStorage.getItem(this.KEYS.TIMELINE_DAY_MIGRATED) === 'true';
},

setTimelineDayMigrated() {
  localStorage.setItem(this.KEYS.TIMELINE_DAY_MIGRATED, 'true');
}
```

- [ ] **Step 5: 提交**

```bash
git add js/timeline.js js/storage.js test/timeline-test.cjs
git commit -m "feat(timeline): 人生轴事件支持 day 字段，新增日期校验与迁移标记"
```

---

### Task 9: 人生轴 — 年月日选择器与 UI 适配

**Files:**
- Modify: `js/timeline.js`
- Modify: `js/datePicker.js`（如需要）
- Modify: `js/storage.js`

**Interfaces:**
- Consumes: `DatePickerManager.open()`, `TimelineEngine.validateDate()`
- Produces: 人生轴添加/编辑弹窗使用年月日三列选择器；事件对象包含 `day`；旧数据自动补 `day: 1`。

- [ ] **Step 1: 复用 DatePickerManager.open 作为年月日选择器**

当前 `DatePickerManager.open()` 已支持年/月/日三列，但会限制日期不超过今天（适用于生日）。对于人生轴事件，需要允许未来日期。因此修改 `DatePickerManager.open` 增加可选参数 `allowFuture`：

```js
open(currentDateStr, onConfirm, allowFuture = false) {
  this._onConfirm = onConfirm;
  this._allowFuture = allowFuture;
  // ... 其余不变
}
```

修改 `_confirm`：

```js
_confirm() {
  const y = this._centerValue(document.getElementById('dp-year'));
  const m = this._centerValue(document.getElementById('dp-month'));
  let day = this._centerValue(document.getElementById('dp-day'));
  const maxDay = new Date(y, m, 0).getDate();
  day = Math.min(day, maxDay);
  let picked = new Date(y, m - 1, day);
  if (!this._allowFuture) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (picked > today) picked = today;
  }
  const str = `${picked.getFullYear()}-${String(picked.getMonth() + 1).padStart(2, '0')}-${String(picked.getDate()).padStart(2, '0')}`;
  this.close();
  if (this._onConfirm) this._onConfirm(str);
}
```

- [ ] **Step 2: 修改 TimelineManager 弹窗使用三列日期选择器**

在 `js/timeline.js` 中：

1. 修改 `_formatYearMonth` 为 `_formatDate`：

```js
_formatDate(year, month, day) {
  if (!year) return '';
  const m = Number(month);
  const d = Number(day);
  if (!Number.isFinite(m) || m < 1 || m > 12) return `${year}年`;
  if (!Number.isFinite(d) || d < 1 || d > 31) return `${year}年${m}月`;
  return `${year}年${m}月${d}日`;
}
```

2. 修改 `_showModal` 接收 day：

```js
_showModal(title, yearVal, monthVal, dayVal, textVal, onConfirm, onDelete) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 320px;">
      <h3>${title}</h3>
      <div class="modal-input-container" style="text-align:left;">
        <label class="form-label">时间</label>
        <button type="button" class="form-input tl-year-display" id="tl-modal-year-btn">${this._formatDate(yearVal, monthVal, dayVal) || '点击选择时间'}</button>
        <input type="hidden" id="tl-modal-year" value="${yearVal}">
        <input type="hidden" id="tl-modal-month" value="${monthVal}">
        <input type="hidden" id="tl-modal-day" value="${dayVal}">
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
  const dayHidden = document.getElementById('tl-modal-day');
  yearBtn.addEventListener('click', () => {
    const y = Number(yearHidden.value) || new Date().getFullYear();
    const m = Number(monthHidden.value) || (new Date().getMonth() + 1);
    const d = Number(dayHidden.value) || 1;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    DatePickerManager.open(dateStr, (newDateStr) => {
      const picked = new Date(newDateStr);
      const py = picked.getFullYear();
      const pm = picked.getMonth() + 1;
      const pd = picked.getDate();
      yearHidden.value = py;
      monthHidden.value = pm;
      dayHidden.value = pd;
      yearBtn.textContent = this._formatDate(py, pm, pd);
    }, true); // 允许未来日期
  });

  document.getElementById('tl-modal-cancel').addEventListener('click', () => overlay.remove());
  document.getElementById('tl-modal-confirm').addEventListener('click', () => {
    const year = document.getElementById('tl-modal-year').value;
    const month = document.getElementById('tl-modal-month').value;
    const day = document.getElementById('tl-modal-day').value;
    const text = document.getElementById('tl-modal-text').value;
    overlay.remove();
    onConfirm(year, month, day, text);
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

3. 修改 `showAddModal`：

```js
showAddModal() {
  const now = new Date();
  this._showModal('添加人生事件', now.getFullYear(), now.getMonth() + 1, now.getDate(), '', (year, month, day, text) => {
    this.addEvent(year, month, day, text);
  });
}
```

4. 修改 `addEvent`、`_showEditModal`、`updateEvent`：

```js
addEvent(year, month, day, text) {
  if (!TimelineEngine.validateDate(year, month, day, text)) {
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
  events.push({ id, year: Number(year), month: Number(month), day: Number(day), text: text.trim() });
  StorageManager.setTimeline(events);
  this.renderTimelinePage();
  this.showToast('已添加');
  return true;
}

_showEditModal(ev) {
  this._showModal('编辑事件', ev.year, ev.month, ev.day || 1, ev.text, (year, month, day, text) => {
    this.updateEvent(ev.id, year, month, day, text);
  }, () => {
    this.deleteEvent(ev.id);
  });
}

updateEvent(id, year, month, day, text) {
  if (!TimelineEngine.validateDate(year, month, day, text)) {
    this.showToast('时间或描述不合法');
    return false;
  }
  const events = StorageManager.getTimeline();
  const idx = events.findIndex(e => e.id === id);
  if (idx === -1) return false;
  events[idx] = { id, year: Number(year), month: Number(month), day: Number(day), text: text.trim() };
  StorageManager.setTimeline(events);
  this.renderTimelinePage();
  this.showToast('已更新');
  return true;
}
```

5. 修改 `renderTimelinePage` 增加 day 字段迁移：

```js
renderTimelinePage() {
  const container = document.getElementById('timeline-container');
  if (!container) return;

  let events = StorageManager.getTimeline();
  // 兼容旧数据：无 day 字段的事件补 1 日
  let needSave = false;
  events = events.map(e => {
    if (e && typeof e.day === 'undefined') {
      needSave = true;
      return { ...e, day: 1 };
    }
    return e;
  });
  if (needSave) StorageManager.setTimeline(events);

  // 一次性迁移标记（可选，用于明确 v6.10.0 已完成 day 迁移）
  if (!StorageManager.isTimelineDayMigrated()) StorageManager.setTimelineDayMigrated();

  const sorted = TimelineEngine.sortByYear(events);
  // ... 后续不变
}
```

6. 修改渲染函数中的时间显示：

```js
_renderSingle(container, sorted) {
  // ...
  <span class="timeline-single-year">${this._formatDate(ev.year, ev.month, ev.day)}</span>
  // ...
}

_renderDouble(container, sorted) {
  // ...
  <span class="timeline-double-year">${this._formatDate(ev.year, ev.month, ev.day)}</span>
  // ...
}
```

`_generateShareCardHTML` 中同理。

- [ ] **Step 3: 清理旧的 openYearMonth 调用**

`js/timeline.js` 中旧的 `DatePickerManager.openYearMonth` 调用已替换为 `DatePickerManager.open`。检查 `js/datePicker.js` 中 `openYearMonth` 是否仍被人生进度等地方使用；若仅人生轴使用，可考虑保留但不再调用。

- [ ] **Step 4: 浏览器验证**

- 打开人生轴 → 添加事件 → 选择 2026 年 7 月 15 日 → 卡片显示「2026年7月15日」。
- 同一年添加 1 月、3 月、2 月事件，确认按日期排序。
- 编辑旧事件（无 day 字段）时，默认显示 1 日。

- [ ] **Step 5: 提交**

```bash
git add js/timeline.js js/datePicker.js js/storage.js
git commit -m "feat(timeline): 人生轴弹窗改用年月日三列选择器，UI 适配 day 字段"
```

---

### Task 10: 人生轴 — 修复双侧布局交错

**Files:**
- Modify: `js/timeline.js`
- Modify: `css/style.css`

**Interfaces:**
- Consumes: 已排序事件数组
- Produces: 双侧布局事件左右交错排列。

- [ ] **Step 1: 检查当前 _renderDouble**

当前代码已按 `index % 2 === 0` 设置 `isLeft`，逻辑看起来正确。问题可能出在 CSS：左侧卡片未右对齐，或右侧卡片未左对齐，导致视觉上都在同一侧。

- [ ] **Step 2: 修复 CSS 对齐**

在 `css/style.css` 中检查/添加 `.timeline-double-side` 样式：

```css
.timeline-double-row {
  display: flex;
  align-items: center;
  position: relative;
  margin-bottom: 1rem;
}

.timeline-double-side {
  flex: 1;
  display: flex;
}

.timeline-double-side.left {
  justify-content: flex-end;
  padding-right: 1rem;
}

.timeline-double-side.right {
  justify-content: flex-start;
  padding-left: 1rem;
}

.timeline-double-card {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  box-shadow: var(--shadow);
  max-width: 80%;
}

.timeline-double-center {
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.timeline-double-axis {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border);
  transform: translateX(-50%);
  z-index: 0;
}
```

- [ ] **Step 3: 修复 _renderDouble DOM 结构**

确保 `_renderDouble` 生成的结构是：

```html
<div class="timeline-double-row">
  <div class="timeline-double-side left"><!-- 左侧卡片 --></div>
  <div class="timeline-double-center"><!-- 中轴圆点 --></div>
  <div class="timeline-double-side right"><!-- 右侧占位 --></div>
</div>
```

当前代码基本符合，但需确认当 `isLeft=true` 时左侧放卡片、右侧为空；`isLeft=false` 时右侧放卡片、左侧为空。

- [ ] **Step 4: 浏览器验证**

- 添加 4 条以上人生轴事件。
- 切换到双侧布局，确认卡片左右交错排列。
- 切换单列/双侧正常。

- [ ] **Step 5: 提交**

```bash
git add js/timeline.js css/style.css
git commit -m "fix(timeline): 双侧布局左右交错显示"
```

---

### Task 11: 分享 — 修复清单详情生成图片

**Files:**
- Modify: `js/share.js`
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `html2canvas`
- Produces: 清单详情「生成图片」可导出完整详情卡片 PNG。

- [ ] **Step 1: 分析当前问题**

当前 `bindDetailBottomActions` 中：

```js
shareBtn.onclick = () => {
  const card = document.getElementById('detail-header');
  if (card) ShareManager.captureCard(card);
};
```

只截取了标题条，不是完整详情。应截取包含标题条和标签网格的区域。

- [ ] **Step 2: 创建详情分享卡片容器**

在 `index.html` 的 `#detail-view` 中，给标题条 + 标签区包裹一个可截图的容器：

```html
<div id="detail-share-area">
  <div class="detail-header" id="detail-header">...</div>
  <section>
    <div id="task-tags-container" class="task-tags-container">...</div>
  </section>
</div>
```

或者不改 HTML，在 JS 中动态创建分享卡片。

- [ ] **Step 3: 修改分享按钮逻辑**

在 `js/share.js` 中新增方法：

```js
captureDetailCard() {
  const shareArea = document.getElementById('detail-share-area');
  if (!shareArea) return;

  const run = () => {
    html2canvas(shareArea, {
      backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = '我的清单_' + new Date().toISOString().slice(0, 10) + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      this.showToast('图片已保存 ✅');
    }).catch(err => {
      console.error('html2canvas 失败:', err);
      this.showToast('图片生成失败，请重试');
    });
  };

  if (!window.html2canvas) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.onload = run;
    script.onerror = () => {
      this.showToast('图片生成失败，请重试');
      script.remove();
    };
    document.head.appendChild(script);
  } else {
    run();
  }
}
```

- [ ] **Step 4: 更新 app.js 中分享按钮绑定**

```js
if (shareBtn) {
  shareBtn.onclick = () => ShareManager.captureDetailCard();
}
```

- [ ] **Step 5: 浏览器验证**

- 进入清单详情，点击「生成图片」。
- 确认下载的 PNG 包含标题条和标签网格。
- 若生成失败，出现 toast 提示。

- [ ] **Step 6: 提交**

```bash
git add js/share.js js/app.js index.html
git commit -m "fix(share): 清单详情生成图片截取完整卡片"
```

---

### Task 12: 余生闹钟 — 分享功能补全

**Files:**
- Modify: `js/share.js`
- Modify: `js/lifeClock.js`

**Interfaces:**
- Consumes: `LifeClockEngine`, `StorageManager`
- Produces: 余生闹钟分享支持「保存图片」「复制文案」「系统分享」。

- [ ] **Step 1: 写失败测试**

创建 `test/share-test.cjs`：

```js
/**
 * 分享模块纯逻辑测试
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
  console, Date, Math, JSON, Object, Array, parseInt, parseFloat, isNaN, Number, RegExp, String, Error, setTimeout, clearTimeout,
  document: undefined, window: undefined, navigator: undefined,
  __done: (p, f) => { console.log(`\n结果: ${p} 通过 / ${f} 失败`); if (f > 0) process.exitCode = 1; }
};

const root = path.join(__dirname, '..');
const files = ['js/data.js', 'js/storage.js', 'js/share.js']
  .filter(f => fs.existsSync(path.join(root, f)));
let code = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');

code += `
;(function(){
  let passed = 0, failed = 0;
  const assert = (n, c) => { c ? passed++ : failed++; console.log((c ? '✅' : '❌') + ' ' + n); };
  localStorage.clear();

  // 模拟 LifeClockEngine
  const LifeClockEngine = {
    calcAge: (birth, now) => 26,
    calcEvents: (ctx) => [
      { emoji: '📅', text: '还可以过 300 个周末' },
      { emoji: '🎂', text: '还可以吃 70 个生日蛋糕' }
    ]
  };

  // 直接测试分享文案生成函数（若不存在则先创建）
  const text = ShareManager.generateLifeClockShareText(26, 80, [
    { emoji: '📅', text: '还可以过 300 个周末' }
  ]);
  assert('分享文案包含年龄', text.includes('26'));
  assert('分享文案包含余生事件', text.includes('300 个周末'));

  __done(passed, failed);
})();
`;

vm.createContext(sandbox);
vm.runInContext(code, sandbox);
```

运行：

```bash
node test/share-test.cjs
```

Expected: 失败，`generateLifeClockShareText` 未定义。

- [ ] **Step 2: 在 ShareManager 中添加余生闹钟分享方法**

```js
generateLifeClockShareText(age, lifeExpectancy, events) {
  const ageFloor = Math.floor(age);
  const remainingYears = Math.max(0, lifeExpectancy - ageFloor);
  const remainingDays = Math.round(remainingYears * 365.25);
  const eventLines = events.slice(0, 3).map(e => `${e.emoji} ${e.text}`).join('\n');
  return `我今年 ${ageFloor} 岁了，余生大约还有 ${remainingDays.toLocaleString('zh-CN')} 天。\n\n${eventLines}\n\n认真活好每一天 ✨\n#人生清单 #余生闹钟`;
},

showLifeClockShareModal() {
  const overlay = document.createElement('div');
  overlay.className = 'share-overlay';
  overlay.innerHTML = `
    <div class="share-modal">
      <div class="share-modal-header">
        <h3>分享余生闹钟</h3>
        <button class="share-close-btn" onclick="this.closest('.share-overlay').remove()">✕</button>
      </div>
      <div class="share-actions-vertical" style="display:flex;flex-direction:column;gap:0.75rem;padding:1rem;">
        <button class="share-btn share-btn-image" id="life-share-save">保存图片</button>
        <button class="share-btn share-btn-copy" id="life-share-copy">复制文案</button>
        <button class="share-btn share-btn-success" id="life-share-system">系统分享</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const ageEl = document.getElementById('life-age-value');
  const age = ageEl ? parseFloat(ageEl.textContent) : 0;
  const lifeExpectancy = StorageManager.getLifeExpectancy();
  const birth = LifeClockUI.getEffectiveBirthDate();
  const events = LifeClockEngine.calcEvents({
    birthDate: birth,
    now: Date.now(),
    lifeExpectancy: lifeExpectancy
  });
  const shareText = this.generateLifeClockShareText(age, lifeExpectancy, events);

  document.getElementById('life-share-save').addEventListener('click', () => {
    this.saveLifeClockImage();
  });

  document.getElementById('life-share-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(shareText).then(() => {
      this.showToast('文案已复制 ✅');
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = shareText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showToast('文案已复制 ✅');
    });
  });

  const systemBtn = document.getElementById('life-share-system');
  if (navigator.share) {
    systemBtn.addEventListener('click', () => {
      navigator.share({ title: '余生闹钟', text: shareText }).catch(() => {});
    });
  } else {
    systemBtn.style.display = 'none';
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
```

- [ ] **Step 3: 修改 lifeClock.js 分享按钮绑定**

```js
if (shareBtn) shareBtn.onclick = () => ShareManager.showLifeClockShareModal();
```

- [ ] **Step 4: 运行测试确认通过**

```bash
node test/share-test.cjs
```

Expected: 通过。

- [ ] **Step 5: 浏览器验证**

- 进入余生闹钟页，点击「分享」。
- 弹出选项：保存图片、复制文案、系统分享（若浏览器支持）。
- 点击「保存图片」下载余生闹钟卡片 PNG。
- 点击「复制文案」将文案写入剪贴板。

- [ ] **Step 6: 提交**

```bash
git add js/share.js js/lifeClock.js test/share-test.cjs
git commit -m "feat(life-clock): 余生闹钟分享支持保存图片、复制文案、系统分享"
```

---

### Task 13: 全量测试与视觉回归

**Files:**
- 全部修改过的文件

**Interfaces:**
- Consumes: 全部单元测试与浏览器截图
- Produces: 所有测试通过，13 条反馈逐条验证。

- [ ] **Step 1: 运行全部单元测试**

```bash
node test/datepicker-test.cjs
node test/timeline-test.cjs
node test/life-progress-test.cjs
node test/storage-test.cjs
node test/share-test.cjs
```

Expected: 全部通过。

- [ ] **Step 2: 浏览器逐条验证 13 条反馈**

| # | 验证项 | 期望结果 |
|---|---|---|
| 1 | 我的页「人生探索者」右侧 | 无箭头 |
| 2 | 我的页最近成就点击 | 已解锁跳转成就墙；未解锁 toast |
| 3 | 首页格言点击 | 可编辑、保存、恢复默认 |
| 4 | 清单详情短按任务 | 可完成/取消切换 |
| 5 | 清单详情生成图片 | 成功导出 PNG |
| 6 | 人生轴添加事件 | 可选年月日，显示完整日期 |
| 7 | 人生轴双侧布局 | 左右交错 |
| 8 | 余生闹钟分享 | 保存图片/复制文案/系统分享可用 |
| 9 | 自定义模式拖动 | 长按可拖动清单排序 |
| 10 | 首页统计 | 只显示总清单和已完成 |
| 11 | 删除角标布局 | 位于左侧，不遮挡 |
| 12 | 照片上传 | 10MB 以内成功 |
| 13 | 大尺寸照片 | 弹窗可滚动，按钮可见，lightbox 可用 |

- [ ] **Step 3: 浅色/深色主题截图比对**

对以下页面在浅色和深色主题下截图：
- 首页
- 我的页
- 清单详情
- 人生轴（单列 + 双侧）
- 余生闹钟
- 任务详情弹窗

重点检查：
- 删除角标位置
- 弹窗按钮不被遮挡
- 双侧布局交错
- 深色模式无白底残留

- [ ] **Step 4: 更新 CHANGELOG**

在 `CHANGELOG.md` 顶部新增 v6.10.0 条目：

```markdown
## v6.10.0 (2026-07-02) - 体验优化 🛠️

### 🧑‍💻 「我的」页
- 删除「人生探索者」右侧无功能箭头
- 最近成就点击跳转成就墙，未解锁时 toast 引导

### 🏠 首页
- 今日格言支持自定义编辑与恢复默认
- 顶部统计删除「总任务」，仅保留「总清单」和「已完成」

### 📝 人生清单
- 清单详情任务标签短按支持完成/取消切换
- 自定义模式下支持长按拖动排序
- 修复删除角标与右上角内容遮挡

### 📸 任务详情
- 照片上传上限从 2MB 提升至 10MB
- 弹窗内容可滚动，底部按钮固定
- 点击照片打开全屏 lightbox

### 🌱 人生轴
- 事件时间精度支持年月日
- 修复双侧布局左右交错显示

### 🔗 分享
- 修复清单详情生成图片
- 余生闹钟分享支持保存图片、复制文案、系统分享
```

- [ ] **Step 5: 提交**

```bash
git add CHANGELOG.md
git commit -m "docs: v6.10.0 CHANGELOG"
```

- [ ] **Step 6: 最终推送（可选）**

```bash
git push origin main
```

---

## Self-Review

**Spec coverage:**
- #1 我的页箭头删除 → Task 1
- #2 成就点击反馈 → Task 1
- #3 格言自定义 → Task 2
- #4 清单取消路径 → Task 4
- #5 生成图片失败 → Task 11
- #6 人生轴精确到日 → Task 8 + Task 9
- #7 双侧布局 → Task 10
- #8 余生闹钟分享 → Task 12
- #9 自定义模式拖动 → Task 5
- #10 删除总任务统计 → Task 3
- #11 删除角标遮挡 → Task 6
- #12 照片上限 → Task 7
- #13 大图无法滚动 → Task 7

**Placeholder scan:** 无 TBD/TODO/"稍后实现"等占位符。

**Type consistency:**
- `validateDate(year, month, day, text)` 在 Task 8 定义，Task 9 调用。
- `generateLifeClockShareText(age, lifeExpectancy, events)` 在 Task 12 定义并调用。
- `StorageManager.getCustomQuote/setCustomQuote/clearCustomQuote` 在 Task 2 定义并调用。
- `StorageManager.isTimelineDayMigrated/setTimelineDayMigrated` 在 Task 8 定义，Task 9 调用。

无缺口。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-02-life-checklist-optimization.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
