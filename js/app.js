/**
 * 降低 HEX 颜色饱和度，用于清单卡左侧色条
 * @param {string} hex - #RRGGBB
 * @param {number} ratio - 0~1 降饱和比例
 */
function desaturateColor(hex, ratio) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const newR = r + (l - r) * ratio;
  const newG = g + (l - g) * ratio;
  const newB = b + (l - b) * ratio;
  const toHex = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * 人生已完成清单 - 主应用逻辑
 */

const AppState = {
  currentView: 'home',
  currentListId: null,
  lists: [],
  birthDate: null
};

// 视图注册表：name -> { el, nav, onShow }
const VIEWS = {
  home:         { nav: 'home',         onShow: renderHomePage },
  templates:    { nav: 'templates',    onShow: () => TemplateManager.renderTemplateLibrary() },
  timeline:     { nav: 'timeline',     onShow: () => TimelineManager.renderTimelinePage() },
  lifeprogress: { nav: 'lifeprogress', onShow: () => LifeProgressManager.renderList() },
  lifeprogressEdit: { nav: 'lifeprogress', onShow: (p) => LifeProgressManager.renderEdit(p) },
  profile:      { nav: 'profile',      onShow: () => ProfileManager.renderProfilePage() },
  detail:       { nav: 'home',        onShow: (id) => renderListDetail(id) },
  lifeclock:    { nav: null,          onShow: () => LifeClockUI.show() },
  achievements: { nav: 'achievements', onShow: () => {
    const container = document.getElementById('achievement-wall');
    AchievementManager.renderAchievementWall(container);
    const stats = AchievementManager.getStats();
    document.getElementById('achievement-count').textContent = `${stats.unlocked}/${stats.total}`;
    const achievementCircle = document.getElementById('achievement-progress-circle');
    if (achievementCircle) AnimationManager.animateCircularProgress(achievementCircle, stats.percentage);
  }},
  statistics:   { nav: 'statistics',   onShow: () => StatisticsManager.renderStatisticsPage() },
  report:       { nav: 'report',       onShow: () => {} }
};

// 视图 DOM 元素缓存
const VIEW_ELEMENTS = {};

function initViewElements() {
  Object.keys(VIEWS).forEach(name => {
    const el = document.getElementById(name + '-view');
    if (el) VIEW_ELEMENTS[name] = el;
  });
  // 兼容旧 id：lists-view 映射到 home（因为 lists-view 已并入首页）
  const listsView = document.getElementById('lists-view');
  if (listsView) VIEW_ELEMENTS['lists'] = listsView;
}

/**
 * 统一视图切换
 */
function showView(name, arg) {
  // 隐藏所有视图
  Object.values(VIEW_ELEMENTS).forEach(el => {
    if (el && el.classList) el.classList.add('hidden');
  });

  // 显示目标视图
  const targetEl = VIEW_ELEMENTS[name];
  if (targetEl && targetEl.classList) targetEl.classList.remove('hidden');

  // 离开余生页统一停 tick
  if (name !== 'lifeclock') LifeClockUI.stopTick();

  AppState.currentView = name;

  const v = VIEWS[name];
  if (v) {
    if (v.nav) updateNavigation(v.nav);
    if (v.onShow) v.onShow(arg);
  }

  window.scrollTo(0, 0);
}

// 保留旧函数名作为薄封装，减少调用点改动
function showHomePage()         { showView('home'); }
function showListsPage()        { showView('home'); } // lists-view 已并入首页
function showTemplatesPage()    { showView('templates'); }
function showTimelinePage()     { showView('timeline'); }
function showProfilePage()      { showView('profile'); }
function showLifeClockPage()    { showView('lifeclock'); }
function showAchievementsPage() { showView('achievements'); }
function showStatisticsPage()   { showView('statistics'); }
function showReportPage()       { showView('report'); }
function showListDetail(listId) { showView('detail', listId); }

/**
 * 初始化应用
 */
