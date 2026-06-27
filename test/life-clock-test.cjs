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
  console, Date, Math, JSON, Object, Array, parseInt, parseFloat, isNaN, Number,
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

  __done(passed, failed);
})();
`;

vm.createContext(sandbox);
vm.runInContext(code, sandbox);
