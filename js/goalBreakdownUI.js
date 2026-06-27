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

    // 直接更新 AppState.lists，避免重新从 Storage 读取
    AppState.lists.push(newList);
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