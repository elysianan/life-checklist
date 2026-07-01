/**
 * 人生轴（大事记）模块单元测试
 * 用法：node test/timeline-test.cjs
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
const files = ['js/data.js', 'js/storage.js', 'js/timeline.js']
  .filter(f => fs.existsSync(path.join(root, f)));
let code = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');

code += `
;(function(){
  let passed=0, failed=0;
  const assert=(n,c)=>{ c?passed++:failed++; console.log((c?'✅':'❌')+' '+n); };
  localStorage.clear();

  // ---- TimelineEngine.migrate ----
  const oldArr = [
    { id: 'o1', date: '2024-06-15T10:00:00Z', title: '完成A', emoji: '🎉', color: '#ff0000', listId: 'l1', taskId: 't1' },
    { id: 'o2', date: '2023-01-20', title: '完成B', emoji: '✅', color: '#00ff00' },
    { id: 'o3', date: 'invalid', title: '脏数据', emoji: 'x' },
    { id: 'o4', title: '无日期', emoji: 'x' }
  ];
  const migrated = TimelineEngine.migrate(oldArr);
  assert('migrate 结果长度=2（过滤无合法 date/title）', migrated.length === 2);
  assert('migrate 第1条 id=e_1', migrated[0].id === 'e_1');
  assert('migrate 第1条 year=2024', migrated[0].year === 2024);
  assert('migrate 第1条 month=6（从旧 date 恢复）', migrated[0].month === 6);
  assert('migrate 第2条 year=2023', migrated[1].year === 2023);
  assert('migrate 第2条 month=1（从旧 date 恢复）', migrated[1].month === 1);
  assert('migrate 第1条 text=完成A', migrated[0].text === '完成A');
  assert('migrate 第2条 text=完成B', migrated[1].text === '完成B');
  assert('migrate 不保留旧字段', !('date' in migrated[0]) && !('title' in migrated[0]) && !('emoji' in migrated[0]));

  // ---- 幂等性：同一旧数组迁移结果稳定 ----
  const migrated2 = TimelineEngine.migrate(oldArr);
  assert('幂等：两次迁移结果长度相同', migrated2.length === migrated.length);
  assert('幂等：year 一致', migrated2.every((e,i)=>e.year===migrated[i].year));
  assert('幂等：month 一致', migrated2.every((e,i)=>e.month===migrated[i].month));
  assert('幂等：text 一致', migrated2.every((e,i)=>e.text===migrated[i].text));

  // ---- TimelineEngine.sortByYear ----
  const unsorted = [
    { id: 'e_3', year: 2020, month: 6, text: 'C' },
    { id: 'e_1', year: 2025, month: 1, text: 'A' },
    { id: 'e_2', year: 2022, month: 3, text: 'B' },
    { id: 'e_4', year: 2020, month: 1, text: 'D' }
  ];
  const sorted = TimelineEngine.sortByYear(unsorted);
  assert('sortByYear 先按 year 升序', sorted[0].year === 2020 && sorted[1].year === 2020 && sorted[2].year === 2022 && sorted[3].year === 2025);
  assert('sortByYear 同年按 month 升序', sorted[0].month === 1 && sorted[1].month === 6);
  assert('sortByYear 不改原数组', unsorted[0].year===2020 && unsorted[1].year===2025 && unsorted[2].year===2022 && unsorted[3].year===2020);

  // ---- TimelineEngine.yearSpan ----
  assert('yearSpan 空数组返回 null', TimelineEngine.yearSpan([]) === null);
  assert('yearSpan 单条返回同值', (s=>s.min===2020 && s.max===2020)(TimelineEngine.yearSpan([{year:2020,text:'x'}])));
  assert('yearSpan 多条返回 min/max', (s=>s.min===2010 && s.max===2030)(TimelineEngine.yearSpan([{year:2030,text:'a'},{year:2010,text:'b'}])));

  // ---- TimelineEngine.validateEvent ----
  const currentYear = new Date().getFullYear();
  assert('validate 合法年月', TimelineEngine.validateEvent(2000, 6, 'hello') === true);
  assert('validate 年份下限 1899 非法', TimelineEngine.validateEvent(1899, 6, 'hello') === false);
  assert('validate 年份上限 current+100+1 非法', TimelineEngine.validateEvent(currentYear + 101, 6, 'hello') === false);
  assert('validate 年份上限 current+100 合法', TimelineEngine.validateEvent(currentYear + 100, 6, 'hello') === true);
  assert('validate 空文本非法', TimelineEngine.validateEvent(2000, 6, '') === false);
  assert('validate 纯空格非法', TimelineEngine.validateEvent(2000, 6, '   ') === false);
  assert('validate 非数字年份非法', TimelineEngine.validateEvent('abc', 6, 'hello') === false);
  assert('validate 月份 0 非法', TimelineEngine.validateEvent(2000, 0, 'hello') === false);
  assert('validate 月份 13 非法', TimelineEngine.validateEvent(2000, 13, 'hello') === false);
  assert('validate 缺少 month 非法', TimelineEngine.validateEvent(2000, undefined, 'hello') === false);

  __done(passed, failed);
})();
`;

vm.createContext(sandbox);
vm.runInContext(code, sandbox);
