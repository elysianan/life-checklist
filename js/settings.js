/**
 * 设置管理模块
 */

const SettingsManager = {
  KEYS: {
    THEME: 'life_checklist_theme',
    SORT: 'life_checklist_sort',
    AI_CONFIG: 'life_checklist_ai_config'
  },

  getTheme() {
    return localStorage.getItem(this.KEYS.THEME) || 'auto';
  },

  setTheme(theme) {
    localStorage.setItem(this.KEYS.THEME, theme);
    this.applyTheme(theme);
  },

  applyTheme(theme) {
    const html = document.documentElement;
    let dark;
    if (theme === 'dark') dark = true;
    else if (theme === 'light') dark = false;
    else dark = window.matchMedia('(prefers-color-scheme: dark)').matches; // auto 跟随系统
    html.classList.toggle('dark', dark);
    html.style.colorScheme = dark ? 'dark' : 'light';
  },

  getSortMethod() {
    return localStorage.getItem(this.KEYS.SORT) || 'default';
  },

  setSortMethod(method) {
    localStorage.setItem(this.KEYS.SORT, method);
  },

  sortLists(lists) {
    const method = this.getSortMethod();

    switch (method) {
      case 'progress':
        return lists.sort((a, b) => {
          const progressA = StorageManager.calculateListProgress(a).percentage;
          const progressB = StorageManager.calculateListProgress(b).percentage;
          return progressB - progressA;
        });
      case 'name':
        return lists.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
      case 'tasks':
        return lists.sort((a, b) => b.tasks.length - a.tasks.length);
      default:
        return lists;
    }
  },

  // 预置大模型厂商（OpenAI 兼容）
  AI_PROVIDERS: {
    kimi:     { label: 'Kimi (Moonshot)', baseURL: 'https://api.moonshot.cn/v1',          model: 'moonshot-v1-8k' },
    deepseek: { label: 'DeepSeek',         baseURL: 'https://api.deepseek.com/v1',          model: 'deepseek-chat' },
    glm:      { label: '智谱 GLM',         baseURL: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' }
  },

  // 读取 AI 配置（baseURL 由 provider 派生，不持久化）
  getAIConfig() {
    const raw = localStorage.getItem(this.KEYS.AI_CONFIG);
    const defaults = { provider: 'kimi', apiKey: '', model: '', enabled: false };
    let saved = {};
    if (raw) { try { saved = JSON.parse(raw); } catch (e) { saved = {}; } }
    const cfg = { ...defaults, ...saved };
    const provider = this.AI_PROVIDERS[cfg.provider] ? cfg.provider : 'kimi';
    cfg.baseURL = this.AI_PROVIDERS[provider].baseURL;
    if (!cfg.model) cfg.model = this.AI_PROVIDERS[provider].model;
    return cfg;
  },

  // 合并保存 AI 配置（只持久化用户可改字段）
  setAIConfig(partial) {
    const merged = { ...this.getAIConfig(), ...partial };
    const toSave = { provider: merged.provider, apiKey: merged.apiKey, model: merged.model, enabled: merged.enabled };
    localStorage.setItem(this.KEYS.AI_CONFIG, JSON.stringify(toSave));
    return this.getAIConfig();
  },

  init() {
    this.applyTheme(this.getTheme());

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.getTheme() === 'auto') {
        this.applyTheme('auto');
      }
    });
  }
};
