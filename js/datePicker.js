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

    this._fill('dp-year', this._range(1920, maxYear), d.getFullYear());
    this._fill('dp-month', this._range(1, 12), d.getMonth() + 1);
    this._fillDays(d.getFullYear(), d.getMonth() + 1, d.getDate());

    document.getElementById('dp-year').onscroll = () => this._onYearMonthChange();
    document.getElementById('dp-month').onscroll = () => this._onYearMonthChange();

    document.getElementById('date-picker-mask').classList.remove('hidden');
    document.getElementById('date-picker-cancel').onclick = () => this.close();
    document.getElementById('date-picker-confirm').onclick = () => this._confirm();
  },

  close() { document.getElementById('date-picker-mask').classList.add('hidden'); },

  _range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; },

  _fill(colId, values, selected) {
    const ul = document.getElementById(colId);
    ul.innerHTML = values.map(v => `<li data-v="${v}">${v}</li>`).join('');
    const idx = Math.max(0, values.indexOf(selected));
    ul.scrollTop = idx * this.ITEM_H;
  },

  _fillDays(year, month, selectedDay) {
    const days = new Date(year, month, 0).getDate();   // 当月天数
    const sel = Math.min(selectedDay || 1, days);
    this._fill('dp-day', this._range(1, days), sel);
  },

  _centerValue(colId) {
    const ul = document.getElementById(colId);
    const idx = Math.round(ul.scrollTop / this.ITEM_H);
    const li = ul.children[Math.min(idx, ul.children.length - 1)];
    return li ? parseInt(li.dataset.v, 10) : null;
  },

  _onYearMonthChange() {
    clearTimeout(this._t);
    this._t = setTimeout(() => {
      const y = this._centerValue('dp-year');
      const m = this._centerValue('dp-month');
      const curDay = this._centerValue('dp-day') || 1;
      this._fillDays(y, m, curDay);
    }, 80);
  },

  _confirm() {
    const y = this._centerValue('dp-year');
    const m = this._centerValue('dp-month');
    let day = this._centerValue('dp-day');
    const maxDay = new Date(y, m, 0).getDate();
    day = Math.min(day, maxDay);
    // 不超过今天
    let picked = new Date(y, m - 1, day);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (picked > today) picked = today;
    const str = `${picked.getFullYear()}-${String(picked.getMonth() + 1).padStart(2, '0')}-${String(picked.getDate()).padStart(2, '0')}`;
    this.close();
    if (this._onConfirm) this._onConfirm(str);
  }
};
