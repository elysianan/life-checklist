/**
 * 余生闹钟 —— 计算引擎（纯逻辑，顶层不碰 DOM）
 */
const LifeClockEngine = {
  // 一年的毫秒数（按 365.25 天）
  MS_PER_YEAR: 365.25 * 24 * 60 * 60 * 1000,

  // 精确年龄（浮点年）。nowMs 为时间戳（毫秒）
  calcAge(birthDateStr, nowMs) {
    const birth = new Date(birthDateStr).getTime();
    return (nowMs - birth) / this.MS_PER_YEAR;
  },

  // 余生事件列表，每项 {emoji, text}
  calcEvents(ctx) {
    const ageYears = this.calcAge(ctx.birthDate, ctx.now);
    const remainingYears = Math.max(0, ctx.lifeExpectancy - Math.floor(ageYears));
    if (remainingYears <= 0) {
      return [{ emoji: '🎁', text: '每一天都是赚到' }];
    }
    const fullCtx = { ...ctx, ageYears, remainingYears };
    const events = ctx.events || LIFE_EVENTS;
    return events.map(ev => {
      const r = ev.calc(remainingYears, fullCtx);
      return typeof r === 'string' ? { emoji: ev.emoji, text: r } : r;
    });
  }
};

/**
 * 余生闹钟 —— 渲染与页面控制（依赖 DOM，方法内访问）
 */
const LifeClockUI = {
  _timer: null,
  DEMO_KEY: 'life_checklist_demo_birth',

  // 真实生日，否则取/生成会话级随机演示生日
  getEffectiveBirthDate() {
    const real = StorageManager.getBirthDate();
    if (real) return real;
    let demo = sessionStorage.getItem(this.DEMO_KEY);
    if (!demo) {
      const year = 1980 + Math.floor(Math.random() * 26);   // 1980~2005
      const month = 1 + Math.floor(Math.random() * 12);
      const day = 1 + Math.floor(Math.random() * 28);
      demo = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      sessionStorage.setItem(this.DEMO_KEY, demo);
    }
    return demo;
  },

  isDemo() { return !StorageManager.getBirthDate(); },

  show() {
    document.getElementById('life-birth-hint').classList.toggle('hidden', !this.isDemo());
    this.renderEvents();
    this.renderAge();
    this.startTick();

    const trigger = document.getElementById('life-birth-trigger');
    if (trigger) {
      trigger.onclick = () => {
        DatePickerManager.open(this.getEffectiveBirthDate(), (dateStr) => {
          StorageManager.setBirthDate(dateStr);
          this.show();   // 重渲染（演示提示消失、年龄/余生更新）
        });
      };
    }
  },

  renderAge() {
    const birth = this.getEffectiveBirthDate();
    const age = LifeClockEngine.calcAge(birth, Date.now());
    const el = document.getElementById('life-age-value');
    if (el) el.textContent = age.toFixed(8);
  },

  renderClockHands(now) {
    const s = now.getSeconds() + now.getMilliseconds() / 1000;
    const m = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + m / 60;
    const set = (id, deg) => {
      const el = document.getElementById(id);
      if (el) el.setAttribute('transform', `rotate(${deg} 100 100)`);
    };
    set('life-hand-hour', h * 30);
    set('life-hand-minute', m * 6);
    set('life-hand-second', s * 6);
  },

  renderEvents() {
    const birth = this.getEffectiveBirthDate();
    const events = LifeClockEngine.calcEvents({
      birthDate: birth,
      now: Date.now(),
      lifeExpectancy: StorageManager.getLifeExpectancy(),
      retireAge: StorageManager.getRetireAge()
    });
    const grid = document.getElementById('life-events-grid');
    if (!grid) return;
    grid.innerHTML = events.map(e =>
      `<div class="life-event-item"><span class="life-event-emoji">${e.emoji}</span><span>${e.text}</span></div>`
    ).join('');
  },

  startTick() {
    this.stopTick();
    const tick = () => {
      this.renderClockHands(new Date());
      this.renderAge();
      this._timer = requestAnimationFrame(tick);
    };
    this._timer = requestAnimationFrame(tick);
  },

  stopTick() {
    if (this._timer) { cancelAnimationFrame(this._timer); this._timer = null; }
  }
};

// 页面切走时暂停，回来恢复（仅在余生页激活时 tick）
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) LifeClockUI.stopTick();
    else if (AppState && AppState.currentView === 'lifeclock') LifeClockUI.startTick();
  });
}
