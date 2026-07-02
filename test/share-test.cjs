/**
 * 分享模块纯逻辑测试
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
  console, Date, Math, JSON, Object, Array, parseInt, parseFloat, isNaN, Number, RegExp, String, Error, setTimeout, clearTimeout,
  document: undefined, window: undefined, navigator: undefined,
  __done: (p, f) => { console.log(`\n结果: ${p} 通过 / ${f} 失败`); if (f > 0) process.exitCode = 1; }
};

const root = path.join(__dirname, '..');
const files = ['js/data.js', 'js/storage.js', 'js/lifeClock.js', 'js/share.js']
  .filter(f => fs.existsSync(path.join(root, f)));
let code = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');

code += `
;(function(){
  let passed = 0, failed = 0;
  const assert = (n, c) => { c ? passed++ : failed++; console.log((c ? '✅' : '❌') + ' ' + n); };
  localStorage.clear();

  // 模拟 DOM 元素：余生闹钟分享弹窗需要读取 life-age-value
  const ageEl = { textContent: '26.12345678' };
  const elements = {
    'life-age-value': ageEl,
    'life-share-save': { addEventListener() {}, style: {} },
    'life-share-copy': { addEventListener() {}, style: {} },
    'life-share-system': { addEventListener() {}, style: {} }
  };
  document = {
    getElementById: (id) => elements[id] || null,
    createElement: () => ({ className: '', textContent: '', style: {}, addEventListener() {}, appendChild() {} }),
    body: { appendChild() {}, removeChild() {} }
  };
  window = { html2canvas: null };
  navigator = { share: null, clipboard: { writeText: () => Promise.resolve() } };

  // 设置真实存储值，确保 calcEvents 能拿到 retireAge
  StorageManager.setBirthDate('2000-01-01');
  StorageManager.setLifeExpectancy(100);
  StorageManager.setRetireAge(60);

  // 走完整弹窗逻辑生成分享文案（会调用 LifeClockEngine.calcEvents）
  ShareManager.showLifeClockShareModal();

  // 同时直接测试生成函数
  const birth = StorageManager.getBirthDate();
  const nowMs = new Date('2026-07-03T00:00:00Z').getTime();
  const events = LifeClockEngine.calcEvents({
    birthDate: birth,
    now: nowMs,
    lifeExpectancy: StorageManager.getLifeExpectancy(),
    retireAge: StorageManager.getRetireAge()
  });
  const age = LifeClockEngine.calcAge(birth, nowMs);
  const text = ShareManager.generateLifeClockShareText(age, StorageManager.getLifeExpectancy(), events);

  assert('分享文案包含年龄', text.includes('26'));
  assert('分享文案包含余生事件', text.includes('退休') || text.includes('世界杯') || text.includes('夏天'));
  assert('分享文案不含 NaN', !text.includes('NaN'));

  __done(passed, failed);
})();
`;

vm.createContext(sandbox);
vm.runInContext(code, sandbox);
