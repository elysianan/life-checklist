/**
 * 日期选择器单元测试
 * 覆盖 open / _confirm / allowFuture 限制
 * 用法：node test/datepicker-test.cjs
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const sandbox = {
  console, Date, Math, Array, Number, parseInt, String, setTimeout, clearTimeout,
  __done: (p, f) => {
    console.log(`\n结果: ${p} 通过 / ${f} 失败`);
    if (f > 0) process.exitCode = 1;
  }
};

let code = fs.readFileSync(path.join(__dirname, '..', 'js/datePicker.js'), 'utf8');
code += `
;(function(){
  // 在 vm 内构造 DOM mock，便于直接引用
  function createMockElement(tag) {
    return {
      tagName: tag,
      classList: {
        _classes: new Set(),
        add(cls) { this._classes.add(cls); },
        remove(cls) { this._classes.delete(cls); },
        contains(cls) { return this._classes.has(cls); },
        toggle(cls, force) {
          if (force === undefined) {
            if (this._classes.has(cls)) { this._classes.delete(cls); return false; }
            this._classes.add(cls); return true;
          }
          if (force) { this._classes.add(cls); return true; }
          this._classes.delete(cls); return false;
        }
      },
      dataset: {},
      style: {},
      children: [],
      scrollTop: 0,
      _html: '',
      get innerHTML() { return this._html; },
      set innerHTML(v) {
        this._html = v;
        this.children = [];
        const re = /<li[^>]*data-v=\"([^\"]*)\"[^>]*>([^<]*)<\\/li>/g;
        let m;
        while ((m = re.exec(v)) !== null) {
          this.children.push({
            dataset: { v: m[1] },
            textContent: m[2],
            classList: {
              _classes: new Set(),
              add(cls) { this._classes.add(cls); },
              remove(cls) { this._classes.delete(cls); },
              contains(cls) { return this._classes.has(cls); }
            }
          });
        }
      },
      appendChild(child) { this.children.push(child); },
      addEventListener() {},
      onclick: null,
      onscroll: null
    };
  }

  const dpYear = createMockElement('ul');
  const dpMonth = createMockElement('ul');
  const dpDay = createMockElement('ul');
  const dpMask = createMockElement('div');
  const dpCancel = createMockElement('button');
  const dpConfirm = createMockElement('button');

  document = {
    getElementById: (id) => ({
      'dp-year': dpYear,
      'dp-month': dpMonth,
      'dp-day': dpDay,
      'date-picker-mask': dpMask,
      'date-picker-cancel': dpCancel,
      'date-picker-confirm': dpConfirm
    })[id] || null
  };
  requestAnimationFrame = (cb) => { cb(); };

  let passed = 0, failed = 0;
  const assert = (n, c) => { c ? passed++ : failed++; console.log((c ? '✅' : '❌') + ' ' + n); };

  // 工具：模拟滚轮滚动到指定值（依赖 _fill 后 children 顺序）
  function scrollToValue(ul, value) {
    const idx = Array.from(ul.children).findIndex(li => parseInt(li.dataset.v, 10) === value);
    ul.scrollTop = Math.max(0, idx) * DatePickerManager.ITEM_H;
  }

  const cur = new Date().getFullYear();

  // ---- 基础范围测试 ----
  const r = DatePickerManager._yearRange();
  assert('年份范围起点为当前年', r[0] === cur);
  assert('年份范围终点为 1920', r[r.length - 1] === 1920);
  assert('年份降序连续', r.every((y, i) => i === 0 || y === r[i - 1] - 1));
  assert('_range 生成 1-12', DatePickerManager._range(1, 12).length === 12);

  // ---- _confirm 返回期望的 YYYY-MM-DD ----
  let confirmedDate = null;
  dpMask.classList.add('hidden');
  DatePickerManager.open('2000-05-15', (str) => { confirmedDate = str; }, false);
  DatePickerManager._confirm();
  assert('_confirm 返回 2000-05-15', confirmedDate === '2000-05-15');
  assert('确认后遮罩隐藏', dpMask.classList.contains('hidden'));

  // ---- 生日模式（allowFuture=false）未来日期被钳制到今天 ----
  confirmedDate = null;
  dpMask.classList.remove('hidden');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // 选择同年未来一个月的最后一天，确保超过今天
  const futureMonth = today.getMonth() === 11 ? 11 : today.getMonth() + 1;
  const futureYear = today.getFullYear();
  const futureDay = new Date(futureYear, futureMonth + 1, 0).getDate();

  DatePickerManager.open(\`\${futureYear}-01-01\`, (str) => { confirmedDate = str; }, false);
  scrollToValue(dpMonth, futureMonth + 1);
  scrollToValue(dpDay, futureDay);
  DatePickerManager._confirm();

  const expectedToday = \`\${today.getFullYear()}-\${String(today.getMonth() + 1).padStart(2, '0')}-\${String(today.getDate()).padStart(2, '0')}\`;
  assert('生日模式未来日期被钳制到今天', confirmedDate === expectedToday);

  // ---- 时间轴模式（allowFuture=true）允许未来日期 ----
  confirmedDate = null;
  dpMask.classList.remove('hidden');
  DatePickerManager.open('2099-12-31', (str) => { confirmedDate = str; }, true);
  DatePickerManager._confirm();
  assert('时间轴模式允许未来日期 2099-12-31', confirmedDate === '2099-12-31');

  __done(passed, failed);
})();
`;

vm.createContext(sandbox);
vm.runInContext(code, sandbox);
