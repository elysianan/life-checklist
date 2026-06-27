/**
 * LifeClock 模块单元测试
 * 用法：node test/life-clock-test.cjs
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const store = {};
const sandbox = {
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  },
  console, Date, Math, JSON, Object, Array, parseInt, parseFloat, isNaN, Number, RegExp,
  __done: (p, f) => { console.log(`\n结果: ${p} 通过 / ${f} 失败`); if (f > 0) process.exitCode = 1; }
};

const root = path.join(__dirname, '..');
const files = ['js/data.js', 'js/storage.js', 'js/lifeClock.js']
  .filter(f => fs.existsSync(path.join(root, f)));
let code = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');

code += `
;(function(){
  let passed=0, failed=0;
  const assert=(n,c)=>{ c?passed++:failed++; console.log((c?'✅':'❌')+' '+n); };
  localStorage.clear();

  // ---- 默认值 ----
  assert('默认寿命为 100', DEFAULT_LIFE_EXPECTANCY === 100);
  assert('默认退休年龄为 60', DEFAULT_RETIRE_AGE === 60);

  // ---- 寿命/退休存取 ----
  assert('未设置时寿命回退默认 100', StorageManager.getLifeExpectancy() === 100);
  assert('未设置时退休回退默认 60', StorageManager.getRetireAge() === 60);
  StorageManager.setLifeExpectancy(90);
  StorageManager.setRetireAge(55);
  assert('设置后寿命为 90', StorageManager.getLifeExpectancy() === 90);
  assert('设置后退休为 55', StorageManager.getRetireAge() === 55);
  StorageManager.setLifeExpectancy(0);
  assert('非法寿命(0)回退默认 100', StorageManager.getLifeExpectancy() === 100);
  StorageManager.setRetireAge(0);
  assert('非法退休(0)回退默认 60', StorageManager.getRetireAge() === 60);

  // ---- LIFE_EVENTS 配置 ----
  assert('LIFE_EVENTS 至少 4 项', Array.isArray(LIFE_EVENTS) && LIFE_EVENTS.length >= 4);
  assert('每项有 emoji 和 calc', LIFE_EVENTS.every(e => typeof e.emoji === 'string' && typeof e.calc === 'function'));

  // ---- LifeClockEngine.calcAge ----
  const now2026 = new Date('2026-01-01T00:00:00Z').getTime();
  const age = LifeClockEngine.calcAge('2000-01-01T00:00:00Z', now2026);
  assert('2000 年生人在 2026 年约 26 岁', Math.abs(age - 26) < 0.05);

  // ---- LifeClockEngine.calcEvents（寿命100/退休60，age≈26）----
  const events = LifeClockEngine.calcEvents({
    birthDate: '2000-01-01T00:00:00Z', now: now2026, lifeExpectancy: 100, retireAge: 60
  });
  assert('返回 4 件事', events.length === 4);
  assert('世界杯：余年74÷4=18', events[0].text === '观看 18 届世界杯');
  assert('夏天：余年74', events[1].text === '享受 74 个夏天');
  assert('退休：60-26=34 年', events[2].text === '还有 34 年退休');
  assert('周末：余年74×52=3848', events[3].text === '度过 3848 个周末');

  // ---- 边界：退休已过 ----
  const retired = LifeClockEngine.calcEvents({
    birthDate: '1960-01-01T00:00:00Z', now: now2026, lifeExpectancy: 100, retireAge: 60
  });
  assert('退休已过显示已自由', retired[2].emoji === '🌴' && retired[2].text.startsWith('已自由 ') && retired[2].text.endsWith(' 年') && !isNaN(parseInt(retired[2].text.slice(3, -1), 10)));

  // ---- 边界：余年<=0 兜底 ----
  const overrun = LifeClockEngine.calcEvents({
    birthDate: '1900-01-01T00:00:00Z', now: now2026, lifeExpectancy: 100, retireAge: 60
  });
  assert('余年<=0 显示赚到兜底', overrun.length === 1 && overrun[0].text === '每一天都是赚到');

  __done(passed, failed);
})();
`;

vm.createContext(sandbox);
vm.runInContext(code, sandbox);
