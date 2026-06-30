/**
 * 个人中心模块
 */

const ProfileManager = {
  renderProfilePage() {
    const stats = StorageManager.getOverallStats();

    this.updateUserInfo(stats);
    this.renderAchievementPreview();
    this.renderSettingsList();
  },

  updateUserInfo(stats) {
    const level = this.calculateLevel(stats.totalCompleted);
    document.getElementById('profile-level').textContent = 'Lv.' + level;
    document.getElementById('level-progress-text').textContent =
      `距离下一级还需 ${this.getTasksToNextLevel(stats.totalCompleted)} 个任务`;
  },

  calculateLevel(completed) {
    if (completed >= 100) return 10;
    if (completed >= 80) return 9;
    if (completed >= 60) return 8;
    if (completed >= 50) return 7;
    if (completed >= 40) return 6;
    if (completed >= 30) return 5;
    if (completed >= 20) return 4;
    if (completed >= 10) return 3;
    if (completed >= 5) return 2;
    if (completed >= 1) return 1;
    return 0;
  },

  calculateLevelProgress(completed) {
    const thresholds = [0, 1, 5, 10, 20, 30, 40, 50, 60, 80, 100];
    const level = this.calculateLevel(completed);

    if (level >= 10) return 100;

    const currentThreshold = thresholds[level];
    const nextThreshold = thresholds[level + 1];
    const progress = ((completed - currentThreshold) / (nextThreshold - currentThreshold)) * 100;

    return Math.min(100, Math.max(0, progress));
  },

  getTasksToNextLevel(completed) {
    const thresholds = [0, 1, 5, 10, 20, 30, 40, 50, 60, 80, 100];
    const level = this.calculateLevel(completed);

    if (level >= 10) return 0;

    return thresholds[level + 1] - completed;
  },

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
      return;
    }

    recentAchievements.forEach(achievement => {
      const badge = document.createElement('div');
      badge.className = 'achievement-preview-badge';
      badge.innerHTML = `<span class="preview-emoji">${achievement.emoji}</span>`;
      badge.title = achievement.title;
      container.appendChild(badge);
    });
  },

  renderSettingsList() {
    const container = document.getElementById('settings-list');
    if (!container) return;

    const currentTheme = SettingsManager.getTheme();

    const settings = [
      { icon: this._svg('sparkles'), label: 'AI 人生报告', action: 'openReport', hasArrow: true },
      { icon: this._svg('moon'), label: `主题：${currentTheme === 'auto' ? '跟随系统' : currentTheme === 'dark' ? '深色' : '浅色'}`, action: 'changeTheme', hasArrow: true },
      { icon: this._svg('cake'), label: '修改出生日期', action: 'editBirthDate', hasArrow: true },
      { icon: this._svg('lifeExpectancy'), label: '预期寿命', action: 'editLifeExpectancy', value: StorageManager.getLifeExpectancy() + ' 岁', hasArrow: true },
      { icon: this._svg('export'), label: '导出数据', action: 'exportData', hasArrow: true },
      { icon: this._svg('ai'), label: 'AI 助手设置', action: 'aiSettings', hasArrow: true },
      { icon: this._svg('reset'), label: '重置所有进度', action: 'resetProgress', hasArrow: false },
      { icon: this._svg('info'), label: '关于应用', action: 'about', hasArrow: true }
    ];

    container.innerHTML = '';

    settings.forEach(setting => {
      const item = document.createElement('div');
      item.className = 'setting-item';
      item.innerHTML = `
        <div class="setting-icon">${setting.icon}</div>
        <div class="setting-label">${setting.label}</div>
        ${setting.value ? `<span class="setting-value">${setting.value}</span>` : ''}
        ${setting.hasArrow ? `<div class="setting-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></div>` : ''}
      `;
      item.addEventListener('click', () => this.handleSettingAction(setting.action));
      container.appendChild(item);
    });
  },

  _svg(name) {
    const svgs = {
      sparkles: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L14.5 8.5L20 11L14.5 13.5L12 19L9.5 13.5L4 11L9.5 8.5L12 3Z"/></svg>',
      moon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
      cake: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s1.5-2 4-2 4 2 6 2 3-2 6-2"/><path d="M12 6v4"/><path d="M15 7a3 3 0 1 0-6 0"/></svg>',
      lifeExpectancy: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      export: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
      ai: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
      reset: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
      info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    return svgs[name] || '';
  },

  handleSettingAction(action) {
    switch (action) {
      case 'openReport':
        ReportManager.open();
        break;
      case 'changeTheme':
        this.changeTheme();
        break;
      case 'editBirthDate':
        this.editBirthDate();
        break;
      case 'editLifeExpectancy':
        this.editLifeExpectancy();
        break;
      case 'resetProgress':
        this.resetProgress();
        break;
      case 'exportData':
        this.exportData();
        break;
      case 'aiSettings':
        this.showAISettings();
        break;
      case 'about':
        this.showAbout();
        break;
    }
  },

  editLifeExpectancy() {
    const cur = StorageManager.getLifeExpectancy();
    const input = prompt('设置预期寿命（60~120）', String(cur));
    if (input === null) return;
    const v = parseInt(input, 10);
    if (Number.isFinite(v) && v >= 60 && v <= 120) {
      StorageManager.setLifeExpectancy(v);
      this.renderSettingsList();
    }
  },

  changeTheme() {
    const themes = ['auto', 'light', 'dark'];
    const current = SettingsManager.getTheme();
    const nextIndex = (themes.indexOf(current) + 1) % themes.length;
    const nextTheme = themes[nextIndex];

    SettingsManager.setTheme(nextTheme);
    this.renderSettingsList();
    this.showToast(`主题已切换为${nextTheme === 'auto' ? '跟随系统' : nextTheme === 'dark' ? '深色' : '浅色'}`);
  },

  editBirthDate() {
    const current = StorageManager.getBirthDate() || '';
    const input = document.createElement('input');
    input.type = 'date';
    input.value = current;
    input.className = 'date-input-modal';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <h3>设置出生日期</h3>
        <p class="modal-desc">用于计算人生进度</p>
        <div class="modal-input-container"></div>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" onclick="this.closest('.modal-overlay').remove()">取消</button>
          <button class="modal-btn modal-btn-confirm" id="confirm-birth-date">确定</button>
        </div>
      </div>
    `;

    overlay.querySelector('.modal-input-container').appendChild(input);
    document.body.appendChild(overlay);

    document.getElementById('confirm-birth-date').addEventListener('click', () => {
      if (input.value) {
        StorageManager.setBirthDate(input.value);
        overlay.remove();
        this.renderProfilePage();
        showHomePage();
        this.showToast('出生日期已更新 ✅');
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  },

  resetProgress() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <h3>确认重置</h3>
        <p class="modal-desc">此操作将清除所有进度数据，无法恢复</p>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" onclick="this.closest('.modal-overlay').remove()">取消</button>
          <button class="modal-btn modal-btn-danger" id="confirm-reset">确认重置</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('confirm-reset').addEventListener('click', () => {
      localStorage.clear();
      overlay.remove();
      window.location.reload();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  },

  exportData() {
    const data = {
      birthDate: StorageManager.getBirthDate(),
      lists: StorageManager.getLists(),
      achievements: StorageManager.getUnlockedAchievements(),
      timeline: StorageManager.getTimeline(),
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '人生清单数据_' + new Date().toISOString().slice(0, 10) + '.json';
    link.click();
    URL.revokeObjectURL(url);

    this.showToast('数据已导出 ✅');
  },

  showAbout() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content about-modal">
        <div class="about-logo">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3L14.5 8.5L20 11L14.5 13.5L12 19L9.5 13.5L4 11L9.5 8.5L12 3Z"/>
          </svg>
        </div>
        <h3>人生已完成清单</h3>
        <p class="about-version">v6.8.0</p>
        <p class="about-desc">记录人生每一个值得铭记的时刻</p>
        <div class="about-features">
          <span>目标追踪</span>
          <span>清单大全</span>
          <span>人生轴</span>
          <span>成就系统</span>
        </div>
        <button class="modal-btn modal-btn-confirm" onclick="this.closest('.modal-overlay').remove()">知道了</button>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  },

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
        <h3>AI 助手设置</h3>
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

  showToast(message) {
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
};
