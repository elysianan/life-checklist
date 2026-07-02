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
const files = ['js/data.js', 'js/storage.js', 'js/share.js']
  .filter(f => fs.existsSync(path.join(root, f)));
let code = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');

code += `
;(function(){
  let passed = 0, failed = 0;
  const assert = (n, c) => { c ? passed++ : failed++; console.log((c ? '✅' : '❌') + ' ' + n); };
  localStorage.clear();

  // 模拟 LifeClockEngine
  const LifeClockEngine = {
    calcAge: (birth, now) => 26,
    calcEvents: (ctx) => [
      { emoji: '📅', text: '还可以过 300 个周末' },
      { emoji: '🎂', text: '还可以吃 70 个生日蛋糕' }
    ]
  };

  // 直接测试分享文案生成函数（若不存在则先创建）
  const text = ShareManager.generateLifeClockShareText(26, 80, [
    { emoji: '📅', text: '还可以过 300 个周末' }
  ]);
  assert('分享文案包含年龄', text.includes('26'));
  assert('分享文案包含余生事件', text.includes('300 个周末'));

  __done(passed, failed);
})();
`;

vm.createContext(sandbox);
vm.runInContext(code, sandbox);
