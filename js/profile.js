/**
 * 个人中心模块
 */

const ProfileManager = {
  renderProfilePage() {
    const stats = StorageManager.getOverallStats();
    const achievements = StorageManager.getUnlockedAchievements();
    const birthDate = StorageManager.getBirthDate();

    this.updateUserInfo(birthDate, stats);
    this.updateProfileStats(stats, achievements);
    this.renderAchievementPreview();
    this.renderSettingsList();
    this.renderReportEntry();
  },

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

  updateUserInfo(birthDate, stats) {
    if (birthDate) {
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      document.getElementById('profile-age').textContent = age + ' 岁';
    } else {
      document.getElementById('profile-age').textContent = '';
    }

    const level = this.calculateLevel(stats.totalCompleted);
    document.getElementById('profile-level').textContent = 'Lv.' + level;

    const nextLevelProgress = this.calculateLevelProgress(stats.totalCompleted);
    document.getElementById('level-progress').style.width = nextLevelProgress + '%';
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

  updateProfileStats(stats, achievements) {
    document.getElementById('profile-total-completed').textContent = stats.totalCompleted;
    document.getElementById('profile-total-tasks').textContent = stats.totalTasks;
    document.getElementById('profile-achievements').textContent = achievements.length;
    document.getElementById('profile-today').textContent = stats.todayCompleted;
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
      { icon: '🌙', label: `主题：${currentTheme === 'auto' ? '跟随系统' : currentTheme === 'dark' ? '深色' : '浅色'}`, action: 'changeTheme' },
      { icon: '🎂', label: '修改出生日期', action: 'editBirthDate' },
      { icon: '📤', label: '导出数据', action: 'exportData' },
      { icon: '🔄', label: '重置所有进度', action: 'resetProgress' },
      { icon: '🤖', label: 'AI 助手设置', action: 'aiSettings' },
      { icon: 'ℹ️', label: '关于应用', action: 'about' }
    ];

    container.innerHTML = '';

    settings.forEach(setting => {
      const item = document.createElement('div');
      item.className = 'setting-item';
      item.innerHTML = `
        <div class="setting-icon">${setting.icon}</div>
        <div class="setting-label">${setting.label}</div>
        <div class="setting-arrow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      `;
      item.addEventListener('click', () => this.handleSettingAction(setting.action));
      container.appendChild(item);
    });

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
  },

  handleSettingAction(action) {
    switch (action) {
      case 'changeTheme':
        this.changeTheme();
        break;
      case 'editBirthDate':
        this.editBirthDate();
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
        <h3>⚠️ 确认重置</h3>
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
        <div class="about-logo">✨</div>
        <h3>人生已完成清单</h3>
        <p class="about-version">v5.0.0</p>
        <p class="about-desc">记录人生每一个值得铭记的时刻</p>
        <div class="about-features">
          <span>🎯 目标追踪</span>
          <span>📚 清单大全</span>
          <span>📅 人生轴</span>
          <span>🏆 成就系统</span>
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
