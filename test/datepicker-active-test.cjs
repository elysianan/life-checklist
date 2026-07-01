/**
 * 日期选择器·滚轮高亮行为测试
 * 用法：node test/datepicker-active-test.cjs
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

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
    appendChild(child) { this.children.push(child); }
  };
}

const sandbox = {
  console, Date, Math, Array, Number,
  document: { createElement: createMockElement },
  __done: (p, f) => {
    console.log(`\n结果: ${p} 通过 / ${f} 失败`);
    if (f > 0) process.exitCode = 1;
  }
};

const code = fs.readFileSync(path.join(__dirname, '..', 'js/datePicker.js'), 'utf8') + `
;(function(){
  let passed = 0, failed = 0;
  const assert = (n, c) => { c ? passed++ : failed++; console.log((c ? '✅' : '❌') + ' ' + n); };

  // 构造一个带 5 个 li 的 mock ul，ITEM_H=36，scrollTop=72 时中心项为 index 2
  const ul = document.createElement('ul');
  for (let i = 0; i < 5; i++) {
    const li = document.createElement('li');
    li.dataset.v = String(2020 + i);
    ul.appendChild(li);
  }
  ul.scrollTop = 72;

  DatePickerManager._updateActiveItem(ul);

  assert('中心项 index=2 获得 dp-item-active', ul.children[2].classList.contains('dp-item-active'));
  assert('非中心项不获得 dp-item-active', ![0,1,3,4].some(i => ul.children[i].classList.contains('dp-item-active')));

  // 滚动到 index 3，验证旧高亮被移除、新高亮被添加
  ul.scrollTop = 108;
  DatePickerManager._updateActiveItem(ul);

  assert('滚动后新高亮项 index=3', ul.children[3].classList.contains('dp-item-active'));
  assert('旧高亮项 index=2 已移除', !ul.children[2].classList.contains('dp-item-active'));

  __done(passed, failed);
})();
`;

vm.createContext(sandbox);
vm.runInContext(code, sandbox);