function initApp() {
  initViewElements();

  SettingsManager.init();
  StorageManager.initializeData();

  // 更新连续打卡状态（处理新的一天/断签）
  StorageManager.updateStreak();
  StorageManager.updateLastVisit();

  AppState.lists = StorageManager.getLists();
  AppState.birthDate = StorageManager.getBirthDate();

  renderHomePage();
  bindEvents();
  checkAndShowAchievements();

  // 初始化 AI 目标拆解 UI
  if (typeof GoalBreakdownUIManager !== 'undefined') {
    GoalBreakdownUIManager.init();
  }
}

/**
 * 绑定全局事件
 */
function bindEvents() {
  document.getElementById('back-btn').addEventListener('click', showHomePage);
  document.getElementById('ach-back-btn').addEventListener('click', showHomePage);
  document.getElementById('stats-back-btn').addEventListener('click', showHomePage);
  document.getElementById('profile-back-btn').addEventListener('click', showHomePage);
  document.getElementById('template-back-btn').addEventListener('click', showHomePage);

  document.getElementById('lifeclock-back-btn').addEventListener('click', showHomePage);

  // 人生轴页事件绑定
  const tlShareBtn = document.getElementById('timeline-share-btn');
  if (tlShareBtn) tlShareBtn.addEventListener('click', () => TimelineManager.showShareCard());
  const tlLayoutSingle = document.getElementById('timeline-layout-single');
  const tlLayoutDouble = document.getElementById('timeline-layout-double');
  if (tlLayoutSingle) tlLayoutSingle.addEventListener('click', () => TimelineManager.setLayout('single'));
  if (tlLayoutDouble) tlLayoutDouble.addEventListener('click', () => TimelineManager.setLayout('double'));
  const tlAddBtn = document.getElementById('timeline-add-btn');
  if (tlAddBtn) tlAddBtn.addEventListener('click', () => TimelineManager.showAddModal());

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const view = e.currentTarget.dataset.view;
      switch (view) {
        case 'home': showHomePage(); break;
        case 'lists': showListsPage(); break;
        case 'templates': showTemplatesPage(); break;
        case 'timeline': showTimelinePage(); break;
        case 'statistics': showStatisticsPage(); break;
        case 'profile': showProfilePage(); break;
        case 'lifeclock': showLifeClockPage(); break;
        case 'lifeprogress': showView('lifeprogress'); break;
      }
    });
  });

  document.getElementById('search-btn').addEventListener('click', () => {
    SearchManager.openSearch();
  });

  document.getElementById('sort-btn').addEventListener('click', () => {
    showSortMenu();
  });

  document.getElementById('add-list-btn').addEventListener('click', () => {
    CustomManager.showAddListModal();
  });

  // 首页顶栏⏰按钮
  const lifeClockBtn = document.getElementById('home-lifeclock-btn');
  if (lifeClockBtn) {
    lifeClockBtn.addEventListener('click', showLifeClockPage);
  }

  // 首页自定义按钮
  const customBtn = document.getElementById('home-custom-btn');
  if (customBtn) {
    customBtn.addEventListener('click', () => HomeEditManager.toggle());
  }

  // 初始化长按拖动排序
  DragSortManager.init();
}

/**
 * 更新总体统计
 */
function updateOverallStats() {
  const stats = StorageManager.getOverallStats();

  const completedElement = document.getElementById('total-completed');
  if (completedElement) {
    const currentValue = parseInt(completedElement.textContent) || 0;
    AnimationManager.animateNumber(completedElement, currentValue, stats.totalCompleted, 800);
  }

  const totalElement = document.getElementById('total-tasks');
  if (totalElement) {
    totalElement.textContent = stats.totalTasks;
  }
}

/**
 * 渲染首页
 */
