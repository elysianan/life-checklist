/**
 * 人生已完成清单 - 主应用逻辑
 */

const AppState = {
  currentView: 'home',
  currentListId: null,
  lists: [],
  birthDate: null
};

/**
 * 初始化应用
 */
function initApp() {
  SettingsManager.init();
  SoundManager.init();
  StorageManager.initializeData();

  // 更新连续打卡状态（处理新的一天/断签）
  StorageManager.updateStreak();
  StorageManager.updateLastVisit();

  AppState.lists = StorageManager.getLists();
  AppState.birthDate = StorageManager.getBirthDate();

  renderHomePage();
  bindEvents();
  checkAndShowAchievements();
}

/**
 * 绑定全局事件
 */
function bindEvents() {
  const birthDateInput = document.getElementById('birth-date');
  birthDateInput.addEventListener('change', handleBirthDateChange);

  document.getElementById('back-btn').addEventListener('click', showListsPage);
  document.getElementById('ach-back-btn').addEventListener('click', showHomePage);
  document.getElementById('stats-back-btn').addEventListener('click', showHomePage);
  document.getElementById('profile-back-btn').addEventListener('click', showHomePage);
  document.getElementById('template-back-btn').addEventListener('click', showHomePage);
  document.getElementById('timeline-back-btn').addEventListener('click', showHomePage);

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
      }
    });
  });

  document.getElementById('share-btn').addEventListener('click', () => {
    ShareManager.showShareModal();
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
}

/**
 * 处理出生日期变更
 */
function handleBirthDateChange(e) {
  const dateStr = e.target.value;
  if (dateStr) {
    StorageManager.setBirthDate(dateStr);
    AppState.birthDate = dateStr;
    updateLifeProgress();
  }
}

/**
 * 更新人生进度
 */
function updateLifeProgress() {
  const progress = StorageManager.calculateLifeProgress(AppState.birthDate);

  const progressCircle = document.getElementById('life-progress-circle');
  if (progressCircle) {
    AnimationManager.animateCircularProgress(progressCircle, progress);
  }

  const percentElement = document.getElementById('life-progress-percent');
  if (percentElement) {
    const currentValue = parseFloat(percentElement.textContent) || 0;
    AnimationManager.animateFloatNumber(percentElement, currentValue, Math.round(progress * 10) / 10, 1000);
  }

  updateOverallStats();
  updateQuickStats();
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
 * 更新快速统计
 */
function updateQuickStats() {
  if (!AppState.birthDate) return;

  const birthDate = new Date(AppState.birthDate);
  const today = new Date();

  const livedDays = Math.floor((today - birthDate) / (1000 * 60 * 60 * 24));
  document.getElementById('days-lived').textContent = livedDays.toLocaleString();

  const totalDays = 80 * 365.25;
  const leftDays = Math.max(0, Math.floor(totalDays - livedDays));
  document.getElementById('days-left').textContent = leftDays.toLocaleString();

  const todayCompleted = StorageManager.getTodayCompleted();
  document.getElementById('today-completed').textContent = todayCompleted;
}

/**
 * 渲染首页
 */
function renderHomePage() {
  const birthDateInput = document.getElementById('birth-date');
  if (AppState.birthDate) {
    birthDateInput.value = AppState.birthDate;
  }

  updateLifeProgress();
  updateDailyQuote();
  updateStreakDisplay();
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
 * 显示首页
 */
function showHomePage() {
  AppState.currentView = 'home';
  AppState.currentListId = null;

  document.getElementById('home-view').classList.remove('hidden');
  document.getElementById('report-view').classList.add('hidden');
  document.getElementById('lists-view').classList.add('hidden');
  document.getElementById('templates-view').classList.add('hidden');
  document.getElementById('timeline-view').classList.add('hidden');
  document.getElementById('detail-view').classList.add('hidden');
  document.getElementById('achievements-view').classList.add('hidden');
  document.getElementById('statistics-view').classList.add('hidden');
  document.getElementById('profile-view').classList.add('hidden');

  renderHomePage();
}

/**
 * 显示清单页
 */
function showListsPage() {
  AppState.currentView = 'lists';
  AppState.currentListId = null;

  document.getElementById('home-view').classList.add('hidden');
  document.getElementById('report-view').classList.add('hidden');
  document.getElementById('lists-view').classList.remove('hidden');
  document.getElementById('templates-view').classList.add('hidden');
  document.getElementById('timeline-view').classList.add('hidden');
  document.getElementById('detail-view').classList.add('hidden');
  document.getElementById('achievements-view').classList.add('hidden');
  document.getElementById('statistics-view').classList.add('hidden');
  document.getElementById('profile-view').classList.add('hidden');

  renderListsPage();
  updateNavigation('lists');
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

  document.getElementById('lists-total').textContent = totalLists;
  document.getElementById('lists-completed').textContent = completedLists;
  document.getElementById('lists-tasks').textContent = totalTasks;
  document.getElementById('lists-count').textContent = `共 ${totalLists} 个清单`;
}

/**
 * 渲染清单卡片列表
 */
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

/**
 * 创建清单卡片
 */
function createListCard(list, progress) {
  const card = document.createElement('div');
  card.className = 'list-card';
  card.dataset.listId = list.id;
  card.style.borderLeftColor = list.color || '#007AFF';

  card.innerHTML = `
    <div class="card-emoji" style="background: ${list.color}15">
      ${list.emoji}
    </div>
    <div class="card-content">
      <h3 class="card-title">${list.title}</h3>
      <p class="card-description">${list.description}</p>
      <div class="card-progress">
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${progress.percentage}%; background: ${list.color}"></div>
        </div>
        <span class="progress-text">${progress.completed}/${progress.total}</span>
      </div>
    </div>
    <div class="card-arrow">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>
  `;

  card.addEventListener('click', () => showListDetail(list.id));

  return card;
}

/**
 * 显示清单详情页
 */
function showListDetail(listId) {
  AppState.currentView = 'detail';
  AppState.currentListId = listId;

  document.getElementById('home-view').classList.add('hidden');
  document.getElementById('report-view').classList.add('hidden');
  document.getElementById('lists-view').classList.add('hidden');
  document.getElementById('templates-view').classList.add('hidden');
  document.getElementById('timeline-view').classList.add('hidden');
  document.getElementById('achievements-view').classList.add('hidden');
  document.getElementById('statistics-view').classList.add('hidden');
  document.getElementById('profile-view').classList.add('hidden');
  document.getElementById('detail-view').classList.remove('hidden');

  renderListDetail(listId);
}

/**
 * 渲染清单详情
 */
function renderListDetail(listId) {
  const list = AppState.lists.find(l => l.id === listId);
  if (!list) return;

  const progress = StorageManager.calculateListProgress(list);

  const header = document.getElementById('detail-header');
  header.style.background = `linear-gradient(135deg, ${list.color}, ${list.color}CC)`;

  document.getElementById('detail-emoji').textContent = list.emoji;
  document.getElementById('detail-title').textContent = list.title;
  document.getElementById('detail-description').textContent = list.description;

  const actionsContainer = document.getElementById('detail-actions');
  if (actionsContainer) {
    actionsContainer.innerHTML = `
      <button class="detail-action-btn" onclick="CustomManager.editListName('${listId}')">✏️ 编辑</button>
      <button class="detail-action-btn" onclick="CustomManager.deleteList('${listId}')">🗑️ 删除</button>
    `;
  }

  const detailCircle = document.getElementById('detail-progress-circle');
  if (detailCircle) {
    detailCircle.style.transition = 'none';
    detailCircle.style.strokeDashoffset = 251.2;

    setTimeout(() => {
      AnimationManager.animateCircularProgress(detailCircle, progress.percentage);
    }, 100);
  }

  document.getElementById('detail-progress-percent').textContent = Math.round(progress.percentage);
  document.getElementById('detail-progress-text').textContent =
    `已完成 ${progress.completed} / ${progress.total} 项`;

  renderTaskList(list);
}

/**
 * 渲染任务列表
 */
function renderTaskList(list) {
  const container = document.getElementById('task-list');
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
 * 创建任务项
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
 * 处理任务状态切换
 */
function handleTaskToggle(listId, taskId, completed, checkbox) {
  AppState.lists = StorageManager.updateTaskStatus(listId, taskId, completed);

  if (completed) {
    SoundManager.playComplete();
  } else {
    SoundManager.playUncheck();
  }

  if (completed) {
    AnimationManager.createCheckAnimation(checkbox);
    setTimeout(() => {
      AnimationManager.createConfetti(checkbox);
    }, 200);
  }

  const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
  if (taskItem) {
    taskItem.classList.toggle('completed', completed);

    const customCheckbox = taskItem.querySelector('.checkbox-custom');
    const list = AppState.lists.find(l => l.id === listId);
    if (customCheckbox && list) {
      if (completed) {
        customCheckbox.style.background = list.color;
        customCheckbox.style.borderColor = list.color;
      } else {
        customCheckbox.style.background = 'transparent';
        customCheckbox.style.borderColor = list.color;
      }
    }
  }

  const list = AppState.lists.find(l => l.id === listId);
  if (list) {
    const progress = StorageManager.calculateListProgress(list);

    const detailCircle = document.getElementById('detail-progress-circle');
    if (detailCircle) {
      AnimationManager.animateCircularProgress(detailCircle, progress.percentage, 800);
    }

    const percentElement = document.getElementById('detail-progress-percent');
    if (percentElement) {
      const currentValue = parseInt(percentElement.textContent) || 0;
      AnimationManager.animateNumber(percentElement, currentValue, Math.round(progress.percentage), 600);
    }

    document.getElementById('detail-progress-text').textContent =
      `已完成 ${progress.completed} / ${progress.total} 项`;
  }

  renderListCards();
  updateOverallStats();
  updateListsOverview();
  checkAndShowAchievements();
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
  AppState.currentView = 'templates';

  document.getElementById('home-view').classList.add('hidden');
  document.getElementById('report-view').classList.add('hidden');
  document.getElementById('lists-view').classList.add('hidden');
  document.getElementById('templates-view').classList.remove('hidden');
  document.getElementById('timeline-view').classList.add('hidden');
  document.getElementById('detail-view').classList.add('hidden');
  document.getElementById('achievements-view').classList.add('hidden');
  document.getElementById('statistics-view').classList.add('hidden');
  document.getElementById('profile-view').classList.add('hidden');

  TemplateManager.renderTemplateLibrary();
  updateNavigation('templates');
}

/**
 * 显示人生轴页
 */
function showTimelinePage() {
  AppState.currentView = 'timeline';

  document.getElementById('home-view').classList.add('hidden');
  document.getElementById('report-view').classList.add('hidden');
  document.getElementById('lists-view').classList.add('hidden');
  document.getElementById('templates-view').classList.add('hidden');
  document.getElementById('timeline-view').classList.remove('hidden');
  document.getElementById('detail-view').classList.add('hidden');
  document.getElementById('achievements-view').classList.add('hidden');
  document.getElementById('statistics-view').classList.add('hidden');
  document.getElementById('profile-view').classList.add('hidden');

  TimelineManager.renderTimelinePage();
  updateNavigation('timeline');
}

/**
 * 显示成就页面
 */
function showAchievementsPage() {
  AppState.currentView = 'achievements';

  document.getElementById('home-view').classList.add('hidden');
  document.getElementById('report-view').classList.add('hidden');
  document.getElementById('lists-view').classList.add('hidden');
  document.getElementById('templates-view').classList.add('hidden');
  document.getElementById('timeline-view').classList.add('hidden');
  document.getElementById('detail-view').classList.add('hidden');
  document.getElementById('statistics-view').classList.add('hidden');
  document.getElementById('profile-view').classList.add('hidden');
  document.getElementById('achievements-view').classList.remove('hidden');

  updateNavigation('achievements');

  const container = document.getElementById('achievement-wall');
  AchievementManager.renderAchievementWall(container);

  const stats = AchievementManager.getStats();
  document.getElementById('achievement-count').textContent = `${stats.unlocked}/${stats.total}`;

  const achievementCircle = document.getElementById('achievement-progress-circle');
  if (achievementCircle) {
    AnimationManager.animateCircularProgress(achievementCircle, stats.percentage);
  }
}

/**
 * 显示统计页面
 */
function showStatisticsPage() {
  AppState.currentView = 'statistics';

  document.getElementById('home-view').classList.add('hidden');
  document.getElementById('report-view').classList.add('hidden');
  document.getElementById('lists-view').classList.add('hidden');
  document.getElementById('templates-view').classList.add('hidden');
  document.getElementById('timeline-view').classList.add('hidden');
  document.getElementById('detail-view').classList.add('hidden');
  document.getElementById('achievements-view').classList.add('hidden');
  document.getElementById('profile-view').classList.add('hidden');
  document.getElementById('statistics-view').classList.remove('hidden');

  updateNavigation('statistics');
  StatisticsManager.renderStatisticsPage();
}

/**
 * 显示个人中心页面
 */
function showProfilePage() {
  AppState.currentView = 'profile';

  document.getElementById('home-view').classList.add('hidden');
  document.getElementById('report-view').classList.add('hidden');
  document.getElementById('lists-view').classList.add('hidden');
  document.getElementById('templates-view').classList.add('hidden');
  document.getElementById('timeline-view').classList.add('hidden');
  document.getElementById('detail-view').classList.add('hidden');
  document.getElementById('achievements-view').classList.add('hidden');
  document.getElementById('statistics-view').classList.add('hidden');
  document.getElementById('profile-view').classList.remove('hidden');

  updateNavigation('profile');
  ProfileManager.renderProfilePage();
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

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);
