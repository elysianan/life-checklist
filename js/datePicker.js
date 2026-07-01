/**
 * 手机端三列滚轮日期选择器（纯原生 scroll-snap）
 */
const DatePickerManager = {
  _onConfirm: null,
  ITEM_H: 36,

  open(currentDateStr, onConfirm) {
    this._onConfirm = onConfirm;
    const d = currentDateStr ? new Date(currentDateStr) : new Date(2000, 0, 1);
    const now = new Date();
    const maxYear = now.getFullYear();

    this._fill(document.getElementById('dp-year'), this._range(1920, maxYear), d.getFullYear());
    this._fill(document.getElementById('dp-month'), this._range(1, 12), d.getMonth() + 1);
    this._fillDays(d.getFullYear(), d.getMonth() + 1, d.getDate());

    const yearEl = document.getElementById('dp-year');
    const monthEl = document.getElementById('dp-month');
    const dayEl = document.getElementById('dp-day');

    yearEl.onscroll = () => { this._updateActiveItem(yearEl); this._onYearMonthChange(); };
    monthEl.onscroll = () => { this._updateActiveItem(monthEl); this._onYearMonthChange(); };
    dayEl.onscroll = () => { this._updateActiveItem(dayEl); };

    document.getElementById('date-picker-mask').classList.remove('hidden');
    document.getElementById('date-picker-cancel').onclick = () => this.close();
    document.getElementById('date-picker-confirm').onclick = () => this._confirm();
  },

  close() { document.getElementById('date-picker-mask').classList.add('hidden'); },

  _range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; },

  _yearRange() {
    const maxYear = new Date().getFullYear() + 1;
    const r = [];
    for (let i = maxYear; i >= 1920; i--) r.push(i);
    return r;
  },

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

    const now = new Date();
    const selYear = years.includes(Number(currentYear)) ? Number(currentYear) : now.getFullYear();
    const selMonth = months.includes(Number(currentMonth)) ? Number(currentMonth) : now.getMonth() + 1;

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
  },

  /**
   * 还原三列日期结构（openYearMonth 用后复位，避免影响生日选择器）
   */
  _restoreCols(card, units) {
    card.innerHTML = '<ul class="dp-col" id="dp-year"></ul><ul class="dp-col" id="dp-month"></ul><ul class="dp-col" id="dp-day"></ul>';
    if (units) units.innerHTML = '<span>年</span><span>月</span><span>日</span>';
  },

  _fill(ul, values, selected) {
    ul.innerHTML = values.map(v => `<li data-v="${v}">${v}</li>`).join('');
    const idx = Math.max(0, values.indexOf(selected));
    ul.scrollTop = idx * this.ITEM_H;
    // 初始高亮中心项
    this._updateActiveItem(ul);
  },

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
  },

  _fillDays(year, month, selectedDay) {
    const days = new Date(year, month, 0).getDate();   // 当月天数
    const sel = Math.min(selectedDay || 1, days);
    this._fill(document.getElementById('dp-day'), this._range(1, days), sel);
  },

  _centerValue(ul) {
    const idx = Math.round(ul.scrollTop / this.ITEM_H);
    const li = ul.children[Math.min(idx, ul.children.length - 1)];
    return li ? parseInt(li.dataset.v, 10) : null;
  },

  _onYearMonthChange() {
    clearTimeout(this._t);
    this._t = setTimeout(() => {
      const y = this._centerValue(document.getElementById('dp-year'));
      const m = this._centerValue(document.getElementById('dp-month'));
      const curDay = this._centerValue(document.getElementById('dp-day')) || 1;
      this._fillDays(y, m, curDay);
    }, 80);
  },

  _confirm() {
    const y = this._centerValue(document.getElementById('dp-year'));
    const m = this._centerValue(document.getElementById('dp-month'));
    let day = this._centerValue(document.getElementById('dp-day'));
    const maxDay = new Date(y, m, 0).getDate();
    day = Math.min(day, maxDay);
    // 不超过今天
    let picked = new Date(y, m - 1, day);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (picked > today) picked = today;
    const str = `${picked.getFullYear()}-${String(picked.getMonth() + 1).padStart(2, '0')}-${String(picked.getDate()).padStart(2, '0')}`;
    this.close();
    if (this._onConfirm) this._onConfirm(str);
  },

  // ==================== 内联滚轮模式（新增）====================

  /**
   * 在容器内渲染内联三列滚轮（不弹遮罩）
   * @param {HTMLElement} container - 容器元素
   * @param {string} currentDateStr - 当前日期 'YYYY-MM-DD'
   * @param {function} onChange - 滚动停止后回调 (dateStr) => {}
   */
  renderInline(container, currentDateStr, onChange) {
    const d = currentDateStr ? new Date(currentDateStr) : new Date(2000, 0, 1);
    const now = new Date();
    const maxYear = now.getFullYear();

    // 构建内联滚轮 DOM（使用 class 避免 id 冲突）
    container.innerHTML = `
      <div class="dp-inline-cols">
        <ul class="dp-inline-col dp-inline-year"></ul>
        <ul class="dp-inline-col dp-inline-month"></ul>
        <ul class="dp-inline-col dp-inline-day"></ul>
      </div>
      <div class="dp-inline-units"><span>年</span><span>月</span><span>日</span></div>
    `;

    const yearEl = container.querySelector('.dp-inline-year');
    const monthEl = container.querySelector('.dp-inline-month');
    const dayEl = container.querySelector('.dp-inline-day');

    this._fill(yearEl, this._range(1920, maxYear), d.getFullYear());
    this._fill(monthEl, this._range(1, 12), d.getMonth() + 1);
    this._fillInlineDays(yearEl, monthEl, dayEl, d.getFullYear(), d.getMonth() + 1, d.getDate());

    // 绑定滚动事件（年月变化时重填日）
    const handleScroll = () => {
      this._updateActiveItem(yearEl);
      this._updateActiveItem(monthEl);
      this._updateActiveItem(dayEl);
      clearTimeout(this._inlineTimer);
      this._inlineTimer = setTimeout(() => {
        const y = this._centerValue(yearEl);
        const m = this._centerValue(monthEl);
        const curDay = this._centerValue(dayEl) || 1;
        this._fillInlineDays(yearEl, monthEl, dayEl, y, m, curDay);
        this._emitInlineValue(yearEl, monthEl, dayEl, onChange);
      }, 120);
    };

    yearEl.onscroll = handleScroll;
    monthEl.onscroll = handleScroll;
    dayEl.onscroll = () => {
      this._updateActiveItem(dayEl);
      clearTimeout(this._inlineTimer);
      this._inlineTimer = setTimeout(() => {
        this._emitInlineValue(yearEl, monthEl, dayEl, onChange);
      }, 120);
    };

    // 初始触发一次
    setTimeout(() => this._emitInlineValue(yearEl, monthEl, dayEl, onChange), 150);
  },

  _fillInlineDays(yearEl, monthEl, dayEl, year, month, selectedDay) {
    const days = new Date(year, month, 0).getDate();
    const sel = Math.min(selectedDay || 1, days);
    this._fill(dayEl, this._range(1, days), sel);
  },

  _emitInlineValue(yearEl, monthEl, dayEl, onChange) {
    const y = this._centerValue(yearEl);
    const m = this._centerValue(monthEl);
    let day = this._centerValue(dayEl);
    const maxDay = new Date(y, m, 0).getDate();
    day = Math.min(day, maxDay);
    let picked = new Date(y, m - 1, day);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (picked > today) picked = today;
    const str = `${picked.getFullYear()}-${String(picked.getMonth() + 1).padStart(2, '0')}-${String(picked.getDate()).padStart(2, '0')}`;
    if (onChange) onChange(str);
  }
};