function renderHomePage() {
  // 更新余生入口年龄显示（顶栏⏰按钮旁可复用）
  const ageEl = document.getElementById('home-life-age');
  if (ageEl) {
    const birth = LifeClockUI.getEffectiveBirthDate();
    ageEl.textContent = LifeClockEngine.calcAge(birth, Date.now()).toFixed(2);
  }

  updateDailyQuote();
  renderListCards();
  updateListsOverview();
  updateOverallStats();
  updateNavigation('home');
}

/**
 * 更新连续打卡显示
 */
function updateStreakDisplay() {
  const streakData = StorageManager.getStreakData();

  const currentElement = document.getElementById('streak-current');
  const longestElement = document.getElementById('streak-longest');
  const statusElement = document.getElementById('streak-status');

  if (currentElement) {
    AnimationManager.animateNumber(currentElement, 0, streakData.currentStreak, 800);
  }

  if (longestElement) {
    longestElement.textContent = streakData.longestStreak;
  }

  if (statusElement) {
    if (streakData.todayChecked) {
      statusElement.textContent = '🔥 今日已打卡';
      statusElement.className = 'streak-status checked';
    } else {
      statusElement.textContent = '⏰ 今日还未打卡';
      statusElement.className = 'streak-status pending';
    }
  }
}

/**
 * 更新每日格言
 */
function updateDailyQuote() {
  const quoteElement = document.getElementById('daily-quote');
  const authorElement = document.querySelector('.quote-author');

  const today = new Date();
  const dayIndex = today.getDate() % QUOTES.length;
  const quote = QUOTES[dayIndex];

  if (quoteElement) quoteElement.textContent = quote.text;
  if (authorElement) authorElement.textContent = '— ' + quote.author;
}

/**
 * 显示余生闹钟页面
 */
function showLifeClockPage() {
  showView('lifeclock');
}

/**
 * 显示首页
 */
function showHomePage() {
  showView('home');
}

/**
 * 显示清单页
 */
function showListsPage() {
  showView('home');
}

/**
 * 渲染清单页
 */
function renderListsPage() {
  updateListsOverview();
  renderListCards();
}

/**
 * 更新清单概览统计
 */
function updateListsOverview() {
  const lists = AppState.lists;
  const totalLists = lists.length;
  const completedLists = lists.filter(l => {
    const progress = StorageManager.calculateListProgress(l);
    return progress.percentage === 100;
  }).length;
  const totalTasks = lists.reduce((sum, l) => sum + l.tasks.length, 0);

  const elTotal = document.getElementById('lists-total');
  const elCompleted = document.getElementById('lists-completed');
  const elTasks = document.getElementById('lists-tasks');
  const elCount = document.getElementById('lists-count');
  if (elTotal) elTotal.textContent = totalLists;
  if (elCompleted) elCompleted.textContent = completedLists;
  if (elTasks) elTasks.textContent = totalTasks;
  if (elCount) elCount.textContent = `共 ${totalLists} 个清单`;
}

/**
 * 渲染清单卡片列表
 */
function renderListCards() {
  const container = document.getElementById('list-cards-container');
  if (!container) return;
  container.innerHTML = '';

  // 按用户自定义顺序排序（无记录则按原序）
  const order = StorageManager.getListOrder();
  const orderedLists = [...AppState.lists];
  if (order.length > 0) {
    orderedLists.sort((a, b) => {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }

  if (orderedLists.length === 0) {
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

  orderedLists.forEach((list, index) => {
    const progress = StorageManager.calculateListProgress(list);
    const card = createListCard(list, progress);
    container.appendChild(card);
    AnimationManager.animateCardEntrance(card, index * 100);
  });
}

/**
 * 创建清单卡片（色条卡片样式）
 */
function createListCard(list, progress) {
  const card = document.createElement('div');
  card.className = 'home-list-card';
  card.dataset.listId = list.id;

  const barColor = desaturateColor(list.color || '#007AFF', 0.2);

  card.innerHTML = `
    <span class="card-left-bar" style="--bar-color: ${barColor}"></span>
    <div class="home-list-card-inner">
      <span class="home-list-card-emoji">${list.emoji}</span>
      <div class="home-list-card-info">
        <div class="home-list-card-title">${list.title}</div>
        <div class="home-list-card-percent">${Math.round(progress.percentage)}%</div>
      </div>
    </div>
    <button class="home-list-card-delete" data-list-id="${list.id}">×</button>
  `;

  card.addEventListener('click', (e) => {
    if (e.target.closest('.home-list-card-delete')) return;
    if (AppState.isEditing) return;
    showListDetail(list.id);
  });

  const deleteBtn = card.querySelector('.home-list-card-delete');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      CustomManager.deleteList(list.id);
    });
  }

  return card;
}

