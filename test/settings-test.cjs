/**
 * 设置模块·主题切换单元测试
 * 用法：node test/settings-test.cjs
 * 覆盖"主题切换无效"回归：applyTheme 必须正确切换 html.dark 标记
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const store = {};
function makeClassList() {
  const set = new Set();
  return {
    add: c => set.add(c),
    remove: c => set.delete(c),
    toggle: (c, force) => {
      if (force === undefined) { set.has(c) ? set.delete(c) : set.add(c); }
      else { force ? set.add(c) : set.delete(c); }
      return set.has(c);
    },
    contains: c => set.has(c)
  };
}

let systemDark = false; // 模拟系统是否深色
const sandbox = {
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  },
  console, Date, JSON, Object, Array, Number, String, Boolean,
  document: { documentElement: { classList: makeClassList(), style: {} } },
  window: {
    matchMedia: () => ({ matches: systemDark, addEventListener: () => {} })
  },
  __setSystemDark: v => { systemDark = v; },
  __done: (p, f) => { console.log(`\n结果: ${p} 通过 / ${f} 失败`); if (f > 0) process.exitCode = 1; }
};

const root = path.join(__dirname, '..');
let code = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');
code += `
;(function(){
  let passed=0, failed=0;
  const assert=(n,c)=>{ c?passed++:failed++; console.log((c?'✅':'❌')+' '+n); };
  const html = document.documentElement;

  // 深色：必须加 dark 标记
  SettingsManager.applyTheme('dark');
  assert('dark 主题 → html.dark 存在', html.classList.contains('dark') === true);

  // 浅色：必须移除 dark 标记
  SettingsManager.applyTheme('light');
  assert('light 主题 → html.dark 不存在', html.classList.contains('dark') === false);

  // auto + 系统深色 → 加标记
  __setSystemDark(true);
  SettingsManager.applyTheme('auto');
  assert('auto + 系统深色 → html.dark 存在', html.classList.contains('dark') === true);

  // auto + 系统浅色 → 移除标记
  __setSystemDark(false);
  SettingsManager.applyTheme('auto');
  assert('auto + 系统浅色 → html.dark 不存在', html.classList.contains('dark') === false);

  __done(passed, failed);
})();
`;
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
