/**
 * 日期选择器·年份滚轮范围纯逻辑测试
 * 用法：node test/datepicker-test.cjs
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const sandbox = {
  console, Date, Math, Array, Number,
  document: { getElementById: () => null }, // _yearRange 不触达 DOM
  __done: (p, f) => {
    console.log(`\n结果: ${p} 通过 / ${f} 失败`);
    if (f > 0) process.exitCode = 1;
  }
};

let code = fs.readFileSync(path.join(__dirname, '..', 'js/datePicker.js'), 'utf8');
code += `
;(function(){
  let passed = 0, failed = 0;
  const assert = (n, c) => { c ? passed++ : failed++; console.log((c ? '✅' : '❌') + ' ' + n); };

  const r = DatePickerManager._yearRange();
  const cur = new Date().getFullYear();

  assert('年份范围起点为当前年+1', r[0] === cur + 1);
  assert('年份范围终点为 1920', r[r.length - 1] === 1920);
  assert('年份降序连续', r.every((y, i) => i === 0 || y === r[i - 1] - 1));
  assert('年份范围包含 2026', r.includes(2026));

  // 验证 openYearMonth 生成的 DOM 结构（通过读取 DatePickerManager 源码后 vm 执行）
  // 因 DOM 不可运行，改为验证 _yearRange 与 _range 行为
  assert('_range 生成 1-12', DatePickerManager._range(1, 12).length === 12);
  assert('_range 生成 1-12 首项为 1', DatePickerManager._range(1, 12)[0] === 1);
  assert('_range 生成 1-12 末项为 12', DatePickerManager._range(1, 12)[11] === 12);

  __done(passed, failed);
})();
`;

vm.createContext(sandbox);
vm.runInContext(code, sandbox);