/**
 * 长按拖动排序管理器
 */
const DragSortManager = {
  LONG_PRESS_MS: 500,
  MOVE_THRESHOLD: 10,

  init() {
    this.container = document.getElementById('list-cards-container');
    if (!this.container) return;

    this.container.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
    this.container.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this._onTouchEnd.bind(this));
    this.container.addEventListener('touchcancel', this._onTouchEnd.bind(this));

    this.container.addEventListener('mousedown', this._onMouseDown.bind(this));
    document.addEventListener('mousemove', this._onMouseMove.bind(this));
    document.addEventListener('mouseup', this._onMouseUp.bind(this));
  },

  _reset() {
    this._dragging = false;
    this._longPressTimer = null;
    this._dragCard = null;
    this._dragGhost = null;
    this._startX = 0;
    this._startY = 0;
    this._currentY = 0;
    this._startIndex = -1;
    this._placeholder = null;
  },

  _onTouchStart(e) {
    if (AppState.isEditing) return;
    const card = e.target.closest('.home-list-card');
    if (!card) return;
    const touch = e.touches[0];
    this._startDrag(card, touch.clientX, touch.clientY);
  },

  _onMouseDown(e) {
    if (AppState.isEditing) return;
    const card = e.target.closest('.home-list-card');
    if (!card) return;
    this._startDrag(card, e.clientX, e.clientY);
  },

  _startDrag(card, clientX, clientY) {
    this._reset();
    this._startX = clientX;
    this._startY = clientY;
    this._dragCard = card;
    this._startIndex = Array.from(this.container.children).indexOf(card);

    this._longPressTimer = setTimeout(() => {
      this._enterDragState();
    }, this.LONG_PRESS_MS);
  },

  _enterDragState() {
    if (!this._dragCard) return;
    this._dragging = true;

    // 创建占位元素
    this._placeholder = document.createElement('div');
    this._placeholder.className = 'home-list-card-placeholder';
    this._placeholder.style.height = this._dragCard.offsetHeight + 'px';
    this._dragCard.parentNode.insertBefore(this._placeholder, this._dragCard.nextSibling);

    // 创建幽灵元素
    this._dragGhost = this._dragCard.cloneNode(true);
    this._dragGhost.classList.add('home-list-card-ghost');
    this._dragGhost.style.width = this._dragCard.offsetWidth + 'px';
    this._dragGhost.style.height = this._dragCard.offsetHeight + 'px';
    document.body.appendChild(this._dragGhost);

    this._dragCard.classList.add('home-list-card-dragging');

    const rect = this._dragCard.getBoundingClientRect();
    this._ghostOffsetY = this._startY - rect.top;
    this._updateGhostPosition(this._startY);
  },

  _updateGhostPosition(y) {
    if (!this._dragGhost) return;
    const rect = this.container.getBoundingClientRect();
    this._dragGhost.style.top = (y - this._ghostOffsetY) + 'px';
    this._dragGhost.style.left = rect.left + 'px';
  },

  _onTouchMove(e) {
    const touch = e.touches[0];
    this._onMove(touch.clientX, touch.clientY);
    if (this._dragging) e.preventDefault();
  },

  _onMouseMove(e) {
    this._onMove(e.clientX, e.clientY);
  },

  _onMove(clientX, clientY) {
    // 若移动超阈值，取消长按计时
    if (!this._dragging && this._longPressTimer) {
      const dx = Math.abs(clientX - this._startX);
      const dy = Math.abs(clientY - this._startY);
      if (dx > this.MOVE_THRESHOLD || dy > this.MOVE_THRESHOLD) {
        clearTimeout(this._longPressTimer);
        this._longPressTimer = null;
        this._reset();
      }
      return;
    }

    if (!this._dragging || !this._dragGhost) return;

    this._currentY = clientY;
    this._updateGhostPosition(clientY);

    // 实时换位
    const placeholder = this._placeholder;
    if (!placeholder) return;

    const children = Array.from(this.container.children).filter(c => c !== this._dragCard && c !== placeholder && !c.classList.contains('home-list-card-ghost'));
    let closest = null;
    let closestOffset = Number.NEGATIVE_INFINITY;

    children.forEach(child => {
      const box = child.getBoundingClientRect();
      const offset = clientY - box.top - box.height / 2;
      if (offset < 0 && offset > closestOffset) {
        closestOffset = offset;
        closest = child;
      }
    });

    if (closest) {
      this.container.insertBefore(placeholder, closest);
    } else {
      this.container.appendChild(placeholder);
    }
  },

  _onTouchEnd(e) {
    this._onEnd();
  },

  _onMouseUp(e) {
    this._onEnd();
  },

  _onEnd() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }

    if (!this._dragging) {
      this._reset();
      return;
    }

    // 落位：把原卡片移到 placeholder 位置
    if (this._placeholder && this._dragCard) {
      this.container.insertBefore(this._dragCard, this._placeholder);
      this._placeholder.remove();
    }

    // 清理
    if (this._dragGhost) {
      this._dragGhost.remove();
    }
    if (this._dragCard) {
      this._dragCard.classList.remove('home-list-card-dragging');
    }

    // 持久化新顺序
    const newOrder = Array.from(this.container.children)
      .filter(c => c.classList.contains('home-list-card'))
      .map(c => c.dataset.listId);
    StorageManager.setListOrder(newOrder);

    this._reset();
  }
};

/**
 * 自定义编辑模式管理器
 */
const HomeEditManager = {
  toggle() {
    AppState.isEditing = !AppState.isEditing;
    const btn = document.getElementById('home-custom-btn');
    const addBtn = document.getElementById('add-list-btn');
    const container = document.getElementById('list-cards-container');

    if (AppState.isEditing) {
      if (btn) btn.textContent = '完成';
      if (addBtn) addBtn.classList.remove('hidden');
      if (container) container.classList.add('home-list-editing');
      // 启用拖动
      DragSortManager._reset();
    } else {
      if (btn) btn.textContent = '自定义';
      if (addBtn) addBtn.classList.add('hidden');
      if (container) container.classList.remove('home-list-editing');
    }

    // 重新渲染以更新角标/样式
    renderListCards();
  }
};

/**
 * 显示清单详情页
 */
function showListDetail(listId) {
  showView('detail', listId);
}

// 详情页编辑态
let detailEditMode = false;
// 记录当前详情页所属清单 id，用于切换清单时重置编辑态
let detailCurrentListId = null;

/**
 * 渲染清单详情
 */
function renderListDetail(listId) {
  // 切换清单时重置编辑态；编辑按钮点击时 listId 不变，不重置
  if (detailCurrentListId !== null && detailCurrentListId !== listId) {
    detailEditMode = false;
  }
  detailCurrentListId = listId;

  const list = AppState.lists.find(l => l.id === listId);
  if (!list) return;

  const progress = StorageManager.calculateListProgress(list);

  const header = document.getElementById('detail-header');
  header.style.background = `linear-gradient(135deg, ${list.color}, ${list.color}CC)`;

  document.getElementById('detail-emoji').textContent = list.emoji;
  document.getElementById('detail-title').textContent = list.title;
  document.getElementById('detail-percent').textContent = Math.round(progress.percentage) + '%';

  // 编辑按钮
  const editBtn = document.getElementById('detail-edit-btn');
  if (editBtn) {
    editBtn.textContent = detailEditMode ? '完成' : '编辑';
    editBtn.onclick = () => {
      detailEditMode = !detailEditMode;
      renderListDetail(listId);
    };
  }

  renderTaskTags(list);
  bindDetailBottomActions(listId);
}

/**
 * 渲染标签网格
 */
function renderTaskTags(list) {
  const container = document.getElementById('task-tags-container');
  if (!container) return;
  container.innerHTML = '';

  if (detailEditMode) {
    container.classList.add('task-tags-editing');
  } else {
    container.classList.remove('task-tags-editing');
  }

  list.tasks.forEach((task, index) => {
    const tag = createTaskTag(list.id, task, list.color);
    container.appendChild(tag);
  });

  // 空清单且非编辑态时显示空状态提示
  if (list.tasks.length === 0 && !detailEditMode) {
    const emptyHint = document.createElement('div');
    emptyHint.className = 'detail-empty-tags';
    emptyHint.textContent = '还没有任务，点「编辑」添加吧';
    container.appendChild(emptyHint);
  }

  // 编辑态末尾添加「+添加」标签
  if (detailEditMode) {
    const addTag = document.createElement('button');
    addTag.className = 'task-tag-add';
    addTag.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      添加
    `;
    addTag.addEventListener('click', () => {
      CustomManager.showAddTaskModal(list.id);
    });
    container.appendChild(addTag);
  }
}

/**
 * 创建单个任务标签
 */
function createTaskTag(listId, task, color) {
  const tag = document.createElement('div');
  tag.className = `task-tag ${task.completed ? 'completed' : ''}`;
  tag.dataset.taskId = task.id;
  tag.dataset.listId = listId;
  if (task.completed) {
    tag.style.background = color;
  }

  tag.textContent = task.text;

  // 编辑态删除角标
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'task-tag-delete';
  deleteBtn.textContent = '×';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    TaskDetailManager.deleteTask(listId, task.id);
  });
  tag.appendChild(deleteBtn);

  // 轻点/长按判定
  bindTagTapLongPress(tag, listId, task.id, task.completed);

  return tag;
}

/**
 * 标签轻点/长按判定（原生手写，支持触摸+鼠标）
 */
function bindTagTapLongPress(tag, listId, taskId, currentCompleted) {
  const LONG_PRESS_MS = 500;
  const MOVE_THRESHOLD = 10;

  let timer = null;
  let longPressFired = false;
  let startX = 0;
  let startY = 0;

  function onStart(x, y) {
    startX = x;
    startY = y;
    longPressFired = false;
    timer = setTimeout(() => {
      longPressFired = true;
      // 长按触发任务详情
      TaskDetailManager.showTaskDetail(listId, taskId);
      // 防止触发系统菜单
      if (navigator.vibrate) navigator.vibrate(50);
    }, LONG_PRESS_MS);
  }

  function onMove(x, y) {
    if (!timer) return;
    const dx = Math.abs(x - startX);
    const dy = Math.abs(y - startY);
    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function onEnd() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    // 若长按未触发，视为轻点打卡
    if (!longPressFired) {
      const newCompleted = !currentCompleted;
      applyTaskToggleEffects(listId, taskId, newCompleted, tag);
    }
  }

  // 触摸事件
  tag.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    onStart(touch.clientX, touch.clientY);
  }, { passive: true });

  tag.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    onMove(touch.clientX, touch.clientY);
  }, { passive: true });

  tag.addEventListener('touchend', (e) => {
    e.preventDefault();
    onEnd();
  });

  tag.addEventListener('touchcancel', () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  });

  // 鼠标事件
  tag.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    onStart(e.clientX, e.clientY);
  });

  tag.addEventListener('mousemove', (e) => {
    onMove(e.clientX, e.clientY);
  });

  tag.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;
    onEnd();
  });

  tag.addEventListener('mouseleave', () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  });

  // 阻止右键菜单（长按保护）
  tag.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
}

/**
 * 应用任务打卡副作用（复用现有逻辑，锚点改为标签元素）
 */
function applyTaskToggleEffects(listId, taskId, completed, anchorEl) {
  AppState.lists = StorageManager.updateTaskStatus(listId, taskId, completed);

  if (completed) {
    AnimationManager.createCheckAnimation(anchorEl);
    setTimeout(() => {
      AnimationManager.createConfetti(anchorEl);
    }, 200);
  }

  // 就地更新标签样式
  const tag = document.querySelector(`.task-tag[data-task-id="${taskId}"]`);
  if (tag) {
    tag.classList.toggle('completed', completed);
    const list = AppState.lists.find(l => l.id === listId);
    if (list) {
      tag.style.background = completed ? list.color : '';
    }
  }

  // 更新标题条百分比
  const list = AppState.lists.find(l => l.id === listId);
  if (list) {
    const progress = StorageManager.calculateListProgress(list);
    const percentEl = document.getElementById('detail-percent');
    if (percentEl) {
      percentEl.textContent = Math.round(progress.percentage) + '%';
    }
  }

  // 首页联动
  renderListCards();
  updateOverallStats();
  updateListsOverview();
  checkAndShowAchievements();
}

/**
 * 绑定详情页底部操作栏
 */
function bindDetailBottomActions(listId) {
  const themeBtn = document.getElementById('detail-theme-btn');
  const shareBtn = document.getElementById('detail-share-btn');
  const deleteBtn = document.getElementById('detail-delete-btn');

  if (themeBtn) {
    themeBtn.onclick = () => showDetailColorPicker(listId);
  }
  if (shareBtn) {
    shareBtn.onclick = () => {
      const card = document.getElementById('detail-header');
      if (card) ShareManager.captureCard(card);
    };
  }
  if (deleteBtn) {
    deleteBtn.onclick = () => CustomManager.deleteList(listId);
  }
}

/**
 * 详情页主题配色选择器
 */
function showDetailColorPicker(listId) {
  const colors = ['#007AFF', '#FF9500', '#FF2D55', '#34C759', '#5856D6', '#AF52DE', '#FF3B30', '#5AC8FA'];
  const lists = StorageManager.getLists() || [];
  const list = lists.find(l => l.id === listId);
  if (!list) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 320px;">
      <h3>🎨 主题配色</h3>
      <p class="modal-desc">选择清单主题颜色</p>
      <div class="color-picker" id="detail-color-picker">
        ${colors.map(c => `
          <span class="color-option ${list.color === c ? 'selected' : ''}" data-color="${c}" style="background: ${c}"></span>
        `).join('')}
      </div>
      <button class="modal-btn modal-btn-confirm" style="width: 100%; margin-top: 1rem;" onclick="this.closest('.modal-overlay').remove()">完成</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', () => {
      const newColor = option.dataset.color;
      list.color = newColor;
      StorageManager.setLists(lists);
      AppState.lists = lists;

      // 重渲染详情页
      renderListDetail(listId);
      // 首页联动
      renderListCards();

      overlay.remove();
    });
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

/**
 * 渲染任务列表（旧版，保留兼容）
 */
function renderTaskList(list) {
  const container = document.getElementById('task-list');
  if (!container) return;
  container.innerHTML = '';

  list.tasks.forEach((task, index) => {
    const taskItem = createTaskItem(list.id, task, list.color);
    container.appendChild(taskItem);
    AnimationManager.animateCardEntrance(taskItem, index * 80);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'add-task-btn';
  addBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 5v14M5 12h14"/>
    </svg>
    添加新任务
  `;
  addBtn.addEventListener('click', () => {
    CustomManager.showAddTaskModal(list.id);
  });
  container.appendChild(addBtn);
}

/**
 * 创建任务项（旧版 checkbox，保留兼容）
 */
function createTaskItem(listId, task, color) {
  const item = document.createElement('div');
  item.className = `task-item ${task.completed ? 'completed' : ''}`;
  item.dataset.taskId = task.id;

  let priorityBadge = '';
  if (task.priority === 'high') priorityBadge = '<span class="priority-badge high">高</span>';
  else if (task.priority === 'medium') priorityBadge = '<span class="priority-badge medium">中</span>';

  const noteIndicator = task.note ? '<span class="note-indicator">📝</span>' : '';

  item.innerHTML = `
    <label class="task-checkbox-wrapper">
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
      <span class="checkbox-custom" style="border-color: ${color}; ${task.completed ? `background: ${color}` : ''}"></span>
    </label>
    <div class="task-content">
      <span class="task-text">${task.text}</span>
      <div class="task-meta">
        ${priorityBadge}
        ${noteIndicator}
      </div>
    </div>
    <button class="task-detail-btn" onclick="event.stopPropagation(); TaskDetailManager.showTaskDetail('${listId}', '${task.id}')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
      </svg>
    </button>
  `;

  const checkbox = item.querySelector('.task-checkbox');
  checkbox.addEventListener('change', (e) => {
    handleTaskToggle(listId, task.id, e.target.checked, e.target);
  });

  return item;
}

/**
 * 处理任务状态切换（兼容旧 checkbox 调用）
 */
function handleTaskToggle(listId, taskId, completed, checkbox) {
  const anchorEl = checkbox || document.querySelector(`.task-tag[data-task-id="${taskId}"]`);
  applyTaskToggleEffects(listId, taskId, completed, anchorEl);
}

/**
 * 检查并显示成就
 */
function checkAndShowAchievements() {
  const newAchievements = StorageManager.checkAchievements();
  if (newAchievements.length > 0) {
    setTimeout(() => {
      AchievementManager.showMultipleUnlock(newAchievements);
    }, 500);
  }
}

/**
 * 显示排序菜单
 */
function showSortMenu() {
  const currentSort = SettingsManager.getSortMethod();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 300px;">
      <h3>📊 排序方式</h3>
      <div class="sort-options">
        <div class="sort-option ${currentSort === 'default' ? 'selected' : ''}" data-sort="default">
          <span>📌</span>
          <span>默认顺序</span>
        </div>
        <div class="sort-option ${currentSort === 'progress' ? 'selected' : ''}" data-sort="progress">
          <span>📈</span>
          <span>按进度排序</span>
        </div>
        <div class="sort-option ${currentSort === 'name' ? 'selected' : ''}" data-sort="name">
          <span>🔤</span>
          <span>按名称排序</span>
        </div>
        <div class="sort-option ${currentSort === 'tasks' ? 'selected' : ''}" data-sort="tasks">
          <span>📝</span>
          <span>按任务数排序</span>
        </div>
      </div>
      <button class="modal-btn modal-btn-confirm" style="width: 100%; margin-top: 1rem;" onclick="this.closest('.modal-overlay').remove()">完成</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelectorAll('.sort-option').forEach(option => {
    option.addEventListener('click', () => {
      const sort = option.dataset.sort;
      SettingsManager.setSortMethod(sort);

      overlay.querySelectorAll('.sort-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');

      renderListCards();
    });
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

/**
 * 显示清单大全页
 */
function showTemplatesPage() {
  showView('templates');
}

/**
 * 显示人生轴页
 */
function showTimelinePage() {
  showView('timeline');
}

/**
 * 显示成就页面
 */
function showAchievementsPage() {
  showView('achievements');
}

/**
 * 显示统计页面
 */
function showStatisticsPage() {
  showView('statistics');
}

/**
 * 显示个人中心页面
 */
function showProfilePage() {
  showView('profile');
}

/**
 * 更新导航状态
 */
function updateNavigation(activeView) {
  document.querySelectorAll('.nav-item').forEach(item => {
    const view = item.dataset.view;
    if (view === activeView) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

/**
 * 显示 AI 人生报告页
 */
function showReportPage() {
  showView('report');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);
